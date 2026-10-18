# Download Links Implementation Plan

**Goal:** Generate shareable and embeddable first-party links that download the latest stable app for the visitor's computer.

**Architecture:** Reuse the public-only GitHub resolver, asset matcher, and browser platform detector. Add a stateless redirect endpoint, a branded automatic-download page, and a result-card sharing panel.

**Tech stack:** Next.js 16.4.2 route handlers, React 19, TypeScript, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-18-download-links-design.md`

## Constraints and review focus

- Follow the installed Next.js documentation, including asynchronous route params and Suspense for request-time work under Cache Components.
- Keep GitHub tokens server-side; reuse public-only checks and request rate limiting.
- No new dependencies, database, external embed scripts, or domain provisioning.
- Test malformed repository input, missing/unsupported platforms, source-only/ambiguous matches, upstream limits, and private repositories.
- Universal links detect the recipient's machine; generated reusable links always use latest stable.

## Task 1: Link generation and direct downloads

- [x] Add failing tests in `tests/unit/download-links.test.ts` and `tests/unit/download-route.test.ts`.
- [x] Implement `src/lib/download-links.ts`: canonical origin selection and `createDownloadLinks(origin, repo, platform)` returning universal/direct/HTML/Markdown values.
- [x] Implement `src/app/api/download/route.ts`: validate repo, OS and CPU, rate limit, resolve stable, validate redirect and return 302/no-store; errors use existing API helpers, unmatched files return 422.
- [x] Run targeted unit tests and confirm all pass.

## Task 2: Automatic-download page and sharing UI

- [x] Add browser tests in `e2e/download-links.spec.ts` for automatic desktop download, mobile/unknown fallback, no-match, direct redirect, share snippets and clipboard failure.
- [x] Implement `/get/[owner]/[repo]` with async validation, a Suspense boundary and the existing site chrome/resolver.
- [x] Extend `Resolver` with `initialUrl` and `autoDownload` props; download once after a current successful match; cancel stale requests and clean up on unmount. Preserve existing `/download?repo=` behavior.
- [x] Add `ShareDownload` to result cards with readable, selectable values and copy feedback; add `public/download-badge.svg`.
- [x] Update README and `.env.example` with route examples and canonical-domain setup.

## Task 3: Verify and release

- [x] Run lint, typecheck, unit suite, production build, and browser tests; fix failures.
- [x] Review the complete diff for stale-result downloads, origin escaping, unstable releases and redirect security.
- [x] Deploy to the existing OneCLIQ Vercel project if available; verify the production page and direct redirect on the hosted domain.

## Execution record

Implemented in this chat. A review subagent was stopped when the user requested no subagents; final inspection and verification were performed directly. No additional subagents were used.

Validation: lint and typecheck passed; 308 unit tests and 36 browser tests passed; production build and CLI build passed; skill catalog check passed. Browser coverage includes cancellation after edits, per-visitor platform detection, automatic downloads, mobile fallback, embed code, and clipboard failure.

Released to the existing OneCLIQ project: deployment `dpl_5QNPQPmQ3TnhUtQrzniMY7mQdng3`, production origin `https://onecliq-eta.vercel.app`. Both build-time and runtime canonical URL are set to that origin for this deployment. The live direct endpoint returned 302/no-store to GitHub CLI v2.102.0 Windows x64 MSI. A live Playwright smoke check used real GitHub release metadata and intercepted the final asset bytes with a small fixture, confirming automatic download initiation and the canonical first-party link without downloading an installer. The public SVG badge returned 200.

Deployment was made directly from the verified local source before the user requested committing and pushing to main.
