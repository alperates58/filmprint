import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAudit } from "@/lib/admin/auth";
import { getBingStatus, listBingSites, submitBingSitemap } from "@/lib/growth/bing/webmaster";

export async function GET() {
  try {
    await requireAdminSession();
    const status = await getBingStatus();

    let sites: any[] = [];
    let error: string | null = null;
    if (status.isConnected) {
      try {
        sites = await listBingSites();
      } catch (err: any) {
        error = err?.message || "Siteler listelenemedi";
      }
    }

    return NextResponse.json({ status, sites, error });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    return NextResponse.json({ error: "Bing durumu alınamadı" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdminSession();
    const body = await request.json();

    const { siteUrl, sitemapUrl } = body;
    if (!siteUrl) {
      return NextResponse.json({ error: "Site URL zorunludur" }, { status: 400 });
    }

    const result = await submitBingSitemap(siteUrl, sitemapUrl);

    await logAdminAudit(
      session.id,
      "GROWTH_BING_SITEMAP_SUBMITTED",
      "BingWebmaster",
      siteUrl,
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
