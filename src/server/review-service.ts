import { GemmaReviewer, KeyPool } from "@/core/review";
import { reviewConfig } from "./config";

/**
 * One key pool per server instance: a key that hits its quota during one request rests for the next requests too.
 * Rebuilt only if the configured keys change (e.g. in tests).
 */
let pool: { signature: string; pool: KeyPool } | undefined;

function sharedPool(keys: string[]): KeyPool {
  const signature = keys.join("\n");
  if (pool?.signature !== signature) pool = { signature, pool: new KeyPool(keys) };
  return pool.pool;
}

/** Per-minute input caps learned from 429s, so later reviews trim up front instead of being rejected first. */
const learnedInputLimits = new Map<string, number>();

export function reviewEnabled(): boolean {
  return reviewConfig().apiKeys.length > 0;
}

export function createReviewer(deadline: number) {
  const cfg = reviewConfig();
  const reviewer = new GemmaReviewer({
    keyPool: sharedPool(cfg.apiKeys),
    model: cfg.model,
    fallbackModels: cfg.fallbackModels,
    apiBase: cfg.apiBase,
    thinking: cfg.thinking,
    deadline,
    // One line per model call in the platform logs: which model, which key (by position), and what happened.
    onAttempt: (a) => console.info(`[review] ${a.model} key ${a.key}/${a.keys} ${a.outcome} ${a.ms}ms`),
  });
  return {
    reviewer,
    maxInputTokens: cfg.maxInputTokens ?? learnedInputLimits.get(reviewer.model),
    learnInputLimit: (limit: number) => learnedInputLimits.set(reviewer.model, limit),
  };
}
