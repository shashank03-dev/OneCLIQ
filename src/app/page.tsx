import { Cli } from "@/components/sections/cli";
import { Closing } from "@/components/sections/closing";
import { Hero } from "@/components/sections/hero";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Pipeline } from "@/components/sections/pipeline";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteNav } from "@/components/sections/site-nav";
import { Verify } from "@/components/sections/verify";
import { ReviewShowcase } from "@/components/sections/review-showcase";
import { Skills } from "@/components/sections/skills";
import { ScrollProgress } from "@/components/ui/scroll-progress";

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Skip to content
      </a>
      <ScrollProgress />
      <SiteNav />
      <main id="main" className="flex-1">
        <Hero />
        <Pipeline />
        <HowItWorks />
        <ReviewShowcase />
        <Skills />
        <Verify />
        <Cli />
        <Closing />
      </main>
      <SiteFooter />
    </>
  );
}
