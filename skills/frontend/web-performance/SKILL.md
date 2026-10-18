---
name: web-performance
description: Make websites load and respond fast - measure Core Web Vitals (LCP, INP, CLS), then fix images, fonts, JavaScript weight, render-blocking resources, caching and server response time. Use when a page is slow, Lighthouse or PageSpeed scores are low, Core Web Vitals fail in Search Console, or before launching a public site.
license: MIT
metadata:
  domain: frontend
  author: onecliq
  version: "1.0"
  inspired-by: "addyosmani/web-quality-skills (performance), cloudflare/skills (web-perf), addyosmani/agent-skills (performance-optimization)"
---

# Web performance

Targets at the 75th percentile of real users: **LCP < 2.5 s, INP < 200 ms, CLS < 0.1**. Lab tools find causes; field data (CrUX, RUM) tells you if users feel it.

## Measure

1. Field: PageSpeed Insights (CrUX section), Search Console, or your RUM (`web-vitals` library).
2. Lab: Lighthouse in an incognito window with mobile throttling; the Chrome Performance panel for traces.
3. Note the LCP element, the longest tasks, and what shifted. Fix in that order of impact.

## LCP (largest contentful paint)

- Server: TTFB under ~800 ms: cache HTML at the edge, avoid waterfalls of server fetches.
- The LCP image: correct size, AVIF/WebP, `fetchpriority="high"`, not lazy-loaded, preloaded if discovered late (CSS background).
- Remove render-blocking CSS/JS from the head: inline critical CSS, `defer` scripts.
- Fonts: self-host, `font-display: swap` (or `optional`), preload the one or two above-the-fold files, subset.

## INP (interaction to next paint)

- Break up long tasks (> 50 ms): yield with `await scheduler.yield()` / `setTimeout`, move work off the main thread (Web Worker).
- Ship less JavaScript: code-split by route, lazy-load below-the-fold widgets, drop unused dependencies, audit third-party tags.
- Avoid layout thrashing (reading layout after writing styles in a loop).
- In React, see react-performance.

## CLS (layout shift)

- `width`/`height` or `aspect-ratio` on every image, video and embed.
- Reserve space for ads, banners and late-loading content.
- Use `transform` for animations; don't insert content above existing content after load.
- Font metric overrides (`size-adjust`) to reduce swap shift.

## Delivery

- Compression (Brotli), HTTP/2 or 3, a CDN.
- Long-lived immutable caching for hashed assets (`Cache-Control: public, max-age=31536000, immutable`); short or revalidated caching for HTML.
- `preconnect` to critical third-party origins; remove unused ones.
- Images: responsive `srcset`/`sizes`, lazy-load below the fold.

## Keep it fast

Set a budget (e.g. JS < 170 KB gzipped on landing pages) and enforce it in CI with Lighthouse CI or bundle size checks. Report before/after numbers from the same tool and settings.
