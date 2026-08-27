import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { voteMovieNightMovie } from "@/lib/movie-night/service";

export async function POST(
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
    const body = await request.json();
    const { movieId } = body;

    if (!movieId) {
      return NextResponse.json({ error: "movieId gereklidir." }, { status: 400 });
    }

    const sessionInfo = await voteMovieNightMovie(code, userId, movieId);
    return NextResponse.json({ session: sessionInfo });
  } catch (error) {
    console.error("[Movie Night Vote Error]:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Oy kullanılamadı." },
      { status: 400 }
    );
  }
}