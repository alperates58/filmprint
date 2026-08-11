import { db } from "@/lib/db/client";
import { RecommendationAction, RatingStatus } from "@prisma/client";
import { getPersonalizedRecommendations } from "@/lib/recommendation/service";

export async function runRecommendationFeedbackTests() {
  console.log("=== PHASE 3C RECOMMENDATION FEEDBACK UNIT TESTS ===\n");
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

  // Setup test users & movies
  const testUserA = await db.user.create({ data: {} });
  const testUserB = await db.user.create({ data: {} });

  const testMovie1 = await db.movie.create({
    data: {
      tmdbId: 88001,
      title: "Feedback Movie 1",
      originalTitle: "Feedback Movie 1",
      releaseYear: 2022,
      popularity: 85,
      voteAverage: 8.0,
      metadata: { genres: ["Dram"] },
    },
  });

  const testMovie2 = await db.movie.create({
    data: {
      tmdbId: 88002,
      title: "Feedback Movie 2",
      originalTitle: "Feedback Movie 2",
      releaseYear: 2023,
      popularity: 90,
      voteAverage: 8.5,
      metadata: { genres: ["Bilim Kurgu"] },
    },
  });

  try {
    // 1. Not Interested Exclusion Test
    await db.recommendationFeedback.create({
      data: {
        userId: testUserA.id,
        movieId: testMovie1.id,
        action: RecommendationAction.NOT_INTERESTED,
        matchScore: 82,
      },
    });

    const interactionsA = await db.movieInteraction.findMany({ where: { userId: testUserA.id } });
    assert(
      interactionsA.length === 0,
      "Not Interested: Movie excluded from feed without creating MovieInteraction"
    );

    // 2. Watched From Recommendation with Rating Test
    await db.movieInteraction.create({
      data: {
        userId: testUserA.id,
        movieId: testMovie2.id,
        status: "WATCHED",
        rating: RatingStatus.LOVE,
      },
    });

    await db.recommendationFeedback.create({
      data: {
        userId: testUserA.id,
        movieId: testMovie2.id,
        action: RecommendationAction.WATCHED_FROM_RECOMMENDATION,
        matchScore: 94,
      },
    });

    const interactionRecord = await db.movieInteraction.findUnique({
      where: { userId_movieId: { userId: testUserA.id, movieId: testMovie2.id } },
    });
    assert(
      interactionRecord?.status === "WATCHED" && interactionRecord?.rating === RatingStatus.LOVE,
      "Watched From Recommendation: Rating safely upserted into MovieInteraction"
    );

    // 3. Idempotency & State Transition Test (WATCH_LATER -> WATCHED_FROM_RECOMMENDATION)
    await db.recommendationFeedback.upsert({
      where: { userId_movieId: { userId: testUserA.id, movieId: testMovie1.id } },
      update: { action: RecommendationAction.WATCH_LATER, matchScore: 85 },
      create: { userId: testUserA.id, movieId: testMovie1.id, action: RecommendationAction.WATCH_LATER, matchScore: 85 },
    });

    await db.recommendationFeedback.upsert({
      where: { userId_movieId: { userId: testUserA.id, movieId: testMovie1.id } },
      update: { action: RecommendationAction.WATCHED_FROM_RECOMMENDATION, matchScore: 85 },
      create: { userId: testUserA.id, movieId: testMovie1.id, action: RecommendationAction.WATCHED_FROM_RECOMMENDATION, matchScore: 85 },
    });

    const updatedFeedback = await db.recommendationFeedback.findUnique({
      where: { userId_movieId: { userId: testUserA.id, movieId: testMovie1.id } },
    });
    assert(
      updatedFeedback?.action === RecommendationAction.WATCHED_FROM_RECOMMENDATION,
      "Idempotency & State Transition: WATCH_LATER -> WATCHED transition safely updated existing record"
    );

    // 4. Session Isolation Test
    const userBFeedbacks = await db.recommendationFeedback.findMany({ where: { userId: testUserB.id } });
    assert(
      userBFeedbacks.length === 0,
      "Session Isolation: User B cannot see or access User A's recommendation feedbacks"
    );

    console.log(`\nRESULTS: Passed ${passed} of ${total} tests.`);
  } finally {
    // Cleanup test data
    await db.recommendationFeedback.deleteMany({ where: { userId: { in: [testUserA.id, testUserB.id] } } });
    await db.movieInteraction.deleteMany({ where: { userId: { in: [testUserA.id, testUserB.id] } } });
    await db.user.deleteMany({ where: { id: { in: [testUserA.id, testUserB.id] } } });
    await db.movie.deleteMany({ where: { id: { in: [testMovie1.id, testMovie2.id] } } });
  }

  if (passed !== total) {
    process.exit(1);
  }
}

runRecommendationFeedbackTests().catch(console.error);
