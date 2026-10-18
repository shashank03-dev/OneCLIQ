"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/cn";

const CLIENTS = [
  { id: "claude", label: "Claude Code", file: null, code: "claude mcp add oqgit -- npx -y onecliq mcp", invoke: "/oqgit:review https://github.com/owner/repo/pull/12", note: "Or type / and select oqgit:review from the MCP prompts." },
  { id: "codex", label: "Codex CLI", file: "~/.codex/config.toml · merge into your configuration", code: '[mcp_servers.oqgit]\ncommand = "npx"\nargs = ["-y", "onecliq", "mcp"]\nstartup_timeout_sec = 60\ntool_timeout_sec = 360\nenv_vars = ["GEMINI_API_KEY", "GEMINI_API_KEYS", "GOOGLE_API_KEY", "GITHUB_TOKEN", "GH_TOKEN"]', invoke: "$onecliq-review https://github.com/owner/repo/pull/12", note: "Install the shortcut: npx -y onecliq skills add onecliq-review --agent codex. Or ask Codex to use oqgit in plain words." },
  { id: "gemini", label: "Gemini CLI", file: null, code: "gemini mcp add oqgit npx -y onecliq mcp", invoke: "/review https://github.com/owner/repo/pull/12", note: "MCP prompts become slash commands. Check /help if another server also supplies review." },
  {
    id: "cursor",
    label: "Cursor",
    file: ".cursor/mcp.json",
    code: `{\n  "mcpServers": {\n    "oqgit": { "command": "npx", "args": ["-y", "onecliq", "mcp"] }\n  }\n}`,
    invoke: "Use oqgit to review https://github.com/owner/repo/pull/12",
    note: "Enable the server's tools in your agent session, then send this request.",
  },
  {
    id: "vscode",
    label: "VS Code",
    file: ".vscode/mcp.json",
    code: `{\n  "servers": {\n    "oqgit": { "command": "npx", "args": ["-y", "onecliq", "mcp"] }\n  }\n}`,
    invoke: "Use oqgit to review https://github.com/owner/repo/pull/12",
    note: "Enable oqgit in the chat tools picker, then send this request.",
  },
] as const;

const TOOLS = ["review_change", "get_review_context", "search_skills", "get_skill", "install_skill", "resolve_release", "release_trust", "check_malware"];

/** Connection and review invocation for each client's supported interface. */
export function McpConnect() {
  const [id, setId] = useState<(typeof CLIENTS)[number]["id"]>("claude");
  const client = CLIENTS.find((c) => c.id === id)!;
  return (
    <div className="rounded-[26px] border border-night-rule bg-night-raised/80 p-2 shadow-2xl shadow-black/40 backdrop-blur">
      <div role="tablist" aria-label="Connect from" className="flex gap-1 overflow-x-auto p-1">
        {CLIENTS.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === id}
            onClick={() => setId(c.id)}
            className={cn("relative shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors", c.id === id ? "text-night" : "text-night-muted hover:text-night-ink")}
          >
            {c.id === id && <motion.span layoutId="mcp-tab" className="absolute inset-0 rounded-full bg-night-ink" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
            <span className="relative">{c.label}</span>
          </button>
        ))}
      </div>
      <div className="px-3 pb-1 pt-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-night-muted">Then request a review</p>
        <div className="mt-2 flex items-start gap-2">
          <code className="min-w-0 flex-1 whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-lilac [overflow-wrap:anywhere]">{client.invoke}</code>
          <CopyButton text={client.invoke} compact label="Copy review request" />
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-night-muted">{client.note}</p>
        <p className="mt-2 text-[12px] leading-relaxed text-night-muted">Gemma needs a Gemini key in the server environment. Without one, your agent can review the fetched diff with its own model. Local reviews use the server’s working directory.</p>
      </div>
      <div className="relative mt-1 rounded-[20px] border border-night-rule bg-night p-4 pr-14 font-mono text-[12.5px] text-night-ink">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
            {client.file && <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-night-muted">{client.file}</p>}
            <pre className="whitespace-pre-wrap leading-[1.7] [overflow-wrap:anywhere]">
              {!client.file && <span className="text-ember">$ </span>}
              {client.code}
            </pre>
          </motion.div>
        </AnimatePresence>
        <CopyButton text={client.code} compact label={`Copy ${client.label} setup`} className="absolute right-3 top-3" />
      </div>
      <div className="flex flex-wrap gap-1.5 px-2 pb-2 pt-3">
        {TOOLS.map((t, i) => (
          <span key={t} className={cn("rounded-full border px-2.5 py-0.5 font-mono text-[11px]", i < 3 ? "border-lilac/30 text-lilac" : "border-night-rule text-night-muted")}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
