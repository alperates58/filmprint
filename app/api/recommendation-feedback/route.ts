import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getOrCreateSession } from "@/lib/session";
import { RecommendationAction, RatingStatus } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const session = await getOrCreateSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = session;

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Geçersiz JSON gövdesi." }, { status: 400 });
    }

    const {
      mediaType = "FILM",
      movieId,
      tvShowId,
      contentId,
      action,
      rating,
      source = "RECOMMENDATIONS",
      recommendationContext = {},
    } = body;

    const normalizedMediaType = mediaType === "TV" || mediaType === "SHOW" ? "TV" : "FILM";
    const targetId = normalizedMediaType === "TV" ? tvShowId || contentId : movieId || contentId;

    if (!targetId || typeof targetId !== "string") {
      return NextResponse.json(
        { error: `Geçerli bir ${normalizedMediaType === "TV" ? "Dizi" : "Film"} ID gereklidir.` },
        { status: 400 }
      );
    }

    if (!action || typeof action !== "string") {
      return NextResponse.json({ error: "Geri bildirim eylemi gereklidir." }, { status: 400 });
    }

    const upperAction = action.toUpperCase();

    // Map actions to RecommendationAction enum or handle special actions (CLEAR, WATCHED)
    const validActions = [
      "LIKE",
      "DISLIKE",
      "HIDE",
      "WATCHLIST",
      "WATCHED",
      "CLEAR",
      "WATCH_LATER",
      "NOT_INTERESTED",
      "ALREADY_WATCHED",
      "WATCHED_FROM_RECOMMENDATION",
    ];

    if (!validActions.includes(upperAction)) {
      return NextResponse.json({ error: "Geçersiz geri bildirim eylemi." }, { status: 400 });
    }

    const deterministicScore =
      typeof recommendationContext.deterministicScore === "number"
        ? Math.round(recommendationContext.deterministicScore)
        : null;
    const aiScore =
      typeof recommendationContext.aiScore === "number"
        ? Math.round(recommendationContext.aiScore)
        : null;
    const hybridScore =
      typeof recommendationContext.hybridScore === "number"
        ? Math.round(recommendationContext.hybridScore)
        : null;
    const matchScore =
      hybridScore ?? deterministicScore ?? (typeof body.matchScore === "number" ? Math.round(body.matchScore) : 0);

    // ==========================================
    // 1. CLEAR / REMOVE ACTION
    // ==========================================
    if (upperAction === "CLEAR") {
      if (normalizedMediaType === "FILM") {
        await db.recommendationFeedback.deleteMany({
          where: { userId, movieId: targetId },
        });
      } else {
        await db.tvRecommendationFeedback.deleteMany({
          where: { userId, tvShowId: targetId },
        });
      }

      return NextResponse.json({
        success: true,
        action: "CLEAR",
        active: false,
        mediaType: normalizedMediaType,
        contentId: targetId,
        recommendationInvalidated: true,
      });
    }

    // ==========================================
    // 2. WATCHED ACTION (Canonical Interaction Integration)
    // ==========================================
    if (
      upperAction === "WATCHED" ||
      upperAction === "WATCHED_FROM_RECOMMENDATION" ||
      upperAction === "ALREADY_WATCHED"
    ) {
      const validRating =
        rating && Object.values(RatingStatus).includes(rating as RatingStatus)
          ? (rating as RatingStatus)
          : null;

      if (normalizedMediaType === "FILM") {
        // Upsert canonical MovieInteraction
        await db.movieInteraction.upsert({
          where: { userId_movieId: { userId, movieId: targetId } },
          update: {
            status: "WATCHED",
            ...(validRating ? { rating: validRating } : {}),
            answeredAt: new Date(),
          },
          create: {
            userId,
            movieId: targetId,
            status: "WATCHED",
            rating: validRating,
            answeredAt: new Date(),
          },
        });

        // Upsert RecommendationFeedback
        await db.recommendationFeedback.upsert({
          where: { userId_movieId: { userId, movieId: targetId } },
          update: {
            action: RecommendationAction.WATCHED_FROM_RECOMMENDATION,
            matchScore,
            source,
            engineVersion: recommendationContext.engineVersion ?? 3,
            deterministicScore,
            aiScore,
            hybridScore,
          },
          create: {
            userId,
            movieId: targetId,
            action: RecommendationAction.WATCHED_FROM_RECOMMENDATION,
            matchScore,
            source,
            engineVersion: recommendationContext.engineVersion ?? 3,
            deterministicScore,
            aiScore,
            hybridScore,
          },
        });
      } else {
        // Upsert canonical TvInteraction
        await db.tvInteraction.upsert({
          where: { userId_tvShowId: { userId, tvShowId: targetId } },
          update: {
            status: "WATCHED",
            ...(validRating ? { rating: validRating } : {}),
            answeredAt: new Date(),
          },
          create: {
            userId,
            tvShowId: targetId,
            status: "WATCHED",
            rating: validRating,
            answeredAt: new Date(),
          },
        });

        // Upsert TvRecommendationFeedback
        await db.tvRecommendationFeedback.upsert({
          where: { userId_tvShowId: { userId, tvShowId: targetId } },
          update: {
            action: RecommendationAction.WATCHED_FROM_RECOMMENDATION,
            matchScore,
            source,
            engineVersion: recommendationContext.engineVersion ?? 1,
            deterministicScore,
            aiScore,
            hybridScore,
          },
          create: {
            userId,
            tvShowId: targetId,
            action: RecommendationAction.WATCHED_FROM_RECOMMENDATION,
            matchScore,
            source,
            engineVersion: recommendationContext.engineVersion ?? 1,
            deterministicScore,
            aiScore,
            hybridScore,
          },
        });
      }

      return NextResponse.json({
        success: true,
        action: "WATCHED",
        active: true,
        mediaType: normalizedMediaType,
        contentId: targetId,
        recommendationInvalidated: true,
      });
    }

    // ==========================================
    // 3. TASTE SIGNALS: LIKE, DISLIKE, HIDE, WATCHLIST
    // ==========================================
    let enumAction: RecommendationAction;
    if (upperAction === "LIKE") enumAction = RecommendationAction.LIKE;
    else if (upperAction === "DISLIKE" || upperAction === "NOT_INTERESTED")
      enumAction = RecommendationAction.DISLIKE;
    else if (upperAction === "HIDE") enumAction = RecommendationAction.HIDE;
    else if (upperAction === "WATCHLIST" || upperAction === "WATCH_LATER")
      enumAction = RecommendationAction.WATCHLIST;
    else enumAction = upperAction as RecommendationAction;

    if (normalizedMediaType === "FILM") {
      await db.recommendationFeedback.upsert({
        where: { userId_movieId: { userId, movieId: targetId } },
        update: {
          action: enumAction,
          matchScore,
          source,
          engineVersion: recommendationContext.engineVersion ?? 3,
          deterministicScore,
          aiScore,
          hybridScore,
        },
        create: {
          userId,
          movieId: targetId,
          action: enumAction,
          matchScore,
          source,
          engineVersion: recommendationContext.engineVersion ?? 3,
          deterministicScore,
          aiScore,
          hybridScore,
        },
      });
    } else {
      await db.tvRecommendationFeedback.upsert({
        where: { userId_tvShowId: { userId, tvShowId: targetId } },
        update: {
          action: enumAction,
          matchScore,
          source,
          engineVersion: recommendationContext.engineVersion ?? 1,
          deterministicScore,
          aiScore,
          hybridScore,
        },
        create: {
          userId,
          tvShowId: targetId,
          action: enumAction,
          matchScore,
          source,
          engineVersion: recommendationContext.engineVersion ?? 1,
          deterministicScore,
          aiScore,
          hybridScore,
        },
      });
    }

    return NextResponse.json({
      success: true,
      action: upperAction,
      active: true,
      mediaType: normalizedMediaType,
      contentId: targetId,
      recommendationInvalidated: true,
    });
  } catch (error) {
    console.error("[Unified Recommendation Feedback API Error]:", error);
    return NextResponse.json(
      { error: "Geri bildirim kaydedilirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
