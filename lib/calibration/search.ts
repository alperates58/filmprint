import { db } from "@/lib/db/client";
import { resolveGenreNamesFromIds } from "@/lib/catalog/genres";

export interface CalibrationSearchResultItem {
  id: string;
  tmdbId: number;
  mediaType: "FILM" | "TV";
  title: string;
  originalTitle: string | null;
  posterPath: string | null;
  releaseYear: number | null;
  voteAverage: number;
  genres: string[];
  currentInteraction: {
    status: string;
    rating: string | null;
  } | null;
}

/**
 * Searches local PostgreSQL catalog for in-calibration "İzlediğimi Ara" mode.
 * 100% DB-first, zero runtime TMDB network requests, bounded take 15-20.
 * Filtered by Safety V2 (18+ / adult excluded).
 */
export async function searchLocalCalibrationCatalog(params: {
  query: string;
  mediaType: "FILM" | "TV";
  userId: string;
  limit?: number;
}): Promise<CalibrationSearchResultItem[]> {
  const { query, mediaType, userId, limit = 15 } = params;
  const cleanQuery = query.trim().toLowerCase();

  if (cleanQuery.length === 0) {
    return [];
  }

  const boundedLimit = Math.min(Math.max(1, limit), 25);

  if (mediaType === "FILM") {
    const tmdbIdQuery = !isNaN(Number(cleanQuery)) ? Number(cleanQuery) : undefined;

    const movies = await db.movie.findMany({
      where: {
        AND: [
          {
            OR: [
              { title: { contains: cleanQuery, mode: "insensitive" } },
              { originalTitle: { contains: cleanQuery, mode: "insensitive" } },
              { searchNormalizedTitle: { contains: cleanQuery, mode: "insensitive" } },
              ...(tmdbIdQuery ? [{ tmdbId: tmdbIdQuery }] : []),
            ],
          },
          {
            posterPath: { not: null },
          },
          {
            safetyLevel: {
              notIn: ["ADULT", "EROTIC", "SEXUAL_CONTENT"],
            },
          },
          {
            OR: [
              { normalizedMinimumAge: null },
              { normalizedMinimumAge: { lt: 18 } },
            ],
          },
        ],
      },
      select: {
        id: true,
        tmdbId: true,
        title: true,
        originalTitle: true,
        posterPath: true,
        releaseYear: true,
        voteAverage: true,
        genreIds: true,
        metadata: true,
      },
      orderBy: [
        { calibrationPriorityScore: "desc" },
        { popularity: "desc" },
        { voteAverage: "desc" },
      ],
      take: boundedLimit,
    });

    const movieIds = movies.map((m) => m.id);
    const existingInteractions = await db.movieInteraction.findMany({
      where: { userId, movieId: { in: movieIds } },
      select: { movieId: true, status: true, rating: true },
    });

    const interactionMap = new Map(
      existingInteractions.map((i) => [i.movieId, { status: i.status, rating: i.rating }])
    );

    return movies.map((m) => {
      let genres: string[] = [];
      if (Array.isArray(m.genreIds) && m.genreIds.length > 0) {
        genres = resolveGenreNamesFromIds(m.genreIds, "FILM");
      } else if (m.metadata && typeof m.metadata === "object" && Array.isArray((m.metadata as any).genres)) {
        genres = (m.metadata as any).genres;
      }

      const interaction = interactionMap.get(m.id) || null;

      return {
        id: m.id,
        tmdbId: m.tmdbId,
        mediaType: "FILM",
        title: m.title,
        originalTitle: m.originalTitle || null,
        posterPath: m.posterPath || null,
        releaseYear: m.releaseYear || null,
        voteAverage: m.voteAverage,
        genres,
        currentInteraction: interaction
          ? { status: interaction.status, rating: interaction.rating }
          : null,
      };
    });
  }

  // TV Shows Search
  const tmdbIdQuery = !isNaN(Number(cleanQuery)) ? Number(cleanQuery) : undefined;

  const tvShows = await db.tvShow.findMany({
    where: {
      AND: [
        {
          OR: [
            { name: { contains: cleanQuery, mode: "insensitive" } },
            { originalName: { contains: cleanQuery, mode: "insensitive" } },
            { searchNormalizedTitle: { contains: cleanQuery, mode: "insensitive" } },
            ...(tmdbIdQuery ? [{ tmdbId: tmdbIdQuery }] : []),
          ],
        },
        {
          posterPath: { not: null },
        },
        {
          safetyLevel: {
            notIn: ["ADULT", "EROTIC", "SEXUAL_CONTENT"],
          },
        },
        {
          OR: [
            { normalizedMinimumAge: null },
            { normalizedMinimumAge: { lt: 18 } },
          ],
        },
      ],
    },
    select: {
      id: true,
      tmdbId: true,
      name: true,
      originalName: true,
      posterPath: true,
      firstAirDate: true,
      firstAirYear: true,
      voteAverage: true,
      genreIds: true,
      metadata: true,
    },
    orderBy: [
      { calibrationPriorityScore: "desc" },
      { popularity: "desc" },
      { voteAverage: "desc" },
    ],
    take: boundedLimit,
  });

  const tvIds = tvShows.map((s) => s.id);
  const existingTvInteractions = await db.tvInteraction.findMany({
    where: { userId, tvShowId: { in: tvIds } },
    select: { tvShowId: true, status: true, rating: true },
  });

  const tvInteractionMap = new Map(
    existingTvInteractions.map((i) => [i.tvShowId, { status: i.status, rating: i.rating }])
  );

  return tvShows.map((s) => {
    let genres: string[] = [];
    if (Array.isArray(s.genreIds) && s.genreIds.length > 0) {
      genres = resolveGenreNamesFromIds(s.genreIds, "TV");
    } else if (s.metadata && typeof s.metadata === "object" && Array.isArray((s.metadata as any).genres)) {
      genres = (s.metadata as any).genres;
    }

    const releaseYear =
      s.firstAirYear ||
      (s.firstAirDate ? parseInt(s.firstAirDate.substring(0, 4), 10) : null);

    const interaction = tvInteractionMap.get(s.id) || null;

    return {
      id: s.id,
      tmdbId: s.tmdbId,
      mediaType: "TV",
      title: s.name,
      originalTitle: s.originalName || null,
      posterPath: s.posterPath || null,
      releaseYear: releaseYear && !isNaN(releaseYear) ? releaseYear : null,
      voteAverage: s.voteAverage,
      genres,
      currentInteraction: interaction
        ? { status: interaction.status, rating: interaction.rating }
        : null,
    };
  });
}
