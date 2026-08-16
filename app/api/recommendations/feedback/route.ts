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
    const body = await request.json();
    const { movieId, action, rating, matchScore, source = "RECOMMENDATIONS", recommendationContext = {} } = body;

    if (!movieId || typeof movieId !== "string") {
      return NextResponse.json({ error: "Geçerli bir film ID gereklidir." }, { status: 400 });
    }

    if (!action || typeof action !== "string") {
      return NextResponse.json({ error: "Geçersiz recommendation feedback aksiyonu." }, { status: 400 });
    }

    const upperAction = action.toUpperCase();

    // 1. CLEAR action
    if (upperAction === "CLEAR") {
      await db.recommendationFeedback.deleteMany({
        where: { userId, movieId },
      });
      return NextResponse.json({ success: true, action: "CLEAR", movieId });
    }

    // 2. WATCHED action
    if (
      upperAction === "WATCHED" ||
      upperAction === "WATCHED_FROM_RECOMMENDATION" ||
      upperAction === "ALREADY_WATCHED"
    ) {
      const validRating =
        rating && Object.values(RatingStatus).includes(rating as RatingStatus)
          ? (rating as RatingStatus)
          : null;

      await db.movieInteraction.upsert({
        where: { userId_movieId: { userId, movieId } },
        update: {
          status: "WATCHED",
          ...(validRating ? { rating: validRating } : {}),
          answeredAt: new Date(),
        },
        create: {
          userId,
          movieId,
          status: "WATCHED",
          rating: validRating,
          answeredAt: new Date(),
        },
      });

      const feedback = await db.recommendationFeedback.upsert({
        where: { userId_movieId: { userId, movieId } },
        update: {
          action: RecommendationAction.WATCHED_FROM_RECOMMENDATION,
          matchScore: typeof matchScore === "number" ? Math.max(0, Math.min(100, Math.round(matchScore))) : 0,
          source,
          engineVersion: recommendationContext.engineVersion ?? 3,
        },
        create: {
          userId,
          movieId,
          action: RecommendationAction.WATCHED_FROM_RECOMMENDATION,
          matchScore: typeof matchScore === "number" ? Math.max(0, Math.min(100, Math.round(matchScore))) : 0,
          source,
          engineVersion: recommendationContext.engineVersion ?? 3,
        },
      });

      return NextResponse.json({
        success: true,
        feedbackId: feedback.id,
        action: feedback.action,
        movieId: feedback.movieId,
      });
    }

    // 3. Mapped Enum Actions
    let enumAction: RecommendationAction;
    if (upperAction === "LIKE") enumAction = RecommendationAction.LIKE;
    else if (upperAction === "DISLIKE" || upperAction === "NOT_INTERESTED")
      enumAction = RecommendationAction.DISLIKE;
    else if (upperAction === "HIDE") enumAction = RecommendationAction.HIDE;
    else if (upperAction === "WATCHLIST" || upperAction === "WATCH_LATER")
      enumAction = RecommendationAction.WATCHLIST;
    else if (Object.values(RecommendationAction).includes(upperAction as RecommendationAction)) {
      enumAction = upperAction as RecommendationAction;
    } else {
      return NextResponse.json({ error: "Geçersiz eylem." }, { status: 400 });
    }

    const feedback = await db.recommendationFeedback.upsert({
      where: { userId_movieId: { userId, movieId } },
      update: {
        action: enumAction,
        matchScore: typeof matchScore === "number" ? Math.max(0, Math.min(100, Math.round(matchScore))) : 0,
        source,
        engineVersion: recommendationContext.engineVersion ?? 3,
      },
      create: {
        userId,
        movieId,
        action: enumAction,
        matchScore: typeof matchScore === "number" ? Math.max(0, Math.min(100, Math.round(matchScore))) : 0,
        source,
        engineVersion: recommendationContext.engineVersion ?? 3,
      },
    });

    return NextResponse.json({
      success: true,
      feedbackId: feedback.id,
      action: feedback.action,
      movieId: feedback.movieId,
    });
  } catch (error) {
    console.error("[Recommendation Feedback Error]:", error);
    return NextResponse.json(
      { error: "Geri bildirim kaydedilirken bir sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
