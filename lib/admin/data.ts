import { db } from "@/lib/db/client";
import { getSystemSettings, getIntegrationStatus, getDeepSeekConfig } from "@/lib/config/service";
import { getRankForCount, getProgressionForCount } from "@/lib/progression/service";
import { RANK_DEFINITIONS } from "@/lib/progression/constants";

export async function getAdminOverviewData() {
  const [
    totalUsers,
    totalMovies,
    totalTvShows,
    totalInteractions,
    totalTvInteractions,
    totalProfiles,
    totalTvProfiles,
    tmdbStatus,
    deepseekStatus,
    watchLaterCount,
    notInterestedCount,
    alreadyWatchedCount,
    watchedFromRecCount,
    feedbacksWithMatchScore,
    tvWatchLaterCount,
    tvNotInterestedCount,
    tvAlreadyWatchedCount,
    tvWatchedFromRecCount,
    tvFeedbacksWithMatchScore,
    totalMovieNights,
    activeMovieNights,
    completedMovieNights,
  ] = await Promise.all([
    db.user.count(),
    db.movie.count(),
    db.tvShow.count(),
    db.movieInteraction.count(),
    db.tvInteraction.count(),
    db.userTasteProfile.count(),
    db.userTvTasteProfile.count(),
    getIntegrationStatus("tmdb"),
    getIntegrationStatus("deepseek"),
    // Movie Feedbacks
    db.recommendationFeedback.count({ where: { action: "WATCH_LATER" } }),
    db.recommendationFeedback.count({ where: { action: "NOT_INTERESTED" } }),
    db.recommendationFeedback.count({ where: { action: "ALREADY_WATCHED" } }),
    db.recommendationFeedback.count({ where: { action: "WATCHED_FROM_RECOMMENDATION" } }),
    db.recommendationFeedback.findMany({
      where: { action: { in: ["WATCHED_FROM_RECOMMENDATION", "ALREADY_WATCHED"] } },
      select: { userId: true, movieId: true, matchScore: true, action: true },
    }),
    // TV Feedbacks
    db.tvRecommendationFeedback.count({ where: { action: "WATCH_LATER" } }),
    db.tvRecommendationFeedback.count({ where: { action: "NOT_INTERESTED" } }),
    db.tvRecommendationFeedback.count({ where: { action: "ALREADY_WATCHED" } }),
    db.tvRecommendationFeedback.count({ where: { action: "WATCHED_FROM_RECOMMENDATION" } }),
    db.tvRecommendationFeedback.findMany({
      where: { action: { in: ["WATCHED_FROM_RECOMMENDATION", "ALREADY_WATCHED"] } },
      select: { userId: true, tvShowId: true, matchScore: true, action: true },
    }),
    db.movieNightSession.count(),
    db.movieNightSession.count({ where: { status: "LOBBY" } }),
    db.movieNightSession.count({ where: { status: "COMPLETED" } }),
  ]);

  // Movie interaction status counts
  const watched = await db.movieInteraction.count({ where: { status: "WATCHED" } });
  const notWatched = await db.movieInteraction.count({ where: { status: "NOT_WATCHED" } });
  const unsure = await db.movieInteraction.count({ where: { status: "UNSURE" } });

  // Movie interaction rating counts
  const love = await db.movieInteraction.count({ where: { rating: "LOVE" } });
  const like = await db.movieInteraction.count({ where: { rating: "LIKE" } });
  const neutral = await db.movieInteraction.count({ where: { rating: "NEUTRAL" } });
  const dislike = await db.movieInteraction.count({ where: { rating: "DISLIKE" } });

  // TV interaction status counts
  const tvWatched = await db.tvInteraction.count({ where: { status: "WATCHED" } });
  const tvPartiallyWatched = await db.tvInteraction.count({ where: { status: "PARTIALLY_WATCHED" } });
  const tvNotWatched = await db.tvInteraction.count({ where: { status: "NOT_WATCHED" } });
  const tvUnsure = await db.tvInteraction.count({ where: { status: "UNSURE" } });

  // TV interaction rating counts
  const tvLove = await db.tvInteraction.count({ where: { rating: "LOVE" } });
  const tvLike = await db.tvInteraction.count({ where: { rating: "LIKE" } });
  const tvNeutral = await db.tvInteraction.count({ where: { rating: "NEUTRAL" } });
  const tvDislike = await db.tvInteraction.count({ where: { rating: "DISLIKE" } });

  const recentInteractions = await db.movieInteraction.findMany({
    take: 5,
    orderBy: { answeredAt: "desc" },
    include: {
      movie: { select: { title: true, releaseYear: true } },
    },
  });

  const recentTvInteractions = await db.tvInteraction.findMany({
    take: 5,
    orderBy: { answeredAt: "desc" },
    include: {
      tvShow: { select: { name: true, firstAirDate: true } },
    },
  });

  // Movie Recommendation Feedback metrics
  const totalRecommendationFeedbacks = watchLaterCount + notInterestedCount + alreadyWatchedCount + watchedFromRecCount;
  const conversionRate = totalRecommendationFeedbacks > 0
    ? Math.round(((watchedFromRecCount + alreadyWatchedCount) / totalRecommendationFeedbacks) * 100)
    : 0;

  // TV Recommendation Feedback metrics
  const totalTvRecommendationFeedbacks = tvWatchLaterCount + tvNotInterestedCount + tvAlreadyWatchedCount + tvWatchedFromRecCount;
  const tvConversionRate = totalTvRecommendationFeedbacks > 0
    ? Math.round(((tvWatchedFromRecCount + tvAlreadyWatchedCount) / totalTvRecommendationFeedbacks) * 100)
    : 0;

  // Calculate Match Calibration Bucket Success Metrics for Movies
  const buckets = {
    "90-100": { total: 0, positive: 0 },
    "80-89": { total: 0, positive: 0 },
    "70-79": { total: 0, positive: 0 },
    "<70": { total: 0, positive: 0 },
  };

  for (const f of feedbacksWithMatchScore) {
    const interaction = await db.movieInteraction.findUnique({
      where: { userId_movieId: { userId: f.userId, movieId: f.movieId } },
    });
    const isPositive = interaction?.rating === "LOVE" || interaction?.rating === "LIKE";

    let bucketKey: keyof typeof buckets = "<70";
    if (f.matchScore >= 90) bucketKey = "90-100";
    else if (f.matchScore >= 80) bucketKey = "80-89";
    else if (f.matchScore >= 70) bucketKey = "70-79";

    buckets[bucketKey].total += 1;
    if (isPositive) buckets[bucketKey].positive += 1;
  }

  const matchBucketOutcomes = Object.entries(buckets).map(([bucket, data]) => ({
    bucket,
    total: data.total,
    positive: data.positive,
    successRate: data.total > 0 ? Math.round((data.positive / data.total) * 100) : 0,
  }));

  const totalWatchedFromRec = feedbacksWithMatchScore.length;
  const totalPositiveWatched = matchBucketOutcomes.reduce((acc, b) => acc + b.positive, 0);
  const positiveOutcomeRate = totalWatchedFromRec > 0 ? Math.round((totalPositiveWatched / totalWatchedFromRec) * 100) : 0;

  // Calculate Match Calibration Bucket Success Metrics for TV
  const tvBuckets = {
    "90-100": { total: 0, positive: 0 },
    "80-89": { total: 0, positive: 0 },
    "70-79": { total: 0, positive: 0 },
    "<70": { total: 0, positive: 0 },
  };

  for (const f of tvFeedbacksWithMatchScore) {
    const interaction = await db.tvInteraction.findUnique({
      where: { userId_tvShowId: { userId: f.userId, tvShowId: f.tvShowId } },
    });
    const isPositive = interaction?.rating === "LOVE" || interaction?.rating === "LIKE";

    let bucketKey: keyof typeof tvBuckets = "<70";
    if (f.matchScore >= 90) bucketKey = "90-100";
    else if (f.matchScore >= 80) bucketKey = "80-89";
    else if (f.matchScore >= 70) bucketKey = "70-79";

    tvBuckets[bucketKey].total += 1;
    if (isPositive) tvBuckets[bucketKey].positive += 1;
  }

  const tvMatchBucketOutcomes = Object.entries(tvBuckets).map(([bucket, data]) => ({
    bucket,
    total: data.total,
    positive: data.positive,
    successRate: data.total > 0 ? Math.round((data.positive / data.total) * 100) : 0,
  }));

  const totalTvWatchedFromRec = tvFeedbacksWithMatchScore.length;
  const totalTvPositiveWatched = tvMatchBucketOutcomes.reduce((acc, b) => acc + b.positive, 0);
  const tvPositiveOutcomeRate = totalTvWatchedFromRec > 0 ? Math.round((totalTvPositiveWatched / totalTvWatchedFromRec) * 100) : 0;

  const allUsersWithCounts = await db.user.findMany({
    select: {
      id: true,
      _count: { select: { interactions: true, tvInteractions: true } },
    },
  });

  const rankDistributionMap: Record<string, number> = {};
  RANK_DEFINITIONS.forEach((r) => {
    rankDistributionMap[r.key] = 0;
  });

  for (const u of allUsersWithCounts) {
    const r = getRankForCount(u._count.interactions);
    rankDistributionMap[r.key] = (rankDistributionMap[r.key] || 0) + 1;
  }

  const rankDistribution = RANK_DEFINITIONS.map((r) => ({
    key: r.key,
    label: r.label,
    icon: r.badgeIcon,
    count: rankDistributionMap[r.key] || 0,
  }));

  return {
    users: {
      total: totalUsers,
      activeLast24h: totalUsers,
      last24h: totalUsers,
      last7d: totalUsers,
      completedCalibration: totalProfiles,
      completedTvCalibration: totalTvProfiles,
    },
    rankDistribution,
    movies: { total: totalMovies, cached: totalMovies, totalCached: totalMovies },
    tvShows: { total: totalTvShows, cached: totalTvShows, totalCached: totalTvShows },
    totalMediaCached: totalMovies + totalTvShows,
    totalAllInteractions: totalInteractions + totalTvInteractions,
    stats: {
      totalUsers,
      totalMovies,
      totalTvShows,
      totalInteractions: totalInteractions + totalTvInteractions,
      totalMovieInteractions: totalInteractions,
      totalTvInteractions,
      totalProfiles,
      totalTvProfiles,
      totalMovieNights,
      activeMovieNights,
      completedMovieNights,
    },
    calibration: {
      totalInteractions,
      watched,
      notWatched,
      unsure,
      ratings: { love, like, neutral, dislike },
    },
    tvCalibration: {
      totalInteractions: totalTvInteractions,
      watched: tvWatched,
      partiallyWatched: tvPartiallyWatched,
      notWatched: tvNotWatched,
      unsure: tvUnsure,
      ratings: { love: tvLove, like: tvLike, neutral: tvNeutral, dislike: tvDislike },
    },
    feedbackMetrics: {
      watchLaterCount,
      notInterestedCount,
      alreadyWatchedCount,
      watchedFromRecCount,
      totalRecommendationFeedbacks,
      conversionRate,
      positiveOutcomeRate,
      matchBucketOutcomes,
    },
    tvFeedbackMetrics: {
      watchLaterCount: tvWatchLaterCount,
      notInterestedCount: tvNotInterestedCount,
      alreadyWatchedCount: tvAlreadyWatchedCount,
      watchedFromRecCount: tvWatchedFromRecCount,
      totalRecommendationFeedbacks: totalTvRecommendationFeedbacks,
      conversionRate: tvConversionRate,
      positiveOutcomeRate: tvPositiveOutcomeRate,
      matchBucketOutcomes: tvMatchBucketOutcomes,
    },
    system: {
      tmdb: tmdbStatus,
      deepseek: deepseekStatus,
    },
    recentInteractions: recentInteractions.map((i: any) => ({
      id: i.id,
      movieTitle: i.movie.title,
      releaseYear: i.movie.releaseYear,
      status: i.status,
      rating: i.rating,
      answeredAt: i.answeredAt,
    })),
    recentTvInteractions: recentTvInteractions.map((i: any) => ({
      id: i.id,
      tvShowName: i.tvShow.name,
      firstAirDate: i.tvShow.firstAirDate,
      status: i.status,
      rating: i.rating,
      answeredAt: i.answeredAt,
    })),
  };
}

export async function getAdminUsersData(search?: string, page: number = 1, pageSize: number = 50) {
  const skip = (page - 1) * pageSize;

  const whereCondition = search && search.trim().length > 0
    ? {
        OR: [
          { name: { contains: search.trim(), mode: "insensitive" as const } },
          { email: { contains: search.trim(), mode: "insensitive" as const } },
          { id: { contains: search.trim(), mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, totalCount] = await Promise.all([
    db.user.findMany({
      where: whereCondition,
      skip,
      take: pageSize,
      orderBy: { lastSeenAt: "desc" },
      include: {
        tasteProfile: true,
        tvTasteProfile: true,
        _count: {
          select: { interactions: true, tvInteractions: true },
        },
      },
    }),
    db.user.count({ where: whereCondition }),
  ]);

  return {
    users: users.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      accountType: u.accountType,
      provider: u.provider,
      createdAt: u.createdAt,
      lastSeenAt: u.lastSeenAt,
      movieInteractionCount: u._count.interactions,
      tvInteractionCount: u._count.tvInteractions,
      interactionCount: u._count.interactions + u._count.tvInteractions,
      hasTasteProfile: !!u.tasteProfile,
      confidence: u.tasteProfile?.confidence || 0.0,
      hasTvTasteProfile: !!u.tvTasteProfile,
      tvConfidence: u.tvTasteProfile?.confidence || 0.0,
      rank: getRankForCount(u._count.interactions),
    })),
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize) || 1,
    currentPage: page,
  };
}

export async function getAdminUserDetailData(id: string) {
  const user = await db.user.findUnique({
    where: { id },
    include: {
      tasteProfile: true,
      tvTasteProfile: true,
      interactions: {
        take: 50,
        orderBy: { answeredAt: "desc" },
        include: {
          movie: { select: { title: true, releaseYear: true, posterPath: true } },
        },
      },
      recommendationFeedbacks: {
        take: 50,
        orderBy: { updatedAt: "desc" },
        include: {
          movie: { select: { title: true, releaseYear: true, posterPath: true } },
        },
      },
      tvInteractions: {
        take: 50,
        orderBy: { answeredAt: "desc" },
        include: {
          tvShow: { select: { name: true, firstAirDate: true, posterPath: true } },
        },
      },
      tvRecommendationFeedbacks: {
        take: 50,
        orderBy: { updatedAt: "desc" },
        include: {
          tvShow: { select: { name: true, firstAirDate: true, posterPath: true } },
        },
      },
    },
  });

  if (!user) return null;

  const [
    movieCountsByStatus,
    tvCountsByStatus,
    movieFeedbackCounts,
    tvFeedbackCounts,
  ] = await Promise.all([
    db.movieInteraction.groupBy({
      by: ["status"],
      where: { userId: id },
      _count: { status: true },
    }),
    db.tvInteraction.groupBy({
      by: ["status"],
      where: { userId: id },
      _count: { status: true },
    }),
    db.recommendationFeedback.groupBy({
      by: ["action"],
      where: { userId: id },
      _count: { action: true },
    }),
    db.tvRecommendationFeedback.groupBy({
      by: ["action"],
      where: { userId: id },
      _count: { action: true },
    }),
  ]);

  // Movie interaction breakdown from DB
  const movieStatusMap = new Map(movieCountsByStatus.map((g) => [g.status, g._count.status]));
  const watched = movieStatusMap.get("WATCHED") || 0;
  const notWatched = movieStatusMap.get("NOT_WATCHED") || 0;
  const unsure = movieStatusMap.get("UNSURE") || 0;
  const totalMovieInteractionCount = watched + notWatched + unsure;

  const progression = getProgressionForCount(totalMovieInteractionCount);

  // TV interaction breakdown from DB
  const tvStatusMap = new Map(tvCountsByStatus.map((g) => [g.status, g._count.status]));
  const tvWatched = tvStatusMap.get("WATCHED") || 0;
  const tvPartiallyWatched = tvStatusMap.get("PARTIALLY_WATCHED") || 0;
  const tvNotWatched = tvStatusMap.get("NOT_WATCHED") || 0;
  const tvUnsure = tvStatusMap.get("UNSURE") || 0;
  const totalTvInteractionCount = tvWatched + tvPartiallyWatched + tvNotWatched + tvUnsure;

  // Movie feedback breakdown from DB
  const movieFeedbackMap = new Map(movieFeedbackCounts.map((g) => [g.action, g._count.action]));
  const watchLaterCount = movieFeedbackMap.get("WATCH_LATER") || 0;
  const notInterestedCount = movieFeedbackMap.get("NOT_INTERESTED") || 0;
  const alreadyWatchedCount = movieFeedbackMap.get("ALREADY_WATCHED") || 0;
  const watchedFromRecCount = movieFeedbackMap.get("WATCHED_FROM_RECOMMENDATION") || 0;
  const positiveFeedbackCount = watchLaterCount + watchedFromRecCount;
  const negativeFeedbackCount = notInterestedCount;
  const totalRecommendationFeedbacks =
    watchLaterCount + notInterestedCount + alreadyWatchedCount + watchedFromRecCount;

  // TV feedback breakdown from DB
  const tvFeedbackMap = new Map(tvFeedbackCounts.map((g) => [g.action, g._count.action]));
  const tvWatchLaterCount = tvFeedbackMap.get("WATCH_LATER") || 0;
  const tvNotInterestedCount = tvFeedbackMap.get("NOT_INTERESTED") || 0;
  const tvAlreadyWatchedCount = tvFeedbackMap.get("ALREADY_WATCHED") || 0;
  const tvWatchedFromRecCount = tvFeedbackMap.get("WATCHED_FROM_RECOMMENDATION") || 0;
  const tvPositiveFeedbackCount = tvWatchLaterCount + tvWatchedFromRecCount;
  const tvNegativeFeedbackCount = tvNotInterestedCount;
  const totalTvRecommendationFeedbacks =
    tvWatchLaterCount + tvNotInterestedCount + tvAlreadyWatchedCount + tvWatchedFromRecCount;

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      accountType: user.accountType,
      provider: user.provider,
      createdAt: user.createdAt,
      lastSeenAt: user.lastSeenAt,
      progression,
      stats: {
        totalInteractions: totalMovieInteractionCount,
        watched,
        notWatched,
        unsure,
      },
      tvStats: {
        totalInteractions: totalTvInteractionCount,
        watched: tvWatched,
        partiallyWatched: tvPartiallyWatched,
        notWatched: tvNotWatched,
        unsure: tvUnsure,
      },
      filmDnaStatus: user.tasteProfile
        ? {
            ready: true,
            version: user.tasteProfile.version,
            confidence: user.tasteProfile.confidence,
            sourceInteractionCount: user.tasteProfile.sourceInteractionCount,
            lastCalculated: user.tasteProfile.updatedAt,
          }
        : {
            ready: false,
            version: 1,
            confidence: 0,
            sourceInteractionCount: 0,
            lastCalculated: null,
          },
      tvDnaStatus: user.tvTasteProfile
        ? {
            ready: true,
            version: user.tvTasteProfile.version,
            confidence: user.tvTasteProfile.confidence,
            sourceInteractionCount: user.tvTasteProfile.sourceInteractionCount,
            lastCalculated: user.tvTasteProfile.updatedAt,
          }
        : {
            ready: false,
            version: 1,
            confidence: 0,
            sourceInteractionCount: 0,
            lastCalculated: null,
          },
      tasteProfile: user.tasteProfile
        ? {
            id: user.tasteProfile.id,
            version: user.tasteProfile.version,
            confidence: user.tasteProfile.confidence,
            sourceInteractionCount: user.tasteProfile.sourceInteractionCount,
            updatedAt: user.tasteProfile.updatedAt,
            profileJson: user.tasteProfile.profileJson,
          }
        : null,
      tvTasteProfile: user.tvTasteProfile
        ? {
            id: user.tvTasteProfile.id,
            version: user.tvTasteProfile.version,
            confidence: user.tvTasteProfile.confidence,
            sourceInteractionCount: user.tvTasteProfile.sourceInteractionCount,
            updatedAt: user.tvTasteProfile.updatedAt,
            profileJson: user.tvTasteProfile.profileJson,
          }
        : null,
      recommendationLearning: {
        positiveFeedbackCount,
        negativeFeedbackCount,
        watchLaterCount,
        totalFeedbacks: totalRecommendationFeedbacks,
      },
      tvRecommendationLearning: {
        positiveFeedbackCount: tvPositiveFeedbackCount,
        negativeFeedbackCount: tvNegativeFeedbackCount,
        watchLaterCount: tvWatchLaterCount,
        totalFeedbacks: totalTvRecommendationFeedbacks,
      },
      interactions: user.interactions.map((i: any) => ({
        id: i.id,
        movieId: i.movieId,
        movieTitle: i.movie.title,
        releaseYear: i.movie.releaseYear,
        posterPath: i.movie.posterPath,
        status: i.status,
        rating: i.rating,
        answeredAt: i.answeredAt,
        updatedAt: i.updatedAt || i.answeredAt,
      })),
      tvInteractions: user.tvInteractions.map((i: any) => ({
        id: i.id,
        tvShowId: i.tvShowId,
        tvShowName: i.tvShow.name,
        firstAirDate: i.tvShow.firstAirDate,
        posterPath: i.tvShow.posterPath,
        status: i.status,
        rating: i.rating,
        answeredAt: i.answeredAt,
        updatedAt: i.updatedAt || i.answeredAt,
      })),
      recommendationFeedbacks: user.recommendationFeedbacks.map((f: any) => ({
        id: f.id,
        movieId: f.movieId,
        movieTitle: f.movie.title,
        releaseYear: f.movie.releaseYear,
        posterPath: f.movie.posterPath,
        matchScore: f.matchScore,
        action: f.action,
        updatedAt: f.updatedAt,
      })),
      tvRecommendationFeedbacks: user.tvRecommendationFeedbacks.map((f: any) => ({
        id: f.id,
        tvShowId: f.tvShowId,
        tvShowName: f.tvShow.name,
        firstAirDate: f.tvShow.firstAirDate,
        posterPath: f.tvShow.posterPath,
        matchScore: f.matchScore,
        action: f.action,
        updatedAt: f.updatedAt,
      })),
    },
  };
}

export async function getAdminSystemData() {
  const [
    settings,
    tmdbStatus,
    deepseekStatus,
    deepseekConfig,
    explanationCacheCount,
    tvExplanationCacheCount,
    aiSuccessCount,
    aiFallbackCount,
    totalMovies,
    totalTvShows,
    totalMovieInteractions,
    totalTvInteractions,
    totalProfiles,
    totalTvProfiles,
    totalFeedbacks,
    totalTvFeedbacks,
    totalMovieNights,
  ] = await Promise.all([
    getSystemSettings(),
    getIntegrationStatus("tmdb"),
    getIntegrationStatus("deepseek"),
    getDeepSeekConfig(),
    db.recommendationExplanation.count(),
    db.tvRecommendationExplanation.count(),
    db.recommendationExplanation.count({ where: { isAiGenerated: true } }),
    db.recommendationExplanation.count({ where: { isAiGenerated: false } }),
    db.movie.count(),
    db.tvShow.count(),
    db.movieInteraction.count(),
    db.tvInteraction.count(),
    db.userTasteProfile.count(),
    db.userTvTasteProfile.count(),
    db.recommendationFeedback.count(),
    db.tvRecommendationFeedback.count(),
    db.movieNightSession.count(),
  ]);

  return {
    system: {
      applicationVersion: "0.2.0-phase4",
      environment: process.env.NODE_ENV || "production",
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        provider: "postgresql",
        status: "healthy",
        cachedMovies: totalMovies,
        cachedTvShows: totalTvShows,
        totalMediaCached: totalMovies + totalTvShows,
        totalMovieInteractions,
        totalTvInteractions,
        totalProfiles,
        totalTvProfiles,
      },
      recommendationEngine: {
        version: "v2.0 / TV v1.0",
        matchEngineVersion: 2,
        tvMatchEngineVersion: 1,
        groupMatchEngineVersion: 1,
        recommendationsEnabled: settings.recommendationsEnabled !== false,
        aiExplanationsEnabled: settings.aiExplanationsEnabled !== false,
        explanationCacheCount,
        tvExplanationCacheCount,
        aiSuccessCount,
        aiFallbackCount,
        totalFeedbacks,
        totalTvFeedbacks,
        totalMovieNights,
        deepSeekConfigured: deepseekConfig.source !== "none" && !!deepseekConfig.apiKey,
      },
      calibrationStrategy: {
        name: "Intelligent Calibration / Active Learning v1.0",
        activeLearningEnabled: settings.activeLearningEnabled,
        recentHistoryWindow: settings.recentHistoryWindow,
      },
      settings,
      integrations: {
        tmdb: tmdbStatus,
        deepseek: deepseekStatus,
      },
    },
  };
}
