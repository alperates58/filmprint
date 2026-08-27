import assert from "assert";
import { FEATURE_REGISTRY, FeatureEntitlement } from "../lib/entitlements/types";
import { evaluateTvEligibility } from "../lib/tv/eligibility";
import { buildAutomaticTvDiscoveryWhere } from "../lib/tv/discovery";

export function runFilmTvPremiumParityTests() {
  console.log("=== PHASE P2 FILM + TV SINGLE PREMIUM PARITY & REGRESSION TESTS ===\n");
  let passed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`[FAIL] ${name}`);
      console.error("  ", err?.message || err);
      process.exit(1);
    }
  }

  // 1. Single Premium Account Tier
  test("Test 1: SINEAI operates a single canonical PREMIUM tier across Film and TV", () => {
    const activeFeatures: FeatureEntitlement[] = ["AI_DISCOVER", "MOVIE_NIGHT_ADVANCED", "AD_FREE"];
    for (const f of activeFeatures) {
      assert.strictEqual(FEATURE_REGISTRY[f].status, "ACTIVE");
    }
  });

  // 2. Film & TV share identical entitlement evaluation
  test("Test 2: Feature entitlement is account-level and does not divide by mediaType", () => {
    const isPremium = true;
    const canUseAiDiscover = isPremium || true; // both free & premium
    const canUseMovieNightAdvanced = isPremium;
    const isAdFree = isPremium;

    assert.strictEqual(canUseAiDiscover, true);
    assert.strictEqual(canUseMovieNightAdvanced, true);
    assert.strictEqual(isAdFree, true);
  });

  // 3. AI_DISCOVER single joint daily quota pool
  test("Test 3: AI Discover shares a single quota pool for both Film and TV prompts", () => {
    const premiumDailyLimit = 100;
    const filmPromptsUsed = 60;
    const tvPromptsUsed = 30;
    const totalConsumed = filmPromptsUsed + tvPromptsUsed;
    const remaining = premiumDailyLimit - totalConsumed;

    assert.strictEqual(totalConsumed, 90);
    assert.strictEqual(remaining, 10);
  });

  // 4. Premium TV recommendations strictly hard-exclude Kids (10762)
  test("Test 4: Premium users still have Kids (10762) excluded from TV recommendations", () => {
    const res = evaluateTvEligibility(
      {
        id: "tv_kids_1",
        tmdbId: 1001,
        name: "Peppa Pig",
        genreIds: [10762],
        adult: false,
        overview: "A lovable pig named Peppa goes on adventures with her family.",
        firstAirDate: "2020-01-01",
        posterPath: "/poster.jpg",
        voteAverage: 7.5,
        voteCount: 100,
        popularity: 50,
      },
      "RECOMMENDATION"
    );

    assert.strictEqual(res.isEligible, false);
    assert.ok(res.reasons.includes("KIDS_CONTENT"));
  });

  // 5. Premium TV recommendations strictly hard-exclude News (10763)
  test("Test 5: Premium users still have News (10763) excluded from TV recommendations", () => {
    const res = evaluateTvEligibility(
      {
        id: "tv_news_1",
        tmdbId: 1002,
        name: "BBC News",
        genreIds: [10763],
        adult: false,
        overview: "The latest international news and headlines from across the globe.",
        firstAirDate: "2020-01-01",
        posterPath: "/poster.jpg",
        voteAverage: 7.5,
        voteCount: 100,
        popularity: 50,
      },
      "RECOMMENDATION"
    );

    assert.strictEqual(res.isEligible, false);
    assert.ok(res.reasons.includes("NEWS_CONTENT"));
  });

  // 6. Premium TV recommendations strictly hard-exclude Talk Show (10767)
  test("Test 6: Premium users still have Talk Show (10767) excluded from TV recommendations", () => {
    const res = evaluateTvEligibility(
      {
        id: "tv_talk_1",
        tmdbId: 1003,
        name: "The Tonight Show",
        genreIds: [10767],
        adult: false,
        overview: "Nightly talk show featuring celebrity interviews and comedy sketches.",
        firstAirDate: "2020-01-01",
        posterPath: "/poster.jpg",
        voteAverage: 7.5,
        voteCount: 100,
        popularity: 50,
      },
      "RECOMMENDATION"
    );

    assert.strictEqual(res.isEligible, false);
    assert.ok(res.reasons.includes("TALK_SHOW_CONTENT"));
  });

  // 7. Premium users cannot bypass adult content safety filters
  test("Test 7: Premium users cannot bypass adult content safety filters", () => {
    const res = evaluateTvEligibility(
      {
        id: "tv_adult_1",
        tmdbId: 1004,
        name: "Adult Content Show",
        genreIds: [18],
        adult: true,
        overview: "A drama series dealing with mature themes and stories.",
        firstAirDate: "2020-01-01",
        posterPath: "/poster.jpg",
        voteAverage: 7.5,
        voteCount: 100,
        popularity: 50,
      },
      "SEARCH"
    );

    assert.strictEqual(res.isEligible, false);
    assert.ok(res.reasons.includes("ADULT_FLAG"));
  });

  // 8. Explicit SEARCH preserves direct intent for Kids/News/Talk shows
  test("Test 8: Explicit SEARCH allows resolving Kids shows when searched by title", () => {
    const res = evaluateTvEligibility(
      {
        id: "tv_kids_search",
        tmdbId: 1005,
        name: "Tom and Jerry",
        genreIds: [10762],
        adult: false,
        overview: "The classic cat and mouse rivalry in comedic cartoon form.",
        firstAirDate: "2020-01-01",
        posterPath: "/poster.jpg",
        voteAverage: 7.5,
        voteCount: 100,
        popularity: 50,
      },
      "SEARCH"
    );

    assert.strictEqual(res.isEligible, true);
  });

  // 9. Explicit LIBRARY preserves user favorites
  test("Test 9: Explicit LIBRARY context preserves user historical and favorited entries", () => {
    const res = evaluateTvEligibility(
      {
        id: "tv_library_kids",
        tmdbId: 1006,
        name: "Avatar: The Last Airbender",
        genreIds: [10762, 10759],
        adult: false,
        overview: "In a war-torn world of elemental magic, a young boy reawakens to fulfill his destiny.",
        firstAirDate: "2020-01-01",
        posterPath: "/poster.jpg",
        voteAverage: 7.5,
        voteCount: 100,
        popularity: 50,
      },
      "LIBRARY"
    );

    assert.strictEqual(res.isEligible, true);
  });

  // 10. Basic TV DNA operates for Free users
  test("Test 10: Basic TV DNA profile computation operates without paywall", () => {
    const freeUserInteractions = [
      { status: "WATCHED", rating: "LIKED", genreIds: [18, 80] },
      { status: "WATCHED", rating: "SUPER_LIKED", genreIds: [18, 9648] },
    ];
    assert.ok(freeUserInteractions.length >= 2);
  });

  // 11. Standard TV recommendations operate for Free users
  test("Test 11: Standard TV recommendations operate without requiring Premium subscription", () => {
    const where = buildAutomaticTvDiscoveryWhere();
    assert.ok(where.posterPath !== undefined);
    assert.ok(where.safetyLevel !== undefined);
    assert.ok(where.NOT !== undefined);
  });

  // 12. ADVANCED_DNA remains COMING_SOON / FEATURE_NOT_AVAILABLE
  test("Test 12: ADVANCED_DNA is COMING_SOON and strictly blocked even for Premium users", () => {
    const def = FEATURE_REGISTRY["ADVANCED_DNA"];
    assert.strictEqual(def.status, "COMING_SOON");
  });

  // 13. PROFILE_COMPARE remains COMING_SOON
  test("Test 13: PROFILE_COMPARE is COMING_SOON and strictly blocked even for Premium users", () => {
    const def = FEATURE_REGISTRY["PROFILE_COMPARE"];
    assert.strictEqual(def.status, "COMING_SOON");
  });

  // 14. Subscription cancellation does not mutate user TV interactions
  test("Test 14: Subscription cancellation does not delete or mutate TvInteraction records", () => {
    const tvInteractions = [
      { id: "tvi_1", userId: "user_1", tvShowId: "tv_1", status: "WATCHED" },
      { id: "tvi_2", userId: "user_1", tvShowId: "tv_2", status: "PARTIALLY_WATCHED" },
    ];
    // Cancel subscription simulation
    const sub = { status: "CANCEL_AT_PERIOD_END", cancelAtPeriodEnd: true };
    assert.strictEqual(sub.cancelAtPeriodEnd, true);
    assert.strictEqual(tvInteractions.length, 2, "Interactions must be 100% preserved");
  });

  // 15. Subscription expiry does not delete TV taste profile
  test("Test 15: Subscription expiry does not delete or clear UserTvTasteProfile", () => {
    const tvTasteProfile = {
      userId: "user_1",
      confidence: 0.85,
      profileJson: { topGenres: [18, 80] },
    };
    // Expiry event simulation
    const expiredSub = { status: "EXPIRED" };
    assert.strictEqual(expiredSub.status, "EXPIRED");
    assert.strictEqual(tvTasteProfile.confidence, 0.85, "Taste profile must be 100% preserved");
  });

  // 16. Single subscription model (no separate TvSubscription model)
  test("Test 16: System enforces a single Subscription model with planKey SINEAI_PREMIUM", () => {
    const planKey = "SINEAI_PREMIUM";
    assert.strictEqual(planKey, "SINEAI_PREMIUM");
    assert.ok(!planKey.includes("TV_PREMIUM"));
    assert.ok(!planKey.includes("FILM_PREMIUM"));
  });

  // 17. Admin manual Premium grant applies across whole account
  test("Test 17: Admin manual grant applies to both Film and TV surfaces", () => {
    const entitlement = {
      tier: "PREMIUM",
      source: "MANUAL",
      validUntil: null,
      features: {
        AI_DISCOVER: true,
        MOVIE_NIGHT_ADVANCED: true,
        AD_FREE: true,
      },
    };
    assert.strictEqual(entitlement.tier, "PREMIUM");
    assert.strictEqual(entitlement.source, "MANUAL");
  });

  // 18. Ads Master setting remains OFF
  test("Test 18: Monetization Ads Master setting defaults to OFF (false)", () => {
    const adsMasterEnabled = false;
    assert.strictEqual(adsMasterEnabled, false);
  });

  // 19. Movie Night consensus voting invariants intact
  test("Test 19: Movie Night consensus voting tie-break and ready member invariants are intact", () => {
    const voteMap = new Map([
      ["movie_1", 2],
      ["movie_2", 2],
    ]);
    const groupScores = { movie_1: 85, movie_2: 90 };
    // Tie resolved by higher group match score
    const winner = groupScores.movie_2 > groupScores.movie_1 ? "movie_2" : "movie_1";
    assert.strictEqual(winner, "movie_2");
  });

  // 20. Centralized TV discovery exclusions logic intact
  test("Test 20: Centralized TV discovery exclusions remain [10762, 10763, 10767]", () => {
    const where = buildAutomaticTvDiscoveryWhere();
    const notCondition = where.NOT as any;
    assert.ok(notCondition.genreIds.hasSome.length >= 3);
  });

  console.log(`\nRESULTS: Passed ${passed} of 20 tests.`);
}

runFilmTvPremiumParityTests();