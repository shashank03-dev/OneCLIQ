import { SEVERITIES, SEVERITY_LABELS, type Finding, type ModelReview, type ReviewContext, type ReviewVerdict, type Severity } from "./types";

const RANK: Record<Severity, number> = Object.fromEntries(SEVERITIES.map((s, i) => [s, i])) as Record<Severity, number>;

export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => RANK[a.severity] - RANK[b.severity]);
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/**
 * The merge call is made here from the findings, not by the model, so the same issues always give the same answer.
 * Safe: everything reviewed, no must-fix or high-risk issues. Ready: safe, no medium-risk issues, open (not draft), and on-goal.
 */
export function computeVerdict(review: Pick<ModelReview, "findings" | "intent">, state: ReviewContext["state"], unreviewed = 0): ReviewVerdict {
  const counts = Object.fromEntries(SEVERITIES.map((s) => [s, 0])) as Record<Severity, number>;
  for (const f of review.findings) counts[f.severity]++;

  // A partial review can't vouch for code it never saw.
  const safeToMerge = counts["must-fix"] === 0 && counts.high === 0 && unreviewed === 0;
  const blockers: string[] = [];
  if (unreviewed) blockers.push(`${unreviewed === 1 ? "1 changed file wasn't" : `${unreviewed} changed files weren't`} fully reviewed (over the model's input limit)`);
  if (counts["must-fix"]) blockers.push(`${plural(counts["must-fix"], "must-fix issue")}`);
  if (counts.high) blockers.push(`${plural(counts.high, "high-risk issue")}`);
  if (counts.medium) blockers.push(`${plural(counts.medium, "medium-risk issue")} to address`);
  if (state === "draft") blockers.push("the pull request is still a draft");
  if (state === "closed") blockers.push("the pull request is closed");
  if (state === "merged") blockers.push("the pull request is already merged");
  if (review.intent === "diverges") blockers.push("the change doesn't do what its goal says");
  if (review.intent === "partial") blockers.push("the change only partly meets its goal");

  const readyToMerge = safeToMerge && blockers.length === 0;
  return {
    safeToMerge,
    readyToMerge,
    label: readyToMerge ? "Ready to merge" : safeToMerge ? "Safe to merge after follow-ups" : "Not safe to merge",
    blockers,
    counts,
  };
}

/** One prompt to paste into any AI coding assistant that fixes everything the review found. */
export function buildFixPrompt(ctx: ReviewContext, findings: Finding[], testsToAdd: string[] = []): string {
  if (findings.length === 0 && testsToAdd.length === 0) return "";
  const where =
    ctx.source === "pr"
      ? `pull request #${ctx.number} "${ctx.title}"${ctx.repo ? ` in ${ctx.repo}` : ""} (branch \`${ctx.head}\` → \`${ctx.base}\`)`
      : ctx.source === "branch"
        ? `branch \`${ctx.head}\`${ctx.repo ? ` in ${ctx.repo}` : ""} (compared with \`${ctx.base}\`)`
        : `my local changes on \`${ctx.head}\` (compared with \`${ctx.base}\`)`;

  const lines = [
    `A code review of ${where} found the issues below. Fix all of them in the codebase.`,
    "",
  ];
  if (ctx.goal?.trim()) lines.push(`Goal of the change: ${ctx.goal.trim()}`, "");
  else if (ctx.title) lines.push(`What the change is for: ${ctx.title}`, "");

  if (findings.length) {
    lines.push("Issues, most important first:", "");
    sortFindings(findings).forEach((f, i) => {
      const loc = f.file ? ` — \`${f.file}${f.line ? `:${f.line}` : ""}\`` : "";
      lines.push(`${i + 1}. [${SEVERITY_LABELS[f.severity].toUpperCase()}] ${f.title}${loc}`);
      if (f.detail) lines.push(`   Problem: ${f.detail}`);
      if (f.fix) lines.push(`   Fix: ${f.fix}`);
      lines.push("");
    });
  }
  if (testsToAdd.length) {
    lines.push("Tests to add:", ...testsToAdd.map((t) => `- ${t}`), "");
  }
  lines.push(
    "How to work:",
    "- Read each file before editing it, and confirm the issue is real. If one isn't, leave the code alone and say why.",
    "- Keep each fix minimal and in the existing style. Don't refactor unrelated code or change public behaviour beyond the fix.",
    "- Add or update tests for every bug you fix, then run the project's tests, linter and type checker.",
    "- Finish with a short list: each issue number, what you changed, and the files touched.",
  );
  return lines.join("\n");
}
