import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { getAuthenticatedUser } from "@/lib/auth/service";
import { getIntelligentCalibrationQueue } from "@/lib/calibration/service";
import { CalibrationEngine } from "@/components/movie/CalibrationEngine";
import { DiscoveryHome } from "@/components/home/DiscoveryHome";
import { MovieItem } from "@/components/movie/MovieCard";

const TARGET_CALIBRATION_COUNT = 30;

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ milestone?: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/auth");
  }
  const userId = user.id;

  const answeredCount = await db.movieInteraction.count({
    where: { userId },
  });

  // Uncalibrated user flow (< 30 answered movies)
  if (answeredCount < TARGET_CALIBRATION_COUNT) {
    const queueResult = await getIntelligentCalibrationQueue(userId, 5);

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
        initialCompleted={false}
      />
    );
  }

  // Calibrated user flow (>= 30 answered movies) -> Real Discovery Home Page!
  const params = await searchParams;
  const showMilestone = params?.milestone === "1" || params?.milestone === "true";

  return (
    <DiscoveryHome
      userName={user.name || user.email?.split("@")[0] || ""}
      answeredCount={answeredCount}
      initialShowMilestone={showMilestone}
    />
  );
}

