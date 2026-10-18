import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Noise from "@/components/designpass/Noise";
import { Landscape } from "@/components/ui/landscape";
import { Logo } from "@/components/ui/logo";
import { GITHUB_URL, NPM_URL, PAGES } from "@/lib/site";

const COLUMNS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: "Tools",
    links: PAGES.filter((p) => p.id !== "start").map((p) => ({ label: p.title, href: p.href })),
  },
  {
    title: "Get started",
    links: [
      { label: "Start here", href: "/start" },
      { label: "Install the CLI", href: "/cli#install" },
      { label: "Connect your agent", href: "/skills#mcp" },
      { label: "Questions", href: "/#faq" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "Source on GitHub", href: GITHUB_URL },
      { label: "npm package", href: NPM_URL },
      { label: "Report a bug", href: `${GITHUB_URL}/issues/new/choose` },
      { label: "MIT license", href: `${GITHUB_URL}/blob/main/LICENSE` },
    ],
  },
];

/** Link columns (after Framer and Equals) and a giant wordmark over a painted meadow (after micro). */
export function SiteFooter() {
  return (
    <footer className="relative border-t border-rule bg-paper">
      <div className="mx-auto max-w-6xl px-5 pt-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_2fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-ink-muted">
              One engine for three jobs: the right download from a GitHub release, a pull request review you can act on, and skills for your coding agent.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-rule bg-paper-raised px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-subtle">
              <span className="size-1.5 rounded-full bg-moss" /> Free · open source · MIT
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-subtle">{col.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => {
                    const external = l.href.startsWith("http");
                    const cls = "group inline-flex items-center gap-1 text-[14px] text-ink-muted transition-colors hover:text-ink";
                    return (
                      <li key={l.label}>
                        {external ? (
                          <a href={l.href} className={cls}>
                            {l.label}
                            <ArrowUpRight aria-hidden className="size-3 opacity-50 transition-opacity group-hover:opacity-100" />
                          </a>
                        ) : (
                          <Link href={l.href} className={cls}>
                            {l.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-rule py-5 text-[12px] leading-relaxed text-ink-subtle sm:flex-row sm:justify-between">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.12em]">© OneCLIQ · Files served by GitHub</p>
          <p className="max-w-md sm:text-right">
            “Recommended” means a file matches your system, not that it’s safe. Only install software you trust.
          </p>
        </div>
      </div>

      <div className="relative isolate h-[clamp(160px,24vw,360px)] overflow-hidden">
        <Landscape variant="footer" className="-z-10" />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_0%_0%,var(--paper)_0%,transparent_100%),radial-gradient(40%_60%_at_100%_0%,color-mix(in_oklab,var(--dusk)_35%,transparent),transparent),linear-gradient(to_bottom,var(--paper)_0%,transparent_35%)]"
        />
        <Noise preset="fine" opacity={0.3} />
        <p
          aria-hidden
          className="absolute inset-x-0 top-[2%] select-none text-center text-[clamp(96px,22vw,340px)] font-medium leading-[0.8] tracking-[-0.07em] text-ink"
        >
          onecliq
        </p>
      </div>
    </footer>
  );
}
