import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { generateSearchNormalizedTitle } from "@/lib/calibration/priority";
import { generateMovieSlug, generateTvSlug } from "@/lib/growth/seo/slug";
import { resolveGenreNamesFromIds, CANONICAL_MOVIE_GENRES, CANONICAL_TV_GENRES } from "@/lib/catalog/genres";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const actor = searchParams.get("oyuncu")?.trim() || "";
    const genreParam = searchParams.get("tur")?.trim() || "";
    const mediaTypeParam = (searchParams.get("mediaType") || "ALL").toUpperCase();
    const minScoreParam = searchParams.get("minScore");
    const maxScoreParam = searchParams.get("maxScore");
    const minYearParam = searchParams.get("minYear");
    const maxYearParam = searchParams.get("maxYear");
    const sortParam = searchParams.get("sort") || "popularity";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(48, Math.max(12, parseInt(searchParams.get("limit") || "24", 10)));
    const skip = (page - 1) * limit;

    const minScore = minScoreParam ? parseFloat(minScoreParam) : undefined;
    const maxScore = maxScoreParam ? parseFloat(maxScoreParam) : undefined;
    const minYear = minYearParam ? parseInt(minYearParam, 10) : undefined;
    const maxYear = maxYearParam ? parseInt(maxYearParam, 10) : undefined;

    // Resolve genre ID if provided by name or number
    let targetGenreId: number | undefined = undefined;
    if (genreParam) {
      if (!isNaN(Number(genreParam))) {
        targetGenreId = Number(genreParam);
      } else {
        const allGenres = [...CANONICAL_MOVIE_GENRES, ...CANONICAL_TV_GENRES];
        const found = allGenres.find(
          (g) => g.name.toLowerCase() === genreParam.toLowerCase() || g.slug === genreParam.toLowerCase()
        );
        if (found) targetGenreId = found.id;
      }
    }

    const normalizedQuery = q ? generateSearchNormalizedTitle(q) : undefined;
    const normalizedActor = actor ? generateSearchNormalizedTitle(actor) : undefined;
    const tmdbIdQuery = q && !isNaN(Number(q)) && Number(q) > 0 ? Number(q) : undefined;

    const shouldSearchMovies = mediaTypeParam === "ALL" || mediaTypeParam === "FILM";
    const shouldSearchTv = mediaTypeParam === "ALL" || mediaTypeParam === "TV";

    // 1. Build Movie Conditions
    const movieWhere: any = {
      AND: [
        { posterPath: { not: null } },
        { safetyLevel: { notIn: ["ADULT", "EROTIC", "SEXUAL_CONTENT"] } },
        {
          OR: [
            { normalizedMinimumAge: null },
            { normalizedMinimumAge: { lt: 18 } },
          ],
        },
      ],
    };

    if (q) {
      movieWhere.AND.push({
        OR: [
          { searchNormalizedTitle: { contains: normalizedQuery, mode: "insensitive" } },
          { title: { contains: q, mode: "insensitive" } },
          { originalTitle: { contains: q, mode: "insensitive" } },
          ...(tmdbIdQuery ? [{ tmdbId: tmdbIdQuery }] : []),
        ],
      });
    }

    if (actor) {
      movieWhere.AND.push({
        OR: [
          { metadata: { string_contains: actor } },
          { metadata: { string_contains: normalizedActor } },
        ],
      });
    }

    if (targetGenreId !== undefined) {
      movieWhere.AND.push({
        genreIds: { has: targetGenreId },
      });
    }

    if (minScore !== undefined || maxScore !== undefined) {
      const voteCondition: any = {};
      if (minScore !== undefined) voteCondition.gte = minScore;
      if (maxScore !== undefined) voteCondition.lte = maxScore;
      movieWhere.AND.push({ voteAverage: voteCondition });
    }

    if (minYear !== undefined || maxYear !== undefined) {
      const yearCondition: any = {};
      if (minYear !== undefined) yearCondition.gte = minYear;
      if (maxYear !== undefined) yearCondition.lte = maxYear;
      movieWhere.AND.push({ releaseYear: yearCondition });
    }

    // 2. Build TV Show Conditions
    const tvWhere: any = {
      AND: [
        { posterPath: { not: null } },
        { safetyLevel: { notIn: ["ADULT", "EROTIC", "SEXUAL_CONTENT"] } },
        {
          OR: [
            { normalizedMinimumAge: null },
            { normalizedMinimumAge: { lt: 18 } },
          ],
        },
      ],
    };

    if (q) {
      tvWhere.AND.push({
        OR: [
          { searchNormalizedTitle: { contains: normalizedQuery, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { originalName: { contains: q, mode: "insensitive" } },
          ...(tmdbIdQuery ? [{ tmdbId: tmdbIdQuery }] : []),
        ],
      });
    }

    if (actor) {
      tvWhere.AND.push({
        OR: [
          { metadata: { string_contains: actor } },
          { metadata: { string_contains: normalizedActor } },
        ],
      });
    }

    if (targetGenreId !== undefined) {
      tvWhere.AND.push({
        genreIds: { has: targetGenreId },
      });
    }

    if (minScore !== undefined || maxScore !== undefined) {
      const voteCondition: any = {};
      if (minScore !== undefined) voteCondition.gte = minScore;
      if (maxScore !== undefined) voteCondition.lte = maxScore;
      tvWhere.AND.push({ voteAverage: voteCondition });
    }

    if (minYear !== undefined || maxYear !== undefined) {
      const yearCondition: any = {};
      if (minYear !== undefined) yearCondition.gte = minYear;
      if (maxYear !== undefined) yearCondition.lte = maxYear;
      tvWhere.AND.push({ firstAirYear: yearCondition });
    }

    // Sorting Order
    let movieOrderBy: any[] = [{ popularity: "desc" }, { voteAverage: "desc" }];
    let tvOrderBy: any[] = [{ popularity: "desc" }, { voteAverage: "desc" }];

    if (sortParam === "voteAverage") {
      movieOrderBy = [{ voteAverage: "desc" }, { voteCount: "desc" }];
      tvOrderBy = [{ voteAverage: "desc" }, { popularity: "desc" }];
    } else if (sortParam === "newest") {
      movieOrderBy = [{ releaseYear: "desc" }, { popularity: "desc" }];
      tvOrderBy = [{ firstAirYear: "desc" }, { popularity: "desc" }];
    } else if (sortParam === "oldest") {
      movieOrderBy = [{ releaseYear: "asc" }, { popularity: "desc" }];
      tvOrderBy = [{ firstAirYear: "asc" }, { popularity: "desc" }];
    } else if (sortParam === "voteCount") {
      movieOrderBy = [{ voteCount: "desc" }, { popularity: "desc" }];
      tvOrderBy = [{ voteCount: "desc" }, { popularity: "desc" }];
    }

    // Parallel Execution of Count and Data Fetching
    const [movieCount, tvCount, rawMovies, rawTvShows] = await Promise.all([
      shouldSearchMovies ? db.movie.count({ where: movieWhere }) : Promise.resolve(0),
      shouldSearchTv ? db.tvShow.count({ where: tvWhere }) : Promise.resolve(0),
      shouldSearchMovies
        ? db.movie.findMany({
            where: movieWhere,
            select: {
              id: true,
              tmdbId: true,
              title: true,
              originalTitle: true,
              posterPath: true,
              backdropPath: true,
              releaseYear: true,
              voteAverage: true,
              voteCount: true,
              genreIds: true,
              popularity: true,
              metadata: true,
            },
            orderBy: movieOrderBy,
            take: limit,
            skip: mediaTypeParam === "FILM" ? skip : Math.floor(skip / 2),
          })
        : Promise.resolve([]),
      shouldSearchTv
        ? db.tvShow.findMany({
            where: tvWhere,
            select: {
              id: true,
              tmdbId: true,
              name: true,
              originalName: true,
              posterPath: true,
              backdropPath: true,
              firstAirYear: true,
              firstAirDate: true,
              voteAverage: true,
              voteCount: true,
              genreIds: true,
              popularity: true,
              metadata: true,
            },
            orderBy: tvOrderBy,
            take: limit,
            skip: mediaTypeParam === "TV" ? skip : Math.floor(skip / 2),
          })
        : Promise.resolve([]),
    ]);

    const formattedMovies = rawMovies.map((m) => {
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
        backdropPath: m.backdropPath,
        releaseYear: m.releaseYear,
        voteAverage: m.voteAverage,
        voteCount: m.voteCount,
        genres,
        slug: `/film/${generateMovieSlug(m.title, m.tmdbId)}`,
        popularity: m.popularity,
      };
    });

    const formattedTvShows = rawTvShows.map((s) => {
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
        backdropPath: s.backdropPath,
        releaseYear: year,
        voteAverage: s.voteAverage,
        voteCount: s.voteCount || 0,
        genres,
        slug: `/dizi/${generateTvSlug(s.name, s.tmdbId)}`,
        popularity: s.popularity,
      };
    });

    // Merge and apply final page slicing
    let items: any[] = [];
    if (mediaTypeParam === "FILM") {
      items = formattedMovies;
    } else if (mediaTypeParam === "TV") {
      items = formattedTvShows;
    } else {
      // Both: sort combined by requested sort order
      if (sortParam === "voteAverage") {
        items = [...formattedMovies, ...formattedTvShows].sort((a, b) => b.voteAverage - a.voteAverage);
      } else if (sortParam === "newest") {
        items = [...formattedMovies, ...formattedTvShows].sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0));
      } else if (sortParam === "oldest") {
        items = [...formattedMovies, ...formattedTvShows].sort((a, b) => (a.releaseYear || 9999) - (b.releaseYear || 9999));
      } else if (sortParam === "voteCount") {
        items = [...formattedMovies, ...formattedTvShows].sort((a, b) => b.voteCount - a.voteCount);
      } else {
        items = [...formattedMovies, ...formattedTvShows].sort((a, b) => b.popularity - a.popularity);
      }
      items = items.slice(0, limit);
    }

    const totalCount = movieCount + tvCount;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasMore: page < totalPages,
        movieCount,
        tvCount,
      },
    });
  } catch (error) {
    console.error("[Advanced Search API Error]:", error);
    return NextResponse.json(
      { items: [], pagination: { page: 1, limit: 24, total: 0, totalPages: 1, hasMore: false }, error: "Arama yapılamadı" },
      { status: 500 }
    );
  }
}
