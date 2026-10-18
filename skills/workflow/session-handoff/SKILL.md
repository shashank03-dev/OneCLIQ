---
name: session-handoff
description: Write a compact handoff note so another person or a fresh agent session can continue the work without re-reading the whole history - goal, state, decisions, next steps and gotchas. Use when ending a session, when context is getting long, before switching tasks, or when the user says "hand this off" or "summarize where we are".
license: MIT
metadata:
  domain: workflow
  author: onecliq
  version: "1.0"
  inspired-by: "mattpocock/skills (handoff, claude-handoff)"
---

# Session handoff

The reader has none of your context. Give them exactly what they need to take the next action in the first five minutes.

## Gather

- `git status`, `git log --oneline -10`, current branch and whether it's pushed.
- The latest check results (tests, build) with real numbers.
- Open questions and decisions made during the session, including ones that were rejected and why.

## Write `HANDOFF.md` (or paste into the issue/PR)

```markdown
# Handoff: <task> (<date>)

## Goal
One or two sentences: what "done" looks like.

## State
- Branch: feat/upload-retry (pushed, PR #42 open, CI green)
- Done: retry with backoff, idempotency key, tests for both
- In progress: abort signal (src/upload/queue.ts, half-wired; tests not written)
- Not started: docs update

## Decisions
- Cap backoff at 30 s, not 60 (request timeout is 45 s).
- Rejected: retrying on 4xx - double-charges on 409.

## Next steps
1. Thread `signal` through retry() in src/upload/retry.ts:22.
2. Add test "stops retrying after abort".
3. Update docs/uploads.md.

## Gotchas
- `npm test` needs `REDIS_URL`; use `docker compose up redis` first.
- The flaky "progress events" test fails ~1/20 runs; unrelated (issue #77).

## How to verify
npm test && npm run build && node scripts/upload-demo.js --throttle
```

## Rules

- **Specific over complete:** file paths, line numbers, commands, IDs. No narrative of what you tried unless it saves the reader from repeating a dead end.
- State facts with their source ("CI green on a1b2c3d"), and flag anything unverified.
- Keep it under a screen. Link to the spec or PR for detail.
- Commit or push work in progress first if the next person can't otherwise see it, and say where it is.
