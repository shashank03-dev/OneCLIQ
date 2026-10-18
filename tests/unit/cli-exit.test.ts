import { spawn } from "node:child_process";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// The exit path is only observable from outside the process, so these tests
// spawn the CLI against a local mock of the GitHub API. This guards the
// Windows-specific crash from `process.exit()` right after `fetch()`
// (nodejs/node#56645): the command must exit with its real code, and stderr
// must not contain a libuv assertion.

const root = fileURLToPath(new URL("../..", import.meta.url));

const release = {
  tag_name: "v1.0.0",
  name: "v1.0.0",
  html_url: "https://github.com/acme/tool/releases/tag/v1.0.0",
  draft: false,
  prerelease: false,
  published_at: "2026-01-01T00:00:00Z",
  assets: [
    {
      name: "tool-linux-x64.tar.gz",
      size: 4096,
      state: "uploaded",
      browser_download_url: "https://github.com/acme/tool/releases/download/v1.0.0/tool-linux-x64.tar.gz",
    },
  ],
};

let server: Server;
let apiBase: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    const json = (status: number, body: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (req.url === "/repos/acme/tool/releases/latest") json(200, release);
    else json(404, { message: "Not Found" });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  apiBase = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))));

interface Run {
  code: number | null;
  stdout: string;
  stderr: string;
}

function runCli(args: string[]): Promise<Run> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["--import", "tsx", "cli/src/bin.ts", ...args], {
      cwd: root,
      env: { ...process.env, OQGIT_API_BASE: apiBase, OQGIT_MIN_AGE: "", NO_COLOR: "1" },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

describe("oqgit exit behavior", () => {
  it("exits 0 after a network lookup and prints the recommendation", async () => {
    const r = await runCli(["get", "acme/tool", "--dry-run", "--os", "linux", "--arch", "x64"]);
    expect(r.stderr).not.toMatch(/Assertion failed/);
    expect(r.stdout).toContain("Recommended: tool-linux-x64.tar.gz");
    expect(r.code).toBe(0);
  }, 30_000);

  it("exits 1 on an unknown repository without crashing", async () => {
    const r = await runCli(["get", "acme/missing", "--dry-run", "--os", "linux", "--arch", "x64"]);
    expect(r.stderr).not.toMatch(/Assertion failed/);
    expect(r.stderr).toMatch(/couldn't find a public repository/);
    expect(r.code).toBe(1);
  }, 30_000);
});
