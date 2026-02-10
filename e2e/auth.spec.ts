import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("redirects unauthenticated user to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*login/);
  });

  test("redirects unauthenticated user from /portal to /login", async ({
    page,
  }) => {
    await page.goto("/portal");
    await expect(page).toHaveURL(/.*login/);
  });

  test("redirects unauthenticated user from /settings to /login", async ({
    page,
  }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/.*login/);
  });

  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");

    // Check key elements exist
    await expect(page.locator("text=Hercules")).toBeVisible();
    await expect(page.locator("text=Welcome back")).toBeVisible();
    await expect(page.locator("text=Sign in to your account")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator("text=Sign up")).toBeVisible();
  });

  test("shows error with invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "invalid@notreal.com");
    await page.fill('input[type="password"]', "wrongpassword123");
    await page.click('button[type="submit"]');

    // Should show an error message (Supabase returns "Invalid login credentials")
    await expect(page.locator("text=Invalid login credentials")).toBeVisible({
      timeout: 10000,
    });
  });

  test("coach can login and reach dashboard", async ({ page }) => {
    const email = process.env.TEST_COACH_EMAIL;
    const password = process.env.TEST_COACH_PASSWORD;

    if (!email || !password) {
      test.skip();
      return;
    }

    await page.goto("/login");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard (via root page role check)
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
    await expect(page.locator("text=Good")).toBeVisible({ timeout: 10000 });
  });

  test("client can login and reach portal", async ({ page }) => {
    const email = process.env.TEST_CLIENT_EMAIL;
    const password = process.env.TEST_CLIENT_PASSWORD;

    if (!email || !password) {
      test.skip();
      return;
    }

    await page.goto("/login");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Should redirect to portal (via root page role check)
    await expect(page).toHaveURL(/.*portal/, { timeout: 15000 });
    await expect(page.locator("text=Welcome")).toBeVisible({ timeout: 10000 });
  });
});
