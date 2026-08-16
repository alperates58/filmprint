import type { CandidateTvShow, TvMatchResult, TvScoreBreakdown, TvTasteEvidenceProfile } from "./types";
import type { TvDnaResult } from "../profile/types";
import {
  TV_MATCH_WEIGHTS,
  TV_DISPLAY_MATCH_SCORE_MAX,
  TV_CONFIDENCE_MATCH_CEILINGS,
  getTvMatchLabel,
} from "./constants";
import { calculateTvQualityScore } from "./quality";
import { calculateTvFeedbackAdjustment, EMPTY_TV_FEEDBACK_PROFILE, type TvFeedbackProfile } from "./feedback-profile";
import { findGroundedTvEvidence, calculateTvDislikePenalty } from "./evidence";

/**
 * Calibrates raw TV match score into user-facing display score (0 - 97%).
 * Implements strict confidence-gating and evidence requirement for 90%+ scores.
 */
export function calibrateTvMatchScore(
  rawScore: number,
  profileConfidence: number = 0.5,
  hasStrongEvidence: boolean = false
): number {
  const boundedRaw = Math.max(0, Math.min(100, rawScore));
  let calibrated = Math.min(TV_DISPLAY_MATCH_SCORE_MAX, boundedRaw);

  // Confidence gating: suppress unrealistic high scores on early/low-evidence profiles
  if (profileConfidence < TV_CONFIDENCE_MATCH_CEILINGS.LOW.threshold) {
    calibrated = Math.min(calibrated, TV_CONFIDENCE_MATCH_CEILINGS.LOW.maxScore); // max 88
  } else if (profileConfidence < TV_CONFIDENCE_MATCH_CEILINGS.MEDIUM.threshold) {
    calibrated = Math.min(calibrated, TV_CONFIDENCE_MATCH_CEILINGS.MEDIUM.maxScore); // max 93
  } else {
    // High confidence profile: 90%+ display score still requires grounded reference evidence
    if (calibrated >= 90 && !hasStrongEvidence) {
      calibrated = 89;
    }
  }

  // Smooth upper curve to prevent 97% clustering
  if (calibrated >= 90) {
    calibrated = 90 + Math.floor((calibrated - 90) * 0.7);
  }

  return Math.max(0, Math.min(TV_DISPLAY_MATCH_SCORE_MAX, Math.round(calibrated)));
}

/**
 * Pure, deterministic Match Scorer for a candidate TV show against a user's Dizi DNA profile.
 */
export function calculateTvMatch(
  candidate: CandidateTvShow,
  tvProfile: TvDnaResult,
  feedbackProfile: TvFeedbackProfile = EMPTY_TV_FEEDBACK_PROFILE,
  evidenceProfile?: TvTasteEvidenceProfile
): TvMatchResult {
  const reasonCodes: string[] = [];
  const genreScoreMap = new Map<string, { score: number; state: string }>(
    (tvProfile.genres || []).map((g) => [g.name.toLowerCase(), { score: g.score, state: g.state }])
  );
  const eraScoreMap = new Map<string, number>(
    (tvProfile.eras || []).map((e) => [e.key, e.score])
  );

  // 1. Genre Fit (0.0 to 1.0)
  let genreFit = 0.40;
  const candidateGenres = candidate.metadata?.genres || [];
  if (candidateGenres.length > 0) {
    let hasNegativeGenre = false;
    let positiveCount = 0;

    const scores = candidateGenres.map((g) => {
      const gEntry = genreScoreMap.get(g.toLowerCase());
      if (gEntry) {
        if (gEntry.state === "POSITIVE") {
          positiveCount++;
          return gEntry.score;
        }
        if (gEntry.state === "NEGATIVE") {
          hasNegativeGenre = true;
          return Math.max(0.05, gEntry.score);
        }
        if (gEntry.state === "UNOBSERVED") {
          return 0.40; // Neutral baseline for unobserved
        }
        return 0.50; // Neutral observed
      }
      return 0.45;
    });

    const maxScore = Math.max(...scores);
    const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    // Dominant genre accounts for 60%, average context accounts for 40%
    genreFit = maxScore * 0.60 + meanScore * 0.40;

    if (hasNegativeGenre) {
      genreFit = Math.max(0.1, genreFit - 0.20);
    }
    if (positiveCount > 0) reasonCodes.push("GENRE_MATCH");
  }

  // 2. Bayesian Quality Score (0.0 to 1.0)
  const qualityScore = calculateTvQualityScore(candidate);
  if (qualityScore >= 0.80) reasonCodes.push("HIGH_QUALITY");

  // 3. Format Fit (0.0 to 1.0)
  const seasons = candidate.metadata?.numberOfSeasons ?? null;
  const statusStr = candidate.status || candidate.metadata?.status;
  const isMini = seasons === 1 && (statusStr === "Ended" || statusStr === "Canceled");
  let formatFit = 0.50;

  if (isMini || seasons === 1) {
    formatFit = tvProfile.formatPreference.miniseriesScore;
    if (tvProfile.formatPreference.preference === "MINISERIES" && formatFit > 0.60) {
      reasonCodes.push("FORMAT_MINISERIES");
    }
  } else if (seasons && seasons >= 2 && seasons <= 4) {
    formatFit = tvProfile.formatPreference.multiSeasonScore;
    if (tvProfile.formatPreference.preference === "MULTI_SEASON" && formatFit > 0.60) {
      reasonCodes.push("FORMAT_MULTI_SEASON");
    }
  } else if (seasons && seasons >= 5) {
    formatFit = tvProfile.formatPreference.longRunningScore;
    if (tvProfile.formatPreference.preference === "LONG_RUNNING" && formatFit > 0.60) {
      reasonCodes.push("FORMAT_LONG_RUNNING");
    }
  }

  // 4. Series Length Fit (0.0 to 1.0)
  let seriesLengthFit = 0.50;
  if (seasons !== null && typeof seasons === "number") {
    const preferredAvg = tvProfile.seriesLengthPreference.avgSeasons || 2.5;
    const diff = Math.abs(seasons - preferredAvg);
    seriesLengthFit = Math.max(0.2, Math.min(1.0, 1.0 - diff * 0.15));
  }

  // 5. Episode Runtime Fit (0.0 to 1.0)
  const rawRun = candidate.metadata?.episodeRunTime ?? candidate.metadata?.episode_run_time;
  let candRuntime: number | null = null;
  if (Array.isArray(rawRun) && rawRun.length > 0 && typeof rawRun[0] === "number") {
    candRuntime = rawRun[0];
  } else if (typeof rawRun === "number") {
    candRuntime = rawRun;
  }

  let runtimeFit = 0.50;
  if (candRuntime !== null && tvProfile.episodeRuntimePreference.avgMinutes) {
    const diff = Math.abs(candRuntime - tvProfile.episodeRuntimePreference.avgMinutes);
    runtimeFit = Math.max(0.25, Math.min(1.0, 1.0 - diff * 0.02));
    if (runtimeFit >= 0.85) reasonCodes.push("RUNTIME_FIT");
  }

  // 6. Era Fit (0.0 to 1.0)
  const yearStr = candidate.firstAirDate?.slice(0, 4);
  const candYear = yearStr ? parseInt(yearStr, 10) : null;
  let eraFit = 0.50;
  if (candYear) {
    let bucketKey = "2020S";
    if (candYear < 1990) bucketKey = "PRE_1990";
    else if (candYear < 2000) bucketKey = "1990S";
    else if (candYear < 2010) bucketKey = "2000S";
    else if (candYear < 2020) bucketKey = "2010S";

    eraFit = eraScoreMap.get(bucketKey) ?? 0.50;
  }

  // 7. Popularity Fit (0.0 to 1.0)
  let popularityFit = 0.50;
  const pop = candidate.popularity || 20;
  if (tvProfile.popularityOrientation.orientation === "MAINSTREAM") {
    popularityFit = Math.min(1.0, Math.max(0.3, pop / 80));
  } else if (tvProfile.popularityOrientation.orientation === "DISCOVERY_ORIENTED") {
    popularityFit = Math.min(1.0, Math.max(0.3, 1.0 - pop / 120));
  } else {
    popularityFit = 0.70;
  }

  // 8. Status Fit (0.0 to 1.0)
  let statusFit = 0.50;
  if (statusStr === "Ended" || statusStr === "Canceled") {
    statusFit = tvProfile.statusPreference.endedScore;
    if (tvProfile.statusPreference.preference === "ENDED" && statusFit >= 0.65) {
      reasonCodes.push("STATUS_ENDED_FIT");
    }
  } else if (statusStr === "Returning Series" || statusStr === "In Production") {
    statusFit = tvProfile.statusPreference.returningScore;
    if (tvProfile.statusPreference.preference === "RETURNING" && statusFit >= 0.65) {
      reasonCodes.push("STATUS_RETURNING_FIT");
    }
  }

  // 9. International Fit (0.0 to 1.0)
  const candLang = candidate.originalLanguage || "en";
  let internationalFit = 0.50;
  if (candLang === "en") {
    internationalFit = 0.70;
  } else {
    // Non-English show
    if (
      tvProfile.internationalOrientation.orientation === "GLOBAL_EXPLORER" ||
      tvProfile.internationalOrientation.orientation === "INTERNATIONAL_NON_ENGLISH"
    ) {
      internationalFit = 0.90;
      reasonCodes.push("INTERNATIONAL_FIT");
    } else {
      internationalFit = 0.55; // Neutral-safe fit for English-focused profiles
    }
  }

  // 10. Network / Prestige Style Fit (0.0 to 1.0)
  let networkStyleFit = 0.50;
  if (tvProfile.networkStyleOrientation.hasSufficientEvidence && tvProfile.networkStyleOrientation.dominantStyle === "PRESTIGE_PRODUCTION") {
    const rawProd = (candidate.metadata?.productionCompanies || (candidate.metadata as any)?.production_companies || []) as any[];
    const networks = [
      ...(candidate.metadata?.networks || []).map((n) => n.name?.toLowerCase() || ""),
      ...rawProd.map((p: any) => p.name?.toLowerCase() || ""),
    ];
    const isPrestige = networks.some((n) => ["hbo", "fx", "apple tv", "bbc", "amc", "showtime"].some((k) => n.includes(k)));
    if (isPrestige) {
      networkStyleFit = 0.85;
      reasonCodes.push("PRESTIGE_NETWORK_FIT");
    }
  }

  // Archetype Mild Bonus (0 to +4 points)
  let archetypeBonus = 0;
  const primaryArchetypes = (tvProfile.archetypes || []).filter((a) => a.isPrimary);
  for (const arch of primaryArchetypes) {
    if (arch.id === "MYSTERY_SOLVER" && candidateGenres.some((g) => ["Gizem", "Suç"].includes(g))) {
      archetypeBonus += 2;
    }
    if (arch.id === "MINISERIES_SPECIALIST" && isMini) {
      archetypeBonus += 2;
    }
    if (arch.id === "GLOBAL_SERIES_EXPLORER" && candLang !== "en") {
      archetypeBonus += 2;
    }
    if (arch.id === "LONG_FORM_EXPLORER" && seasons && seasons >= 5) {
      archetypeBonus += 2;
    }
  }
  archetypeBonus = Math.min(4, archetypeBonus);

  // Dislike Penalty from Negative Evidence
  let dislikePenalty = 0;
  if (evidenceProfile?.negativeEvidence && evidenceProfile.negativeEvidence.length > 0) {
    dislikePenalty = calculateTvDislikePenalty(candidate, evidenceProfile.negativeEvidence);
  }

  // Feedback Adjustment
  const feedbackAdjustment = calculateTvFeedbackAdjustment(candidate, feedbackProfile);

  // Weighted Component Score (0 - 100)
  let weightedScore =
    genreFit * TV_MATCH_WEIGHTS.genre +
    qualityScore * TV_MATCH_WEIGHTS.quality +
    formatFit * TV_MATCH_WEIGHTS.format +
    seriesLengthFit * TV_MATCH_WEIGHTS.seriesLength +
    runtimeFit * TV_MATCH_WEIGHTS.runtime +
    eraFit * TV_MATCH_WEIGHTS.era +
    popularityFit * TV_MATCH_WEIGHTS.popularity +
    statusFit * TV_MATCH_WEIGHTS.status +
    internationalFit * TV_MATCH_WEIGHTS.international +
    networkStyleFit * TV_MATCH_WEIGHTS.networkStyle;

  // Taste-First Gating: If candidate has poor genre affinity (< 0.45), gently scale down to prevent false highs
  if (genreFit < 0.45) {
    const tasteGate = Math.max(0.65, genreFit / 0.45);
    weightedScore = weightedScore * tasteGate;
  }

  const rawScore = Number((weightedScore * 100 + archetypeBonus - dislikePenalty + feedbackAdjustment).toFixed(1));

  // Grounded Reference Evidence (0–3 shows from positive evidence)
  const evidenceShows = evidenceProfile?.positiveEvidence
    ? findGroundedTvEvidence(candidate, evidenceProfile.positiveEvidence)
    : [];

  const hasStrongEvidence = evidenceShows.length > 0 && evidenceShows[0].similarity >= 0.65;

  // Calibrate Display Match Score (0 - 97%)
  const matchScore = calibrateTvMatchScore(rawScore, tvProfile.confidence, hasStrongEvidence);
  const matchLabel = getTvMatchLabel(matchScore);

  // Deterministic Human Explanation
  let deterministicExplanation = "Dizi DNA profilinizdeki genel alışkanlıklarla dengeli bir uyum gösteriyor.";
  if (evidenceShows.length > 0) {
    const topRef = evidenceShows[0];
    deterministicExplanation = `Beğendiğiniz "${topRef.name}" ile benzer temaları ve anlatım yapısını paylaşıyor.`;
  } else if (reasonCodes.includes("GENRE_MATCH") && candidateGenres.length > 0) {
    deterministicExplanation = `${candidateGenres.slice(0, 2).join(" ve ")} türlerindeki güçlü beğeninizle örtüşüyor.`;
  } else if (reasonCodes.includes("FORMAT_MINISERIES")) {
    deterministicExplanation = "Mini dizi formatına olan ilginiz nedeniyle öneriliyor.";
  } else if (reasonCodes.includes("INTERNATIONAL_FIT")) {
    deterministicExplanation = "Dünya dizilerine ve farklı dillerdeki yapımlara olan açıklığınızla uyumlu.";
  }

  const scoreBreakdown: TvScoreBreakdown = {
    genreFit: Number(genreFit.toFixed(3)),
    qualityScore: Number(qualityScore.toFixed(3)),
    formatFit: Number(formatFit.toFixed(3)),
    seriesLengthFit: Number(seriesLengthFit.toFixed(3)),
    runtimeFit: Number(runtimeFit.toFixed(3)),
    eraFit: Number(eraFit.toFixed(3)),
    popularityFit: Number(popularityFit.toFixed(3)),
    statusFit: Number(statusFit.toFixed(3)),
    internationalFit: Number(internationalFit.toFixed(3)),
    networkStyleFit: Number(networkStyleFit.toFixed(3)),
    archetypeBonus,
    dislikePenalty,
    feedbackAdjustment,
  };

  return {
    candidateId: candidate.id,
    matchScore,
    rawScore,
    matchLabel,
    source: "FRESH_DISCOVERY",
    scoreBreakdown,
    reasonCodes,
    evidenceShows,
    deterministicExplanation,
  };
}
