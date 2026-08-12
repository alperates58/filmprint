import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getOrCreateSession } from "@/lib/session";
import { RecommendationAction, RatingStatus } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const session = await getOrCreateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = session;
    const body = await request.json();
    const { movieId, action, rating, matchScore } = body;

    if (!movieId || typeof movieId !== "string") {
      return NextResponse.json({ error: "Görçerli bir film ID gereklidir." }, { status: 400 });
    }

    if (!action || !Object.values(RecommendationAction).includes(action as RecommendationAction)) {
      return NextResponse.json({ error: "Geçersiz recommendation feedback aksiyonu." }, { status: 400 });
    }

    const movie = await db.movie.findUnique({ where: { id: movieId } });
    if (!movie) {
      return NextResponse.json({ error: "Film bulunamadı." }, { status: 404 });
    }

    // If action is WATCHED_FROM_RECOMMENDATION or ALREADY_WATCHED and rating is provided, upsert MovieInteraction
    if (
      (action === RecommendationAction.WATCHED_FROM_RECOMMENDATION || action === RecommendationAction.ALREADY_WATCHED) &&
      rating &&
      Object.values(RatingStatus).includes(rating as RatingStatus)
    ) {
      await db.movieInteraction.upsert({
        where: {
          userId_movieId: { userId, movieId },
        },
        update: {
          status: "WATCHED",
          rating: rating as RatingStatus,
          answeredAt: new Date(),
        },
        create: {
          userId,
          movieId,
          status: "WATCHED",
          rating: rating as RatingStatus,
          answeredAt: new Date(),
        },
      });
    }

    // Upsert RecommendationFeedback (idempotent state transition)
    const feedback = await db.recommendationFeedback.upsert({
      where: {
        userId_movieId: { userId, movieId },
      },
      update: {
        action: action as RecommendationAction,
        matchScore: typeof matchScore === "number" ? Math.max(0, Math.min(100, Math.round(matchScore))) : 0,
      },
      create: {
        userId,
        movieId,
        action: action as RecommendationAction,
        matchScore: typeof matchScore === "number" ? Math.max(0, Math.min(100, Math.round(matchScore))) : 0,
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
