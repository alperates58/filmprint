import { calculateFilmDna } from "../lib/profile/calculator";
import type { RawInteractionData } from "../lib/profile/types";

function makeRawInteraction(
  id: string,
  status: "WATCHED" | "NOT_WATCHED" | "UNSURE",
  rating: "LOVE" | "LIKE" | "NEUTRAL" | "DISLIKE" | null,
  genres: string[],
  releaseYear: number = 2020
): RawInteractionData {
  return {
    id,
    status,
    rating,
    answeredAt: new Date(),
    movie: {
      id: `movie-${id}`,
      tmdbId: 2000 + parseInt(id.replace(/\D/g, "") || "1", 10),
      title: `Test Movie ${id}`,
      originalTitle: `Test Movie ${id}`,
      releaseYear,
      popularity: 60,
      voteAverage: 8.0,
      metadata: { genres, overview: "Test overview" },
    },
  };
}

export function runFilmDnaStaleRegressionTests() {
  console.log("=== REGRESSION TEST: FILM DNA RECALCULATION UPON STATUS CHANGE ===");
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, message: string) {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total}: ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${message}`);
    }
  }

  // 1. Initial State: Movie 1 is NOT_WATCHED, Movie 2 is WATCHED + LOVE (Dram)
  const initialInteractions: RawInteractionData[] = [
    makeRawInteraction("1", "NOT_WATCHED", null, ["Bilim Kurgu"]),
    makeRawInteraction("2", "WATCHED", "LOVE", ["Dram"]),
  ];

  const profileBefore = calculateFilmDna(initialInteractions);
  const sciFiBefore = profileBefore.genres.find((g) => g.name === "Bilim Kurgu");
  const dramBefore = profileBefore.genres.find((g) => g.name === "Dram");

  assert(
    dramBefore !== undefined && dramBefore.ratedCount === 1,
    "Before transition: Dram has 1 rated interaction"
  );
  assert(
    sciFiBefore === undefined || sciFiBefore.ratedCount === 0,
    "Before transition: Bilim Kurgu has 0 rated interactions"
  );

  // 2. Status Transition: Movie 1 transitions NOT_WATCHED -> WATCHED + LOVE (Bilim Kurgu)
  // Interaction count stays 2, but status and rating changed.
  const updatedInteractions: RawInteractionData[] = [
    makeRawInteraction("1", "WATCHED", "LOVE", ["Bilim Kurgu"]),
    makeRawInteraction("2", "WATCHED", "LOVE", ["Dram"]),
  ];

  const profileAfter = calculateFilmDna(updatedInteractions);
  const sciFiAfter = profileAfter.genres.find((g) => g.name === "Bilim Kurgu");

  assert(
    sciFiAfter !== undefined && sciFiAfter.ratedCount === 1 && sciFiAfter.score > 0.4,
    "After transition: Bilim Kurgu is recalculated and score increases despite total interaction count staying 2"
  );

  assert(
    profileAfter.sample.ratedMovies === 2,
    "After transition: Rated movies sample count updated from 1 to 2"
  );

  console.log(`\nRESULTS: Passed ${passed} of ${total} tests.\n`);
  if (passed !== total) {
    process.exit(1);
  }
}

runFilmDnaStaleRegressionTests();
