import type { Metadata } from "next";
import Noise from "@/components/designpass/Noise";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteNav } from "@/components/sections/site-nav";
import { McpConnect } from "@/components/skills/mcp-connect";
import { SkillBrowser } from "@/components/skills/skill-browser";
import { CopyButton } from "@/components/ui/copy-button";
import { MicroLabel } from "@/components/ui/micro-label";
import { DOMAINS, SKILLS, skillMeta } from "@/core/skills";

export const metadata: Metadata = {
  title: "Skill library — OneCLIQ",
  description: `${SKILLS.length} Agent Skills for developers in ${DOMAINS.length} domains. Add them to Claude Code, Codex, Cursor, Gemini CLI, Copilot or OpenCode with one command, or over MCP.`,
};

const meta = SKILLS.map(skillMeta);

export default function SkillsPage() {
  return (
    <>
      <SiteNav />
      <main id="main" className="relative isolate flex-1 overflow-hidden bg-night pb-24 pt-28 text-night-ink sm:pt-36">
        <div aria-hidden className="bg-dots-night absolute inset-0 -z-10 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_60%)]" />
        <div
          aria-hidden
          className="absolute left-1/2 top-0 -z-10 aspect-square w-[min(1100px,160vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--ember)_70%,transparent),color-mix(in_oklab,var(--dusk)_50%,transparent)_50%,transparent)] opacity-60 blur-2xl"
        />
        <Noise preset="film" opacity={0.3} className="-z-10" />
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <MicroLabel className="rounded-full border border-night-rule px-3 py-1 text-night-muted">
              {SKILLS.length} skills · {DOMAINS.length} domains · MIT
            </MicroLabel>
            <h1 className="mt-6 text-balance font-serif text-[clamp(48px,7vw,92px)] font-normal leading-[0.95] tracking-[-0.02em]">
              Skills for <em>every</em> coding agent.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-night-ink/75">
              Expert workflows written as Agent Skills. Pick your agent, copy one line, and it knows how to do the job properly.
            </p>
            <div className="mx-auto mt-8 flex max-w-md items-center gap-3 rounded-full border border-night-rule bg-night-raised/80 py-1.5 pl-5 pr-1.5 font-mono text-[13px] backdrop-blur">
              <span className="text-ember">$</span>
              <code className="flex-1 text-left">npx onecliq skills</code>
              <CopyButton text="npx onecliq skills" />
            </div>
          </div>
          <div className="mt-16">
            <SkillBrowser skills={meta} />
          </div>
          <div className="mx-auto mt-20 max-w-2xl">
            <h2 className="text-center font-serif text-[clamp(30px,3.4vw,44px)] leading-tight">
              Connect over <em>MCP</em>
            </h2>
            <p className="mx-auto mb-6 mt-3 max-w-md text-center text-[14px] text-night-muted">
              Your agent can search, read and install skills itself.
            </p>
            <McpConnect />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
