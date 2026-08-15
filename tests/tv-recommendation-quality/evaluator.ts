import { db } from "@/lib/db/client";
import { calculateTvTasteProfile } from "@/lib/tv/profile/calculator";
import { calculateTvMatch, calibrateTvMatchScore } from "@/lib/tv/recommendation/matcher";
import { applyTvDiversityRerank, normalizeDbTvShowToCandidate } from "@/lib/tv/recommendation/service";
import { findGroundedTvEvidence, calculateTvDislikePenalty } from "@/lib/tv/recommendation/evidence";
import { TV_QUALITY_FIXTURES, type TvQualityProfileFixture } from "./profiles";
import type { CandidateTvShow, TvTasteEvidenceShow, TvTasteEvidenceProfile, PersonalizedTvRecommendationItem } from "@/lib/tv/recommendation/types";
import type { TvInteractionData } from "@/lib/tv/profile/types";

export interface ProfileEvaluationResult {
  fixtureId: string;
  fixtureName: string;
  archetype: string;
  maturity: string;
  evidenceCount: number;
  supplyCount: number;
  precisionAt5: number;
  precisionAt10: number;
  precisionAt20: number;
  ndcgAt10: number;
  hitRateAt20: number;
  mrr: number;
  falseHighCount: number;
  falseLowCount: number;
  score90PlusPrecision: number;
  diversityIld: number;
  top5Matches: Array<{ name: string; score: number; relevance: number }>;
}

export interface LabAggregateReport {
  timestamp: string;
  totalFixtures: number;
  totalCatalogEvaluated: number;
  metrics: {
    meanPrecisionAt5: number;
    meanPrecisionAt10: number;
    meanPrecisionAt20: number;
    meanNdcgAt10: number;
    meanHitRateAt20: number;
    meanMrr: number;
    totalFalseHighs: number;
    totalFalseLows: number;
    precision90Plus: number;
    meanDiversityIld: number;
    meanSupplyCount: number;
    compositeScore: number;
  };
  profiles: ProfileEvaluationResult[];
}

/**
 * Independent ground-truth relevance function for holdout validation.
 * Strictly separated from the Matcher's internal weights.
 */
function computeHoldoutRelevance(show: CandidateTvShow, fixture: TvQualityProfileFixture): number {
  const genres = show.metadata?.genres || [];
  const pref = fixture.corePreferences;

  // Hard negative if disliked genre
  for (const dg of pref.dislikedGenres) {
    if (genres.includes(dg)) return 0.05;
  }

  let genreMatchCount = 0;
  for (const pg of pref.genres) {
    if (genres.includes(pg)) genreMatchCount++;
  }

  let rel = 0.25;
  if (genreMatchCount > 0) {
    rel += Math.min(0.55, genreMatchCount * 0.35);
  }

  // Language match
  if (pref.languages && pref.languages.length > 0) {
    if (pref.languages.includes(show.originalLanguage || "en")) {
      rel += 0.10;
    }
  }

  // Season match
  const seasons = show.metadata?.numberOfSeasons;
  if (pref.seasons && seasons !== null && seasons !== undefined) {
    if (pref.seasons.includes(seasons)) {
      rel += 0.08;
    }
  }

  // Runtime match
  const rawRun = show.metadata?.episodeRunTime ?? show.metadata?.episode_run_time;
  let run: number | null = null;
  if (Array.isArray(rawRun) && rawRun.length > 0) run = rawRun[0];
  else if (typeof rawRun === "number") run = rawRun;
  if (pref.runtimeRange && run !== null) {
    if (run >= pref.runtimeRange[0] && run <= pref.runtimeRange[1]) {
      rel += 0.08;
    }
  }

  // Quality boost
  const vote = show.voteAverage || 0;
  if (vote >= 7.5) rel += 0.05;
  if (vote >= 8.2) rel += 0.05;

  return Math.max(0.0, Math.min(1.0, Number(rel.toFixed(3))));
}

/**
 * Calculates Intra-List Distance (ILD) based on genre and format diversity.
 */
function calculateIntraListDistance(items: PersonalizedTvRecommendationItem[]): number {
  if (items.length <= 1) return 1.0;
  const sample = items.slice(0, 10);
  let totalDist = 0;
  let pairs = 0;

  for (let i = 0; i < sample.length; i++) {
    for (let j = i + 1; j < sample.length; j++) {
      const g1 = new Set(sample[i].tvShow.metadata?.genres || []);
      const g2 = new Set(sample[j].tvShow.metadata?.genres || []);
      const union = new Set([...g1, ...g2]).size;
      const inter = [...g1].filter((x) => g2.has(x)).length;
      const jaccardDist = union === 0 ? 1.0 : 1.0 - inter / union;
      totalDist += jaccardDist;
      pairs++;
    }
  }

  return pairs === 0 ? 1.0 : Number((totalDist / pairs).toFixed(3));
}

/**
 * Executes full TV Quality Lab evaluation.
 */
export async function runTvQualityEvaluation(): Promise<LabAggregateReport> {
  const dbShows = await db.tvShow.findMany({
    take: 3000,
    orderBy: { popularity: "desc" },
  });

  const allCandidates = dbShows.map(normalizeDbTvShowToCandidate);
  const profileResults: ProfileEvaluationResult[] = [];

  for (const fixture of TV_QUALITY_FIXTURES) {
    // 1. Generate synthetic interactions from candidate pool matching fixture preferences
    const interactions: TvInteractionData[] = [];
    const positiveEvidence: TvTasteEvidenceShow[] = [];
    const negativeEvidence: TvTasteEvidenceShow[] = [];

    // Filter relevant shows for positive evidence
    const matchingShows = allCandidates.filter((c) => computeHoldoutRelevance(c, fixture) >= 0.65);
    const dislikedShows = allCandidates.filter((c) =>
      fixture.corePreferences.dislikedGenres.some((dg) => (c.metadata?.genres || []).includes(dg))
    );

    // Split matching shows: take at most half (or evidenceTarget) for evidence to leave ample holdout test candidates
    const positiveTarget = Math.min(
      Math.max(5, Math.floor(matchingShows.length * 0.45)),
      fixture.evidenceTarget
    );

    for (let i = 0; i < positiveTarget && i < matchingShows.length; i++) {
      const s = matchingShows[i];
      const rating = i < positiveTarget * 0.65 ? "LOVE" : "LIKE";
      interactions.push({
        id: `synth-${fixture.id}-${s.id}`,
        tvShowId: s.id,
        status: "WATCHED",
        rating,
        answeredAt: new Date("2026-08-01T12:00:00Z"),
        updatedAt: new Date("2026-08-01T12:00:00Z"),
        tvShow: {
          id: s.id,
          tmdbId: s.tmdbId,
          name: s.name,
          originalName: s.originalName,
          firstAirDate: s.firstAirDate,
          lastAirDate: s.lastAirDate,
          status: s.status,
          originalLanguage: s.originalLanguage,
          popularity: s.popularity,
          voteAverage: s.voteAverage,
          metadata: s.metadata,
        },
      });

      positiveEvidence.push({
        id: s.id,
        tmdbId: s.tmdbId,
        name: s.name,
        posterPath: s.posterPath,
        rating,
        status: "WATCHED",
        genres: s.metadata?.genres || [],
        seasons: s.metadata?.numberOfSeasons || null,
        runtime: Array.isArray(s.metadata?.episodeRunTime) ? s.metadata.episodeRunTime[0] : null,
        firstAirYear: s.firstAirDate ? parseInt(s.firstAirDate.slice(0, 4), 10) : null,
        originalLanguage: s.originalLanguage,
        networks: (s.metadata?.networks || []).map((n) => n.name?.toLowerCase() || ""),
      });
    }

    // Add negative interactions
    const negCount = Math.min(dislikedShows.length, 5);
    for (let i = 0; i < negCount; i++) {
      const s = dislikedShows[i];
      interactions.push({
        id: `synth-neg-${fixture.id}-${s.id}`,
        tvShowId: s.id,
        status: "WATCHED",
        rating: "DISLIKE",
        answeredAt: new Date("2026-08-01T12:00:00Z"),
        updatedAt: new Date("2026-08-01T12:00:00Z"),
        tvShow: {
          id: s.id,
          tmdbId: s.tmdbId,
          name: s.name,
          originalName: s.originalName,
          firstAirDate: s.firstAirDate,
          lastAirDate: s.lastAirDate,
          status: s.status,
          originalLanguage: s.originalLanguage,
          popularity: s.popularity,
          voteAverage: s.voteAverage,
          metadata: s.metadata,
        },
      });

      negativeEvidence.push({
        id: s.id,
        tmdbId: s.tmdbId,
        name: s.name,
        posterPath: s.posterPath,
        rating: "DISLIKE",
        status: "WATCHED",
        genres: s.metadata?.genres || [],
        seasons: s.metadata?.numberOfSeasons || null,
        runtime: Array.isArray(s.metadata?.episodeRunTime) ? s.metadata.episodeRunTime[0] : null,
        firstAirYear: s.firstAirDate ? parseInt(s.firstAirDate.slice(0, 4), 10) : null,
        originalLanguage: s.originalLanguage,
        networks: (s.metadata?.networks || []).map((n) => n.name?.toLowerCase() || ""),
      });
    }

    // 2. Compute Profile & Evidence
    const tvProfile = calculateTvTasteProfile(interactions);
    const evidenceProfile: TvTasteEvidenceProfile = {
      positiveEvidence,
      negativeEvidence,
      evidenceCount: positiveEvidence.length + negativeEvidence.length,
    };

    // 3. Score all unseen candidate shows
    const interactedIds = new Set(interactions.map((i) => i.tvShowId));
    const testCandidates = allCandidates.filter((c) => !interactedIds.has(c.id));

    const scoredList: PersonalizedTvRecommendationItem[] = [];
    for (const cand of testCandidates) {
      const matchResult = calculateTvMatch(cand, tvProfile, undefined, evidenceProfile);
      if (matchResult.matchScore >= 62) {
        scoredList.push({
          tvShow: cand,
          matchScore: matchResult.matchScore,
          matchLabel: matchResult.matchLabel,
          source: "FRESH_DISCOVERY",
          scoreBreakdown: matchResult.scoreBreakdown,
          reasonCodes: matchResult.reasonCodes,
          evidenceShows: matchResult.evidenceShows,
          deterministicExplanation: matchResult.deterministicExplanation,
        });
      }
    }

    scoredList.sort((a, b) => b.matchScore - a.matchScore);
    const finalRecs = applyTvDiversityRerank(scoredList);

    // 4. Metrics Evaluation
    const top5 = finalRecs.slice(0, 5);
    const top10 = finalRecs.slice(0, 10);
    const top20 = finalRecs.slice(0, 20);

    const rel5 = top5.filter((r) => computeHoldoutRelevance(r.tvShow, fixture) >= 0.55).length;
    const rel10 = top10.filter((r) => computeHoldoutRelevance(r.tvShow, fixture) >= 0.55).length;
    const rel20 = top20.filter((r) => computeHoldoutRelevance(r.tvShow, fixture) >= 0.55).length;

    const precisionAt5 = Number((top5.length > 0 ? rel5 / top5.length : 0).toFixed(3));
    const precisionAt10 = Number((top10.length > 0 ? rel10 / top10.length : 0).toFixed(3));
    const precisionAt20 = Number((top20.length > 0 ? rel20 / top20.length : 0).toFixed(3));

    // NDCG@10
    let dcg = 0;
    let idcg = 0;
    top10.forEach((r, idx) => {
      const rel = computeHoldoutRelevance(r.tvShow, fixture);
      dcg += rel / Math.log2(idx + 2);
    });
    const idealRels = top10.map((r) => computeHoldoutRelevance(r.tvShow, fixture)).sort((a, b) => b - a);
    idealRels.forEach((rel, idx) => {
      idcg += rel / Math.log2(idx + 2);
    });
    const ndcgAt10 = idcg > 0 ? Number((dcg / idcg).toFixed(3)) : 1.0;

    // HitRate@20 & MRR
    const hitRateAt20 = rel20 > 0 ? 1.0 : 0.0;
    let firstHitRank = 0;
    for (let i = 0; i < top20.length; i++) {
      if (computeHoldoutRelevance(top20[i].tvShow, fixture) >= 0.55) {
        firstHitRank = i + 1;
        break;
      }
    }
    const mrr = firstHitRank > 0 ? Number((1.0 / firstHitRank).toFixed(3)) : 0.0;

    // False High & False Low
    let falseHighCount = 0;
    for (const r of top20) {
      if (r.matchScore >= 80 && computeHoldoutRelevance(r.tvShow, fixture) < 0.45) {
        falseHighCount++;
      }
    }

    let falseLowCount = 0;
    for (const c of testCandidates) {
      const hRel = computeHoldoutRelevance(c, fixture);
      const mRes = calculateTvMatch(c, tvProfile, undefined, evidenceProfile);
      if (hRel >= 0.85 && mRes.matchScore < 65) {
        falseLowCount++;
      }
    }

    // 90+ Precision
    const items90 = finalRecs.filter((r) => r.matchScore >= 90);
    const rel90 = items90.filter((r) => computeHoldoutRelevance(r.tvShow, fixture) >= 0.70).length;
    const score90PlusPrecision = items90.length > 0 ? Number((rel90 / items90.length).toFixed(3)) : 1.0;

    const diversityIld = calculateIntraListDistance(finalRecs);

    profileResults.push({
      fixtureId: fixture.id,
      fixtureName: fixture.name,
      archetype: fixture.archetype,
      maturity: fixture.maturity,
      evidenceCount: interactions.length,
      supplyCount: finalRecs.length,
      precisionAt5,
      precisionAt10,
      precisionAt20,
      ndcgAt10,
      hitRateAt20,
      mrr,
      falseHighCount,
      falseLowCount,
      score90PlusPrecision,
      diversityIld,
      top5Matches: top5.map((r) => ({
        name: r.tvShow.name,
        score: r.matchScore,
        relevance: computeHoldoutRelevance(r.tvShow, fixture),
      })),
    });
  }

  // Aggregate Metrics
  const n = profileResults.length;
  const meanPrecisionAt5 = Number((profileResults.reduce((s, p) => s + p.precisionAt5, 0) / n).toFixed(3));
  const meanPrecisionAt10 = Number((profileResults.reduce((s, p) => s + p.precisionAt10, 0) / n).toFixed(3));
  const meanPrecisionAt20 = Number((profileResults.reduce((s, p) => s + p.precisionAt20, 0) / n).toFixed(3));
  const meanNdcgAt10 = Number((profileResults.reduce((s, p) => s + p.ndcgAt10, 0) / n).toFixed(3));
  const meanHitRateAt20 = Number((profileResults.reduce((s, p) => s + p.hitRateAt20, 0) / n).toFixed(3));
  const meanMrr = Number((profileResults.reduce((s, p) => s + p.mrr, 0) / n).toFixed(3));
  const totalFalseHighs = profileResults.reduce((s, p) => s + p.falseHighCount, 0);
  const totalFalseLows = profileResults.reduce((s, p) => s + p.falseLowCount, 0);
  const precision90Plus = Number((profileResults.reduce((s, p) => s + p.score90PlusPrecision, 0) / n).toFixed(3));
  const meanDiversityIld = Number((profileResults.reduce((s, p) => s + p.diversityIld, 0) / n).toFixed(3));
  const meanSupplyCount = Math.round(profileResults.reduce((s, p) => s + p.supplyCount, 0) / n);

  // Composite Quality Score (0 - 100)
  const compositeScore = Number(
    (
      meanPrecisionAt10 * 35 +
      meanNdcgAt10 * 25 +
      precision90Plus * 20 +
      meanDiversityIld * 10 +
      Math.max(0, 10 - totalFalseHighs * 0.5)
    ).toFixed(1)
  );

  return {
    timestamp: new Date().toISOString(),
    totalFixtures: n,
    totalCatalogEvaluated: allCandidates.length,
    metrics: {
      meanPrecisionAt5,
      meanPrecisionAt10,
      meanPrecisionAt20,
      meanNdcgAt10,
      meanHitRateAt20,
      meanMrr,
      totalFalseHighs,
      totalFalseLows,
      precision90Plus,
      meanDiversityIld,
      meanSupplyCount,
      compositeScore,
    },
    profiles: profileResults,
  };
}
