import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { db } from "@/lib/db/client";
import { getOrCalculateUserProfile } from "@/lib/profile/service";

export async function POST() {
  try {
    const session = await getOrCreateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = session;

    // Delete existing cached profile to force a full live recalculation with LLM
    await db.userTasteProfile.deleteMany({
      where: { userId },
    });

    const result = await getOrCalculateUserProfile(userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Profile Refresh AI API Error]:", error);
    return NextResponse.json(
      { error: "AI Analiz raporu yenilenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
