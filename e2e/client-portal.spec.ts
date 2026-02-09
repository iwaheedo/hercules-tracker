import { test, expect } from "@playwright/test";

test.describe("Client Portal", () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.TEST_CLIENT_EMAIL;
    const password = process.env.TEST_CLIENT_PASSWORD;

    if (!email || !password) {
      test.skip();
      return;
    }

    // Login as client
    await page.goto("/login");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*portal/, { timeout: 15000 });
  });

  test("displays welcome header and stats", async ({ page }) => {
    // Welcome greeting
    await expect(page.locator("text=Welcome")).toBeVisible();

    // Stats cards
    await expect(page.locator("text=Active Goals")).toBeVisible();
    await expect(page.locator("text=This Week")).toBeVisible();
    await expect(page.locator("text=Completed")).toBeVisible();
  });

  test("tab navigation works", async ({ page }) => {
    // Default tab should be "My Goals"
    await expect(page.locator("text=My Goals")).toBeVisible();

    // Switch to "This Week" tab
    await page.click("text=This Week");
    await expect(page).toHaveURL(/.*tab=thisweek/);

    // Switch to "Check-ins" tab
    await page.click("text=Check-ins");
    await expect(page).toHaveURL(/.*tab=checkins/);

    // Go back to "My Goals"
    await page.click("text=My Goals");
    await expect(page).toHaveURL(/.*tab=goals/);
  });

  test("can navigate to settings", async ({ page }) => {
    // Click the settings gear icon in the nav
    await page.click('a[href="/settings"]');
    await expect(page).toHaveURL(/.*settings/);
    await expect(page.locator("text=Settings")).toBeVisible();
    await expect(page.locator("text=Your Coach")).toBeVisible();
  });

  test("portal header shows Hercules Tracker branding", async ({ page }) => {
    await expect(page.locator("text=Hercules Tracker")).toBeVisible();
  });
});
