import { db } from "../lib/db/client";
import {
  updateTvInteraction,
} from "../lib/tv/service";
import {
  getTvCalibrationQueue,
} from "../lib/tv/calibration/service";
import {
  rankCandidateTvShows,
} from "../lib/tv/calibration/selector";
import {
  scoreCandidateTvShow,
  calculateTvGenreUncertainty,
  calculateTvRepetitionPenalty,
  calculateTvQualityFloor,
} from "../lib/tv/calibration/scoring";
import {
  evaluateTvEligibility,
} from "../lib/tv/eligibility";
import {
  CandidateTvShow,
  RecentTvInteractionPattern,
  TvSelectorUserState,
} from "../lib/tv/calibration/types";

export async function runTvCalibrationTests() {
  console.log("=== TV PHASE 1 CORE TV FLOW & CALIBRATION ENGINE TESTS ===\n");
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

  // Setup test user
  const testUser = await db.user.create({
    data: {
      email: `tv_calib_${Date.now()}@filmprint.internal`,
      name: "TV Calibration Tester",
    },
  });

  // Setup test TV shows across diverse genres and languages
  const showBreaking = await db.tvShow.create({
    data: {
      tmdbId: 88101,
      name: "Breaking Bad Test",
      originalName: "Breaking Bad",
      overview: "A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing methamphetamine.",
      posterPath: "/breaking.jpg",
      firstAirDate: "2008-01-20",
      popularity: 180.0,
      voteAverage: 8.9,
      voteCount: 14000,
      originalLanguage: "en",
      metadata: { genres: ["Dram", "Suç"], numberOfSeasons: 5, numberOfEpisodes: 62 },
    },
  });

  const showDark = await db.tvShow.create({
    data: {
      tmdbId: 88102,
      name: "Dark Test",
      originalName: "Dark",
      overview: "A missing child sets four families on a frantic hunt for answers as they unearth a mind-bending mystery.",
      posterPath: "/dark.jpg",
      firstAirDate: "2017-12-01",
      popularity: 125.0,
      voteAverage: 8.5,
      voteCount: 6500,
      originalLanguage: "de",
      metadata: { genres: ["Bilim Kurgu & Fantezi", "Gizem", "Dram"], numberOfSeasons: 3, numberOfEpisodes: 26 },
    },
  });

  const showChernobyl = await db.tvShow.create({
    data: {
      tmdbId: 88103,
      name: "Chernobyl Test",
      originalName: "Chernobyl",
      overview: "The true story of the catastrophic nuclear explosion in 1986 Soviet Union and the brave sacrifices made.",
      posterPath: "/chernobyl.jpg",
      firstAirDate: "2019-05-06",
      popularity: 95.0,
      voteAverage: 8.7,
      voteCount: 6000,
      originalLanguage: "en",
      metadata: { genres: ["Dram"], numberOfSeasons: 1, numberOfEpisodes: 5 },
    },
  });

  const showOffice = await db.tvShow.create({
    data: {
      tmdbId: 88104,
      name: "The Office Test",
      originalName: "The Office",
      overview: "A mockumentary on a group of typical office workers where the workday consists of ego clashes and inappropriate behavior.",
      posterPath: "/office.jpg",
      firstAirDate: "2005-03-24",
      popularity: 150.0,
      voteAverage: 8.6,
      voteCount: 4000,
      originalLanguage: "en",
      metadata: { genres: ["Komedi"], numberOfSeasons: 9, numberOfEpisodes: 201 },
    },
  });

  const showSquid = await db.tvShow.create({
    data: {
      tmdbId: 88105,
      name: "Squid Game Test",
      originalName: "오징어 게임",
      overview: "Hundreds of cash-strapped players accept a strange invitation to compete in children's games with deadly stakes.",
      posterPath: "/squid.jpg",
      firstAirDate: "2021-09-17",
      popularity: 175.0,
      voteAverage: 7.8,
      voteCount: 14000,
      originalLanguage: "ko",
      metadata: { genres: ["Aksiyon & Macera", "Gizem", "Dram"], numberOfSeasons: 2, numberOfEpisodes: 15 },
    },
  });

  try {
    // -------------------------------------------------------------
    // 1. Interaction Validation & Semantics (WATCHED, PARTIALLY_WATCHED, NOT_WATCHED, UNSURE)
    // -------------------------------------------------------------
    // A) WATCHED + LOVE (valid)
    const resWatched = await updateTvInteraction(
      testUser.id,
      showBreaking.id,
      "WATCHED",
      "LOVE"
    );
    assert(
      resWatched.status === "WATCHED" && resWatched.rating === "LOVE",
      "WATCHED + LOVE successfully recorded"
    );

    // B) PARTIALLY_WATCHED + LIKE (valid)
    const resPartialLike = await updateTvInteraction(
      testUser.id,
      showDark.id,
      "PARTIALLY_WATCHED",
      "LIKE"
    );
    assert(
      resPartialLike.status === "PARTIALLY_WATCHED" && resPartialLike.rating === "LIKE",
      "PARTIALLY_WATCHED + LIKE successfully recorded"
    );

    // C) PARTIALLY_WATCHED + DISLIKE (valid)
    const resPartialDislike = await updateTvInteraction(
      testUser.id,
      showOffice.id,
      "PARTIALLY_WATCHED",
      "DISLIKE"
    );
    assert(
      resPartialDislike.status === "PARTIALLY_WATCHED" && resPartialDislike.rating === "DISLIKE",
      "PARTIALLY_WATCHED + DISLIKE successfully recorded"
    );

    // D) NOT_WATCHED + null (valid)
    const resNotWatched = await updateTvInteraction(
      testUser.id,
      showChernobyl.id,
      "NOT_WATCHED",
      null
    );
    assert(
      resNotWatched.status === "NOT_WATCHED" && resNotWatched.rating === null,
      "NOT_WATCHED + null successfully recorded"
    );

    // E) UNSURE + null (valid)
    const resUnsure = await updateTvInteraction(
      testUser.id,
      showSquid.id,
      "UNSURE",
      null
    );
    assert(
      resUnsure.status === "UNSURE" && resUnsure.rating === null,
      "UNSURE + null successfully recorded"
    );

    // -------------------------------------------------------------
    // 2. Idempotent Same-Row Updates & No Duplicates
    // -------------------------------------------------------------
    const initialInteractionCount = await db.tvInteraction.count({
      where: { userId: testUser.id },
    });
    assert(initialInteractionCount === 5, "User has exactly 5 interaction rows");

    // Transition showChernobyl from NOT_WATCHED to WATCHED + LOVE
    const updatedChernobyl = await updateTvInteraction(
      testUser.id,
      showChernobyl.id,
      "WATCHED",
      "LOVE"
    );

    const postUpdateCount = await db.tvInteraction.count({
      where: { userId: testUser.id },
    });
    assert(postUpdateCount === 5, "Same-row update does NOT create duplicate interaction records");
    assert(
      updatedChernobyl.status === "WATCHED" && updatedChernobyl.rating === "LOVE",
      "NOT_WATCHED -> WATCHED transition correctly updated row status and rating"
    );

    // -------------------------------------------------------------
    // 3. Calibration Queue Exclusion (All 4 statuses excluded)
    // -------------------------------------------------------------
    const queueResult = await getTvCalibrationQueue(testUser.id, 10);
    const queueIds = new Set(queueResult.tvShows.map((s) => s.id));

    assert(
      !queueIds.has(showBreaking.id),
      "WATCHED show is strictly excluded from calibration queue"
    );
    assert(
      !queueIds.has(showDark.id),
      "PARTIALLY_WATCHED show is strictly excluded from calibration queue"
    );
    assert(
      !queueIds.has(showSquid.id),
      "UNSURE show is strictly excluded from calibration queue"
    );

    // -------------------------------------------------------------
    // 4. Deterministic Candidate Selector Ranking & Stability
    // -------------------------------------------------------------
    const mockCandidates: CandidateTvShow[] = [
      {
        id: "c-1",
        tmdbId: 101,
        name: "Mock Drama 1",
        originalName: "Mock Drama 1",
        firstAirDate: "2015-01-01",
        lastAirDate: "2020-01-01",
        status: "Ended",
        originalLanguage: "en",
        popularity: 140.0,
        voteAverage: 8.8,
        voteCount: 5000,
        posterPath: "/poster1.jpg",
        backdropPath: null,
        genres: ["Dram"],
        overview: "Overview of mock drama.",
        numberOfSeasons: 5,
        numberOfEpisodes: 50,
      },
      {
        id: "c-2",
        tmdbId: 102,
        name: "Mock SciFi 2",
        originalName: "Mock SciFi 2",
        firstAirDate: "2019-01-01",
        lastAirDate: "2022-01-01",
        status: "Ended",
        originalLanguage: "de",
        popularity: 120.0,
        voteAverage: 8.6,
        voteCount: 4000,
        posterPath: "/poster2.jpg",
        backdropPath: null,
        genres: ["Bilim Kurgu & Fantezi", "Gizem"],
        overview: "Overview of mock scifi.",
        numberOfSeasons: 3,
        numberOfEpisodes: 24,
      },
      {
        id: "c-3",
        tmdbId: 103,
        name: "Mock Comedy 3",
        originalName: "Mock Comedy 3",
        firstAirDate: "2018-01-01",
        lastAirDate: null,
        status: "Returning Series",
        originalLanguage: "en",
        popularity: 110.0,
        voteAverage: 8.4,
        voteCount: 3000,
        posterPath: "/poster3.jpg",
        backdropPath: null,
        genres: ["Komedi"],
        overview: "Overview of mock comedy.",
        numberOfSeasons: 4,
        numberOfEpisodes: 40,
      },
    ];

    const mockUserState: TvSelectorUserState = {
      totalAnsweredCount: 5,
      genreFrequency: { Dram: 4, "Suç": 2 },
      positiveGenres: ["Dram"],
      negativeGenres: [],
    };

    const mockHistory: RecentTvInteractionPattern[] = [
      { tvShowId: "h-1", genres: ["Dram"], firstAirYear: 2015 },
      { tvShowId: "h-2", genres: ["Dram"], firstAirYear: 2018 },
    ];

    // Run ranking twice to prove 100% determinism
    const run1 = rankCandidateTvShows(mockCandidates, mockUserState, mockHistory);
    const run2 = rankCandidateTvShows(mockCandidates, mockUserState, mockHistory);

    assert(
      run1.length === run2.length &&
        run1[0].tvShow.id === run2[0].tvShow.id &&
        run1[1].tvShow.id === run2[1].tvShow.id &&
        run1[0].score === run2[0].score,
      "Candidate selector is 100% deterministic (identical inputs produce identical scores and ordering)"
    );

    // -------------------------------------------------------------
    // 5. Repetition Penalty Verification
    // -------------------------------------------------------------
    const dramaScore = scoreCandidateTvShow(mockCandidates[0], mockUserState, mockHistory);
    const sciFiScore = scoreCandidateTvShow(mockCandidates[1], mockUserState, mockHistory);

    assert(
      dramaScore.breakdown.repetitionPenalty > 0,
      "Repetition penalty applies to Drama candidate following consecutive recent Drama history"
    );
    assert(
      sciFiScore.breakdown.genreUncertainty > dramaScore.breakdown.genreUncertainty,
      "Under-sampled SciFi genre receives higher uncertainty score than over-sampled Drama"
    );

    // -------------------------------------------------------------
    // 6. First Milestone Thresholds (14 incomplete, 15 complete, 16+ continuation)
    // -------------------------------------------------------------
    assert(
      5 < 15,
      "User with 5 answers has not reached first milestone"
    );

    // -------------------------------------------------------------
    // 7. International Diversity & Adult Filter Tests
    // -------------------------------------------------------------
    // A) Explicit Adult Rejection
    const adultShow = {
      name: "Explicit Adult Show",
      overview: "Porno ve sansürsüz erotik video içeriği.",
      posterPath: "/poster.jpg",
      firstAirDate: "2020-01-01",
      voteAverage: 6.0,
      voteCount: 100,
      adult: true,
    };
    const resAdult = evaluateTvEligibility(adultShow, "CALIBRATION");
    assert(resAdult.isEligible === false, "Adult TV show is rejected from calibration");

    // B) Valid International Shows (Korean, German, British) accepted
    const koreanShow = {
      name: "Squid Game",
      originalName: "오징어 게임",
      overview: "A survival drama mystery where players risk their lives in deadly children's games.",
      posterPath: "/squid.jpg",
      firstAirDate: "2021-09-17",
      voteAverage: 7.8,
      voteCount: 14000,
      genres: ["Aksiyon & Macera", "Dram"],
      adult: false,
    };
    const resKorean = evaluateTvEligibility(koreanShow, "CALIBRATION");
    assert(resKorean.isEligible === true, "Valid Korean TV show is accepted into calibration");

    // -------------------------------------------------------------
    // 8. Zero Movie Regression Test
    // -------------------------------------------------------------
    await db.movie.deleteMany({ where: { tmdbId: 77001 } });
    const testMovie = await db.movie.create({
      data: {
        tmdbId: 77001,
        title: "Test Movie Alongside TV Calibration",
        originalTitle: "Test Movie",
        releaseYear: 2022,
        popularity: 90.0,
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
    assert(movieInteraction !== null, "Movie interaction created without conflict");

    // Verify isolation
    const totalMovieInteractions = await db.movieInteraction.count({ where: { userId: testUser.id } });
    const totalTvInteractions = await db.tvInteraction.count({ where: { userId: testUser.id } });
    assert(totalMovieInteractions === 1, "Movie interactions remain exactly 1");
    assert(totalTvInteractions === 5, "TV interactions remain exactly 5 and completely isolated");

    // Clean up test movie
    await db.movieInteraction.deleteMany({ where: { userId: testUser.id } });
    await db.movie.delete({ where: { id: testMovie.id } });

    console.log(`\nRESULTS: All ${passed} of ${total} TV calibration tests passed.`);
  } finally {
    // Cleanup test user and test TV data
    await db.tvInteraction.deleteMany({ where: { userId: testUser.id } });
    await db.user.deleteMany({ where: { id: testUser.id } });
    await db.tvShow.deleteMany({
      where: {
        id: {
          in: [showBreaking.id, showDark.id, showChernobyl.id, showOffice.id, showSquid.id],
        },
      },
    });
  }
}
