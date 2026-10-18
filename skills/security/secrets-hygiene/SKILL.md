---
name: secrets-hygiene
description: Keep API keys, tokens and passwords out of code, logs, client bundles and git history, and respond correctly when one leaks. Use when adding a new secret or env var, setting up .env files, reviewing for hard-coded credentials, or after a key was committed or exposed.
license: MIT
metadata:
  domain: security
  author: onecliq
  version: "1.0"
---

# Secrets hygiene

## Where secrets live

- **Local:** `.env` / `.env.local`, listed in `.gitignore`. Commit a `.env.example` with names and empty or fake values.
- **CI:** the CI's secret store (GitHub Actions secrets, environments with required reviewers for production).
- **Production:** the platform's secret manager or env vars (Vercel, AWS Secrets Manager, Doppler, 1Password, Vault).
- **Never:** source code, Dockerfiles, `ARG`/`ENV` in images, client-side bundles, URLs, issue comments, chat.

## Client-side exposure

Anything prefixed for the browser (`NEXT_PUBLIC_`, `VITE_`, `REACT_APP_`, `PUBLIC_`) ships to every visitor. Only publishable keys belong there. Server keys go through a server route.

## Code rules

- Read secrets once at startup into a validated config object; fail fast with a clear message if one is missing.
- Never log a secret, a full `Authorization` header, or a full request config. Redact in the logger.
- Error messages and stack traces sent to clients must not contain env values.
- Prefer short-lived credentials (OIDC from CI, scoped tokens, expiring keys) over long-lived ones.
- Scope every token to the minimum: read-only, single repo, single bucket.

## Detection

- Pre-commit: `gitleaks protect --staged` or `trufflehog git file://. --since-commit HEAD`.
- Repo: enable GitHub secret scanning and push protection.
- Review diffs for high-entropy strings and known prefixes: `sk-`, `ghp_`, `github_pat_`, `AKIA`, `xoxb-`, `AIza`, `-----BEGIN`.

## If a secret leaked

Act in this order; deleting the commit is **not** enough because it's already been copied.

1. **Revoke / rotate** the secret at the provider immediately.
2. **Deploy** the new secret everywhere it's used.
3. **Check usage logs** at the provider for activity since the leak.
4. **Remove it from history** if the repo is public or shared (`git filter-repo`), then force-push and ask collaborators to re-clone. This is cleanup, not mitigation.
5. **Add a guard** (pre-commit hook or push protection) so it can't recur.

Tell the user which step they're on and what's left. Don't skip rotation because "the repo is private".
