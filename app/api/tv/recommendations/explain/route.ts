import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/service";
import { db } from "@/lib/db/client";
import { getOrRecalculateTvTasteProfile } from "@/lib/tv/profile/service";
import { buildTvTasteEvidenceProfile } from "@/lib/tv/recommendation/evidence";
import { buildTvFeedbackProfile } from "@/lib/tv/recommendation/feedback-profile";
import { calculateTvMatch } from "@/lib/tv/recommendation/matcher";
import { normalizeDbTvShowToCandidate } from "@/lib/tv/recommendation/service";
import { getOrGenerateTvRecommendationExplanation } from "@/lib/tv/recommendation/explanation-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/tv/recommendations/explain
 * Returns on-demand grounded natural language explanation for a recommended TV show.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Giriş yapmanız gerekiyor." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tvShowId } = body;

    if (!tvShowId || typeof tvShowId !== "string") {
      return NextResponse.json(
        { error: "Geçerli bir tvShowId belirtilmelidir." },
        { status: 400 }
      );
    }

    const [tvShow, profileData, evidenceProfile, feedbackProfile] = await Promise.all([
      db.tvShow.findUnique({ where: { id: tvShowId } }),
      getOrRecalculateTvTasteProfile(user.id),
      buildTvTasteEvidenceProfile(user.id),
      buildTvFeedbackProfile(user.id),
    ]);

    if (!profileData.profile) {
      return NextResponse.json(
        { error: "Dizi DNA profili henüz oluşturulmamış." },
        { status: 400 }
      );
    }

    const candidate = normalizeDbTvShowToCandidate(tvShow);
    const matchResult = calculateTvMatch(
      candidate,
      profileData.profile,
      feedbackProfile,
      evidenceProfile
    );

    const explanation = await getOrGenerateTvRecommendationExplanation(
      user.id,
      tvShowId,
      matchResult,
      profileData.profile,
      { profileVersion: profileData.profile.schemaVersion || 1, matchVersion: 1 }
    );

    return NextResponse.json(
      {
        success: true,
        ...explanation,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error: any) {
    console.error("[TV Explanation API Error]:", error);
    return NextResponse.json(
      { error: "Dizi açıklaması üretilirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
