import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { getMovieNightSessionInfo } from "@/lib/movie-night/service";

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

    const sessionInfo = await getMovieNightSessionInfo(code, userId);
    return NextResponse.json({ session: sessionInfo });
  } catch (error) {
    console.error("[Movie Night GET Error]:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Seans bulunamadı." },
      { status: 404 }
    );
  }
}
