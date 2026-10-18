---
name: git-recovery
description: Safely undo and recover in git - lost commits, bad rebases, wrong-branch commits, accidental resets, merge conflicts and committed secrets - without destroying other people's work. Use when the user says they "messed up git", lost work, need to undo a commit, push or merge, or is stuck mid-rebase.
license: MIT
metadata:
  domain: git-workflow
  author: onecliq
  version: "1.0"
---

# Git recovery

## First: stop and snapshot

Before any fix, run:

```bash
git status
git log --oneline --graph -15 --all
git stash list
```

Create a safety branch at the current state: `git branch backup/$(date +%s)`. Almost nothing in git is lost for ~90 days: `git reflog` remembers every position `HEAD` has been.

Never run `reset --hard`, `clean -fd`, `push --force` or `checkout -- .` until you've confirmed with the user what will be discarded.

## Recipes

| Situation | Fix |
| --- | --- |
| Undo last commit, keep changes | `git reset --soft HEAD~1` |
| Committed on the wrong branch | `git branch correct-branch` → `git reset --hard HEAD~N` on the wrong one (only if not pushed) → `git switch correct-branch` |
| Lost commits after reset/rebase | `git reflog` → find the SHA → `git branch rescue <sha>` |
| Stuck in a rebase | `git rebase --abort` returns to before it started |
| Bad merge, not pushed | `git reset --hard ORIG_HEAD` |
| Bad commit already pushed / shared | `git revert <sha>` (makes a new undo commit; safe for others) |
| Bad merge already pushed | `git revert -m 1 <merge-sha>` |
| Need my version of a file from earlier | `git restore --source <sha> -- path/to/file` |
| Dropped a stash | `git fsck --unreachable \| grep commit` then `git show <sha>` |
| Deleted a branch | `git reflog` → `git branch name <sha>` |
| Committed a secret | Rotate the secret **first** (see secrets-hygiene), then clean history with `git filter-repo` |

## Shared branches

- Prefer `revert` over rewriting history on anything others have pulled.
- If a force push is really needed, use `git push --force-with-lease` (refuses if someone else pushed) and tell collaborators.

## Merge conflicts

1. `git status` lists conflicted files.
2. For each, understand **both** sides' intent (`git log --merge -p -- file`), then edit to keep both where possible.
3. Run tests before `git add` and continuing.
4. For a lockfile conflict: take either side, then regenerate it (`npm install`) instead of hand-merging.

Explain to the user what happened, what each command will do, and what state they'll end up in, before running anything destructive.
