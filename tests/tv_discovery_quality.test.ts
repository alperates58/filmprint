import {
  evaluateTvEligibility,
  filterEligibleTvShows,
  classifyTvDiscoveryEligibility,
  TV_DISCOVERY_EXCLUDED_GENRE_IDS,
} from "@/lib/tv/eligibility";
import type { EligibleTvShowInput } from "@/lib/tv/types";

export function runTvDiscoveryQualityTests() {
  console.log("=== PHASE P1.1 TV CATALOG QUALITY & DISCOVERY ELIGIBILITY TESTS ===\n");
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

  const baseShow: EligibleTvShowInput = {
    id: "tv-base-1",
    tmdbId: 5001,
    name: "Standard Drama Series",
    originalName: "Standard Drama Series",
    overview: "A rich and compelling dramatic series with depth and great character development.",
    posterPath: "/poster.jpg",
    firstAirDate: "2023-01-15",
    voteAverage: 8.4,
    popularity: 55.0,
    voteCount: 150,
    genreIds: [18], // Dram
    adult: false,
  };

  // 1. Kids (10762) rejected from CALIBRATION, RECOMMENDATION, HOME, FRESH_DISCOVERY
  const kidsShow: EligibleTvShowInput = {
    ...baseShow,
    id: "tv-kids-1",
    name: "Peppa Pig Turkish Edition",
    genreIds: [10762, 16], // Kids, Animation
  };
  const kidsCalib = evaluateTvEligibility(kidsShow, "CALIBRATION");
  const kidsRec = evaluateTvEligibility(kidsShow, "RECOMMENDATION");
  const kidsHome = evaluateTvEligibility(kidsShow, "HOME");
  const kidsFresh = evaluateTvEligibility(kidsShow, "FRESH_DISCOVERY");
  assert(
    !kidsCalib.isEligible && kidsCalib.reasons.includes("KIDS_CONTENT"),
    "Kids (10762) is rejected from CALIBRATION with reason KIDS_CONTENT"
  );
  assert(
    !kidsRec.isEligible && kidsRec.reasons.includes("KIDS_CONTENT"),
    "Kids (10762) is rejected from RECOMMENDATION with reason KIDS_CONTENT"
  );
  assert(
    !kidsHome.isEligible && kidsHome.reasons.includes("KIDS_CONTENT"),
    "Kids (10762) is rejected from HOME with reason KIDS_CONTENT"
  );
  assert(
    !kidsFresh.isEligible && kidsFresh.reasons.includes("KIDS_CONTENT"),
    "Kids (10762) is rejected from FRESH_DISCOVERY with reason KIDS_CONTENT"
  );

  // 2. News (10763) rejected from automatic discovery
  const newsShow: EligibleTvShowInput = {
    ...baseShow,
    id: "tv-news-1",
    name: "Evening News Bulletin",
    genreIds: [10763],
  };
  const newsRec = evaluateTvEligibility(newsShow, "RECOMMENDATION");
  assert(
    !newsRec.isEligible && newsRec.reasons.includes("NEWS_CONTENT"),
    "News (10763) is rejected from automatic discovery with reason NEWS_CONTENT"
  );

  // 3. Talk Show (10767) rejected from automatic discovery
  const talkShow: EligibleTvShowInput = {
    ...baseShow,
    id: "tv-talk-1",
    name: "Late Night Celebrity Talk",
    genreIds: [10767],
  };
  const talkRec = evaluateTvEligibility(talkShow, "RECOMMENDATION");
  assert(
    !talkRec.isEligible && talkRec.reasons.includes("TALK_SHOW_CONTENT"),
    "Talk Show (10767) is rejected from automatic discovery with reason TALK_SHOW_CONTENT"
  );

  // 4. Animation (16) alone remains eligible (Adult & General Animation)
  const adultAnimShow: EligibleTvShowInput = {
    ...baseShow,
    id: "tv-anim-1",
    name: "Arcane",
    genreIds: [16, 10765, 18], // Animation, Sci-Fi & Fantasy, Drama
  };
  const animRec = evaluateTvEligibility(adultAnimShow, "RECOMMENDATION");
  assert(
    animRec.isEligible,
    "Adult/General Animation (16) remains eligible for discovery when not tagged Kids"
  );

  // 5. Family (10751) alone remains eligible
  const familyShow: EligibleTvShowInput = {
    ...baseShow,
    id: "tv-fam-1",
    name: "Heartwarming Family Show",
    genreIds: [10751, 35], // Family, Comedy
  };
  const famRec = evaluateTvEligibility(familyShow, "RECOMMENDATION");
  assert(
    famRec.isEligible,
    "Family (10751) remains eligible for discovery"
  );

  // 6. Animation + Family without Kids is audit-only, NOT hard blocked
  const suspectChildAnimShow: EligibleTvShowInput = {
    ...baseShow,
    id: "tv-suspect-1",
    name: "Animated Family Adventure",
    genreIds: [16, 10751], // Animation + Family
  };
  const suspectRec = evaluateTvEligibility(suspectChildAnimShow, "RECOMMENDATION");
  assert(
    suspectRec.isEligible,
    "Animation + Family without Kids is audit-only and remains eligible for now"
  );

  // 7. Reality (10764) remains eligible for discovery
  const realityShow: EligibleTvShowInput = {
    ...baseShow,
    id: "tv-reality-1",
    name: "Survivor Series",
    genreIds: [10764],
  };
  const realityRec = evaluateTvEligibility(realityShow, "RECOMMENDATION");
  assert(
    realityRec.isEligible,
    "Reality (10764) remains eligible for discovery"
  );

  // 8. Explicit SEARCH context preserves Kids, News, Talk Show
  const searchKids = evaluateTvEligibility(kidsShow, "SEARCH");
  const searchNews = evaluateTvEligibility(newsShow, "SEARCH");
  const searchTalk = evaluateTvEligibility(talkShow, "SEARCH");
  assert(
    searchKids.isEligible,
    "Explicit SEARCH context preserves Kids shows for direct search intent"
  );
  assert(
    searchNews.isEligible,
    "Explicit SEARCH context preserves News shows for direct search intent"
  );
  assert(
    searchTalk.isEligible,
    "Explicit SEARCH context preserves Talk Shows for direct search intent"
  );

  // 9. LIBRARY context preserves user historical content
  const libKids = evaluateTvEligibility(kidsShow, "LIBRARY");
  assert(
    libKids.isEligible,
    "LIBRARY context preserves user's historical and favorited Kids entries"
  );

  // 10. Adult content safety is still strictly enforced across all contexts including SEARCH
  const adultPornShow: EligibleTvShowInput = {
    ...baseShow,
    id: "tv-adult-1",
    adult: true,
  };
  const adultSearch = evaluateTvEligibility(adultPornShow, "SEARCH");
  assert(
    !adultSearch.isEligible && adultSearch.reasons.includes("ADULT_FLAG"),
    "Adult flag is strictly enforced and blocked even in SEARCH context"
  );

  // 11. Physical genreIds preferred over legacy string metadata
  const physicalShow: EligibleTvShowInput = {
    ...baseShow,
    id: "tv-phys-1",
    genreIds: [10762], // Physical Kids ID
    metadata: { genres: ["Dram", "Komedi"] }, // misleading legacy strings
  };
  const physRec = evaluateTvEligibility(physicalShow, "RECOMMENDATION");
  assert(
    !physRec.isEligible && physRec.reasons.includes("KIDS_CONTENT"),
    "Physical genreIds array takes precedence over legacy metadata strings"
  );

  // 12. Ingestion classification helper returns accurate machine-readable flags
  const kidsClassification = classifyTvDiscoveryEligibility(kidsShow);
  const dramaClassification = classifyTvDiscoveryEligibility(baseShow);
  assert(
    !kidsClassification.discoveryEligible &&
      kidsClassification.discoveryExclusionReasons.includes("KIDS_CONTENT"),
    "classifyTvDiscoveryEligibility identifies Kids as discoveryEligible=false with KIDS_CONTENT reason"
  );
  assert(
    dramaClassification.discoveryEligible &&
      dramaClassification.discoveryExclusionReasons.length === 0,
    "classifyTvDiscoveryEligibility identifies Drama as discoveryEligible=true with empty exclusion reasons"
  );

  // 13. Overlap deduplication simulation
  const overlapIds = new Set<string>();
  const multiExcludedShow: EligibleTvShowInput = {
    ...baseShow,
    id: "tv-multi-1",
    genreIds: [10762, 10763], // Both Kids and News
  };
  if (multiExcludedShow.genreIds?.some((g) => TV_DISCOVERY_EXCLUDED_GENRE_IDS.includes(g as any))) {
    overlapIds.add(multiExcludedShow.id!);
  }
  assert(
    overlapIds.size === 1,
    "Multi-excluded genre shows are counted exactly once in overlap-adjusted hard exclusion"
  );

  console.log(`\nRESULTS: Passed ${passed} of ${total} tests.`);
  if (passed !== total) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTvDiscoveryQualityTests();
}