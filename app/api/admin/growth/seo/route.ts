import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAudit } from "@/lib/admin/auth";
import { getSeoSystemConfig, saveSeoSystemConfig } from "@/lib/growth/settings";
import { getSeoCatalogMetrics } from "@/lib/growth/seo/staged-rollout";

export async function GET() {
  try {
    await requireAdminSession();
    const [config, metrics] = await Promise.all([
      getSeoSystemConfig(),
      getSeoCatalogMetrics(),
    ]);

    return NextResponse.json({ config, metrics });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

async function handleUpdateSeoConfig(request: Request) {
  try {
    const session = await requireAdminSession();
    const body = await request.json();

    const updates = (body && typeof body === "object" && "config" in body && body.config) ? body.config : body;
    await saveSeoSystemConfig(updates);

    await logAdminAudit(
      session.id,
      "GROWTH_SEO_SETTINGS_UPDATED",
      "SeoSystemConfig",
      "global",
      updates
    );

    const updatedConfig = await getSeoSystemConfig();
    return NextResponse.json({
      success: true,
      message: "SEO ve İndeksleme ayarları başarıyla güncellendi.",
      config: updatedConfig,
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    return NextResponse.json({ error: "Güncelleme sırasında hata oluştu" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return handleUpdateSeoConfig(request);
}

export async function POST(request: Request) {
  return handleUpdateSeoConfig(request);
}
