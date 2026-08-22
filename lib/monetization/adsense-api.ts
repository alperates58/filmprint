import { db } from "@/lib/db/client";
import { getGoogleGrowthAccessToken } from "@/lib/growth/google/oauth";
import {
  AdSenseInventoryUnitSummary,
  AdSensePerformanceReportSummary,
  AdSensePolicyCenterSummary,
  AdSensePolicyIssue,
} from "./types";
import { CANONICAL_PLACEMENTS } from "./placements";

const ADSENSE_API_BASE = "https://adsense.googleapis.com/v2";

/**
 * Fetches accessible Google AdSense account ID.
 */
export async function getPrimaryAdSenseAccount(token: string): Promise<string | null> {
  try {
    const res = await fetch(`${ADSENSE_API_BASE}/accounts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const first = (data.accounts || [])[0];
    return first?.name || null; // e.g. "accounts/pub-1234567890123456"
  } catch {
    return null;
  }
}

/**
 * Synchronizes AdSense Ad Units from Google AdSense API into DB cache.
 * Note: Ad Unit create is a restricted API capability; this sync model
 * pulls provider-created units so admins can map them to SINEAI placements.
 */
export async function syncAdSenseInventoryFromApi(): Promise<{
  success: boolean;
  syncedCount: number;
  units: AdSenseInventoryUnitSummary[];
  error?: string;
}> {
  const token = await getGoogleGrowthAccessToken();
  if (!token) {
    return {
      success: false,
      syncedCount: 0,
      units: [],
      error: "Google hesabı bağlı değil veya AdSense erişim izni yok.",
    };
  }

  try {
    const accountName = await getPrimaryAdSenseAccount(token);
    if (!accountName) {
      return {
        success: false,
        syncedCount: 0,
        units: [],
        error: "Bu Google hesabında erişilebilir AdSense hesabı bulunamadı.",
      };
    }

    // 1. Fetch Ad Clients
    const adClientsRes = await fetch(`${ADSENSE_API_BASE}/${accountName}/adclients`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!adClientsRes.ok) {
      return {
        success: false,
        syncedCount: 0,
        units: [],
        error: "AdSense Ad Client listesi alınamadı.",
      };
    }

    const adClientsData = await adClientsRes.json();
    const adClients = adClientsData.adClients || [];
    const syncedUnits: AdSenseInventoryUnitSummary[] = [];

    for (const client of adClients) {
      const clientResourceName = client.name; // e.g. "accounts/pub-xxx/adclients/ca-pub-xxx"
      const adClientId = client.reportingDimensionId || clientResourceName.split("/").pop() || "";

      // 2. Fetch Ad Units for each Ad Client
      try {
        const unitsRes = await fetch(`${ADSENSE_API_BASE}/${clientResourceName}/adunits`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (unitsRes.ok) {
          const unitsData = await unitsRes.json();
          const adUnits = unitsData.adUnits || [];

          for (const u of adUnits) {
            const resourceName = u.name; // e.g. "accounts/pub-xxx/adclients/ca-pub-xxx/adunits/1234567890"
            const reportingId = u.reportingDimensionId || resourceName.split("/").pop() || null;
            const displayName = u.displayName || reportingId || "AdSense Unit";
            const state = u.state === "ARCHIVED" ? "ARCHIVED" : u.state === "ACTIVE" ? "ACTIVE" : "UNSPECIFIED";
            
            // Map contentAdsSettings type & size (do not assume top-level fields)
            const type = u.contentAdsSettings?.type || u.type || "DISPLAY";
            const size = u.contentAdsSettings?.size || u.size || "RESPONSIVE";

            const upserted = await db.adSenseInventoryUnit.upsert({
              where: { providerResourceName: resourceName },
              update: {
                reportingDimensionId: reportingId,
                displayName,
                state: state as any,
                type,
                size,
                adClientId,
                lastSyncedAt: new Date(),
              },
              create: {
                providerResourceName: resourceName,
                reportingDimensionId: reportingId,
                displayName,
                state: state as any,
                type,
                size,
                adClientId,
                lastSyncedAt: new Date(),
              },
            });

            syncedUnits.push({
              id: upserted.id,
              providerResourceName: upserted.providerResourceName,
              reportingDimensionId: upserted.reportingDimensionId,
              displayName: upserted.displayName,
              state: upserted.state as any,
              type: upserted.type,
              size: upserted.size,
              adClientId: upserted.adClientId,
              lastSyncedAt: upserted.lastSyncedAt.toISOString(),
            });
          }
        }
      } catch (unitErr) {
        console.warn(`[AdSense Sync] Failed fetching units for client ${clientResourceName}:`, unitErr);
      }
    }

    return {
      success: true,
      syncedCount: syncedUnits.length,
      units: syncedUnits,
    };
  } catch (err: any) {
    console.error("[AdSense Sync] Critical error:", err);
    return {
      success: false,
      syncedCount: 0,
      units: [],
      error: err?.message || "AdSense senkronizasyonu sırasında beklenmeyen bir hata oluştu.",
    };
  }
}

/**
 * Fetches AdSense Policy Center issues & alerts.
 */
export async function getAdSensePolicyCenter(): Promise<AdSensePolicyCenterSummary> {
  const token = await getGoogleGrowthAccessToken();
  const nowStr = new Date().toISOString();

  if (!token) {
    return {
      status: "HEALTHY",
      criticalCount: 0,
      warningCount: 0,
      issues: [],
      alerts: [],
      lastChecked: nowStr,
    };
  }

  try {
    const accountName = await getPrimaryAdSenseAccount(token);
    if (!accountName) {
      return {
        status: "HEALTHY",
        criticalCount: 0,
        warningCount: 0,
        issues: [],
        alerts: [],
        lastChecked: nowStr,
      };
    }

    // 1. Policy Issues
    const issues: AdSensePolicyIssue[] = [];
    try {
      const issuesRes = await fetch(`${ADSENSE_API_BASE}/${accountName}/policyIssues`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (issuesRes.ok) {
        const issuesData = await issuesRes.json();
        for (const item of issuesData.policyIssues || []) {
          issues.push({
            entity: item.entity || item.name || "Site",
            uri: item.uri || undefined,
            policyTopic: item.policyTopic?.displayName || item.policyTopic || "Policy Topic",
            severity: item.actionRequired ? "CRITICAL" : "WARNING",
            enforcementAction: item.enforcementActions?.[0]?.type || undefined,
            detectedDate: item.firstDetectedTime || undefined,
          });
        }
      }
    } catch {
      // Non-fatal
    }

    // 2. Alerts
    const alerts: { message: string; severity: string; type?: string }[] = [];
    try {
      const alertsRes = await fetch(`${ADSENSE_API_BASE}/${accountName}/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        for (const a of alertsData.alerts || []) {
          alerts.push({
            message: a.message || a.title || "AdSense Bildirimi",
            severity: a.severity || "INFO",
            type: a.type || undefined,
          });
        }
      }
    } catch {
      // Non-fatal
    }

    const criticalCount = issues.filter((i) => i.severity === "CRITICAL").length;
    const warningCount = issues.filter((i) => i.severity === "WARNING").length;
    const status = criticalCount > 0 ? "CRITICAL" : warningCount > 0 ? "WARNING" : "HEALTHY";

    return {
      status,
      criticalCount,
      warningCount,
      issues,
      alerts,
      lastChecked: nowStr,
    };
  } catch {
    return {
      status: "HEALTHY",
      criticalCount: 0,
      warningCount: 0,
      issues: [],
      alerts: [],
      lastChecked: nowStr,
    };
  }
}

/**
 * Fetches official AdSense performance reports with dimension mapping.
 * Uses official dimensions: DATE, AD_UNIT_ID.
 * Maps AD_UNIT_ID to AdSenseInventoryUnit.reportingDimensionId -> SINEAI AdPlacement.
 */
export async function getAdSensePerformanceReports(
  period: "today" | "yesterday" | "7d" | "28d" = "7d"
): Promise<AdSensePerformanceReportSummary> {
  const token = await getGoogleGrowthAccessToken();

  const emptyResult: AdSensePerformanceReportSummary = {
    period,
    currency: "TRY",
    metrics: {
      estimatedEarnings: 0,
      pageViews: 0,
      impressions: 0,
      clicks: 0,
      pageViewsRpm: 0,
      impressionRpm: 0,
      ctr: 0,
      cpc: 0,
    },
    placements: [],
  };

  if (!token) {
    return emptyResult;
  }

  try {
    const accountName = await getPrimaryAdSenseAccount(token);
    if (!accountName) return emptyResult;

    // Compute date ranges
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (period === "today") {
      startDate = new Date(now);
      endDate = new Date(now);
    } else if (period === "yesterday") {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      endDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (period === "7d") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = new Date(now);
    } else if (period === "28d") {
      startDate = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
      endDate = new Date(now);
    }

    const startYear = startDate.getUTCFullYear();
    const startMonth = startDate.getUTCMonth() + 1;
    const startDay = startDate.getUTCDate();

    const endYear = endDate.getUTCFullYear();
    const endMonth = endDate.getUTCMonth() + 1;
    const endDay = endDate.getUTCDate();

    const metricsParams = [
      "ESTIMATED_EARNINGS",
      "PAGE_VIEWS",
      "IMPRESSIONS",
      "CLICKS",
      "PAGE_VIEWS_RPM",
      "IMPRESSION_RPM",
      "CLICKS_CTR",
      "COST_PER_CLICK",
    ]
      .map((m) => `metrics=${m}`)
      .join("&");

    const dimensionsParams = "dimensions=DATE&dimensions=AD_UNIT_ID";

    const url = `${ADSENSE_API_BASE}/${accountName}/reports:generate?startDate.year=${startYear}&startDate.month=${startMonth}&startDate.day=${startDay}&endDate.year=${endYear}&endDate.month=${endMonth}&endDate.day=${endDay}&${metricsParams}&${dimensionsParams}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return emptyResult;
    }

    const data = await res.json();
    const headers = data.headers || [];
    const rows = data.rows || [];
    const totals = data.totals?.cells || [];

    // Find metric indices
    const headerMap = new Map<string, number>(headers.map((h: any, idx: number) => [h.name, idx]));
    const adUnitIdIdx = headerMap.get("AD_UNIT_ID") ?? 1;
    const earningsIdx = headerMap.get("ESTIMATED_EARNINGS") ?? 2;
    const pageViewsIdx = headerMap.get("PAGE_VIEWS") ?? 3;
    const impressionsIdx = headerMap.get("IMPRESSIONS") ?? 4;
    const clicksIdx = headerMap.get("CLICKS") ?? 5;
    const pageViewsRpmIdx = headerMap.get("PAGE_VIEWS_RPM") ?? 6;
    const impressionRpmIdx = headerMap.get("IMPRESSION_RPM") ?? 7;
    const ctrIdx = headerMap.get("CLICKS_CTR") ?? 8;
    const cpcIdx = headerMap.get("COST_PER_CLICK") ?? 9;

    let totalEarnings = 0;
    let totalPageViews = 0;
    let totalImpressions = 0;
    let totalClicks = 0;

    if (totals.length > 0) {
      totalEarnings = parseFloat(totals[earningsIdx]?.value || "0") || 0;
      totalPageViews = parseInt(totals[pageViewsIdx]?.value || "0", 10) || 0;
      totalImpressions = parseInt(totals[impressionsIdx]?.value || "0", 10) || 0;
      totalClicks = parseInt(totals[clicksIdx]?.value || "0", 10) || 0;
    }

    // Load active DB placements and mapped inventory units
    const dbPlacements = await db.adPlacement.findMany({
      include: { adUnit: true },
    });

    const reportingIdToPlacement = new Map<string, { key: string; name: string; surface: any }>();
    for (const p of dbPlacements) {
      if (p.adUnit?.reportingDimensionId) {
        reportingIdToPlacement.set(p.adUnit.reportingDimensionId, {
          key: p.key,
          name: p.name,
          surface: p.surface,
        });
      }
    }

    const placementMap = new Map<string, { revenue: number; impressions: number; clicks: number }>();

    for (const r of rows) {
      const cells = r.cells || [];
      const adUnitId = cells[adUnitIdIdx]?.value || "";
      const rev = parseFloat(cells[earningsIdx]?.value || "0") || 0;
      const imp = parseInt(cells[impressionsIdx]?.value || "0", 10) || 0;
      const clk = parseInt(cells[clicksIdx]?.value || "0", 10) || 0;

      const current = placementMap.get(adUnitId) || { revenue: 0, impressions: 0, clicks: 0 };
      placementMap.set(adUnitId, {
        revenue: current.revenue + rev,
        impressions: current.impressions + imp,
        clicks: current.clicks + clk,
      });
    }

    const mappedPlacements: any[] = [];
    for (const [adUnitId, pStats] of placementMap.entries()) {
      const matched = reportingIdToPlacement.get(adUnitId);
      const rpm = pStats.impressions > 0 ? (pStats.revenue / pStats.impressions) * 1000 : 0;
      const ctr = pStats.impressions > 0 ? (pStats.clicks / pStats.impressions) * 100 : 0;

      mappedPlacements.push({
        key: matched?.key || `unit_${adUnitId}`,
        name: matched?.name || `Ad Unit ${adUnitId}`,
        surface: matched?.surface || "GLOBAL",
        reportingDimensionId: adUnitId,
        revenue: Math.round(pStats.revenue * 100) / 100,
        impressions: pStats.impressions,
        rpm: Math.round(rpm * 100) / 100,
        clicks: pStats.clicks,
        ctr: Math.round(ctr * 100) / 100,
      });
    }

    const pageRpm = totalPageViews > 0 ? (totalEarnings / totalPageViews) * 1000 : 0;
    const impRpm = totalImpressions > 0 ? (totalEarnings / totalImpressions) * 1000 : 0;
    const overallCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const overallCpc = totalClicks > 0 ? totalEarnings / totalClicks : 0;

    return {
      period,
      currency: "TRY",
      metrics: {
        estimatedEarnings: Math.round(totalEarnings * 100) / 100,
        pageViews: totalPageViews,
        impressions: totalImpressions,
        clicks: totalClicks,
        pageViewsRpm: Math.round(pageRpm * 100) / 100,
        impressionRpm: Math.round(impRpm * 100) / 100,
        ctr: Math.round(overallCtr * 100) / 100,
        cpc: Math.round(overallCpc * 100) / 100,
      },
      placements: mappedPlacements,
    };
  } catch (err) {
    console.error("[AdSense Reports] Error generating report:", err);
    return emptyResult;
  }
}
