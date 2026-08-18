import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { buildBingGrowthAuthUrl, getBingGrowthConfig } from "@/lib/growth/bing/oauth";

export async function GET() {
  try {
    const session = await requireAdminSession();
    const config = getBingGrowthConfig();

    if (!config.isConfigured) {
      return NextResponse.json(
        { error: "Bing OAuth yapılandırılmamış (BING_WEBMASTER_CLIENT_ID / SECRET eksik)." },
        { status: 400 }
      );
    }

    const authUrl = buildBingGrowthAuthUrl(session.id);
    return NextResponse.json({ authUrl });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    return NextResponse.json({ error: "Yetkilendirme başlatılamadı" }, { status: 500 });
  }
}
