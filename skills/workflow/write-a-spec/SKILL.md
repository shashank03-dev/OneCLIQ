---
name: write-a-spec
description: Turn a conversation, issue or rough idea into a short, testable spec (or PRD) - problem, users, behaviour, acceptance criteria, non-goals and open questions - that an engineer or coding agent can implement without guessing. Use before building a feature, when asked for a spec, PRD or design brief, or when requirements live only in chat.
license: MIT
metadata:
  domain: workflow
  author: onecliq
  version: "1.0"
  inspired-by: "mattpocock/skills (to-spec, to-prd), addyosmani/agent-skills (spec-driven-development)"
---

# Write a spec

A spec is done when someone who wasn't in the conversation could build the right thing and know when they're finished.

## Before writing

- Collect what exists: the thread, linked issues, related code, previous decisions.
- If key decisions are missing, ask (see grill-the-plan) rather than inventing them. Mark anything you assumed as **Assumption**.

## Template (keep it to 1–2 pages)

```markdown
# <Feature name>

## Problem
Who has the problem, what it costs them today, in 2–4 sentences. Include evidence (tickets, numbers) if you have it.

## Goals
- Measurable outcomes ("export finishes in < 10 s for 50k rows").

## Non-goals
- What this deliberately won't do, so nobody builds it.

## User-facing behaviour
Step-by-step flows, including error and empty states. Exact copy for important messages.

## Acceptance criteria
- [ ] Given <state>, when <action>, then <observable result>.
- [ ] …

## Technical notes
Data model changes, APIs, migrations, flags, dependencies. Only what constrains implementation.

## Risks and open questions
- Q: … (owner, due)
```

## Quality bar

- **Every acceptance criterion is checkable** by a test or a person in under a minute. "Fast", "intuitive" and "robust" are not criteria.
- **Behaviour over implementation.** Describe what the user sees; leave room for the implementer unless a constraint is real.
- **Edge cases are listed**, not implied: empty input, permission denied, partial failure, large data, concurrent edits.
- **Non-goals exist.** A spec with none hasn't decided its scope.
- No placeholder text, no "TBD" without an owner.

## After writing

Save it where the team keeps specs (e.g. `docs/specs/<feature>.md` or the issue body), then offer to break it into tasks (plan-and-break-down).
