import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { getOrCalculateUserProfile } from "@/lib/profile/service";

export async function GET() {
  try {
    const { userId } = await getOrCreateSession();
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
