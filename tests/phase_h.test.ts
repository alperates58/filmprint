import {
  computeCalibrationPriorityScore,
  generateSearchNormalizedTitle,
} from "@/lib/calibration/priority";
import {
  getMovieConfidenceLevel,
  getTvConfidenceLevel,
  CALIBRATION_THRESHOLDS,
} from "@/lib/calibration/confidence";
import { scoreCandidateMovie } from "@/lib/calibration/scoring";
import {
  evaluateContentSafety,
  normalizeAgeCertification,
  isCandidateBlocked,
} from "@/lib/content/safety";
import {
  getCanonicalUtcUsageDate,
  getNextUtcMidnightIso,
} from "@/lib/entitlements/service";
import { ContentSafetyLevel } from "@prisma/client";
import { CandidateMovie, UserTasteProfileInput } from "@/lib/calibration/types";

export function runPhaseHTests() {
  console.log("=== SINEAI — PHASE H MASTER INTELLIGENCE, SAFETY & RANK V2 TESTS ===\n");
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

  // 1. Priority Scoring & Classic Boost
  const topMovie = computeCalibrationPriorityScore({
    popularity: 150,
    voteAverage: 8.5,
    voteCount: 25000,
    releaseYear: 2010,
    safetyLevel: ContentSafetyLevel.SAFE,
  });
  const obscureMovie = computeCalibrationPriorityScore({
    popularity: 0.5,
    voteAverage: 3.0,
    voteCount: 3,
    releaseYear: 1995,
    safetyLevel: ContentSafetyLevel.SAFE,
  });
  assert(topMovie > obscureMovie, "Top movie priority score > obscure movie score");
  assert(topMovie > 0.7, "Top movie score is > 0.7");
  assert(obscureMovie < 0.4, "Obscure movie score is < 0.4");

  const classicGodfather = computeCalibrationPriorityScore({
    popularity: 45,
    voteAverage: 8.7,
    voteCount: 18000,
    releaseYear: 1972,
    safetyLevel: ContentSafetyLevel.SAFE,
  });
  assert(classicGodfather > 0.78, "Classic pre-1980 masterpiece receives boost (>0.78)");

  const adultScore = computeCalibrationPriorityScore({
    popularity: 200,
    voteAverage: 9.0,
    voteCount: 50000,
    releaseYear: 2020,
    safetyLevel: ContentSafetyLevel.ADULT,
    adult: true,
  });
  assert(adultScore < 0, "Adult content is clamped to negative priority score");

  // 2. Search Title Normalization
  const normalized = generateSearchNormalizedTitle("Kış Uykusu", "Winter Sleep", "Winter Sleep");
  assert(normalized.includes("kis uykusu"), "Normalized search title folds Turkish characters");
  assert(normalized.includes("winter sleep"), "Normalized search title includes alternative title");

  // 3. 5-Level Confidence Mapping
  assert(getMovieConfidenceLevel(0).level === "STARTER", "Movie 0 -> STARTER");
  assert(getMovieConfidenceLevel(7).level === "STARTER", "Movie 7 -> STARTER");
  assert(getMovieConfidenceLevel(8).level === "DEVELOPING", "Movie 8 -> DEVELOPING");
  assert(getMovieConfidenceLevel(14).level === "DEVELOPING", "Movie 14 -> DEVELOPING");
  assert(getMovieConfidenceLevel(15).level === "ESTABLISHED", "Movie 15 -> ESTABLISHED");
  assert(getMovieConfidenceLevel(24).level === "ESTABLISHED", "Movie 24 -> ESTABLISHED");
  assert(getMovieConfidenceLevel(25).level === "STRONG", "Movie 25 -> STRONG");
  assert(getMovieConfidenceLevel(39).level === "STRONG", "Movie 39 -> STRONG");
  assert(getMovieConfidenceLevel(40).level === "VERY_STRONG", "Movie 40 -> VERY_STRONG");

  assert(getTvConfidenceLevel(0).level === "STARTER", "TV 0 -> STARTER");
  assert(getTvConfidenceLevel(4).level === "STARTER", "TV 4 -> STARTER");
  assert(getTvConfidenceLevel(5).level === "DEVELOPING", "TV 5 -> DEVELOPING");
  assert(getTvConfidenceLevel(9).level === "DEVELOPING", "TV 9 -> DEVELOPING");
  assert(getTvConfidenceLevel(10).level === "ESTABLISHED", "TV 10 -> ESTABLISHED");
  assert(getTvConfidenceLevel(14).level === "ESTABLISHED", "TV 14 -> ESTABLISHED");
  assert(getTvConfidenceLevel(15).level === "STRONG", "TV 15 -> STRONG");
  assert(getTvConfidenceLevel(24).level === "STRONG", "TV 24 -> STRONG");
  assert(getTvConfidenceLevel(25).level === "VERY_STRONG", "TV 25 -> VERY_STRONG");

  // 4. Content Safety V2 & Age Normalization
  assert(normalizeAgeCertification("Genel İzleyici", "TR").normalizedMinimumAge === 0, "TR Genel İzleyici -> 0");
  assert(normalizeAgeCertification("13+", "TR").normalizedMinimumAge === 13, "TR 13+ -> 13");
  assert(normalizeAgeCertification("18+", "TR").normalizedMinimumAge === 18, "TR 18+ -> 18");
  assert(normalizeAgeCertification("R", "US").normalizedMinimumAge === 17, "US R -> 17");
  assert(normalizeAgeCertification("TV-MA", "US").normalizedMinimumAge === 17, "US TV-MA -> 17");

  const savingPrivateRyan = evaluateContentSafety({
    title: "Saving Private Ryan",
    contentRating: "R",
    normalizedMinimumAge: 17,
    overview: "Captain Miller leads his unit behind enemy lines during WWII...",
    genres: [28, 18, 10752],
  });
  assert(savingPrivateRyan.safetyLevel === ContentSafetyLevel.MATURE, "Saving Private Ryan is MATURE, NOT EROTIC/ADULT");
  assert(!isCandidateBlocked(savingPrivateRyan), "Saving Private Ryan is NOT blocked from calibration");

  const fightClub = evaluateContentSafety({
    title: "Fight Club",
    contentRating: "R",
    normalizedMinimumAge: 17,
    overview: "An insomniac office worker looking for a way to change his life...",
    genres: [18],
  });
  assert(fightClub.safetyLevel === ContentSafetyLevel.MATURE, "Fight Club is MATURE");
  assert(!isCandidateBlocked(fightClub), "Fight Club is NOT blocked");

  const eroticResult = evaluateContentSafety({
    title: "Sensual Nights",
    overview: "An erotic romantic encounter in Paris with softcore scenes.",
  });
  assert(eroticResult.safetyLevel === ContentSafetyLevel.EROTIC, "Erotic softcore is classified as EROTIC");
  assert(isCandidateBlocked(eroticResult), "Erotic content is hard BLOCKED");

  // 5. Entitlements & UTC Date Quotas
  const utcDate = getCanonicalUtcUsageDate();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(utcDate), "getCanonicalUtcUsageDate returns YYYY-MM-DD format");

  const nextMidnight = getNextUtcMidnightIso();
  const parsedMidnight = new Date(nextMidnight);
  assert(parsedMidnight.getUTCHours() === 0, "Next midnight UTC hours is 0");
  assert(parsedMidnight.getTime() > Date.now(), "Next midnight is in the future");

  // 6. Adaptive Familiarity Scoring
  const sampleCandidate: CandidateMovie = {
    id: "m-test",
    tmdbId: 9999,
    title: "Interstellar",
    originalTitle: "Interstellar",
    englishTitle: "Interstellar",
    releaseYear: 2014,
    popularity: 180,
    voteAverage: 8.6,
    voteCount: 32000,
    posterPath: "/poster.jpg",
    backdropPath: null,
    genres: ["Bilim Kurgu"],
    overview: "A team of explorers travel through a wormhole...",
    metadata: { genreIds: [878] },
  };

  const dummyProfile: UserTasteProfileInput = {
    totalRatedCount: 15,
    genres: [{ name: "Bilim Kurgu", score: 0.8, ratedCount: 10, exposureCount: 12 }],
    eras: [{ key: "2010s", label: "2010'lar", score: 0.8, ratedCount: 10 }],
  };

  const recoveryScore = scoreCandidateMovie(sampleCandidate, dummyProfile, [], "FAMILIARITY_RECOVERY");
  const deepeningScore = scoreCandidateMovie(sampleCandidate, dummyProfile, [], "DEEPENING");
  assert(recoveryScore.score > deepeningScore.score, "FAMILIARITY_RECOVERY boosts high popularity candidate over DEEPENING");

  // Coverage Threshold Invariants
  const { COVERAGE_THRESHOLDS } = require("@/lib/calibration/coverage");
  assert(COVERAGE_THRESHOLDS.MIN_PROCESSED_COVERAGE === 0.95, "Minimum processed coverage is exactly 95%");
  assert(COVERAGE_THRESHOLDS.MIN_SEARCH_COVERAGE === 0.90, "Minimum search coverage is exactly 90%");
  assert(COVERAGE_THRESHOLDS.MIN_GENRE_COVERAGE === 0.85, "Minimum genre coverage is exactly 85%");
  assert(COVERAGE_THRESHOLDS.MAX_FAILED_RATIO === 0.01, "Maximum failed ratio is exactly 1%");

  // Legacy Adult Signal Resolution Tests
  const { resolveLegacyAdultSignal } = require("@/scripts/backfill-phase-h");
  
  // A. Legacy Movie: physical adult=false, metadata adult=true -> resolved adult=true
  const legacyMovieAdult = resolveLegacyAdultSignal(false, { adult: true });
  assert(legacyMovieAdult === true, "Legacy Movie with metadata adult=true resolves to adult=true");
  const movieSafety = evaluateContentSafety({
    adult: legacyMovieAdult,
    contentRating: null,
    title: "Legacy Adult Movie",
  });
  assert(movieSafety.safetyLevel === "ADULT", "Safety evaluation receives resolved adult=true and returns ADULT");

  // B. Legacy TV: physical adult=false, raw_tmdb adult=true -> resolved adult=true
  const legacyTvAdult = resolveLegacyAdultSignal(false, { raw_tmdb: { adult: true } });
  assert(legacyTvAdult === true, "Legacy TV with raw_tmdb adult=true resolves to adult=true");

  // C. Existing physical adult=true is NEVER downgraded
  const preservedAdult = resolveLegacyAdultSignal(true, { adult: false });
  assert(preservedAdult === true, "Existing physical adult=true is preserved and never downgraded to false");

  // Clean record without adult signals resolves to false
  const cleanAdult = resolveLegacyAdultSignal(false, { adult: false, overview: "Family friendly film" });
  assert(cleanAdult === false, "Clean record without adult signals resolves to false");

  // Exhaustive Safety Classification Counters Invariant
  function classifySafetyLevelForStats(level: ContentSafetyLevel, stats: { safe: number; mature: number; blocked: number; unknown: number }) {
    if (level === ContentSafetyLevel.SAFE) stats.safe++;
    else if (level === ContentSafetyLevel.MATURE) stats.mature++;
    else if (level === ContentSafetyLevel.UNKNOWN) stats.unknown++;
    else if (
      level === ContentSafetyLevel.SEXUAL_CONTENT ||
      level === ContentSafetyLevel.EROTIC ||
      level === ContentSafetyLevel.ADULT
    ) {
      stats.blocked++;
    }
  }

  const testStats = { safe: 0, mature: 0, blocked: 0, unknown: 0 };
  classifySafetyLevelForStats(ContentSafetyLevel.SAFE, testStats);
  classifySafetyLevelForStats(ContentSafetyLevel.MATURE, testStats);
  classifySafetyLevelForStats(ContentSafetyLevel.UNKNOWN, testStats);
  classifySafetyLevelForStats(ContentSafetyLevel.SEXUAL_CONTENT, testStats);
  classifySafetyLevelForStats(ContentSafetyLevel.EROTIC, testStats);
  classifySafetyLevelForStats(ContentSafetyLevel.ADULT, testStats);

  // D. UNKNOWN safety increments unknownCount
  assert(testStats.unknown === 1, "UNKNOWN safety increments unknownCount");

  // E. SEXUAL_CONTENT / EROTIC / ADULT increment blockedCount
  assert(testStats.blocked === 3, "SEXUAL_CONTENT, EROTIC, and ADULT increment blockedCount");

  // F. SAFE and MATURE remain separate
  assert(testStats.safe === 1, "SAFE increments safe count separately");
  assert(testStats.mature === 1, "MATURE increments mature count separately");

  // TV Genre Aliases Regression Tests
  const { resolveCanonicalGenreIds } = require("@/lib/catalog/genres");
  
  // Required TV aliases
  const realityIds = resolveCanonicalGenreIds(["Gerçeklik"], "TV");
  assert(realityIds.length === 1 && realityIds[0] === 10764, "Gerçeklik resolves to canonical TV Reality ID 10764");

  const talkIds = resolveCanonicalGenreIds(["Talk"], "TV");
  assert(talkIds.length === 1 && talkIds[0] === 10767, "Talk resolves to canonical TV Talk Show ID 10767");

  const sciFiFantasyIds = resolveCanonicalGenreIds(["Bilim Kurgu & Fantazi"], "TV");
  assert(sciFiFantasyIds.length === 1 && sciFiFantasyIds[0] === 10765, "Bilim Kurgu & Fantazi resolves to canonical TV ID 10765");

  const kidsIds = resolveCanonicalGenreIds(["Çocuklar"], "TV");
  assert(kidsIds.length === 1 && kidsIds[0] === 10762, "Çocuklar resolves to canonical TV Çocuk ID 10762");

  const warPoliticsIds = resolveCanonicalGenreIds(["Savaş & Politik"], "TV");
  assert(warPoliticsIds.length === 1 && warPoliticsIds[0] === 10768, "Savaş & Politik resolves to canonical TV ID 10768");

  // Canonical names and numeric IDs still resolve
  const canonicalReality = resolveCanonicalGenreIds(["Reality"], "TV");
  assert(canonicalReality.length === 1 && canonicalReality[0] === 10764, "Canonical name Reality resolves to 10764");

  const numericId = resolveCanonicalGenreIds([10764], "TV");
  assert(numericId.length === 1 && numericId[0] === 10764, "Numeric ID 10764 resolves to 10764");

  // Aliases do not create duplicate IDs
  const deduplicated = resolveCanonicalGenreIds(["Reality", "Gerçeklik", "gerceklik", 10764], "TV");
  assert(deduplicated.length === 1 && deduplicated[0] === 10764, "Mixed canonical, alias and numeric ID produces exactly 1 deduplicated ID");

  // Unsupported TV genres Tarih / Romantik are not guessed into unrelated IDs
  const unsupportedTvHistory = resolveCanonicalGenreIds(["Tarih"], "TV");
  assert(unsupportedTvHistory.length === 0, "Unsupported TV Tarih is not guessed into an unrelated TV ID");

  const unsupportedTvRomance = resolveCanonicalGenreIds(["Romantik"], "TV");
  assert(unsupportedTvRomance.length === 0, "Unsupported TV Romantik is not guessed into an unrelated TV ID");

  // But in FILM, Tarih and Romantik resolve to valid movie genre IDs
  const movieHistory = resolveCanonicalGenreIds(["Tarih"], "FILM");
  assert(movieHistory.length === 1 && movieHistory[0] === 36, "In FILM, Tarih resolves to 36");

  const movieRomance = resolveCanonicalGenreIds(["Romantik"], "FILM");
  assert(movieRomance.length === 1 && movieRomance[0] === 10749, "In FILM, Romantik resolves to 10749");

  console.log(`\nPhase H Tests completed: ${passed}/${total} passed.\n`);
}

if (process.argv[1]?.includes("phase_h.test.ts")) {
  runPhaseHTests();
}
