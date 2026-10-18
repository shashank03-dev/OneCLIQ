"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import Noise from "@/components/designpass/Noise";
import { MicroLabel } from "@/components/ui/micro-label";
import { cn } from "@/lib/cn";

type Step = { title: string; text: string; screen: { label: string; main: string; chip: string } };
type Track = { id: string; label: string; href: string; cta: string; art: string | null; steps: Step[] };

// Plain directions for each tool: what to do, in order, and what you'll see.
const TRACKS: Track[] = [
  {
    id: "download",
    label: "Download",
    href: "/download",
    cta: "Find a download",
    art: "/art/hero-landscape.webp",
    steps: [
      {
        title: "Copy a GitHub link",
        text: "Any public repository or release page, like github.com/sharkdp/bat. Paste it into the box.",
        screen: { label: "Repository", main: "github.com/sharkdp/bat", chip: "Link pasted" },
      },
      {
        title: "Check your computer",
        text: "We fill in your system and chip. Change them if you’re downloading for a different machine.",
        screen: { label: "Your system", main: "macOS · Apple Silicon (arm64)", chip: "Detected" },
      },
      {
        title: "Download and verify",
        text: "Press Download. The file comes straight from GitHub. Open the trust report to see who built it.",
        screen: { label: "Recommended", main: "bat-v0.25.0-aarch64-apple-darwin.tar.gz", chip: "Checked" },
      },
    ],
  },
  {
    id: "review",
    label: "Review a PR",
    href: "/review",
    cta: "Review a pull request",
    art: null,
    steps: [
      {
        title: "Paste a pull request",
        text: "A PR, a branch or a compare link from a public repository. Drafts are fine.",
        screen: { label: "Pull request", main: "github.com/acme/uploader/pull/42", chip: "Public repo" },
      },
      {
        title: "Say what it should do",
        text: "Optional. One line like “retry failed uploads” lets Gemma 4 check the change does that.",
        screen: { label: "Goal", main: "Retry failed uploads", chip: "Optional" },
      },
      {
        title: "Read the verdict, copy the fix",
        text: "Issues are ranked by risk. Copy one prompt into your coding agent and it fixes them in order.",
        screen: { label: "Verdict", main: "Not safe to merge · 4 findings", chip: "Fix prompt ready" },
      },
    ],
  },
  {
    id: "skills",
    label: "Agent skills",
    href: "/skills",
    cta: "Browse skills",
    art: "/art/footer-meadow.webp",
    steps: [
      {
        title: "Find a skill",
        text: "Search by task, like “flaky tests”, or browse by domain: debugging, security, testing and more.",
        screen: { label: "Search", main: "flaky tests", chip: "3 matches" },
      },
      {
        title: "Copy one line",
        text: "Pick your agent and run the command we show. It saves a SKILL.md where your agent looks.",
        screen: { label: "Terminal", main: "npx onecliq skills add flaky-test-triage", chip: "Installed" },
      },
      {
        title: "Just ask your agent",
        text: "No prompt pasting. Your agent loads the skill on its own when a task matches.",
        screen: { label: "You ask", main: "“Why does this test only fail on CI?”", chip: "Skill loaded" },
      },
    ],
  },
];

const STEP_MS = 5200;

/**
 * "How it works" as tabs (after Natural's feature switcher): pick a tool, then three numbered
 * directions. The steps advance on their own until you hover or pick one.
 */
export function Flow() {
  const reduce = useReducedMotion();
  const [track, setTrack] = useState(0);
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const t = TRACKS[track];
  const s = t.steps[step];
  const auto = !reduce && !paused;

  useEffect(() => {
    if (!auto) return;
    const id = setTimeout(() => setStep((n) => (n + 1) % t.steps.length), STEP_MS);
    return () => clearTimeout(id);
  }, [auto, step, t.steps.length]);

  return (
    <section id="how" aria-labelledby="how-heading" className="scroll-mt-24 border-t border-rule bg-paper py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <MicroLabel className="text-ink-subtle">How it works</MicroLabel>
            <h2 id="how-heading" className="mt-4 max-w-xl text-balance font-serif text-[clamp(38px,5vw,64px)] font-normal leading-[1] tracking-[-0.02em]">
              Three steps, <em>whichever</em> tool you pick.
            </h2>
          </div>
          <div role="tablist" aria-label="Choose a tool" className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-rule bg-paper-raised p-1">
            {TRACKS.map((x, i) => (
              <button
                key={x.id}
                type="button"
                role="tab"
                id={`flow-tab-${x.id}`}
                aria-selected={i === track}
                aria-controls="flow-panel"
                onClick={() => {
                  setTrack(i);
                  setStep(0);
                }}
                className={cn("relative shrink-0 rounded-full px-4 py-2 text-[13.5px] transition-colors", i === track ? "text-paper" : "text-ink-muted hover:text-ink")}
              >
                {i === track && <motion.span layoutId="flow-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                <span className="relative">{x.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div
          id="flow-panel"
          role="tabpanel"
          aria-labelledby={`flow-tab-${t.id}`}
          className="mt-10 grid gap-4 lg:grid-cols-[1fr_1.35fr]"
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
        >
          <ol className="flex flex-col gap-2">
            {t.steps.map((x, i) => (
              <li key={x.title}>
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  aria-current={i === step ? "step" : undefined}
                  className={cn(
                    "relative w-full overflow-hidden rounded-[22px] border p-5 text-left transition-colors",
                    i === step ? "border-rule-strong bg-paper-raised shadow-tile" : "border-transparent hover:bg-paper-raised/60",
                  )}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-full font-mono text-[12px] transition-colors",
                        i === step ? "bg-ink text-paper" : i < step ? "bg-moss/15 text-moss" : "bg-paper-sunk text-ink-subtle",
                      )}
                    >
                      {i < step ? <Check aria-hidden className="size-4" /> : i + 1}
                    </span>
                    <span>
                      <span className={cn("block text-[16px] font-medium", i === step ? "text-ink" : "text-ink-muted")}>{x.title}</span>
                      <span className={cn("mt-1 block text-[14px] leading-relaxed text-ink-muted", i !== step && "hidden sm:block sm:opacity-70")}>{x.text}</span>
                    </span>
                  </div>
                  {i === step && auto && (
                    <motion.span
                      key={`${track}-${step}`}
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-ember"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: STEP_MS / 1000, ease: "linear" }}
                    />
                  )}
                </button>
              </li>
            ))}
            <li className="mt-2 px-1">
              <Link
                href={t.href}
                className="group inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-medium text-paper transition-colors hover:bg-ink/90"
              >
                {t.cta}
                <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          </ol>

          <div className="relative isolate min-h-[320px] overflow-hidden rounded-[28px] bg-paper-sunk sm:min-h-[400px]">
            <AnimatePresence initial={false}>
              <motion.div
                key={t.id}
                className="absolute inset-0 -z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                {t.art ? (
                  <Image src={t.art} alt="" fill sizes="(min-width: 1024px) 640px, 100vw" className="object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(70%_80%_at_70%_100%,color-mix(in_oklab,var(--ember)_80%,transparent),color-mix(in_oklab,var(--dusk)_60%,transparent)_45%,transparent_75%),var(--night)]">
                    <div className="bg-dots-night absolute inset-0 opacity-50" />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
            <Noise preset="fine" opacity={0.25} className="-z-10" />

            <div className="flex h-full min-h-[inherit] items-center justify-center p-6">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${t.id}-${step}`}
                  initial={{ opacity: 0, y: 12, scale: 0.98, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                  transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
                  className="w-full max-w-sm rounded-[22px] border border-white/60 bg-paper-raised/90 p-5 shadow-card backdrop-blur-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <MicroLabel className="text-ink-subtle">{s.screen.label}</MicroLabel>
                    <span className="inline-flex items-center gap-1 rounded-full border border-moss/25 bg-moss/10 px-2 py-0.5 text-[11px] font-medium text-moss">
                      <Check aria-hidden className="size-3" /> {s.screen.chip}
                    </span>
                  </div>
                  <p className="mt-3 break-words font-mono text-[14px] leading-snug text-ink">{s.screen.main}</p>
                  <div className="mt-5 flex items-center gap-1.5">
                    {t.steps.map((_, i) => (
                      <span key={i} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-ink" : "bg-paper-sunk")} />
                    ))}
                  </div>
                  <p className="mt-2 text-[12px] text-ink-subtle">
                    Step {step + 1} of {t.steps.length}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
