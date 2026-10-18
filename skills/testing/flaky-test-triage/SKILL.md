---
name: flaky-test-triage
description: Diagnose and fix tests that pass and fail intermittently - timing, shared state, ordering, randomness, network and environment differences. Use when a test fails in CI but passes locally, fails "sometimes", or when deciding whether to quarantine a test.
license: MIT
metadata:
  domain: testing
  author: onecliq
  version: "1.0"
---

# Flaky test triage

A flaky test is a real bug in the test or the code. Retrying hides it; find the nondeterminism.

## 1. Reproduce

- Run the single test in a loop until it fails: `for i in $(seq 50); do npx vitest run path -t "name" || break; done` (or `pytest --count=50` with pytest-repeat, `go test -count=50 -run Name`).
- If it never fails alone, run the **whole file**, then the whole suite with the CI's seed/order and parallelism.
- Throttle: `taskset -c 0` / fewer workers / CPU throttling in browsers. Slow machines expose races.
- Copy the CI environment: timezone (`TZ=UTC`), locale, Node/Python version, env vars.

## 2. Classify by symptom

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Fails only with other tests | Shared state: globals, singletons, DB rows, env vars, module cache, fake timers left on | Reset in `afterEach`; unique data per test; isolate the module |
| Fails on slow CI | Fixed `sleep`/timeouts, missing `await`, race with async work | Await the actual condition (`waitFor`, polling with timeout); add missing `await` |
| Fails near midnight / month end / in other TZ | Real clock and timezone | Freeze time, set TZ explicitly |
| Fails randomly with different data | Random IDs, unordered collections, `Set`/`Map`/dict order, unstable sort | Seed randomness; sort before comparing; compare as sets |
| Fails with network errors | Real HTTP calls | Mock the boundary or use a local fake server |
| E2E: element not found / detached | Acting before the UI is ready | Web-first assertions (`await expect(locator).toBeVisible()`), no fixed waits |
| Port in use / file exists | Parallel workers share resources | Random ports, per-worker temp dirs |

## 3. Fix and prove

- Fix the cause, then run the loop again (50–100 times) to show it's stable.
- If the code under test has the race (not just the test), fix the code and say so: that's a product bug.

## Quarantine (last resort)

Only if the fix will take time: skip with a linked issue and owner (`it.skip("… — flaky, see #123")`). Never add blanket retries to the whole suite. Track quarantined tests and remove them within a sprint.
