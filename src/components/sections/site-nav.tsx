"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { GithubIcon } from "@/components/ui/github-icon";
import { GITHUB_URL, PAGES } from "@/lib/site";
import { cn } from "@/lib/cn";

const LINKS = PAGES.filter((p) => p.id !== "start");
const START = PAGES[0];

/** Pages whose first screen is dark: the nav starts as a solid glass pill there. */
const DARK_PAGES = new Set(["/skills", "/cli"]);

/**
 * Top bar that condenses into a floating glass pill once you scroll. The pill highlights the
 * page you're on, so you always know where you are; on phones it opens a full menu.
 */
export function SiteNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const open = menuPath === pathname;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuPath(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const current = PAGES.find((p) => pathname.startsWith(p.href))?.id ?? null;
  const lit = hovered ?? current;
  const solid = scrolled || open || DARK_PAGES.has(pathname);

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5">
      <div
        className={cn(
          "mx-auto w-full max-w-6xl overflow-hidden rounded-[26px] px-3 py-2 transition-[background-color,box-shadow,border-color,max-width] duration-300 sm:px-4",
          solid
            ? "max-w-4xl border border-rule bg-paper-raised/80 shadow-tile backdrop-blur-xl backdrop-saturate-150"
            : "border border-transparent",
        )}
      >
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="OneCLIQ home" className="rounded-full transition-transform active:scale-95">
            <Logo />
          </Link>

          <nav aria-label="Primary" className="flex items-center gap-1 text-[14px] text-ink-muted">
            <ul className="hidden items-center md:flex" onPointerLeave={() => setHovered(null)}>
              {LINKS.map((l) => (
                <li key={l.id} className="relative">
                  <Link
                    href={l.href}
                    onPointerEnter={() => setHovered(l.id)}
                    aria-current={current === l.id ? "page" : undefined}
                    className={cn(
                      "relative z-10 block rounded-full px-3.5 py-1.5 transition-colors hover:text-ink",
                      current === l.id && "text-ink",
                    )}
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
            <a
              href={GITHUB_URL}
              aria-label="OneCLIQ on GitHub"
              className="hidden size-10 place-items-center rounded-full text-ink-muted transition-colors hover:bg-ink/[0.06] hover:text-ink md:grid"
            >
              <GithubIcon className="size-[18px]" />
            </a>
            <Link
              href={START.href}
              aria-current={current === "start" ? "page" : undefined}
              className="group ml-1 inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[13.5px] font-medium text-paper transition-[background-color,transform] hover:bg-ink/90 active:scale-95"
            >
              {START.label}
              <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <button
              type="button"
              onClick={() => setMenuPath(open ? null : pathname)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="ml-1 grid size-10 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.06] md:hidden"
            >
              {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
            </button>
          </nav>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.nav
              id="mobile-menu"
              aria-label="Menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              className="md:hidden"
            >
              <ul className="grid gap-1 pb-2 pt-3">
                {PAGES.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={p.href}
                      aria-current={current === p.id ? "page" : undefined}
                      className={cn(
                        "block rounded-[18px] px-3 py-2.5 transition-colors hover:bg-ink/[0.05]",
                        current === p.id && "bg-ink/[0.06]",
                      )}
                    >
                      <span className="block text-[15px] font-medium text-ink">{p.title}</span>
                      <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-muted">{p.blurb}</span>
                    </Link>
                  </li>
                ))}
                <li>
                  <a href={GITHUB_URL} className="flex items-center gap-2 rounded-[18px] px-3 py-2.5 text-[14px] text-ink-muted hover:bg-ink/[0.05]">
                    <GithubIcon className="size-4" /> Source on GitHub
                  </a>
                </li>
              </ul>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
