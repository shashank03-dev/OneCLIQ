---
name: systematic-debugging
description: Find the root cause of a bug with a disciplined loop - reproduce, observe, form one hypothesis, test it, fix, and prove the fix - instead of guessing and patching symptoms. Use for any bug, failing test, crash, wrong output or "it works on my machine" problem, especially after a first fix attempt failed.
license: MIT
metadata:
  domain: workflow
  author: onecliq
  version: "1.0"
  inspired-by: "obra/superpowers (systematic-debugging), mattpocock/skills (diagnosing-bugs), addyosmani/agent-skills (debugging-and-error-recovery)"
---

# Systematic debugging

**No fix without a root cause.** If you can't explain why the bug happens, you haven't found it yet.

## The loop

1. **Reproduce.** Get a command, test or click-path that fails every time. Write it down. If it's intermittent, see flaky-test-triage.
2. **Read the actual error.** The full message and stack trace, top to bottom. Note the first frame in *our* code.
3. **Shrink it.** Remove inputs, steps and code until the smallest case still fails. Often this alone reveals the cause.
4. **Find the boundary.** Locate where values go from right to wrong:
   - add temporary logging or a debugger breakpoint at the midpoint and bisect the code path;
   - for regressions, `git bisect run <failing command>` finds the commit.
5. **One hypothesis at a time.** State it ("`parseDate` treats the string as local time"), predict what you'd see if it's true, then check. Don't change two things at once.
6. **Fix the cause**, not the symptom. A `try/catch` that hides the error or a special case for one input is a symptom patch.
7. **Prove it.** Add a regression test that failed before the fix and passes after. Run the wider suite.
8. **Clean up** the temporary logging.

## Questions that find bugs fast

- What changed recently? (`git log -p --since=…`, dependency bumps, config, data)
- What's different between where it works and where it fails? (env vars, versions, OS, timezone, data, permissions)
- Is the code I'm reading the code that's running? (build cache, stale bundle, wrong branch, wrong env)
- What assumption would have to be false for this output to happen?

## Stop and step back when

- Three fixes in a row failed: your mental model is wrong. Re-read the code path from the start and list your assumptions.
- The fix needs changes in many places: the bug may be in a shared abstraction or the design.

## Report

Root cause in one or two sentences, the evidence that proves it, the fix, and the regression test name.
