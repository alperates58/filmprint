import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/service";
import { getTvCalibrationQueue } from "@/lib/tv/calibration/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "5", 10)), 15);
    const mode = (searchParams.get("mode") || "SMART").toUpperCase() as "SMART" | "GENRE" | "SEARCH";
    const rawGenreIds = searchParams.get("genreIds") || "";
    const genreIds = rawGenreIds
      .split(",")
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id) && id > 0);

    const queueResult = await getTvCalibrationQueue(user.id, {
      mode,
      genreIds,
      limit,
    });

    return NextResponse.json(queueResult, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("[GET /api/tv/calibration Error]:", error);
    return NextResponse.json(
      { error: "TV kalibrasyon sırası yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
