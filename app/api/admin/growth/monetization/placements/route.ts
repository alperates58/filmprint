import { NextResponse } from "next/server";
import { requireAdminSession, requireSuperAdminSession } from "@/lib/admin/auth";
import { getPlacements, updateAdPlacement } from "@/lib/monetization/service";

export async function GET() {
  try {
    await requireAdminSession();
    const placements = await getPlacements();
    return NextResponse.json({ placements });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[GET /api/admin/growth/monetization/placements] Error:", error);
    return NextResponse.json({ error: "Reklam yerleşimleri alınamadı." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireSuperAdminSession();
    const body = await request.json();

    if (!body.key) {
      return NextResponse.json({ error: "Placement anahtarı (key) zorunludur." }, { status: 400 });
    }

    const updated = await updateAdPlacement(
      body.key,
      {
        enabled: body.enabled,
        adUnitId: body.adUnitId,
        deviceTarget: body.deviceTarget,
        audience: body.audience,
        minViewportWidth: body.minViewportWidth,
        maxViewportWidth: body.maxViewportWidth,
      },
      session.id
    );

    return NextResponse.json({
      success: true,
      message: `${body.key} yerleşimi başarıyla güncellendi.`,
      placement: updated,
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    if (error?.message === "FORBIDDEN_SUPER_ADMIN_REQUIRED") {
      return NextResponse.json({ error: "Reklam yerleşimi ayarları yalnızca Süper Yönetici tarafından değiştirilebilir." }, { status: 403 });
    }
    if (error?.message?.startsWith("ARCHIVED_OR_INVALID_AD_UNIT")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[PUT /api/admin/growth/monetization/placements] Error:", error);
    return NextResponse.json({ error: error?.message || "Yerleşim kaydedilirken hata oluştu." }, { status: 500 });
  }
}
