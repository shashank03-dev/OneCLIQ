"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";

/** Copy text with an icon that flips to a check, announced politely to screen readers. */
export function CopyButton({
  text,
  label = "Copy",
  className,
  tone = "night",
  compact = false,
}: {
  text: string;
  label?: string;
  className?: string;
  tone?: "night" | "paper";
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard unavailable */
        }
      }}
      aria-label={copied ? "Copied" : label}
      className={cn(
        "relative inline-flex h-9 shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full font-sans text-[12.5px] transition-[background-color,transform] active:scale-95",
        compact ? "w-9" : "min-w-[84px] px-3",
        tone === "night" ? "bg-white/[0.08] text-night-ink hover:bg-white/[0.16]" : "border border-rule bg-paper-raised text-ink hover:border-rule-strong",
        className,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={copied ? "y" : "n"}
          initial={{ y: 12, opacity: 0, scale: 0.6 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -12, opacity: 0, scale: 0.6 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="inline-flex items-center gap-1.5"
        >
          {copied ? <Check aria-hidden className={cn("size-4", tone === "night" ? "text-leaf" : "text-moss")} /> : <Copy aria-hidden className="size-4" />}
          {!compact && (copied ? "Copied" : "Copy")}
        </motion.span>
      </AnimatePresence>
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}
