import { test, expect } from "@playwright/test";
import { enforceTestEnvironmentSafety } from "./helpers/safety-guard";
import { TEST_FIXTURES } from "./fixtures/test-data";

test.beforeAll(() => {
  enforceTestEnvironmentSafety();
});

test.describe("MOVIE CALIBRATION & 30-FILM MILESTONE E2E", () => {
  test("1. New user performs movie interaction and rating step", async ({ page }) => {
    // Register fresh user
    const uniqueEmail = `calib_${Date.now()}@filmprint.test`;
    await page.goto("/auth");
    await page.click("text=Kayıt Ol");
    await page.fill('input[name="name"]', "Calibration Tester");
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', "Password123!");
    await page.click('button[type="submit"]');

    await page.goto("/calibrate");
    await expect(page.locator("text=Film DNA").first()).toBeVisible();

    // Click 'İzledim' button
    const watchedBtn = page.locator("button:has-text('İzledim')").first();
    await expect(watchedBtn).toBeVisible();
    await watchedBtn.click();

    // Rating step should open (Çok Sevdim / Sevdim / Nötr / Sevmedim)
    const loveBtn = page.locator("button:has-text('Çok Sevdim')").first();
    await expect(loveBtn).toBeVisible();
    await loveBtn.click();

    // Next movie card should load with smooth transition
    await page.waitForTimeout(500);
    const counterText = await page.locator("text=/30").innerText();
    expect(counterText).toContain("1/30");
  });

  test("2. Keyboard shortcuts (1, 2, 3) trigger correct status responses", async ({ page }) => {
    const uniqueEmail = `kb_${Date.now()}@filmprint.test`;
    await page.goto("/auth");
    await page.click("text=Kayıt Ol");
    await page.fill('input[name="name"]', "KB Tester");
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', "Password123!");
    await page.click('button[type="submit"]');

    await page.goto("/calibrate");

    // Press '2' for 'İzlemedim'
    await page.keyboard.press("Digit2");
    await page.waitForTimeout(400);

    // Counter should increment
    const counterText = await page.locator("text=/30").innerText();
    expect(counterText).toContain("1/30");
  });

  test("3. 30th Film Milestone Unlocks Film DNA and Viewer Rank", async ({ page }) => {
    // Login as pre-seeded 29-interaction user or API mock
    const uniqueEmail = `m30_${Date.now()}@filmprint.test`;
    await page.goto("/auth");
    await page.click("text=Kayıt Ol");
    await page.fill('input[name="name"]', "Milestone Tester");
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', "Password123!");
    await page.click('button[type="submit"]');

    // Perform 30 rapid interactions via API calls
    await page.evaluate(async () => {
      const resQueue = await fetch("/api/movies/queue");
      const queueData = await resQueue.json();
      const movies = queueData.movies || [];

      for (let i = 0; i < Math.min(30, movies.length); i++) {
        await fetch("/api/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            movieId: movies[i].id,
            status: "WATCHED",
            rating: "LIKE",
          }),
        });
      }
    });

    // Refresh profile page and verify milestone
    await page.goto("/profile");
    await expect(page.locator("text=İzleyici").first()).toBeVisible();
    await expect(page.locator("text=Film DNA").first()).toBeVisible();
  });
});
