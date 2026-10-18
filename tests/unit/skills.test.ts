import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { installSkills, parseAgents } from "../../cli/src/skills";
import { handleMessage, buildTools } from "../../cli/src/mcp";
import { DOMAINS, SKILLS, findSkill, searchSkills, skillSummary } from "@/core/skills";

describe("skill library", () => {
  it("has skills in every domain, each following the Agent Skills naming rules", () => {
    for (const d of DOMAINS) expect(SKILLS.some((s) => s.domain === d.id)).toBe(true);
    for (const s of SKILLS) {
      expect(s.name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(s.content.startsWith(`---\nname: ${s.name}\n`)).toBe(true);
      expect(s.description.length).toBeLessThanOrEqual(1024);
    }
  });

  it("ranks name matches above description matches and requires every word", () => {
    expect(searchSkills("review").slice(0, 2).map((s) => s.name).sort()).toEqual(["pull-request-review", "secure-code-review"]);
    expect(searchSkills("flaky test")[0].name).toBe("flaky-test-triage");
    expect(searchSkills("nonexistent-word")).toEqual([]);
    expect(searchSkills("", { domain: "security" }).every((s) => s.domain === "security")).toBe(true);
  });

  it("summarises long descriptions at a word boundary", () => {
    expect(skillSummary({ description: "Short one. More text." })).toBe("Short one");
    expect(skillSummary({ description: "word ".repeat(30) }, 20).length).toBeLessThanOrEqual(21);
  });
});

describe("installSkills", () => {
  it("writes SKILL.md into each agent folder and never overwrites without force", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "oq-skills-"));
    const skill = findSkill("git-recovery")!;
    const first = await installSkills([skill], { agents: ["claude", "cursor"], cwd });
    expect(first.map((r) => r.status)).toEqual(["installed", "installed"]);
    const file = path.join(cwd, ".claude/skills/git-recovery/SKILL.md");
    expect(await readFile(file, "utf8")).toBe(skill.content);

    await writeFile(file, "local edits");
    const again = await installSkills([skill], { agents: ["claude"], cwd });
    expect(again[0].status).toBe("exists");
    expect(await readFile(file, "utf8")).toBe("local edits");
    expect((await installSkills([skill], { agents: ["claude"], cwd, force: true }))[0].status).toBe("updated");
  });

  it("detects agents from project folders, defaulting to Claude Code", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "oq-agents-"));
    expect(parseAgents(undefined, cwd)).toEqual(["claude"]);
    expect(parseAgents("cursor,gemini", cwd)).toEqual(["cursor", "gemini"]);
    expect(parseAgents("all", cwd).length).toBeGreaterThan(3);
    expect(() => parseAgents("vim", cwd)).toThrow(/Unknown agent/);
  });
});

describe("MCP skill tools", () => {
  const tools = buildTools({
    client: () => { throw new Error("no network in this test"); },
    vt: () => ({}) as never,
    system: { os: "linux", arch: "x64" } as never,
    version: "test",
    allowDownload: false,
    cwd: os.tmpdir(),
  });
  const call = (name: string, args: Record<string, unknown>) =>
    handleMessage({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }, tools, "test");

  it("searches and reads skills", async () => {
    const found = (await call("search_skills", { query: "migration" })) as { result: { structuredContent: { skills: { name: string }[] } } };
    expect(found.result.structuredContent.skills[0].name).toBe("safe-database-migrations");
    const got = (await call("get_skill", { name: "llm-evals" })) as { result: { structuredContent: { content: string } } };
    expect(got.result.structuredContent.content).toContain("# LLM evals");
  });

  it("reports an unknown skill as a tool error", async () => {
    const res = (await call("get_skill", { name: "nope" })) as { result: { isError: boolean } };
    expect(res.result.isError).toBe(true);
  });
});
