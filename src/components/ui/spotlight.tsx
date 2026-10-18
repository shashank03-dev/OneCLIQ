"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * A surface with a soft light that follows the pointer (desktop only). Sets --x/--y on the element;
 * the glow itself is the `.spotlight` rule in globals.css so it costs no React renders.
 */
export function Spotlight({
  children,
  className,
  tone = "paper",
  ...rest
}: { children: React.ReactNode; className?: string; tone?: "paper" | "night" } & React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      data-tone={tone}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el || e.pointerType !== "mouse") return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--x", `${e.clientX - r.left}px`);
        el.style.setProperty("--y", `${e.clientY - r.top}px`);
      }}
      className={cn("spotlight", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
