<div align="center">

# OneCLIQ

**The right download from any GitHub release, a Gemma 4 pull request reviewer, and a skill library for your coding agent.**

[![CI](https://github.com/shashank03-dev/OneCLIQ/actions/workflows/ci.yml/badge.svg)](https://github.com/shashank03-dev/OneCLIQ/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/onecliq?label=npm%20%C2%B7%20onecliq)](https://www.npmjs.com/package/onecliq)
[![Agent Skills](https://img.shields.io/badge/agent%20skills-43-7c6cf0)](skills)
[![Gemma 4](https://img.shields.io/badge/reviews%20by-Gemma%204-e5582b)](#-review-pull-requests-with-gemma-4)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[**Open the app**](https://onecliq-eta.vercel.app) · [**Browse skills**](https://onecliq-eta.vercel.app/skills) · [**Review a PR**](https://onecliq-eta.vercel.app/review) · [**Install the CLI**](#-quick-start)

<img src="src/app/opengraph-image.png" alt="OneCLIQ: the right download from any GitHub release" width="760">

</div>

---

## What it does

| | | |
| --- | --- | --- |
| 📦 **Get the right file** | Paste a GitHub link. OneCLIQ picks the release file built for your OS and CPU, checks where it came from, and looks it up for known malware. | [Web](https://onecliq-eta.vercel.app) · `oqgit owner/repo` |
| 🔍 **Review a pull request** | Gemma 4 ranks issues by risk, gives each one a failure scenario and a fix, decides if it's safe to merge, and writes one fix prompt for your agent. | [Web](https://onecliq-eta.vercel.app/review) · `oqgit review` |
| 🧠 **Teach your agent** | 43 hand-written [Agent Skills](https://agentskills.io) in 9 domains. One command installs them into Claude Code, Codex, Cursor, Gemini CLI, Copilot or OpenCode. | [Web](https://onecliq-eta.vercel.app/skills) · `oqgit skills` |

Everything runs on one open-source engine, shared by the web app, the `oqgit` CLI, and an MCP server for coding agents.

## 🚀 Quick start

```bash
npx onecliq skills                        # browse the skill library
npx onecliq skills add pull-request-review # install a skill for your coding agent
npx onecliq sharkdp/bat                    # download the right file for this computer
npx onecliq review 12                      # Gemma 4 review of PR 12 in this repo
```

Install it for good (the command is `oqgit`):

```bash
curl -fsSL https://onecliq-eta.vercel.app/install | sh   # macOS / Linux
irm https://onecliq-eta.vercel.app/install | iex          # Windows PowerShell
npm install -g onecliq                                    # or with npm
```

The installers are short and readable ([install.sh](public/install.sh), [install.ps1](public/install.ps1)), need Node.js 20+, and never ask for sudo.

## 🏆 Built for Hacktoberfest 2026 Hack Day Bengaluru

| Track | How OneCLIQ fits |
| --- | --- |
| **Best Use of Gemma 4** | Code review runs on `gemma-4-31b-it`, with the `gemma-4-26b-a4b-it` mixture-of-experts model as a fast fallback. A key pool rotates free-tier keys, rests rate-limited ones and trims oversized diffs so it works on free quotas. The merge verdict is computed from Gemma's structured findings, so it's deterministic. |
| **Best Open-Source AI Project** | MIT licensed. Ships 43 agent skills that follow the [Agent Skills open standard](https://agentskills.io/specification) (validated in CI), an original zero-dependency MCP server, and a CLI that installs skills into six coding agents. |

---

## 🧠 Skill library

Skills are folders with a `SKILL.md`: instructions a coding agent loads when the task matches. Ours are written like a senior engineer's checklist: a workflow, the rules, the pitfalls, and a "done when" list.

| Domain | Skills |
| --- | --- |
| **Workflow** | `grill-the-plan` · `write-a-spec` · `plan-and-break-down` · `systematic-debugging` · `verify-before-done` · `session-handoff` · `codebase-architecture` · `safe-refactoring` · `architecture-decision-records` |
| **Frontend** | `frontend-design` · `react-performance` · `web-performance` · `web-accessibility` · `micro-interactions` |
| **Backend** | `rest-api-design` · `postgres-best-practices` · `safe-database-migrations` · `idempotent-webhooks` |
| **DevOps** | `github-actions-ci` · `dockerfile-best-practices` · `release-binaries` · `pre-commit-guardrails` · `observability-instrumentation` |
| **Security** | `secure-code-review` · `auth-best-practices` · `secrets-hygiene` · `supply-chain-verify` |
| **Testing** | `test-driven-development` · `write-unit-tests` · `flaky-test-triage` · `playwright-e2e` · `exploratory-qa` |
| **AI engineering** | `gemma-4-prompting` · `llm-evals` · `mcp-server-builder` · `write-agent-skills` · `context-engineering` |
| **Git workflow** | `pull-request-review` · `conventional-commits` · `git-recovery` · `git-worktrees` |
| **Languages** | `typescript-type-design` · `go-idioms` |

The topics follow what developers install most on [skills.sh](https://skills.sh): planning and grilling, TDD, systematic debugging, verification and handoffs sit at the top of its leaderboard. Every skill here is original text (MIT); skills inspired by public ones credit them in `metadata.inspired-by` and in the [skills README](skills/README.md#credits).

### Add skills from the terminal

```bash
oqgit skills                               # list everything, by domain
oqgit skills search flaky tests            # search
oqgit skills show secure-code-review       # read one
oqgit skills add secure-code-review        # install one
oqgit skills add security                  # install a whole domain
oqgit skills add llm-evals --agent claude,cursor --global
```

`add` writes `<agent folder>/<name>/SKILL.md`. With no `--agent`, it uses the agents your project already has (else Claude Code). It never overwrites a skill you've edited unless you pass `--force`.

| Agent | `--agent` | Project folder | `--global` folder |
| --- | --- | --- | --- |
| Claude Code | `claude` | `.claude/skills` | `~/.claude/skills` |
| Codex CLI | `codex` | `.agents/skills` | `~/.agents/skills` |
| Cursor | `cursor` | `.cursor/skills` | `~/.cursor/skills` |
| Gemini CLI | `gemini` | `.gemini/skills` | `~/.gemini/skills` |
| GitHub Copilot | `copilot` | `.github/skills` | `~/.copilot/skills` |
| OpenCode | `opencode` | `.opencode/skills` | `~/.config/opencode/skills` |

### Or let your agent find skills itself (MCP)

```bash
claude mcp add oqgit -- npx -y onecliq mcp     # Claude Code
codex mcp add oqgit -- npx -y onecliq mcp      # Codex CLI
gemini mcp add oqgit npx -y onecliq mcp        # Gemini CLI
```

For Cursor or VS Code, add `{"command": "npx", "args": ["-y", "onecliq", "mcp"]}` as the `oqgit` server in `.cursor/mcp.json` or `.vscode/mcp.json`.

Then just ask: *"find a skill for safe database migrations and install it."* The agent calls `search_skills`, reads the match with `get_skill`, and saves it with `install_skill`.

### Write a skill

1. Create `skills/<domain>/<name>/SKILL.md` with `name` (same as the folder), `description` (what it does **and when to use it**), `license` and `metadata.domain`. The `write-agent-skills` skill walks through it.
2. Run `npm run skills:build`. It checks every skill against the standard and regenerates the catalog.
3. Open a PR. CI runs `npm run skills:check`.

---

## 🔍 Review pull requests with Gemma 4

Paste a PR, a `/tree/branch` link or a `/compare/a...b` link on the [review page](https://onecliq-eta.vercel.app/review), or run `oqgit review` in a repo. You get:

- **Findings ranked by risk** (*must fix*, *high*, *medium*, *low*, *nit*), each with file, line, a concrete failure scenario and a fix.
- **A merge verdict** (*Ready to merge*, *Safe after follow-ups*, *Not safe to merge*), computed from the findings. A review that couldn't see every file is never marked safe.
- **A goal check**, a suggested PR title, and **one fix prompt** to paste into any coding agent.

```bash
oqgit review                    # this branch vs its base
oqgit review 12                 # PR 12 in this repo
oqgit review owner/repo#12 --goal "retry failed uploads"
oqgit review --strict           # exit code 4 unless safe to merge (for CI)
```

**Models.** `gemma-4-31b-it` first; `gemma-4-26b-a4b-it` when the primary is rate limited or overloaded. Get free keys at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and set `GEMINI_API_KEYS` (one or many, comma-separated).

**Free-tier friendly.** Reviews rotate across keys, rest a key that hits its quota (per model), bench invalid keys, and fall back to the faster model. If a diff is over the per-minute token cap, it's trimmed and the skipped files are marked unreviewed.

**Privacy.** The diff is sent to Google's Gemini API. The web app reviews public repositories only; use `oqgit review` for private code.

---

## 📦 Get the right download

Paste a repo or release link on the [web app](https://onecliq-eta.vercel.app). It detects your OS and CPU and shows:

- **The recommended file** with a direct GitHub link, or **Not recommended** with the reason (it never guesses between ambiguous names).
- **A trust report**: build attestations, GitHub's SHA-256 digest, immutable releases, re-uploads after publishing, release age and size jumps.
- **A known-malware check**: the file's SHA-256 looked up on VirusTotal.

In the terminal, `oqgit owner/repo` downloads the file, checks its size and SHA-256 against GitHub, and remembers it for `oqgit update`. Already have a file? Drop it on the web verifier (only its hash leaves your browser) or run `oqgit verify ./file owner/repo`.

> [!IMPORTANT]
> A recommendation is about compatibility, not safety. Malware checks find *known* malware only. OneCLIQ never installs or runs anything.

---

## CLI reference

`oqgit` with no arguments opens a menu. `oqgit help <command>` shows a command's options; `oqgit help all` shows everything.

| Command | What it does |
| --- | --- |
| `oqgit owner/repo [os] [cpu]` | Download the right file (same as `oqgit get`). Add `@tag` for a specific release. |
| `oqgit info owner/repo` | Show every file in the release and what it was detected as. |
| `oqgit list` · `outdated` · `update` · `forget` | Manage tracked downloads. |
| `oqgit trust` · `malware` · `verify` · `diff` | Provenance, known-malware check, verify a local file, compare releases. |
| `oqgit lock owner/repo` · `sync` | Pin files for every platform in `oqgit.lock.json`; download this machine's pinned files. |
| `oqgit review [12 \| link]` | Gemma 4 review of a PR, a branch or this repo's changes. |
| `oqgit skills [search\|show\|add]` | Browse, read and install agent skills. |
| `oqgit mcp` | MCP server over stdio for coding agents. |
| `oqgit doctor` | System info, token status and GitHub API quota. |

**Exit codes:** `0` ok · `1` error · `2` bad usage · `3` no reliable file match · `4` a trust, verification, lock, malware or `--strict` review policy failed.

**MCP tools:** `search_skills`, `get_skill`, `install_skill`, `resolve_release`, `release_trust`, `check_malware`, `release_diff`, `verify_file`, `lock_check`, plus `download_release` when started with `--allow-download`. Downloads are verified and never executed; `install_skill` only creates new files unless asked to overwrite.

## HTTP API

| Route | Does |
| --- | --- |
| `GET /api/skills?q=&domain=` | Search the skill library (JSON) |
| `GET /api/skills/<name>` | One raw `SKILL.md` (`?download` to save it) |
| `POST /api/resolve` | `{"url","os","arch"}` → the recommended file |
| `POST /api/trust` · `/api/malware` | Trust report · known-malware check for that file |
| `POST /api/verify` | `{"repo","sha256"}` → the matching release file, if any |
| `POST /api/review` | `{"url","goal?"}` → findings, verdict and fix prompt |
| `GET /api/health` | Which features are configured (never keys) |

```bash
curl -s https://onecliq-eta.vercel.app/api/skills/git-recovery > .claude/skills/git-recovery/SKILL.md
```

POST routes take JSON up to 4 KB. Errors are `{"ok": false, "error": {"code", "message"}}` with a matching status; rate-limited replies include `Retry-After`.

## Configuration

Everything is optional. Copy [.env.example](.env.example) to `.env.local` for local development.

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEYS` | One or more Gemini keys. Turns on reviews. |
| `GITHUB_TOKEN` | Raises GitHub's API limit from 60 to 5,000 requests/hour. Recommended in production. |
| `VIRUSTOTAL_API_KEY` | Turns on known-malware hash lookups. |
| `REVIEW_MODEL` · `REVIEW_FALLBACK_MODELS` | Defaults `gemma-4-31b-it` · `gemma-4-26b-a4b-it` (`none` turns fallbacks off). |
| `REVIEW_THINKING` | `minimal` (web default, fits the time limit) or `high`. |
| `REVIEW_MAX_INPUT_TOKENS` · `REVIEW_RATE_LIMIT_PER_MIN` · `RESOLVE_RATE_LIMIT_PER_MIN` | Limits. |
| `NEXT_PUBLIC_SITE_URL` | Public URL for social previews (build time). |

The CLI reads `GITHUB_TOKEN`/`GH_TOKEN`, `VIRUSTOTAL_API_KEY`, `GEMINI_API_KEYS`/`GEMINI_API_KEY`, and `OQGIT_REVIEW_MODEL`, `OQGIT_MIN_AGE`, `OQGIT_HOME`, `OQGIT_CLAMSCAN`.

## How it works

```
 web app (Next.js) ─┐
 oqgit CLI ─────────┼──► src/core  (one framework-free engine)
 MCP server ────────┘      ├─ resolve   parse link → pick release → match file to OS/CPU
                           ├─ trust · malware · verify · lockfile
                           ├─ review    GitHub diff → prompt → key pool → Gemma 4 → verdict
                           └─ skills    skills/**/SKILL.md → validated catalog → search · install
                                   │
                    GitHub API · Gemini API (Gemma 4) · VirusTotal
```

| Path | What lives there |
| --- | --- |
| `skills/` | The skill library: `<domain>/<name>/SKILL.md` |
| `scripts/build-skills.mjs` | Validates skills against the Agent Skills spec, builds `src/core/skills/catalog.json` |
| `src/core/` | Resolver, trust, malware, lockfile, `review/` (Gemma client, key pool, verdict), `skills/` |
| `src/app/`, `src/components/` | Pages, API routes and UI ([DESIGN.md](DESIGN.md) has the design system) |
| `cli/src/` | CLI commands, downloads, skill installer, MCP server |
| `tests/unit/`, `e2e/` | Vitest and Playwright tests |

## Development

Requires Node.js 20.9+.

```bash
git clone https://github.com/shashank03-dev/OneCLIQ.git && cd OneCLIQ
npm ci
npm run dev                          # http://localhost:3000
npm run cli:dev -- skills            # run the CLI from source
npm run check                        # what CI runs: skills, lint, types, tests, builds
```

Production deploys to Vercel from `main`. The CLI is published to npm as [`onecliq`](https://www.npmjs.com/package/onecliq): bump `cli/package.json`, run `npm run cli:publish`, then approve the staged version on npmjs.com.

## Security and limits

- Tokens and keys stay on the server (or your machine). The web app only ever serves **public** repositories.
- Downloads must be HTTPS GitHub release assets; every redirect is checked. Malware lookups send only a SHA-256.
- File matching is name-based: unusual names can mean no recommendation (the release page is always linked).
- Malware checks catch known malware only. Rate limits and caches are per server instance.

Report vulnerabilities privately: see [SECURITY.md](SECURITY.md).

## Contributing and license

New skills, bug reports and fixes are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). MIT licensed, skills included. Third-party notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md); the site adapts [DesignPass.dev](https://designpass.dev/components) components by [Ernest Liu](https://ernestliu.com).
