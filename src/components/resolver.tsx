"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ChevronDown, CircleAlert, Loader2, RotateCcw } from "lucide-react";
import { GithubIcon } from "./ui/github-icon";
import { parseGitHubUrl } from "@/core/parse-url";
import { ResolveError } from "@/core/errors";
import { ARCHES_FOR_OS, OS_LABELS, archLabel } from "@/core/labels";
import { OS_VALUES, type Arch, type ErrorCode, type Os, type ResolveResponse, type ResolveSuccess } from "@/core/types";
import { detectPlatform, type DetectedPlatform } from "@/lib/detect-platform";
import { cn } from "@/lib/cn";
import { ResultCard } from "./result-card";
import JellyButton from "./designpass/JellyButton";
import { postJson } from "@/lib/api";

const EXAMPLES = [
  { label: "cli/cli", url: "https://github.com/cli/cli" },
  { label: "BurntSushi/ripgrep", url: "https://github.com/BurntSushi/ripgrep" },
  { label: "neovim/neovim", url: "https://github.com/neovim/neovim" },
  { label: "sharkdp/bat", url: "https://github.com/sharkdp/bat" },
];

const PLACEHOLDERS = [
  "https://github.com/owner/repo",
  "https://github.com/cli/cli",
  "https://github.com/owner/repo/releases/tag/v1.2.0",
  "github.com/neovim/neovim",
];

const ERROR_TITLES: Record<ErrorCode, string> = {
  INVALID_URL: "That link doesn’t look right",
  INVALID_REQUEST: "Something’s missing",
  REPO_NOT_FOUND: "Repository not found",
  RELEASE_NOT_FOUND: "Release not found",
  NO_RELEASES: "No releases yet",
  NO_STABLE_RELEASE: "No stable release",
  RATE_LIMITED: "Slow down a moment",
  TIMEOUT: "GitHub didn’t answer in time",
  NETWORK: "Couldn’t reach the server",
  UPSTREAM: "Something went wrong",
  PR_NOT_FOUND: "Pull request not found",
  AI_NOT_CONFIGURED: "Reviews aren’t set up",
  AI_ERROR: "The reviewer didn’t answer",
  AI_RATE_LIMITED: "Review quota reached",
};

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; result: ResolveSuccess }
  | { kind: "error"; code: ErrorCode; message: string; retryAfter?: number };

export function Resolver() {
  const ids = { url: useId(), urlHint: useId(), os: useId(), arch: useId(), sysHint: useId() };
  const [url, setUrl] = useState("");
  const [os, setOs] = useState<Os | "">("");
  const [arch, setArch] = useState<Arch | "">("");
  const [detected, setDetected] = useState<DetectedPlatform | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [state, setState] = useState<State>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    detectPlatform()
      .then((d) => {
        if (cancelled) return;
        setDetected(d);
        // Only pre-fill what the browser actually told us; otherwise leave it for the user.
        if (d.os) setOs((cur) => cur || d.os!);
        if (d.os && d.arch && ARCHES_FOR_OS[d.os].includes(d.arch)) setArch((cur) => cur || d.arch!);
      })
      .catch(() => setDetected({ mobile: false }));
    return () => {
      cancelled = true;
    };
  }, []);

  function changeOs(next: Os | "") {
    setOs(next);
    if (next && arch && !ARCHES_FOR_OS[next].includes(arch)) setArch("");
  }

  async function submit(value = url) {
    setFieldError(null);
    try {
      parseGitHubUrl(value);
    } catch (err) {
      setFieldError(err instanceof ResolveError ? err.message : "Paste a GitHub repository or release URL.");
      inputRef.current?.focus();
      return;
    }
    if (!os || !arch) {
      setState({ kind: "error", code: "INVALID_REQUEST", message: "Choose your operating system and architecture first." });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ kind: "loading" });

    try {
      const body = await postJson<ResolveResponse>("/api/resolve", { url: value, os, arch }, controller.signal);
      if (body.ok) {
        setState({ kind: "success", result: body });
      } else if (body.error.code === "INVALID_URL") {
        setState({ kind: "idle" });
        setFieldError(body.error.message);
        inputRef.current?.focus();
      } else {
        setState({ kind: "error", ...(body.error as Extract<ResolveResponse, { ok: false }>["error"]) });
      }
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      setState({
        kind: "error",
        code: "NETWORK",
        message: "We couldn’t reach the resolver. Check your connection and try again.",
      });
    }
  }

  const loading = state.kind === "loading";
  const archOptions = os ? ARCHES_FOR_OS[os] : [];
  const archGuess = detected?.archCertainty === "likely" && arch === detected.arch;
  const osGuess = detected?.osCertainty === "likely" && os === detected.os;

  let systemHint = "";
  if (!detected) systemHint = "Detecting your system…";
  else if (detected.mobile) systemHint = "You’re on a phone or tablet — choose the computer you’ll install on.";
  else if (!os || !arch) systemHint = "We couldn’t detect your system reliably — please choose.";
  else if (os !== detected.os || arch !== detected.arch) systemHint = "Using the system you chose.";
  else if (osGuess || archGuess) systemHint = "Detected from your browser — double-check before downloading.";
  else systemHint = "Detected automatically. Change it if you’re downloading for another machine.";

  return (
    <div className="w-full">
      <section aria-label="Find a download" className="rounded-[28px] border border-rule bg-paper-raised/85 p-2 shadow-card backdrop-blur-md sm:p-2.5">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="relative"
        >
          <label htmlFor={ids.url} className="sr-only">
            GitHub repository or release URL
          </label>
          <div
            className={cn(
              "relative flex items-center gap-3 rounded-[20px] border bg-paper px-4 transition-colors",
              fieldError ? "border-clay/60" : "border-rule focus-within:border-ink/40",
            )}
          >
            <GithubIcon className="size-5 shrink-0 text-ink-subtle" />
            <div className="relative h-14 flex-1">
              <input
                ref={inputRef}
                id={ids.url}
                name="url"
                type="url"
                inputMode="url"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (fieldError) setFieldError(null);
                }}
                aria-invalid={!!fieldError}
                aria-describedby={ids.urlHint}
                className="peer absolute inset-0 w-full bg-transparent font-mono text-[15px] text-ink outline-none"
              />
              {!url && <CyclingPlaceholder />}
            </div>
          </div>
          <p
            id={ids.urlHint}
            role={fieldError ? "alert" : undefined}
            className={cn("px-3 pt-2 text-[13px]", fieldError ? "text-clay" : "text-ink-subtle")}
          >
            {fieldError ?? "Repository or release link from github.com."}
          </p>

          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Select
              id={ids.os}
              label="Operating system"
              value={os}
              onChange={(v) => changeOs(v as Os | "")}
              describedBy={ids.sysHint}
              options={OS_VALUES.map((v) => ({ value: v, label: OS_LABELS[v] }))}
            />
            <Select
              id={ids.arch}
              label="Architecture"
              value={arch}
              onChange={(v) => setArch(v as Arch | "")}
              describedBy={ids.sysHint}
              disabled={!os}
              options={archOptions.map((v) => ({ value: v, label: archLabel(os as Os, v) }))}
            />
            <JellyButton
              type="submit"
              disabled={loading}
              magnet={false}
              wrapperClassName="w-full sm:w-auto"
              className="h-14 w-full gap-2 rounded-[20px]! px-6! text-[15px]! font-medium! disabled:cursor-wait disabled:opacity-80"
            >
              {loading ? (
                <>
                  <Loader2 aria-hidden className="size-4.5 animate-spin" />
                  Finding…
                </>
              ) : (
                <>
                  Find download
                  <ArrowRight aria-hidden className="size-4.5" />
                </>
              )}
            </JellyButton>
          </div>
          <p id={ids.sysHint} className="px-3 pb-1 pt-2.5 text-[13px] text-ink-subtle" aria-live="polite">
            {systemHint}
          </p>
        </form>
      </section>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 px-1 text-[13px] text-ink-subtle">
        <span>Try</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            onClick={() => {
              setUrl(ex.url);
              void submit(ex.url);
            }}
            className="rounded-full border border-rule bg-paper-raised/80 px-3 py-1 font-mono text-[12.5px] text-ink-muted transition-colors hover:border-rule-strong hover:text-ink"
          >
            {ex.label}
          </button>
        ))}
      </div>

      <div className="mt-8" aria-live="polite" aria-busy={loading}>
        <AnimatePresence mode="wait">
          {state.kind === "loading" && <LoadingCard key="loading" />}
          {state.kind === "success" && <ResultCard key={state.result.release.url + state.result.platform.os + state.result.platform.arch} result={state.result} />}
          {state.kind === "error" && (
            <ErrorCard key="error" state={state} onRetry={() => void submit()} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  options,
  disabled,
  describedBy,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  describedBy?: string;
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="pointer-events-none absolute left-4 top-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-subtle">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
        className="h-14 w-full cursor-pointer rounded-[20px] border border-rule bg-paper pl-4 pr-10 pt-4 text-[15px] text-ink outline-none transition-colors hover:border-rule-strong focus-visible:border-ink/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="" disabled>
          Choose…
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-paper-raised">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
    </div>
  );
}

/** Rotating example placeholder (after Aceternity's Placeholders & Vanish Input). Decorative only. */
function CyclingPlaceholder() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((n) => (n + 1) % PLACEHOLDERS.length), 3200);
    return () => clearInterval(t);
  }, [reduce]);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.span
          key={i}
          initial={reduce ? false : { y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -14, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="truncate font-mono text-[15px] text-ink-subtle"
        >
          {PLACEHOLDERS[i]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function LoadingCard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="rounded-[24px] border border-rule bg-paper-raised p-7 shadow-card"
    >
      <span className="sr-only">Looking up the release…</span>
      <div aria-hidden className="space-y-4">
        <div className="h-7 w-32 animate-pulse rounded-full bg-paper-sunk" />
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-paper-sunk" />
        <div className="h-20 animate-pulse rounded-2xl bg-paper-sunk" />
        <div className="h-12 w-40 animate-pulse rounded-full bg-paper-sunk" />
      </div>
    </motion.div>
  );
}

function ErrorCard({
  state,
  onRetry,
}: {
  state: Extract<State, { kind: "error" }>;
  onRetry: () => void;
}) {
  const retryable = ["RATE_LIMITED", "TIMEOUT", "NETWORK", "UPSTREAM"].includes(state.code);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      role="alert"
      data-testid="error-card"
      className="flex gap-4 rounded-[24px] border border-ochre/25 bg-paper-raised p-5 shadow-card sm:p-6"
    >
      <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-ochre" />
      <div>
        <h2 className="font-semibold">{ERROR_TITLES[state.code]}</h2>
        <p className="mt-1 text-[15px] leading-relaxed text-ink-muted">{state.message}</p>
        {state.code === "RATE_LIMITED" && state.retryAfter ? (
          <p className="mt-1 text-[13px] text-ink-subtle">Try again in about {formatWait(state.retryAfter)}.</p>
        ) : null}
        {retryable && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-rule-strong bg-paper px-4 py-2 text-sm text-ink transition-colors hover:border-ink/40"
          >
            <RotateCcw aria-hidden className="size-3.5" />
            Try again
          </button>
        )}
      </div>
    </motion.div>
  );
}

function formatWait(seconds: number): string {
  if (seconds < 90) return `${Math.max(1, Math.round(seconds))} seconds`;
  return `${Math.round(seconds / 60)} minutes`;
}
