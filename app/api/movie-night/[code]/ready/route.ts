import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { toggleMovieNightMemberReady } from "@/lib/movie-night/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const { userId } = await getOrCreateSession();

    const sessionInfo = await toggleMovieNightMemberReady(code, userId);
    return NextResponse.json({ session: sessionInfo });
  } catch (error) {
    console.error("[Movie Night Ready Error]:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Hazır durumu değiştirilemedi." },
      { status: 400 }
    );
  }
}
