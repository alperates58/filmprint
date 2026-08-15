import { getRankForCount, getProgressionForCount } from "@/lib/progression/service";
import { RANK_DEFINITIONS } from "@/lib/progression/constants";

export function runProgressionTests() {
  console.log("=== PHASE 8.6.1 EXTENDED LONG-TERM RANK PROGRESSION UNIT & REGRESSION TESTS ===\n");
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

  // 1. All 19 Rank Threshold Mapping Tests (Exact Boundaries)
  assert(getRankForCount(0).key === "BEGINNER" && getRankForCount(0).label === "Başlangıç", "0 -> Başlangıç (BEGINNER)");
  assert(getRankForCount(29).key === "BEGINNER" && getRankForCount(29).label === "Başlangıç", "29 -> Başlangıç (BEGINNER)");
  assert(getRankForCount(30).key === "VIEWER" && getRankForCount(30).label === "İzleyici", "30 -> İzleyici (VIEWER)");
  assert(getRankForCount(99).key === "VIEWER" && getRankForCount(99).label === "İzleyici", "99 -> İzleyici (VIEWER)");
  assert(getRankForCount(100).key === "CINEPHILE" && getRankForCount(100).label === "Sinefil", "100 -> Sinefil (CINEPHILE)");
  assert(getRankForCount(249).key === "CINEPHILE" && getRankForCount(249).label === "Sinefil", "249 -> Sinefil (CINEPHILE)");
  assert(getRankForCount(250).key === "CURATOR" && getRankForCount(250).label === "Küratör", "250 -> Küratör (CURATOR)");
  assert(getRankForCount(499).key === "CURATOR" && getRankForCount(499).label === "Küratör", "499 -> Küratör (CURATOR)");
  assert(getRankForCount(500).key === "ARCHIVIST" && getRankForCount(500).label === "Arşivci", "500 -> Arşivci (ARCHIVIST)");
  assert(getRankForCount(749).key === "ARCHIVIST" && getRankForCount(749).label === "Arşivci", "749 -> Arşivci (ARCHIVIST)");
  assert(getRankForCount(750).key === "DISTINGUISHED_VIEWER" && getRankForCount(750).label === "Seçkin İzleyici", "750 -> Seçkin İzleyici (DISTINGUISHED_VIEWER)");
  assert(getRankForCount(999).key === "DISTINGUISHED_VIEWER" && getRankForCount(999).label === "Seçkin İzleyici", "999 -> Seçkin İzleyici (DISTINGUISHED_VIEWER)");
  assert(getRankForCount(1000).key === "MASTER_CINEPHILE" && getRankForCount(1000).label === "Usta Sinefil", "1000 -> Usta Sinefil (MASTER_CINEPHILE)");
  assert(getRankForCount(1249).key === "MASTER_CINEPHILE" && getRankForCount(1249).label === "Usta Sinefil", "1249 -> Usta Sinefil (MASTER_CINEPHILE)");
  assert(getRankForCount(1250).key === "CINEMA_SAGE" && getRankForCount(1250).label === "Sinema Bilgesi", "1250 -> Sinema Bilgesi (CINEMA_SAGE)");
  assert(getRankForCount(1499).key === "CINEMA_SAGE" && getRankForCount(1499).label === "Sinema Bilgesi", "1499 -> Sinema Bilgesi (CINEMA_SAGE)");
  assert(getRankForCount(1500).key === "CHIEF_CURATOR" && getRankForCount(1500).label === "Baş Küratör", "1500 -> Baş Küratör (CHIEF_CURATOR)");
  assert(getRankForCount(1749).key === "CHIEF_CURATOR" && getRankForCount(1749).label === "Baş Küratör", "1749 -> Baş Küratör (CHIEF_CURATOR)");
  assert(getRankForCount(1750).key === "FILM_ARCHAEOLOGIST" && getRankForCount(1750).label === "Film Arkeoloğu", "1750 -> Film Arkeoloğu (FILM_ARCHAEOLOGIST)");
  assert(getRankForCount(1999).key === "FILM_ARCHAEOLOGIST" && getRankForCount(1999).label === "Film Arkeoloğu", "1999 -> Film Arkeoloğu (FILM_ARCHAEOLOGIST)");
  assert(getRankForCount(2000).key === "CINEMA_MASTER" && getRankForCount(2000).label === "Sinema Ustası", "2000 -> Sinema Ustası (CINEMA_MASTER)");
  assert(getRankForCount(2499).key === "CINEMA_MASTER" && getRankForCount(2499).label === "Sinema Ustası", "2499 -> Sinema Ustası (CINEMA_MASTER)");

  // Long-Term Milestone Thresholds (2500 to 25,000+)
  assert(getRankForCount(2500).key === "FILMPRINT_LEGEND" && getRankForCount(2500).label === "Filmprint Legend", "2500 -> Filmprint Legend (FILMPRINT_LEGEND)");
  assert(getRankForCount(2999).key === "FILMPRINT_LEGEND" && getRankForCount(2999).label === "Filmprint Legend", "2999 -> Filmprint Legend (FILMPRINT_LEGEND)");
  assert(getRankForCount(3000).key === "CINEMA_MEMORY" && getRankForCount(3000).label === "Sinema Hafızası", "3000 -> Sinema Hafızası (CINEMA_MEMORY)");
  assert(getRankForCount(3999).key === "CINEMA_MEMORY" && getRankForCount(3999).label === "Sinema Hafızası", "3999 -> Sinema Hafızası (CINEMA_MEMORY)");
  assert(getRankForCount(4000).key === "GRAND_ARCHIVIST" && getRankForCount(4000).label === "Büyük Arşivci", "4000 -> Büyük Arşivci (GRAND_ARCHIVIST)");
  assert(getRankForCount(4999).key === "GRAND_ARCHIVIST" && getRankForCount(4999).label === "Büyük Arşivci", "4999 -> Büyük Arşivci (GRAND_ARCHIVIST)");
  assert(getRankForCount(5000).key === "CINEMA_ENCYCLOPEDIA" && getRankForCount(5000).label === "Sinema Ansiklopedisi", "5000 -> Sinema Ansiklopedisi (CINEMA_ENCYCLOPEDIA)");
  assert(getRankForCount(7499).key === "CINEMA_ENCYCLOPEDIA" && getRankForCount(7499).label === "Sinema Ansiklopedisi", "7499 -> Sinema Ansiklopedisi (CINEMA_ENCYCLOPEDIA)");
  assert(getRankForCount(7500).key === "CINEMA_VIRTUOSO" && getRankForCount(7500).label === "Sinema Üstadı", "7500 -> Sinema Üstadı (CINEMA_VIRTUOSO)");
  assert(getRankForCount(9999).key === "CINEMA_VIRTUOSO" && getRankForCount(9999).label === "Sinema Üstadı", "9999 -> Sinema Üstadı (CINEMA_VIRTUOSO)");
  assert(getRankForCount(10000).key === "FILMPRINT_ICON" && getRankForCount(10000).label === "Filmprint Efsanesi", "10000 -> Filmprint Efsanesi (FILMPRINT_ICON)");
  assert(getRankForCount(14999).key === "FILMPRINT_ICON" && getRankForCount(14999).label === "Filmprint Efsanesi", "14999 -> Filmprint Efsanesi (FILMPRINT_ICON)");
  assert(getRankForCount(15000).key === "GRAND_CINEPHILE" && getRankForCount(15000).label === "Büyük Sinefil", "15000 -> Büyük Sinefil (GRAND_CINEPHILE)");
  assert(getRankForCount(24999).key === "GRAND_CINEPHILE" && getRankForCount(24999).label === "Büyük Sinefil", "24999 -> Büyük Sinefil (GRAND_CINEPHILE)");
  assert(getRankForCount(25000).key === "LIVING_FILM_ARCHIVE" && getRankForCount(25000).label === "Yaşayan Sinema Arşivi", "25000 -> Yaşayan Sinema Arşivi (LIVING_FILM_ARCHIVE)");
  assert(getRankForCount(30000).key === "LIVING_FILM_ARCHIVE" && getRankForCount(30000).label === "Yaşayan Sinema Arşivi", "30000 -> Yaşayan Sinema Arşivi (LIVING_FILM_ARCHIVE)");
  assert(getRankForCount(100000).key === "LIVING_FILM_ARCHIVE" && getRankForCount(100000).label === "Yaşayan Sinema Arşivi", "100000 -> Yaşayan Sinema Arşivi (LIVING_FILM_ARCHIVE)");

  // 2. Real User Regression Mapping & Progression Tests
  // 1524 films -> Baş Küratör
  const user1524 = getProgressionForCount(1524);
  assert(user1524.currentRank.label === "Baş Küratör", "1524 films -> Baş Küratör");
  assert(user1524.previousRank?.label === "Sinema Bilgesi", "1524 films previous rank is Sinema Bilgesi");
  assert(user1524.nextRank?.label === "Film Arkeoloğu", "1524 films next rank is Film Arkeoloğu");
  assert(user1524.remaining === 226, "1524 films user has 226 remaining (1750 - 1524 = 226)");
  assert(user1524.progress === 0.1, `1524 films user progress is 0.1 (got ${user1524.progress})`);
  assert(user1524.upcomingRanks.length === 3, "1524 films upcoming milestones has 3 items");
  assert(user1524.upcomingRanks[0].label === "Film Arkeoloğu", "First upcoming is Film Arkeoloğu (1750)");
  assert(user1524.upcomingRanks[1].label === "Sinema Ustası", "Second upcoming is Sinema Ustası (2000)");
  assert(user1524.upcomingRanks[2].label === "Filmprint Legend", "Third upcoming is Filmprint Legend (2500)");

  // 2500 films is NO LONGER max rank -> Points to Sinema Hafızası (3000)
  const user2500 = getProgressionForCount(2500);
  assert(user2500.currentRank.label === "Filmprint Legend", "2500 films -> Filmprint Legend");
  assert(user2500.isMaxRank === false, "2500 films is NOT max rank anymore");
  assert(user2500.nextRank?.label === "Sinema Hafızası", "2500 films next rank is Sinema Hafızası (3000)");
  assert(user2500.remaining === 500, "2500 films user has 500 remaining to Sinema Hafızası");
  assert(user2500.progress === 0.0, "2500 films user progress is 0.0");

  // 2999 films -> Filmprint Legend
  const user2999 = getProgressionForCount(2999);
  assert(user2999.currentRank.label === "Filmprint Legend", "2999 films -> Filmprint Legend");
  assert(user2999.remaining === 1, "2999 films user has 1 remaining to Sinema Hafızası");

  // 3000 films -> Sinema Hafızası
  const user3000 = getProgressionForCount(3000);
  assert(user3000.currentRank.label === "Sinema Hafızası", "3000 films -> Sinema Hafızası");
  assert(user3000.nextRank?.label === "Büyük Arşivci", "3000 films next rank is Büyük Arşivci (4000)");
  assert(user3000.remaining === 1000, "3000 films user has 1000 remaining to Büyük Arşivci");

  // 10000 films -> Filmprint Efsanesi
  const user10000 = getProgressionForCount(10000);
  assert(user10000.currentRank.label === "Filmprint Efsanesi", "10000 films -> Filmprint Efsanesi");
  assert(user10000.nextRank?.label === "Büyük Sinefil", "10000 films next rank is Büyük Sinefil (15000)");
  assert(user10000.remaining === 5000, "10000 films user has 5000 remaining to Büyük Sinefil");

  // 25000+ films -> Yaşayan Sinema Arşivi (Max Rank)
  const user25000 = getProgressionForCount(25000);
  assert(user25000.currentRank.label === "Yaşayan Sinema Arşivi", "25000 films -> Yaşayan Sinema Arşivi");
  assert(user25000.isMaxRank === true, "25000 films user isMaxRank is true");
  assert(user25000.nextRank === null, "25000 films user nextRank is null");
  assert(user25000.remaining === 0, "25000 films user remaining is 0");
  assert(user25000.progress === 1.0, "25000 films user progress is 1.0");

  // Arbitrarily high interaction user (100,000 films) -> Safe max rank, no crash
  const user100k = getProgressionForCount(100000);
  assert(user100k.currentRank.label === "Yaşayan Sinema Arşivi", "100,000 films -> Yaşayan Sinema Arşivi");
  assert(user100k.isMaxRank === true, "100,000 films user isMaxRank is true");
  assert(user100k.remaining === 0, "100,000 films user remaining is 0");

  // 3. Array Length and Metadata Integrity
  assert(RANK_DEFINITIONS.length === 19, "RANK_DEFINITIONS array contains exactly 19 ranks");

  console.log(`\nRESULTS: Passed ${passed} of ${total} tests.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runProgressionTests();
