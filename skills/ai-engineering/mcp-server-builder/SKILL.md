---
name: mcp-server-builder
description: Design and build Model Context Protocol (MCP) servers that coding agents use well - tool naming, descriptions, input schemas, read-only defaults, errors and stdio transport. Use when exposing an API, CLI or database to Claude Code, Cursor, Codex or other agents through MCP, or when improving a server agents misuse.
license: MIT
metadata:
  domain: ai-engineering
  author: onecliq
  version: "1.0"
---

# Build an MCP server

An agent sees only your tool **names, descriptions and schemas**. Those are the product. Write them like docs for a smart colleague who has never seen your system.

## Design tools around tasks

- One tool per **user intent**, not per endpoint: `resolve_release` instead of `list_releases` + `list_assets` + `match_asset`.
- 3–10 tools. Too many and agents pick the wrong one.
- Names: `verb_noun`, snake_case, unambiguous across servers (`search_skills`, not `search`).

## Descriptions

Say **what it does, when to use it, what it returns, and what it won't do**:

> "Find the release file that fits a machine for a GitHub repo. Returns the exact download URL, size and SHA-256, or why no file is a reliable match. Never guesses."

Add `annotations`: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`. Clients use them to decide when to ask the user.

## Input schemas

- JSON Schema with `required`, `enum` for fixed choices, and a `description` on every property with an example format.
- Accept the forms agents naturally produce (`owner/repo` *and* full URLs).
- Validate and return a clear error for bad input rather than throwing deep inside.

## Output

- Return `structuredContent` (JSON) plus a `text` content block for clients that only show text.
- Keep it compact: agents pay for every token. Summaries first, details on request (pagination, `limit`).
- Errors: `isError: true` with a message that says how to fix the call ("Pass os and arch; this machine couldn't be identified.").

## Safety

- **Read-only by default.** Side-effecting tools only behind an explicit flag (`--allow-download`) and with `destructiveHint`.
- Never execute downloaded content. Resolve relative paths inside a known working directory.
- Treat everything coming back from the outside world as untrusted data; don't let it become instructions.

## stdio transport essentials

- Newline-delimited JSON-RPC 2.0 on stdin/stdout. **Never print logs to stdout**: use stderr.
- Handle `initialize` (negotiate `protocolVersion`, declare `capabilities.tools`), `tools/list`, `tools/call`, `ping`; ignore notifications.
- Use the official SDK (`@modelcontextprotocol/sdk`, `mcp` for Python) unless you need zero dependencies.

## Install lines for users

```bash
claude mcp add myserver -- npx -y my-package mcp         # Claude Code
codex mcp add myserver -- npx -y my-package mcp          # Codex CLI
gemini mcp add myserver npx -y my-package mcp            # Gemini CLI
```

Cursor / VS Code / Windsurf: an `mcpServers` entry with `command` and `args` in their MCP JSON config.

## Test it

Use the MCP Inspector (`npx @modelcontextprotocol/inspector <command>`), then ask a real agent to do the task with no hints. If it picks the wrong tool or wrong args, fix the description, not the agent.
