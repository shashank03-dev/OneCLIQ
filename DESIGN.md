# OneCLIQ design system: “Paper & Night”

Editorial and calm, with a little machinery showing. The page alternates **paper** sections (warm off-white, ink
type, painted landscapes) with **night** sections (near-black, dot grids, grain, a single ember glow). It mixes four
moods from the reference boards:

| Reference | What we take |
| --- | --- |
| Harmoniq | Serif display headline with one *italic* word, floating icon tiles in an arc, a soft circular wash, a painted landscape under the hero |
| micro | Paper + dot grid, a centered closing CTA, a giant wordmark footer cut over a painted scene, tiny uppercase mono footer links |
| Perplexity | A night section with film grain and an ember→violet glow, serif line with an italic word, mono corner captions |
| Flora | Black canvas with a dot grid, a centered mark, thin curved connector lines to cards, small "Slide 03"-style corner labels |
| PlayerZero | Dot-matrix display type, a node diagram with mono pill labels around a raised center tile, a stats strip with dot-matrix numbers |

All tokens live in `src/app/globals.css` (`:root` + `@theme inline`). **Never hard-code a color in a component**:
use the Tailwind token classes below (`bg-paper`, `text-ink-muted`, `border-rule`, …).

---

## Site structure

The landing page stays short: **hero with the live link box → trust strip → tools bento → how it works → FAQ → next step**.
Depth lives on its own pages, read in this order (`src/lib/site.ts` is the single source for nav, footer and
next-step links): `/start` (guided tour) → `/download` → `/review` → `/skills` → `/cli`. Every page opens with a
breadcrumb and ends with `NextStep`, so a visitor never hits a dead end. Patterns come from the
[vibrant.design](https://vibrant.design) gallery: Equals (centered serif hero + one input), bento grids with mini UI,
Natural (tabbed feature panel over a photo), Steel (closing night banner), Framer/Equals (link-column footer).

## Color

### Paper (light sections, default)

| Token | Value | Use |
| --- | --- | --- |
| `paper` | `#F4F1EA` | Page background |
| `paper-raised` | `#FBFAF6` | Cards, inputs, tiles |
| `paper-sunk` | `#ECE8DE` | Wells, skeletons, pressed fills |
| `ink` | `#151412` | Headlines, primary buttons |
| `ink-muted` | `#5D5A53` | Body copy |
| `ink-subtle` | `#8E8A80` | Captions, hints, labels |
| `rule` | `rgb(21 20 18 / 0.09)` | Hairlines, card borders |
| `rule-strong` | `rgb(21 20 18 / 0.18)` | Hover borders, dividers |
| `dot` | `rgb(21 20 18 / 0.16)` | Dot-grid ink |

### Night (dark sections)

| Token | Value | Use |
| --- | --- | --- |
| `night` | `#0B0B0C` | Section background |
| `night-raised` | `#161618` | Cards on night |
| `night-ink` | `#F2F0EA` | Text on night |
| `night-muted` | `#9C998F` | Secondary text on night |
| `night-rule` | `rgb(255 255 255 / 0.1)` | Hairlines and connector lines on night |

### Accents (use sparingly: one per view)

| Token | Value | Use |
| --- | --- | --- |
| `ember` | `#E5582B` | The one hot accent: icon chip on primary CTA, glow core, focus ring |
| `dusk` | `#5B4BDB` | Night glows (paired with ember), links on night |
| `sky` | `#BFD4EE` | Hero wash, landscape fallback sky |
| `moss` | `#2F7A4C` | Success: “Recommended” |
| `clay` | `#B8402A` | Danger: “Not recommended” |
| `ochre` | `#A86A12` | Warning: errors that can be retried, pre-release |
| `leaf` | `#9AD48A` | Success **on night** (terminal checks) |
| `lilac` | `#ACA1F4` | `dusk` lightened for text **on night** (terminal headings, commands) |

Status colors always come as a trio: text in the color, a 10% tint fill, a 25% tint border.

## Type

| Role | Font | Settings |
| --- | --- | --- |
| Display (`font-serif`) | Instrument Serif | 400, tracking `-0.02em`, leading `0.95–1.05`. One word per headline goes *italic*. |
| Dot-matrix (`font-dots`) | Doto | 700–900, uppercase, tracking `0.02em`. Only for slogans and big numbers, never body. |
| UI (`font-sans`) | Geist | 400/500. Body 15–17px, leading 1.6. |
| Mono (`font-mono`) | Geist Mono | Code, filenames, and **micro labels**: 11px uppercase, tracking `0.14em`. |

Scale: display `clamp(44px, 7vw, 92px)` · h2 `clamp(36px, 5vw, 64px)` · h3 20px · body 16px · small 13px · micro 11px.

## Shape, depth, texture

- **Radii**: pills `9999px` for buttons/chips; `18px` tiles; `24px` cards; `32px` large panels.
- **Shadows** are soft and warm, never colored: `shadow-tile` (`0 1px 0 #fff inset, 0 10px 30px -12px rgb(21 20 18 / .25)`)
  for floating tiles and the raised center node.
- **Texture**: paper sections get the DesignPass `SoftPatterns` dot grid (24px spacing); night sections get a dot
  grid plus DesignPass `Noise` (film preset). Grain is what keeps gradients from banding. Use it on every glow.
- **Lines**: connector lines are 1px, `rule-strong` on paper and `night-rule` on night, drawn as SVG curves.

## Components

| Component | Source | Where |
| --- | --- | --- |
| `SoftPatterns` | DesignPass.dev | Hero dot field, closing CTA |
| `Noise` | DesignPass.dev | Night sections, CLI glow, footer scene |
| `BlurText` | DesignPass.dev | Display headlines (focus-pull entrance) |
| `Marquee` | DesignPass.dev | “Works with” repo rail |
| `Tally` | DesignPass.dev | Stats strip numbers |
| `JellyButton` + `Magnet` | DesignPass.dev | Primary CTAs |
| `PillButton` | in-house (`ui/pill-button.tsx`) | Ink pill with an ember icon chip (PlayerZero-style) |
| `MicroLabel` | in-house (`ui/micro-label.tsx`) | Uppercase mono captions and corner labels |
| `Landscape` | in-house (`ui/landscape.tsx`) | Painted scene: renders the AI artwork if present, otherwise a layered SVG fallback |
| `Reveal` | in-house (`ui/reveal.tsx`) | 14px rise + blur-fade the first time a block scrolls into view |
| `Spotlight` | in-house (`ui/spotlight.tsx`) | Pointer-following glow on cards (`.spotlight` in globals.css; desktop pointers only) |
| `CopyButton` | in-house (`ui/copy-button.tsx`) | Copy with an icon that springs to a check, announced via `aria-live` |
| `ScrollProgress` | in-house (`ui/scroll-progress.tsx`) | Ember→dusk hairline at the top of the landing page |
| `SkillBrowser` | in-house (`skills/skill-browser.tsx`) | Search (`/` to focus), domain and agent pills with a sliding indicator, SKILL.md drawer |
| `Breadcrumb` · `NextStep` | in-house (`ui/page-chrome.tsx`) | “Home › Page” at the top of every page; a night banner at the bottom naming the next page in the tour |
| `Tools` | in-house (`sections/tools.tsx`) | Landing bento: one card per tool with a small static preview of its real UI |
| `Flow` | in-house (`sections/flow.tsx`) | Tabbed “how it works”: pick a tool, three numbered steps that auto-advance over a painted panel |
| `Faq` | in-house (`sections/faq.tsx`) | Native `<details>` accordion with a rotating plus |
| `GuideToc` | in-house (`guide-toc.tsx`) | Sticky “On this page” list on /start that lights the current step and marks earlier ones done |

DesignPass components are by Ernest Liu (ernestliu.com), MIT licensed; keep the header comment in each file
under `src/components/designpass/`.

### Buttons

- **Primary**: ink pill (`bg-ink text-paper`), 48–56px tall, optional ember square icon chip on the left.
- **Secondary**: paper-raised pill with `rule` border; hover → `rule-strong`.
- **On night**: `bg-night-ink text-night` primary, `night-rule` bordered secondary.

### Cards

Paper cards: `bg-paper-raised border border-rule rounded-[24px]` with `shadow-tile` only when floating.
Night cards: `bg-night-raised border border-night-rule`.

## Motion

- Entrances: `BlurText` for headlines (stagger 60–80ms), simple 12px rise + fade for blocks.
- Ambient: floating tiles bob 6px over 6–8s; nothing loops faster than 4s.
- Pointer: hero tiles drift against the cursor (parallax by depth) and show a label on hover; cards carry a `Spotlight` glow.
- Selection: pills that pick one option (nav, domain, agent, severity, tabs) share a `layoutId` so the highlight slides between them.
- Feedback: every copy button flips to a check; the nav condenses into a glass pill after 24px of scroll.
- Everything respects `prefers-reduced-motion` (DesignPass components handle it internally; `globals.css` caps the rest).

## Imagery

Painted, slightly naive landscape illustrations (Ghibli-ish skies, pines, meadows). Prompts are in
`docs/ASSET_PROMPTS.md`. Put files in `public/art/` and switch them on in `src/lib/art.ts`. Until then the
`Landscape` component draws an SVG fallback in the same palette, so the page never shows a broken image.
