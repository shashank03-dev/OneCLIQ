import type { Metadata } from "next";
import { BadgeCheck, Cpu, ShieldCheck } from "lucide-react";
import SoftPatterns from "@/components/designpass/SoftPatterns";
import { Resolver } from "@/components/resolver";
import { HowItWorks } from "@/components/sections/how-it-works";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteNav } from "@/components/sections/site-nav";
import { Verify } from "@/components/sections/verify";
import { MicroLabel } from "@/components/ui/micro-label";
import { Breadcrumb, NextStep } from "@/components/ui/page-chrome";

export const metadata: Metadata = {
  title: "Get the right download — OneCLIQ",
  description:
    "Paste a GitHub repository or release link. OneCLIQ picks the file built for your operating system and CPU, checks where it came from, and looks it up for known malware.",
};

const CHECKS = [
  { Icon: Cpu, title: "Built for your machine", text: "Matched to your system and chip from the file names. Unclear names are never guessed." },
  { Icon: BadgeCheck, title: "Proof of origin", text: "Build attestations, GitHub’s SHA-256 digest, and whether the file changed after release." },
  { Icon: ShieldCheck, title: "Known-malware check", text: "The file’s fingerprint is looked up on VirusTotal. Nothing is uploaded." },
];

export default function DownloadPage() {
  return (
    <>
      <SiteNav />
      <main id="main" className="flex-1">
        <section className="relative isolate overflow-hidden pb-20 pt-28 sm:pb-24 sm:pt-32">
          <SoftPatterns
            pattern="dots"
            backgroundColor="var(--paper)"
            color="var(--ink)"
            spacing={24}
            weight={1}
            patternOpacity={0.09}
            washOpacity={0}
            className="absolute! inset-0 -z-20 [mask-image:linear-gradient(to_bottom,black_40%,transparent)]"
          />
          <div
            aria-hidden
            className="absolute left-1/2 top-10 -z-10 aspect-square w-[min(1000px,150vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--sky)_65%,white)_0%,color-mix(in_oklab,var(--sky)_30%,transparent)_60%,transparent_100%)]"
          />
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <Breadcrumb page="download" />
            <div className="mt-8 text-center">
              <MicroLabel className="text-ink-subtle">Tool 01 · Download</MicroLabel>
              <h1 className="mx-auto mt-4 max-w-3xl text-balance font-serif text-[clamp(44px,6.4vw,84px)] font-normal leading-[0.98] tracking-[-0.02em]">
                The <em>right</em> file, straight from GitHub.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-ink-muted">
                Paste a repository or release link, check your system, and press <strong className="font-medium text-ink">Find download</strong>.
                You get one file, a direct GitHub link, and a report on where it came from.
              </p>
            </div>
            <div id="find" className="mx-auto mt-10 max-w-2xl scroll-mt-24">
              <Resolver />
            </div>
            <ul className="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-3">
              {CHECKS.map(({ Icon, title, text }) => (
                <li key={title} className="rounded-[22px] border border-rule bg-paper-raised/70 p-5 backdrop-blur">
                  <Icon aria-hidden className="size-5 text-ember" />
                  <h2 className="mt-3 text-[15px] font-medium">{title}</h2>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-ink-muted">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <HowItWorks />
        <Verify />
        <NextStep page="download" className="pb-24 pt-4" />
      </main>
      <SiteFooter />
    </>
  );
}
