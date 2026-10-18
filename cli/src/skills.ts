/** Installs skills from the OneCLIQ library into the folders coding agents read them from. */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { AGENTS, AGENT_IDS, type AgentId, type Skill } from "../../src/core/skills/search";

export interface InstallOptions {
  agents: AgentId[];
  global?: boolean;
  /** A custom skills folder; overrides the agent folders. */
  dir?: string;
  force?: boolean;
  dryRun?: boolean;
  cwd: string;
  home?: string;
}

export interface InstallResult {
  skill: string;
  agent: AgentId | "custom";
  file: string;
  status: "installed" | "updated" | "exists" | "would-install";
}

const expandHome = (p: string, home: string) => (p.startsWith("~/") ? path.join(home, p.slice(2)) : p);

/** Turn `--agent claude,cursor` / `all` into agent ids; with nothing given, use the agents this project already has. */
export function parseAgents(value: string | undefined, cwd: string): AgentId[] {
  if (value) {
    const list = value.split(",").map((a) => a.trim().toLowerCase()).filter(Boolean);
    if (list.includes("all")) return AGENT_IDS;
    const bad = list.filter((a) => !AGENT_IDS.includes(a as AgentId));
    if (bad.length) throw new Error(`Unknown agent “${bad.join(", ")}”. Use one of: ${AGENT_IDS.join(", ")}, all.`);
    return list as AgentId[];
  }
  const found = AGENT_IDS.filter((id) => existsSync(path.join(cwd, AGENTS[id].project.split("/")[0])));
  // `.github` exists in most repos for CI alone; it only counts as Copilot when nothing else is set up.
  const detected = found.filter((id) => id !== "copilot");
  return detected.length ? detected : ["claude"];
}

export function skillsDirFor(agent: AgentId, opts: Pick<InstallOptions, "global" | "cwd" | "home">): string {
  const home = opts.home ?? os.homedir();
  return opts.global ? expandHome(AGENTS[agent].global, home) : path.join(opts.cwd, AGENTS[agent].project);
}

export async function installSkills(skills: Skill[], opts: InstallOptions): Promise<InstallResult[]> {
  const targets: Array<{ agent: AgentId | "custom"; dir: string }> = opts.dir
    ? [{ agent: "custom", dir: path.resolve(opts.cwd, opts.dir) }]
    : opts.agents.map((agent) => ({ agent, dir: skillsDirFor(agent, opts) }));
  const results: InstallResult[] = [];
  for (const { agent, dir } of targets) {
    for (const skill of skills) {
      const file = path.join(dir, skill.name, "SKILL.md");
      const exists = existsSync(file);
      if (opts.dryRun) {
        results.push({ skill: skill.name, agent, file, status: exists && !opts.force ? "exists" : "would-install" });
        continue;
      }
      if (exists && !opts.force) {
        results.push({ skill: skill.name, agent, file, status: "exists" });
        continue;
      }
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, skill.content);
      results.push({ skill: skill.name, agent, file, status: exists ? "updated" : "installed" });
    }
  }
  return results;
}
