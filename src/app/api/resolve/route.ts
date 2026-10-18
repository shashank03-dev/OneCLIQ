import { z } from "zod";
import { resolve, toFailure } from "@/core/resolve";
import { ResolveError } from "@/core/errors";
import { ARCH_VALUES, OS_VALUES, type ResolveResponse } from "@/core/types";
import { getGitHubClient } from "@/server/github-client";
import { clientIp } from "@/server/json-route";
import { checkRateLimit } from "@/server/rate-limit";

const BodySchema = z.object({
  url: z.string().trim().min(1).max(2048),
  os: z.enum(OS_VALUES),
  arch: z.enum(ARCH_VALUES),
});

const MAX_BODY_BYTES = 4096;

function json(body: ResolveResponse, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

function fail(err: ResolveError) {
  const headers: Record<string, string> = err.retryAfter ? { "Retry-After": String(err.retryAfter) } : {};
  return json(toFailure(err), err.status, headers);
}

export async function POST(request: Request) {
  const limited = checkRateLimit(clientIp(request));
  if (!limited.ok) {
    return fail(
      new ResolveError("RATE_LIMITED", "You're going a little fast. Please wait a moment and try again.", {
        retryAfter: limited.retryAfter,
      }),
    );
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return fail(new ResolveError("INVALID_REQUEST", "Requests must be JSON."));
  }
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return fail(new ResolveError("INVALID_REQUEST", "Request is too large."));
  }

  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) throw new Error("too large");
    raw = JSON.parse(text);
  } catch {
    return fail(new ResolveError("INVALID_REQUEST", "Request body must be valid JSON."));
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return fail(
      new ResolveError(
        field === "url" ? "INVALID_URL" : "INVALID_REQUEST",
        field === "url" ? "Paste a GitHub repository or release URL." : "Choose an operating system and architecture.",
      ),
    );
  }

  const { url, os, arch } = parsed.data;
  try {
    const result = await resolve({ url, platform: { os, arch } }, getGitHubClient());
    return json(result);
  } catch (err) {
    if (err instanceof ResolveError) return fail(err);
    console.error("[resolve] unexpected error", err instanceof Error ? err.message : err);
    return json(toFailure(err), 500);
  }
}
