"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, CircleCheck, CircleX, ClipboardCopy, GitPullRequest, Loader2, TriangleAlert } from "lucide-react";
import { parseReviewTarget } from "@/core/review/target";
import { SEVERITY_LABELS, type ReviewResult, type Severity } from "@/core/review/types";
import { cn } from "@/lib/cn";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; result: ReviewResult }
  | { kind: "error"; message: string };

const SEVERITY_STYLE: Record<Severity, string> = {
  "must-fix": "border-clay/30 bg-clay/[0.1] text-clay",
  high: "border-clay/25 bg-clay/[0.06] text-clay",
  medium: "border-ochre/25 bg-ochre/[0.08] text-ochre",
  low: "border-rule-strong bg-paper-sunk text-ink-muted",
  nit: "border-rule bg-paper text-ink-subtle",
};

export function PrReviewer() {
  const ids = { url: useId(), goal: useId(), hint: useId() };
  const [url, setUrl] = useState("");
  const [goal, setGoal] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const reduce = useReducedMotion();
  const busy = state.kind === "loading";

  async function run() {
    try {
      parseReviewTarget(url);
    } catch (err) {
      return setState({ kind: "error", message: err instanceof Error ? err.message : "That link doesn’t look right." });
    }
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, ...(goal.trim() ? { goal: goal.trim() } : {}) }),
      });
      const body = (await res.json()) as ReviewResult | { ok: false; error: { message: string } };
      if (body.ok) setState({ kind: "done", result: body });
      else setState({ kind: "error", message: body.error.message });
    } catch {
      setState({ kind: "error", message: "We couldn’t reach the reviewer. Try again." });
    }
  }

  return (
    <div className="rounded-[28px] border border-rule bg-paper-raised/85 p-2 shadow-card sm:p-2.5">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
        className="grid gap-2"
      >
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <label htmlFor={ids.url} className="pointer-events-none absolute left-4 top-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-subtle">
              Pull request or branch
            </label>
            <input
              id={ids.url}
              data-testid="review-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="github.com/owner/repo/pull/12"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-describedby={ids.hint}
              className="h-14 w-full rounded-[20px] border border-rule bg-paper px-4 pt-4 font-mono text-[14px] text-ink outline-none transition-colors placeholder:text-ink-subtle hover:border-rule-strong focus-visible:border-ink/40"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-[20px] bg-ink px-6 text-[15px] font-medium text-paper transition-transform active:scale-[0.98] disabled:cursor-wait disabled:opacity-80"
          >
            {busy ? <Loader2 aria-hidden className="size-4.5 animate-spin" /> : <GitPullRequest aria-hidden className="size-4.5" />}
            {busy ? "Reviewing…" : "Review"}
          </button>
        </div>
        <div className="relative">
          <label htmlFor={ids.goal} className="pointer-events-none absolute left-4 top-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-subtle">
            What should it achieve? (optional)
          </label>
          <textarea
            id={ids.goal}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            maxLength={1500}
            rows={2}
            placeholder="e.g. Retry failed uploads three times without duplicating files"
            className="w-full resize-y rounded-[20px] border border-rule bg-paper px-4 pb-3 pt-7 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-subtle hover:border-rule-strong focus-visible:border-ink/40"
          />
        </div>
        <p id={ids.hint} className="px-3 pb-1 text-[12.5px] text-ink-subtle">
          Public repos only. Draft, open, closed: any PR works, or a …/tree/branch or …/compare/main...branch link.
          Reviews can take a few minutes.
        </p>
      </form>

      <div aria-live="polite" className="px-1 pb-1">
        {state.kind === "error" && (
          <p role="alert" className="mx-1 mb-1 mt-2 rounded-[18px] border border-ochre/25 bg-ochre/[0.06] px-4 py-3 text-[14px] text-ink">
            {state.message}
          </p>
        )}
        {state.kind === "loading" && (
          <p className="mx-1 mt-2 flex items-center gap-2 rounded-[18px] border border-rule bg-paper px-4 py-3 text-[14px] text-ink-muted">
            <Loader2 aria-hidden className="size-4 animate-spin" /> Reading the diff and reviewing it with Gemma 4. This can take a few minutes…
          </p>
        )}
        {state.kind === "done" && (
          <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <ReviewReport result={state.result} />
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ReviewReport({ result }: { result: ReviewResult }) {
  const v = result.verdict;
  const tone = v.readyToMerge ? "moss" : v.safeToMerge ? "ochre" : "clay";
  const Icon = v.readyToMerge ? CircleCheck : v.safeToMerge ? TriangleAlert : CircleX;
  const ch = result.change;
  return (
    <div data-testid="review-result" className="mt-2 grid gap-2">
      <section
        className={cn(
          "mx-1 rounded-[18px] border p-4",
          tone === "moss" && "border-moss/25 bg-moss/[0.06]",
          tone === "ochre" && "border-ochre/25 bg-ochre/[0.06]",
          tone === "clay" && "border-clay/25 bg-clay/[0.06]",
        )}
      >
        <p className={cn("flex items-center gap-2 text-[17px] font-medium", tone === "moss" ? "text-moss" : tone === "ochre" ? "text-ochre" : "text-clay")}>
          <Icon aria-hidden className="size-5" /> {v.label}
        </p>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[14px]">
          <dt className="text-ink-subtle">Safe to merge</dt>
          <dd className={v.safeToMerge ? "text-moss" : "text-clay"}>{v.safeToMerge ? "Yes" : "No"}</dd>
          <dt className="text-ink-subtle">Ready to merge</dt>
          <dd className={v.readyToMerge ? "text-moss" : "text-clay"}>{v.readyToMerge ? "Yes" : "No"}</dd>
          <dt className="text-ink-subtle">Title</dt>
          <dd className="min-w-0 break-words text-ink">{result.title.current}</dd>
          {result.title.suggested && result.title.suggested !== result.title.current && (
            <>
              <dt className="text-ink-subtle">Suggested</dt>
              <dd className="min-w-0 break-words font-medium text-ink">{result.title.suggested}</dd>
            </>
          )}
          <dt className="text-ink-subtle">Change</dt>
          <dd className="min-w-0 text-ink-muted">
            {ch.url ? (
              <a href={ch.url} target="_blank" rel="noopener noreferrer" className="font-mono underline underline-offset-4">
                {ch.number ? `${ch.repo}#${ch.number}` : `${ch.head} → ${ch.base}`}
              </a>
            ) : (
              <span className="font-mono">{ch.head} → {ch.base}</span>
            )}{" "}
            · {ch.state} · {ch.filesChanged} files · +{ch.additions} −{ch.deletions}
          </dd>
        </dl>
        {v.blockers.length > 0 && <p className="mt-3 text-[13px] text-ink-muted">Not ready: {v.blockers.join(", ")}.</p>}
      </section>

      {result.summary && (
        <section className="mx-1 rounded-[18px] border border-rule bg-paper p-4 text-[14px] leading-relaxed text-ink-muted">
          <p>{result.summary}</p>
          {result.intent.status !== "unknown" && result.intent.notes && (
            <p className="mt-2">
              <span className="font-medium text-ink">Goal: </span>
              {result.intent.notes}
            </p>
          )}
        </section>
      )}

      {result.findings.length === 0 ? (
        <p className="mx-1 rounded-[18px] border border-moss/25 bg-moss/[0.06] px-4 py-3 text-[14px] text-moss">No issues found.</p>
      ) : (
        <ol className="mx-1 grid gap-2" aria-label="Findings">
          {result.findings.map((f, i) => (
            <li key={i} className="rounded-[18px] border border-rule bg-paper p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-full border px-2.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em]", SEVERITY_STYLE[f.severity])}>
                  {SEVERITY_LABELS[f.severity]}
                </span>
                <h3 className="text-[14.5px] font-medium text-ink">{f.title}</h3>
              </div>
              {f.file && (
                <p className="mt-1.5 break-all font-mono text-[12px] text-ink-subtle">
                  {f.file}
                  {f.line ? `:${f.line}` : ""}
                </p>
              )}
              {f.detail && <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{f.detail}</p>}
              {f.fix && (
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink">
                  <span className="font-medium text-moss">Fix: </span>
                  {f.fix}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

      {ch.unreviewedFiles.length > 0 && (
        <p className="mx-1 rounded-[18px] border border-ochre/25 bg-ochre/[0.06] px-4 py-3 text-[13.5px] leading-relaxed text-ink">
          <span className="font-medium text-ochre">Partial review. </span>
          {ch.unreviewedFiles.length} file{ch.unreviewedFiles.length === 1 ? " wasn’t" : "s weren’t"} fully reviewed to fit the model’s input
          limit: <span className="break-all font-mono text-[12px]">{ch.unreviewedFiles.slice(0, 6).join(", ")}{ch.unreviewedFiles.length > 6 ? " …" : ""}</span>
        </p>
      )}

      {result.fixPrompt && <FixPrompt text={result.fixPrompt} />}

      <p className="px-3 pb-1 font-mono text-[11px] uppercase tracking-[0.13em] text-ink-subtle">
        Reviewed by {result.model}
        {ch.skippedFiles.length > 0 && ` · ${ch.skippedFiles.length} lockfile/generated/binary files skipped`}
      </p>
    </div>
  );
}

function FixPrompt({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <section className="mx-1 rounded-[18px] border border-rule bg-night p-4 text-night-ink">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[14.5px] font-medium">Fix prompt</h3>
          <p className="text-[12.5px] text-night-muted">Paste into any AI coding assistant to fix everything above.</p>
        </div>
        <button
          type="button"
          data-testid="copy-fix-prompt"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              setCopied(false);
            }
          }}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-night-ink px-4 text-[13.5px] font-medium text-night transition-colors hover:bg-white"
        >
          {copied ? <Check aria-hidden className="size-4" /> : <ClipboardCopy aria-hidden className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-[12px] border border-night-rule bg-night-raised p-3 font-mono text-[12.5px] leading-relaxed text-night-ink">
        {text}
      </pre>
    </section>
  );
}
