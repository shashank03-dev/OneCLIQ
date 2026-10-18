import { ArrowUpRight } from "lucide-react";
import Noise from "@/components/designpass/Noise";
import { Landscape } from "@/components/ui/landscape";

const LINKS = [
  { label: "How it works", href: "/#how" },
  { label: "CLI", href: "/#cli" },
  { label: "Try it", href: "/#find" },
  { label: "Review a PR", href: "/review" },
];

/** “Organized.” row + giant wordmark over a painted meadow (after micro's footer). */
export function SiteFooter() {
  return (
    <footer className="relative bg-paper">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-[clamp(40px,5vw,64px)] font-medium leading-none tracking-[-0.045em]">One click.</p>
          <p className="font-serif text-[clamp(22px,2.4vw,30px)] leading-tight">So you don’t have to guess.</p>
        </div>
        <div className="h-px bg-ink/80" />
        <div className="grid gap-6 py-4 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-subtle">© OneCLIQ · Files served by GitHub</p>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-10 gap-y-2">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink hover:text-ember"
              >
                {l.label}
                <ArrowUpRight aria-hidden className="size-3" />
              </a>
            ))}
          </nav>
          <p className="max-w-sm text-[12px] leading-relaxed text-ink-subtle lg:max-w-xs lg:justify-self-end lg:text-right">
            Files are served by GitHub. “Recommended” means a file appears to match your system. It is not a security
            check. Only install software you trust.
          </p>
        </div>
      </div>

      <div className="relative isolate mt-6 h-[clamp(200px,30vw,440px)] overflow-hidden">
        <Landscape variant="footer" className="-z-10" />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_0%_0%,var(--paper)_0%,transparent_100%),radial-gradient(40%_60%_at_100%_0%,color-mix(in_oklab,var(--dusk)_35%,transparent),transparent),linear-gradient(to_bottom,var(--paper)_0%,transparent_35%)]"
        />
        <Noise preset="fine" opacity={0.3} />
        <p
          aria-hidden
          className="absolute inset-x-0 top-[4%] select-none text-center text-[clamp(110px,26vw,400px)] font-medium leading-[0.8] tracking-[-0.07em] text-ink"
        >
          onecliq
        </p>
      </div>
    </footer>
  );
}
