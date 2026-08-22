import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getOrCreateSession } from "@/lib/session";
import { InteractionStatus, RatingStatus, MediaType } from "@prisma/client";
import { CALIBRATION_THRESHOLDS } from "@/lib/calibration/confidence";
import { getMovieConfidenceLevel } from "@/lib/calibration/confidence";

export const dynamic = "force-dynamic";

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
    const session = await getOrCreateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = session;

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

    // Upsert interaction in database transaction
    await db.$transaction(async (tx) => {
      await tx.movieInteraction.upsert({
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

      // Synchronize with UserContentLibrary
      if (status === InteractionStatus.WATCHED) {
        await tx.userContentLibrary.upsert({
          where: {
            userId_movieId: {
              userId,
              movieId,
            },
          },
          update: {
            state: "WATCHED",
            watchedAt: new Date(),
          },
          create: {
            userId,
            mediaType: MediaType.FILM,
            movieId,
            state: "WATCHED",
            watchedAt: new Date(),
          },
        });
      }
    });

    // Calculate current progress metrics
    const interactions = await db.movieInteraction.findMany({
      where: { userId },
      select: { movieId: true, status: true, rating: true },
    });

    const evaluationCount = interactions.length;
    const watchedCount = new Set(
      interactions.filter((i) => i.status === "WATCHED").map((i) => i.movieId)
    ).size;
    const tasteEvidenceCount = new Set(
      interactions.filter((i) => i.status === "WATCHED" && i.rating !== null).map((i) => i.movieId)
    ).size;

    const confidence = getMovieConfidenceLevel(tasteEvidenceCount);
    const canGenerateDna = tasteEvidenceCount >= CALIBRATION_THRESHOLDS.FILM.MIN_UNLOCK;
    const completed = tasteEvidenceCount >= CALIBRATION_THRESHOLDS.FILM.RECOMMENDED;

    return NextResponse.json({
      success: true,
      movieId,
      status,
      rating: status === InteractionStatus.WATCHED ? rating : null,
      evaluationCount,
      watchedCount,
      tasteEvidenceCount,
      minimumTarget: CALIBRATION_THRESHOLDS.FILM.MIN_UNLOCK,
      targetCount: CALIBRATION_THRESHOLDS.FILM.RECOMMENDED,
      recommendedTarget: CALIBRATION_THRESHOLDS.FILM.RECOMMENDED,
      completed,
      canGenerateDna,
      confidence,
      answeredCount: evaluationCount, // Backward-compatibility
    });
  } catch (error) {
    console.error("[POST /api/interactions Error]:", error);
    return NextResponse.json(
      { error: "Failed to record movie interaction" },
      { status: 500 }
    );
  }
}
