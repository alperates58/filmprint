import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/service";
import { searchLocalCalibrationCatalog } from "@/lib/calibration/search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmalısınız" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const mediaType = (searchParams.get("mediaType") || "FILM").toUpperCase() as "FILM" | "TV";
    const limit = parseInt(searchParams.get("limit") || "15", 10);

    if (!q || q.trim().length === 0) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchLocalCalibrationCatalog({
      query: q,
      mediaType: mediaType === "TV" ? "TV" : "FILM",
      userId: user.id,
      limit,
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[GET /api/calibration/search Error]:", error);
    return NextResponse.json(
      { error: "Arama sırasında bir hata oluştu" },
      { status: 500 }
    );
  }
}
