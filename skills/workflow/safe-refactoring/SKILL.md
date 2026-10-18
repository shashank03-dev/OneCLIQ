---
name: safe-refactoring
description: Change the structure of code without changing its behaviour, in small verified steps - characterization tests first, one mechanical move at a time, tests green after each. Use when simplifying messy code, extracting or renaming functions and modules, removing duplication, or preparing code for a new feature.
license: MIT
metadata:
  domain: workflow
  author: onecliq
  version: "1.0"
  inspired-by: "addyosmani/agent-skills (code-simplification), juliusbrussee/caveman (safe-refactor), Martin Fowler's 'Refactoring'"
---

# Safe refactoring

Refactoring means **behaviour stays the same**. If behaviour changes, it's a feature or a fix: do it in a separate commit.

## Before you start

1. **Tests cover the code you'll touch.** If not, write characterization tests that pin current behaviour (including odd behaviour) first. Snapshot the outputs for a set of real inputs if logic is tangled.
2. **Green baseline.** Run the tests and the type checker; everything passes before the first change.
3. **Know the callers.** Find every usage (`rg`, IDE "find references"), including dynamic ones: reflection, string-built names, config files, templates.

## The loop

1. Make **one** small structural change.
2. Run the tests and type checker.
3. Commit (`refactor: extract parseHeader from loadFile`).
4. Repeat.

If a step breaks something you don't understand, revert it (`git checkout -- .`) and take a smaller step.

## Safe moves (prefer IDE/language-server refactors over hand edits)

- Rename (variable, function, file) across all references.
- Extract function / inline function.
- Extract module; move function to the module that owns its data.
- Replace a long parameter list with an object; replace flags with two functions.
- Replace nested conditionals with guard clauses.
- Remove dead code (confirm with coverage or a search, not a hunch).
- Consolidate duplicates only when they change for the same reason; similar-looking code that changes for different reasons should stay separate.

## Simplify, don't just rearrange

- Fewer concepts, not more files: avoid new abstractions with one implementation "for later".
- Delete before you add. The best refactor often removes a layer.
- Keep public interfaces stable; deprecate before removing if others depend on them.

## Done when

- [ ] Tests and types pass; no test was changed except to add characterization tests
- [ ] Diff contains no behaviour change (check error messages, ordering, logging, defaults)
- [ ] Each commit builds on its own
