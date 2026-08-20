import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAudit } from "@/lib/admin/auth";
import { getAdSenseHealth } from "@/lib/growth/google/adsense";
import { getAdSenseSettings, saveAdSenseSettings } from "@/lib/growth/credentials";

export async function GET() {
  try {
    await requireAdminSession();
    const [health, settings] = await Promise.all([
      getAdSenseHealth(),
      getAdSenseSettings(),
    ]);

    return NextResponse.json({
      ...health,
      settings,
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[GET /api/admin/growth/google/adsense] Error:", error);
    return NextResponse.json({ error: error?.message || "AdSense verileri alınamadı" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAdminSession();
    const body = await request.json();

    const updated = await saveAdSenseSettings({
      publisherId: body.publisherId,
      adsTxt: body.adsTxt,
      autoAdsEnabled: body.autoAdsEnabled,
    });

    await logAdminAudit(
      session.id,
      "GROWTH_ADSENSE_SETTINGS_UPDATED",
      "SystemSetting",
      "adsense",
      body
    );

    return NextResponse.json({
      success: true,
      message: "AdSense ve Monetization ayarları başarıyla kaydedildi.",
      settings: updated,
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[PUT /api/admin/growth/google/adsense] Error:", error);
    return NextResponse.json({ error: "AdSense ayarları kaydedilirken hata oluştu" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return PUT(request);
}
