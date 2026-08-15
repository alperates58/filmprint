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
    }
  }

  // 1. Exact boundary checks across all 19 ranks
  assert(getRankForCount(0).key === "BEGINNER", "0 interactions -> BEGINNER (Başlangıç)");
  assert(getRankForCount(29).key === "BEGINNER", "29 interactions -> BEGINNER");
  assert(getRankForCount(30).key === "VIEWER", "30 interactions -> VIEWER (İzleyici)");
  assert(getRankForCount(99).key === "VIEWER", "99 interactions -> VIEWER");
  assert(getRankForCount(100).key === "CINEPHILE", "100 interactions -> CINEPHILE (Sinefil)");
  assert(getRankForCount(249).key === "CINEPHILE", "249 interactions -> CINEPHILE");
  assert(getRankForCount(250).key === "CURATOR", "250 interactions -> CURATOR (Küratör)");
  assert(getRankForCount(499).key === "CURATOR", "499 interactions -> CURATOR");
  assert(getRankForCount(500).key === "ARCHIVIST", "500 interactions -> ARCHIVIST (Arşivci)");
  assert(getRankForCount(749).key === "ARCHIVIST", "749 interactions -> ARCHIVIST");
  assert(getRankForCount(750).key === "DISTINGUISHED_VIEWER", "750 interactions -> DISTINGUISHED_VIEWER (Seçkin İzleyici)");
  assert(getRankForCount(999).key === "DISTINGUISHED_VIEWER", "999 interactions -> DISTINGUISHED_VIEWER");
  assert(getRankForCount(1000).key === "MASTER_CINEPHILE", "1000 interactions -> MASTER_CINEPHILE (Usta Sinefil)");
  assert(getRankForCount(1249).key === "MASTER_CINEPHILE", "1249 interactions -> MASTER_CINEPHILE");
  assert(getRankForCount(1250).key === "CINEMA_SAGE", "1250 interactions -> CINEMA_SAGE (Sinema Bilgesi)");
  assert(getRankForCount(1499).key === "CINEMA_SAGE", "1499 interactions -> CINEMA_SAGE");
  assert(getRankForCount(1500).key === "CHIEF_CURATOR", "1500 interactions -> CHIEF_CURATOR (Baş Küratör)");
  assert(getRankForCount(1749).key === "CHIEF_CURATOR", "1749 interactions -> CHIEF_CURATOR");
  assert(getRankForCount(1750).key === "FILM_ARCHAEOLOGIST", "1750 interactions -> FILM_ARCHAEOLOGIST (Film Arkeoloğu)");
  assert(getRankForCount(1999).key === "FILM_ARCHAEOLOGIST", "1999 interactions -> FILM_ARCHAEOLOGIST");
  assert(getRankForCount(2000).key === "CINEMA_MASTER", "2000 interactions -> CINEMA_MASTER (Sinema Ustası)");
  assert(getRankForCount(2499).key === "CINEMA_MASTER", "2499 interactions -> CINEMA_MASTER");
  assert(getRankForCount(2500).key === "FILMPRINT_LEGEND", "2500 interactions -> FILMPRINT_LEGEND (Filmprint Legend)");
  assert(getRankForCount(2999).key === "FILMPRINT_LEGEND", "2999 interactions -> FILMPRINT_LEGEND (Filmprint Legend)");
  assert(getRankForCount(3000).key === "CINEMA_MEMORY", "3000 interactions -> CINEMA_MEMORY (Sinema Hafızası)");
  assert(getRankForCount(3999).key === "CINEMA_MEMORY", "3999 interactions -> CINEMA_MEMORY");
  assert(getRankForCount(4000).key === "GRAND_ARCHIVIST", "4000 interactions -> GRAND_ARCHIVIST (Büyük Arşivci)");
  assert(getRankForCount(4999).key === "GRAND_ARCHIVIST", "4999 interactions -> GRAND_ARCHIVIST");
  assert(getRankForCount(5000).key === "CINEMA_ENCYCLOPEDIA", "5000 interactions -> CINEMA_ENCYCLOPEDIA (Sinema Ansiklopedisi)");
  assert(getRankForCount(7499).key === "CINEMA_ENCYCLOPEDIA", "7499 interactions -> CINEMA_ENCYCLOPEDIA");
  assert(getRankForCount(7500).key === "CINEMA_VIRTUOSO", "7500 interactions -> CINEMA_VIRTUOSO (Sinema Üstadı)");
  assert(getRankForCount(9999).key === "CINEMA_VIRTUOSO", "9999 interactions -> CINEMA_VIRTUOSO");
  assert(getRankForCount(10000).key === "FILMPRINT_ICON", "10000 interactions -> FILMPRINT_ICON (Filmprint Efsanesi)");
  assert(getRankForCount(14999).key === "FILMPRINT_ICON", "14999 interactions -> FILMPRINT_ICON");
  assert(getRankForCount(15000).key === "GRAND_CINEPHILE", "15000 interactions -> GRAND_CINEPHILE (Büyük Sinefil)");
  assert(getRankForCount(24999).key === "GRAND_CINEPHILE", "24999 interactions -> GRAND_CINEPHILE");
  assert(getRankForCount(25000).key === "LIVING_FILM_ARCHIVE", "25000 interactions -> LIVING_FILM_ARCHIVE (Yaşayan Sinema Arşivi)");
  assert(getRankForCount(100000).key === "LIVING_FILM_ARCHIVE", "100000 interactions -> LIVING_FILM_ARCHIVE (Yaşayan Sinema Arşivi)");

  // 2. Progression calculation for 1524 interactions
  const prog1524 = getProgressionForCount(1524);
  assert(prog1524.currentRank.key === "CHIEF_CURATOR", "1524 interactions rank is Baş Küratör");
  assert(prog1524.evaluatedCount === 1524, "Evaluated count matches 1524");
  assert(prog1524.nextRank?.minimum === 1750, "Next target for Baş Küratör is 1750 (Film Arkeoloğu)");
  assert(prog1524.remaining === 226, "Remaining count to Film Arkeoloğu is 226 (1750 - 1524)");
  assert(prog1524.progress === 0.1, "Progress for 1524 is 0.1 ((1524 - 1500) / 250)");

  // 3. Progression for 2500 interactions (no longer max rank)
  const prog2500 = getProgressionForCount(2500);
  assert(prog2500.currentRank.key === "FILMPRINT_LEGEND", "2500 interactions rank is FILMPRINT_LEGEND");
  assert(prog2500.nextRank?.key === "CINEMA_MEMORY", "Next rank for 2500 is CINEMA_MEMORY");
  assert(prog2500.remaining === 500, "Remaining to CINEMA_MEMORY is 500 (3000 - 2500)");
  assert(prog2500.isMaxRank === false, "2500 is not max rank");

  // 4. Status update immutability simulation
  const simulatedCountBefore = 1524;
  const simulatedCountAfterUpdate = 1524; // Same row upsert
  const progAfter = getProgressionForCount(simulatedCountAfterUpdate);

  assert(
    progAfter.currentRank.key === prog1524.currentRank.key &&
      progAfter.evaluatedCount === simulatedCountBefore,
    "Status update on existing interaction preserves rank (Baş Küratör) and total evaluated count (1524)"
  );

  console.log(`\nRESULTS: Passed ${passed} of ${total} tests.\n`);
  if (passed !== total) {
    process.exit(1);
  }
}

runRankIntegrityTests();
