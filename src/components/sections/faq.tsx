import Link from "next/link";
import { Plus } from "lucide-react";
import { MicroLabel } from "@/components/ui/micro-label";
import { GITHUB_URL } from "@/lib/site";

const QUESTIONS: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: "What is OneCLIQ, in one sentence?",
    a: "A free, open-source toolkit for GitHub: it picks the right download from a release, reviews pull requests with Gemma 4, and installs expert skills into your coding agent.",
  },
  {
    q: "Do I need an account or to install anything?",
    a: (
      <>
        No. Every tool works in your browser with no sign-up. The <Link href="/cli" className="underline decoration-rule-strong underline-offset-4 hover:decoration-ink">oqgit CLI</Link> is optional: you only need it for terminal use, private repositories or your coding agent.
      </>
    ),
  },
  {
    q: "Does OneCLIQ host or change the files I download?",
    a: "Never. The Download button links straight to the file on GitHub. OneCLIQ doesn’t mirror, repackage, install or run anything.",
  },
  {
    q: "Does “Recommended” mean the file is safe?",
    a: "It means the file matches your computer. The trust report and malware check add evidence (who built it, whether it changed, known malware), but they can’t prove software is harmless. Only install software you trust.",
  },
  {
    q: "What happens to my code when I ask for a review?",
    a: "The pull request’s diff is sent to Google’s Gemini API to run Gemma 4. The website only reviews public repositories. For private code, run oqgit review on your own machine with your own key.",
  },
  {
    q: "Which coding agents can use the skills?",
    a: "Claude Code, Codex CLI, Cursor, Gemini CLI, GitHub Copilot and OpenCode. Skills are plain SKILL.md files that follow the open Agent Skills standard.",
  },
];

/** Accordion of the questions people ask before trying it (native <details>, works without JS). */
export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-24 border-t border-rule bg-paper py-24 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <MicroLabel className="text-ink-subtle">Questions</MicroLabel>
          <h2 id="faq-heading" className="mt-4 text-balance font-serif text-[clamp(38px,4.6vw,58px)] font-normal leading-[1] tracking-[-0.02em]">
            Good to <em>know</em>.
          </h2>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-muted">
            Something else? Read the <Link href="/start" className="text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink">Start here</Link> guide or{" "}
            <a href={`${GITHUB_URL}/issues/new/choose`} className="text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink">ask on GitHub</a>.
          </p>
        </div>
        <div className="divide-y divide-rule border-y border-rule">
          {QUESTIONS.map(({ q, a }) => (
            <details key={q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[16px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                {q}
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-rule text-ink-muted transition-[transform,background-color,color] duration-300 group-open:rotate-45 group-open:bg-ink group-open:text-paper">
                  <Plus aria-hidden className="size-4" />
                </span>
              </summary>
              <p className="max-w-xl pb-6 pr-12 text-[15px] leading-relaxed text-ink-muted">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
