---
name: git-worktrees
description: Use git worktrees to work on several branches at once in separate folders - parallel features, reviewing a PR while keeping your work, or running multiple coding agents without them overwriting each other. Use when switching branches would interrupt work in progress, when running agents in parallel, or when the user mentions worktrees.
license: MIT
metadata:
  domain: git-workflow
  author: onecliq
  version: "1.0"
  inspired-by: "obra/superpowers (using-git-worktrees, finishing-a-development-branch)"
---

# Git worktrees

A worktree is a second (third, …) checkout of the same repository in another folder, on its own branch, sharing one `.git` history. No stashing, no re-cloning.

## Commands

```bash
git worktree add ../myapp-feat-login -b feat/login        # new branch from current HEAD
git worktree add ../myapp-review origin/fix/race          # check out an existing remote branch
git worktree add ../myapp-hotfix -b hotfix/1.4.1 v1.4.0   # branch from a tag
git worktree list
git worktree remove ../myapp-feat-login                   # after merging
git worktree prune                                        # clean up folders deleted by hand
```

## Setup checklist for a new worktree

1. Pick a predictable location: siblings (`../<repo>-<branch>`) or a git-ignored folder (`.worktrees/<branch>`; add it to `.gitignore` first).
2. Install dependencies (`npm ci`, `uv sync`, …): `node_modules` and virtualenvs aren't shared.
3. Copy local config that isn't committed (`.env.local`), never commit it.
4. Use a different dev-server port if another worktree is running one.
5. Run the tests once to get a clean baseline before changing anything.

## Parallel coding agents

- One agent per worktree, one branch per task. Agents in the same folder overwrite each other's edits and fight over git state.
- Give each agent its own task boundary (files or module) to keep merges easy.
- Merge or rebase each branch back through normal PRs; run the full test suite on the combined result.

## Rules and gotchas

- A branch can be checked out in only one worktree at a time.
- Don't delete a worktree folder with uncommitted work; `git worktree remove` refuses if it's dirty (good).
- Hooks and git config are shared across worktrees; per-worktree files (like `.env`) are not.
- Finish cleanly: merge or open a PR, then remove the worktree and delete the merged branch.
