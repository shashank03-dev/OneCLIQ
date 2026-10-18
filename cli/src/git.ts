/** Reads the current repository's branch diff for `oqgit review` with no target. */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { isValidRef } from "../../src/core/review/target";
import type { ChangedFile, ReviewContext } from "../../src/core/review/types";

const run = promisify(execFile);

async function git(args: string[], cwd: string): Promise<string> {
  const { stdout } = await run("git", args, { cwd, maxBuffer: 64 * 1024 * 1024, encoding: "utf8" });
  return stdout;
}

const tryGit = (args: string[], cwd: string) => git(args, cwd).then((s) => s.trim(), () => "");

export class GitError extends Error {}

/** "owner/repo" from a github.com remote URL, if there is one. */
export function repoFromRemote(remote: string): string | null {
  const m = /github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i.exec(remote.trim());
  return m ? `${m[1]}/${m[2]}` : null;
}

/** "owner/repo" of this checkout's GitHub `origin` remote, or null. */
export async function originRepo(cwd: string): Promise<string | null> {
  return repoFromRemote(await tryGit(["remote", "get-url", "origin"], cwd));
}

/** Split `git diff` output into per-file patches. */
export function splitDiff(diff: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const chunk of diff.split(/^diff --git /m).slice(1)) {
    const header = chunk.split("\n", 1)[0];
    const plus = /^\+\+\+ b\/(.+)$/m.exec(chunk)?.[1];
    const minus = /^--- a\/(.+)$/m.exec(chunk)?.[1];
    const fallback = / b\/(.+)$/.exec(header)?.[1];
    const file = plus ?? minus ?? fallback;
    if (!file) continue;
    const at = chunk.indexOf("\n@@");
    if (at >= 0) out.set(file, chunk.slice(at + 1).trimEnd());
  }
  return out;
}

export async function defaultBase(cwd: string): Promise<string> {
  const head = await tryGit(["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"], cwd);
  if (head) return head;
  for (const candidate of ["origin/main", "origin/master", "main", "master"]) {
    if (await tryGit(["rev-parse", "--verify", "--quiet", candidate], cwd)) return candidate;
  }
  throw new GitError("Couldn't find a base branch. Pass --base <branch>.");
}

/**
 * The current branch against its merge-base with `base`, including uncommitted changes to tracked files.
 * Untracked files are not included — `git add -N` them to have them reviewed.
 */
export async function localContext(opts: { cwd: string; base?: string; goal?: string }): Promise<ReviewContext> {
  const { cwd } = opts;
  if (!(await tryGit(["rev-parse", "--is-inside-work-tree"], cwd))) throw new GitError("Not inside a git repository. Pass a PR link, or run this in a repo.");
  if (opts.base && !isValidRef(opts.base)) throw new GitError(`“${opts.base}” isn't a valid branch name.`);
  const base = opts.base ?? (await defaultBase(cwd));
  if (!(await tryGit(["rev-parse", "--verify", "--quiet", `${base}^{commit}`], cwd))) throw new GitError(`Base branch “${base}” doesn't exist here. Try --base origin/main.`);

  const head = (await tryGit(["rev-parse", "--abbrev-ref", "HEAD"], cwd)) || "HEAD";
  const mergeBase = await tryGit(["merge-base", base, "HEAD"], cwd);
  if (!mergeBase) throw new GitError(`“${base}” and ${head} have no common history.`);

  const [diff, numstat, nameStatus, log, remote] = await Promise.all([
    git(["diff", "--no-color", "--no-ext-diff", "--unified=3", "--find-renames", mergeBase], cwd),
    git(["diff", "--numstat", "--find-renames", "--no-ext-diff", mergeBase], cwd),
    git(["diff", "--name-status", "--find-renames", "--no-ext-diff", mergeBase], cwd),
    tryGit(["log", "--reverse", "--format=%s", `${mergeBase}..HEAD`], cwd),
    tryGit(["remote", "get-url", "origin"], cwd),
  ]);

  const patches = splitDiff(diff);
  const statusOf = new Map<string, string>();
  const STATUS: Record<string, string> = { A: "added", D: "removed", M: "modified", R: "renamed", C: "copied", T: "modified" };
  for (const line of nameStatus.split("\n").filter(Boolean)) {
    const [code, ...paths] = line.split("\t");
    statusOf.set(paths.at(-1)!, STATUS[code[0]] ?? "modified");
  }

  const files: ChangedFile[] = numstat
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [add, del, ...rest] = line.split("\t");
      // Renames print as "old => new" or "dir/{old => new}/file".
      const raw = rest.join("\t");
      const path = raw.includes(" => ") ? raw.replace(/\{[^}]* => ([^}]*)\}/, "$1").replace(/^.* => /, "").replace(/\/\//g, "/") : raw;
      const patch = patches.get(path);
      return {
        path,
        status: statusOf.get(path) ?? "modified",
        additions: Number(add) || 0,
        deletions: Number(del) || 0,
        ...(patch ? { patch } : {}),
      };
    });

  const commits = log ? log.split("\n") : [];
  const dirty = (await tryGit(["status", "--porcelain", "--untracked-files=no"], cwd)) !== "";
  return {
    source: "local",
    repo: repoFromRemote(remote),
    title: commits.at(-1) ?? (dirty ? "Uncommitted changes" : head),
    description: [commits.length > 1 ? commits.map((c) => `- ${c}`).join("\n") : "", dirty ? "(includes uncommitted changes)" : ""].filter(Boolean).join("\n\n"),
    state: "local",
    base,
    head,
    commits,
    files,
    ...(opts.goal ? { goal: opts.goal } : {}),
  };
}
