import { Fingerprint, GitCompareArrows, Lock } from "lucide-react";
import SoftPatterns from "@/components/designpass/SoftPatterns";
import { FileVerifier } from "@/components/file-verifier";
import { MicroLabel } from "@/components/ui/micro-label";

const POINTS = [
  {
    Icon: Fingerprint,
    title: "Byte-for-byte match",
    description: "Finds the exact release file with the same SHA-256, and tells you if it's outdated.",
  },
  {
    Icon: Lock,
    title: "Attestations, not vibes",
    description: "Checks whether GitHub holds signed build provenance for those exact bytes.",
  },
  {
    Icon: GitCompareArrows,
    title: "Nothing uploaded",
    description: "Your browser hashes the file. Only the 64-character digest is sent.",
  },
];

export function Verify() {
  return (
    <section id="verify" aria-labelledby="verify-heading" className="relative isolate scroll-mt-8 overflow-hidden bg-paper py-20 sm:py-28">
      <SoftPatterns
        pattern="dots"
        backgroundColor="var(--paper)"
        color="var(--ink)"
        spacing={24}
        weight={1}
        patternOpacity={0.1}
        washOpacity={0}
        className="absolute! inset-0 -z-10"
      />
      <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <MicroLabel className="inline-flex items-center gap-2 rounded-full border border-rule bg-paper-raised px-3 py-1.5 text-ink-subtle">
            <Fingerprint aria-hidden className="size-3" /> Already downloaded something?
          </MicroLabel>
          <h2 id="verify-heading" className="mt-7 max-w-lg text-balance font-serif text-[clamp(44px,5vw,68px)] font-normal leading-[0.98] tracking-[-0.025em]">
            Is this file <em>really</em> theirs?
          </h2>
          <p className="mt-6 max-w-md text-[16px] leading-[1.75] text-ink-muted">
            Binaries get mirrored, re-hosted and passed around in chat. Drop one here and we’ll check it against the
            project’s own GitHub releases.
          </p>
          <ul className="mt-10 space-y-5">
            {POINTS.map(({ Icon, title, description }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-rule bg-paper-raised text-ink">
                  <Icon aria-hidden className="size-[18px]" />
                </span>
                <div>
                  <h3 className="text-[14px] font-medium text-ink">{title}</h3>
                  <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-ink-muted">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0 lg:pt-4">
          <FileVerifier />
          <p className="mt-4 px-2 font-mono text-[11px] uppercase tracking-[0.13em] text-ink-subtle">
            In a terminal: oqgit verify ./file owner/repo
          </p>
        </div>
      </div>
    </section>
  );
}
