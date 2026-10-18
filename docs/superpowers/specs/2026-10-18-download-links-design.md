# First-party download and embed links

The existing resolver chooses a release asset and displays a GitHub download button. Extend that flow with reusable links and embed snippets on the site's own origin.

## Behavior and system design

- `/get/:owner/:repo` is a public OneCLIQ page. It detects the visitor's OS/CPU using the existing browser detector, resolves the latest stable release, and starts the recommended GitHub asset download once. Missing platform information, mobile devices, errors, and ambiguous assets leave the visitor on the page with manual controls. A visible Download button supports browsers that block automatic downloads.
- `/api/download?repo=owner/repo&os=linux&arch=x64` validates the target and platform, uses the existing public-only GitHub client and stable-release matcher, and responds with a temporary 302 redirect to a validated GitHub release asset. Never accept an arbitrary redirect destination. Return useful errors, 422 for no matching asset, and Retry-After for rate limits. Use no-store so redirects never pin a stale stable release.
- Result cards offer a universal one-tap URL, a direct URL for the selected platform, HTML button markup, and a Markdown badge. Embeds are ordinary links pointing to the first-party page; the badge is hosted on the same origin. No scripts or iframe permissions are required.
- All reusable links track latest stable, even when the generating result is a tagged prerelease. State this clearly in the UI. Existing tagged lookups and manual download behavior remain available.
- Prefer `NEXT_PUBLIC_SITE_URL` for generated URLs, falling back to the current browser origin. Only accept HTTPS origins, with HTTP allowed for localhost development. No database, domain purchase, wildcard DNS, or separate app deployment is necessary; paths live on the existing hosted domain.
- A browser download cannot silently install an app. Download the publisher's installer/archive and let the OS handle opening and installation.

## Verification

Unit tests cover canonical origins, escaped embeds, latest-stable selection, validated redirects, invalid input, private/missing repos, ambiguous/source-only assets, and rate limits. Browser tests cover generated links, automatic downloads, per-visitor detection, manual fallback, and same-origin embed targets. Run lint, typecheck, unit suite, production build, and browser tests before release.
