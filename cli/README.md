# oqgit

`oqgit` is the command-line tool for [OneCLIQ](https://github.com/shashank03-dev/OneCLIQ). It finds the GitHub release file that matches your computer, downloads it from GitHub, and can check the file's integrity and known-malware reputation. It can also track downloads, compare releases, create a lockfile for a team, and serve tools to coding agents over MCP.

**A match is not a safety guarantee.** `oqgit` uses filenames and GitHub metadata to choose a file, and it checks downloads for **known** malware — a VirusTotal hash lookup and, when VirusTotal can't answer and ClamAV is installed, a local scan. No check proves software harmless, and `oqgit` never installs anything. Opening a downloaded file is a separate, explicit action.

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

The npm package is named `oqgit` in `cli/package.json`. Check whether it is published before relying on `npm install -g oqgit`. The source installation above works without an npm registry release.

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

oqgit review                                         # this branch (and uncommitted changes) vs. origin's default branch
oqgit review --base develop --goal "retry failed uploads"
oqgit review https://github.com/owner/repo/pull/12   # any PR: draft, open, closed
oqgit review 12                                      # PR 12 in this repo
oqgit review owner/repo#12
oqgit review https://github.com/owner/repo/tree/my-branch
oqgit review https://github.com/owner/repo/compare/main...my-branch
oqgit review owner/repo --head my-branch --base main
```

Useful flags: `-g, --goal` tells the reviewer what the change should achieve, `--copy` copies the fix prompt, `--prompt-only` prints only the prompt (for piping), `--json` prints the full result, `--fast` uses light thinking for a much quicker (less thorough) review, and `--strict` exits with code 4 unless the change is safe to merge (for CI). `--model` or `OQGIT_REVIEW_MODEL` picks another model.

**Safe to merge** means no must-fix or high-risk findings. **Ready to merge** also needs no medium-risk findings, a PR that isn't a draft or closed, and a change that does what its goal says. oqgit makes this call from the findings, so the same findings always give the same verdict. On the Gemini API free tier, Gemma 4 31B accepts only 16,000 input tokens per minute. When a change is bigger than that, oqgit retries once with the diff trimmed to fit and marks the review **partial**: a partial review is never called safe or ready to merge. Enable billing on the key for full reviews of large changes. With thinking on, a review can take a few minutes. Local reviews skip untracked files unless you `git add -N` them. Lockfiles, generated output, and binaries aren't sent. Review private repositories with a `GITHUB_TOKEN` that can read them. The diff is sent to Google's Gemini API.

## Use with coding agents

`oqgit mcp` starts a Model Context Protocol (MCP) server on standard input and output. It offers tools for resolving releases, trust reports, malware checks, release diffs, file verification, and lock checks. Downloads are disabled unless you start it with `--allow-download`.

For example, after installing the CLI, Claude Code can register it with:

```bash
claude mcp add oqgit -- oqgit mcp
```

Consult your MCP client's documentation for its registration format. The MCP server does not install or execute downloaded files.

## Configuration, files, and limitations

Set `GITHUB_TOKEN` or `GH_TOKEN` to increase the GitHub API request quota. Public repositories work without a token. `oqgit review` needs `GEMINI_API_KEY` (or `GOOGLE_API_KEY`). Set `VIRUSTOTAL_API_KEY` (free tier: about 4 lookups/minute and 500/day) for hash reputation checks. `OQGIT_CLAMSCAN` points at a specific ClamAV binary when it isn't on `PATH`. `OQGIT_HOME` can override the local tracking-data directory; `oqgit doctor` shows the paths in use. Never commit tokens or private local state.

Only public repositories on `github.com` are supported. Filename matching can fail for unconventional releases. Linux package preference depends in part on `/etc/os-release`, while macOS and Windows compatibility checks depend on platform information available from Node and the operating system.

If you have found a bug or would like to contribute, see the [OneCLIQ contribution guide](https://github.com/shashank03-dev/OneCLIQ/blob/main/CONTRIBUTING.md). Report vulnerabilities using the [security policy](https://github.com/shashank03-dev/OneCLIQ/blob/main/SECURITY.md). The project is distributed under the [MIT License](https://github.com/shashank03-dev/OneCLIQ/blob/main/LICENSE).
