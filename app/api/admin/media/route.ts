import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const { searchParams } = new URL(request.url);

    const type = (searchParams.get("type") || "movie").toLowerCase();
    const q = (searchParams.get("q") || "").trim();
    const genre = (searchParams.get("genre") || "").trim();
    const year = (searchParams.get("year") || "").trim();
    const minRating = parseFloat(searchParams.get("minRating") || "0") || 0;
    const sort = searchParams.get("sort") || "newest";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "25", 10)), 100);
    const skip = (page - 1) * limit;

    // Helper for year filtering
    const buildYearFilter = (field: "releaseYear" | "firstAirDate") => {
      if (!year || year === "all") return {};

      if (field === "releaseYear") {
        if (/^\d{4}$/.test(year)) {
          return { releaseYear: parseInt(year, 10) };
        }
        if (year === "2020s") return { releaseYear: { gte: 2020, lte: 2029 } };
        if (year === "2010s") return { releaseYear: { gte: 2010, lte: 2019 } };
        if (year === "2000s") return { releaseYear: { gte: 2000, lte: 2009 } };
        if (year === "1990s") return { releaseYear: { gte: 1990, lte: 1999 } };
        if (year === "classics") return { releaseYear: { lt: 1990 } };
      } else {
        // TV Show firstAirDate is string "YYYY-MM-DD"
        if (/^\d{4}$/.test(year)) {
          return { firstAirDate: { startsWith: year } };
        }
        if (year === "2020s") return { firstAirDate: { gte: "2020-01-01", lte: "2029-12-31" } };
        if (year === "2010s") return { firstAirDate: { gte: "2010-01-01", lte: "2019-12-31" } };
        if (year === "2000s") return { firstAirDate: { gte: "2000-01-01", lte: "2009-12-31" } };
        if (year === "1990s") return { firstAirDate: { gte: "1990-01-01", lte: "1999-12-31" } };
        if (year === "classics") return { firstAirDate: { lt: "1990-01-01" } };
      }
      return {};
    };

    // Helper for sorting
    const buildOrderBy = (isMovie: boolean) => {
      switch (sort) {
        case "rating_desc":
          return { voteAverage: "desc" as const };
        case "rating_asc":
          return { voteAverage: "asc" as const };
        case "pop_desc":
          return { popularity: "desc" as const };
        case "pop_asc":
          return { popularity: "asc" as const };
        case "year_desc":
          return isMovie ? { releaseYear: "desc" as const } : { firstAirDate: "desc" as const };
        case "year_asc":
          return isMovie ? { releaseYear: "asc" as const } : { firstAirDate: "asc" as const };
        case "title_asc":
          return isMovie ? { title: "asc" as const } : { name: "asc" as const };
        case "title_desc":
          return isMovie ? { title: "desc" as const } : { name: "desc" as const };
        case "oldest":
          return { createdAt: "asc" as const };
        case "newest":
        default:
          return { createdAt: "desc" as const };
      }
    };

    if (type === "tv") {
      const whereClause: any = {
        AND: [
          q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { originalName: { contains: q, mode: "insensitive" } },
                  !isNaN(Number(q)) ? { tmdbId: Number(q) } : {},
                ].filter((c) => Object.keys(c).length > 0),
              }
            : {},
          minRating > 0 ? { voteAverage: { gte: minRating } } : {},
          buildYearFilter("firstAirDate"),
          genre && genre !== "all"
            ? {
                metadata: {
                  path: ["genres"],
                  array_contains: [genre],
                },
              }
            : {},
        ].filter((c) => Object.keys(c).length > 0),
      };

      const [totalCount, filteredCount, tvShows] = await Promise.all([
        db.tvShow.count(),
        db.tvShow.count({ where: whereClause }),
        db.tvShow.findMany({
          where: whereClause,
          orderBy: buildOrderBy(false),
          skip,
          take: limit,
          include: {
            _count: {
              select: {
                interactions: true,
                libraryEntries: true,
              },
            },
          },
        }),
      ]);

      const items = tvShows.map((show) => {
        const meta = (show.metadata as Record<string, any>) || {};
        const rawGenres = (meta.genres as any[]) || [];
        const genres = rawGenres.map((g) => (typeof g === "string" ? g : g.name || "")).filter(Boolean);

        return {
          id: show.id,
          tmdbId: show.tmdbId,
          type: "tv" as const,
          title: show.name,
          originalTitle: show.originalName || show.name,
          posterPath: show.posterPath,
          backdropPath: show.backdropPath,
          releaseYear: show.firstAirDate ? parseInt(show.firstAirDate.substring(0, 4), 10) : null,
          voteAverage: show.voteAverage,
          popularity: show.popularity,
          overview: show.overview || (meta.overview as string) || "",
          genres,
          numberOfSeasons: (meta.numberOfSeasons as number) || null,
          numberOfEpisodes: (meta.numberOfEpisodes as number) || null,
          status: show.status,
          totalInteractions: show._count.interactions,
          totalLibraryEntries: show._count.libraryEntries,
          createdAt: show.createdAt,
          updatedAt: show.updatedAt,
        };
      });

      return NextResponse.json({
        items,
        totalCount,
        filteredCount,
        totalPages: Math.ceil(filteredCount / limit) || 1,
        currentPage: page,
        type: "tv",
      });
    } else {
      // Movies
      const whereClause: any = {
        AND: [
          q
            ? {
                OR: [
                  { title: { contains: q, mode: "insensitive" } },
                  { originalTitle: { contains: q, mode: "insensitive" } },
                  !isNaN(Number(q)) ? { tmdbId: Number(q) } : {},
                ].filter((c) => Object.keys(c).length > 0),
              }
            : {},
          minRating > 0 ? { voteAverage: { gte: minRating } } : {},
          buildYearFilter("releaseYear"),
          genre && genre !== "all"
            ? {
                metadata: {
                  path: ["genres"],
                  array_contains: [genre],
                },
              }
            : {},
        ].filter((c) => Object.keys(c).length > 0),
      };

      const [totalCount, filteredCount, movies] = await Promise.all([
        db.movie.count(),
        db.movie.count({ where: whereClause }),
        db.movie.findMany({
          where: whereClause,
          orderBy: buildOrderBy(true),
          skip,
          take: limit,
          include: {
            _count: {
              select: {
                interactions: true,
                libraryEntries: true,
              },
            },
          },
        }),
      ]);

      const items = movies.map((movie) => {
        const meta = (movie.metadata as Record<string, any>) || {};
        const genres = (meta.genres as string[]) || [];

        return {
          id: movie.id,
          tmdbId: movie.tmdbId,
          type: "movie" as const,
          title: movie.title,
          originalTitle: movie.originalTitle,
          posterPath: movie.posterPath,
          backdropPath: movie.backdropPath,
          releaseYear: movie.releaseYear,
          voteAverage: movie.voteAverage,
          popularity: movie.popularity,
          overview: (meta.overview as string) || "",
          genres,
          runtime: (meta.runtime as number) || null,
          director: (meta.director as string) || null,
          totalInteractions: movie._count.interactions,
          totalLibraryEntries: movie._count.libraryEntries,
          createdAt: movie.createdAt,
          updatedAt: movie.updatedAt,
        };
      });

      return NextResponse.json({
        items,
        totalCount,
        filteredCount,
        totalPages: Math.ceil(filteredCount / limit) || 1,
        currentPage: page,
        type: "movie",
      });
    }
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[Admin Media GET Error]:", error);
    return NextResponse.json({ error: "İçerikler yüklenirken bir hata oluştu." }, { status: 500 });
  }
}
