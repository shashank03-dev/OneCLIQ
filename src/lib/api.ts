/** Browser-side JSON calls to this app's API routes. */

export type ApiFailure = { ok: false; error: { code: string; message: string; retryAfter?: number } };

/** What to say when the platform (not our route) answered, e.g. a function timeout page or a gateway error. */
function platformFailure(status: number): ApiFailure {
  if (status === 504 || status === 408) return { ok: false, error: { code: "TIMEOUT", message: "That took too long and was cut off. Try again, or try a smaller change." } };
  if (status === 429) return { ok: false, error: { code: "RATE_LIMITED", message: "Too many requests right now. Please wait a minute and try again." } };
  if (status === 413) return { ok: false, error: { code: "INVALID_REQUEST", message: "That request was too large." } };
  return { ok: false, error: { code: "UPSTREAM", message: `The server had a problem (${status}). Please try again.` } };
}

/**
 * POST JSON and read the JSON reply. Never throws for HTTP or parse failures: those become `{ ok: false }`
 * with a message fit to show. Rethrows only AbortError, so callers can ignore cancelled requests.
 */
export async function postJson<T extends { ok: boolean }>(path: string, body: unknown, signal?: AbortSignal): Promise<T | ApiFailure> {
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal });
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") throw err;
    return { ok: false, error: { code: "NETWORK", message: "We couldn’t reach the server. Check your connection and try again." } };
  }
  try {
    const json = (await res.json()) as T | ApiFailure;
    if (json && typeof json === "object" && "ok" in json) return json;
  } catch {
    /* not JSON: the platform answered instead of our route */
  }
  return platformFailure(res.status);
}
