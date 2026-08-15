import { calculateGroupMatch, MemberMatchInput } from "@/lib/movie-night/matcher";
import { CandidateMovie } from "@/lib/calibration/types";
import { MovieMatchResult } from "@/lib/recommendation/types";

export function runGroupMatcherTests() {
  console.log("=== PHASE 4 GROUP MATCHER ENGINE UNIT TESTS ===\n");
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

  const dummyMovie: CandidateMovie = {
    id: "m-group-1",
    tmdbId: 9001,
    title: "Group Candidate Movie",
    originalTitle: "Group Candidate Movie",
    releaseYear: 2023,
    popularity: 90,
    voteAverage: 8.5,
    posterPath: "/poster.jpg",
    backdropPath: "/backdrop.jpg",
    genres: ["Bilim Kurgu", "Dram"],
    overview: "A movie for group night",
  };

  function createMemberInput(id: string, label: string, score: number, confidence: number = 0.8): MemberMatchInput {
    const matchResult: MovieMatchResult = {
      movie: dummyMovie,
      rawMatchScore: score,
      displayMatchScore: score,
      qualityScore: 0.85,
      matchScore: score,
      matchLabel: "Individual Match",
      components: { genre: 0.8, era: 0.8, popularity: 0.8, quality: 0.8, discovery: 0.8, feedback: 0, tasteFit: 0.8, evidenceFit: 0.8, qualityFit: 0.85 },
      reasons: [],
    };
    return {
      userId: id,
      userLabel: label,
      matchResult,
      confidence,
    };
  }

  // 1. Strong Consensus Test (90, 87, 85)
  const strongInputs = [
    createMemberInput("u1", "İzleyici 1", 90),
    createMemberInput("u2", "İzleyici 2", 87),
    createMemberInput("u3", "İzleyici 3", 85),
  ];
  const strongMatch = calculateGroupMatch(dummyMovie, strongInputs);
  assert(
    strongMatch.groupMatchScore >= 85,
    `Strong Consensus: All high member scores yield high group score (${strongMatch.groupMatchScore})`
  );

  // 2. One Bad Fit Penalty Test (96, 93, 35)
  const badFitInputs = [
    createMemberInput("u1", "İzleyici 1", 96),
    createMemberInput("u2", "İzleyici 2", 93),
    createMemberInput("u3", "İzleyici 3", 35),
  ];
  const badFitMatch = calculateGroupMatch(dummyMovie, badFitInputs);
  assert(
    badFitMatch.groupMatchScore < strongMatch.groupMatchScore - 15,
    `One Bad Fit: Member score of 35 triggers fairness penalty, dropping group score to (${badFitMatch.groupMatchScore})`
  );

  // 3. Balanced Group Test (75, 76, 78)
  const balancedInputs = [
    createMemberInput("u1", "İzleyici 1", 75),
    createMemberInput("u2", "İzleyici 2", 76),
    createMemberInput("u3", "İzleyici 3", 78),
  ];
  const balancedMatch = calculateGroupMatch(dummyMovie, balancedInputs);
  assert(
    balancedMatch.groupMatchScore >= 70 && balancedMatch.groupMatchScore > badFitMatch.groupMatchScore,
    `Balanced Group: Consistent scores yield higher group rank than unbalanced bad fit (${balancedMatch.groupMatchScore} vs ${badFitMatch.groupMatchScore})`
  );

  // 4. Spread Penalty Test (95, 50) vs (76, 75)
  const highSpreadInputs = [
    createMemberInput("u1", "İzleyici 1", 95),
    createMemberInput("u2", "İzleyici 2", 50),
  ];
  const lowSpreadInputs = [
    createMemberInput("u1", "İzleyici 1", 76),
    createMemberInput("u2", "İzleyici 2", 75),
  ];
  const highSpreadMatch = calculateGroupMatch(dummyMovie, highSpreadInputs);
  const lowSpreadMatch = calculateGroupMatch(dummyMovie, lowSpreadInputs);
  assert(
    lowSpreadMatch.groupMatchScore > highSpreadMatch.groupMatchScore,
    `Spread Penalty: (76, 75) ranks higher than high spread (95, 50) (${lowSpreadMatch.groupMatchScore} vs ${highSpreadMatch.groupMatchScore})`
  );

  // 5. Bounds & Determinism Test
  const detMatch1 = calculateGroupMatch(dummyMovie, strongInputs);
  const detMatch2 = calculateGroupMatch(dummyMovie, strongInputs);
  assert(
    detMatch1.groupMatchScore === detMatch2.groupMatchScore &&
      detMatch1.groupMatchScore >= 0 &&
      detMatch1.groupMatchScore <= 100,
    "Bounds & Determinism: Same input yields identical score within [0, 100]"
  );

  console.log(`\nRESULTS: Passed ${passed} of ${total} tests.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runGroupMatcherTests();
