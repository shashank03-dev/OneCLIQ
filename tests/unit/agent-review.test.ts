import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createReviewService, parseReviewInput, prepareAgentContext } from "../../cli/src/review";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "oqgit-agent-review-"));
  vi.stubEnv("OQGIT_HOME", path.join(dir, "state"));
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

function transport(model?: (init?: RequestInit) => Promise<Response>) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.hostname === "generativelanguage.googleapis.com") return model ? model(init) : modelResponse();
    if (url.pathname === "/repos/acme/tool") return Response.json({ private: true, default_branch: "main" });
    if (url.pathname === "/repos/acme/tool/pulls/7") return Response.json({
      number: 7, title: "Add retry", body: "Retry uploads", state: "open", draft: false,
      html_url: "https://github.com/acme/tool/pull/7", base: { ref: "main" }, head: { ref: "retry" },
    });
    if (url.pathname.endsWith("/files")) return Response.json([
      { filename: "src/upload.ts", status: "modified", additions: 1, deletions: 1, patch: "@@ -1 +1 @@\n-old\n+retry()" },
      { filename: "package-lock.json", status: "modified", additions: 1, deletions: 1, patch: "@@\n+lock" },
    ]);
    if (url.pathname.endsWith("/commits")) return Response.json([]);
    return Response.json({ message: "Unexpected request" }, { status: 404 });
  });
}

function modelResponse() {
  return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({
    summary: "Retry can lose uploads.", suggestedTitle: "fix: retry uploads", intent: "matches", intentNotes: "",
    findings: [{ severity: "high", title: "Lost upload", file: "src/upload.ts", line: 1, detail: "A failed retry drops the upload.", fix: "Persist before retrying." }],
    testsToAdd: ["Retry failure preserves the upload"],
  }) }] } }] });
}

describe("agent review input", () => {
  it.each([null, [], { target: 7 }, { target: " " }, { fast: "true" }, { pr: 0 }, { pr: 1.5 }, { goal: "x".repeat(1501) }, { cwd: "/" }, { head: "--help" }, { target: "acme/tool", pr: 7, head: "feature" }].map((value) => [value]))(
    "rejects malformed input %j", (input) => expect(() => parseReviewInput(input)).toThrow(),
  );
  it("trims target and goal", () => {
    expect(parseReviewInput({ target: " acme/tool#7 ", goal: " retry uploads " })).toEqual({ target: "acme/tool#7", goal: "retry uploads" });
  });
});

describe("shared CLI and MCP review service", () => {
  it("prepares private PR context for the host without a Gemini key or model request", async () => {
    const fetch = transport();
    const service = createReviewService({ cwd: dir, version: "test", env: { GITHUB_TOKEN: "github-test" }, fetch });
    const ctx = await service.context({ target: "acme/tool#7", goal: "Preserve uploads" });
    const prepared = prepareAgentContext(ctx);
    expect(prepared).toMatchObject({ reviewer: "host-agent", partial: false, includedFiles: ["src/upload.ts"], skippedFiles: ["package-lock.json"], unreviewedFiles: [] });
    expect(prepared.userPrompt).toContain("+retry()");
    expect(prepared.userPrompt).toContain("Preserve uploads");
    expect(prepared.systemPrompt).toContain("untrusted");
    expect(prepared.change).not.toHaveProperty("files");
    expect(fetch.mock.calls.every(([url]) => String(url).startsWith("https://api.github.com/"))).toBe(true);
    expect(new Headers(fetch.mock.calls[0][1]?.headers).get("authorization")).toContain("github-test");
    await expect(service.review({ target: "acme/tool#7" })).rejects.toMatchObject({ code: "AI_NOT_CONFIGURED" });
  });

  it("returns the existing verdict, findings and fix prompt through a real model transport", async () => {
    const fetch = transport();
    const service = createReviewService({ cwd: dir, version: "test", env: { GEMINI_API_KEY: "model-test" }, fetch });
    const result = await service.review({ target: "https://github.com/acme/tool/pull/7", fast: true });
    expect(result).toMatchObject({ ok: true, change: { source: "pr", number: 7 }, verdict: { safeToMerge: false, readyToMerge: false } });
    expect(result.findings[0]).toMatchObject({ severity: "high", file: "src/upload.ts", line: 1 });
    expect(result.fixPrompt).toContain("Lost upload");
    const request = fetch.mock.calls.find(([url]) => String(url).includes("generativelanguage.googleapis.com"));
    expect(request).toBeDefined();
    expect(request![1]?.body).toContain("+retry()");
  });

  it("resolves PR numbers from the server working directory and reviews tracked local changes", async () => {
    const git = (...args: string[]) => execFileSync("git", args, { cwd: dir, stdio: "pipe" });
    git("init", "-b", "main");
    git("config", "user.name", "Test");
    git("config", "user.email", "test@example.com");
    await writeFile(path.join(dir, "a.ts"), "export const a = 1;\n");
    git("add", "."); git("commit", "-m", "base");
    git("remote", "add", "origin", "git@github.com:acme/tool.git");
    await writeFile(path.join(dir, "a.ts"), "export const a = 2;\n");
    const service = createReviewService({ cwd: dir, version: "test", env: {}, fetch: transport() });
    expect(await service.context({ target: "#7" })).toMatchObject({ repo: "acme/tool", number: 7 });
    expect(await service.context({ base: "main" })).toMatchObject({ source: "local", files: [expect.objectContaining({ path: "a.ts", patch: expect.stringContaining("+export const a = 2;") })] });
  });

  it.each([
    { pr: 7 }, { head: "feature" }, { target: "acme/tool#0" },
    { target: "acme/tool#7", pr: 8 }, { target: "acme/tool#7", base: "main" },
    { target: "https://github.com/acme/tool/compare/main...feature", head: "other" },
    { target: "https://github.com/acme/tool/compare/main...feature", base: "other" },
    { target: "https://github.com/acme/tool/tree/feature", pr: 7 },
  ])("rejects ambiguous or ignored selectors before fetching: %j", async (input) => {
    const fetch = transport();
    await expect(createReviewService({ cwd: dir, version: "test", env: {}, fetch }).context(input)).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("serializes reviews, rotates a shared key pool and recovers after a failed request", async () => {
    const keys: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let entered!: () => void;
    const started = new Promise<void>((resolve) => { entered = resolve; });
    const fetch = transport(async (init) => {
      keys.push(new Headers(init?.headers).get("x-goog-api-key")!);
      if (keys.length === 1) { entered(); await gate; }
      return modelResponse();
    });
    const service = createReviewService({ cwd: dir, version: "test", env: { GEMINI_API_KEYS: "key-one,key-two" }, fetch });
    const first = service.review({ target: "acme/tool#7" });
    await started;
    const failed = service.review({ target: "acme/tool#7" }, { onContext: () => { throw new Error("context failed"); } });
    const recovered = service.review({ target: "acme/tool#7" });
    expect(keys).toEqual(["key-one"]);
    // Context-only requests remain available while the first model call is in progress.
    expect(await service.context({ target: "acme/tool#7" })).toHaveProperty("number", 7);
    release();
    const outcomes = await Promise.allSettled([first, failed, recovered]);
    expect(outcomes.map((r) => r.status)).toEqual(["fulfilled", "rejected", "fulfilled"]);
    expect(keys).toEqual(["key-one", "key-two"]);
  });

  it("marks truncated source as partial and omits duplicate raw patches", async () => {
    const ctx = await createReviewService({ cwd: dir, version: "test", env: {}, fetch: transport() }).context({ target: "acme/tool#7" });
    ctx.files[0].patch = "+source\n".repeat(20_000);
    const packed = prepareAgentContext(ctx);
    expect(packed.partial).toBe(true);
    expect(packed.unreviewedFiles).toEqual(["src/upload.ts"]);
    expect(packed.userPrompt.length).toBeLessThan(65_000);
    expect(packed.change).not.toHaveProperty("files");
  });
});
