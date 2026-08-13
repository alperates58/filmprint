import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { getAuthenticatedUser } from "@/lib/auth/service";
import { tmdbClient } from "@/lib/tmdb/client";
import { CalibrationEngine } from "@/components/movie/CalibrationEngine";
import { MovieItem } from "@/components/movie/MovieCard";

export default async function CalibratePage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/auth");
  }
  const userId = user.id;

  const answeredInteractions = await db.movieInteraction.findMany({
    where: { userId },
    select: { movieId: true },
  });
  const answeredMovieIds = new Set(answeredInteractions.map((i: { movieId: string }) => i.movieId));
  const answeredCount = answeredMovieIds.size;

  let candidates = await db.movie.findMany({
    where: {
      id: { notIn: Array.from(answeredMovieIds) },
    },
    orderBy: [{ popularity: "desc" }, { releaseYear: "desc" }],
    take: 6,
  });

  if (candidates.length < 5) {
    await tmdbClient.seedAndFetchMovies();
    candidates = await db.movie.findMany({
      where: {
        id: { notIn: Array.from(answeredMovieIds) },
      },
      orderBy: [{ popularity: "desc" }, { releaseYear: "desc" }],
      take: 6,
    });
  }

  const initialMovies: MovieItem[] = candidates.map((movie: any) => {
    const meta = (movie.metadata as Record<string, unknown>) || {};
    return {
      id: movie.id,
      tmdbId: movie.tmdbId,
      title: movie.title,
      originalTitle: movie.originalTitle,
      releaseYear: movie.releaseYear,
      posterPath: movie.posterPath,
      backdropPath: movie.backdropPath,
      voteAverage: movie.voteAverage,
      overview: (meta.overview as string) || "",
      genres: (meta.genres as string[]) || [],
    };
  });

  return (
    <CalibrationEngine
      initialMovies={initialMovies}
      initialAnsweredCount={answeredCount}
      initialCompleted={answeredCount >= 30}
    />
  );
}
