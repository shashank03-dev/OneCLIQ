/**
 * Network-backed checks shared by the web API, the CLI and the MCP server.
 * Each function makes a small, fixed number of GitHub calls built from validated owner/repo values.
 */
import type { AttestationSummary, GitHubClient } from "./github";
import { assessMalware, type LocalScanResult, type MalwareReport } from "./malware";
import { findByDigest, previousStable } from "./releases";
import { assessTrust, type TrustReport } from "./trust";
import type { Release, ReleaseAsset } from "./types";
import type { VirusTotalClient } from "./virustotal";

type Repo = { owner: string; repo: string };

/** Trust report for one file of one release: attestations + previous release for the size check. */
export async function trustFor(
  client: GitHubClient,
  target: Repo,
  release: Release,
  asset: ReleaseAsset,
  opts: { cooldownDays?: number; now?: number } = {},
): Promise<TrustReport> {
  const [attestations, releases] = await Promise.all([
    asset.digest ? client.getAttestations(target, asset.digest) : Promise.resolve(null),
    client.listReleases(target).catch(() => null),
  ]);
  return assessTrust({
    repo: { owner: target.owner, name: target.repo },
    release,
    asset,
    attestations,
    previous: releases ? previousStable(releases, release) : null,
    cooldownDays: opts.cooldownDays,
    now: opts.now,
  });
}

export interface DigestVerification {
  sha256: string;
  /** The release file with exactly these bytes, if any of the last 100 releases has one. */
  match: { tag: string; name: string; url: string; publishedAt: string | null; prerelease: boolean; latest: boolean } | null;
  /** Releases scanned. */
  scanned: number;
  /** Attestations GitHub holds for this digest in the repo (null = couldn't ask). */
  attestations: AttestationSummary | null;
}

/** Was a file with this SHA-256 published by this repo? Hashing happens on the caller's side. */
export async function verifyDigest(client: GitHubClient, target: Repo, sha256: string): Promise<DigestVerification> {
  const hex = sha256.replace(/^sha256:/i, "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(hex)) throw new Error("Expected a SHA-256 hex digest.");
  const [releases, attestations] = await Promise.all([
    client.listReleases(target, 100),
    client.getAttestations(target, `sha256:${hex}`),
  ]);
  const hit = findByDigest(releases, hex);
  const newestStable = releases.find((r) => !r.prerelease);
  return {
    sha256: hex,
    match: hit
      ? {
          tag: hit.release.tag,
          name: hit.asset.name,
          url: hit.asset.downloadUrl,
          publishedAt: hit.release.publishedAt,
          prerelease: hit.release.prerelease,
          latest: hit.release.tag === newestStable?.tag,
        }
      : null,
    scanned: releases.length,
    attestations,
  };
}

/**
 * Known-malware evidence for one file: VirusTotal hash reputation plus, when the caller
 * scanned the downloaded bytes, a local antivirus result. Never downloads anything itself.
 */
export async function malwareFor(
  vt: VirusTotalClient,
  digest: string | undefined,
  local?: LocalScanResult,
): Promise<MalwareReport> {
  const hex = digest?.replace(/^sha256:/i, "").toLowerCase();
  const sha256 = hex && /^[a-f0-9]{64}$/.test(hex) ? hex : undefined;
  const reputation = sha256 ? await vt.lookupHash(sha256) : null;
  return assessMalware({ sha256, reputation, local, reputationUnconfigured: !vt.enabled });
}
