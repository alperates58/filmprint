import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAudit } from "@/lib/admin/auth";
import { getSystemSettings, updateSystemSetting } from "@/lib/config/service";

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
    const { calibrationTarget, queuePreloadCount, aiEnabled, activeLearningEnabled } = body;

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
