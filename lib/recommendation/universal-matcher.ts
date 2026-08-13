import { db } from "../db/client.ts";
import { getOrCalculateUserProfile } from "../profile/service.ts";
import { calculateMovieMatch, calibrateMatchScore } from "./matcher.ts";
import { buildTasteEvidenceProfile, getEvidenceForRecommendation } from "./evidence.ts";
import { buildUserFeedbackProfile } from "./feedback-profile.ts";
import { generateDeterministicExplanation } from "./explanation.ts";
import type { CandidateMovie } from "../calibration/types.ts";
import type { FilmDnaResult } from "../profile/types.ts";
import type { TasteEvidenceProfile, CandidateEvidence } from "./types.ts";

export interface UniversalMatchResult {
  movieId: string;
  rawScore: number;
  displayScore: number;
  label: string;
  evidenceStrength: "STRONG" | "MODERATE" | "WEAK" | "NONE";
  available: boolean;
  reasons: string[];
  headline?: string;
  profileVersion: number;
  matchVersion: number;
}

export const MATCH_ENGINE_V32_VERSION = 32;

/**
  * Central Universal Match Score Helper for a single movie.
  * Works across Home, Recommendations, Library, Watch Later, Movie Detail Modal.
  */
export async function getMoviePersonalMatch(
  userId: string,
  movieId: string
): Promise<UniversalMatchResult> {
  const matchesMap = await getMoviePersonalMatches(userId, [movieId]);
  return (
    matchesMap.get(movieId) || {
      movieId,
      rawScore: 0,
      displayScore: 0,
      label: "Uyum Hesaplanıyor",
      evidenceStrength: "NONE",
      available: false,
      reasons: [],
      profileVersion: 1,
      matchVersion: MATCH_ENGINE_V32_VERSION,
    }
  );
}

/**
  * Central Universal Match Score Helper for multiple movies (Batch / Bulk).
  * Prevents N+1 database queries.
  */
export async function getMoviePersonalMatches(
  userId: string,
  movieIds: string[]
): Promise<Map<string, UniversalMatchResult>> {
  const resultMap = new Map<string, UniversalMatchResult>();
  if (!userId || !movieIds || movieIds.length === 0) {
    return resultMap;
  }

  const uniqueMovieIds = Array.from(new Set(movieIds));

  try {
    // 1. Fetch user profile, evidence profile, feedback profile in parallel
    const [profileResponse, tasteEvidenceProfile, feedbackProfile, moviesRaw] = await Promise.all([
      getOrCalculateUserProfile(userId),
      buildTasteEvidenceProfile(userId),
      buildUserFeedbackProfile(userId),
      db.movie.findMany({
        where: {
          OR: [
            { id: { in: uniqueMovieIds } },
            { tmdbId: { in: uniqueMovieIds.map((id) => (isNaN(Number(id)) ? -1 : Number(id))).filter((n) => n > 0) } },
          ],
        },
      }),
    ]);

    const profile = (profileResponse.profile || {}) as FilmDnaResult;
    const profileVersion = profile.version || 1;

    for (const movieRaw of moviesRaw) {
      const meta = (movieRaw.metadata as Record<string, unknown>) || {};
      const genres = (meta.genres as string[]) || [];

      // Availability check: if movie has zero metadata / genres, mark unavailable
      if (!movieRaw.title || genres.length === 0) {
        resultMap.set(movieRaw.id, {
          movieId: movieRaw.id,
          rawScore: 0,
          displayScore: 0,
          label: "Uyum Hesaplanıyor",
          evidenceStrength: "NONE",
          available: false,
          reasons: [],
          profileVersion,
          matchVersion: MATCH_ENGINE_V32_VERSION,
        });
        continue;
      }

      const candidate: CandidateMovie = {
        id: movieRaw.id,
        tmdbId: movieRaw.tmdbId,
        title: movieRaw.title,
        originalTitle: movieRaw.originalTitle,
        releaseYear: movieRaw.releaseYear,
        popularity: movieRaw.popularity,
        voteAverage: movieRaw.voteAverage,
        posterPath: movieRaw.posterPath,
        backdropPath: movieRaw.backdropPath,
        genres,
        overview: (meta.overview as string) || "",
      };

      // 2. Calculate match score
      const matchRes = calculateMovieMatch(candidate, profile, feedbackProfile);
      const evidence: CandidateEvidence = getEvidenceForRecommendation(tasteEvidenceProfile, candidate);

      // 3. Calibrate display match score (capped at 97%, requires strong reference for 90%+)
      const displayScore = calibrateMatchScore(matchRes.rawMatchScore, evidence.hasStrongReference);
      const label = matchRes.matchLabel;

      let evidenceStrength: "STRONG" | "MODERATE" | "WEAK" | "NONE" = "NONE";
      if (evidence.hasStrongReference) {
        evidenceStrength = "STRONG";
      } else if (evidence.positiveReferences.length > 0) {
        evidenceStrength = "MODERATE";
      } else if (evidence.profileSignals.length > 0) {
        evidenceStrength = "WEAK";
      }

      // 4. Generate structured explanation V3
      const explanation = generateDeterministicExplanation(candidate, { ...matchRes, matchScore: displayScore }, profile, evidence);

      const resultItem: UniversalMatchResult = {
        movieId: movieRaw.id,
        rawScore: matchRes.rawMatchScore,
        displayScore,
        label,
        evidenceStrength,
        available: true,
        reasons: explanation.reasons || [],
        headline: explanation.headline,
        profileVersion,
        matchVersion: MATCH_ENGINE_V32_VERSION,
      };

      resultMap.set(movieRaw.id, resultItem);
      if (movieRaw.tmdbId) {
        resultMap.set(String(movieRaw.tmdbId), resultItem);
      }
    }
  } catch (error) {
    console.error("[getMoviePersonalMatches Error]:", error);
  }

  // Ensure all requested IDs have a fallback entry if missing in DB
  for (const id of uniqueMovieIds) {
    if (!resultMap.has(id)) {
      resultMap.set(id, {
        movieId: id,
        rawScore: 0,
        displayScore: 0,
        label: "Uyum Hesaplanıyor",
        evidenceStrength: "NONE",
        available: false,
        reasons: [],
        profileVersion: 1,
        matchVersion: MATCH_ENGINE_V32_VERSION,
      });
    }
  }

  return resultMap;
}
