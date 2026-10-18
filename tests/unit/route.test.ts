import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

// The routes use the global fetch through the shared clients; stub it per test.
let routes: Record<string, { status: number; body: unknown }> = {};

beforeEach(() => {
  vi.resetModules();
  delete process.env.VIRUSTOTAL_API_KEY;
  routes = {};
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input)
        .replace("https://api.github.com", "")
        .replace("https://www.virustotal.com/api/v3", "");
      const r = routes[path];
      return new Response(JSON.stringify(r?.body ?? {}), { status: r?.status ?? 404 });
    }),
  );
});

afterEach(() => {
  delete process.env.VIRUSTOTAL_API_KEY;
  vi.unstubAllGlobals();
});

async function post(body: unknown, headers: Record<string, string> = { "content-type": "application/json" }) {
  const { POST } = await import("@/app/api/resolve/route");
  const res = await POST(
    new Request("http://localhost/api/resolve", {
      method: "POST",
      headers: { "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}`, ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
  return { status: res.status, json: await res.json(), headers: res.headers };
}

const asset = (name: string) => ({
  name,
  size: 2048,
  state: "uploaded",
  browser_download_url: `https://github.com/acme/tool/releases/download/v1.2.0/${name}`,
});

describe("POST /api/resolve", () => {
  it("resolves a repository URL", async () => {
    routes["/repos/acme/tool/releases/latest"] = {
      status: 200,
      body: {
        tag_name: "v1.2.0",
        name: "Tool 1.2",
        html_url: "https://github.com/acme/tool/releases/tag/v1.2.0",
        draft: false,
        prerelease: false,
        published_at: "2026-09-01T00:00:00Z",
        assets: [asset("tool-1.2.0-darwin-arm64.dmg"), asset("tool-1.2.0-windows-x64.msi")],
      },
    };
    const { status, json, headers } = await post({ url: "https://github.com/acme/tool", os: "macos", arch: "arm64" });
    expect(status).toBe(200);
    expect(headers.get("cache-control")).toBe("no-store");
    expect(json).toMatchObject({
      ok: true,
      release: { tag: "v1.2.0", name: "Tool 1.2" },
      recommendation: { status: "recommended", asset: { name: "tool-1.2.0-darwin-arm64.dmg", kind: "installer" } },
    });
    // Internal confidence is never exposed.
    expect(JSON.stringify(json)).not.toMatch(/confidence/);
  });

  it("rejects non-GitHub URLs with 400", async () => {
    const { status, json } = await post({ url: "https://example.com/acme/tool", os: "linux", arch: "x64" });
    expect(status).toBe(400);
    expect(json).toEqual({ ok: false, error: { code: "INVALID_URL", message: expect.any(String) } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects bad platform values", async () => {
    const { status, json } = await post({ url: "https://github.com/a/b", os: "beos", arch: "x64" });
    expect(status).toBe(400);
    expect(json.error.code).toBe("INVALID_REQUEST");
  });

  it("rejects non-JSON bodies", async () => {
    expect((await post("url=x", { "content-type": "text/plain" })).status).toBe(400);
    expect((await post("{not json")).status).toBe(400);
  });

  it("rejects oversized bodies", async () => {
    const { status } = await post({ url: "https://github.com/a/b", os: "linux", arch: "x64", pad: "x".repeat(5000) });
    expect(status).toBe(400);
  });

  it("returns 404 for missing repositories", async () => {
    const { status, json } = await post({ url: "https://github.com/acme/missing", os: "linux", arch: "x64" });
    expect(status).toBe(404);
    expect(json.error.code).toBe("REPO_NOT_FOUND");
  });

  it("never includes stack traces", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("boom at secret/path.ts:12"); }));
    const { status, json } = await post({ url: "https://github.com/acme/tool", os: "linux", arch: "x64" });
    expect(status).toBe(502);
    expect(JSON.stringify(json)).not.toMatch(/boom|path\.ts|stack/);
  });
});

describe("POST /api/malware", () => {
  const HEX = "e".repeat(64);
  const body = { url: "https://github.com/acme/tool", os: "linux", arch: "x64" };

  function releaseFixture(withDigest = true) {
    return {
      tag_name: "v1.2.0",
      name: "Tool 1.2",
      html_url: "https://github.com/acme/tool/releases/tag/v1.2.0",
      draft: false,
      prerelease: false,
      published_at: "2026-09-01T00:00:00Z",
      assets: [
        {
          name: "tool-1.2.0-linux-x64.tar.gz",
          size: 2048,
          state: "uploaded",
          digest: withDigest ? `sha256:${HEX}` : null,
          browser_download_url: "https://github.com/acme/tool/releases/download/v1.2.0/tool-1.2.0-linux-x64.tar.gz",
        },
      ],
    };
  }

  function vtBody(malicious: number) {
    return {
      data: {
        attributes: {
          last_analysis_stats: { malicious, suspicious: 0, harmless: 60, undetected: 10 },
          last_analysis_date: 1770000000,
          last_analysis_results:
            malicious > 0
              ? { "ENGINE-E": { category: "malicious", result: "Trojan.Script.X", engine_name: "EngineE" } }
              : {},
        },
      },
    };
  }

  async function postMalware(payload: unknown) {
    const { POST } = await import("@/app/api/malware/route");
    const res = await POST(
      new Request("http://localhost/api/malware", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": `10.2.0.${Math.floor(Math.random() * 250)}` },
        body: JSON.stringify(payload),
      }),
    );
    return { status: res.status, json: await res.json(), headers: res.headers };
  }

  const fetchedUrls = () => (fetch as unknown as Mock).mock.calls.map((c) => String(c[0]));

  it("reports engine detections for the recommended file", async () => {
    process.env.VIRUSTOTAL_API_KEY = "test-key";
    routes["/repos/acme/tool/releases/latest"] = { status: 200, body: releaseFixture() };
    routes[`/files/${HEX}`] = { status: 200, body: vtBody(5) };
    const { status, json, headers } = await postMalware(body);
    expect(status).toBe(200);
    expect(headers.get("cache-control")).toBe("no-store");
    expect(json).toMatchObject({
      ok: true,
      file: "tool-1.2.0-linux-x64.tar.gz",
      malware: { status: "flagged", sha256: HEX, permalink: `https://www.virustotal.com/gui/file/${HEX}` },
    });
    // Only the hash goes to VirusTotal — never the file.
    expect(fetchedUrls()).toContain(`https://www.virustotal.com/api/v3/files/${HEX}`);
  });

  it("degrades gracefully without a VirusTotal key", async () => {
    routes["/repos/acme/tool/releases/latest"] = { status: 200, body: releaseFixture() };
    const { status, json } = await postMalware(body);
    expect(status).toBe(200);
    expect(json.malware.status).toBe("unavailable");
    expect(JSON.stringify(json)).toContain("No VirusTotal API key");
    expect(fetchedUrls().some((u) => u.includes("virustotal"))).toBe(false);
  });

  it("stays graceful when VirusTotal rate limits us", async () => {
    process.env.VIRUSTOTAL_API_KEY = "test-key";
    routes["/repos/acme/tool/releases/latest"] = { status: 200, body: releaseFixture() };
    routes[`/files/${HEX}`] = { status: 429, body: {} };
    const { status, json } = await postMalware(body);
    expect(status).toBe(200);
    expect(json.malware.status).toBe("unavailable");
    expect(json.malware.checks.find((c: { id: string }) => c.id === "reputation").detail).toContain("Couldn't ask");
  });

  it("marks files without a published digest as unknown", async () => {
    process.env.VIRUSTOTAL_API_KEY = "test-key";
    routes["/repos/acme/tool/releases/latest"] = { status: 200, body: releaseFixture(false) };
    const { status, json } = await postMalware(body);
    expect(status).toBe(200);
    expect(json.malware.status).toBe("unknown");
    expect(fetchedUrls().some((u) => u.includes("virustotal"))).toBe(false);
  });

  it("validates the request body", async () => {
    const { status, json } = await postMalware({ url: "https://github.com/a/b", os: "beos", arch: "x64" });
    expect(status).toBe(400);
    expect(json.error.code).toBe("INVALID_REQUEST");
    expect(fetch).not.toHaveBeenCalled();
  });
});
