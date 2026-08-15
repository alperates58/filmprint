import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { getSystemSettings } from "@/lib/config/service";
import { getOrRefreshUserAiTasteProfile } from "@/lib/recommendation/ai-taste-service";

export async function POST(request: Request) {
  try {
    const session = await getOrCreateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = session;

    const settings = await getSystemSettings();
    if (!settings.hybridRerankEnabled && !settings.aiEnabled) {
      return NextResponse.json({
        success: false,
        message: "Hybrid AI recommendation service is disabled.",
      });
    }

    let forceRefresh = false;
    try {
      const body = await request.json();
      if (body && body.forceRefresh === true) {
        forceRefresh = true;
      }
    } catch {
      // Empty body is acceptable
    }

    const tasteResult = await getOrRefreshUserAiTasteProfile(userId, "FILM", {
      forceRefresh,
      refreshThreshold: settings.aiTasteRefreshEvidenceCount,
    });

    return NextResponse.json({
      success: true,
      tasteProfileReady: tasteResult.profile !== null,
      refreshed: tasteResult.refreshed,
      source: tasteResult.source,
    });
  } catch (error) {
    console.error("[Hybrid Refresh API Error]:", error);
    return NextResponse.json(
      { error: "AI Taste yenilemesi sırasında bir hata oluştu." },
      { status: 500 }
    );
  }
}
