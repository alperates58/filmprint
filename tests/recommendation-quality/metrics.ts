import {
  EvaluatedRecommendationItem,
  EvaluatedHomeRow,
  PipelineAttritionStats,
  ProfileQualityEvaluationResult,
  FixtureArchetypeSpec,
} from "./types";

/**
 * Precision@K: Fraction of top K recommendations that have expectedRelevance >= 2 (Relevant or Highly Relevant).
 */
export function calculatePrecisionAtK(
  items: EvaluatedRecommendationItem[],
  k: number
): number {
  if (items.length === 0 || k <= 0) return 0;
  const topK = items.slice(0, k);
  const relevantCount = topK.filter((i) => i.expectedRelevance >= 2).length;
  return Number((relevantCount / topK.length).toFixed(3));
}

/**
 * Recall@K: Fraction of total available holdout positives captured in top K.
 */
export function calculateRecallAtK(
  items: EvaluatedRecommendationItem[],
  totalHoldouts: number,
  k: number
): number {
  if (totalHoldouts <= 0 || items.length === 0 || k <= 0) return 0;
  const topK = items.slice(0, k);
  const hitCount = topK.filter((i) => i.isHoldout).length;
  return Number((hitCount / totalHoldouts).toFixed(3));
}

/**
 * HitRate@K: Binary 1 if at least one holdout positive is found in top K, else 0.
 */
export function calculateHitRateAtK(
  items: EvaluatedRecommendationItem[],
  k: number
): number {
  if (items.length === 0 || k <= 0) return 0;
  const topK = items.slice(0, k);
  const hasHit = topK.some((i) => i.isHoldout);
  return hasHit ? 1.0 : 0.0;
}

/**
 * MRR (Mean Reciprocal Rank): 1 / rank of the first holdout positive hit.
 */
export function calculateMRR(items: EvaluatedRecommendationItem[]): number {
  for (let idx = 0; idx < items.length; idx++) {
    if (items[idx].isHoldout) {
      return Number((1.0 / (idx + 1)).toFixed(3));
    }
  }
  return 0.0;
}

/**
 * NDCG@K (Normalized Discounted Cumulative Gain at rank K).
 * Graded relevance: 3 = Highly Relevant, 2 = Relevant, 1 = Weakly Relevant, 0 = Irrelevant.
 */
export function calculateNDCGAtK(
  items: EvaluatedRecommendationItem[],
  k: number
): number {
  if (items.length === 0 || k <= 0) return 0;
  const topK = items.slice(0, k);

  // 1. Compute DCG@K
  let dcg = 0;
  for (let i = 0; i < topK.length; i++) {
    const rel = topK[i].expectedRelevance;
    const gain = Math.pow(2, rel) - 1;
    const discount = Math.log2(i + 2); // rank 1 has discount log2(2) = 1
    dcg += gain / discount;
  }

  // 2. Compute IDCG@K (Ideal sorted relevance)
  const idealRelevances = topK.map((i) => i.expectedRelevance).sort((a, b) => b - a);
  let idcg = 0;
  for (let i = 0; i < idealRelevances.length; i++) {
    const rel = idealRelevances[i];
    const gain = Math.pow(2, rel) - 1;
    const discount = Math.log2(i + 2);
    idcg += gain / discount;
  }

  if (idcg === 0) return 0.0;
  return Number((dcg / idcg).toFixed(3));
}

/**
 * Shannon Entropy for categorical distribution.
 */
export function calculateEntropy(counts: Record<string, number>): number {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return 0.0;

  let entropy = 0;
  for (const count of Object.values(counts)) {
    if (count > 0) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
  }
  return Number(entropy.toFixed(3));
}

/**
 * Intra-List Diversity (ILD) across top recommendations based on genre Jaccard distance.
 */
export function calculateIntraListDiversity(
  items: EvaluatedRecommendationItem[]
): number {
  const sample = items.slice(0, 20);
  if (sample.length < 2) return 1.0;

  let totalDist = 0;
  let pairs = 0;

  for (let i = 0; i < sample.length; i++) {
    const genresA = new Set(sample[i].genres || []);
    for (let j = i + 1; j < sample.length; j++) {
      const genresB = new Set(sample[j].genres || []);
      const union = new Set([...genresA, ...genresB]);
      const intersection = [...genresA].filter((g) => genresB.has(g));

      const jaccardSim = union.size > 0 ? intersection.length / union.size : 0;
      const distance = 1.0 - jaccardSim;

      totalDist += distance;
      pairs++;
    }
  }

  return pairs > 0 ? Number((totalDist / pairs).toFixed(3)) : 1.0;
}

/**
 * Evaluates score distribution histogram, calibration, false positives & negatives.
 */
export function evaluateScoreCalibration(items: EvaluatedRecommendationItem[]) {
  const scoreHistogram = {
    under50: 0,
    fiftyTo59: 0,
    sixtyTo69: 0,
    seventyTo79: 0,
    eightyTo89: 0,
    ninetyTo97: 0,
  };

  const bucketRelevanceSum: Record<string, { total: number; count: number }> = {
    under50: { total: 0, count: 0 },
    fiftyTo59: { total: 0, count: 0 },
    sixtyTo69: { total: 0, count: 0 },
    seventyTo79: { total: 0, count: 0 },
    eightyTo89: { total: 0, count: 0 },
    ninetyTo97: { total: 0, count: 0 },
  };

  const falseHighScores: EvaluatedRecommendationItem[] = [];
  const falseLowScores: EvaluatedRecommendationItem[] = [];

  let gte90Count = 0;
  let gte90Relevant = 0;
  let gte85Count = 0;
  let gte85Relevant = 0;
  let gte80Count = 0;
  let gte80Relevant = 0;

  for (const item of items) {
    const score = item.displayMatchScore;
    const rel = item.expectedRelevance;

    let bucket: keyof typeof scoreHistogram = "under50";
    if (score >= 90) bucket = "ninetyTo97";
    else if (score >= 80) bucket = "eightyTo89";
    else if (score >= 70) bucket = "seventyTo79";
    else if (score >= 60) bucket = "sixtyTo69";
    else if (score >= 50) bucket = "fiftyTo59";

    scoreHistogram[bucket]++;
    bucketRelevanceSum[bucket].total += rel;
    bucketRelevanceSum[bucket].count++;

    // Precision at thresholds
    if (score >= 90) {
      gte90Count++;
      if (rel >= 2) gte90Relevant++;
    }
    if (score >= 85) {
      gte85Count++;
      if (rel >= 2) gte85Relevant++;
    }
    if (score >= 80) {
      gte80Count++;
      if (rel >= 2) gte80Relevant++;
    }

    // False high score diagnostic: expected 0 or 1, but match >= 90
    if (rel <= 1 && score >= 90) {
      falseHighScores.push(item);
    }

    // False low score diagnostic: expected 3, but match < 70
    if (rel === 3 && score < 70) {
      falseLowScores.push(item);
    }
  }

  const precisionScoreGte90 = gte90Count > 0 ? Number((gte90Relevant / gte90Count).toFixed(3)) : 1.0;
  const precisionScoreGte85 = gte85Count > 0 ? Number((gte85Relevant / gte85Count).toFixed(3)) : 1.0;
  const precisionScoreGte80 = gte80Count > 0 ? Number((gte80Relevant / gte80Count).toFixed(3)) : 1.0;

  // Score Saturation Warning: > 60% of items in 90+ bucket
  const scoreSaturationWarning = items.length > 0 && scoreHistogram.ninetyTo97 / items.length > 0.60;

  // Monotonicity Check: Average true relevance of 90+ >= 80-89 >= 70-79
  const avgRel90 = bucketRelevanceSum.ninetyTo97.count > 0 ? bucketRelevanceSum.ninetyTo97.total / bucketRelevanceSum.ninetyTo97.count : 3.0;
  const avgRel80 = bucketRelevanceSum.eightyTo89.count > 0 ? bucketRelevanceSum.eightyTo89.total / bucketRelevanceSum.eightyTo89.count : 2.0;
  const avgRel70 = bucketRelevanceSum.seventyTo79.count > 0 ? bucketRelevanceSum.seventyTo79.total / bucketRelevanceSum.seventyTo79.count : 1.5;

  const scoreMonotonicityPass = avgRel90 >= avgRel80 && avgRel80 >= (avgRel70 - 0.2);

  return {
    scoreHistogram,
    precisionScoreGte90,
    precisionScoreGte85,
    precisionScoreGte80,
    falseHighScores,
    falseLowScores,
    scoreSaturationWarning,
    scoreMonotonicityPass,
    bucketAverages: {
      avgRel90: Number(avgRel90.toFixed(2)),
      avgRel80: Number(avgRel80.toFixed(2)),
      avgRel70: Number(avgRel70.toFixed(2)),
    },
  };
}

/**
 * Calculates Composite Profile Score (/100) using weighted sub-scores:
 * - Relevance: 30%
 * - Calibration: 20%
 * - Category Fit: 20%
 * - Diversity: 15%
 * - Reference Quality: 10%
 * - Supply: 5%
 */
export function calculateCompositeProfileScore(subScores: {
  relevanceScore: number;
  calibrationScore: number;
  categoryFitScore: number;
  diversityScore: number;
  referenceQualityScore: number;
  supplyHealthScore: number;
}): number {
  const overall =
    subScores.relevanceScore * 0.30 +
    subScores.calibrationScore * 0.20 +
    subScores.categoryFitScore * 0.20 +
    subScores.diversityScore * 0.15 +
    subScores.referenceQualityScore * 0.10 +
    subScores.supplyHealthScore * 0.05;

  return Number(Math.max(0, Math.min(100, overall)).toFixed(1));
}
