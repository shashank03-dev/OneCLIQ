---
name: frontend-design
description: Design and build distinctive, polished interfaces instead of generic AI-looking UI - a clear visual direction, typography, spacing scale, colour tokens, hierarchy, states and responsive layout. Use when building a landing page, app screen or component from scratch, redesigning an existing UI, or when the result looks bland, cluttered or "template-like".
license: MIT
metadata:
  domain: frontend
  author: onecliq
  version: "1.0"
  inspired-by: "anthropics/skills (frontend-design), vercel-labs/agent-skills (web-design-guidelines), leonxlnx/taste-skill, pbakaus/impeccable"
---

# Frontend design

Pick a direction, commit to it, and make every detail consistent with it. Generic UI comes from defaults nobody chose.

## 1. Choose a direction before coding

Write three lines:

- **Who and what:** "Developers checking a release binary before installing it."
- **Tone:** e.g. editorial and calm / dense and technical / playful and bold. Name 2–3 real references.
- **One memorable thing:** a signature element (an illustration style, a type pairing, a motion idea) that makes it recognisable.

If the project already has a design system, the direction is "match it". Read its tokens and components first.

## 2. Build the system, then the page

- **Type:** one display face with character + one readable UI face (+ mono if technical). A modular scale (e.g. 12/14/16/20/28/40/64). Body 15–18px, line height 1.5–1.7, measure 60–75 characters.
- **Spacing:** a 4px or 8px scale; use bigger gaps between groups than within them.
- **Colour:** define tokens (`--bg`, `--surface`, `--text`, `--muted`, `--border`, `--accent`, status colours). One accent, used sparingly. Check contrast (4.5:1 body text).
- **Shape and depth:** one radius family, one or two shadow levels, consistent borders.

## 3. Hierarchy

- One primary action per view. Secondary actions look secondary.
- Squint test: the most important thing should still stand out when blurred.
- Align to a grid; fewer alignment lines look calmer.
- Cut copy: headlines that say what it does, not slogans.

## 4. Every state

Design and build: empty, loading (skeletons for > 300 ms), error with recovery, success, disabled, long content, very short content, and hover/focus/active for every control.

## 5. Responsive and accessible

Mobile first; test at 360, 768, 1280 and 1600px. Targets ≥ 24px (44 on touch). Visible focus rings. Respect reduced motion.

## Avoid the AI-template look

- Purple-to-blue gradients on everything, glassmorphism everywhere, emoji as icons.
- Three identical feature cards with an icon, a title and two lines.
- Centre-aligned body paragraphs; walls of equally weighted text.
- Random spacing values and five different greys.

## Done when

Tokens defined and used (no stray hex values), every state exists, it works at 360px, and it passes a keyboard-only run-through.
