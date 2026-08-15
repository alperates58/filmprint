import * as fs from "fs";
import * as path from "path";
import {
  ProfileQualityEvaluationResult,
  GlobalQualityLabSummary,
  EvaluatedRecommendationItem,
} from "./types";
import { CatalogHealthReport } from "./catalog-health";

/**
 * Aggregates individual profile evaluation results into a comprehensive Global Quality Lab Summary.
 */
export function aggregateGlobalResults(
  profileResults: ProfileQualityEvaluationResult[],
  catalogHealth: CatalogHealthReport,
  isBaseline: boolean,
  versionIdentifier: string
): GlobalQualityLabSummary {
  const n = profileResults.length || 1;

  const avgPrecisionAt5 = Number((profileResults.reduce((a, b) => a + b.precisionAt5, 0) / n).toFixed(3));
  const avgPrecisionAt10 = Number((profileResults.reduce((a, b) => a + b.precisionAt10, 0) / n).toFixed(3));
  const avgPrecisionAt20 = Number((profileResults.reduce((a, b) => a + b.precisionAt20, 0) / n).toFixed(3));
  const avgRecallAt10 = Number((profileResults.reduce((a, b) => a + b.recallAt10, 0) / n).toFixed(3));
  const avgRecallAt20 = Number((profileResults.reduce((a, b) => a + b.recallAt20, 0) / n).toFixed(3));
  const avgHitRateAt10 = Number((profileResults.reduce((a, b) => a + b.hitRateAt10, 0) / n).toFixed(3));
  const avgHitRateAt20 = Number((profileResults.reduce((a, b) => a + b.hitRateAt20, 0) / n).toFixed(3));
  const avgMRR = Number((profileResults.reduce((a, b) => a + b.mrr, 0) / n).toFixed(3));
  const avgNDCGAt10 = Number((profileResults.reduce((a, b) => a + b.ndcgAt10, 0) / n).toFixed(3));
  const avgNDCGAt20 = Number((profileResults.reduce((a, b) => a + b.ndcgAt20, 0) / n).toFixed(3));
  const avgHoldoutHitRate = Number((profileResults.reduce((a, b) => a + b.holdoutHitRate, 0) / n).toFixed(3));

  const avgIntraListDiversity = Number((profileResults.reduce((a, b) => a + b.intraListDiversity, 0) / n).toFixed(3));
  const avgTopGenreConcentration = Number((profileResults.reduce((a, b) => a + b.topGenreConcentrationRate, 0) / n).toFixed(3));
  const avgKnownUnwatchedShare = Number((profileResults.reduce((a, b) => a + b.candidateSourceDistribution.knownUnwatchedPct, 0) / n).toFixed(2));
  const avgFreshDiscoveryShare = Number((profileResults.reduce((a, b) => a + b.candidateSourceDistribution.freshDiscoveryPct, 0) / n).toFixed(2));
  const avgAdjacentDiscoveryShare = Number((profileResults.reduce((a, b) => a + b.candidateSourceDistribution.adjacentDiscoveryPct, 0) / n).toFixed(2));

  const avgPrecisionGte90 = Number((profileResults.reduce((a, b) => a + b.precisionScoreGte90, 0) / n).toFixed(3));
  const avgPrecisionGte85 = Number((profileResults.reduce((a, b) => a + b.precisionScoreGte85, 0) / n).toFixed(3));
  const avgPrecisionGte80 = Number((profileResults.reduce((a, b) => a + b.precisionScoreGte80, 0) / n).toFixed(3));

  const totalFalseHighScores = profileResults.reduce((a, b) => a + b.falseHighScores.length, 0);
  const totalFalseLowScores = profileResults.reduce((a, b) => a + b.falseLowScores.length, 0);
  const overallMonotonicityPass = profileResults.every((p) => p.scoreMonotonicityPass);

  const avgHomeMeaningfulRows = Number((profileResults.reduce((a, b) => a + b.homeMeaningfulRowCount, 0) / n).toFixed(1));
  const avgHomeCategoryFit = Number((profileResults.reduce((a, b) => a + b.homeCategoryFitAverage, 0) / n).toFixed(2));
  const avgCrossRowDuplicateRate = Number((profileResults.reduce((a, b) => a + b.homeCrossRowDuplicateRate, 0) / n).toFixed(3));

  const powerUserResult = profileResults.find((p) => p.spec.id === "P15_POWER_USER_1043");
  const powerUserHomePassed = powerUserResult ? powerUserResult.homeMeaningfulRowCount >= 5 : false;

  const totalInvalidReferences = profileResults.reduce((a, b) => a + b.invalidReferenceCount, 0);
  const avgMaxReferenceOveruse = Number(
    (
      profileResults.reduce((a, b) => a + (b.mostReusedReference?.percentage || 0), 0) / n
    ).toFixed(1)
  );

  // Sub-scores
  const relevanceScore = Number((profileResults.reduce((a, b) => a + b.subScores.relevanceScore, 0) / n).toFixed(1));
  const calibrationScore = Number((profileResults.reduce((a, b) => a + b.subScores.calibrationScore, 0) / n).toFixed(1));
  const categoryFitScore = Number((profileResults.reduce((a, b) => a + b.subScores.categoryFitScore, 0) / n).toFixed(1));
  const diversityScore = Number((profileResults.reduce((a, b) => a + b.subScores.diversityScore, 0) / n).toFixed(1));
  const referenceQualityScore = Number((profileResults.reduce((a, b) => a + b.subScores.referenceQualityScore, 0) / n).toFixed(1));
  const supplyHealthScore = Number((profileResults.reduce((a, b) => a + b.subScores.supplyHealthScore, 0) / n).toFixed(1));

  const overallQualityScore = Number(
    (
      relevanceScore * 0.30 +
      calibrationScore * 0.20 +
      categoryFitScore * 0.20 +
      diversityScore * 0.15 +
      referenceQualityScore * 0.10 +
      supplyHealthScore * 0.05
    ).toFixed(1)
  );

  // Failures diagnosis
  const failuresFound = {
    critical: [] as string[],
    high: [] as string[],
    medium: [] as string[],
    low: [] as string[],
  };

  if (!powerUserHomePassed) {
    failuresFound.critical.push("Power User P15 failed home category supply (meaningful rows < 5)");
  }
  if (totalInvalidReferences > 0) {
    failuresFound.critical.push(`${totalInvalidReferences} invalid reference explanations found (reference was not positively rated)`);
  }
  if (avgPrecisionAt10 < 0.60) {
    failuresFound.high.push(`Average Precision@10 is below 0.60 threshold (${avgPrecisionAt10})`);
  }
  if (avgPrecisionGte90 < 0.75) {
    failuresFound.high.push(`Precision for 90+ display match scores is below 0.75 (${avgPrecisionGte90})`);
  }
  if (totalFalseHighScores > 10) {
    failuresFound.high.push(`High false positive rate for 90+ display scores (${totalFalseHighScores} false high candidates)`);
  }
  if (avgCrossRowDuplicateRate > 0.12) {
    failuresFound.medium.push(`Cross-row duplication rate on Home exceeds 12% (${(avgCrossRowDuplicateRate * 100).toFixed(1)}%)`);
  }
  if (avgMaxReferenceOveruse > 30.0) {
    failuresFound.medium.push(`Reference movie overuse rate exceeds 30% (${avgMaxReferenceOveruse}%)`);
  }
  if (!overallMonotonicityPass) {
    failuresFound.medium.push("Score monotonicity failure detected in one or more profiles");
  }

  // Global Worst 20 & Best 20
  const allRecsWithProfile: (EvaluatedRecommendationItem & { profileId: string; profileName: string })[] = [];
  for (const p of profileResults) {
    for (const r of p.topRecommendations) {
      allRecsWithProfile.push({
        ...r,
        profileId: p.spec.id,
        profileName: p.spec.name,
      });
    }
  }

  const globalWorst20 = [...allRecsWithProfile]
    .sort((a, b) => a.expectedRelevance - b.expectedRelevance || b.displayMatchScore - a.displayMatchScore)
    .slice(0, 20);

  const globalBest20 = [...allRecsWithProfile]
    .sort((a, b) => b.expectedRelevance - a.expectedRelevance || b.displayMatchScore - a.displayMatchScore)
    .slice(0, 20);

  return {
    timestamp: new Date().toISOString(),
    isBaseline,
    versionIdentifier,
    totalProfilesEvaluated: profileResults.length,
    totalCatalogMovies: catalogHealth.totalMovies,
    totalEligibleMovies: catalogHealth.eligibleRecommendation,
    avgPrecisionAt5,
    avgPrecisionAt10,
    avgPrecisionAt20,
    avgRecallAt10,
    avgRecallAt20,
    avgHitRateAt10,
    avgHitRateAt20,
    avgMRR,
    avgNDCGAt10,
    avgNDCGAt20,
    avgHoldoutHitRate,
    avgIntraListDiversity,
    avgTopGenreConcentration,
    avgKnownUnwatchedShare,
    avgFreshDiscoveryShare,
    avgAdjacentDiscoveryShare,
    avgPrecisionGte90,
    avgPrecisionGte85,
    avgPrecisionGte80,
    totalFalseHighScores,
    totalFalseLowScores,
    overallMonotonicityPass,
    avgHomeMeaningfulRows,
    avgHomeCategoryFit,
    avgCrossRowDuplicateRate,
    powerUserHomePassed,
    totalInvalidReferences,
    avgMaxReferenceOveruse,
    relevanceScore,
    calibrationScore,
    categoryFitScore,
    diversityScore,
    referenceQualityScore,
    supplyHealthScore,
    overallQualityScore,
    failuresFound,
    globalWorst20,
    globalBest20,
    profileResults,
  };
}

/**
 * Generates formatted Markdown report.
 */
export function generateMarkdownReport(
  summary: GlobalQualityLabSummary,
  catalogHealth: CatalogHealthReport
): string {
  const title = summary.isBaseline ? "PHASE 9 — RECOMMENDATION BASELINE QUALITY REPORT" : "PHASE 9 — RECOMMENDATION QUALITY VALIDATION & TUNING REPORT";

  let md = `# ${title}
**Tarih / Saat**: ${summary.timestamp}  
**Engine Versiyon**: \`${summary.versionIdentifier}\`  
**Mod**: ${summary.isBaseline ? "PHASE9_BASELINE" : "POST_TUNING_VERIFICATION"}  
**Toplam Test Edilen Profil**: ${summary.totalProfilesEvaluated} (Maturity: 30 — 1500+ etkileşim)  
**Yerel Katalog**: ${summary.totalCatalogMovies} film (${summary.totalEligibleMovies} eligible)  

---

## 1. Executive Summary & Composite Scores

| Metrik Grubu | Alt Skor (/100) | Ağırlık | Katkı |
|---|---|---|---|
| **Relevance & Ranking** | ${summary.relevanceScore} | 30% | ${(summary.relevanceScore * 0.30).toFixed(1)} |
| **Score Calibration & Monotonicity** | ${summary.calibrationScore} | 20% | ${(summary.calibrationScore * 0.20).toFixed(1)} |
| **Home Editorial Category Fit** | ${summary.categoryFitScore} | 20% | ${(summary.categoryFitScore * 0.20).toFixed(1)} |
| **Diversity & Exploration (ILD)** | ${summary.diversityScore} | 15% | ${(summary.diversityScore * 0.15).toFixed(1)} |
| **Reference Evidence & Grounding** | ${summary.referenceQualityScore} | 10% | ${(summary.referenceQualityScore * 0.10).toFixed(1)} |
| **Supply & Attrition Health** | ${summary.supplyHealthScore} | 5% | ${(summary.supplyHealthScore * 0.05).toFixed(1)} |
| **OVERALL QUALITY SCORE** | **${summary.overallQualityScore} / 100** | 100% | **${summary.overallQualityScore}** |

---

## 2. Global Aggregate Performance Metrics

### A. Relevance & Holdout Retrieval
- **Average Precision@5**: \`${(summary.avgPrecisionAt5 * 100).toFixed(1)}%\`
- **Average Precision@10**: \`${(summary.avgPrecisionAt10 * 100).toFixed(1)}%\`
- **Average Precision@20**: \`${(summary.avgPrecisionAt20 * 100).toFixed(1)}%\`
- **Average Recall@10**: \`${(summary.avgRecallAt10 * 100).toFixed(1)}%\`
- **Average Recall@20**: \`${(summary.avgRecallAt20 * 100).toFixed(1)}%\`
- **Average Hit Rate@10**: \`${(summary.avgHitRateAt10 * 100).toFixed(1)}%\`
- **Average MRR**: \`${summary.avgMRR}\`
- **Average NDCG@10**: \`${summary.avgNDCGAt10}\`
- **Average NDCG@20**: \`${summary.avgNDCGAt20}\`
- **Average Holdout Retrieval Rate**: \`${(summary.avgHoldoutHitRate * 100).toFixed(1)}%\`

### B. Score Calibration & Monotonicity
- **Precision(Match >= 90%)**: \`${(summary.avgPrecisionGte90 * 100).toFixed(1)}%\`
- **Precision(Match >= 85%)**: \`${(summary.avgPrecisionGte85 * 100).toFixed(1)}%\`
- **Precision(Match >= 80%)**: \`${(summary.avgPrecisionGte80 * 100).toFixed(1)}%\`
- **Total False High Scores (Expected 0/1, Match >= 90)**: \`${summary.totalFalseHighScores}\`
- **Total False Low Scores (Expected 3, Match < 70)**: \`${summary.totalFalseLowScores}\`
- **Score Monotonicity Passed Across All Profiles**: \`${summary.overallMonotonicityPass ? "EVET (PASS)" : "HAYIR (FAIL)"}\`

### C. Diversity, Discovery & Source Distribution
- **Intra-List Diversity (ILD)**: \`${summary.avgIntraListDiversity}\`
- **Top Genre Concentration Rate**: \`${(summary.avgTopGenreConcentration * 100).toFixed(1)}%\`
- **Candidate Source Distribution**:
  - \`KNOWN_UNWATCHED\`: \`${(summary.avgKnownUnwatchedShare * 100).toFixed(1)}%\`
  - \`FRESH_DISCOVERY\`: \`${(summary.avgFreshDiscoveryShare * 100).toFixed(1)}%\`
  - \`ADJACENT_DISCOVERY\`: \`${(summary.avgAdjacentDiscoveryShare * 100).toFixed(1)}%\`

### D. Home Categories & Cross-Row Duplication
- **Average Meaningful Home Rows**: \`${summary.avgHomeMeaningfulRows}\`
- **Average Category Fit (Context Score)**: \`${summary.avgHomeCategoryFit}\`
- **Cross-Row Duplicate Rate**: \`${(summary.avgCrossRowDuplicateRate * 100).toFixed(1)}%\`
- **Power User (P15) Home Supply Pass (>=5 rows)**: \`${summary.powerUserHomePassed ? "EVET (PASS)" : "HAYIR (FAIL)"}\`

### E. Reference Quality & Explanations
- **Total Invalid References (Disliked or Unrated)**: \`${summary.totalInvalidReferences}\` (Hedef: 0)
- **Average Max Reference Overuse Rate**: \`${summary.avgMaxReferenceOveruse}%\` (Uyarı Eşiği: >30%)

---

## 3. Local Catalog Sizing & Supply Audit

- **Toplam Katalog Film Sayısı**: ${catalogHealth.totalMovies}
- **Eligible Film Sayısı (Recommendation)**: ${catalogHealth.eligibleRecommendation}
- **Eligible Film Sayısı (Home Feed)**: ${catalogHealth.eligibleHome}
- **Poster & Overview Kapsamı**: Poster %${((catalogHealth.withPosterCount / catalogHealth.totalMovies) * 100).toFixed(1)}, Overview %${((catalogHealth.withOverviewCount / catalogHealth.totalMovies) * 100).toFixed(1)}
- **Power User (1043 Etkileşim) Kalan Unseen Aday Havuzu**: ${catalogHealth.powerUserSupply.fixture1043Remaining} film
- **Super Power User (1500 Etkileşim) Kalan Unseen Aday Havuzu**: ${catalogHealth.powerUserSupply.fixture1500Remaining} film
- **Katalog Supply Durumu**: \`[${catalogHealth.powerUserSupply.supplyStatus}]\`

---

## 4. Per-Profile Detailed Performance Breakdown

| ID | Profil Adı | Etkileşim (W/NW) | Kalan Aday | P@10 | NDCG@10 | Holdout Hit | ILD | 90+ Prec | Home Rows | Skor /100 |
|---|---|---|---|---|---|---|---|---|---|---|
`;

  for (const p of summary.profileResults) {
    md += `| \`${p.spec.id}\` | ${p.spec.name} | ${p.interactionCount} (${p.watchedCount}/${p.notWatchedCount}) | ${p.unseenEligibleCatalogCount} | ${(p.precisionAt10 * 100).toFixed(1)}% | ${p.ndcgAt10} | ${(p.holdoutHitRate * 100).toFixed(0)}% | ${p.intraListDiversity} | ${(p.precisionScoreGte90 * 100).toFixed(0)}% | ${p.homeMeaningfulRowCount} | **${p.overallProfileScore}** |\n`;
  }

  md += `\n---

## 5. Diagnostic Worst 20 Recommendations (Global Failure Analysis)

| Profil | Film | Skor | TMDB Puan | Kaynak | Beklenen | Seçilen Referans | Hata Nedeni / Açıklama |
|---|---|---|---|---|---|---|---|
`;

  for (const w of summary.globalWorst20) {
    md += `| \`${w.profileId}\` | **${w.title}** (${w.releaseYear}) | %${w.displayMatchScore} | ${w.voteAverage} | \`${w.candidateSource}\` | \`${w.expectedRelevance}/3\` | ${w.selectedReferenceTitle || "—"} | ${w.reasons[0] || "—"} |\n`;
  }

  md += `\n---

## 6. Diagnostic Top 20 Strongest Recommendations (Best Cases)

| Profil | Film | Skor | TMDB Puan | Kaynak | Beklenen | Seçilen Referans |
|---|---|---|---|---|---|---|
`;

  for (const b of summary.globalBest20) {
    md += `| \`${b.profileId}\` | **${b.title}** (${b.releaseYear}) | %${b.displayMatchScore} | ${b.voteAverage} | \`${b.candidateSource}\` | \`${b.expectedRelevance}/3\` | ${b.selectedReferenceTitle || "—"} |\n`;
  }

  md += `\n---

## 7. Failures & Diagnostics Summary

- **Kritik Hatalar (Critical)**: ${summary.failuresFound.critical.length > 0 ? summary.failuresFound.critical.map((f) => `\n  - ❌ ${f}`).join("") : "Yok (None)"}
- **Yüksek Öncelikli Uyarılar (High)**: ${summary.failuresFound.high.length > 0 ? summary.failuresFound.high.map((f) => `\n  - ⚠️ ${f}`).join("") : "Yok (None)"}
- **Orta Öncelikli Uyarılar (Medium)**: ${summary.failuresFound.medium.length > 0 ? summary.failuresFound.medium.map((f) => `\n  - ℹ️ ${f}`).join("") : "Yok (None)"}
`;

  return md;
}

/**
 * Saves all generated artifacts to artifacts/phase9/ directory.
 */
export async function saveQualityLabArtifacts(
  summary: GlobalQualityLabSummary,
  catalogHealth: CatalogHealthReport,
  outputDir: string = path.join(process.cwd(), "artifacts", "phase9")
): Promise<{
  reportPath: string;
  jsonPath: string;
  reviewPath: string;
}> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const prefix = summary.isBaseline ? "phase9-baseline" : "phase9";
  const reportPath = path.join(outputDir, `${prefix}-report.md`);
  const jsonPath = path.join(outputDir, `${prefix}-results.json`);
  const reviewPath = path.join(outputDir, `recommendation-quality-review.json`);

  // 1. Markdown Report
  const mdContent = generateMarkdownReport(summary, catalogHealth);
  fs.writeFileSync(reportPath, mdContent, "utf-8");
  console.log(`[Reporter] Generated Markdown report at: ${reportPath}`);

  // 2. Machine-readable JSON
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2), "utf-8");
  console.log(`[Reporter] Generated JSON results at: ${jsonPath}`);

  // 3. Human Review Export JSON
  const humanReviewExport = {
    generatedAt: summary.timestamp,
    versionIdentifier: summary.versionIdentifier,
    totalProfiles: summary.totalProfilesEvaluated,
    profiles: summary.profileResults.map((p) => ({
      profileId: p.spec.id,
      profileName: p.spec.name,
      interactionCount: p.interactionCount,
      watchedCount: p.watchedCount,
      notWatchedCount: p.notWatchedCount,
      overallScore: p.overallProfileScore,
      recommendations: p.topRecommendations.map((r) => ({
        rank: r.rank,
        title: r.title,
        tmdbId: r.tmdbId,
        releaseYear: r.releaseYear,
        genres: r.genres,
        displayMatchScore: r.displayMatchScore,
        rawMatchScore: r.rawMatchScore,
        tmdbVoteAverage: r.voteAverage,
        candidateSource: r.candidateSource,
        selectedReference: r.selectedReferenceTitle,
        referenceSimilarity: r.referenceSimilarity,
        expectedRelevance: r.expectedRelevance,
        isHoldout: r.isHoldout,
        headline: r.headline,
        reasons: r.reasons,
      })),
      homeRows: p.homeRows.map((h) => ({
        category: h.categoryTitle,
        mode: h.categoryMode,
        averageContextFit: h.averageContextFit,
        movies: h.movies.map((m) => ({ title: m.title, contextFit: m.contextFit })),
      })),
    })),
  };

  fs.writeFileSync(reviewPath, JSON.stringify(humanReviewExport, null, 2), "utf-8");
  console.log(`[Reporter] Generated Human Review export at: ${reviewPath}`);

  return {
    reportPath,
    jsonPath,
    reviewPath,
  };
}
