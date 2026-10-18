/**
 * The OneCLIQ skill library: Agent Skills (https://agentskills.io) for developers, grouped by domain.
 * Source files live in skills/<domain>/<name>/SKILL.md; scripts/build-skills.mjs validates them and
 * writes catalog.json, which the web server, the CLI and the MCP server read. Client components
 * import ./search instead, so SKILL.md bodies never ship to the browser.
 */
import catalog from "./catalog.json";
import { DOMAINS, rankSkills, type Skill, type SkillMeta } from "./search";

export { AGENTS, AGENT_IDS, DOMAINS, domainLabel, rankSkills, skillSummary } from "./search";
export type { AgentId, DomainId, Skill, SkillMeta } from "./search";

const DOMAIN_ORDER: readonly string[] = DOMAINS.map((d) => d.id);

/** Every skill, in domain order (frontend → git workflow), then by name. */
export const SKILLS = [...(catalog.skills as Skill[])].sort(
  (a, b) => DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain) || a.name.localeCompare(b.name),
);

export function findSkill(name: string): Skill | undefined {
  const n = name.trim().toLowerCase();
  return SKILLS.find((s) => s.name === n);
}

export function searchSkills(query = "", opts: { domain?: string; limit?: number } = {}): Skill[] {
  return rankSkills(SKILLS, query, opts);
}

/** A skill without its SKILL.md body, for lists and JSON responses. */
export function skillMeta(s: Skill): SkillMeta {
  const { content, ...meta } = s;
  void content;
  return meta;
}
