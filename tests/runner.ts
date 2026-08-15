import { runAuthMigrationTests } from "./auth_migration.test";
import { runCalculatorTests } from "./calculator.test";
import { runCalibrationSelectorTests } from "./calibration_selector.test";
import { runFilmDnaStaleRegressionTests } from "./film_dna_stale_regression.test";
import { runGroupMatcherTests } from "./group_matcher.test";
import { runLibraryPhase6bTests } from "./library_phase6b.test";
import { runMovieDetailsPhase6dTests } from "./movie_details_phase6d.test";
import { runPhase7aTests } from "./phase7a.test";
import { runPhase7b1Tests } from "./phase7b1.test";
import { runPhase7b2Tests } from "./phase7b2.test";
import { runProgressionTests } from "./progression.test";
import { runRankIntegrityTests } from "./rank_integrity.test";
import { runRecommendationFeedbackTests } from "./recommendation_feedback.test";
import { runRecommendationMatcherTests } from "./recommendation_matcher.test";
import { runRecommendationUpgradeTests } from "./recommendation_upgrade.test";
import { runRecommendationV2Tests } from "./recommendation_v2.test";
import { runRecommendationV3Tests } from "./recommendation_v3.test";
import { runPwaTests } from "./pwa.test";
import { runMovieEligibilityTests } from "./movie_eligibility.test";
import { runTvFoundationTests } from "./tv_foundation.test";
import { runTvCalibrationTests } from "./tv_calibration.test";

async function runAllUnitAndRegressionTests() {
  console.log("===============================================================");
  console.log("FILMPRINT MASTER UNIT & REGRESSION TEST SUITE");
  console.log("===============================================================\n");

  const startTime = Date.now();
  const testSuites = [
    { name: "Auth Migration Tests", fn: runAuthMigrationTests },
    { name: "Film DNA Calculator Tests", fn: runCalculatorTests },
    { name: "Calibration Selector Tests", fn: runCalibrationSelectorTests },
    { name: "Film DNA Stale Recalculation Regression", fn: runFilmDnaStaleRegressionTests },
    { name: "Group Matcher Tests", fn: runGroupMatcherTests },
    { name: "Library Service Tests", fn: runLibraryPhase6bTests },
    { name: "Movie Details Tests", fn: runMovieDetailsPhase6dTests },
    { name: "Phase 7A Recommendation Tests", fn: runPhase7aTests },
    { name: "Phase 7B.1 Supply & Calibration Tests", fn: runPhase7b1Tests },
    { name: "Phase 7B.2 Grounded Evidence Tests", fn: runPhase7b2Tests },
    { name: "Progression & Rank Tests", fn: runProgressionTests },
    { name: "Rank Integrity & Boundary Tests", fn: runRankIntegrityTests },
    { name: "Recommendation Feedback Tests", fn: runRecommendationFeedbackTests },
    { name: "Recommendation Matcher Tests", fn: runRecommendationMatcherTests },
    { name: "Recommendation Upgrade Tests", fn: runRecommendationUpgradeTests },
    { name: "Recommendation Engine V2 Tests", fn: runRecommendationV2Tests },
    { name: "Recommendation Engine V3 Tests", fn: runRecommendationV3Tests },
    { name: "PWA & Safe Offline Foundation Tests", fn: runPwaTests },
    { name: "Global Movie Eligibility & Adult Content Tests", fn: runMovieEligibilityTests },
    { name: "TV Phase 0 Foundation & Regression Tests", fn: runTvFoundationTests },
    { name: "TV Phase 1 Core Flow & Calibration Engine Tests", fn: runTvCalibrationTests },
  ];

  let passedSuites = 0;
  let failedSuites = 0;

  for (const suite of testSuites) {
    try {
      console.log(`\n---> Running Suite: ${suite.name}`);
      await suite.fn();
      passedSuites++;
    } catch (err) {
      console.error(`❌ Suite Failed: ${suite.name}`, err);
      failedSuites++;
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log("\n===============================================================");
  console.log("TEST SUITE SUMMARY");
  console.log("===============================================================");
  console.log(`Total Suites Run : ${testSuites.length}`);
  console.log(`Passed Suites    : ${passedSuites}`);
  console.log(`Failed Suites    : ${failedSuites}`);
  console.log(`Execution Time   : ${durationSec}s`);
  console.log("===============================================================\n");

  if (failedSuites > 0) {
    process.exit(1);
  }
}

runAllUnitAndRegressionTests();
