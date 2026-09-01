import assert from "assert";

// Ensure test environment in-memory mode is active when DB is offline
process.env.NODE_ENV = "test";

import { generateSearchNormalizedTitle } from "@/lib/calibration/priority";
import { generateMovieSlug, generateTvSlug } from "@/lib/growth/seo/slug";
import { resolveGenreNamesFromIds, resolveCanonicalGenreIds } from "@/lib/catalog/genres";
import { adminGrantUserEntitlement, getUserEntitlement } from "@/lib/entitlements/service";

export async function runSearchAndActorDiscoveryTests() {
  console.log("--> Starting Search and Actor Discovery Test Suite...");

  // 1. Search Normalization Unit Tests
  const norm1 = generateSearchNormalizedTitle("Zor Ölüm 4.0");
  assert.ok(norm1.includes("zor"), "Normalized title must contain lowercase terms");
  assert.ok(norm1.includes("olum"), "Normalized title must handle Turkish characters");

  const norm2 = generateSearchNormalizedTitle("Inception", "Inception", "Başlangıç");
  assert.ok(norm2.includes("inception") && norm2.includes("baslangic"), "Normalized title must combine original and localized titles");

  // 2. Slug Generation Tests
  const movieSlug = generateMovieSlug("Zor Ölüm 4", 1571);
  assert.strictEqual(movieSlug, "zor-olum-4-1571", "Movie slug must be SEO canonical");

  const tvSlug = generateTvSlug("Breaking Bad", 1396);
  assert.strictEqual(tvSlug, "breaking-bad-1396", "TV slug must be SEO canonical");

  // 3. Genre ID Resolution Tests
  const filmGenres = resolveGenreNamesFromIds([28, 878], "FILM");
  assert.deepStrictEqual(filmGenres, ["Aksiyon", "Bilim Kurgu"], "Must resolve canonical film genres correctly");

  const tvGenres = resolveGenreNamesFromIds([18, 80], "TV");
  assert.deepStrictEqual(tvGenres, ["Dram", "Suç"], "Must resolve canonical TV genres correctly");

  // 4. Entitlement Admin Grant Unit Test
  const grantRes = await adminGrantUserEntitlement("test_user_search_actor_1", "PREMIUM", new Date(Date.now() + 86400000));
  assert.strictEqual(grantRes.tier, "PREMIUM", "Admin grant must return PREMIUM tier");

  const userEnt = await getUserEntitlement("test_user_search_actor_1");
  assert.strictEqual(userEnt.isPremium, true, "User must evaluate to isPremium=true");
  assert.strictEqual(userEnt.features.AD_FREE, true, "Premium user must have AD_FREE=true");

  console.log("✅ Search and Actor Discovery Test Suite Passed Successfully!");
}

if (require.main === module) {
  runSearchAndActorDiscoveryTests().catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
}
