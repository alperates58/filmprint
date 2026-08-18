import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAudit } from "@/lib/admin/auth";
import {
  listSearchConsoleSites,
  selectSearchConsoleSite,
  listSearchConsoleSitemaps,
  submitSearchConsoleSitemap,
  getSearchConsoleAnalyticsPreview,
} from "@/lib/growth/google/search-console";

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const url = new URL(request.url);
    const siteUrl = url.searchParams.get("siteUrl");

    if (siteUrl) {
      const [sitemaps, analytics] = await Promise.all([
        listSearchConsoleSitemaps(siteUrl),
        getSearchConsoleAnalyticsPreview(siteUrl).catch(() => null),
      ]);
      return NextResponse.json({ sitemaps, analytics });
    }

    const sites = await listSearchConsoleSites();
    return NextResponse.json({ sites });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[GET /api/admin/growth/google/search-console] Error:", error);
    return NextResponse.json({ error: error?.message || "Search Console verileri alınamadı" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdminSession();
    const body = await request.json();

    if (body.action === "SELECT_PROPERTY") {
      const { siteUrl } = body;
      if (!siteUrl) return NextResponse.json({ error: "Site URL zorunludur" }, { status: 400 });

      await selectSearchConsoleSite(siteUrl);

      await logAdminAudit(
        session.id,
        "GROWTH_GSC_PROPERTY_CHANGED",
        "SearchConsole",
        siteUrl
      );

      return NextResponse.json({ success: true, message: "Search Console mülkü seçildi." });
    }

    if (body.action === "SUBMIT_SITEMAP") {
      const { siteUrl, sitemapUrl } = body;
      if (!siteUrl) return NextResponse.json({ error: "Site URL zorunludur" }, { status: 400 });

      const result = await submitSearchConsoleSitemap(siteUrl, sitemapUrl);

      await logAdminAudit(
        session.id,
        "GROWTH_GSC_SITEMAP_SUBMITTED",
        "SearchConsole",
        siteUrl,
        { sitemapUrl }
      );

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || "İşlem sırasında hata oluştu" }, { status: 500 });
  }
}
