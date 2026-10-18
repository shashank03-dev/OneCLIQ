---
name: supply-chain-verify
description: Verify third-party dependencies and downloaded binaries before trusting them - provenance attestations, checksums, typosquats, install scripts, lockfiles and malware lookups. Use before adding a new package, installing a CLI from GitHub releases, adding a tool to CI, or when asked whether a download or dependency is safe.
license: MIT
metadata:
  domain: security
  author: onecliq
  version: "1.0"
compatibility: Binary checks use the oqgit CLI (npx onecliq) or gh; package checks use the ecosystem's own tooling.
---

# Supply-chain verification

No check proves software is safe. Each one removes a specific risk. Report which risks were checked and which remain.

## Downloaded binaries (GitHub releases)

```bash
npx onecliq info owner/repo        # which asset fits this machine, never guessed
npx onecliq trust owner/repo       # attestations, digest, immutable release, re-uploads, release age
npx onecliq malware owner/repo     # VirusTotal hash lookup (needs VIRUSTOTAL_API_KEY)
npx onecliq verify ./file owner/repo   # is this file on disk byte-identical to a published asset?
gh attestation verify ./file -R owner/repo   # cryptographic build provenance
```

Red flags: asset re-uploaded after the release was published, release younger than a few days for a critical tool, a big unexplained size jump, no checksums and no attestation, download links pointing outside github.com.

For CI and teams, pin exact files and digests: `npx onecliq lock owner/repo` writes `oqgit.lock.json`; `oqgit lock check` fails when a pinned file changes.

## Packages (npm, PyPI, crates, etc.)

Before adding a dependency:

1. **Is it the real one?** Check the exact name against the project's docs/repo. Watch for typosquats (`reqeusts`, `cross-env.js`), scope confusion and recently transferred ownership.
2. **Is it maintained?** Last release, open security issues, number of maintainers, download trend.
3. **What does install run?** npm `preinstall`/`postinstall` scripts, Python `setup.py`. Inspect with `npm view <pkg> scripts`. Consider `npm ci --ignore-scripts` in CI.
4. **Is it needed?** A 10-line helper is often safer than a dependency tree of 40 packages.
5. **Known vulns:** `npm audit`, `pip-audit`, `cargo audit`, `osv-scanner`.
6. **Provenance:** `npm audit signatures` checks registry signatures and npm provenance attestations.

## Keep it locked

- Commit lockfiles; use `npm ci` / `pip install --require-hashes` / `cargo build --locked` in CI.
- Add a cooldown before adopting brand-new releases (`oqgit --min-age 3d`, Renovate `minimumReleaseAge`).
- Pin GitHub Actions to commit SHAs.

## Report

List each component, the checks run, the result, and remaining risk, e.g. "attested and digest matches; not scanned for unknown malware".
