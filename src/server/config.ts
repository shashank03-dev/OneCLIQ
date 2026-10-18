/**
 * Every server-side setting, read from the environment in one place.
 * Values are read lazily (per call) so tests and `next build` don't freeze them at import time.
 */
import { DEFAULT_FALLBACK_MODELS, DEFAULT_REVIEW_MODEL, parseApiKeys } from "@/core/review";

const str = (name: string) => process.env[name]?.trim() || undefined;

const int = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

/** Comma/space-separated list; "none" means an explicit empty list. */
const list = (name: string, fallback: readonly string[]) => {
  const raw = str(name);
  if (raw === undefined) return [...fallback];
  if (raw.toLowerCase() === "none") return [];
  return raw.split(/[\s,]+/).filter(Boolean);
};

export function githubConfig() {
  return {
    token: str("GITHUB_TOKEN"),
    // Test-only override (points e2e runs at a local mock). Never derived from requests.
    apiBase: str("GITHUB_API_BASE_URL"),
  };
}

export function reviewConfig() {
  return {
    /** GEMINI_API_KEYS (many) and GEMINI_API_KEY (one, or also a list) are merged. */
    apiKeys: parseApiKeys(process.env.GEMINI_API_KEYS, process.env.GEMINI_API_KEY),
    model: str("REVIEW_MODEL") ?? DEFAULT_REVIEW_MODEL,
    fallbackModels: list("REVIEW_FALLBACK_MODELS", DEFAULT_FALLBACK_MODELS),
    /** Deep thinking can take minutes; serverless limits make "minimal" the safe default on the web. */
    thinking: str("REVIEW_THINKING") === "high" ? ("high" as const) : ("minimal" as const),
    perMinute: int("REVIEW_RATE_LIMIT_PER_MIN", 3),
    maxInputTokens: int("REVIEW_MAX_INPUT_TOKENS", 0) || undefined,
    apiBase: str("GEMINI_API_BASE_URL"),
  };
}
