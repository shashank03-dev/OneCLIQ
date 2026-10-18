import { parseGitHubUrl } from "@/core/parse-url";
import type { Platform } from "@/core/types";

/** Canonical deployment origin, with the current browser origin as a development fallback. */
export function downloadOrigin(configured: string | undefined, current: string): string {
  for (const raw of [configured, current]) {
    if (!raw) continue;
    try {
      const url = new URL(raw);
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      if ((url.protocol === "https:" || (local && url.protocol === "http:")) && !url.username && !url.password) return url.origin;
    } catch { /* Try the browser origin. */ }
  }
  throw new Error("Set NEXT_PUBLIC_SITE_URL to the HTTPS address of your website.");
}

export function createDownloadLinks(origin: string, repo: { owner: string; name: string }, platform: Platform) {
  const target = parseGitHubUrl(`https://github.com/${repo.owner}/${repo.name}`);
  // Require exactly the validated pair, never let a path or tag enter embed markup.
  if (target.owner !== repo.owner || target.repo !== repo.name) throw new Error("Invalid repository.");
  const base = downloadOrigin(origin, origin);
  const name = `${target.owner}/${target.repo}`;
  const universal = `${base}/get/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}`;
  const direct = `${base}/api/download?${new URLSearchParams({ repo: name, os: platform.os, arch: platform.arch })}`;
  const badge = `${base}/download-badge.svg`;
  return {
    universal,
    direct,
    html: `<a href="${universal}"><img src="${badge}" alt="Download ${name} with OneCLIQ" width="196" height="36"></a>`,
    markdown: `[![Download ${name} with OneCLIQ](${badge})](${universal})`,
  };
}
