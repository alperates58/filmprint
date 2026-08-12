import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { getOrCalculateUserProfile } from "@/lib/profile/service";

export async function GET() {
  try {
    const session = await getOrCreateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = session;
    const result = await getOrCalculateUserProfile(userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Profile API Error]:", error);
    return NextResponse.json(
      { error: "Film DNA profili alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
