import * as p from "@clack/prompts";
import os from "node:os";
import path from "node:path";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { parseArgs } from "node:util";
import { GitHubClient } from "../../src/core/github";
import { classifyAsset } from "../../src/core/match";
import { resolveDetailed } from "../../src/core/resolve";
import { ResolveError } from "../../src/core/errors";
import { KIND_LABELS, OS_LABELS, archLabel, formatBytes, noMatchMessage } from "../../src/core/labels";
import { ARCH_VALUES, OS_VALUES, type Arch, type Os, type Platform, type ReleaseAsset } from "../../src/core/types";
import { DownloadError, downloadAsset, type DownloadResult } from "./download";
import { trustFor, verifyDigest } from "../../src/core/inspect";
import { assessMalware, MALWARE_STATUS_LABELS, type LocalScanResult, type MalwareReport, type MalwareStatus } from "../../src/core/malware";
import { VirusTotalClient } from "../../src/core/virustotal";
import { findClamAv, scanFile } from "./clamav";
import { LOCKFILE_NAME, checkLock, lockTool } from "../../src/core/lockfile";
import { ALL_PLATFORMS, diffReleases, parseDuration, pickCooledRelease, platformKey } from "../../src/core/releases";
import { TRUST_LEVEL_LABELS, humanDuration, type TrustReport } from "../../src/core/trust";
import { parseGitHubUrl } from "../../src/core/parse-url";
import { lockPath, readLock, readLockOrEmpty, sha256File, syncOne, writeLock } from "./lock";
import { startMcpServer } from "./mcp";
import { copyToClipboard, makeExecutable, openFile, revealFile } from "./open";
import { GitError, localContext, originRepo } from "./git";
import { GemmaReviewer, GitHubPrClient, ModelQuotaError, SEVERITY_LABELS, parseReviewTarget, reviewChange, type ReviewResult, type Severity } from "../../src/core/review";
import { loadInputLimit, loadState, saveInputLimit, stateDir, track, untrack } from "./state";
import { detectSystem, type SystemInfo } from "./system";
import { banner, c, card, gradient, isTTY, kv, relativeTime, table } from "./ui";

declare const __OQGIT_VERSION__: string;
const VERSION = typeof __OQGIT_VERSION__ === "string" ? __OQGIT_VERSION__ : "0.0.0-dev";

const EXIT = { ok: 0, error: 1, usage: 2, noMatch: 3, policy: 4 } as const;

class UsageError extends Error {}

/** Raised when the user cancels an interactive prompt; unwinds to `main` for a clean exit. */
class CancelledError extends Error {}

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

const OPTIONS = {
  os: { type: "string" },
  arch: { type: "string" },
  tag: { type: "string", short: "t" },
  out: { type: "string", short: "o" },
  yes: { type: "boolean", short: "y" },
  "dry-run": { type: "boolean", short: "n" },
  json: { type: "boolean" },
  force: { type: "boolean", short: "f" },
  open: { type: "boolean" },
  "no-track": { type: "boolean" },
  all: { type: "boolean", short: "a" },
  "min-age": { type: "string" },
  "fail-under": { type: "string" },
  repo: { type: "string", short: "r" },
  lock: { type: "string" },
  extract: { type: "boolean" },
  "allow-download": { type: "boolean" },
  "no-trust": { type: "boolean" },
  pr: { type: "string" },
  base: { type: "string" },
  head: { type: "string" },
  goal: { type: "string", short: "g" },
  model: { type: "string" },
  copy: { type: "boolean" },
  "prompt-only": { type: "boolean" },
  strict: { type: "boolean" },
  fast: { type: "boolean" },
  "no-malware": { type: "boolean" },
  local: { type: "boolean" },
  help: { type: "boolean", short: "h" },
  version: { type: "boolean", short: "v" },
} as const;

type Flags = {
  os?: string;
  arch?: string;
  tag?: string;
  out?: string;
  yes?: boolean;
  "dry-run"?: boolean;
  json?: boolean;
  force?: boolean;
  open?: boolean;
  "no-track"?: boolean;
  all?: boolean;
  "min-age"?: string;
  "fail-under"?: string;
  repo?: string;
  lock?: string;
  extract?: boolean;
  "allow-download"?: boolean;
  "no-trust"?: boolean;
  pr?: string;
  base?: string;
  head?: string;
  goal?: string;
  model?: string;
  copy?: boolean;
  "prompt-only"?: boolean;
  strict?: boolean;
  fast?: boolean;
  "no-malware"?: boolean;
  local?: boolean;
  help?: boolean;
  version?: boolean;
};

/** Extra names people reach for, mapped to the real command. */
const ALIASES: Record<string, string> = {
  download: "get",
  dl: "get",
  show: "info",
  ls: "list",
  check: "outdated",
  upgrade: "update",
  remove: "forget",
  scan: "malware",
  rm: "forget",
};

const COMMANDS = [
  "get", "info", "list", "outdated", "update", "forget", "doctor", "help",
  "trust", "malware", "diff", "verify", "lock", "sync", "mcp", "review",
] as const;

interface CommandHelp {
  usage: string;
  about: string;
  flags?: Array<[string, string]>;
  examples: string[];
}

const PLATFORM_FLAGS: Array<[string, string]> = [
  ["<os> <cpu>", "another computer: windows, mac, linux · x64, arm64, x86"],
  ["<repo>@<tag>", "an older release instead of the latest stable one"],
];

const COMMAND_HELP: Record<string, CommandHelp> = {
  get: {
    usage: "oqgit get <repo> [os] [cpu]",
    about: "Find the right file for this computer in the latest release and download it.\nYou can skip the word `get`: `oqgit <repo>` does the same thing.",
    flags: [
      ...PLATFORM_FLAGS,
      ["-o, --out <dir>", "where to save (default: ~/Downloads)"],
      ["-y, --yes", "don't ask before downloading"],
      ["-n, --dry-run", "show the file it would pick, download nothing"],
      ["-f, --force", "overwrite a file that's already there"],
      ["--open", "open the file when done (only for files you trust)"],
      ["--no-track", "don't remember this download for `oqgit update`"],
      ["--no-malware", "skip the malware check on the downloaded file"],
      ["--min-age <3d|72h|1w>", "skip releases newer than this"],
      ["--json", "machine-readable output"],
    ],
    examples: ["oqgit sharkdp/bat", "oqgit sharkdp/bat windows arm64", "oqgit sharkdp/bat@v0.25.0", "oqgit get https://github.com/cli/cli -y", "oqgit sharkdp/bat -n"],
  },
  info: {
    usage: "oqgit info <repo> [os] [cpu]",
    about: "Show the latest release and every file in it, marking the one that fits this computer.",
    flags: [...PLATFORM_FLAGS, ["--json", "machine-readable output"]],
    examples: ["oqgit info neovim/neovim", "oqgit info cli/cli windows"],
  },
  list: {
    usage: "oqgit list",
    about: "Show the files oqgit has downloaded for you.",
    flags: [["--json", "machine-readable output"]],
    examples: ["oqgit list"],
  },
  outdated: {
    usage: "oqgit outdated",
    about: "Check whether anything you downloaded has a newer stable release. Nothing is downloaded.",
    flags: [["--min-age <3d|72h|1w>", "ignore releases newer than this"], ["--json", "machine-readable output"]],
    examples: ["oqgit outdated"],
  },
  update: {
    usage: "oqgit update [repo]",
    about: "Download newer versions of the files you've downloaded before: all of them, or just one repo.",
    flags: [
      ["-y, --yes", "update everything without asking"],
      ["--min-age <3d|72h|1w>", "skip releases newer than this"],
    ],
    examples: ["oqgit update", "oqgit update sharkdp/bat"],
  },
  forget: {
    usage: "oqgit forget <repo>",
    about: "Stop tracking a repo for updates. Files you downloaded stay where they are.",
    examples: ["oqgit forget sharkdp/bat"],
  },
  doctor: {
    usage: "oqgit doctor",
    about: "Show what oqgit detected about this computer, where it saves files, and your GitHub API quota.",
    flags: [["--json", "machine-readable output"]],
    examples: ["oqgit doctor"],
  },
  trust: {
    usage: "oqgit trust <repo> [os] [cpu]",
    about: "Explain how much you can trust the file oqgit would pick: release age, published digests,\nattestations and re-uploads. These are signals, not a malware scan.",
    flags: [...PLATFORM_FLAGS, ["--fail-under <0-100>", "exit with code 4 when the score is lower (for CI)"], ["--json", "machine-readable output"]],
    examples: ["oqgit trust cli/cli", "oqgit trust cli/cli --fail-under 60"],
  },
  malware: {
    usage: "oqgit malware <repo> [os] [cpu]",
    about: "Look up the file oqgit would pick in VirusTotal by its hash. Only the hash leaves your computer.\nWith --local, download a temp copy and scan it with ClamAV. A clean result is not a guarantee.\nSet VIRUSTOTAL_API_KEY for hash lookups.",
    flags: [...PLATFORM_FLAGS, ["--local", "scan a temp copy with ClamAV on this computer"], ["--json", "machine-readable output"]],
    examples: ["oqgit malware sharkdp/bat", "oqgit scan cli/cli windows --local"],
  },
  verify: {
    usage: "oqgit verify <file> [repo]",
    about: "Check that a file on your disk really came from a repo's releases. The repo is optional\nfor files oqgit downloaded.",
    flags: [["-r, --repo <owner/repo>", "the repo the file should come from"], ["--json", "machine-readable output"]],
    examples: ["oqgit verify ~/Downloads/bat.tar.gz sharkdp/bat"],
  },
  diff: {
    usage: "oqgit diff <repo> [from] [to]",
    about: "Compare the files in two releases. Without tags, compares the latest stable release with the one before it.",
    flags: [["--json", "machine-readable output"]],
    examples: ["oqgit diff cli/cli", "oqgit diff cli/cli v2.60.0 v2.61.0"],
  },
  review: {
    usage: "oqgit review [pr]",
    about: "AI code review with Gemma 4. With nothing after it, reviews this branch's changes.\nGive a PR number for this repo, owner/repo#12, or any PR, branch or compare link.\nNeeds GEMINI_API_KEY (free key: https://aistudio.google.com/apikey).",
    flags: [
      ["-g, --goal <text>", "what the change is meant to do"],
      ["--fast", "much quicker, less thorough"],
      ["--copy", "copy the fix prompt to the clipboard"],
      ["--base <branch>", "branch to compare against"],
      ["--head <branch>", "branch to review (with owner/repo)"],
      ["--pr <number>", "PR number (with owner/repo)"],
      ["--model <id>", "model to use (default gemma-4-31b-it)"],
      ["--prompt-only", "print only the fix prompt"],
      ["--strict", "exit with code 4 unless safe to merge (for CI)"],
      ["--json", "machine-readable output"],
    ],
    examples: ["oqgit review", "oqgit review 12", "oqgit review owner/repo#12", "oqgit review --goal \"retry failed uploads\" --fast"],
  },
  lock: {
    usage: "oqgit lock [repo…] | lock <show|check|update|remove>",
    about: `Pin tools for your team in ${LOCKFILE_NAME}, then everyone runs \`oqgit sync\`.\n\`oqgit lock owner/repo\` adds a repo; \`oqgit lock\` on its own shows the lockfile.`,
    flags: [["-t, --tag <tag>", "lock this release (one repo at a time)"], ["--lock <file>", `lockfile path (default ./${LOCKFILE_NAME})`], ["--json", "machine-readable output"]],
    examples: ["oqgit lock cli/cli sharkdp/bat", "oqgit lock check", "oqgit lock update"],
  },
  sync: {
    usage: "oqgit sync",
    about: `Download this computer's files from ${LOCKFILE_NAME} into .oqgit/, checked against the lock.`,
    flags: [["--extract", "unpack archives into .oqgit/tools/"], ["--lock <file>", "lockfile path"], ["--json", "machine-readable output"]],
    examples: ["oqgit sync", "oqgit sync --extract"],
  },
  mcp: {
    usage: "oqgit mcp",
    about: "Run as an MCP server so coding agents can use oqgit.",
    flags: [["--allow-download", "let agents download files"]],
    examples: ["claude mcp add oqgit -- oqgit mcp"],
  },
};

function commandHelp(name: string): string {
  const h = COMMAND_HELP[name];
  const aliases = Object.entries(ALIASES).filter(([, to]) => to === name).map(([a]) => a);
  const width = Math.max(0, ...(h.flags ?? []).map(([f]) => f.length)) + 3;
  return [
    "",
    `${c.bold("Usage")}  ${c.accent(h.usage)}`,
    "",
    ...h.about.split("\n").map((l) => `  ${l}`),
    ...(aliases.length ? ["", c.dim(`  Also: ${aliases.map((a) => `oqgit ${a}`).join(", ")}`)] : []),
    ...(h.flags?.length ? ["", c.bold("Options"), ...h.flags.map(([f, d]) => `  ${c.info(f.padEnd(width))}${c.dim(d)}`)] : []),
    "",
    c.bold("Examples"),
    ...h.examples.map((e) => `  ${c.dim("$")} ${e}`),
    "",
  ].join("\n");
}

/** The short help: just what most people need. */
function help(): string {
  const cmd = (name: string, args: string, desc: string) => `  ${c.accent(name.padEnd(9))}${args.padEnd(12)}${c.dim(desc)}`;
  return [
    banner(VERSION),
    `${c.bold("Usage")}  oqgit ${c.dim("<repo>")}              download the right file for this computer`,
    `       oqgit ${c.dim("<command> [repo]")}`,
    "",
    c.dim("  <repo> is owner/repo or any GitHub link, e.g. sharkdp/bat"),
    "",
    c.bold("Commands"),
    cmd("get", "<repo>", "download the right file (same as just `oqgit <repo>`)"),
    cmd("info", "<repo>", "see every file in the latest release"),
    cmd("list", "", "what you've downloaded"),
    cmd("update", "", "get newer versions of what you've downloaded"),
    cmd("trust", "<repo>", "how much can you trust this release?"),
    cmd("review", "[pr]", "AI code review of a pull request or this branch"),
    "",
    c.bold("More"),
    `  ${c.accent("malware  outdated  verify  diff  forget  lock  sync  mcp  doctor")}`,
    "",
    c.bold("Examples"),
    `  ${c.dim("$")} oqgit sharkdp/bat                ${c.dim("download for this computer")}`,
    `  ${c.dim("$")} oqgit sharkdp/bat windows arm64  ${c.dim("download for another computer")}`,
    `  ${c.dim("$")} oqgit sharkdp/bat@v0.25.0        ${c.dim("download an older release")}`,
    `  ${c.dim("$")} oqgit update                     ${c.dim("update everything you downloaded")}`,
    `  ${c.dim("$")} oqgit review 12                  ${c.dim("review pull request 12 in this repo")}`,
    "",
    c.dim(`Run ${c.info("oqgit help <command>")} for a command's options, or ${c.info("oqgit help all")} for everything.`),
    c.dim("Just type `oqgit` for a menu. oqgit only downloads; it never installs or runs anything."),
    "",
  ].join("\n");
}

/** Every command and flag on one page (`oqgit help all`). */
function fullHelp(): string {

  const cmd = (name: string, args: string, desc: string) => `  ${c.accent(name.padEnd(9))}${args.padEnd(22)}${c.dim(desc)}`;
  const flag = (name: string, desc: string) => `  ${c.info(name.padEnd(31))}${c.dim(desc)}`;
  return [
    banner(VERSION),
    `${c.bold("Usage")}  oqgit ${c.dim("<command> [target] [flags]")}`,
    `        oqgit ${c.dim("<github url | owner/repo>")}    ${c.dim("same as `get`")}`,
    "",
    c.bold("Commands"),
    cmd("get", "<target> [os] [cpu]", "find and download the right file for this machine"),
    cmd("info", "<target>", "show the release and every file, with what fits"),
    cmd("list", "", "files oqgit has downloaded"),
    cmd("outdated", "", "check tracked downloads for newer stable releases"),
    cmd("update", "[owner/repo]", "download newer releases (all, or one repo)"),
    cmd("forget", "<owner/repo>", "stop tracking a repo"),
    cmd("doctor", "", "show detected system, token and API quota"),
    "",
    c.bold("Supply chain"),
    cmd("trust", "<target>", "provenance report: attestations, immutability, re-uploads, age"),
    cmd("malware", "<target>", "known-malware check: VirusTotal hash lookup, --local for ClamAV"),
    cmd("verify", "<file> [repo]", "is this file on disk really from that repo's releases?"),
    cmd("diff", "<repo> [from] [to]", "what changed between two releases' files"),
    "",
    c.bold("Code review (Gemma 4)"),
    cmd("review", "", "review this branch's changes against its base"),
    cmd("review", "<12 | o/r#12 | url>", "review a pull request: draft, open or any state"),
    cmd("review", "<branch/compare url>", "review a pushed branch against the default branch"),
    "",
    c.bold("Teams, CI and agents"),
    cmd("lock", "<target…>", `pin binaries for every platform in ${LOCKFILE_NAME}`),
    cmd("lock", "check", "fail if a locked file was re-uploaded or removed (CI)"),
    cmd("lock", "update [repo]", "move locked tools to their latest stable release"),
    cmd("sync", "", "download this machine's locked files, verified against the lock"),
    cmd("mcp", "", "run as an MCP server so coding agents can use oqgit"),
    "",
    c.bold("Flags"),
    flag("--os <windows|macos|linux>", "target another OS (or just write it after the repo)"),
    flag("--arch <x64|arm64|x86>", "target another CPU (or just write it after the repo)"),
    flag("-t, --tag <tag>", "use a specific release (or write owner/repo@tag)"),
    flag("-o, --out <dir>", "where to save (default: ~/Downloads)"),
    flag("-y, --yes", "don't ask before downloading"),
    flag("-n, --dry-run", "resolve only; never download"),
    flag("-f, --force", "overwrite an existing file"),
    flag("--open", "open the file when done (asks first unless -y)"),
    flag("--json", "machine-readable output"),
    flag("--no-track", "don't record this download"),
    flag("--min-age <3d|72h|1w>", "cooldown: skip releases younger than this"),
    flag("--no-malware", "get: skip the malware check on the downloaded file"),
    flag("--local", "malware: download to a temp folder and scan with local ClamAV"),
    flag("--fail-under <0-100>", "trust: exit 4 when the score is lower"),
    flag("-r, --repo <owner/repo>", "verify: the repo the file should come from (or pass it after the file)"),
    flag(`--lock <file>`, `lockfile path (default ./${LOCKFILE_NAME})`),
    flag("--extract", "sync: unpack archives into .oqgit/tools/"),
    flag("--allow-download", "mcp: expose the download_release tool"),
    flag("-g, --goal <text>", "review: what the change is meant to achieve"),
    flag("--base <branch>", "review: branch to compare against"),
    flag("--head <branch>", "review: branch to review (with owner/repo)"),
    flag("--pr <number>", "review: PR number (with owner/repo)"),
    flag("--model <id>", "review: model (default gemma-4-31b-it)"),
    flag("--copy", "review: copy the fix prompt to the clipboard"),
    flag("--prompt-only", "review: print only the fix prompt"),
    flag("--strict", "review: exit 4 unless safe to merge"),
    flag("--fast", "review: light thinking: much faster, less thorough"),
    "",
    c.bold("Examples"),
    `  ${c.dim("$")} oqgit sharkdp/bat`,
    `  ${c.dim("$")} oqgit get https://github.com/cli/cli arm64 -y`,
    `  ${c.dim("$")} oqgit info neovim/neovim windows`,
    `  ${c.dim("$")} oqgit outdated`,
    `  ${c.dim("$")} oqgit trust cli/cli --fail-under 60`,
    `  ${c.dim("$")} oqgit get sharkdp/bat --min-age 3d`,
    `  ${c.dim("$")} oqgit lock cli/cli sharkdp/bat && oqgit sync`,
    `  ${c.dim("$")} claude mcp add oqgit -- oqgit mcp`,
    `  ${c.dim("$")} oqgit review https://github.com/owner/repo/pull/12`,
    `  ${c.dim("$")} oqgit review --goal "add retry to uploads" --copy`,
    "",
    c.dim("Set GITHUB_TOKEN (or GH_TOKEN) to raise GitHub's API rate limit. OQGIT_MIN_AGE sets a default cooldown."),
    c.dim("`review` needs GEMINI_API_KEY. OQGIT_REVIEW_MODEL changes the default model."),
    c.dim("Set VIRUSTOTAL_API_KEY for malware hash checks; oqgit scans locally with ClamAV when it's installed."),
    c.dim("oqgit only downloads. It never installs or runs anything unless you choose to open a file."),
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function client(): GitHubClient {
  return new GitHubClient({
    token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN || undefined,
    apiBase: process.env.OQGIT_API_BASE || undefined,
    timeoutMs: 15_000,
    userAgent: `oqgit/${VERSION}`,
  });
}

/** VirusTotal client for hash reputation. Only the SHA-256 ever leaves this machine. */
function vtClient(): VirusTotalClient {
  return new VirusTotalClient({
    apiKey: process.env.VIRUSTOTAL_API_KEY?.trim() || undefined,
    apiBase: process.env.OQGIT_VT_API_BASE || undefined,
    timeoutMs: 15_000,
    userAgent: `oqgit/${VERSION}`,
  });
}

function defaultOutDir(): string {
  const dl = path.join(os.homedir(), "Downloads");
  return existsSync(dl) ? dl : process.cwd();
}

function tildify(p: string): string {
  const home = os.homedir();
  return p.startsWith(home) ? `~${p.slice(home.length)}` : p;
}

function platformText(pl: Platform): string {
  return `${OS_LABELS[pl.os]} · ${archLabel(pl.os, pl.arch)}`;
}

/** Everyday names for each OS and CPU, so `mac`, `win` or `intel` work too. */
const OS_WORDS: Record<string, Os> = {
  windows: "windows", win: "windows", win32: "windows", win64: "windows",
  macos: "macos", mac: "macos", osx: "macos", darwin: "macos", apple: "macos",
  linux: "linux",
};
const ARCH_WORDS: Record<string, Arch> = {
  x64: "x64", amd64: "x64", x86_64: "x64", intel: "x64", "64bit": "x64",
  arm64: "arm64", aarch64: "arm64", arm: "arm64", m1: "arm64", m2: "arm64", m3: "arm64", m4: "arm64",
  x86: "x86", i386: "x86", i686: "x86", "32bit": "x86",
};

/**
 * Read the words after a repo in `get`, `info` and `trust`: an OS, a CPU, or a release tag,
 * plus `owner/repo@tag`. `oqgit get cli/cli windows arm64` = `--os windows --arch arm64`.
 */
function targetArgs(command: string, target: string | undefined, extra: string[], flags: Flags): [string | undefined, Flags] {
  const out = { ...flags };
  const at = target && !/^(?:https?:\/\/|(?:www\.)?github\.com\/)/i.test(target) ? /^([^@\s]+)@([^@\s]+)$/.exec(target) : null;
  if (at) {
    target = at[1];
    out.tag ??= at[2];
  }
  for (const word of extra) {
    const w = word.toLowerCase();
    if (OS_WORDS[w] && !flags.os) out.os = OS_WORDS[w];
    else if (ARCH_WORDS[w] && !flags.arch) out.arch = ARCH_WORDS[w];
    else if (/^v?\d/.test(word) && !out.tag) out.tag = word;
    else throw new UsageError(`Didn't understand “${word}”. Try: oqgit ${command} owner/repo mac arm64  (or  owner/repo@v1.2.3)`);
  }
  return [target, out];
}

function resolvePlatform(flags: Flags, sys: SystemInfo): Platform {
  if (flags.os) flags = { ...flags, os: OS_WORDS[flags.os.toLowerCase()] ?? flags.os };
  if (flags.arch) flags = { ...flags, arch: ARCH_WORDS[flags.arch.toLowerCase()] ?? flags.arch };
  const osValue = (flags.os ?? sys.os) as Os | null;
  const archValue = (flags.arch ?? sys.arch) as Arch | null;
  if (flags.os && !OS_VALUES.includes(flags.os as Os)) throw new UsageError(`--os must be one of: ${OS_VALUES.join(", ")}`);
  if (flags.arch && !ARCH_VALUES.includes(flags.arch as Arch)) throw new UsageError(`--arch must be one of: ${ARCH_VALUES.join(", ")}`);
  if (!osValue || !archValue) {
    throw new UsageError(`Couldn't identify this system (${process.platform}/${process.arch}). Pass --os and --arch.`);
  }
  return { os: osValue, arch: archValue };
}

/** Combine a URL/shorthand with an optional --tag into one input the core parser understands. */
function targetUrl(target: string, tag?: string): string {
  if (!tag) return target;
  const m = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/#?]+)/i.exec(target) ?? /^([^/\s]+)\/([^/\s]+)$/.exec(target);
  if (!m) throw new UsageError("Couldn't read the owner/repo from that target.");
  return `https://github.com/${m[1]}/${m[2].replace(/\.git$/i, "")}/releases/tag/${encodeURIComponent(tag)}`;
}

function minAgeMs(flags: Flags): number | undefined {
  const raw = flags["min-age"] ?? process.env.OQGIT_MIN_AGE;
  if (!raw) return undefined;
  const ms = parseDuration(raw);
  if (ms === null) throw new UsageError(`--min-age must look like 3d, 72h or 1w (got “${raw}”).`);
  return ms || undefined;
}

function repoOf(target: string): { owner: string; repo: string } {
  const { owner, repo } = parseGitHubUrl(target, { allowShorthand: true });
  return { owner, repo };
}

function trustTone(level: TrustReport["level"]) {
  return level === "strong" ? c.ok : level === "fair" ? c.warn : c.bad;
}

function malwareTone(status: MalwareStatus): (s: string) => string {
  return status === "flagged" ? c.bad : status === "no-known-detections" ? c.ok : status === "unknown" ? c.warn : c.dim;
}

function checkIcon(status: "pass" | "warn" | "info"): string {
  return status === "pass" ? c.ok("✔") : status === "warn" ? c.warn("▲") : c.dim("·");
}

function exitOnCancel<T>(value: T): Exclude<T, symbol> {
  if (p.isCancel(value)) {
    p.cancel("Cancelled.");
    throw new CancelledError();
  }
  return value as Exclude<T, symbol>;
}

/** Ask for a repo in a terminal; otherwise explain how to pass one. */
async function askRepo(command: string, flags: Flags): Promise<string> {
  if (!isTTY || flags.json) throw new UsageError(`Which repo? Try: oqgit ${command} owner/repo`);
  return exitOnCancel(
    await p.text({
      message: "GitHub repo or link",
      placeholder: "owner/repo  or  https://github.com/owner/repo",
      validate: (v) => (v?.trim() ? undefined : "Type owner/repo or paste a link"),
    }),
  ).trim();
}

function header(command: string) {
  p.intro(`${gradient("◆ oqgit")} ${c.dim(command)}`);
}

// ---------------------------------------------------------------------------
// get
// ---------------------------------------------------------------------------

interface GetOptions {
  quietHeader?: boolean;
}

async function cmdGet(target: string | undefined, flags: Flags, opts: GetOptions = {}): Promise<number> {
  const interactive = isTTY && !flags.json;
  if (!target) {
    if (!interactive) throw new UsageError("Which repo? Try: oqgit get owner/repo");
    target = exitOnCancel(
      await p.text({
        message: "GitHub repository or release URL",
        placeholder: "https://github.com/owner/repo  or  owner/repo",
        validate: (v) => (v?.trim() ? undefined : "Paste a link or owner/repo"),
      }),
    ).trim();
  }

  const sys = detectSystem();
  const platform = resolvePlatform(flags, sys);
  const prefs = platform.os === sys.os ? { linuxPackage: sys.linuxPackage } : {};

  if (interactive && !opts.quietHeader) header("get");
  const spin = interactive ? p.spinner() : null;
  spin?.start("Looking up the release on GitHub");

  let details;
  try {
    details = await resolveDetailed(
      { url: targetUrl(target, flags.tag), platform, prefs, parse: { allowShorthand: true }, minAgeMs: minAgeMs(flags) },
      client(),
    );
  } catch (err) {
    spin?.error(err instanceof ResolveError ? err.message : "Lookup failed");
    throw err;
  }
  const { response: r, release, skipped } = details;
  const releaseLine = `${c.bold(r.release.tag)} ${c.dim("·")} ${r.release.prerelease ? c.warn("pre-release") : "latest stable"}${flags.tag ? c.dim(" (requested)") : ""} ${c.dim(`· ${relativeTime(r.release.publishedAt)}`)}`;
  spin?.stop(`${r.repo.owner}/${r.repo.name}  ${releaseLine}`);

  if (flags.json && r.recommendation.status !== "recommended") {
    console.log(JSON.stringify(r, null, 2));
    return EXIT.noMatch;
  }

  if (interactive && skipped.length) {
    p.log.warn(
      `Cooldown skipped ${skipped.map((s) => `${c.bold(s.tag)} ${c.dim(`(${humanDuration(Date.now() - Date.parse(s.publishedAt ?? ""))} old)`)}`).join(", ")}`,
    );
  }
  if (interactive) {
    p.log.info(`${c.dim("System ")} ${platformText(platform)}${flags.os || flags.arch ? c.warn("  (override)") : c.dim(`  ${sys.detail}`)}`);
  }

  // --- No reliable match ------------------------------------------------------
  if (r.recommendation.status === "not-recommended") {
    const msg = noMatchMessage(r.recommendation.reason, platformText(platform));
    if (!interactive) {
      console.error(`Not recommended — don't install. ${msg}\n${r.release.url}`);
      return EXIT.noMatch;
    }
    console.log(
      card(
        [c.bad("✖ Not recommended — don’t install"), "", ...wrap(msg, 60), "", c.dim(r.release.url)],
        "bad",
        undefined,
        { rail: true },
      ),
    );
    const usable = release.assets.filter((a) => !classifyAsset(a.name).excluded);
    if (usable.length === 0 || flags["dry-run"] || flags.yes) {
      p.outro(c.dim(`Run ${c.info(`oqgit info ${r.repo.owner}/${r.repo.name}`)} to see every file.`));
      return EXIT.noMatch;
    }
    const choice = exitOnCancel(
      await p.select<string>({
        message: "Pick a file yourself? oqgit can't vouch that it fits this machine.",
        options: [
          { value: "__none", label: "No, stop here" },
          ...usable.map((a) => ({ value: a.name, label: a.name, hint: formatBytes(a.size) })),
        ],
        initialValue: "__none",
        maxItems: 12,
      }),
    );
    if (choice === "__none") {
      p.outro(c.dim("Nothing downloaded."));
      return EXIT.noMatch;
    }
    const asset = usable.find((a) => a.name === choice)!;
    return finishDownload(asset, r.repo, r.release.tag, platform, flags, interactive, !!flags.tag);
  }

  // --- Recommended -------------------------------------------------------------
  const a = r.recommendation.asset;
  const lines = [
    c.ok("✔ Recommended"),
    "",
    c.bold(a.name),
    c.dim(`${KIND_LABELS[a.kind]} · ${a.format} · ${formatBytes(a.size)}${a.digest ? " · sha256 published" : ""}`),
  ];

  if (flags.json && (flags["dry-run"] || !flags.yes)) {
    console.log(JSON.stringify(r, null, 2));
    return EXIT.ok;
  }
  if (interactive) console.log(card(lines, "ok", r.release.name, { rail: true }));
  if (interactive && !flags["no-trust"]) {
    const asset = release.assets.find((x) => x.name === a.name)!;
    try {
      const t = await trustFor(client(), details.target, release, asset);
      const warns = t.checks.filter((ch) => ch.status === "warn");
      p.log.message(
        `${c.dim("Provenance")} ${trustTone(t.level)(`${TRUST_LEVEL_LABELS[t.level]} · ${t.score}/100`)}` +
          (warns.length ? `  ${c.warn(`▲ ${warns.map((w) => w.label.toLowerCase()).join(", ")}`)}` : "") +
          c.dim(`  · oqgit trust ${r.repo.owner}/${r.repo.name} for details`),
      );
    } catch {
      /* trust is advisory; never block a download on it */
    }
  }
  else if (!flags.json) console.log(`Recommended: ${a.name} (${formatBytes(a.size)})\n${a.downloadUrl}`);

  if (flags["dry-run"]) {
    if (interactive) p.outro(c.dim("Dry run — nothing downloaded."));
    return EXIT.ok;
  }
  if (!interactive && !flags.yes) {
    console.log("Re-run with --yes to download.");
    return EXIT.ok;
  }

  const asset = release.assets.find((x) => x.name === a.name)!;
  return finishDownload(asset, r.repo, r.release.tag, platform, flags, interactive, !!flags.tag);
}

function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if ((line + " " + word).trim().length > width) {
      out.push(line.trim());
      line = word;
    } else line += " " + word;
  }
  if (line.trim()) out.push(line.trim());
  return out;
}

/**
 * Malware check for a freshly downloaded file: VirusTotal hash reputation, falling back to a
 * local ClamAV scan when VirusTotal can't be asked. Only a "flagged" verdict blocks.
 */
async function malwareGate(asset: ReleaseAsset, result: DownloadResult): Promise<MalwareReport> {
  const vt = vtClient();
  const sha256 = asset.digest ?? result.sha256;
  const reputation = await vt.lookupHash(sha256);
  let local: LocalScanResult | undefined;
  if (reputation === null) {
    const engine = await findClamAv();
    if (engine) local = (await scanFile(result.path, engine)) ?? undefined;
  }
  return assessMalware({ sha256, reputation, local, reputationUnconfigured: !vt.enabled });
}

async function finishDownload(
  asset: ReleaseAsset,
  repo: { owner: string; name: string },
  tag: string,
  platform: Platform,
  flags: Flags,
  interactive: boolean,
  pinned: boolean,
): Promise<number> {
  const dir = path.resolve(flags.out ?? defaultOutDir());

  if (interactive && !flags.yes) {
    const ok = exitOnCancel(
      await p.confirm({ message: `Download to ${c.info(tildify(dir))}?`, initialValue: true }),
    );
    if (!ok) {
      p.outro(c.dim("Nothing downloaded."));
      return EXIT.ok;
    }
  }

  const bar = interactive ? p.progress({ style: "heavy", max: 1000, size: 28 }) : null;
  bar?.start(`Downloading ${asset.name}`);
  let shown = 0;
  let lastMsg = 0;
  const started = Date.now();

  let result;
  try {
    result = await downloadAsset({
      url: asset.downloadUrl,
      fileName: asset.name,
      dir,
      expectedSize: asset.size,
      digest: asset.digest,
      overwrite: flags.force,
      onProgress: (got, total) => {
        if (!bar || !total) return;
        const target = Math.min(1000, Math.floor((got / total) * 1000));
        const now = Date.now();
        if (target > shown) {
          const speed = got / Math.max((now - started) / 1000, 0.001);
          const msg =
            now - lastMsg > 120
              ? `Downloading ${formatBytes(got)} / ${formatBytes(total)}  ${c.dim(`${formatBytes(speed)}/s`)}`
              : undefined;
          if (msg) lastMsg = now;
          bar.advance(target - shown, msg);
          shown = target;
        }
      },
    });
  } catch (err) {
    bar?.error(err instanceof DownloadError ? err.message : "Download failed");
    throw err;
  }

  bar?.stop(`Downloaded ${formatBytes(result.bytes)} in ${((Date.now() - started) / 1000).toFixed(1)}s`);

  let malware: MalwareReport | null = null;
  if (!flags["no-malware"]) {
    malware = await malwareGate(asset, result);
    const warn = malware.checks.find((ch) => ch.status === "warn");
    if (malware.status === "flagged" && !flags.force) {
      await rm(result.path, { force: true });
      const detail = warn?.detail ?? "engines flag this file as malicious.";
      if (interactive) {
        p.log.error(`${c.bad("Malware flagged")} — ${detail}`);
        p.outro(c.dim(`The file was deleted. ${c.info(`oqgit malware ${repo.owner}/${repo.name}`)} for details; --force keeps it anyway.`));
      } else if (flags.json) {
        console.log(JSON.stringify({ ok: false, file: asset.name, malware, error: { code: "MALWARE_FLAGGED", message: detail } }, null, 2));
      } else {
        console.error(`Malware flagged: ${detail} The file was deleted. Use --force to keep it anyway.`);
      }
      return EXIT.policy;
    }
    if (interactive) {
      const tone = malwareTone(malware.status);
      const hint =
        warn ? `  ${c.warn(warn.detail)}`
        : malware.status === "unknown" || malware.status === "unavailable"
          ? c.dim(`  · ${malware.checks.find((ch) => ch.id === "reputation")?.detail ?? ""}`)
          : "";
      p.log.message(`${c.dim("Malware")} ${tone(MALWARE_STATUS_LABELS[malware.status])}${hint}`);
    }
  }

  if (!flags["no-track"]) {
    await track({
      repo: `${repo.owner}/${repo.name}`,
      tag,
      asset: asset.name,
      path: result.path,
      os: platform.os,
      arch: platform.arch,
      sha256: result.sha256,
      downloadedAt: new Date().toISOString(),
      pinned,
    });
  }

  if (flags.json) {
    console.log(JSON.stringify({ ok: true, file: result.path, bytes: result.bytes, sha256: result.sha256, verified: result.verified, tag, malware }, null, 2));
    return EXIT.ok;
  }
  if (!interactive) {
    console.log(`Saved ${result.path}\nsha256 ${result.sha256} (${result.verified === "match" ? "matches GitHub digest" : "no digest published"})`);
    if (malware) {
      const warn = malware.checks.find((ch) => ch.status === "warn");
      console.log(`Malware ${MALWARE_STATUS_LABELS[malware.status]}${warn ? ` — ${warn.detail}` : ""}`);
    }
    if (flags.open) await openFile(result.path);
    return EXIT.ok;
  }

  if (result.verified === "match") p.log.success(`SHA-256 matches GitHub’s published digest`);
  else p.log.warn(`GitHub didn’t publish a digest for this file ${c.dim(`(sha256 ${result.sha256.slice(0, 16)}…)`)}`);
  p.log.message(`${c.dim("Saved to")} ${c.bold(tildify(result.path))}`);

  const runnable = /\.appimage$/i.test(asset.name) || classifyAsset(asset.name).format?.id === "binary";
  if (runnable && platform.os !== "windows" && process.platform !== "win32") {
    const mk = flags.yes
      ? false
      : exitOnCancel(await p.confirm({ message: "Mark it as executable (chmod +x)?", initialValue: false }));
    if (mk) {
      await makeExecutable(result.path);
      p.log.success("Marked executable");
    }
  }

  let next: "done" | "reveal" | "open" = "done";
  if (flags.open && flags.yes) next = "open";
  else if (!flags.yes || flags.open) {
    next = exitOnCancel(
      await p.select<"done" | "reveal" | "open">({
        message: "What next?",
        initialValue: "done",
        options: [
          { value: "done", label: "Done" },
          { value: "reveal", label: "Show in folder" },
          { value: "open", label: "Open it now", hint: "runs the system’s default handler — only if you trust it" },
        ],
      }),
    );
  }
  if (next === "reveal") await revealFile(result.path);
  if (next === "open") await openFile(result.path);

  p.outro(`${gradient("Done.")} ${c.dim(`Run ${c.info("oqgit outdated")} later to check for updates.`)}`);
  return EXIT.ok;
}

// ---------------------------------------------------------------------------
// info
// ---------------------------------------------------------------------------

async function cmdInfo(target: string | undefined, flags: Flags): Promise<number> {
  target ??= await askRepo("info", flags);
  const sys = detectSystem();
  const platform = resolvePlatform(flags, sys);
  const prefs = platform.os === sys.os ? { linuxPackage: sys.linuxPackage } : {};
  const spin = isTTY && !flags.json ? p.spinner() : null;
  if (spin) header("info");
  spin?.start("Looking up the release");
  let details;
  try {
    details = await resolveDetailed(
      { url: targetUrl(target, flags.tag), platform, prefs, parse: { allowShorthand: true } },
      client(),
    );
  } catch (err) {
    spin?.error(err instanceof ResolveError ? err.message : "Lookup failed");
    throw err;
  }
  const { response: r, release } = details;
  spin?.stop(`${r.repo.owner}/${r.repo.name}`);

  const picked = r.recommendation.status === "recommended" ? r.recommendation.asset.name : null;
  const rows = release.assets.map((a) => {
    const info = classifyAsset(a.name);
    const plat = info.excluded
      ? c.dim(info.excluded)
      : [...info.oses].map((o) => (o === "other" ? "other" : OS_LABELS[o as Os])).join("+") +
        (info.arches.size ? c.dim(` ${[...info.arches].join("+")}`) : c.dim(" (no arch)"));
    return { a, plat, picked: a.name === picked };
  });

  if (flags.json) {
    console.log(
      JSON.stringify(
        { ...r, assets: release.assets.map((a) => ({ name: a.name, size: a.size, url: a.downloadUrl, digest: a.digest ?? null, excluded: classifyAsset(a.name).excluded ?? null })) },
        null,
        2,
      ),
    );
    return EXIT.ok;
  }

  console.log(
    card(
      kv([
        ["Release", r.release.name === r.release.tag ? c.bold(r.release.tag) : `${c.bold(r.release.name)} ${c.dim(`(${r.release.tag})`)}`],
        ["Published", `${r.release.publishedAt?.slice(0, 10) ?? "—"} ${c.dim(`· ${relativeTime(r.release.publishedAt)}`)}`],
        ["Channel", r.release.prerelease ? c.warn("pre-release") : c.ok("stable")],
        ["Files", String(release.assets.length)],
        ["For", platformText(platform)],
        [
          "Verdict",
          r.recommendation.status === "recommended" ? c.ok("✔ Recommended") : c.bad("✖ Not recommended — don’t install"),
        ],
        ["Page", c.dim(r.release.url)],
      ]),
      r.recommendation.status === "recommended" ? "ok" : "bad",
      `${r.repo.owner}/${r.repo.name}`,
    ),
  );
  console.log("");
  console.log(
    table([
      ["", "FILE", "SIZE", "PLATFORM"],
      ...rows.map(({ a, plat, picked }) => [
        picked ? c.ok("➜") : " ",
        picked ? c.ok(c.bold(a.name)) : a.name,
        c.dim(formatBytes(a.size)),
        plat,
      ]),
    ]),
  );
  console.log("");
  if (picked) p.outro(`${c.dim("Get it with")} ${c.info(`oqgit get ${r.repo.owner}/${r.repo.name}${flags.tag ? ` -t ${flags.tag}` : ""}`)}`);
  else p.outro(c.dim(noMatchMessage((r.recommendation as { reason: Parameters<typeof noMatchMessage>[0] }).reason, platformText(platform))));
  return EXIT.ok;
}

// ---------------------------------------------------------------------------
// list / outdated / update / forget
// ---------------------------------------------------------------------------

async function cmdList(flags: Flags): Promise<number> {
  const state = await loadState();
  if (flags.json) {
    console.log(JSON.stringify(state.downloads, null, 2));
    return EXIT.ok;
  }
  header("list");
  if (state.downloads.length === 0) {
    p.outro(c.dim(`Nothing tracked yet. Try ${c.info("oqgit get owner/repo")}.`));
    return EXIT.ok;
  }
  console.log(
    table([
      ["REPO", "TAG", "FILE", "WHEN", "WHERE"],
      ...state.downloads
        .sort((a, b) => a.repo.localeCompare(b.repo))
        .map((d) => [
          c.bold(d.repo),
          d.tag + (d.pinned ? c.dim(" (pinned)") : ""),
          d.asset,
          c.dim(relativeTime(d.downloadedAt)),
          c.dim(tildify(path.dirname(d.path))),
        ]),
    ]),
  );
  p.outro(c.dim(`${state.downloads.length} tracked · ${tildify(stateDir())}`));
  return EXIT.ok;
}

interface OutdatedRow {
  repo: string;
  current: string;
  latest: string | null;
  error?: string;
  os: Os;
  arch: Arch;
  pinned?: boolean;
}

async function checkOutdated(filter?: string, minAge?: number): Promise<OutdatedRow[]> {
  const state = await loadState();
  const gh = client();
  const items = state.downloads.filter((d) => !filter || d.repo.toLowerCase() === filter.toLowerCase());
  return Promise.all(
    items.map(async (d) => {
      const [owner, repo] = d.repo.split("/");
      try {
        const latest = minAge
          ? pickCooledRelease(await gh.listReleases({ owner, repo }), minAge).release
          : await gh.getRelease({ owner, repo });
        if (!latest) return { repo: d.repo, current: d.tag, latest: d.tag, os: d.os, arch: d.arch, pinned: d.pinned };
        return { repo: d.repo, current: d.tag, latest: latest.tag, os: d.os, arch: d.arch, pinned: d.pinned };
      } catch (err) {
        return { repo: d.repo, current: d.tag, latest: null, os: d.os, arch: d.arch, pinned: d.pinned, error: err instanceof Error ? err.message : "failed" };
      }
    }),
  );
}

async function cmdOutdated(flags: Flags): Promise<number> {
  const spin = isTTY && !flags.json ? p.spinner() : null;
  if (spin) header("outdated");
  spin?.start("Checking tracked repos for new stable releases");
  const rows = await checkOutdated(undefined, minAgeMs(flags));
  const stale = rows.filter((r) => r.latest && r.latest !== r.current);
  spin?.stop(rows.length ? `Checked ${rows.length} repo${rows.length === 1 ? "" : "s"}` : "Nothing tracked yet");

  if (flags.json) {
    console.log(JSON.stringify(rows, null, 2));
    return EXIT.ok;
  }
  if (rows.length === 0) {
    p.outro(c.dim(`Download something first: ${c.info("oqgit get owner/repo")}`));
    return EXIT.ok;
  }
  console.log(
    table([
      ["REPO", "CURRENT", "LATEST", ""],
      ...rows.map((r) => [
        c.bold(r.repo),
        r.current,
        r.latest ?? c.dim("—"),
        r.error ? c.bad(r.error) : r.latest !== r.current ? c.warn("update available") + (r.pinned ? c.dim(" (pinned)") : "") : c.ok("up to date"),
      ]),
    ]),
  );
  const failed = rows.filter((r) => r.error).length;
  if (stale.length) p.outro(`${c.warn(`${stale.length} update${stale.length === 1 ? "" : "s"} available.`)} Run ${c.info("oqgit update")}`);
  else if (failed) p.outro(c.warn(`Couldn’t check ${failed} repo${failed === 1 ? "" : "s"}. Try again later or set GITHUB_TOKEN.`));
  else p.outro(c.ok("Everything is up to date."));
  return EXIT.ok;
}

async function cmdUpdate(target: string | undefined, flags: Flags): Promise<number> {
  const interactive = isTTY && !flags.json;
  if (interactive) header("update");
  const spin = interactive ? p.spinner() : null;
  spin?.start("Checking for newer releases");
  const filter = target?.replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "").split("/").slice(0, 2).join("/");
  const rows = (await checkOutdated(filter, minAgeMs(flags))).filter((r) => r.latest && r.latest !== r.current && (!r.pinned || !!filter));
  spin?.stop(rows.length ? `${rows.length} update${rows.length === 1 ? "" : "s"} available` : "Nothing to update");
  if (rows.length === 0) {
    if (interactive) p.outro(c.ok("Everything is up to date."));
    return EXIT.ok;
  }

  let chosen = rows;
  if (interactive && !flags.yes && rows.length > 1 && !flags.all) {
    const picks = exitOnCancel(
      await p.multiselect<string>({
        message: "Which ones?",
        options: rows.map((r) => ({ value: r.repo, label: r.repo, hint: `${r.current} → ${r.latest}` })),
        initialValues: rows.map((r) => r.repo),
        required: false,
      }),
    );
    chosen = rows.filter((r) => picks.includes(r.repo));
  }

  let code: number = EXIT.ok;
  for (const r of chosen) {
    if (interactive) p.log.step(`${c.bold(r.repo)}  ${c.dim(r.current)} → ${c.ok(r.latest!)}`);
    try {
      const res = await cmdGet(r.repo, { ...flags, os: r.os, arch: r.arch, tag: undefined, open: false }, { quietHeader: true });
      if (res !== EXIT.ok) code = res;
    } catch (err) {
      if (err instanceof CancelledError) throw err;
      code = EXIT.error;
      report(err);
    }
  }
  return code;
}

async function cmdForget(target: string | undefined): Promise<number> {
  if (!target) throw new UsageError("Which repo? Try: oqgit forget owner/repo");
  const repo = target.replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "").split("/").slice(0, 2).join("/");
  const n = await untrack(repo);
  console.log(n ? `${c.ok("✔")} Stopped tracking ${repo}. Files on disk were left alone.` : c.dim(`${repo} wasn't tracked.`));
  return EXIT.ok;
}

// ---------------------------------------------------------------------------
// doctor
// ---------------------------------------------------------------------------

async function cmdDoctor(flags: Flags): Promise<number> {
  const sys = detectSystem();
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const limit = await client().rateLimit();
  const data = {
    version: VERSION,
    node: process.version,
    system: sys,
    token: token ? "set" : "not set",
    rateLimit: limit,
    stateDir: stateDir(),
    downloadsDir: defaultOutDir(),
  };
  if (flags.json) {
    console.log(JSON.stringify(data, null, 2));
    return EXIT.ok;
  }
  console.log(banner(VERSION));
  console.log(
    card(
      kv([
        ["System", sys.os && sys.arch ? platformText({ os: sys.os, arch: sys.arch }) : c.bad("unsupported")],
        ["Detail", c.dim(sys.detail)],
        ["Linux pkg", sys.linuxPackage ?? c.dim(sys.os === "linux" ? "unknown distro" : "n/a")],
        ["Node", process.version],
        ["Token", token ? c.ok("set") : c.warn("not set — 60 requests/hour")],
        [
          "API quota",
          limit ? `${limit.remaining}/${limit.limit} ${c.dim(`resets ${new Date(limit.reset * 1000).toLocaleTimeString()}`)}` : c.bad("couldn't reach GitHub"),
        ],
        ["Saves to", tildify(defaultOutDir())],
        ["State", tildify(stateDir())],
      ]),
      sys.os && limit ? "ok" : "warn",
      "doctor",
    ),
  );
  console.log("");
  return EXIT.ok;
}

// ---------------------------------------------------------------------------
// trust
// ---------------------------------------------------------------------------

async function cmdTrust(target: string | undefined, flags: Flags): Promise<number> {
  target ??= await askRepo("trust", flags);
  const failUnder = flags["fail-under"] !== undefined ? Number(flags["fail-under"]) : undefined;
  if (failUnder !== undefined && !(failUnder >= 0 && failUnder <= 100)) throw new UsageError("--fail-under must be 0–100.");
  const sys = detectSystem();
  const platform = resolvePlatform(flags, sys);
  const prefs = platform.os === sys.os ? { linuxPackage: sys.linuxPackage } : {};
  const spin = isTTY && !flags.json ? p.spinner() : null;
  if (spin) header("trust");
  spin?.start("Checking provenance on GitHub");
  let details;
  let report: TrustReport | null = null;
  try {
    details = await resolveDetailed(
      { url: targetUrl(target, flags.tag), platform, prefs, parse: { allowShorthand: true }, minAgeMs: minAgeMs(flags) },
      client(),
    );
    const rec = details.response.recommendation;
    if (rec.status === "recommended") {
      const asset = details.release.assets.find((a) => a.name === rec.asset.name)!;
      report = await trustFor(client(), details.target, details.release, asset);
    }
  } catch (err) {
    spin?.error(err instanceof ResolveError ? err.message : "Lookup failed");
    throw err;
  }
  const r = details.response;
  spin?.stop(`${r.repo.owner}/${r.repo.name}  ${c.bold(r.release.tag)}`);

  if (!report) {
    const msg = noMatchMessage((r.recommendation as { reason: Parameters<typeof noMatchMessage>[0] }).reason, platformText(platform));
    if (flags.json) console.log(JSON.stringify({ ...r, trust: null }, null, 2));
    else console.error(`${c.bad("✖")} No file to assess. ${msg}`);
    return EXIT.noMatch;
  }
  const failed = failUnder !== undefined && report.score < failUnder;
  if (flags.json) {
    console.log(JSON.stringify({ repo: r.repo, release: r.release, file: (r.recommendation as { asset: { name: string } }).asset.name, trust: report }, null, 2));
    return failed ? EXIT.policy : EXIT.ok;
  }

  const tone = trustTone(report.level);
  const fileName = (r.recommendation as { asset: { name: string } }).asset.name;
  const width = Math.max(...report.checks.map((ch) => ch.label.length));
  const lines = [
    `${tone(c.bold(TRUST_LEVEL_LABELS[report.level]))}  ${tone(`${report.score}/100`)}  ${c.dim(meter(report.score))}`,
    c.dim(fileName),
    "",
    ...report.checks.flatMap((ch) => {
      const body = wrap(ch.detail, Math.max(28, Math.min(process.stdout.columns || 80, 92) - 14 - width));
      return [`${checkIcon(ch.status)} ${ch.label.padEnd(width)}  ${body[0] ?? ""}`, ...body.slice(1).map((l) => `  ${" ".repeat(width)}  ${l}`)];
    }),
  ];
  console.log(card(lines, report.level === "strong" ? "ok" : report.level === "fair" ? "warn" : "bad", `${r.repo.owner}/${r.repo.name} ${r.release.tag}`));
  console.log("");
  if (report.verifyCommand) console.log(`  ${c.dim("Full signature check after download:")} ${c.info(report.verifyCommand)}`);
  console.log(`  ${c.dim("Signals, not a safety verdict: a compromised maintainer account can pass every check.")}`);
  console.log("");
  if (failed) {
    console.error(`${c.bad("✖")} Score ${report.score} is under --fail-under ${failUnder}.`);
    return EXIT.policy;
  }
  return EXIT.ok;
}

function meter(score: number): string {
  const n = Math.round(score / 5);
  return "█".repeat(n) + "░".repeat(20 - n);
}

// ---------------------------------------------------------------------------
// malware
// ---------------------------------------------------------------------------

async function cmdMalware(target: string | undefined, flags: Flags): Promise<number> {
  target ??= await askRepo("malware", flags);
  const sys = detectSystem();
  const platform = resolvePlatform(flags, sys);
  const prefs = platform.os === sys.os ? { linuxPackage: sys.linuxPackage } : {};
  const spin = isTTY && !flags.json ? p.spinner() : null;
  if (spin) header("malware");
  spin?.start(flags.local ? "Downloading a temp copy to scan with ClamAV" : "Checking hash reputation");

  let details;
  let file = "";
  let digest: string | undefined;
  let local: LocalScanResult | undefined;
  let tmp: string | null = null;
  try {
    details = await resolveDetailed(
      { url: targetUrl(target, flags.tag), platform, prefs, parse: { allowShorthand: true }, minAgeMs: minAgeMs(flags) },
      client(),
    );
    const rec = details.response.recommendation;
    if (rec.status !== "recommended") {
      spin?.stop("No recommended file to check");
      if (flags.json) console.log(JSON.stringify({ ...details.response, malware: null }, null, 2));
      else console.error(`${c.bad("✖")} No file to check. ${noMatchMessage(rec.reason, platformText(platform))}`);
      return EXIT.noMatch;
    }
    file = rec.asset.name;
    const asset = details.release.assets.find((a) => a.name === file)!;
    digest = asset.digest;

    if (flags.local) {
      const engine = await findClamAv();
      if (!engine) {
        throw new UsageError("ClamAV wasn't found. Install it, point OQGIT_CLAMSCAN at it, or drop --local for a VirusTotal-only check.");
      }
      spin?.message(`Scanning ${file} with ${engine.version} (temp copy)`);
      tmp = await mkdtemp(path.join(os.tmpdir(), "oqgit-scan-"));
      const res = await downloadAsset({ url: asset.downloadUrl, fileName: asset.name, dir: tmp, expectedSize: asset.size, digest: asset.digest });
      digest = res.sha256;
      local = (await scanFile(res.path, engine)) ?? undefined;
      if (!local) spin?.message("The local scan couldn't run; continuing without it");
    }
  } catch (err) {
    spin?.error(err instanceof ResolveError || err instanceof UsageError ? err.message : "Lookup failed");
    throw err;
  } finally {
    if (tmp) await rm(tmp, { recursive: true, force: true });
  }

  const vt = vtClient();
  const reputation = digest ? await vt.lookupHash(digest) : null;
  const report = assessMalware({ sha256: digest, reputation, local, reputationUnconfigured: !vt.enabled });
  const r = details.response;
  spin?.stop(`${r.repo.owner}/${r.repo.name}  ${c.bold(r.release.tag)}  ${c.dim(file)}`);

  if (flags.json) {
    console.log(JSON.stringify({ repo: r.repo, release: r.release, file, malware: report }, null, 2));
    return report.status === "flagged" ? EXIT.policy : EXIT.ok;
  }

  const tone = malwareTone(report.status);
  const width = Math.max(...report.checks.map((ch) => ch.label.length));
  const lines = [
    tone(c.bold(MALWARE_STATUS_LABELS[report.status])),
    c.dim(file),
    "",
    ...report.checks.flatMap((ch) => {
      const body = wrap(ch.detail, Math.max(28, Math.min(process.stdout.columns || 80, 92) - 14 - width));
      return [`${checkIcon(ch.status)} ${ch.label.padEnd(width)}  ${body[0] ?? ""}`, ...body.slice(1).map((l) => `  ${" ".repeat(width)}  ${l}`)];
    }),
  ];
  console.log(
    card(lines, report.status === "flagged" ? "bad" : report.status === "no-known-detections" ? "ok" : "warn", `${r.repo.owner}/${r.repo.name} ${r.release.tag}`),
  );
  console.log("");
  if (report.permalink) console.log(`  ${c.dim("Engine results:")} ${c.info(report.permalink)}`);
  if (flags.local) console.log(`  ${c.dim("Scanned a temp copy with local ClamAV; nothing was installed and the copy was deleted.")}`);
  else if (!vt.enabled) console.log(`  ${c.dim("Set VIRUSTOTAL_API_KEY for hash reputation, or add --local to scan a temp copy with ClamAV.")}`);
  console.log(`  ${c.dim("Known malware only — new or rare malware is often missed. One signal, not a verdict.")}`);
  console.log("");
  if (report.status === "flagged") {
    console.error(`${c.bad("✖")} Flagged. Don't open or install this file.`);
    return EXIT.policy;
  }
  return EXIT.ok;
}

// ---------------------------------------------------------------------------
// diff
// ---------------------------------------------------------------------------

async function cmdDiff(target: string | undefined, fromTag: string | undefined, toTag: string | undefined, flags: Flags): Promise<number> {
  if (!target) throw new UsageError("Which repo? Try: oqgit diff owner/repo");
  const t = repoOf(target);
  const spin = isTTY && !flags.json ? p.spinner() : null;
  if (spin) header("diff");
  spin?.start("Fetching releases");
  const releases = await client().listReleases(t, 100);
  spin?.stop(`${t.owner}/${t.repo}  ${releases.length} release${releases.length === 1 ? "" : "s"}`);
  const find = (tag: string) => {
    const hit = releases.find((r) => r.tag === tag || r.tag === `v${tag}` || r.tag.replace(/^v/, "") === tag);
    if (!hit) throw new UsageError(`No release tagged “${tag}” in the last ${releases.length} releases.`);
    return hit;
  };
  const stable = releases.filter((r) => !r.prerelease);
  const to = toTag ? find(toTag) : stable[0];
  const from = fromTag ? find(fromTag) : stable.find((r) => Date.parse(r.publishedAt ?? "") < Date.parse(to?.publishedAt ?? ""));
  if (!to || !from) throw new UsageError("Need two releases to compare. Pass both tags.");
  const d = diffReleases(from, to);

  if (flags.json) {
    console.log(JSON.stringify(d, null, 2));
    return EXIT.ok;
  }
  const plat = (pl: { os: Os; arch: Arch }) => platformText(pl);
  console.log(`  ${c.bold(d.from)} ${c.dim("→")} ${c.bold(d.to)}  ${c.dim(`${d.unchanged} unchanged`)}`);
  console.log("");
  const section = (title: string, rows: string[]) => {
    if (!rows.length) return;
    console.log(`  ${c.bold(title)}`);
    for (const row of rows) console.log(`    ${row}`);
    console.log("");
  };
  section("Added", d.added.map((a) => `${c.ok("+")} ${a.name} ${c.dim(formatBytes(a.size))}`));
  section("Removed", d.removed.map((a) => `${c.bad("−")} ${a.name} ${c.dim(formatBytes(a.size))}`));
  section(
    "Resized",
    d.changed.map(
      (ch) =>
        `${ch.suspicious ? c.warn("▲") : c.dim("~")} ${ch.to.name} ${c.dim(`${formatBytes(ch.from.size)} → ${formatBytes(ch.to.size)}`)} ${ch.suspicious ? c.warn(`×${ch.ratio.toFixed(1)} — unusual`) : c.dim(`${ch.ratio > 1 ? "+" : ""}${Math.round((ch.ratio - 1) * 100)}%`)}`,
    ),
  );
  section("Platforms gained", d.platformsGained.map((pl) => `${c.ok("+")} ${plat(pl)}`));
  section("Platforms lost", d.platformsLost.map((pl) => `${c.bad("−")} ${plat(pl)}  ${c.warn("oqgit update will find nothing for this machine")}`));
  section("Pick changed", d.pickChanged.map((pc) => `${c.info("↻")} ${plat(pc.platform)}  ${c.dim(pc.from)} → ${pc.to}`));
  if (!d.added.length && !d.removed.length && !d.changed.length && !d.pickChanged.length) console.log(`  ${c.ok("Same set of files, similar sizes.")}\n`);
  return EXIT.ok;
}

// ---------------------------------------------------------------------------
// verify
// ---------------------------------------------------------------------------

async function cmdVerify(file: string | undefined, flags: Flags): Promise<number> {
  if (!file) throw new UsageError("Which file? Try: oqgit verify ./file owner/repo");
  const full = path.resolve(file);
  if (!existsSync(full)) throw new UsageError(`No such file: ${file}`);
  let repo = flags.repo;
  if (!repo) {
    const tracked = (await loadState()).downloads.find((d) => path.resolve(d.path) === full);
    if (!tracked) throw new UsageError(`Which repo should this file come from? Try: oqgit verify ${file} owner/repo`);
    repo = tracked.repo;
  }
  const t = repoOf(repo);
  const spin = isTTY && !flags.json ? p.spinner() : null;
  if (spin) header("verify");
  spin?.start(`Hashing ${path.basename(full)}`);
  const sha = await sha256File(full);
  spin?.message(`Looking for sha256 ${sha.slice(0, 12)}… in ${t.owner}/${t.repo}`);
  const v = await verifyDigest(client(), t, sha);
  spin?.stop(`${t.owner}/${t.repo}  ${c.dim(`scanned ${v.scanned} releases`)}`);

  if (flags.json) {
    console.log(JSON.stringify({ file: full, repo: `${t.owner}/${t.repo}`, ...v }, null, 2));
    return v.match ? EXIT.ok : EXIT.policy;
  }
  const att = v.attestations;
  const attLine = !att
    ? c.dim("couldn't check attestations right now")
    : att.total
      ? c.ok(`${att.total} attestation${att.total === 1 ? "" : "s"} on GitHub for these bytes${att.build ? ` (${att.build} build)` : ""}`)
      : c.dim("no attestations for these bytes");
  if (v.match) {
    console.log(
      card(
        kv([
          ["Verdict", c.ok("✔ Published by this repo")],
          ["Release", `${c.bold(v.match.tag)}${v.match.latest ? c.ok("  latest") : c.warn("  not the latest")}${v.match.prerelease ? c.warn("  pre-release") : ""}`],
          ["As", v.match.name],
          ["SHA-256", c.dim(sha)],
          ["Provenance", attLine],
        ]),
        "ok",
        path.basename(full),
      ),
    );
    if (att?.build) console.log(`\n  ${c.dim("Signature check:")} ${c.info(`gh attestation verify ${JSON.stringify(full)} --repo ${t.owner}/${t.repo}`)}\n`);
    return EXIT.ok;
  }
  console.log(
    card(
      kv([
        ["Verdict", att?.total ? c.warn("▲ Not a release file, but GitHub has attestations for it") : c.bad("✖ Not found in this repo's releases")],
        ["SHA-256", c.dim(sha)],
        ["Scanned", `${v.scanned} releases ${c.dim("(only files with a published digest can match)")}`],
        ["Provenance", attLine],
      ]),
      att?.total ? "warn" : "bad",
      path.basename(full),
    ),
  );
  console.log(`\n  ${c.dim("Edited, corrupted, from another source, or published before GitHub recorded digests.")}\n`);
  return EXIT.policy;
}

// ---------------------------------------------------------------------------
// lock / sync
// ---------------------------------------------------------------------------

async function cmdLock(sub: string | undefined, targets: string[], flags: Flags): Promise<number> {
  const file = lockPath(flags.lock);
  const sys = detectSystem();
  const prefs = { linuxPackage: sys.linuxPackage };
  const gh = client();

  if (!sub || sub === "show" || sub === "list") {
    const lock = await readLock(file);
    if (flags.json) {
      console.log(JSON.stringify(lock, null, 2));
      return EXIT.ok;
    }
    if (!lock || !Object.keys(lock.tools).length) {
      console.log(c.dim(`No ${LOCKFILE_NAME} here yet. Start one: ${c.info("oqgit lock owner/repo")}`));
      return EXIT.ok;
    }
    console.log(
      table([
        ["REPO", "TAG", "PLATFORMS", "DIGESTS", ""],
        ...Object.values(lock.tools).map((t) => {
          const assets = Object.values(t.assets);
          const withDigest = assets.filter((a) => a.digest).length;
          return [
            c.bold(t.repo),
            t.tag + (t.immutable ? c.dim(" (immutable)") : ""),
            Object.keys(t.assets).length === ALL_PLATFORMS.length ? `all ${ALL_PLATFORMS.length}` : Object.keys(t.assets).join(" "),
            withDigest === assets.length ? c.ok(`${withDigest}/${assets.length}`) : c.warn(`${withDigest}/${assets.length}`),
            c.dim(relativeTime(t.publishedAt)),
          ];
        }),
      ]),
    );
    return EXIT.ok;
  }

  // `oqgit lock owner/repo` is short for `oqgit lock add owner/repo`.
  if (sub && sub.includes("/")) [sub, targets] = ["add", [sub, ...targets]];

  if (sub === "add" || sub === "update") {
    const lock = await readLockOrEmpty(file);
    const list = sub === "add" ? targets : targets.length ? targets : Object.keys(lock.tools);
    if (!list.length) throw new UsageError(sub === "add" ? "Which repo? Try: oqgit lock owner/repo" : "Nothing locked yet.");
    if (flags.tag && list.length > 1) throw new UsageError("--tag works with one repo at a time.");
    const minAge = minAgeMs(flags);
    for (const raw of list) {
      const t = repoOf(raw);
      const repo = `${t.owner}/${t.repo}`;
      const existing = Object.keys(lock.tools).find((k) => k.toLowerCase() === repo.toLowerCase());
      if (sub === "update" && !existing) throw new UsageError(`${repo} isn't in ${LOCKFILE_NAME}. Use lock add.`);
      const release = flags.tag
        ? await gh.getRelease({ ...t, tag: flags.tag })
        : minAge
          ? (pickCooledRelease(await gh.listReleases(t), minAge).release ?? (() => { throw new UsageError(`No stable release of ${repo} is older than ${humanDuration(minAge)}.`); })())
          : await gh.getRelease(t);
      const tool = lockTool(existing ?? repo, release, prefs);
      const before = existing ? lock.tools[existing].tag : null;
      lock.tools[existing ?? repo] = tool;
      const n = Object.keys(tool.assets).length;
      const digests = Object.values(tool.assets).filter((a) => a.digest).length;
      const change = before && before !== tool.tag ? `${c.dim(before)} → ${c.ok(tool.tag)}` : c.bold(tool.tag);
      console.log(
        `${n ? c.ok("✔") : c.warn("▲")} ${c.bold(existing ?? repo)} ${change}  ${c.dim(`${n} platform${n === 1 ? "" : "s"}`)}` +
          (digests < n ? `  ${c.warn(`${n - digests} without a digest (size-checked only)`)}` : ""),
      );
    }
    await writeLock(file, lock);
    console.log(c.dim(`Wrote ${tildify(file)}. Commit it, then teammates and CI run ${c.info("oqgit sync")}.`));
    return EXIT.ok;
  }

  if (sub === "remove" || sub === "rm") {
    const lock = await readLockOrEmpty(file);
    for (const raw of targets) {
      const t = repoOf(raw);
      const key = Object.keys(lock.tools).find((k) => k.toLowerCase() === `${t.owner}/${t.repo}`.toLowerCase());
      if (key) delete lock.tools[key];
      console.log(key ? `${c.ok("✔")} Removed ${key}` : c.dim(`${t.owner}/${t.repo} wasn't locked.`));
    }
    await writeLock(file, lock);
    return EXIT.ok;
  }

  if (sub === "check") {
    const lock = await readLock(file);
    if (!lock) throw new UsageError(`No ${LOCKFILE_NAME} at ${tildify(file)}.`);
    const results = await Promise.all(
      Object.values(lock.tools).map(async (tool) => {
        const [owner, repo] = tool.repo.split("/");
        try {
          return { tool, drift: checkLock(tool, await gh.getRelease({ owner, repo, tag: tool.tag })), error: null as string | null };
        } catch (err) {
          return { tool, drift: [], error: err instanceof Error ? err.message : "failed" };
        }
      }),
    );
    const bad = results.filter((r) => r.drift.length || r.error);
    if (flags.json) {
      console.log(JSON.stringify({ lockfile: file, clean: bad.length === 0, results }, null, 2));
      return bad.length ? EXIT.policy : EXIT.ok;
    }
    for (const r of results) {
      if (r.error) console.log(`${c.bad("✖")} ${c.bold(r.tool.repo)} ${r.tool.tag}  ${c.bad(r.error)}`);
      else if (r.drift.length) {
        console.log(`${c.bad("✖")} ${c.bold(r.tool.repo)} ${r.tool.tag}`);
        for (const d of r.drift) console.log(`    ${c.warn(d.platform.padEnd(13))} ${d.detail}`);
      } else console.log(`${c.ok("✔")} ${c.bold(r.tool.repo)} ${r.tool.tag}  ${c.dim("matches the lock")}`);
    }
    if (bad.length) console.error(`\n${c.bad(`${bad.length} locked tool${bad.length === 1 ? "" : "s"} drifted.`)} A re-uploaded file under the same tag is how tampered releases look.`);
    return bad.length ? EXIT.policy : EXIT.ok;
  }

  throw new UsageError(`Unknown lock command “${sub}”. Use add, update, remove, check or show.`);
}

async function cmdSync(flags: Flags): Promise<number> {
  const file = lockPath(flags.lock);
  const lock = await readLock(file);
  if (!lock) throw new UsageError(`No ${LOCKFILE_NAME} at ${tildify(file)}. Create one with oqgit lock owner/repo.`);
  const sys = detectSystem();
  const platform = resolvePlatform(flags, sys);
  const key = platformKey(platform);
  const root = path.resolve(flags.out ?? path.join(path.dirname(file), ".oqgit"));
  const interactive = isTTY && !flags.json;
  if (interactive) header("sync");

  const results = [];
  let code: number = EXIT.ok;
  for (const tool of Object.values(lock.tools)) {
    const asset = tool.assets[key];
    if (!asset) {
      results.push({ repo: tool.repo, tag: tool.tag, status: "skipped" as const, note: `nothing locked for ${key}` });
      if (interactive) p.log.warn(`${c.bold(tool.repo)} ${c.dim(`no file locked for ${platformText(platform)}`)}`);
      continue;
    }
    const spin = interactive ? p.spinner() : null;
    spin?.start(`${tool.repo} ${tool.tag}  ${asset.name}`);
    try {
      const res = await syncOne({
        root,
        repo: tool.repo,
        tag: tool.tag,
        asset,
        extract: flags.extract,
        onProgress: (got, total) => spin?.message(`${tool.repo} ${tool.tag}  ${formatBytes(got)} / ${formatBytes(total)}`),
      });
      results.push(res);
      spin?.stop(
        `${c.bold(tool.repo)} ${tool.tag}  ${res.status === "cached" ? c.dim("already here") : c.ok("downloaded")}  ${res.verified === "lock" ? c.ok("✔ matches lock") : c.warn("size only")}` +
          (res.extractedTo ? c.dim(`  → ${tildify(res.extractedTo)}`) : ""),
      );
    } catch (err) {
      code = EXIT.error;
      const message = err instanceof Error ? err.message : String(err);
      results.push({ repo: tool.repo, tag: tool.tag, status: "failed", note: message });
      if (spin) spin.error(`${c.bold(tool.repo)} ${c.bad(message)}`);
      else console.error(`${tool.repo}: ${message}`);
    }
  }
  if (flags.json) console.log(JSON.stringify({ platform: key, root, results }, null, 2));
  else if (interactive) p.outro(c.dim(`Files in ${tildify(root)} — add ${c.info(".oqgit/")} to .gitignore. Nothing was installed or run.`));
  else for (const r of results) console.log(`${r.repo} ${r.tag} ${r.status}${"file" in r ? ` ${r.file}` : ""}`);
  return code;
}

// ---------------------------------------------------------------------------
// review
// ---------------------------------------------------------------------------

const SEVERITY_TONE: Record<Severity, (s: string) => string> = {
  "must-fix": (s) => c.bold(c.bad(s)),
  high: c.bad,
  medium: c.warn,
  low: c.info,
  nit: c.dim,
};

function reviewer(flags: Flags): GemmaReviewer {
  return new GemmaReviewer({
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || undefined,
    model: flags.model || process.env.OQGIT_REVIEW_MODEL || undefined,
    apiBase: process.env.OQGIT_GEMINI_API_BASE || undefined,
    thinking: flags.fast ? "minimal" : "high",
  });
}

async function cmdReview(target: string | undefined, flags: Flags): Promise<number> {
  const interactive = isTTY && !flags.json && !flags["prompt-only"];
  const pr = flags.pr ? Number(flags.pr) : undefined;
  if (flags.pr && (!Number.isInteger(pr) || pr! < 1)) throw new UsageError("--pr must be a pull request number.");
  const model = reviewer(flags); // validates the model name before any GitHub calls
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    throw new ResolveError("AI_NOT_CONFIGURED", "Set GEMINI_API_KEY to run reviews. Get a free key at https://aistudio.google.com/apikey.");
  }

  if (interactive) header("review");
  const spin = interactive ? p.spinner() : null;

  // `oqgit review 12` (or `#12`): pull request 12 in this checkout's GitHub repo.
  const prNumber = target && /^#?(\d{1,9})$/.exec(target);
  if (prNumber) {
    const repo = await originRepo(process.cwd());
    if (!repo) throw new UsageError(`Couldn't tell which GitHub repo this is. Try: oqgit review owner/repo#${prNumber[1]}`);
    target = `${repo}#${prNumber[1]}`;
  }

  let ctx;
  try {
    if (target) {
      spin?.start("Reading the change from GitHub");
      const t = parseReviewTarget(target, { allowShorthand: true, pr, head: flags.head, base: flags.base });
      ctx = await new GitHubPrClient({
        token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN || undefined,
        apiBase: process.env.OQGIT_API_BASE || undefined,
        userAgent: `oqgit/${VERSION}`,
      }).getContext(t);
      if (flags.goal) ctx.goal = flags.goal;
    } else {
      if (pr || flags.head) throw new UsageError("--pr and --head need an owner/repo target, e.g. oqgit review cli/cli --pr 12.");
      spin?.start("Reading this branch's changes");
      ctx = await localContext({ cwd: process.cwd(), base: flags.base, goal: flags.goal });
    }
  } catch (err) {
    spin?.error(err instanceof Error ? err.message : "Couldn't read the change");
    throw err;
  }
  const where = ctx.source === "pr" ? `${ctx.repo}#${ctx.number}` : `${ctx.head} → ${ctx.base}`;
  spin?.stop(`${c.bold(where)} ${c.dim(`· ${ctx.state} · ${ctx.files.length} files`)}`);

  spin?.start(`Reviewing with ${model.model} ${c.dim(flags.fast ? "(fast mode)" : "(deep thinking: can take several minutes; --fast is quicker)")}`);
  let result: ReviewResult;
  try {
    const envLimit = Number(process.env.OQGIT_REVIEW_MAX_INPUT_TOKENS);
    const maxInputTokens = envLimit > 0 ? envLimit : await loadInputLimit(model.model);
    result = await reviewChange(ctx, model, {
      maxInputTokens,
      onProgress: (e) => {
        void saveInputLimit(model.model, e.inputTokenLimit).catch(() => {});
        const msg = `Your key allows ${e.inputTokenLimit.toLocaleString("en-US")} input tokens/min (free tier). Retrying in ${e.waitSeconds}s with the diff trimmed to fit${e.unreviewed ? ` (${e.unreviewed} files left out)` : ""}`;
        if (spin) spin.message(msg);
        else if (!flags.json && !flags["prompt-only"]) console.error(msg);
      },
    });
  } catch (err) {
    if (err instanceof ModelQuotaError && err.inputTokenLimit) await saveInputLimit(model.model, err.inputTokenLimit).catch(() => {});
    spin?.error(err instanceof ResolveError ? err.message : "Review failed");
    if (err instanceof ModelQuotaError && err.inputTokenLimit) {
      throw new ResolveError("AI_RATE_LIMITED", `${err.message} The limit is saved: the next run trims the diff to fit and won't be rejected.`);
    }
    throw err;
  }
  spin?.stop(`Reviewed by ${model.model}`);

  const code = flags.strict && !result.verdict.safeToMerge ? EXIT.policy : EXIT.ok;
  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
    return code;
  }
  if (flags["prompt-only"]) {
    console.log(result.fixPrompt || "Nothing to fix.");
    if (flags.copy && result.fixPrompt) await copyToClipboard(result.fixPrompt);
    return code;
  }
  if (!interactive) {
    console.log(plainReview(result));
    if (flags.copy && result.fixPrompt) await copyToClipboard(result.fixPrompt);
    return code;
  }

  const v = result.verdict;
  const yes = (b: boolean) => (b ? c.ok("Yes") : c.bad("No"));
  const tone = v.readyToMerge ? "ok" : v.safeToMerge ? "warn" : "bad";
  const icon = v.readyToMerge ? c.ok("✔") : v.safeToMerge ? c.warn("▲") : c.bad("✖");
  const lines = [
    `${icon} ${c.bold(v.label)}`,
    "",
    ...kv([
      ["Safe to merge", yes(v.safeToMerge)],
      ["Ready to merge", yes(v.readyToMerge)],
      ["Title", result.title.current],
      ...(result.title.suggested && result.title.suggested !== result.title.current
        ? ([["Suggested", c.info(result.title.suggested)]] as Array<[string, string]>)
        : []),
      ["Change", c.dim(`${result.change.filesChanged} files · +${result.change.additions} −${result.change.deletions}`)],
    ]),
  ];
  if (v.blockers.length) lines.push("", c.dim(`Not ready: ${v.blockers.join(", ")}`));
  console.log(card(lines, tone, "verdict", { rail: true }));

  if (result.summary) p.log.message(wrap(result.summary, 84).join("\n"));
  if (result.intent.status !== "unknown" && result.intent.notes) {
    const it = result.intent.status === "matches" ? c.ok("on goal") : result.intent.status === "partial" ? c.warn("partly on goal") : c.bad("off goal");
    p.log.message(`${c.dim("Goal")} ${it}  ${c.dim(wrap(result.intent.notes, 76).join("\n"))}`);
  }

  if (result.findings.length === 0) p.log.success("No issues found.");
  for (const [i, f] of result.findings.entries()) {
    const tag = SEVERITY_TONE[f.severity](`[${SEVERITY_LABELS[f.severity].toUpperCase()}]`);
    const loc = f.file ? c.dim(` ${f.file}${f.line ? `:${f.line}` : ""}`) : "";
    const body = [
      `${c.dim(`${i + 1}.`)} ${tag} ${c.bold(f.title)}${loc}`,
      ...(f.detail ? wrap(f.detail, 84).map((l) => `   ${l}`) : []),
      ...(f.fix ? wrap(`Fix: ${f.fix}`, 84).map((l, j) => `   ${j === 0 ? c.ok(l.slice(0, 4)) + l.slice(4) : l}`) : []),
    ];
    p.log.message(body.join("\n"));
  }
  const list = (files: string[]) => `${files.slice(0, 8).join(", ")}${files.length > 8 ? ` +${files.length - 8} more` : ""}`;
  if (result.change.unreviewedFiles.length) {
    p.log.warn(`${c.warn("Partial review.")} Not fully reviewed (over the model's input limit): ${c.dim(list(result.change.unreviewedFiles))}`);
  }
  if (result.change.skippedFiles.length) p.log.message(c.dim(`Skipped (lockfile, generated or binary): ${list(result.change.skippedFiles)}`));

  if (!result.fixPrompt) {
    p.outro(`${gradient("Done.")} ${c.dim("Nothing to fix.")}`);
    return code;
  }
  p.log.step(c.bold("Fix prompt") + c.dim(" — paste into any AI coding assistant"));
  console.log(`${c.dim("─".repeat(Math.min(process.stdout.columns || 80, 92)))}\n${result.fixPrompt}\n${c.dim("─".repeat(Math.min(process.stdout.columns || 80, 92)))}`);
  const copy = flags.copy || (!flags.yes && exitOnCancel(await p.confirm({ message: "Copy the fix prompt to the clipboard?", initialValue: true })));
  if (copy) {
    if (await copyToClipboard(result.fixPrompt)) p.log.success("Copied to the clipboard");
    else p.log.warn("No clipboard tool found. Use --prompt-only to print just the prompt.");
  }
  p.outro(gradient("Done."));
  return code;
}

/** Plain-text review for pipes and CI logs. */
function plainReview(r: ReviewResult): string {
  const v = r.verdict;
  const out = [
    `Verdict: ${v.label}`,
    `Safe to merge: ${v.safeToMerge ? "yes" : "no"}`,
    `Ready to merge: ${v.readyToMerge ? "yes" : "no"}${v.blockers.length ? ` (${v.blockers.join(", ")})` : ""}`,
    ...(r.change.unreviewedFiles.length ? [`Partial review — not fully reviewed: ${r.change.unreviewedFiles.join(", ")}`] : []),
    `Title: ${r.title.current}`,
    `Suggested title: ${r.title.suggested}`,
    "",
    r.summary,
    "",
  ];
  if (!r.findings.length) out.push("No issues found.");
  for (const [i, f] of r.findings.entries()) {
    out.push(`${i + 1}. [${SEVERITY_LABELS[f.severity].toUpperCase()}] ${f.title}${f.file ? ` (${f.file}${f.line ? `:${f.line}` : ""})` : ""}`);
    if (f.detail) out.push(`   ${f.detail}`);
    if (f.fix) out.push(`   Fix: ${f.fix}`);
  }
  if (r.fixPrompt) out.push("", "--- Fix prompt ---", r.fixPrompt, "--- end ---");
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// Interactive menu (no arguments)
// ---------------------------------------------------------------------------

async function menu(flags: Flags): Promise<number> {
  console.log(banner(VERSION));
  const choice = exitOnCancel(
    await p.select<string>({
      message: "What do you want to do?",
      options: [
        { value: "get", label: "Get a download", hint: "paste a GitHub link" },
        { value: "info", label: "Inspect a release", hint: "see every file and what fits" },
        { value: "list", label: "Tracked downloads" },
        { value: "outdated", label: "Check for updates" },
        { value: "trust", label: "Trust report", hint: "attestations, immutability, re-uploads" },
        { value: "review", label: "Review code", hint: "a PR, a branch, or this repo's changes" },
        { value: "malware", label: "Malware check", hint: "VirusTotal hash lookup, optional local scan" },
        { value: "doctor", label: "Doctor", hint: "system, token, API quota" },
        { value: "help", label: "Help" },
      ],
    }),
  );
  if (choice === "get") return cmdGet(undefined, flags, { quietHeader: true });
  if (choice === "info") {
    const t = exitOnCancel(await p.text({ message: "GitHub repository or release URL", placeholder: "owner/repo" }));
    return cmdInfo(t, flags);
  }
  if (choice === "trust") {
    const t = exitOnCancel(await p.text({ message: "GitHub repository or release URL", placeholder: "owner/repo" }));
    return cmdTrust(t, flags);
  }
  if (choice === "review") {
    const t = exitOnCancel(
      await p.text({ message: "PR or branch link (leave empty to review this repo's branch)", placeholder: "https://github.com/owner/repo/pull/12" }),
    );
    return cmdReview(t?.trim() || undefined, flags);
  }
  if (choice === "malware") {
    const t = exitOnCancel(await p.text({ message: "GitHub repository or release URL", placeholder: "owner/repo" }));
    return cmdMalware(t, flags);
  }
  if (choice === "list") return cmdList(flags);
  if (choice === "outdated") return cmdOutdated(flags);
  if (choice === "doctor") return cmdDoctor(flags);
  console.log(help());
  return EXIT.ok;
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

/** " Did you mean `oqgit get`?" for a near-miss command name, or "". */
function suggest(input: string): string {
  const names = [...COMMANDS, ...Object.keys(ALIASES)];
  let best = "";
  let bestDist = 3;
  for (const name of names) {
    const d = editDistance(input.toLowerCase(), name);
    if (d < bestDist) [best, bestDist] = [name, d];
  }
  return best ? ` Did you mean ${c.info(`oqgit ${best}`)}?` : "";
}

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

function report(err: unknown) {
  if (err instanceof UsageError) {
    console.error(`${c.bad("✖")} ${err.message}`);
  } else if (err instanceof ResolveError) {
    const extra = err.code === "RATE_LIMITED" ? c.dim(`\n  Set GITHUB_TOKEN to raise the limit${err.retryAfter ? `, or retry in ~${Math.ceil(err.retryAfter / 60)} min` : ""}.`) : "";
    console.error(`${c.bad("✖")} ${err.message}${extra}`);
  } else if (err instanceof DownloadError || err instanceof GitError) {
    console.error(`${c.bad("✖")} ${err.message}`);
  } else {
    console.error(`${c.bad("✖")} Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
    if (process.env.OQGIT_DEBUG && err instanceof Error) console.error(err.stack);
  }
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true, strict: true });
  } catch (err) {
    report(new UsageError((err as Error).message));
    return EXIT.usage;
  }
  const flags = parsed.values as Flags;
  const [first, second, ...rest] = parsed.positionals;

  if (flags.version) {
    console.log(VERSION);
    return EXIT.ok;
  }
  const named = first && (ALIASES[first] ?? first);
  if (named === "help" || flags.help) {
    const topic = named === "help" ? second && (ALIASES[second] ?? second) : named;
    if (topic === "all") console.log(fullHelp());
    else if (topic && COMMAND_HELP[topic]) console.log(commandHelp(topic));
    else if (topic && named === "help") {
      report(new UsageError(`No command called “${second}”.${suggest(second!) || " Run oqgit help."}`));
      return EXIT.usage;
    } else console.log(help());
    return EXIT.ok;
  }

  try {
    if (!first) return isTTY && !flags.json ? await menu(flags) : (console.log(help()), EXIT.ok);
    const command = (COMMANDS as readonly string[]).includes(named) ? named : null;
    switch (command) {
      case "get":
        return await cmdGet(...targetArgs("get", second, rest, flags));
      case "info":
        return await cmdInfo(...targetArgs("info", second, rest, flags));
      case "list":
        return await cmdList(flags);
      case "outdated":
        return await cmdOutdated(flags);
      case "update":
        return await cmdUpdate(second, flags);
      case "forget":
        return await cmdForget(second);
      case "doctor":
        return await cmdDoctor(flags);
      case "trust":
        return await cmdTrust(...targetArgs("trust", second, rest, flags));
      case "malware":
        return await cmdMalware(...targetArgs("malware", second, rest, flags));
      case "diff":
        return await cmdDiff(second, rest[0], rest[1], flags);
      case "verify":
        return await cmdVerify(second, { ...flags, repo: flags.repo ?? rest[0] });
      case "lock":
        return await cmdLock(second, rest, flags);
      case "sync":
        return await cmdSync(flags);
      case "review":
        return await cmdReview(second, flags);
      case "mcp":
        await startMcpServer({
          client,
          vt: vtClient,
          system: detectSystem(),
          version: VERSION,
          allowDownload: !!flags["allow-download"],
          cwd: process.cwd(),
        });
        return EXIT.ok;
      default:
        // `oqgit <url>` shorthand for `get`
        if (/github\.com\/|^[\w.-]+\/[\w.-]+(?:@\S+)?$/.test(first)) return await cmdGet(...targetArgs("get", first, [second, ...rest].filter(Boolean), flags));
        throw new UsageError(`Unknown command “${first}”.${suggest(first) || " Run oqgit help."}`);
    }
  } catch (err) {
    if (err instanceof CancelledError) return EXIT.ok;
    report(err);
    return err instanceof UsageError || (err instanceof ResolveError && err.code === "INVALID_URL") ? EXIT.usage : EXIT.error;
  }
}
