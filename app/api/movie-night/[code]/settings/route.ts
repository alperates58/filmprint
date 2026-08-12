import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { toggleMovieNightSettings } from "@/lib/movie-night/service";

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
    const { excludeWatched } = body;

    const sessionInfo = await toggleMovieNightSettings(code, userId, !!excludeWatched);
    return NextResponse.json({ session: sessionInfo });
  } catch (error) {
    console.error("[Movie Night Settings Error]:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Ayarlar güncellenemedi." },
      { status: 400 }
    );
  }
}
