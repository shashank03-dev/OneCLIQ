import { z } from "zod";
import { ResolveError } from "@/core/errors";
import { GitHubPrClient, ModelQuotaError, parseReviewTarget, reviewChange } from "@/core/review";
import { githubConfig, reviewConfig } from "@/server/config";
import { failResponse, clientIp, jsonResponse, readJsonBody } from "@/server/json-route";
import { checkRateLimit } from "@/server/rate-limit";
import { createReviewer, reviewEnabled } from "@/server/review-service";

/** Vercel Hobby allows functions up to 300s. The review works to a deadline inside it. */
export const maxDuration = 300;
/** Finish (or fail with a clear message) before the platform cuts the function off. */
const BUDGET_MS = (maxDuration - 15) * 1000;

const BodySchema = z.object({
  url: z.string().trim().min(1).max(2048),
  goal: z.string().trim().max(1500).optional(),
});

/** POST /api/review → Gemma 4 review of a public pull request or branch. */
export async function POST(request: Request) {
  const deadline = Date.now() + BUDGET_MS;
  try {
    const { url, goal } = await readJsonBody(request, BodySchema, "Send a GitHub pull request or branch link.");
    // Each review costs model tokens, so it gets its own, tighter per-IP budget.
    const limited = checkRateLimit(`review:${clientIp(request)}`, Date.now(), reviewConfig().perMinute);
    if (!limited.ok) {
      throw new ResolveError("RATE_LIMITED", "That's a lot of reviews in a row. Please wait a minute and try again.", { retryAfter: limited.retryAfter });
    }
    if (!reviewEnabled()) throw new ResolveError("AI_NOT_CONFIGURED", "Reviews aren't enabled on this server. Set GEMINI_API_KEYS, or run oqgit review locally.");

    const target = parseReviewTarget(url);
    const ctx = await new GitHubPrClient({
      ...githubConfig(),
      userAgent: "onecliq-web",
      // The server's token may see private repos; never review those for anonymous visitors.
      publicOnly: true,
    }).getContext(target);
    if (goal) ctx.goal = goal;

    const { reviewer, maxInputTokens, learnInputLimit } = createReviewer(deadline);
    try {
      return jsonResponse(await reviewChange(ctx, reviewer, { maxInputTokens, onProgress: (e) => learnInputLimit(e.inputTokenLimit) }));
    } catch (err) {
      if (err instanceof ModelQuotaError && err.inputTokenLimit) learnInputLimit(err.inputTokenLimit);
      throw err;
    }
  } catch (err) {
    return failResponse(err);
  }
}
