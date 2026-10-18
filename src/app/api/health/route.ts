import { connection } from "next/server";
import { githubConfig, reviewConfig } from "@/server/config";
import { jsonResponse } from "@/server/json-route";

/** GET /api/health → liveness plus which optional features are configured. Never reveals keys or how many there are. */
export async function GET() {
  // Read the environment per request: a prerendered response would freeze the build-time settings.
  await connection();
  const review = reviewConfig();
  return jsonResponse({
    ok: true,
    features: {
      githubToken: Boolean(githubConfig().token),
      malwareLookups: Boolean(process.env.VIRUSTOTAL_API_KEY?.trim()),
      review: review.apiKeys.length > 0,
    },
    review: { model: review.model, fallbackModels: review.fallbackModels, thinking: review.thinking },
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  });
}
