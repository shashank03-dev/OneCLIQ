import Link from "next/link";
import { Terminal } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { PillButton } from "@/components/ui/pill-button";

/** Harmoniq-style top bar: mark left, quiet links, one ink pill. */
export function SiteNav() {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <Link href="/" aria-label="OneCLIQ home">
        <Logo />
      </Link>
      <nav aria-label="Primary" className="flex items-center gap-1 text-[14px] text-ink-muted sm:gap-6">
        <Link href="/#how" className="hidden transition-colors hover:text-ink sm:inline">
          How it works
        </Link>
        <Link href="/#verify" className="hidden transition-colors hover:text-ink sm:inline">
          Verify a file
        </Link>
        <Link href="/#cli" className="hidden transition-colors hover:text-ink sm:inline">
          CLI
        </Link>
        <Link href="/review" className="px-2 transition-colors hover:text-ink sm:px-0">
          Review a PR
        </Link>
        <PillButton href="/#cli" className="h-10 px-4 text-[13.5px]">
          <Terminal aria-hidden className="size-3.5" />
          Get oqgit
        </PillButton>
      </nav>
    </header>
  );
}
