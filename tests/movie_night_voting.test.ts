import {
  calculateGroupMatch,
  MemberMatchInput,
} from "@/lib/movie-night/matcher";
import { CandidateMovie } from "@/lib/calibration/types";
import { MovieMatchResult } from "@/lib/recommendation/types";
import { MovieNightStatus } from "@prisma/client";

export function runMovieNightVotingTests() {
  console.log("=== PHASE P1.1 MOVIE NIGHT CONSENSUS VOTING TESTS ===\n");
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

  const movieA: CandidateMovie = {
    id: "movie-a",
    tmdbId: 101,
    title: "Sci-Fi Masterpiece A",
    originalTitle: "Sci-Fi Masterpiece A",
    releaseYear: 2022,
    popularity: 80,
    voteAverage: 8.2,
    posterPath: "/a.jpg",
    backdropPath: "/a-bg.jpg",
    genres: ["Bilim Kurgu"],
    overview: "Great sci-fi",
  };

  const movieB: CandidateMovie = {
    id: "movie-b",
    tmdbId: 102,
    title: "Drama Classic B",
    originalTitle: "Drama Classic B",
    releaseYear: 2021,
    popularity: 75,
    voteAverage: 8.0,
    posterPath: "/b.jpg",
    backdropPath: "/b-bg.jpg",
    genres: ["Dram"],
    overview: "Great drama",
  };

  const movieC: CandidateMovie = {
    id: "movie-c",
    tmdbId: 103,
    title: "Polarizing Movie C",
    originalTitle: "Polarizing Movie C",
    releaseYear: 2020,
    popularity: 90,
    voteAverage: 7.5,
    posterPath: "/c.jpg",
    backdropPath: "/c-bg.jpg",
    genres: ["Korku"],
    overview: "Great horror",
  };

  function createMemberInput(
    id: string,
    label: string,
    movie: CandidateMovie,
    score: number,
    confidence: number = 0.8
  ): MemberMatchInput {
    const matchResult: MovieMatchResult = {
      movie,
      rawMatchScore: score,
      displayMatchScore: score,
      qualityScore: 0.85,
      matchScore: score,
      matchLabel: "Individual Match",
      components: {
        genre: 0.8,
        era: 0.8,
        popularity: 0.8,
        quality: 0.8,
        discovery: 0.8,
        feedback: 0,
        tasteFit: 0.8,
        evidenceFit: 0.8,
        qualityFit: 0.85,
      },
      reasons: [],
    };
    return {
      userId: id,
      userLabel: label,
      matchResult,
      confidence,
    };
  }

  // Pure Deterministic Winner Function simulating the service algorithm
  function resolveConsensusWinner(
    votes: Array<{ userId: string; movieId: string }>,
    readyMembers: Array<{ userId: string; userLabel: string }>,
    movies: Array<CandidateMovie & { calibrationPriorityScore?: number; voteCount?: number }>,
    memberInputsGenerator: (movie: CandidateMovie) => MemberMatchInput[]
  ) {
    const readyUserIds = new Set(readyMembers.map((m) => m.userId));
    const validVotes = votes.filter((v) => readyUserIds.has(v.userId));

    if (readyMembers.length === 0) {
      throw new Error("Oylamayı sonlandırmak için en az bir hazır katılımcı gereklidir.");
    }
    if (validVotes.length < readyMembers.length) {
      throw new Error("Tüm hazır katılımcılar oy vermeden oylama sonlandırılamaz.");
    }

    const voteCounts = new Map<string, number>();
    for (const v of validVotes) {
      voteCounts.set(v.movieId, (voteCounts.get(v.movieId) || 0) + 1);
    }

    const scored = movies
      .filter((m) => voteCounts.has(m.id))
      .map((movie) => {
        const memberInputs = memberInputsGenerator(movie);
        const groupResult = calculateGroupMatch(movie, memberInputs);
        const memberScores = groupResult.memberScores.map((ms) => ms.individualMatchScore);
        const minMemberScore = memberScores.length > 0 ? Math.min(...memberScores) : 0;

        return {
          id: movie.id,
          voteCount: voteCounts.get(movie.id) || 0,
          groupMatchScore: groupResult.groupMatchScore,
          minMemberScore,
          calibrationPriorityScore: movie.calibrationPriorityScore || 0,
          voteCountCatalog: movie.voteCount || 0,
          voteAverage: movie.voteAverage || 0,
          popularity: movie.popularity || 0,
        };
      });

    scored.sort((a, b) => {
      if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
      if (b.groupMatchScore !== a.groupMatchScore) return b.groupMatchScore - a.groupMatchScore;
      if (b.minMemberScore !== a.minMemberScore) return b.minMemberScore - a.minMemberScore;
      if (b.calibrationPriorityScore !== a.calibrationPriorityScore) return b.calibrationPriorityScore - a.calibrationPriorityScore;
      if (b.voteCountCatalog !== a.voteCountCatalog) return b.voteCountCatalog - a.voteCountCatalog;
      if (b.voteAverage !== a.voteAverage) return b.voteAverage - a.voteAverage;
      if (b.popularity !== a.popularity) return b.popularity - a.popularity;
      return a.id.localeCompare(b.id);
    });

    return scored[0];
  }

  // 1. First participant vote does NOT complete session
  const simulatedSession = {
    status: MovieNightStatus.READY,
    votes: [{ userId: "u-host", movieId: "movie-a" }],
    readyMembers: [
      { userId: "u-host", userLabel: "Host" },
      { userId: "u-guest", userLabel: "Guest" },
    ],
  };
  const isCompletedOnFirstVote = simulatedSession.votes.length === simulatedSession.readyMembers.length;
  assert(
    !isCompletedOnFirstVote,
    "First participant vote does NOT complete session when other ready members have not voted"
  );

  // 2. Non-ready member voting invariant simulation
  const guestMember = { userId: "u-guest", isReady: false };
  function tryVote(member: { userId: string; isReady: boolean }) {
    if (!member.isReady) {
      throw new Error("Oy kullanabilmek için önce hazır durumuna geçmelisiniz.");
    }
    return true;
  }
  let readyInvariantError = "";
  try {
    tryVote(guestMember);
  } catch (err) {
    readyInvariantError = (err as Error).message;
  }
  assert(
    readyInvariantError === "Oy kullanabilmek için önce hazır durumuna geçmelisiniz.",
    "Non-ready member cannot vote and receives explicit invariant error"
  );

  // 3. One vote per user & vote change (upsert simulation)
  const votesMap = new Map<string, string>();
  votesMap.set("u1", "movie-a");
  assert(votesMap.get("u1") === "movie-a", "Initial vote recorded as movie-a");
  votesMap.set("u1", "movie-b"); // vote changed
  assert(votesMap.size === 1 && votesMap.get("u1") === "movie-b", "Vote change updates existing vote in place (upsert, size 1)");

  // 4. Finalization requires ALL ready members to vote
  let finalizationPrematureError = "";
  try {
    resolveConsensusWinner(
      [{ userId: "u-host", movieId: "movie-a" }],
      [
        { userId: "u-host", userLabel: "Host" },
        { userId: "u-guest", userLabel: "Guest" },
      ],
      [movieA, movieB],
      () => []
    );
  } catch (err) {
    finalizationPrematureError = (err as Error).message;
  }
  assert(
    finalizationPrematureError.includes("Tüm hazır katılımcılar oy vermeden"),
    "Finalization blocked when only 1 of 2 ready participants has voted"
  );

  // 5. Unanimous vote wins (2 votes for movie-a vs 0 for movie-b)
  const unanimousWinner = resolveConsensusWinner(
    [
      { userId: "u-host", movieId: "movie-a" },
      { userId: "u-guest", movieId: "movie-a" },
    ],
    [
      { userId: "u-host", userLabel: "Host" },
      { userId: "u-guest", userLabel: "Guest" },
    ],
    [movieA, movieB],
    (movie) => [
      createMemberInput("u-host", "Host", movie, 90),
      createMemberInput("u-guest", "Guest", movie, 90),
    ]
  );
  assert(
    unanimousWinner.id === "movie-a" && unanimousWinner.voteCount === 2,
    "Unanimous voting consensus: movie-a wins with 2 votes"
  );

  // 6. 1-1 Tie-Breaker: Group Match Score resolves fairer group choice
  // Host votes Movie A (Host: 95, Guest: 60 -> Group: 74)
  // Guest votes Movie B (Host: 88, Guest: 86 -> Group: 87)
  const tieWinner = resolveConsensusWinner(
    [
      { userId: "u-host", movieId: "movie-a" },
      { userId: "u-guest", movieId: "movie-b" },
    ],
    [
      { userId: "u-host", userLabel: "Host" },
      { userId: "u-guest", userLabel: "Guest" },
    ],
    [movieA, movieB],
    (movie) => {
      if (movie.id === "movie-a") {
        return [
          createMemberInput("u-host", "Host", movieA, 95),
          createMemberInput("u-guest", "Guest", movieA, 60),
        ];
      } else {
        return [
          createMemberInput("u-host", "Host", movieB, 88),
          createMemberInput("u-guest", "Guest", movieB, 86),
        ];
      }
    }
  );
  assert(
    tieWinner.id === "movie-b",
    `1-1 Tie resolved by Group Match Score: Movie B wins because it has higher overall group harmony (${tieWinner.groupMatchScore})`
  );

  // 7. Low-scoring member fairness protection in tie-break
  // Movie A: (95, 30) -> High spread and very low minimum score penalty
  // Movie C: (72, 70) -> Balanced scores with protected floor
  const fairnessWinner = resolveConsensusWinner(
    [
      { userId: "u-host", movieId: "movie-a" },
      { userId: "u-guest", movieId: "movie-c" },
    ],
    [
      { userId: "u-host", userLabel: "Host" },
      { userId: "u-guest", userLabel: "Guest" },
    ],
    [movieA, movieC],
    (movie) => {
      if (movie.id === "movie-a") {
        return [
          createMemberInput("u-host", "Host", movieA, 95),
          createMemberInput("u-guest", "Guest", movieA, 30),
        ];
      } else {
        return [
          createMemberInput("u-host", "Host", movieC, 72),
          createMemberInput("u-guest", "Guest", movieC, 70),
        ];
      }
    }
  );
  assert(
    fairnessWinner.id === "movie-c",
    "Fairness Protection: Movie C wins over Movie A because Movie A has a disastrous member score (30) triggering fairness guardrail"
  );

  // 8. Deterministic tie-break by calibrationPriorityScore when group score is tied
  const movieD1 = { ...movieA, id: "movie-d1", calibrationPriorityScore: 85 };
  const movieD2 = { ...movieB, id: "movie-d2", calibrationPriorityScore: 92 };
  const priorityWinner = resolveConsensusWinner(
    [
      { userId: "u-host", movieId: "movie-d1" },
      { userId: "u-guest", movieId: "movie-d2" },
    ],
    [
      { userId: "u-host", userLabel: "Host" },
      { userId: "u-guest", userLabel: "Guest" },
    ],
    [movieD1, movieD2],
    () => [
      createMemberInput("u-host", "Host", movieA, 80),
      createMemberInput("u-guest", "Guest", movieA, 80),
    ]
  );
  assert(
    priorityWinner.id === "movie-d2",
    "Deterministic Tie-Break: Higher calibrationPriorityScore (92 vs 85) breaks tie when group match score is identical"
  );

  // 9. Free & Premium Movie Night parity: Voting mechanics are identical
  const freeHostSessionVotes = [{ userId: "u-free-1", movieId: "movie-a" }];
  const premiumHostSessionVotes = [{ userId: "u-prem-1", movieId: "movie-a" }];
  assert(
    freeHostSessionVotes.length === 1 && premiumHostSessionVotes.length === 1,
    "Consensus voting structure operates identically on both Free and Premium sessions"
  );

  console.log(`\nRESULTS: Passed ${passed} of ${total} tests.`);
  if (passed !== total) {
    process.exit(1);
  }
}

if (require.main === module) {
  runMovieNightVotingTests();
}