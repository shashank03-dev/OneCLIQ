---
name: react-performance
description: Find and fix slow React renders with measurements, not guesses. Use when a React or Next.js UI feels janky, re-renders too often, has slow input, large bundles, or poor Core Web Vitals (INP, LCP, CLS).
license: MIT
metadata:
  domain: frontend
  author: onecliq
  version: "1.0"
---

# React performance

Measure first, then change the smallest thing that fixes the measured problem.

## Workflow

1. **Name the symptom.** Slow first load (LCP)? Laggy typing or clicks (INP)? Layout jumping (CLS)? Scroll jank? Each has a different fix. Ask the user if it is unclear.
2. **Reproduce in a production build.** Dev mode is 2–10× slower and double-renders under StrictMode. Run `npm run build && npm start` (or the framework equivalent) before profiling.
3. **Profile.**
   - Renders: React DevTools Profiler → record the slow interaction → sort by "self time". Turn on "Highlight updates" to see what re-renders.
   - Main thread: Chrome Performance panel → look for long tasks (> 50 ms).
   - Bundle: `npx @next/bundle-analyzer` or `npx source-map-explorer` on the built JS.
4. **Fix the top item only**, then measure again. Stop when the symptom is gone.

## Fixes, by cause

| Cause | Fix |
| --- | --- |
| Parent state change re-renders a big subtree | Move state down to the component that uses it, or lift the expensive child out as `children` |
| New object/array/function props every render break `memo` | `useMemo` / `useCallback` only for props passed to memoized children or effect deps |
| Context value changes re-render every consumer | Split the context (state vs. dispatch), or memoize the value object |
| Long list (> 200 rows) | Virtualize (`@tanstack/react-virtual`) or paginate |
| Expensive work on every keystroke | `useDeferredValue` for the derived view, or `startTransition` for the update |
| Heavy component not needed at first paint | `React.lazy` / `next/dynamic` with a sized placeholder |
| Huge dependency for one helper | Import the subpath, or replace it (e.g. `date-fns` function instead of `moment`) |
| Images cause LCP / CLS | Set `width`/`height`, `priority` on the hero image, modern formats |
| Effects that set state on mount | Derive the value during render instead |

## Rules

- Do not wrap everything in `memo`/`useMemo`. Each one costs memory and comparison time; add them only where the profiler shows a win.
- Never fix performance by removing `key` props or using array index keys on reorderable lists.
- If the project uses the React Compiler, manual memoization is usually unnecessary: check `babel-plugin-react-compiler` or `reactCompiler` in config first.
- Keep fixes local. A performance PR that also refactors unrelated code is hard to review.

## Report back

Tell the user: the symptom, what the profile showed (component + time), the change, and the before/after number from the same measurement.
