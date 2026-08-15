import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/service";
import { getPersonalizedTvRecommendations } from "@/lib/tv/recommendation/service";

export const dynamic = "force-dynamic";

/**
 * GET /api/tv/recommendations
 * Returns personalized deterministic TV recommendations for authenticated user.
 * NetworkOnly / No-store cache policy.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Giriş yapmanız gerekiyor." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "24", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);

    const data = await getPersonalizedTvRecommendations(user.id, {
      limit: isNaN(limit) ? 24 : limit,
      page: isNaN(page) ? 1 : page,
    });

    return NextResponse.json(
      {
        success: true,
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
    console.error("[TV Recommendations API Error]:", error);
    return NextResponse.json(
      { error: "Dizi önerileri yüklenirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
