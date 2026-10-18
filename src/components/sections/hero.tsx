import Link from "next/link";
import { ArrowRight, BookOpenCheck, GitPullRequest } from "lucide-react";
import BlurText from "@/components/designpass/BlurText";
import SoftPatterns from "@/components/designpass/SoftPatterns";
import { Resolver } from "@/components/resolver";
import { HeroTiles } from "@/components/hero-tiles";
import { SKILLS } from "@/core/skills";
import { Landscape } from "@/components/ui/landscape";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pb-[clamp(170px,24vw,320px)]">
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
          <Link
            href="/skills"
            className="group inline-flex items-center gap-2 rounded-full border border-rule bg-paper-raised/80 py-1 pl-1 pr-3 text-[13px] text-ink-muted shadow-tile backdrop-blur transition-[color,transform] hover:-translate-y-0.5 hover:text-ink"
          >
            <span className="rounded-full bg-ink px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-paper">
              New
            </span>
            <span className="text-shimmer">{SKILLS.length} agent skills for your coding agent</span>
            <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>

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
            Paste a GitHub repository link below. OneCLIQ finds the latest stable release, picks the one file built
            for your computer, and checks it before you download. No sign-up, nothing to install.
          </p>
        </div>

        <div id="find" className="relative mx-auto mt-10 max-w-2xl scroll-mt-24">
          <Resolver />
        </div>

        <div className="relative mx-auto mt-7 flex max-w-2xl flex-wrap items-center justify-center gap-2 text-[13.5px]">
          <span className="mr-1 text-ink-subtle">Here for something else?</span>
          {[
            { Icon: GitPullRequest, text: "Review a pull request", href: "/review" },
            { Icon: BookOpenCheck, text: "Add skills to your coding agent", href: "/skills" },
          ].map(({ Icon, text, href }) => (
            <Link
              key={href}
              href={href}
              className="group inline-flex items-center gap-1.5 rounded-full border border-rule bg-paper-raised/80 px-3 py-1.5 text-ink-muted backdrop-blur transition-[color,border-color,transform] hover:-translate-y-0.5 hover:border-rule-strong hover:text-ink"
            >
              <Icon aria-hidden className="size-3.5 text-ember" />
              {text}
              <ArrowRight aria-hidden className="size-3 opacity-50 transition-[opacity,transform] group-hover:translate-x-0.5 group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </div>

      <Landscape
        variant="hero"
        priority
        className="top-auto h-[clamp(220px,30vw,440px)] [mask-image:linear-gradient(to_bottom,transparent,black_30%)]"
      />
    </section>
  );
}
