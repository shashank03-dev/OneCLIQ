import { beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubClient, isGitHubReleaseAssetUrl, looksUnstable } from "@/core/github";
import { TtlCache } from "@/core/cache";
import { ResolveError } from "@/core/errors";
import { resolve } from "@/core/resolve";
import type { Release } from "@/core/types";

function release(tag: string, opts: Partial<{ prerelease: boolean; draft: boolean; published: string; assets: string[] }> = {}) {
  return {
    tag_name: tag,
    name: `Release ${tag}`,
    html_url: `https://github.com/acme/app/releases/tag/${tag}`,
    draft: opts.draft ?? false,
    prerelease: opts.prerelease ?? false,
    published_at: opts.published ?? "2026-01-01T00:00:00Z",
    assets: (opts.assets ?? [`app-${tag}-linux-x64.tar.gz`]).map((name) => ({
      name,
      size: 1234,
      state: "uploaded",
      content_type: "application/octet-stream",
      browser_download_url: `https://github.com/acme/app/releases/download/${tag}/${name}`,
    })),
  };
}

type Route = { status: number; body?: unknown; headers?: Record<string, string> } | Error;

function mockFetch(routes: Record<string, Route>) {
  const calls: string[] = [];
  const impl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    const path = url.replace("https://api.github.com", "");
    const route = routes[path];
    expect((init?.headers as Record<string, string>)["Accept"]).toBe("application/vnd.github+json");
    if (!route) return new Response("{}", { status: 404 });
    if (route instanceof Error) throw route;
    return new Response(JSON.stringify(route.body ?? {}), { status: route.status, headers: route.headers });
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

function client(routes: Record<string, Route>, extra: Partial<ConstructorParameters<typeof GitHubClient>[0]> = {}) {
  const f = mockFetch(routes);
  return { gh: new GitHubClient({ fetch: f.impl, cache: new TtlCache<Release>(), ...extra }), calls: f.calls };
}

async function codeOf(p: Promise<unknown>) {
  try {
    await p;
  } catch (err) {
    expect(err).toBeInstanceOf(ResolveError);
    return (err as ResolveError).code;
  }
  throw new Error("expected rejection");
}

const T = { owner: "acme", repo: "app" };

describe("release selection", () => {
  it("uses /releases/latest for repository URLs", async () => {
    const { gh, calls } = client({ "/repos/acme/app/releases/latest": { status: 200, body: release("v2.0.0") } });
    const r = await gh.getRelease(T);
    expect(r.tag).toBe("v2.0.0");
    expect(calls).toEqual(["https://api.github.com/repos/acme/app/releases/latest"]);
  });

  it("falls back to the newest stable release when /latest is a pre-release-looking tag", async () => {
    const { gh } = client({
      "/repos/acme/app/releases/latest": { status: 200, body: release("v3.0.0-rc.1") },
      "/repos/acme/app/releases?per_page=30": {
        status: 200,
        body: [
          release("v3.0.0-rc.1", { published: "2026-03-01T00:00:00Z" }),
          release("v2.1.0", { published: "2026-02-01T00:00:00Z" }),
          release("v2.2.0-beta", { prerelease: true, published: "2026-02-15T00:00:00Z" }),
          release("v2.0.0", { published: "2026-01-01T00:00:00Z" }),
          release("v9.9.9", { draft: true }),
        ],
      },
    });
    expect((await gh.getRelease(T)).tag).toBe("v2.1.0");
  });

  it("reports NO_STABLE_RELEASE when only pre-releases exist", async () => {
    const { gh } = client({
      "/repos/acme/app/releases?per_page=30": { status: 200, body: [release("v1.0.0-beta", { prerelease: true })] },
    });
    expect(await codeOf(gh.getRelease(T))).toBe("NO_STABLE_RELEASE");
  });

  it("reports NO_RELEASES when the repo has none", async () => {
    const { gh } = client({ "/repos/acme/app/releases?per_page=30": { status: 200, body: [] } });
    expect(await codeOf(gh.getRelease(T))).toBe("NO_RELEASES");
  });

  it("reports REPO_NOT_FOUND for unknown repos", async () => {
    const { gh } = client({});
    expect(await codeOf(gh.getRelease(T))).toBe("REPO_NOT_FOUND");
  });

  it("resolves a specific tag without substituting another release", async () => {
    const { gh, calls } = client({
      "/repos/acme/app/releases/tags/v1.0.0-beta": { status: 200, body: release("v1.0.0-beta", { prerelease: true }) },
      "/repos/acme/app/releases/latest": { status: 200, body: release("v2.0.0") },
    });
    const r = await gh.getRelease({ ...T, tag: "v1.0.0-beta" });
    expect(r.tag).toBe("v1.0.0-beta");
    expect(r.prerelease).toBe(true);
    expect(calls).toHaveLength(1);
  });

  it("encodes tags with slashes", async () => {
    const { gh, calls } = client({
      "/repos/acme/app/releases/tags/release%2F1.0": { status: 200, body: release("release/1.0") },
    });
    await gh.getRelease({ ...T, tag: "release/1.0" });
    expect(calls[0]).toBe("https://api.github.com/repos/acme/app/releases/tags/release%2F1.0");
  });

  it("distinguishes a missing tag from a missing repo", async () => {
    const { gh } = client({ "/repos/acme/app": { status: 200, body: { id: 1 } } });
    expect(await codeOf(gh.getRelease({ ...T, tag: "nope" }))).toBe("RELEASE_NOT_FOUND");
    const { gh: gh2 } = client({});
    expect(await codeOf(gh2.getRelease({ ...T, tag: "nope" }))).toBe("REPO_NOT_FOUND");
  });

  it("caches release metadata", async () => {
    const { gh, calls } = client({ "/repos/acme/app/releases/latest": { status: 200, body: release("v2.0.0") } });
    await gh.getRelease(T);
    await gh.getRelease({ owner: "ACME", repo: "App" });
    expect(calls).toHaveLength(1);
  });
});

describe("GitHub API failures", () => {
  it("maps 403 with exhausted quota to RATE_LIMITED with retryAfter", async () => {
    const reset = Math.floor(Date.now() / 1000) + 120;
    const { gh } = client({
      "/repos/acme/app/releases/latest": {
        status: 403,
        body: { message: "API rate limit exceeded" },
        headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(reset) },
      },
    });
    try {
      await gh.getRelease(T);
      throw new Error("expected rejection");
    } catch (err) {
      expect((err as ResolveError).code).toBe("RATE_LIMITED");
      expect((err as ResolveError).retryAfter).toBeGreaterThan(100);
    }
  });

  it("maps 429 to RATE_LIMITED", async () => {
    const { gh } = client({ "/repos/acme/app/releases/latest": { status: 429, headers: { "retry-after": "30" } } });
    expect(await codeOf(gh.getRelease(T))).toBe("RATE_LIMITED");
  });

  it("maps 500 to UPSTREAM", async () => {
    const { gh } = client({ "/repos/acme/app/releases/latest": { status: 500 } });
    expect(await codeOf(gh.getRelease(T))).toBe("UPSTREAM");
  });

  it("maps 401 (bad server token) to UPSTREAM without leaking details", async () => {
    const { gh } = client({ "/repos/acme/app/releases/latest": { status: 401, body: { message: "Bad credentials" } } });
    try {
      await gh.getRelease(T);
    } catch (err) {
      expect((err as ResolveError).code).toBe("UPSTREAM");
      expect((err as ResolveError).message).not.toMatch(/credential|token/i);
    }
  });

  it("maps network errors to NETWORK", async () => {
    const { gh } = client({ "/repos/acme/app/releases/latest": new TypeError("fetch failed") });
    expect(await codeOf(gh.getRelease(T))).toBe("NETWORK");
  });

  it("maps timeouts to TIMEOUT", async () => {
    const err = new Error("timed out");
    err.name = "TimeoutError";
    const { gh } = client({ "/repos/acme/app/releases/latest": err });
    expect(await codeOf(gh.getRelease(T))).toBe("TIMEOUT");
  });

  it("rejects malformed payloads", async () => {
    const { gh } = client({ "/repos/acme/app/releases/latest": { status: 200, body: { tag_name: 42 } } });
    expect(await codeOf(gh.getRelease(T))).toBe("UPSTREAM");
  });

  it("does not cache failures", async () => {
    const routes: Record<string, Route> = { "/repos/acme/app/releases/latest": { status: 500 } };
    const { gh, calls } = client(routes);
    await codeOf(gh.getRelease(T));
    routes["/repos/acme/app/releases/latest"] = { status: 200, body: release("v1.0.0") };
    expect((await gh.getRelease(T)).tag).toBe("v1.0.0");
    expect(calls).toHaveLength(2);
  });

  it("sends the token only as an Authorization header", async () => {
    const seen: RequestInit[] = [];
    const f = (async (_url: string, init: RequestInit) => {
      seen.push(init);
      return new Response(JSON.stringify(release("v1.0.0")), { status: 200 });
    }) as unknown as typeof fetch;
    const gh = new GitHubClient({ fetch: f, token: "secret-token", cache: new TtlCache() });
    await gh.getRelease(T);
    expect((seen[0].headers as Record<string, string>).Authorization).toBe("Bearer secret-token");
  });
});

describe("asset URL safety", () => {
  it.each([
    ["https://github.com/acme/app/releases/download/v1/app.zip", true],
    ["https://github.com/acme/app/releases/download/release/1.0/app.zip", true],
    ["http://github.com/acme/app/releases/download/v1/app.zip", false],
    ["https://evil.com/acme/app/releases/download/v1/app.zip", false],
    ["https://github.com.evil.com/acme/app/releases/download/v1/app.zip", false],
    ["https://github.com/acme/app/archive/refs/tags/v1.zip", false],
    ["javascript:alert(1)", false],
  ])("%s → %s", (url, ok) => {
    expect(isGitHubReleaseAssetUrl(url)).toBe(ok);
  });

  it("drops assets that aren't hosted on github.com or aren't uploaded", async () => {
    const body = release("v1.0.0", { assets: [] });
    body.assets = [
      { name: "a-linux-x64.tar.gz", size: 10, state: "uploaded", content_type: "x", browser_download_url: "https://evil.com/a" },
      { name: "b-linux-x64.tar.gz", size: 10, state: "starter", content_type: "x", browser_download_url: "https://github.com/acme/app/releases/download/v1.0.0/b-linux-x64.tar.gz" },
      { name: "c-linux-x64.tar.gz", size: 10, state: "uploaded", content_type: "x", browser_download_url: "https://github.com/acme/app/releases/download/v1.0.0/c-linux-x64.tar.gz" },
    ];
    const { gh } = client({ "/repos/acme/app/releases/latest": { status: 200, body } });
    expect((await gh.getRelease(T)).assets.map((a) => a.name)).toEqual(["c-linux-x64.tar.gz"]);
  });
});

describe("looksUnstable", () => {
  it.each(["v1.0.0-rc.1", "2.0-beta", "nightly", "v3-alpha2", "1.0.0-preview"])("%s is unstable", (tag) => {
    expect(looksUnstable(tag)).toBe(true);
  });
  it.each(["v1.0.0", "2024.10.01", "release-5", "v2.0.0-1"])("%s is stable", (tag) => {
    expect(looksUnstable(tag)).toBe(false);
  });
});

describe("resolve()", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns a recommendation for a matching platform", async () => {
    const { gh } = client({ "/repos/acme/app/releases/latest": { status: 200, body: release("v2.0.0") } });
    const r = await resolve({ url: "https://github.com/acme/app", platform: { os: "linux", arch: "x64" } }, gh);
    expect(r.recommendation).toMatchObject({
      status: "recommended",
      asset: { name: "app-v2.0.0-linux-x64.tar.gz", format: "tar.gz", kind: "archive" },
    });
    expect(r.release).toMatchObject({ tag: "v2.0.0", name: "Release v2.0.0", prerelease: false });
  });

  it("returns not-recommended when nothing fits", async () => {
    const { gh } = client({ "/repos/acme/app/releases/latest": { status: 200, body: release("v2.0.0") } });
    const r = await resolve({ url: "https://github.com/acme/app", platform: { os: "windows", arch: "x64" } }, gh);
    expect(r.recommendation).toEqual({ status: "not-recommended", reason: "no-compatible" });
  });

  it("rejects invalid URLs before any network call", async () => {
    const { gh, calls } = client({});
    expect(await codeOf(resolve({ url: "https://example.com/a/b", platform: { os: "linux", arch: "x64" } }, gh))).toBe("INVALID_URL");
    expect(calls).toHaveLength(0);
  });
});

describe("publicOnly", () => {
  it("refuses a private repository before reading any release data", async () => {
    const { gh, calls } = client(
      { "/repos/acme/app": { status: 200, body: { private: true } }, "/repos/acme/app/releases/latest": { status: 200, body: release("v1.0.0") } },
      { publicOnly: true },
    );
    expect(await codeOf(gh.getRelease(T))).toBe("REPO_NOT_FOUND");
    expect(await codeOf(gh.listReleases(T))).toBe("REPO_NOT_FOUND");
    expect(await codeOf(gh.getAttestations(T, `sha256:${"a".repeat(64)}`))).toBe("REPO_NOT_FOUND");
    expect(calls.every((u) => u.endsWith("/repos/acme/app"))).toBe(true);
  });

  it("serves public repositories, checking visibility once", async () => {
    const { gh, calls } = client(
      { "/repos/acme/pub": { status: 200, body: { private: false } }, "/repos/acme/pub/releases/latest": { status: 200, body: release("v1.0.0") } },
      { publicOnly: true },
    );
    const target = { owner: "acme", repo: "pub" };
    expect((await gh.getRelease(target)).tag).toBe("v1.0.0");
    await gh.getRelease({ ...target, tag: undefined });
    expect(calls.filter((u) => u.endsWith("/repos/acme/pub"))).toHaveLength(1);
  });

  it("doesn't check visibility when off (the CLI, using the user's own token)", async () => {
    const { gh, calls } = client({ "/repos/acme/app/releases/latest": { status: 200, body: release("v2.0.0") } });
    expect((await gh.getRelease({ owner: "acme", repo: "app" })).tag).toBe("v2.0.0");
    expect(calls.some((u) => u.endsWith("/repos/acme/app"))).toBe(false);
  });
});
