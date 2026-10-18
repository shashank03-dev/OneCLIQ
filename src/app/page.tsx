import { Faq } from "@/components/sections/faq";
import { Flow } from "@/components/sections/flow";
import { Hero } from "@/components/sections/hero";
import { Proof } from "@/components/sections/proof";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteNav } from "@/components/sections/site-nav";
import { Tools } from "@/components/sections/tools";
import { NextStep } from "@/components/ui/page-chrome";
import { ScrollProgress } from "@/components/ui/scroll-progress";

/** Short landing: try it, see the three tools, learn the steps, get answers, then where to go next. */
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
        <Proof />
        <Tools />
        <Flow />
        <Faq />
        <NextStep page="home" className="pb-24" />
      </main>
      <SiteFooter />
    </>
  );
}
