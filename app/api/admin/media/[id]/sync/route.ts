import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";
import { getTMDBApiKey } from "@/lib/config/service";
import { tmdbClient } from "@/lib/tmdb/client";
import { tmdbTvClient } from "@/lib/tmdb/tv/client";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { type = "movie" } = body;

    const apiKey = (await getTMDBApiKey()) || process.env.TMDB_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "TMDB API anahtarı yapılandırılmamış." }, { status: 400 });
    }

    if (type === "tv") {
      const existing = await db.tvShow.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Dizi bulunamadı" }, { status: 404 });
      }

      // Fetch fresh TV show details from TMDB
      const [resTr, resEn, details] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/tv/${existing.tmdbId}?api_key=${apiKey}&language=tr-TR`).then((r) =>
          r.ok ? r.json() : null
        ),
        fetch(`https://api.themoviedb.org/3/tv/${existing.tmdbId}?api_key=${apiKey}&language=en-US`).then((r) =>
          r.ok ? r.json() : null
        ),
        tmdbTvClient.getTvDetails(existing.tmdbId).catch(() => null),
      ]);

      if (!resTr && !resEn) {
        return NextResponse.json({ error: "TMDB üzerinden dizi bilgileri alınamadı." }, { status: 502 });
      }

      const name = resTr?.name || resEn?.name || existing.name;
      const originalName = resTr?.original_name || resEn?.original_name || existing.originalName;
      const overview = resTr?.overview || resEn?.overview || existing.overview;
      const posterPath = resTr?.poster_path || resEn?.poster_path || existing.posterPath;
      const backdropPath = resTr?.backdrop_path || resEn?.backdrop_path || existing.backdropPath;
      const voteAverage = resTr?.vote_average ?? existing.voteAverage;
      const popularity = resTr?.popularity ?? existing.popularity;
      const rawGenres = resTr?.genres || resEn?.genres || [];
      const genres = rawGenres.map((g: any) => g.name).filter(Boolean);

      const currentMeta = (existing.metadata as Record<string, any>) || {};
      const updatedMeta = {
        ...currentMeta,
        overview,
        genres: genres.length > 0 ? genres : currentMeta.genres || [],
        numberOfSeasons: resTr?.number_of_seasons || resEn?.number_of_seasons || currentMeta.numberOfSeasons,
        numberOfEpisodes: resTr?.number_of_episodes || resEn?.number_of_episodes || currentMeta.numberOfEpisodes,
        ...(details?.cast ? { cast: details.cast } : {}),
        ...(details?.creators ? { creators: details.creators } : {}),
        ...(details?.trailer ? { trailer: details.trailer } : {}),
      };

      const updated = await db.tvShow.update({
        where: { id },
        data: {
          name,
          originalName,
          overview: overview || "",
          posterPath,
          backdropPath,
          voteAverage,
          popularity,
          metadata: updatedMeta,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, item: updated, message: "Dizi TMDB ile başarıyla senkronize edildi." });
    } else {
      const existing = await db.movie.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Film bulunamadı" }, { status: 404 });
      }

      // Fetch fresh movie details from TMDB
      const [resTr, resEn, details] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/movie/${existing.tmdbId}?api_key=${apiKey}&language=tr-TR`).then((r) =>
          r.ok ? r.json() : null
        ),
        fetch(`https://api.themoviedb.org/3/movie/${existing.tmdbId}?api_key=${apiKey}&language=en-US`).then((r) =>
          r.ok ? r.json() : null
        ),
        tmdbClient.getMovieDetails(existing.tmdbId).catch(() => null),
      ]);

      if (!resTr && !resEn) {
        return NextResponse.json({ error: "TMDB üzerinden film bilgileri alınamadı." }, { status: 502 });
      }

      const title = resTr?.title || resEn?.title || existing.title;
      const originalTitle = resTr?.original_title || resEn?.original_title || existing.originalTitle;
      const overview = resTr?.overview || resEn?.overview || "";
      const posterPath = resTr?.poster_path || resEn?.poster_path || existing.posterPath;
      const backdropPath = resTr?.backdrop_path || resEn?.backdrop_path || existing.backdropPath;
      const releaseDate = resTr?.release_date || resEn?.release_date;
      const releaseYear = releaseDate ? parseInt(releaseDate.substring(0, 4), 10) : existing.releaseYear;
      const voteAverage = resTr?.vote_average ?? existing.voteAverage;
      const popularity = resTr?.popularity ?? existing.popularity;
      const rawGenres = resTr?.genres || resEn?.genres || [];
      const genres = rawGenres.map((g: any) => g.name).filter(Boolean);

      const currentMeta = (existing.metadata as Record<string, any>) || {};
      const updatedMeta = {
        ...currentMeta,
        overview,
        genres: genres.length > 0 ? genres : currentMeta.genres || [],
        runtime: resTr?.runtime || resEn?.runtime || currentMeta.runtime,
        ...(details?.cast ? { cast: details.cast } : {}),
        ...(details?.director ? { director: details.director } : {}),
        ...(details?.trailer ? { trailer: details.trailer } : {}),
      };

      const updated = await db.movie.update({
        where: { id },
        data: {
          title,
          originalTitle,
          posterPath,
          backdropPath,
          releaseYear,
          voteAverage,
          popularity,
          metadata: updatedMeta,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, item: updated, message: "Film TMDB ile başarıyla senkronize edildi." });
    }
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[Admin Media Sync Error]:", error);
    return NextResponse.json({ error: "TMDB senkronizasyonu sırasında bir hata oluştu." }, { status: 500 });
  }
}
