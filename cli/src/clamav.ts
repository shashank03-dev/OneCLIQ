/**
 * Local antivirus support: scans downloaded files with ClamAV when it's installed.
 * Entirely offline — file bytes never leave the machine. Everything fails soft:
 * null means "no local signal", never "clean".
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { LocalScanResult } from "../../src/core/malware";

export interface ExecResult {
  stdout: string;
  exitCode: number;
}

/** Runs one child process; injectable for tests. */
export type ClamExec = (file: string, args: string[]) => Promise<ExecResult>;

export interface ClamAvEngine {
  binary: string;
  /** e.g. "ClamAV 1.4.3" */
  version: string;
  /** Signature database build, e.g. "27411". */
  dbVersion?: string;
}

const execFileAsync = promisify(execFile);

const defaultExec: ClamExec = async (file, args) => {
  try {
    const { stdout } = await execFileAsync(file, args, { timeout: 120_000, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
    return { stdout, exitCode: 0 };
  } catch (err) {
    const e = err as { code?: number | string; stdout?: string };
    // Non-zero exits (e.g. clamscan exit 1 = infected) are results, not failures.
    if (typeof e.code === "number") return { stdout: e.stdout ?? "", exitCode: e.code };
    throw err;
  }
};

/** Look for clamscan (or clamdscan) with --version. Returns null when neither is installed. */
export async function findClamAv(exec: ClamExec = defaultExec): Promise<ClamAvEngine | null> {
  const override = process.env.OQGIT_CLAMSCAN?.trim();
  const candidates = override ? [override] : ["clamscan", "clamdscan"];
  for (const binary of candidates) {
    let res: ExecResult;
    try {
      res = await exec(binary, ["--version"]);
    } catch {
      continue;
    }
    if (res.exitCode !== 0) continue;
    const line = res.stdout.split("\n").map((l) => l.trim()).find((l) => /clamav/i.test(l)) ?? "";
    const m = /ClamAV\s+([\d.]+)\/(\d+)/i.exec(line);
    if (!m) continue;
    return { binary, version: `ClamAV ${m[1]}`, dbVersion: m[2] };
  }
  return null;
}

/** Scan one file with a detected engine. Returns null when the scan itself failed (missing binary, timeout, error). */
export async function scanFile(file: string, engine: ClamAvEngine, exec: ClamExec = defaultExec): Promise<LocalScanResult | null> {
  let res: ExecResult;
  try {
    res = await exec(engine.binary, ["--no-summary", file]);
  } catch {
    return null;
  }
  if (res.exitCode === 0) return { engine: engine.version, infected: false, dbVersion: engine.dbVersion };
  if (res.exitCode === 1) {
    const signature = /: (.+?) FOUND\s*$/m.exec(res.stdout)?.[1];
    return { engine: engine.version, infected: true, signature, dbVersion: engine.dbVersion };
  }
  return null;
}
