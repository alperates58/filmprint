import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { joinMovieNightSession } from "@/lib/movie-night/service";

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
