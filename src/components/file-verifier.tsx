"use client";

import { useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CircleCheck, CircleX, FileSearch, Loader2, TriangleAlert, Upload } from "lucide-react";
import { parseGitHubUrl } from "@/core/parse-url";
import { formatBytes } from "@/core/labels";
import { cn } from "@/lib/cn";
import { postJson } from "@/lib/api";

interface VerifyResult {
  ok: true;
  repo: string;
  sha256: string;
  scanned: number;
  match: { tag: string; name: string; url: string; publishedAt: string | null; prerelease: boolean; latest: boolean } | null;
  attestations: { total: number; build: number; release: number } | null;
}

type State =
  | { kind: "idle" }
  | { kind: "hashing"; name: string; size: number }
  | { kind: "checking"; name: string; sha256: string }
  | { kind: "done"; name: string; result: VerifyResult }
  | { kind: "error"; message: string };

/** Browsers hold the whole file in memory to hash it; past this, use `oqgit verify`. */
const MAX_BYTES = 2 * 1024 ** 3;

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function FileVerifier() {
  const ids = { repo: useId(), file: useId(), hint: useId() };
  const [repo, setRepo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [state, setState] = useState<State>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();
  const busy = state.kind === "hashing" || state.kind === "checking";

  async function run(f = file) {
    if (!f) return setState({ kind: "error", message: "Choose the file you downloaded." });
    try {
      parseGitHubUrl(repo, { allowShorthand: true });
    } catch {
      return setState({ kind: "error", message: "Enter the repository it should come from, like cli/cli." });
    }
    if (f.size > MAX_BYTES) return setState({ kind: "error", message: `That file is over 2 GB. Use oqgit verify ${f.name} ${repo} instead.` });

    setState({ kind: "hashing", name: f.name, size: f.size });
    let sha256: string;
    try {
      sha256 = await sha256Hex(f);
    } catch {
      return setState({ kind: "error", message: "Your browser couldn’t read that file." });
    }
    setState({ kind: "checking", name: f.name, sha256 });
    try {
      const body = await postJson<VerifyResult>("/api/verify", { repo, sha256 });
      if (body.ok) setState({ kind: "done", name: f.name, result: body });
      else setState({ kind: "error", message: body.error.message });
    } catch {
      setState({ kind: "error", message: "We couldn’t reach the verifier. Try again." });
    }
  }

  function pick(f: File | undefined | null) {
    if (!f) return;
    setFile(f);
    setState({ kind: "idle" });
  }

  return (
    <div className="rounded-[28px] border border-rule bg-paper-raised/85 p-2 shadow-card sm:p-2.5">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
        className="grid gap-2"
      >
        <label
          htmlFor={ids.file}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed bg-paper px-4 py-6 text-center transition-colors",
            drag ? "border-ember bg-ember/[0.04]" : "border-rule-strong hover:border-ink/30",
          )}
        >
          <Upload aria-hidden className="size-5 text-ink-subtle" />
          {file ? (
            <span className="break-all font-mono text-[14px] text-ink">
              {file.name} <span className="text-ink-subtle">· {formatBytes(file.size)}</span>
            </span>
          ) : (
            <span className="text-[14px] text-ink-muted">
              Drop a file you downloaded, or <span className="text-ink underline underline-offset-4">choose one</span>
            </span>
          )}
          <span className="text-[12px] text-ink-subtle">Hashed in your browser. The file never leaves this device.</span>
          <input
            ref={inputRef}
            id={ids.file}
            type="file"
            data-testid="verify-file"
            className="sr-only"
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <label htmlFor={ids.repo} className="pointer-events-none absolute left-4 top-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-subtle">
              Should come from
            </label>
            <input
              id={ids.repo}
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="owner/repo or github.com link"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-describedby={ids.hint}
              className="h-14 w-full rounded-[20px] border border-rule bg-paper px-4 pt-4 font-mono text-[14px] text-ink outline-none transition-colors placeholder:text-ink-subtle hover:border-rule-strong focus-visible:border-ink/40"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-[20px] bg-ink px-6 text-[15px] font-medium text-paper transition-transform active:scale-[0.98] disabled:cursor-wait disabled:opacity-80"
          >
            {busy ? <Loader2 aria-hidden className="size-4.5 animate-spin" /> : <FileSearch aria-hidden className="size-4.5" />}
            {state.kind === "hashing" ? "Hashing…" : state.kind === "checking" ? "Checking…" : "Verify file"}
          </button>
        </div>
        <p id={ids.hint} className="px-3 pb-1 text-[12.5px] text-ink-subtle">
          We send GitHub only the file’s SHA-256 and look for it in the repo’s last 100 releases and attestations.
        </p>
      </form>

      <div aria-live="polite" className="px-1 pb-1">
        {state.kind === "error" && (
          <p role="alert" className="mx-1 mb-1 mt-2 rounded-[18px] border border-ochre/25 bg-ochre/[0.06] px-4 py-3 text-[14px] text-ink">
            {state.message}
          </p>
        )}
        {state.kind === "done" && (
          <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <VerifyVerdict result={state.result} name={state.name} />
          </motion.div>
        )}
      </div>
    </div>
  );
}

function VerifyVerdict({ result, name }: { result: VerifyResult; name: string }) {
  const att = result.attestations;
  const attText = !att
    ? "Couldn’t check attestations right now."
    : att.total
      ? `GitHub holds ${att.total} attestation${att.total === 1 ? "" : "s"} for these exact bytes${att.build ? `, ${att.build} from the repo’s build workflow` : ""}.`
      : "GitHub has no attestations for these bytes.";

  if (result.match) {
    const m = result.match;
    return (
      <div data-testid="verify-result" className="mx-1 mt-2 rounded-[18px] border border-moss/25 bg-moss/[0.06] p-4">
        <p className="flex items-center gap-2 font-medium text-moss">
          <CircleCheck aria-hidden className="size-5" /> Published by {result.repo}
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-ink">
          <span className="font-mono">{name}</span> is byte-for-byte <span className="font-mono">{m.name}</span> from{" "}
          <a href={m.url} target="_blank" rel="noopener noreferrer" className="font-mono underline underline-offset-4">
            {m.tag}
          </a>
          {m.latest ? " — the latest release." : "."}
          {!m.latest && <span className="text-ochre"> A newer release exists.</span>}
          {m.prerelease && <span className="text-ochre"> That’s a pre-release.</span>}
        </p>
        <p className="mt-1.5 text-[13px] text-ink-muted">{attText}</p>
        {att?.build ? (
          <p className="mt-2 text-[12px] text-ink-subtle">
            Check the signature too: <code className="break-all font-mono">gh attestation verify {name} --repo {result.repo}</code>
          </p>
        ) : null}
        <p className="mt-2 break-all font-mono text-[11px] text-ink-subtle">sha256 {result.sha256}</p>
      </div>
    );
  }
  const attested = !!att?.total;
  return (
    <div
      data-testid="verify-result"
      className={cn("mx-1 mt-2 rounded-[18px] border p-4", attested ? "border-ochre/25 bg-ochre/[0.06]" : "border-clay/25 bg-clay/[0.06]")}
    >
      <p className={cn("flex items-center gap-2 font-medium", attested ? "text-ochre" : "text-clay")}>
        {attested ? <TriangleAlert aria-hidden className="size-5" /> : <CircleX aria-hidden className="size-5" />}
        {attested ? "Not a release file, but attested" : `Not found in ${result.repo}’s releases`}
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-ink">
        No file in the last {result.scanned} releases has this digest. It may be edited, corrupted, from somewhere else, or
        from a release GitHub didn’t record digests for. Don’t run it until you know where it came from.
      </p>
      <p className="mt-1.5 text-[13px] text-ink-muted">{attText}</p>
      <p className="mt-2 break-all font-mono text-[11px] text-ink-subtle">sha256 {result.sha256}</p>
    </div>
  );
}
