"use client";

import { useId, useRef, useState, useSyncExternalStore } from "react";
import { Copy, Link2 } from "lucide-react";
import type { ResolveSuccess } from "@/core/types";
import { createDownloadLinks, downloadOrigin } from "@/lib/download-links";

const subscribe = () => () => {};
const browserOrigin = () => window.location.origin;
const serverOrigin = () => "";

export function ShareDownload({ result }: { result: ResolveSuccess }) {
  const current = useSyncExternalStore(subscribe, browserOrigin, serverOrigin);
  const origin = current ? downloadOrigin(process.env.NEXT_PUBLIC_SITE_URL, current) : "";
  if (!origin) return null;
  const links = createDownloadLinks(origin, result.repo, result.platform);

  return (
    <section data-testid="share-download" aria-label="Share and embed this download" className="mt-7 border-t border-rule pt-6">
      <h3 className="flex items-center gap-2 text-[16px] font-medium"><Link2 aria-hidden className="size-4" /> Share or embed this download</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
        These links always fetch the latest stable release, even if you looked up a specific tag.
        The one-tap link and embed button detect each visitor’s system. The direct link uses {result.platform.os} / {result.platform.arch}.
      </p>
      <div className="mt-4 space-y-4">
        <CopyField label="One-tap link" value={links.universal} />
        <CopyField label="Direct download link" value={links.direct} />
        <details className="rounded-2xl border border-rule bg-paper p-4">
          <summary className="cursor-pointer text-sm font-medium">Embed a download button</summary>
          <p className="mt-3 text-[13px] text-ink-muted">Paste into a website or README. The button opens OneCLIQ and starts the right download.</p>
          <div className="mt-4 space-y-4">
            <CopyField label="HTML embed" value={links.html} multiline />
            <CopyField label="Markdown embed" value={links.markdown} multiline />
            <a href={links.universal} className="inline-flex rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4">
              {/* A static SVG hosted by this site; native img keeps third-party embeds portable. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${origin}/download-badge.svg`} alt={`Download ${result.repo.owner}/${result.repo.name} with OneCLIQ`} width={196} height={36} />
            </a>
          </div>
        </details>
      </div>
    </section>
  );
}

function CopyField({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  const id = useId();
  const fieldRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const [feedback, setFeedback] = useState("");
  const classes = "w-full min-w-0 rounded-xl border border-rule bg-paper px-3 py-2 font-mono text-xs leading-relaxed text-ink outline-none focus-visible:border-ink/60";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium">{label}</label>
        <button type="button" aria-label={`Copy ${label}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-rule px-3 text-xs hover:border-rule-strong focus-visible:outline-2 focus-visible:outline-offset-2" onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setFeedback("Copied to clipboard.");
          } catch {
            fieldRef.current?.focus();
            fieldRef.current?.select();
            setFeedback("Select and copy the text above.");
          }
        }}><Copy aria-hidden className="size-3.5" />Copy</button>
      </div>
      {multiline
        ? <textarea id={id} ref={fieldRef} readOnly value={value} rows={4} className={classes} onFocus={(e) => e.currentTarget.select()} />
        : <input id={id} ref={fieldRef} readOnly value={value} className={classes} onFocus={(e) => e.currentTarget.select()} />}
      <p role="status" className="mt-1 text-xs text-ink-subtle">{feedback}</p>
    </div>
  );
}
