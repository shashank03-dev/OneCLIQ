import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, Check, Download, GitPullRequest, X } from "lucide-react";
import SoftPatterns from "@/components/designpass/SoftPatterns";
import { InstallCommand } from "@/components/cli-showcase";
import { GuideToc } from "@/components/guide-toc";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteNav } from "@/components/sections/site-nav";
import { McpConnect } from "@/components/skills/mcp-connect";
import { MicroLabel } from "@/components/ui/micro-label";
import { Breadcrumb, NextStep } from "@/components/ui/page-chrome";

export const metadata: Metadata = {
  title: "Start here — OneCLIQ",
  description: "A two-minute guide to OneCLIQ: what it does, which tool you need, and how to use it in your browser, your terminal or your coding agent.",
};

const TOC = [
  { id: "what", label: "What OneCLIQ is" },
  { id: "pick", label: "Pick what you need" },
  { id: "browser", label: "Use it in your browser" },
  { id: "terminal", label: "Use your terminal" },
  { id: "agent", label: "Connect your agent" },
  { id: "safety", label: "Stay safe" },
];

const CHOICES = [
  {
    Icon: Download,
    want: "download an app or tool from GitHub",
    tool: "Download",
    href: "/download",
    text: "Paste the project’s GitHub link. You get the one file for your computer, checked.",
  },
  {
    Icon: GitPullRequest,
    want: "check a pull request before I merge it",
    tool: "Review",
    href: "/review",
    text: "Paste the PR link. You get issues ranked by risk, a verdict and a fix prompt.",
  },
  {
    Icon: BookOpenCheck,
    want: "make my coding agent better at a task",
    tool: "Skills",
    href: "/skills",
    text: "Search for the task. Copy one line and your agent learns the playbook.",
  },
];

const DIRECTIONS = [
  {
    tool: "Download",
    href: "/download",
    steps: [
      "Open the project on github.com and copy the address from your browser’s address bar.",
      "Paste it into the box on the Download page. Your system and chip are filled in for you.",
      "Press Find download, then Download. Open “Trust report” if you want to see who built it.",
    ],
  },
  {
    tool: "Review",
    href: "/review",
    steps: [
      "Copy a pull request link, like github.com/owner/repo/pull/12. A branch or compare link works too.",
      "Paste it on the Review page. Optionally add one line saying what the change should do.",
      "Read the verdict and findings. Press Copy on the fix prompt and paste it into your coding agent.",
    ],
  },
  {
    tool: "Skills",
    href: "/skills",
    steps: [
      "Search for what you’re working on, like “database migrations”, or pick a domain.",
      "Open a skill to read it, choose your agent, and copy the install command.",
      "Run it in your project folder. Next time you ask your agent about that task, it uses the skill.",
    ],
  },
];

function Step({ id, n, title, children, optional }: { id: string; n: number; title: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-28 border-t border-rule py-14 first:border-t-0 first:pt-0">
      <MicroLabel className="text-ink-subtle">
        Step {n}
        {optional && " · optional"}
      </MicroLabel>
      <h2 id={`${id}-heading`} className="mt-3 font-serif text-[clamp(32px,3.6vw,44px)] font-normal leading-[1.05] tracking-[-0.015em]">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function StartPage() {
  return (
    <>
      <SiteNav />
      <main id="main" className="flex-1 bg-paper">
        <header className="relative isolate overflow-hidden pb-16 pt-28 sm:pt-32">
          <SoftPatterns
            pattern="dots"
            backgroundColor="var(--paper)"
            color="var(--ink)"
            spacing={24}
            weight={1}
            patternOpacity={0.09}
            washOpacity={0}
            className="absolute! inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black,transparent)]"
          />
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <Breadcrumb page="start" />
            <h1 className="mt-8 max-w-3xl text-balance font-serif text-[clamp(46px,6.6vw,88px)] font-normal leading-[0.98] tracking-[-0.02em]">
              OneCLIQ in <em>two</em> minutes.
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-muted">
              Read this top to bottom once and you’ll know what each tool does, which one you need, and exactly how to use
              it. Steps 4 and 5 are optional.
            </p>
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl gap-12 px-5 pb-24 sm:px-8 lg:grid-cols-[220px_1fr] lg:gap-16">
          <aside className="hidden lg:block">
            <GuideToc items={TOC} />
          </aside>

          <div className="min-w-0">
            <Step id="what" n={1} title="What OneCLIQ is">
              <p className="max-w-2xl text-[16px] leading-[1.75] text-ink-muted">
                OneCLIQ is a free, open-source toolkit for people who use GitHub. You paste a GitHub link, and it does one
                of three jobs: picks the right file to download, reviews a pull request, or adds a skill to your AI coding
                agent. It runs in your browser with no sign-up. There’s also a terminal tool,{" "}
                <code className="font-mono text-ink">oqgit</code>, that does the same things.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[22px] border border-rule bg-paper-raised p-5">
                  <p className="text-[14px] font-medium">It does</p>
                  <ul className="mt-3 space-y-2 text-[14px] text-ink-muted">
                    {["Pick the file that fits your computer", "Show evidence of where a file came from", "Rank code problems and suggest fixes", "Install playbooks your agent can follow"].map((t) => (
                      <li key={t} className="flex gap-2">
                        <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-moss" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[22px] border border-rule bg-paper-raised p-5">
                  <p className="text-[14px] font-medium">It never</p>
                  <ul className="mt-3 space-y-2 text-[14px] text-ink-muted">
                    {["Hosts, changes or re-packages files", "Installs or runs anything for you", "Asks for an account or a password", "Reviews private code on the website"].map((t) => (
                      <li key={t} className="flex gap-2">
                        <X aria-hidden className="mt-0.5 size-4 shrink-0 text-clay" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Step>

            <Step id="pick" n={2} title="Pick what you need">
              <p className="mb-6 max-w-2xl text-[16px] leading-relaxed text-ink-muted">Finish the sentence “I want to…”:</p>
              <ul className="grid gap-3">
                {CHOICES.map(({ Icon, want, tool, href, text }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="group flex items-center gap-5 rounded-[22px] border border-rule bg-paper-raised p-5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-rule-strong hover:shadow-card"
                    >
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-paper-sunk text-ink transition-transform duration-300 group-hover:-rotate-6">
                        <Icon aria-hidden className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[16px] text-ink">
                          …{want}. <span className="font-medium">Use {tool}.</span>
                        </span>
                        <span className="mt-0.5 block text-[14px] leading-relaxed text-ink-muted">{text}</span>
                      </span>
                      <ArrowRight aria-hidden className="size-5 shrink-0 text-ink-subtle transition-[color,transform] group-hover:translate-x-1 group-hover:text-ink" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Step>

            <Step id="browser" n={3} title="Use it in your browser">
              <p className="mb-6 max-w-2xl text-[16px] leading-relaxed text-ink-muted">
                Nothing to install. Each tool is three moves:
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                {DIRECTIONS.map((d) => (
                  <div key={d.tool} className="flex flex-col rounded-[22px] border border-rule bg-paper-raised p-5">
                    <p className="text-[16px] font-medium">{d.tool}</p>
                    <ol className="mt-4 flex-1 space-y-3">
                      {d.steps.map((s, i) => (
                        <li key={s} className="flex gap-3 text-[13.5px] leading-relaxed text-ink-muted">
                          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-paper-sunk font-mono text-[11px] text-ink">{i + 1}</span>
                          {s}
                        </li>
                      ))}
                    </ol>
                    <Link href={d.href} className="group mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-ink">
                      Open {d.tool}
                      <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                ))}
              </div>
            </Step>

            <Step id="terminal" n={4} title="Use your terminal" optional>
              <p className="mb-6 max-w-2xl text-[16px] leading-relaxed text-ink-muted">
                Install <code className="font-mono text-ink">oqgit</code> if you’d rather type than click, or need private
                repositories. Copy the line for your system into a terminal, then try{" "}
                <code className="font-mono text-ink">oqgit sharkdp/bat</code>.
              </p>
              <div className="rounded-[30px] bg-night p-3 sm:p-4">
                <InstallCommand />
              </div>
              <Link href="/cli" className="group mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-ink">
                See every command
                <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Step>

            <Step id="agent" n={5} title="Connect your coding agent" optional>
              <p className="mb-6 max-w-2xl text-[16px] leading-relaxed text-ink-muted">
                Using Claude Code, Codex, Cursor, Gemini CLI or VS Code? Add OneCLIQ once and just ask in plain words:
                “find a skill for safe database migrations and install it.”
              </p>
              <div className="rounded-[30px] bg-night p-3 sm:p-4">
                <McpConnect />
              </div>
            </Step>

            <Step id="safety" n={6} title="Stay safe">
              <ul className="grid max-w-2xl gap-3 text-[15px] leading-relaxed text-ink-muted">
                <li>
                  <strong className="font-medium text-ink">“Recommended” is about fit, not safety.</strong> It means the file
                  matches your computer. Only install software from projects you trust.
                </li>
                <li>
                  <strong className="font-medium text-ink">Malware checks find known malware only.</strong> A clean result is
                  evidence, not a guarantee.
                </li>
                <li>
                  <strong className="font-medium text-ink">Reviews send the diff to Google’s Gemini API.</strong> The website
                  only reviews public repositories; use <code className="font-mono text-ink">oqgit review</code> for private code.
                </li>
              </ul>
            </Step>
          </div>
        </div>

        <NextStep page="start" className="pb-24" />
      </main>
      <SiteFooter />
    </>
  );
}
