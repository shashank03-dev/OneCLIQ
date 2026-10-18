import { z } from "zod";
import { ResolveError } from "@/core/errors";
import { isGitHubReleaseAssetUrl } from "@/core/github";
import { ARCHES_FOR_OS, noMatchMessage } from "@/core/labels";
import { parseGitHubUrl } from "@/core/parse-url";
import { resolve } from "@/core/resolve";
import { ARCH_VALUES, OS_VALUES } from "@/core/types";
import { getGitHubClient } from "@/server/github-client";
import { clientIp, failResponse, jsonResponse } from "@/server/json-route";
import { checkRateLimit } from "@/server/rate-limit";

const QuerySchema = z.object({
  repo: z.string().min(1).max(140).regex(/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/),
  os: z.enum(OS_VALUES),
  arch: z.enum(ARCH_VALUES),
});

/** Always resolve latest stable afresh (subject to the GitHub client's short metadata TTL). */
export async function GET(request: Request) {
  // Keep request-time access outside the application error boundary so Next.js
  // can propagate its prerender bailout rather than treating it as an API error.
  const params = new URL(request.url).searchParams;
  const ip = clientIp(request);
  try {
    const limited = checkRateLimit(ip);
    if (!limited.ok) throw new ResolveError("RATE_LIMITED", "Please wait a moment before downloading again.", { retryAfter: limited.retryAfter });
    if (["repo", "os", "arch"].some((key) => params.getAll(key).length !== 1)) {
      throw new ResolveError("INVALID_REQUEST", "Include one repository, operating system and architecture.");
    }
    const query = QuerySchema.safeParse(Object.fromEntries(params));
    if (!query.success || !ARCHES_FOR_OS[query.data.os].includes(query.data.arch)) {
      throw new ResolveError("INVALID_REQUEST", "Choose a valid repository, operating system and architecture.");
    }
    const { repo, os, arch } = query.data;
    const target = parseGitHubUrl(`https://github.com/${repo}`);
    const result = await resolve({ url: `https://github.com/${target.owner}/${target.repo}`, platform: { os, arch } }, getGitHubClient());
    if (result.recommendation.status !== "recommended") {
      return jsonResponse({ ...result, message: noMatchMessage(result.recommendation.reason, `${os} ${arch}`) }, 422);
    }
    const location = result.recommendation.asset.downloadUrl;
    if (!isGitHubReleaseAssetUrl(location)) throw new ResolveError("UPSTREAM", "The release did not provide a valid GitHub download.");
    return new Response(null, { status: 302, headers: { Location: location, "Cache-Control": "no-store" } });
  } catch (err) {
    return failResponse(err);
  }
}
