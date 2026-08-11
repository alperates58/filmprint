import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { getMovieNightSessionInfo } from "@/lib/movie-night/service";

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const { userId } = await getOrCreateSession();

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
