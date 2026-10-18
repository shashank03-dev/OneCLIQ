import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { GitHubClient } from "@/core/github";
import { TtlCache } from "@/core/cache";
import { VirusTotalClient } from "@/core/virustotal";
import { buildTools, handleMessage } from "../../cli/src/mcp";

const HEX = "a".repeat(64);

const release = {
  tag_name: "v1.0.0",
  name: "v1.0.0",
  html_url: "https://github.com/acme/agent/releases/tag/v1.0.0",
  draft: false,
  prerelease: false,
  published_at: "2026-01-01T00:00:00Z",
  assets: ["agent-linux-arm64.tar.gz", "agent-darwin-arm64.tar.gz"].map((name) => ({
    name,
    size: 4096,
    state: "uploaded",
    digest: name.includes("linux") ? `sha256:${HEX}` : null,
    browser_download_url: `https://github.com/acme/agent/releases/download/v1.0.0/${name}`,
  })),
};

function tools(allowDownload = false) {
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input)
      .replace("https://api.github.com", "")
      .replace("https://www.virustotal.com/api/v3", "");
    if (path === "/repos/acme/agent/releases/latest") return new Response(JSON.stringify(release), { status: 200 });
    if (path === `/files/${HEX}`) {
      return new Response(
        JSON.stringify({
          data: {
            attributes: {
              last_analysis_stats: { malicious: 2, suspicious: 1, harmless: 40, undetected: 7 },
              last_analysis_results: { E1: { category: "malicious", result: "Trojan.Agent", engine_name: "EngineOne" } },
            },
          },
        }),
        { status: 200 },
      );
    }
    return new Response("{}", { status: 404 });
  });
  const client = () => new GitHubClient({ fetch: fetchImpl as unknown as typeof fetch, cache: new TtlCache() });
  const vt = () => new VirusTotalClient({ apiKey: "test-key", fetch: fetchImpl as unknown as typeof fetch, cache: new TtlCache() });
  return buildTools({ client, vt, system: { os: "macos", arch: "arm64", detail: "test" }, version: "9.9.9", allowDownload, cwd: process.cwd() });
}

const call = (id: number, method: string, params?: unknown) => ({ jsonrpc: "2.0", id, method, params });

describe("oqgit mcp", () => {
  it("negotiates the protocol version", async () => {
    const res = await handleMessage(call(1, "initialize", { protocolVersion: "2025-06-18" }), tools(), "9.9.9");
    expect(res).toMatchObject({ id: 1, result: { protocolVersion: "2025-06-18", serverInfo: { name: "oqgit", version: "9.9.9" } } });
    const unknown = await handleMessage(call(2, "initialize", { protocolVersion: "1999-01-01" }), tools(), "9.9.9");
    expect((unknown as { result: { protocolVersion: string } }).result.protocolVersion).toBe("2025-11-25");
  });

  it("ignores notifications and rejects unknown methods", async () => {
    expect(await handleMessage({ jsonrpc: "2.0", method: "notifications/initialized" }, tools(), "x")).toBeNull();
    expect(await handleMessage(call(3, "resources/list"), tools(), "x")).toMatchObject({ error: { code: -32601 } });
  });

  it("is read-only unless --allow-download", async () => {
    const list = async (t: ReturnType<typeof tools>) =>
      ((await handleMessage(call(4, "tools/list"), t, "x")) as { result: { tools: { name: string }[] } }).result.tools.map((x) => x.name);
    expect(await list(tools())).not.toContain("download_release");
    expect(await list(tools(true))).toContain("download_release");
  });

  it("resolves a release for another platform", async () => {
    const res = (await handleMessage(
      call(5, "tools/call", { name: "resolve_release", arguments: { target: "acme/agent", os: "linux", arch: "arm64" } }),
      tools(),
      "x",
    )) as { result: { isError: boolean; structuredContent: { recommendation: { asset: { name: string } } } } };
    expect(res.result.isError).toBe(false);
    expect(res.result.structuredContent.recommendation.asset.name).toBe("agent-linux-arm64.tar.gz");
  });

  it("returns tool errors as isError results", async () => {
    const res = (await handleMessage(call(6, "tools/call", { name: "resolve_release", arguments: {} }), tools(), "x")) as {
      result: { isError: boolean; content: { text: string }[] };
    };
    expect(res.result.isError).toBe(true);
    expect(res.result.content[0].text).toMatch(/target/);
  });

  it("checks a file's hash against VirusTotal", async () => {
    const res = (await handleMessage(
      call(7, "tools/call", { name: "check_malware", arguments: { target: "acme/agent", os: "linux", arch: "arm64" } }),
      tools(),
      "x",
    )) as { result: { isError: boolean; structuredContent: { file: string; malware: { status: string; sha256: string } } } };
    expect(res.result.isError).toBe(false);
    expect(res.result.structuredContent.malware).toMatchObject({ status: "flagged", sha256: HEX });
  });

  it("checks downloaded bytes even when GitHub published no digest", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "oqgit-mcp-test-"));
    const body = Buffer.from("downloaded release");
    const sha256 = createHash("sha256").update(body).digest("hex");
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/releases/latest")) return Response.json({ ...release, assets: [{ ...release.assets[1], size: body.length }] });
      if (url === release.assets[1].browser_download_url) return new Response(body);
      if (url.endsWith(`/files/${sha256}`)) return Response.json({ data: { attributes: {
        last_analysis_stats: { malicious: 2, suspicious: 0, harmless: 40, undetected: 7 },
      } } });
      return new Response("{}", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchImpl);
    try {
      const gh = new GitHubClient({ fetch: fetchImpl, cache: new TtlCache() });
      const vt = new VirusTotalClient({ apiKey: "test-key", fetch: fetchImpl, cache: new TtlCache() });
      const download = buildTools({ client: () => gh, vt: () => vt, system: { os: "macos", arch: "arm64", detail: "test" }, version: "x", allowDownload: true, cwd: dir })
        .find((t) => t.name === "download_release")!;
      const result = await download.run({ target: "acme/agent", allow_weak: true }) as { malware: { status: string; sha256: string }; path: string };
      expect(result.malware).toMatchObject({ status: "flagged", sha256 });
      expect(await readFile(result.path)).toEqual(body);
    } finally {
      vi.unstubAllGlobals();
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("keeps the reputation budget across MCP tool calls", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      if (String(input).includes("api.github.com")) return Response.json({ ...release, assets: release.assets.map((a, i) => ({ ...a, digest: `sha256:${String(i + 1).repeat(64)}` })) });
      return new Response("{}", { status: 404 });
    };
    const t = buildTools({
      client: () => new GitHubClient({ fetch: fetchImpl, cache: new TtlCache() }),
      vt: () => new VirusTotalClient({ apiKey: "test-key", fetch: fetchImpl, cache: new TtlCache(), maxPerMinute: 1 }),
      system: { os: "linux", arch: "arm64", detail: "test" }, version: "x", allowDownload: false, cwd: process.cwd(),
    }).find((t) => t.name === "check_malware")!;
    const first = await t.run({ target: "acme/agent", os: "linux" }) as { malware: { status: string } };
    const second = await t.run({ target: "acme/agent", os: "macos" }) as { malware: { status: string } };
    expect(first.malware.status).toBe("unknown");
    expect(second.malware.status).toBe("unavailable");
  });
});
