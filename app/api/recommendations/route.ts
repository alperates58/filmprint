import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { getPersonalizedRecommendations } from "@/lib/recommendation/service";

export async function GET(request: Request) {
  try {
    const session = await getOrCreateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = session;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10), 1), 20);

    const result = await getPersonalizedRecommendations(userId, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Recommendations API Error]:", error);
    return NextResponse.json(
      { error: "Kişiselleştirilmiş film önerileri alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
