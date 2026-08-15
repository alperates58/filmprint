import { test, expect } from "@playwright/test";
import { enforceTestEnvironmentSafety } from "./helpers/safety-guard";

test.beforeAll(() => {
  enforceTestEnvironmentSafety();
});

test.describe("PWA & SAFE OFFLINE FOUNDATION E2E", () => {
  test("1. GET /manifest.webmanifest returns HTTP 200 and valid PWA fields", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);

    const json = await res.json();
    expect(json.name).toBe("SineAI");
    expect(json.short_name).toBe("SineAI");
    expect(json.start_url).toBe("/");
    expect(json.display).toBe("standalone");
    expect(json.theme_color).toBe("#09090b");
    expect(json.background_color).toBe("#09090b");
    expect(Array.isArray(json.icons)).toBe(true);
    expect(json.icons.length).toBeGreaterThanOrEqual(2);
  });

  test("2. GET /sw.js returns HTTP 200 and contains API NetworkOnly policy", async ({ request }) => {
    const res = await request.get("/sw.js");
    expect(res.status()).toBe(200);

    const text = await res.text();
    expect(text).toContain("filmprint-static-v1");
    expect(text).toContain("/api/");
    expect(text).toContain("navigate");
    expect(text).toContain("/offline.html");
  });

  test("3. GET /offline.html returns HTTP 200 and renders branded offline fallback", async ({ page }) => {
    const res = await page.goto("/offline.html");
    expect(res?.status()).toBe(200);

    await expect(page.locator("text=SINEAI")).toBeVisible();
    await expect(page.locator("text=Şu anda internet bağlantısı yok.")).toBeVisible();
    await expect(page.locator("text=Tekrar Dene")).toBeVisible();
  });
});
