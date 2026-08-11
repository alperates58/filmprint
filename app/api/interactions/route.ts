import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getOrCreateSession } from "@/lib/session";
import { InteractionStatus, RatingStatus } from "@prisma/client";

const TARGET_CALIBRATION_COUNT = 30;

const VALID_STATUSES = new Set<string>([
  InteractionStatus.WATCHED,
  InteractionStatus.NOT_WATCHED,
  InteractionStatus.UNSURE,
]);

const VALID_RATINGS = new Set<string>([
  RatingStatus.LOVE,
  RatingStatus.LIKE,
  RatingStatus.NEUTRAL,
  RatingStatus.DISLIKE,
]);

export async function POST(request: Request) {
  try {
    const { userId } = await getOrCreateSession();

    const body = await request.json();
    const { movieId, status, rating } = body;

    // 1. Validate movieId
    if (!movieId || typeof movieId !== "string") {
      return NextResponse.json(
        { error: "Invalid or missing 'movieId'" },
        { status: 400 }
      );
    }

    // 2. Validate status
    if (!status || !VALID_STATUSES.has(status)) {
      return NextResponse.json(
        { error: "Invalid 'status'. Allowed: WATCHED, NOT_WATCHED, UNSURE" },
        { status: 400 }
      );
    }

    // 3. Validate status & rating relationship
    if (status === InteractionStatus.WATCHED) {
      if (!rating || !VALID_RATINGS.has(rating)) {
        return NextResponse.json(
          { error: "Rating is required for WATCHED status. Allowed: LOVE, LIKE, NEUTRAL, DISLIKE" },
          { status: 400 }
        );
      }
    } else {
      if (rating !== null && rating !== undefined) {
        return NextResponse.json(
          { error: "Rating must be null for NOT_WATCHED or UNSURE status" },
          { status: 400 }
        );
      }
    }

    // Verify movie exists in database
    const movie = await db.movie.findUnique({
      where: { id: movieId },
      select: { id: true },
    });

    if (!movie) {
      return NextResponse.json(
        { error: "Movie not found" },
        { status: 404 }
      );
    }

    // Upsert interaction (idempotent for duplicate user + movie submissions)
    await db.movieInteraction.upsert({
      where: {
        userId_movieId: {
          userId,
          movieId,
        },
      },
      update: {
        status: status as InteractionStatus,
        rating: status === InteractionStatus.WATCHED ? (rating as RatingStatus) : null,
        answeredAt: new Date(),
      },
      create: {
        userId,
        movieId,
        status: status as InteractionStatus,
        rating: status === InteractionStatus.WATCHED ? (rating as RatingStatus) : null,
      },
    });

    // Calculate current total progress for user
    const answeredCount = await db.movieInteraction.count({
      where: { userId },
    });

    return NextResponse.json({
      success: true,
      answeredCount,
      targetCount: TARGET_CALIBRATION_COUNT,
      completed: answeredCount >= TARGET_CALIBRATION_COUNT,
    });
  } catch (error) {
    console.error("[Interaction API Error]:", error);
    return NextResponse.json(
      { error: "Failed to record interaction" },
      { status: 500 }
    );
  }
}
