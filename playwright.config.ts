import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration.
 *
 * Runs against the deployed Vercel URL in CI (set PLAYWRIGHT_TEST_BASE_URL),
 * or against the local dev server otherwise.
 *
 * Required env vars for E2E:
 *   PLAYWRIGHT_TEST_BASE_URL  — e.g. https://app-green-omega-46.vercel.app
 *   TEST_COACH_EMAIL          — coach login email
 *   TEST_COACH_PASSWORD       — coach login password
 *   TEST_CLIENT_EMAIL         — client login email
 *   TEST_CLIENT_PASSWORD      — client login password
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL:
      process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Only start the local dev server if NOT in CI (in CI, we test against deployed URL)
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
