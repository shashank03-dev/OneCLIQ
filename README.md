<div align="center">

# OneCLIQ

**Paste a GitHub link. Get the right download, an honest code review, or a smarter coding agent.**

[![CI](https://github.com/shashank03-dev/OneCLIQ/actions/workflows/ci.yml/badge.svg)](https://github.com/shashank03-dev/OneCLIQ/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/onecliq?label=npm%20%C2%B7%20onecliq)](https://www.npmjs.com/package/onecliq)
[![Agent Skills](https://img.shields.io/badge/agent%20skills-44-7c6cf0)](skills)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[**Open OneCLIQ**](https://onecliq-eta.vercel.app) · [Start here](https://onecliq-eta.vercel.app/start) · [Download](https://onecliq-eta.vercel.app/download) · [Review](https://onecliq-eta.vercel.app/review) · [Skills](https://onecliq-eta.vercel.app/skills) · [CLI](https://onecliq-eta.vercel.app/cli)

<img src="src/app/opengraph-image.png" alt="OneCLIQ: the right download from any GitHub release" width="760">

</div>

---

## Contents

1. [What is OneCLIQ?](#what-is-onecliq)
2. [Download something right now](#download-something-right-now)
3. [Share a download link or embed a button](#share-a-download-link-or-embed-a-button)
4. [How to use the website](#how-to-use-the-website)
5. [Use it from your terminal](#use-it-from-your-terminal)
6. [Connect your coding agent (MCP)](#connect-your-coding-agent-mcp)
7. [The skill library](#the-skill-library)
8. [How reviews work](#how-reviews-work)
9. [Questions](#questions)
10. [For developers](#for-developers)
11. [Security, contributing and license](#security-contributing-and-license)

---

## What is OneCLIQ?

OneCLIQ is a free, open-source helper for anyone who uses GitHub. You give it a GitHub link and it does one of three jobs:

| If you want to… | Use | What you get |
| --- | --- | --- |
| Download an app or tool from GitHub | [Download](https://onecliq-eta.vercel.app/download) | The one file built for your computer, a direct GitHub link, and evidence of where it came from. |
| Check a pull request before you merge it | [Review](https://onecliq-eta.vercel.app/review) | Problems ranked by risk, a clear "safe to merge?" answer, and one prompt that fixes everything. |
| Make your AI coding agent better at a task | [Skills](https://onecliq-eta.vercel.app/skills) | Expert playbooks that Claude Code, Codex, Cursor and others follow on their own. |

The website needs **no sign-up and nothing to install**. If you prefer the terminal, the same tools come as a command called `oqgit` (npm package: `onecliq`).

---

## Download something right now

Click any link below. OneCLIQ detects your computer, picks the right file, and gives you a **Download** button that points straight at GitHub.

| App | What it is | Get it |
| --- | --- | --- |
| GitHub CLI | GitHub from your terminal | [Download](https://onecliq-eta.vercel.app/download?repo=cli/cli) |
| Neovim | A fast, modern text editor | [Download](https://onecliq-eta.vercel.app/download?repo=neovim/neovim) |
| ripgrep | Searches files very quickly | [Download](https://onecliq-eta.vercel.app/download?repo=BurntSushi/ripgrep) |
| bat | `cat` with colours and line numbers | [Download](https://onecliq-eta.vercel.app/download?repo=sharkdp/bat) |
| lazygit | A friendly screen for git | [Download](https://onecliq-eta.vercel.app/download?repo=jesseduffield/lazygit) |
| uv | A very fast Python package manager | [Download](https://onecliq-eta.vercel.app/download?repo=astral-sh/uv) |
| fzf | Fuzzy finder for anything | [Download](https://onecliq-eta.vercel.app/download?repo=junegunn/fzf) |
| Starship | A good-looking shell prompt | [Download](https://onecliq-eta.vercel.app/download?repo=starship/starship) |

**Want something else?** Use this link and replace `OWNER/REPO` with the project you want:

```
https://onecliq-eta.vercel.app/download?repo=OWNER/REPO
```

For example, `https://github.com/zellij-org/zellij` becomes [`…/download?repo=zellij-org/zellij`](https://onecliq-eta.vercel.app/download?repo=zellij-org/zellij). A full release link works too, such as `…/download?repo=https://github.com/cli/cli/releases/tag/v2.60.0`.

> [!NOTE]
> OneCLIQ never hosts, changes or installs files. The Download button always goes to the file on GitHub.

---

## Share a download link or embed a button

After you find a download, open **Share or embed this download** to copy a link, an HTML button, or a Markdown badge. There are two kinds of link.

**1. One-tap link (detects the visitor's computer)**

```
https://onecliq-eta.vercel.app/get/OWNER/REPO
```

This opens OneCLIQ, detects the visitor's computer and starts the download of the latest stable release. If detection is incomplete, or the visitor is on a phone, they pick their system first. A visible Download button lets them retry if their browser blocks automatic downloads. They then open the downloaded installer or archive to finish installing.

**2. Direct link (for one specific system)**

```
https://onecliq-eta.vercel.app/api/download?repo=OWNER/REPO&os=windows&arch=x64
```

This finds the latest stable release and redirects straight to the matching file on GitHub.

| `os` | Allowed `arch` values |
| --- | --- |
| `windows` | `x64`, `arm64`, `x86` |
| `macos` | `arm64`, `x64` |
| `linux` | `x64`, `arm64`, `x86` |

**Embed a button**

HTML:

```html
<a href="https://onecliq-eta.vercel.app/get/cli/cli"><img src="https://onecliq-eta.vercel.app/download-badge.svg" alt="Download cli/cli with OneCLIQ" width="196" height="36"></a>
```

Markdown:

```markdown
[![Download cli/cli with OneCLIQ](https://onecliq-eta.vercel.app/download-badge.svg)](https://onecliq-eta.vercel.app/get/cli/cli)
```

**Good to know**

- Shared links always track the **latest stable** release, even if you created them while looking at an older tag or a prerelease.
- Release information from GitHub is cached for five minutes. The redirect itself is never cached.
- If no file reliably matches the requested system, the direct link returns HTTP `422` instead of guessing.
- Self-hosting: set `NEXT_PUBLIC_SITE_URL` to your HTTPS address before building. Without it, links use whatever address the browser is on. No database or extra DNS setup is needed.

---

## How to use the website

New here? The [Start here](https://onecliq-eta.vercel.app/start) page is a two-minute tour. The short version follows.

### Download the right file

1. Copy a project's address from GitHub, for example `github.com/sharkdp/bat`.
2. Paste it into the box on the [Download page](https://onecliq-eta.vercel.app/download). Your system and chip are filled in for you.
3. Press **Find download**, then **Download**. Open **Trust report** to see who built the file and whether it changed after release.

Already downloaded a file from somewhere else? Drop it on the **Verify** box on the same page. OneCLIQ checks it byte-for-byte against the project's own release. Only the file's fingerprint (SHA-256) leaves your computer, never the file.

### Review a pull request

1. Copy a pull request link, like `github.com/owner/repo/pull/12`. A branch or compare link works too.
2. Paste it on the [Review page](https://onecliq-eta.vercel.app/review). Optionally describe in one line what the change should do.
3. Read the verdict (**Ready to merge**, **Safe after follow-ups** or **Not safe to merge**) and the findings. Press **Copy** on the fix prompt and paste it into your coding agent.

Reviews are done by Google's open **Gemma 4** model. The website reviews public repositories only. For private code, run `oqgit review` on your own machine.

### Add skills to your coding agent

1. Search the [skill library](https://onecliq-eta.vercel.app/skills) for what you are working on, like "flaky tests" or "database migrations".
2. Pick your agent and copy the one-line command.
3. Run it in your project folder. The next time you ask your agent about that task, it uses the skill automatically.

```bash
npx onecliq skills add systematic-debugging
```

---

## Use it from your terminal

This part is optional. Install `oqgit` once; you need [Node.js](https://nodejs.org) 20 or newer, and no admin rights.

macOS or Linux:

```bash
curl -fsSL https://onecliq-eta.vercel.app/install | sh
```

Windows (PowerShell):

```powershell
irm https://onecliq-eta.vercel.app/install | iex
```

Or with npm directly:

```bash
npm install -g onecliq
```

The install scripts are short and readable: [install.sh](public/install.sh) and [install.ps1](public/install.ps1). To try it without installing, put `npx onecliq` in front of any command, such as `npx onecliq sharkdp/bat`.

### First commands

```bash
oqgit sharkdp/bat     # download the right file for this computer
oqgit review 12       # review pull request 12 in this repo
oqgit skills          # browse the skill library
oqgit                 # not sure? this opens a menu
```

### All commands

Run `oqgit help <command>` for a command's options, or `oqgit help all` for everything. Most commands accept `--json` for machine-readable output.

| Command | What it does |
| --- | --- |
| `oqgit owner/repo [os] [cpu]` | Download the right file. Add `@tag` for a specific release, `--min-age 3d` to skip very new releases. |
| `oqgit info owner/repo` | Show every file in the release and what it was detected as. |
| `oqgit list` · `outdated` · `update` · `forget` | Manage files you have downloaded. |
| `oqgit trust owner/repo` | How much evidence backs the file it would pick: release age, digests, attestations, re-uploads. `--fail-under <0-100>` for CI. |
| `oqgit malware owner/repo` | Known-malware check (VirusTotal; `--local` scans with ClamAV). |
| `oqgit verify <file> [owner/repo]` | Check that a file on your disk really came from a project's releases. |
| `oqgit diff owner/repo [from] [to]` | Compare the files in two releases (by default, the latest stable and the one before). |
| `oqgit lock owner/repo` · `sync` | Pin files for every platform in `oqgit.lock.json`, then download this machine's pinned files. |
| `oqgit review [12 \| link]` | Gemma 4 review of a pull request, a branch, or this repo's changes. `--strict` fails CI unless it is safe to merge. |
| `oqgit skills [search \| show \| add]` | Browse, read and install agent skills. |
| `oqgit mcp` | Serve these tools to your coding agent over MCP. |
| `oqgit doctor` | System info, token status and GitHub API quota. |

**Exit codes**

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | Error |
| `2` | Bad usage |
| `3` | No reliable file match |
| `4` | A trust, verification, lock, malware or `--strict` review check failed |

**Environment variables (CLI)**

| Variable | What it does |
| --- | --- |
| `GITHUB_TOKEN` or `GH_TOKEN` | Raises GitHub's rate limit. |
| `GEMINI_API_KEY` / `GEMINI_API_KEYS` / `GOOGLE_API_KEY` | Keys for `oqgit review`. Several keys rotate when one is rate limited. |
| `OQGIT_REVIEW_MODEL` · `OQGIT_REVIEW_FALLBACK_MODELS` | Change the review model and its fallbacks (`none` turns fallbacks off). |
| `OQGIT_REVIEW_MAX_INPUT_TOKENS` | Trim large diffs to fit a token budget. |
| `VIRUSTOTAL_API_KEY` | Turns on known-malware lookups. |
| `OQGIT_CLAMSCAN` | Path to a ClamAV `clamscan` binary. |
| `OQGIT_MIN_AGE` | Default for `--min-age`. |
| `OQGIT_HOME` | Folder where `oqgit` keeps its record of downloads. |

More detail is in the [CLI README](cli/README.md).

---

## Connect your coding agent (MCP)

Connect once, then ask your coding agent: **"Use oqgit to review https://github.com/owner/repo/pull/12."** Public PR reviews using your agent's own model do not need a Gemini key. You need Node.js 20+ and a coding agent with MCP support.

**Release status:** the new MCP review tools, `review` prompt and `onecliq-review` skill are available in this source tree. The published npm package, `onecliq@0.2.0`, does not include them yet. Pushing to GitHub does not publish a new npm release.

### Quick start from source

Build the CLI:

```bash
git clone https://github.com/shashank03-dev/OneCLIQ.git
cd OneCLIQ
npm ci
npm run cli:build
```

If you already have this checkout, run `npm ci` and `npm run cli:build` from its root. Then choose **one** registration command, while still in that directory:

| Agent | Registration command (macOS/Linux) |
| --- | --- |
| Claude Code | `claude mcp add oqgit -- node "$PWD/cli/dist/oqgit.mjs" mcp` |
| Codex CLI | `codex mcp add oqgit -- node "$PWD/cli/dist/oqgit.mjs" mcp` |
| Gemini CLI | `gemini mcp add oqgit node "$PWD/cli/dist/oqgit.mjs" mcp` |

In PowerShell, use `"$($PWD.Path)/cli/dist/oqgit.mjs"` for the bundle path. The registration command stores its absolute location, so keep the checkout there.

For Cursor, merge this into `.cursor/mcp.json`, replacing the bundle path with your actual absolute path:

```json
{ "mcpServers": { "oqgit": { "command": "node", "args": ["/absolute/path/to/OneCLIQ/cli/dist/oqgit.mjs", "mcp"] } } }
```

VS Code uses the same server entry under `servers` in `.vscode/mcp.json` instead of `mcpServers`.

Refresh the agent session and enable oqgit in its tools picker where required. Check that **`review_change` and `get_review_context`** are available, then send the review request above. If those tools are missing, check that the server launches the newly built bundle rather than the npm release. Existing release and skill tools are also available.

### Request a review from your agent

| Client | Invocation after connecting |
| --- | --- |
| Claude Code | `/oqgit:review https://github.com/owner/repo/pull/12` (also `/mcp__oqgit__review …`) |
| Gemini CLI | `/review https://github.com/owner/repo/pull/12` (check `/help` for conflicts with other servers) |
| Codex | Install the shortcut below, then `$onecliq-review https://github.com/owner/repo/pull/12` or select it in `/skills` |
| Cursor / VS Code | Enable oqgit's tools, then ask “Use oqgit to review this PR: …” |

For the optional tagged Codex shortcut, run this **in the project you want to review**, replacing the bundle path:

```bash
node /absolute/path/to/OneCLIQ/cli/dist/oqgit.mjs skills add onecliq-review --agent codex
```

Refresh the agent's skills afterward. Use `--agent claude` to install the Claude shortcut `/onecliq-review`. Plain-language requests do not require installing a skill.

These commands follow each host's [Claude MCP prompt](https://code.claude.com/docs/en/mcp#use-mcp-prompts-as-commands), [Gemini MCP prompt](https://geminicli.com/docs/tools/mcp-server/#mcp-prompts-as-slash-commands) and [Codex skill](https://developers.openai.com/codex/skills) support. A universal `@oqgit` mention is not assumed.

### Optional: Gemma and private repositories

`review_change` runs the same Gemma review as `oqgit review`: ranked findings, file/line references, explicit coverage, a deterministic merge verdict and one fix prompt. Set `GEMINI_API_KEY`, `GEMINI_API_KEYS` or `GOOGLE_API_KEY` in the **MCP server's environment**. If no key is configured, the prompt/skill uses `get_review_context` so the connected agent can review the bounded diff using its own model. Host-agent reviews are labeled separately. A review reads code; it does not edit files, post to GitHub, or merge.

Pass `GITHUB_TOKEN` or `GH_TOKEN` for private repositories. PR numbers and omitted targets use the MCP server's working directory: start it in the intended repository or set the client's `cwd`. Omitted target reviews tracked local changes against the default base; untracked files require `git add -N`. No `.env` file is loaded automatically by the CLI. Keys remain in the server environment; do not paste them into chat or commit them to configuration.

Missing source patches count as unreviewed. Reviews refuse a PR when GitHub's declared file count exceeds the retrieved context, and branch comparisons at GitHub's 300-file response limit, to avoid giving a verdict on unseen code.

Gemma reviews can take five minutes. Set the client's tool timeout to at least **360 seconds**. For Codex, merge the following into the existing oqgit server entry in `~/.codex/config.toml` (or a trusted project's `.codex/config.toml`):

```toml
[mcp_servers.oqgit]
command = "node"
args = ["/absolute/path/to/OneCLIQ/cli/dist/oqgit.mjs", "mcp"]
startup_timeout_sec = 60
tool_timeout_sec = 360
env_vars = ["GEMINI_API_KEY", "GEMINI_API_KEYS", "GOOGLE_API_KEY", "GITHUB_TOKEN", "GH_TOKEN"]
# cwd = "/absolute/path/to/your/repository"
```

Codex documents [environment forwarding and tool timeouts](https://developers.openai.com/codex/mcp). For Claude Code, set `MCP_TOOL_TIMEOUT=360000` when launching the client; Gemini's server entry supports `timeout: 360000`. Configure credentials using the host's environment forwarding/settings. If credentials change, restart the MCP server.

After a new npm release includes these tools, you can register the server without a checkout, for example `codex mcp add oqgit -- npx -y onecliq mcp` (Claude uses the same argument shape; Gemini uses `gemini mcp add oqgit npx -y onecliq mcp`). Until then, use the source build above.

**Live verification:** a temporary installation of the source build completed a real Codex review of [PR #12](https://github.com/shashank03-dev/OneCLIQ/pull/12), fetching all four changed files over MCP and using the host model after `AI_NOT_CONFIGURED`. Claude's project-level add/get/remove commands passed. A live Claude review and a live Gemma call were not run because their credentials were unavailable. All temporary installations and connections were removed afterward.

**Tools the server offers:** `review_change`, `get_review_context`, `search_skills`, `get_skill`, `install_skill`, `resolve_release`, `release_trust`, `check_malware`, `release_diff`, `verify_file` and `lock_check`. It also exposes the `review` MCP prompt. Start with `--allow-download` to enable `download_release`. Downloads are verified and never run.

---

## The skill library

44 hand-written skills in 9 areas. Each is a plain `SKILL.md` file that follows the open [Agent Skills](https://agentskills.io) standard, and CI checks every one.

| Area | Skills |
| --- | --- |
| Workflow | `grill-the-plan` · `write-a-spec` · `plan-and-break-down` · `systematic-debugging` · `verify-before-done` · `session-handoff` · `codebase-architecture` · `safe-refactoring` · `architecture-decision-records` |
| Frontend | `frontend-design` · `react-performance` · `web-performance` · `web-accessibility` · `micro-interactions` |
| Backend | `rest-api-design` · `postgres-best-practices` · `safe-database-migrations` · `idempotent-webhooks` |
| DevOps | `github-actions-ci` · `dockerfile-best-practices` · `release-binaries` · `pre-commit-guardrails` · `observability-instrumentation` |
| Security | `secure-code-review` · `auth-best-practices` · `secrets-hygiene` · `supply-chain-verify` |
| Testing | `test-driven-development` · `write-unit-tests` · `flaky-test-triage` · `playwright-e2e` · `exploratory-qa` |
| AI engineering | `gemma-4-prompting` · `llm-evals` · `mcp-server-builder` · `write-agent-skills` · `context-engineering` |
| Git | `onecliq-review` · `pull-request-review` · `conventional-commits` · `git-recovery` · `git-worktrees` |
| Languages | `typescript-type-design` · `go-idioms` |

### Skill commands

```bash
oqgit skills                               # list everything, by area
oqgit skills search flaky tests            # search
oqgit skills show secure-code-review       # read one
oqgit skills add secure-code-review        # install one
oqgit skills add security                  # install a whole area
oqgit skills add llm-evals --agent claude,cursor --global
```

Without `--agent`, OneCLIQ installs for the agents your project already uses (or Claude Code if it finds none). `--agent all` installs for every agent. It never overwrites a skill you have edited unless you pass `--force`.

### Where skills are saved

| Agent | `--agent` | Project folder | `--global` folder |
| --- | --- | --- | --- |
| Claude Code | `claude` | `.claude/skills` | `~/.claude/skills` |
| Codex CLI | `codex` | `.agents/skills` | `~/.agents/skills` |
| Cursor | `cursor` | `.cursor/skills` | `~/.cursor/skills` |
| Gemini CLI | `gemini` | `.gemini/skills` | `~/.gemini/skills` |
| GitHub Copilot | `copilot` | `.github/skills` | `~/.copilot/skills` |
| OpenCode | `opencode` | `.opencode/skills` | `~/.config/opencode/skills` |

### Write your own skill

1. Create `skills/<area>/<name>/SKILL.md`. The `write-agent-skills` skill walks you through it.
2. Run `npm run skills:build` to rebuild the catalog.
3. Open a pull request.

Skills inspired by public ones credit them in the [skills README](skills/README.md#credits).

---

## How reviews work

- Findings are ranked **must fix**, **high**, **medium**, **low** or **nit**. Each one names a file and line, a concrete way the code fails, and a fix.
- The merge verdict is calculated from the findings in code, not by the model, so the same findings always give the same answer. A review that could not see every file is never marked safe.
- `gemma-4-31b-it` reviews first. When it is busy, `gemma-4-26b-a4b-it` takes over.
- Several API keys can be supplied; they rotate, and rate-limited keys rest for a while. Oversized diffs are trimmed and the skipped files are marked as unreviewed. This lets it run on free-tier keys from [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

---

## Questions

**Do I need an account?**
No. Nothing on the website needs a sign-up.

**Does "Recommended" mean a file is safe?**
No. It means the file matches your computer. The trust report and malware check add evidence, but only install software you trust.

**What happens to my code during a review?**
The pull request's changes are sent to Google's Gemini API, which runs Gemma 4. The website only accepts public repositories.

**Which coding agents work with the skills?**
Claude Code, Codex CLI, Cursor, Gemini CLI, GitHub Copilot and OpenCode.

**Something broken?**
[Open an issue](https://github.com/shashank03-dev/OneCLIQ/issues/new/choose).

---

## For developers

### Run it locally

You need Node.js 20.9 or newer.

```bash
git clone https://github.com/shashank03-dev/OneCLIQ.git
cd OneCLIQ
npm ci
npm run dev                  # website at http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the website in development mode. |
| `npm run cli:dev -- skills` | Run the CLI from source (anything after `--` is passed to `oqgit`). |
| `npm run test` | Unit tests (Vitest). |
| `npm run test:e2e` | Build, then run browser tests (Playwright) against a mock GitHub API. |
| `npm run skills:build` | Rebuild the skill catalog from `skills/**/SKILL.md`. |
| `npm run cli:build` | Build the CLI into `cli/dist/oqgit.mjs`. |
| `npm run check` | Everything CI runs: skills check, lint, types, unit tests, website build and CLI build. |

### Configuration

Everything is optional. Copy [.env.example](.env.example) to `.env.local` and fill in what you need.

| Variable | What it does |
| --- | --- |
| `GITHUB_TOKEN` | Raises GitHub's limit from 60 to 5,000 requests an hour. Recommended in production. |
| `GEMINI_API_KEYS` · `GEMINI_API_KEY` | One or more Gemini keys (comma or newline separated). Turns on reviews. |
| `VIRUSTOTAL_API_KEY` | Turns on known-malware lookups. |
| `REVIEW_MODEL` · `REVIEW_FALLBACK_MODELS` | Defaults: `gemma-4-31b-it` · `gemma-4-26b-a4b-it`. Use `none` to turn fallbacks off. |
| `REVIEW_THINKING` | `minimal` (default, fits the 300-second function limit) or `high` (slower, more thorough). |
| `REVIEW_MAX_INPUT_TOKENS` | Trims large diffs up front, for example `16000` on the free tier. |
| `REVIEW_RATE_LIMIT_PER_MIN` | Reviews per IP per minute. Default `3`. |
| `RESOLVE_RATE_LIMIT_PER_MIN` | Download lookups per IP per minute. Default `30`. |
| `NEXT_PUBLIC_SITE_URL` | Your public HTTPS address, used for share links and social previews. Read at build time. |

`GITHUB_API_BASE_URL`, `GEMINI_API_BASE_URL` and `VIRUSTOTAL_API_BASE_URL` point the server at mock APIs for testing. Leave them unset in production.

### Deploying and publishing

- The website deploys to Vercel automatically from `main`.
- The CLI is published to npm as [`onecliq`](https://www.npmjs.com/package/onecliq). Bump the version in `cli/package.json`, run `npm run cli:publish`, then approve the staged version on npmjs.com.

### How it is built

The website, the CLI and the MCP server all share one engine in `src/core`, which has no framework code.

```
 web app (Next.js) ─┐
 oqgit CLI ─────────┼──► src/core  (one shared engine)
 MCP server ────────┘      ├─ resolve   link → release → file for this OS/CPU
                           ├─ trust · malware · verify · lockfile
                           ├─ review    GitHub diff → prompt → key pool → Gemma 4 → verdict
                           └─ skills    skills/**/SKILL.md → checked catalog → search · install
                                   │
                    GitHub API · Gemini API (Gemma 4) · VirusTotal
```

| Path | What lives there |
| --- | --- |
| `src/app/` | Pages (`/`, `/start`, `/download`, `/get/<owner>/<repo>`, `/review`, `/skills`, `/cli`) and API routes |
| `src/components/` | UI components. [DESIGN.md](DESIGN.md) describes the design system. |
| `src/core/` | The shared engine: resolver, trust, malware, lockfile, review, skills |
| `src/server/` | Server-only config, GitHub and VirusTotal clients, rate limiting |
| `cli/src/` | CLI commands, downloads, skill installer, MCP server |
| `skills/` | The skill library: `<area>/<name>/SKILL.md` |
| `public/` | Install scripts, download badge, images |
| `tests/unit/`, `e2e/` | Vitest and Playwright tests |

### HTTP API

| Route | What it does |
| --- | --- |
| `GET /api/download?repo=&os=&arch=` | Redirects (302) to the matching file in the latest stable release, or returns `422` when nothing matches. |
| `POST /api/resolve` | `{"url", "os", "arch"}` → the recommended file. |
| `POST /api/trust` | Trust report for that file. |
| `POST /api/malware` | Known-malware check for that file. |
| `POST /api/verify` | `{"repo", "sha256"}` → the matching release file, if any. |
| `POST /api/review` | `{"url", "goal?"}` → findings, verdict and fix prompt. |
| `GET /api/skills?q=&domain=` | Search the skill library (JSON). |
| `GET /api/skills/<name>` | One raw `SKILL.md`. Add `?download` to save it. |
| `GET /api/health` | Which features are switched on (never shows keys). |

POST routes take JSON bodies up to 4 KB. Errors look like `{"ok": false, "error": {"code", "message"}}`. Rate-limited replies include a `Retry-After` header.

---

## Built for Hacktoberfest 2026 Hack Day Bengaluru

| Track | How OneCLIQ fits |
| --- | --- |
| Best Use of Gemma 4 | Code review runs on `gemma-4-31b-it`, with the `gemma-4-26b-a4b-it` mixture-of-experts model as a fast fallback. A key pool makes it work on free quotas, and the merge verdict is computed from Gemma's structured findings so it is repeatable. |
| Best Open-Source AI Project | MIT licensed. 44 agent skills that follow the Agent Skills standard (checked in CI), an original zero-dependency MCP server, and a CLI that installs skills into six coding agents. |

---

## Security, contributing and license

- Tokens and keys stay on the server or on your machine. The website only works with **public** repositories.
- Downloads must be HTTPS GitHub release files, and every redirect is checked. Malware lookups send only a fingerprint (SHA-256).
- Malware checks catch *known* malware only. Files are matched by name, so unusual names can mean no recommendation; the release page is always linked.

Report security problems privately: see [SECURITY.md](SECURITY.md). New skills, bug reports and fixes are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

MIT licensed, skills included. Third-party notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The site adapts [DesignPass.dev](https://designpass.dev/components) components by [Ernest Liu](https://ernestliu.com).
