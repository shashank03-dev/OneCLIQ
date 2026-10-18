# OneCLIQ

**Find the right download from a public GitHub release.**

GitHub releases can contain dozens of files for different systems. OneCLIQ reads a repository's releases and suggests the file that best matches your operating system and CPU.

Use the **web app** to paste a GitHub link, check the suggested system, see a known-malware check for the file, and open the selected download on GitHub. Use the **`oqgit` command-line tool** to download files, keep track of them, check hashes and provenance, check known-malware reputation, and pin releases for a team.

**A recommendation is about compatibility, not safety.** OneCLIQ can check files for **known** malware — the web app looks up published hashes with VirusTotal, and the CLI can also scan downloads with a local antivirus engine — but a clean result is never proof that software is harmless. The web app does not install anything. The CLI saves files to disk, and only opens them when you ask it to.

## Quick start

You need **Node.js 20.9 or newer** and npm for the application. The standalone CLI package requires Node.js 20 or newer.

```bash
git clone https://github.com/shashank03-dev/OneCLIQ.git
cd OneCLIQ
npm ci
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000), paste a public repository link such as `https://github.com/sharkdp/bat`, and check the detected operating system and CPU before requesting a download.

You can try the CLI directly from source:

```bash
npm run cli:dev -- get sharkdp/bat --dry-run
```

This shows the selected file without downloading it. The app works without configuration, but GitHub applies a lower API request limit when no token is supplied.

## How it works

1. **Parse the URL.** The web resolver accepts `github.com` and `www.github.com` repository and release links, with HTTP or HTTPS. The CLI also accepts `owner/repo`. A `/releases/tag/{tag}` link selects that exact release.
2. **Select a release.** For a repository link, the server requests GitHub's latest stable release. If needed, it looks through up to 30 recent releases for a non-draft, non-prerelease version. A specific tag can select a prerelease.
3. **Validate the response.** Zod checks GitHub's release metadata. The resolver excludes empty or incomplete uploads and URLs that do not point to GitHub release assets.
4. **Match the filename.** File names are classified by OS, architecture, and format. Windows, macOS, and Linux are supported, with x64, arm64, and x86 where applicable. The matcher excludes source bundles, checksum files, update manifests, signatures, and unrelated platforms. It ranks native builds and supported compatibility options, then chooses a suitable file format.
5. **Return a result.** A clear match gets a filename, size, type, and direct GitHub URL. When no file fits or multiple choices tie, OneCLIQ says **Not recommended** and links to the release page for a manual choice.

Matching depends on how projects name their downloads. The resolver cannot check whether a binary will actually run, and its recommendations are not a security verdict.

## Where the code lives

The stack is Next.js 16, React 19, TypeScript, Tailwind CSS 4, Zod, Vitest, and Playwright. The browser app and CLI use the same framework-independent core.

| Path | What it does |
| --- | --- |
| `src/core/parse-url.ts` | Validates GitHub URLs and extracts owner, repository, and optional tag. |
| `src/core/github.ts` | Fetches release metadata from GitHub, validates responses, handles errors, and caches results briefly. |
| `src/core/match.ts` | Classifies and ranks release assets for an OS and architecture. |
| `src/core/resolve.ts` | Connects parsing, release selection, and matching. |
| `src/core/review/` | AI code review: PR/branch context, Gemma 4 call, verdict, and fix prompt. Used by `oqgit review` and `/api/review`. |
| `src/core/trust.ts`, `src/core/inspect.ts` | Calculate trust reports, check attestations, and match file digests. |
| `src/core/malware.ts`, `src/core/virustotal.ts` | Known-malware verdicts from VirusTotal hash reputation and optional local scans. |
| `src/core/releases.ts`, `src/core/lockfile.ts` | Release cooldowns, comparisons, file pins, and drift detection. |
| `src/app/`, `src/components/` | Web pages, four API routes, resolver interface, browser file verifier, and malware panel. |
| `src/server/` | Server-side GitHub and VirusTotal access, request parsing, and rate limiting. |
| `cli/src/` | Commands, downloads, tracking, lockfile sync, and MCP server. |
| `tests/unit/`, `e2e/` | Unit tests and desktop/mobile browser tests. |

For interface details see [DESIGN.md](DESIGN.md). For a shorter CLI introduction see [cli/README.md](cli/README.md).

## Configuration

Configuration is optional. Copy the example when you need to set an environment variable:

```bash
cp .env.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `GITHUB_TOKEN` | Server-side token to raise GitHub's API quota. Public repositories do not require token permissions. Keep it private. |
| `VIRUSTOTAL_API_KEY` | Server-side VirusTotal key for known-malware hash lookups. Optional; without it the panel reports the check as unavailable. The free public API allows about 4 lookups/minute and 500/day. |
| `NEXT_PUBLIC_SITE_URL` | Public base URL used for absolute metadata URLs. Set it to your deployment's actual address. |
| `RESOLVE_RATE_LIMIT_PER_MIN` | Requests per minute per IP and per server instance, across all five API routes. Default: `30`. |
| `GITHUB_API_BASE_URL` | Test-only override for a mock GitHub API. Leave it unset in production. |
| `GEMINI_API_KEYS` | One or more Gemini API keys, comma- or newline-separated. Enables `/review` and `/api/review` (Gemma 4 code review). Requests rotate across keys; a rate-limited key rests until its quota resets while the others carry on. Keep them private. |
| `GEMINI_API_KEY` | A single key (or another list). Merged with `GEMINI_API_KEYS`. |
| `REVIEW_MODEL` | Primary model for web reviews. Default: `gemma-4-31b-it`. |
| `REVIEW_FALLBACK_MODELS` | Tried in order when the primary model is rate limited or overloaded on every key. Default: `gemma-4-26b-a4b-it` (Gemma 4 MoE: faster, separate quota). `none` turns fallback off. |
| `REVIEW_THINKING` | `minimal` (default on the web: fits the 300s function limit) or `high` (more thorough, can take minutes). |
| `REVIEW_MAX_INPUT_TOKENS` | Optional per-request input cap; trims large diffs up front (e.g. `16000` on the free tier). Learned automatically from the first rejection otherwise. |
| `REVIEW_RATE_LIMIT_PER_MIN` | Reviews per minute per IP and per server instance, on top of the general limit. Default: `3`. |
| `GEMINI_API_BASE_URL` | Test-only override for a mock Gemini API. Leave it unset in production. |
| `VIRUSTOTAL_API_BASE_URL` | Test-only override for a mock VirusTotal API. Leave it unset in production. |

The CLI reads `GITHUB_TOKEN` or `GH_TOKEN`. It also reads `VIRUSTOTAL_API_KEY` for hash reputation and `OQGIT_CLAMSCAN` to point at a specific ClamAV binary, and supports `OQGIT_MIN_AGE` for a default release cooldown and `OQGIT_HOME` for its tracking directory. `OQGIT_API_BASE` and `OQGIT_VT_API_BASE` are CLI API overrides intended for tests. `oqgit review` reads `GEMINI_API_KEYS` / `GEMINI_API_KEY` (or `GOOGLE_API_KEY`), `OQGIT_REVIEW_MODEL` and `OQGIT_REVIEW_FALLBACK_MODELS`.

## HTTP API

All five endpoints are **POST** routes. They require a JSON body with `Content-Type: application/json`. The code limits request bodies to 4,096 characters and also checks a declared content length. Responses use `Cache-Control: no-store`.

| Route | Request JSON | Successful response |
| --- | --- | --- |
| `/api/resolve` | `{"url":"https://github.com/sharkdp/bat","os":"linux","arch":"x64"}` | `ok`, `repo`, `release`, `platform`, `recommendation`. |
| `/api/trust` | Same `url`, `os`, and `arch` fields | `ok`, `file`, `tag`, `trust` with level, score, checks, and sometimes a verification command. |
| `/api/malware` | Same `url`, `os`, and `arch` fields | `ok`, `file`, `tag`, `malware` with status, checks, and sometimes a VirusTotal link. |
| `/api/verify` | `{"repo":"owner/repo","sha256":"{64 hex characters}"}` | `ok`, `repo`, `sha256`, `scanned`, `match`, `attestations`. |
| `/api/review` | `{"url":"https://github.com/owner/repo/pull/12","goal":"optional"}` | `ok`, `model`, `change`, `title`, `summary`, `intent`, `verdict` (`safeToMerge`, `readyToMerge`, `label`, `blockers`, `counts`), `findings`, `testsToAdd`, `fixPrompt`. |

`os` accepts `windows`, `macos`, or `linux`; `arch` accepts `x64`, `arm64`, or `x86`. The web form does not offer x86 for macOS.

Example request:

```bash
curl -sS http://localhost:3000/api/resolve \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://github.com/sharkdp/bat","os":"linux","arch":"x64"}'
```

An `ok: true` resolution may include `recommendation.status: "recommended"` with an `asset`, or `"not-recommended"` with a `reason`. A valid release does not guarantee a compatible download.

Failures return an `ok: false` object with an `error.code` and `error.message`. Defined codes include `INVALID_URL`, `INVALID_REQUEST`, `REPO_NOT_FOUND`, `RELEASE_NOT_FOUND`, `NO_RELEASES`, `NO_STABLE_RELEASE`, `RATE_LIMITED`, `TIMEOUT`, `NETWORK`, `UPSTREAM`, `PR_NOT_FOUND`, `AI_NOT_CONFIGURED`, and `AI_ERROR`. Rate-limited responses can include `retryAfter` in seconds and a `Retry-After` header.

`/api/verify` checks up to the most recent **100 releases** for an asset with the exact SHA-256. A missing match may mean an older release or a file without a GitHub-published digest. It does not prove that a file is malicious.

`/api/malware` reads the SHA-256 GitHub published for the recommended file and asks VirusTotal about it — the file itself is never uploaded or downloaded by this route. When no key is configured, VirusTotal is unavailable, or GitHub published no digest, the report says so instead of guessing. `flagged` means engines report known malware; the other statuses are `no-known-detections`, `unknown`, and `unavailable` — never "safe".

`/api/review` accepts pull request (any state), `/tree/{branch}`, and `/compare/{base}...{head}` links for **public** repositories only, even if the server's `GITHUB_TOKEN` could read private ones. The diff is sent to Google's Gemini API. Use `oqgit review` for private repositories and local branches.

## CLI setup and commands

Install with one line (macOS/Linux; on Windows use `irm https://onecliq-eta.vercel.app/install | iex` in PowerShell):

```bash
curl -fsSL https://onecliq-eta.vercel.app/install | sh
```

Or from npm (Node.js 20+). The package is `onecliq`, and the command is `oqgit`:

```bash
npm install -g onecliq
oqgit sharkdp/bat --dry-run
```

Or try it without installing: `npx onecliq sharkdp/bat --dry-run`.

To build the CLI from source instead:

```bash
npm run cli:build
node cli/dist/oqgit.mjs --help
node cli/dist/oqgit.mjs sharkdp/bat --dry-run
```

Optionally install the built local package for the `oqgit` command:

```bash
npm install -g ./cli
oqgit sharkdp/bat --dry-run
```

Run `oqgit` with no arguments in an interactive terminal for a menu. `oqgit owner/repo` is shorthand for `oqgit get owner/repo`. Write an OS and CPU after the repository to target another computer (`oqgit cli/cli windows arm64`; `mac`, `win`, `intel` and `amd64` work too), and add `@tag` for a specific release (`oqgit sharkdp/bat@v0.25.0`). `oqgit help` shows the everyday commands, and `oqgit help <command>` shows one command's options.

| Command | Purpose |
| --- | --- |
| `oqgit owner/repo [os] [cpu]` | Choose and download a file, with confirmation when interactive. Same as `oqgit get`. |
| `oqgit info owner/repo [os] [cpu]` | Show release details and all files with detected platform hints. |
| `oqgit list` | List tracked downloads. |
| `oqgit outdated` | Check tracked repositories for newer stable releases. |
| `oqgit update [owner/repo]` | Download available updates for tracked repositories. |
| `oqgit forget owner/repo` | Stop tracking without removing files from disk. |
| `oqgit doctor` | Show system information, token status, and GitHub API quota. |
| `oqgit trust owner/repo` | Get a provenance report for the selected file. |
| `oqgit malware owner/repo` | Check the selected file's hash against VirusTotal; `--local` scans a temp copy with ClamAV. |
| `oqgit verify ./file owner/repo` | Hash a local file and find its matching published release asset, if any. |
| `oqgit diff owner/repo [from] [to]` | Compare two releases' files, sizes, and platform coverage. |
| `oqgit lock owner/repo` | Pin assets for available OS and CPU combinations in `oqgit.lock.json`. |
| `oqgit lock show` | Show the current lockfile. |
| `oqgit lock check` | Check pinned assets for changes or missing files. |
| `oqgit lock update [owner/repo]` | Update lockfile entries to newer stable releases. |
| `oqgit lock remove owner/repo` | Remove a repository from the lockfile. |
| `oqgit sync` | Download this machine's locked assets. |
| `oqgit mcp` | Run a Model Context Protocol server over standard input and output. |
| `oqgit review [12 \| PR link]` | AI review of this branch, PR 12 in this repository, or any PR or branch link. |
| `oqgit help [command]` | Show the everyday commands, or one command's options and examples. |

Helpful flags include `--os`, `--arch`, `-t/--tag`, `-o/--out`, `-n/--dry-run`, `-y/--yes`, `-f/--force`, `--json`, `--min-age`, `--no-track`, `--no-trust`, `--no-malware`, and `--local`. Use `oqgit help all` for the complete list. In noninteractive mode, `get` requires `--yes` to download.

Some examples:

```bash
oqgit sharkdp/bat --dry-run
oqgit sharkdp/bat --yes
oqgit sharkdp/bat@v0.25.0
oqgit info neovim/neovim windows
oqgit sharkdp/bat --min-age 3d
oqgit trust cli/cli --fail-under 60 --json
oqgit malware cli/cli
oqgit malware cli/cli --local
oqgit verify ./downloaded-file owner/repo
oqgit lock cli/cli sharkdp/bat
oqgit lock check
oqgit sync
```

For `verify`, replace `./downloaded-file` and `owner/repo` with your own file and its expected source repository. `--min-age 3d` skips stable releases less than three days old but does not apply to a specifically requested tag. `--fail-under 60` makes `trust` exit with a policy failure when the score is lower than 60. `oqgit malware owner/repo` checks the recommended file's published hash; add `--local` to download a temporary copy and scan it with an installed ClamAV.

Exit codes: `0` success, `1` general error, `2` invalid usage or URL, `3` no reliable file match, `4` failed trust, verification, lock, or malware policy.

### Downloads and tracked state

By default, downloads go to `~/Downloads` if that folder exists, or to the current directory. `--out` changes the destination. The CLI records tracked downloads in `~/.oqgit/state.json`, or `%APPDATA%\oqgit\state.json` on Windows; on Linux with `XDG_CONFIG_HOME` set it uses `$XDG_CONFIG_HOME/oqgit/state.json`. `OQGIT_HOME` overrides the state directory.

Downloads go to a temporary `.part` file. The CLI checks file size and computes SHA-256, comparing it to GitHub's published digest **when available**. If the digest disagrees, the temporary file is deleted. Without a published digest, the CLI can check only the file size against GitHub's metadata. Existing files are protected unless you use `--force`.

After a download completes, `get` checks the file for **known** malware: it looks up the file's SHA-256 with VirusTotal and, when VirusTotal cannot answer and ClamAV is installed, falls back to a local scan of the downloaded bytes. Only hashes are sent to VirusTotal; local scans stay on your machine. If engines flag the file, the download is deleted and the command exits with code `4`. `--force` keeps a flagged file anyway, and `--no-malware` skips the check.

### Lockfiles and agents

`oqgit lock owner/repo` (or `oqgit lock add`) writes the selected file name, URL, size, and available GitHub digest for each supported platform combination. Commit `oqgit.lock.json` if you want teammates and CI to use the same release selection. `oqgit lock check` spots removed or changed files. `oqgit sync` saves locked downloads under `.oqgit/downloads/` and compares them to the digest saved in the lockfile when present. `--extract` optionally unpacks ZIP or TAR archives using the system's `unzip` or `tar`; inspect untrusted archives before extracting.

`oqgit mcp` offers the tools `resolve_release`, `release_trust`, `check_malware`, `release_diff`, `verify_file`, and `lock_check`. It is read-only by default. Starting it with `--allow-download` also exposes `download_release`; weak-provenance files require an explicit `allow_weak` argument. The MCP server downloads files but never runs them.

## Trust and security

The trust report evaluates eight signals from GitHub's available metadata: build attestations, a SHA-256 digest, immutable releases, file changes after publication, release age, signature or checksum sidecars, unusual size changes, and the account that uploaded the file.

A higher score means more of those signals are present or reassuring. **It does not establish that the software is safe.** OneCLIQ looks up attestation records but does not verify their complete Sigstore signatures. When it finds build attestations it can suggest a separate `gh attestation verify` command.

The malware check is deliberately narrow. The web app and the MCP server ask VirusTotal about the file's published SHA-256; the CLI additionally scans downloaded bytes with a locally installed ClamAV when VirusTotal cannot answer, and `oqgit malware --local` can scan a temporary copy on demand. Detections cover **known** malware only — zero detections never proves a file harmless, which is why the report says "no known detections" rather than "safe". A free VirusTotal key is subject to VirusTotal's terms; review them before using it in a shared or commercial deployment.

The implementation also uses these safeguards:

- GitHub API paths are constructed from validated repository and tag values.
- Download URLs must be HTTPS GitHub release links. The CLI checks each redirect against an allowed set of GitHub asset hosts.
- API inputs are schema-validated and size-limited. Responses use `Cache-Control: no-store`, and security headers are configured in `next.config.ts`.
- The GitHub token stays in the server-side client, outside the browser bundle.
- Malware lookups send only the file's SHA-256 to VirusTotal — never file contents. Local ClamAV scans run entirely offline.
- The CLI opens a file with the operating system only when you explicitly request it, such as with `--open`. That action may launch an installer, so review the file before opening it.

To report a security concern, follow [SECURITY.md](SECURITY.md). Avoid publishing sensitive details in a public issue.

## Testing

The package scripts cover linting, types, tests, and builds:

```bash
npm run lint          # ESLint
npm run typecheck     # Next.js type generation and tsc
npm test              # Vitest unit suite
npm run test:watch    # Vitest watch mode
npm run build         # Production web build
npm run cli:build     # Bundle cli/dist/oqgit.mjs
npm run check         # Lint, typecheck, unit tests, web build, CLI build
```

The browser tests use Playwright on desktop and mobile and start a mock GitHub API:

```bash
npx playwright install chromium
npm run test:e2e
```

`npm run test:e2e` makes a production build first. It is **not** part of `npm run check`. Unit tests cover URLs, filename matching, GitHub API behavior, CLI downloads, trust, lock, and malware functions, and MCP requests. When changing those behaviors, update the corresponding tests in `tests/unit/`.

## Deployment

### Vercel

Import the repository as a Next.js project and keep the default build settings. Add `GEMINI_API_KEYS` to enable reviews. `/api/review` runs to a deadline inside a 300-second function limit (the Vercel Hobby maximum). `GET /api/health` reports which features are configured, without revealing any keys. Rate limits are kept per server instance, so they're best-effort. Add `GITHUB_TOKEN` to your server-side deployment environment if you expect sustained API traffic. Add `VIRUSTOTAL_API_KEY` to enable the malware hash checks; without it the panel reports the check as unavailable. Set `NEXT_PUBLIC_SITE_URL` to the actual public site address for correct metadata URLs. Deploy and test with a public GitHub repository.

Do not set the test-only `GITHUB_API_BASE_URL` or `VIRUSTOTAL_API_BASE_URL` in production.

### Another Node.js host

Deploy to a host that runs a Next.js server and has access to GitHub's public API:

```bash
npm ci
npm run build
npm start
```

Set `PORT` through your host when needed and serve the site over HTTPS. The application uses server-side API routes, so it needs a running Node.js application rather than static file hosting.

Rate-limit counters, release metadata caches, and the VirusTotal lookup budget (about 4/minute and 500/day by default) are **in memory per server instance**. A multi-instance deployment will need a shared store if it requires globally consistent rate limits. The per-IP limiter also depends on the proxy providing trustworthy client IP headers.

## Current limitations

- **Public repositories only.** Private GitHub repositories and GitHub Enterprise servers are unsupported.
- **Name-based decisions.** Unusual or contradictory asset names may prevent an automatic recommendation. The release page remains available for manual inspection.
- **Release history limits.** Fallback release selection examines up to 30 recent releases; verification checks up to 100. Assets without a GitHub-published SHA-256 cannot match the verifier.
- **Known malware only.** The malware check reports what VirusTotal engines and an optional local ClamAV scan already know about. Zero detections never proves a file harmless, and new or rare malware is often missed. Assets without a GitHub-published SHA-256 (common before mid-2025) cannot be looked up at all.
- **Browser detection.** macOS CPU detection can be uncertain, and browser code cannot determine a Linux package distribution. The CLI reads `/etc/os-release` to help prefer `.deb` or `.rpm`.
- **Large-file browser verification.** The web verifier reads the file into memory and rejects files over 2 GiB. Use `oqgit verify` for larger files.
- **Limited integrity data.** Without a GitHub-published digest, CLI downloads and lockfile sync use size checks rather than cryptographic verification against a publisher-provided digest.
- **Instance-local controls.** Release caches and rate-limit state are not shared between app instances.

## Contributing, community, and license

Bug reports, clear reproduction steps, documentation improvements, and tests are welcome. Before proposing a behavior change, check existing tests and explain how you verified your changes.

- [CONTRIBUTING.md](CONTRIBUTING.md): how to set up the project and submit changes.
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md): expectations for community participation.
- [SECURITY.md](SECURITY.md): how to report vulnerabilities privately.
- [LICENSE](LICENSE): MIT license for this repository.
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md): notices for included third-party code.

## Acknowledgments and links

The site uses adapted [DesignPass.dev components](https://designpass.dev/components) by [Ernest Liu](https://ernestliu.com), with attribution in `src/components/designpass/` and [DESIGN.md](DESIGN.md). The application uses open-source tools including Next.js, React, Tailwind CSS, Zod, Vitest, and Playwright.

More references: [GitHub Releases API](https://docs.github.com/en/rest/releases/releases), [GitHub artifact attestations](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations), and the optional artwork notes in [docs/ASSET_PROMPTS.md](docs/ASSET_PROMPTS.md).

Project repository: [shashank03-dev/OneCLIQ](https://github.com/shashank03-dev/OneCLIQ).
