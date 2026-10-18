import { ArrowRight, BookOpenCheck } from "lucide-react";
import Noise from "@/components/designpass/Noise";
import { McpConnect } from "@/components/skills/mcp-connect";
import { SkillBrowser } from "@/components/skills/skill-browser";
import { MicroLabel } from "@/components/ui/micro-label";
import { Reveal } from "@/components/ui/reveal";
import { DOMAINS, SKILLS, skillMeta } from "@/core/skills";

const meta = SKILLS.map(skillMeta);

const STEPS = [
  { n: "01", title: "Find", text: "Search by task or browse by domain, here, with oqgit skills, or from your agent." },
  { n: "02", title: "Add", text: "One command drops SKILL.md where your agent looks: .claude, .cursor, .agents and more." },
  { n: "03", title: "Just ask", text: "Your agent loads the skill when the task matches. No prompt pasting." },
];

/** The skill library: Agent Skills for developers, grouped by domain, installable from the CLI or MCP. */
export function Skills() {
  return (
    <section id="skills" aria-labelledby="skills-heading" className="relative isolate scroll-mt-20 overflow-hidden bg-night py-24 text-night-ink sm:py-32">
      <div aria-hidden className="bg-dots-night absolute inset-0 -z-10 opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      <div
        aria-hidden
        className="absolute -right-[20%] -top-[10%] -z-10 aspect-square w-[min(900px,120vw)] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--dusk)_55%,transparent),transparent)] opacity-60 blur-2xl"
      />
      <div
        aria-hidden
        className="absolute -left-[15%] top-[30%] -z-10 aspect-square w-[min(700px,100vw)] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--ember)_35%,transparent),transparent)] opacity-50 blur-2xl"
      />
      <Noise preset="film" opacity={0.3} className="-z-10" />

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <Reveal>
            <MicroLabel className="inline-flex items-center gap-2 rounded-full border border-night-rule px-3 py-1.5 text-night-muted">
              <BookOpenCheck aria-hidden className="size-3 text-lilac" /> Skill library · Agent Skills standard
            </MicroLabel>
            <h2 id="skills-heading" className="mt-7 max-w-2xl text-balance font-serif text-[clamp(44px,6vw,80px)] font-normal leading-[0.96] tracking-[-0.025em]">
              Teach your coding agent <em>how</em> seniors work.
            </h2>
            <p className="mt-6 max-w-xl text-[16px] leading-[1.75] text-night-ink/75">
              {SKILLS.length} hand-written skills across {DOMAINS.length} domains: reviews, migrations, CI, security, tests, Gemma 4.
              Each is a plain <code className="font-mono text-night-ink">SKILL.md</code> that Claude Code, Codex, Cursor, Gemini CLI,
              Copilot and OpenCode load on their own.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <ol className="grid gap-px overflow-hidden rounded-[22px] border border-night-rule bg-night-rule">
              {STEPS.map((s) => (
                <li key={s.n} className="group flex items-start gap-4 bg-night-raised/90 p-4 transition-colors hover:bg-night-raised">
                  <span className="font-dots text-[22px] font-black leading-none text-lilac transition-transform duration-300 group-hover:scale-110">{s.n}</span>
                  <div>
                    <h3 className="text-[14px] font-medium">{s.title}</h3>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-night-muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>

        <Reveal delay={100} className="mt-14">
          <SkillBrowser skills={meta} />
        </Reveal>

        <div className="mt-20 grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <Reveal>
            <h3 className="font-serif text-[clamp(32px,3.6vw,48px)] leading-[1.02] tracking-[-0.015em]">
              Or let the agent <em>shop</em> for itself.
            </h3>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-night-ink/70">
              Connect <code className="font-mono text-night-ink">oqgit mcp</code> once. Then say “find a skill for flaky tests and install
              it”. Your agent calls <code className="font-mono text-lilac">search_skills</code>, reads the best match, and adds it to the project.
            </p>
            <a href="/skills" className="group mt-6 inline-flex items-center gap-2 text-[14px] text-lilac">
              Open the full library
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
            </a>
          </Reveal>
          <Reveal delay={120}>
            <McpConnect />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
