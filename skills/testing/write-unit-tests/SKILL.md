---
name: write-unit-tests
description: Write focused, readable unit tests that catch real regressions - choosing cases, naming, arrange/act/assert, fakes over mocks, and table-driven tests. Use when adding tests for new or untested code, fixing a bug (write the failing test first), or improving a weak test suite in Vitest, Jest, pytest, Go or similar.
license: MIT
metadata:
  domain: testing
  author: onecliq
  version: "1.0"
---

# Write unit tests

A good test fails for exactly one reason and its name tells you which.

## Before writing

1. Find the existing test file and framework for this module; match its style, helpers and fixtures.
2. Read the code and list its **behaviours**, not its lines: inputs → outputs, errors, side effects.
3. For a bug fix, write the test that reproduces the bug first and watch it fail.

## Choosing cases

For each behaviour, pick from:

- **Happy path:** the common case.
- **Boundaries:** empty, one, many; 0, -1, max; first/last element; exactly at a limit.
- **Invalid input:** wrong type, missing field, malformed string; assert the specific error.
- **State and order:** called twice, called after close, concurrent calls if relevant.
- **Regression:** the exact input from the bug report.

Skip trivial getters and code that only wires framework pieces together.

## Shape

```ts
describe("parseGitHubUrl", () => {
  it.each([
    ["https://github.com/a/b", { owner: "a", repo: "b" }],
    ["https://github.com/a/b/releases/tag/v1", { owner: "a", repo: "b", tag: "v1" }],
  ])("parses %s", (input, expected) => {
    expect(parseGitHubUrl(input)).toMatchObject(expected);
  });

  it("rejects non-GitHub hosts", () => {
    expect(() => parseGitHubUrl("https://gitlab.com/a/b")).toThrow(/github\.com/);
  });
});
```

- Name: `does X when Y`. Avoid `test1`, `works`, `should work correctly`.
- Arrange / act / assert, separated by a blank line. One act per test.
- Assert outcomes the caller can see, not private internals or call counts, unless the call *is* the behaviour (e.g. "sends one email").

## Test doubles

- Prefer **real objects** and **in-memory fakes** (a fake repository, a fake clock) to mocks.
- Mock only at boundaries you don't own: network, filesystem, time, randomness.
- Inject dependencies (constructor or function args) instead of patching module internals.
- Freeze time (`vi.useFakeTimers()`, `freezegun`) instead of sleeping.

## Done when

- [ ] Each test fails if the behaviour it names breaks (try breaking the code once)
- [ ] Tests are independent and pass in any order
- [ ] No real network, no sleeps, runs in milliseconds
- [ ] Suite passes locally with the project's test command
