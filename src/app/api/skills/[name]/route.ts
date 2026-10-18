import { SKILLS, findSkill } from "@/core/skills";

export function generateStaticParams() {
  return SKILLS.map((s) => ({ name: s.name }));
}

/**
 * GET /api/skills/<name> → the raw SKILL.md, ready to save as <skills-dir>/<name>/SKILL.md.
 * Add ?download to get it as a file.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/skills/[name]">) {
  const { name } = await ctx.params;
  const skill = findSkill(name);
  if (!skill) return new Response("No skill by that name.\n", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const headers: Record<string, string> = {
    "Content-Type": "text/markdown; charset=utf-8",
    "Cache-Control": "public, max-age=300, s-maxage=3600",
  };
  if (new URL(request.url).searchParams.has("download")) headers["Content-Disposition"] = `attachment; filename="SKILL.md"`;
  return new Response(skill.content, { headers });
}
