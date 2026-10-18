import type { Metadata } from "next";
import Noise from "@/components/designpass/Noise";
import { CliShowcase, InstallCommand } from "@/components/cli-showcase";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteNav } from "@/components/sections/site-nav";
import { McpConnect } from "@/components/skills/mcp-connect";
import { CopyButton } from "@/components/ui/copy-button";
import { MicroLabel } from "@/components/ui/micro-label";
import { Breadcrumb, NextStep } from "@/components/ui/page-chrome";

export const metadata: Metadata = {
  title: "The oqgit CLI — OneCLIQ",
  description:
    "Install oqgit to download the right release file, verify it, review pull requests with Gemma 4 and add agent skills, all from your terminal.",
};

const GROUPS: Array<{ title: string; note: string; rows: Array<[string, string]> }> = [
  {
    title: "Download",
    note: "Pick, fetch and verify the right release file.",
    rows: [
      ["oqgit owner/repo", "Download the file built for this computer"],
      ["oqgit owner/repo windows arm64", "…or for another system and chip"],
      ["oqgit owner/repo@v1.2.3", "A specific release instead of the latest"],
      ["oqgit info owner/repo", "Every file in the release and what it is"],
      ["oqgit list · update", "See what you downloaded; get newer versions"],
    ],
  },
  {
    title: "Check",
    note: "Evidence before you install anything.",
    rows: [
      ["oqgit trust owner/repo", "Who built it, and whether it changed"],
      ["oqgit malware owner/repo", "Known-malware lookup by fingerprint"],
      ["oqgit verify ./file owner/repo", "Is this local file really theirs?"],
      ["oqgit lock owner/repo · sync", "Pin exact files for your whole team"],
    ],
  },
  {
    title: "Review",
    note: "Gemma 4 code review, private repos included.",
    rows: [
      ["oqgit review", "This branch against its base"],
      ["oqgit review 12", "Pull request 12 in this repo"],
      ["oqgit review --strict", "Fail CI unless it’s safe to merge"],
    ],
  },
  {
    title: "Skills & agents",
    note: "Teach your coding agent, or let it drive.",
    rows: [
      ["oqgit skills", "Browse the library by domain"],
      ["oqgit skills add security", "Install one skill or a whole domain"],
      ["oqgit mcp", "Serve every tool to your agent over MCP"],
    ],
  },
];

export default function CliPage() {
  return (
    <>
      <SiteNav />
      <main id="main" className="flex-1">
        <section className="relative isolate overflow-hidden bg-night pb-20 pt-28 text-night-ink sm:pt-32">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(1px_1px_at_12%_18%,white,transparent),radial-gradient(1px_1px_at_32%_8%,white,transparent),radial-gradient(1px_1px_at_68%_14%,white,transparent),radial-gradient(1.5px_1.5px_at_84%_28%,white,transparent),radial-gradient(1px_1px_at_92%_6%,white,transparent),radial-gradient(1px_1px_at_6%_44%,white,transparent),radial-gradient(1px_1px_at_22%_36%,white,transparent),radial-gradient(1px_1px_at_78%_42%,white,transparent),radial-gradient(1.5px_1.5px_at_48%_24%,white,transparent),radial-gradient(1px_1px_at_58%_4%,white,transparent)] opacity-70"
          />
          <div
            aria-hidden
            className="absolute left-1/2 top-[48%] -z-10 aspect-square w-[min(1100px,170vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--ember)_95%,white)_0%,var(--ember)_25%,color-mix(in_oklab,var(--dusk)_80%,transparent)_55%,transparent_75%)] opacity-80 blur-2xl"
          />
          <Noise preset="film" opacity={0.4} className="-z-10" />

          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <Breadcrumb page="cli" tone="night" />
            <div className="mt-8 text-center">
              <MicroLabel className="rounded-full border border-night-rule px-3 py-1 text-night-muted">oqgit · the OneCLIQ CLI</MicroLabel>
              <h1 className="mx-auto mt-6 max-w-3xl text-balance font-serif text-[clamp(44px,7vw,88px)] font-normal leading-[0.98] tracking-[-0.02em]">
                Everything, <em>in your</em> terminal.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-night-ink/80">
                One install gives you all three tools without a browser, plus the things a website can’t do: private
                repositories, saved downloads with update checks, and a server for your coding agent.
              </p>
            </div>
            <div id="install" className="mx-auto mt-9 max-w-2xl scroll-mt-28">
              <InstallCommand />
              <p className="mt-3 text-center text-[13px] text-night-muted">
                Needs Node.js 20 or newer. No sudo. Just trying it? Put <code className="font-mono text-night-ink">npx onecliq</code> in front of any command.
              </p>
            </div>
            <div className="mx-auto mt-14 max-w-3xl">
              <CliShowcase />
            </div>
          </div>
        </section>

        <section aria-labelledby="commands-heading" className="bg-paper py-24 sm:py-28">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="max-w-2xl">
              <MicroLabel className="text-ink-subtle">Command reference</MicroLabel>
              <h2 id="commands-heading" className="mt-4 text-balance font-serif text-[clamp(36px,4.6vw,58px)] font-normal leading-[1] tracking-[-0.02em]">
                The commands you’ll <em>actually</em> use.
              </h2>
              <p className="mt-4 text-[15.5px] leading-relaxed text-ink-muted">
                Run <code className="font-mono text-ink">oqgit</code> with nothing after it for a menu, or{" "}
                <code className="font-mono text-ink">oqgit help &lt;command&gt;</code> for every option.
              </p>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-2">
              {GROUPS.map((g) => (
                <div key={g.title} className="rounded-[24px] border border-rule bg-paper-raised p-6">
                  <h3 className="text-[17px] font-medium">{g.title}</h3>
                  <p className="mt-0.5 text-[13.5px] text-ink-muted">{g.note}</p>
                  <dl className="mt-5 divide-y divide-rule border-t border-rule">
                    {g.rows.map(([cmd, what]) => (
                      <div key={cmd} className="grid gap-1 py-3 sm:grid-cols-[1.1fr_1fr] sm:gap-4">
                        <dt className="font-mono text-[12.5px] text-ink">{cmd}</dt>
                        <dd className="text-[13.5px] text-ink-muted">{what}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
            <p className="mt-6 text-[13px] text-ink-subtle">
              Exit codes: 0 ok · 1 error · 2 bad usage · 3 no reliable match · 4 a trust, malware, lock or --strict review check failed.
            </p>
          </div>
        </section>

        <section aria-labelledby="agent-heading" className="bg-paper pb-24">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="min-w-0">
              <MicroLabel className="text-ink-subtle">For coding agents</MicroLabel>
              <h2 id="agent-heading" className="mt-4 text-balance font-serif text-[clamp(32px,4vw,50px)] font-normal leading-[1.02] tracking-[-0.015em]">
                Hand it all to your <em>agent</em>.
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-muted">
                Connect oqgit once, then ask your agent to review a PR or use its review shortcut. It can also search
                and install skills, resolve releases, read trust reports and check for malware. Downloads happen with{" "}
                <code className="font-mono text-ink">--allow-download</code>.
              </p>
              <div className="mt-6 flex max-w-sm items-center gap-3 rounded-full border border-rule bg-paper-raised py-1.5 pl-5 pr-1.5 font-mono text-[13px]">
                <span className="text-ember">$</span>
                <code className="flex-1">npx -y onecliq mcp</code>
                <CopyButton text="npx -y onecliq mcp" tone="paper" />
              </div>
            </div>
            <div className="min-w-0 rounded-[32px] bg-night p-3 sm:p-4">
              <McpConnect />
            </div>
          </div>
        </section>

        <NextStep page="cli" className="pb-24" />
      </main>
      <SiteFooter />
    </>
  );
}
