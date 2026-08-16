import { db } from "@/lib/db/client";
import { MediaType, LibraryState, RatingStatus } from "@prisma/client";
import { getOrCalculateUserProfile } from "@/lib/profile/service";
import { getOrRecalculateTvTasteProfile } from "@/lib/tv/profile/service";
import { calculateMovieMatch } from "@/lib/recommendation/matcher";
import { calculateTvMatch } from "@/lib/tv/recommendation/matcher";
import type { FilmDnaResult } from "@/lib/profile/types";
import type { TvDnaResult } from "@/lib/tv/profile/types";
import type { CandidateMovie } from "@/lib/calibration/types";
import type { CandidateTvShow } from "@/lib/tv/recommendation/types";

export interface LibraryFilterOptions {
  mediaType?: "FILM" | "TV" | "ALL";
  state?: "WATCHLIST" | "WATCHED" | "NOT_WATCHED" | "DROPPED" | "ALL";
  isFavorite?: boolean;
  search?: string;
  rating?: string;
  sort?: "newest" | "oldest" | "title" | "rating" | "year";
  page?: number;
  limit?: number;
}

export interface LibraryItemDto {
  id: string;
  mediaType: "FILM" | "TV";
  contentId: string;
  tmdbId: number;
  title: string;
  originalTitle: string;
  releaseYear: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  genres: string[];
  voteAverage: number;
  overview: string;
  state: "WATCHLIST" | "WATCHED" | "NOT_WATCHED" | "DROPPED";
  isFavorite: boolean;
  userRating: "LOVE" | "LIKE" | "NEUTRAL" | "DISLIKE" | null;
  addedAt: Date;
  updatedAt: Date;
  watchedAt: Date | null;
  droppedAt: Date | null;
  matchScore?: number;
  matchLabel?: string;
  numberOfSeasons?: number | null;
  statusLabel?: string | null;
}

export interface UserLibraryResponse {
  items: LibraryItemDto[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  counts: {
    total: number;
    watchlist: number;
    watched: number;
    notWatched: number;
    dropped: number;
    favorites: number;
    films: {
      total: number;
      watchlist: number;
      watched: number;
      notWatched: number;
      dropped: number;
      favorites: number;
    };
    tv: {
      total: number;
      watchlist: number;
      watched: number;
      notWatched: number;
      dropped: number;
      favorites: number;
    };
  };
}

/**
 * Retrieves user library data with server-side filtering, searching, sorting, and pagination.
 * Performs on-demand idempotent sync for historical interactions so existing users see their full library immediately.
 */
export async function getUserLibraryData(
  userId: string,
  options: LibraryFilterOptions = {}
): Promise<UserLibraryResponse> {
  const {
    mediaType = "ALL",
    state = "ALL",
    isFavorite,
    search = "",
    rating = "ALL",
    sort = "newest",
    page = 1,
    limit = 24,
  } = options;

  const safeLimit = Math.min(Math.max(1, limit), 50);
  const skip = Math.max(0, (page - 1) * safeLimit);
  const searchTrim = search.trim();

  // 1. Fetch existing library entries, interactions, and feedbacks in parallel
  const [
    allEntries,
    filmInteractions,
    tvInteractions,
    movieWatchlistFeedbacks,
    tvWatchlistFeedbacks,
  ] = await Promise.all([
    db.userContentLibrary.findMany({
      where: { userId },
      select: {
        id: true,
        mediaType: true,
        movieId: true,
        tvShowId: true,
        state: true,
        isFavorite: true,
      },
    }),
    db.movieInteraction.findMany({
      where: { userId },
      select: { movieId: true, rating: true, status: true, answeredAt: true, updatedAt: true },
    }),
    db.tvInteraction.findMany({
      where: { userId },
      select: { tvShowId: true, rating: true, status: true, answeredAt: true, updatedAt: true },
    }),
    db.recommendationFeedback.findMany({
      where: { userId, action: { in: ["WATCHLIST", "WATCH_LATER"] } },
      select: { movieId: true, createdAt: true },
    }),
    db.tvRecommendationFeedback.findMany({
      where: { userId, action: { in: ["WATCHLIST", "WATCH_LATER"] } },
      select: { tvShowId: true, createdAt: true },
    }),
  ]);

  // 2. Perform idempotent on-demand backfill if interactions exist but are missing in userContentLibrary
  const existingMovieEntryIds = new Set(allEntries.filter((e) => e.mediaType === "FILM" && e.movieId).map((e) => e.movieId!));
  const existingTvEntryIds = new Set(allEntries.filter((e) => e.mediaType === "TV" && e.tvShowId).map((e) => e.tvShowId!));

  const syncPromises: Promise<any>[] = [];

  // Sync Movie Watched
  for (const fi of filmInteractions) {
    if (fi.status === "WATCHED" && !existingMovieEntryIds.has(fi.movieId)) {
      syncPromises.push(
        db.userContentLibrary.upsert({
          where: { userId_movieId: { userId, movieId: fi.movieId } },
          update: { state: LibraryState.WATCHED, watchedAt: fi.answeredAt },
          create: {
            userId,
            mediaType: MediaType.FILM,
            movieId: fi.movieId,
            state: LibraryState.WATCHED,
            isFavorite: fi.rating === "LOVE",
            addedAt: fi.answeredAt,
            watchedAt: fi.answeredAt,
          },
        }).catch(() => null)
      );
      existingMovieEntryIds.add(fi.movieId);
    }
  }

  // Sync TV Watched & Dropped
  for (const ti of tvInteractions) {
    if (ti.status === "WATCHED" && !existingTvEntryIds.has(ti.tvShowId)) {
      syncPromises.push(
        db.userContentLibrary.upsert({
          where: { userId_tvShowId: { userId, tvShowId: ti.tvShowId } },
          update: { state: LibraryState.WATCHED, watchedAt: ti.answeredAt },
          create: {
            userId,
            mediaType: MediaType.TV,
            tvShowId: ti.tvShowId,
            state: LibraryState.WATCHED,
            isFavorite: ti.rating === "LOVE",
            addedAt: ti.answeredAt,
            watchedAt: ti.answeredAt,
          },
        }).catch(() => null)
      );
      existingTvEntryIds.add(ti.tvShowId);
    } else if (ti.status === "PARTIALLY_WATCHED" && !existingTvEntryIds.has(ti.tvShowId)) {
      syncPromises.push(
        db.userContentLibrary.upsert({
          where: { userId_tvShowId: { userId, tvShowId: ti.tvShowId } },
          update: { state: LibraryState.DROPPED, droppedAt: ti.answeredAt },
          create: {
            userId,
            mediaType: MediaType.TV,
            tvShowId: ti.tvShowId,
            state: LibraryState.DROPPED,
            addedAt: ti.answeredAt,
            droppedAt: ti.answeredAt,
          },
        }).catch(() => null)
      );
      existingTvEntryIds.add(ti.tvShowId);
    }
  }

  // Sync Movie & TV Watchlist Feedbacks
  for (const mw of movieWatchlistFeedbacks) {
    if (mw.movieId && !existingMovieEntryIds.has(mw.movieId)) {
      syncPromises.push(
        db.userContentLibrary.upsert({
          where: { userId_movieId: { userId, movieId: mw.movieId } },
          update: { state: LibraryState.WATCHLIST },
          create: {
            userId,
            mediaType: MediaType.FILM,
            movieId: mw.movieId,
            state: LibraryState.WATCHLIST,
            addedAt: mw.createdAt,
          },
        }).catch(() => null)
      );
      existingMovieEntryIds.add(mw.movieId);
    }
  }

  for (const tw of tvWatchlistFeedbacks) {
    if (tw.tvShowId && !existingTvEntryIds.has(tw.tvShowId)) {
      syncPromises.push(
        db.userContentLibrary.upsert({
          where: { userId_tvShowId: { userId, tvShowId: tw.tvShowId } },
          update: { state: LibraryState.WATCHLIST },
          create: {
            userId,
            mediaType: MediaType.TV,
            tvShowId: tw.tvShowId,
            state: LibraryState.WATCHLIST,
            addedAt: tw.createdAt,
          },
        }).catch(() => null)
      );
      existingTvEntryIds.add(tw.tvShowId);
    }
  }

  if (syncPromises.length > 0) {
    await Promise.all(syncPromises);
  }

  // Re-fetch all entries after sync for accurate counts
  const currentLibraryEntries = syncPromises.length > 0
    ? await db.userContentLibrary.findMany({
        where: { userId },
        select: {
          id: true,
          mediaType: true,
          movieId: true,
          tvShowId: true,
          state: true,
          isFavorite: true,
        },
      })
    : allEntries;

  const movieRatingMap = new Map(filmInteractions.map((i) => [i.movieId, i.rating]));
  const tvRatingMap = new Map(tvInteractions.map((i) => [i.tvShowId, i.rating]));

  // Compute breakdown counts
  let totalCount = currentLibraryEntries.length;
  let watchlistCount = 0;
  let watchedCount = 0;
  let notWatchedCount = 0;
  let droppedCount = 0;
  let favoritesCount = 0;

  const filmCounts = { total: 0, watchlist: 0, watched: 0, notWatched: 0, dropped: 0, favorites: 0 };
  const tvCounts = { total: 0, watchlist: 0, watched: 0, notWatched: 0, dropped: 0, favorites: 0 };

  for (const entry of currentLibraryEntries) {
    if (entry.state === "WATCHLIST") {
      watchlistCount++;
      if (entry.mediaType === "FILM") filmCounts.watchlist++;
      else tvCounts.watchlist++;
    } else if (entry.state === "WATCHED") {
      watchedCount++;
      if (entry.mediaType === "FILM") filmCounts.watched++;
      else tvCounts.watched++;
    } else if (entry.state === "DROPPED") {
      droppedCount++;
      if (entry.mediaType === "FILM") filmCounts.dropped++;
      else tvCounts.dropped++;
    }

    if (entry.isFavorite) {
      favoritesCount++;
      if (entry.mediaType === "FILM") filmCounts.favorites++;
      else tvCounts.favorites++;
    }

    if (entry.mediaType === "FILM") filmCounts.total++;
    else tvCounts.total++;
  }

  // Calculate not-watched counts from interactions
  for (const fi of filmInteractions) {
    if (fi.status === "NOT_WATCHED") {
      notWatchedCount++;
      filmCounts.notWatched++;
    }
  }
  for (const ti of tvInteractions) {
    if (ti.status === "NOT_WATCHED") {
      notWatchedCount++;
      tvCounts.notWatched++;
    }
  }

  // Handle NOT_WATCHED special query tab
  if (state === "NOT_WATCHED") {
    const movieNotWatched = mediaType !== "TV"
      ? await db.movieInteraction.findMany({
          where: {
            userId,
            status: "NOT_WATCHED",
            ...(searchTrim
              ? {
                  movie: {
                    OR: [
                      { title: { contains: searchTrim, mode: "insensitive" } },
                      { originalTitle: { contains: searchTrim, mode: "insensitive" } },
                    ],
                  },
                }
              : {}),
          },
          include: { movie: true },
          orderBy: sort === "oldest" ? { updatedAt: "asc" } : { updatedAt: "desc" },
        })
      : [];

    const tvNotWatched = mediaType !== "FILM"
      ? await db.tvInteraction.findMany({
          where: {
            userId,
            status: "NOT_WATCHED",
            ...(searchTrim
              ? {
                  tvShow: {
                    OR: [
                      { name: { contains: searchTrim, mode: "insensitive" } },
                      { originalName: { contains: searchTrim, mode: "insensitive" } },
                    ],
                  },
                }
              : {}),
          },
          include: { tvShow: true },
          orderBy: sort === "oldest" ? { updatedAt: "asc" } : { updatedAt: "desc" },
        })
      : [];

    const allNotWatched: LibraryItemDto[] = [
      ...movieNotWatched.map((m) => {
        const meta = (m.movie.metadata as Record<string, unknown>) || {};
        return {
          id: m.id,
          mediaType: "FILM" as const,
          contentId: m.movie.id,
          tmdbId: m.movie.tmdbId,
          title: m.movie.title,
          originalTitle: m.movie.originalTitle,
          releaseYear: m.movie.releaseYear,
          posterPath: m.movie.posterPath,
          backdropPath: m.movie.backdropPath,
          genres: (meta.genres as string[]) || [],
          voteAverage: m.movie.voteAverage,
          overview: (meta.overview as string) || "",
          state: "NOT_WATCHED" as const,
          isFavorite: false,
          userRating: null,
          addedAt: m.answeredAt,
          updatedAt: m.updatedAt,
          watchedAt: null,
          droppedAt: null,
        };
      }),
      ...tvNotWatched.map((t) => {
        const meta = (t.tvShow.metadata as Record<string, unknown>) || {};
        const rawGenres = (meta.genres as any[]) || [];
        const genres = rawGenres.map((g) => (typeof g === "string" ? g : g.name || "")).filter(Boolean);
        const firstAirYear = t.tvShow.firstAirDate ? parseInt(t.tvShow.firstAirDate.slice(0, 4), 10) : null;
        return {
          id: t.id,
          mediaType: "TV" as const,
          contentId: t.tvShow.id,
          tmdbId: t.tvShow.tmdbId,
          title: t.tvShow.name,
          originalTitle: t.tvShow.originalName || t.tvShow.name,
          releaseYear: isNaN(firstAirYear as number) ? null : firstAirYear,
          posterPath: t.tvShow.posterPath,
          backdropPath: t.tvShow.backdropPath,
          genres,
          voteAverage: t.tvShow.voteAverage,
          overview: t.tvShow.overview || "",
          state: "NOT_WATCHED" as const,
          isFavorite: false,
          userRating: null,
          addedAt: t.answeredAt,
          updatedAt: t.updatedAt,
          watchedAt: null,
          droppedAt: null,
        };
      }),
    ];

    const totalNotWatched = allNotWatched.length;
    const paginatedNotWatched = allNotWatched.slice(skip, skip + safeLimit);

    return {
      items: paginatedNotWatched,
      totalCount: totalNotWatched,
      totalPages: Math.ceil(totalNotWatched / safeLimit) || 1,
      currentPage: page,
      counts: {
        total: totalCount + notWatchedCount,
        watchlist: watchlistCount,
        watched: watchedCount,
        notWatched: notWatchedCount,
        dropped: droppedCount,
        favorites: favoritesCount,
        films: filmCounts,
        tv: tvCounts,
      },
    };
  }

  // Build Prisma Where Clause for target page items
  const whereClause: any = { userId };

  if (mediaType === "FILM") {
    whereClause.mediaType = MediaType.FILM;
  } else if (mediaType === "TV") {
    whereClause.mediaType = MediaType.TV;
  }

  if (state === "WATCHLIST") {
    whereClause.state = LibraryState.WATCHLIST;
  } else if (state === "WATCHED") {
    whereClause.state = LibraryState.WATCHED;
  } else if (state === "DROPPED") {
    whereClause.state = LibraryState.DROPPED;
  }

  if (typeof isFavorite === "boolean") {
    whereClause.isFavorite = isFavorite;
  }

  if (searchTrim) {
    whereClause.OR = [
      { movie: { title: { contains: searchTrim, mode: "insensitive" } } },
      { movie: { originalTitle: { contains: searchTrim, mode: "insensitive" } } },
      { tvShow: { name: { contains: searchTrim, mode: "insensitive" } } },
      { tvShow: { originalName: { contains: searchTrim, mode: "insensitive" } } },
    ];
  }

  // Ordering
  let orderBy: any = { addedAt: "desc" };
  if (sort === "oldest") orderBy = { addedAt: "asc" };
  else if (sort === "newest") orderBy = { updatedAt: "desc" };

  const [matchedEntries, filteredTotalCount] = await Promise.all([
    db.userContentLibrary.findMany({
      where: whereClause,
      skip,
      take: safeLimit,
      orderBy,
      include: {
        movie: true,
        tvShow: true,
      },
    }),
    db.userContentLibrary.count({ where: whereClause }),
  ]);

  // Format DTOs
  const items: LibraryItemDto[] = matchedEntries.map((e) => {
    if (e.mediaType === "FILM" && e.movie) {
      const meta = (e.movie.metadata as Record<string, unknown>) || {};
      const userRating = movieRatingMap.get(e.movie.id) || null;
      return {
        id: e.id,
        mediaType: "FILM",
        contentId: e.movie.id,
        tmdbId: e.movie.tmdbId,
        title: e.movie.title,
        originalTitle: e.movie.originalTitle,
        releaseYear: e.movie.releaseYear,
        posterPath: e.movie.posterPath,
        backdropPath: e.movie.backdropPath,
        genres: (meta.genres as string[]) || [],
        voteAverage: e.movie.voteAverage,
        overview: (meta.overview as string) || "",
        state: e.state,
        isFavorite: e.isFavorite,
        userRating,
        addedAt: e.addedAt,
        updatedAt: e.updatedAt,
        watchedAt: e.watchedAt,
        droppedAt: e.droppedAt,
      };
    } else if (e.mediaType === "TV" && e.tvShow) {
      const meta = (e.tvShow.metadata as Record<string, unknown>) || {};
      const rawGenres = (meta.genres as any[]) || [];
      const genres = rawGenres.map((g) => (typeof g === "string" ? g : g.name || "")).filter(Boolean);
      const userRating = tvRatingMap.get(e.tvShow.id) || null;
      const firstAirYear = e.tvShow.firstAirDate ? parseInt(e.tvShow.firstAirDate.slice(0, 4), 10) : null;
      return {
        id: e.id,
        mediaType: "TV",
        contentId: e.tvShow.id,
        tmdbId: e.tvShow.tmdbId,
        title: e.tvShow.name,
        originalTitle: e.tvShow.originalName || e.tvShow.name,
        releaseYear: isNaN(firstAirYear as number) ? null : firstAirYear,
        posterPath: e.tvShow.posterPath,
        backdropPath: e.tvShow.backdropPath,
        genres,
        voteAverage: e.tvShow.voteAverage,
        overview: e.tvShow.overview || "",
        state: e.state,
        isFavorite: e.isFavorite,
        userRating,
        addedAt: e.addedAt,
        updatedAt: e.updatedAt,
        watchedAt: e.watchedAt,
        droppedAt: e.droppedAt,
        numberOfSeasons: (meta.numberOfSeasons as number) || null,
        statusLabel: e.tvShow.status || null,
      };
    } else {
      return {
        id: e.id,
        mediaType: e.mediaType,
        contentId: e.movieId || e.tvShowId || "",
        tmdbId: 0,
        title: "Bilinmeyen İçerik",
        originalTitle: "",
        releaseYear: null,
        posterPath: null,
        backdropPath: null,
        genres: [],
        voteAverage: 0,
        overview: "",
        state: e.state,
        isFavorite: e.isFavorite,
        userRating: null,
        addedAt: e.addedAt,
        updatedAt: e.updatedAt,
        watchedAt: e.watchedAt,
        droppedAt: e.droppedAt,
      };
    }
  });

  // Optional rating filter in memory if specified
  let finalItems = items;
  if (rating !== "ALL") {
    finalItems = items.filter((item) => item.userRating === rating);
  }

  return {
    items: finalItems,
    totalCount: filteredTotalCount,
    totalPages: Math.ceil(filteredTotalCount / safeLimit) || 1,
    currentPage: page,
    counts: {
      total: totalCount,
      watchlist: watchlistCount,
      watched: watchedCount,
      notWatched: notWatchedCount,
      dropped: droppedCount,
      favorites: favoritesCount,
      films: filmCounts,
      tv: tvCounts,
    },
  };
}

/**
 * Sets or transitions content state in the canonical UserContentLibrary with atomic synchronization.
 */
export async function setLibraryState(
  userId: string,
  mediaType: "FILM" | "TV",
  contentId: string,
  targetAction:
    | "ADD_WATCHLIST"
    | "REMOVE_WATCHLIST"
    | "MARK_WATCHED"
    | "MARK_DROPPED"
    | "ADD_FAVORITE"
    | "REMOVE_FAVORITE"
    | "CLEAR_STATE",
  rating?: RatingStatus | null
): Promise<{ success: boolean; state?: LibraryState | null; isFavorite?: boolean }> {
  const isFilm = mediaType === "FILM";

  // 1. ADD_FAVORITE / REMOVE_FAVORITE
  if (targetAction === "ADD_FAVORITE" || targetAction === "REMOVE_FAVORITE") {
    const isFavorite = targetAction === "ADD_FAVORITE";

    if (isFilm) {
      const updated = await db.userContentLibrary.upsert({
        where: { userId_movieId: { userId, movieId: contentId } },
        update: { isFavorite },
        create: {
          userId,
          mediaType: MediaType.FILM,
          movieId: contentId,
          state: LibraryState.WATCHLIST,
          isFavorite,
        },
      });
      return { success: true, state: updated.state, isFavorite: updated.isFavorite };
    } else {
      const updated = await db.userContentLibrary.upsert({
        where: { userId_tvShowId: { userId, tvShowId: contentId } },
        update: { isFavorite },
        create: {
          userId,
          mediaType: MediaType.TV,
          tvShowId: contentId,
          state: LibraryState.WATCHLIST,
          isFavorite,
        },
      });
      return { success: true, state: updated.state, isFavorite: updated.isFavorite };
    }
  }

  // 2. CLEAR_STATE / REMOVE_WATCHLIST
  if (targetAction === "CLEAR_STATE" || targetAction === "REMOVE_WATCHLIST") {
    if (isFilm) {
      await db.userContentLibrary.deleteMany({
        where: { userId, movieId: contentId },
      });
    } else {
      await db.userContentLibrary.deleteMany({
        where: { userId, tvShowId: contentId },
      });
    }
    return { success: true, state: null, isFavorite: false };
  }

  // 3. MARK_WATCHED (Atomic Transaction with MovieInteraction/TvInteraction)
  if (targetAction === "MARK_WATCHED") {
    const validRating = rating && Object.values(RatingStatus).includes(rating) ? rating : null;

    if (isFilm) {
      await db.$transaction([
        db.movieInteraction.upsert({
          where: { userId_movieId: { userId, movieId: contentId } },
          update: {
            status: "WATCHED",
            ...(validRating ? { rating: validRating } : {}),
            answeredAt: new Date(),
          },
          create: {
            userId,
            movieId: contentId,
            status: "WATCHED",
            rating: validRating,
            answeredAt: new Date(),
          },
        }),
        db.userContentLibrary.upsert({
          where: { userId_movieId: { userId, movieId: contentId } },
          update: {
            state: LibraryState.WATCHED,
            watchedAt: new Date(),
          },
          create: {
            userId,
            mediaType: MediaType.FILM,
            movieId: contentId,
            state: LibraryState.WATCHED,
            watchedAt: new Date(),
          },
        }),
        db.recommendationFeedback.upsert({
          where: { userId_movieId: { userId, movieId: contentId } },
          update: {
            action: "WATCHED_FROM_RECOMMENDATION",
            source: "LIBRARY",
          },
          create: {
            userId,
            movieId: contentId,
            action: "WATCHED_FROM_RECOMMENDATION",
            source: "LIBRARY",
          },
        }),
      ]);
    } else {
      await db.$transaction([
        db.tvInteraction.upsert({
          where: { userId_tvShowId: { userId, tvShowId: contentId } },
          update: {
            status: "WATCHED",
            ...(validRating ? { rating: validRating } : {}),
            answeredAt: new Date(),
          },
          create: {
            userId,
            tvShowId: contentId,
            status: "WATCHED",
            rating: validRating,
            answeredAt: new Date(),
          },
        }),
        db.userContentLibrary.upsert({
          where: { userId_tvShowId: { userId, tvShowId: contentId } },
          update: {
            state: LibraryState.WATCHED,
            watchedAt: new Date(),
          },
          create: {
            userId,
            mediaType: MediaType.TV,
            tvShowId: contentId,
            state: LibraryState.WATCHED,
            watchedAt: new Date(),
          },
        }),
        db.tvRecommendationFeedback.upsert({
          where: { userId_tvShowId: { userId, tvShowId: contentId } },
          update: {
            action: "WATCHED_FROM_RECOMMENDATION",
            source: "LIBRARY",
          },
          create: {
            userId,
            tvShowId: contentId,
            action: "WATCHED_FROM_RECOMMENDATION",
            source: "LIBRARY",
          },
        }),
      ]);
    }

    return { success: true, state: LibraryState.WATCHED };
  }

  // 4. MARK_DROPPED
  if (targetAction === "MARK_DROPPED") {
    if (isFilm) {
      await db.userContentLibrary.upsert({
        where: { userId_movieId: { userId, movieId: contentId } },
        update: {
          state: LibraryState.DROPPED,
          droppedAt: new Date(),
        },
        create: {
          userId,
          mediaType: MediaType.FILM,
          movieId: contentId,
          state: LibraryState.DROPPED,
          droppedAt: new Date(),
        },
      });
    } else {
      await db.userContentLibrary.upsert({
        where: { userId_tvShowId: { userId, tvShowId: contentId } },
        update: {
          state: LibraryState.DROPPED,
          droppedAt: new Date(),
        },
        create: {
          userId,
          mediaType: MediaType.TV,
          tvShowId: contentId,
          state: LibraryState.DROPPED,
          droppedAt: new Date(),
        },
      });
    }

    return { success: true, state: LibraryState.DROPPED };
  }

  // 5. ADD_WATCHLIST (Default)
  if (isFilm) {
    const entry = await db.userContentLibrary.upsert({
      where: { userId_movieId: { userId, movieId: contentId } },
      update: {
        state: LibraryState.WATCHLIST,
      },
      create: {
        userId,
        mediaType: MediaType.FILM,
        movieId: contentId,
        state: LibraryState.WATCHLIST,
      },
    });
    return { success: true, state: entry.state, isFavorite: entry.isFavorite };
  } else {
    const entry = await db.userContentLibrary.upsert({
      where: { userId_tvShowId: { userId, tvShowId: contentId } },
      update: {
        state: LibraryState.WATCHLIST,
      },
      create: {
        userId,
        mediaType: MediaType.TV,
        tvShowId: contentId,
        state: LibraryState.WATCHLIST,
      },
    });
    return { success: true, state: entry.state, isFavorite: entry.isFavorite };
  }
}

/**
 * "Bu Akşam Ne İzlesem?"
 * Deterministically picks 1–3 high-match recommendation items directly from user's WATCHLIST.
 */
export async function getTonightPicks(
  userId: string,
  mediaType: "FILM" | "TV" | "ALL" = "ALL"
): Promise<LibraryItemDto[]> {
  const whereClause: any = {
    userId,
    state: LibraryState.WATCHLIST,
  };

  if (mediaType === "FILM") whereClause.mediaType = MediaType.FILM;
  else if (mediaType === "TV") whereClause.mediaType = MediaType.TV;

  const watchlistEntries = await db.userContentLibrary.findMany({
    where: whereClause,
    include: {
      movie: true,
      tvShow: true,
    },
    take: 50,
  });

  if (watchlistEntries.length === 0) {
    return [];
  }

  // Fetch DNA profiles for score ranking
  const [movieProfileRes, tvProfileRes] = await Promise.all([
    getOrCalculateUserProfile(userId).catch(() => ({ profile: {} as FilmDnaResult })),
    getOrRecalculateTvTasteProfile(userId).catch(() => ({ profile: {} as TvDnaResult })),
  ]);

  const movieProfile = (movieProfileRes.profile || {}) as FilmDnaResult;
  const tvProfile = (tvProfileRes.profile || {}) as TvDnaResult;

  const scoredItems: Array<{ item: LibraryItemDto; score: number }> = [];

  for (const entry of watchlistEntries) {
    if (entry.mediaType === "FILM" && entry.movie) {
      const meta = (entry.movie.metadata as Record<string, unknown>) || {};
      const candidate: CandidateMovie = {
        id: entry.movie.id,
        tmdbId: entry.movie.tmdbId,
        title: entry.movie.title,
        originalTitle: entry.movie.originalTitle,
        releaseYear: entry.movie.releaseYear,
        popularity: entry.movie.popularity,
        voteAverage: entry.movie.voteAverage,
        posterPath: entry.movie.posterPath,
        backdropPath: entry.movie.backdropPath,
        genres: (meta.genres as string[]) || [],
        overview: (meta.overview as string) || "",
      };

      const matchRes = calculateMovieMatch(candidate, movieProfile);
      scoredItems.push({
        item: {
          id: entry.id,
          mediaType: "FILM",
          contentId: entry.movie.id,
          tmdbId: entry.movie.tmdbId,
          title: entry.movie.title,
          originalTitle: entry.movie.originalTitle,
          releaseYear: entry.movie.releaseYear,
          posterPath: entry.movie.posterPath,
          backdropPath: entry.movie.backdropPath,
          genres: (meta.genres as string[]) || [],
          voteAverage: entry.movie.voteAverage,
          overview: (meta.overview as string) || "",
          state: entry.state,
          isFavorite: entry.isFavorite,
          userRating: null,
          addedAt: entry.addedAt,
          updatedAt: entry.updatedAt,
          watchedAt: entry.watchedAt,
          droppedAt: entry.droppedAt,
          matchScore: matchRes.displayMatchScore,
          matchLabel: matchRes.matchLabel,
        },
        score: matchRes.displayMatchScore + (entry.isFavorite ? 5 : 0),
      });
    } else if (entry.mediaType === "TV" && entry.tvShow) {
      const meta = (entry.tvShow.metadata as Record<string, unknown>) || {};
      const rawGenres = (meta.genres as any[]) || [];
      const genres = rawGenres.map((g) => (typeof g === "string" ? g : g.name || "")).filter(Boolean);
      const candidate: CandidateTvShow = {
        id: entry.tvShow.id,
        tmdbId: entry.tvShow.tmdbId,
        name: entry.tvShow.name,
        originalName: entry.tvShow.originalName || entry.tvShow.name,
        overview: entry.tvShow.overview || "",
        posterPath: entry.tvShow.posterPath,
        backdropPath: entry.tvShow.backdropPath,
        firstAirDate: entry.tvShow.firstAirDate,
        lastAirDate: entry.tvShow.lastAirDate,
        popularity: entry.tvShow.popularity,
        voteAverage: entry.tvShow.voteAverage,
        voteCount: entry.tvShow.voteCount,
        originalLanguage: entry.tvShow.originalLanguage,
        status: entry.tvShow.status,
        metadata: meta,
      };

      const matchRes = calculateTvMatch(candidate, tvProfile);
      const firstAirYear = entry.tvShow.firstAirDate ? parseInt(entry.tvShow.firstAirDate.slice(0, 4), 10) : null;
      scoredItems.push({
        item: {
          id: entry.id,
          mediaType: "TV",
          contentId: entry.tvShow.id,
          tmdbId: entry.tvShow.tmdbId,
          title: entry.tvShow.name,
          originalTitle: entry.tvShow.originalName || entry.tvShow.name,
          releaseYear: isNaN(firstAirYear as number) ? null : firstAirYear,
          posterPath: entry.tvShow.posterPath,
          backdropPath: entry.tvShow.backdropPath,
          genres,
          voteAverage: entry.tvShow.voteAverage,
          overview: entry.tvShow.overview || "",
          state: entry.state,
          isFavorite: entry.isFavorite,
          userRating: null,
          addedAt: entry.addedAt,
          updatedAt: entry.updatedAt,
          watchedAt: entry.watchedAt,
          droppedAt: entry.droppedAt,
          matchScore: matchRes.matchScore,
          matchLabel: matchRes.matchLabel,
          numberOfSeasons: (meta.numberOfSeasons as number) || null,
        },
        score: matchRes.matchScore + (entry.isFavorite ? 5 : 0),
      });
    }
  }

  // Sort by highest computed score and take top 3
  scoredItems.sort((a, b) => b.score - a.score);
  return scoredItems.slice(0, 3).map((s) => s.item);
}

/**
 * Idempotent backfill from legacy RecommendationFeedback (WATCHLIST / WATCH_LATER)
 * into canonical UserContentLibrary without creating duplicate rows or overwriting newer state.
 */
export async function backfillLegacyWatchlistToLibrary(): Promise<{
  movieMigrated: number;
  tvMigrated: number;
}> {
  const [movieFeedbacks, tvFeedbacks] = await Promise.all([
    db.recommendationFeedback.findMany({
      where: {
        action: { in: ["WATCHLIST", "WATCH_LATER"] },
      },
    }),
    db.tvRecommendationFeedback.findMany({
      where: {
        action: { in: ["WATCHLIST", "WATCH_LATER"] },
      },
    }),
  ]);

  let movieMigrated = 0;
  for (const mf of movieFeedbacks) {
    const existing = await db.userContentLibrary.findUnique({
      where: { userId_movieId: { userId: mf.userId, movieId: mf.movieId } },
    });
    if (!existing) {
      await db.userContentLibrary.create({
        data: {
          userId: mf.userId,
          mediaType: MediaType.FILM,
          movieId: mf.movieId,
          state: LibraryState.WATCHLIST,
          addedAt: mf.createdAt,
        },
      });
      movieMigrated++;
    }
  }

  let tvMigrated = 0;
  for (const tf of tvFeedbacks) {
    const existing = await db.userContentLibrary.findUnique({
      where: { userId_tvShowId: { userId: tf.userId, tvShowId: tf.tvShowId } },
    });
    if (!existing) {
      await db.userContentLibrary.create({
        data: {
          userId: tf.userId,
          mediaType: MediaType.TV,
          tvShowId: tf.tvShowId,
          state: LibraryState.WATCHLIST,
          addedAt: tf.createdAt,
        },
      });
      tvMigrated++;
    }
  }

  return { movieMigrated, tvMigrated };
}
