import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { getIntelligentCalibrationQueue } from "@/lib/calibration/service";

export async function GET(request: Request) {
  try {
    const session = await getOrCreateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = session;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "5", 10), 1), 10);

    const result = await getIntelligentCalibrationQueue(userId, limit);

    return NextResponse.json({
      movies: result.movies,
      answeredCount: result.answeredCount,
      targetCount: result.targetCount,
      completed: result.completed,
      strategy: result.strategy,
      supply: result.supply,
    }, {
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
