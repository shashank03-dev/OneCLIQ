---
name: github-actions-ci
description: Write fast, secure GitHub Actions workflows - caching, matrices, pinned actions, least-privilege tokens and safe handling of pull requests from forks. Use when creating or fixing a CI workflow, speeding up a slow pipeline, or reviewing .github/workflows for security.
license: MIT
metadata:
  domain: devops
  author: onecliq
  version: "1.0"
---

# GitHub Actions CI

## A good default workflow

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read            # least privilege; widen per job only when needed
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true  # stop stale runs on new pushes
jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@<full-commit-sha>   # v4
      - uses: actions/setup-node@<full-commit-sha> # v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

## Speed

- Cache dependencies with the setup action's `cache:` input before reaching for `actions/cache`.
- Run independent checks as parallel jobs; use `needs:` only for real dependencies.
- Use `paths` / `paths-ignore` filters so docs-only changes skip heavy jobs.
- Matrix only what you ship for (`os`, `node-version`), with `fail-fast: false` when you want every result.
- Set `timeout-minutes` on every job so hung runs don't burn 6 hours.

## Security

- **Pin third-party actions to a full commit SHA**, with the version in a comment. Tags can be moved.
- Set top-level `permissions: contents: read`; grant `write` per job.
- **Never** use `pull_request_target` together with checking out the PR's code: that runs untrusted code with secrets.
- Don't interpolate untrusted input (`${{ github.event.pull_request.title }}`, branch names, issue bodies) directly into `run:`. Pass it via `env:` and quote it: `run: echo "$TITLE"`.
- Secrets aren't available to fork PRs, by design. Don't work around it.
- Prefer OIDC (`id-token: write`) to long-lived cloud keys for deploys.
- Enable Dependabot for `github-actions` to keep pinned SHAs current.

## Debugging a failing run

1. Read the first error, not the last; later failures are often fallout.
2. Reproduce locally with the exact command from the step.
3. Re-run with debug logging (`ACTIONS_STEP_DEBUG=true` secret) if the environment differs.
4. Check whether a cache key collision or a newer runner image changed tool versions.
