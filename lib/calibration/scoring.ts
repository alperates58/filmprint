import { ERA_BUCKETS } from "@/lib/profile/constants";
import { ACTIVE_LEARNING_WEIGHTS } from "./constants";
import {
  CandidateMovie,
  RecentInteractionPattern,
  CandidateScoringResult,
  UserTasteProfileInput,
} from "./types";

export function calculateGenreUncertainty(
  candidateGenres: string[],
  profile: UserTasteProfileInput | null
): { score: number; reasons: string[] } {
  if (!candidateGenres || candidateGenres.length === 0) {
    return { score: 0.5, reasons: [] };
  }

  const reasons: string[] = [];
  const profileGenresMap = new Map(
    (profile?.genres || []).map((g: any) => [g.name, g])
  );

  let totalUncertainty = 0;

  candidateGenres.forEach((genreName) => {
    const matched = profileGenresMap.get(genreName);
    const ratedCount = matched?.ratedCount || 0;

    let genreScore = 0.05;
    if (ratedCount === 0) {
      genreScore = 1.0;
      reasons.push(`underexposed_genre_${genreName.toLowerCase().replace(/\s+/g, "_")}`);
    } else if (ratedCount <= 2) {
      genreScore = 0.75;
      reasons.push(`low_data_genre_${genreName.toLowerCase().replace(/\s+/g, "_")}`);
    } else if (ratedCount <= 5) {
      genreScore = 0.5;
    } else if (ratedCount <= 9) {
      genreScore = 0.25;
    } else {
      genreScore = 0.05;
    }

    totalUncertainty += genreScore;
  });

  // Multi-genre information gain: bonus for touching multiple uncertain dimensions
  const multiGenreMultiplier = candidateGenres.length > 1 ? 1.25 : 1.0;
  const combinedScore = totalUncertainty * multiGenreMultiplier;
  const normalizedScore = Math.min(Math.max(combinedScore, 0), 2.5);

  return { score: Math.round(normalizedScore * 100) / 100, reasons };
}

export function calculateEraUncertainty(
  releaseYear: number | null,
  profile: UserTasteProfileInput | null
): { score: number; reason?: string } {
  if (!releaseYear) return { score: 0.2 };

  const eraBucket = ERA_BUCKETS.find(
    (b) => releaseYear >= b.minYear && releaseYear <= b.maxYear
  );

  if (!eraBucket) return { score: 0.2 };

  const matched = (profile?.eras || []).find((e: any) => e.key === eraBucket.key);
  const ratedCount = matched?.ratedCount || 0;

  if (ratedCount === 0) {
    return { score: 1.0, reason: `underexposed_era_${eraBucket.key}` };
  } else if (ratedCount <= 2) {
    return { score: 0.6, reason: `low_data_era_${eraBucket.key}` };
  }
  return { score: 0.2 };
}

export function calculateRepetitionPenalty(
  candidate: CandidateMovie,
  recentHistory: RecentInteractionPattern[]
): { penalty: number; reason?: string } {
  if (!recentHistory || recentHistory.length === 0) return { penalty: 0 };

  let accumPenalty = 0;
  const candidateGenresSet = new Set(candidate.genres);

  recentHistory.forEach((item) => {
    let genreOverlap = 0;
    item.genres.forEach((g) => {
      if (candidateGenresSet.has(g)) genreOverlap++;
    });

    if (genreOverlap > 0) {
      accumPenalty += genreOverlap * 0.3;
    }

    if (
      candidate.releaseYear &&
      item.releaseYear &&
      Math.floor(candidate.releaseYear / 10) === Math.floor(item.releaseYear / 10)
    ) {
      accumPenalty += 0.15;
    }
  });

  const finalPenalty = Math.min(accumPenalty, 1.5);
  return {
    penalty: Math.round(finalPenalty * 100) / 100,
    reason: finalPenalty > 0.5 ? "recent_pattern_repetition_penalty" : undefined,
  };
}

export function calculateQualityFloor(candidate: CandidateMovie): number {
  // Give equal 50/50 weight to high rating (voteAverage 8.0+) & popularity so classic masterpieces rank alongside recent hits
  const popularityScore = Math.min((candidate.popularity || 0) / 100, 1.0);
  const voteScore = Math.min((candidate.voteAverage || 5.0) / 10, 1.0);
  const quality = popularityScore * 0.4 + voteScore * 0.6;
  return Math.round(quality * 100) / 100;
}

export function scoreCandidateMovie(
  candidate: CandidateMovie,
  profile: UserTasteProfileInput | null,
  recentHistory: RecentInteractionPattern[]
): CandidateScoringResult {
  const genreRes = calculateGenreUncertainty(candidate.genres, profile);
  const eraRes = calculateEraUncertainty(candidate.releaseYear, profile);
  const repetitionRes = calculateRepetitionPenalty(candidate, recentHistory);
  const qualityBonus = calculateQualityFloor(candidate);

  const totalRated = profile?.totalRatedCount || 0;
  const reasons: string[] = [...genreRes.reasons];

  if (eraRes.reason) reasons.push(eraRes.reason);
  if (repetitionRes.reason) reasons.push(repetitionRes.reason);

  // Cold Start Adaptation Multipliers
  let genreWeight = ACTIVE_LEARNING_WEIGHTS.GENRE_UNCERTAINTY;
  let qualityWeight = ACTIVE_LEARNING_WEIGHTS.QUALITY_FLOOR;

  if (totalRated < 10) {
    // Cold start exploration: prioritize catalog quality & familiarity across diverse eras
    qualityWeight *= 1.8;
  } else if (totalRated >= 30) {
    // Refinement stage: heavily weight uncertainty
    genreWeight *= 1.3;
  }

  const finalScore =
    genreRes.score * genreWeight +
    eraRes.score * ACTIVE_LEARNING_WEIGHTS.ERA_UNCERTAINTY +
    qualityBonus * qualityWeight -
    repetitionRes.penalty * ACTIVE_LEARNING_WEIGHTS.REPETITION_PENALTY;

  return {
    movie: candidate,
    score: Math.round(finalScore * 100) / 100,
    breakdown: {
      genreUncertainty: genreRes.score,
      eraUncertainty: eraRes.score,
      repetitionPenalty: repetitionRes.penalty,
      qualityBonus,
    },
    reasons,
  };
}
