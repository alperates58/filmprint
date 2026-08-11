import { rankCandidateMovies } from "@/lib/calibration/selector";
import { CandidateMovie, RecentInteractionPattern, UserTasteProfileInput } from "@/lib/calibration/types";

function makeCandidate(
  id: string,
  title: string,
  genres: string[],
  releaseYear: number,
  popularity = 80,
  voteAverage = 8.0
): CandidateMovie {
  return {
    id: `m-${id}`,
    tmdbId: 100 + parseInt(id, 10),
    title,
    originalTitle: title,
    releaseYear,
    popularity,
    voteAverage,
    posterPath: "/poster.jpg",
    backdropPath: "/backdrop.jpg",
    genres,
    overview: "Overview sample text",
  };
}

export function runCalibrationSelectorTests() {
  console.log("=== PHASE 3A CALIBRATION SELECTOR UNIT TESTS ===\n");
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

  // 1. Cold Start Diversity Test (Profile = null)
  const coldStartCandidates = [
    makeCandidate("1", "Obscure Horror", ["Korku"], 2015, 10, 5.0),
    makeCandidate("2", "Popular Drama", ["Dram"], 2018, 95, 8.5),
    makeCandidate("3", "Action Blockbuster", ["Aksiyon"], 2020, 90, 8.0),
  ];
  const coldStartResults = rankCandidateMovies(coldStartCandidates, null, []);
  assert(
    coldStartResults[0].movie.title === "Popular Drama",
    "Cold Start Diversity: High quality/popularity movie ranked highest during cold start"
  );

  // 2. Underexposed Genre Test
  const profileWithUncertainty: UserTasteProfileInput = {
    totalRatedCount: 15,
    genres: [
      { name: "Dram", score: 0.9, ratedCount: 12, exposureCount: 12 },
      { name: "Bilim Kurgu", score: 0.8, ratedCount: 10, exposureCount: 10 },
      { name: "Korku", score: 0.0, ratedCount: 0, exposureCount: 0 },
    ],
    eras: [],
  };

  const underexposedCandidates = [
    makeCandidate("10", "Dram Movie", ["Dram"], 2015, 70, 7.5),
    makeCandidate("11", "Korku Movie", ["Korku"], 2016, 70, 7.5),
  ];
  const underexposedResults = rankCandidateMovies(underexposedCandidates, profileWithUncertainty, []);
  assert(
    underexposedResults[0].movie.title === "Korku Movie",
    "Underexposed Genre: Candidate with 0-rated genre gets higher information gain score"
  );

  // 3. Repetition Penalty Test
  const recentHistory: RecentInteractionPattern[] = [
    { movieId: "r1", genres: ["Aksiyon", "Macera"], releaseYear: 2019 },
    { movieId: "r2", genres: ["Aksiyon"], releaseYear: 2020 },
  ];

  const repetitionCandidates = [
    makeCandidate("20", "Aksiyon Movie", ["Aksiyon"], 2021, 80, 7.5),
    makeCandidate("21", "Suç Movie", ["Suç"], 2015, 80, 7.5),
  ];

  const repetitionResults = rankCandidateMovies(repetitionCandidates, profileWithUncertainty, recentHistory);
  assert(
    repetitionResults[0].movie.title === "Suç Movie",
    "Repetition Penalty: Candidate matching recent history genres gets repetition penalty"
  );

  // 4. Strong Existing Signal Test
  const strongSignalProfile: UserTasteProfileInput = {
    totalRatedCount: 35,
    genres: [
      { name: "Bilim Kurgu", score: 0.95, ratedCount: 20, exposureCount: 20 },
      { name: "Korku", score: 0.0, ratedCount: 0, exposureCount: 0 },
    ],
    eras: [],
  };
  const signalCandidates = [
    makeCandidate("30", "SciFi Saturated", ["Bilim Kurgu"], 2015, 80, 8.0),
    makeCandidate("31", "Horror Underexposed", ["Korku"], 2015, 80, 8.0),
  ];
  const signalResults = rankCandidateMovies(signalCandidates, strongSignalProfile, []);
  assert(
    signalResults[0].movie.title === "Horror Underexposed",
    "Strong Existing Signal: Saturated genre gets lower priority than underexposed genre"
  );

  // 5. Multi Genre Information Gain Test
  const multiGenreProfile: UserTasteProfileInput = {
    totalRatedCount: 20,
    genres: [
      { name: "Dram", score: 0.9, ratedCount: 15, exposureCount: 15 },
      { name: "Korku", score: 0.0, ratedCount: 0, exposureCount: 0 },
      { name: "Western", score: 0.0, ratedCount: 0, exposureCount: 0 },
    ],
    eras: [],
  };

  const multiGenreCandidates = [
    makeCandidate("40", "Single Genre Horror", ["Korku"], 2015, 80, 7.5),
    makeCandidate("41", "Multi Genre Horror Western", ["Korku", "Western"], 2015, 80, 7.5),
  ];
  const multiGenreResults = rankCandidateMovies(multiGenreCandidates, multiGenreProfile, []);
  assert(
    multiGenreResults[0].movie.title === "Multi Genre Horror Western",
    "Multi Genre Information Gain: Movie touching 2 underexposed genres scores highest"
  );

  // 6. Determinism Test
  const detResults1 = rankCandidateMovies(multiGenreCandidates, multiGenreProfile, []);
  const detResults2 = rankCandidateMovies(multiGenreCandidates, multiGenreProfile, []);
  assert(
    JSON.stringify(detResults1.map((r) => r.movie.id)) === JSON.stringify(detResults2.map((r) => r.movie.id)),
    "Determinism: Same candidate pool + profile produces identical ranking"
  );

  // 7. Fallback Test (Null Profile)
  const fallbackResults = rankCandidateMovies(multiGenreCandidates, null, []);
  assert(
    fallbackResults.length === 2,
    "Fallback: Null profile executes safely without error"
  );

  console.log(`\nRESULTS: Passed ${passed} of ${total} tests.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runCalibrationSelectorTests();
