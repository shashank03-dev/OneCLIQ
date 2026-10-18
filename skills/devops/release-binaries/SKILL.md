---
name: release-binaries
description: Ship GitHub release binaries that users and tools can pick automatically - clear OS/CPU asset names, checksums, build attestations and immutable releases. Use when setting up a release workflow (GoReleaser, cargo-dist, electron-builder, custom CI), naming release assets, or making a project installable by oqgit, eget or package managers.
license: MIT
metadata:
  domain: devops
  author: onecliq
  version: "1.0"
---

# Release binaries people can trust

Users (and tools like `oqgit`) choose your download from the file name alone. Make it unambiguous and verifiable.

## Name every asset `<tool>-<version>-<os>-<arch>.<ext>`

| OS token | Arch token |
| --- | --- |
| `linux`, `darwin` / `macos`, `windows` | `x86_64` / `amd64`, `aarch64` / `arm64`, `i686` / `x86` |

Good: `mytool-v1.4.0-aarch64-apple-darwin.tar.gz`, `mytool_1.4.0_linux_amd64.tar.gz`, `mytool-1.4.0-windows-x64.zip`.
Bad: `mytool-mac.zip` (which CPU?), `build-final.tar.gz`, `mytool-universal` with no OS.

- Ship a separate file per OS × arch, or label universal macOS builds `universal`.
- Use `.tar.gz` for Linux/macOS, `.zip` for Windows; native packages (`.deb`, `.rpm`, `.msi`, `.dmg`) in addition, not instead.
- Leave out debug symbols, or mark them clearly (`-debug`, `.dSYM`).

## Make it verifiable

1. **Checksums:** upload `SHA256SUMS` (or `checksums.txt`). GitHub also exposes a `digest` per asset; don't re-upload assets after publishing, or the digest changes.
2. **Build provenance:** add `actions/attest-build-provenance` in the release job so users can run `gh attestation verify` (and `oqgit trust` reports it).
3. **Immutable releases:** enable them in repo settings so assets can't be swapped later.
4. **Sign** (optional, extra): cosign keyless or minisign, with the signature as an asset.

## Release workflow sketch

```yaml
on: { push: { tags: ["v*"] } }
permissions: { contents: write, id-token: write, attestations: write }
jobs:
  build:
    strategy:
      matrix:
        include:
          - { os: ubuntu-latest,  target: x86_64-unknown-linux-gnu }
          - { os: ubuntu-24.04-arm, target: aarch64-unknown-linux-gnu }
          - { os: macos-latest,   target: aarch64-apple-darwin }
          - { os: windows-latest, target: x86_64-pc-windows-msvc }
    # build → archive as <tool>-<tag>-<target>.<ext> → attest → upload to the release
```

GoReleaser, cargo-dist and electron-builder produce good names by default; check their output against the table.

## Check your release

```bash
npx onecliq info owner/repo                 # each asset with the OS/CPU it was detected as
npx onecliq info owner/repo windows arm64   # does another platform resolve?
npx onecliq trust owner/repo                # attestations, digests, immutability
```

Every asset should show a platform, and every platform you support should resolve to exactly one file.
