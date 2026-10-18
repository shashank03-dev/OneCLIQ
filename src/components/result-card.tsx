"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDownToLine, ExternalLink, FileArchive, Tag } from "lucide-react";
import type { ResolveSuccess } from "@/core/types";
import { KIND_LABELS, OS_LABELS, archLabel, formatBytes, noMatchMessage } from "@/core/labels";
import { StatusBadge } from "./status-badge";
import { MalwarePanel } from "./malware-panel";
import { TrustPanel } from "./trust-panel";
import { DecryptedText } from "./ui/decrypted-text";
import { cn } from "@/lib/cn";

const DOWNLOADING_MS = 6000;

export function ResultCard({ result }: { result: ResolveSuccess }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [downloading, setDownloading] = useState(false);
  const reduce = useReducedMotion();
  const rec = result.recommendation;
  const platform = `${OS_LABELS[result.platform.os]} · ${archLabel(result.platform.os, result.platform.arch)}`;

  useEffect(() => {
    headingRef.current?.focus();
  }, [result]);

  useEffect(() => {
    if (!downloading) return;
    const t = setTimeout(() => setDownloading(false), DOWNLOADING_MS);
    return () => clearTimeout(t);
  }, [downloading]);

  const published = result.release.publishedAt
    ? new Date(result.release.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : null;

  const recommended = rec.status === "recommended";
  const releaseUrl = `${result.repo.url}/releases/tag/${encodeURIComponent(result.release.tag)}`;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <article
        aria-labelledby="result-heading"
        data-testid="result-card"
        className={cn(
          "relative overflow-hidden rounded-[24px] border bg-paper-raised p-5 text-left shadow-card sm:p-7",
          recommended ? "border-moss/25" : "border-clay/25",
        )}
      >
        <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1", recommended ? "bg-moss" : "bg-clay")} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StatusBadge state={recommended ? (downloading ? "downloading" : "recommended") : "not-recommended"} />
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-subtle">{platform}</span>
          </div>

          <h2
            id="result-heading"
            ref={headingRef}
            tabIndex={-1}
            className="mt-5 text-balance font-serif text-[32px] leading-tight tracking-[-0.01em] outline-none sm:text-[38px]"
          >
            {result.release.name}
          </h2>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <Tag aria-hidden className="size-3.5" />
              <span className="font-mono">{result.release.tag}</span>
            </span>
            <span>
              {result.repo.owner}/{result.repo.name}
            </span>
            {published && <span>Published {published}</span>}
            {result.release.prerelease && (
              <span className="rounded-full border border-ochre/30 bg-ochre/10 px-2 py-0.5 text-xs text-ochre">
                Pre-release
              </span>
            )}
          </p>

          {rec.status === "recommended" ? (
            <>
              <div className="mt-6 flex items-start gap-3 rounded-[18px] border border-rule bg-paper p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink text-paper">
                  <FileArchive aria-hidden className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-subtle">Selected file</p>
                  <p data-testid="asset-name" className="mt-1 break-all font-mono text-[15px] text-ink">
                    <DecryptedText text={rec.asset.name} />
                  </p>
                  <p className="mt-1.5 text-[13px] text-ink-muted">
                    {KIND_LABELS[rec.asset.kind]} · {rec.asset.format} · {formatBytes(rec.asset.size)}
                  </p>
                </div>
              </div>

              <TrustPanel releaseUrl={releaseUrl} platform={result.platform} />
              <MalwarePanel releaseUrl={releaseUrl} platform={result.platform} />

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href={rec.asset.downloadUrl}
                  rel="noopener noreferrer"
                  onClick={() => setDownloading(true)}
                  aria-describedby="download-note"
                  className="group relative inline-flex h-12 items-center justify-center gap-2.5 overflow-hidden rounded-full bg-ink py-1 pl-1 pr-6 font-medium text-paper transition-transform active:scale-[0.98]"
                >
                  <span aria-hidden className="grid size-10 place-items-center rounded-full bg-ember text-white transition-transform group-hover:translate-y-0.5">
                    <ArrowDownToLine className="size-4.5" />
                  </span>
                  {downloading ? "Downloading…" : "Download"}
                </a>
                <a
                  href={result.release.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-rule-strong px-5 text-sm text-ink-muted transition-colors hover:border-ink/40 hover:text-ink"
                >
                  View release on GitHub
                  <ExternalLink aria-hidden className="size-3.5" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </div>

              <p role="status" aria-live="polite" className="mt-3 min-h-5 text-[13px] text-moss">
                {downloading ? "Your download is starting from GitHub. Check your browser’s downloads." : ""}
              </p>
              <p id="download-note" className="mt-2 text-[13px] leading-relaxed text-ink-subtle">
                “Recommended” means this file appears to match your system — not that it is safe. The malware
                check covers known threats only. Only install software from publishers you trust.
              </p>
            </>
          ) : (
            <>
              <p data-testid="no-match-message" className="mt-6 rounded-[18px] border border-clay/20 bg-clay/[0.06] p-4 text-[15px] leading-relaxed text-ink">
                {noMatchMessage(rec.reason, platform)}
              </p>
              <a
                href={result.release.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-full border border-rule-strong px-5 text-sm text-ink-muted transition-colors hover:border-ink/40 hover:text-ink"
              >
                Browse the release on GitHub
                <ExternalLink aria-hidden className="size-3.5" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </>
          )}
      </article>
    </motion.div>
  );
}
