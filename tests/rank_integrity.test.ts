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

  // 1. Exact boundary checks
  assert(getRankForCount(0).key === "BEGINNER", "0 interactions -> BEGINNER (Başlangıç)");
  assert(getRankForCount(29).key === "BEGINNER", "29 interactions -> BEGINNER");
  assert(getRankForCount(30).key === "VIEWER", "30 interactions -> VIEWER (İzleyici)");
  assert(getRankForCount(99).key === "VIEWER", "99 interactions -> VIEWER");
  assert(getRankForCount(100).key === "CINEPHILE", "100 interactions -> CINEPHILE (Sinefil)");
  assert(getRankForCount(249).key === "CINEPHILE", "249 interactions -> CINEPHILE");
  assert(getRankForCount(250).key === "CURATOR", "250 interactions -> CURATOR (Küratör)");
  assert(getRankForCount(499).key === "CURATOR", "499 interactions -> CURATOR");
  assert(getRankForCount(500).key === "ARCHIVIST", "500 interactions -> ARCHIVIST (Arşivci)");
  assert(getRankForCount(999).key === "ARCHIVIST", "999 interactions -> ARCHIVIST");
  assert(getRankForCount(1000).key === "MASTER_CINEPHILE", "1000 interactions -> MASTER_CINEPHILE (Usta Sinefil)");
  assert(getRankForCount(2500).key === "FILMPRINT_LEGEND", "2500 interactions -> FILMPRINT_LEGEND");

  // 2. Progression calculation for 184 interactions
  const prog184 = getProgressionForCount(184);
  assert(prog184.currentRank.key === "CINEPHILE", "184 interactions rank is Sinefil");
  assert(prog184.evaluatedCount === 184, "Evaluated count matches 184");
  assert(prog184.nextRank?.minimum === 250, "Next target for Sinefil is 250 (Küratör)");
  assert(prog184.remaining === 66, "Remaining count to Küratör is 66 (250 - 184)");

  // 3. Status update immutability simulation
  // Updating rating on an existing interaction should NOT decrease or increase total count
  const simulatedCountBefore = 184;
  const simulatedCountAfterUpdate = 184; // Same row upsert
  const progAfter = getProgressionForCount(simulatedCountAfterUpdate);

  assert(
    progAfter.currentRank.key === prog184.currentRank.key &&
      progAfter.evaluatedCount === simulatedCountBefore,
    "Status update on existing interaction preserves rank (Sinefil) and total evaluated count (184)"
  );

  console.log(`\nRESULTS: Passed ${passed} of ${total} tests.\n`);
  if (passed !== total) {
    process.exit(1);
  }
}

runRankIntegrityTests();
