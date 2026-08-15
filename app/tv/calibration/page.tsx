import React from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/service";
import { getTvCalibrationQueue } from "@/lib/tv/calibration/service";
import { TvCalibrationEngine } from "@/components/tv/TvCalibrationEngine";
import { TvShowItem } from "@/components/tv/types";

export default async function TvCalibrationPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/auth?returnTo=/tv/calibration");
  }

  // Pre-fetch initial candidate queue on server side for zero-layout-shift
  const queueResult = await getTvCalibrationQueue(user.id, 5);

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
      initialAnsweredCount={queueResult.answeredCount}
      initialCompleted={queueResult.completed}
    />
  );
}
