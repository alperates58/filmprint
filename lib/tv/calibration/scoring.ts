import { TV_ACTIVE_LEARNING_WEIGHTS } from "./constants";
import {
  CandidateTvShow,
  RecentTvInteractionPattern,
  TvCandidateScoringResult,
  TvSelectorUserState,
} from "./types";

/**
 * Calculates genre uncertainty and exploration value for a candidate TV show.
 */
export function calculateTvGenreUncertainty(
  candidateGenres: string[],
  userState: TvSelectorUserState | null
): { score: number; reasons: string[] } {
  if (!candidateGenres || candidateGenres.length === 0) {
    return { score: 0.5, reasons: [] };
  }

  const reasons: string[] = [];
  const genreFreq = userState?.genreFrequency || {};
  const positiveSet = new Set(userState?.positiveGenres || []);
  const negativeSet = new Set(userState?.negativeGenres || []);

  let totalUncertainty = 0;

  candidateGenres.forEach((genreName) => {
    const ratedCount = genreFreq[genreName] || 0;

    let genreScore = 0.05;
    if (ratedCount === 0) {
      genreScore = 1.0;
      reasons.push(`underexposed_tv_genre_${genreName.toLowerCase().replace(/\s+/g, "_")}`);
    } else if (ratedCount <= 2) {
      genreScore = 0.75;
      reasons.push(`low_data_tv_genre_${genreName.toLowerCase().replace(/\s+/g, "_")}`);
    } else if (ratedCount <= 5) {
      genreScore = 0.45;
    } else if (ratedCount <= 8) {
      genreScore = 0.25;
    } else {
      genreScore = 0.05;
    }

    // Mild taste exploitation bonus (without trapping in an echo chamber)
    if (positiveSet.has(genreName)) {
      genreScore += 0.2;
    } else if (negativeSet.has(genreName)) {
      genreScore = Math.max(0.05, genreScore - 0.2);
    }

    totalUncertainty += genreScore;
  });

  const multiGenreMultiplier = candidateGenres.length > 1 ? 1.2 : 1.0;
  const combinedScore = totalUncertainty * multiGenreMultiplier;
  const normalizedScore = Math.min(Math.max(combinedScore, 0), 2.5);

  return { score: Math.round(normalizedScore * 100) / 100, reasons };
}

/**
 * Applies a penalty to avoid consecutive same-genre repetition in recent queue window.
 */
export function calculateTvRepetitionPenalty(
  candidate: CandidateTvShow,
  recentHistory: RecentTvInteractionPattern[]
): { penalty: number; reason?: string } {
  if (!recentHistory || recentHistory.length === 0) return { penalty: 0 };

  let accumPenalty = 0;
  const candidateGenresSet = new Set(candidate.genres);

  recentHistory.forEach((item, index) => {
    // Weight recency (closer items apply heavier penalty)
    const recencyWeight = (recentHistory.length - index) / recentHistory.length;

    let genreOverlap = 0;
    item.genres.forEach((g) => {
      if (candidateGenresSet.has(g)) genreOverlap++;
    });

    if (genreOverlap > 0) {
      accumPenalty += genreOverlap * 0.35 * recencyWeight;
    }
  });

  const finalPenalty = Math.min(accumPenalty, 1.8);
  return {
    penalty: Math.round(finalPenalty * 100) / 100,
    reason: finalPenalty > 0.5 ? "recent_genre_repetition_penalty" : undefined,
  };
}

/**
 * Calculates quality & recognizability floor.
 * Prioritizes high vote confidence and popularity, especially in the first 15 interactions.
 */
export function calculateTvQualityFloor(
  candidate: CandidateTvShow,
  isInitialStage: boolean
): number {
  const popularityScore = Math.min((candidate.popularity || 0) / 150, 1.0);
  const voteScore = Math.min((candidate.voteAverage || 5.0) / 10, 1.0);
  const voteCount = candidate.voteCount || 0;

  // Vote count confidence multiplier
  const voteCountConfidence = isInitialStage
    ? Math.min(voteCount / 2000, 1.0)
    : Math.min(voteCount / 500, 1.0);

  const baseQuality = isInitialStage
    ? popularityScore * 0.45 + voteScore * 0.35 + voteCountConfidence * 0.2
    : popularityScore * 0.3 + voteScore * 0.5 + voteCountConfidence * 0.2;

  return Math.round(baseQuality * 100) / 100;
}

/**
 * Gives format diversity bonus (mini-series vs multi-season).
 */
export function calculateTvFormatBonus(candidate: CandidateTvShow): number {
  const seasons = candidate.numberOfSeasons || 1;
  const episodes = candidate.numberOfEpisodes || 1;

  if (seasons === 1 && episodes <= 10) {
    return 0.3; // Mini-series bonus
  }
  return 0.1;
}

/**
 * Gives international diversity bonus to top-tier global shows.
 */
export function calculateTvInternationalBonus(candidate: CandidateTvShow): number {
  const lang = candidate.originalLanguage || "en";
  if (lang !== "en") {
    return 0.25; // International TV diversity bonus
  }
  return 0.0;
}

/**
 * Scores a candidate TV show deterministically.
 */
export function scoreCandidateTvShow(
  candidate: CandidateTvShow,
  userState: TvSelectorUserState | null,
  recentHistory: RecentTvInteractionPattern[]
): TvCandidateScoringResult {
  const totalAnswered = userState?.totalAnsweredCount || 0;
  const isInitialStage = totalAnswered < 15;

  const genreRes = calculateTvGenreUncertainty(candidate.genres, userState);
  const repetitionRes = calculateTvRepetitionPenalty(candidate, recentHistory);
  const qualityBonus = calculateTvQualityFloor(candidate, isInitialStage);
  const formatBonus = calculateTvFormatBonus(candidate);
  const internationalBonus = calculateTvInternationalBonus(candidate);

  const reasons: string[] = [...genreRes.reasons];
  if (repetitionRes.reason) reasons.push(repetitionRes.reason);
  if (isInitialStage && candidate.popularity > 100) reasons.push("initial_recognizability_priority");
  if (internationalBonus > 0) reasons.push("international_diversity_bonus");

  // Dynamic weighting based on calibration progression stage
  let genreWeight = TV_ACTIVE_LEARNING_WEIGHTS.GENRE_UNCERTAINTY;
  let qualityWeight = TV_ACTIVE_LEARNING_WEIGHTS.QUALITY_FLOOR;

  if (isInitialStage) {
    qualityWeight *= 1.7; // Prioritize recognizability in initial 15 shows
  } else {
    genreWeight *= 1.4; // Broaden exploration after 15 shows
  }

  const finalScore =
    genreRes.score * genreWeight +
    qualityBonus * qualityWeight +
    formatBonus * TV_ACTIVE_LEARNING_WEIGHTS.FORMAT_BALANCE +
    internationalBonus * TV_ACTIVE_LEARNING_WEIGHTS.INTERNATIONAL_DIVERSITY -
    repetitionRes.penalty * TV_ACTIVE_LEARNING_WEIGHTS.REPETITION_PENALTY;

  return {
    tvShow: candidate,
    score: Math.round(finalScore * 100) / 100,
    breakdown: {
      genreUncertainty: genreRes.score,
      repetitionPenalty: repetitionRes.penalty,
      qualityBonus,
      formatBonus,
      internationalBonus,
    },
    reasons,
  };
}
