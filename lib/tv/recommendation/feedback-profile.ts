import { db } from "@/lib/db/client";
import type { CandidateTvShow, TvFeedbackProfile } from "./types";
import { TV_FEEDBACK_ADJUSTMENT_BOUNDS } from "./constants";

export const EMPTY_TV_FEEDBACK_PROFILE: TvFeedbackProfile = {
  notInterestedShowIds: new Set<string>(),
  notInterestedGenres: new Map<string, number>(),
  watchLaterShowIds: new Set<string>(),
  alreadyWatchedShowIds: new Set<string>(),
  recentFeedbackWeight: 0,
};

/**
 * Builds user's TV recommendation feedback profile for short-term adjustments and exclusions.
 */
export async function buildTvFeedbackProfile(userId: string): Promise<TvFeedbackProfile> {
  const feedbacks = await db.tvRecommendationFeedback.findMany({
    where: { userId },
    include: { tvShow: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const notInterestedShowIds = new Set<string>();
  const notInterestedGenres = new Map<string, number>();
  const watchLaterShowIds = new Set<string>();
  const alreadyWatchedShowIds = new Set<string>();

  for (const f of feedbacks) {
    if (f.action === "NOT_INTERESTED") {
      notInterestedShowIds.add(f.tvShowId);
      const meta = (f.tvShow.metadata as Record<string, any>) || {};
      const rawGenres = meta.genres || [];
      const genres: string[] = Array.isArray(rawGenres)
        ? rawGenres.map((g: any) => (typeof g === "string" ? g : g.name || "")).filter(Boolean)
        : [];

      for (const g of genres) {
        notInterestedGenres.set(g, (notInterestedGenres.get(g) || 0) + 1);
      }
    } else if (f.action === "WATCH_LATER") {
      watchLaterShowIds.add(f.tvShowId);
    } else if (f.action === "ALREADY_WATCHED" || f.action === "WATCHED_FROM_RECOMMENDATION") {
      alreadyWatchedShowIds.add(f.tvShowId);
    }
  }

  return {
    notInterestedShowIds,
    notInterestedGenres,
    watchLaterShowIds,
    alreadyWatchedShowIds,
    recentFeedbackWeight: Math.min(1.0, feedbacks.length / 10),
  };
}

/**
 * Calculates bounded short-term feedback score adjustment for a candidate.
 */
export function calculateTvFeedbackAdjustment(
  show: CandidateTvShow,
  feedback: TvFeedbackProfile
): number {
  let adjustment = 0;

  // Direct dismissal penalty
  if (feedback.notInterestedShowIds.has(show.id)) {
    return TV_FEEDBACK_ADJUSTMENT_BOUNDS.min; // -15
  }

  // Genre-level negative feedback attenuation
  const showGenres = show.metadata?.genres || [];
  for (const g of showGenres) {
    const dismissCount = feedback.notInterestedGenres.get(g) || 0;
    if (dismissCount > 0) {
      adjustment -= Math.min(6, dismissCount * 2);
    }
  }

  // Clamp within TV_FEEDBACK_ADJUSTMENT_BOUNDS [-15, +10]
  return Math.max(
    TV_FEEDBACK_ADJUSTMENT_BOUNDS.min,
    Math.min(TV_FEEDBACK_ADJUSTMENT_BOUNDS.max, Math.round(adjustment))
  );
}
