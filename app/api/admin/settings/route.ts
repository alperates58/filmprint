import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAudit } from "@/lib/admin/auth";
import { getSystemSettings, updateSystemSetting, validateHybridWeights } from "@/lib/config/service";

export async function GET() {
  try {
    await requireAdminSession();
    const settings = await getSystemSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdminSession();
    const body = await request.json();
    const {
      calibrationTarget,
      queuePreloadCount,
      aiEnabled,
      activeLearningEnabled,
      hybridRerankEnabled,
      hybridMatchWeight,
      hybridAiWeight,
      aiTasteRefreshEvidenceCount,
      aiRerankShortlistSize,
    } = body;

    if (typeof calibrationTarget === "number" && calibrationTarget > 0) {
      await updateSystemSetting("calibration_target", calibrationTarget.toString());
    }

    if (typeof queuePreloadCount === "number" && queuePreloadCount >= 1 && queuePreloadCount <= 20) {
      await updateSystemSetting("queue_preload_count", queuePreloadCount.toString());
    }

    if (typeof aiEnabled === "boolean") {
      await updateSystemSetting("ai_enabled", aiEnabled.toString());
    }

    if (typeof activeLearningEnabled === "boolean") {
      await updateSystemSetting("active_learning_enabled", activeLearningEnabled.toString());
    }

    if (typeof hybridRerankEnabled === "boolean") {
      await updateSystemSetting("hybrid_rerank_enabled", hybridRerankEnabled.toString());
    }

    if (typeof hybridMatchWeight === "number" || typeof hybridAiWeight === "number") {
      const curMatch = typeof hybridMatchWeight === "number" ? hybridMatchWeight : 60;
      const curAi = typeof hybridAiWeight === "number" ? hybridAiWeight : 40;
      const { matchWeight, aiWeight } = validateHybridWeights(curMatch, curAi);
      await updateSystemSetting("hybrid_match_weight", matchWeight.toString());
      await updateSystemSetting("hybrid_ai_weight", aiWeight.toString());
    }

    if (typeof aiTasteRefreshEvidenceCount === "number") {
      const clamped = Math.max(10, Math.min(100, Math.round(aiTasteRefreshEvidenceCount)));
      await updateSystemSetting("ai_taste_refresh_evidence_count", clamped.toString());
    }

    if (typeof aiRerankShortlistSize === "number") {
      const clamped = Math.max(40, Math.min(60, Math.round(aiRerankShortlistSize)));
      await updateSystemSetting("ai_rerank_shortlist_size", clamped.toString());
    }

    await logAdminAudit(admin.id, "SYSTEM_SETTINGS_UPDATED", "SystemSetting", undefined, body);

    const updatedSettings = await getSystemSettings();
    return NextResponse.json({
      success: true,
      message: "Sistem ayarları başarıyla güncellendi.",
      settings: updatedSettings,
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Admin Settings Update Error]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
