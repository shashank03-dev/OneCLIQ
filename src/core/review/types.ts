/**
 * Shapes for AI code review of a pull request, a branch, or local changes.
 * Framework-independent: shared by the CLI (`oqgit review`) and the web app (`/api/review`).
 */
import { z } from "zod";

export const SEVERITIES = ["must-fix", "high", "medium", "low", "nit"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_LABELS: Record<Severity, string> = {
  "must-fix": "Must fix",
  high: "High risk",
  medium: "Medium risk",
  low: "Low risk",
  nit: "Nit",
};

/** Where the change came from. */
export type ReviewTarget =
  | { kind: "pr"; owner: string; repo: string; number: number }
  | { kind: "branch"; owner: string; repo: string; head: string; base?: string };

export type ChangeState = "draft" | "open" | "closed" | "merged" | "branch" | "local";

export interface ChangedFile {
  path: string;
  status: string;
  additions: number;
  deletions: number;
  /** Unified diff hunk text. Missing for binary or very large files. */
  patch?: string;
}

/** Everything the reviewer is told about a change. */
export interface ReviewContext {
  source: "pr" | "branch" | "local";
  /** "owner/repo", when known. */
  repo: string | null;
  title: string;
  description: string;
  state: ChangeState;
  base: string;
  head: string;
  url?: string;
  author?: string;
  number?: number;
  /** Commit subjects, oldest first. */
  commits: string[];
  files: ChangedFile[];
  /** What the author says the change is meant to achieve. */
  goal?: string;
}

// --- Model output ------------------------------------------------------------------

const SEVERITY_ALIASES: Record<string, Severity> = {
  "must-fix": "must-fix",
  "must fix": "must-fix",
  mustfix: "must-fix",
  blocker: "must-fix",
  blocking: "must-fix",
  critical: "must-fix",
  high: "high",
  "high-risk": "high",
  "high risk": "high",
  major: "high",
  medium: "medium",
  "medium-risk": "medium",
  "medium risk": "medium",
  moderate: "medium",
  low: "low",
  "low-risk": "low",
  "low risk": "low",
  minor: "low",
  nit: "nit",
  nitpick: "nit",
  style: "nit",
  info: "nit",
};

export function normalizeSeverity(raw: unknown): Severity {
  const key = String(raw ?? "").trim().toLowerCase().replace(/_/g, "-");
  return SEVERITY_ALIASES[key] ?? SEVERITY_ALIASES[key.replace(/-/g, " ")] ?? "medium";
}

const text = (max: number) =>
  z.preprocess((v) => (v == null ? "" : typeof v === "string" ? v : JSON.stringify(v)), z.string().transform((s) => s.trim().slice(0, max)));

const FindingSchema = z.object({
  severity: z.unknown().transform(normalizeSeverity),
  category: text(40).default("bug"),
  title: text(200),
  file: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 400) : undefined), z.string().optional()),
  line: z.preprocess((v) => {
    const n = typeof v === "string" ? Number.parseInt(v, 10) : v;
    return typeof n === "number" && Number.isInteger(n) && n > 0 ? n : undefined;
  }, z.number().optional()),
  detail: text(4000),
  fix: text(4000),
});
export type Finding = z.infer<typeof FindingSchema>;

export const INTENT_VALUES = ["matches", "partial", "diverges", "unknown"] as const;

export const ModelReviewSchema = z.object({
  summary: text(4000),
  suggestedTitle: text(200),
  intent: z.preprocess(
    (v) => (INTENT_VALUES.includes(String(v).toLowerCase() as never) ? String(v).toLowerCase() : "unknown"),
    z.enum(INTENT_VALUES),
  ),
  intentNotes: text(2000).default(""),
  findings: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(FindingSchema).max(100)),
  testsToAdd: z.preprocess((v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []), z.array(z.string().max(500)).max(20)),
});
export type ModelReview = z.infer<typeof ModelReviewSchema>;

// --- Final result -----------------------------------------------------------------------

export interface ReviewVerdict {
  /** Every source file was reviewed, with no must-fix or high-risk issues. */
  safeToMerge: boolean;
  /** Safe, nothing medium-risk left, not a draft, and does what it set out to do. */
  readyToMerge: boolean;
  label: "Ready to merge" | "Safe to merge after follow-ups" | "Not safe to merge";
  /** Why it isn't ready, in plain words. Empty when ready. */
  blockers: string[];
  counts: Record<Severity, number>;
}

export interface ReviewResult {
  ok: true;
  model: string;
  change: {
    source: ReviewContext["source"];
    repo: string | null;
    title: string;
    state: ChangeState;
    base: string;
    head: string;
    url?: string;
    number?: number;
    filesChanged: number;
    additions: number;
    deletions: number;
    /** Not sent on purpose: lockfiles, generated output, binaries. */
    skippedFiles: string[];
    /** Source left out or cut short to fit the model's input limit. Their presence blocks "safe" and "ready". */
    unreviewedFiles: string[];
  };
  title: { current: string; suggested: string };
  summary: string;
  intent: { status: ModelReview["intent"]; notes: string };
  verdict: ReviewVerdict;
  /** Sorted most severe first. */
  findings: Finding[];
  testsToAdd: string[];
  /** One copy-paste prompt for any AI coding assistant that fixes every finding. Empty when there is nothing to fix. */
  fixPrompt: string;
}
