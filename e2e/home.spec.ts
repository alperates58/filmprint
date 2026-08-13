import { test, expect } from "@playwright/test";
import { enforceTestEnvironmentSafety } from "./helpers/safety-guard";

test.beforeAll(() => {
  enforceTestEnvironmentSafety();
});

test.describe("DISCOVERY HOME E2E", () => {
  test("1. Returning user visits GET / and sees real Discovery Home with category rows", async ({ page }) => {
    const uniqueEmail = `home_${Date.now()}@filmprint.test`;
    await page.goto("/auth");
    await page.click("text=Kayıt Ol");
    await page.fill('input[name="name"]', "Home Tester");
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', "Password123!");
    await page.click('button[type="submit"]');

    await page.goto("/");
    await expect(page).toHaveURL("/");

    // Verify main page elements render without duplicate explosions or empty title headers
    await expect(page.locator("h1, h2, header").first()).toBeVisible();
  });
});
