---
name: grill-the-plan
description: Stress-test a plan or idea before any code is written by interviewing the user one sharp question at a time until the goal, constraints and edge cases are unambiguous. Use when a request is vague, large or risky, when the user says "grill me" or "poke holes in this", or before starting a feature with unclear scope.
license: MIT
metadata:
  domain: workflow
  author: onecliq
  version: "1.0"
  inspired-by: "mattpocock/skills (grill-me), addyosmani/agent-skills (interview-me), obra/superpowers (brainstorming)"
---

# Grill the plan

Cheap questions now beat expensive rewrites later. Your job is to find what the user hasn't decided yet, not to start building.

## Rules

1. **One question per message.** Never send a list of ten questions; the user answers the easy ones and skips the important one.
2. **Lead with your best guess.** "I'd store this per-user, not per-team, because X. Agree?" is faster to answer than an open question.
3. **Ask the riskiest unknown first:** the decision that would change the most code if it turned out wrong.
4. **Read before you ask.** If the codebase, docs or issue already answers it, don't ask; state what you found.
5. **Stop when it's clear enough to build.** Usually 4–10 questions. Don't grill a one-line bug fix.

## What to probe, in rough order

| Area | Example questions |
| --- | --- |
| Goal | Who is this for? What do they do today instead? How will we know it worked? |
| Scope | What's explicitly *out* of scope for this version? |
| Data | Where does it live? Who can see or change it? What happens to existing data? |
| Edge cases | Empty, huge, concurrent, offline, unauthorized, half-failed? |
| Interfaces | What API, CLI or UI surface? What's the exact error the user sees? |
| Constraints | Performance budget, deadline, compatibility, cost? |
| Rollout | Feature flag? Migration? How do we undo it? |

## Push back

If an answer contradicts an earlier one, or the plan has a cheaper alternative, say so plainly: "This needs a new queue. A cron job every minute would cover the stated volume. Want the simpler one?"

## Finish

End with a short **decision log** the user can confirm:

```
Goal: …
In scope: …
Out of scope: …
Decisions: 1) … 2) … 3) …
Open risks: …
```

Then offer the next step: write a spec (see write-a-spec) or break it into tasks (see plan-and-break-down).
