import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/service";
import { getIntelligentCalibrationQueue } from "@/lib/calibration/service";
import { CalibrationEngine } from "@/components/movie/CalibrationEngine";
import { MovieItem } from "@/components/movie/MovieCard";

export default async function CalibratePage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/auth");
  }

  // Pre-fetch initial candidate queue on server side for zero-layout-shift (100% DB-first)
  const queueResult = await getIntelligentCalibrationQueue(user.id, 5);

  const initialMovies: MovieItem[] = queueResult.movies.map((movie) => ({
    id: movie.id,
    tmdbId: movie.tmdbId,
    title: movie.title,
    originalTitle: movie.originalTitle,
    releaseYear: movie.releaseYear,
    posterPath: movie.posterPath,
    backdropPath: movie.backdropPath,
    voteAverage: movie.voteAverage,
    overview: movie.overview,
    genres: movie.genres,
  }));

  return (
    <CalibrationEngine
      initialMovies={initialMovies}
      initialAnsweredCount={queueResult.answeredCount}
      initialCompleted={queueResult.completed}
    />
  );
}

