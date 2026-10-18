"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Download, Search, X } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";
import { Spotlight } from "@/components/ui/spotlight";
import { AGENTS, DOMAINS, domainLabel, rankSkills, skillSummary, type AgentId, type SkillMeta } from "@/core/skills/search";
import { cn } from "@/lib/cn";
import { SkillMarkdown } from "./skill-markdown";


const AGENT_ORDER: AgentId[] = ["claude", "codex", "cursor", "gemini", "copilot", "opencode"];

function installCommand(names: string, agent: AgentId) {
  return `npx onecliq skills add ${names}${agent === "claude" ? "" : ` --agent ${agent}`}`;
}

/** Search, filter by domain, pick your agent, and copy an install line, or open a skill to read it. */
export function SkillBrowser({ skills }: { skills: SkillMeta[] }) {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState<string>("all");
  const [agent, setAgent] = useState<AgentId>("claude");
  const [openName, setOpenName] = useState<string | null>(null);
  const deferred = useDeferredValue(query);
  const input = useRef<HTMLInputElement>(null);

  const results = useMemo(() => rankSkills(skills, deferred, { domain: domain === "all" ? undefined : domain }), [deferred, domain, skills]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: rankSkills(skills, deferred).length };
    for (const d of DOMAINS) m[d.id] = rankSkills(skills, deferred, { domain: d.id }).length;
    return m;
  }, [deferred, skills]);

  // "/" focuses search, like GitHub and docs sites.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/input|textarea|select/i.test(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const open = skills.find((s) => s.name === openName) ?? null;
  const domainInstall = domain === "all" ? null : installCommand(domain, agent);

  return (
    <div>
      {/* Search + agent */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="ring-glow group flex h-12 flex-1 items-center gap-3 rounded-full border border-night-rule bg-night-raised/80 px-4 backdrop-blur transition-colors focus-within:border-white/25">
          <Search aria-hidden className="size-4 text-night-muted transition-colors group-focus-within:text-lilac" />
          <span className="sr-only">Search skills</span>
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search skills: review, docker, flaky, gemma…"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-night-ink outline-none placeholder:text-night-muted/70"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="grid size-7 place-items-center rounded-full text-night-muted hover:bg-white/10 hover:text-night-ink">
              <X aria-hidden className="size-4" />
            </button>
          ) : (
            <kbd className="hidden rounded-md border border-night-rule px-1.5 py-0.5 font-mono text-[11px] text-night-muted sm:block">/</kbd>
          )}
        </label>
        <div className="flex items-center gap-2 overflow-x-auto rounded-full border border-night-rule bg-night-raised/80 p-1 backdrop-blur" role="radiogroup" aria-label="Your coding agent">
          {AGENT_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={agent === id}
              onClick={() => setAgent(id)}
              className={cn("relative shrink-0 rounded-full px-3 py-1.5 text-[12.5px] transition-colors", agent === id ? "text-night" : "text-night-muted hover:text-night-ink")}
            >
              {agent === id && <motion.span layoutId="agent-pill" className="absolute inset-0 rounded-full bg-night-ink" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
              <span className="relative">{AGENTS[id].label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Domains */}
      <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter by domain">
        {[{ id: "all", label: "All" }, ...DOMAINS].map((d) => (
          <button
            key={d.id}
            type="button"
            aria-pressed={domain === d.id}
            onClick={() => setDomain(d.id)}
            disabled={counts[d.id] === 0 && domain !== d.id}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] transition-[color,border-color,opacity] disabled:opacity-35",
              domain === d.id ? "border-transparent text-night" : "border-night-rule text-night-muted hover:border-white/25 hover:text-night-ink",
            )}
          >
            {domain === d.id && <motion.span layoutId="domain-pill" className="absolute inset-0 rounded-full bg-night-ink" transition={{ type: "spring", stiffness: 480, damping: 36 }} />}
            <span className="relative">{d.label}</span>
            <span className={cn("relative font-mono text-[10.5px]", domain === d.id ? "text-night/60" : "text-night-muted/70")}>{counts[d.id]}</span>
          </button>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {domainInstall && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex items-center gap-3 rounded-[18px] border border-night-rule bg-night/70 py-1.5 pl-4 pr-1.5 font-mono text-[12.5px]">
              <span className="text-ember">$</span>
              <code className="min-w-0 flex-1 truncate text-night-ink">{domainInstall}</code>
              <span className="hidden text-night-muted sm:inline">whole domain</span>
              <CopyButton text={domainInstall} label={`Copy install command for ${domainLabel(domain)}`} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p aria-live="polite" className="mt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-night-muted">
        {results.length} {results.length === 1 ? "skill" : "skills"}
        {deferred && ` for “${deferred}”`}
      </p>

      {/* Grid */}
      <motion.ul layout className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {results.map((s) => {
            const cmd = installCommand(s.name, agent);
            return (
              <motion.li
                key={s.name}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 34 }}
                className="min-w-0"
              >
                <Spotlight tone="night" className="ring-glow group flex h-full flex-col rounded-[22px] border border-night-rule bg-night-raised/80 backdrop-blur transition-transform duration-300 hover:-translate-y-0.5">
                  <button type="button" onClick={() => setOpenName(s.name)} className="flex flex-1 flex-col p-5 text-left" aria-haspopup="dialog">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-lilac">{domainLabel(s.domain)}</span>
                      <ArrowUpRight aria-hidden className="size-4 text-night-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-night-ink" />
                    </span>
                    <span className="mt-3 text-[16px] font-medium text-night-ink">{s.title}</span>
                    <span className="mt-1 font-mono text-[11.5px] text-night-muted">{s.name}</span>
                    <span className="mt-3 text-[13.5px] leading-relaxed text-night-ink/70">{skillSummary(s, 110)}.</span>
                  </button>
                  <div className="flex items-center gap-2 border-t border-night-rule px-3 py-2">
                    <code className="min-w-0 flex-1 truncate pl-2 font-mono text-[11.5px] text-night-muted" title={cmd}>
                      {cmd}
                    </code>
                    <CopyButton text={cmd} compact label={`Copy install command for ${s.name}`} />
                  </div>
                </Spotlight>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </motion.ul>

      {results.length === 0 && (
        <div className="mt-6 rounded-[22px] border border-dashed border-night-rule p-10 text-center text-night-muted">
          Nothing matches “{deferred}”.{" "}
          <button type="button" className="text-lilac underline-offset-4 hover:underline" onClick={() => { setQuery(""); setDomain("all"); }}>
            Show all skills
          </button>
        </div>
      )}

      <SkillDrawer skill={open} agent={agent} onClose={() => setOpenName(null)} />
    </div>
  );
}

function SkillDrawer({ skill, agent, onClose }: { skill: SkillMeta | null; agent: AgentId; onClose: () => void }) {
  const [source, setSource] = useState<{ name: string; text: string } | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!skill) return;
    returnTo.current = document.activeElement as HTMLElement;
    let cancelled = false;
    fetch(`/api/skills/${skill.name}`)
      .then((r) => r.text())
      .then((text) => !cancelled && setSource({ name: skill.name, text }))
      .catch(() => !cancelled && setSource({ name: skill.name, text: "Couldn't load this skill. Try again." }));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => closeBtn.current?.focus(), 50);
    return () => {
      cancelled = true;
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      returnTo.current?.focus?.();
    };
  }, [skill, onClose]);

  const text = skill && source?.name === skill.name ? source.text : null;
  const cmd = skill ? installCommand(skill.name, agent) : "";
  // Portal to <body>: an ancestor's entrance transform would otherwise trap `position: fixed`.
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {skill && (
        <motion.div className="fixed inset-0 z-50 flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="skill-drawer-title"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 36 }}
            className="relative flex h-full w-full max-w-2xl flex-col border-l border-night-rule bg-night text-night-ink shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-night-rule p-5 sm:p-6">
              <div className="min-w-0">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-lilac">
                  {domainLabel(skill.domain)} · v{skill.version}
                </p>
                <h3 id="skill-drawer-title" className="mt-2 font-serif text-[34px] leading-none tracking-[-0.01em]">
                  {skill.title}
                </h3>
                <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-night-muted">{skill.description}</p>
              </div>
              <button
                ref={closeBtn}
                type="button"
                onClick={onClose}
                aria-label="Close skill"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.08] transition-[background-color,transform] hover:rotate-90 hover:bg-white/[0.16]"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
            <div className="space-y-2 border-b border-night-rule p-5 sm:px-6">
              <div className="flex items-center gap-3 rounded-[16px] border border-night-rule bg-night-raised py-1.5 pl-4 pr-1.5 font-mono text-[12.5px]">
                <span className="text-ember">$</span>
                <code className="min-w-0 flex-1 truncate">{cmd}</code>
                <CopyButton text={cmd} label="Copy install command" />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[12.5px] text-night-muted">
                <span>
                  Installs to <code className="font-mono text-night-ink/80">{AGENTS[agent].project}/{skill.name}/SKILL.md</code>
                </span>
                <a href={`/api/skills/${skill.name}?download`} className="inline-flex items-center gap-1 text-lilac hover:underline">
                  <Download aria-hidden className="size-3.5" /> SKILL.md
                </a>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {text ? (
                <SkillMarkdown source={text} />
              ) : (
                <div className="space-y-2" aria-label="Loading">
                  {Array.from({ length: 12 }, (_, i) => (
                    <div key={i} className="h-3.5 animate-pulse rounded bg-white/[0.06]" style={{ width: `${40 + ((i * 37) % 55)}%` }} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

const noSubscribe = () => () => {};
