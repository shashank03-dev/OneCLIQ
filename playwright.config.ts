import { defineConfig, devices } from "@playwright/test";
import { E2E_GITHUB_TOKEN } from "./e2e/test-env";

const MOCK_PORT = 4010;
const APP_PORT = 3100;

// Runs the production build against a local mock of the GitHub API.
// Build first: `npm run build` (or use `npm run test:e2e`, which does both).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // The animated pages can time out if several browser instances compete for CPU.
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${APP_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: `node e2e/mock-github.mjs`,
      env: { PORT: String(MOCK_PORT) },
      port: MOCK_PORT,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npx next start -p ${APP_PORT} -H 127.0.0.1`,
      env: {
        GITHUB_API_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
        GITHUB_TOKEN: E2E_GITHUB_TOKEN,
        RESOLVE_RATE_LIMIT_PER_MIN: "1000",
      },
      port: APP_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
