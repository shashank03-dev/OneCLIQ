import { ResolveError } from "../errors";
import { parseGitHubUrl } from "../parse-url";
import type { ReviewTarget } from "./types";

// Git ref rules, roughly: printable, no spaces, no "..", no leading "-" or "/", no ~^:?*[\ characters.
const REF_RE = /^(?!-)(?!\/)(?!.*\.\.)(?!.*\/\/)(?!.*@\{)[^\s\x00-\x1f\x7f~^:?*[\\]{1,250}(?<![./])$/;

function invalid(message: string): never {
  throw new ResolveError("INVALID_URL", message);
}

export function isValidRef(ref: string): boolean {
  return REF_RE.test(ref) && !ref.endsWith(".lock");
}

function ref(raw: string, what: string): string {
  const value = raw.trim();
  if (!isValidRef(value)) invalid(`That ${what} name isn't valid.`);
  return value;
}

/**
 * Read what to review from a link or shorthand:
 *
 * - `https://github.com/o/r/pull/12` (any /pull/12/... sub-page), or `o/r#12`
 * - `https://github.com/o/r/compare/base...head` or `/compare/head`
 * - `https://github.com/o/r/tree/branch` → that branch against the default branch
 * - `o/r` plus `head` (and optionally `base`) options
 */
export function parseReviewTarget(
  input: string,
  opts: { head?: string; base?: string; pr?: number; allowShorthand?: boolean } = {},
): ReviewTarget {
  const raw = (input ?? "").trim();
  if (!raw) invalid("Paste a GitHub pull request, compare or branch link.");
  if (raw.length > 2048) invalid("That link is too long.");

  const short = /^([^/\s#]+)\/([^/\s#]+)#(\d{1,9})$/.exec(raw);
  if (short && opts.allowShorthand) {
    const { owner, repo } = parseGitHubUrl(`${short[1]}/${short[2]}`, { allowShorthand: true });
    return { kind: "pr", owner, repo, number: Number(short[3]) };
  }

  const { owner, repo } = parseGitHubUrl(raw, { allowShorthand: opts.allowShorthand });

  if (/^(?:https?:\/\/)?(?:www\.)?github\.com\//i.test(raw)) {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const segs = url.pathname.split("/").filter(Boolean).map((s) => decodeURIComponent(s));
    const [, , section, ...rest] = segs;
    if (section === "pull" || section === "pulls") {
      const n = Number(rest[0]);
      if (!Number.isInteger(n) || n < 1) invalid("That pull request link doesn't include a PR number.");
      return { kind: "pr", owner, repo, number: n };
    }
    if (section === "compare") {
      const spec = rest.join("/");
      if (!spec) invalid("That compare link doesn't name a branch.");
      const [left, right] = spec.includes("...") ? spec.split("...") : spec.includes("..") ? spec.split("..") : [undefined, spec];
      // Fork compares ("owner:branch") aren't supported; the reviewer reads one repository.
      if ((left && left.includes(":")) || right.includes(":")) invalid("Comparing across forks isn't supported. Open a pull request and review that instead.");
      return { kind: "branch", owner, repo, head: ref(right, "branch"), ...(left ? { base: ref(left, "base branch") } : {}) };
    }
    if (section === "tree" && rest.length) {
      return { kind: "branch", owner, repo, head: ref(rest.join("/"), "branch"), ...(opts.base ? { base: ref(opts.base, "base branch") } : {}) };
    }
  }

  if (opts.pr) return { kind: "pr", owner, repo, number: opts.pr };
  if (opts.head) {
    return { kind: "branch", owner, repo, head: ref(opts.head, "branch"), ...(opts.base ? { base: ref(opts.base, "base branch") } : {}) };
  }
  invalid("Point at a pull request (…/pull/12 or owner/repo#12) or a branch (…/tree/branch or …/compare/main...branch).");
}
