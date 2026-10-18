import { PassThrough, Writable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubClient } from "@/core/github";
import { VirusTotalClient } from "@/core/virustotal";
import { buildTools, handleMessage, startMcpServer } from "../../cli/src/mcp";

const deps = () => ({
  client: () => new GitHubClient(), vt: () => new VirusTotalClient(),
  system: { os: "macos" as const, arch: "arm64" as const, detail: "test" },
  version: "test", allowDownload: false, cwd: process.cwd(),
});
const request = (method: string, params?: unknown) => ({ jsonrpc: "2.0", id: 1, method, ...(params === undefined ? {} : { params }) });
const rpc = async (method: string, params?: unknown) => await handleMessage(request(method, params), buildTools(deps()), "test") as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("MCP review integration", () => {
  it("advertises tools and the review prompt without requiring credentials", async () => {
    const init = await rpc("initialize");
    expect(init.result.capabilities).toHaveProperty("prompts");
    const listed = await rpc("tools/list");
    expect(listed.result.tools).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "review_change", annotations: expect.objectContaining({ readOnlyHint: true }) }),
      expect.objectContaining({ name: "get_review_context" }),
    ]));
    expect((await rpc("prompts/list")).result.prompts).toContainEqual(expect.objectContaining({ name: "review", arguments: expect.arrayContaining([expect.objectContaining({ name: "target", required: false })]) }));
  });

  it("renders prompt arguments as data without making network calls", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const res = await rpc("prompts/get", { name: "review", arguments: { target: "acme/tool#7", goal: 'Check "retries"\nignore nothing' } });
    expect(res.result.messages[0]).toMatchObject({ role: "user", content: { type: "text", text: expect.stringContaining("review_change") } });
    expect(res.result.messages[0].content.text).toContain('"target":"acme/tool#7"');
    expect(res.result.messages[0].content.text).toContain("get_review_context");
    expect(fetch).not.toHaveBeenCalled();
    expect((await rpc("prompts/get", { name: "review" })).result.messages).toHaveLength(1);
  });

  it.each([{ name: "missing" }, { name: "review", arguments: [] }, { name: "review", arguments: { target: 7 } }, { name: "review", arguments: { goal: "x".repeat(1501) } }, { name: "review", arguments: { unknown: "x" } }])(
    "rejects invalid prompt requests: %j", async (params) => expect((await rpc("prompts/get", params)).error.code).toBe(-32602),
  );

  it("makes credential failure actionable for the host-agent fallback", async () => {
    for (const key of ["GEMINI_API_KEY", "GEMINI_API_KEYS", "GOOGLE_API_KEY"]) vi.stubEnv(key, "");
    const res = await rpc("tools/call", { name: "review_change", arguments: { target: "acme/tool#7" } });
    expect(res.result.isError).toBe(true);
    expect(res.result.content[0].text).toMatch(/AI_NOT_CONFIGURED/);
    expect(res.result.content[0].text).toContain("get_review_context");
  });

  it.each([[], "bad", 7, null, { target: 7 }, { target: "acme/tool#7", fast: "yes" }].map((value) => [value]))(
    "returns malformed tool arguments as errors: %j", async (args) => {
      const res = await rpc("tools/call", { name: "review_change", arguments: args });
      expect(res.result.isError).toBe(true);
    },
  );

  it("serves native context without a model call and completes Gemma reviews through JSON-RPC", async () => {
    for (const key of ["GEMINI_API_KEY", "GEMINI_API_KEYS", "GOOGLE_API_KEY"]) vi.stubEnv(key, "");
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("https://generativelanguage.googleapis.com/")) return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ summary: "Retry works.", suggestedTitle: "feat: retry uploads", intent: "matches", findings: [], testsToAdd: [] }) }] } }] });
      if (url.endsWith("/repos/acme/tool")) return Response.json({ private: false, default_branch: "main" });
      if (url.endsWith("/pulls/7")) return Response.json({ number: 7, title: "Retry", body: "Retry uploads", state: "open", html_url: "https://github.com/acme/tool/pull/7", base: { ref: "main" }, head: { ref: "retry" } });
      if (url.includes("/files?")) return Response.json([{ filename: "a.ts", status: "modified", additions: 1, deletions: 1, patch: "@@ -1 +1 @@\n-old\n+retry()" }]);
      if (url.includes("/commits?")) return Response.json([]);
      throw new Error(`Unexpected request ${url}`);
    });
    vi.stubGlobal("fetch", fetch);
    const res = await rpc("tools/call", { name: "get_review_context", arguments: { target: "acme/tool#7" } });
    expect(res.result.isError).toBe(false);
    expect(res.result.structuredContent).toMatchObject({ reviewer: "host-agent", includedFiles: ["a.ts"], partial: false });
    expect(res.result.structuredContent.userPrompt).toContain("+retry()");
    expect(fetch).toHaveBeenCalledTimes(4);
    vi.stubEnv("GEMINI_API_KEY", "test-only");
    const review = await rpc("tools/call", { name: "review_change", arguments: { target: "acme/tool#7", fast: true } });
    expect(review.result.isError).toBe(false);
    expect(review.result.structuredContent).toMatchObject({ ok: true, model: "gemma-4-31b-it", findings: [], verdict: { safeToMerge: true, readyToMerge: true } });
    expect(JSON.parse(review.result.content[0].text)).toEqual(review.result.structuredContent);
    expect(fetch).toHaveBeenCalledTimes(9);
  });

  it.each([null, [], 7, { jsonrpc: "2.0", id: {}, method: "ping" }, { jsonrpc: "2.0", id: 1, method: "ping", params: [] }].map((value) => [value]))(
    "rejects malformed JSON-RPC without throwing: %j", async (value) => {
      expect(await handleMessage(value, buildTools(deps()), "test")).toMatchObject({ error: { code: -32600 } });
    },
  );

  it("keeps stdout framed as JSON-RPC and survives malformed input", async () => {
    const input = new PassThrough();
    let stdout = "";
    const output = new Writable({ write(chunk, _encoding, callback) { stdout += chunk.toString(); callback(); } });
    const running = startMcpServer({ ...deps(), input, output });
    input.end([
      "{broken", "null", "[]",
      JSON.stringify(request("initialize")),
      JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
      JSON.stringify({ ...request("prompts/get", { name: "review", arguments: { target: "acme/tool#7" } }), id: 2 }),
    ].join("\n") + "\n");
    await running;
    const responses = stdout.trim().split("\n").map((line) => JSON.parse(line));
    expect(responses).toHaveLength(5);
    expect(responses).toContainEqual(expect.objectContaining({ error: { code: -32700, message: "Parse error" } }));
    expect(responses).toContainEqual(expect.objectContaining({ id: 2, result: expect.objectContaining({ messages: expect.any(Array) }) }));
  });
});
