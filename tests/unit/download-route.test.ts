import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let release: Record<string, unknown>;
let privateRepo = false;
let upstreamStatus = 200;

beforeEach(() => {
  vi.resetModules();
  privateRepo = false;
  upstreamStatus = 200;
  release = {
    tag_name: "v1.2.0", name: "Tool 1.2", html_url: "https://github.com/acme/tool/releases/tag/v1.2.0",
    draft: false, prerelease: false, published_at: "2026-09-01T00:00:00Z",
    assets: [asset("tool-linux-x64.tar.gz")],
  };
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const path = new URL(String(input)).pathname;
    if (path === "/repos/acme/tool") return Response.json({ private: privateRepo });
    if (path === "/repos/acme/tool/releases/latest") return Response.json(release, { status: upstreamStatus, headers: upstreamStatus === 429 ? { "retry-after": "45" } : {} });
    if (path === "/repos/acme/tool/releases") return Response.json([release]);
    return Response.json({}, { status: 404 });
  }));
});
afterEach(() => vi.unstubAllGlobals());

function asset(name: string, url = `https://github.com/acme/tool/releases/download/v1.2.0/${name}`) {
  return { name, size: 2048, state: "uploaded", browser_download_url: url };
}
async function get(query = "repo=acme/tool&os=linux&arch=x64") {
  const { GET } = await import("@/app/api/download/route");
  return GET(new Request(`https://onecliq.example/api/download?${query}`));
}

describe("GET /api/download", () => {
  it("temporarily redirects to the latest matching stable GitHub asset", async () => {
    const res = await get();
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://github.com/acme/tool/releases/download/v1.2.0/tool-linux-x64.tar.gz");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it.each(["repo=https://evil.example/x&os=linux&arch=x64", "repo=acme/tool&os=beos&arch=x64", "repo=acme/tool&os=macos&arch=x86", "repo=acme/tool&os=linux", "repo=acme/tool/releases/tag/v9&os=linux&arch=x64", "repo=acme/tool&repo=other/repo&os=linux&arch=x64"])("rejects invalid or incomplete targets: %s", async (query) => {
    expect((await get(query)).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("never redirects to an unstable release, even if latest is mislabeled", async () => {
    release.tag_name = "v2.0.0-rc.1";
    const res = await get();
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NO_STABLE_RELEASE");
    expect(res.headers.has("location")).toBe(false);
  });

  it.each([
    [asset("source-src.zip")],
    [asset("tool-cli-linux-x64.tar.gz"), asset("tool-server-linux-x64.tar.gz")],
    [asset("tool-linux-x64.tar.gz", "https://evil.example/payload")],
    [asset("tool-windows-x64.msi")],
  ])("does not redirect without one reliable compatible file", async (...assets) => {
    release.assets = assets;
    const res = await get();
    expect(res.status).toBe(422);
    expect(res.headers.has("location")).toBe(false);
    expect((await res.json()).message).toBeTruthy();
  });

  it("does not expose private repositories", async () => {
    privateRepo = true;
    expect((await get()).status).toBe(404);
    expect(vi.mocked(fetch).mock.calls).toHaveLength(1);
  });

  it("preserves GitHub rate limit retry headers", async () => {
    upstreamStatus = 429;
    const res = await get();
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("45");
  });

  it("rate limits direct links before spending GitHub quota", async () => {
    const { checkRateLimit } = await import("@/server/rate-limit");
    checkRateLimit("local", Date.now(), 1);
    const { GET } = await import("@/app/api/download/route");
    // Fill the default window shared by resolve and download routes.
    for (let i = 0; i < 30; i++) checkRateLimit("local");
    const res = await GET(new Request("https://onecliq.example/api/download?repo=acme/tool&os=linux&arch=x64"));
    expect(res.status).toBe(429);
    expect(res.headers.has("retry-after")).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });
});
