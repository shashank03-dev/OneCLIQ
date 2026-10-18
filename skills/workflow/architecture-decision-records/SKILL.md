---
name: architecture-decision-records
description: Record significant technical decisions as short Architecture Decision Records (ADRs) - context, options, decision and consequences - and keep project docs in sync with the code. Use when choosing a library, database, pattern or protocol, when reversing an earlier decision, or when someone asks "why is it built this way?".
license: MIT
metadata:
  domain: workflow
  author: onecliq
  version: "1.0"
  inspired-by: "addyosmani/agent-skills (documentation-and-adrs), Michael Nygard's ADR format"
---

# Architecture decision records

Code shows *what*; ADRs keep *why*. Write one when a decision is expensive to reverse or will surprise a future reader.

## When to write one

- Picking or replacing a framework, database, queue, auth provider or major library.
- Choosing a pattern the codebase will follow (error handling, module layout, API style).
- Accepting a known trade-off (consistency vs availability, speed vs cost).
- Reversing a previous ADR (write a new one that supersedes it).

Not for: small implementation details, anything a code comment explains better.

## Format (`docs/adr/0007-use-postgres-for-jobs.md`)

```markdown
# 7. Use Postgres for background jobs

Status: Accepted (2026-10-18) · Supersedes: — · Superseded by: —

## Context
What forces are at play: requirements, constraints, current pain, numbers.

## Options considered
1. Postgres + SKIP LOCKED: no new infra; ~1k jobs/s is enough.
2. Redis + BullMQ: faster, but a new service to run and back up.
3. Managed queue (SQS): durable, but vendor lock-in and local dev friction.

## Decision
Option 1, because …

## Consequences
+ One datastore to operate and back up.
− Job throughput capped around 1k/s; revisit if we pass 500/s sustained.
Follow-ups: add a jobs table migration, dashboard for queue depth.
```

## Rules

- Number sequentially; never edit an accepted ADR's decision. Supersede it instead and link both ways.
- Keep it to one page. Include the rejected options; they're the most useful part later.
- Link the ADR from the PR that implements it, and from the code at the main entry point if non-obvious.

## Keeping docs alive

- Update README/setup docs in the same PR as the behaviour change.
- Delete docs that are wrong rather than leaving them "for history" (git has history).
- Prefer docs that are checked: runnable examples, generated API references, CI that runs the README commands.
