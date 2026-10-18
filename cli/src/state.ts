/** Records what oqgit downloaded so `list`, `outdated` and `update` can work. */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Arch, Os } from "../../src/core/types";

export interface TrackedDownload {
  repo: string; // owner/name
  tag: string;
  asset: string;
  path: string;
  os: Os;
  arch: Arch;
  sha256: string;
  downloadedAt: string;
  /** Pinned to a specific tag: skipped by `update`. */
  pinned?: boolean;
}

interface StateFile {
  version: 1;
  downloads: TrackedDownload[];
}

export function stateDir(): string {
  if (process.env.OQGIT_HOME) return process.env.OQGIT_HOME;
  if (process.platform === "win32") return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "oqgit");
  if (process.platform === "linux" && process.env.XDG_CONFIG_HOME) return path.join(process.env.XDG_CONFIG_HOME, "oqgit");
  return path.join(os.homedir(), ".oqgit");
}

const statePath = () => path.join(stateDir(), "state.json");

export async function loadState(): Promise<StateFile> {
  try {
    const raw = JSON.parse(await readFile(statePath(), "utf8")) as StateFile;
    if (raw?.version === 1 && Array.isArray(raw.downloads)) return raw;
  } catch {
    /* first run or unreadable — start fresh */
  }
  return { version: 1, downloads: [] };
}

async function saveState(state: StateFile): Promise<void> {
  await mkdir(stateDir(), { recursive: true });
  const tmp = `${statePath()}.tmp`;
  await writeFile(tmp, JSON.stringify(state, null, 2));
  await rename(tmp, statePath());
}

/** One entry per repo + platform; newer downloads replace older ones. */
export async function track(entry: TrackedDownload): Promise<void> {
  const state = await loadState();
  const key = (d: TrackedDownload) => `${d.repo.toLowerCase()}|${d.os}|${d.arch}`;
  state.downloads = state.downloads.filter((d) => key(d) !== key(entry));
  state.downloads.push(entry);
  await saveState(state);
}

export async function untrack(repo: string): Promise<number> {
  const state = await loadState();
  const before = state.downloads.length;
  state.downloads = state.downloads.filter((d) => d.repo.toLowerCase() !== repo.toLowerCase());
  await saveState(state);
  return before - state.downloads.length;
}

/** Per-model input-token caps learned from Gemini quota errors, so later reviews trim before sending. */
const limitsFile = () => path.join(stateDir(), "review-limits.json");

export async function loadInputLimit(model: string): Promise<number | undefined> {
  try {
    const n = (JSON.parse(await readFile(limitsFile(), "utf8")) as Record<string, unknown>)[model];
    return typeof n === "number" && n > 0 ? n : undefined;
  } catch {
    return undefined;
  }
}

export async function saveInputLimit(model: string, limit: number): Promise<void> {
  let all: Record<string, number> = {};
  try {
    all = JSON.parse(await readFile(limitsFile(), "utf8"));
  } catch {
    /* first write */
  }
  all[model] = limit;
  await mkdir(stateDir(), { recursive: true });
  await writeFile(limitsFile(), JSON.stringify(all, null, 2));
}
