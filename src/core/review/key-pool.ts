/**
 * A pool of Gemini API keys shared by every review in a process.
 *
 * Quotas on the Gemini API are per project *and* per model, so cooldowns are tracked per (key, model):
 * a key that hit the limit for the primary model can still serve the fallback model.
 * Keys are never logged; diagnostics refer to them by position ("key 2 of 5").
 */

/** Read keys from any mix of comma-, space- or newline-separated values. Duplicates and blanks are dropped. */
export function parseApiKeys(...sources: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  for (const src of sources) {
    for (const raw of (src ?? "").split(/[\s,;]+/)) {
      const key = raw.trim().replace(/^["']|["']$/g, "");
      if (key) seen.add(key);
    }
  }
  return [...seen];
}

export class KeyPool {
  private readonly keys: readonly string[];
  /** Round-robin start, so consecutive reviews spread across keys instead of draining the first one. */
  private cursor = 0;
  /** `${index}|${model}` → epoch ms when that key may be used for that model again. */
  private readonly cooling = new Map<string, number>();
  /** index → epoch ms. A rejected key (revoked, wrong project) is benched for every model. */
  private readonly benched = new Map<number, number>();

  constructor(keys: readonly string[]) {
    this.keys = [...new Set(keys.map((k) => k.trim()).filter(Boolean))];
  }

  get size(): number {
    return this.keys.length;
  }

  key(index: number): string {
    return this.keys[index];
  }

  /** Indexes usable for `model` right now, starting at the rotation cursor. */
  available(model: string, now = Date.now()): number[] {
    const out: number[] = [];
    for (let n = 0; n < this.keys.length; n++) {
      const i = (this.cursor + n) % this.keys.length;
      if ((this.benched.get(i) ?? 0) > now) continue;
      if ((this.cooling.get(`${i}|${model}`) ?? 0) > now) continue;
      out.push(i);
    }
    return out;
  }

  /** Milliseconds until some key can serve `model` again: 0 if one is free now, Infinity if every key is benched. */
  readyIn(model: string, now = Date.now()): number {
    let best = Infinity;
    for (let i = 0; i < this.keys.length; i++) {
      const at = Math.max(this.benched.get(i) ?? 0, this.cooling.get(`${i}|${model}`) ?? 0);
      best = Math.min(best, Math.max(0, at - now));
      if (best === 0) break;
    }
    return best;
  }

  /** Every key has been rejected by the API (bad or revoked keys), not merely rate limited. */
  allBenched(now = Date.now()): boolean {
    return this.keys.length > 0 && this.keys.every((_, i) => (this.benched.get(i) ?? 0) > now);
  }

  coolDown(index: number, model: string, ms: number, now = Date.now()): void {
    const key = `${index}|${model}`;
    this.cooling.set(key, Math.max(this.cooling.get(key) ?? 0, now + ms));
  }

  bench(index: number, ms: number, now = Date.now()): void {
    this.benched.set(index, now + ms);
  }

  /** Move the rotation start past a key that just served a request. */
  used(index: number): void {
    if (this.keys.length) this.cursor = (index + 1) % this.keys.length;
  }
}
