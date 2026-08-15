import { assertSafetyOrExit, runSafetyNegativeTests } from "./safety";
import { auditCatalogHealth, printCatalogHealth } from "./catalog-health";
import { FIXTURE_PROFILES } from "./profiles";
import { evaluateProfileQuality } from "./evaluator";
import { aggregateGlobalResults, saveQualityLabArtifacts } from "./reporter";
import { ENGINE_V3_MATCH_VERSION } from "../../lib/recommendation/service";

/**
 * Main CLI Runner for Phase 9 Recommendation Quality Lab.
 */
async function main() {
  const startTime = Date.now();
  console.log("===============================================================");
  console.log("FILMPRINT — PHASE 9 RECOMMENDATION QUALITY VALIDATION & TUNING LAB");
  console.log("===============================================================\n");

  // Step 1: Safety & Isolation Verification
  runSafetyNegativeTests();
  assertSafetyOrExit();

  // Step 2: Local Catalog Audit
  console.log("---> Auditing Local PostgreSQL Movie Catalog...");
  const catalogHealth = await auditCatalogHealth();
  printCatalogHealth(catalogHealth);

  if (catalogHealth.eligibleRecommendation < 3000) {
    console.error(`❌ Catalog Error: Found only ${catalogHealth.eligibleRecommendation} eligible movies. Target is >= 3000.`);
    console.error("Please run: npm run phase9:seed or seedLocalCatalog() first.");
    process.exit(1);
  }

  // Step 3: Parse CLI Arguments
  const isBaseline = !process.argv.includes("--tuned");
  const versionIdentifier = isBaseline
    ? `Engine_v3.1_Baseline_v${ENGINE_V3_MATCH_VERSION}`
    : `Engine_v3.2_Tuned_v${ENGINE_V3_MATCH_VERSION}`;

  console.log(`---> Execution Mode: [${isBaseline ? "BASELINE RUN" : "POST-TUNING RUN"}]`);
  console.log(`---> Version Identifier: ${versionIdentifier}`);
  console.log(`---> Total Profiles to Evaluate: ${FIXTURE_PROFILES.length}\n`);

  // Step 4: Run Quality Lab for All 16 Profiles
  const profileResults = [];

  for (let i = 0; i < FIXTURE_PROFILES.length; i++) {
    const spec = FIXTURE_PROFILES[i];
    console.log(`\n[${i + 1}/${FIXTURE_PROFILES.length}] Processing Profile: ${spec.id} (${spec.maturity} interactions)...`);
    const result = await evaluateProfileQuality(spec);
    profileResults.push(result);
    console.log(`✓ Completed [${spec.id}]: Precision@10 = ${(result.precisionAt10 * 100).toFixed(1)}%, Home Rows = ${result.homeMeaningfulRowCount}, Profile Score = ${result.overallProfileScore}/100`);
  }

  // Step 5: Global Aggregation & Artifact Generation
  console.log("\n---> Aggregating Global Quality Summary...");
  const summary = aggregateGlobalResults(
    profileResults,
    catalogHealth,
    isBaseline,
    versionIdentifier
  );

  console.log("\n===============================================================");
  console.log("GLOBAL QUALITY LAB SUMMARY");
  console.log("===============================================================");
  console.log(`Overall Quality Score   : ${summary.overallQualityScore} / 100`);
  console.log(`- Relevance Score (30%) : ${summary.relevanceScore} / 100`);
  console.log(`- Calibration (20%)     : ${summary.calibrationScore} / 100`);
  console.log(`- Category Fit (20%)    : ${summary.categoryFitScore} / 100`);
  console.log(`- Diversity & ILD (15%) : ${summary.diversityScore} / 100`);
  console.log(`- Reference Qual (10%)  : ${summary.referenceQualityScore} / 100`);
  console.log(`- Supply Health (5%)    : ${summary.supplyHealthScore} / 100`);
  console.log("---------------------------------------------------------------");
  console.log(`Average Precision@10    : ${(summary.avgPrecisionAt10 * 100).toFixed(1)}%`);
  console.log(`Average NDCG@10         : ${summary.avgNDCGAt10}`);
  console.log(`Average Holdout Hit Rate: ${(summary.avgHoldoutHitRate * 100).toFixed(1)}%`);
  console.log(`Precision(Match >= 90%) : ${(summary.avgPrecisionGte90 * 100).toFixed(1)}%`);
  console.log(`Average Home Rows       : ${summary.avgHomeMeaningfulRows}`);
  console.log(`Cross-Row Duplicate Rate: ${(summary.avgCrossRowDuplicateRate * 100).toFixed(1)}%`);
  console.log(`Total False High Scores : ${summary.totalFalseHighScores}`);
  console.log(`Total Invalid References: ${summary.totalInvalidReferences}`);
  console.log("===============================================================\n");

  // Step 6: Save Artifacts
  const artifacts = await saveQualityLabArtifacts(summary, catalogHealth);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Phase 9 Lab Completed in ${durationSec}s.`);
  console.log(`- Markdown Report : ${artifacts.reportPath}`);
  console.log(`- JSON Results    : ${artifacts.jsonPath}`);
  console.log(`- Review Export   : ${artifacts.reviewPath}\n`);
}

main().catch((err) => {
  console.error("Quality Lab Runner Error:", err);
  process.exit(1);
});
