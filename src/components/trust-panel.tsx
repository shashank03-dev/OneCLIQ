"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, Fingerprint, Loader2, ShieldCheck, ShieldQuestion, TriangleAlert } from "lucide-react";
import type { Platform } from "@/core/types";
import { TRUST_LEVEL_LABELS, type CheckStatus, type TrustReport } from "@/core/trust";
import { cn } from "@/lib/cn";
import { postJson } from "@/lib/api";

type State =
  | { kind: "loading" }
  | { kind: "ready"; trust: TrustReport }
  | { kind: "error"; message: string };

const LEVEL_STYLE: Record<TrustReport["level"], { text: string; bar: string; border: string }> = {
  strong: { text: "text-moss", bar: "bg-moss", border: "border-moss/25" },
  fair: { text: "text-ochre", bar: "bg-ochre", border: "border-ochre/25" },
  weak: { text: "text-clay", bar: "bg-clay", border: "border-clay/25" },
};

function CheckIcon({ status }: { status: CheckStatus }) {
  if (status === "pass") return <ShieldCheck aria-label="Pass" className="size-4 text-moss" />;
  if (status === "warn") return <TriangleAlert aria-label="Warning" className="size-4 text-ochre" />;
  return <ShieldQuestion aria-label="Info" className="size-4 text-ink-subtle" />;
}

/** Provenance signals for the recommended file, fetched after the result shows. */
export function TrustPanel({ releaseUrl, platform }: { releaseUrl: string; platform: Platform }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const controller = new AbortController();
    postJson<{ ok: true; trust: TrustReport }>("/api/trust", { url: releaseUrl, os: platform.os, arch: platform.arch }, controller.signal)
      .then((body) => {
        if (body.ok) setState({ kind: "ready", trust: body.trust });
        else setState({ kind: "error", message: body.error.message || "Couldn’t check provenance." });
      })
      .catch((err: { name?: string }) => {
        if (err?.name !== "AbortError") setState({ kind: "error", message: "Couldn’t check provenance right now." });
      });
    return () => controller.abort();
  }, [releaseUrl, platform.os, platform.arch]);

  if (state.kind === "loading") {
    return (
      <div data-testid="trust-panel" className="mt-4 flex items-center gap-2.5 rounded-[18px] border border-rule bg-paper px-4 py-3 text-[13px] text-ink-subtle">
        <Loader2 aria-hidden className="size-4 animate-spin" /> Checking provenance — attestations, immutability, re-uploads…
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <p data-testid="trust-panel" className="mt-4 rounded-[18px] border border-rule bg-paper px-4 py-3 text-[13px] text-ink-subtle">
        <Fingerprint aria-hidden className="mr-1.5 inline size-4 -translate-y-px" />
        {state.message}
      </p>
    );
  }

  const { trust } = state;
  const style = LEVEL_STYLE[trust.level];
  const warns = trust.checks.filter((c) => c.status === "warn");
  return (
    <div data-testid="trust-panel" className={cn("mt-4 overflow-hidden rounded-[18px] border bg-paper", style.border)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-paper-sunk/50"
      >
        <Fingerprint aria-hidden className={cn("size-5 shrink-0", style.text)} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className={cn("text-[14px] font-medium", style.text)} data-testid="trust-level">
              {TRUST_LEVEL_LABELS[trust.level]}
            </span>
            <span className="font-mono text-[12px] text-ink-subtle">{trust.score}/100</span>
          </span>
          <span className="mt-0.5 block truncate text-[12.5px] text-ink-muted">
            {warns.length ? warns.map((w) => w.label).join(" · ") : "No warnings on this file"}
          </span>
        </span>
        <span aria-hidden className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-paper-sunk sm:block">
          <span className={cn("block h-full rounded-full", style.bar)} style={{ width: `${trust.score}%` }} />
        </span>
        <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-ink-subtle transition-transform", open && "rotate-180")} />
        <span className="sr-only">{open ? "Hide" : "Show"} provenance details</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <ul className="space-y-2.5 border-t border-rule px-4 py-4">
              {trust.checks.map((c) => (
                <li key={c.id} className="flex gap-3 text-[13px]">
                  <span className="mt-0.5 shrink-0">
                    <CheckIcon status={c.status} />
                  </span>
                  <span>
                    <span className="font-medium text-ink">{c.label}</span>
                    <span className="text-ink-muted"> — {c.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="border-t border-rule px-4 py-3 text-[12px] leading-relaxed text-ink-subtle">
              {trust.verifyCommand ? (
                <>
                  After downloading, check the signature yourself:{" "}
                  <code className="break-all font-mono text-ink-muted">{trust.verifyCommand}</code>.{" "}
                </>
              ) : null}
              These are signals, not a safety verdict.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
