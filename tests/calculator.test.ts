import { calculateFilmDna } from "@/lib/profile/calculator";
import { RawInteractionData } from "@/lib/profile/types";

function makeInteraction(
  id: string,
  status: "WATCHED" | "NOT_WATCHED" | "UNSURE",
  rating: "LOVE" | "LIKE" | "NEUTRAL" | "DISLIKE" | null,
  releaseYear: number,
  genres: string[],
  popularity = 50
): RawInteractionData {
  return {
    id,
    status,
    rating,
    answeredAt: new Date(),
    movie: {
      id: `movie-${id}`,
      tmdbId: 1000 + parseInt(id, 10),
      title: `Test Movie ${id}`,
      originalTitle: `Test Movie ${id}`,
      releaseYear,
      popularity,
      voteAverage: 8.0,
      metadata: { genres, overview: "Overview text" },
    },
  };
}

export function runCalculatorTests() {
  console.log("=== PHASE 2 FILM DNA CALCULATOR UNIT TESTS ===\n");
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

  // 1. Sci-Fi Lover Scenario
  const sciFiInteractions = [
    makeInteraction("1", "WATCHED", "LOVE", 2014, ["Bilim Kurgu", "Macera"]),
    makeInteraction("2", "WATCHED", "LOVE", 2010, ["Bilim Kurgu", "Aksiyon"]),
    makeInteraction("3", "WATCHED", "LOVE", 1999, ["Bilim Kurgu"]),
    makeInteraction("4", "WATCHED", "LIKE", 2018, ["Dram"]),
  ];
  const sciFiResult = calculateFilmDna(sciFiInteractions);
  assert(
    sciFiResult.genres[0].name === "Bilim Kurgu",
    "Sci-Fi Lover: Top genre is Bilim Kurgu"
  );
  assert(
    sciFiResult.traits.some((t) => t.includes("Bilim Kurgu")),
    "Sci-Fi Lover: Archetype trait contains Bilim Kurgu"
  );

  // 2. Genre Dislike Scenario
  const dislikeInteractions = [
    makeInteraction("1", "WATCHED", "DISLIKE", 2020, ["Korku"]),
    makeInteraction("2", "WATCHED", "DISLIKE", 2019, ["Korku"]),
    makeInteraction("3", "WATCHED", "LOVE", 2015, ["Dram"]),
    makeInteraction("4", "WATCHED", "LOVE", 2018, ["Dram"]),
  ];
  const dislikeResult = calculateFilmDna(dislikeInteractions);
  const horrorGenre = dislikeResult.genres.find((g) => g.name === "Korku");
  const dramaGenre = dislikeResult.genres.find((g) => g.name === "Dram");
  assert(
    Boolean(dramaGenre && horrorGenre && dramaGenre.score > horrorGenre.score),
    "Genre Dislike: Drama score is higher than disliked Horror score"
  );

  // 3. Balanced Taste Scenario
  const balancedInteractions = [
    makeInteraction("1", "WATCHED", "LIKE", 2020, ["Aksiyon"]),
    makeInteraction("2", "WATCHED", "LIKE", 2019, ["Komedi"]),
    makeInteraction("3", "WATCHED", "LIKE", 2018, ["Dram"]),
  ];
  const balancedResult = calculateFilmDna(balancedInteractions);
  assert(
    balancedResult.genres.length >= 3 && Math.abs(balancedResult.genres[0].score - balancedResult.genres[1].score) < 0.2,
    "Balanced Taste: Top genre scores are close and balanced"
  );

  // 4. Era Bias Scenario (Modern 2010s/2020s)
  const modernEraInteractions = [
    makeInteraction("1", "WATCHED", "LOVE", 2021, ["Aksiyon"]),
    makeInteraction("2", "WATCHED", "LOVE", 2018, ["Dram"]),
    makeInteraction("3", "WATCHED", "LOVE", 2015, ["Suç"]),
    makeInteraction("4", "WATCHED", "LIKE", 1975, ["Komedi"]),
  ];
  const eraResult = calculateFilmDna(modernEraInteractions);
  assert(
    eraResult.eras[0].key === "2010s" || eraResult.eras[0].key === "2020s",
    "Era Bias: Top era is 2010s or 2020s Modern Cinema"
  );

  // 5. Insufficient Data Confidence Scenario (5 ratings)
  const lowDataInteractions = Array.from({ length: 5 }, (_, i) =>
    makeInteraction(`${i}`, "WATCHED", "LOVE", 2015, ["Dram"])
  );
  const lowDataResult = calculateFilmDna(lowDataInteractions);
  assert(
    lowDataResult.confidence < 0.35,
    `Insufficient Data: Confidence is low (${lowDataResult.confidence})`
  );

  // 6. High Data Confidence Scenario (65 ratings)
  const highDataInteractions = Array.from({ length: 65 }, (_, i) =>
    makeInteraction(`${i}`, "WATCHED", "LOVE", 2015, ["Dram"])
  );
  const highDataResult = calculateFilmDna(highDataInteractions);
  assert(
    highDataResult.confidence >= 0.85,
    `More Data: Confidence is high (${highDataResult.confidence})`
  );

  console.log(`\nRESULTS: Passed ${passed} of ${total} tests.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runCalculatorTests();
