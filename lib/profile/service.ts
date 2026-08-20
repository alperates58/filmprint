import { db } from "../db/client";
import { calculateFilmDna } from "./calculator";
import { FILM_DNA_ALGORITHM_VERSION } from "./constants";
import { generateBespokeAiNarrative } from "./ai-narrative-service";
import type { FilmDnaResult, RawInteractionData } from "./types";
import { getSystemSettings } from "../config/service";
import { Prisma } from "@prisma/client";

export interface ProfileResponse {
  ready: boolean;
  required: number;
  current: number;
  confidence?: number;
  profile?: FilmDnaResult;
}

/**
 * Resolves or recalculates the Film DNA profile for a given user.
 */
export async function getOrCalculateUserProfile(userId: string): Promise<ProfileResponse> {
  const settings = await getSystemSettings();
  const requiredCount = settings.calibrationTarget;

  // Query all user interactions with movie metadata in 1 query
  const interactions = await db.movieInteraction.findMany({
    where: { userId },
    orderBy: { answeredAt: "desc" },
    include: {
      movie: {
        select: {
          id: true,
          tmdbId: true,
          title: true,
          originalTitle: true,
          releaseYear: true,
          popularity: true,
          voteAverage: true,
          metadata: true,
        },
      },
    },
  });

  const totalInteractions = interactions.length;

  if (totalInteractions < requiredCount) {
    return {
      ready: false,
      required: requiredCount,
      current: totalInteractions,
    };
  }

  // Format raw interaction data
  const formattedData: RawInteractionData[] = interactions.map((i: any) => {
    const meta = (i.movie.metadata as Record<string, unknown>) || {};
    return {
      id: i.id,
      status: i.status,
      rating: i.rating,
      answeredAt: i.answeredAt,
      movie: {
        id: i.movie.id,
        tmdbId: i.movie.tmdbId,
        title: i.movie.title,
        originalTitle: i.movie.originalTitle,
        releaseYear: i.movie.releaseYear,
        popularity: i.movie.popularity,
        voteAverage: i.movie.voteAverage,
        metadata: {
          genres: (meta.genres as string[]) || [],
          runtime: (meta.runtime as number | null) || null,
          overview: (meta.overview as string) || "",
        },
      },
    };
  });

  // Track latest interaction timestamp (answeredAt or updatedAt) for stale detection
  const latestInteractionDate = interactions.reduce((max: Date | null, i: any) => {
    const itemDate = i.updatedAt || i.answeredAt;
    if (!max || itemDate > max) return itemDate;
    return max;
  }, null);

  // Check if existing calculated profile is fresh
  const existingProfile = await db.userTasteProfile.findUnique({
    where: { userId },
  });

  const isFresh =
    existingProfile &&
    existingProfile.version === FILM_DNA_ALGORITHM_VERSION &&
    existingProfile.sourceInteractionCount === totalInteractions &&
    existingProfile.profileJson &&
    (!latestInteractionDate || existingProfile.updatedAt >= latestInteractionDate);

  if (isFresh && existingProfile) {
    const parsed = existingProfile.profileJson as unknown as FilmDnaResult;
    return {
      ready: true,
      required: requiredCount,
      current: totalInteractions,
      confidence: existingProfile.confidence,
      profile: parsed,
    };
  }

  // Calculate new Film DNA result
  const result = calculateFilmDna(formattedData);

  // Extract loved, liked and disliked movies for bespoke LLM synthesis
  const lovedMovies = formattedData
    .filter((i) => i.status === "WATCHED" && i.rating === "LOVE")
    .map((i) => ({
      title: i.movie.title,
      releaseYear: i.movie.releaseYear,
      genres: i.movie.metadata.genres,
    }));

  const likedMovies = formattedData
    .filter((i) => i.status === "WATCHED" && i.rating === "LIKE")
    .map((i) => ({
      title: i.movie.title,
      releaseYear: i.movie.releaseYear,
      genres: i.movie.metadata.genres,
    }));

  const dislikedMovies = formattedData
    .filter((i) => i.status === "WATCHED" && i.rating === "DISLIKE")
    .map((i) => ({
      title: i.movie.title,
      releaseYear: i.movie.releaseYear,
      genres: i.movie.metadata.genres,
    }));

  // Generate bespoke AI Cinephile Narrative Report via DeepSeek / LLM
  try {
    const bespokeSummary = await generateBespokeAiNarrative({
      lovedMovies,
      likedMovies,
      dislikedMovies,
      genreList: result.genres,
      topEra: result.eras[0],
      popularity: result.popularity,
      familiarity: result.familiarity,
      traits: result.traits,
      sample: {
        ratedMovies: result.sample.ratedMovies,
        totalInteractions,
      },
    });

    if (bespokeSummary) {
      result.summary = bespokeSummary;
    }
  } catch (err) {
    console.warn("[ProfileService] LLM narrative generation fallback warning:", err);
  }

  // Persist updated profile in PostgreSQL
  await db.userTasteProfile.upsert({
    where: { userId },
    update: {
      version: result.version,
      profileJson: result as unknown as Prisma.InputJsonValue,
      confidence: result.confidence,
      sourceInteractionCount: totalInteractions,
    },
    create: {
      userId,
      version: result.version,
      profileJson: result as unknown as Prisma.InputJsonValue,
      confidence: result.confidence,
      sourceInteractionCount: totalInteractions,
    },
  });

  return {
    ready: true,
    required: requiredCount,
    current: totalInteractions,
    confidence: result.confidence,
    profile: result,
  };
}
