import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/service";
import { getOrRecalculateTvTasteProfile } from "@/lib/tv/profile/service";

export const dynamic = "force-dynamic";

/**
 * GET /api/tv/profile
 * Returns deterministic Dizi DNA profile for authenticated user.
 * NetworkOnly / No-store cache policy.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Giriş yapmanız gerekiyor." },
        { status: 401 }
      );
    }

    const data = await getOrRecalculateTvTasteProfile(user.id);

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
    console.error("[TV Profile API Error]:", error);
    return NextResponse.json(
      { error: "Dizi DNA profili alınırken bir hata oluştu." },
      { status: 500 }
    );
  }
}
