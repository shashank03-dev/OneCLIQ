import type { ErrorCode } from "./types";

/** Error with a stable code and a message that is safe to show users. */
export class ResolveError extends Error {
  readonly code: ErrorCode;
  readonly retryAfter?: number;
  readonly status: number;

  constructor(code: ErrorCode, message: string, opts: { retryAfter?: number } = {}) {
    super(message);
    this.name = "ResolveError";
    this.code = code;
    this.retryAfter = opts.retryAfter;
    this.status = HTTP_STATUS[code];
  }
}

const HTTP_STATUS: Record<ErrorCode, number> = {
  INVALID_URL: 400,
  INVALID_REQUEST: 400,
  REPO_NOT_FOUND: 404,
  RELEASE_NOT_FOUND: 404,
  NO_RELEASES: 404,
  NO_STABLE_RELEASE: 404,
  RATE_LIMITED: 429,
  TIMEOUT: 504,
  NETWORK: 502,
  UPSTREAM: 502,
  PR_NOT_FOUND: 404,
  AI_NOT_CONFIGURED: 503,
  AI_ERROR: 502,
  AI_RATE_LIMITED: 429,
};
