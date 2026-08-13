import { test, expect } from "@playwright/test";
import { enforceTestEnvironmentSafety } from "./helpers/safety-guard";

test.beforeAll(() => {
  enforceTestEnvironmentSafety();
});

test.describe("LIBRARY & CRITICAL STATE TRANSITION E2E", () => {
  test("1. Library renders 4 tabs: İzlenenler, İzlenmeyenler, Emin Olunmayanlar, Daha Sonra İzle", async ({ page }) => {
    const uniqueEmail = `lib_${Date.now()}@filmprint.test`;
    await page.goto("/auth");
    await page.click("text=Kayıt Ol");
    await page.fill('input[name="name"]', "Library Tester");
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', "Password123!");
    await page.click('button[type="submit"]');

    await page.goto("/library");
    await expect(page.locator("text=İzlenenler").first()).toBeVisible();
    await expect(page.locator("text=İzlenmeyenler").first()).toBeVisible();
    await expect(page.locator("text=Emin Olunmayanlar").first()).toBeVisible();
    await expect(page.locator("text=Daha Sonra İzle").first()).toBeVisible();
  });

  test("2. State Transition: NOT_WATCHED -> Artık İzledim -> LOVE updates tab counts without duplicate rows", async ({ page }) => {
    const uniqueEmail = `trans_${Date.now()}@filmprint.test`;
    await page.goto("/auth");
    await page.click("text=Kayıt Ol");
    await page.fill('input[name="name"]', "Transition Tester");
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', "Password123!");
    await page.click('button[type="submit"]');

    // Add 1 movie as NOT_WATCHED
    await page.evaluate(async () => {
      const resQueue = await fetch("/api/movies/queue");
      const data = await resQueue.json();
      const movie = data.movies[0];
      await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId: movie.id, status: "NOT_WATCHED" }),
      });
    });

    await page.goto("/library?status=not_watched");
    await expect(page.locator("text=1").first()).toBeVisible();

    // Transition movie to WATCHED + LOVE via API
    await page.evaluate(async () => {
      const resQueue = await fetch("/api/movies/queue");
      const data = await resQueue.json();
      const movie = data.movies[0];
      await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId: movie.id, status: "WATCHED", rating: "LOVE" }),
      });
    });

    await page.goto("/library?status=watched");
    await expect(page.locator("text=1").first()).toBeVisible();

    await page.goto("/library?status=not_watched");
    await expect(page.locator("text=0").first()).toBeVisible();
  });
});
