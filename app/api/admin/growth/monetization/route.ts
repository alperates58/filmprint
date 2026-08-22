import { NextResponse } from "next/server";
import { requireAdminSession, requireSuperAdminSession } from "@/lib/admin/auth";
import {
  getOrCreateMonetizationSetting,
  getMonetizationReadinessGate,
  getPlacements,
  getAdSenseInventoryUnits,
  updateMonetizationSettings,
} from "@/lib/monetization/service";
import { getAdSensePolicyCenter } from "@/lib/monetization/adsense-api";
import { evaluateAdsTxtHealth } from "@/lib/monetization/ads-txt";

export async function GET() {
  try {
    await requireAdminSession();

    const [setting, readiness, policy, placements, inventoryUnits] = await Promise.all([
      getOrCreateMonetizationSetting(),
      getMonetizationReadinessGate(),
      getAdSensePolicyCenter(),
      getPlacements(),
      getAdSenseInventoryUnits(),
    ]);

    const adsTxtHealth = evaluateAdsTxtHealth(setting?.publisherId, setting?.adsTxtCustom);

    return NextResponse.json({
      settings: setting,
      readiness,
      policy,
      placements,
      inventoryUnits,
      adsTxtHealth,
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[GET /api/admin/growth/monetization] Error:", error);
    return NextResponse.json({ error: error?.message || "Monetization verileri alınamadı." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    let session;

    // Master enable requires SUPER_ADMIN
    if (body.adsMasterEnabled !== undefined) {
      session = await requireSuperAdminSession();
    } else {
      session = await requireAdminSession();
    }

    const updated = await updateMonetizationSettings(
      {
        adsMasterEnabled: body.adsMasterEnabled,
        publisherId: body.publisherId,
        adClientId: body.adClientId,
        adminPreviewMode: body.adminPreviewMode,
        anonymousOnlyDefault: body.anonymousOnlyDefault,
        maxAdsPerPage: body.maxAdsPerPage,
        cmpConfigured: body.cmpConfigured,
        adsTxtCustom: body.adsTxtCustom,
      },
      session.id
    );

    const readiness = await getMonetizationReadinessGate();

    return NextResponse.json({
      success: true,
      message: "Monetization ayarları başarıyla güncellendi.",
      settings: updated,
      readiness,
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    if (error?.message === "FORBIDDEN_SUPER_ADMIN_REQUIRED") {
      return NextResponse.json({ error: "Bu işlem yalnızca Süper Yönetici (SUPER_ADMIN) yetkisiyle gerçekleştirilebilir." }, { status: 403 });
    }
    if (error?.message?.startsWith("ADS_READINESS_FAILED")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[PUT /api/admin/growth/monetization] Error:", error);
    return NextResponse.json({ error: error?.message || "Ayarlar kaydedilirken hata oluştu." }, { status: 500 });
  }
}
