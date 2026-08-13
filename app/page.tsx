import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { getAuthenticatedUser } from "@/lib/auth/service";
import { tmdbClient } from "@/lib/tmdb/client";
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

  const answeredInteractions = await db.movieInteraction.findMany({
    where: { userId },
    select: { movieId: true },
  });
  const answeredCount = answeredInteractions.length;

  // Uncalibrated user flow (< 30 answered movies)
  if (answeredCount < TARGET_CALIBRATION_COUNT) {
    let candidates = await db.movie.findMany({
      where: {
        id: { notIn: answeredInteractions.map((i: any) => i.movieId) },
      },
      orderBy: [{ popularity: "desc" }, { releaseYear: "desc" }],
      take: 6,
    });

    if (candidates.length < 5) {
      await tmdbClient.seedAndFetchMovies();
      candidates = await db.movie.findMany({
        where: {
          id: { notIn: answeredInteractions.map((i: any) => i.movieId) },
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
