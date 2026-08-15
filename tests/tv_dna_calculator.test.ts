import {
  calculateTvTasteProfile,
  calculateTvEffectiveWeight,
} from "../lib/tv/profile/calculator";
import { generateTvSourceFingerprint } from "../lib/tv/profile/service";
import type { TvInteractionData } from "../lib/tv/profile/types";

// Helper function to create mock TV interaction data
function createMockTvItem(overrides: Partial<TvInteractionData> = {}): TvInteractionData {
  const id = overrides.id || `tv-${Math.random().toString(36).substring(7)}`;
  return {
    id,
    tvShowId: overrides.tvShowId || `show-${id}`,
    status: overrides.status || "WATCHED",
    rating: overrides.rating !== undefined ? overrides.rating : "LOVE",
    answeredAt: overrides.answeredAt || new Date("2026-08-01T12:00:00Z"),
    updatedAt: overrides.updatedAt || new Date("2026-08-01T12:00:00Z"),
    tvShow: {
      id: overrides.tvShow?.id || `show-${id}`,
      tmdbId: overrides.tvShow?.tmdbId || 1001,
      name: overrides.tvShow?.name || "Test TV Show",
      originalName: overrides.tvShow?.originalName || "Test TV Show",
      firstAirDate: overrides.tvShow?.firstAirDate !== undefined ? overrides.tvShow.firstAirDate : "2018-04-12",
      lastAirDate: overrides.tvShow?.lastAirDate !== undefined ? overrides.tvShow.lastAirDate : "2022-05-15",
      status: overrides.tvShow?.status !== undefined ? overrides.tvShow.status : "Ended",
      originalLanguage: overrides.tvShow?.originalLanguage !== undefined ? overrides.tvShow.originalLanguage : "en",
      popularity: overrides.tvShow?.popularity !== undefined ? overrides.tvShow.popularity : 45.0,
      voteAverage: overrides.tvShow?.voteAverage !== undefined ? overrides.tvShow.voteAverage : 8.2,
      voteCount: overrides.tvShow?.voteCount !== undefined ? overrides.tvShow.voteCount : 1200,
      metadata: {
        genres: ["Dram", "Suç"],
        numberOfSeasons: 3,
        numberOfEpisodes: 30,
        episodeRunTime: [50],
        networks: [{ id: 49, name: "HBO" }],
        originCountry: ["US"],
        overview: "A thrilling TV show",
        ...overrides.tvShow?.metadata,
      },
    },
  };
}

export async function runTvDnaCalculatorTests() {
  console.log("=== TV PHASE 2: TV DNA CALCULATOR & PROFILE TESTS ===\n");
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, message: string) {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total}: ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. WATCHED + LOVE full positive (+3.0)
  const watchedLove = calculateTvEffectiveWeight("WATCHED", "LOVE");
  assert(watchedLove.isEvidence === true && watchedLove.weight === 3.0, "WATCHED + LOVE gives full positive (+3.0)");

  // 2. WATCHED + DISLIKE full negative (-2.0)
  const watchedDislike = calculateTvEffectiveWeight("WATCHED", "DISLIKE");
  assert(watchedDislike.isEvidence === true && watchedDislike.weight === -2.0, "WATCHED + DISLIKE gives full negative (-2.0)");

  // 3. PARTIALLY_WATCHED + LOVE reduced positive (+2.25)
  const partialLove = calculateTvEffectiveWeight("PARTIALLY_WATCHED", "LOVE");
  assert(partialLove.isEvidence === true && partialLove.weight === 2.25, "PARTIALLY_WATCHED + LOVE gives reduced positive (+2.25)");

  // 4. PARTIALLY_WATCHED + LIKE reduced positive (+1.05)
  const partialLike = calculateTvEffectiveWeight("PARTIALLY_WATCHED", "LIKE");
  assert(partialLike.isEvidence === true && partialLike.weight === 1.05, "PARTIALLY_WATCHED + LIKE gives reduced positive (+1.05)");

  // 5. PARTIALLY_WATCHED + DISLIKE strong negative (-1.80)
  const partialDislike = calculateTvEffectiveWeight("PARTIALLY_WATCHED", "DISLIKE");
  assert(partialDislike.isEvidence === true && partialDislike.weight === -1.80, "PARTIALLY_WATCHED + DISLIKE gives strong negative (-1.80)");

  // 6. NOT_WATCHED & UNSURE are not taste evidence (0.0 weight)
  const notWatched = calculateTvEffectiveWeight("NOT_WATCHED", "LOVE");
  const unsure = calculateTvEffectiveWeight("UNSURE", "DISLIKE");
  assert(!notWatched.isEvidence && notWatched.weight === 0.0, "NOT_WATCHED produces 0 evidence");
  assert(!unsure.isEvidence && unsure.weight === 0.0, "UNSURE produces 0 evidence");

  // 7. NEUTRAL rating yields 0.0 delta
  const neutralWatched = calculateTvEffectiveWeight("WATCHED", "NEUTRAL");
  assert(neutralWatched.isEvidence === true && neutralWatched.weight === 0.0, "NEUTRAL rating gives 0.0 delta");

  // 8. Determinism: Same input produces identical output
  const itemsDeterministic = [
    createMockTvItem({ id: "1", tvShowId: "s1", status: "WATCHED", rating: "LOVE" }),
    createMockTvItem({ id: "2", tvShowId: "s2", status: "PARTIALLY_WATCHED", rating: "DISLIKE" }),
  ];
  const res1 = calculateTvTasteProfile(itemsDeterministic);
  const res2 = calculateTvTasteProfile(itemsDeterministic);
  assert(
    res1.confidence === res2.confidence &&
      res1.maturity === res2.maturity &&
      res1.genres[0]?.score === res2.genres[0]?.score,
    "Same input produces identical deterministic output"
  );

  // 9. Missing metadata handled safely without crash
  const incompleteItem = createMockTvItem({
    id: "inc-1",
    tvShow: {
      id: "s-inc",
      tmdbId: 999,
      name: "Incomplete Show",
      originalName: null,
      firstAirDate: null,
      lastAirDate: null,
      status: null,
      originalLanguage: null,
      popularity: 10.0,
      voteAverage: 6.0,
      metadata: {
        genres: [],
        numberOfSeasons: null,
        episodeRunTime: null,
        networks: [],
      },
    },
  });
  const resIncomplete = calculateTvTasteProfile([incompleteItem]);
  assert(
    resIncomplete.evaluatedCount === 1 && resIncomplete.evidenceCount === 1 && resIncomplete.episodeRuntimePreference.avgMinutes === null,
    "Missing metadata is handled gracefully without error"
  );

  // 10. User A: Crime & Mystery LOVE -> top positive genres
  const itemsCrimeMystery = [
    createMockTvItem({
      id: "cm1",
      status: "WATCHED",
      rating: "LOVE",
      tvShow: {
        id: "s-cm1",
        tmdbId: 1,
        name: "Sherlock",
        originalName: "Sherlock",
        firstAirDate: "2010-07-25",
        lastAirDate: "2017-01-15",
        status: "Ended",
        originalLanguage: "en",
        popularity: 80,
        voteAverage: 8.5,
        metadata: { genres: ["Gizem", "Suç"] },
      },
    }),
    createMockTvItem({
      id: "cm2",
      status: "WATCHED",
      rating: "LOVE",
      tvShow: {
        id: "s-cm2",
        tmdbId: 2,
        name: "True Detective",
        originalName: "True Detective",
        firstAirDate: "2014-01-12",
        lastAirDate: "2024-02-18",
        status: "Ended",
        originalLanguage: "en",
        popularity: 90,
        voteAverage: 8.9,
        metadata: { genres: ["Suç", "Gizem", "Dram"] },
      },
    }),
  ];
  const resCrimeMystery = calculateTvTasteProfile(itemsCrimeMystery);
  const crime = resCrimeMystery.genres.find((g) => g.name === "Suç");
  const mystery = resCrimeMystery.genres.find((g) => g.name === "Gizem");
  assert(
    crime?.state === "POSITIVE" && mystery?.state === "POSITIVE" && (crime?.score || 0) > 0.65,
    "User A: Crime & Mystery LOVE results in top positive genre states"
  );

  // 11. User B: Comedy LOVE vs Crime DISLIKE -> Comedy > Crime
  const itemsComedyVsCrime = [
    createMockTvItem({
      id: "cc1",
      status: "WATCHED",
      rating: "LOVE",
      tvShow: {
        id: "s-cc1",
        tmdbId: 10,
        name: "Friends",
        originalName: "Friends",
        firstAirDate: "1994-09-22",
        lastAirDate: "2004-05-06",
        status: "Ended",
        originalLanguage: "en",
        popularity: 120,
        voteAverage: 8.4,
        metadata: { genres: ["Komedi"], episodeRunTime: [22] },
      },
    }),
    createMockTvItem({
      id: "cc2",
      status: "WATCHED",
      rating: "DISLIKE",
      tvShow: {
        id: "s-cc2",
        tmdbId: 11,
        name: "Bad Crime Show",
        originalName: "Bad Crime Show",
        firstAirDate: "2015-09-22",
        lastAirDate: "2016-05-06",
        status: "Ended",
        originalLanguage: "en",
        popularity: 40,
        voteAverage: 5.4,
        metadata: { genres: ["Suç"] },
      },
    }),
  ];
  const resComedyVsCrime = calculateTvTasteProfile(itemsComedyVsCrime);
  const comedyG = resComedyVsCrime.genres.find((g) => g.name === "Komedi");
  const crimeG = resComedyVsCrime.genres.find((g) => g.name === "Suç");
  assert(
    comedyG?.state === "POSITIVE" && crimeG?.state === "NEGATIVE" && (comedyG?.score || 0) > (crimeG?.score || 0),
    "User B: Comedy LOVE vs Crime DISLIKE correctly places Comedy > Crime"
  );

  // 12. User C: Miniseries LOVE & Long-running DISLIKE -> Miniseries format preference
  const itemsMiniseries = [
    createMockTvItem({
      id: "mini1",
      status: "WATCHED",
      rating: "LOVE",
      tvShow: {
        id: "s-mini1",
        tmdbId: 21,
        name: "Chernobyl",
        originalName: "Chernobyl",
        firstAirDate: "2019-05-06",
        lastAirDate: "2019-06-03",
        status: "Ended",
        originalLanguage: "en",
        popularity: 90,
        voteAverage: 9.1,
        metadata: { genres: ["Dram"], numberOfSeasons: 1 },
      },
    }),
    createMockTvItem({
      id: "mini2",
      status: "WATCHED",
      rating: "LOVE",
      tvShow: {
        id: "s-mini2",
        tmdbId: 22,
        name: "Band of Brothers",
        originalName: "Band of Brothers",
        firstAirDate: "2001-09-09",
        lastAirDate: "2001-11-04",
        status: "Ended",
        originalLanguage: "en",
        popularity: 95,
        voteAverage: 9.0,
        metadata: { genres: ["Dram", "Savaş & Politik"], numberOfSeasons: 1 },
      },
    }),
    createMockTvItem({
      id: "mini3",
      status: "WATCHED",
      rating: "DISLIKE",
      tvShow: {
        id: "s-mini3",
        tmdbId: 23,
        name: "Endless Soap",
        originalName: "Endless Soap",
        firstAirDate: "2005-09-09",
        lastAirDate: "2020-11-04",
        status: "Ended",
        originalLanguage: "en",
        popularity: 30,
        voteAverage: 5.0,
        metadata: { genres: ["Dram"], numberOfSeasons: 15 },
      },
    }),
  ];
  const resMiniseries = calculateTvTasteProfile(itemsMiniseries);
  assert(
    resMiniseries.formatPreference.preference === "MINISERIES",
    "User C: Miniseries LOVE & Long-running DISLIKE sets MINISERIES format preference"
  );

  // 13. User D: Short runtime preference (22m episodes)
  const itemsShortRuntime = [
    createMockTvItem({
      id: "rt1",
      status: "WATCHED",
      rating: "LOVE",
      tvShow: {
        id: "s-rt1",
        tmdbId: 31,
        name: "The Office",
        originalName: "The Office",
        firstAirDate: "2005-03-24",
        lastAirDate: "2013-05-16",
        status: "Ended",
        originalLanguage: "en",
        popularity: 110,
        voteAverage: 8.6,
        metadata: { genres: ["Komedi"], episodeRunTime: [22] },
      },
    }),
    createMockTvItem({
      id: "rt2",
      status: "WATCHED",
      rating: "LOVE",
      tvShow: {
        id: "s-rt2",
        tmdbId: 32,
        name: "Parks and Recreation",
        originalName: "Parks and Recreation",
        firstAirDate: "2009-04-09",
        lastAirDate: "2015-02-24",
        status: "Ended",
        originalLanguage: "en",
        popularity: 85,
        voteAverage: 8.2,
        metadata: { genres: ["Komedi"], episodeRunTime: [22] },
      },
    }),
  ];
  const resShortRuntime = calculateTvTasteProfile(itemsShortRuntime);
  assert(
    resShortRuntime.episodeRuntimePreference.preference === "SHORT" && resShortRuntime.episodeRuntimePreference.avgMinutes === 22,
    "User D: Short runtime correctly detected (SHORT, 22 min)"
  );

  // 14. User E: Non-English LOVE -> Global Explorer
  const itemsInternational = [
    createMockTvItem({
      id: "int1",
      status: "WATCHED",
      rating: "LOVE",
      tvShow: {
        id: "s-int1",
        tmdbId: 41,
        name: "Dark",
        originalName: "Dark",
        firstAirDate: "2017-12-01",
        lastAirDate: "2020-06-27",
        status: "Ended",
        originalLanguage: "de",
        popularity: 95,
        voteAverage: 8.5,
        metadata: { genres: ["Gizem", "Bilim Kurgu & Fantezi"], originCountry: ["DE"] },
      },
    }),
    createMockTvItem({
      id: "int2",
      status: "WATCHED",
      rating: "LOVE",
      tvShow: {
        id: "s-int2",
        tmdbId: 42,
        name: "Squid Game",
        originalName: "Squid Game",
        firstAirDate: "2021-09-17",
        lastAirDate: "2021-09-17",
        status: "Ended",
        originalLanguage: "ko",
        popularity: 150,
        voteAverage: 8.0,
        metadata: { genres: ["Dram", "Gizem"], originCountry: ["KR"] },
      },
    }),
    createMockTvItem({
      id: "int3",
      status: "WATCHED",
      rating: "LOVE",
      tvShow: {
        id: "s-int3",
        tmdbId: 43,
        name: "Money Heist",
        originalName: "La Casa de Papel",
        firstAirDate: "2017-05-02",
        lastAirDate: "2021-12-03",
        status: "Ended",
        originalLanguage: "es",
        popularity: 120,
        voteAverage: 8.2,
        metadata: { genres: ["Suç", "Dram"], originCountry: ["ES"] },
      },
    }),
  ];
  const resInternational = calculateTvTasteProfile(itemsInternational);
  assert(
    resInternational.internationalOrientation.orientation === "GLOBAL_EXPLORER" && resInternational.internationalOrientation.nonEnglishRatio === 1.0,
    "User E: Non-English LOVE sets GLOBAL_EXPLORER orientation"
  );

  // 15. User F: Ended series positive -> Ended status preference
  const itemsEnded = [
    createMockTvItem({
      id: "end1",
      status: "WATCHED",
      rating: "LOVE",
      tvShow: {
        id: "s-end1",
        tmdbId: 51,
        name: "Breaking Bad",
        originalName: "Breaking Bad",
        firstAirDate: "2008-01-20",
        lastAirDate: "2013-09-29",
        status: "Ended",
        originalLanguage: "en",
        popularity: 180,
        voteAverage: 9.3,
        metadata: { genres: ["Dram", "Suç"], status: "Ended" },
      },
    }),
    createMockTvItem({
      id: "end2",
      status: "WATCHED",
      rating: "LOVE",
      tvShow: {
        id: "s-end2",
        tmdbId: 52,
        name: "The Wire",
        originalName: "The Wire",
        firstAirDate: "2002-06-02",
        lastAirDate: "2008-03-09",
        status: "Ended",
        originalLanguage: "en",
        popularity: 90,
        voteAverage: 8.9,
        metadata: { genres: ["Dram", "Suç"], status: "Ended" },
      },
    }),
  ];
  const resEnded = calculateTvTasteProfile(itemsEnded);
  assert(resEnded.statusPreference.preference === "ENDED", "User F: Ended series positive sets ENDED status preference");

  // 16. Confidence & Maturity progression
  const resLow = calculateTvTasteProfile([
    createMockTvItem({ id: "1", status: "WATCHED", rating: "LOVE" }),
    createMockTvItem({ id: "2", status: "WATCHED", rating: "LIKE" }),
  ]);
  assert(resLow.maturity === "INSUFFICIENT" && resLow.confidence < 0.20, "2 evidence -> INSUFFICIENT maturity & low confidence");

  const items15Answered2Evidence: TvInteractionData[] = [
    createMockTvItem({ id: "1", status: "WATCHED", rating: "LOVE" }),
    createMockTvItem({ id: "2", status: "WATCHED", rating: "LIKE" }),
    ...Array.from({ length: 13 }, (_, idx) =>
      createMockTvItem({ id: `nw-${idx}`, status: "NOT_WATCHED", rating: null })
    ),
  ];
  const res15Ans2Ev = calculateTvTasteProfile(items15Answered2Evidence);
  assert(
    res15Ans2Ev.evaluatedCount === 15 && res15Ans2Ev.evidenceCount === 2 && res15Ans2Ev.maturity === "INSUFFICIENT",
    "15 answered but 2 evidence -> still low confidence / INSUFFICIENT maturity"
  );

  const items15Ev = Array.from({ length: 15 }, (_, idx) =>
    createMockTvItem({ id: `ev15-${idx}`, status: "WATCHED", rating: "LIKE" })
  );
  const res15Ev = calculateTvTasteProfile(items15Ev);
  assert(res15Ev.maturity === "FORMING" && res15Ev.confidence >= 0.40, "15 evidence -> FORMING maturity");

  const items50Ev = Array.from({ length: 50 }, (_, idx) =>
    createMockTvItem({ id: `ev50-${idx}`, status: "WATCHED", rating: "LIKE" })
  );
  const res50Ev = calculateTvTasteProfile(items50Ev);
  assert(res50Ev.maturity === "ESTABLISHED" && res50Ev.confidence >= 0.65, "50 evidence -> ESTABLISHED maturity");

  const items150Ev = Array.from({ length: 150 }, (_, idx) =>
    createMockTvItem({ id: `ev150-${idx}`, status: "WATCHED", rating: "LIKE" })
  );
  const res150Ev = calculateTvTasteProfile(items150Ev);
  assert(res150Ev.maturity === "VERY_STRONG" && res150Ev.confidence >= 0.95, "150+ evidence -> VERY_STRONG maturity");

  // 16. Unobserved genre handling
  const resUnobserved = calculateTvTasteProfile([
    createMockTvItem({
      id: "u1",
      status: "WATCHED",
      rating: "LOVE",
      tvShow: {
        id: "s-u1",
        tmdbId: 101,
        name: "Crime Show",
        originalName: "Crime Show",
        firstAirDate: "2020-01-01",
        lastAirDate: "2020-01-01",
        status: "Ended",
        originalLanguage: "en",
        popularity: 50,
        voteAverage: 8.0,
        metadata: { genres: ["Suç"] },
      },
    }),
  ]);
  const animationG = resUnobserved.genres.find((g) => g.name === "Animasyon");
  assert(
    animationG?.state === "UNOBSERVED" && animationG?.score === -1.0 && animationG?.confidence === 0.0,
    "Unobserved genres are marked state: UNOBSERVED and score: -1.0 (never artificial 0.50)"
  );

  // 17. Archetypes maximum 3
  assert(resCrimeMystery.archetypes.length <= 3, "At most 3 archetypes returned");
  const primaries = resCrimeMystery.archetypes.filter((a) => a.isPrimary);
  assert(primaries.length <= 2, "At most 2 primary archetypes returned");

  // 18. Same-row update fingerprint staleness check
  const rowBefore = {
    tvShowId: "show-1",
    status: "PARTIALLY_WATCHED",
    rating: "LIKE",
    updatedAt: new Date("2026-08-01T10:00:00Z"),
  };
  const fpBefore = generateTvSourceFingerprint([rowBefore]);

  const rowAfter = {
    tvShowId: "show-1",
    status: "WATCHED",
    rating: "LOVE",
    updatedAt: new Date("2026-08-01T11:00:00Z"),
  };
  const fpAfter = generateTvSourceFingerprint([rowAfter]);
  assert(fpBefore !== fpAfter, "Same-row update (PARTIAL LIKE -> WATCHED LOVE) changes sourceFingerprint triggering staleness");

  console.log(`\n===============================================================`);
  console.log(`TV DNA CALCULATOR SUITE: Passed ${passed} of ${total} tests.`);
  console.log(`===============================================================\n`);
}
