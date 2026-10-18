import { ResolveError } from "../errors";
import { GemmaReviewer, ModelQuotaError } from "./gemma";
import { DEFAULT_DIFF_BUDGET, SYSTEM_PROMPT, buildUserPrompt, packDiff } from "./prompt";
import type { ModelReview, ReviewContext, ReviewResult } from "./types";
import { buildFixPrompt, computeVerdict, sortFindings } from "./verdict";

export { GitHubPrClient } from "./github-pr";
export { DEFAULT_REVIEW_MODEL, GemmaReviewer, ModelQuotaError } from "./gemma";
export { parseReviewTarget } from "./target";
export { SEVERITIES, SEVERITY_LABELS, normalizeSeverity } from "./types";
export type { ChangedFile, Finding, ReviewContext, ReviewResult, ReviewTarget, ReviewVerdict, Severity } from "./types";

/** Code tokenizes at roughly 3 characters per token; err low so a trimmed prompt really fits. */
const CHARS_PER_TOKEN = 3;

/** Diff characters that fit under an input-token cap alongside the system prompt and change header. */
function budgetFor(maxInputTokens: number, user: string, packed: { text: string }): number {
  const overhead = SYSTEM_PROMPT.length + (user.length - packed.text.length) + 3_000;
  return Math.floor(maxInputTokens * CHARS_PER_TOKEN * 0.85) - overhead;
}

export type ReviewProgress = { kind: "trimmed"; inputTokenLimit: number; unreviewed: number; waitSeconds: number };

export interface ReviewOptions {
  diffBudget?: number;
  /** Known per-request input cap (e.g. 16,000 on the Gemini free tier): trim up front instead of being rejected first. */
  maxInputTokens?: number;
  onProgress?: (event: ReviewProgress) => void;
  sleep?: (ms: number) => Promise<void>;
}

/** Review one change end to end: pack the diff, ask the model, then decide the verdict and fix prompt locally. */
export async function reviewChange(ctx: ReviewContext, reviewer: GemmaReviewer, opts: ReviewOptions = {}): Promise<ReviewResult> {
  if (ctx.files.length === 0) throw new ResolveError("INVALID_REQUEST", `There are no changes between ${ctx.base} and ${ctx.head} to review.`);
  let packed = packDiff(ctx.files, opts.diffBudget ?? DEFAULT_DIFF_BUDGET);
  if (packed.included.length === 0) {
    throw new ResolveError("INVALID_REQUEST", "None of the changed files have a reviewable text diff (only lockfiles, generated or binary files).");
  }
  if (opts.maxInputTokens) {
    const fit = budgetFor(opts.maxInputTokens, buildUserPrompt(ctx, packed), packed);
    if (fit < packed.text.length) {
      const trimmed = packDiff(ctx.files, fit);
      if (trimmed.included.length) packed = trimmed;
    }
  }

  let review: ModelReview;
  const user = buildUserPrompt(ctx, packed);
  try {
    review = await reviewer.review(SYSTEM_PROMPT, user);
  } catch (err) {
    // A per-minute input cap smaller than the prompt (Gemini free tier) never clears by waiting: trim the diff to fit, once.
    if (!(err instanceof ModelQuotaError) || !err.inputTokenLimit) throw err;
    const budget = budgetFor(err.inputTokenLimit, user, packed);
    if (budget >= packed.text.length) throw err; // it already fit; the quota was just used up
    const trimmed = packDiff(ctx.files, budget);
    if (budget < 2_000 || trimmed.included.length === 0) throw err;
    packed = trimmed;
    // Rejected requests still count against the rolling minute, whatever retryDelay says, so each retry must clear the last attempt.
    const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
    const waitSeconds = 90;
    opts.onProgress?.({ kind: "trimmed", inputTokenLimit: err.inputTokenLimit, unreviewed: packed.unreviewed.length, waitSeconds });
    await sleep(waitSeconds * 1000);
    const trimmedUser = buildUserPrompt(ctx, packed);
    try {
      review = await reviewer.review(SYSTEM_PROMPT, trimmedUser);
    } catch (again) {
      if (!(again instanceof ModelQuotaError) || !again.inputTokenLimit) throw again;
      await sleep(75_000);
      review = await reviewer.review(SYSTEM_PROMPT, trimmedUser);
    }
  }

  const findings = sortFindings(review.findings.filter((f) => f.title || f.detail));
  const totals = ctx.files.reduce((t, f) => ({ add: t.add + f.additions, del: t.del + f.deletions }), { add: 0, del: 0 });

  return {
    ok: true,
    model: reviewer.model,
    change: {
      source: ctx.source,
      repo: ctx.repo,
      title: ctx.title,
      state: ctx.state,
      base: ctx.base,
      head: ctx.head,
      ...(ctx.url ? { url: ctx.url } : {}),
      ...(ctx.number ? { number: ctx.number } : {}),
      filesChanged: ctx.files.length,
      additions: totals.add,
      deletions: totals.del,
      skippedFiles: packed.skipped,
      unreviewedFiles: packed.unreviewed,
    },
    title: { current: ctx.title, suggested: review.suggestedTitle || ctx.title },
    summary: review.summary,
    intent: { status: review.intent, notes: review.intentNotes },
    verdict: computeVerdict({ findings, intent: review.intent }, ctx.state, packed.unreviewed.length),
    findings,
    testsToAdd: review.testsToAdd,
    fixPrompt: buildFixPrompt(ctx, findings, review.testsToAdd),
  };
}
