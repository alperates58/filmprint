import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAudit } from "@/lib/admin/auth";
import { getYandexStatus, listYandexHosts, submitYandexSitemap } from "@/lib/growth/yandex/webmaster";

export async function GET() {
  try {
    await requireAdminSession();
    const status = await getYandexStatus();

    let hosts: any[] = [];
    let error: string | null = null;
    if (status.isConnected) {
      try {
        hosts = await listYandexHosts();
      } catch (err: any) {
        error = err?.message || "Yandex siteleri listelenemedi";
      }
    }

    return NextResponse.json({ status, hosts, error });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    return NextResponse.json({ error: "Yandex durumu alınamadı" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdminSession();
    const body = await request.json();

    const { hostId, sitemapUrl } = body;
    if (!hostId) {
      return NextResponse.json({ error: "Host ID zorunludur" }, { status: 400 });
    }

    const result = await submitYandexSitemap(hostId, sitemapUrl);

    await logAdminAudit(
      session.id,
      "GROWTH_YANDEX_SITEMAP_SUBMITTED",
      "YandexWebmaster",
      hostId,
      { sitemapUrl }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || "Sitemap gönderim hatası" }, { status: 500 });
  }
}
