import type { Metadata } from "next";
import Noise from "@/components/designpass/Noise";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteNav } from "@/components/sections/site-nav";
import { McpConnect } from "@/components/skills/mcp-connect";
import { SkillBrowser } from "@/components/skills/skill-browser";
import { CopyButton } from "@/components/ui/copy-button";
import { MicroLabel } from "@/components/ui/micro-label";
import { Breadcrumb, NextStep } from "@/components/ui/page-chrome";
import { DOMAINS, SKILLS, skillMeta } from "@/core/skills";

export const metadata: Metadata = {
  title: "Skill library — OneCLIQ",
  description: `${SKILLS.length} Agent Skills for developers in ${DOMAINS.length} domains. Add them to Claude Code, Codex, Cursor, Gemini CLI, Copilot or OpenCode with one command, or over MCP.`,
};

const meta = SKILLS.map(skillMeta);

const STEPS = [
  { n: "01", title: "Find", text: "Search by task or pick a domain below. Open a skill to read exactly what it tells your agent." },
  { n: "02", title: "Add", text: "Choose your agent and copy one line. It saves SKILL.md where your agent looks: .claude, .cursor, .agents…" },
  { n: "03", title: "Just ask", text: "Your agent loads the skill on its own when a task matches. No prompt pasting." },
];

export default function SkillsPage() {
  return (
    <>
      <SiteNav />
      <main id="main" className="relative isolate flex-1 overflow-hidden bg-night pt-28 text-night-ink sm:pt-32">
        <div aria-hidden className="bg-dots-night absolute inset-0 -z-10 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_60%)]" />
        <div
          aria-hidden
          className="absolute left-1/2 top-0 -z-10 aspect-square w-[min(1100px,160vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--ember)_70%,transparent),color-mix(in_oklab,var(--dusk)_50%,transparent)_50%,transparent)] opacity-60 blur-2xl"
        />
        <Noise preset="film" opacity={0.3} className="-z-10" />
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Breadcrumb page="skills" tone="night" />
          <div className="mx-auto mt-8 max-w-3xl text-center">
            <MicroLabel className="rounded-full border border-night-rule px-3 py-1 text-night-muted">
              Tool 03 · {SKILLS.length} skills · {DOMAINS.length} domains · MIT
            </MicroLabel>
            <h1 className="mt-6 text-balance font-serif text-[clamp(48px,7vw,92px)] font-normal leading-[0.95] tracking-[-0.02em]">
              Skills for <em>every</em> coding agent.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-night-ink/75">
              A skill is a short playbook, written like a senior engineer’s checklist, that your coding agent reads when the
              task matches. Pick your agent, copy one line, and it knows how to do the job properly.
            </p>
            <div className="mx-auto mt-8 flex max-w-md items-center gap-3 rounded-full border border-night-rule bg-night-raised/80 py-1.5 pl-5 pr-1.5 font-mono text-[13px] backdrop-blur">
              <span className="text-ember">$</span>
              <code className="flex-1 text-left">npx onecliq skills</code>
              <CopyButton text="npx onecliq skills" />
            </div>
          </div>

          <ol className="mx-auto mt-14 grid max-w-5xl gap-px overflow-hidden rounded-[22px] border border-night-rule bg-night-rule sm:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="flex items-start gap-4 bg-night-raised/90 p-5">
                <span className="font-dots text-[22px] font-black leading-none text-lilac">{s.n}</span>
                <div>
                  <h2 className="text-[14px] font-medium">{s.title}</h2>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-night-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-14">
            <SkillBrowser skills={meta} />
          </div>
          <div id="mcp" className="mx-auto mt-24 max-w-2xl scroll-mt-28">
            <h2 className="text-center font-serif text-[clamp(30px,3.4vw,44px)] leading-tight">
              Or let your agent <em>shop</em> for itself
            </h2>
            <p className="mx-auto mb-6 mt-3 max-w-md text-center text-[14px] leading-relaxed text-night-muted">
              Connect once over MCP, then say “find a skill for flaky tests and install it”. Your agent searches, reads and adds it.
            </p>
            <McpConnect />
          </div>
        </div>
        <div className="mt-24 bg-paper pt-24 pb-24">
          <NextStep page="skills" />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
