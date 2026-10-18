import { DOMAINS, searchSkills, skillMeta } from "@/core/skills";

/**
 * GET /api/skills?q=react&domain=frontend → the skill library as JSON (no SKILL.md bodies).
 * Fetch one skill's SKILL.md from /api/skills/<name>.
 */
export function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 200);
  const domain = url.searchParams.get("domain") ?? undefined;
  const skills = searchSkills(q, { domain }).map(skillMeta);
  return Response.json(
    { domains: DOMAINS, count: skills.length, skills },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } },
  );
}
