/**
 * `oqgit mcp`: a Model Context Protocol server over stdio, so coding agents (Claude Code, Cursor,
 * Codex …) can find the right release binary and check its provenance instead of guessing URLs
 * or piping install scripts to a shell.
 *
 * Read-only by default. `download_release` exists only when started with --allow-download, and it
 * still never runs anything: it saves the file and reports where.
 */
import { stat } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline";
import type { GitHubClient } from "../../src/core/github";
import { checkLock } from "../../src/core/lockfile";
import { malwareFor, trustFor, verifyDigest } from "../../src/core/inspect";
import { diffReleases, parseDuration } from "../../src/core/releases";
import { resolveDetailed } from "../../src/core/resolve";
import { parseGitHubUrl } from "../../src/core/parse-url";
import { ResolveError } from "../../src/core/errors";
import { ARCH_VALUES, OS_VALUES, type Arch, type Os, type Platform } from "../../src/core/types";
import type { VirusTotalClient } from "../../src/core/virustotal";
import { downloadAsset } from "./download";
import { lockPath, readLock, sha256File } from "./lock";
import type { SystemInfo } from "./system";

export const MCP_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

interface Deps {
  client: () => GitHubClient;
  /** VirusTotal hash reputation; disabled (no key) is fine — the report says so. */
  vt: () => VirusTotalClient;
  system: SystemInfo;
  version: string;
  allowDownload: boolean;
  /** Where downloads land; relative paths from the agent resolve inside it. */
  cwd: string;
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
}

type Json = Record<string, unknown>;

interface Tool {
  name: string;
  description: string;
  inputSchema: Json;
  annotations?: Json;
  run: (args: Json) => Promise<unknown>;
}

const target = { type: "string", description: "GitHub repo or release URL, or owner/repo" };
const platformProps = {
  os: { type: "string", enum: [...OS_VALUES], description: "Defaults to this machine" },
  arch: { type: "string", enum: [...ARCH_VALUES], description: "Defaults to this machine" },
};

function str(args: Json, key: string, required = false): string | undefined {
  const v = args[key];
  if (v === undefined || v === null || v === "") {
    if (required) throw new ResolveError("INVALID_REQUEST", `Missing "${key}".`);
    return undefined;
  }
  if (typeof v !== "string") throw new ResolveError("INVALID_REQUEST", `"${key}" must be a string.`);
  return v;
}

export function buildTools(deps: Deps): Tool[] {
  // One client per server: all tools share its outbound quota and in-flight lookups.
  const vt = deps.vt();
  const platformOf = (args: Json): Platform => {
    const os = (str(args, "os") ?? deps.system.os) as Os | null;
    const arch = (str(args, "arch") ?? deps.system.arch) as Arch | null;
    if (!os || !OS_VALUES.includes(os) || !arch || !ARCH_VALUES.includes(arch)) {
      throw new ResolveError("INVALID_REQUEST", "Pass os and arch; this machine couldn't be identified.");
    }
    return { os, arch };
  };
  const urlOf = (args: Json) => {
    const t = str(args, "target", true)!;
    const tag = str(args, "tag");
    if (!tag) return t;
    const { owner, repo } = parseGitHubUrl(t, { allowShorthand: true });
    return `https://github.com/${owner}/${repo}/releases/tag/${encodeURIComponent(tag)}`;
  };
  const minAge = (args: Json) => {
    const v = str(args, "min_age");
    if (!v) return undefined;
    const ms = parseDuration(v);
    if (ms === null) throw new ResolveError("INVALID_REQUEST", `min_age must look like "3d", "72h" or "1w".`);
    return ms;
  };
  const resolveFor = async (args: Json) => {
    const platform = platformOf(args);
    const prefs = platform.os === deps.system.os ? { linuxPackage: deps.system.linuxPackage } : {};
    return resolveDetailed({ url: urlOf(args), platform, prefs, parse: { allowShorthand: true }, minAgeMs: minAge(args) }, deps.client());
  };

  const tools: Tool[] = [
    {
      name: "resolve_release",
      description:
        "Find the release file that fits a machine (default: this one) for a GitHub repo. Returns the exact download URL, size and SHA-256 digest, or why no file is a reliable match. Never guesses.",
      inputSchema: {
        type: "object",
        properties: { target, tag: { type: "string" }, ...platformProps, min_age: { type: "string", description: 'Cooldown, e.g. "3d": skip releases younger than this' } },
        required: ["target"],
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
      run: async (args) => {
        const d = await resolveFor(args);
        return { ...d.response, skippedForCooldown: d.skipped.map((r) => r.tag) };
      },
    },
    {
      name: "release_trust",
      description:
        "Supply-chain signals for the file this machine would download: GitHub build attestations, immutable release, digest, re-uploads after publish, release age, signatures, size jump vs the previous release. Use before installing a binary.",
      inputSchema: { type: "object", properties: { target, tag: { type: "string" }, ...platformProps }, required: ["target"] },
      annotations: { readOnlyHint: true, openWorldHint: true },
      run: async (args) => {
        const d = await resolveFor(args);
        if (d.response.recommendation.status !== "recommended") return { recommendation: d.response.recommendation };
        const asset = d.release.assets.find((a) => a.name === (d.response.recommendation as { asset: { name: string } }).asset.name)!;
        return { release: d.response.release, file: asset.name, trust: await trustFor(deps.client(), d.target, d.release, asset) };
      },
    },
    {
      name: "check_malware",
      description:
        "Check the file this machine would download against VirusTotal: how many engines flag its SHA-256 as malicious or suspicious, with the top detections. Complements release_trust. Only the hash is sent; a clean result covers known malware only and never proves safety.",
      inputSchema: { type: "object", properties: { target, tag: { type: "string" }, ...platformProps }, required: ["target"] },
      annotations: { readOnlyHint: true, openWorldHint: true },
      run: async (args) => {
        const d = await resolveFor(args);
        const rec = d.response.recommendation;
        if (rec.status !== "recommended") return { recommendation: rec, file: null, malware: null };
        const asset = d.release.assets.find((a) => a.name === rec.asset.name)!;
        return { release: d.response.release, file: asset.name, malware: await malwareFor(vt, asset.digest) };
      },
    },
    {
      name: "release_diff",
      description: "Compare the files of two releases (default: previous stable → latest stable): added, removed, resized, platforms gained or lost.",
      inputSchema: { type: "object", properties: { repo: target, from: { type: "string" }, to: { type: "string" } }, required: ["repo"] },
      annotations: { readOnlyHint: true, openWorldHint: true },
      run: async (args) => {
        const t = parseGitHubUrl(str(args, "repo", true)!, { allowShorthand: true });
        const releases = await deps.client().listReleases(t, 100);
        const pick = (tag?: string) => (tag ? releases.find((r) => r.tag === tag) : undefined);
        const stable = releases.filter((r) => !r.prerelease);
        const to = pick(str(args, "to")) ?? stable[0];
        const from = pick(str(args, "from")) ?? stable.find((r) => Date.parse(r.publishedAt ?? "") < Date.parse(to?.publishedAt ?? ""));
        if (!to || !from) throw new ResolveError("RELEASE_NOT_FOUND", "Need two releases to compare.");
        return diffReleases(from, to);
      },
    },
    {
      name: "verify_file",
      description:
        "Hash a local file and check whether that exact file was published in a GitHub repo's releases, and whether GitHub holds attestations for it. Answers: is this binary on disk really from owner/repo?",
      inputSchema: { type: "object", properties: { path: { type: "string" }, repo: target }, required: ["path", "repo"] },
      annotations: { readOnlyHint: true, openWorldHint: true },
      run: async (args) => {
        const file = path.resolve(deps.cwd, str(args, "path", true)!);
        const info = await stat(file);
        if (!info.isFile()) throw new ResolveError("INVALID_REQUEST", "path must be a regular file.");
        const t = parseGitHubUrl(str(args, "repo", true)!, { allowShorthand: true });
        return { file, ...(await verifyDigest(deps.client(), t, await sha256File(file))) };
      },
    },
    {
      name: "lock_check",
      description: `Check ${"oqgit.lock.json"} against GitHub: reports any locked file that was re-uploaded, resized or removed since it was locked.`,
      inputSchema: { type: "object", properties: { lockfile: { type: "string" } } },
      annotations: { readOnlyHint: true, openWorldHint: true },
      run: async (args) => {
        const file = lockPath(path.resolve(deps.cwd, str(args, "lockfile") ?? "oqgit.lock.json"));
        const lock = await readLock(file);
        if (!lock) throw new ResolveError("INVALID_REQUEST", `No lockfile at ${file}.`);
        const gh = deps.client();
        const results = [];
        for (const tool of Object.values(lock.tools)) {
          const [owner, repo] = tool.repo.split("/");
          const current = await gh.getRelease({ owner, repo, tag: tool.tag });
          results.push({ repo: tool.repo, tag: tool.tag, drift: checkLock(tool, current) });
        }
        return { lockfile: file, clean: results.every((r) => r.drift.length === 0), results };
      },
    },
  ];

  if (deps.allowDownload) {
    tools.push({
      name: "download_release",
      description:
        "Download the matching release file into a folder (default ./.oqgit/downloads) after verifying its size and SHA-256. Never extracts or runs it. Refuses files with little provenance unless allow_weak is true.",
      inputSchema: {
        type: "object",
        properties: { target, tag: { type: "string" }, ...platformProps, dir: { type: "string" }, allow_weak: { type: "boolean" }, min_age: { type: "string" } },
        required: ["target"],
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
      run: async (args) => {
        const d = await resolveFor(args);
        const rec = d.response.recommendation;
        if (rec.status !== "recommended") return { downloaded: false, recommendation: rec };
        const asset = d.release.assets.find((a) => a.name === rec.asset.name)!;
        const trust = await trustFor(deps.client(), d.target, d.release, asset);
        if (trust.level === "weak" && args.allow_weak !== true) {
          return { downloaded: false, reason: "Little provenance for this file; pass allow_weak to download anyway.", trust };
        }
        const dir = path.resolve(deps.cwd, str(args, "dir") ?? path.join(".oqgit", "downloads"));
        const res = await downloadAsset({ url: asset.downloadUrl, fileName: asset.name, dir, expectedSize: asset.size, digest: asset.digest, overwrite: true });
        return {
          downloaded: true,
          ...res,
          tag: d.release.tag,
          trust: { level: trust.level, score: trust.score },
          malware: await malwareFor(vt, res.sha256),
        };
      },
    });
  }
  return tools;
}

/** Handle one JSON-RPC message. Returns the response, or null for notifications. */
export async function handleMessage(msg: Json, tools: Tool[], version: string): Promise<Json | null> {
  const id = msg.id as string | number | undefined;
  const method = msg.method as string | undefined;
  const reply = (result: unknown) => ({ jsonrpc: "2.0", id, result });
  const error = (code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

  if (msg.jsonrpc !== "2.0" || typeof method !== "string") return id === undefined ? null : error(-32600, "Invalid request");
  if (id === undefined) return null; // notification (e.g. notifications/initialized)

  switch (method) {
    case "initialize": {
      const asked = (msg.params as Json | undefined)?.protocolVersion as string | undefined;
      return reply({
        protocolVersion: asked && MCP_PROTOCOL_VERSIONS.includes(asked) ? asked : MCP_PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "oqgit", title: "oqgit — GitHub release resolver", version },
        instructions:
          "Use resolve_release to get the right binary for a GitHub project instead of guessing asset URLs, release_trust before installing it, and check_malware to see whether antivirus engines flag the file. Files are never executed by this server.",
      });
    }
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: tools.map(({ name, description, inputSchema, annotations }) => ({ name, description, inputSchema, annotations })) });
    case "tools/call": {
      const params = (msg.params ?? {}) as Json;
      const tool = tools.find((t) => t.name === params.name);
      if (!tool) return error(-32602, `Unknown tool: ${String(params.name)}`);
      try {
        const out = await tool.run((params.arguments ?? {}) as Json);
        return reply({ content: [{ type: "text", text: JSON.stringify(out, null, 2) }], structuredContent: out, isError: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return reply({ content: [{ type: "text", text: message }], isError: true });
      }
    }
    default:
      return error(-32601, `Method not found: ${method}`);
  }
}

export async function startMcpServer(deps: Deps): Promise<void> {
  const tools = buildTools(deps);
  const out = deps.output ?? process.stdout;
  const rl = createInterface({ input: deps.input ?? process.stdin, crlfDelay: Infinity });
  const pending: Promise<void>[] = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    let msg: Json;
    try {
      msg = JSON.parse(line) as Json;
    } catch {
      out.write(`${JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } })}\n`);
      continue;
    }
    pending.push(
      handleMessage(msg, tools, deps.version).then((res) => {
        if (res) out.write(`${JSON.stringify(res)}\n`);
      }),
    );
  }
  await Promise.all(pending);
}
