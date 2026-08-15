import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/service";
import { getOrCalculateUserProfile } from "@/lib/profile/service";
import { buildTasteEvidenceProfile, getEvidenceForRecommendation } from "@/lib/recommendation/evidence";
import { buildUserFeedbackProfile } from "@/lib/recommendation/feedback-profile";
import { calculateMovieMatch, calibrateMatchScore } from "@/lib/recommendation/matcher";
import {
  generateRecommendationExplanation,
  generateDeterministicExplanation,
  EXPLANATION_ENGINE_VERSION,
} from "@/lib/recommendation/explanation";
import { CandidateMovie } from "@/lib/calibration/types";
import { FilmDnaResult } from "@/lib/profile/types";

const ENGINE_V3_MATCH_VERSION = 31;

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Giriş yapmalısınız" }, { status: 401 });
    }

    const userId = currentUser.id;
    const body = await request.json().catch(() => ({}));
    const { movieId } = body;

    if (!movieId || typeof movieId !== "string") {
      return NextResponse.json({ error: "Geçerli bir film ID'si gereklidir" }, { status: 400 });
    }

    // 1. Fetch movie from local DB
    const movie = await db.movie.findFirst({
      where: {
        OR: [
          { id: movieId },
          { tmdbId: isNaN(Number(movieId)) ? -1 : Number(movieId) },
        ],
      },
    });

    if (!movie) {
      return NextResponse.json({ error: "Film bulunamadı" }, { status: 404 });
    }

    // 2. Fetch user profile
    const profileResponse = await getOrCalculateUserProfile(userId);
    const profile = (profileResponse.profile || {}) as FilmDnaResult;
    const profileVersion = profile.version || 1;

    // 3. Check existing explanation cache in PostgreSQL
    const cached = await db.recommendationExplanation.findUnique({
      where: {
        userId_movieId_profileVersion_matchVersion: {
          userId,
          movieId: movie.id,
          profileVersion,
          matchVersion: ENGINE_V3_MATCH_VERSION,
        },
      },
    });

    if (cached) {
      let cachedReasons: string[] = [];
      try {
        const parsed = JSON.parse(cached.explanation);
        cachedReasons = Array.isArray(parsed)
          ? parsed.map((r: any) => String(r))
          : [String(cached.explanation)];
      } catch {
        cachedReasons = [cached.explanation];
      }

      return NextResponse.json({
        success: true,
        movieId: movie.id,
        headline: cached.headline,
        reasons: cachedReasons,
        isAiGenerated: cached.isAiGenerated,
        source: "cache",
      });
    }

    // 4. Resolve candidate metadata & evidence for live DeepSeek explanation
    const meta = (movie.metadata as Record<string, unknown>) || {};
    const candidate: CandidateMovie = {
      id: movie.id,
      tmdbId: movie.tmdbId,
      title: movie.title,
      originalTitle: movie.originalTitle,
      releaseYear: movie.releaseYear,
      popularity: movie.popularity,
      voteAverage: movie.voteAverage,
      posterPath: movie.posterPath,
      backdropPath: movie.backdropPath,
      genres: (meta.genres as string[]) || [],
      overview: (meta.overview as string) || "",
    };

    const [tasteEvidenceProfile, feedbackProfile] = await Promise.all([
      buildTasteEvidenceProfile(userId),
      buildUserFeedbackProfile(userId),
    ]);

    const evidence = getEvidenceForRecommendation(tasteEvidenceProfile, candidate);
    const baseMatch = calculateMovieMatch(candidate, profile, feedbackProfile, evidence);
    const displayMatchScore = calibrateMatchScore(baseMatch.rawMatchScore, evidence.hasStrongReference);

    // 5. Generate fresh personalized Grounded Explanation V3 via DeepSeek
    const explanationResult = await generateRecommendationExplanation(
      candidate,
      { ...baseMatch, matchScore: displayMatchScore },
      profile,
      evidence
    );

    // 6. Cache in PostgreSQL for subsequent instant lookups
    try {
      await db.recommendationExplanation.upsert({
        where: {
          userId_movieId_profileVersion_matchVersion: {
            userId,
            movieId: movie.id,
            profileVersion,
            matchVersion: ENGINE_V3_MATCH_VERSION,
          },
        },
        update: {
          headline: explanationResult.headline,
          explanation: JSON.stringify(explanationResult.reasons),
          isAiGenerated: explanationResult.isAiGenerated,
        },
        create: {
          userId,
          movieId: movie.id,
          profileVersion,
          matchVersion: ENGINE_V3_MATCH_VERSION,
          headline: explanationResult.headline,
          explanation: JSON.stringify(explanationResult.reasons),
          isAiGenerated: explanationResult.isAiGenerated,
        },
      });
    } catch (cacheErr) {
      console.error("[ExplainRoute] Cache save error:", cacheErr);
    }

    return NextResponse.json({
      success: true,
      movieId: movie.id,
      headline: explanationResult.headline,
      reasons: explanationResult.reasons,
      isAiGenerated: explanationResult.isAiGenerated,
      source: explanationResult.isAiGenerated ? "live_ai" : "deterministic_fallback",
    });
  } catch (error) {
    console.error("[POST /api/recommendations/explain Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Açıklama üretilirken bir hata oluştu",
      },
      { status: 500 }
    );
  }
}
