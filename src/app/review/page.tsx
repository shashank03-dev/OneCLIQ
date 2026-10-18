import type { Metadata } from "next";
import { GitPullRequest, ListChecks, ShieldAlert, Sparkles } from "lucide-react";
import SoftPatterns from "@/components/designpass/SoftPatterns";
import { PrReviewer } from "@/components/pr-reviewer";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteNav } from "@/components/sections/site-nav";
import { MicroLabel } from "@/components/ui/micro-label";

export const metadata: Metadata = {
  title: "Review a pull request — OneCLIQ",
  description: "Gemma 4 reviews a GitHub pull request or branch, ranks issues by risk, tells you if it's safe to merge, and writes one prompt to fix everything.",
};

const POINTS = [
  {
    Icon: ShieldAlert,
    title: "Ranked by risk",
    description: "Every issue is tagged must fix, high, medium, low or nit, with the file, line and a concrete fix.",
  },
  {
    Icon: ListChecks,
    title: "A clear merge call",
    description: "Safe to merge and ready to merge are decided from the findings, so the same issues give the same answer.",
  },
  {
    Icon: Sparkles,
    title: "One prompt to fix it all",
    description: "Copy a single prompt into any AI coding assistant to work through every finding in order.",
  },
];

export default function ReviewPage() {
  return (
    <>
      <SiteNav />
      <main id="main" className="relative isolate flex-1 overflow-hidden bg-paper pb-20 pt-6 sm:pb-28 sm:pt-10">
        <SoftPatterns
          pattern="dots"
          backgroundColor="var(--paper)"
          color="var(--ink)"
          spacing={24}
          weight={1}
          patternOpacity={0.1}
          washOpacity={0}
          className="absolute! inset-0 -z-10"
        />
        <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <MicroLabel className="inline-flex items-center gap-2 rounded-full border border-rule bg-paper-raised px-3 py-1.5 text-ink-subtle">
              <GitPullRequest aria-hidden className="size-3" /> Code review · Gemma 4
            </MicroLabel>
            <h1 className="mt-7 max-w-lg text-balance font-serif text-[clamp(44px,5vw,68px)] font-normal leading-[0.98] tracking-[-0.025em]">
              Is this PR <em>ready</em> to merge?
            </h1>
            <p className="mt-6 max-w-md text-[16px] leading-[1.75] text-ink-muted">
              Paste a pull request, even a draft, or a branch. Tell us what it should achieve, and get a ranked list of
              what’s wrong plus one prompt that fixes it.
            </p>
            <ul className="mt-10 space-y-5">
              {POINTS.map(({ Icon, title, description }) => (
                <li key={title} className="flex items-start gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-rule bg-paper-raised text-ink">
                    <Icon aria-hidden className="size-[18px]" />
                  </span>
                  <div>
                    <h2 className="text-[14px] font-medium text-ink">{title}</h2>
                    <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-ink-muted">{description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 lg:pt-4">
            <PrReviewer />
            <p className="mt-4 px-2 font-mono text-[11px] uppercase tracking-[0.13em] text-ink-subtle">
              In a terminal, for private repos and local branches: oqgit review (or oqgit review 12 for a PR)
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
