import { NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/admin/auth";
import { emergencyDisableAllAds } from "@/lib/monetization/service";

export async function POST() {
  try {
    const session = await requireSuperAdminSession();
    const updated = await emergencyDisableAllAds(session.id);

    return NextResponse.json({
      success: true,
      message: "ACİL DURUM: Tüm reklamlar derhal kapatıldı ve sistem güvenli duruma alındı.",
      settings: updated,
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    if (error?.message === "FORBIDDEN_SUPER_ADMIN_REQUIRED") {
      return NextResponse.json({ error: "Acil durdurma anahtarı yalnızca Süper Yönetici tarafından tetiklenebilir." }, { status: 403 });
    }
    console.error("[POST /api/admin/growth/monetization/emergency-kill] Error:", error);
    return NextResponse.json({ error: "Acil durdurma işlemi sırasında hata oluştu." }, { status: 500 });
  }
}
