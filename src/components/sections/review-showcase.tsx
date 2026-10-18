"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ChevronDown, Cpu, GitPullRequest, KeyRound, Scale, Sparkles } from "lucide-react";
import SoftPatterns from "@/components/designpass/SoftPatterns";
import { CopyButton } from "@/components/ui/copy-button";
import { MicroLabel } from "@/components/ui/micro-label";
import { PillButton } from "@/components/ui/pill-button";
import { Reveal } from "@/components/ui/reveal";
import { Spotlight } from "@/components/ui/spotlight";
import { SEVERITY_LABELS, type Severity } from "@/core/review/types";
import { cn } from "@/lib/cn";

const SEVERITY_STYLE: Record<Severity, string> = {
  "must-fix": "border-clay/30 bg-clay/[0.1] text-clay",
  high: "border-clay/25 bg-clay/[0.06] text-clay",
  medium: "border-ochre/25 bg-ochre/[0.08] text-ochre",
  low: "border-rule-strong bg-paper-sunk text-ink-muted",
  nit: "border-rule bg-paper text-ink-subtle",
};

// A real-shaped review: the same fields /api/review returns.
const FINDINGS: Array<{ severity: Severity; file: string; title: string; scenario: string; fix: string }> = [
  {
    severity: "must-fix",
    file: "src/upload/retry.ts:41",
    title: "Retries re-send a request that already succeeded",
    scenario: "Server returns 200 but the socket closes before the body is read → the catch block retries → the file is uploaded twice.",
    fix: "Only retry on network errors before a response, or on 429/5xx. Send an Idempotency-Key header.",
  },
  {
    severity: "high",
    file: "src/upload/retry.ts:58",
    title: "Backoff has no ceiling",
    scenario: "attempt = 12 → delay = 2^12 s ≈ 68 minutes; the request handler times out long before.",
    fix: "Cap the delay at 30 s and add ±20% jitter.",
  },
  {
    severity: "medium",
    file: "src/upload/queue.ts:17",
    title: "Abort signal isn't passed to the retry loop",
    scenario: "User cancels the upload → retries keep firing in the background.",
    fix: "Thread signal into retry() and check signal.aborted before each attempt.",
  },
  {
    severity: "nit",
    file: "src/upload/retry.ts:9",
    title: "Magic number 5 for max attempts",
    scenario: "Hard to tune per caller.",
    fix: "Export MAX_ATTEMPTS or accept it as an option.",
  },
];

const FIX_PROMPT = `Fix these issues in order. Don't change unrelated code.
1. [must fix] src/upload/retry.ts:41 — only retry before a response or on 429/5xx; add an Idempotency-Key header.
2. [high] src/upload/retry.ts:58 — cap backoff at 30 s with ±20% jitter.
3. [medium] src/upload/queue.ts:17 — pass the AbortSignal into retry() and stop when aborted.
Then run the tests.`;

const FILTERS: Array<Severity | "all"> = ["all", "must-fix", "high", "medium", "nit"];

const POINTS = [
  { Icon: Cpu, title: "Gemma 4, open weights", text: "gemma-4-31b-it reviews; the 26B mixture-of-experts model takes over when it's busy." },
  { Icon: Scale, title: "A verdict you can trust", text: "Merge calls are computed from the findings in code, so the same issues always give the same answer." },
  { Icon: KeyRound, title: "Built for free-tier keys", text: "Rotates keys, rests rate-limited ones, trims huge diffs and marks what it skipped." },
];

export function ReviewShowcase() {
  const [filter, setFilter] = useState<Severity | "all">("all");
  const [open, setOpen] = useState<number | null>(0);
  const [tab, setTab] = useState<"findings" | "prompt">("findings");
  const shown = FINDINGS.map((f, i) => ({ ...f, i })).filter((f) => filter === "all" || f.severity === filter);

  return (
    <section id="sample" aria-labelledby="review-heading" className="relative isolate scroll-mt-20 overflow-hidden border-t border-rule bg-paper py-24 sm:py-28">
      <SoftPatterns
        pattern="dots"
        backgroundColor="var(--paper)"
        color="var(--ink)"
        spacing={24}
        weight={1}
        patternOpacity={0.08}
        washOpacity={0}
        className="absolute! inset-0 -z-10 [mask-image:radial-gradient(70%_60%_at_70%_50%,black,transparent)]"
      />
      <div className="mx-auto grid max-w-6xl gap-14 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16">
        <Reveal>
          <MicroLabel className="inline-flex items-center gap-2 rounded-full border border-rule bg-paper-raised px-3 py-1.5 text-ink-subtle">
            <Sparkles aria-hidden className="size-3 text-ember" /> Sample review · Gemma 4
          </MicroLabel>
          <h2 id="review-heading" className="mt-7 max-w-lg text-balance font-serif text-[clamp(44px,5vw,68px)] font-normal leading-[0.98] tracking-[-0.025em]">
            A pull request review that <em>says</em> what to do next.
          </h2>
          <p className="mt-6 max-w-md text-[16px] leading-[1.75] text-ink-muted">
            Paste a PR, a branch or a compare link. You get findings ranked by risk, each with a failure scenario and a fix,
            a merge verdict, and one prompt to hand any coding agent.
          </p>
          <ul className="mt-9 space-y-5">
            {POINTS.map(({ Icon, title, text }, i) => (
              <Reveal as="li" key={title} delay={120 + i * 80} className="group flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-rule bg-paper-raised text-ink transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  <Icon aria-hidden className="size-[18px]" />
                </span>
                <div>
                  <h3 className="text-[14px] font-medium text-ink">{title}</h3>
                  <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-ink-muted">{text}</p>
                </div>
              </Reveal>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <PillButton href="#reviewer" icon={<GitPullRequest aria-hidden className="size-4" />} className="transition-transform active:scale-95">
              Try it on your PR
            </PillButton>
            <code className="rounded-full border border-rule bg-paper-raised px-4 py-2.5 font-mono text-[12.5px] text-ink-muted">
              oqgit review 42 --strict
            </code>
          </div>
        </Reveal>

        <Reveal delay={150} className="min-w-0">
          <Spotlight className="overflow-hidden rounded-[28px] border border-rule bg-paper-raised shadow-card">
            {/* PR header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-4">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-subtle">acme/uploader · #42</p>
                <p className="mt-0.5 truncate text-[15px] font-medium">Add retry to failed uploads</p>
              </div>
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.5 }}
                className="inline-flex items-center gap-1.5 rounded-full border border-clay/30 bg-clay/[0.1] px-3 py-1 text-[12.5px] font-medium text-clay"
              >
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-clay/60" />
                  <span className="relative inline-flex size-2 rounded-full bg-clay" />
                </span>
                Not safe to merge
              </motion.span>
            </div>

            {/* Tabs */}
            <div role="tablist" aria-label="Review output" className="flex gap-1 border-b border-rule px-3 pt-2">
              {(["findings", "prompt"] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  type="button"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={cn("relative px-3 pb-2.5 pt-1.5 text-[13px] transition-colors", tab === t ? "text-ink" : "text-ink-subtle hover:text-ink")}
                >
                  {t === "findings" ? `Findings · ${FINDINGS.length}` : "Fix prompt"}
                  {tab === t && <motion.span layoutId="review-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ember" />}
                </button>
              ))}
            </div>

            <div className="min-h-[360px] p-4 sm:p-5">
              <AnimatePresence mode="wait" initial={false}>
                {tab === "findings" ? (
                  <motion.div key="f" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by severity">
                      {FILTERS.map((f) => (
                        <button
                          key={f}
                          type="button"
                          aria-pressed={filter === f}
                          onClick={() => setFilter(f)}
                          className={cn(
                            "relative rounded-full px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] transition-colors",
                            filter === f ? "text-paper" : "text-ink-subtle hover:text-ink",
                          )}
                        >
                          {filter === f && <motion.span layoutId="sev-pill" className="absolute inset-0 -z-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
                          <span className="relative">{f === "all" ? "All" : SEVERITY_LABELS[f]}</span>
                        </button>
                      ))}
                    </div>
                    <ul className="mt-4 space-y-2">
                      <AnimatePresence initial={false}>
                        {shown.map((f) => (
                          <motion.li
                            key={f.i}
                            layout
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden rounded-[16px] border border-rule bg-paper transition-colors hover:border-rule-strong"
                          >
                            <button
                              type="button"
                              aria-expanded={open === f.i}
                              onClick={() => setOpen(open === f.i ? null : f.i)}
                              className="flex w-full items-start gap-3 px-4 py-3 text-left"
                            >
                              <span className={cn("mt-0.5 shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]", SEVERITY_STYLE[f.severity])}>
                                {SEVERITY_LABELS[f.severity]}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-[14px] font-medium leading-snug">{f.title}</span>
                                <span className="mt-0.5 block font-mono text-[11.5px] text-ink-subtle">{f.file}</span>
                              </span>
                              <ChevronDown aria-hidden className={cn("mt-1 size-4 shrink-0 text-ink-subtle transition-transform duration-200", open === f.i && "rotate-180")} />
                            </button>
                            <AnimatePresence initial={false}>
                              {open === f.i && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                                >
                                  <dl className="grid gap-2 border-t border-rule px-4 py-3 text-[13px] leading-relaxed">
                                    <div>
                                      <dt className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-subtle">Fails when</dt>
                                      <dd className="text-ink-muted">{f.scenario}</dd>
                                    </div>
                                    <div>
                                      <dt className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-subtle">Fix</dt>
                                      <dd className="text-ink">{f.fix}</dd>
                                    </div>
                                  </dl>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  </motion.div>
                ) : (
                  <motion.div key="p" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                    <div className="relative rounded-[18px] bg-night p-4 pr-14 text-night-ink">
                      <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-[1.7]">{FIX_PROMPT}</pre>
                      <CopyButton text={FIX_PROMPT} compact label="Copy fix prompt" className="absolute right-3 top-3" />
                    </div>
                    <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-ink-subtle">
                      Paste into Claude Code, Codex, Cursor or Gemini CLI <ArrowRight aria-hidden className="size-3" />
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Spotlight>
        </Reveal>
      </div>
    </section>
  );
}
