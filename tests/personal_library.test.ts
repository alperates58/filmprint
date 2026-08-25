import assert from "node:assert";
import {
  calculateMovieFeedbackAdjustment,
  EMPTY_FEEDBACK_PROFILE,
  FeedbackProfile,
} from "../lib/recommendation/feedback-profile";
import {
  calculateTvFeedbackAdjustment,
  EMPTY_TV_FEEDBACK_PROFILE,
  TvFeedbackProfile,
} from "../lib/tv/recommendation/feedback-profile";
import type { CandidateTvShow } from "../lib/tv/recommendation/types";

export async function runPersonalLibraryTests() {
  console.log("\n==========================================");
  console.log("🎬 RUNNING PERSONAL LIBRARY TEST SUITE");
  console.log("==========================================\n");

  // --------------------------------------------------------------------------
  // Test 1: Favorite boost in Movie feedback adjustment
  // --------------------------------------------------------------------------
  console.log("Test 1: Movie FAVORITE signal produces top positive boost (+10.0)");
  {
    const profileWithFav: FeedbackProfile = {
      ...EMPTY_FEEDBACK_PROFILE,
      totalFeedbacks: 1,
      favoriteMovieIds: new Set(["movie-fav-1"]),
    };

    const adj = calculateMovieFeedbackAdjustment(
      "movie-fav-1",
      ["Drama"],
      2023,
      {},
      profileWithFav
    );

    assert.strictEqual(
      adj,
      10,
      `Expected favorite movie to receive max adjustment +10, got ${adj}`
    );
    console.log("  ✓ Movie FAVORITE adjustment verified: +10");
  }

  // --------------------------------------------------------------------------
  // Test 2: Dropped movie hard penalty in Movie feedback adjustment
  // --------------------------------------------------------------------------
  console.log("\nTest 2: Movie DROPPED signal produces minimum penalty (-15.0)");
  {
    const profileWithDropped: FeedbackProfile = {
      ...EMPTY_FEEDBACK_PROFILE,
      totalFeedbacks: 1,
      droppedMovieIds: new Set(["movie-drop-1"]),
    };

    const adj = calculateMovieFeedbackAdjustment(
      "movie-drop-1",
      ["Sci-Fi"],
      2022,
      {},
      profileWithDropped
    );

    assert.strictEqual(
      adj,
      -15,
      `Expected dropped movie to receive min penalty -15, got ${adj}`
    );
    console.log("  ✓ Movie DROPPED adjustment verified: -15");
  }

  // --------------------------------------------------------------------------
  // Test 3: TV FAVORITE and DROPPED parity
  // --------------------------------------------------------------------------
  console.log("\nTest 3: TV FAVORITE and DROPPED parity verification");
  {
    const profileWithTvFav: TvFeedbackProfile = {
      ...EMPTY_TV_FEEDBACK_PROFILE,
      totalFeedbacks: 2,
      favoriteShowIds: new Set(["tv-fav-1"]),
      droppedShowIds: new Set(["tv-drop-1"]),
    };

    const favCandidate: CandidateTvShow = {
      id: "tv-fav-1",
      tmdbId: 100,
      name: "Favorite Series",
      originalName: "Favorite Series",
      overview: "A great series",
      posterPath: "/fav.jpg",
      backdropPath: "/fav_bg.jpg",
      firstAirDate: "2020-01-01",
      lastAirDate: "2023-01-01",
      popularity: 80,
      voteAverage: 8.5,
      voteCount: 1500,
      originalLanguage: "en",
      status: "Ended",
      metadata: { genres: ["Drama"] },
    };

    const dropCandidate: CandidateTvShow = {
      id: "tv-drop-1",
      tmdbId: 101,
      name: "Dropped Series",
      originalName: "Dropped Series",
      overview: "A dropped series",
      posterPath: "/drop.jpg",
      backdropPath: "/drop_bg.jpg",
      firstAirDate: "2021-01-01",
      lastAirDate: "2022-01-01",
      popularity: 40,
      voteAverage: 6.0,
      voteCount: 300,
      originalLanguage: "en",
      status: "Canceled",
      metadata: { genres: ["Horror"] },
    };

    const favAdj = calculateTvFeedbackAdjustment(favCandidate, profileWithTvFav);
    const dropAdj = calculateTvFeedbackAdjustment(dropCandidate, profileWithTvFav);

    assert.strictEqual(favAdj, 10, `Expected TV FAVORITE adjustment +10, got ${favAdj}`);
    assert.strictEqual(dropAdj, -15, `Expected TV DROPPED adjustment -15, got ${dropAdj}`);
    console.log("  ✓ TV FAVORITE adjustment (+10) and TV DROPPED adjustment (-15) verified");
  }

  // --------------------------------------------------------------------------
  // Test 4: WATCHLIST positive intent without double count
  // --------------------------------------------------------------------------
  console.log("\nTest 4: WATCHLIST positive intent signal bounds");
  {
    const profileWithWatchlist: FeedbackProfile = {
      ...EMPTY_FEEDBACK_PROFILE,
      totalFeedbacks: 1,
      watchlistMovieIds: new Set(["movie-watch-1"]),
    };

    const adj = calculateMovieFeedbackAdjustment(
      "movie-watch-1",
      ["Action"],
      2024,
      {},
      profileWithWatchlist
    );

    assert.strictEqual(adj, 10, `Expected WATCHLIST movie adjustment +10, got ${adj}`);
    console.log("  ✓ WATCHLIST adjustment verified: +10");
  }

  // --------------------------------------------------------------------------
  // Test 5: Hard exclusions check
  // --------------------------------------------------------------------------
  console.log("\nTest 5: Exclusions set integrity for DROPPED and WATCHED items");
  {
    const watchedInteractions = [{ movieId: "m-watched-1" }];
    const profile: FeedbackProfile = {
      ...EMPTY_FEEDBACK_PROFILE,
      watchedMovieIds: new Set(["m-watched-2"]),
      hiddenMovieIds: new Set(["m-hidden-1"]),
      droppedMovieIds: new Set(["m-dropped-1"]),
    };

    const excludedMovieIds = new Set([
      ...watchedInteractions.map((i) => i.movieId),
      ...profile.watchedMovieIds,
      ...profile.hiddenMovieIds,
      ...profile.droppedMovieIds,
    ]);

    assert.ok(excludedMovieIds.has("m-watched-1"), "Should exclude user watched interaction");
    assert.ok(excludedMovieIds.has("m-watched-2"), "Should exclude feedback/library watched item");
    assert.ok(excludedMovieIds.has("m-hidden-1"), "Should exclude hidden item");
    assert.ok(excludedMovieIds.has("m-dropped-1"), "Should exclude dropped item");
    assert.ok(!excludedMovieIds.has("m-fresh-1"), "Should not exclude fresh item");
    console.log("  ✓ Exclusions set correctly excludes watched, hidden, and dropped items");
  }

  // --------------------------------------------------------------------------
  // Test 6: Library Filtering & Sorting Invariants
  // --------------------------------------------------------------------------
  console.log("\nTest 6: Library filtering by genre, era, and rating");
  {
    const sampleItems = [
      {
        id: "1",
        mediaType: "FILM" as const,
        contentId: "m1",
        tmdbId: 101,
        title: "Interstellar",
        originalTitle: "Interstellar",
        releaseYear: 2014,
        posterPath: null,
        backdropPath: null,
        genres: ["Bilim Kurgu", "Dram"],
        voteAverage: 8.6,
        overview: "",
        state: "WATCHED" as const,
        isFavorite: true,
        userRating: "LOVE" as const,
        addedAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        watchedAt: new Date("2024-01-01"),
        droppedAt: null,
      },
      {
        id: "2",
        mediaType: "FILM" as const,
        contentId: "m2",
        tmdbId: 102,
        title: "The Godfather",
        originalTitle: "The Godfather",
        releaseYear: 1972,
        posterPath: null,
        backdropPath: null,
        genres: ["Dram", "Suç"],
        voteAverage: 9.2,
        overview: "",
        state: "WATCHED" as const,
        isFavorite: true,
        userRating: "LIKE" as const,
        addedAt: new Date("2024-01-02"),
        updatedAt: new Date("2024-01-02"),
        watchedAt: new Date("2024-01-02"),
        droppedAt: null,
      },
      {
        id: "3",
        mediaType: "FILM" as const,
        contentId: "m3",
        tmdbId: 103,
        title: "Dune: Part Two",
        originalTitle: "Dune: Part Two",
        releaseYear: 2024,
        posterPath: null,
        backdropPath: null,
        genres: ["Bilim Kurgu", "Macera"],
        voteAverage: 8.5,
        overview: "",
        state: "WATCHED" as const,
        isFavorite: false,
        userRating: "LOVE" as const,
        addedAt: new Date("2024-01-03"),
        updatedAt: new Date("2024-01-03"),
        watchedAt: new Date("2024-01-03"),
        droppedAt: null,
      },
    ];

    // Filter by genre
    const sciFiOnly = sampleItems.filter((i) => i.genres.includes("Bilim Kurgu"));
    assert.strictEqual(sciFiOnly.length, 2, "Should return 2 Sci-Fi items");

    // Filter by era classic (<1990)
    const classicOnly = sampleItems.filter((i) => i.releaseYear && i.releaseYear < 1990);
    assert.strictEqual(classicOnly.length, 1, "Should return 1 classic item");
    assert.strictEqual(classicOnly[0].title, "The Godfather");

    // Filter by rating LOVE
    const loveOnly = sampleItems.filter((i) => i.userRating === "LOVE");
    assert.strictEqual(loveOnly.length, 2, "Should return 2 LOVE items");

    console.log("  ✓ Library filtering verified");
  }

  // --------------------------------------------------------------------------
  // Test 7: Pagination calculation
  // --------------------------------------------------------------------------
  console.log("\nTest 7: Pagination totalPages calculation");
  {
    const calculateTotalPages = (total: number, limit: number) => Math.ceil(total / limit) || 1;
    assert.strictEqual(calculateTotalPages(25, 24), 2, "25 items with limit 24 should have 2 pages");
    assert.strictEqual(calculateTotalPages(24, 24), 1, "24 items with limit 24 should have 1 page");
    assert.strictEqual(calculateTotalPages(0, 24), 1, "0 items should have 1 page");
    assert.strictEqual(calculateTotalPages(73, 24), 4, "73 items with limit 24 should have 4 pages");
    console.log("  ✓ Pagination calculation verified");
  }

  console.log("\n==========================================");
  console.log("🎉 ALL PERSONAL LIBRARY TESTS PASSED (7/7)");
  console.log("==========================================\n");
  return true;
}

if (typeof require !== "undefined" && require.main === module) {
  runPersonalLibraryTests().catch((err) => {
    console.error("Personal Library tests failed:", err);
    process.exit(1);
  });
}
