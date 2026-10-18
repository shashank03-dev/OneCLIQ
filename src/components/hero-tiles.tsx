"use client";

import { useEffect, useRef } from "react";
import { Apple, Cpu, Grid2x2, Package, Sparkles, Terminal } from "lucide-react";
import { GithubIcon } from "@/components/ui/github-icon";
import { cn } from "@/lib/cn";

// Floating tiles on the arc (after Harmoniq). Positions are % of the arc box; depth sets parallax strength.
const TILES = [
  { Icon: Grid2x2, label: "Windows", x: 6, y: 62, r: "-10deg", delay: "0s", depth: 0.9, mobile: false },
  { Icon: Apple, label: "macOS", x: 18, y: 22, r: "-6deg", delay: "-2s", depth: 0.6, mobile: true },
  { Icon: GithubIcon, label: "GitHub", x: 44, y: 2, r: "4deg", delay: "-4s", depth: 0.4, mobile: false },
  { Icon: Sparkles, label: "Gemma 4", x: 58, y: 0, r: "-3deg", delay: "-6s", depth: 0.5, mobile: false },
  { Icon: Terminal, label: "Linux", x: 72, y: 16, r: "8deg", delay: "-1s", depth: 0.7, mobile: true },
  { Icon: Cpu, label: "arm64", x: 86, y: 52, r: "10deg", delay: "-3s", depth: 1, mobile: false },
  { Icon: Package, label: "Release", x: 94, y: 82, r: "-4deg", delay: "-5s", depth: 0.8, mobile: false },
];

/** The arc of OS/CPU tiles. They drift away from the pointer, and grow a label when it gets close. */
export function HeroTiles() {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        el.style.setProperty("--px", `${nx * -28}px`);
        el.style.setProperty("--py", `${ny * -20}px`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div ref={box} aria-hidden className="pointer-events-none absolute inset-x-5 top-10 h-[260px] sm:inset-x-8 sm:h-[300px]">
      {TILES.map(({ Icon, label, x, y, r, delay, depth, mobile }) => (
        <span
          key={label}
          style={{
            left: `${x}%`,
            top: `${y}%`,
            translate: `calc(-50% + var(--px, 0px) * ${depth}) calc(var(--py, 0px) * ${depth})`,
          }}
          className={cn("absolute transition-[translate] duration-700 ease-out", !mobile && "hidden sm:block")}
        >
          <span
            style={{ "--r": r, animationDelay: delay } as React.CSSProperties}
            className="group pointer-events-auto relative grid size-11 animate-bob place-items-center rounded-[14px] border border-rule bg-paper-raised text-ink shadow-tile transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:scale-110 hover:shadow-card sm:size-14 sm:rounded-[18px]"
          >
            <Icon className="size-5 transition-transform duration-300 group-hover:rotate-[-8deg] sm:size-6" />
            <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-paper opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-y-0.5 group-hover:opacity-100">
              {label}
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}
