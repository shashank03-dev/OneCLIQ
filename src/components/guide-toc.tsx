"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/** Sticky "On this page" list that lights the section you're reading and marks earlier ones done. */
export function GuideToc({ items }: { items: Array<{ id: string; label: string }> }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  const at = items.findIndex((i) => i.id === active);

  return (
    <nav aria-label="On this page" className="sticky top-28">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-subtle">On this page</p>
      <ol className="relative mt-4 space-y-1 before:absolute before:bottom-3 before:left-[11px] before:top-3 before:w-px before:bg-rule-strong">
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={i === at ? "location" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-full py-1.5 pr-3 text-[14px] transition-colors",
                i === at ? "text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              <span
                className={cn(
                  "relative grid size-[23px] shrink-0 place-items-center rounded-full border font-mono text-[10.5px] transition-colors",
                  i === at ? "border-ink bg-ink text-paper" : i < at ? "border-moss/40 bg-moss/10 text-moss" : "border-rule-strong bg-paper text-ink-subtle",
                )}
              >
                {i + 1}
              </span>
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
