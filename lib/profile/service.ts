import { db } from "@/lib/db/client";
import { calculateFilmDna } from "./calculator";
import { FilmDnaResult, RawInteractionData } from "./types";
import { getSystemSettings } from "@/lib/config/service";
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

  // Check if existing calculated profile is fresh
  const existingProfile = await db.userTasteProfile.findUnique({
    where: { userId },
  });

  if (
    existingProfile &&
    existingProfile.sourceInteractionCount === totalInteractions &&
    existingProfile.profileJson
  ) {
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
