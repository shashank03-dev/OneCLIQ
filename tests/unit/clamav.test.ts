import { afterEach, describe, expect, it, vi } from "vitest";
import { findClamAv, scanFile, type ClamExec, type ExecResult } from "../../cli/src/clamav";

const VERSION_LINE = "ClamAV 1.4.3/27411/Wed Oct 15 06:56:31 2025\n";
const ENGINE = { binary: "clamscan", version: "ClamAV 1.4.3", dbVersion: "27411" };

function fakeExec(handler: (file: string, args: string[]) => ExecResult): ClamExec {
  return async (file, args) => handler(file, args);
}

afterEach(() => vi.unstubAllEnvs());

describe("findClamAv", () => {
  it("detects clamscan and parses the version", async () => {
    const exec = fakeExec((file, args) => {
      if (file === "clamscan" && args[0] === "--version") return { stdout: VERSION_LINE, exitCode: 0 };
      throw Object.assign(new Error("not found"), { code: "ENOENT" });
    });
    expect(await findClamAv(exec)).toEqual({ binary: "clamscan", version: "ClamAV 1.4.3", dbVersion: "27411" });
  });

  it("falls back to clamdscan", async () => {
    const exec = fakeExec((file) => {
      if (file === "clamdscan") return { stdout: VERSION_LINE, exitCode: 0 };
      throw Object.assign(new Error("not found"), { code: "ENOENT" });
    });
    expect((await findClamAv(exec))?.binary).toBe("clamdscan");
  });

  it("returns null when nothing is installed", async () => {
    const exec = fakeExec(() => {
      throw Object.assign(new Error("not found"), { code: "ENOENT" });
    });
    expect(await findClamAv(exec)).toBeNull();
  });

  it("honours OQGIT_CLAMSCAN", async () => {
    vi.stubEnv("OQGIT_CLAMSCAN", "C:/tools/clamscan.exe");
    const seen: string[] = [];
    const exec = fakeExec((file) => {
      seen.push(file);
      return { stdout: VERSION_LINE, exitCode: 0 };
    });
    expect((await findClamAv(exec))?.binary).toBe("C:/tools/clamscan.exe");
    expect(seen).toEqual(["C:/tools/clamscan.exe"]);
  });
});

describe("scanFile", () => {
  it("reports clean files", async () => {
    const exec = fakeExec(() => ({ stdout: "/tmp/f: OK\n", exitCode: 0 }));
    expect(await scanFile("/tmp/f", ENGINE, exec)).toEqual({ engine: "ClamAV 1.4.3", infected: false, dbVersion: "27411" });
  });

  it("parses the signature when infected", async () => {
    const exec = fakeExec((_file, args) => ({ stdout: `${args[1]}: Win.Trojan.Agent-123 FOUND\n`, exitCode: 1 }));
    expect(await scanFile("/tmp/f", ENGINE, exec)).toMatchObject({ infected: true, signature: "Win.Trojan.Agent-123" });
  });

  it("returns null when the scan errors", async () => {
    expect(await scanFile("/tmp/f", ENGINE, fakeExec(() => ({ stdout: "", exitCode: 2 })))).toBeNull();
  });

  it("returns null when the binary can't run", async () => {
    const exec = fakeExec(() => {
      throw new Error("timeout");
    });
    expect(await scanFile("/tmp/f", ENGINE, exec)).toBeNull();
  });
});
