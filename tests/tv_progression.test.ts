import {
  getTvRankForCount,
  getTvProgressionForCount,
  getRankForCount,
  getProgressionForCount,
} from "@/lib/progression/service";
import { TV_RANK_DEFINITIONS, RANK_DEFINITIONS } from "@/lib/progression/constants";

export function runTvProgressionTests() {
  console.log("=== TV RANK / PROGRESSION UNIT & REGRESSION TESTS ===\n");
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, message: string) {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total}: ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${message}`);
      throw new Error(`Test failed: ${message}`);
    }
  }

  // 1. Array Length and Metadata Integrity
  assert(TV_RANK_DEFINITIONS.length === 16, "TV_RANK_DEFINITIONS array contains exactly 16 ranks");
  assert(RANK_DEFINITIONS.length === 19, "Film RANK_DEFINITIONS array contains exactly 19 ranks (Film integrity)");

  // 2. All 16 TV Threshold Mapping Tests (Exact Boundaries)
  assert(getTvRankForCount(0).key === "TV_PASSENGER" && getTvRankForCount(0).label === "Dizi Yolcusu", "0 -> Dizi Yolcusu");
  assert(getTvRankForCount(9).key === "TV_PASSENGER" && getTvRankForCount(9).label === "Dizi Yolcusu", "9 -> Dizi Yolcusu");
  assert(getTvRankForCount(10).key === "TV_EXPLORER" && getTvRankForCount(10).label === "Dizi Kaşifi", "10 -> Dizi Kaşifi");
  assert(getTvRankForCount(24).key === "TV_EXPLORER" && getTvRankForCount(24).label === "Dizi Kaşifi", "24 -> Dizi Kaşifi");
  assert(getTvRankForCount(25).key === "TV_ENTHUSIAST" && getTvRankForCount(25).label === "Dizi Meraklısı", "25 -> Dizi Meraklısı");
  assert(getTvRankForCount(49).key === "TV_ENTHUSIAST" && getTvRankForCount(49).label === "Dizi Meraklısı", "49 -> Dizi Meraklısı");
  assert(getTvRankForCount(50).key === "TV_PASSIONATE" && getTvRankForCount(50).label === "Dizi Tutkunu", "50 -> Dizi Tutkunu");
  assert(getTvRankForCount(99).key === "TV_PASSIONATE" && getTvRankForCount(99).label === "Dizi Tutkunu", "99 -> Dizi Tutkunu");
  assert(getTvRankForCount(100).key === "TV_HUNTER" && getTvRankForCount(100).label === "Dizi Avcısı", "100 -> Dizi Avcısı");
  assert(getTvRankForCount(174).key === "TV_HUNTER" && getTvRankForCount(174).label === "Dizi Avcısı", "174 -> Dizi Avcısı");
  assert(getTvRankForCount(175).key === "TV_CURATOR" && getTvRankForCount(175).label === "Dizi Küratörü", "175 -> Dizi Küratörü");
  assert(getTvRankForCount(249).key === "TV_CURATOR" && getTvRankForCount(249).label === "Dizi Küratörü", "249 -> Dizi Küratörü");
  assert(getTvRankForCount(250).key === "TV_EXPERT" && getTvRankForCount(250).label === "Dizi Uzmanı", "250 -> Dizi Uzmanı");
  assert(getTvRankForCount(399).key === "TV_EXPERT" && getTvRankForCount(399).label === "Dizi Uzmanı", "399 -> Dizi Uzmanı");
  assert(getTvRankForCount(400).key === "TV_ARCHIVIST" && getTvRankForCount(400).label === "Dizi Arşivcisi", "400 -> Dizi Arşivcisi");
  assert(getTvRankForCount(599).key === "TV_ARCHIVIST" && getTvRankForCount(599).label === "Dizi Arşivcisi", "599 -> Dizi Arşivcisi");
  assert(getTvRankForCount(600).key === "TV_CRITIC" && getTvRankForCount(600).label === "Dizi Eleştirmeni", "600 -> Dizi Eleştirmeni");
  assert(getTvRankForCount(999).key === "TV_CRITIC" && getTvRankForCount(999).label === "Dizi Eleştirmeni", "999 -> Dizi Eleştirmeni");
  assert(getTvRankForCount(1000).key === "TV_MASTER" && getTvRankForCount(1000).label === "Dizi Ustası", "1000 -> Dizi Ustası");
  assert(getTvRankForCount(1499).key === "TV_MASTER" && getTvRankForCount(1499).label === "Dizi Ustası", "1499 -> Dizi Ustası");
  assert(getTvRankForCount(1500).key === "TV_ARCHAEOLOGIST" && getTvRankForCount(1500).label === "Dizi Arkeoloğu", "1500 -> Dizi Arkeoloğu");
  assert(getTvRankForCount(1999).key === "TV_ARCHAEOLOGIST" && getTvRankForCount(1999).label === "Dizi Arkeoloğu", "1999 -> Dizi Arkeoloğu");
  assert(getTvRankForCount(2000).key === "TV_ENCYCLOPEDIA" && getTvRankForCount(2000).label === "Dizi Ansiklopedisi", "2000 -> Dizi Ansiklopedisi");
  assert(getTvRankForCount(2999).key === "TV_ENCYCLOPEDIA" && getTvRankForCount(2999).label === "Dizi Ansiklopedisi", "2999 -> Dizi Ansiklopedisi");
  assert(getTvRankForCount(3000).key === "GRAND_TV_ARCHIVIST" && getTvRankForCount(3000).label === "Büyük Dizi Arşivcisi", "3000 -> Büyük Dizi Arşivcisi");
  assert(getTvRankForCount(4999).key === "GRAND_TV_ARCHIVIST" && getTvRankForCount(4999).label === "Büyük Dizi Arşivcisi", "4999 -> Büyük Dizi Arşivcisi");
  assert(getTvRankForCount(5000).key === "TV_VIRTUOSO" && getTvRankForCount(5000).label === "Dizi Üstadı", "5000 -> Dizi Üstadı");
  assert(getTvRankForCount(7499).key === "TV_VIRTUOSO" && getTvRankForCount(7499).label === "Dizi Üstadı", "7499 -> Dizi Üstadı");
  assert(getTvRankForCount(7500).key === "TV_LEGEND" && getTvRankForCount(7500).label === "Dizi Efsanesi", "7500 -> Dizi Efsanesi");
  assert(getTvRankForCount(9999).key === "TV_LEGEND" && getTvRankForCount(9999).label === "Dizi Efsanesi", "9999 -> Dizi Efsanesi");
  assert(getTvRankForCount(10000).key === "LIVING_TV_ARCHIVE" && getTvRankForCount(10000).label === "Yaşayan Dizi Arşivi", "10000 -> Yaşayan Dizi Arşivi");
  assert(getTvRankForCount(50000).key === "LIVING_TV_ARCHIVE" && getTvRankForCount(50000).label === "Yaşayan Dizi Arşivi", "50000 -> Yaşayan Dizi Arşivi");

  // 3. User Progression Details for Mandatory Milestones
  // 0 -> Dizi Yolcusu / next Dizi Kaşifi (10)
  const user0 = getTvProgressionForCount(0);
  assert(user0.currentRank.label === "Dizi Yolcusu", "0 count currentRank is Dizi Yolcusu");
  assert(user0.nextRank?.label === "Dizi Kaşifi", "0 count nextRank is Dizi Kaşifi");
  assert(user0.nextRank?.minimum === 10, "0 count nextRank minimum is 10");
  assert(user0.remaining === 10, "0 count remaining is 10");
  assert(user0.progress === 0.0, "0 count progress is 0.0");
  assert(!user0.isMaxRank, "0 count is not max rank");

  // 10 -> Dizi Kaşifi / next Dizi Meraklısı (25)
  const user10 = getTvProgressionForCount(10);
  assert(user10.currentRank.label === "Dizi Kaşifi", "10 count currentRank is Dizi Kaşifi");
  assert(user10.nextRank?.label === "Dizi Meraklısı", "10 count nextRank is Dizi Meraklısı");
  assert(user10.nextRank?.minimum === 25, "10 count nextRank minimum is 25");
  assert(user10.remaining === 15, "10 count remaining is 15 (25 - 10)");
  assert(user10.progress === 0.0, "10 count progress is 0.0");

  // 24 -> Dizi Kaşifi / next 25
  const user24 = getTvProgressionForCount(24);
  assert(user24.currentRank.label === "Dizi Kaşifi", "24 count currentRank is Dizi Kaşifi");
  assert(user24.nextRank?.label === "Dizi Meraklısı", "24 count nextRank is Dizi Meraklısı");
  assert(user24.remaining === 1, "24 count remaining is 1");
  assert(user24.progress === 0.93, `24 count progress is 0.93 (14/15, got ${user24.progress})`);

  // 25 -> Dizi Meraklısı / next 50
  const user25 = getTvProgressionForCount(25);
  assert(user25.currentRank.label === "Dizi Meraklısı", "25 count currentRank is Dizi Meraklısı");
  assert(user25.nextRank?.label === "Dizi Tutkunu", "25 count nextRank is Dizi Tutkunu (50)");
  assert(user25.remaining === 25, "25 count remaining is 25 (50 - 25)");

  // 99 -> Dizi Tutkunu / next 100
  const user99 = getTvProgressionForCount(99);
  assert(user99.currentRank.label === "Dizi Tutkunu", "99 count currentRank is Dizi Tutkunu");
  assert(user99.nextRank?.label === "Dizi Avcısı", "99 count nextRank is Dizi Avcısı (100)");
  assert(user99.remaining === 1, "99 count remaining is 1");

  // 100 -> Dizi Avcısı / next 175
  const user100 = getTvProgressionForCount(100);
  assert(user100.currentRank.label === "Dizi Avcısı", "100 count currentRank is Dizi Avcısı");
  assert(user100.nextRank?.label === "Dizi Küratörü", "100 count nextRank is Dizi Küratörü (175)");
  assert(user100.remaining === 75, "100 count remaining is 75");

  // 353 -> Dizi Uzmanı (250) / next Dizi Arşivcisi (400)
  const user353 = getTvProgressionForCount(353);
  assert(user353.currentRank.label === "Dizi Uzmanı", "353 count currentRank is Dizi Uzmanı");
  assert(user353.currentRank.minimum === 250, "353 count currentRank minimum is 250");
  assert(user353.previousRank?.label === "Dizi Küratörü", "353 count previousRank is Dizi Küratörü");
  assert(user353.nextRank?.label === "Dizi Arşivcisi", "353 count nextRank is Dizi Arşivcisi");
  assert(user353.nextRank?.minimum === 400, "353 count nextRank minimum is 400");
  assert(user353.remaining === 47, "353 count remaining is 47 (400 - 353 = 47)");
  assert(user353.progress === 0.69, `353 count progress is 0.69 (103/150 = 0.6866..., got ${user353.progress})`);

  // 400 -> Dizi Arşivcisi
  const user400 = getTvProgressionForCount(400);
  assert(user400.currentRank.label === "Dizi Arşivcisi", "400 count currentRank is Dizi Arşivcisi");
  assert(user400.nextRank?.label === "Dizi Eleştirmeni", "400 count nextRank is Dizi Eleştirmeni (600)");
  assert(user400.remaining === 200, "400 count remaining is 200");

  // 10000+ -> Yaşayan Dizi Arşivi (Max Rank)
  const user10000 = getTvProgressionForCount(10000);
  assert(user10000.currentRank.label === "Yaşayan Dizi Arşivi", "10000 count currentRank is Yaşayan Dizi Arşivi");
  assert(user10000.isMaxRank === true, "10000 count isMaxRank is true");
  assert(user10000.nextRank === null, "10000 count nextRank is null");
  assert(user10000.remaining === 0, "10000 count remaining is 0");
  assert(user10000.progress === 1.0, "10000 count progress is 1.0");

  // 4. UI Formatting Validation
  const headerTvPillText = `${user353.currentRank.label} • ${user353.evaluatedCount}/${user353.nextRank?.minimum}`;
  assert(headerTvPillText === "Dizi Uzmanı • 353/400", `Header pill text is 'Dizi Uzmanı • 353/400' (got '${headerTvPillText}')`);

  // 5. Film Regression Safety Check
  const filmProg2100 = getProgressionForCount(2100);
  assert(filmProg2100.currentRank.label === "Baş Küratör", "Film 2100 count is Baş Küratör");

  console.log(`\nRESULTS: Passed ${passed} of ${total} TV progression tests.\n`);
}

if (process.argv[1]?.includes("tv_progression.test.ts")) {
  runTvProgressionTests();
}
