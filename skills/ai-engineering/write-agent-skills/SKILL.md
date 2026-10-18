---
name: write-agent-skills
description: Write effective Agent Skills (SKILL.md) that coding agents load at the right time and follow reliably - trigger-rich descriptions, focused workflows, progressive disclosure with reference files and scripts, and testing with real tasks. Use when creating, improving or reviewing a skill, turning a repeated workflow or team playbook into a skill, or when an existing skill isn't triggering or being followed.
license: MIT
metadata:
  domain: ai-engineering
  author: onecliq
  version: "1.0"
  inspired-by: "anthropics/skills (skill-creator), mattpocock/skills (writing-great-skills, write-a-skill), obra/superpowers (writing-skills)"
---

# Write agent skills

Agents see only the `name` and `description` until a skill is triggered. The description decides whether it's used at all; the body decides whether it's used well.

## Structure (Agent Skills standard)

```
my-skill/
├── SKILL.md          # required: frontmatter + instructions
├── references/       # optional: detail loaded only when needed
├── scripts/          # optional: deterministic helpers the agent runs
└── assets/           # optional: templates, examples
```

```yaml
---
name: my-skill                # lowercase, hyphens, same as the folder, ≤ 64 chars
description: <what it does>. Use when <triggers>.   # ≤ 1024 chars
license: MIT
---
```

## The description

- Say **what** and **when**: concrete task phrases users actually type ("flaky test", "fails in CI", "PR review"), file types, tools and frameworks.
- Third person, specific, no marketing. "Helps with testing" never triggers; "Diagnose tests that pass and fail intermittently…" does.
- Include near-synonyms and the problem symptoms, not only the solution name.

## The body

- Lead with the **one rule** that matters most, then a numbered workflow.
- Write instructions, not essays: imperative steps, tables for decisions, checklists for "done".
- Include one concrete example of the expected output.
- Name pitfalls the agent would otherwise fall into, and what to do instead.
- Keep `SKILL.md` under ~500 lines. Move long reference material into `references/*.md` and say when to read each file.
- Put fragile or exact operations in `scripts/` (validation, conversions) so the agent runs code instead of improvising it.
- Don't restate what any competent agent already knows; spend words on your team's specifics and judgement calls.

## Test it

1. Write 3–5 realistic prompts that **should** trigger it and 2–3 that **shouldn't**.
2. Run them in a fresh session. Did it load? Did the agent follow each step? Where did it deviate?
3. Fix the description for triggering problems and the body for behaviour problems. Repeat.

## Review checklist

- [ ] `name` matches the folder and the naming rules
- [ ] Description has concrete triggers and is ≤ 1024 chars
- [ ] Workflow is numbered; there's a "done when" or output format
- [ ] Examples are correct and runnable
- [ ] No secrets, no machine-specific paths
- [ ] Tested on real prompts, including negative ones
