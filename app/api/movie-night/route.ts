import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { createMovieNightSession } from "@/lib/movie-night/service";

export async function POST() {
  try {
    const { userId } = await getOrCreateSession();
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
