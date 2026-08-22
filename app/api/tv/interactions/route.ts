import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getAuthenticatedUser } from "@/lib/auth/service";
import { tmdbTvClient } from "@/lib/tmdb/tv/client";
import { updateTvInteraction } from "@/lib/tv/service";
import { evaluateTvEligibility } from "@/lib/tv/eligibility";
import type { EligibleTvShowInput } from "@/lib/tv/types";
import type { TvInteractionStatus, RatingStatus } from "@prisma/client";
import { CALIBRATION_THRESHOLDS, getTvConfidenceLevel } from "@/lib/calibration/confidence";

export const dynamic = "force-dynamic";

const VALID_TV_STATUSES = new Set<string>([
  "WATCHED",
  "PARTIALLY_WATCHED",
  "NOT_WATCHED",
  "UNSURE",
]);

const VALID_RATINGS = new Set<string>([
  "LOVE",
  "LIKE",
  "NEUTRAL",
  "DISLIKE",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

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
    if (status === "WATCHED" || status === "PARTIALLY_WATCHED") {
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
    const normalizedMetadata: Record<string, unknown> | undefined = isRecord(show.metadata)
      ? show.metadata
      : undefined;

    const eligibilityInput: EligibleTvShowInput = {
      ...show,
      voteCount: show.voteCount ?? undefined,
      metadata: normalizedMetadata,
    };
    const eligibility = evaluateTvEligibility(eligibilityInput, "CALIBRATION");
    if (!eligibility.isEligible) {
      return NextResponse.json(
        { error: "Bu dizi kalibrasyon için uygun değildir" },
        { status: 400 }
      );
    }

    // 5. Update or insert TvInteraction (with library sync in updateTvInteraction)
    await updateTvInteraction(
      userId,
      show.id,
      status as TvInteractionStatus,
      rating ? (rating as RatingStatus) : null
    );

    // 6. Calculate user's current metrics
    const interactions = await db.tvInteraction.findMany({
      where: { userId },
      select: { tvShowId: true, status: true, rating: true },
    });

    const evaluationCount = interactions.length;
    const watchedCount = new Set(
      interactions.filter((i) => i.status === "WATCHED").map((i) => i.tvShowId)
    ).size;
    const tasteEvidenceCount = new Set(
      interactions.filter((i) => i.status === "WATCHED" && i.rating !== null).map((i) => i.tvShowId)
    ).size;

    const confidence = getTvConfidenceLevel(tasteEvidenceCount);
    const canGenerateDna = tasteEvidenceCount >= CALIBRATION_THRESHOLDS.TV.MIN_UNLOCK;
    const completed = tasteEvidenceCount >= CALIBRATION_THRESHOLDS.TV.RECOMMENDED;

    return NextResponse.json({
      success: true,
      tvShowId: show.id,
      status,
      rating: rating || null,
      evaluationCount,
      watchedCount,
      tasteEvidenceCount,
      minimumTarget: CALIBRATION_THRESHOLDS.TV.MIN_UNLOCK,
      targetCount: CALIBRATION_THRESHOLDS.TV.RECOMMENDED,
      recommendedTarget: CALIBRATION_THRESHOLDS.TV.RECOMMENDED,
      completed,
      canGenerateDna,
      confidence,
      answeredCount: evaluationCount, // Backward-compatibility
    });
  } catch (error) {
    console.error("[POST /api/tv/interactions Error]:", error);
    return NextResponse.json(
      { error: "Dizi etkileşimi kaydedilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
