import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { getTonightPicks } from "@/lib/library/service";

export async function GET(request: Request) {
  try {
    const session = await getOrCreateSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = session;

    const { searchParams } = new URL(request.url);
    const rawMediaType = (searchParams.get("mediaType") || "ALL").toUpperCase();
    const mediaType = (["FILM", "TV", "ALL"].includes(rawMediaType)
      ? rawMediaType
      : "ALL") as "FILM" | "TV" | "ALL";

    const picks = await getTonightPicks(userId, mediaType);

    return NextResponse.json({
      success: true,
      picks,
      count: picks.length,
    });
  } catch (error) {
    console.error("[GET /api/library/tonight Error]:", error);
    return NextResponse.json(
      { error: "Bu akşam için öneriler seçilirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
