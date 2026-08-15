import { db } from "@/lib/db/client";
import type { TvInteractionStatus, RatingStatus, RecommendationAction } from "@prisma/client";

export interface TvLibraryFilterOptions {
  status: "watched" | "partially_watched" | "not_watched" | "unsure" | "watch_later";
  search?: string;
  rating?: string;
  sort?: "newest" | "oldest" | "title";
  page?: number;
  limit?: number;
}

export interface TvLibraryItem {
  id: string;
  tvShowId: string;
  name: string;
  originalName: string | null;
  firstAirDate: string | null;
  posterPath: string | null;
  genres: string[];
  status: TvInteractionStatus | "WATCH_LATER";
  rating: RatingStatus | null;
  answeredAt: Date;
  updatedAt: Date;
}

export interface TvLibraryResponse {
  items: TvLibraryItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  counts: {
    watched: number;
    partiallyWatched: number;
    notWatched: number;
    unsure: number;
    watchLater: number;
  };
}

/**
 * Updates or creates a TV interaction record safely using unique composite key [userId, tvShowId].
 */
export async function updateTvInteraction(
  userId: string,
  tvShowId: string,
  targetStatus: TvInteractionStatus,
  targetRating: RatingStatus | null = null
) {
  const allowedRatingStatuses: string[] = ["WATCHED", "PARTIALLY_WATCHED"];

  const finalRating = allowedRatingStatuses.includes(targetStatus) ? targetRating : null;
  const now = new Date();

  // 1. Update or create TvInteraction record safely using unique composite key
  const updatedInteraction = await db.tvInteraction.upsert({
    where: {
      userId_tvShowId: { userId, tvShowId },
    },
    update: {
      status: targetStatus,
      rating: finalRating,
      updatedAt: now,
    },
    create: {
      userId,
      tvShowId,
      status: targetStatus,
      rating: finalRating,
      answeredAt: now,
      updatedAt: now,
    },
  });

  // 2. If item was in WATCH_LATER recommendation feedback, clear or convert it
  const existingFeedback = await db.tvRecommendationFeedback.findUnique({
    where: {
      userId_tvShowId: { userId, tvShowId },
    },
  });

  if (existingFeedback && existingFeedback.action === "WATCH_LATER") {
    if (targetStatus === "WATCHED" || targetStatus === "PARTIALLY_WATCHED") {
      await db.tvRecommendationFeedback.update({
        where: { id: existingFeedback.id },
        data: { action: "WATCHED_FROM_RECOMMENDATION", updatedAt: now },
      });
    } else {
      await db.tvRecommendationFeedback.delete({
        where: { id: existingFeedback.id },
      });
    }
  }

  return updatedInteraction;
}

/**
 * Removes a TV show from user's Watch Later list without affecting TvInteraction history.
 */
export async function removeFromTvWatchLater(userId: string, tvShowId: string) {
  const existing = await db.tvRecommendationFeedback.findUnique({
    where: { userId_tvShowId: { userId, tvShowId } },
  });

  if (existing && existing.action === "WATCH_LATER") {
    await db.tvRecommendationFeedback.delete({
      where: { id: existing.id },
    });
    return true;
  }

  return false;
}

/**
 * Fetches user TV library data with server-side tab filtering, search, rating filters, sorting, and pagination.
 */
export async function getTvLibraryData(
  userId: string,
  options: TvLibraryFilterOptions
): Promise<TvLibraryResponse> {
  const {
    status = "watched",
    search = "",
    rating = "ALL",
    sort = "newest",
    page = 1,
    limit = 24,
  } = options;

  const safeLimit = Math.min(Math.max(1, limit), 50);
  const skip = Math.max(0, (page - 1) * safeLimit);
  const searchTrim = search.trim();

  // Calculate counts for all 5 TV library tabs in parallel
  const [watchedCount, partiallyWatchedCount, notWatchedCount, unsureCount, watchLaterCount] =
    await Promise.all([
      db.tvInteraction.count({ where: { userId, status: "WATCHED" } }),
      db.tvInteraction.count({ where: { userId, status: "PARTIALLY_WATCHED" } }),
      db.tvInteraction.count({ where: { userId, status: "NOT_WATCHED" } }),
      db.tvInteraction.count({ where: { userId, status: "UNSURE" } }),
      db.tvRecommendationFeedback.count({ where: { userId, action: "WATCH_LATER" } }),
    ]);

  const counts = {
    watched: watchedCount,
    partiallyWatched: partiallyWatchedCount,
    notWatched: notWatchedCount,
    unsure: unsureCount,
    watchLater: watchLaterCount,
  };

  if (status === "watch_later") {
    const whereClause: any = {
      userId,
      action: "WATCH_LATER",
    };

    if (searchTrim) {
      whereClause.tvShow = {
        OR: [
          { name: { contains: searchTrim, mode: "insensitive" } },
          { originalName: { contains: searchTrim, mode: "insensitive" } },
        ],
      };
    }

    let orderBy: any = { updatedAt: "desc" };
    if (sort === "oldest") orderBy = { updatedAt: "asc" };
    else if (sort === "title") orderBy = { tvShow: { name: "asc" } };

    const [feedbacks, totalCount] = await Promise.all([
      db.tvRecommendationFeedback.findMany({
        where: whereClause,
        skip,
        take: safeLimit,
        orderBy,
        include: { tvShow: true },
      }),
      db.tvRecommendationFeedback.count({ where: whereClause }),
    ]);

    const items: TvLibraryItem[] = feedbacks.map((f: any) => {
      const meta = (f.tvShow.metadata as Record<string, unknown>) || {};
      return {
        id: f.id,
        tvShowId: f.tvShowId,
        name: f.tvShow.name,
        originalName: f.tvShow.originalName,
        firstAirDate: f.tvShow.firstAirDate,
        posterPath: f.tvShow.posterPath,
        genres: (meta.genres as string[]) || [],
        status: "WATCH_LATER",
        rating: null,
        answeredAt: f.createdAt,
        updatedAt: f.updatedAt,
      };
    });

    return {
      items,
      totalCount,
      totalPages: Math.ceil(totalCount / safeLimit) || 1,
      currentPage: page,
      counts,
    };
  }

  // Query TvInteraction by status
  let targetStatus: TvInteractionStatus = "WATCHED";
  if (status === "partially_watched") targetStatus = "PARTIALLY_WATCHED";
  else if (status === "not_watched") targetStatus = "NOT_WATCHED";
  else if (status === "unsure") targetStatus = "UNSURE";

  const whereClause: any = {
    userId,
    status: targetStatus,
  };

  if ((status === "watched" || status === "partially_watched") && rating && rating !== "ALL") {
    whereClause.rating = rating as RatingStatus;
  }

  if (searchTrim) {
    whereClause.tvShow = {
      OR: [
        { name: { contains: searchTrim, mode: "insensitive" } },
        { originalName: { contains: searchTrim, mode: "insensitive" } },
      ],
    };
  }

  let orderBy: any = { updatedAt: "desc" };
  if (sort === "oldest") orderBy = { updatedAt: "asc" };
  else if (sort === "title") orderBy = { tvShow: { name: "asc" } };

  const [interactions, totalCount] = await Promise.all([
    db.tvInteraction.findMany({
      where: whereClause,
      skip,
      take: safeLimit,
      orderBy,
      include: { tvShow: true },
    }),
    db.tvInteraction.count({ where: whereClause }),
  ]);

  const items: TvLibraryItem[] = interactions.map((i: any) => {
    const meta = (i.tvShow.metadata as Record<string, unknown>) || {};
    return {
      id: i.id,
      tvShowId: i.tvShowId,
      name: i.tvShow.name,
      originalName: i.tvShow.originalName,
      firstAirDate: i.tvShow.firstAirDate,
      posterPath: i.tvShow.posterPath,
      genres: (meta.genres as string[]) || [],
      status: i.status,
      rating: i.rating,
      answeredAt: i.answeredAt,
      updatedAt: i.updatedAt,
    };
  });

  return {
    items,
    totalCount,
    totalPages: Math.ceil(totalCount / safeLimit) || 1,
    currentPage: page,
    counts,
  };
}
