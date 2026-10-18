---
name: test-driven-development
description: Build features and fix bugs test-first with the red-green-refactor loop - write one failing test for the next small behaviour, make it pass with the simplest code, then clean up. Use when implementing new logic, fixing a bug, when the user asks for TDD, or when working on code where correctness matters more than speed of typing.
license: MIT
metadata:
  domain: testing
  author: onecliq
  version: "1.0"
  inspired-by: "mattpocock/skills (tdd), obra/superpowers (test-driven-development), addyosmani/agent-skills (test-driven-development), Kent Beck"
---

# Test-driven development

## The loop

1. **Red.** Write one test for the next smallest behaviour. Run it. **Watch it fail for the right reason** (the assertion, not a typo or import error). A test you never saw fail proves nothing.
2. **Green.** Write the simplest code that passes. Hard-coding is fine at first; the next test will force generality.
3. **Refactor.** With the bar green, remove duplication and improve names in code *and* tests. Run tests after each change.
4. Commit, then pick the next behaviour.

Keep loops short: minutes, not hours.

## Choosing the next test

- Start from a list of behaviours (the test list). Add to it as you discover cases; don't write them all up front.
- Order: the simplest degenerate case (empty input) → the main happy path → variations → errors and edge cases.
- Each test should force exactly one new piece of logic. If making it pass needs a big jump, pick a smaller test.

## Writing the tests

- Test through the public interface, the way callers use it. Avoid testing private helpers directly.
- Name tests as behaviours: `rejects expired tokens`, not `test validate 3`.
- Use real objects and in-memory fakes; mock only slow or external boundaries (see write-unit-tests).
- One assertion idea per test; several `expect`s are fine if they check one outcome.

## Bugs

1. Reproduce the bug as a failing test at the lowest level that shows it.
2. Fix until it passes.
3. Keep the test: it's the regression guard.

## When TDD is the wrong tool

Spikes and prototypes where you don't yet know the shape (throw the spike away and TDD the real thing), pure layout/visual work, and glue code that only wires libraries together. Say so instead of writing ceremonial tests.

## Done when

All behaviours on the list have tests, every test was seen failing first, the suite is green, and the code was refactored after the last green.
