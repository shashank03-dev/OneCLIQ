import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { localContext, repoFromRemote, splitDiff } from "../../cli/src/git";
import { ResolveError } from "../../src/core/errors";
import { GemmaReviewer, GitHubPrClient, parseReviewTarget, reviewChange } from "../../src/core/review";
import { ModelQuotaError, extractJson, parseModelReview, quotaErrorFrom } from "../../src/core/review/gemma";
import { packDiff } from "../../src/core/review/prompt";
import { normalizeSeverity, type Finding, type ReviewContext } from "../../src/core/review/types";
import { buildFixPrompt, computeVerdict } from "../../src/core/review/verdict";

const finding = (severity: Finding["severity"], title = "x"): Finding => ({ severity, category: "bug", title, detail: "d", fix: "f" });

const CTX: ReviewContext = {
  source: "pr",
  repo: "acme/tool",
  number: 7,
  title: "Add retries",
  description: "",
  state: "open",
  base: "main",
  head: "feat/retry",
  commits: ["Add retries"],
  files: [{ path: "src/upload.ts", status: "modified", additions: 3, deletions: 1, patch: "@@ -1,2 +1,4 @@\n-a\n+b\n+c" }],
};

describe("parseReviewTarget", () => {
  it.each([
    ["https://github.com/acme/tool/pull/12", { kind: "pr", owner: "acme", repo: "tool", number: 12 }],
    ["github.com/acme/tool/pull/12/files", { kind: "pr", owner: "acme", repo: "tool", number: 12 }],
    ["https://github.com/acme/tool/compare/main...feat/x", { kind: "branch", owner: "acme", repo: "tool", base: "main", head: "feat/x" }],
    ["https://github.com/acme/tool/compare/feat/x", { kind: "branch", owner: "acme", repo: "tool", head: "feat/x" }],
    ["https://github.com/acme/tool/tree/feat/x", { kind: "branch", owner: "acme", repo: "tool", head: "feat/x" }],
  ])("%s", (input, expected) => expect(parseReviewTarget(input)).toEqual(expected));

  it("accepts owner/repo#n shorthand and owner/repo with options", () => {
    expect(parseReviewTarget("acme/tool#3", { allowShorthand: true })).toEqual({ kind: "pr", owner: "acme", repo: "tool", number: 3 });
    expect(parseReviewTarget("acme/tool", { allowShorthand: true, head: "dev", base: "main" })).toEqual({ kind: "branch", owner: "acme", repo: "tool", head: "dev", base: "main" });
  });

  it.each(["https://github.com/acme/tool", "https://gitlab.com/a/b/pull/1", "https://github.com/acme/tool/compare/a:x...b:y", "https://github.com/acme/tool/tree/-rf"])(
    "rejects %s",
    (input) => expect(() => parseReviewTarget(input)).toThrow(ResolveError),
  );
});

describe("model output parsing", () => {
  it("normalizes severity aliases", () => {
    expect(normalizeSeverity("Must Fix")).toBe("must-fix");
    expect(normalizeSeverity("critical")).toBe("must-fix");
    expect(normalizeSeverity("MEDIUM_RISK")).toBe("medium");
    expect(normalizeSeverity("whatever")).toBe("medium");
  });

  it("extracts JSON from fences and surrounding prose", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Here you go: {"a":"}{"} trailing')).toEqual({ a: "}{" });
    expect(extractJson("no json")).toBeUndefined();
  });

  it("fills safe defaults for loose replies", () => {
    const r = parseModelReview(JSON.stringify({ summary: "ok", findings: [{ severity: "blocker", title: "Bad", line: "12" }] }));
    expect(r?.intent).toBe("unknown");
    expect(r?.findings[0]).toMatchObject({ severity: "must-fix", title: "Bad", line: 12 });
  });
});

describe("computeVerdict", () => {
  it("is ready when there's nothing above low", () => {
    const v = computeVerdict({ findings: [finding("low"), finding("nit")], intent: "matches" }, "open");
    expect(v).toMatchObject({ safeToMerge: true, readyToMerge: true, label: "Ready to merge", blockers: [] });
  });

  it("is safe but not ready with medium issues or a draft", () => {
    expect(computeVerdict({ findings: [finding("medium")], intent: "matches" }, "open")).toMatchObject({ safeToMerge: true, readyToMerge: false });
    const draft = computeVerdict({ findings: [], intent: "matches" }, "draft");
    expect(draft).toMatchObject({ safeToMerge: true, readyToMerge: false, label: "Safe to merge after follow-ups" });
    expect(draft.blockers).toContain("the pull request is still a draft");
  });

  it("is never safe when files weren't fully reviewed", () => {
    const v = computeVerdict({ findings: [], intent: "matches" }, "open", 2);
    expect(v).toMatchObject({ safeToMerge: false, readyToMerge: false, label: "Not safe to merge" });
    expect(v.blockers[0]).toContain("2 changed files weren't fully reviewed");
  });

  it("is not safe with must-fix or high issues", () => {
    const v = computeVerdict({ findings: [finding("must-fix"), finding("high"), finding("high")], intent: "matches" }, "open");
    expect(v).toMatchObject({ safeToMerge: false, readyToMerge: false, label: "Not safe to merge" });
    expect(v.counts).toMatchObject({ "must-fix": 1, high: 2 });
  });
});

describe("buildFixPrompt", () => {
  it("lists findings most severe first with locations", () => {
    const prompt = buildFixPrompt({ ...CTX, goal: "retry uploads" }, [finding("low", "Low one"), { ...finding("must-fix", "Crash"), file: "a.ts", line: 4 }]);
    expect(prompt).toContain('pull request #7 "Add retries" in acme/tool');
    expect(prompt).toContain("Goal of the change: retry uploads");
    expect(prompt.indexOf("[MUST FIX] Crash — `a.ts:4`")).toBeLessThan(prompt.indexOf("[LOW RISK] Low one"));
  });

  it("is empty when there's nothing to do", () => expect(buildFixPrompt(CTX, [])).toBe(""));
});

describe("packDiff", () => {
  it("skips lockfiles and marks what didn't fit as unreviewed", () => {
    const big = "x".repeat(500);
    const packed = packDiff(
      [
        { path: "package-lock.json", status: "modified", additions: 1, deletions: 1, patch: "@@" },
        { path: "a.ts", status: "modified", additions: 1, deletions: 0, patch: big },
        { path: "b.ts", status: "modified", additions: 1, deletions: 0, patch: big },
        { path: "img.png", status: "added", additions: 0, deletions: 0 },
      ],
      700,
    );
    expect(packed.included.map((f) => f.path)).toEqual(["a.ts"]);
    expect(packed.skipped.sort()).toEqual(["img.png", "package-lock.json"]);
    expect(packed.unreviewed).toEqual(["b.ts"]);
  });
});

function gemini(replies: string[]) {
  const bodies: Array<Record<string, unknown>> = [];
  const impl = (async (_url: string, init: RequestInit) => {
    bodies.push(JSON.parse(String(init.body)));
    const text = replies.shift();
    if (text === undefined) throw new Error("unexpected request");
    return Response.json({ candidates: [{ content: { parts: [{ text: "thinking…", thought: true }, { text }] }, finishReason: "STOP" }] });
  }) as unknown as typeof fetch;
  return { impl, bodies };
}

const GOOD = JSON.stringify({
  summary: "Adds retries.",
  suggestedTitle: "feat: retry failed uploads",
  intent: "matches",
  intentNotes: "Does what it says.",
  findings: [{ severity: "medium", category: "tests", title: "No test for retry cap", file: "src/upload.ts", line: 3, detail: "d", fix: "f" }],
  testsToAdd: ["retries stop after 3 attempts"],
});

describe("reviewChange", () => {
  it("asks Gemma 4 with thinking on and builds the verdict locally", async () => {
    const { impl, bodies } = gemini([GOOD]);
    const result = await reviewChange(CTX, new GemmaReviewer({ apiKey: "k", fetch: impl }));
    expect(result.model).toBe("gemma-4-31b-it");
    expect(bodies[0]).toMatchObject({ generationConfig: { thinkingConfig: { thinkingLevel: "high" } } });
    expect(result.verdict).toMatchObject({ safeToMerge: true, readyToMerge: false });
    expect(result.title).toEqual({ current: "Add retries", suggested: "feat: retry failed uploads" });
    expect(result.fixPrompt).toContain("[MEDIUM RISK] No test for retry cap");
    expect(result.fixPrompt).toContain("retries stop after 3 attempts");
  });

  it("retries once when the reply isn't valid JSON", async () => {
    const { impl, bodies } = gemini(["Sure! Here's my review…", GOOD]);
    const result = await reviewChange(CTX, new GemmaReviewer({ apiKey: "k", fetch: impl }));
    expect(bodies).toHaveLength(2);
    expect(result.findings).toHaveLength(1);
  });

  it("streams: joins answer chunks from SSE and skips thoughts", async () => {
    const half = Math.floor(GOOD.length / 2);
    const sse = [
      { candidates: [{ content: { parts: [{ text: "pondering", thought: true }] } }] },
      { candidates: [{ content: { parts: [{ text: GOOD.slice(0, half) }] } }] },
      { candidates: [{ content: { parts: [{ text: GOOD.slice(half) }] }, finishReason: "STOP" }] },
    ].map((c) => `data: ${JSON.stringify(c)}\r\n\r\n`).join("");
    const urls: string[] = [];
    const impl = (async (url: string) => {
      urls.push(url);
      return new Response(sse, { headers: { "content-type": "text/event-stream" } });
    }) as unknown as typeof fetch;
    const result = await reviewChange(CTX, new GemmaReviewer({ apiKey: "k", fetch: impl }));
    expect(urls[0]).toMatch(/models\/gemma-4-31b-it:streamGenerateContent\?alt=sse$/);
    expect(result.summary).toBe("Adds retries.");
  });

  it("falls back to minimal thinking when deep thinking runs out of room", async () => {
    const levels: string[] = [];
    const impl = (async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      levels.push(body.generationConfig.thinkingConfig.thinkingLevel);
      return levels.length === 1
        ? Response.json({ candidates: [{ content: { parts: [{ text: "…", thought: true }] }, finishReason: "MAX_TOKENS" }] })
        : Response.json({ candidates: [{ content: { parts: [{ text: GOOD }] } }] });
    }) as unknown as typeof fetch;
    const result = await reviewChange(CTX, new GemmaReviewer({ apiKey: "k", fetch: impl }));
    expect(levels).toEqual(["high", "minimal"]);
    expect(result.findings).toHaveLength(1);
  });

  it("uses minimal thinking in fast mode", async () => {
    const { impl, bodies } = gemini([GOOD]);
    await reviewChange(CTX, new GemmaReviewer({ apiKey: "k", fetch: impl, thinking: "minimal" }));
    expect(bodies[0]).toMatchObject({ generationConfig: { thinkingConfig: { thinkingLevel: "minimal" } } });
  });

  it("retries a temporary 503 and then succeeds", async () => {
    let calls = 0;
    const impl = (async () =>
      calls++ === 0
        ? new Response('{"error":{"message":"high demand"}}', { status: 503 })
        : Response.json({ candidates: [{ content: { parts: [{ text: GOOD }] } }] })) as unknown as typeof fetch;
    const result = await reviewChange(CTX, new GemmaReviewer({ apiKey: "k", fetch: impl, retryDelaysMs: [0] }));
    expect(calls).toBe(2);
    expect(result.findings).toHaveLength(1);
  });

  it("gives up on 503 after the retries with a clear message", async () => {
    const impl = (async () => new Response("{}", { status: 503 })) as unknown as typeof fetch;
    await expect(reviewChange(CTX, new GemmaReviewer({ apiKey: "k", fetch: impl, retryDelaysMs: [0, 0] }))).rejects.toThrow(/overloaded/);
  });

  it("needs an API key and a sane model name", async () => {
    await expect(reviewChange(CTX, new GemmaReviewer({}))).rejects.toMatchObject({ code: "AI_NOT_CONFIGURED" });
    expect(() => new GemmaReviewer({ model: "../evil" })).toThrow(ResolveError);
  });
});

const FREE_TIER_429 = JSON.stringify({
  error: {
    code: 429,
    message: "Quota exceeded",
    details: [
      { "@type": "type.googleapis.com/google.rpc.QuotaFailure", violations: [{ quotaId: "GenerateContentInputTokensPerModelPerMinute-FreeTier", quotaValue: "16000" }] },
      { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "2s" },
    ],
  },
});

describe("Gemini quota handling", () => {
  it("reads the free-tier input cap and retry delay", () => {
    const err = quotaErrorFrom(FREE_TIER_429, "gemma-4-31b-it", null);
    expect(err).toBeInstanceOf(ModelQuotaError);
    expect(err).toMatchObject({ code: "AI_RATE_LIMITED", inputTokenLimit: 16000, retryAfter: 2 });
    expect(err.message).toContain("16,000 input tokens per minute");
  });

  it("recognises daily caps and non-JSON bodies", () => {
    const daily = quotaErrorFrom(JSON.stringify({ error: { details: [{ violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier", quotaValue: "1500" }] }] } }), "m", null);
    expect(daily.inputTokenLimit).toBeUndefined();
    expect(daily.message).toMatch(/daily/);
    expect(quotaErrorFrom("nope", "m", "30")).toMatchObject({ retryAfter: 30, inputTokenLimit: undefined });
  });

  it("trims the diff to fit an input cap, then marks the review partial", async () => {
    const huge = (n: number) => `@@ -1 +1,${n} @@\n` + Array.from({ length: n }, (_, i) => `+line ${i} ${"x".repeat(60)}`).join("\n");
    const ctx: ReviewContext = {
      ...CTX,
      files: [
        { path: "a.ts", status: "modified", additions: 300, deletions: 0, patch: huge(300) },
        { path: "b.ts", status: "modified", additions: 900, deletions: 0, patch: huge(900) },
      ],
    };
    const prompts: number[] = [];
    let calls = 0;
    const impl = (async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      prompts.push(body.contents[0].parts[0].text.length + body.systemInstruction.parts[0].text.length);
      if (calls++ === 0) return new Response(FREE_TIER_429, { status: 429 });
      return Response.json({ candidates: [{ content: { parts: [{ text: GOOD }] } }] });
    }) as unknown as typeof fetch;
    const events: unknown[] = [];
    const waits: number[] = [];
    const result = await reviewChange(ctx, new GemmaReviewer({ apiKey: "k", fetch: impl }), {
      onProgress: (e) => events.push(e),
      sleep: async (ms) => void waits.push(ms),
    });
    expect(prompts[1]).toBeLessThan(16000 * 3);
    expect(events).toEqual([{ kind: "trimmed", inputTokenLimit: 16000, unreviewed: 1, waitSeconds: 90 }]);
    expect(waits).toEqual([90000]);
    expect(result.change.unreviewedFiles).toEqual(["b.ts"]);
    expect(result.verdict.safeToMerge).toBe(false);
  });

  it("trims up front when the input cap is already known, without being rejected first", async () => {
    const huge = `@@ -1 +1,900 @@\n` + Array.from({ length: 900 }, (_, i) => `+line ${i} ${"x".repeat(60)}`).join("\n");
    const ctx: ReviewContext = { ...CTX, files: [CTX.files[0], { path: "big.ts", status: "added", additions: 900, deletions: 0, patch: huge }] };
    const { impl, bodies } = gemini([GOOD]);
    const result = await reviewChange(ctx, new GemmaReviewer({ apiKey: "k", fetch: impl }), { maxInputTokens: 16000 });
    expect(bodies).toHaveLength(1);
    expect(result.change.unreviewedFiles).toEqual(["big.ts"]);
  });

  it("doesn't retry when the prompt already fit", async () => {
    const impl = (async () => new Response(FREE_TIER_429, { status: 429 })) as unknown as typeof fetch;
    await expect(reviewChange(CTX, new GemmaReviewer({ apiKey: "k", fetch: impl }), { sleep: async () => {} })).rejects.toMatchObject({ code: "AI_RATE_LIMITED" });
  });
});

describe("GitHubPrClient", () => {
  function github(routes: Record<string, unknown>) {
    const calls: string[] = [];
    const impl = (async (url: string) => {
      const p = new URL(url).pathname + new URL(url).search;
      calls.push(p);
      const key = Object.keys(routes).find((k) => p.startsWith(k));
      return key ? Response.json(routes[key]) : new Response("{}", { status: 404 });
    }) as unknown as typeof fetch;
    return { impl, calls };
  }

  it("reads a draft PR with its files and commits", async () => {
    const { impl } = github({
      "/repos/acme/tool/pulls/7/files": [{ filename: "a.ts", status: "modified", additions: 2, deletions: 1, patch: "@@" }],
      "/repos/acme/tool/pulls/7/commits": [{ commit: { message: "First\n\nbody" } }],
      "/repos/acme/tool/pulls/7": {
        number: 7, title: "WIP", body: null, state: "open", draft: true, html_url: "https://github.com/acme/tool/pull/7",
        user: { login: "dev" }, base: { ref: "main" }, head: { ref: "wip" },
      },
      "/repos/acme/tool": { private: false, default_branch: "main" },
    });
    const ctx = await new GitHubPrClient({ fetch: impl }).getContext({ kind: "pr", owner: "acme", repo: "tool", number: 7 });
    expect(ctx).toMatchObject({ state: "draft", title: "WIP", head: "wip", base: "main", commits: ["First"], files: [{ path: "a.ts", patch: "@@" }] });
  });

  it("refuses private repos when publicOnly is set", async () => {
    const { impl } = github({ "/repos/acme/secret": { private: true, default_branch: "main" } });
    await expect(
      new GitHubPrClient({ fetch: impl, publicOnly: true }).getContext({ kind: "pr", owner: "acme", repo: "secret", number: 1 }),
    ).rejects.toMatchObject({ code: "REPO_NOT_FOUND" });
  });

  it("compares a branch against the default branch", async () => {
    const { impl, calls } = github({
      "/repos/acme/tool/compare/": { commits: [{ commit: { message: "Do thing" } }], files: [{ filename: "b.ts", status: "added", additions: 1, deletions: 0, patch: "@@" }] },
      "/repos/acme/tool": { private: false, default_branch: "trunk" },
    });
    const ctx = await new GitHubPrClient({ fetch: impl }).getContext({ kind: "branch", owner: "acme", repo: "tool", head: "feat/x" });
    expect(calls).toContain("/repos/acme/tool/compare/trunk...feat%2Fx?per_page=100");
    expect(ctx).toMatchObject({ source: "branch", base: "trunk", head: "feat/x", title: "Do thing" });
  });
});

describe("local git context", () => {
  let dir: string | undefined;
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it("parses remotes and splits diffs", () => {
    expect(repoFromRemote("git@github.com:acme/tool.git")).toBe("acme/tool");
    expect(repoFromRemote("https://github.com/acme/tool")).toBe("acme/tool");
    expect(repoFromRemote("https://gitlab.com/acme/tool")).toBeNull();
    const parts = splitDiff("diff --git a/x.ts b/x.ts\nindex 1..2\n--- a/x.ts\n+++ b/x.ts\n@@ -1 +1 @@\n-a\n+b\n");
    expect(parts.get("x.ts")).toBe("@@ -1 +1 @@\n-a\n+b");
  });

  it("diffs the current branch and uncommitted changes against the base", async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "oqgit-review-"));
    const git = (...args: string[]) => execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...args], { cwd: dir, stdio: "pipe" });
    git("init", "-q", "-b", "main");
    await writeFile(path.join(dir, "a.txt"), "one\n");
    git("add", ".");
    git("commit", "-qm", "init");
    git("checkout", "-qb", "feat");
    await writeFile(path.join(dir, "a.txt"), "one\ntwo\n");
    git("commit", "-qam", "Add two");
    await writeFile(path.join(dir, "a.txt"), "one\ntwo\nthree\n");

    const ctx = await localContext({ cwd: dir, base: "main", goal: "count to three" });
    expect(ctx).toMatchObject({ source: "local", base: "main", head: "feat", title: "Add two", commits: ["Add two"], goal: "count to three" });
    expect(ctx.files).toEqual([expect.objectContaining({ path: "a.txt", additions: 2, deletions: 0 })]);
    expect(ctx.files[0].patch).toContain("+three");
  });
});
