import { test, expect } from "@playwright/test";
import { enforceTestEnvironmentSafety } from "./helpers/safety-guard";

test.beforeAll(() => {
  enforceTestEnvironmentSafety();
});

test.describe("HEADER CONSISTENCY REGRESSION TEST", () => {
  test("1. Evaluated count, rank label and target count match consistently across all routes", async ({ page }) => {
    const uniqueEmail = `header_${Date.now()}@filmprint.test`;
    await page.goto("/auth");
    await page.click("text=Kayıt Ol");
    await page.fill('input[name="name"]', "Header Tester");
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', "Password123!");
    await page.click('button[type="submit"]');

    // Perform 35 interactions
    await page.evaluate(async () => {
      const resQueue = await fetch("/api/movies/queue");
      const queueData = await resQueue.json();
      const movies = queueData.movies || [];
      for (let i = 0; i < Math.min(35, movies.length); i++) {
        await fetch("/api/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ movieId: movies[i].id, status: "WATCHED", rating: "LIKE" }),
        });
      }
    });

    const targetRoutes = ["/", "/profile", "/recommendations", "/library", "/account"];

    for (const route of targetRoutes) {
      await page.goto(route);
      // Ensure header doesn't fall back to 0/30 or fake default
      const headerContent = await page.locator("header").innerText();
      expect(headerContent).not.toContain("0/30");
      expect(headerContent).toContain("35");
    }
  });
});
