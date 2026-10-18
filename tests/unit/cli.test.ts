import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DownloadError, downloadAsset, safeFileName } from "../../cli/src/download";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "oqgit-test-"));
});
afterEach(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

const ASSET = "https://github.com/acme/tool/releases/download/v1.0.0/tool-linux-x64.tar.gz";
const BODY = Buffer.from("hello oqgit");
const SHA = createHash("sha256").update(BODY).digest("hex");

function fetchSequence(responses: Array<() => Response>) {
  const calls: string[] = [];
  const impl = (async (url: string) => {
    calls.push(String(url));
    const next = responses.shift();
    if (!next) throw new Error("unexpected request");
    return next();
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const redirect = (to: string) => () => new Response(null, { status: 302, headers: { location: to } });
const file = () => () => new Response(BODY, { status: 200, headers: { "content-length": String(BODY.length) } });

describe("safeFileName", () => {
  it.each([
    ["tool.tar.gz", "tool.tar.gz"],
    ["../../etc/passwd", "passwd"],
    ["..\\..\\evil.exe", "evil.exe"],
    ["a<b>c.zip", "a_b_c.zip"],
  ])("%s → %s", (input, out) => expect(safeFileName(input)).toBe(out));

  it("rejects empty names", () => expect(() => safeFileName("..")).toThrow(DownloadError));
});

describe("downloadAsset", () => {
  it("follows GitHub redirects, writes the file and verifies the digest", async () => {
    const { impl, calls } = fetchSequence([redirect("https://release-assets.githubusercontent.com/x?sig=1"), file()]);
    const res = await downloadAsset({ url: ASSET, fileName: "tool.tar.gz", dir, digest: `sha256:${SHA}`, expectedSize: BODY.length, fetchImpl: impl });
    expect(calls).toHaveLength(2);
    expect(res.verified).toBe("match");
    expect(res.sha256).toBe(SHA);
    expect(await readFile(path.join(dir, "tool.tar.gz"), "utf8")).toBe("hello oqgit");
  });

  it("refuses non-GitHub starting URLs", async () => {
    const { impl } = fetchSequence([]);
    await expect(downloadAsset({ url: "https://evil.com/tool.tar.gz", fileName: "t", dir, fetchImpl: impl })).rejects.toThrow(/non-GitHub/);
  });

  it("refuses redirects to other hosts", async () => {
    const { impl } = fetchSequence([redirect("https://evil.example/payload")]);
    await expect(downloadAsset({ url: ASSET, fileName: "t", dir, fetchImpl: impl })).rejects.toThrow(/evil\.example/);
  });

  it("deletes the file when the digest doesn't match", async () => {
    const { impl } = fetchSequence([file()]);
    await expect(
      downloadAsset({ url: ASSET, fileName: "t.tar.gz", dir, digest: `sha256:${"0".repeat(64)}`, fetchImpl: impl }),
    ).rejects.toThrow(/SHA-256/);
    await expect(readFile(path.join(dir, "t.tar.gz"))).rejects.toThrow();
    await expect(readFile(path.join(dir, "t.tar.gz.part"))).rejects.toThrow();
  });

  it("won't overwrite an existing file without force", async () => {
    await writeFile(path.join(dir, "t.tar.gz"), "old");
    const { impl } = fetchSequence([file()]);
    await expect(downloadAsset({ url: ASSET, fileName: "t.tar.gz", dir, fetchImpl: impl })).rejects.toThrow(/already exists/);
    const again = fetchSequence([file()]);
    await downloadAsset({ url: ASSET, fileName: "t.tar.gz", dir, fetchImpl: again.impl, overwrite: true });
    expect(await readFile(path.join(dir, "t.tar.gz"), "utf8")).toBe("hello oqgit");
  });

  it("reports HTTP failures", async () => {
    const { impl } = fetchSequence([() => new Response("nope", { status: 404 })]);
    await expect(downloadAsset({ url: ASSET, fileName: "t", dir, fetchImpl: impl })).rejects.toThrow(/HTTP 404/);
  });
});

describe("oqgit main()", () => {
  async function run(args: string[]) {
    const out: string[] = [];
    const err: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...a) => void out.push(a.join(" ")));
    vi.spyOn(console, "error").mockImplementation((...a) => void err.push(a.join(" ")));
    const { main } = await import("../../cli/src/index");
    const code = await main(args);
    vi.restoreAllMocks();
    return { code, out: out.join("\n"), err: err.join("\n") };
  }

  beforeEach(() => {
    vi.stubEnv("OQGIT_HOME", dir);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (String(input).endsWith("/repos/acme/tool/releases/latest")) {
          return Response.json({
            tag_name: "v1.0.0",
            name: "Tool 1.0",
            html_url: "https://github.com/acme/tool/releases/tag/v1.0.0",
            draft: false,
            prerelease: false,
            published_at: "2026-01-01T00:00:00Z",
            assets: ["tool-linux-x64.tar.gz", "tool-windows-x64.zip"].map((name) => ({
              name,
              size: 10,
              state: "uploaded",
              browser_download_url: `https://github.com/acme/tool/releases/download/v1.0.0/${name}`,
            })),
          });
        }
        return new Response("{}", { status: 404 });
      }),
    );
  });

  it("resolves with --json --dry-run", async () => {
    const { code, out } = await run(["get", "acme/tool", "--os", "linux", "--arch", "x64", "--json", "--dry-run"]);
    expect(code).toBe(0);
    expect(JSON.parse(out).recommendation.asset.name).toBe("tool-linux-x64.tar.gz");
  });

  it("exits 3 when nothing fits", async () => {
    const { code, out } = await run(["get", "acme/tool", "--os", "macos", "--arch", "arm64", "--json"]);
    expect(code).toBe(3);
    expect(JSON.parse(out).recommendation).toEqual({ status: "not-recommended", reason: "no-compatible" });
  });

  it("exits 2 for invalid URLs and flags", async () => {
    expect((await run(["get", "https://gitlab.com/a/b", "--os", "linux", "--arch", "x64"])).code).toBe(2);
    expect((await run(["get", "acme/tool", "--os", "beos", "--arch", "x64"])).code).toBe(2);
    expect((await run(["--bogus"])).code).toBe(2);
  });

  it("reports missing repos", async () => {
    const { code, err } = await run(["get", "acme/missing", "--os", "linux", "--arch", "x64", "--dry-run"]);
    expect(code).toBe(1);
    expect(err).toMatch(/couldn't find a public repository/);
  });

  it("prints help and version", async () => {
    expect((await run(["--help"])).out).toMatch(/oqgit/);
    expect((await run(["--version"])).out).toMatch(/\d+\.\d+\.\d+/);
  });

  const HEX_A = "a".repeat(64);
  const HEX_B = "b".repeat(64);
  function digestFetchStub(repo: string, hex: string) {
    return vi.fn(async (input: string) => {
      const url = String(input);
      if (url.endsWith(`/repos/${repo}/releases/latest`)) {
        return Response.json({
          tag_name: "v1.0.0",
          name: "Tool 1.0",
          html_url: `https://github.com/${repo}/releases/tag/v1.0.0`,
          draft: false,
          prerelease: false,
          published_at: "2026-01-01T00:00:00Z",
          assets: [
            {
              name: "tool-linux-x64.tar.gz",
              size: 10,
              state: "uploaded",
              digest: `sha256:${hex}`,
              browser_download_url: `https://github.com/${repo}/releases/download/v1.0.0/tool-linux-x64.tar.gz`,
            },
          ],
        });
      }
      if (url === `https://www.virustotal.com/api/v3/files/${hex}`) {
        return Response.json({
          data: {
            attributes: {
              last_analysis_stats: { malicious: 3, suspicious: 0, harmless: 50, undetected: 7 },
              last_analysis_results: { E1: { category: "malicious", result: "Trojan.Agent", engine_name: "EngineOne" } },
            },
          },
        });
      }
      return new Response("{}", { status: 404 });
    });
  }

  it("checks a release's file against VirusTotal", async () => {
    vi.stubEnv("VIRUSTOTAL_API_KEY", "test-key");
    vi.stubGlobal("fetch", digestFetchStub("acme/malware-a", HEX_A));
    const { code, out } = await run(["malware", "acme/malware-a", "--os", "linux", "--arch", "x64", "--json"]);
    expect(code).toBe(4);
    const parsed = JSON.parse(out);
    expect(parsed.file).toBe("tool-linux-x64.tar.gz");
    expect(parsed.malware.status).toBe("flagged");
    expect(parsed.malware.sha256).toBe(HEX_A);
    expect(parsed.malware.checks.find((ch: { id: string }) => ch.id === "reputation").detail).toMatch(/3 of 60/);
  });

  it("explains a missing VirusTotal key", async () => {
    vi.stubGlobal("fetch", digestFetchStub("acme/malware-b", HEX_B));
    const { code, out } = await run(["malware", "acme/malware-b", "--os", "linux", "--arch", "x64", "--json"]);
    expect(code).toBe(0);
    const parsed = JSON.parse(out);
    expect(parsed.malware.status).toBe("unavailable");
    expect(JSON.stringify(parsed)).toMatch(/No VirusTotal API key/);
  });

  it("requires ClamAV for --local", async () => {
    vi.stubEnv("OQGIT_CLAMSCAN", path.join(dir, "no-such-clamscan"));
    const { code, err } = await run(["malware", "acme/tool", "--os", "linux", "--arch", "x64", "--local"]);
    expect(code).toBe(2);
    expect(err).toMatch(/ClamAV/);
  });

  it.each([
    { extra: [], code: 4, kept: false },
    { extra: ["--force"], code: 0, kept: true },
    { extra: ["--no-malware"], code: 0, kept: true },
  ])("handles a flagged download with flags $extra", async ({ extra, code, kept }) => {
    vi.resetModules();
    vi.stubEnv("VIRUSTOTAL_API_KEY", "test-key");
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/repos/acme/flagged/releases/latest")) return Response.json({
        tag_name: "v1.0.0", name: "Flagged", html_url: "https://github.com/acme/flagged/releases/tag/v1.0.0",
        draft: false, prerelease: false, published_at: "2026-01-01T00:00:00Z",
        assets: [{ name: "tool-linux-x64.tar.gz", size: BODY.length, digest: `sha256:${SHA}`, state: "uploaded",
          browser_download_url: "https://github.com/acme/flagged/releases/download/v1.0.0/tool-linux-x64.tar.gz" }],
      });
      if (url.includes("/releases/download/")) return new Response(BODY);
      if (url.endsWith(`/files/${SHA}`)) return Response.json({ data: { attributes: {
        last_analysis_stats: { malicious: 1, suspicious: 0, harmless: 40, undetected: 7 },
      } } });
      return new Response("{}", { status: 404 });
    });
    const result = await run(["get", "acme/flagged", "--os", "linux", "--arch", "x64", "--yes", "--json", "--out", dir, ...extra]);
    expect(result.code).toBe(code);
    const parsed = JSON.parse(result.out);
    expect(parsed.ok).toBe(kept);
    if (extra.includes("--no-malware")) expect(parsed.malware).toBeNull();
    else expect(parsed.malware.status).toBe("flagged");
    const saved = path.join(dir, "tool-linux-x64.tar.gz");
    if (kept) expect(await readFile(saved)).toEqual(BODY);
    else {
      await expect(readFile(saved)).rejects.toThrow();
      await expect(readFile(path.join(dir, "state.json"))).rejects.toThrow();
    }
  });

  it("shows help for one command, by name or alias", async () => {
    expect((await run(["help", "get"])).out).toMatch(/oqgit get <repo>[\s\S]*--dry-run/);
    expect((await run(["get", "--help"])).out).toMatch(/oqgit get <repo>/);
    expect((await run(["help", "dl"])).out).toMatch(/oqgit get <repo>/);
    expect((await run(["help", "all"])).out).toMatch(/--allow-download/);
    expect((await run(["help", "nope"])).code).toBe(2);
  });

  it("reads plain OS and CPU words after the repo", async () => {
    const linux = await run(["acme/tool", "linux", "x64", "--json", "--dry-run"]);
    expect(linux.code).toBe(0);
    expect(JSON.parse(linux.out).recommendation.asset.name).toBe("tool-linux-x64.tar.gz");
    const win = await run(["get", "acme/tool", "win", "amd64", "--json", "--dry-run"]);
    expect(JSON.parse(win.out).recommendation.asset.name).toBe("tool-windows-x64.zip");
    expect((await run(["get", "acme/tool", "--os", "mac", "--arch", "intel", "--json"])).code).toBe(3);
    const bad = await run(["get", "acme/tool", "banana"]);
    expect(bad.code).toBe(2);
    expect(bad.err).toMatch(/Didn't understand “banana”/);
  });

  it("reads owner/repo@tag as a release tag", async () => {
    const { code, err } = await run(["acme/tool@v0.9.0", "linux", "x64", "--dry-run"]);
    expect(code).toBe(1);
    expect(vi.mocked(fetch).mock.calls.some(([u]) => String(u).endsWith("/repos/acme/tool/releases/tags/v0.9.0"))).toBe(true);
    expect(err).not.toBe("");
  });

  it("accepts aliases and suggests a fix for typos", async () => {
    const { code, out } = await run(["download", "acme/tool", "--os", "linux", "--arch", "x64", "--json", "--dry-run"]);
    expect(code).toBe(0);
    expect(JSON.parse(out).recommendation.asset.name).toBe("tool-linux-x64.tar.gz");
    const typo = await run(["gte", "acme/tool"]);
    expect(typo.code).toBe(2);
    expect(typo.err).toMatch(/Did you mean .*oqgit get/);
  });
});
