---
name: pull-request-review
description: Review a pull request like a senior engineer - check it meets its goal, find real bugs ranked by risk, give a merge verdict and a single fix prompt. Use when asked to review a PR, a branch or a diff, or before merging your own change.
license: MIT
metadata:
  domain: git-workflow
  author: onecliq
  version: "1.0"
compatibility: Optional - `npx onecliq review` runs the same review with Gemma 4 (needs GEMINI_API_KEY).
---

# Pull request review

## 1. Understand the intent

Read the PR title, description and linked issue. Write one sentence: "This PR should …". If you can't, ask the author before reviewing code.

## 2. Read the diff in the right order

1. Tests and schema/API changes (they show intended behaviour).
2. Core logic.
3. Wiring, config, generated files (skim).

For every changed function, open the full file: bugs often live in the code around the diff (callers, error paths, the other branch of an `if`).

## 3. Look for, in priority order

- **Correctness:** wrong conditions, off-by-one, null/undefined, unhandled errors and rejections, race conditions, wrong async ordering, missing `await`.
- **Security:** see the secure-code-review skill (injection, authz, SSRF, secrets).
- **Data:** migrations that lock or lose data, backwards-incompatible API or storage changes.
- **Goal:** does the change actually do what the PR says? Anything missing?
- **Tests:** do they test the new behaviour, and would they fail without the change?
- **Simplicity:** duplicated logic, dead code, an existing helper that should be reused.

Ignore pure style that a linter or formatter should handle.

## 4. Write findings

Rank each one:

| Severity | Meaning |
| --- | --- |
| must fix | Breaks something or is a security hole. Blocks merge. |
| high | Likely bug in a real scenario. |
| medium | Edge-case bug or meaningful maintainability problem. |
| low | Minor issue worth fixing. |
| nit | Optional polish. |

Each finding: `file:line`, what's wrong, a **concrete scenario** where it fails (input → wrong result), and a specific fix. No scenario, no finding.

## 5. Verdict

- **Ready to merge:** no findings above low.
- **Safe after follow-ups:** only medium/low that can land in a later PR.
- **Not safe to merge:** any must-fix or high, or you couldn't see all the changed files.

## 6. Hand off

End with one fix prompt the author can paste into a coding agent: every must-fix and high finding with file, line and fix, in order.

To run this with Gemma 4: `npx onecliq review` (this branch), `npx onecliq review 12` (PR 12), or `--strict` in CI to fail unless safe to merge.
