import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/service";
import { tmdbClient } from "@/lib/tmdb/client";
import { InteractionStatus, RatingStatus } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ movieId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    const { movieId } = await params;

    // 1. Fetch movie from local PostgreSQL database (by UUID id or tmdbId)
    let movie = await db.movie.findFirst({
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

    let meta = (movie.metadata as Record<string, any>) || {};

    // 2. If runtime, director, cast, or trailer is missing in metadata, enrich via TMDB Client
    if (!meta.director || !meta.cast || meta.trailer === undefined) {
      const tmdbDetails = await tmdbClient.getMovieDetails(movie.tmdbId);

      const updatedMeta = {
        ...meta,
        runtime: tmdbDetails.runtime || meta.runtime || null,
        director: tmdbDetails.director || meta.director || null,
        cast: tmdbDetails.cast || meta.cast || [],
        trailer: tmdbDetails.trailer !== undefined ? tmdbDetails.trailer : (meta.trailer || null),
      };

      try {
        movie = await db.movie.update({
          where: { id: movie.id },
          data: { metadata: updatedMeta },
        });
        meta = updatedMeta;
      } catch (e) {
        meta = updatedMeta;
      }
    }

    // 3. Resolve current user's interaction or feedback status
    let userStatus: InteractionStatus | "WATCH_LATER" | null = null;
    let userRating: RatingStatus | null = null;

    if (currentUser) {
      const [interaction, feedback] = await Promise.all([
        db.movieInteraction.findUnique({
          where: { userId_movieId: { userId: currentUser.id, movieId: movie.id } },
        }),
        db.recommendationFeedback.findUnique({
          where: { userId_movieId: { userId: currentUser.id, movieId: movie.id } },
        }),
      ]);

      if (interaction) {
        userStatus = interaction.status;
        userRating = interaction.rating;
      } else if (feedback && feedback.action === "WATCH_LATER") {
        userStatus = "WATCH_LATER";
      }
    }

    const posterUrl = movie.posterPath
      ? movie.posterPath.startsWith("http")
        ? movie.posterPath
        : `https://image.tmdb.org/t/p/w500${movie.posterPath}`
      : null;

    const backdropUrl = movie.backdropPath
      ? movie.backdropPath.startsWith("http")
        ? movie.backdropPath
        : `https://image.tmdb.org/t/p/w1280${movie.backdropPath}`
      : null;

    return NextResponse.json({
      id: movie.id,
      tmdbId: movie.tmdbId,
      title: movie.title,
      originalTitle: movie.originalTitle,
      overview: (meta.overview as string) || "Bu film için detaylı özet bulunmuyor.",
      releaseYear: movie.releaseYear,
      runtime: (meta.runtime as number | null) || null,
      genres: (meta.genres as string[]) || [],
      voteAverage: movie.voteAverage,
      posterUrl,
      backdropUrl,
      director: (meta.director as string | null) || null,
      cast: (meta.cast as any[]) || [],
      trailer: (meta.trailer as any) || null,
      userStatus,
      userRating,
    });
  } catch (error) {
    console.error("[GET /api/movies/[movieId] Error]:", error);
    return NextResponse.json(
      { error: "Film detayları alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
