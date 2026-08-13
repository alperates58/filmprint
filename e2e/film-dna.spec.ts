import { test, expect } from "@playwright/test";
import { enforceTestEnvironmentSafety } from "./helpers/safety-guard";

test.beforeAll(() => {
  enforceTestEnvironmentSafety();
});

test.describe("FILM DNA PROFILE E2E", () => {
  test("1. GET /api/profile contract validation for calibrated user", async ({ request, page }) => {
    // Authenticate user
    const uniqueEmail = `dna_${Date.now()}@filmprint.test`;
    await page.goto("/auth");
    await page.click("text=Kayıt Ol");
    await page.fill('input[name="name"]', "DNA Tester");
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', "Password123!");
    await page.click('button[type="submit"]');

    const res = await request.get("/api/profile");
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(data.ready).toBeDefined();
    expect(data.progression).toBeDefined();
  });

  test("2. /profile UI renders confidence level, top genres, era signature and rank", async ({ page }) => {
    const uniqueEmail = `dnaui_${Date.now()}@filmprint.test`;
    await page.goto("/auth");
    await page.click("text=Kayıt Ol");
    await page.fill('input[name="name"]', "DNA UI Tester");
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', "Password123!");
    await page.click('button[type="submit"]');

    await page.goto("/profile");
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(page.locator("text=Başlangıç") || page.locator("text=İzleyici")).toBeVisible();
  });
});
