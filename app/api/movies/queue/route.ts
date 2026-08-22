import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { getIntelligentCalibrationQueue } from "@/lib/calibration/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getOrCreateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = session;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "5", 10), 1), 15);
    const mode = (searchParams.get("mode") || "SMART").toUpperCase() as "SMART" | "GENRE" | "SEARCH";
    const rawGenreIds = searchParams.get("genreIds") || "";
    const genreIds = rawGenreIds
      .split(",")
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id) && id > 0);

    const result = await getIntelligentCalibrationQueue(userId, {
      mode,
      genreIds,
      limit,
    });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("[Queue API Error]:", error);
    return NextResponse.json(
      { error: "Failed to retrieve movie queue" },
      { status: 500 }
    );
  }
}
