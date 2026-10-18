// Minimal stand-in for api.github.com used by end-to-end tests.
// Start: node e2e/mock-github.mjs  (PORT defaults to 4010)
import http from "node:http";

const PORT = Number(process.env.PORT || 4010);

const asset = (owner, repo, tag, name, size = 48_213_504) => ({
  name,
  size,
  state: "uploaded",
  content_type: "application/octet-stream",
  browser_download_url: `https://github.com/${owner}/${repo}/releases/download/${tag}/${encodeURIComponent(name)}`,
});

const release = (owner, repo, tag, names, extra = {}) => ({
  tag_name: tag,
  name: extra.name ?? `${repo} ${tag}`,
  html_url: `https://github.com/${owner}/${repo}/releases/tag/${tag}`,
  draft: false,
  prerelease: false,
  published_at: "2026-09-12T10:00:00Z",
  assets: names.map((n) => asset(owner, repo, tag, n)),
  ...extra,
});

const ROUTES = {
  "/repos/acme/desktop/releases/latest": [
    200,
    release(
      "acme",
      "desktop",
      "v1.4.0",
      [
        "Acme-1.4.0-arm64.dmg",
        "Acme-1.4.0.dmg",
        "Acme-1.4.0-arm64-mac.zip",
        "Acme-1.4.0-mac.zip",
        "Acme Setup 1.4.0.exe",
        "Acme-1.4.0.AppImage",
        "acme_1.4.0_amd64.deb",
        "latest.yml",
        "latest-mac.yml",
      ],
      { name: "Acme Desktop 1.4.0" },
    ),
  ],
  "/repos/acme/desktop/releases/tags/v1.3.0": [
    200,
    release("acme", "desktop", "v1.3.0", ["Acme-1.3.0-arm64.dmg", "Acme-1.3.0.dmg"], { name: "Acme Desktop 1.3.0" }),
  ],
  "/repos/acme/lib/releases/latest": [
    200,
    release("acme", "lib", "v3.0.0", ["lib-3.0.0.tar.gz", "lib-3.0.0-src.zip", "SHA256SUMS"], { name: "lib 3.0.0" }),
  ],
  "/repos/acme/suite/releases/latest": [
    200,
    release("acme", "suite", "v2.0.0", ["suite-cli-2.0.0-linux-x64.tar.gz", "suite-server-2.0.0-linux-x64.tar.gz"]),
  ],
  "/repos/acme/limited/releases/latest": [403, { message: "API rate limit exceeded" }, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 600) }],
  "/repos/acme/empty/releases?per_page=30": [200, []],
  "/repos/acme/empty": [200, { id: 1, private: false }],
  // The web server refuses private repos, so it asks for each repo's visibility first.
  ...Object.fromEntries(["desktop", "lib", "suite", "limited"].map((name) => [`/repos/acme/${name}`, [200, { id: 1, private: false }]])),
  "/rate_limit": [200, { resources: { core: { limit: 60, remaining: 59, reset: Math.floor(Date.now() / 1000) + 3600 } } }],
};

http
  .createServer((req, res) => {
    const route = ROUTES[req.url ?? ""];
    const [status, body, headers] = route ?? [404, { message: "Not Found" }];
    res.writeHead(status, { "content-type": "application/json", ...(headers ?? {}) });
    res.end(JSON.stringify(body));
  })
  .listen(PORT, "127.0.0.1", () => console.log(`mock github listening on ${PORT}`));
