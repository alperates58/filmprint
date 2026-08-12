import { db } from "@/lib/db/client";
import { getSystemSettings, getIntegrationStatus, getDeepSeekConfig } from "@/lib/config/service";

export async function getAdminOverviewData() {
  const [
    totalUsers,
    totalMovies,
    totalInteractions,
    totalProfiles,
    tmdbStatus,
    deepseekStatus,
    watchLaterCount,
    notInterestedCount,
    alreadyWatchedCount,
    watchedFromRecCount,
    feedbacksWithMatchScore,
    totalMovieNights,
    activeMovieNights,
    completedMovieNights,
  ] = await Promise.all([
    db.user.count(),
    db.movie.count(),
    db.movieInteraction.count(),
    db.userTasteProfile.count(),
    getIntegrationStatus("tmdb"),
    getIntegrationStatus("deepseek"),
    db.recommendationFeedback.count({ where: { action: "WATCH_LATER" } }),
    db.recommendationFeedback.count({ where: { action: "NOT_INTERESTED" } }),
    db.recommendationFeedback.count({ where: { action: "ALREADY_WATCHED" } }),
    db.recommendationFeedback.count({ where: { action: "WATCHED_FROM_RECOMMENDATION" } }),
    db.recommendationFeedback.findMany({
      where: { action: { in: ["WATCHED_FROM_RECOMMENDATION", "ALREADY_WATCHED"] } },
      select: { userId: true, movieId: true, matchScore: true, action: true },
    }),
    db.movieNightSession.count(),
    db.movieNightSession.count({ where: { status: "LOBBY" } }),
    db.movieNightSession.count({ where: { status: "COMPLETED" } }),
  ]);

  const watched = await db.movieInteraction.count({ where: { status: "WATCHED" } });
  const notWatched = await db.movieInteraction.count({ where: { status: "NOT_WATCHED" } });
  const unsure = await db.movieInteraction.count({ where: { status: "UNSURE" } });

  const love = await db.movieInteraction.count({ where: { rating: "LOVE" } });
  const like = await db.movieInteraction.count({ where: { rating: "LIKE" } });
  const neutral = await db.movieInteraction.count({ where: { rating: "NEUTRAL" } });
  const dislike = await db.movieInteraction.count({ where: { rating: "DISLIKE" } });

  const recentInteractions = await db.movieInteraction.findMany({
    take: 5,
    orderBy: { answeredAt: "desc" },
    include: {
      movie: { select: { title: true, releaseYear: true } },
    },
  });

  const totalRecommendationFeedbacks = watchLaterCount + notInterestedCount + alreadyWatchedCount + watchedFromRecCount;
  const conversionRate = totalRecommendationFeedbacks > 0
    ? Math.round(((watchedFromRecCount + alreadyWatchedCount) / totalRecommendationFeedbacks) * 100)
    : 0;

  // Calculate Match Calibration Bucket Success Metrics
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

  return {
    users: {
      total: totalUsers,
      activeLast24h: totalUsers,
      last24h: totalUsers,
      last7d: totalUsers,
      completedCalibration: totalProfiles,
    },
    movies: { total: totalMovies, cached: totalMovies, totalCached: totalMovies },
    stats: {
      totalUsers,
      totalMovies,
      totalInteractions,
      totalProfiles,
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
        _count: {
          select: { interactions: true },
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
      interactionCount: u._count.interactions,
      hasTasteProfile: !!u.tasteProfile,
      confidence: u.tasteProfile?.confidence || 0.0,
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
      interactions: {
        take: 20,
        orderBy: { answeredAt: "desc" },
        include: {
          movie: { select: { title: true, releaseYear: true, posterPath: true } },
        },
      },
      recommendationFeedbacks: {
        take: 20,
        orderBy: { updatedAt: "desc" },
        include: {
          movie: { select: { title: true, releaseYear: true, posterPath: true } },
        },
      },
    },
  });

  if (!user) return null;

  const watched = user.interactions.filter((i: any) => i.status === "WATCHED").length;
  const notWatched = user.interactions.filter((i: any) => i.status === "NOT_WATCHED").length;
  const unsure = user.interactions.filter((i: any) => i.status === "UNSURE").length;

  const watchLaterCount = user.recommendationFeedbacks.filter((f: any) => f.action === "WATCH_LATER").length;
  const notInterestedCount = user.recommendationFeedbacks.filter((f: any) => f.action === "NOT_INTERESTED").length;
  const positiveFeedbackCount = user.recommendationFeedbacks.filter(
    (f: any) => f.action === "WATCH_LATER" || f.action === "WATCHED_FROM_RECOMMENDATION"
  ).length;
  const negativeFeedbackCount = notInterestedCount;

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
      stats: {
        totalInteractions: user.interactions.length,
        watched,
        notWatched,
        unsure,
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
      recommendationLearning: {
        positiveFeedbackCount,
        negativeFeedbackCount,
        watchLaterCount,
        totalFeedbacks: user.recommendationFeedbacks.length,
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
    totalMovies,
    totalFeedbacks,
    totalMovieNights,
  ] = await Promise.all([
    getSystemSettings(),
    getIntegrationStatus("tmdb"),
    getIntegrationStatus("deepseek"),
    getDeepSeekConfig(),
    db.recommendationExplanation.count(),
    db.movie.count(),
    db.recommendationFeedback.count(),
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
      },
      recommendationEngine: {
        version: "v2.0",
        matchEngineVersion: 2,
        groupMatchEngineVersion: 1,
        recommendationsEnabled: settings.recommendationsEnabled !== false,
        aiExplanationsEnabled: settings.aiExplanationsEnabled !== false,
        explanationCacheCount,
        totalFeedbacks,
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
