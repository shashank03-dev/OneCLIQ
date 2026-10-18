import { expect, test, type Page } from "@playwright/test";

async function resolve(page: Page, url: string, os: string, arch: string) {
  await page.goto("/");
  await page.getByLabel("GitHub repository or release URL").fill(url);
  await page.getByLabel("Operating system").selectOption(os);
  await page.getByLabel("Architecture").selectOption(arch);
  await page.getByRole("button", { name: "Find download" }).click();
}

test("recommends the matching asset and shows Downloading when the download starts", async ({ page }) => {
  // Don't hit real GitHub: answer the asset link with a tiny attachment.
  await page.route("https://github.com/acme/desktop/releases/download/**", (route) =>
    route.fulfill({
      status: 200,
      headers: { "content-type": "application/octet-stream", "content-disposition": 'attachment; filename="Acme-1.4.0-arm64.dmg"' },
      body: "fake",
    }),
  );

  await resolve(page, "https://github.com/acme/desktop", "macos", "arm64");

  const card = page.getByTestId("result-card");
  await expect(card).toBeVisible();
  await expect(page.getByTestId("status-badge")).toHaveText("Recommended");
  await expect(card.getByRole("heading", { name: "Acme Desktop 1.4.0" })).toBeFocused();
  await expect(page.getByTestId("asset-name").locator(".sr-only")).toHaveText("Acme-1.4.0-arm64.dmg");
  await expect(card).toContainText("Installer · DMG");

  const download = card.getByRole("link", { name: "Download" });
  await expect(download).toHaveAttribute(
    "href",
    "https://github.com/acme/desktop/releases/download/v1.4.0/Acme-1.4.0-arm64.dmg",
  );

  const started = page.waitForEvent("download");
  await download.click();
  await started;
  await expect(page.getByTestId("status-badge")).toHaveText("Downloading");
  await expect(card.getByRole("link", { name: "Downloading…" })).toBeVisible();

  // No internal confidence or matching rationale leaks into the UI.
  await expect(page.locator("body")).not.toContainText(/confidence|score/i);
  // Download-only product: there is never an "Installing" state.
  await expect(page.locator("body")).not.toContainText(/Installing/);
});

test("resolves a specific release tag instead of the latest", async ({ page }) => {
  await resolve(page, "https://github.com/acme/desktop/releases/tag/v1.3.0", "macos", "x64");
  await expect(page.getByTestId("status-badge")).toHaveText("Recommended");
  await expect(page.getByTestId("result-card")).toContainText("v1.3.0");
  await expect(page.getByTestId("asset-name").locator(".sr-only")).toHaveText("Acme-1.3.0.dmg");
});

test("shows malware detections and lets the user inspect the evidence", async ({ page }) => {
  await page.route("**/api/malware", (route) => route.fulfill({ json: {
    ok: true, malware: { status: "flagged", sha256: "a".repeat(64), checks: [
      { id: "reputation", label: "VirusTotal", status: "warn", detail: "2 engines flag this file as malicious." },
    ] },
  } }));
  await resolve(page, "https://github.com/acme/desktop", "macos", "arm64");
  const panel = page.getByTestId("malware-panel");
  await expect(page.getByTestId("malware-status")).toHaveText("Flagged");
  await panel.getByRole("button").click();
  await expect(panel.getByRole("list")).toContainText("2 engines flag this file as malicious.");
  await expect(panel).toContainText("known malware only");
});

test("keeps incomplete malware evidence unknown", async ({ page }) => {
  await page.route("**/api/malware", (route) => route.fulfill({ json: {
    ok: true, malware: { status: "unknown", checks: [
      { id: "reputation", label: "VirusTotal", status: "info", detail: "No completed engine results." },
    ] },
  } }));
  await resolve(page, "https://github.com/acme/desktop", "macos", "arm64");
  await expect(page.getByTestId("malware-status")).toHaveText("Unknown");
  await expect(page.getByTestId("malware-panel")).toContainText("No completed engine results are available");
});

test("shows Not recommended when the release only has source code", async ({ page }) => {
  await resolve(page, "https://github.com/acme/lib", "windows", "x64");
  await expect(page.getByTestId("status-badge")).toHaveText("Not recommended — don’t install");
  await expect(page.getByTestId("no-match-message")).toContainText("only ships source code");
  await expect(page.getByRole("link", { name: "Download" })).toHaveCount(0);
});

test("shows Not recommended for ambiguous matches", async ({ page }) => {
  await resolve(page, "https://github.com/acme/suite", "linux", "x64");
  await expect(page.getByTestId("status-badge")).toHaveText("Not recommended — don’t install");
  await expect(page.getByTestId("no-match-message")).toContainText("More than one file could fit");
});

test("validates the URL in place without calling the server", async ({ page }) => {
  let called = false;
  page.on("request", (r) => {
    if (r.url().includes("/api/resolve")) called = true;
  });
  await resolve(page, "https://gitlab.com/acme/desktop", "linux", "x64");
  const input = page.getByLabel("GitHub repository or release URL");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("alert").filter({ hasText: "github.com" })).toHaveText("Only github.com URLs are supported.");
  expect(called).toBe(false);
});

test("explains missing repositories, empty repos and rate limits", async ({ page }) => {
  await resolve(page, "https://github.com/acme/missing", "linux", "x64");
  await expect(page.getByTestId("error-card")).toContainText("Repository not found");

  await page.getByLabel("GitHub repository or release URL").fill("https://github.com/acme/empty");
  await page.getByRole("button", { name: "Find download" }).click();
  await expect(page.getByTestId("error-card")).toContainText("No releases yet");

  await page.getByLabel("GitHub repository or release URL").fill("https://github.com/acme/limited");
  await page.getByRole("button", { name: "Find download" }).click();
  await expect(page.getByTestId("error-card")).toContainText("Slow down a moment");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("shows a network error when the resolver can't be reached", async ({ page }) => {
  await page.route("**/api/resolve", (route) => route.abort("internetdisconnected"));
  await resolve(page, "https://github.com/acme/desktop", "linux", "x64");
  await expect(page.getByTestId("error-card")).toContainText("Couldn’t reach the server");
});

test("is keyboard operable", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("GitHub repository or release URL").focus();
  await page.keyboard.type("https://github.com/acme/desktop");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Operating system")).toBeFocused();
  await page.getByLabel("Operating system").selectOption("linux");
  await page.keyboard.press("Tab");
  await page.getByLabel("Architecture").selectOption("x64");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Find download" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("asset-name").locator(".sr-only")).toHaveText("Acme-1.4.0.AppImage");
});

test("never exposes the GitHub token to the browser", async ({ page }) => {
  const bodies: string[] = [];
  page.on("response", async (r) => {
    if (r.url().includes("/api/resolve") || r.url().endsWith(".js")) bodies.push(await r.text().catch(() => ""));
  });
  await resolve(page, "https://github.com/acme/desktop", "linux", "x64");
  await expect(page.getByTestId("result-card")).toBeVisible();
  expect(bodies.join("\n")).not.toMatch(/GITHUB_TOKEN|ghp_|github_pat_/);
});
