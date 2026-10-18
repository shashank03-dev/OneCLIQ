import Marquee from "@/components/designpass/Marquee";
import Tally from "@/components/designpass/Tally";
import { MicroLabel } from "@/components/ui/micro-label";
import { AGENTS, DOMAINS, SKILLS } from "@/core/skills";

const REPOS = [
  "cli/cli",
  "BurntSushi/ripgrep",
  "neovim/neovim",
  "sharkdp/bat",
  "sharkdp/fd",
  "jesseduffield/lazygit",
  "junegunn/fzf",
  "astral-sh/uv",
  "starship/starship",
  "eza-community/eza",
  "zellij-org/zellij",
  "helix-editor/helix",
];

const STATS = [
  { to: 3, suffix: "×3", label: "Systems × CPUs", note: "Windows, macOS, Linux · x64, arm64, x86" },
  { to: SKILLS.length, label: "Agent skills", note: `Hand-written, in ${DOMAINS.length} domains` },
  { to: Object.keys(AGENTS).length, label: "Coding agents", note: "Claude Code, Codex, Cursor and more" },
  { to: 0, label: "Sign-ups", note: "Free, open source, MIT licensed" },
];

/** Trust block right under the hero: big numbers, then the repos it works with. */
export function Proof() {
  return (
    <section aria-label="OneCLIQ at a glance" className="border-y border-rule bg-paper-raised/60">
      <div className="mx-auto grid max-w-6xl grid-cols-2 px-5 sm:px-8 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <div
            key={s.label}
            className={`py-7 ${i % 2 ? "pl-5 sm:pl-8" : "pr-5 sm:pr-8"} ${i < 2 ? "border-b border-rule lg:border-b-0" : ""} ${i % 2 === 0 ? "border-r border-rule" : ""} lg:border-r lg:px-8 lg:first:pl-0 lg:last:border-r-0`}
          >
            <p className="flex items-baseline gap-0.5 font-dots text-[44px] font-black leading-none">
              <Tally to={s.to} from={0} duration={1100} />
              {s.suffix && <span>{s.suffix}</span>}
            </p>
            <p className="mt-3 text-[14px] font-medium text-ink">{s.label}</p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-ink-muted">{s.note}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-rule py-5">
        <p className="mb-3 text-center">
          <MicroLabel className="text-ink-subtle">Works with any public repo that ships release files</MicroLabel>
        </p>
        <Marquee speed={40} gap={12} fade={120} onHover="slow" className="py-1">
          {REPOS.map((r) => (
            <span key={r} className="rounded-full border border-rule bg-paper px-4 py-1.5 font-mono text-[12.5px] text-ink-muted">
              {r}
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
