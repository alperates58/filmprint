import { db } from "@/lib/db/client";
import { getGoogleGrowthAccessToken } from "./oauth";
import { GoogleIntegrationMetadata } from "../types";

export interface GscSiteProperty {
  siteUrl: string; // e.g. "sc-domain:sineai.com.tr" or "https://sineai.com.tr/"
  permissionLevel: string;
}

export interface GscSitemapInfo {
  path: string;
  lastSubmitted?: string;
  isPending?: boolean;
  isSitemapsIndex?: boolean;
  lastDownloaded?: string;
  warnings?: number;
  errors?: number;
}

export interface GscUrlInspectionResult {
  inspectionUrl: string;
  verdict: "PASS" | "PARTIAL" | "FAIL" | "NEUTRAL" | "UNSPECIFIED";
  coverageState: string;
  indexingState: string;
  robotsTxtState: string;
  userCanonical?: string;
  googleCanonical?: string;
  lastCrawlTime?: string;
  crawledAs?: string;
  pageFetchState?: string;
  rawResponse?: Record<string, any>;
}

export interface GscAnalyticsSummary {
  dateRange: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  topQueries: { query: string; clicks: number; impressions: number; ctr: number; position: number }[];
  topPages: { page: string; clicks: number; impressions: number; ctr: number; position: number }[];
}

export interface GscSitesListResult {
  sites: GscSiteProperty[];
  status: "READY" | "EMPTY" | "API_DISABLED" | "UNAUTHENTICATED" | "ERROR";
  error?: string;
}

/**
 * Lists Search Console verified site properties.
 * Returns structured status and never crashes on disabled API or empty property sets.
 */
export async function listSearchConsoleSites(): Promise<GscSitesListResult> {
  const token = await getGoogleGrowthAccessToken();
  if (!token) {
    return {
      sites: [],
      status: "UNAUTHENTICATED",
      error: "Google yetkilendirmesi bulunamadı veya süresi doldu.",
    };
  }

  try {
    const response = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      const isApiDisabled =
        response.status === 403 &&
        (errorText.includes("SERVICE_DISABLED") ||
          errorText.includes("has not been used") ||
          errorText.includes("Search Console API has not been used") ||
          errorText.includes("Google Search Console API has not been used") ||
          errorText.includes("accessNotConfigured"));

      if (isApiDisabled) {
        return {
          sites: [],
          status: "API_DISABLED",
          error: "Google Search Console API etkinleştirilmemiş. Google Cloud Console'dan 'Google Search Console API' etkinleştirilmelidir.",
        };
      }

      if (response.status === 403 || response.status === 404) {
        return {
          sites: [],
          status: "EMPTY",
          error: "Bu Google hesabında erişilebilir Search Console mülkü bulunamadı.",
        };
      }

      return {
        sites: [],
        status: "ERROR",
        error: `Search Console API hatası (${response.status})`,
      };
    }

    const data = await response.json();
    const entries = data.siteEntry || [];

    const sites: GscSiteProperty[] = entries.map((e: any) => ({
      siteUrl: e.siteUrl,
      permissionLevel: e.permissionLevel || "siteOwner",
    }));

    return {
      sites,
      status: sites.length > 0 ? "READY" : "EMPTY",
    };
  } catch (err: any) {
    console.error("[listSearchConsoleSites] Fetch error:", err);
    return {
      sites: [],
      status: "ERROR",
      error: err?.message || "Search Console mülkleri sorgulanamadı.",
    };
  }
}

/**
 * Selects active Search Console property.
 */
export async function selectSearchConsoleSite(siteUrl: string): Promise<void> {
  const existing = await db.integrationSecret.findUnique({
    where: { provider: "google_growth" },
  });

  const currentMeta = ((existing?.metadata as Record<string, any>) || {}) as GoogleIntegrationMetadata;
  const updatedMeta: GoogleIntegrationMetadata = {
    ...currentMeta,
    gscProperty: siteUrl,
    lastSyncAt: new Date().toISOString(),
  };

  await db.integrationSecret.upsert({
    where: { provider: "google_growth" },
    update: { metadata: updatedMeta as any },
    create: {
      provider: "google_growth",
      encryptedValue: "",
      metadata: updatedMeta as any,
    },
  });
}

/**
 * Lists sitemaps for the selected Search Console property.
 */
export async function listSearchConsoleSitemaps(siteUrl: string): Promise<GscSitemapInfo[]> {
  const token = await getGoogleGrowthAccessToken();
  if (!token) {
    throw new Error("Google yetkilendirmesi bulunamadı.");
  }

  const encodedSite = encodeURIComponent(siteUrl);
  const response = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  const sitemaps = data.sitemap || [];

  return sitemaps.map((s: any) => ({
    path: s.path,
    lastSubmitted: s.lastSubmitted,
    isPending: s.isPending,
    isSitemapsIndex: s.isSitemapsIndex,
    lastDownloaded: s.lastDownloaded,
    warnings: s.warnings,
    errors: s.errors,
  }));
}

/**
 * Submits SINEAI sitemap index to Google Search Console.
 */
export async function submitSearchConsoleSitemap(siteUrl: string, sitemapUrl?: string): Promise<{ success: boolean; message: string }> {
  const token = await getGoogleGrowthAccessToken();
  if (!token) {
    throw new Error("Google yetkilendirmesi bulunamadı.");
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sineai.com.tr").replace(/\/+$/, "");
  const targetSitemap = sitemapUrl || `${baseUrl}/sitemap.xml`;

  const encodedSite = encodeURIComponent(siteUrl);
  const encodedFeedpath = encodeURIComponent(targetSitemap);

  const response = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps/${encodedFeedpath}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Sitemap gönderimi başarısız oldu: ${errText}`);
  }

  // Update last submission time
  const existing = await db.integrationSecret.findUnique({ where: { provider: "google_growth" } });
  const currentMeta = ((existing?.metadata as Record<string, any>) || {}) as GoogleIntegrationMetadata;
  await db.integrationSecret.update({
    where: { provider: "google_growth" },
    data: {
      metadata: {
        ...currentMeta,
        gscLastSitemapSubmission: new Date().toISOString(),
      } as any,
    },
  }).catch(() => {});

  return { success: true, message: `Sitemap başarıyla Google'a iletildi (${targetSitemap}).` };
}

/**
 * Validates and inspects an indexed or live URL using the official Google Search Console URL Inspection API.
 * Foreign domains outside SINEAI domain are rejected.
 */
export async function inspectUrlInSearchConsole(siteUrl: string, inspectionUrl: string): Promise<GscUrlInspectionResult> {
  const token = await getGoogleGrowthAccessToken();
  if (!token) {
    throw new Error("Google yetkilendirmesi bulunamadı.");
  }

  // Validate domain ownership
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sineai.com.tr").replace(/\/+$/, "");
  const baseHost = new URL(baseUrl).host;

  try {
    const targetUrlObj = new URL(inspectionUrl);
    if (targetUrlObj.host !== baseHost) {
      throw new Error(`Yalnızca SINEAI alan adına (${baseHost}) ait URL'ler denetlenebilir.`);
    }
  } catch (e: any) {
    throw new Error(e?.message || "Geçersiz denetim URL'si.");
  }

  const response = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inspectionUrl,
      siteUrl,
      languageCode: "tr",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`URL Denetimi başarısız oldu: ${errorText}`);
  }

  const data = await response.json();
  const indexResult = data.inspectionResult?.indexStatusResult || {};

  return {
    inspectionUrl,
    verdict: indexResult.verdict || "UNSPECIFIED",
    coverageState: indexResult.coverageState || "Bilinmiyor",
    indexingState: indexResult.indexingState || "Bilinmiyor",
    robotsTxtState: indexResult.robotsTxtState || "Bilinmiyor",
    userCanonical: indexResult.userCanonical || null,
    googleCanonical: indexResult.googleCanonical || null,
    lastCrawlTime: indexResult.lastCrawlTime || null,
    crawledAs: indexResult.crawledAs || null,
    pageFetchState: indexResult.pageFetchState || null,
    rawResponse: data,
  };
}

/**
 * Fetches Search Console Analytics preview (clicks, impressions, queries, top pages).
 */
export async function getSearchConsoleAnalyticsPreview(siteUrl: string): Promise<GscAnalyticsSummary> {
  const token = await getGoogleGrowthAccessToken();
  if (!token) {
    throw new Error("Google yetkilendirmesi bulunamadı.");
  }

  const encodedSite = encodeURIComponent(siteUrl);
  const now = new Date();
  const endDate = now.toISOString().slice(0, 10);
  const startDate = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Fetch Totals
  const totalsRes = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: [],
    }),
  });

  let clicks = 0;
  let impressions = 0;
  let ctr = 0;
  let position = 0;

  if (totalsRes.ok) {
    const totalsData = await totalsRes.json();
    const row = totalsData.rows?.[0];
    if (row) {
      clicks = row.clicks || 0;
      impressions = row.impressions || 0;
      ctr = row.ctr ? Math.round(row.ctr * 1000) / 10 : 0;
      position = row.position ? Math.round(row.position * 10) / 10 : 0;
    }
  }

  // Fetch Top Queries
  const queriesRes = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: ["query"],
      rowLimit: 5,
    }),
  });

  const topQueries: any[] = [];
  if (queriesRes.ok) {
    const qData = await queriesRes.json();
    for (const r of qData.rows || []) {
      topQueries.push({
        query: r.keys?.[0] || "",
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: r.ctr ? Math.round(r.ctr * 1000) / 10 : 0,
        position: r.position ? Math.round(r.position * 10) / 10 : 0,
      });
    }
  }

  // Fetch Top Pages
  const pagesRes = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: ["page"],
      rowLimit: 5,
    }),
  });

  const topPages: any[] = [];
  if (pagesRes.ok) {
    const pData = await pagesRes.json();
    for (const r of pData.rows || []) {
      topPages.push({
        page: r.keys?.[0] || "",
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: r.ctr ? Math.round(r.ctr * 1000) / 10 : 0,
        position: r.position ? Math.round(r.position * 10) / 10 : 0,
      });
    }
  }

  return {
    dateRange: `${startDate} - ${endDate}`,
    clicks,
    impressions,
    ctr,
    position,
    topQueries,
    topPages,
  };
}
