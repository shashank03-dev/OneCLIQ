---
name: context-engineering
description: Give coding agents and LLM features the right context and nothing more - project instruction files (CLAUDE.md, AGENTS.md), retrieval, compaction, subagents and prompt structure - to get accurate results with fewer tokens. Use when writing or improving AGENTS.md/CLAUDE.md, when an agent keeps making the same mistakes, when long sessions degrade, or when designing what an LLM feature sends to the model.
license: MIT
metadata:
  domain: ai-engineering
  author: onecliq
  version: "1.0"
  inspired-by: "addyosmani/agent-skills (context-engineering), mattpocock/skills (writing-for-agents), multica-ai/andrej-karpathy-skills"
---

# Context engineering

Models do what their context makes likely. Too little context → guesses; too much → the important part gets lost.

## Project instruction files (AGENTS.md / CLAUDE.md)

Include only what an agent can't quickly infer and gets wrong without:

```markdown
# Project notes for agents
## Commands
- Test one file: `npx vitest run path`; all checks: `npm run check`
## Conventions
- Server code in src/server; never import it from components.
- Money is integer cents everywhere.
## Gotchas
- `npm test` needs Redis: `docker compose up -d redis`.
- Don't edit generated files in src/gen/ - run `npm run gen`.
```

- Short (under ~200 lines). Commands, conventions, gotchas, where things live.
- Every line earns its place: when the agent makes a repeated mistake, add one line that prevents it; remove lines that no longer apply.
- Nest files per package in monorepos instead of one giant root file.

## In a working session

- **Point, don't paste:** give file paths, error messages and the exact failing command; let the agent read what it needs.
- **Start fresh for new tasks.** Unrelated history is noise. Carry over a handoff note (see session-handoff) instead of the whole transcript.
- **Delegate exploration** (broad searches, log reading) to a subagent that returns a short summary, so the main context stays focused.
- **Write state to files** (plans, decisions, todo lists) so it survives compaction and new sessions.

## In LLM features you build

- Order: stable instructions first (cacheable), then retrieved context, then the user's input, then the question.
- Label and fence each block (`<doc source="…">`); tell the model untrusted blocks are data, not instructions.
- Retrieve narrowly: the top few relevant chunks with sources beats the whole document. Measure retrieval quality separately from answer quality.
- Budget tokens explicitly: trim least-relevant context first, and tell the model (and user) what was left out.
- Prefer structured output with a schema; compute decisions in code from validated fields.

## Signs the context is wrong

Same mistake repeated → missing instruction. Confident wrong facts about the codebase → stale or missing file reads. Ignored instructions late in a session → context too long; compact or restart. Contradictory behaviour → conflicting instructions; find and remove one.
