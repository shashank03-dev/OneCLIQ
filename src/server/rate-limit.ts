/**
 * Fixed-window, per-IP limiter held in memory. Protects the shared GitHub quota
 * from a single noisy client. Best-effort only: each server instance keeps its own window.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS = Number(process.env.RESOLVE_RATE_LIMIT_PER_MIN) || 30;

const hits = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, now = Date.now(), max = MAX_REQUESTS): { ok: true } | { ok: false; retryAfter: number } {
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    if (hits.size > 10_000) hits.clear();
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }
  entry.count++;
  if (entry.count > max) return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  return { ok: true };
}
