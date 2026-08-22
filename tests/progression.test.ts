import { getRankForCount, getProgressionForCount } from "@/lib/progression/service";
import { RANK_DEFINITIONS } from "@/lib/progression/constants";

export function runProgressionTests() {
  console.log("=== PHASE H / RANK V2 EXTENDED LONG-TERM RANK PROGRESSION UNIT & REGRESSION TESTS ===\n");
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

  // 1. All 19 Rank Threshold Mapping Tests (Exact Boundaries for Rank V2)
  assert(getRankForCount(0).key === "BEGINNER" && getRankForCount(0).label === "Başlangıç", "0 -> Başlangıç (BEGINNER)");
  assert(getRankForCount(24).key === "BEGINNER" && getRankForCount(24).label === "Başlangıç", "24 -> Başlangıç (BEGINNER)");
  assert(getRankForCount(25).key === "VIEWER" && getRankForCount(25).label === "İzleyici", "25 -> İzleyici (VIEWER)");
  assert(getRankForCount(74).key === "VIEWER" && getRankForCount(74).label === "İzleyici", "74 -> İzleyici (VIEWER)");
  assert(getRankForCount(75).key === "CINEPHILE" && getRankForCount(75).label === "Sinefil", "75 -> Sinefil (CINEPHILE)");
  assert(getRankForCount(149).key === "CINEPHILE" && getRankForCount(149).label === "Sinefil", "149 -> Sinefil (CINEPHILE)");
  assert(getRankForCount(150).key === "CURATOR" && getRankForCount(150).label === "Küratör", "150 -> Küratör (CURATOR)");
  assert(getRankForCount(299).key === "CURATOR" && getRankForCount(299).label === "Küratör", "299 -> Küratör (CURATOR)");
  assert(getRankForCount(300).key === "ARCHIVIST" && getRankForCount(300).label === "Arşivci", "300 -> Arşivci (ARCHIVIST)");
  assert(getRankForCount(599).key === "ARCHIVIST" && getRankForCount(599).label === "Arşivci", "599 -> Arşivci (ARCHIVIST)");
  assert(getRankForCount(600).key === "DISTINGUISHED_VIEWER" && getRankForCount(600).label === "Seçkin İzleyici", "600 -> Seçkin İzleyici (DISTINGUISHED_VIEWER)");
  assert(getRankForCount(999).key === "DISTINGUISHED_VIEWER" && getRankForCount(999).label === "Seçkin İzleyici", "999 -> Seçkin İzleyici (DISTINGUISHED_VIEWER)");
  assert(getRankForCount(1000).key === "MASTER_CINEPHILE" && getRankForCount(1000).label === "Usta Sinefil", "1000 -> Usta Sinefil (MASTER_CINEPHILE)");
  assert(getRankForCount(1499).key === "MASTER_CINEPHILE" && getRankForCount(1499).label === "Usta Sinefil", "1499 -> Usta Sinefil (MASTER_CINEPHILE)");
  assert(getRankForCount(1500).key === "CINEMA_SAGE" && getRankForCount(1500).label === "Sinema Bilgesi", "1500 -> Sinema Bilgesi (CINEMA_SAGE)");
  assert(getRankForCount(1999).key === "CINEMA_SAGE" && getRankForCount(1999).label === "Sinema Bilgesi", "1999 -> Sinema Bilgesi (CINEMA_SAGE)");
  assert(getRankForCount(2000).key === "CHIEF_CURATOR" && getRankForCount(2000).label === "Baş Küratör", "2000 -> Baş Küratör (CHIEF_CURATOR)");
  assert(getRankForCount(2499).key === "CHIEF_CURATOR" && getRankForCount(2499).label === "Baş Küratör", "2499 -> Baş Küratör (CHIEF_CURATOR)");
  assert(getRankForCount(2500).key === "FILM_ARCHAEOLOGIST" && getRankForCount(2500).label === "Film Arkeoloğu", "2500 -> Film Arkeoloğu (FILM_ARCHAEOLOGIST)");
  assert(getRankForCount(2999).key === "FILM_ARCHAEOLOGIST" && getRankForCount(2999).label === "Film Arkeoloğu", "2999 -> Film Arkeoloğu (FILM_ARCHAEOLOGIST)");
  assert(getRankForCount(3000).key === "CINEMA_MASTER" && getRankForCount(3000).label === "Sinema Ustası", "3000 -> Sinema Ustası (CINEMA_MASTER)");
  assert(getRankForCount(3999).key === "CINEMA_MASTER" && getRankForCount(3999).label === "Sinema Ustası", "3999 -> Sinema Ustası (CINEMA_MASTER)");

  // Long-Term Milestone Thresholds (4000 to 30,000+)
  assert(getRankForCount(4000).key === "FILMPRINT_LEGEND" && getRankForCount(4000).label === "Filmprint Legend", "4000 -> Filmprint Legend (FILMPRINT_LEGEND)");
  assert(getRankForCount(4999).key === "FILMPRINT_LEGEND" && getRankForCount(4999).label === "Filmprint Legend", "4999 -> Filmprint Legend (FILMPRINT_LEGEND)");
  assert(getRankForCount(5000).key === "CINEMA_MEMORY" && getRankForCount(5000).label === "Sinema Hafızası", "5000 -> Sinema Hafızası (CINEMA_MEMORY)");
  assert(getRankForCount(7499).key === "CINEMA_MEMORY" && getRankForCount(7499).label === "Sinema Hafızası", "7499 -> Sinema Hafızası (CINEMA_MEMORY)");
  assert(getRankForCount(7500).key === "GRAND_ARCHIVIST" && getRankForCount(7500).label === "Büyük Arşivci", "7500 -> Büyük Arşivci (GRAND_ARCHIVIST)");
  assert(getRankForCount(9999).key === "GRAND_ARCHIVIST" && getRankForCount(9999).label === "Büyük Arşivci", "9999 -> Büyük Arşivci (GRAND_ARCHIVIST)");
  assert(getRankForCount(10000).key === "CINEMA_ENCYCLOPEDIA" && getRankForCount(10000).label === "Sinema Ansiklopedisi", "10000 -> Sinema Ansiklopedisi (CINEMA_ENCYCLOPEDIA)");
  assert(getRankForCount(14999).key === "CINEMA_ENCYCLOPEDIA" && getRankForCount(14999).label === "Sinema Ansiklopedisi", "14999 -> Sinema Ansiklopedisi (CINEMA_ENCYCLOPEDIA)");
  assert(getRankForCount(15000).key === "CINEMA_VIRTUOSO" && getRankForCount(15000).label === "Sinema Üstadı", "15000 -> Sinema Üstadı (CINEMA_VIRTUOSO)");
  assert(getRankForCount(19999).key === "CINEMA_VIRTUOSO" && getRankForCount(19999).label === "Sinema Üstadı", "19999 -> Sinema Üstadı (CINEMA_VIRTUOSO)");
  assert(getRankForCount(20000).key === "FILMPRINT_ICON" && getRankForCount(20000).label === "Filmprint Efsanesi", "20000 -> Filmprint Efsanesi (FILMPRINT_ICON)");
  assert(getRankForCount(24999).key === "FILMPRINT_ICON" && getRankForCount(24999).label === "Filmprint Efsanesi", "24999 -> Filmprint Efsanesi (FILMPRINT_ICON)");
  assert(getRankForCount(25000).key === "GRAND_CINEPHILE" && getRankForCount(25000).label === "Büyük Sinefil", "25000 -> Büyük Sinefil (GRAND_CINEPHILE)");
  assert(getRankForCount(29999).key === "GRAND_CINEPHILE" && getRankForCount(29999).label === "Büyük Sinefil", "29999 -> Büyük Sinefil (GRAND_CINEPHILE)");
  assert(getRankForCount(30000).key === "LIVING_FILM_ARCHIVE" && getRankForCount(30000).label === "Yaşayan Sinema Arşivi", "30000 -> Yaşayan Sinema Arşivi (LIVING_FILM_ARCHIVE)");
  assert(getRankForCount(100000).key === "LIVING_FILM_ARCHIVE" && getRankForCount(100000).label === "Yaşayan Sinema Arşivi", "100000 -> Yaşayan Sinema Arşivi (LIVING_FILM_ARCHIVE)");

  // 2. Progression Object Structure Tests
  const p0 = getProgressionForCount(0);
  assert(p0.evaluatedCount === 0, "p0.evaluatedCount === 0");
  assert(p0.currentRank.key === "BEGINNER", "p0.currentRank === BEGINNER");
  assert(p0.nextRank?.key === "VIEWER", "p0.nextRank === VIEWER");
  assert(p0.remaining === 25, "p0.remaining === 25");
  assert(p0.progress === 0, "p0.progress === 0");

  const p10 = getProgressionForCount(10);
  assert(p10.evaluatedCount === 10, "p10.evaluatedCount === 10");
  assert(p10.currentRank.key === "BEGINNER", "p10.currentRank === BEGINNER");
  assert(p10.nextRank?.key === "VIEWER", "p10.nextRank === VIEWER");
  assert(p10.remaining === 15, "p10.remaining === 15");
  assert(p10.progress === 0.4, "p10.progress === 0.4");

  const p25 = getProgressionForCount(25);
  assert(p25.evaluatedCount === 25, "p25.evaluatedCount === 25");
  assert(p25.currentRank.key === "VIEWER", "p25.currentRank === VIEWER");
  assert(p25.nextRank?.key === "CINEPHILE", "p25.nextRank === CINEPHILE");
  assert(p25.remaining === 50, "p25.remaining === 50");
  assert(p25.progress === 0, "p25.progress === 0");

  const pMax = getProgressionForCount(35000);
  assert(pMax.currentRank.key === "LIVING_FILM_ARCHIVE", "pMax.currentRank === LIVING_FILM_ARCHIVE");
  assert(pMax.nextRank === null, "pMax.nextRank === null");
  assert(pMax.remaining === 0, "pMax.remaining === 0");
  assert(pMax.progress === 1.0, "pMax.progress === 1.0");

  console.log(`\nProgression Tests completed: ${passed}/${total} passed.\n`);
}
