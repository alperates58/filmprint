import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/service";
import { getPersonalizedTvRecommendations } from "@/lib/tv/recommendation/service";

export const dynamic = "force-dynamic";

/**
 * POST /api/tv/recommendations/hybrid-refresh
 * Triggers background or on-demand generation/refresh of TV AI Taste Profile & Recommendation Snapshot.
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

    const data = await getPersonalizedTvRecommendations(user.id, {
      limit: 24,
      allowHybrid: true,
      forceAiRefresh: true,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Dizi AI öneri önbelleği başarıyla yenilendi.",
        ...data,
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
    console.error("[TV Hybrid Refresh API Error]:", error);
    return NextResponse.json(
      { error: "Dizi AI önerileri yenilenirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
