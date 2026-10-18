<div align="center">

# OneCLIQ

**Paste a GitHub link. Get the right file, an honest code review, or a smarter coding agent.**

[![CI](https://github.com/shashank03-dev/OneCLIQ/actions/workflows/ci.yml/badge.svg)](https://github.com/shashank03-dev/OneCLIQ/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/onecliq?label=npm%20%C2%B7%20onecliq)](https://www.npmjs.com/package/onecliq)
[![Agent Skills](https://img.shields.io/badge/agent%20skills-43-7c6cf0)](skills)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

### [👉 Open OneCLIQ](https://onecliq-eta.vercel.app) &nbsp;·&nbsp; [Start here](https://onecliq-eta.vercel.app/start) &nbsp;·&nbsp; [Download](https://onecliq-eta.vercel.app/download) &nbsp;·&nbsp; [Review](https://onecliq-eta.vercel.app/review) &nbsp;·&nbsp; [Skills](https://onecliq-eta.vercel.app/skills) &nbsp;·&nbsp; [CLI](https://onecliq-eta.vercel.app/cli)

<img src="src/app/opengraph-image.png" alt="OneCLIQ: the right download from any GitHub release" width="760">

</div>

---

## What is OneCLIQ?

OneCLIQ is a free, open-source helper for anyone who uses GitHub. You give it a GitHub link and it does one of three jobs:

| If you want to… | Use | What you get |
| --- | --- | --- |
| 📦 **Download an app or tool** from GitHub | [**Download**](https://onecliq-eta.vercel.app/download) | The one file built for your computer, a direct GitHub link, and proof of where it came from. |
| 🔍 **Check a pull request** before you merge it | [**Review**](https://onecliq-eta.vercel.app/review) | Problems ranked by risk, a clear “safe to merge?” answer, and one prompt that fixes everything. |
| 🧠 **Make your AI coding agent better** at a task | [**Skills**](https://onecliq-eta.vercel.app/skills) | Expert playbooks that Claude Code, Codex, Cursor and others follow on their own. |

It works in your browser with **no sign-up and nothing to install**. If you prefer the terminal, the same tools come in a command called `oqgit`.

---

## ⬇️ Download something right now

Click any link below. OneCLIQ detects your computer, picks the right file, and gives you a **Download** button that points straight at GitHub.

| App | What it is | Get it |
| --- | --- | --- |
| GitHub CLI | GitHub from your terminal | [**Download →**](https://onecliq-eta.vercel.app/download?repo=cli/cli) |
| Neovim | A fast, modern text editor | [**Download →**](https://onecliq-eta.vercel.app/download?repo=neovim/neovim) |
| ripgrep | Searches files very quickly | [**Download →**](https://onecliq-eta.vercel.app/download?repo=BurntSushi/ripgrep) |
| bat | `cat` with colours and line numbers | [**Download →**](https://onecliq-eta.vercel.app/download?repo=sharkdp/bat) |
| lazygit | A friendly screen for git | [**Download →**](https://onecliq-eta.vercel.app/download?repo=jesseduffield/lazygit) |
| uv | A very fast Python package manager | [**Download →**](https://onecliq-eta.vercel.app/download?repo=astral-sh/uv) |
| fzf | Fuzzy finder for anything | [**Download →**](https://onecliq-eta.vercel.app/download?repo=junegunn/fzf) |
| Starship | A good-looking shell prompt | [**Download →**](https://onecliq-eta.vercel.app/download?repo=starship/starship) |

**Want something else?** Use this link and swap in the project you want:

```
https://onecliq-eta.vercel.app/download?repo=OWNER/REPO
```

For example, `https://github.com/zellij-org/zellij` becomes [`…/download?repo=zellij-org/zellij`](https://onecliq-eta.vercel.app/download?repo=zellij-org/zellij). You can also paste a full release link, like `…/download?repo=https://github.com/cli/cli/releases/tag/v2.60.0`.

> [!NOTE]
> OneCLIQ never hosts, changes or installs files. The Download button always goes to the file on GitHub.

---

## How to use it

New here? The [**Start here**](https://onecliq-eta.vercel.app/start) page is a two-minute tour. The short version:

### 📦 Download the right file

1. Copy a project’s address from GitHub, e.g. `github.com/sharkdp/bat`.
2. Paste it into the box on the [Download page](https://onecliq-eta.vercel.app/download). Your system and chip are filled in for you.
3. Press **Find download**, then **Download**. Open **Trust report** if you want to see who built the file and whether it changed after release.

Already downloaded something from somewhere else? Drop it on the **Verify** box on the same page. OneCLIQ checks it byte-for-byte against the project’s own release, and only the file’s fingerprint leaves your computer.

### 🔍 Review a pull request

1. Copy a pull request link, like `github.com/owner/repo/pull/12`. A branch or compare link works too.
2. Paste it on the [Review page](https://onecliq-eta.vercel.app/review). Optionally say in one line what the change should do.
3. Read the verdict (**Ready to merge**, **Safe after follow-ups** or **Not safe to merge**) and the findings. Press **Copy** on the fix prompt and paste it into your coding agent.

Reviews are done by Google’s open **Gemma 4** model. The website reviews public repositories only. For private code, use `oqgit review` on your own machine.

### 🧠 Add skills to your coding agent

1. Search the [skill library](https://onecliq-eta.vercel.app/skills) for what you’re working on, like “flaky tests” or “database migrations”.
2. Pick your agent and copy the one-line command.
3. Run it in your project folder. Next time you ask your agent about that task, it uses the skill. No prompt pasting.

```bash
npx onecliq skills add systematic-debugging
```

---

## 💻 Use it from your terminal (optional)

Install `oqgit` once. You need [Node.js](https://nodejs.org) 20 or newer. No admin rights needed.

```bash
curl -fsSL https://onecliq-eta.vercel.app/install | sh    # macOS / Linux
```

```powershell
irm https://onecliq-eta.vercel.app/install | iex           # Windows PowerShell
```

```bash
npm install -g onecliq                                     # or with npm
```

Then try it:

```bash
oqgit sharkdp/bat              # download the right file for this computer
oqgit review 12                # review pull request 12 in this repo
oqgit skills                   # browse the skill library
oqgit                          # not sure? this opens a menu
```

Just want to try it without installing? Put `npx onecliq` in front instead, like `npx onecliq sharkdp/bat`. The install scripts are short and readable: [install.sh](public/install.sh) and [install.ps1](public/install.ps1).

## 🤖 Connect your coding agent (optional)

Add OneCLIQ once, then ask in plain words: *“find a skill for safe database migrations and install it.”*

```bash
claude mcp add oqgit -- npx -y onecliq mcp     # Claude Code
codex mcp add oqgit -- npx -y onecliq mcp      # Codex CLI
gemini mcp add oqgit npx -y onecliq mcp        # Gemini CLI
```

For Cursor or VS Code, add `{"command": "npx", "args": ["-y", "onecliq", "mcp"]}` as the `oqgit` server in `.cursor/mcp.json` or `.vscode/mcp.json`.

---

## Questions

**Do I need an account?** No. Nothing on the website needs a sign-up.

**Does “Recommended” mean a file is safe?** No. It means the file matches your computer. The trust report and malware check add evidence, but only install software you trust.

**What happens to my code during a review?** The pull request’s changes are sent to Google’s Gemini API, which runs Gemma 4. The website only accepts public repositories.

**Which coding agents work with the skills?** Claude Code, Codex CLI, Cursor, Gemini CLI, GitHub Copilot and OpenCode.

**Something broken?** [Open an issue](https://github.com/shashank03-dev/OneCLIQ/issues/new/choose).

---

## 🧠 The skill library

43 hand-written skills in 9 areas. Each is a plain `SKILL.md` that follows the open [Agent Skills](https://agentskills.io) standard.

| Area | Skills |
| --- | --- |
| **Workflow** | `grill-the-plan` · `write-a-spec` · `plan-and-break-down` · `systematic-debugging` · `verify-before-done` · `session-handoff` · `codebase-architecture` · `safe-refactoring` · `architecture-decision-records` |
| **Frontend** | `frontend-design` · `react-performance` · `web-performance` · `web-accessibility` · `micro-interactions` |
| **Backend** | `rest-api-design` · `postgres-best-practices` · `safe-database-migrations` · `idempotent-webhooks` |
| **DevOps** | `github-actions-ci` · `dockerfile-best-practices` · `release-binaries` · `pre-commit-guardrails` · `observability-instrumentation` |
| **Security** | `secure-code-review` · `auth-best-practices` · `secrets-hygiene` · `supply-chain-verify` |
| **Testing** | `test-driven-development` · `write-unit-tests` · `flaky-test-triage` · `playwright-e2e` · `exploratory-qa` |
| **AI engineering** | `gemma-4-prompting` · `llm-evals` · `mcp-server-builder` · `write-agent-skills` · `context-engineering` |
| **Git** | `pull-request-review` · `conventional-commits` · `git-recovery` · `git-worktrees` |
| **Languages** | `typescript-type-design` · `go-idioms` |

<details>
<summary><b>Skill commands and where skills are saved</b></summary>

```bash
oqgit skills                               # list everything, by area
oqgit skills search flaky tests            # search
oqgit skills show secure-code-review       # read one
oqgit skills add secure-code-review        # install one
oqgit skills add security                  # install a whole area
oqgit skills add llm-evals --agent claude,cursor --global
```

With no `--agent`, OneCLIQ uses the agents your project already has (otherwise Claude Code). It never overwrites a skill you’ve edited unless you pass `--force`.

| Agent | `--agent` | Project folder | `--global` folder |
| --- | --- | --- | --- |
| Claude Code | `claude` | `.claude/skills` | `~/.claude/skills` |
| Codex CLI | `codex` | `.agents/skills` | `~/.agents/skills` |
| Cursor | `cursor` | `.cursor/skills` | `~/.cursor/skills` |
| Gemini CLI | `gemini` | `.gemini/skills` | `~/.gemini/skills` |
| GitHub Copilot | `copilot` | `.github/skills` | `~/.copilot/skills` |
| OpenCode | `opencode` | `.opencode/skills` | `~/.config/opencode/skills` |

**Write your own:** create `skills/<area>/<name>/SKILL.md` (the `write-agent-skills` skill walks you through it), run `npm run skills:build`, and open a pull request. Skills inspired by public ones credit them in the [skills README](skills/README.md#credits).

</details>

<details>
<summary><b>All CLI commands</b></summary>

`oqgit help <command>` shows a command’s options; `oqgit help all` shows everything.

| Command | What it does |
| --- | --- |
| `oqgit owner/repo [os] [cpu]` | Download the right file. Add `@tag` for a specific release. |
| `oqgit info owner/repo` | Show every file in the release and what it was detected as. |
| `oqgit list` · `outdated` · `update` · `forget` | Manage files you’ve downloaded. |
| `oqgit trust` · `malware` · `verify` · `diff` | Where a file came from, known-malware check, check a local file, compare releases. |
| `oqgit lock owner/repo` · `sync` | Pin files for every platform in `oqgit.lock.json`; download this machine’s pinned files. |
| `oqgit review [12 \| link]` | Gemma 4 review of a pull request, a branch or this repo’s changes. `--strict` fails CI unless it’s safe to merge. |
| `oqgit skills [search\|show\|add]` | Browse, read and install agent skills. |
| `oqgit mcp` | Serve the tools to your coding agent over MCP. |
| `oqgit doctor` | System info, token status and GitHub API quota. |

**Exit codes:** `0` ok · `1` error · `2` bad usage · `3` no reliable file match · `4` a trust, verification, lock, malware or `--strict` review check failed.

**MCP tools:** `search_skills`, `get_skill`, `install_skill`, `resolve_release`, `release_trust`, `check_malware`, `release_diff`, `verify_file`, `lock_check`, plus `download_release` when started with `--allow-download`. Downloads are verified and never run.

</details>

<details>
<summary><b>How reviews work (Gemma 4)</b></summary>

- Findings are ranked **must fix**, **high**, **medium**, **low** or **nit**, each with a file, line, a concrete way it fails, and a fix.
- The merge verdict is calculated from the findings in code, so the same findings always give the same answer. A review that couldn’t see every file is never marked safe.
- `gemma-4-31b-it` reviews first; `gemma-4-26b-a4b-it` takes over when it’s busy. Keys rotate, rate-limited keys rest, and oversized diffs are trimmed with the skipped files marked as unreviewed, so it works on free-tier keys from [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

</details>

---

## For developers

<details>
<summary><b>Run it locally</b></summary>

You need Node.js 20.9+.

```bash
git clone https://github.com/shashank03-dev/OneCLIQ.git && cd OneCLIQ
npm ci
npm run dev                          # http://localhost:3000
npm run cli:dev -- skills            # run the CLI from source
npm run check                        # what CI runs: skills, lint, types, tests, builds
```

Everything below is optional. Copy [.env.example](.env.example) to `.env.local`.

| Variable | What it does |
| --- | --- |
| `GEMINI_API_KEYS` | One or more Gemini keys (comma-separated). Turns on reviews. |
| `GITHUB_TOKEN` | Raises GitHub’s limit from 60 to 5,000 requests an hour. Recommended in production. |
| `VIRUSTOTAL_API_KEY` | Turns on known-malware lookups. |
| `REVIEW_MODEL` · `REVIEW_FALLBACK_MODELS` | Defaults `gemma-4-31b-it` · `gemma-4-26b-a4b-it` (`none` turns fallbacks off). |
| `REVIEW_THINKING` | `minimal` (web default) or `high`. |
| `REVIEW_MAX_INPUT_TOKENS` · `REVIEW_RATE_LIMIT_PER_MIN` · `RESOLVE_RATE_LIMIT_PER_MIN` | Limits. |
| `NEXT_PUBLIC_SITE_URL` | Public URL for social previews (build time). |

The CLI reads `GITHUB_TOKEN`/`GH_TOKEN`, `VIRUSTOTAL_API_KEY`, `GEMINI_API_KEYS`/`GEMINI_API_KEY`, `OQGIT_REVIEW_MODEL`, `OQGIT_MIN_AGE`, `OQGIT_HOME` and `OQGIT_CLAMSCAN`.

Production deploys to Vercel from `main`. The CLI is published to npm as [`onecliq`](https://www.npmjs.com/package/onecliq): bump `cli/package.json`, run `npm run cli:publish`, then approve the staged version on npmjs.com.

</details>

<details>
<summary><b>How it’s built</b></summary>

```
 web app (Next.js) ─┐
 oqgit CLI ─────────┼──► src/core  (one engine, no framework code)
 MCP server ────────┘      ├─ resolve   link → release → file for this OS/CPU
                           ├─ trust · malware · verify · lockfile
                           ├─ review    GitHub diff → prompt → key pool → Gemma 4 → verdict
                           └─ skills    skills/**/SKILL.md → checked catalog → search · install
                                   │
                    GitHub API · Gemini API (Gemma 4) · VirusTotal
```

| Path | What lives there |
| --- | --- |
| `src/app/` | Pages (`/`, `/start`, `/download`, `/review`, `/skills`, `/cli`) and API routes |
| `src/components/` | UI; [DESIGN.md](DESIGN.md) describes the design system |
| `src/core/` | The shared engine: resolver, trust, malware, lockfile, review, skills |
| `cli/src/` | CLI commands, downloads, skill installer, MCP server |
| `skills/` | The skill library: `<area>/<name>/SKILL.md` |
| `tests/unit/`, `e2e/` | Vitest and Playwright tests |

</details>

<details>
<summary><b>HTTP API</b></summary>

| Route | Does |
| --- | --- |
| `GET /api/skills?q=&domain=` | Search the skill library (JSON) |
| `GET /api/skills/<name>` | One raw `SKILL.md` (`?download` to save it) |
| `POST /api/resolve` | `{"url","os","arch"}` → the recommended file |
| `POST /api/trust` · `/api/malware` | Trust report · known-malware check for that file |
| `POST /api/verify` | `{"repo","sha256"}` → the matching release file, if any |
| `POST /api/review` | `{"url","goal?"}` → findings, verdict and fix prompt |
| `GET /api/health` | Which features are switched on (never keys) |

POST routes take JSON up to 4 KB. Errors look like `{"ok": false, "error": {"code", "message"}}`; rate-limited replies include `Retry-After`.

</details>

## 🏆 Built for Hacktoberfest 2026 Hack Day Bengaluru

| Track | How OneCLIQ fits |
| --- | --- |
| **Best Use of Gemma 4** | Code review runs on `gemma-4-31b-it`, with the `gemma-4-26b-a4b-it` mixture-of-experts model as a fast fallback. A key pool makes it work on free quotas, and the merge verdict is computed from Gemma’s structured findings so it’s repeatable. |
| **Best Open-Source AI Project** | MIT licensed. 43 agent skills that follow the Agent Skills standard (checked in CI), an original zero-dependency MCP server, and a CLI that installs skills into six coding agents. |

## Security, contributing and license

- Tokens and keys stay on the server or your machine. The website only works with **public** repositories.
- Downloads must be HTTPS GitHub release files, and every redirect is checked. Malware lookups send only a fingerprint (SHA-256).
- Malware checks catch *known* malware only. File matching is by name, so unusual names can mean no recommendation; the release page is always linked.

Report security problems privately: see [SECURITY.md](SECURITY.md). New skills, bug reports and fixes are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

MIT licensed, skills included. Third-party notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md); the site adapts [DesignPass.dev](https://designpass.dev/components) components by [Ernest Liu](https://ernestliu.com).
