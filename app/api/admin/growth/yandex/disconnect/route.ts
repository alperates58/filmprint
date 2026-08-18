import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAudit } from "@/lib/admin/auth";
import { disconnectYandexGrowth } from "@/lib/growth/yandex/oauth";

export async function POST() {
  try {
    const session = await requireAdminSession();

    await disconnectYandexGrowth();

    await logAdminAudit(
      session.id,
      "GROWTH_YANDEX_DISCONNECTED",
      "IntegrationSecret",
      "yandex_webmaster"
    );

    return NextResponse.json({
      success: true,
      message: "Yandex Webmaster bağlantısı başarıyla kesildi.",
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    return NextResponse.json({ error: "Bağlantı kesilirken hata oluştu" }, { status: 500 });
  }
}
