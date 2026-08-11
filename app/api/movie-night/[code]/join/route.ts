import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { joinMovieNightSession } from "@/lib/movie-night/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const { userId } = await getOrCreateSession();

    const session = await joinMovieNightSession(code, userId);
    return NextResponse.json({ success: true, code: session.code });
  } catch (error) {
    console.error("[Movie Night Join Error]:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Seansa katılım başarısız." },
      { status: 400 }
    );
  }
}
