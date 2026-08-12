import { db } from "@/lib/db/client";
import { InteractionStatus, RatingStatus } from "@prisma/client";

export interface LibraryFilterOptions {
  status: "watched" | "not_watched" | "unsure" | "watch_later";
  search?: string;
  rating?: string;
  sort?: "newest" | "oldest" | "title";
  page?: number;
  limit?: number;
}

export interface LibraryItem {
  id: string;
  movieId: string;
  title: string;
  originalTitle: string;
  releaseYear: number | null;
  posterPath: string | null;
  genres: string[];
  status: InteractionStatus | "WATCH_LATER";
  rating: RatingStatus | null;
  answeredAt: Date;
  updatedAt: Date;
}

export interface LibraryResponse {
  items: LibraryItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  counts: {
    watched: number;
    notWatched: number;
    unsure: number;
    watchLater: number;
  };
}

/**
 * Centralized service to update or transition user interaction status and ratings.
 * Guarantees same-row updates (no duplicate MovieInteraction rows) and invalidates stale Film DNA profiles.
 */
export async function updateUserInteraction(
  userId: string,
  movieId: string,
  targetStatus: InteractionStatus,
  targetRating: RatingStatus | null = null
) {
  // Validate input rules
  if (targetStatus === InteractionStatus.WATCHED && !targetRating) {
    throw new Error("İzlenen filmler için derecelendirme (rating) zorunludur.");
  }

  const finalRating = targetStatus === InteractionStatus.WATCHED ? targetRating : null;
  const now = new Date();

  // 1. Update or create MovieInteraction record safely using unique composite key
  const updatedInteraction = await db.movieInteraction.upsert({
    where: {
      userId_movieId: { userId, movieId },
    },
    update: {
      status: targetStatus,
      rating: finalRating,
      updatedAt: now,
    },
    create: {
      userId,
      movieId,
      status: targetStatus,
      rating: finalRating,
      answeredAt: now,
      updatedAt: now,
    },
  });

  // 2. If item was in WATCH_LATER recommendation feedback, clear or convert it
  const existingFeedback = await db.recommendationFeedback.findUnique({
    where: {
      userId_movieId: { userId, movieId },
    },
  });

  if (existingFeedback && existingFeedback.action === "WATCH_LATER") {
    if (targetStatus === InteractionStatus.WATCHED) {
      await db.recommendationFeedback.update({
        where: { id: existingFeedback.id },
        data: { action: "WATCHED_FROM_RECOMMENDATION", updatedAt: now },
      });
    } else {
      await db.recommendationFeedback.delete({
        where: { id: existingFeedback.id },
      });
    }
  }

  return updatedInteraction;
}

/**
 * Removes a movie from user's Watch Later list without affecting MovieInteraction history.
 */
export async function removeFromWatchLater(userId: string, movieId: string) {
  const existing = await db.recommendationFeedback.findUnique({
    where: { userId_movieId: { userId, movieId } },
  });

  if (existing && existing.action === "WATCH_LATER") {
    await db.recommendationFeedback.delete({
      where: { id: existing.id },
    });
    return true;
  }

  return false;
}

/**
 * Fetches user library data with server-side tab filtering, search, rating filters, sorting, and pagination.
 */
export async function getLibraryData(
  userId: string,
  options: LibraryFilterOptions
): Promise<LibraryResponse> {
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

  // Calculate counts for all 4 library tabs in parallel
  const [watchedCount, notWatchedCount, unsureCount, watchLaterCount] = await Promise.all([
    db.movieInteraction.count({ where: { userId, status: InteractionStatus.WATCHED } }),
    db.movieInteraction.count({ where: { userId, status: InteractionStatus.NOT_WATCHED } }),
    db.movieInteraction.count({ where: { userId, status: InteractionStatus.UNSURE } }),
    db.recommendationFeedback.count({ where: { userId, action: "WATCH_LATER" } }),
  ]);

  const counts = {
    watched: watchedCount,
    notWatched: notWatchedCount,
    unsure: unsureCount,
    watchLater: watchLaterCount,
  };

  if (status === "watch_later") {
    // Query RecommendationFeedback with action = WATCH_LATER
    const whereClause: any = {
      userId,
      action: "WATCH_LATER",
    };

    if (searchTrim) {
      whereClause.movie = {
        OR: [
          { title: { contains: searchTrim, mode: "insensitive" } },
          { originalTitle: { contains: searchTrim, mode: "insensitive" } },
        ],
      };
    }

    let orderBy: any = { updatedAt: "desc" };
    if (sort === "oldest") orderBy = { updatedAt: "asc" };
    else if (sort === "title") orderBy = { movie: { title: "asc" } };

    const [feedbacks, totalCount] = await Promise.all([
      db.recommendationFeedback.findMany({
        where: whereClause,
        skip,
        take: safeLimit,
        orderBy,
        include: { movie: true },
      }),
      db.recommendationFeedback.count({ where: whereClause }),
    ]);

    const items: LibraryItem[] = feedbacks.map((f: any) => {
      const meta = (f.movie.metadata as Record<string, unknown>) || {};
      return {
        id: f.id,
        movieId: f.movieId,
        title: f.movie.title,
        originalTitle: f.movie.originalTitle,
        releaseYear: f.movie.releaseYear,
        posterPath: f.movie.posterPath,
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

  // Query MovieInteraction by status
  let targetStatus = InteractionStatus.WATCHED;
  if (status === "not_watched") targetStatus = InteractionStatus.NOT_WATCHED;
  else if (status === "unsure") targetStatus = InteractionStatus.UNSURE;

  const whereClause: any = {
    userId,
    status: targetStatus,
  };

  if (status === "watched" && rating && rating !== "ALL") {
    whereClause.rating = rating as RatingStatus;
  }

  if (searchTrim) {
    whereClause.movie = {
      OR: [
        { title: { contains: searchTrim, mode: "insensitive" } },
        { originalTitle: { contains: searchTrim, mode: "insensitive" } },
      ],
    };
  }

  let orderBy: any = { updatedAt: "desc" };
  if (sort === "oldest") orderBy = { updatedAt: "asc" };
  else if (sort === "title") orderBy = { movie: { title: "asc" } };

  const [interactions, totalCount] = await Promise.all([
    db.movieInteraction.findMany({
      where: whereClause,
      skip,
      take: safeLimit,
      orderBy,
      include: { movie: true },
    }),
    db.movieInteraction.count({ where: whereClause }),
  ]);

  const items: LibraryItem[] = interactions.map((i: any) => {
    const meta = (i.movie.metadata as Record<string, unknown>) || {};
    return {
      id: i.id,
      movieId: i.movieId,
      title: i.movie.title,
      originalTitle: i.movie.originalTitle,
      releaseYear: i.movie.releaseYear,
      posterPath: i.movie.posterPath,
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
