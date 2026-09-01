import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { generateSearchNormalizedTitle } from "@/lib/calibration/priority";
import { generateMovieSlug, generateTvSlug } from "@/lib/growth/seo/slug";
import { resolveGenreNamesFromIds } from "@/lib/catalog/genres";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get("q") || "";
    const cleanQuery = rawQuery.trim();

    if (cleanQuery.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const normalizedQuery = generateSearchNormalizedTitle(cleanQuery);
    const tmdbIdQuery = !isNaN(Number(cleanQuery)) && Number(cleanQuery) > 0 ? Number(cleanQuery) : undefined;

    // Run parallel queries against PostgreSQL Movie and TvShow tables (100% DB-first, zero runtime TMDB network calls)
    const [movies, tvShows] = await Promise.all([
      db.movie.findMany({
        where: {
          AND: [
            {
              OR: [
                { searchNormalizedTitle: { contains: normalizedQuery, mode: "insensitive" } },
                { title: { contains: cleanQuery, mode: "insensitive" } },
                { originalTitle: { contains: cleanQuery, mode: "insensitive" } },
                ...(tmdbIdQuery ? [{ tmdbId: tmdbIdQuery }] : []),
              ],
            },
            { posterPath: { not: null } },
            { safetyLevel: { notIn: ["ADULT", "EROTIC", "SEXUAL_CONTENT"] } },
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
          popularity: true,
        },
        orderBy: [
          { popularity: "desc" },
          { voteAverage: "desc" },
        ],
        take: 6,
      }),
      db.tvShow.findMany({
        where: {
          AND: [
            {
              OR: [
                { searchNormalizedTitle: { contains: normalizedQuery, mode: "insensitive" } },
                { name: { contains: cleanQuery, mode: "insensitive" } },
                { originalName: { contains: cleanQuery, mode: "insensitive" } },
                ...(tmdbIdQuery ? [{ tmdbId: tmdbIdQuery }] : []),
              ],
            },
            { posterPath: { not: null } },
            { safetyLevel: { notIn: ["ADULT", "EROTIC", "SEXUAL_CONTENT"] } },
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
          firstAirYear: true,
          firstAirDate: true,
          voteAverage: true,
          genreIds: true,
          popularity: true,
        },
        orderBy: [
          { popularity: "desc" },
          { voteAverage: "desc" },
        ],
        take: 4,
      }),
    ]);

    const formattedMovies = movies.map((m) => {
      const genres = Array.isArray(m.genreIds) && m.genreIds.length > 0
        ? resolveGenreNamesFromIds(m.genreIds, "FILM")
        : [];
      return {
        id: m.id,
        tmdbId: m.tmdbId,
        mediaType: "FILM" as const,
        title: m.title,
        originalTitle: m.originalTitle || null,
        posterPath: m.posterPath,
        releaseYear: m.releaseYear,
        voteAverage: m.voteAverage,
        genres: genres.slice(0, 2),
        slug: `/film/${generateMovieSlug(m.title, m.tmdbId)}`,
        popularity: m.popularity,
      };
    });

    const formattedTvShows = tvShows.map((s) => {
      const genres = Array.isArray(s.genreIds) && s.genreIds.length > 0
        ? resolveGenreNamesFromIds(s.genreIds, "TV")
        : [];
      let year = s.firstAirYear;
      if (!year && s.firstAirDate) {
        const parsed = parseInt(s.firstAirDate.substring(0, 4), 10);
        if (!isNaN(parsed)) year = parsed;
      }
      return {
        id: s.id,
        tmdbId: s.tmdbId,
        mediaType: "TV" as const,
        title: s.name,
        originalTitle: s.originalName || null,
        posterPath: s.posterPath,
        releaseYear: year,
        voteAverage: s.voteAverage,
        genres: genres.slice(0, 2),
        slug: `/dizi/${generateTvSlug(s.name, s.tmdbId)}`,
        popularity: s.popularity,
      };
    });

    // Merge and sort by popularity
    const combined = [...formattedMovies, ...formattedTvShows].sort(
      (a, b) => b.popularity - a.popularity
    ).slice(0, 8);

    return NextResponse.json({ results: combined });
  } catch (error) {
    console.error("[Live Search API Error]:", error);
    return NextResponse.json({ results: [], error: "Arama sırasında bir hata oluştu" }, { status: 500 });
  }
}
