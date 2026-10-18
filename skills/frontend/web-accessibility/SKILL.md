---
name: web-accessibility
description: Audit and fix web UI for WCAG 2.2 AA - keyboard access, focus, labels, contrast, semantics and screen reader output. Use when building or reviewing forms, dialogs, menus, custom controls, or when the user asks "is this accessible?".
license: MIT
metadata:
  domain: frontend
  author: onecliq
  version: "1.0"
---

# Web accessibility

Aim for WCAG 2.2 AA. Prefer native HTML over ARIA: a real `<button>` beats `<div role="button">` every time.

## Quick audit (do these in order)

1. **Keyboard only.** Unplug the mouse. Tab through the page. Every interactive thing must be reachable, show a visible focus ring, and work with Enter/Space (Escape closes overlays). Focus order must follow visual order.
2. **Names.** Every control has an accessible name: visible `<label for>`, `aria-label` for icon-only buttons, `alt` on meaningful images (`alt=""` on decorative ones).
3. **Semantics.** One `<h1>`, headings don't skip levels, landmarks exist (`<header> <nav> <main> <footer>`), lists are `<ul>/<ol>`, tables have `<th scope>`.
4. **Contrast.** Body text ≥ 4.5:1, large text (24px, or 18.66px bold) and UI borders/icons ≥ 3:1. Check placeholder and disabled text too.
5. **Automated scan.** Run axe (`npx @axe-core/cli <url>` or the browser extension). Automated tools catch about a third of issues: never stop here.
6. **Screen reader spot check.** VoiceOver (Cmd+F5) or NVDA on the main flow.

## Patterns that are usually broken

- **Dialogs:** use `<dialog>` with `showModal()`, or trap focus, set `aria-modal="true"`, label it, and return focus to the trigger on close.
- **Custom selects / menus / tabs:** follow the ARIA Authoring Practices pattern exactly (roles, `aria-expanded`, arrow keys), or use a native element.
- **Errors:** link the message with `aria-describedby`, set `aria-invalid="true"`, and move focus or announce with `role="alert"` on submit.
- **Live updates** (toasts, "copied!", search results count): an `aria-live="polite"` region that exists before the text changes.
- **Hover-only content:** must also appear on focus and be dismissable (WCAG 1.4.13).
- **Target size:** pointer targets at least 24×24 CSS px (WCAG 2.5.8).
- **Motion:** honour `prefers-reduced-motion`; nothing flashes more than 3 times per second.
- **Zoom:** content works at 200% zoom and 320px wide without horizontal scrolling.

## Output

For each issue: element (selector or file:line), the WCAG criterion, who it blocks, and the exact fix. Fix the code when asked; group by severity (blocks a task → degrades → polish).
