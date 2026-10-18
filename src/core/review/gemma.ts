/**
 * Calls Gemma 4 through the Gemini API (`generateContent`) and returns a validated review.
 * Gemma doesn't document a JSON mode, so the reply is parsed and checked here, with one repair retry.
 */
import { z } from "zod";
import { ResolveError } from "../errors";
import { ModelReviewSchema, type ModelReview } from "./types";

/** Gemma 4's largest and most capable model. Override with OQGIT_REVIEW_MODEL / REVIEW_MODEL. */
export const DEFAULT_REVIEW_MODEL = "gemma-4-31b-it";
export const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const MODEL_RE = /^[a-z0-9][a-z0-9.\-]{1,80}$/;

export type ThinkingLevel = "high" | "minimal";

export interface ModelClientOptions {
  apiKey?: string;
  model?: string;
  apiBase?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
  /** "high" (default) is thorough but slow; "minimal" answers far faster. */
  thinking?: ThinkingLevel;
  /** Waits before retrying a temporary 500/503 ("high demand"). Default: 10s, then 30s. */
  retryDelaysMs?: number[];
}

const ResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({ parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() }).passthrough()).optional() }).optional(),
        finishReason: z.string().optional(),
      }),
    )
    .optional(),
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
});

/** The model spent its whole output budget thinking and never answered. */
class OutOfRoomError extends ResolveError {
  constructor() {
    super("AI_ERROR", "The review ran out of room. Try a smaller change, or --fast.");
  }
}

class TransientModelError extends Error {
  constructor(readonly cause: ResolveError) {
    super(cause.message);
  }
}

/** The Gemini API refused the call for quota. `inputTokenLimit` is set when it's a per-minute input-token cap. */
export class ModelQuotaError extends ResolveError {
  readonly inputTokenLimit?: number;
  constructor(message: string, opts: { retryAfter: number; inputTokenLimit?: number }) {
    super("AI_RATE_LIMITED", message, { retryAfter: opts.retryAfter });
    this.name = "ModelQuotaError";
    this.inputTokenLimit = opts.inputTokenLimit;
  }
}

const QuotaBodySchema = z.object({
  error: z.object({
    message: z.string().optional(),
    details: z
      .array(
        z
          .object({
            "@type": z.string().optional(),
            retryDelay: z.string().optional(),
            violations: z.array(z.object({ quotaId: z.string().optional(), quotaValue: z.string().optional() }).passthrough()).optional(),
          })
          .passthrough(),
      )
      .optional(),
  }),
});

/** Read a 429 body: how long to wait, and whether it's a per-minute input-token cap (free tier: 16,000 for Gemma 4 31B). */
export function quotaErrorFrom(detail: string, model: string, retryHeader: string | null): ModelQuotaError {
  let retryAfter = Number(retryHeader);
  let inputTokenLimit: number | undefined;
  let daily = false;
  try {
    const body = QuotaBodySchema.safeParse(JSON.parse(detail));
    for (const d of body.success ? (body.data.error.details ?? []) : []) {
      const delay = d.retryDelay && /^([\d.]+)s$/.exec(d.retryDelay);
      if (delay) retryAfter = Math.ceil(Number(delay[1]));
      for (const v of d.violations ?? []) {
        const id = v.quotaId ?? "";
        if (/PerDay/i.test(id)) daily = true;
        else if (/InputToken/i.test(id) && /PerMinute/i.test(id) && Number(v.quotaValue) > 0) inputTokenLimit = Number(v.quotaValue);
      }
    }
  } catch {
    /* not JSON: fall back to the header */
  }
  if (!Number.isFinite(retryAfter) || retryAfter <= 0) retryAfter = 60;
  if (daily) {
    return new ModelQuotaError(`The daily Gemini API quota for ${model} is used up. Try again tomorrow, or enable billing for the key.`, { retryAfter: 3600 });
  }
  if (inputTokenLimit) {
    return new ModelQuotaError(
      `This key allows ${inputTokenLimit.toLocaleString("en-US")} input tokens per minute for ${model} (Gemini API free tier). Try again in about ${retryAfter}s, or enable billing for larger reviews.`,
      { retryAfter, inputTokenLimit },
    );
  }
  return new ModelQuotaError(`The Gemini API rate limit for ${model} was reached. Try again in about ${retryAfter}s.`, { retryAfter });
}

/** Response chunks from an SSE stream (`data: {...}` lines), or from a plain JSON object/array body. */
async function readChunks(res: Response): Promise<unknown[]> {
  const body = await res.text();
  if (!/^\s*data:/m.test(body)) {
    const json: unknown = JSON.parse(body);
    return Array.isArray(json) ? json : [json];
  }
  const chunks: unknown[] = [];
  for (const line of body.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    const chunk = JSON.parse(data) as { error?: { code?: number; message?: string } };
    if (chunk.error) {
      const err = new ResolveError("AI_ERROR", `The Gemini API failed mid-review${chunk.error.message ? `: ${chunk.error.message.slice(0, 200)}` : "."}`);
      if (chunk.error.code === 500 || chunk.error.code === 503) throw new TransientModelError(err);
      throw err;
    }
    chunks.push(chunk);
  }
  return chunks;
}

/** Pull the first balanced top-level JSON object out of a reply that may include fences or prose. */
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    /* fall through to a scan */
  }
  const start = cleaned.indexOf("{");
  if (start < 0) return undefined;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) {
      try {
        return JSON.parse(cleaned.slice(start, i + 1));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export function parseModelReview(text: string): ModelReview | null {
  const raw = extractJson(text);
  if (!raw || typeof raw !== "object") return null;
  const parsed = ModelReviewSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export class GemmaReviewer {
  readonly model: string;
  private readonly opts: ModelClientOptions;

  constructor(opts: ModelClientOptions) {
    const model = (opts.model || DEFAULT_REVIEW_MODEL).trim();
    if (!MODEL_RE.test(model)) throw new ResolveError("INVALID_REQUEST", `“${model}” isn't a valid model name.`);
    this.model = model;
    this.opts = opts;
  }

  async review(system: string, user: string): Promise<ModelReview> {
    if (!this.opts.apiKey) {
      throw new ResolveError("AI_NOT_CONFIGURED", "Set GEMINI_API_KEY to run reviews. Get a key at https://aistudio.google.com/apikey.");
    }
    const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [{ role: "user", parts: [{ text: user }] }];
    let thinking: ThinkingLevel = this.opts.thinking ?? "high";
    let first: string;
    try {
      first = await this.generate(system, contents, thinking);
    } catch (err) {
      // Deep thinking on a big diff can use the whole output budget before answering; answer with light thinking instead.
      if (!(err instanceof OutOfRoomError) || thinking === "minimal") throw err;
      thinking = "minimal";
      first = await this.generate(system, contents, thinking);
    }
    const review = parseModelReview(first);
    if (review) return review;

    // One repair attempt: show the model its own reply and ask for the JSON only.
    contents.push(
      { role: "model", parts: [{ text: first.slice(0, 60_000) }] },
      { role: "user", parts: [{ text: "That reply wasn't a single valid JSON object in the required shape. Reply again with ONLY the JSON object." }] },
    );
    const second = parseModelReview(await this.generate(system, contents, thinking));
    if (second) return second;
    throw new ResolveError("AI_ERROR", `${this.model} didn't return a review in the expected format. Please try again.`);
  }

  /** Retry the model's temporary overload errors with backoff; everything else fails at once. */
  private async generate(system: string, contents: unknown[], thinking: ThinkingLevel): Promise<string> {
    const delays = this.opts.retryDelaysMs ?? [10_000, 30_000];
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.generateOnce(system, contents, thinking);
      } catch (err) {
        if (!(err instanceof TransientModelError) || attempt >= delays.length) throw err instanceof TransientModelError ? err.cause : err;
        await new Promise((r) => setTimeout(r, delays[attempt]));
      }
    }
  }

  private async generateOnce(system: string, contents: unknown[], thinking: ThinkingLevel): Promise<string> {
    const base = (this.opts.apiBase || GEMINI_API_BASE).replace(/\/+$/, "");
    const body = {
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: {
        temperature: 0.2,
        // Thinking tokens count toward this; 65,536 is the most Gemma 4 accepts.
        maxOutputTokens: 65_536,
        thinkingConfig: { thinkingLevel: thinking },
      },
    };
    let res: Response;
    try {
      // Streamed: Gemma's thinking can run past Node fetch's 300s wait for response headers, but chunks keep a stream alive.
      res = await (this.opts.fetch ?? fetch)(`${base}/models/${this.model}:streamGenerateContent?alt=sse`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": this.opts.apiKey! },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.opts.timeoutMs ?? 600_000),
        cache: "no-store",
      });
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === "TimeoutError" || name === "AbortError") throw new ResolveError("TIMEOUT", "The review model took too long. Try a smaller change or try again.");
      throw new ResolveError("NETWORK", "We couldn't reach the Gemini API. Check your connection and try again.");
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const message = /"message"\s*:\s*"([^"]{1,300})"/.exec(detail)?.[1];
      if (res.status === 429) throw quotaErrorFrom(detail, this.model, res.headers.get("retry-after"));
      if (res.status === 400 && /api key/i.test(detail)) throw new ResolveError("AI_NOT_CONFIGURED", "The Gemini API key was rejected. Check GEMINI_API_KEY.");
      if (res.status === 401 || res.status === 403) throw new ResolveError("AI_NOT_CONFIGURED", "The Gemini API key was rejected. Check GEMINI_API_KEY.");
      if (res.status === 404) throw new ResolveError("AI_ERROR", `The model “${this.model}” isn't available to this API key.`);
      if (res.status === 500 || res.status === 503) {
        throw new TransientModelError(new ResolveError("AI_ERROR", `${this.model} is overloaded right now (${res.status}). Please try again in a few minutes.`));
      }
      throw new ResolveError("AI_ERROR", `The Gemini API returned an error (${res.status})${message ? `: ${message}` : "."}`);
    }

    let chunks: unknown[];
    try {
      chunks = await readChunks(res);
    } catch (err) {
      if (err instanceof ResolveError || err instanceof TransientModelError) throw err;
      if (err instanceof SyntaxError) throw new ResolveError("AI_ERROR", "The Gemini API returned a response we couldn't read.");
      const name = (err as { name?: string })?.name;
      if (name === "TimeoutError" || name === "AbortError") throw new ResolveError("TIMEOUT", "The review model took too long. Try a smaller change or try again.");
      throw new TransientModelError(new ResolveError("AI_ERROR", "The connection to the Gemini API dropped mid-review. Please try again."));
    }

    let text = "";
    let finishReason: string | undefined;
    for (const raw of chunks) {
      const parsed = ResponseSchema.safeParse(raw);
      if (!parsed.success) throw new ResolveError("AI_ERROR", "The Gemini API returned a response we couldn't read.");
      if (parsed.data.promptFeedback?.blockReason) {
        throw new ResolveError("AI_ERROR", `The model declined to review this change (${parsed.data.promptFeedback.blockReason}).`);
      }
      const candidate = parsed.data.candidates?.[0];
      finishReason = candidate?.finishReason ?? finishReason;
      for (const part of candidate?.content?.parts ?? []) if (!part.thought && typeof part.text === "string") text += part.text;
    }
    if (!text.trim()) {
      if (finishReason === "MAX_TOKENS") throw new OutOfRoomError();
      throw new ResolveError("AI_ERROR", "The model returned an empty review. Please try again.");
    }
    return text;
  }
}
