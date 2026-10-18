import { describe, expect, it } from "vitest";
import { ResolveError } from "../../src/core/errors";
import { GemmaReviewer, KeyPool, parseApiKeys } from "../../src/core/review";

const GOOD = JSON.stringify({ summary: "ok", suggestedTitle: "t", intent: "matches", intentNotes: "", findings: [], testsToAdd: [] });
const ok = () => Response.json({ candidates: [{ content: { parts: [{ text: GOOD }] } }] });
const quota = (retry = "20s") =>
  new Response(JSON.stringify({ error: { code: 429, details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: retry }] } }), { status: 429 });

/** Records which model and key each request used; `reply` decides the response. */
function api(reply: (model: string, key: string, n: number) => Response) {
  const calls: Array<{ model: string; key: string }> = [];
  const impl = (async (url: string, init: RequestInit) => {
    const model = /models\/([^:]+):/.exec(url)![1];
    const key = (init.headers as Record<string, string>)["x-goog-api-key"];
    calls.push({ model, key });
    return reply(model, key, calls.length);
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("parseApiKeys", () => {
  it("accepts commas, spaces, newlines and quotes across sources, without duplicates", () => {
    expect(parseApiKeys(' "a1", b2\nc3 ', "a1;d4", undefined, "")).toEqual(["a1", "b2", "c3", "d4"]);
  });
});

describe("KeyPool", () => {
  it("rotates and rests keys per model", () => {
    const pool = new KeyPool(["a", "b", "c"]);
    expect(pool.available("m", 0)).toEqual([0, 1, 2]);
    pool.used(0);
    expect(pool.available("m", 0)).toEqual([1, 2, 0]);
    pool.coolDown(1, "m", 1000, 0);
    expect(pool.available("m", 0)).toEqual([2, 0]);
    expect(pool.available("other", 0)).toEqual([1, 2, 0]);
    expect(pool.available("m", 1000)).toEqual([1, 2, 0]);
  });

  it("knows when every key was rejected", () => {
    const pool = new KeyPool(["a", "b"]);
    pool.bench(0, 1000, 0);
    expect(pool.allBenched(0)).toBe(false);
    pool.bench(1, 1000, 0);
    expect(pool.allBenched(0)).toBe(true);
    expect(pool.readyIn("m", 0)).toBe(1000);
  });
});

describe("GemmaReviewer routing", () => {
  it("moves to the next key when one is rate limited, and remembers it across reviews", async () => {
    const pool = new KeyPool(["k1", "k2"]);
    const { impl, calls } = api((_m, key) => (key === "k1" ? quota() : ok()));
    const r1 = new GemmaReviewer({ keyPool: pool, fetch: impl });
    await r1.review("s", "u");
    expect(calls.map((c) => c.key)).toEqual(["k1", "k2"]);
    expect(r1.lastModel).toBe("gemma-4-31b-it");
    // k1 is still resting: a second review goes straight to k2.
    await new GemmaReviewer({ keyPool: pool, fetch: impl }).review("s", "u");
    expect(calls.map((c) => c.key)).toEqual(["k1", "k2", "k2"]);
  });

  it("spreads consecutive reviews across keys", async () => {
    const pool = new KeyPool(["k1", "k2", "k3"]);
    const { impl, calls } = api(() => ok());
    for (let i = 0; i < 4; i++) await new GemmaReviewer({ keyPool: pool, fetch: impl }).review("s", "u");
    expect(calls.map((c) => c.key)).toEqual(["k1", "k2", "k3", "k1"]);
  });

  it("falls back to the fallback model when every key is rate limited on the primary", async () => {
    const { impl, calls } = api((model) => (model === "gemma-4-31b-it" ? quota() : ok()));
    const r = new GemmaReviewer({ apiKeys: ["k1", "k2"], fetch: impl });
    await r.review("s", "u");
    expect(calls.map((c) => `${c.model}/${c.key}`)).toEqual(["gemma-4-31b-it/k1", "gemma-4-31b-it/k2", "gemma-4-26b-a4b-it/k1"]);
    expect(r.lastModel).toBe("gemma-4-26b-a4b-it");
  });

  it("goes to the fallback model straight away when the primary is overloaded", async () => {
    const { impl, calls } = api((model) => (model === "gemma-4-31b-it" ? new Response("{}", { status: 503 }) : ok()));
    const r = new GemmaReviewer({ apiKeys: ["k1", "k2"], fetch: impl, retryDelaysMs: [0] });
    await r.review("s", "u");
    expect(calls.map((c) => c.model)).toEqual(["gemma-4-31b-it", "gemma-4-26b-a4b-it"]);
  });

  it("benches a rejected key and uses the next one", async () => {
    const { impl, calls } = api((_m, key) => (key === "bad" ? new Response('{"error":{"message":"API key not valid"}}', { status: 400 }) : ok()));
    const pool = new KeyPool(["bad", "good"]);
    await new GemmaReviewer({ keyPool: pool, fetch: impl }).review("s", "u");
    await new GemmaReviewer({ keyPool: pool, fetch: impl }).review("s", "u");
    expect(calls.map((c) => c.key)).toEqual(["bad", "good", "good"]);
  });

  it("says so when every key is rejected", async () => {
    const { impl } = api(() => new Response("{}", { status: 403 }));
    await expect(new GemmaReviewer({ apiKeys: ["a", "b"], fetch: impl }).review("s", "u")).rejects.toMatchObject({
      code: "AI_NOT_CONFIGURED",
      message: expect.stringMatching(/Every Gemini API key/),
    });
  });

  it("skips a fallback model the key can't use", async () => {
    const { impl, calls } = api((model, _k, n) => (model === "nope-model" ? new Response("{}", { status: 404 }) : n === 1 ? quota() : ok()));
    let t = 0;
    const r = new GemmaReviewer({ apiKey: "k", fetch: impl, fallbackModels: ["nope-model"], now: () => t, sleep: async (ms) => void (t += ms) });
    await expect(r.review("s", "u")).resolves.toBeTruthy();
    expect(calls.map((c) => c.model)).toEqual(["gemma-4-31b-it", "nope-model", "gemma-4-31b-it"]);
  });

  it("waits for a rested key when everything is rate limited, but never past the deadline", async () => {
    let t = 0;
    const waits: number[] = [];
    const sleep = async (ms: number) => {
      waits.push(ms);
      t += ms;
    };
    const { impl } = api((_m, _k, n) => (n <= 2 ? quota("20s") : ok()));
    await new GemmaReviewer({ apiKey: "k", fetch: impl, now: () => t, sleep }).review("s", "u");
    expect(waits).toEqual([20_000]);

    t = 0;
    const tight = api(() => quota("20s"));
    const err = await new GemmaReviewer({ apiKey: "k", fetch: tight.impl, now: () => t, sleep, deadline: 30_000 }).review("s", "u").catch((e) => e);
    expect(err).toBeInstanceOf(ResolveError);
    expect(err.code).toBe("AI_RATE_LIMITED");
  });

  it("validates every model name", () => {
    expect(() => new GemmaReviewer({ apiKey: "k", fallbackModels: ["../x"] })).toThrow(ResolveError);
  });
});

describe("GemmaReviewer attempt log", () => {
  it("reports each attempt by key position and outcome", async () => {
    const attempts: unknown[] = [];
    const { impl } = api((model, key) => (key === "k1" ? quota() : model === "gemma-4-31b-it" ? new Response("{}", { status: 503 }) : ok()));
    await new GemmaReviewer({ apiKeys: ["k1", "k2"], fetch: impl, now: () => 0, onAttempt: (a) => attempts.push(a), retryDelaysMs: [0] }).review("s", "u");
    expect(attempts).toEqual([
      { model: "gemma-4-31b-it", key: 1, keys: 2, outcome: "rate-limited", ms: 0 },
      { model: "gemma-4-31b-it", key: 2, keys: 2, outcome: "overloaded", ms: 0 },
      { model: "gemma-4-26b-a4b-it", key: 1, keys: 2, outcome: "rate-limited", ms: 0 },
      { model: "gemma-4-26b-a4b-it", key: 2, keys: 2, outcome: "ok", ms: 0 },
    ]);
  });
});
