import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import Noise from "@/components/designpass/Noise";
import { GITHUB_URL, PAGES, nextPage, pageById, type PageId } from "@/lib/site";
import { cn } from "@/lib/cn";

/** "Home › Download": shows where you are and gives a one-click way back. */
export function Breadcrumb({ page, tone = "paper" }: { page: PageId; tone?: "paper" | "night" }) {
  const night = tone === "night";
  return (
    <nav aria-label="Breadcrumb">
      <ol className={cn("flex items-center gap-1.5 text-[13px]", night ? "text-night-muted" : "text-ink-subtle")}>
        <li>
          <Link href="/" className={cn("transition-colors", night ? "hover:text-night-ink" : "hover:text-ink")}>
            Home
          </Link>
        </li>
        <li aria-hidden>
          <ChevronRight className="size-3.5" />
        </li>
        <li aria-current="page" className={night ? "text-night-ink" : "text-ink"}>
          {pageById(page).title}
        </li>
      </ol>
    </nav>
  );
}

/** Dots for the reading order, with the current page lit. */
function FlowDots({ page }: { page: PageId | "home" }) {
  const at = PAGES.findIndex((p) => p.id === page);
  return (
    <ol className="flex items-center gap-1.5" aria-label={`Page ${at + 1} of ${PAGES.length}`}>
      {PAGES.map((p, i) => (
        <li key={p.id}>
          <Link
            href={p.href}
            aria-label={p.title}
            aria-current={i === at ? "page" : undefined}
            className={cn(
              "block h-1.5 rounded-full transition-all",
              i === at ? "w-6 bg-ember" : i < at ? "w-1.5 bg-night-ink/70 hover:bg-night-ink" : "w-1.5 bg-night-ink/25 hover:bg-night-ink/60",
            )}
          />
        </li>
      ))}
    </ol>
  );
}

/**
 * The night banner at the bottom of every page (after Steel's closing CTA). It names the next
 * page in the tour so nobody hits a dead end; the last page points home and to GitHub.
 */
export function NextStep({ page, className }: { page: PageId | "home"; className?: string }) {
  const next = page === "home" ? PAGES[0] : nextPage(page);
  const at = PAGES.findIndex((p) => p.id === page);
  return (
    <section aria-labelledby="next-step-heading" className={cn("mx-auto max-w-6xl px-5 sm:px-8", className)}>
      <div className="relative isolate overflow-hidden rounded-[32px] bg-night px-6 py-10 text-night-ink sm:px-12 sm:py-14">
        <div aria-hidden className="bg-dots-night absolute inset-0 -z-10 opacity-40 [mask-image:linear-gradient(to_left,black,transparent_70%)]" />
        <div
          aria-hidden
          className="absolute -right-24 -top-32 -z-10 aspect-square w-[520px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--ember)_70%,transparent),color-mix(in_oklab,var(--dusk)_45%,transparent)_55%,transparent)] opacity-70 blur-2xl"
        />
        <Noise preset="film" opacity={0.35} className="-z-10" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-night-muted">
            {page === "home" ? "New here? Take the tour" : next ? `Next · ${at + 2} of ${PAGES.length}` : "You've seen it all"}
          </p>
          <FlowDots page={page} />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <h2 id="next-step-heading" className="text-balance font-serif text-[clamp(34px,4.4vw,56px)] leading-[1] tracking-[-0.02em]">
              {page === "home" ? <>Not sure where to <em>start</em>?</> : next ? next.title : "That’s the whole tour."}
            </h2>
            <p className="mt-4 max-w-lg text-[15.5px] leading-relaxed text-night-ink/75">
              {page === "home"
                ? "Take the two-minute tour. It shows which tool fits what you want to do, and how to use it step by step."
                : next
                  ? next.blurb
                  : "Everything is free and open source. Star the repo, report a bug, or write a skill of your own."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            {next ? (
              <Link
                href={next.href}
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-night-ink px-6 text-[14.5px] font-medium text-night transition-colors hover:bg-white"
              >
                {page === "home" ? "Start the tour" : `Continue to ${next.label}`}
                <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <a
                href={GITHUB_URL}
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-night-ink px-6 text-[14.5px] font-medium text-night transition-colors hover:bg-white"
              >
                Open on GitHub
                <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            )}
            <Link
              href={page === "home" ? "/download" : next && page !== "start" ? "/start" : "/"}
              className="inline-flex h-12 items-center rounded-full border border-night-rule px-6 text-[14.5px] text-night-ink transition-colors hover:bg-white/[0.06]"
            >
              {page === "home" ? "Skip to Download" : next && page !== "start" ? "See all steps" : "Back to home"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
