import { NextResponse } from "next/server";
import { requireAdminSession, requireSuperAdminSession } from "@/lib/admin/auth";
import {
  getOrCreateMonetizationSetting,
  updateMonetizationSettings,
} from "@/lib/monetization/service";
import {
  evaluateAdsTxtHealth,
  normalizePublisherId,
  generateGoogleAdsTxtLine,
} from "@/lib/monetization/ads-txt";

export async function GET() {
  try {
    await requireAdminSession();
    const setting = await getOrCreateMonetizationSetting();
    const pubId = normalizePublisherId(setting?.publisherId);
    const health = evaluateAdsTxtHealth(pubId, setting?.adsTxtCustom);

    return NextResponse.json({
      health,
      publisherId: pubId,
      customContent: setting?.adsTxtCustom || "",
      defaultGeneratedLine: generateGoogleAdsTxtLine(pubId),
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[GET /api/admin/growth/monetization/ads-txt] Error:", error);
    return NextResponse.json({ error: "ads.txt durumu alınamadı." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireSuperAdminSession();
    const body = await request.json();

    const cleanPubId = body.publisherId !== undefined ? normalizePublisherId(body.publisherId) : undefined;
    const cleanAdClientId = cleanPubId ? `ca-${cleanPubId}` : undefined;

    const updated = await updateMonetizationSettings(
      {
        publisherId: cleanPubId,
        adClientId: cleanAdClientId,
        adsTxtCustom: body.customContent,
      },
      session.id
    );

    const health = evaluateAdsTxtHealth(updated.publisherId, updated.adsTxtCustom);

    return NextResponse.json({
      success: true,
      message: "ads.txt ve Publisher ID ayarları güncellendi.",
      health,
      settings: updated,
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    if (error?.message === "FORBIDDEN_SUPER_ADMIN_REQUIRED") {
      return NextResponse.json({ error: "ads.txt ayarları yalnızca Süper Yönetici tarafından değiştirilebilir." }, { status: 403 });
    }
    console.error("[PUT /api/admin/growth/monetization/ads-txt] Error:", error);
    return NextResponse.json({ error: error?.message || "ads.txt güncellenirken hata oluştu." }, { status: 500 });
  }
}
