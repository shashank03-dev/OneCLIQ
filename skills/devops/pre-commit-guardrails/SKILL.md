---
name: pre-commit-guardrails
description: Set up fast local guardrails - pre-commit hooks for formatting, linting, type checks, secret scanning and commit messages, plus agent-safe git rules - so bad commits are caught before CI. Use when setting up a new repo, adding Husky, lefthook or pre-commit, when CI keeps failing on things a hook could catch, or when letting coding agents commit.
license: MIT
metadata:
  domain: devops
  author: onecliq
  version: "1.0"
  inspired-by: "mattpocock/skills (setup-pre-commit, git-guardrails-claude-code)"
---

# Pre-commit guardrails

Hooks must be **fast** (a few seconds) and **only check staged files**, or people will skip them with `--no-verify`. Slow checks belong in CI.

## Pick the tool for the stack

| Stack | Tool |
| --- | --- |
| JS/TS | `husky` + `lint-staged`, or `lefthook` |
| Python / polyglot | `pre-commit` (pre-commit.com) |
| Go / Rust | `lefthook` or `pre-commit` |

## JS/TS setup (Husky + lint-staged)

```bash
npm i -D husky lint-staged
npx husky init
```

`.husky/pre-commit`:

```sh
npx lint-staged
```

`package.json`:

```json
"lint-staged": {
  "*.{ts,tsx,js}": ["eslint --fix", "prettier --write"],
  "*.{json,md,css,yml}": "prettier --write"
}
```

Add a `prepare` script (`"prepare": "husky"`) so hooks install on `npm install`.

## What to run where

| Check | pre-commit | pre-push | CI |
| --- | --- | --- | --- |
| Format + lint staged files | ✓ | | ✓ |
| Secret scan (`gitleaks protect --staged`) | ✓ | | ✓ |
| Commit message lint (`commitlint`) | commit-msg hook | | |
| Type check (whole project) | | ✓ | ✓ |
| Unit tests | | ✓ (affected only) | ✓ |
| E2E, build, security audit | | | ✓ |

## Guardrails for coding agents

When agents can run git, add rules (in `CLAUDE.md`/`AGENTS.md` and, where supported, as hooks or permission settings):

- Never `git push --force`, `git reset --hard`, `git clean -fd`, or `git checkout -- .` without explicit approval.
- Never commit with `--no-verify`.
- Never commit to `main` directly; work on a branch.
- Never commit `.env*` files or anything matching secret patterns.

## Rules

- Hooks fix what they can (formatters) and stage the fixes; they fail only on real problems.
- Keep hook config in the repo so everyone gets the same checks.
- Every hook check also runs in CI: hooks are a convenience, CI is the gate.
