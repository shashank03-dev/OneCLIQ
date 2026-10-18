# OneCLIQ

**The right download from any GitHub release, plus AI review for your pull requests.**

[![CI](https://github.com/shashank03-dev/OneCLIQ/actions/workflows/ci.yml/badge.svg)](https://github.com/shashank03-dev/OneCLIQ/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/onecliq?label=npm%20%C2%B7%20onecliq)](https://www.npmjs.com/package/onecliq)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**[Open the web app](https://onecliq-eta.vercel.app)** · **[Review a pull request](https://onecliq-eta.vercel.app/review)** · **[Install the CLI](#install-the-cli)**

GitHub releases often ship dozens of files: installers, archives and packages for every operating system and CPU. OneCLIQ reads a release and picks the one built for your machine. It also checks where the file came from (attestations, digests, re-uploads) and whether antivirus engines already know it as malware. And it reviews pull requests with Google's Gemma 4 model: it ranks the issues by risk, says whether the PR is safe to merge, and writes one prompt you can hand to any AI coding assistant to fix everything.

You can use it two ways:

- **Web app**: paste a GitHub link and get the right download, a trust report and a malware check. Or paste a pull request and get a review.
- **`oqgit` CLI**: the same engine in your terminal. It downloads and verifies files, tracks them for updates, pins them in a team lockfile, reviews your branch, and serves all of it to coding agents over MCP.

> [!IMPORTANT]
> **A recommendation is about compatibility, not safety.** OneCLIQ checks files for *known* malware (VirusTotal hash lookups, plus an optional local ClamAV scan in the CLI), but a clean result never proves software is harmless. The web app never installs anything. The CLI saves files to disk and opens them only when you ask.

## Contents

- [Install the CLI](#install-the-cli)
- [Using OneCLIQ](#using-onecliq)
- [AI code review](#ai-code-review)
- [CLI reference](#cli-reference)
- [HTTP API](#http-api)
- [Configuration](#configuration)
- [How it works](#how-it-works)
- [Development](#development)
- [Deployment](#deployment)
- [Releasing the CLI](#releasing-the-cli)
- [Security](#security)
- [Limitations](#limitations)
- [Contributing and license](#contributing-and-license)

## Install the CLI

**macOS / Linux**

```bash
curl -fsSL https://onecliq-eta.vercel.app/install | sh
```

**Windows** (PowerShell)

```powershell
irm https://onecliq-eta.vercel.app/install | iex
```

The installer checks for Node.js 20 or newer and installs from npm. It never asks for sudo or admin rights: if npm's global folder isn't writable, it installs to `~/.local` and shows the one line to add to your `PATH`. Both scripts are short and readable: [install.sh](public/install.sh), [install.ps1](public/install.ps1).

If you already have Node.js, npm works directly. The package is called `onecliq`; the command is `oqgit`.

```bash
npm install -g onecliq   # install
npx onecliq sharkdp/bat  # or run once without installing
```

Then try:

```bash
oqgit sharkdp/bat        # download the right file for this computer
oqgit review 12          # AI review of pull request 12 in this repo
oqgit                    # interactive menu
```

## Using OneCLIQ

### Find the right download

On the [web app](https://onecliq-eta.vercel.app), paste a repository or release link such as `https://github.com/sharkdp/bat`. The page detects your operating system and CPU (you can change them), then shows:

- **The recommended file**, with its size and a direct GitHub download link. When nothing fits, or several files tie, it says **Not recommended** and links to the release page so you can choose.
- **A trust report**: build attestations, GitHub's SHA-256 digest, immutable releases, files changed after publishing, release age, signatures, unusual size changes, and who uploaded the file.
- **A known-malware check**: the file's published SHA-256, looked up on VirusTotal.

In the terminal, `oqgit owner/repo` does the same and downloads the file. It verifies the size and SHA-256 against GitHub, runs the malware check, and remembers the download so `oqgit update` can fetch newer versions later.

### Verify a file you already have

Drop a file on the web app's verifier. Your browser hashes it locally, and only the 64-character SHA-256 is sent to the server, which checks whether the repository published a file with that exact digest. The CLI equivalent is `oqgit verify ./file owner/repo`.

### Review a pull request

On the [review page](https://onecliq-eta.vercel.app/review), paste a pull request (any state, drafts included), a `/tree/branch` link, or a `/compare/main...branch` link. You can also say what the change should achieve. In the terminal, `oqgit review` reviews your current branch, and it works with private repositories too. See [AI code review](#ai-code-review).

## AI code review

A review gives you:

- **Findings ranked by risk**: *must fix*, *high*, *medium*, *low* and *nit*. Each finding has the file, line, a concrete failure scenario and a specific fix.
- **A merge verdict** (*Ready to merge*, *Safe to merge after follow-ups* or *Not safe to merge*), with the reasons. OneCLIQ computes the verdict from the findings rather than asking the model, so the same issues always give the same answer. A review that couldn't see every file is never marked safe.
- **Goal check**: whether the change does what its title, description or your stated goal says.
- **A suggested PR title**, and **one fix prompt** to paste into any AI coding assistant.

### Models and API keys

Reviews use **Gemma 4** through the Gemini API. Get free keys at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

| | Default | Why |
| --- | --- | --- |
| Primary model | `gemma-4-31b-it` | Gemma 4's largest and most capable model. |
| Fallback model | `gemma-4-26b-a4b-it` | Gemma 4's mixture-of-experts model: much faster, same prompt format, and a separate quota bucket. |

You can give OneCLIQ **one key or many**. Each review is routed like this:

1. **Rotate.** Consecutive reviews start on different keys, so no single key takes all the load.
2. **Rest a rate-limited key.** When a key hits its quota (HTTP 429), it rests for that model until the quota resets, and the next key takes over. Quotas are per model, so a key that's resting on the primary model can still serve the fallback.
3. **Fall back.** If the primary model is rate limited on every key, or overloaded (5xx), the review moves to the fallback model.
4. **Bench bad keys.** A key that Google rejects as invalid is set aside, and the review carries on with the others.
5. **Wait only if it fits.** When every key is resting, the review waits for the first one to free up, but only if that still fits the time budget. Otherwise it fails fast with a clear message.

On the web this all happens inside Vercel's 300-second function limit. In the CLI there's no such limit.

On the Gemini free tier a prompt can exceed the per-minute input-token cap. When that happens, OneCLIQ trims the diff to fit and marks the left-out files as unreviewed (so the verdict can't be *safe*). It remembers the cap, so the next review trims up front.

**Privacy:** the diff is sent to Google's Gemini API. The web app reviews **public** repositories only, even if the server's GitHub token could read private ones. Use `oqgit review` for private repositories and local branches.

## CLI reference

Run `oqgit` with no arguments for a menu. `oqgit owner/repo` is short for `oqgit get owner/repo`. To target another computer, add an OS and CPU (`oqgit cli/cli windows arm64`; `mac`, `win`, `intel` and `amd64` work too). Add `@tag` for a specific release (`oqgit sharkdp/bat@v0.25.0`). `oqgit help <command>` shows a command's options.

| Command | What it does |
| --- | --- |
| `oqgit owner/repo [os] [cpu]` | Choose and download a file (asks first when interactive). Same as `oqgit get`. |
| `oqgit info owner/repo [os] [cpu]` | Show the release and every file, with detected platforms. |
| `oqgit list` / `outdated` / `update [repo]` | List tracked downloads, check for newer releases, download updates. |
| `oqgit forget owner/repo` | Stop tracking (files stay on disk). |
| `oqgit trust owner/repo` | Provenance report for the selected file. |
| `oqgit malware owner/repo` | VirusTotal hash check; `--local` scans a temporary copy with ClamAV. |
| `oqgit verify ./file owner/repo` | Find the published release file matching a local file's SHA-256. |
| `oqgit diff owner/repo [from] [to]` | Compare two releases' files, sizes and platform coverage. |
| `oqgit lock owner/repo` | Pin files for every OS/CPU in `oqgit.lock.json`. Also `lock show`, `check`, `update`, `remove`. |
| `oqgit sync` | Download this machine's locked files. |
| `oqgit review [12 \| link]` | AI review of this branch, PR 12 in this repo, or any PR, branch or compare link. |
| `oqgit mcp` | Model Context Protocol server over stdio, for coding agents. |
| `oqgit doctor` | System info, token status and GitHub API quota. |

**Common flags:** `--os`, `--arch`, `-t/--tag`, `-o/--out`, `-n/--dry-run`, `-y/--yes`, `-f/--force`, `--json`, `--min-age 3d`, `--no-track`, `--no-trust`, `--no-malware`. For `review`: `-g/--goal`, `--fast`, `--copy`, `--prompt-only`, `--strict` (exit code 4 unless safe to merge, for CI), and `--model`. `oqgit help all` lists everything. Without a terminal, `get` needs `--yes` to download.

**Exit codes:** `0` success · `1` error · `2` bad usage or URL · `3` no reliable file match · `4` a trust, verification, lock, malware or `--strict` review policy failed.

**Where files go:** downloads go to `~/Downloads` (or the current folder), and `--out` changes that. Each download is written to a `.part` file, checked against GitHub's size and SHA-256 digest when GitHub publishes one, and deleted if they don't match. Tracking data lives in `~/.oqgit/state.json` (`%APPDATA%\oqgit` on Windows, `$XDG_CONFIG_HOME/oqgit` on Linux when set). `OQGIT_HOME` overrides that location.

**Lockfiles:** commit `oqgit.lock.json` so teammates and CI resolve the same files. `oqgit lock check` catches removed or changed files. `oqgit sync` downloads into `.oqgit/downloads/` and checks each file against its pinned digest. `--extract` unpacks archives with the system's `unzip`/`tar`.

**MCP:** `oqgit mcp` offers `resolve_release`, `release_trust`, `check_malware`, `release_diff`, `verify_file` and `lock_check`. It's read-only unless started with `--allow-download`. It downloads files but never runs them. Add it to Claude Code with `claude mcp add oqgit -- oqgit mcp`.

## HTTP API

The web app's API is open to call directly. All POST routes take JSON (`Content-Type: application/json`, bodies up to 4 KB) and reply with `Cache-Control: no-store`.

| Route | Request | Response (`ok: true`) |
| --- | --- | --- |
| `POST /api/resolve` | `{"url":"https://github.com/sharkdp/bat","os":"linux","arch":"x64"}` | `repo`, `release`, `platform`, `recommendation` |
| `POST /api/trust` | same `url`, `os`, `arch` | `file`, `tag`, `trust` (level, score, checks) |
| `POST /api/malware` | same `url`, `os`, `arch` | `file`, `tag`, `malware` (status, checks) |
| `POST /api/verify` | `{"repo":"owner/repo","sha256":"<64 hex>"}` | `repo`, `sha256`, `scanned`, `match`, `attestations` |
| `POST /api/review` | `{"url":"https://github.com/o/r/pull/12","goal":"optional"}` | `model`, `change`, `title`, `summary`, `intent`, `verdict`, `findings`, `testsToAdd`, `fixPrompt` |
| `GET /api/health` | none | which features are configured, review models, deployed commit (never keys) |

`os` is `windows`, `macos` or `linux`; `arch` is `x64`, `arm64` or `x86`.

```bash
curl -sS https://onecliq-eta.vercel.app/api/resolve \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://github.com/sharkdp/bat","os":"linux","arch":"x64"}'
```

Errors return `{"ok": false, "error": {"code", "message"}}` with a matching HTTP status. The codes are `INVALID_URL`, `INVALID_REQUEST`, `REPO_NOT_FOUND`, `RELEASE_NOT_FOUND`, `NO_RELEASES`, `NO_STABLE_RELEASE`, `PR_NOT_FOUND`, `RATE_LIMITED`, `TIMEOUT`, `NETWORK`, `UPSTREAM`, `AI_NOT_CONFIGURED`, `AI_ERROR` and `AI_RATE_LIMITED`. Rate-limited replies include `retryAfter` seconds and a `Retry-After` header.

Some details worth knowing:

- `recommendation.status` is `"recommended"` (with an `asset`) or `"not-recommended"` (with a `reason`).
- `/api/verify` searches the latest 100 releases.
- `/api/malware` sends only the published SHA-256 to VirusTotal, never the file. Its statuses are `flagged`, `no-known-detections`, `unknown` and `unavailable`; it never says "safe".

## Configuration

Everything is optional; with no configuration the app works and reviews are simply turned off. For local development, copy [.env.example](.env.example) to `.env.local`. On Vercel, set these under **Project → Settings → Environment Variables**.

**Core**

| Variable | Purpose |
| --- | --- |
| `GITHUB_TOKEN` | Raises GitHub's API limit from 60 to 5,000 requests per hour. **Recommended in production**: without it, every visitor shares the server's 60 requests per hour. No scopes are needed for public repos. |
| `VIRUSTOTAL_API_KEY` | Turns on known-malware hash lookups. The free tier allows about 4 per minute and 500 per day. |
| `NEXT_PUBLIC_SITE_URL` | Public URL, used for social preview links. It's applied at build time, so redeploy after changing it. |
| `RESOLVE_RATE_LIMIT_PER_MIN` | Requests per minute per IP across the API routes. Default `30`. |

**Code review**

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEYS` | One or more Gemini keys, comma- or newline-separated. Turns on `/review`. |
| `GEMINI_API_KEY` | A single key (or another list). Merged with `GEMINI_API_KEYS`. |
| `REVIEW_MODEL` | Primary model. Default `gemma-4-31b-it`. |
| `REVIEW_FALLBACK_MODELS` | Fallbacks, in order. Default `gemma-4-26b-a4b-it`; `none` turns them off. |
| `REVIEW_THINKING` | `minimal` (default on the web, fits the time limit) or `high` (deeper, slower). |
| `REVIEW_MAX_INPUT_TOKENS` | Trim large diffs up front, e.g. `16000` on the free tier. Learned automatically otherwise. |
| `REVIEW_RATE_LIMIT_PER_MIN` | Reviews per minute per IP. Default `3`. |

**CLI.** The CLI reads `GITHUB_TOKEN` or `GH_TOKEN`, `VIRUSTOTAL_API_KEY`, and `GEMINI_API_KEYS` / `GEMINI_API_KEY` / `GOOGLE_API_KEY`. It also reads:

- `OQGIT_REVIEW_MODEL` and `OQGIT_REVIEW_FALLBACK_MODELS`
- `OQGIT_MIN_AGE`: default release cooldown
- `OQGIT_HOME`: tracking folder
- `OQGIT_CLAMSCAN`: path to a ClamAV binary

**Testing only.** Never set these in production: `GITHUB_API_BASE_URL`, `GEMINI_API_BASE_URL` and `VIRUSTOTAL_API_BASE_URL`, and in the CLI `OQGIT_API_BASE`, `OQGIT_VT_API_BASE` and `OQGIT_GEMINI_API_BASE`.

## How it works

```
 browser ──► Next.js API routes (src/app/api) ──► src/server (config, clients, rate limits)
                                                        │
 oqgit CLI (cli/src) ───────────────────────────────────┼──► src/core  (framework-free engine)
                                                        │      ├─ resolve: parse URL → pick release → match file
                                                        │      ├─ trust / malware / verify
                                                        │      └─ review: GitHub diff → prompt → key pool + model router → verdict
                                                        ▼
                                         GitHub API · VirusTotal · Gemini API
```

The web app and the CLI share one engine, `src/core`, so they always give the same answer. A download is resolved in five steps:

1. **Parse the link.** It accepts `github.com` repository and release links; the CLI also accepts `owner/repo`. A `/releases/tag/…` link selects that exact release.
2. **Pick a release.** It uses GitHub's latest stable release, falling back to the newest non-draft, non-prerelease among the last 30.
3. **Validate.** Zod checks GitHub's data. It drops incomplete uploads, and any URL that isn't a GitHub release asset.
4. **Match.** Filenames are classified by OS, CPU and format. Source bundles, checksums, signatures and update manifests are excluded. Native builds rank above compatible ones, and then the most suitable format wins.
5. **Answer.** It returns one file with its size and direct GitHub link, or *Not recommended* with the reason.

Matching relies on how projects name their files. It can't prove a binary runs on your machine.

| Path | What lives there |
| --- | --- |
| `src/core/parse-url.ts`, `github.ts`, `match.ts`, `resolve.ts` | Link parsing, GitHub client with short caching, file matching, the resolver |
| `src/core/trust.ts`, `inspect.ts`, `malware.ts`, `virustotal.ts` | Trust reports, digest matching, malware checks |
| `src/core/releases.ts`, `lockfile.ts` | Release cooldowns, comparisons, lockfile pins and drift |
| `src/core/review/` | PR context, prompt packing, `key-pool.ts` (key rotation and cooldowns), `gemma.ts` (model router), verdict and fix prompt |
| `src/server/` | `config.ts` (all environment settings in one place), shared clients, the review service, JSON parsing, rate limiting |
| `src/app/`, `src/components/`, `src/lib/api.ts` | Pages, API routes, UI, and the browser's fetch helper (turns platform errors into readable messages) |
| `cli/src/` | CLI commands, downloads, tracking, lockfile sync, MCP server, terminal UI |
| `public/install.sh`, `public/install.ps1` | One-line installers. `/install` serves the right one by user agent (see `next.config.ts`). |
| `tests/unit/`, `e2e/` | Vitest unit tests; Playwright desktop and mobile tests against a mock GitHub |

Interface design notes are in [DESIGN.md](DESIGN.md).

## Development

You need Node.js 20.9 or newer.

```bash
git clone https://github.com/shashank03-dev/OneCLIQ.git
cd OneCLIQ
npm ci
npm run dev                                   # http://localhost:3000
npm run cli:dev -- get sharkdp/bat --dry-run  # run the CLI from source
```

| Command | What it runs |
| --- | --- |
| `npm run check` | Everything CI runs: lint, typecheck, unit tests, web build, CLI build |
| `npm run lint` / `typecheck` / `test` | ESLint / Next type generation + `tsc` / Vitest |
| `npm run build` / `cli:build` | Production web build / bundle `cli/dist/oqgit.mjs` |
| `npm run test:e2e` | Playwright browser tests. Run `npx playwright install chromium` first. It builds the app first. |

When you change behavior, update the matching tests in `tests/unit/`. See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow.

## Deployment

### Vercel (production)

Production runs on Vercel at **https://onecliq-eta.vercel.app**, from the `onecliq` project linked to this repository:

- **Every push to `main` deploys to production.** Pull requests and other branches get preview deployments.
- **Settings live in Vercel**, under Project → Settings → Environment Variables. See [Configuration](#configuration). Store keys as *Sensitive*.
- **After changing a variable, redeploy.** Running deployments keep the values they were built with. Use Deployments → ⋯ → Redeploy, or push a commit.
- **Check health** with `curl https://onecliq-eta.vercel.app/api/health`. It shows which features are configured and the deployed commit, never key values.

The project is sized for the Hobby plan: `/api/review` sets `maxDuration = 300` and finishes, or fails cleanly, within that limit. Rate limits and caches live in memory on each server instance, so they're best-effort rather than global.

### Other Node.js hosts

```bash
npm ci && npm run build && npm start
```

Serve it over HTTPS. The API routes need a running Node.js server; static hosting won't work. Behind a proxy, make sure `X-Forwarded-For` is trustworthy, because rate limits are per IP.

## Releasing the CLI

The CLI is published to npm as [`onecliq`](https://www.npmjs.com/package/onecliq). The account uses npm's **staged publishing**, so every release takes two steps:

1. **Stage it.** Bump `version` in `cli/package.json`, then run `npm run cli:publish` from the repository root. This builds the bundle and stages the version. Staging doesn't need two-factor authentication.
2. **Approve it.** Sign in at [npmjs.com](https://www.npmjs.com), open the **Staged Packages** tab, review the version and click **Approve**. Or use the terminal: `npm stage list onecliq`, then `npm stage approve <stage-id>`. Approving asks for your 2FA code. ([npm docs](https://docs.npmjs.com/staged-publishing))

The version is installable once it's approved. Check with `npm view onecliq version`.

## Security

- API inputs are validated and size-limited, and GitHub API paths are built only from validated values.
- Downloads must be HTTPS GitHub release links. The CLI checks every redirect against GitHub's asset hosts.
- Tokens and API keys stay on the server (or your machine, for the CLI). They never reach the browser, and `/api/health` never reveals them.
- Malware lookups send only a SHA-256. Local ClamAV scans run offline.
- Security headers (CSP `frame-ancestors`, `X-Frame-Options`, `nosniff`, referrer and permissions policies) are set in `next.config.ts`.
- The trust score summarizes GitHub's metadata. OneCLIQ looks up attestations but doesn't fully verify Sigstore signatures; when attestations exist, it suggests a `gh attestation verify` command for that.

Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## Limitations

- **Public GitHub only** on the web: no private repositories, and no GitHub Enterprise.
- **Name-based matching.** Unusual file names can prevent a recommendation. The release page is always linked.
- **History limits.** Release fallback looks at 30 releases; verify searches 100. Files without a GitHub-published SHA-256 (common before mid-2025) can't be verified or looked up on VirusTotal.
- **Known malware only.** New or rare malware is often missed.
- **Browser detection.** macOS CPU detection can be uncertain, and browsers can't tell Linux distributions apart. The CLI reads `/etc/os-release` to prefer `.deb` or `.rpm`.
- **Big files in the browser.** The web verifier rejects files over 2 GiB; use `oqgit verify` instead.
- **Per-instance state.** Rate limits, caches and the review key cooldowns aren't shared between server instances.

## Contributing and license

Bug reports, reproduction steps, docs and tests are all welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md) and follow the [Code of Conduct](CODE_OF_CONDUCT.md). Licensed under [MIT](LICENSE); third-party notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

The site adapts [DesignPass.dev components](https://designpass.dev/components) by [Ernest Liu](https://ernestliu.com), with attribution in `src/components/designpass/` and [DESIGN.md](DESIGN.md). It's built with Next.js, React, Tailwind CSS, Zod, Vitest and Playwright. Further reading: the [GitHub Releases API](https://docs.github.com/en/rest/releases/releases), [GitHub artifact attestations](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations) and the [Gemini API](https://ai.google.dev/gemini-api/docs).
