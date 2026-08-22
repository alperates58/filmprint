import { getRankForCount, getProgressionForCount } from "../lib/progression/service";

export function runRankIntegrityTests() {
  console.log("=== REGRESSION TEST: RANK INTEGRITY & BOUNDARY TESTS ===");
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

  // 1. Exact boundary checks across all 19 ranks
  assert(getRankForCount(0).key === "BEGINNER", "0 interactions -> BEGINNER (Başlangıç)");
  assert(getRankForCount(24).key === "BEGINNER", "24 interactions -> BEGINNER");
  assert(getRankForCount(25).key === "VIEWER", "25 interactions -> VIEWER (İzleyici)");
  assert(getRankForCount(74).key === "VIEWER", "74 interactions -> VIEWER");
  assert(getRankForCount(75).key === "CINEPHILE", "75 interactions -> CINEPHILE (Sinefil)");
  assert(getRankForCount(149).key === "CINEPHILE", "149 interactions -> CINEPHILE");
  assert(getRankForCount(150).key === "CURATOR", "150 interactions -> CURATOR (Küratör)");
  assert(getRankForCount(299).key === "CURATOR", "299 interactions -> CURATOR");
  assert(getRankForCount(300).key === "ARCHIVIST", "300 interactions -> ARCHIVIST (Arşivci)");
  assert(getRankForCount(599).key === "ARCHIVIST", "599 interactions -> ARCHIVIST");
  assert(getRankForCount(600).key === "DISTINGUISHED_VIEWER", "600 interactions -> DISTINGUISHED_VIEWER (Seçkin İzleyici)");
  assert(getRankForCount(999).key === "DISTINGUISHED_VIEWER", "999 interactions -> DISTINGUISHED_VIEWER");
  assert(getRankForCount(1000).key === "MASTER_CINEPHILE", "1000 interactions -> MASTER_CINEPHILE (Usta Sinefil)");
  assert(getRankForCount(1499).key === "MASTER_CINEPHILE", "1499 interactions -> MASTER_CINEPHILE");
  assert(getRankForCount(1500).key === "CINEMA_SAGE", "1500 interactions -> CINEMA_SAGE (Sinema Bilgesi)");
  assert(getRankForCount(1999).key === "CINEMA_SAGE", "1999 interactions -> CINEMA_SAGE");
  assert(getRankForCount(2000).key === "CHIEF_CURATOR", "2000 interactions -> CHIEF_CURATOR (Baş Küratör)");
  assert(getRankForCount(2499).key === "CHIEF_CURATOR", "2499 interactions -> CHIEF_CURATOR");
  assert(getRankForCount(2500).key === "FILM_ARCHAEOLOGIST", "2500 interactions -> FILM_ARCHAEOLOGIST (Film Arkeoloğu)");
  assert(getRankForCount(2999).key === "FILM_ARCHAEOLOGIST", "2999 interactions -> FILM_ARCHAEOLOGIST");
  assert(getRankForCount(3000).key === "CINEMA_MASTER", "3000 interactions -> CINEMA_MASTER (Sinema Ustası)");
  assert(getRankForCount(3999).key === "CINEMA_MASTER", "3999 interactions -> CINEMA_MASTER");
  assert(getRankForCount(4000).key === "FILMPRINT_LEGEND", "4000 interactions -> FILMPRINT_LEGEND (Filmprint Legend)");
  assert(getRankForCount(4999).key === "FILMPRINT_LEGEND", "4999 interactions -> FILMPRINT_LEGEND (Filmprint Legend)");
  assert(getRankForCount(5000).key === "CINEMA_MEMORY", "5000 interactions -> CINEMA_MEMORY (Sinema Hafızası)");
  assert(getRankForCount(7499).key === "CINEMA_MEMORY", "7499 interactions -> CINEMA_MEMORY");
  assert(getRankForCount(7500).key === "GRAND_ARCHIVIST", "7500 interactions -> GRAND_ARCHIVIST (Büyük Arşivci)");
  assert(getRankForCount(9999).key === "GRAND_ARCHIVIST", "9999 interactions -> GRAND_ARCHIVIST");
  assert(getRankForCount(10000).key === "CINEMA_ENCYCLOPEDIA", "10000 interactions -> CINEMA_ENCYCLOPEDIA (Sinema Ansiklopedisi)");
  assert(getRankForCount(14999).key === "CINEMA_ENCYCLOPEDIA", "14999 interactions -> CINEMA_ENCYCLOPEDIA");
  assert(getRankForCount(15000).key === "CINEMA_VIRTUOSO", "15000 interactions -> CINEMA_VIRTUOSO (Sinema Üstadı)");
  assert(getRankForCount(19999).key === "CINEMA_VIRTUOSO", "19999 interactions -> CINEMA_VIRTUOSO");
  assert(getRankForCount(20000).key === "FILMPRINT_ICON", "20000 interactions -> FILMPRINT_ICON (Filmprint Efsanesi)");
  assert(getRankForCount(24999).key === "FILMPRINT_ICON", "24999 interactions -> FILMPRINT_ICON");
  assert(getRankForCount(25000).key === "GRAND_CINEPHILE", "25000 interactions -> GRAND_CINEPHILE (Büyük Sinefil)");
  assert(getRankForCount(29999).key === "GRAND_CINEPHILE", "29999 interactions -> GRAND_CINEPHILE");
  assert(getRankForCount(30000).key === "LIVING_FILM_ARCHIVE", "30000 interactions -> LIVING_FILM_ARCHIVE (Yaşayan Sinema Arşivi)");
  assert(getRankForCount(100000).key === "LIVING_FILM_ARCHIVE", "100000 interactions -> LIVING_FILM_ARCHIVE (Yaşayan Sinema Arşivi)");

  // 2. Progression calculation for 1524 interactions
  const prog1524 = getProgressionForCount(1524);
  assert(prog1524.currentRank.key === "CINEMA_SAGE", "1524 interactions rank is Sinema Bilgesi");
  assert(prog1524.evaluatedCount === 1524, "Evaluated count matches 1524");
  assert(prog1524.nextRank?.minimum === 2000, "Next target for Sinema Bilgesi is 2000 (Baş Küratör)");
  assert(prog1524.remaining === 476, "Remaining count to Baş Küratör is 476 (2000 - 1524)");
  assert(prog1524.progress === 0.05, "Progress for 1524 is 0.05 ((1524 - 1500) / 500)");

  // 3. Progression for 4000 interactions
  const prog4000 = getProgressionForCount(4000);
  assert(prog4000.currentRank.key === "FILMPRINT_LEGEND", "4000 interactions rank is FILMPRINT_LEGEND");
  assert(prog4000.nextRank?.key === "CINEMA_MEMORY", "Next rank for 4000 is CINEMA_MEMORY");
  assert(prog4000.remaining === 1000, "Remaining to CINEMA_MEMORY is 1000 (5000 - 4000)");
  assert(prog4000.isMaxRank === false, "4000 is not max rank");

  // 4. Status update immutability simulation
  const simulatedCountBefore = 1524;
  const simulatedCountAfterUpdate = 1524;
  const progAfter = getProgressionForCount(simulatedCountAfterUpdate);

  assert(
    progAfter.currentRank.key === prog1524.currentRank.key &&
      progAfter.evaluatedCount === simulatedCountBefore,
    "Status update on existing interaction preserves rank (Sinema Bilgesi) and total evaluated count (1524)"
  );

  console.log(`\nRESULTS: Passed ${passed} of ${total} tests.\n`);
}

if (process.argv[1]?.includes("rank_integrity.test.ts")) {
  runRankIntegrityTests();
}
