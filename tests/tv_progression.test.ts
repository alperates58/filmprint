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
  assert(getTvRankForCount(14).key === "TV_PASSENGER" && getTvRankForCount(14).label === "Dizi Yolcusu", "14 -> Dizi Yolcusu");
  assert(getTvRankForCount(15).key === "TV_EXPLORER" && getTvRankForCount(15).label === "Dizi Kaşifi", "15 -> Dizi Kaşifi");
  assert(getTvRankForCount(29).key === "TV_EXPLORER" && getTvRankForCount(29).label === "Dizi Kaşifi", "29 -> Dizi Kaşifi");
  assert(getTvRankForCount(30).key === "TV_ENTHUSIAST" && getTvRankForCount(30).label === "Dizi Meraklısı", "30 -> Dizi Meraklısı");
  assert(getTvRankForCount(49).key === "TV_ENTHUSIAST" && getTvRankForCount(49).label === "Dizi Meraklısı", "49 -> Dizi Meraklısı");
  assert(getTvRankForCount(50).key === "TV_PASSIONATE" && getTvRankForCount(50).label === "Dizi Tutkunu", "50 -> Dizi Tutkunu");
  assert(getTvRankForCount(99).key === "TV_PASSIONATE" && getTvRankForCount(99).label === "Dizi Tutkunu", "99 -> Dizi Tutkunu");
  assert(getTvRankForCount(100).key === "TV_HUNTER" && getTvRankForCount(100).label === "Dizi Avcısı", "100 -> Dizi Avcısı");
  assert(getTvRankForCount(149).key === "TV_HUNTER" && getTvRankForCount(149).label === "Dizi Avcısı", "149 -> Dizi Avcısı");
  assert(getTvRankForCount(150).key === "TV_CURATOR" && getTvRankForCount(150).label === "Dizi Küratörü", "150 -> Dizi Küratörü");
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
  // 0 -> Dizi Yolcusu / next Dizi Kaşifi (15)
  const user0 = getTvProgressionForCount(0);
  assert(user0.currentRank.label === "Dizi Yolcusu", "0 count currentRank is Dizi Yolcusu");
  assert(user0.nextRank?.label === "Dizi Kaşifi", "0 count nextRank is Dizi Kaşifi");
  assert(user0.nextRank?.minimum === 15, "0 count nextRank minimum is 15");
  assert(user0.remaining === 15, "0 count remaining is 15");
  assert(user0.progress === 0.0, "0 count progress is 0.0");
  assert(!user0.isMaxRank, "0 count is not max rank");

  // 15 -> Dizi Kaşifi / next Dizi Meraklısı (30)
  const user15 = getTvProgressionForCount(15);
  assert(user15.currentRank.label === "Dizi Kaşifi", "15 count currentRank is Dizi Kaşifi");
  assert(user15.nextRank?.label === "Dizi Meraklısı", "15 count nextRank is Dizi Meraklısı");
  assert(user15.nextRank?.minimum === 30, "15 count nextRank minimum is 30");
  assert(user15.remaining === 15, "15 count remaining is 15 (30 - 15)");
  assert(user15.progress === 0.0, "15 count progress is 0.0");

  // 29 -> Dizi Kaşifi / next 30
  const user29 = getTvProgressionForCount(29);
  assert(user29.currentRank.label === "Dizi Kaşifi", "29 count currentRank is Dizi Kaşifi");
  assert(user29.nextRank?.label === "Dizi Meraklısı", "29 count nextRank is Dizi Meraklısı");
  assert(user29.remaining === 1, "29 count remaining is 1");
  assert(user29.progress === 0.93, `29 count progress is 0.93 (14/15, got ${user29.progress})`);

  // 30 -> Dizi Meraklısı / next 50
  const user30 = getTvProgressionForCount(30);
  assert(user30.currentRank.label === "Dizi Meraklısı", "30 count currentRank is Dizi Meraklısı");
  assert(user30.nextRank?.label === "Dizi Tutkunu", "30 count nextRank is Dizi Tutkunu (50)");
  assert(user30.remaining === 20, "30 count remaining is 20 (50 - 30)");

  // 99 -> Dizi Tutkunu / next 100
  const user99 = getTvProgressionForCount(99);
  assert(user99.currentRank.label === "Dizi Tutkunu", "99 count currentRank is Dizi Tutkunu");
  assert(user99.nextRank?.label === "Dizi Avcısı", "99 count nextRank is Dizi Avcısı (100)");
  assert(user99.remaining === 1, "99 count remaining is 1");

  // 100 -> Dizi Avcısı / next 150
  const user100 = getTvProgressionForCount(100);
  assert(user100.currentRank.label === "Dizi Avcısı", "100 count currentRank is Dizi Avcısı");
  assert(user100.nextRank?.label === "Dizi Küratörü", "100 count nextRank is Dizi Küratörü (150)");
  assert(user100.remaining === 50, "100 count remaining is 50");

  // 353 -> Dizi Uzmanı (250) / next Dizi Arşivcisi (400)
  const user353 = getTvProgressionForCount(353);
  assert(user353.currentRank.label === "Dizi Uzmanı", "353 count currentRank is Dizi Uzmanı");
  assert(user353.currentRank.minimum === 250, "353 count currentRank minimum is 250");
  assert(user353.previousRank?.label === "Dizi Küratörü", "353 count previousRank is Dizi Küratörü");
  assert(user353.nextRank?.label === "Dizi Arşivcisi", "353 count nextRank is Dizi Arşivcisi");
  assert(user353.nextRank?.minimum === 400, "353 count nextRank minimum is 400");
  assert(user353.remaining === 47, "353 count remaining is 47 (400 - 353 = 47)");
  assert(user353.progress === 0.69, `353 count progress is 0.69 (103/150 = 0.6866..., got ${user353.progress})`);
  assert(user353.upcomingRanks.length === 3, "353 count has 3 upcoming ranks");
  assert(user353.upcomingRanks[0].label === "Dizi Arşivcisi", "1st upcoming is Dizi Arşivcisi");
  assert(user353.upcomingRanks[1].label === "Dizi Eleştirmeni", "2nd upcoming is Dizi Eleştirmeni");
  assert(user353.upcomingRanks[2].label === "Dizi Ustası", "3rd upcoming is Dizi Ustası");

  // 400 -> Dizi Arşivcisi
  const user400 = getTvProgressionForCount(400);
  assert(user400.currentRank.label === "Dizi Arşivcisi", "400 count currentRank is Dizi Arşivcisi");
  assert(user400.nextRank?.label === "Dizi Eleştirmeni", "400 count nextRank is Dizi Eleştirmeni (600)");
  assert(user400.remaining === 200, "400 count remaining is 200");

  // 999 -> Dizi Eleştirmeni / next 1000
  const user999 = getTvProgressionForCount(999);
  assert(user999.currentRank.label === "Dizi Eleştirmeni", "999 count currentRank is Dizi Eleştirmeni");
  assert(user999.nextRank?.label === "Dizi Ustası", "999 count nextRank is Dizi Ustası (1000)");
  assert(user999.remaining === 1, "999 count remaining is 1");

  // 1000 -> Dizi Ustası / next 1500
  const user1000 = getTvProgressionForCount(1000);
  assert(user1000.currentRank.label === "Dizi Ustası", "1000 count currentRank is Dizi Ustası");
  assert(user1000.nextRank?.label === "Dizi Arkeoloğu", "1000 count nextRank is Dizi Arkeoloğu (1500)");
  assert(user1000.remaining === 500, "1000 count remaining is 500");

  // 10000+ -> Yaşayan Dizi Arşivi (Max Rank)
  const user10000 = getTvProgressionForCount(10000);
  assert(user10000.currentRank.label === "Yaşayan Dizi Arşivi", "10000 count currentRank is Yaşayan Dizi Arşivi");
  assert(user10000.isMaxRank === true, "10000 count isMaxRank is true");
  assert(user10000.nextRank === null, "10000 count nextRank is null");
  assert(user10000.remaining === 0, "10000 count remaining is 0");
  assert(user10000.progress === 1.0, "10000 count progress is 1.0");

  // Arbitrarily high interaction user (100,000 shows) -> Safe max rank
  const user100k = getTvProgressionForCount(100000);
  assert(user100k.currentRank.label === "Yaşayan Dizi Arşivi", "100,000 count currentRank is Yaşayan Dizi Arşivi");
  assert(user100k.isMaxRank === true, "100,000 count isMaxRank is true");
  assert(user100k.remaining === 0, "100,000 count remaining is 0");

  // 4. UI Formatting Validation
  // Header Pill format for 353 TV user: "Dizi Uzmanı • 353/400"
  const headerTvPillText = `${user353.currentRank.label} • ${user353.evaluatedCount}/${user353.nextRank?.minimum}`;
  assert(headerTvPillText === "Dizi Uzmanı • 353/400", `Header pill text is 'Dizi Uzmanı • 353/400' (got '${headerTvPillText}')`);

  // Calibration progress banner for 353 TV user: "353 / 400 • Dizi Arşivcisi yolunda (47 dizi kaldı)"
  const calibTvProgressText = `${user353.evaluatedCount} / ${user353.nextRank?.minimum} • ${user353.nextRank?.label} yolunda (${user353.remaining} dizi kaldı)`;
  assert(
    calibTvProgressText === "353 / 400 • Dizi Arşivcisi yolunda (47 dizi kaldı)",
    `Calibration progress text matches specification (got '${calibTvProgressText}')`
  );

  // 5. Film Regression Safety Check
  const filmProg1524 = getProgressionForCount(1524);
  assert(filmProg1524.currentRank.label === "Baş Küratör", "Film 1524 count remains Baş Küratör");
  assert(filmProg1524.nextRank?.label === "Film Arkeoloğu", "Film 1524 count nextRank remains Film Arkeoloğu");
  assert(filmProg1524.remaining === 226, "Film 1524 count remaining remains 226");

  console.log(`\nRESULTS: Passed ${passed} of ${total} TV progression tests.\n`);
}

runTvProgressionTests();

