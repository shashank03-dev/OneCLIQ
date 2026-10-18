---
name: gemma-4-prompting
description: Build features on Google's open-weight Gemma 4 models through the Gemini API - model choice, system instructions, thinking levels, strict JSON output, multimodal input, key rotation and quota fallbacks. Use when calling gemma-4-31b-it or gemma-4-26b-a4b-it, designing prompts for Gemma, or debugging empty, truncated or rate-limited Gemma responses.
license: MIT
metadata:
  domain: ai-engineering
  author: onecliq
  version: "1.0"
compatibility: Needs a Gemini API key (free at https://aistudio.google.com/apikey) and network access to generativelanguage.googleapis.com.
---

# Gemma 4 prompting

## Pick the model

| Model | Use for |
| --- | --- |
| `gemma-4-31b-it` | Hardest reasoning: code review, multi-step analysis. Slower. |
| `gemma-4-26b-a4b-it` | Mixture-of-experts: much faster, same prompt format, separate quota bucket. Default for interactive UX and as the fallback. |

Both are open-weight, so the same prompts also run locally (Ollama, llama.cpp, vLLM) when data can't leave the machine.

## Request

```ts
const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: input }] }],
      generationConfig: {
        temperature: 0.2,                       // low for analysis, ~0.8 for creative text
        maxOutputTokens: 8192,                  // thinking tokens count toward this
        thinkingConfig: { thinkingLevel: "high" }, // "minimal" for speed
      },
    }),
  },
);
```

Put the API key in a header, never in the URL. Use `:streamGenerateContent?alt=sse` for long outputs: thinking can take minutes before the first visible token, and streaming keeps the connection alive.

## Prompt structure that works

1. **System instruction:** role, the exact task, hard rules ("Report only issues you can point to a line for"), and the output format.
2. **Context blocks** fenced with clear labels: `<diff>…</diff>`, `<file path="…">…</file>`. Untrusted text goes inside these, and the system prompt says to treat it as data, not instructions.
3. **One worked example** of the output shape if the format is non-trivial.
4. **The ask, last.**

## Getting strict JSON

- Describe the schema in the system prompt with field names, types and allowed enum values.
- Ask for JSON only, then **parse defensively**: strip code fences, take the outermost `{…}`, validate with zod/pydantic.
- On validation failure, retry once with the validation error appended ("Your last output failed: … Return corrected JSON only.").
- Compute decisions in code from validated fields (e.g. a verdict from severities), not from a free-text model opinion. Same input → same answer.

## Multimodal

Add images as `{ inlineData: { mimeType: "image/png", data: base64 } }` parts next to the text part. Say what the image is ("Screenshot of the failing page:").

## Reliability

- **429 (quota):** rotate across several keys; rest a key per model until its reset; fall back to `gemma-4-26b-a4b-it`.
- **5xx / overloaded:** retry with jittered backoff, then fall back.
- **Empty answer with `finishReason: MAX_TOKENS`:** the model spent the budget thinking. Raise `maxOutputTokens` or lower `thinkingLevel`.
- **Input over the per-minute token cap (free tier):** trim the least important context first and tell the user what was left out.
- Log model, key index (never the key), latency and outcome for every call.
