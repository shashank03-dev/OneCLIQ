# OneCLIQ skill library

Agent Skills for developers, following the [Agent Skills open standard](https://agentskills.io/specification). Each folder is `<domain>/<name>/SKILL.md`.

Install any of them into your coding agent:

```bash
npx onecliq skills                         # browse
npx onecliq skills add pull-request-review  # one skill (Claude Code by default)
npx onecliq skills add testing --agent cursor
```

Or browse them at [onecliq-eta.vercel.app/skills](https://onecliq-eta.vercel.app/skills).

## Adding a skill

1. Create `skills/<domain>/<name>/SKILL.md`. Frontmatter needs `name` (lowercase, hyphens, same as the folder), `description` (what it does and when to use it, ≤ 1024 characters), `license: MIT` and `metadata.domain`.
2. Keep it under 500 lines: a workflow, rules, pitfalls and a "done when" checklist work best.
3. Run `npm run skills:build` to validate it and regenerate `src/core/skills/catalog.json`.

All skills are MIT licensed.
