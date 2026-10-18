---
name: llm-evals
description: Build a small, repeatable evaluation set for an LLM feature - golden cases, code-based and model-graded checks, regression tracking across prompt or model changes. Use before changing a prompt or model in production, when output quality is "vibes-based", or when comparing two models or prompt versions.
license: MIT
metadata:
  domain: ai-engineering
  author: onecliq
  version: "1.0"
---

# LLM evals

If you can't measure a prompt change, you can't tell an improvement from a regression. Start small: 20 good cases beat 2,000 random ones.

## 1. Collect cases

Write a JSONL file, one case per line:

```json
{"id": "sqli-concat", "input": {"diff": "…"}, "expect": {"must_find": ["SQL injection"], "max_severity_at_least": "high"}, "tags": ["security"]}
```

Sources, in order of value: real failures users reported → tricky edge cases you know about → typical happy paths → adversarial inputs (prompt injection, empty input, huge input, other languages).

Keep 10–20% as a held-out set you never tune against.

## 2. Choose checks, cheapest first

| Check | Example | Cost |
| --- | --- | --- |
| Schema | Output parses and validates | Free |
| Exact / regex | Contains the file path; verdict is `unsafe` | Free |
| Set overlap | Found ≥ 80% of expected findings | Free |
| Reference similarity | Embedding similarity to a gold answer | Cheap |
| Model-graded | A judge model scores against a rubric | Costly; use for subjective quality only |

For model-graded checks: give the judge a rubric with concrete pass/fail criteria, ask for a reason before the score, use a different or stronger model than the one under test, and spot-check 10% of judgments by hand.

## 3. Run and compare

- Run every case against **baseline** and **candidate** (prompt v1 vs v2, model A vs B). Same temperature, several samples per case if temperature > 0.
- Report: pass rate per check and per tag, cases that flipped pass→fail (regressions), cost and latency.
- Save results with the prompt hash and model ID so runs are comparable over time.

```bash
node evals/run.mjs --prompt prompts/review.v2.md --model gemma-4-31b-it > runs/2026-10-18-v2.json
node evals/compare.mjs runs/baseline.json runs/2026-10-18-v2.json
```

## 4. Ship rules

- No prompt or model change merges if it regresses a previously passing case, unless the case is wrong (then fix the case, in the same PR, with a note).
- Every production bug becomes a new case before it's fixed.
- Run the suite in CI on prompt changes; nightly on model aliases that can change underneath you.

## Pitfalls

Overfitting to the eval set, judges that prefer longer answers, testing only English, and forgetting to measure latency and cost alongside quality.
