import { db } from "../lib/db/client";
import { tmdbTvClient } from "../lib/tmdb/tv/client";
import {
  evaluateTvEligibility,
  isTvShowEligible,
  filterEligibleTvShows,
} from "../lib/tv/eligibility";
import { updateTvInteraction } from "../lib/tv/service";

export async function runTvFoundationTests() {
  console.log("=== TV PHASE 0 FOUNDATION & REGRESSION UNIT TESTS ===\n");
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, message: string) {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total}: ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  const { isDbAvailable } = await import("./test_helpers");
  if (!(await isDbAvailable())) {
    console.log("  ⚠️ Running in-memory TV Eligibility domain tests (PostgreSQL offline in test environment)");
    
    // In-memory TV Eligibility tests
    const adultShow = { name: "Adult Series", overview: "Explicit adult show.", posterPath: "/poster.jpg", firstAirDate: "2021-01-01", voteAverage: 6.0, voteCount: 150, adult: true };
    const resAdult = evaluateTvEligibility(adultShow, "CALIBRATION");
    assert(resAdult.isEligible === false, "TV show with adult=true is rejected");

    const pornKeywordShow = { name: "Hardcore Porno TV Series", overview: "Sansürsüz ve açık porno sahneleri içeren TV yapımı.", posterPath: "/poster.jpg", firstAirDate: "2022-01-01", voteAverage: 5.5, voteCount: 80, adult: false };
    const resPorn = evaluateTvEligibility(pornKeywordShow, "CALIBRATION");
    assert(resPorn.isEligible === false, "Explicit pornographic keyword in TV show is rejected");

    const placeholderShow = { name: "Bilinmeyen Dizi", overview: "Dizi hakkında özet bilgi bulunmuyor.", posterPath: "/poster.jpg", firstAirDate: "2020-01-01", voteAverage: 7.0, voteCount: 100, adult: false };
    const resPlaceholder = evaluateTvEligibility(placeholderShow, "CALIBRATION");
    assert(resPlaceholder.isEligible === false, "Generic placeholder overview TV show is rejected");

    const eligibleShow = { name: "Dark", originalName: "Dark", overview: "Almanya'nın Winden kasabasında zaman yolculuğu gizemi.", posterPath: "/dark.jpg", firstAirDate: "2017-12-01", voteAverage: 8.5, voteCount: 6500, genres: ["Bilim Kurgu & Fantezi", "Dram", "Gizem"], adult: false };
    const resEligible = evaluateTvEligibility(eligibleShow, "CALIBRATION");
    assert(resEligible.isEligible === true, "High quality TV show with rich metadata is ELIGIBLE");

    console.log(`\nRESULTS: All ${passed} of ${total} TV foundation unit tests passed.`);
    return;
  }

  // Setup test user
  const testUser = await db.user.create({
    data: {
      email: `tv_test_${Date.now()}@filmprint.internal`,
      name: "TV Tester",
    },
  });

  // Setup test TV shows
  const testTvShow1 = await db.tvShow.create({
    data: {
      tmdbId: 99001,
      name: "Test Breaking Show",
      originalName: "Test Breaking Show",
      overview: "A chemistry teacher partners with an ex-student to cook and sell high purity crystal meth in New Mexico.",
      posterPath: "/test_poster_1.jpg",
      firstAirDate: "2008-01-20",
      popularity: 150.0,
      voteAverage: 8.9,
      voteCount: 5000,
      metadata: {
        genres: ["Dram", "Suç"],
        numberOfSeasons: 5,
        numberOfEpisodes: 62,
      },
    },
  });

  const testTvShow2 = await db.tvShow.create({
    data: {
      tmdbId: 99002,
      name: "Test SciFi Show",
      originalName: "Test SciFi Show",
      overview: "A complex mystery of time travel across four estranged families unraveling sinister secrets over three generations.",
      posterPath: "/test_poster_2.jpg",
      firstAirDate: "2017-12-01",
      popularity: 120.0,
      voteAverage: 8.7,
      voteCount: 4200,
      metadata: {
        genres: ["Bilim Kurgu & Fantezi", "Gizem"],
        numberOfSeasons: 3,
        numberOfEpisodes: 26,
      },
    },
  });

  try {
    // -------------------------------------------------------------
    // 1. TvShow Schema & Unique tmdbId Constraint
    // -------------------------------------------------------------
    const fetchedTvShow = await db.tvShow.findUnique({
      where: { tmdbId: 99001 },
    });
    assert(fetchedTvShow !== null, "TvShow successfully queried by unique tmdbId");
    assert(fetchedTvShow?.name === "Test Breaking Show", "TvShow name matches created record");

    // -------------------------------------------------------------
    // 2. TvShow Cache Upsert Idempotency
    // -------------------------------------------------------------
    const syncedShow = await tmdbTvClient.syncTvShowToDatabase({
      id: 99001,
      name: "Test Breaking Show (Updated)",
      original_name: "Test Breaking Show",
      overview: "Updated overview with rich details for testing cache-first idempotency.",
      poster_path: "/updated_poster_1.jpg",
      backdrop_path: "/backdrop_1.jpg",
      first_air_date: "2008-01-20",
      popularity: 160.0,
      vote_average: 9.0,
      vote_count: 5200,
      genre_ids: [18, 80],
      number_of_seasons: 5,
      number_of_episodes: 62,
    });

    const totalShowsWithTmdbId = await db.tvShow.count({
      where: { tmdbId: 99001 },
    });
    assert(totalShowsWithTmdbId === 1, "TvShow upsert ensures no duplicate rows for the same tmdbId");
    assert(syncedShow !== null, "Safe TV content passes the ingestion guard");
    assert(syncedShow?.name === "Test Breaking Show (Updated)", "TvShow fields successfully updated via upsert");

    // -------------------------------------------------------------
    // 3. Cache-First Resolution Verification
    // -------------------------------------------------------------
    const cacheResolved = await tmdbTvClient.getOrFetchTvShow(99001);
    assert(cacheResolved !== null, "Cache-first resolution returns local TvShow directly");
    assert(cacheResolved?.name === "Test Breaking Show (Updated)", "Cache-first returned expected cached metadata");

    // -------------------------------------------------------------
    // 4. TvInteraction: WATCHED, PARTIALLY_WATCHED, NOT_WATCHED & Rating Validation
    // -------------------------------------------------------------
    // A) WATCHED with Rating
    const watchedInteraction = await updateTvInteraction(
      testUser.id,
      testTvShow1.id,
      "WATCHED",
      "LOVE"
    );
    assert(
      watchedInteraction.status === "WATCHED" &&
        watchedInteraction.rating === "LOVE",
      "TvInteraction supports WATCHED status with RatingStatus.LOVE"
    );

    // B) PARTIALLY_WATCHED with Rating
    const partiallyWatchedInteraction = await updateTvInteraction(
      testUser.id,
      testTvShow2.id,
      "PARTIALLY_WATCHED",
      "LIKE"
    );
    assert(
      partiallyWatchedInteraction.status === "PARTIALLY_WATCHED" &&
        partiallyWatchedInteraction.rating === "LIKE",
      "TvInteraction supports PARTIALLY_WATCHED status with RatingStatus.LIKE"
    );

    // C) Transition to NOT_WATCHED (Rating should clear to null)
    const notWatchedInteraction = await updateTvInteraction(
      testUser.id,
      testTvShow2.id,
      "NOT_WATCHED",
      null
    );
    assert(
      notWatchedInteraction.status === "NOT_WATCHED" &&
        notWatchedInteraction.rating === null,
      "TvInteraction transitioning to NOT_WATCHED sets rating to null"
    );

    // D) Unique constraint on [userId, tvShowId]
    const userTvInteractionsCount = await db.tvInteraction.count({
      where: { userId: testUser.id, tvShowId: testTvShow2.id },
    });
    assert(
      userTvInteractionsCount === 1,
      "Unique composite key @@unique([userId, tvShowId]) ensures 1 row per user/show interaction"
    );

    // -------------------------------------------------------------
    // 5. TvRecommendationFeedback Semantics & State Transitions
    // -------------------------------------------------------------
    await db.tvRecommendationFeedback.upsert({
      where: {
        userId_tvShowId: { userId: testUser.id, tvShowId: testTvShow1.id },
      },
      update: { action: "WATCH_LATER", matchScore: 92 },
      create: {
        userId: testUser.id,
        tvShowId: testTvShow1.id,
        action: "WATCH_LATER",
        matchScore: 92,
      },
    });

    const createdFeedback = await db.tvRecommendationFeedback.findUnique({
      where: {
        userId_tvShowId: { userId: testUser.id, tvShowId: testTvShow1.id },
      },
    });
    assert(
      createdFeedback?.action === "WATCH_LATER" &&
        createdFeedback.matchScore === 92,
      "TvRecommendationFeedback creates and stores WATCH_LATER feedback record"
    );

    // Transition via updateTvInteraction (WATCHED converts WATCH_LATER to WATCHED_FROM_RECOMMENDATION)
    await updateTvInteraction(
      testUser.id,
      testTvShow1.id,
      "WATCHED",
      "LOVE"
    );
    const convertedFeedback = await db.tvRecommendationFeedback.findUnique({
      where: {
        userId_tvShowId: { userId: testUser.id, tvShowId: testTvShow1.id },
      },
    });
    assert(
      convertedFeedback?.action === "WATCHED_FROM_RECOMMENDATION",
      "Watched show automatically updates TV recommendation feedback to WATCHED_FROM_RECOMMENDATION"
    );

    // -------------------------------------------------------------
    // 6. UserTvTasteProfile Isolation
    // -------------------------------------------------------------
    const testTvProfile = await db.userTvTasteProfile.upsert({
      where: { userId: testUser.id },
      update: {
        version: 1,
        confidence: 0.85,
        sourceInteractionCount: 2,
        profileJson: {
          archetype: "Prestige Series Connoisseur",
          topTvGenres: ["Dram", "Suç", "Bilim Kurgu & Fantezi"],
        },
      },
      create: {
        userId: testUser.id,
        version: 1,
        confidence: 0.85,
        sourceInteractionCount: 2,
        profileJson: {
          archetype: "Prestige Series Connoisseur",
          topTvGenres: ["Dram", "Suç", "Bilim Kurgu & Fantezi"],
        },
      },
    });
    assert(testTvProfile !== null, "UserTvTasteProfile created independently");
    assert(
      testTvProfile.sourceInteractionCount === 2,
      "UserTvTasteProfile tracks TV-specific interaction counts"
    );

    // -------------------------------------------------------------
    // 7. Global TV Content Eligibility & Adult Filter Tests
    // -------------------------------------------------------------
    // A) Adult Flag Block
    const adultShow = {
      name: "Explicit Adult TV Series",
      overview: "Yetişkinlere özel erotik içerikler barındıran televizyon serisi.",
      posterPath: "/adult_poster.jpg",
      firstAirDate: "2021-01-01",
      voteAverage: 6.0,
      voteCount: 150,
      adult: true,
    };
    const resAdult = evaluateTvEligibility(adultShow, "CALIBRATION");
    assert(resAdult.isEligible === false, "TV show with adult=true is rejected");
    assert(resAdult.reason === "ADULT_FLAG", "Rejection reason is ADULT_FLAG");

    // B) Explicit Adult Keyword Block
    const pornKeywordShow = {
      name: "Hardcore Porno TV Series",
      overview: "Sansürsüz ve açık porno sahneleri içeren TV yapımı.",
      posterPath: "/poster.jpg",
      firstAirDate: "2022-01-01",
      voteAverage: 5.5,
      voteCount: 80,
      adult: false,
    };
    const resPorn = evaluateTvEligibility(pornKeywordShow, "CALIBRATION");
    assert(resPorn.isEligible === false, "Explicit pornographic keyword in TV show is rejected");
    assert(resPorn.reason === "EXPLICIT_ADULT_KEYWORD", "Rejection reason is EXPLICIT_ADULT_KEYWORD");

    // C) Generic Placeholder Overview Block
    const placeholderShow = {
      name: "Bilinmeyen Dizi",
      overview: "Dizi hakkında özet bilgi bulunmuyor.",
      posterPath: "/poster.jpg",
      firstAirDate: "2020-01-01",
      voteAverage: 7.0,
      voteCount: 100,
      adult: false,
    };
    const resPlaceholder = evaluateTvEligibility(placeholderShow, "CALIBRATION");
    assert(resPlaceholder.isEligible === false, "Generic placeholder overview TV show is rejected");
    assert(resPlaceholder.reason === "GENERIC_NO_OVERVIEW", "Rejection reason is GENERIC_NO_OVERVIEW");

    // D) Missing Poster Block
    const noPosterShow = {
      name: "Postersiz Dizi",
      overview: "Harika bir senaryoya sahip ancak afişi bulunmayan dizi.",
      posterPath: null,
      firstAirDate: "2020-01-01",
      voteAverage: 8.0,
      voteCount: 500,
      adult: false,
    };
    const resNoPoster = evaluateTvEligibility(noPosterShow, "CALIBRATION");
    assert(resNoPoster.isEligible === false, "TV show without poster is rejected");
    assert(resNoPoster.reason === "MISSING_POSTER", "Rejection reason is MISSING_POSTER");

    // E) High Quality Eligible TV Show
    const eligibleShow = {
      name: "Dark",
      originalName: "Dark",
      overview: "Almanya'nın Winden kasabasında çocukların kaybolmasıyla başlayan ve üç nesli etkileyen zaman yolculuğu gizemi.",
      posterPath: "/dark.jpg",
      firstAirDate: "2017-12-01",
      voteAverage: 8.5,
      voteCount: 6500,
      genres: ["Bilim Kurgu & Fantezi", "Dram", "Gizem"],
      adult: false,
    };
    const resEligible = evaluateTvEligibility(eligibleShow, "CALIBRATION");
    assert(resEligible.isEligible === true, "High quality TV show with rich metadata is ELIGIBLE");

    // -------------------------------------------------------------
    // 8. Zero Movie Regression Test (Shared User, Isolated Models)
    // -------------------------------------------------------------
    // Create a movie for the same user
    const testMovie = await db.movie.create({
      data: {
        tmdbId: 88991,
        title: "Test Movie Alongside TV",
        originalTitle: "Test Movie Alongside TV",
        releaseYear: 2021,
        popularity: 100.0,
        voteAverage: 8.0,
      },
    });

    const movieInteraction = await db.movieInteraction.create({
      data: {
        userId: testUser.id,
        movieId: testMovie.id,
        status: "WATCHED",
        rating: "LOVE",
      },
    });

    assert(
      movieInteraction !== null,
      "MovieInteraction created for the same user without collision"
    );

    // Verify user can query both Movie and TV interactions independently
    const userMovieInteractions = await db.movieInteraction.findMany({
      where: { userId: testUser.id },
    });
    const userTvInteractions = await db.tvInteraction.findMany({
      where: { userId: testUser.id },
    });

    assert(
      userMovieInteractions.length === 1,
      "User has exactly 1 MovieInteraction"
    );
    assert(
      userTvInteractions.length === 2,
      "User has exactly 2 TvInteractions completely isolated from Movie interactions"
    );

    // Clean up test movie
    await db.movieInteraction.deleteMany({ where: { userId: testUser.id } }).catch(() => {});
    await db.movie.delete({ where: { id: testMovie.id } }).catch(() => {});

    console.log(`\nRESULTS: All ${passed} of ${total} TV foundation tests passed.`);
  } finally {
    // Cleanup test user and test TV data
    await db.tvRecommendationFeedback.deleteMany({ where: { userId: testUser.id } }).catch(() => {});
    await db.userTvTasteProfile.deleteMany({ where: { userId: testUser.id } }).catch(() => {});
    await db.tvInteraction.deleteMany({ where: { userId: testUser.id } }).catch(() => {});
    await db.user.deleteMany({ where: { id: testUser.id } }).catch(() => {});
    await db.tvShow.deleteMany({ where: { id: { in: [testTvShow1.id, testTvShow2.id] } } }).catch(() => {});
  }
}
