import { test, expect } from "@playwright/test";
import { enforceTestEnvironmentSafety } from "./helpers/safety-guard";
import { TEST_FIXTURES } from "./fixtures/test-data";

test.beforeAll(() => {
  enforceTestEnvironmentSafety();
});

test.describe("AUTHENTICATION & AUTHORIZATION E2E FLOW", () => {
  test("1. Unauthenticated user visiting protected route is redirected to /auth", async ({ page }) => {
    await page.goto("/library");
    await expect(page).toHaveURL(/\/auth\?returnTo=%2Flibrary/);
  });

  test("2. Unauthenticated user calling protected API gets 401 Unauthorized", async ({ request }) => {
    const response = await request.get("/api/profile");
    expect(response.status()).toBe(401);
  });

  test("3. Fresh Email Registration -> Authenticated Session -> Landing", async ({ page }) => {
    const testUser = TEST_FIXTURES.users.newUser;
    const uniqueEmail = `test_${Date.now()}@filmprint.test`;

    await page.goto("/auth");
    await page.click("text=Kayıt Ol");

    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', testUser.password);

    await page.click('button[type="submit"]');

    // Should redirect to calibration or home after registration
    await expect(page).not.toHaveURL(/\/auth/);

    // Verify session cookie exists
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "filmprint_user_session");
    expect(sessionCookie).toBeDefined();
  });

  test("4. Duplicate registration attempt shows error message", async ({ page }) => {
    await page.goto("/auth");
    await page.click("text=Kayıt Ol");

    // Attempt to register existing user
    await page.fill('input[name="name"]', "Duplicate User");
    await page.fill('input[name="email"]', TEST_FIXTURES.users.newUser.email);
    await page.fill('input[name="password"]', "Password123!");

    await page.click('button[type="submit"]');

    // Error message should be visible on page
    await expect(page.locator("text=zaten kullanılıyor")).toBeVisible();
  });

  test("5. Invalid password login shows error message", async ({ page }) => {
    await page.goto("/auth");

    await page.fill('input[name="email"]', TEST_FIXTURES.users.newUser.email);
    await page.fill('input[name="password"]', "WrongPassword999!");

    await page.click('button[type="submit"]');

    await expect(page.locator("text=geçersiz") || page.locator("text=hatalı")).toBeVisible();
  });

  test("6. Logout clears session cookie and redirects to /auth", async ({ page }) => {
    // Perform valid login first
    await page.goto("/auth");
    await page.fill('input[name="email"]', TEST_FIXTURES.users.newUser.email);
    await page.fill('input[name="password"]', TEST_FIXTURES.users.newUser.password);
    await page.click('button[type="submit"]');

    await page.goto("/account");
    await page.click("text=Çıkış Yap");

    await expect(page).toHaveURL(/\/auth/);

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "filmprint_user_session");
    expect(sessionCookie).toBeUndefined();
  });
});
