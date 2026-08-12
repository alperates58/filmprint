import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { createMovieNightSession } from "@/lib/movie-night/service";

export async function POST() {
  try {
    const userSession = await getOrCreateSession();
    if (!userSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = userSession;
    const session = await createMovieNightSession(userId);

    return NextResponse.json({
      success: true,
      code: session.code,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("[Movie Night Create Error]:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Movie Night seansı oluşturulamadı." },
      { status: 500 }
    );
  }
}
