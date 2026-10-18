"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Terminal } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { PillButton } from "@/components/ui/pill-button";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/#how", id: "how", label: "How it works" },
  { href: "/#review", id: "review", label: "Gemma review" },
  { href: "/#skills", id: "skills", label: "Skills" },
  { href: "/#cli", id: "cli", label: "CLI" },
];

/**
 * Harmoniq-style top bar that condenses into a floating glass pill once you scroll, with a
 * highlight that slides to whichever section you're reading.
 */
export function SiteNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (pathname !== "/") return;
    const sections = LINKS.map((l) => document.getElementById(l.id)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [pathname]);

  const current = pathname === "/skills" ? "skills" : pathname === "/review" ? "review" : active;
  const lit = hovered ?? current;
  // Dark pages start with the glass pill so the ink logo and links stay readable.
  const solid = scrolled || pathname === "/skills";

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5">
      <div
        className={cn(
          "mx-auto flex w-full max-w-6xl items-center justify-between rounded-full px-3 py-2 transition-[background-color,box-shadow,border-color,max-width] duration-300 sm:px-4",
          solid
            ? "max-w-4xl border border-rule bg-paper-raised/75 shadow-tile backdrop-blur-xl backdrop-saturate-150"
            : "border border-transparent",
        )}
      >
        <Link href="/" aria-label="OneCLIQ home" className="rounded-full transition-transform active:scale-95">
          <Logo />
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1 text-[14px] text-ink-muted">
          <ul className="hidden items-center md:flex" onPointerLeave={() => setHovered(null)}>
            {LINKS.map((l) => (
              <li key={l.id} className="relative">
                <Link
                  href={pathname === "/skills" && l.id === "skills" ? "/skills" : l.href}
                  onPointerEnter={() => setHovered(l.id)}
                  aria-current={current === l.id ? "true" : undefined}
                  className={cn("relative z-10 block rounded-full px-3.5 py-1.5 transition-colors hover:text-ink", current === l.id && "text-ink")}
                >
                  {l.label}
                </Link>
                {lit === l.id && (
                  <motion.span
                    layoutId="nav-pill"
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-ink/[0.06]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
              </li>
            ))}
          </ul>
          <Link href="/skills" className="rounded-full px-2.5 py-1.5 transition-colors hover:text-ink md:hidden">
            Skills
          </Link>
          <Link href="/review" className="rounded-full px-2.5 py-1.5 transition-colors hover:text-ink md:hidden">
            Review
          </Link>
          <PillButton href="/#cli" className="ml-1 h-10 px-4 text-[13.5px] transition-transform active:scale-95">
            <Terminal aria-hidden className="size-3.5" />
            <span className="hidden sm:inline">Get oqgit</span>
            <span className="sm:hidden">CLI</span>
          </PillButton>
        </nav>
      </div>
    </header>
  );
}
