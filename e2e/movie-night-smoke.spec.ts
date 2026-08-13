import { test, expect } from "@playwright/test";
import { enforceTestEnvironmentSafety } from "./helpers/safety-guard";

test.beforeAll(() => {
  enforceTestEnvironmentSafety();
});

test.describe("MOVIE NIGHT SMOKE TEST", () => {
  test("1. Host can create Movie Night room and join lobby", async ({ page }) => {
    const uniqueEmail = `night_${Date.now()}@filmprint.test`;
    await page.goto("/auth");
    await page.click("text=Kayıt Ol");
    await page.fill('input[name="name"]', "Night Host");
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', "Password123!");
    await page.click('button[type="submit"]');

    await page.goto("/night");
    await expect(page.locator("text=Oda Oluştur").first()).toBeVisible();

    await page.click("text=Oda Oluştur");
    await page.waitForTimeout(500);

    // Verify room code is generated and visible
    await expect(page.locator("text=Oda Kodu") || page.locator("text=Katıl")).toBeVisible();
  });
});
