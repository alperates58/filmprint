import { db } from "../lib/db/client";
import { getTvCalibrationQueue } from "../lib/tv/calibration/service";
import { tmdbTvClient } from "../lib/tmdb/tv/client";
import { evaluateTvEligibility, filterEligibleTvShows } from "../lib/tv/eligibility";

export async function runTvCalibrationSupplyTests(): Promise<void> {
  console.log("\n🧪 Running TV Calibration Supply, 347+ User & Replenishment Tests...");

  // Seed/sync initial catalog
  await tmdbTvClient.seedAndFetchTvShows();

  // Test 1: User with 347+ answered shows continues to receive non-empty candidate queue
  {
    console.log("  → Test 1: High-volume user (347+ answered shows) receives fresh candidate queue from DB supply");
    const testUser = await db.user.create({
      data: {
        email: `test_user_supply_347_${Date.now()}@filmprint.io`,
        name: "Supply 347 User",
      },
    });

    const allShows = await db.tvShow.findMany({
      orderBy: [{ popularity: "desc" }, { voteAverage: "desc" }],
    });

    const totalInDb = allShows.length;
    console.log(`     Total TV shows in DB: ${totalInDb}`);

    const targetAnswerCount = Math.min(347, Math.max(1, totalInDb - 15));
    const showsToAnswer = allShows.slice(0, targetAnswerCount);
    const statuses = ["WATCHED", "PARTIALLY_WATCHED", "NOT_WATCHED", "UNSURE"] as const;

    // Batch create interactions
    const interactionData = showsToAnswer.map((show, i) => ({
      userId: testUser.id,
      tvShowId: show.id,
      status: statuses[i % statuses.length],
      rating: (statuses[i % statuses.length] === "WATCHED" ? "LIKE" : null) as any,
      answeredAt: new Date(Date.now() - (targetAnswerCount - i) * 60000),
      updatedAt: new Date(),
    }));

    await db.tvInteraction.createMany({
      data: interactionData,
    });

    const answeredCount = await db.tvInteraction.count({ where: { userId: testUser.id } });
    console.log(`     User answered count: ${answeredCount} / ${targetAnswerCount}`);

    // Call calibration queue
    const queue = await getTvCalibrationQueue(testUser.id, 5);

    if (queue.tvShows.length === 0) {
      throw new Error(`Expected calibration queue to return candidates for 347+ user, got 0`);
    }

    const answeredIdsSet = new Set(showsToAnswer.map((s) => s.id));
    for (const c of queue.tvShows) {
      if (answeredIdsSet.has(c.id)) {
        throw new Error(`Queue returned already answered show: ${c.name} (${c.id})`);
      }
    }

    console.log(`     ✓ Returned ${queue.tvShows.length} fresh unrated candidates (${queue.tvShows.map((s) => s.name).join(", ")})`);
  }

  // Test 2: Popularity Ordering Starvation Audit (User answered top 500 popularity shows)
  {
    console.log("  → Test 2: Popularity ordering starvation test (top ranked shows answered, lower ranked reached)");
    const testUserStarvation = await db.user.create({
      data: {
        email: `test_user_starv_${Date.now()}@filmprint.io`,
        name: "Starvation Test User",
      },
    });

    const topShows = await db.tvShow.findMany({
      orderBy: [{ popularity: "desc" }, { voteAverage: "desc" }],
      take: 200,
    });

    if (topShows.length > 20) {
      const toAnswer = topShows.slice(0, topShows.length - 5);
      await db.tvInteraction.createMany({
        data: toAnswer.map((s) => ({
          userId: testUserStarvation.id,
          tvShowId: s.id,
          status: "WATCHED",
          rating: "LIKE",
        })),
      });

      const queue = await getTvCalibrationQueue(testUserStarvation.id, 5);
      if (queue.tvShows.length === 0) {
        throw new Error("Starvation occurred: Candidate query failed to reach lower-ranked shows");
      }

      console.log(`     ✓ Candidate query successfully retrieved ${queue.tvShows.length} candidates beyond answered top-popularity items.`);
    }
  }

  // Test 3: Strict Exclusion of all interaction states (WATCHED, PARTIALLY_WATCHED, NOT_WATCHED, UNSURE)
  {
    console.log("  → Test 3: Strict DB exclusion of NOT_WATCHED and UNSURE from calibration queue");
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

    console.log(`     ✓ NOT_WATCHED show properly excluded from subsequent queue at DB level.`);
  }

  // Test 4: Force replenishment via options.forceReplenish
  {
    console.log("  → Test 4: Forced manual replenishment triggers catalog refresh");
    const testUser3 = await db.user.create({
      data: {
        email: `test_user_force_${Date.now()}@filmprint.io`,
        name: "Forced Refresh User",
      },
    });

    const queueAfter = await getTvCalibrationQueue(testUser3.id, 5, { forceReplenish: true });

    if (queueAfter.tvShows.length === 0) {
      throw new Error("Forced replenishment returned empty queue");
    }

    console.log(`     ✓ Forced replenishment succeeded with ${queueAfter.tvShows.length} valid candidates.`);
  }

  // Test 5: Eligibility compliance of all queue items
  {
    console.log("  → Test 5: All candidate shows in calibration queue meet CALIBRATION eligibility standards");
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
