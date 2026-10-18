import { expect, test } from "@playwright/test";

test("generates first-party links and embeds from a tagged result", async ({ page, baseURL }) => {
  await page.goto("/download");
  await page.getByLabel("GitHub repository or release URL").fill("https://github.com/acme/desktop/releases/tag/v1.3.0");
  await page.getByLabel("Operating system", { exact: true }).selectOption("macos");
  await page.getByLabel("Architecture", { exact: true }).selectOption("arm64");
  await page.getByRole("button", { name: "Find download" }).click();
  await expect(page.getByLabel("One-tap link", { exact: true })).toHaveValue(`${baseURL}/get/acme/desktop`);
  await expect(page.getByLabel("Direct download link", { exact: true })).toHaveValue(`${baseURL}/api/download?repo=acme%2Fdesktop&os=macos&arch=arm64`);
  await page.getByText("Embed a download button", { exact: true }).click();
  await expect(page.getByLabel("HTML embed", { exact: true })).toHaveValue(`<a href="${baseURL}/get/acme/desktop"><img src="${baseURL}/download-badge.svg" alt="Download acme/desktop with OneCLIQ" width="196" height="36"></a>`);
  await expect(page.getByLabel("Markdown embed", { exact: true })).not.toHaveValue(/v1\.3\.0/);
  await expect(page.getByTestId("share-download")).toContainText("latest stable");
});

test("one-tap page detects the visitor and starts one download", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgentData", { value: { getHighEntropyValues: async () => ({ platform: "Windows", architecture: "x86", bitness: "64" }) } });
    Object.defineProperty(navigator, "userAgent", { value: "Windows NT 10.0; Win64; x64" });
  });
  const files: string[] = [];
  await page.route("https://github.com/acme/desktop/releases/download/**", (route) => {
    files.push(route.request().url());
    return route.fulfill({ body: "fake", headers: { "content-type": "application/octet-stream", "content-disposition": 'attachment; filename="Acme.exe"' } });
  });
  const download = page.waitForEvent("download");
  await page.goto("/get/acme/desktop");
  await download;
  await expect(page.getByTestId("result-card")).toContainText("Windows");
  await expect(page.getByTestId("auto-download-status")).toContainText("If it did not start");
  expect(files).toHaveLength(1);
  expect(files[0]).toContain("/v1.4.0/Acme%20Setup%201.4.0.exe");
});

test("unknown and mobile systems get manual controls, then download after choosing", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgentData", { value: undefined });
    Object.defineProperty(navigator, "userAgent", { value: "iPhone Mobile" });
  });
  let resolves = 0;
  page.on("request", (req) => { if (req.url().endsWith("/api/resolve")) resolves++; });
  await page.route("https://github.com/acme/desktop/releases/download/**", (route) => route.fulfill({ body: "fake", headers: { "content-disposition": 'attachment; filename="Acme.dmg"' } }));
  await page.goto("/get/acme/desktop");
  await expect(page.getByLabel("GitHub repository or release URL")).toHaveValue("https://github.com/acme/desktop");
  await expect(page.getByText("You’re on a phone or tablet", { exact: false })).toBeVisible();
  expect(resolves).toBe(0);
  await page.getByLabel("Operating system", { exact: true }).selectOption("macos");
  await page.getByLabel("Architecture", { exact: true }).selectOption("arm64");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Find download" }).click();
  await download;
});

test("unmatched releases never trigger an automatic download", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgentData", { value: { getHighEntropyValues: async () => ({ platform: "Linux", architecture: "x86", bitness: "64" }) } });
    Object.defineProperty(navigator, "userAgent", { value: "Linux x86_64" });
  });
  let downloads = 0;
  page.on("download", () => downloads++);
  await page.goto("/get/acme/lib");
  await expect(page.getByTestId("no-match-message")).toContainText("only ships source code");
  expect(downloads).toBe(0);
});

test("direct URL redirects temporarily and the badge is first-party", async ({ request }) => {
  const res = await request.get("/api/download?repo=acme/desktop&os=macos&arch=arm64", { maxRedirects: 0 });
  expect(res.status()).toBe(302);
  expect(res.headers()["location"]).toBe("https://github.com/acme/desktop/releases/download/v1.4.0/Acme-1.4.0-arm64.dmg");
  expect(res.headers()["cache-control"]).toBe("no-store");
  const badge = await request.get("/download-badge.svg");
  expect(badge.ok()).toBe(true);
  expect(badge.headers()["content-type"]).toContain("image/svg+xml");
});

test("copy failures leave selectable snippets and clear feedback", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => { throw new Error("denied"); } } }));
  await page.goto("/download");
  await page.getByLabel("GitHub repository or release URL").fill("https://github.com/acme/desktop");
  await page.getByLabel("Operating system", { exact: true }).selectOption("macos");
  await page.getByLabel("Architecture", { exact: true }).selectOption("arm64");
  await page.getByRole("button", { name: "Find download" }).click();
  await page.getByRole("button", { name: "Copy One-tap link", exact: true }).click();
  await expect(page.getByTestId("share-download")).toContainText("Select and copy");
  await expect(page.getByLabel("One-tap link", { exact: true })).toBeFocused();
});

test("editing the target cancels an in-flight automatic download", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgentData", { value: { getHighEntropyValues: async () => ({ platform: "Linux", architecture: "x86", bitness: "64" }) } });
    Object.defineProperty(navigator, "userAgent", { value: "Linux x86_64" });
  });
  let finish: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => { finish = resolve; });
  let started: (() => void) | undefined;
  const requested = new Promise<void>((resolve) => { started = resolve; });
  await page.route("**/api/resolve", async (route) => {
    started?.();
    await pending;
    await route.fulfill({ json: {
      ok: true, repo: { owner: "acme", name: "desktop", url: "https://github.com/acme/desktop" },
      release: { name: "Acme Desktop", tag: "v1.4.0", url: "https://github.com/acme/desktop/releases/tag/v1.4.0", prerelease: false, publishedAt: null },
      platform: { os: "linux", arch: "x64" },
      recommendation: { status: "recommended", asset: { name: "Acme.AppImage", size: 2048, downloadUrl: "https://github.com/acme/desktop/releases/download/v1.4.0/Acme.AppImage", kind: "portable", format: "AppImage" } },
    } }).catch(() => {});
  });
  let downloads = 0;
  page.on("download", () => downloads++);
  await page.goto("/get/acme/desktop");
  await requested;
  await page.getByLabel("GitHub repository or release URL").fill("https://github.com/acme/lib");
  finish?.();
  await expect(page.getByRole("button", { name: "Find download" })).toBeEnabled();
  await expect(page.getByTestId("result-card")).toHaveCount(0);
  expect(downloads).toBe(0);
});
