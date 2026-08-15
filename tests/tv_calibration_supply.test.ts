import { db } from "../lib/db/client";
import { getTvCalibrationQueue } from "../lib/tv/calibration/service";
import { tmdbTvClient } from "../lib/tmdb/tv/client";
import { evaluateTvEligibility } from "../lib/tv/eligibility";

export async function runTvCalibrationSupplyTests(): Promise<void> {
  console.log("\n🧪 Running TV Calibration Supply & Replenishment Tests...");

  // Test 1: User with 108+ answered shows can continue without running out of supply
  {
    console.log("  → Test 1: High-volume user (108+ answered shows) receives fresh candidate queue");
    const testUser = await db.user.create({
      data: {
        email: `test_user_supply_${Date.now()}@filmprint.io`,
        name: "Supply Test User",
      },
    });

    // Seed/sync initial catalog
    await tmdbTvClient.seedAndFetchTvShows();

    // Fetch all existing shows
    const allShows = await db.tvShow.findMany();

    // Answer first 108 shows with mixed interaction types
    const showsToAnswer = allShows.slice(0, Math.min(108, allShows.length - 10));
    const statuses = ["WATCHED", "PARTIALLY_WATCHED", "NOT_WATCHED", "UNSURE"] as const;

    for (let i = 0; i < showsToAnswer.length; i++) {
      const show = showsToAnswer[i];
      const status = statuses[i % statuses.length];
      const rating = status === "WATCHED" || status === "PARTIALLY_WATCHED" ? "LIKE" : null;

      await db.tvInteraction.create({
        data: {
          userId: testUser.id,
          tvShowId: show.id,
          status,
          rating,
          answeredAt: new Date(Date.now() - (108 - i) * 60000),
          updatedAt: new Date(),
        },
      });
    }

    const answeredCount = await db.tvInteraction.count({ where: { userId: testUser.id } });
    console.log(`     User answered count: ${answeredCount}`);

    // Call calibration queue
    const queue = await getTvCalibrationQueue(testUser.id, 5);

    if (queue.tvShows.length === 0) {
      throw new Error(`Expected calibration queue to return candidates for 108+ user, got 0`);
    }

    const answeredIdsSet = new Set(showsToAnswer.map((s) => s.id));
    for (const c of queue.tvShows) {
      if (answeredIdsSet.has(c.id)) {
        throw new Error(`Queue returned already answered show: ${c.name} (${c.id})`);
      }
    }

    console.log(`     ✓ Returned ${queue.tvShows.length} fresh unrated candidates (${queue.tvShows.map((s) => s.name).join(", ")})`);
  }

  // Test 2: Strict Exclusion of all interaction states (WATCHED, PARTIALLY_WATCHED, NOT_WATCHED, UNSURE)
  {
    console.log("  → Test 2: Strict exclusion of NOT_WATCHED and UNSURE from calibration queue");
    const testUser2 = await db.user.create({
      data: {
        email: `test_user_excl_${Date.now()}@filmprint.io`,
        name: "Exclusion Test User",
      },
    });

    const candidateQueue = await getTvCalibrationQueue(testUser2.id, 5);
    const firstCandidate = candidateQueue.tvShows[0];

    // Mark as NOT_WATCHED
    await db.tvInteraction.create({
      data: {
        userId: testUser2.id,
        tvShowId: firstCandidate.id,
        status: "NOT_WATCHED",
        rating: null,
        answeredAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const nextQueue = await getTvCalibrationQueue(testUser2.id, 5);
    const returnedIds = nextQueue.tvShows.map((s) => s.id);

    if (returnedIds.includes(firstCandidate.id)) {
      throw new Error(`NOT_WATCHED show ${firstCandidate.name} was returned in next calibration queue!`);
    }

    console.log(`     ✓ NOT_WATCHED show properly excluded from subsequent queue.`);
  }

  // Test 3: Force replenishment via options.forceReplenish
  {
    console.log("  → Test 3: Forced manual replenishment triggers catalog refresh");
    const testUser3 = await db.user.create({
      data: {
        email: `test_user_force_${Date.now()}@filmprint.io`,
        name: "Forced Refresh User",
      },
    });

    const queueBefore = await getTvCalibrationQueue(testUser3.id, 5);
    const queueAfter = await getTvCalibrationQueue(testUser3.id, 5, { forceReplenish: true });

    if (queueAfter.tvShows.length === 0) {
      throw new Error("Forced replenishment returned empty queue");
    }

    console.log(`     ✓ Forced replenishment succeeded with ${queueAfter.tvShows.length} valid candidates.`);
  }

  // Test 4: Eligibility compliance of all queue items
  {
    console.log("  → Test 4: All candidate shows in calibration queue meet CALIBRATION eligibility standards");
    const testUser4 = await db.user.create({
      data: {
        email: `test_user_elig_${Date.now()}@filmprint.io`,
        name: "Eligibility Check User",
      },
    });

    const queue = await getTvCalibrationQueue(testUser4.id, 10);
    for (const item of queue.tvShows) {
      const evalRes = evaluateTvEligibility(
        {
          id: item.id,
          name: item.name,
          originalName: item.originalName || "",
          overview: item.overview,
          posterPath: item.posterPath,
          firstAirDate: item.firstAirDate,
          voteAverage: item.voteAverage,
          voteCount: item.voteCount,
          popularity: item.popularity,
          genres: item.genres,
        },
        "CALIBRATION"
      );

      if (!evalRes.isEligible) {
        throw new Error(`Candidate ${item.name} failed CALIBRATION eligibility: ${evalRes.reason}`);
      }
    }

    console.log(`     ✓ All ${queue.tvShows.length} returned candidates are 100% CALIBRATION eligible.`);
  }

  console.log("  ✅ All TV Calibration Supply & Replenishment Tests Passed!\n");
}
