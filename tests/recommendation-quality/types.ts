import { RatingStatus, InteractionStatus, RecommendationAction } from "@prisma/client";
import { CandidateSource, EditorialCategoryMode } from "../../lib/recommendation/types";
import { FilmDnaResult } from "../../lib/profile/types";

export type MaturityLevel = 30 | 100 | 120 | 150 | 180 | 200 | 250 | 300 | 500 | 1043 | 1500;

export interface FixtureArchetypeSpec {
  id: string;
  name: string;
  description: string;
  maturity: MaturityLevel;
  targetWatchedCount: number;
  targetNotWatchedCount: number;
  
  // Independent Ground Truth / Taste Intent Definitions
  primaryGenres: string[];
  secondaryGenres: string[];
  dislikedGenres: string[];
  preferredEras: string[]; // e.g. ["1970s", "1990s", "2010s"]
  preferredLanguages?: string[]; // e.g. ["ko", "ja", "fr"]
  popularityPreference: "mainstream" | "balanced" | "niche";
  
  // Curated Anchor Movies (Authentic TMDB IDs / Titles for deterministic taste seeding & holdout)
  anchorLoveTmdbIds: number[];
  anchorLikeTmdbIds: number[];
  anchorDislikeTmdbIds: number[];
  
  // Holdout Positives (Omitted from profile interaction input, must be recommended by engine)
  holdoutPositiveTmdbIds: number[];
  
  // Optional Feedbacks
  feedbackSignals?: {
    tmdbId: number;
    action: RecommendationAction;
  }[];
}

export interface GroundTruthMovieLabel {
  movieId: string;
  tmdbId: number;
  title: string;
  expectedRelevance: 0 | 1 | 2 | 3; // 3: Highly Relevant, 2: Relevant, 1: Weakly Relevant, 0: Irrelevant
  relevanceReasons: string[];
  isHoldout: boolean;
}

export interface EvaluatedRecommendationItem {
  rank: number;
  movieId: string;
  tmdbId: number;
  title: string;
  originalTitle: string;
  releaseYear: number | null;
  genres: string[];
  voteAverage: number;
  popularity: number;
  candidateSource: CandidateSource;
  rawMatchScore: number;
  displayMatchScore: number;
  qualityScore: number;
  matchLabel: string;
  headline: string;
  reasons: string[];
  isAiGenerated: boolean;
  selectedReferenceTitle: string | null;
  referenceSimilarity: number | null;
  expectedRelevance: number; // 0, 1, 2, 3
  isHoldout: boolean;
}

export interface EvaluatedHomeRow {
  categoryId: string;
  categoryTitle: string;
  categoryMode: EditorialCategoryMode;
  candidateCount: number;
  renderedCount: number;
  movies: {
    movieId: string;
    tmdbId: number;
    title: string;
    genres: string[];
    releaseYear: number | null;
    voteAverage: number;
    contextFit: number;
    categoryScore: number;
  }[];
  averageContextFit: number;
  categoryFitPass: boolean;
}

export interface PipelineAttritionStats {
  candidatePoolRaw: number;
  postEligibility: number;
  postQualityFilter: number;
  postTasteScore: number;
  postDislikePenalty: number;
  finalRecommendationCount: number;
}

export interface ProfileQualityEvaluationResult {
  spec: FixtureArchetypeSpec;
  userId: string;
  interactionCount: number;
  watchedCount: number;
  notWatchedCount: number;
  unseenEligibleCatalogCount: number;
  profileConfidence: number;
  
  // Relevance & Ranking Metrics
  precisionAt5: number;
  precisionAt10: number;
  precisionAt20: number;
  recallAt10: number;
  recallAt20: number;
  hitRateAt10: number;
  hitRateAt20: number;
  mrr: number;
  ndcgAt10: number;
  ndcgAt20: number;
  
  // Holdout Metrics
  holdoutTotal: number;
  holdoutHitsTop20: number;
  holdoutHitRate: number;
  
  // Score Calibration Metrics
  scoreHistogram: {
    under50: number;
    fiftyTo59: number;
    sixtyTo69: number;
    seventyTo79: number;
    eightyTo89: number;
    ninetyTo97: number;
  };
  precisionScoreGte90: number;
  precisionScoreGte85: number;
  precisionScoreGte80: number;
  falseHighScores: EvaluatedRecommendationItem[]; // expected 0/1, match >= 90
  falseLowScores: EvaluatedRecommendationItem[];  // expected 3, match < 70
  scoreMonotonicityPass: boolean;
  scoreSaturationWarning: boolean;
  
  // Diversity & Novelty Metrics
  genreDiversityEntropy: number;
  topGenreConcentrationRate: number; // % of top dominant genre
  topGenreConcentrationWarning: boolean;
  eraDiversityEntropy: number;
  intraListDiversity: number; // ILD
  candidateSourceDistribution: {
    knownUnwatchedPct: number;
    freshDiscoveryPct: number;
    adjacentDiscoveryPct: number;
  };
  
  // Reference Quality Metrics
  totalRecommendations: number;
  referenceUsageMap: Record<string, number>;
  mostReusedReference: { title: string; count: number; percentage: number } | null;
  referenceOveruseWarning: boolean;
  invalidReferenceCount: number; // reference not positively rated
  
  // Supply & Attrition
  attrition: PipelineAttritionStats;
  
  // Home Categories Evaluation
  homeRows: EvaluatedHomeRow[];
  homeMeaningfulRowCount: number;
  homeAverageMoviesPerRow: number;
  homeCrossRowDuplicatesCount: number;
  homeCrossRowDuplicateRate: number;
  homeMaxRowAppearancesPerMovie: number;
  homeCategoryFitAverage: number;
  
  // Composite Sub-Scores (/100)
  subScores: {
    relevanceScore: number;
    calibrationScore: number;
    categoryFitScore: number;
    diversityScore: number;
    referenceQualityScore: number;
    supplyHealthScore: number;
  };
  overallProfileScore: number;
  
  // Evaluated Items
  topRecommendations: EvaluatedRecommendationItem[];
  worstRecommendations: EvaluatedRecommendationItem[];
  bestRecommendations: EvaluatedRecommendationItem[];
}

export interface GlobalQualityLabSummary {
  timestamp: string;
  isBaseline: boolean;
  versionIdentifier: string;
  totalProfilesEvaluated: number;
  totalCatalogMovies: number;
  totalEligibleMovies: number;
  
  // Aggregate Metrics
  avgPrecisionAt5: number;
  avgPrecisionAt10: number;
  avgPrecisionAt20: number;
  avgRecallAt10: number;
  avgRecallAt20: number;
  avgHitRateAt10: number;
  avgHitRateAt20: number;
  avgMRR: number;
  avgNDCGAt10: number;
  avgNDCGAt20: number;
  avgHoldoutHitRate: number;
  
  // Diversity & Novelty Aggregates
  avgIntraListDiversity: number;
  avgTopGenreConcentration: number;
  avgKnownUnwatchedShare: number;
  avgFreshDiscoveryShare: number;
  avgAdjacentDiscoveryShare: number;
  
  // Calibration Aggregates
  avgPrecisionGte90: number;
  avgPrecisionGte85: number;
  avgPrecisionGte80: number;
  totalFalseHighScores: number;
  totalFalseLowScores: number;
  overallMonotonicityPass: boolean;
  
  // Home Category Aggregates
  avgHomeMeaningfulRows: number;
  avgHomeCategoryFit: number;
  avgCrossRowDuplicateRate: number;
  powerUserHomePassed: boolean;
  
  // Reference Aggregates
  totalInvalidReferences: number;
  avgMaxReferenceOveruse: number;
  
  // Sub-Scores (/100)
  relevanceScore: number;
  calibrationScore: number;
  categoryFitScore: number;
  diversityScore: number;
  referenceQualityScore: number;
  supplyHealthScore: number;
  
  // Overall Recommendation Quality Score (/100)
  overallQualityScore: number;
  
  // Failures & Diagnostics
  failuresFound: {
    critical: string[];
    high: string[];
    medium: string[];
    low: string[];
  };
  
  // Top Worst & Top Best Recommendations Globally
  globalWorst20: (EvaluatedRecommendationItem & { profileId: string; profileName: string })[];
  globalBest20: (EvaluatedRecommendationItem & { profileId: string; profileName: string })[];
  
  // Per-Profile Results
  profileResults: ProfileQualityEvaluationResult[];
}
