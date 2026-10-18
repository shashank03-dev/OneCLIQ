---
name: playwright-e2e
description: Write reliable Playwright end-to-end tests with role-based locators, web-first assertions, network mocking, fixtures and authentication reuse. Use when adding browser tests for a user flow, converting Cypress or Selenium tests, or fixing slow or flaky Playwright suites.
license: MIT
metadata:
  domain: testing
  author: onecliq
  version: "1.0"
---

# Playwright end-to-end tests

Test what a user does and sees. One test per user goal ("sign up", "check out"), not per component.

## Locators: in this order of preference

1. `page.getByRole("button", { name: "Find download" })`
2. `page.getByLabel("Repository URL")`
3. `page.getByText("Recommended")`, `getByPlaceholder`, `getByAltText`
4. `page.getByTestId("result-card")` when there's no accessible handle
5. CSS/XPath: avoid; they break on every redesign.

If a role locator doesn't work, the UI probably has an accessibility bug. Fix the markup.

## Assertions

Use web-first assertions that auto-wait and retry:

```ts
await expect(page.getByRole("status")).toHaveText(/Recommended/);
await expect(page.getByRole("link", { name: /Download/ })).toHaveAttribute("href", /github\.com/);
```

Never `waitForTimeout`. Never `expect(await locator.isVisible()).toBe(true)` (it doesn't retry).

## Example

```ts
import { test, expect } from "@playwright/test";

test("resolves a release for macOS arm64", async ({ page }) => {
  await page.route("**/api/resolve", (route) =>
    route.fulfill({ json: { recommendation: { status: "recommended", asset: { name: "bat-aarch64-apple-darwin.tar.gz" } } } }),
  );
  await page.goto("/");
  await page.getByLabel(/repository/i).fill("sharkdp/bat");
  await page.getByRole("button", { name: /find download/i }).click();
  await expect(page.getByText("bat-aarch64-apple-darwin.tar.gz")).toBeVisible();
});
```

## Structure

- **Mock third-party and slow APIs** with `page.route`; keep one smoke test against the real backend.
- **Auth once:** a setup project logs in and saves `storageState`; tests reuse it.
- **Fixtures** for repeated setup (`test.extend`) instead of `beforeEach` chains.
- **Isolated data:** each test creates what it needs with unique names; never depend on another test's leftovers.
- Run in parallel (`fullyParallel: true`); keep tests independent so that's safe.

## Debugging

`npx playwright test --ui`, `--debug`, or open the trace: set `trace: "on-first-retry"` in config, then `npx playwright show-trace`. The trace shows DOM snapshots, network and console at each step: read it before changing waits.

## CI

`npx playwright install --with-deps chromium`, upload `playwright-report/` as an artifact on failure, `retries: 2` in CI only, and treat any test that needed a retry as flaky (see the flaky-test-triage skill).
