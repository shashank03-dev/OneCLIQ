---
name: verify-before-done
description: Prove work is finished before saying so - run the tests, build, linters and the real feature, and report results with evidence instead of claims. Use before telling the user a task is complete, before committing or opening a PR, and whenever you are about to write "this should work".
license: MIT
metadata:
  domain: workflow
  author: onecliq
  version: "1.0"
  inspired-by: "obra/superpowers (verification-before-completion), juliusbrussee/caveman (verify-and-stop)"
---

# Verify before done

"Done" means verified, not written. If you didn't run it, say you didn't run it.

## Checklist

1. **Re-read the request.** List every thing the user asked for. Check each one off against what you actually changed.
2. **Run the project's checks,** using its own commands (look in `package.json` scripts, `Makefile`, CI config):
   - type check / compile
   - lint
   - unit tests (at least the affected ones, ideally the whole suite)
   - build
3. **Exercise the change for real.** Run the CLI command, call the endpoint, open the page and click through the flow, including one error case.
4. **Read the diff** (`git diff`) end to end. Look for debug logs, commented-out code, unrelated edits, secrets and TODOs you meant to resolve.
5. **Check what you didn't touch but could have broken:** callers of changed functions, other platforms, migrations, docs that describe the old behaviour.

## Reporting

Report what's true, with evidence:

```
Done: added retry to uploads.
Verified: npm test (212 passed), npm run build OK, uploaded a file with the network throttled - retried twice and succeeded.
Not verified: Windows path handling (no Windows machine here).
```

- Quote real output (counts, exit codes), not "tests pass" from memory.
- If something failed, say so first, with the error, and whether you fixed it.
- If you skipped a step, name it and why.

## Never

- Claim success based on code that "looks right".
- Disable, skip or loosen a failing test to get green without saying so.
- Mark a task complete while a check you know about is failing.
