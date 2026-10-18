/**
 * Catalog-free parts of the skill library: types, domains, agents, ranking and summaries.
 * Safe for client components: it never imports the SKILL.md bodies.
 */

export interface SkillMeta {
  name: string;
  title: string;
  domain: DomainId;
  description: string;
  compatibility?: string;
  version: string;
  /** Repo-relative path to the SKILL.md. */
  path: string;
  /** Public skills or writing this one credits as inspiration (metadata.inspired-by). */
  inspiredBy?: string;
}

export interface Skill extends SkillMeta {
  /** The full SKILL.md, frontmatter included: write it to disk as-is to install. */
  content: string;
}

export const DOMAINS = [
  { id: "workflow", label: "Workflow", blurb: "Plan, debug, verify and hand off like a senior." },
  { id: "frontend", label: "Frontend", blurb: "Fast, accessible, delightful interfaces." },
  { id: "backend", label: "Backend", blurb: "APIs, data and the plumbing between them." },
  { id: "devops", label: "DevOps", blurb: "CI, containers and releases people can trust." },
  { id: "security", label: "Security", blurb: "Find real bugs before attackers do." },
  { id: "testing", label: "Testing", blurb: "Tests that catch regressions, not time." },
  { id: "ai-engineering", label: "AI engineering", blurb: "Gemma 4, evals and MCP servers." },
  { id: "git-workflow", label: "Git workflow", blurb: "Reviews, commits, worktrees and getting unstuck." },
  { id: "languages", label: "Languages", blurb: "Idiomatic TypeScript and Go." },
] as const;

export type DomainId = (typeof DOMAINS)[number]["id"];

export function domainLabel(id: string): string {
  return DOMAINS.find((d) => d.id === id)?.label ?? id;
}

/**
 * Rank skills for a free-text query. Every word must appear somewhere (name, title, domain or
 * description); name and title hits rank above description hits. An empty query keeps the order.
 */
export function rankSkills<T extends SkillMeta>(pool: T[], query = "", opts: { domain?: string; limit?: number } = {}): T[] {
  const words = query.toLowerCase().split(/[\s,]+/).filter(Boolean);
  const scored = (opts.domain ? pool.filter((s) => s.domain === opts.domain) : pool)
    .map((s) => {
      const name = `${s.name} ${s.title}`.toLowerCase();
      const desc = `${s.domain} ${domainLabel(s.domain)} ${s.description}`.toLowerCase();
      let score = 0;
      for (const w of words) {
        if (name.includes(w)) score += 3;
        else if (desc.includes(w)) score += 1;
        else return null;
      }
      return { s, score };
    })
    .filter((x): x is { s: T; score: number } => x !== null);
  if (words.length) scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, opts.limit ?? scored.length).map((x) => x.s);
}

/** The first clause of a skill's description, for lists: "Review a pull request like a senior engineer". */
export function skillSummary(s: Pick<SkillMeta, "description">, max = 72): string {
  const first = s.description.split(" - ")[0].split(". ")[0].replace(/\.$/, "");
  if (first.length <= max) return first;
  const cut = first.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:]$/, "")}…`;
}

/** Coding agents that load Agent Skills, and where each one looks for them. */
export const AGENTS = {
  claude: { label: "Claude Code", project: ".claude/skills", global: "~/.claude/skills" },
  codex: { label: "Codex CLI", project: ".agents/skills", global: "~/.agents/skills" },
  cursor: { label: "Cursor", project: ".cursor/skills", global: "~/.cursor/skills" },
  gemini: { label: "Gemini CLI", project: ".gemini/skills", global: "~/.gemini/skills" },
  copilot: { label: "GitHub Copilot", project: ".github/skills", global: "~/.copilot/skills" },
  opencode: { label: "OpenCode", project: ".opencode/skills", global: "~/.config/opencode/skills" },
} as const;

export type AgentId = keyof typeof AGENTS;
export const AGENT_IDS = Object.keys(AGENTS) as AgentId[];
