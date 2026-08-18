import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAudit } from "@/lib/admin/auth";
import { disconnectGoogleGrowth } from "@/lib/growth/google/oauth";

export async function POST() {
  try {
    const session = await requireAdminSession();

    await disconnectGoogleGrowth();

    await logAdminAudit(
      session.id,
      "GROWTH_GOOGLE_DISCONNECTED",
      "IntegrationSecret",
      "google_growth"
    );

    return NextResponse.json({
      success: true,
      message: "Google bağlantısı başarıyla kesildi.",
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    return NextResponse.json({ error: "Bağlantı kesilirken hata oluştu" }, { status: 500 });
  }
}
