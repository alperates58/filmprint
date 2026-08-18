import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAudit } from "@/lib/admin/auth";
import { disconnectBingGrowth } from "@/lib/growth/bing/oauth";

export async function POST() {
  try {
    const session = await requireAdminSession();

    await disconnectBingGrowth();

    await logAdminAudit(
      session.id,
      "GROWTH_BING_DISCONNECTED",
      "IntegrationSecret",
      "bing_webmaster"
    );

    return NextResponse.json({
      success: true,
      message: "Bing Webmaster bağlantısı başarıyla kesildi.",
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    return NextResponse.json({ error: "Bağlantı kesilirken hata oluştu" }, { status: 500 });
  }
}
