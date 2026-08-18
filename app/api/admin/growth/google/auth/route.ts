import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { buildGoogleGrowthAuthUrl, getGoogleGrowthConfig } from "@/lib/growth/google/oauth";

export async function GET() {
  try {
    const session = await requireAdminSession();
    const config = getGoogleGrowthConfig();

    if (!config.isConfigured) {
      return NextResponse.json(
        { error: "Google OAuth yapılandırılmamış. (GOOGLE_GROWTH_CLIENT_ID / GOOGLE_CLIENT_ID eksik)" },
        { status: 400 }
      );
    }

    const authUrl = buildGoogleGrowthAuthUrl(session.id);
    return NextResponse.json({ authUrl });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    return NextResponse.json({ error: "Yetkilendirme başlatılamadı" }, { status: 500 });
  }
}
