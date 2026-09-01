(process.env as Record<string, string | undefined>).NODE_ENV = "test";

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
import { runMatchEngineV2Tests } from "./recommendation_v2.test";
import { runRecommendationV3Tests } from "./recommendation_v3.test";
import { runPwaTests } from "./pwa.test";
import { runMovieEligibilityTests } from "./movie_eligibility.test";
import { runTvFoundationTests } from "./tv_foundation.test";
import { runTvCalibrationTests } from "./tv_calibration.test";
import { runHybridRecommendationTests } from "./recommendation_hybrid.test";
import { runTvDnaCalculatorTests } from "./tv_dna_calculator.test";
import { runTvRecommendationMatcherTests } from "./tv_recommendation_matcher.test";
import { runTvHybridRecommendationTests } from "./recommendation_hybrid_tv.test";
import { runTvCalibrationSupplyTests } from "./tv_calibration_supply.test";
import { runHybridIntegrationRuntimeTests } from "./hybrid_integration_runtime.test";
import { runTmdbImageGuardTests } from "./tmdb_image_guard.test";
import { runHeaderModeNavigationTests } from "./header_mode_navigation.test";
import { runTvCalibrationSelectorRelaxationTests } from "./tv_calibration_selector_relaxation.test";
import { runHomeVisualContractTests } from "./home_visual_contract.test";
import { runTitleScriptEligibilityTests } from "./title_script_eligibility.test";
import { runTmdbTvLocalizationTests } from "./tmdb_tv_localization.test";
import { runTmdbSharedLocalizationTests } from "./tmdb_shared_localization.test";
import { runTvProgressionTests } from "./tv_progression.test";
import { runCatalogIngestionTests } from "./catalog_ingestion.test";
import { runCalibrationDatabaseFirstTests } from "./calibration_database_first.test";
import { runDeepSeekModelMigrationTests } from "./deepseek_model_migration.test";
import { runTvPersonalMatcherAndShortcutsTests } from "./tv_personal_matcher_and_shortcuts.test";
import { runDeepSeekAiTasteThinkingTests } from "./deepseek_ai_taste_thinking.test";
import { runModalBottomSheetPhaseGTests } from "./modal_bottom_sheet_phase_g.test";
import { runGrowthAndSeoTests } from "./growth_and_seo.test";
import { runMonetizationAndAdSenseTests } from "./monetization_and_adsense.test";
import { runPhaseHTests } from "./phase_h.test";
import { runPremiumEntitlementsTests } from "./premium_entitlements.test";
import { runMovieNightVotingTests } from "./movie_night_voting.test";
import { runTvDiscoveryQualityTests } from "./tv_discovery_quality.test";
import { runPaytrBillingTests } from "./paytr_billing.test";
import { runFilmTvPremiumParityTests } from "./film_tv_premium_parity.test";
import { runBomScanTest } from "./migration_bom.test";
import { runPremiumUxAndAdminTests } from "./premium_ux_and_admin.test";

async function runAllUnitAndRegressionTests() {
  console.log("===============================================================");
  console.log("FILMPRINT MASTER UNIT & REGRESSION TEST SUITE");
  console.log("===============================================================");

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
    { name: "TV Rank / Progression Tests", fn: runTvProgressionTests },
    { name: "Recommendation Feedback Tests", fn: runRecommendationFeedbackTests },
    { name: "Recommendation Matcher Tests", fn: runRecommendationMatcherTests },
    { name: "Recommendation Upgrade Tests", fn: runRecommendationUpgradeTests },
    { name: "Recommendation Engine V2 Tests", fn: runMatchEngineV2Tests },
    { name: "Recommendation Engine V3 Tests", fn: runRecommendationV3Tests },
    { name: "PWA & Safe Offline Foundation Tests", fn: runPwaTests },
    { name: "Global Movie Eligibility & Adult Content Tests", fn: runMovieEligibilityTests },
    { name: "Display Title Script & Ingestion Safety Tests", fn: runTitleScriptEligibilityTests },
    { name: "TMDB TV Localization Fallback Tests", fn: runTmdbTvLocalizationTests },
    { name: "Shared TMDB Metadata & Trailer Fallback Tests", fn: runTmdbSharedLocalizationTests },
    { name: "TV Phase 0 Foundation & Regression Tests", fn: runTvFoundationTests },
    { name: "TV Phase 1 Core Flow & Calibration Engine Tests", fn: runTvCalibrationTests },
    { name: "TV Phase 1.5 Calibration Supply & Replenishment Tests", fn: runTvCalibrationSupplyTests },
    { name: "TV Calibration Selector Relaxation Tests", fn: runTvCalibrationSelectorRelaxationTests },
    { name: "Header Mode-Aware Navigation Tests", fn: runHeaderModeNavigationTests },
    { name: "Home Visual Contract & UX Consistency Tests", fn: runHomeVisualContractTests },
    { name: "Phase 9.5 Hybrid Recommendation & AI Controls Tests", fn: runHybridRecommendationTests },
    { name: "TV Phase 2 Dizi DNA Calculator & Profile Tests", fn: runTvDnaCalculatorTests },
    { name: "TV Phase 3 Deterministic Match Engine & Candidate Selector Tests", fn: runTvRecommendationMatcherTests },
    { name: "TV Phase 3.5 Shared Hybrid AI Recommendation & Controls Tests", fn: runTvHybridRecommendationTests },
    { name: "Hybrid AI Runtime Integration & Real Order Permutation Tests", fn: runHybridIntegrationRuntimeTests },
    { name: "TMDB Image Guard & Poster Path Validation Tests", fn: runTmdbImageGuardTests },
    { name: "TMDB Catalog Ingestion Engine Tests", fn: runCatalogIngestionTests },
    { name: "Database-First Calibration & Supply Tests", fn: runCalibrationDatabaseFirstTests },
    { name: "DeepSeek Model Migration & Canonical Resolution Tests", fn: runDeepSeekModelMigrationTests },
    { name: "TV Personal Matcher & Shortcuts Parity Tests", fn: runTvPersonalMatcherAndShortcutsTests },
    { name: "DeepSeek AI Taste Thinking & Structured Output Tests", fn: runDeepSeekAiTasteThinkingTests },
    { name: "Phase G Detail Modals & Mobile Bottom Sheets Tests", fn: runModalBottomSheetPhaseGTests },
    { name: "Phase I-A & I-B Growth and SEO Foundation Tests", fn: runGrowthAndSeoTests },
    { name: "Phase I-C & I-D Monetization & AdSense Control Plane Tests", fn: runMonetizationAndAdSenseTests },
    { name: "Phase H Intelligence, Safety & Rank V2 Tests", fn: runPhaseHTests },
    { name: "Phase P1 Premium Product & Entitlements Tests", fn: runPremiumEntitlementsTests },
    { name: "Phase P1.1 Movie Night Consensus Voting Tests", fn: runMovieNightVotingTests },
    { name: "Phase P1.1 TV Catalog Quality & Discovery Tests", fn: runTvDiscoveryQualityTests },
    { name: "Phase P2 PayTR Billing & Subscription Tests", fn: runPaytrBillingTests },
    { name: "Phase P2 Film + TV Single Premium Parity & Regression Tests", fn: runFilmTvPremiumParityTests },
    { name: "Phase P2 Repository Migration UTF-8 BOM Validation", fn: runBomScanTest },
    { name: "Phase P2 Premium UX & Admin Operations Completion Tests", fn: runPremiumUxAndAdminTests },
  ];

  let passedSuites = 0;
  let failedSuites = 0;
  const failedSuiteNames: string[] = [];

  for (const suite of testSuites) {
    try {
      console.log(`\n---> Running Suite: ${suite.name}`);
      await suite.fn();
      passedSuites++;
    } catch (err) {
      console.error(`❌ Suite Failed: ${suite.name}`, err);
      failedSuites++;
      failedSuiteNames.push(suite.name);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log("\n===============================================================");
  console.log("TEST SUITE SUMMARY");
  console.log("===============================================================");
  console.log(`Total Suites Run : ${testSuites.length}`);
  console.log(`Passed Suites    : ${passedSuites}`);
  console.log(`Failed Suites    : ${failedSuites}`);
  if (failedSuiteNames.length > 0) {
    console.log(`Failed Suite Names: \n - ${failedSuiteNames.join("\n - ")}`);
  }
  console.log(`Execution Time   : ${durationSec}s`);
  console.log("===============================================================\n");

  if (failedSuites > 0) {
    process.exit(1);
  }
}

runAllUnitAndRegressionTests();
