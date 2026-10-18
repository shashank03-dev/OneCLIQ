/**
 * Reads pull request and branch-compare context from the GitHub REST API.
 * URLs are built only from validated owner/repo/number/ref values against a fixed API base.
 */
import { z } from "zod";
import { DEFAULT_API_BASE } from "../github";
import { ResolveError } from "../errors";
import type { ChangedFile, ReviewContext, ReviewTarget } from "./types";

export interface PrClientOptions {
  token?: string;
  apiBase?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
  userAgent?: string;
  /** Refuse private repositories (the web app's token must not expose them). */
  publicOnly?: boolean;
}

/** GitHub lists at most 3,000 files for a PR; reviewing past a few hundred isn't useful. */
const MAX_FILES = 300;

const RepoSchema = z.object({ private: z.boolean(), default_branch: z.string().max(255) });

const PullSchema = z.object({
  number: z.number().int(),
  title: z.string().max(1024),
  body: z.string().nullable().optional(),
  state: z.enum(["open", "closed"]),
  draft: z.boolean().optional().nullable(),
  merged: z.boolean().optional().nullable(),
  merged_at: z.string().nullable().optional(),
  html_url: z.string().url(),
  user: z.object({ login: z.string().max(100) }).nullable().optional(),
  base: z.object({ ref: z.string().max(255) }),
  head: z.object({ ref: z.string().max(255) }),
});

const FileSchema = z.object({
  filename: z.string().max(1024),
  status: z.string().max(32),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  patch: z.string().optional().nullable(),
});

const CommitSchema = z.object({ commit: z.object({ message: z.string() }) });

const CompareSchema = z.object({
  html_url: z.string().url().optional(),
  commits: z.array(CommitSchema).max(1000),
  files: z.array(FileSchema).max(3000).optional().default([]),
});

const toFile = (f: z.infer<typeof FileSchema>): ChangedFile => ({
  path: f.filename,
  status: f.status,
  additions: f.additions,
  deletions: f.deletions,
  ...(f.patch ? { patch: f.patch } : {}),
});

const subject = (c: z.infer<typeof CommitSchema>) => c.commit.message.split("\n")[0].slice(0, 300);

export class GitHubPrClient {
  private readonly apiBase: string;
  private readonly opts: PrClientOptions;

  constructor(opts: PrClientOptions = {}) {
    this.opts = opts;
    this.apiBase = (opts.apiBase || DEFAULT_API_BASE).replace(/\/+$/, "");
  }

  async getContext(target: ReviewTarget): Promise<ReviewContext> {
    const repoPath = `/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}`;
    const name = `${target.owner}/${target.repo}`;
    const repo = await this.json(repoPath, RepoSchema, () => new ResolveError("REPO_NOT_FOUND", `We couldn't find a repository at github.com/${name}.`));
    if (this.opts.publicOnly && repo.private) {
      throw new ResolveError("REPO_NOT_FOUND", `We couldn't find a public repository at github.com/${name}.`);
    }

    if (target.kind === "pr") {
      const notFound = () => new ResolveError("PR_NOT_FOUND", `Pull request #${target.number} wasn't found in ${name}.`);
      const pr = await this.json(`${repoPath}/pulls/${target.number}`, PullSchema, notFound);
      const [files, commits] = await Promise.all([
        this.paged(`${repoPath}/pulls/${target.number}/files`, FileSchema, Math.ceil(MAX_FILES / 100)),
        this.paged(`${repoPath}/pulls/${target.number}/commits`, CommitSchema, 3),
      ]);
      return {
        source: "pr",
        repo: name,
        number: pr.number,
        title: pr.title,
        description: (pr.body ?? "").slice(0, 20_000),
        state: pr.merged || pr.merged_at ? "merged" : pr.state === "closed" ? "closed" : pr.draft ? "draft" : "open",
        base: pr.base.ref,
        head: pr.head.ref,
        url: pr.html_url,
        author: pr.user?.login,
        commits: commits.map(subject),
        files: files.slice(0, MAX_FILES).map(toFile),
      };
    }

    const base = target.base ?? repo.default_branch;
    const spec = `${encodeURIComponent(base)}...${encodeURIComponent(target.head)}`;
    const cmp = await this.json(
      `${repoPath}/compare/${spec}?per_page=100`,
      CompareSchema,
      () => new ResolveError("PR_NOT_FOUND", `Couldn't compare ${base}...${target.head} in ${name}. Check both branches exist.`),
    );
    const commits = cmp.commits.map(subject);
    return {
      source: "branch",
      repo: name,
      title: commits.at(-1) ?? target.head,
      description: commits.length > 1 ? commits.map((c) => `- ${c}`).join("\n") : "",
      state: "branch",
      base,
      head: target.head,
      url: `https://github.com/${name}/compare/${spec}`,
      commits,
      files: cmp.files.slice(0, MAX_FILES).map(toFile),
    };
  }

  private async paged<T>(path: string, item: z.ZodType<T>, maxPages: number): Promise<T[]> {
    const out: T[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const batch = await this.json(`${path}?per_page=100&page=${page}`, z.array(item).max(100));
      out.push(...batch);
      if (batch.length < 100) break;
    }
    return out;
  }

  private async json<T>(path: string, schema: z.ZodType<T>, notFound?: () => ResolveError): Promise<T> {
    const res = await this.request(path);
    if (res.status === 404 || res.status === 422) {
      throw notFound?.() ?? new ResolveError("PR_NOT_FOUND", "GitHub couldn't find that.");
    }
    if (!res.ok) throw httpError(res, !!this.opts.token);
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new ResolveError("UPSTREAM", "GitHub returned a response we couldn't read.");
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new ResolveError("UPSTREAM", "GitHub returned pull request data in an unexpected format.");
    return parsed.data;
  }

  private async request(path: string): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": this.opts.userAgent ?? "onecliq-review",
    };
    if (this.opts.token) headers.Authorization = `Bearer ${this.opts.token}`;
    try {
      return await (this.opts.fetch ?? fetch)(`${this.apiBase}${path}`, {
        headers,
        redirect: "follow",
        signal: AbortSignal.timeout(this.opts.timeoutMs ?? 15_000),
        cache: "no-store",
      });
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === "TimeoutError" || name === "AbortError") throw new ResolveError("TIMEOUT", "GitHub took too long to respond. Please try again.");
      throw new ResolveError("NETWORK", "We couldn't reach GitHub. Check your connection and try again.");
    }
  }
}

function httpError(res: Response, hasToken: boolean): ResolveError {
  const remaining = res.headers.get("x-ratelimit-remaining");
  const reset = Number(res.headers.get("x-ratelimit-reset"));
  if (res.status === 429 || (res.status === 403 && remaining === "0")) {
    const retryAfter = Number.isFinite(reset) && reset > 0 ? Math.max(1, Math.ceil(reset - Date.now() / 1000)) : 60;
    return new ResolveError("RATE_LIMITED", "GitHub's rate limit was reached. Please try again shortly.", { retryAfter });
  }
  if (res.status === 401 || res.status === 403) {
    return new ResolveError(
      "PR_NOT_FOUND",
      hasToken ? "GitHub refused access. Check the token can read this repository." : "GitHub refused access. Set GITHUB_TOKEN to review private repositories.",
    );
  }
  return new ResolveError("UPSTREAM", `GitHub returned an error (${res.status}). Please try again.`);
}
