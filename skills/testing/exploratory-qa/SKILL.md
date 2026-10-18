---
name: exploratory-qa
description: Run a structured exploratory QA pass on a feature or app like a skilled tester - charters, heuristics for breaking things, cross-browser and device checks - and file clear, reproducible bug reports. Use before a release or demo, after a large change lands, when asked to "QA this" or "try to break it", or when automated tests pass but confidence is low.
license: MIT
metadata:
  domain: testing
  author: onecliq
  version: "1.0"
  inspired-by: "mattpocock/skills (qa), anthropics/skills (webapp-testing), addyosmani/agent-skills (browser-testing-with-devtools)"
---

# Exploratory QA

Automated tests check what you expected. Exploratory testing finds what you didn't.

## 1. Charter

Write a one-line mission per session (30–60 min): "Explore **checkout** with **unusual carts** to discover **pricing and validation bugs**." Note the build/commit and environment.

## 2. Tour the feature with heuristics

| Heuristic | Try |
| --- | --- |
| Input extremes | Empty, whitespace, 10k characters, emoji, RTL text, `<script>`, `'; DROP`, leading zeros, negative, decimal commas |
| Boundaries | Exactly at limits, one over, one under; first/last page; zero items, one item, many |
| Interruptions | Refresh mid-flow, back button, double-click submit, close tab, network offline then online, slow 3G |
| State | Two tabs at once, expired session, logged out, different roles, stale data |
| Order | Do steps out of order; skip optional steps; deep-link into the middle |
| Environment | Chrome, Safari, Firefox; iOS and Android widths; 200% zoom; dark mode; keyboard only; screen reader |
| Time | Timezones, DST changes, midnight, leap day, very old or future dates |

Watch the console and network panel the whole time: errors, 4xx/5xx, slow requests, duplicate calls.

## 3. Report each bug so it can be fixed without you

```markdown
**Title:** Checkout total ignores discount after changing quantity
**Severity:** High (customer overcharged)
**Env:** prod build a1b2c3d, Safari 18, iPhone 15
**Steps:**
1. Add item A, apply code SAVE10
2. Change quantity to 2
**Expected:** total = 2 × price − 10%
**Actual:** discount removed; total = 2 × price
**Evidence:** screenshot, console log, HAR
**Frequency:** 5/5
```

One bug per report. Minimal steps. Expected vs actual. Severity by user impact, not effort.

## 4. Wrap up

Summarise: what was covered, what wasn't, bugs found by severity, and areas that felt risky but showed nothing (worth an automated test). Turn the important bugs into regression tests (see playwright-e2e).
