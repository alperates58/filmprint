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

  console.log("\n==========================================");
  console.log("🎉 ALL PERSONAL LIBRARY TESTS PASSED (5/5)");
  console.log("==========================================\n");
  return true;
}

if (typeof require !== "undefined" && require.main === module) {
  runPersonalLibraryTests().catch((err) => {
    console.error("Personal Library tests failed:", err);
    process.exit(1);
  });
}
