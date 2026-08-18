import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAudit } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";
import {
  listSearchConsoleSites,
  selectSearchConsoleSite,
  listSearchConsoleSitemaps,
  submitSearchConsoleSitemap,
  getSearchConsoleAnalyticsPreview,
} from "@/lib/growth/google/search-console";
import { GoogleIntegrationMetadata } from "@/lib/growth/types";

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const url = new URL(request.url);
    const siteUrl = url.searchParams.get("siteUrl");

    if (siteUrl) {
      const [sitemaps, analytics] = await Promise.all([
        listSearchConsoleSitemaps(siteUrl).catch(() => []),
        getSearchConsoleAnalyticsPreview(siteUrl).catch(() => null),
      ]);
      return NextResponse.json({ sitemaps, analytics, status: "READY" });
    }

    const result = await listSearchConsoleSites();

    // Check existing selected property in DB
    const existingSecret = await db.integrationSecret.findUnique({
      where: { provider: "google_growth" },
    });
    const currentMeta = ((existingSecret?.metadata as Record<string, any>) || {}) as GoogleIntegrationMetadata;
    let selectedSite = currentMeta.gscProperty || null;

    // Auto-select exact domain property "sc-domain:sineai.com.tr" if available and none selected yet
    if (!selectedSite && result.sites.length > 0) {
      const exactDomainProperty = result.sites.find(
        (s) => s.siteUrl === "sc-domain:sineai.com.tr" || s.siteUrl === "https://sineai.com.tr/" || s.siteUrl === "https://sineai.com.tr"
      );
      if (exactDomainProperty) {
        selectedSite = exactDomainProperty.siteUrl;
        await selectSearchConsoleSite(selectedSite);
      }
    }

    return NextResponse.json({
      sites: result.sites,
      selectedSite,
      status: result.status,
      error: result.error,
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[GET /api/admin/growth/google/search-console] Error:", error);
    return NextResponse.json(
      { sites: [], status: "ERROR", error: error?.message || "Search Console verileri alınamadı" },
      { status: 200 }
    );
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

      await submitSearchConsoleSitemap(
        siteUrl,
        sitemapUrl || "https://sineai.com.tr/sitemap.xml"
      );

      await logAdminAudit(
        session.id,
        "GROWTH_GSC_SITEMAP_SUBMITTED",
        "SearchConsole",
        siteUrl,
        { sitemapUrl }
      );

      return NextResponse.json({ success: true, message: "Sitemap Search Console'a iletildi." });
    }

    return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[POST /api/admin/growth/google/search-console] Error:", error);
    return NextResponse.json({ error: error?.message || "İşlem gerçekleştirilemedi" }, { status: 500 });
  }
}
