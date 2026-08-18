import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { buildYandexGrowthAuthUrl, getYandexGrowthConfig } from "@/lib/growth/yandex/oauth";

export async function GET() {
  try {
    const session = await requireAdminSession();
    const config = getYandexGrowthConfig();

    if (!config.isConfigured) {
      return NextResponse.json(
        { error: "Yandex OAuth yapılandırılmamış (YANDEX_WEBMASTER_CLIENT_ID / SECRET eksik)." },
        { status: 400 }
      );
    }

    const authUrl = buildYandexGrowthAuthUrl(session.id);
    return NextResponse.json({ authUrl });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    return NextResponse.json({ error: "Yetkilendirme başlatılamadı" }, { status: 500 });
  }
}
