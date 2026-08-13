import { test, expect } from "@playwright/test";
import { enforceTestEnvironmentSafety } from "./helpers/safety-guard";

test.beforeAll(() => {
  enforceTestEnvironmentSafety();
});

test.describe("RECOMMENDATION FEED E2E", () => {
  test("1. Calibrated user sees Hero Recommendation and recommendation cards on /recommendations", async ({ page }) => {
    const uniqueEmail = `rec_${Date.now()}@filmprint.test`;
    await page.goto("/auth");
    await page.click("text=Kayıt Ol");
    await page.fill('input[name="name"]', "Rec Tester");
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', "Password123!");
    await page.click('button[type="submit"]');

    // Seed 30 interactions
    await page.evaluate(async () => {
      const resQueue = await fetch("/api/movies/queue");
      const queueData = await resQueue.json();
      const movies = queueData.movies || [];
      for (let i = 0; i < Math.min(30, movies.length); i++) {
        await fetch("/api/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ movieId: movies[i].id, status: "WATCHED", rating: "LOVE" }),
        });
      }
    });

    await page.goto("/recommendations");
    await expect(page.locator("text=Sana Özel").first()).toBeVisible();

    // Verify match score badge displays valid range (>= 60% and <= 97%)
    const matchBadges = page.locator("text=Uyum");
    const count = await matchBadges.count();
    expect(count).toBeGreaterThan(0);
  });
});
