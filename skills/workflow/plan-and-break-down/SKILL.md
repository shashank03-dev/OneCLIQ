---
name: plan-and-break-down
description: Break a feature or spec into small, ordered, independently verifiable tasks or tickets, each with a clear done condition and the files it touches. Use when starting multi-step work, turning a spec into issues or a checklist, triaging a backlog, or when a task feels too big to start.
license: MIT
metadata:
  domain: workflow
  author: onecliq
  version: "1.0"
  inspired-by: "mattpocock/skills (to-tickets, to-issues, triage), obra/superpowers (writing-plans), addyosmani/agent-skills (planning-and-task-breakdown)"
---

# Plan and break down

Good tasks are small enough to finish and verify in one sitting, and ordered so the system works after each one.

## Steps

1. **Read the spec and the code.** Find where the change lands: entry points, data model, tests. List the files you expect to touch.
2. **Slice vertically.** Each task delivers a thin, working path through the stack (schema → API → UI for one case) rather than "all the backend" then "all the frontend".
3. **Order by risk and dependency.** Unknowns and foundations first (migrations, interfaces), polish last. Mark which tasks can run in parallel.
4. **Size check.** If a task needs more than ~300 changed lines or more than a few hours, split it again.
5. **Write each task** with the template below.

## Task template

```markdown
### 3. Return 409 when the slug already exists
Why: duplicate slugs currently 500 (see spec AC-4).
Files: src/api/projects.ts, src/db/projects.ts, tests/api/projects.test.ts
Do:
- Catch the unique-violation error in createProject and map it to ConflictError.
- Add the error to the API error table.
Done when:
- [ ] New test "rejects duplicate slug with 409" passes
- [ ] Existing project tests pass
Depends on: 1
```

## Triage an existing backlog

For each item decide: **do now** (blocks users or other work), **next** (valuable, ready), **later** (needs a decision), or **close** (duplicate, obsolete, won't do; say why). Ask for missing reproduction steps instead of guessing.

## Rules

- Every task has a **done when** that can be checked by running something.
- Include test and docs work inside the task it belongs to, not as a final "write tests" task.
- Put migrations and breaking changes in their own tasks.
- Keep the plan in a file (`PLAN.md`, issue checklist) and tick tasks off as you go, so a new session can pick up where you left off.
