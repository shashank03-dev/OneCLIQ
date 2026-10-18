---
name: conventional-commits
description: Write clear commit messages and PR titles in the Conventional Commits format, split work into reviewable commits, and keep history useful for changelogs and bisecting. Use when committing, writing a PR title or description, squashing, or setting up commit linting and automated releases.
license: MIT
metadata:
  domain: git-workflow
  author: onecliq
  version: "1.0"
---

# Conventional commits

First check the repo's history (`git log --oneline -20`). If it doesn't use Conventional Commits, match its existing style instead.

## Format

```
<type>(<optional scope>): <imperative summary, ≤ 72 chars, no period>

<body: why the change was needed and what it does, wrapped at 72>

<footer: BREAKING CHANGE: …, Fixes #123, Co-authored-by: …>
```

| Type | Use for |
| --- | --- |
| `feat` | New user-visible behaviour (minor version) |
| `fix` | Bug fix (patch version) |
| `perf` | Faster, same behaviour |
| `refactor` | Code change with no behaviour change |
| `docs` / `test` / `build` / `ci` / `chore` | What it says |

Breaking change: `feat(api)!: drop v1 endpoints` plus a `BREAKING CHANGE:` footer explaining the migration.

## Writing the summary

- Imperative mood: "add", "fix", "remove", not "added" / "fixes".
- Say what changes for the user or the code, not what you did: `fix(resolve): pick arm64 asset on Apple Silicon`, not `fix: update match.ts`.
- The body explains **why**. The diff already shows what.

## Good commits

- One logical change per commit; it builds and tests pass on its own (so `git bisect` works).
- Separate refactors from behaviour changes.
- Don't mix formatting-only changes with logic.
- Before pushing, tidy with `git commit --fixup <sha>` and `git rebase --autosquash` (only on your own unshared branch).

## PR description template

```
## What
One-paragraph summary.

## Why
The problem or issue this solves (Fixes #123).

## How to test
Exact steps or commands.

## Notes
Risks, follow-ups, screenshots for UI.
```

## Automation

`commitlint` + a `commit-msg` hook enforces the format; `release-please` or `semantic-release` turn types into version bumps and changelogs.
