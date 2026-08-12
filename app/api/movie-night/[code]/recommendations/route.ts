import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { getMovieNightRecommendations } from "@/lib/movie-night/service";

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const userSession = await getOrCreateSession();
    if (!userSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = userSession;

    const data = await getMovieNightRecommendations(code, userId, 10);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Movie Night Recommendations Error]:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Grup önerileri hesaplanamadı." },
      { status: 500 }
    );
  }
}
