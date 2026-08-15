import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getAuthenticatedUser } from "@/lib/auth/service";
import { tmdbTvClient } from "@/lib/tmdb/tv/client";
import { updateTvInteraction } from "@/lib/tv/service";
import { evaluateTvEligibility } from "@/lib/tv/eligibility";
import { TvInteractionStatus, RatingStatus } from "@prisma/client";
import { TV_CALIBRATION_TARGET } from "@/lib/tv/calibration/constants";

const VALID_TV_STATUSES = new Set<string>([
  TvInteractionStatus.WATCHED,
  TvInteractionStatus.PARTIALLY_WATCHED,
  TvInteractionStatus.NOT_WATCHED,
  TvInteractionStatus.UNSURE,
]);

const VALID_RATINGS = new Set<string>([
  RatingStatus.LOVE,
  RatingStatus.LIKE,
  RatingStatus.NEUTRAL,
  RatingStatus.DISLIKE,
]);

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    const body = await request.json();
    const { tvShowId, tmdbId, status, rating } = body;

    // 1. Validate status
    if (!status || !VALID_TV_STATUSES.has(status)) {
      return NextResponse.json(
        {
          error:
            "Invalid 'status'. Allowed: WATCHED, PARTIALLY_WATCHED, NOT_WATCHED, UNSURE",
        },
        { status: 400 }
      );
    }

    // 2. Validate status & rating relationship
    if (
      status === TvInteractionStatus.WATCHED ||
      status === TvInteractionStatus.PARTIALLY_WATCHED
    ) {
      if (rating && !VALID_RATINGS.has(rating)) {
        return NextResponse.json(
          {
            error:
              "Invalid 'rating'. Allowed: LOVE, LIKE, NEUTRAL, DISLIKE",
          },
          { status: 400 }
        );
      }
    } else {
      // For NOT_WATCHED and UNSURE, rating must be null
      if (rating !== null && rating !== undefined) {
        return NextResponse.json(
          {
            error:
              "Rating must be null for NOT_WATCHED or UNSURE status",
          },
          { status: 400 }
        );
      }
    }

    // 3. Resolve TV Show record (Cache-First)
    let show = null;

    if (tvShowId && typeof tvShowId === "string") {
      show = await db.tvShow.findUnique({
        where: { id: tvShowId },
      });
    } else if (tmdbId && typeof tmdbId === "number") {
      show = await tmdbTvClient.getOrFetchTvShow(tmdbId);
    }

    if (!show) {
      return NextResponse.json(
        { error: "Dizi bulunamadı veya geçersiz TV show ID" },
        { status: 404 }
      );
    }

    // 4. Verify TV Show Eligibility
    const eligibility = evaluateTvEligibility(show, "CALIBRATION");
    if (!eligibility.isEligible) {
      return NextResponse.json(
        { error: "Bu dizi kalibrasyon için uygun değildir" },
        { status: 400 }
      );
    }

    // 5. Update or insert TvInteraction (Idempotent single-row update)
    await updateTvInteraction(
      userId,
      show.id,
      status as TvInteractionStatus,
      rating ? (rating as RatingStatus) : null
    );

    // 6. Calculate user's current total answered TV show count
    const answeredCount = await db.tvInteraction.count({
      where: { userId },
    });

    return NextResponse.json({
      success: true,
      answeredCount,
      targetCount: TV_CALIBRATION_TARGET,
      completed: answeredCount >= TV_CALIBRATION_TARGET,
    });
  } catch (error) {
    console.error("[POST /api/tv/interactions Error]:", error);
    return NextResponse.json(
      { error: "Dizi etkileşimi kaydedilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
