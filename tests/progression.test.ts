import { getRankForCount, getProgressionForCount } from "../lib/progression/service.ts";
import { RANK_DEFINITIONS } from "../lib/progression/constants.ts";

export function runProgressionTests() {
  console.log("=== PHASE 5.6 FILM JOURNEY & RANK PROGRESSION UNIT TESTS ===\n");
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

  // 1. Threshold Mapping Tests
  assert(getRankForCount(0).key === "BEGINNER", "0 interactions -> BEGINNER (Başlangıç)");
  assert(getRankForCount(29).key === "BEGINNER", "29 interactions -> BEGINNER (Başlangıç)");
  assert(getRankForCount(30).key === "VIEWER", "30 interactions -> VIEWER (İzleyici)");
  assert(getRankForCount(99).key === "VIEWER", "99 interactions -> VIEWER (İzleyici)");
  assert(getRankForCount(100).key === "CINEPHILE", "100 interactions -> CINEPHILE (Sinefil)");
  assert(getRankForCount(249).key === "CINEPHILE", "249 interactions -> CINEPHILE (Sinefil)");
  assert(getRankForCount(250).key === "CURATOR", "250 interactions -> CURATOR (Küratör)");
  assert(getRankForCount(499).key === "CURATOR", "499 interactions -> CURATOR (Küratör)");
  assert(getRankForCount(500).key === "ARCHIVIST", "500 interactions -> ARCHIVIST (Arşivci)");
  assert(getRankForCount(999).key === "ARCHIVIST", "999 interactions -> ARCHIVIST (Arşivci)");
  assert(getRankForCount(1000).key === "MASTER_CINEPHILE", "1000 interactions -> MASTER_CINEPHILE (Usta Sinefil)");
  assert(getRankForCount(2500).key === "FILMPRINT_LEGEND", "2500 interactions -> FILMPRINT_LEGEND (Filmprint Legend)");
  assert(getRankForCount(3000).key === "FILMPRINT_LEGEND", "3000 interactions -> FILMPRINT_LEGEND (Filmprint Legend)");

  // 2. Existing User Backfill & Progression Tests
  // 33 films -> VIEWER
  const user33 = getProgressionForCount(33);
  assert(user33.currentRank.key === "VIEWER", "33 films user rank is VIEWER");
  assert(user33.nextRank?.key === "CINEPHILE", "33 films user next rank is CINEPHILE");
  assert(user33.remaining === 67, "33 films user has 67 remaining to CINEPHILE");

  // 184 films -> CINEPHILE
  const user184 = getProgressionForCount(184);
  assert(user184.currentRank.key === "CINEPHILE", "184 films user rank is CINEPHILE");
  assert(user184.nextRank?.key === "CURATOR", "184 films user next rank is CURATOR");
  assert(user184.remaining === 66, "184 films user has 66 remaining to CURATOR");
  assert(user184.progress === 0.56, `184 films user progress is 0.56 (got ${user184.progress})`);

  // 420 films -> CURATOR
  const user420 = getProgressionForCount(420);
  assert(user420.currentRank.key === "CURATOR", "420 films user rank is CURATOR");
  assert(user420.nextRank?.key === "ARCHIVIST", "420 films user next rank is ARCHIVIST");
  assert(user420.remaining === 80, "420 films user has 80 remaining to ARCHIVIST");
  assert(user420.progress === 0.68, `420 films user progress is 0.68 (got ${user420.progress})`);

  // 1000 films -> MASTER_CINEPHILE
  const user1000 = getProgressionForCount(1000);
  assert(user1000.currentRank.key === "MASTER_CINEPHILE", "1000 films user rank is MASTER_CINEPHILE");
  assert(user1000.nextRank?.key === "FILMPRINT_LEGEND", "1000 films user next rank is FILMPRINT_LEGEND");
  assert(user1000.remaining === 1500, "1000 films user has 1500 remaining to LEGEND");
  assert(user1000.progress === 0, `1000 films user progress is 0.0 (got ${user1000.progress})`);

  // 3. Account Merge Scenario Test
  // Account A (80 interactions) + Account B (60 interactions) with 20 duplicates -> 120 unique interactions
  const mergedUniqueCount = 120;
  const mergedProgression = getProgressionForCount(mergedUniqueCount);
  assert(mergedProgression.currentRank.key === "CINEPHILE", "Merged account (120 unique interactions) rank is CINEPHILE");
  assert(mergedProgression.nextRank?.key === "CURATOR", "Merged account next rank is CURATOR");
  assert(mergedProgression.remaining === 130, "Merged account has 130 remaining to CURATOR");

  // 4. Max Rank Scenario Test
  const maxUser = getProgressionForCount(2500);
  assert(maxUser.isMaxRank === true, "2500 films user isMaxRank is true");
  assert(maxUser.nextRank === null, "2500 films user nextRank is null");
  assert(maxUser.progress === 1.0, "2500 films user progress is 1.0");

  console.log(`\nRESULTS: Passed ${passed} of ${total} tests.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runProgressionTests();
