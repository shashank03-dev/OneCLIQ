"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { Check, Copy } from "lucide-react";

type Line = { text: string; className?: string; delay?: number; prompt?: boolean };

// Mirrors what `oqgit <repo>` (short for `oqgit get <repo>`) actually prints.
const SCRIPT: Line[] = [
  { text: "oqgit sharkdp/bat", prompt: true, delay: 500 },
  { text: "" },
  { text: "  ◆ oqgit · GitHub release resolver", className: "text-lilac" },
  { text: "  │" },
  { text: "  ◇ System  macOS · Apple Silicon (arm64)", className: "text-night-muted" },
  { text: "  ◇ Release v0.25.0 · latest stable", className: "text-night-muted", delay: 380 },
  { text: "  │" },
  { text: "  ╭──────────────────────────────────────────╮", className: "text-night-muted/60" },
  { text: "  │ ✔ Recommended                            │", className: "text-leaf" },
  { text: "  │ bat-v0.25.0-aarch64-apple-darwin.tar.gz  │" },
  { text: "  │ Archive · tar.gz · 2.9 MB                │", className: "text-night-muted" },
  { text: "  ╰──────────────────────────────────────────╯", className: "text-night-muted/60" },
  { text: "  ◆ Download it?  › Yes", className: "text-ember", delay: 480 },
  { text: "  ↓ Downloading ████████████████████ 100%  2.9 MB", className: "text-ember", delay: 700 },
  { text: "  ✔ SHA-256 matches GitHub's digest", className: "text-leaf" },
  { text: "  └ Saved to ~/Downloads/bat-v0.25.0-aarch64-apple-darwin.tar.gz", className: "text-night-muted" },
];

const INSTALL = "npm i -g oqgit";

export function CliShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });
  const reduce = useReducedMotion();
  const [animCount, setCount] = useState(0);
  const [animTyped, setTyped] = useState(0);
  const count = reduce ? SCRIPT.length : animCount;
  const typed = reduce ? SCRIPT[0].text.length : animTyped;

  useEffect(() => {
    if (!inView || reduce) return;
    let cancelled = false;
    (async () => {
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
      for (let i = 1; i <= SCRIPT[0].text.length && !cancelled; i++) {
        setTyped(i);
        await wait(45);
      }
      await wait(SCRIPT[0].delay ?? 0);
      for (let i = 1; i <= SCRIPT.length && !cancelled; i++) {
        setCount(i);
        await wait(SCRIPT[i - 1]?.delay ?? 70);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inView, reduce]);

  return (
    <div ref={ref} className="relative">
            <figure className="overflow-hidden rounded-[22px] border border-night-rule bg-night-raised/90 text-left shadow-2xl shadow-black/50 backdrop-blur">
        <div className="flex items-center gap-2 border-b border-night-rule px-4 py-3">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 font-mono text-xs text-night-muted">~ — oqgit</span>
        </div>
        <pre
          aria-label="Example: oqgit sharkdp/bat finds and downloads the Apple Silicon build of bat."
          className="min-h-[430px] overflow-x-auto p-5 font-mono text-[12.5px] leading-[1.7] text-night-ink sm:text-[13px]"
        >
          <code aria-hidden>
            <span className="text-ember">❯ </span>
            {SCRIPT[0].text.slice(0, typed)}
            {count === 0 && <span className="animate-blink">▌</span>}
            {"\n"}
            {SCRIPT.slice(1, count).map((line, i) => (
              <span key={i} className={line.className}>
                {line.text}
                {"\n"}
              </span>
            ))}
          </code>
        </pre>
      </figure>
    </div>
  );
}

export function CopyCommand() {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-full border border-night-rule bg-night-raised py-1.5 pl-5 pr-1.5 font-mono text-sm text-night-ink">
      <span className="text-ember" aria-hidden>
        $
      </span>
      <code className="flex-1">{INSTALL}</code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(INSTALL);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {
            /* clipboard unavailable */
          }
        }}
        className="inline-flex size-9 items-center justify-center rounded-full bg-white/[0.06] text-night-muted transition-colors hover:bg-white/[0.12] hover:text-night-ink"
        aria-label={copied ? "Copied" : "Copy install command"}
      >
        {copied ? <Check aria-hidden className="size-4 text-leaf" /> : <Copy aria-hidden className="size-4" />}
      </button>
    </div>
  );
}
