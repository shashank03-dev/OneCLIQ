import { z } from "zod";
import { ResolveError } from "@/core/errors";
import { GemmaReviewer, GitHubPrClient, parseReviewTarget, reviewChange } from "@/core/review";
import { failResponse, clientIp, jsonResponse, readJsonBody } from "@/server/json-route";
import { checkRateLimit } from "@/server/rate-limit";

/** Gemma 4 with thinking on can take several minutes for a large diff. */
export const maxDuration = 800;

/** Each review costs model tokens, so it gets its own, tighter per-IP budget. */
const REVIEWS_PER_MIN = Number(process.env.REVIEW_RATE_LIMIT_PER_MIN) || 3;

const BodySchema = z.object({
  url: z.string().trim().min(1).max(2048),
  goal: z.string().trim().max(1500).optional(),
});

/** POST /api/review → Gemma 4 review of a public pull request or branch. */
export async function POST(request: Request) {
  try {
    const { url, goal } = await readJsonBody(request, BodySchema, "Send a GitHub pull request or branch link.");
    const limited = checkRateLimit(`review:${clientIp(request)}`, Date.now(), REVIEWS_PER_MIN);
    if (!limited.ok) {
      throw new ResolveError("RATE_LIMITED", "That's a lot of reviews in a row. Please wait a minute and try again.", { retryAfter: limited.retryAfter });
    }
    const apiKey = process.env.GEMINI_API_KEY?.trim() || undefined;
    if (!apiKey) throw new ResolveError("AI_NOT_CONFIGURED", "Reviews aren't enabled on this server. Set GEMINI_API_KEY, or run oqgit review locally.");

    const target = parseReviewTarget(url);
    const ctx = await new GitHubPrClient({
      token: process.env.GITHUB_TOKEN?.trim() || undefined,
      apiBase: process.env.GITHUB_API_BASE_URL?.trim() || undefined,
      userAgent: "onecliq-web",
      // The server's token may see private repos; never review those for anonymous visitors.
      publicOnly: true,
    }).getContext(target);
    if (goal) ctx.goal = goal;

    const reviewer = new GemmaReviewer({
      apiKey,
      model: process.env.REVIEW_MODEL?.trim() || undefined,
      apiBase: process.env.GEMINI_API_BASE_URL?.trim() || undefined,
      thinking: process.env.REVIEW_THINKING?.trim() === "minimal" ? "minimal" : "high",
      // Stay inside maxDuration, leaving time for the GitHub calls.
      timeoutMs: 760_000,
    });
    return jsonResponse(await reviewChange(ctx, reviewer));
  } catch (err) {
    return failResponse(err);
  }
}
