import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/service";
import { getIntelligentCalibrationQueue } from "@/lib/calibration/service";
import { CalibrationEngine } from "@/components/movie/CalibrationEngine";
import { DiscoveryHome } from "@/components/home/DiscoveryHome";
import { MovieItem } from "@/components/movie/MovieCard";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ milestone?: string }>;
}) {
  let user = null;
  try {
    user = await getAuthenticatedUser();
  } catch (authError) {
    console.error("[Home Server] Auth check error:", authError);
    redirect("/auth");
  }

  if (!user) {
    redirect("/auth");
  }

  const userId = user.id;

  try {
    const queueResult = await getIntelligentCalibrationQueue(userId, { limit: 5 });

    // Uncalibrated user flow (if recommended calibration is not completed)
    if (!queueResult.recommendedCalibrationComplete) {
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
          initialTasteEvidenceCount={queueResult.tasteEvidenceCount}
          initialWatchedCount={queueResult.watchedCount}
          initialEvaluationCount={queueResult.evaluationCount}
          initialConfidence={queueResult.confidence}
          initialCanGenerateDna={queueResult.canGenerateDna}
          initialCompleted={queueResult.recommendedCalibrationComplete}
          minimumTarget={queueResult.minimumTarget}
          recommendedTarget={queueResult.recommendedTarget}
        />
      );
    }

    // Calibrated user flow -> Real Discovery Home Page!
    const params = await searchParams;
    const showMilestone = params?.milestone === "1" || params?.milestone === "true";

    return (
      <DiscoveryHome
        userName={user.name || user.email?.split("@")[0] || ""}
        answeredCount={queueResult.watchedCount}
        initialShowMilestone={showMilestone}
      />
    );
  } catch (err: any) {
    console.error("[Home Server] Calibration queue error:", err);

    // Fallback: If DB schema sync is pending or queue query fails, render safe discovery or calibration fallback
    const params = await searchParams;
    const showMilestone = params?.milestone === "1" || params?.milestone === "true";

    return (
      <DiscoveryHome
        userName={user.name || user.email?.split("@")[0] || ""}
        answeredCount={0}
        initialShowMilestone={showMilestone}
      />
    );
  }
}
