import type { z } from "zod";
import { ResolveError } from "@/core/errors";
import { toFailure } from "@/core/resolve";
import { checkRateLimit } from "./rate-limit";

const MAX_BODY_BYTES = 4096;

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export function failResponse(err: unknown) {
  if (err instanceof ResolveError) {
    const headers: Record<string, string> = err.retryAfter ? { "Retry-After": String(err.retryAfter) } : {};
    return jsonResponse(toFailure(err), err.status, headers);
  }
  console.error("[api] unexpected error", err instanceof Error ? err.message : err);
  return jsonResponse(toFailure(err), 500);
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

/** Rate limit + JSON content type + size cap + schema. Throws ResolveError with a user-safe message. */
export async function readJsonBody<T>(request: Request, schema: z.ZodType<T>, invalidMessage: string): Promise<T> {
  const limited = checkRateLimit(clientIp(request));
  if (!limited.ok) {
    throw new ResolveError("RATE_LIMITED", "You're going a little fast. Please wait a moment and try again.", { retryAfter: limited.retryAfter });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new ResolveError("INVALID_REQUEST", "Requests must be JSON.");
  }
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw new ResolveError("INVALID_REQUEST", "Request is too large.");
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) throw new Error("too large");
    raw = JSON.parse(text);
  } catch {
    throw new ResolveError("INVALID_REQUEST", "Request body must be valid JSON.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new ResolveError("INVALID_REQUEST", invalidMessage);
  return parsed.data;
}
