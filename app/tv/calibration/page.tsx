import React from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/service";
import { getTvCalibrationQueue } from "@/lib/tv/calibration/service";
import { TvCalibrationEngine } from "@/components/tv/TvCalibrationEngine";
import { TvShowItem } from "@/components/tv/types";

export const dynamic = "force-dynamic";

export default async function TvCalibrationPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/auth?returnTo=/tv/calibration");
  }

  try {
    // Pre-fetch initial candidate queue on server side for zero-layout-shift (100% DB-first)
    const queueResult = await getTvCalibrationQueue(user.id, { limit: 5 });

    const initialTvShows: TvShowItem[] = queueResult.tvShows.map((s) => ({
      id: s.id,
      tmdbId: s.tmdbId,
      name: s.name,
      originalName: s.originalName,
      firstAirDate: s.firstAirDate,
      lastAirDate: s.lastAirDate,
      status: s.status,
      originalLanguage: s.originalLanguage,
      posterPath: s.posterPath,
      backdropPath: s.backdropPath,
      voteAverage: s.voteAverage,
      overview: s.overview,
      genres: s.genres,
      numberOfSeasons: s.numberOfSeasons,
      numberOfEpisodes: s.numberOfEpisodes,
    }));

    return (
      <TvCalibrationEngine
        initialTvShows={initialTvShows}
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
  } catch (error) {
    console.error("[TvCalibrationPage] Queue fetch error:", error);
    return (
      <TvCalibrationEngine
        initialTvShows={[]}
        initialTasteEvidenceCount={0}
        initialWatchedCount={0}
        initialEvaluationCount={0}
        initialCompleted={false}
      />
    );
  }
}
