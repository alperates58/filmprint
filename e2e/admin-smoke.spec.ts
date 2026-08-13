import { test, expect } from "@playwright/test";
import { enforceTestEnvironmentSafety } from "./helpers/safety-guard";

test.beforeAll(() => {
  enforceTestEnvironmentSafety();
});

test.describe("ADMIN CONSOLE SMOKE & SECURITY TEST", () => {
  test("1. Unauthenticated user visiting /admin is redirected to /admin/login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("2. Normal registered user cannot access /admin routes", async ({ page }) => {
    const uniqueEmail = `normal_${Date.now()}@filmprint.test`;
    await page.goto("/auth");
    await page.click("text=Kayıt Ol");
    await page.fill('input[name="name"]', "Normal User");
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', "Password123!");
    await page.click('button[type="submit"]');

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
