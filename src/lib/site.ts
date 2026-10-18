/**
 * The site map in reading order. Nav, footer and the "Next step" card at the bottom of
 * every page read from here, so a visitor can always see where they are and where to go next.
 */
export const GITHUB_URL = "https://github.com/shashank03-dev/OneCLIQ";
export const NPM_URL = "https://www.npmjs.com/package/onecliq";

export type PageId = "start" | "download" | "review" | "skills" | "cli";

export const PAGES: Array<{ id: PageId; href: string; label: string; title: string; blurb: string }> = [
  {
    id: "start",
    href: "/start",
    label: "Start here",
    title: "Start here",
    blurb: "A two-minute tour: what OneCLIQ does, which tool you need, and how to use it.",
  },
  {
    id: "download",
    href: "/download",
    label: "Download",
    title: "Get the right download",
    blurb: "Paste a GitHub link and get the file built for your computer, checked for tampering and known malware.",
  },
  {
    id: "review",
    href: "/review",
    label: "Review",
    title: "Review a pull request",
    blurb: "Gemma 4 ranks what's wrong, tells you if it's safe to merge and writes one prompt to fix it.",
  },
  {
    id: "skills",
    href: "/skills",
    label: "Skills",
    title: "Add skills to your agent",
    blurb: "Hand-written playbooks that Claude Code, Codex, Cursor and others load when a task matches.",
  },
  {
    id: "cli",
    href: "/cli",
    label: "CLI",
    title: "Use it from your terminal",
    blurb: "Install oqgit once to download, review and add skills without opening a browser.",
  },
];

export function pageById(id: PageId) {
  return PAGES.find((p) => p.id === id)!;
}

/** The page that follows `id` in the reading order, or null at the end. */
export function nextPage(id: PageId) {
  const i = PAGES.findIndex((p) => p.id === id);
  return PAGES[i + 1] ?? null;
}
