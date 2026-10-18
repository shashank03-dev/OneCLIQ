import { ArrowRight, BadgeCheck, BookOpenCheck, Sparkles } from "lucide-react";
import BlurText from "@/components/designpass/BlurText";
import SoftPatterns from "@/components/designpass/SoftPatterns";
import { Resolver } from "@/components/resolver";
import { HeroTiles } from "@/components/hero-tiles";
import { Landscape } from "@/components/ui/landscape";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pb-[clamp(220px,32vw,420px)]">
      <SoftPatterns
        pattern="dots"
        backgroundColor="var(--paper)"
        color="var(--ink)"
        spacing={24}
        weight={1.1}
        patternOpacity={0.09}
        washOpacity={0}
        className="absolute! inset-0 -z-20 [mask-image:linear-gradient(to_bottom,black_40%,transparent_85%)]"
      />

      {/* The soft “sky dome” behind the headline. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-[90px] -z-10 aspect-square w-[min(1100px,150vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--sky)_70%,white)_0%,color-mix(in_oklab,var(--sky)_35%,transparent)_60%,transparent_100%)]"
      />

      <div className="relative mx-auto max-w-5xl px-5 pt-20 sm:px-8 sm:pt-24">
        <HeroTiles />

        <div className="relative flex flex-col items-center pt-24 text-center sm:pt-28">
          <a
            href="/skills"
            className="group inline-flex items-center gap-2 rounded-full border border-rule bg-paper-raised/80 py-1 pl-1 pr-3 text-[13px] text-ink-muted shadow-tile backdrop-blur transition-[color,transform] hover:-translate-y-0.5 hover:text-ink"
          >
            <span className="rounded-full bg-ink px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-paper">
              New
            </span>
            <span className="text-shimmer">21 agent skills for your coding agent</span>
            <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>

          <h1 className="mt-6 max-w-4xl text-balance font-serif text-[clamp(46px,7.4vw,96px)] font-normal leading-[0.98] tracking-[-0.02em]">
            <span className="sr-only">The right download from any GitHub release</span>
            <span aria-hidden>
              <BlurText text="The" stagger={70} />{" "}
              <em className="italic">
                <BlurText text="right" delay={70} />
              </em>{" "}
              <BlurText text="download" delay={140} />
              <br className="hidden sm:block" />{" "}
              <BlurText text="from any GitHub release" delay={210} stagger={70} />
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-pretty text-[17px] leading-relaxed text-ink-muted">
            Paste a repository or release link. We find the latest stable release and the file built for your
            operating system and CPU, then hand you the link straight from GitHub.
          </p>
        </div>

        <div id="find" className="relative mx-auto mt-10 max-w-2xl scroll-mt-24">
          <Resolver />
        </div>

        <ul className="relative mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-ink-muted">
          {[
            { Icon: BadgeCheck, text: "Provenance + malware check" },
            { Icon: Sparkles, text: "PR review with Gemma 4" },
            { Icon: BookOpenCheck, text: "Agent skills over MCP" },
          ].map(({ Icon, text }) => (
            <li key={text} className="inline-flex items-center gap-1.5">
              <Icon aria-hidden className="size-3.5 text-ember" />
              {text}
            </li>
          ))}
        </ul>
      </div>

      <Landscape
        variant="hero"
        priority
        className="top-auto h-[clamp(260px,36vw,520px)] [mask-image:linear-gradient(to_bottom,transparent,black_30%)]"
      />
    </section>
  );
}
