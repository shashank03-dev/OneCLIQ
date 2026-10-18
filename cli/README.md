# oqgit

`oqgit` is the command-line tool for [OneCLIQ](https://github.com/shashank03-dev/OneCLIQ). It finds the GitHub release file that matches your computer, downloads it from GitHub, and can check the file's integrity and known-malware reputation. It can also track downloads, compare releases, create a lockfile for a team, and serve tools to coding agents over MCP.

**A match is not a safety guarantee.** `oqgit` uses filenames and GitHub metadata to choose a file, and it checks downloads for **known** malware — a VirusTotal hash lookup and, when VirusTotal can't answer and ClamAV is installed, a local scan. No check proves software harmless, and `oqgit` never installs anything. Opening a downloaded file is a separate, explicit action.

## Install

One line, on macOS or Linux:

```bash
curl -fsSL https://onecliq-eta.vercel.app/install | sh
```

On Windows (PowerShell):

```powershell
irm https://onecliq-eta.vercel.app/install | iex
```

The installer checks for Node.js 20+, installs from npm without sudo or admin rights, and tells you if anything else is needed. With Node.js already set up, npm works directly:

```bash
npm install -g onecliq
oqgit --help
```

Or run it once without installing: `npx onecliq sharkdp/bat`. The npm package is called `onecliq`; the command it installs is `oqgit`.

## Install from source

You need Node.js 20 or newer and npm. To build the CLI from a checkout of this repository:

```bash
git clone https://github.com/shashank03-dev/OneCLIQ.git
cd OneCLIQ
npm ci
npm run cli:build
node cli/dist/oqgit.mjs --help
```

You can run the bundled file directly with `node cli/dist/oqgit.mjs`, or install that local build globally:

```bash
npm install -g ./cli
oqgit --help
```

For development, run the TypeScript source without a separate build:

```bash
npm run cli:dev -- get sharkdp/bat --dry-run
```

The published package is `onecliq` on npm (`npm install -g onecliq`); maintainers release it with `npm run cli:publish` from the repository root.

## Add skills to your coding agent

`oqgit` ships a library of 44 [Agent Skills](https://agentskills.io) for developers in 9 domains (workflow, frontend, backend, DevOps, security, testing, AI engineering, git workflow, languages).

```bash
oqgit skills                                   # browse by domain
oqgit skills search react performance          # search
oqgit skills add pull-request-review           # install into .claude/skills
oqgit skills add security --agent cursor,codex # a whole domain, other agents
oqgit skills add llm-evals --global            # for your user, not just this project
```

Agents: `claude`, `codex`, `cursor`, `gemini`, `copilot`, `opencode`, or `all`. Existing skills are never overwritten without `--force`. Over MCP (`oqgit mcp`), agents get `search_skills`, `get_skill` and `install_skill`.

## Download your first file

```bash
oqgit sharkdp/bat --dry-run
oqgit sharkdp/bat
oqgit info sharkdp/bat
```

`--dry-run` shows the proposed file without saving anything. Without it, `get` asks for confirmation in an interactive terminal. By default, the CLI detects your operating system, CPU, and relevant compatibility information. You can use a full GitHub repository URL or a release URL instead of `owner/repo`.

To target another system, write its OS and CPU after the repository. To pick a specific release, add `@tag`:

```bash
oqgit info cli/cli windows arm64
oqgit sharkdp/bat@v0.25.0 --dry-run
```

Everyday names work too: `mac`, `win`, `intel`, `amd64` or `aarch64`. The `--os`, `--arch` and `--tag` flags do the same thing. A tag is an example: specify a tag that exists in the chosen repository. Without a tag, `oqgit` looks for the latest stable release. If multiple files tie or no usable file can be identified, it refuses to recommend one.

## Commands

| Command | What it does |
| --- | --- |
| `oqgit` | Open the interactive menu when run in a terminal. |
| `oqgit get <target> [os] [cpu]` | Find, confirm, download, and optionally track a matching asset. |
| `oqgit info <target> [os] [cpu]` | Show release information and matching file candidates. |
| `oqgit list` | List locally tracked downloads. |
| `oqgit outdated` | Check for newer stable versions of tracked tools. |
| `oqgit update [owner/repo]` | Download a newer stable version of one or more tracked tools. |
| `oqgit forget <owner/repo>` | Stop tracking a tool without deleting its downloaded files. |
| `oqgit doctor` | Show platform detection, local directories, token status, and API quota. |
| `oqgit trust <target>` | Explain provenance signals for a release file. |
| `oqgit malware <target>` | Check the selected file's hash against VirusTotal; `--local` scans a temp copy with ClamAV. |
| `oqgit verify <file> [owner/repo]` | Hash a local file and look for its exact digest in a repository's releases. |
| `oqgit diff <repo> [from] [to]` | Compare assets and platform coverage across two releases. |
| `oqgit lock <target...>` | Add repository releases and matching platform assets to `oqgit.lock.json`. |
| `oqgit lock show` | Show the lockfile contents. |
| `oqgit lock check` | Check whether locked release assets changed, disappeared, or lost digests. |
| `oqgit lock update [repo]` | Refresh one or more locked repositories. |
| `oqgit lock remove <repo>` | Remove a repository from the lockfile. |
| `oqgit sync [--extract]` | Download the locked file for this computer, optionally extracting archives. |
| `oqgit mcp [--allow-download]` | Start an MCP server over standard input and output. |

`<target>` accepts a GitHub repository or release URL, or `owner/repo`. Running `oqgit owner/repo` is shorthand for `oqgit get owner/repo`.

`oqgit help` shows the everyday commands. `oqgit help <command>` (or `oqgit <command> --help`) shows that command's options and examples, and `oqgit help all` lists every command and flag. A few other names also work: `download` and `dl` for `get`, `show` for `info`, `ls` for `list`, `check` for `outdated`, `upgrade` for `update`, and `remove` and `rm` for `forget`. If you mistype a command, oqgit suggests the closest one.

Common options include `--os`, `--arch`, `--tag`, `--out`, `--yes`, `--dry-run`, `--force`, `--no-track`, `--json`, `--min-age`, `--no-trust`, `--no-malware`, `--local`, and `--open`. The `--open` flag asks the operating system to open the downloaded file, which might launch an installer; use it only for files you trust.

Exit codes are `0` for success, `1` for an error, `2` for invalid input, `3` for no reliable match, and `4` for a failed trust, integrity, or malware policy.

## Trust and file verification

```bash
oqgit trust cli/cli --fail-under 60
oqgit verify ./downloaded-file owner/repo
oqgit sharkdp/bat --min-age 3d --dry-run
```

`trust` produces a report from available GitHub information, including release age, published digests, attestations, immutable-release status, and changes to published files. It is a set of signals, not a verified signature verdict — run `oqgit malware` for known-malware evidence. When GitHub lists an attestation, `oqgit` can show a `gh attestation verify` command for a separate cryptographic verification.

`verify` calculates the SHA-256 digest of the local file and searches recent GitHub releases for a matching published asset digest. If no match appears, the file may be older than the scanned history or its publisher may not have provided a digest. A failed lookup alone does not mean the file is malicious.

`--min-age 3d` skips newer stable releases while resolving a repository. Set `OQGIT_MIN_AGE` in your environment to make a cooldown the default. An explicit release tag is still resolved as requested.

`oqgit malware owner/repo` looks up the SHA-256 GitHub published for the recommended file in VirusTotal and lists engine detections. Add `--local` to also download a copy to a temporary folder, scan it with an installed ClamAV, and delete the copy. Only hashes are sent to VirusTotal; local scans stay on your machine. Exit code `4` means engines flagged the file.

`oqgit get` runs the same check automatically after downloading. When engines flag the file, the download is deleted and the command exits with code `4`; `--force` keeps a flagged file anyway, and `--no-malware` skips the check. Detections cover known malware only — a clean result is not proof of safety.

Downloads go first to a temporary `.part` file. The CLI checks the expected size and, when GitHub publishes one, its SHA-256 digest before renaming the completed download. It only follows redirects to approved GitHub asset hosts. When a digest is missing, the CLI cannot provide the same integrity assurance — and the malware check has no published hash to look up until the local scan runs.

## Lockfiles for teams

```bash
oqgit lock sharkdp/bat cli/cli
oqgit lock show
oqgit lock check
oqgit sync
```

Commit `oqgit.lock.json` alongside your project if your team wants reproducible release choices. The lockfile records matching files for supported platforms, including each available published digest. `lock check` compares the pinned files with GitHub and reports unexpected changes. `sync` downloads the entry for the current machine into `.oqgit/`. Add `--extract` only if you want archives unpacked.

A lockfile cannot cryptographically pin a file that has no published digest. Review changes to locked versions before merging them.

## Review pull requests and branches

`oqgit review` asks Google's Gemma 4 (`gemma-4-31b-it`, through the Gemini API) to review a change. Every issue is tagged **must fix**, **high**, **medium**, **low**, or **nit**, with the file, line, and a concrete fix. You then get a verdict (safe to merge, ready to merge), the current and a suggested title, and **one fix prompt** to paste into any AI coding assistant.

```bash
export GEMINI_API_KEY=...   # free key: https://aistudio.google.com/apikey
# or several keys, rotated when one hits its rate limit:
export GEMINI_API_KEYS=key1,key2,key3

oqgit review                                         # this branch (and uncommitted changes) vs. origin's default branch
oqgit review --base develop --goal "retry failed uploads"
oqgit review https://github.com/owner/repo/pull/12   # any PR: draft, open, closed
oqgit review 12                                      # PR 12 in this repo
oqgit review owner/repo#12
oqgit review https://github.com/owner/repo/tree/my-branch
oqgit review https://github.com/owner/repo/compare/main...my-branch
oqgit review owner/repo --head my-branch --base main
```

Useful flags: `-g, --goal` tells the reviewer what the change should achieve, `--copy` copies the fix prompt, `--prompt-only` prints only the prompt (for piping), `--json` prints the full result, `--fast` uses light thinking for a much quicker (less thorough) review, and `--strict` exits with code 4 unless the change is safe to merge (for CI). `--model` or `OQGIT_REVIEW_MODEL` picks another model. When the model is rate limited or overloaded on every key, the review falls back to `gemma-4-26b-a4b-it`; set `OQGIT_REVIEW_FALLBACK_MODELS` to change that (`none` turns it off).

**Safe to merge** means no must-fix or high-risk findings. **Ready to merge** also needs no medium-risk findings, a PR that isn't a draft or closed, and a change that does what its goal says. oqgit makes this call from the findings, so the same findings always give the same verdict. On the Gemini API free tier, Gemma 4 31B accepts only 16,000 input tokens per minute. When a change is bigger than that, oqgit retries once with the diff trimmed to fit and marks the review **partial**: a partial review is never called safe or ready to merge. Enable billing on the key for full reviews of large changes. With thinking on, a review can take a few minutes. Local reviews skip untracked files unless you `git add -N` them. Lockfiles, generated output, and binaries aren't sent. Review private repositories with a `GITHUB_TOKEN` that can read them. The diff is sent to Google's Gemini API.

## Use with coding agents

**Release status:** MCP PR reviews, the `review` prompt and the `onecliq-review` shortcut are in this source tree, but not in the published `onecliq@0.2.0` package. Until a new npm release is published, use the [source installation](#install-from-source) above. A GitHub push does not update npm.

`oqgit mcp` starts a Model Context Protocol (MCP) server on standard input and output. It exposes `review_change` for Gemma PR/branch/local reviews, `get_review_context` for your agent's own review, and a `review` prompt. Release, trust, malware, verification, lock and skill tools remain available. Downloads are disabled unless you start it with `--allow-download`.

After building from source, choose one command from the repository root (macOS/Linux):

```bash
claude mcp add oqgit -- node "$PWD/cli/dist/oqgit.mjs" mcp
codex mcp add oqgit -- node "$PWD/cli/dist/oqgit.mjs" mcp
gemini mcp add oqgit node "$PWD/cli/dist/oqgit.mjs" mcp
```

In PowerShell, use `"$($PWD.Path)/cli/dist/oqgit.mjs"` for the bundle path. If you installed the local build globally with `npm install -g ./cli`, you can instead register `oqgit mcp`.

Refresh the agent session and confirm that `review_change` and `get_review_context` appear in its MCP tools. Then use one of these; public PR reviews with your agent's own model need no Gemini key:

```text
Claude Code: /oqgit:review https://github.com/owner/repo/pull/12
Gemini CLI: /review https://github.com/owner/repo/pull/12
Any connected agent: Use oqgit to review https://github.com/owner/repo/pull/12
```

For an optional tagged Codex workflow, run `node /absolute/path/to/OneCLIQ/cli/dist/oqgit.mjs skills add onecliq-review --agent codex` in the project you want to review, refresh skills, then type `$onecliq-review <PR URL>` or choose it in `/skills`. Claude can install the same skill with `--agent claude` and use `/onecliq-review`. Plain-language requests do not require a skill. Command discovery is provided by the client; it is not a universal `@oqgit` mention.

Gemma requires `GEMINI_API_KEY`, `GEMINI_API_KEYS` or `GOOGLE_API_KEY` in the server environment. Without one, the prompt/skill fetches context for a clearly labeled **host-agent review** using the connected agent's own model. `get_review_context` caps the diff at 60,000 characters and lists omitted/truncated files; partial reviews cannot establish safe-to-merge status. This context-only tool makes no Gemini call. Model reviews send the diff to the Gemini API and return the same structured verdict and fix prompt as `oqgit review`.

Pass `GITHUB_TOKEN` or `GH_TOKEN` to the server for private PRs. Set the server's `cwd` to the intended repository for bare PR numbers or local reviews; untracked local files require `git add -N`. The CLI does not automatically load `.env` files. Restart the MCP server after changing its environment.

Allow at least **360 seconds** for tool calls (Gemma has a five-minute review budget). For Codex, merge into `~/.codex/config.toml` or your trusted project's `.codex/config.toml`:

```toml
[mcp_servers.oqgit]
command = "node"
args = ["/absolute/path/to/OneCLIQ/cli/dist/oqgit.mjs", "mcp"]
tool_timeout_sec = 360
env_vars = ["GEMINI_API_KEY", "GEMINI_API_KEYS", "GOOGLE_API_KEY", "GITHUB_TOKEN", "GH_TOKEN"]
# cwd = "/absolute/path/to/your/repository"
```

For Claude, launch with `MCP_TOOL_TIMEOUT=360000`; Gemini accepts `timeout: 360000` in its server settings. See [Claude MCP](https://code.claude.com/docs/en/mcp), [Gemini MCP](https://geminicli.com/docs/tools/mcp-server/), and [Codex MCP](https://developers.openai.com/codex/mcp) for credential forwarding and client-specific settings. Never commit secret values. The review workflow does not edit code, post GitHub comments or merge PRs.

Live verification of a temporary source installation completed a real Codex review of public PR #12 with all four file diffs, including the no-Gemini-key fallback. Claude's project-level add/get/remove commands passed; live Claude and Gemma reviews were unavailable without credentials. The temporary installation and connections were removed afterward.

## Configuration, files, and limitations

Set `GITHUB_TOKEN` or `GH_TOKEN` to increase the GitHub API request quota. Public repositories work without a token. `oqgit review` needs `GEMINI_API_KEY`, `GEMINI_API_KEYS` (several, comma-separated) or `GOOGLE_API_KEY`. Set `VIRUSTOTAL_API_KEY` (free tier: about 4 lookups/minute and 500/day) for hash reputation checks. `OQGIT_CLAMSCAN` points at a specific ClamAV binary when it isn't on `PATH`. `OQGIT_HOME` can override the local tracking-data directory; `oqgit doctor` shows the paths in use. Never commit tokens or private local state.

Only public repositories on `github.com` are supported. Filename matching can fail for unconventional releases. Linux package preference depends in part on `/etc/os-release`, while macOS and Windows compatibility checks depend on platform information available from Node and the operating system.

If you have found a bug or would like to contribute, see the [OneCLIQ contribution guide](https://github.com/shashank03-dev/OneCLIQ/blob/main/CONTRIBUTING.md). Report vulnerabilities using the [security policy](https://github.com/shashank03-dev/OneCLIQ/blob/main/SECURITY.md). The project is distributed under the [MIT License](https://github.com/shashank03-dev/OneCLIQ/blob/main/LICENSE).
