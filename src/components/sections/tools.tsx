import Link from "next/link";
import { ArrowRight, Check, FileText } from "lucide-react";
import Noise from "@/components/designpass/Noise";
import { MicroLabel } from "@/components/ui/micro-label";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/cn";

/* Small, static previews of each tool's real UI (after the bento grids on vibrant.design). */

function DownloadPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md rounded-[20px] border border-rule bg-paper-raised p-4 shadow-tile transition-transform duration-500 group-hover:-translate-y-1">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-subtle">sharkdp/bat · v0.25.0</p>
          <p className="mt-1 truncate font-mono text-[12.5px] text-ink">bat-v0.25.0-aarch64-apple-darwin.tar.gz</p>
        </div>
        <span className="shrink-0 rounded-full border border-moss/25 bg-moss/10 px-2.5 py-0.5 text-[11.5px] font-medium text-moss">Recommended</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {["Matches macOS · arm64", "SHA-256 from GitHub", "No known malware"].map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-paper-sunk px-2 py-0.5 text-[11px] text-ink-muted">
            <Check aria-hidden className="size-3 text-moss" />
            {t}
          </span>
        ))}
      </div>
      <div className="mt-3 flex h-9 items-center justify-center rounded-full bg-ink text-[12.5px] font-medium text-paper">Download · 2.9 MB</div>
    </div>
  );
}

function ReviewPreview() {
  const rows = [
    { sev: "Must fix", cls: "border-clay/30 bg-clay/10 text-clay", text: "Retries re-send a finished upload" },
    { sev: "High", cls: "border-clay/25 bg-clay/[0.06] text-clay", text: "Backoff has no ceiling" },
    { sev: "Medium", cls: "border-ochre/25 bg-ochre/10 text-ochre", text: "Abort signal is ignored" },
  ];
  return (
    <div className="w-full rounded-[20px] border border-rule bg-paper-raised p-3.5 shadow-tile transition-transform duration-500 group-hover:-translate-y-1">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-clay/30 bg-clay/10 px-2.5 py-0.5 text-[11.5px] font-medium text-clay">
        <span className="size-1.5 rounded-full bg-clay" /> Not safe to merge
      </span>
      <ul className="mt-3 space-y-1.5">
        {rows.map((r) => (
          <li key={r.text} className="flex items-center gap-2 rounded-xl border border-rule bg-paper px-2.5 py-1.5">
            <span className={cn("shrink-0 rounded-full border px-1.5 font-mono text-[9px] uppercase tracking-[0.08em]", r.cls)}>{r.sev}</span>
            <span className="truncate text-[12px] text-ink">{r.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SkillsPreview() {
  const chips = ["systematic-debugging", "secure-code-review", "safe-database-migrations", "playwright-e2e", "llm-evals"];
  return (
    <div className="relative w-full">
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c, i) => (
          <span
            key={c}
            className={cn(
              "rounded-full border px-2.5 py-1 font-mono text-[11px] transition-transform duration-500",
              i === 1 ? "border-ink bg-ink text-paper group-hover:-translate-y-0.5" : "border-rule bg-paper-raised text-ink-muted",
            )}
          >
            {c}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2.5 rounded-[16px] border border-rule bg-paper-raised p-2.5 shadow-tile">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-paper-sunk">
          <FileText aria-hidden className="size-4 text-ink" />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-mono text-[11.5px] text-ink">.claude/skills/secure-code-review/SKILL.md</span>
          <span className="block text-[11px] text-moss">Added · your agent loads it when it fits</span>
        </span>
      </div>
    </div>
  );
}

function CliPreview() {
  return (
    <div className="w-full rounded-[18px] border border-night-rule bg-night/80 p-4 font-mono text-[12px] leading-[1.75] text-night-ink shadow-2xl shadow-black/30 backdrop-blur transition-transform duration-500 group-hover:-translate-y-1">
      <p>
        <span className="text-ember">$ </span>oqgit sharkdp/bat
      </p>
      <p className="text-leaf">  ✔ Recommended · bat-v0.25.0-aarch64-apple-darwin.tar.gz</p>
      <p className="text-leaf">  ✔ SHA-256 matches GitHub&rsquo;s digest</p>
      <p className="mt-1">
        <span className="text-ember">$ </span>oqgit review 42
      </p>
      <p className="text-night-muted">  ◇ Gemma 4 · 4 findings · Not safe to merge</p>
      <p className="mt-1">
        <span className="text-ember">$ </span>oqgit skills add security
      </p>
    </div>
  );
}

const CARDS = [
  {
    id: "download",
    n: "01",
    href: "/download",
    title: "Get the right download",
    body: "Paste a GitHub link. Get the one file built for your computer, with proof it came from the project and a known-malware check.",
    cmd: "oqgit owner/repo",
    Preview: DownloadPreview,
    span: "lg:col-span-4",
  },
  {
    id: "review",
    n: "02",
    href: "/review",
    title: "Review a pull request",
    body: "Gemma 4 ranks issues by risk and says if it’s safe to merge.",
    cmd: "oqgit review 12",
    Preview: ReviewPreview,
    span: "lg:col-span-2",
  },
  {
    id: "skills",
    n: "03",
    href: "/skills",
    title: "Teach your coding agent",
    body: "Add expert playbooks to Claude Code, Codex, Cursor and more.",
    cmd: "oqgit skills add",
    Preview: SkillsPreview,
    span: "lg:col-span-2",
  },
] as const;

/** Bento overview of what OneCLIQ does; every card opens that tool's page. */
export function Tools() {
  return (
    <section id="tools" aria-labelledby="tools-heading" className="scroll-mt-24 bg-paper py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <MicroLabel className="text-ink-subtle">What you can do</MicroLabel>
          <h2 id="tools-heading" className="mt-4 text-balance font-serif text-[clamp(38px,5vw,64px)] font-normal leading-[1] tracking-[-0.02em]">
            Three tools. <em>One</em> GitHub link.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[16px] leading-relaxed text-ink-muted">
            Each one works in your browser right now. Pick the one you need, or use all three from your terminal.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-4 lg:grid-cols-6">
          {CARDS.map(({ id, n, href, title, body, cmd, Preview, span }, i) => (
            <Reveal key={id} delay={i * 80} className={cn("min-w-0", span)}>
              <Link
                href={href}
                className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-rule bg-paper-sunk/60 transition-[border-color,box-shadow] hover:border-rule-strong hover:shadow-card"
              >
                <div className="relative flex min-h-56 flex-1 items-center justify-center overflow-hidden px-6 pt-8 pb-6">
                  <div aria-hidden className="absolute inset-0 bg-[radial-gradient(var(--dot)_1px,transparent_1.2px)] [background-size:18px_18px] [mask-image:radial-gradient(60%_70%_at_50%_45%,black,transparent)]" />
                  <div className="relative w-full">
                    <Preview />
                  </div>
                </div>
                <div className="border-t border-rule bg-paper-raised px-6 py-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[17px] font-medium">
                      <span className="mr-2 font-mono text-[12px] text-ink-subtle">{n}</span>
                      {title}
                    </h3>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-rule text-ink transition-[background-color,color,transform] group-hover:translate-x-0.5 group-hover:bg-ink group-hover:text-paper">
                      <ArrowRight aria-hidden className="size-4" />
                    </span>
                  </div>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">{body}</p>
                  <p className="mt-3 font-mono text-[11.5px] text-ink-subtle">
                    Terminal: <span className="text-ink">{cmd}</span>
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}

          <Reveal delay={240} className="min-w-0 lg:col-span-4">
            <Link
              href="/cli"
              className="group relative isolate grid h-full overflow-hidden rounded-[28px] bg-night text-night-ink sm:grid-cols-[1fr_1.1fr] sm:items-center"
            >
              <div aria-hidden className="bg-dots-night absolute inset-0 -z-10 opacity-40" />
              <div
                aria-hidden
                className="absolute -bottom-40 right-0 -z-10 aspect-square w-[520px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--ember)_70%,transparent),color-mix(in_oklab,var(--dusk)_45%,transparent)_55%,transparent)] opacity-70 blur-2xl"
              />
              <Noise preset="film" opacity={0.3} className="-z-10" />
              <div className="p-7 sm:p-8">
                <MicroLabel className="text-night-muted">04 · Terminal &amp; agents</MicroLabel>
                <h3 className="mt-3 font-serif text-[clamp(28px,3vw,38px)] leading-[1.02] tracking-[-0.01em]">
                  All of it, in <em>one</em> command.
                </h3>
                <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-night-ink/75">
                  Install <code className="font-mono text-night-ink">oqgit</code> once. It downloads and verifies files, reviews your branch, and plugs into your coding agent over MCP.
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] text-lilac">
                  Install the CLI
                  <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
              <div className="min-w-0 px-7 pb-7 sm:py-8 sm:pl-0 sm:pr-8">
                <CliPreview />
              </div>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
