/**
 * Minimal GitHub REST client for public release metadata.
 *
 * Request URLs are always built from validated owner/repo/tag values against a
 * fixed API base — user input is never fetched directly.
 */
import { z } from "zod";
import { TtlCache } from "./cache";
import { ResolveError } from "./errors";
import type { Release, ReleaseAsset, RepoTarget } from "./types";

export const DEFAULT_API_BASE = "https://api.github.com";

export interface GitHubClientOptions {
  token?: string;
  /** Override for tests only (e.g. a local mock server). */
  apiBase?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
  userAgent?: string;
  cache?: TtlCache<Release>;
  cacheTtlMs?: number;
  /**
   * Refuse private repositories. Required whenever the token can read private repos but the caller is
   * anonymous (the web app): otherwise a `repo`-scoped token would expose the owner's private releases.
   */
  publicOnly?: boolean;
}

// --- Response validation -----------------------------------------------------

const AssetSchema = z.object({
  name: z.string().min(1).max(512),
  size: z.number().int().nonnegative(),
  state: z.string().optional(),
  content_type: z.string().max(255).optional().nullable(),
  browser_download_url: z.string().url(),
  digest: z.string().max(200).optional().nullable(),
  created_at: z.string().max(64).optional().nullable(),
  updated_at: z.string().max(64).optional().nullable(),
  uploader: z.object({ login: z.string().max(100) }).optional().nullable(),
});

const ReleaseSchema = z.object({
  tag_name: z.string().min(1).max(255),
  name: z.string().max(1024).nullable().optional(),
  html_url: z.string().url(),
  draft: z.boolean(),
  prerelease: z.boolean(),
  published_at: z.string().nullable().optional(),
  immutable: z.boolean().optional().nullable(),
  author: z.object({ login: z.string().max(100) }).optional().nullable(),
  assets: z.array(AssetSchema).max(1000),
});

const AttestationListSchema = z.object({
  attestations: z
    .array(z.object({ initiator: z.string().max(64).optional().nullable() }).passthrough())
    .max(1000),
});

/** Attestations GitHub holds for one file digest in one repo. */
export interface AttestationSummary {
  total: number;
  /** Created by a workflow in the repo (`actions/attest-build-provenance`, SBOMs …). */
  build: number;
  /** Created by GitHub itself for an immutable release. */
  release: number;
}

const ReleaseListSchema = z.array(ReleaseSchema).max(100);

/** Only GitHub-hosted release assets may be offered as downloads. */
export function isGitHubReleaseAssetUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.hostname !== "github.com" || url.username || url.password || url.port) {
    return false;
  }
  return /^\/[A-Za-z0-9-]+\/[A-Za-z0-9._-]+\/releases\/download\/[^/]+(?:\/[^/]+)*\/[^/]+$/.test(url.pathname);
}

function isGitHubHtmlUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && url.hostname === "github.com";
  } catch {
    return false;
  }
}

function toRelease(raw: z.infer<typeof ReleaseSchema>, target: RepoTarget): Release {
  const assets: ReleaseAsset[] = raw.assets
    .filter((a) => (a.state ?? "uploaded") === "uploaded" && a.size > 0)
    .filter((a) => isGitHubReleaseAssetUrl(a.browser_download_url))
    .map((a) => ({
      name: a.name,
      size: a.size,
      downloadUrl: a.browser_download_url,
      contentType: a.content_type ?? undefined,
      digest: a.digest && /^sha256:[a-f0-9]{64}$/i.test(a.digest) ? a.digest : undefined,
      createdAt: a.created_at ?? undefined,
      updatedAt: a.updated_at ?? undefined,
      uploader: a.uploader?.login,
    }));

  return {
    name: raw.name?.trim() || raw.tag_name,
    tag: raw.tag_name,
    htmlUrl: isGitHubHtmlUrl(raw.html_url)
      ? raw.html_url
      : `https://github.com/${target.owner}/${target.repo}/releases`,
    publishedAt: raw.published_at ?? null,
    prerelease: raw.prerelease,
    draft: raw.draft,
    immutable: raw.immutable ?? undefined,
    author: raw.author?.login,
    assets,
  };
}

/** Tags like "v2.0.0-rc.1" are treated as pre-releases even if not flagged. */
export function looksUnstable(tag: string): boolean {
  return /(?:^|[^a-z])(alpha|beta|rc|pre|preview|nightly|canary|dev|snapshot|insiders)(?:[^a-z]|$)/i.test(tag);
}

export function isStable(release: Pick<Release, "draft" | "prerelease" | "tag">): boolean {
  return !release.draft && !release.prerelease && !looksUnstable(release.tag);
}

// --- Client --------------------------------------------------------------------

const sharedCache = new TtlCache<Release>();
const listCache = new TtlCache<Release[]>(200);
const attestationCache = new TtlCache<AttestationSummary>(1000);
/** owner/repo → is it public? Checked before any cached release data is served. */
const visibilityCache = new TtlCache<boolean>(2000);

export class GitHubClient {
  private readonly apiBase: string;
  private readonly token?: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly userAgent: string;
  private readonly cache: TtlCache<Release>;
  private readonly cacheTtlMs: number;
  private readonly publicOnly: boolean;

  constructor(opts: GitHubClientOptions = {}) {
    this.apiBase = (opts.apiBase || DEFAULT_API_BASE).replace(/\/+$/, "");
    this.token = opts.token || undefined;
    this.timeoutMs = opts.timeoutMs ?? 8000;
    this.fetchImpl = opts.fetch ?? fetch;
    this.userAgent = opts.userAgent ?? "onecliq-resolver";
    this.cache = opts.cache ?? sharedCache;
    this.cacheTtlMs = opts.cacheTtlMs ?? 5 * 60_000;
    this.publicOnly = opts.publicOnly ?? false;
  }

  /** With `publicOnly`, private (or missing) repositories look exactly like missing ones. */
  private async assertPublic(target: Pick<RepoTarget, "owner" | "repo">): Promise<void> {
    if (!this.publicOnly) return;
    const key = `${this.apiBase}|${target.owner}/${target.repo}`.toLowerCase();
    const isPublic = await visibilityCache.wrap(key, this.cacheTtlMs, async () => {
      const res = await this.request(this.repoPath(target));
      if (res.status === 404) return false;
      const repo = await this.parse(res, z.object({ private: z.boolean() }).passthrough());
      return !repo.private;
    });
    if (!isPublic) {
      throw new ResolveError("REPO_NOT_FOUND", `We couldn't find a public repository at github.com/${target.owner}/${target.repo}.`);
    }
  }

  /** The release a target points at: its tag, or the latest stable release. */
  async getRelease(target: RepoTarget): Promise<Release> {
    await this.assertPublic(target);
    const key = `${target.owner}/${target.repo}@${target.tag ?? ""}`.toLowerCase();
    return this.cache.wrap(key, this.cacheTtlMs, () =>
      target.tag ? this.getTaggedRelease(target) : this.getLatestStableRelease(target),
    );
  }

  /** Published (non-draft) releases, newest first. Pre-releases included; filter with `isStable`. */
  async listReleases(target: Pick<RepoTarget, "owner" | "repo">, perPage = 30): Promise<Release[]> {
    await this.assertPublic(target);
    const key = `${target.owner}/${target.repo}#${perPage}`.toLowerCase();
    return listCache.wrap(key, this.cacheTtlMs, async () => {
      const res = await this.request(`${this.repoPath(target)}/releases?per_page=${Math.min(100, Math.max(1, perPage))}`);
      if (res.status === 404) {
        throw new ResolveError("REPO_NOT_FOUND", `We couldn't find a public repository at github.com/${target.owner}/${target.repo}.`);
      }
      return (await this.parse(res, ReleaseListSchema))
        .map((r) => toRelease(r, target))
        .filter((r) => !r.draft)
        .sort((a, b) => Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? ""));
    });
  }

  /**
   * Attestations GitHub stores for a file digest (`sha256:<hex>`) in this repo.
   * Returns null when GitHub can't be asked (rate limit, network): that means "unknown", not "none".
   * This proves GitHub holds a signed record for these exact bytes; full Sigstore signature checks
   * are done by `gh attestation verify`.
   */
  async getAttestations(target: Pick<RepoTarget, "owner" | "repo">, digest: string): Promise<AttestationSummary | null> {
    if (!/^sha256:[a-f0-9]{64}$/i.test(digest)) return null;
    await this.assertPublic(target);
    const key = `${target.owner}/${target.repo}@${digest}`.toLowerCase();
    const cached = attestationCache.get(key);
    if (cached) return cached;
    let summary: AttestationSummary | null = null;
    try {
      const res = await this.request(`${this.repoPath(target)}/attestations/${encodeURIComponent(digest.toLowerCase())}?per_page=100`);
      if (res.status === 404) summary = { total: 0, build: 0, release: 0 };
      else if (res.ok) {
        const body = AttestationListSchema.safeParse(await res.json());
        if (body.success) {
          const release = body.data.attestations.filter((a) => a.initiator === "github").length;
          summary = { total: body.data.attestations.length, build: body.data.attestations.length - release, release };
        }
      }
    } catch {
      /* unknown */
    }
    // Only cache answers; "couldn't ask" should be retried next time.
    if (summary) attestationCache.set(key, summary, this.cacheTtlMs);
    return summary;
  }

  private repoPath(target: Pick<RepoTarget, "owner" | "repo">): string {
    return `/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}`;
  }

  private async getTaggedRelease(target: RepoTarget): Promise<Release> {
    const res = await this.request(`${this.repoPath(target)}/releases/tags/${encodeURIComponent(target.tag!)}`);
    if (res.status === 404) {
      // Distinguish "no such repo" from "no such tag".
      await this.assertRepoExists(target);
      throw new ResolveError("RELEASE_NOT_FOUND", `No release tagged “${target.tag}” was found in ${target.owner}/${target.repo}.`);
    }
    const release = toRelease(await this.parse(res, ReleaseSchema), target);
    if (release.draft) {
      throw new ResolveError("RELEASE_NOT_FOUND", `No published release tagged “${target.tag}” was found.`);
    }
    return release;
  }

  private async getLatestStableRelease(target: RepoTarget): Promise<Release> {
    const res = await this.request(`${this.repoPath(target)}/releases/latest`);
    if (res.ok) {
      const release = toRelease(await this.parse(res, ReleaseSchema), target);
      if (isStable(release)) return release;
    } else if (res.status !== 404) {
      await this.parse(res, ReleaseSchema); // throws the mapped error
    }

    // /latest 404s when there are no stable releases (or no repo). List to find out which.
    const listRes = await this.request(`${this.repoPath(target)}/releases?per_page=30`);
    if (listRes.status === 404) {
      throw new ResolveError("REPO_NOT_FOUND", `We couldn't find a public repository at github.com/${target.owner}/${target.repo}.`);
    }
    const list = (await this.parse(listRes, ReleaseListSchema)).map((r) => toRelease(r, target));
    const published = list.filter((r) => !r.draft);
    if (published.length === 0) {
      throw new ResolveError("NO_RELEASES", `${target.owner}/${target.repo} hasn't published any releases yet.`);
    }
    const stable = published
      .filter(isStable)
      .sort((a, b) => Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? ""));
    if (stable.length === 0) {
      throw new ResolveError(
        "NO_STABLE_RELEASE",
        `${target.owner}/${target.repo} only has pre-releases. Paste a specific release link to use one.`,
      );
    }
    return stable[0];
  }

  private async assertRepoExists(target: RepoTarget): Promise<void> {
    const res = await this.request(this.repoPath(target));
    if (res.status === 404) {
      throw new ResolveError("REPO_NOT_FOUND", `We couldn't find a public repository at github.com/${target.owner}/${target.repo}.`);
    }
    if (!res.ok) await this.parse(res, z.unknown());
  }

  /** Remaining API quota, for diagnostics (CLI `doctor`). */
  async rateLimit(): Promise<{ limit: number; remaining: number; reset: number } | null> {
    try {
      const res = await this.request("/rate_limit");
      if (!res.ok) return null;
      const body = z
        .object({ resources: z.object({ core: z.object({ limit: z.number(), remaining: z.number(), reset: z.number() }) }) })
        .parse(await res.json());
      return body.resources.core;
    } catch {
      return null;
    }
  }

  private async request(path: string): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": this.userAgent,
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    try {
      return await this.fetchImpl(`${this.apiBase}${path}`, {
        headers,
        redirect: "follow",
        signal: AbortSignal.timeout(this.timeoutMs),
        cache: "no-store",
      });
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === "TimeoutError" || name === "AbortError") {
        throw new ResolveError("TIMEOUT", "GitHub took too long to respond. Please try again.");
      }
      throw new ResolveError("NETWORK", "We couldn't reach GitHub. Check your connection and try again.");
    }
  }

  private async parse<T>(res: Response, schema: z.ZodType<T>): Promise<T> {
    if (!res.ok) throw this.httpError(res);
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new ResolveError("UPSTREAM", "GitHub returned a response we couldn't read.");
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new ResolveError("UPSTREAM", "GitHub returned release data in an unexpected format.");
    }
    return parsed.data;
  }

  private httpError(res: Response): ResolveError {
    const remaining = res.headers.get("x-ratelimit-remaining");
    const reset = Number(res.headers.get("x-ratelimit-reset"));
    const retryAfterHeader = Number(res.headers.get("retry-after"));
    if (res.status === 429 || (res.status === 403 && (remaining === "0" || Number.isFinite(retryAfterHeader) && retryAfterHeader > 0))) {
      const retryAfter = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
        ? retryAfterHeader
        : Number.isFinite(reset) && reset > 0
          ? Math.max(1, Math.ceil(reset - Date.now() / 1000))
          : 60;
      return new ResolveError("RATE_LIMITED", "GitHub's rate limit was reached. Please try again shortly.", { retryAfter });
    }
    if (res.status === 404) {
      return new ResolveError("REPO_NOT_FOUND", "That repository wasn't found or isn't public.");
    }
    if (res.status === 401) {
      // Misconfigured server token. Don't reveal details to the client.
      return new ResolveError("UPSTREAM", "The release service is misconfigured. Please try again later.");
    }
    return new ResolveError("UPSTREAM", "GitHub returned an unexpected error. Please try again.");
  }
}
