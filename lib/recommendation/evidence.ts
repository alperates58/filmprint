import { db } from "@/lib/db/client";
import type { CandidateMovie } from "@/lib/calibration/types";
import type {
  TasteEvidenceMovie,
  TasteEvidenceProfile,
  CandidateEvidence,
  ReferenceEvidenceItem,
} from "./types";
import { extractTasteClusters } from "./clusters";

export const MIN_REFERENCE_THRESHOLD = 0.60;

/**
 * Determines positive evidence limit based on total user interaction count.
 */
export function getEvidenceLimitForCount(ratedCount: number): number {
  if (ratedCount >= 1000) return 150;
  if (ratedCount >= 500) return 75;
  if (ratedCount >= 250) return 50;
  if (ratedCount >= 100) return 35;
  return 15;
}

/**
 * Builds a rich Taste Evidence Profile for a user.
 */
export async function buildTasteEvidenceProfile(
  userId: string
): Promise<TasteEvidenceProfile> {
  const ratedCount = await db.movieInteraction.count({
    where: { userId, status: "WATCHED" },
  });

  const evidenceLimit = getEvidenceLimitForCount(ratedCount);

  // Fetch positive evidence (LOVE & LIKE)
  const positiveInteractions = await db.movieInteraction.findMany({
    where: {
      userId,
      rating: { in: ["LOVE", "LIKE"] },
    },
    include: { movie: true },
    orderBy: { updatedAt: "desc" },
    take: evidenceLimit,
  });

  // Fetch negative evidence (DISLIKE)
  const negativeInteractions = await db.movieInteraction.findMany({
    where: {
      userId,
      rating: "DISLIKE",
    },
    include: { movie: true },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });

  const positiveMovies: TasteEvidenceMovie[] = positiveInteractions.map((i: any) => {
    const meta = (i.movie.metadata as Record<string, any>) || {};
    return {
      id: i.movie.id,
      title: i.movie.title,
      rating: i.rating as "LOVE" | "LIKE",
      genres: (meta.genres as string[]) || [],
      releaseYear: i.movie.releaseYear,
      director: (meta.director as string) || undefined,
      cast: (meta.cast as string[]) || undefined,
      popularity: i.movie.popularity,
      voteAverage: i.movie.voteAverage,
      keywords: (meta.keywords as string[]) || [],
    };
  });

  const negativeMovies: TasteEvidenceMovie[] = negativeInteractions.map((i: any) => {
    const meta = (i.movie.metadata as Record<string, any>) || {};
    return {
      id: i.movie.id,
      title: i.movie.title,
      rating: "DISLIKE",
      genres: (meta.genres as string[]) || [],
      releaseYear: i.movie.releaseYear,
    };
  });

  const clusters = extractTasteClusters(positiveMovies);

  const lastUpdated = positiveInteractions[0]?.updatedAt?.getTime() || 0;
  const evidenceFingerprint = `v3_${userId}_${positiveMovies.length}_${lastUpdated}`;

  return {
    positiveCount: positiveMovies.length,
    ratedCount,
    positiveMovies,
    negativeMovies,
    clusters,
    evidenceFingerprint,
  };
}

/**
 * Computes composite similarity (0.0 to 1.0) between a candidate movie and a positive reference movie.
 */
export function calculateMovieSimilarity(
  candidate: CandidateMovie,
  reference: TasteEvidenceMovie
): { similarity: number; overlaps: string[] } {
  const overlaps: string[] = [];

  // 1. Genre Similarity (40%)
  let genreSim = 0;
  if (candidate.genres && reference.genres && candidate.genres.length > 0) {
    const sharedGenres = candidate.genres.filter((g) => reference.genres.includes(g));
    if (sharedGenres.length > 0) {
      genreSim = sharedGenres.length / Math.max(candidate.genres.length, reference.genres.length);
      overlaps.push(...sharedGenres);
    }
  }

  // 2. Keyword / Overview / Theme Similarity (25%)
  let keywordSim = 0;
  if (candidate.overview && reference.title) {
    const tokens = candidate.overview.toLowerCase().split(/\W+/);
    const refWords = reference.title.toLowerCase().split(/\W+/);
    const matchCount = refWords.filter((w) => w.length > 3 && tokens.includes(w)).length;
    if (matchCount > 0) {
      keywordSim = Math.min(1.0, matchCount * 0.4);
      overlaps.push("tematik uyum");
    }
  }

  // 3. Era Proximity (10%)
  let eraSim = 0.5;
  if (candidate.releaseYear && reference.releaseYear) {
    const candidateDecade = Math.floor(candidate.releaseYear / 10) * 10;
    const refDecade = Math.floor(reference.releaseYear / 10) * 10;
    const diff = Math.abs(candidateDecade - refDecade);
    if (diff === 0) {
      eraSim = 1.0;
      overlaps.push(`${candidateDecade}'lar dönemi`);
    } else if (diff === 10) {
      eraSim = 0.75;
    } else {
      eraSim = 0.5;
    }
  }

  // 4. Creator / Director / Cast Overlap (10%)
  let creatorSim = 0;
  if (reference.director) {
    const candidateOverview = (candidate.overview || "").toLowerCase();
    if (candidateOverview.includes(reference.director.toLowerCase())) {
      creatorSim = 1.0;
      overlaps.push(`Yönetmen: ${reference.director}`);
    }
  }

  // 5. Popularity Proximity (5%)
  let popSim = 1.0;
  if (reference.popularity && candidate.popularity) {
    const diff = Math.abs(candidate.popularity - reference.popularity);
    popSim = Math.max(0.0, 1.0 - diff / 100);
  }

  // 6. Quality Profile (10%)
  let qualitySim = 1.0;
  if (reference.voteAverage && candidate.voteAverage) {
    const diff = Math.abs(candidate.voteAverage - reference.voteAverage);
    qualitySim = Math.max(0.0, 1.0 - diff / 5);
  }

  // Composite Weighted Sum
  const compositeScore =
    genreSim * 0.40 +
    keywordSim * 0.25 +
    eraSim * 0.10 +
    creatorSim * 0.10 +
    popSim * 0.05 +
    qualitySim * 0.10;

  // Bonus for LOVE rated reference
  const ratingBonus = reference.rating === "LOVE" ? 0.05 : 0;
  const finalSimilarity = Number(Math.min(1.0, compositeScore + ratingBonus).toFixed(2));

  return {
    similarity: finalSimilarity,
    overlaps: Array.from(new Set(overlaps)),
  };
}

/**
 * Resolves candidate-specific evidence for a movie recommendation.
 * Enforces minimum similarity threshold & soft reference repetition penalty.
 */
export function getEvidenceForRecommendation(
  profile: TasteEvidenceProfile,
  candidate: CandidateMovie,
  referenceUsageMap?: Map<string, number>
): CandidateEvidence {
  if (!profile.positiveMovies || profile.positiveMovies.length === 0) {
    return {
      positiveReferences: [],
      profileSignals: [
        `${candidate.genres[0] || "Sinema"} türü sinema profilinle uyumlu sinyaller taşıyor.`,
      ],
      hasStrongReference: false,
    };
  }

  const scoredReferences: {
    movie: TasteEvidenceMovie;
    similarity: number;
    rawSimilarity: number;
    overlaps: string[];
  }[] = [];

  for (const refMovie of profile.positiveMovies) {
    const { similarity, overlaps } = calculateMovieSimilarity(candidate, refMovie);
    const usageCount = referenceUsageMap?.get(refMovie.id) || 0;
    // Soft repetition penalty: -0.08 per prior usage in session
    const adjustedSimilarity = Number(Math.max(0.0, similarity - usageCount * 0.08).toFixed(2));

    scoredReferences.push({
      movie: refMovie,
      similarity: adjustedSimilarity,
      rawSimilarity: similarity,
      overlaps,
    });
  }

  // Sort descending by adjusted similarity score
  scoredReferences.sort((a, b) => b.similarity - a.similarity);

  const topMatch = scoredReferences[0];

  // Enforce Minimum Evidence Threshold (0.60)
  if (topMatch && topMatch.rawSimilarity >= MIN_REFERENCE_THRESHOLD) {
    const item: ReferenceEvidenceItem = {
      movieId: topMatch.movie.id,
      title: topMatch.movie.title,
      userRating: topMatch.movie.rating as "LOVE" | "LIKE",
      similarityScore: topMatch.rawSimilarity,
      evidenceReasons: topMatch.overlaps,
      overlaps: topMatch.overlaps,
    };

    return {
      positiveReferences: [item],
      profileSignals: [
        `Film DNA'ındaki ${candidate.genres[0] || "sinema"} tercihinle doğrudan örtüşüyor.`,
      ],
      hasStrongReference: true,
    };
  }

  // Fallback: Weak evidence -> Use profile-level signals instead of forcing a fake reference
  const topGenre = candidate.genres[0] || "Sinema";
  return {
    positiveReferences: [],
    profileSignals: [
      `${topGenre} ve karakter odaklı yapımlara verdiğin yüksek puanlarla güçlü biçimde örtüşüyor.`,
      `Film DNA'ındaki kalite ve keşif dengen gözetilerek seçildi.`,
    ],
    hasStrongReference: false,
  };
}

/**
 * Calculates penalty for candidate movies matching user's DISLIKE interactions.
 */
export function calculateDislikePenalty(
  candidate: CandidateMovie,
  profile: TasteEvidenceProfile
): number {
  if (!profile.negativeMovies || profile.negativeMovies.length === 0) {
    return 0;
  }

  let penalty = 0;
  for (const neg of profile.negativeMovies) {
    if (neg.genres && candidate.genres) {
      const shared = candidate.genres.filter((g) => neg.genres.includes(g));
      if (shared.length >= 2) {
        penalty -= 15;
        break;
      } else if (shared.length === 1) {
        penalty -= 5;
      }
    }
  }

  return Math.max(-25, penalty);
}
