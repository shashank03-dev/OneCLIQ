---
name: micro-interactions
description: Design and build small UI feedback moments - hover, press, copy, toggle, loading and success states - that feel fast and polished without hurting accessibility or performance. Use when a UI feels flat or static, or when adding animation with CSS, Motion (Framer Motion) or the View Transitions API.
license: MIT
metadata:
  domain: frontend
  author: onecliq
  version: "1.0"
---

# Micro-interactions

A micro-interaction has four parts: **trigger** (hover, click, scroll), **rules** (what changes), **feedback** (what the user sees), and **loops/modes** (what happens next time). Every one should answer a question the user has: "did that work?", "can I click this?", "is it loading?".

## Timing and easing

| Interaction | Duration | Easing |
| --- | --- | --- |
| Hover / focus colour | 120–180 ms | `ease-out` |
| Press (scale 0.97) | 80–120 ms | `ease-out` |
| Small element enter | 180–240 ms | `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| Panel / modal | 240–320 ms | spring (stiffness ~300, damping ~30) |
| Exit | ~70% of enter | `ease-in` |

Anything the user waits on should finish in under 300 ms. Ambient loops should be slower than 4 s so they don't pull attention.

## Recipes

- **Buttons:** hover lifts colour/shadow, `:active` scales to 0.97, focus ring is always visible on keyboard focus (`:focus-visible`).
- **Copy to clipboard:** swap the icon to a check for ~1.5 s, update an `aria-live` region with "Copied", never shift layout (fix the button width).
- **Cards:** a pointer-following radial highlight (`--x/--y` CSS variables set on `pointermove`) or a 1–2° tilt. Keep text still.
- **Loading:** show a skeleton for anything > 300 ms; show progress for > 2 s; never block the whole page for a partial update.
- **Success:** a check that draws in (SVG `stroke-dashoffset`), then settle. One celebration per flow, at most.
- **Numbers:** count up only once, when scrolled into view.
- **Reveal on scroll:** 12–16px rise + fade via `IntersectionObserver`; trigger once.

## Rules

- Animate only `transform` and `opacity` (and `filter` sparingly). Never animate `width`, `height`, `top` or `box-shadow` on large areas.
- Wrap all non-essential motion in `@media (prefers-reduced-motion: no-preference)` or check `useReducedMotion()`.
- Motion must never be the only signal: pair it with text or an icon change.
- Don't animate on every render; key animations to state changes.
- Pointer effects are desktop-only: guard with `@media (hover: hover) and (pointer: fine)`.

## Checklist before shipping

- [ ] Works with keyboard and shows focus
- [ ] Reduced motion respected
- [ ] No layout shift during the animation
- [ ] 60 fps in the Performance panel on a throttled CPU (4×)
