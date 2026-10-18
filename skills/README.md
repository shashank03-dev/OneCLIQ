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

## Credits

Topics were chosen from the most-installed developer skills on [skills.sh](https://skills.sh). The text here is our own; these public skills and books inspired specific entries (each `SKILL.md` names its sources in `metadata.inspired-by`):

- [mattpocock/skills](https://github.com/mattpocock/skills): grill-me, to-spec, to-tickets, triage, handoff, tdd, diagnosing-bugs, improve-codebase-architecture, setup-pre-commit, writing-great-skills, qa
- [obra/superpowers](https://github.com/obra/superpowers): brainstorming, writing-plans, systematic-debugging, verification-before-completion, test-driven-development, using-git-worktrees, writing-skills
- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) and [web-quality-skills](https://github.com/addyosmani/web-quality-skills): spec-driven-development, planning-and-task-breakdown, code-simplification, documentation-and-adrs, observability-and-instrumentation, context-engineering, performance
- [anthropics/skills](https://github.com/anthropics/skills): frontend-design, skill-creator, webapp-testing
- [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills): web-design-guidelines
- [supabase/agent-skills](https://github.com/supabase/agent-skills), [neondatabase/agent-skills](https://github.com/neondatabase/agent-skills): Postgres best practices
- [better-auth/skills](https://github.com/better-auth/skills), [clerk/skills](https://github.com/clerk/skills): auth best practices
- [samber/cc-skills-golang](https://github.com/samber/cc-skills-golang), [wshobson/agents](https://github.com/wshobson/agents): Go and TypeScript
- Books: John Ousterhout, *A Philosophy of Software Design*; Martin Fowler, *Refactoring*; Kent Beck, *Test-Driven Development*
