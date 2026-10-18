---
name: codebase-architecture
description: Improve the structure of a codebase - find tangled modules, shallow abstractions and leaky boundaries, then propose deep modules with small interfaces and a safe step-by-step path to get there. Use when code is hard to change or test, before a large feature that touches many files, when asked to review architecture, or when designing module boundaries and domain models.
license: MIT
metadata:
  domain: workflow
  author: onecliq
  version: "1.0"
  inspired-by: "mattpocock/skills (improve-codebase-architecture, codebase-design, domain-modeling), John Ousterhout's 'A Philosophy of Software Design'"
---

# Codebase architecture

Good architecture makes the common change touch few files and lets you test behaviour without the whole world.

## 1. Map what exists

- List the top-level modules and what each owns. Draw the import graph (`madge --image graph.svg src`, `go mod graph`, `pydeps`).
- Find the **hotspots**: files changed most often (`git log --format= --name-only | sort | uniq -c | sort -rn | head -20`) crossed with the largest or most complex files. Problems there cost the most.
- Note the domain language: what do users and the team call things? Do the code's names match?

## 2. Diagnose

| Smell | What it looks like |
| --- | --- |
| Shallow modules | Many tiny wrappers whose interface is as complex as their implementation |
| Leaky boundary | Callers must know internals (call order, DB shape, magic flags) |
| Change amplification | One product change needs edits in 6+ files |
| Cycles | A imports B imports A; "utils" imported by everything and importing everything |
| Mixed layers | HTTP handlers with SQL and business rules interleaved |
| Anemic domain | Business rules scattered across controllers instead of living with the data they govern |

## 3. Propose

- Prefer **deep modules**: a small, stable interface hiding a lot of behaviour. Merge shallow pass-through layers.
- Put business rules in a core that doesn't import frameworks, DB clients or HTTP; adapters at the edges call into it.
- Name modules after domain concepts (`billing`, `invoices`), not technical layers alone (`helpers`, `managers`).
- Make dependencies point one way: UI → application → domain ← infrastructure adapters.
- Write the target as a short doc: modules, their responsibilities, their public interfaces, the allowed dependency directions.

## 4. Migrate safely

- Never big-bang rewrite. Plan a sequence of small refactors (see safe-refactoring), each shippable on its own.
- Strangler pattern: build the new module beside the old, move callers one at a time, delete the old one last.
- Add an architecture check so it doesn't regress (`dependency-cruiser`, ESLint `import/no-restricted-paths`, Go `internal/` packages).

## Output

Current map → top 3 problems with file evidence → target structure → ordered migration steps with the risk of each. Don't refactor until the user agrees with the target.
