import Noise from "@/components/designpass/Noise";
import { CliShowcase, CopyCommand } from "@/components/cli-showcase";
import { MicroLabel } from "@/components/ui/micro-label";

const COMMANDS = [
  ["owner/repo", ""],
  ["owner/repo", "windows arm64"],
  ["owner/repo@v1.2.3", ""],
  ["info", "owner/repo"],
  ["list", ""],
  ["update", ""],
  ["trust", "owner/repo"],
  ["malware", "owner/repo"],
  ["verify", "<file> owner/repo"],
  ["review", "12"],
  ["diff", "owner/repo"],
  ["lock", "owner/repo"],
  ["sync", ""],
  ["mcp", ""],
  ["help", "<command>"],
];

/** Night poster section (after the Perplexity “Search like never before” poster). */
export function Cli() {
  return (
    <section id="cli" aria-labelledby="cli-heading" className="relative isolate scroll-mt-8 overflow-hidden bg-night text-night-ink">
      {/* Star field + ember/dusk glow. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(1px_1px_at_12%_18%,white,transparent),radial-gradient(1px_1px_at_32%_8%,white,transparent),radial-gradient(1px_1px_at_68%_14%,white,transparent),radial-gradient(1.5px_1.5px_at_84%_28%,white,transparent),radial-gradient(1px_1px_at_92%_6%,white,transparent),radial-gradient(1px_1px_at_6%_44%,white,transparent),radial-gradient(1px_1px_at_22%_36%,white,transparent),radial-gradient(1px_1px_at_78%_42%,white,transparent),radial-gradient(1.5px_1.5px_at_48%_24%,white,transparent),radial-gradient(1px_1px_at_58%_4%,white,transparent)] opacity-70"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-[38%] -z-10 aspect-square w-[min(1100px,170vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--ember)_95%,white)_0%,var(--ember)_25%,color-mix(in_oklab,var(--dusk)_80%,transparent)_55%,transparent_75%)] opacity-90 blur-2xl"
      />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t from-dusk/50 to-transparent" />
      <Noise preset="film" opacity={0.4} className="-z-10" />

      <div className="mx-auto max-w-6xl px-5 pb-10 pt-24 sm:px-8 sm:pt-32">
        <div className="flex justify-center">
          <MicroLabel className="rounded-full border border-night-rule px-3 py-1 text-night-muted">oqgit</MicroLabel>
        </div>
        <h2
          id="cli-heading"
          className="mx-auto mt-6 max-w-3xl text-balance text-center font-serif text-[clamp(44px,7vw,88px)] font-normal leading-[0.98] tracking-[-0.02em]"
        >
          Same resolver, <em>in your</em> terminal.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-center text-[16px] leading-relaxed text-night-ink/80">
          <code className="font-mono text-night-ink">oqgit</code> reads your OS and CPU directly, downloads the
          matching file, checks GitHub’s SHA-256 digest, and keeps track of what you grabbed so you can check for
          updates later. <code className="font-mono text-night-ink">oqgit trust</code> reads GitHub attestations and
          immutable releases before you install, <code className="font-mono text-night-ink">oqgit.lock.json</code> pins
          binaries for your whole team, and <code className="font-mono text-night-ink">oqgit mcp</code> hands all of it to
          your coding agent. Nothing runs without your say-so.
        </p>
        <div className="mx-auto mt-8 max-w-sm">
          <CopyCommand />
        </div>

        <div className="mx-auto mt-14 max-w-3xl">
          <CliShowcase />
        </div>

        <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2 font-mono text-[12.5px]">
          {COMMANDS.map(([cmd, arg]) => (
            <li key={`${cmd} ${arg}`} className="rounded-full border border-night-rule bg-night/60 px-3 py-1 text-night-muted backdrop-blur">
              <span className="text-lilac">{cmd}</span>
              {arg && ` ${arg}`}
            </li>
          ))}
        </ul>

        <div className="mt-24 grid grid-cols-3 items-end gap-4 font-mono text-[11px] uppercase tracking-[0.14em] text-night-ink/90 sm:text-[12px]">
          <span>Paste a link.</span>
          <span className="text-center">onecliq · oqgit</span>
          <span className="text-right">Get the file.</span>
        </div>
      </div>
    </section>
  );
}
