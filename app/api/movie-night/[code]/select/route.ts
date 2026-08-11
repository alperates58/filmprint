import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { selectMovieNightMovie } from "@/lib/movie-night/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const { userId } = await getOrCreateSession();
    const body = await request.json();
    const { movieId } = body;

    if (!movieId) {
      return NextResponse.json({ error: "movieId gereklidir." }, { status: 400 });
    }

    const sessionInfo = await selectMovieNightMovie(code, userId, movieId);
    return NextResponse.json({ session: sessionInfo });
  } catch (error) {
    console.error("[Movie Night Select Error]:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Film seçilemedi." },
      { status: 400 }
    );
  }
}
