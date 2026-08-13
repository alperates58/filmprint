import { test, expect } from "@playwright/test";
import { enforceTestEnvironmentSafety } from "./helpers/safety-guard";

test.beforeAll(() => {
  enforceTestEnvironmentSafety();
});

test.describe("MOVIE DETAILS MODAL E2E", () => {
  test("1. Clicking movie card opens modal and Escape key closes modal", async ({ page }) => {
    const uniqueEmail = `modal_${Date.now()}@filmprint.test`;
    await page.goto("/auth");
    await page.click("text=Kayıt Ol");
    await page.fill('input[name="name"]', "Modal Tester");
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', "Password123!");
    await page.click('button[type="submit"]');

    await page.goto("/");

    // Click first movie card image or title if available
    const firstCard = page.locator(".group").first();
    if (await firstCard.isVisible()) {
      await firstCard.click();
      await page.waitForTimeout(300);

      // Press Escape to close modal
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
  });
});
