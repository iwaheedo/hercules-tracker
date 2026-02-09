import { test, expect } from "@playwright/test";

test.describe("Coach Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.TEST_COACH_EMAIL;
    const password = process.env.TEST_COACH_PASSWORD;

    if (!email || !password) {
      test.skip();
      return;
    }

    // Login as coach
    await page.goto("/login");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  });

  test("displays greeting and stats cards", async ({ page }) => {
    // Greeting header
    await expect(page.locator("text=Good")).toBeVisible();

    // Stats cards should exist
    await expect(page.locator("text=Active Clients")).toBeVisible();
    await expect(page.locator("text=Weekly Completion")).toBeVisible();
    await expect(page.locator("text=Next Check-in")).toBeVisible();
  });

  test("sidebar navigation works", async ({ page }) => {
    // Dashboard link should be active in sidebar
    await expect(page.locator('a[href="/dashboard"]')).toBeVisible();

    // Navigate to clients
    await page.click('a[href="/clients"]');
    await expect(page).toHaveURL(/.*clients/);
    await expect(page.locator("text=Clients")).toBeVisible();
  });

  test("can navigate to settings", async ({ page }) => {
    await page.click('a[href="/settings"]');
    await expect(page).toHaveURL(/.*settings/);
    await expect(page.locator("text=Settings")).toBeVisible();
    await expect(page.locator("text=Profile")).toBeVisible();
  });

  test("clients page shows client cards or empty state", async ({ page }) => {
    await page.goto("/clients");

    // Should have either client cards or an empty state message
    const hasClients = await page.locator('a[href*="/clients/"]').count();
    if (hasClients > 0) {
      // Verify client card has expected elements
      await expect(page.locator('a[href*="/clients/"]').first()).toBeVisible();
    } else {
      await expect(
        page.locator("text=No clients yet").or(page.locator("text=Add"))
      ).toBeVisible();
    }
  });
});
