import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { requireAdminSession } from "@/lib/admin/auth";
import { getPhaseHBackfillReadinessReport } from "@/lib/calibration/coverage";
import { MediaType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminSession();

    const [
      movieInteractionsCount,
      movieWatchedCount,
      tvInteractionsCount,
      tvWatchedCount,
      movieSafetyStats,
      tvSafetyStats,
      backfillJobs,
      movieReadinessReport,
      tvReadinessReport,
    ] = await Promise.all([
      db.movieInteraction.count(),
      db.movieInteraction.count({ where: { status: "WATCHED" } }),
      db.tvInteraction.count(),
      db.tvInteraction.count({ where: { status: "WATCHED" } }),
      db.movie.groupBy({
        by: ["safetyLevel"],
        _count: { id: true },
      }),
      db.tvShow.groupBy({
        by: ["safetyLevel"],
        _count: { id: true },
      }),
      db.catalogBackfillJob.findMany({
        orderBy: { lastRunAt: "desc" },
      }),
      getPhaseHBackfillReadinessReport(MediaType.FILM),
      getPhaseHBackfillReadinessReport(MediaType.TV),
    ]);

    const movieWatchedHitRate =
      movieInteractionsCount > 0 ? movieWatchedCount / movieInteractionsCount : 0;
    const tvWatchedHitRate =
      tvInteractionsCount > 0 ? tvWatchedCount / tvInteractionsCount : 0;
    const totalInteractions = movieInteractionsCount + tvInteractionsCount;
    const totalWatched = movieWatchedCount + tvWatchedCount;
    const overallWatchedHitRate =
      totalInteractions > 0 ? totalWatched / totalInteractions : 0;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      hitRateKpis: {
        overallWatchedHitRate: Math.round(overallWatchedHitRate * 1000) / 10,
        movieWatchedHitRate: Math.round(movieWatchedHitRate * 1000) / 10,
        tvWatchedHitRate: Math.round(tvWatchedHitRate * 1000) / 10,
        movieTotalEvaluations: movieInteractionsCount,
        movieWatchedTotal: movieWatchedCount,
        tvTotalEvaluations: tvInteractionsCount,
        tvWatchedTotal: tvWatchedCount,
      },
      catalogSafety: {
        movies: movieSafetyStats.map((s) => ({
          safetyLevel: s.safetyLevel,
          count: s._count.id,
        })),
        tvShows: tvSafetyStats.map((s) => ({
          safetyLevel: s.safetyLevel,
          count: s._count.id,
        })),
      },
      readinessReports: {
        film: movieReadinessReport,
        tv: tvReadinessReport,
      },
      backfillJobs,
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Admin Diagnostics Calibration Error]:", error);
    return NextResponse.json(
      { error: "Diagnostics fetch failed", details: error?.message },
      { status: 500 }
    );
  }
}
