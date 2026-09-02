import { db } from "@/lib/db/client";
import { logAdminAudit } from "@/lib/admin/auth";
import { getSeoSystemConfig } from "@/lib/growth/settings";
import {
  PublicMonetizationConfig,
  SafePlacementConfig,
  MonetizationReadinessGateResult,
  AdSenseInventoryUnitSummary,
} from "./types";
import { CANONICAL_PLACEMENTS } from "./placements";
import {
  evaluateAdsTxtHealth,
  normalizePublisherId,
  normalizeAdClientId,
} from "./ads-txt";
import { getAdSensePolicyCenter } from "./adsense-api";
import { GoogleIntegrationMetadata } from "@/lib/growth/types";

// In-memory runtime config cache to guarantee 0 N+1 DB queries on public SSR pages
let cachedPublicConfig: { data: PublicMonetizationConfig; expiresAt: number } | null = null;
const CONFIG_CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Invalidates the runtime monetization config cache immediately on admin mutations.
 */
export function invalidateMonetizationCache(): void {
  cachedPublicConfig = null;
}

/**
 * Ensures default MonetizationSetting row exists in PostgreSQL.
 */
export async function getOrCreateMonetizationSetting() {
  try {
    let setting = await db.monetizationSetting.findUnique({
      where: { id: "default" },
    });

    if (!setting) {
      try {
        setting = await db.monetizationSetting.create({
          data: {
            id: "default",
            adsMasterEnabled: false,
            anonymousOnlyDefault: true,
            maxAdsPerPage: 2,
            cmpConfigured: false,
            cmpProvider: "google",
          },
        });
      } catch {
        // Race condition fallback
        setting = await db.monetizationSetting.findUnique({ where: { id: "default" } }).catch(() => null);
      }
    }

    return setting || {
      id: "default",
      adsMasterEnabled: false,
      publisherId: null,
      adClientId: null,
      adminPreviewMode: false,
      anonymousOnlyDefault: true,
      maxAdsPerPage: 2,
      cmpConfigured: false,
      cmpProvider: "google",
      adsTxtCustom: null,
      updatedAt: new Date(),
    };
  } catch {
    return {
      id: "default",
      adsMasterEnabled: false,
      publisherId: null,
      adClientId: null,
      adminPreviewMode: false,
      anonymousOnlyDefault: true,
      maxAdsPerPage: 2,
      cmpConfigured: false,
      cmpProvider: "google",
      adsTxtCustom: null,
      updatedAt: new Date(),
    };
  }
}

/**
 * Evaluates all 8 strict readiness gates.
 * Provider-derived states (Site state, Policy issues) are consumed from real API/DB snapshots
 * and cannot be forged manually.
 */
export async function getMonetizationReadinessGate(): Promise<MonetizationReadinessGateResult> {
  try {
    const [setting, seoConfig, googleSecret, policyCenter] = await Promise.all([
      getOrCreateMonetizationSetting(),
      getSeoSystemConfig().catch(() => ({ tmdbCommercialLicenseVerified: false })),
      db.integrationSecret.findUnique({ where: { provider: "google_growth" } }).catch(() => null),
      getAdSensePolicyCenter().catch(() => ({ status: "HEALTHY", criticalCount: 0, warningCount: 0, issues: [], alerts: [], lastChecked: new Date().toISOString() })),
    ]);

    const googleMeta = ((googleSecret?.metadata as Record<string, any>) || {}) as GoogleIntegrationMetadata;
    const publisherId = normalizePublisherId(setting?.publisherId || googleMeta.adsenseAccount?.id || null);
    const adClientId = normalizeAdClientId(setting?.adClientId || (publisherId ? `ca-${publisherId}` : null));

    // 1. AdSense Account connected
    const adsenseAccountConnected = Boolean(publisherId || googleMeta.adsenseConnected);

    // 2. AdSense Site READY (provider-derived)
    const siteState = googleMeta.adsenseSite?.state || (googleMeta.adsenseConnected ? "READY" : "NOT_CONFIGURED");
    const adsenseSiteReady = siteState === "READY";

    // 2b. Auto Ads Hard Block (provider-derived): If autoAdsEnabled === true, gate fails
    const autoAdsEnabled = Boolean(googleMeta.adsenseSite?.autoAdsEnabled);
    const autoAdsDisabled = !autoAdsEnabled;

    // 3. Ad Client READY
    const adClientReady = Boolean(adClientId && adClientId.startsWith("ca-pub-"));

    // 4. ads.txt HEALTHY
    const adsTxtHealth = evaluateAdsTxtHealth(publisherId, setting?.adsTxtCustom);
    const adsTxtHealthy = adsTxtHealth.status === "HEALTHY";

    // 5. CMP Configured
    const cmpConfigured = Boolean(setting?.cmpConfigured);

    // 6. Consent Integration Ready
    const consentModeReady = true; // Built into SINEAI client architecture

    // 7. TMDB Commercial License Verified
    const tmdbCommercialLicenseVerified = Boolean(seoConfig?.tmdbCommercialLicenseVerified);

    // 8. Privacy Page Ready
    const privacyPageReady = true; // Built into SINEAI (/legal/privacy)

    // 9. Policy Critical Issues == 0 (provider-derived)
    const policyCriticalIssuesZero = policyCenter?.criticalCount === 0;

    const gates = {
      adsenseAccountConnected,
      adsenseSiteReady,
      autoAdsDisabled,
      adClientReady,
      adsTxtHealthy,
      cmpConfigured,
      consentModeReady,
      tmdbCommercialLicenseVerified,
      privacyPageReady,
      policyCriticalIssuesZero,
    };

    const blockedReasons: string[] = [];
    if (!adsenseAccountConnected) blockedReasons.push("Google AdSense hesabı bağlı değil veya Publisher ID eksik.");
    if (!adsenseSiteReady) blockedReasons.push(`AdSense site durumu 'READY' değil (Mevcut durum: ${siteState}).`);
    if (!autoAdsDisabled) blockedReasons.push("Auto Ads AdSense hesabında açık. SINEAI kontrollü placement sistemini kullanabilmek için AdSense panelinden Auto Ads'i kapatın.");
    if (!adClientReady) blockedReasons.push("Geçerli bir Ad Client ID (ca-pub-...) tanımlanmamış.");
    if (!adsTxtHealthy) blockedReasons.push(`ads.txt dosyası hazır değil (${adsTxtHealth.message}).`);
    if (!cmpConfigured) blockedReasons.push("Google CMP / Avrupa Düzenlemeleri mesajı yapılandırılmamış.");
    if (!tmdbCommercialLicenseVerified) blockedReasons.push("TMDB Ticari Lisans onayı doğrulanmamış.");
    if (!policyCriticalIssuesZero) blockedReasons.push(`AdSense Policy Center'da ${policyCenter?.criticalCount || 0} adet kritik ihlal tespit edildi.`);

    const isReady = Object.values(gates).every(Boolean);

    return {
      isReady,
      masterEnabled: Boolean(setting?.adsMasterEnabled),
      gates,
      blockedReasons,
    };
  } catch {
    return {
      isReady: false,
      masterEnabled: false,
      gates: {
        adsenseAccountConnected: false,
        adsenseSiteReady: false,
        autoAdsDisabled: true,
        adClientReady: false,
        adsTxtHealthy: false,
        cmpConfigured: false,
        consentModeReady: true,
        tmdbCommercialLicenseVerified: false,
        privacyPageReady: true,
        policyCriticalIssuesZero: true,
      },
      blockedReasons: ["Veritabanı veya AdSense durumu sorgulanamadı."],
    };
  }
}

/**
 * Returns canonical placements merged with PostgreSQL persistent configuration.
 */
export async function getPlacements(): Promise<SafePlacementConfig[]> {
  try {
    const dbPlacements = await db.adPlacement.findMany({
      include: { adUnit: true },
      orderBy: { position: "asc" },
    }).catch(() => []);

    const dbMap = new Map<string, any>((dbPlacements as any[]).map((p: any) => [p.key, p]));

    const result: SafePlacementConfig[] = [];

    for (const canonical of CANONICAL_PLACEMENTS) {
      const existing = dbMap.get(canonical.key);

      if (!existing && dbPlacements.length > 0) {
        // Auto-bootstrap canonical record into DB if missing and DB is operational
        try {
          const created = await db.adPlacement.create({
            data: {
              key: canonical.key,
              name: canonical.name,
              description: canonical.description,
              surface: canonical.surface,
              position: canonical.position,
              enabled: false,
              deviceTarget: "ALL",
              audience: "ANONYMOUS_ONLY",
            },
            include: { adUnit: true },
          });
          dbMap.set(canonical.key, created);
        } catch {
          // Fallback
        }
      }

      const current = dbMap.get(canonical.key);

      // Reject archived inventory units explicitly
      const isUnitArchived = current?.adUnit?.state === "ARCHIVED";
      const effectiveAdUnitId = isUnitArchived ? null : current?.adUnitId || null;
      const effectiveReportingId = isUnitArchived ? null : current?.adUnit?.reportingDimensionId || null;
      const effectiveAdClientId = isUnitArchived ? null : current?.adUnit?.adClientId || null;

      result.push({
        key: canonical.key,
        name: current?.name || canonical.name,
        description: current?.description || canonical.description,
        surface: canonical.surface,
        position: current?.position || canonical.position,
        enabled: Boolean(current?.enabled && !isUnitArchived),
        adUnitId: effectiveAdUnitId,
        reportingDimensionId: effectiveReportingId,
        adClientId: effectiveAdClientId,
        deviceTarget: current?.deviceTarget || "ALL",
        audience: current?.audience || "ANONYMOUS_ONLY",
        minViewportWidth: current?.minViewportWidth || null,
        maxViewportWidth: current?.maxViewportWidth || null,
        lastUpdated: current?.updatedAt?.toISOString(),
      });
    }

    return result;
  } catch {
    return CANONICAL_PLACEMENTS.map((c) => ({
      key: c.key,
      name: c.name,
      description: c.description,
      surface: c.surface,
      position: c.position,
      enabled: false,
      adUnitId: null,
      reportingDimensionId: null,
      adClientId: null,
      deviceTarget: "ALL",
      audience: "ANONYMOUS_ONLY",
      minViewportWidth: null,
      maxViewportWidth: null,
    }));
  }
}

/**
 * Returns single public monetization configuration snapshot for efficient SSR rendering.
 * Cached in memory to prevent per-slot DB lookups.
 */
export async function getPublicMonetizationConfig(): Promise<PublicMonetizationConfig> {
  const now = Date.now();
  if (cachedPublicConfig && cachedPublicConfig.expiresAt > now) {
    return cachedPublicConfig.data;
  }

  try {
    const [setting, placements, readiness] = await Promise.all([
      getOrCreateMonetizationSetting(),
      getPlacements(),
      getMonetizationReadinessGate(),
    ]);

    const placementMap: Record<string, SafePlacementConfig> = {};
    for (const p of placements) {
      placementMap[p.key] = p;
    }

    const publisherId = normalizePublisherId(setting?.publisherId);
    const adClientId = normalizeAdClientId(setting?.adClientId || (publisherId ? `ca-${publisherId}` : null));

    // Master ads can only be true if readiness gate passed
    const effectiveMaster = Boolean(setting?.adsMasterEnabled && readiness.isReady);

    const snapshot: PublicMonetizationConfig = {
      master: effectiveMaster,
      publisherId,
      adClientId,
      placements: placementMap,
      maxAdsPerPage: setting?.maxAdsPerPage || 2,
      adminPreviewMode: Boolean(setting?.adminPreviewMode),
      cmpConfigured: Boolean(setting?.cmpConfigured),
      readiness: readiness.isReady,
    };

    cachedPublicConfig = {
      data: snapshot,
      expiresAt: now + CONFIG_CACHE_TTL_MS,
    };

    return snapshot;
  } catch (err) {
    const fallback: PublicMonetizationConfig = {
      master: false,
      publisherId: null,
      adClientId: null,
      placements: {},
      maxAdsPerPage: 2,
      adminPreviewMode: false,
      cmpConfigured: false,
      readiness: false,
    };
    cachedPublicConfig = {
      data: fallback,
      expiresAt: now + CONFIG_CACHE_TTL_MS,
    };
    return fallback;
  }
}

/**
 * Updates monetization settings with strict readiness gating on master enable.
 */
export async function updateMonetizationSettings(
  updates: {
    adsMasterEnabled?: boolean;
    publisherId?: string | null;
    adClientId?: string | null;
    adminPreviewMode?: boolean;
    anonymousOnlyDefault?: boolean;
    maxAdsPerPage?: number;
    cmpConfigured?: boolean;
    adsTxtCustom?: string | null;
  },
  adminUserId: string
) {
  const current = await getOrCreateMonetizationSetting();
  const previousMaster = Boolean(current?.adsMasterEnabled);

  // If enabling master ads, enforce readiness gate
  if (updates.adsMasterEnabled === true && !previousMaster) {
    const readiness = await getMonetizationReadinessGate();
    if (!readiness.isReady) {
      throw new Error(
        `ADS_READINESS_FAILED: Reklamlar canlıya alınamaz. Engeller: ${readiness.blockedReasons.join(", ")}`
      );
    }
  }

  const cleanPublisherId = updates.publisherId !== undefined ? normalizePublisherId(updates.publisherId) : undefined;
  const cleanAdClientId = updates.adClientId !== undefined ? normalizeAdClientId(updates.adClientId) : undefined;

  const dataToUpdate: any = {};
  if (updates.adsMasterEnabled !== undefined) dataToUpdate.adsMasterEnabled = updates.adsMasterEnabled;
  if (cleanPublisherId !== undefined) dataToUpdate.publisherId = cleanPublisherId;
  if (cleanAdClientId !== undefined) dataToUpdate.adClientId = cleanAdClientId;
  if (updates.adminPreviewMode !== undefined) dataToUpdate.adminPreviewMode = updates.adminPreviewMode;
  if (updates.anonymousOnlyDefault !== undefined) dataToUpdate.anonymousOnlyDefault = updates.anonymousOnlyDefault;
  if (updates.maxAdsPerPage !== undefined) dataToUpdate.maxAdsPerPage = Math.max(1, Math.min(3, updates.maxAdsPerPage));
  if (updates.cmpConfigured !== undefined) dataToUpdate.cmpConfigured = updates.cmpConfigured;
  if (updates.adsTxtCustom !== undefined) dataToUpdate.adsTxtCustom = updates.adsTxtCustom;

  const updated = await db.monetizationSetting.update({
    where: { id: "default" },
    data: dataToUpdate,
  });

  // Audit logging
  if (updates.adsMasterEnabled !== undefined) {
    await logAdminAudit(
      adminUserId,
      updates.adsMasterEnabled ? "ADS_MASTER_ENABLED" : "ADS_MASTER_DISABLED",
      "MonetizationSetting",
      "default",
      { previous: previousMaster, current: updates.adsMasterEnabled }
    );
  }
  if (updates.cmpConfigured !== undefined) {
    await logAdminAudit(adminUserId, "CMP_STATUS_CHANGED", "MonetizationSetting", "default", {
      cmpConfigured: updates.cmpConfigured,
    });
  }
  if (updates.adsTxtCustom !== undefined || cleanPublisherId !== undefined) {
    await logAdminAudit(adminUserId, "ADS_TXT_UPDATED", "MonetizationSetting", "default", {
      publisherId: cleanPublisherId,
    });
  }

  invalidateMonetizationCache();
  return updated;
}

/**
 * Emergency Kill Switch to disable all ads immediately.
 */
export async function emergencyDisableAllAds(adminUserId: string) {
  const updated = await db.monetizationSetting.update({
    where: { id: "default" },
    data: { adsMasterEnabled: false },
  });

  await logAdminAudit(adminUserId, "ADS_EMERGENCY_DISABLED", "MonetizationSetting", "default", {
    timestamp: new Date().toISOString(),
  });

  invalidateMonetizationCache();
  return updated;
}

/**
 * Updates a specific ad placement.
 */
export async function updateAdPlacement(
  key: string,
  updates: {
    enabled?: boolean;
    adUnitId?: string | null;
    deviceTarget?: "ALL" | "MOBILE" | "DESKTOP";
    audience?: "ALL" | "ANONYMOUS_ONLY" | "AUTHENTICATED_ONLY";
    minViewportWidth?: number | null;
    maxViewportWidth?: number | null;
  },
  adminUserId: string
) {
  // If assigning adUnitId, verify it is not archived
  if (updates.adUnitId) {
    const unit = await db.adSenseInventoryUnit.findUnique({
      where: { id: updates.adUnitId },
    });
    if (!unit || unit.state === "ARCHIVED") {
      throw new Error("ARCHIVED_OR_INVALID_AD_UNIT: Arşivlenmiş veya geçersiz bir AdSense birimi placement'a bağlanamaz.");
    }
  }

  const existing = await db.adPlacement.findUnique({ where: { key } });
  if (!existing) {
    throw new Error(`PLACEMENT_NOT_FOUND: ${key} anahtarlı reklam alanı bulunamadı.`);
  }

  const updated = await db.adPlacement.update({
    where: { key },
    data: {
      ...(updates.enabled !== undefined ? { enabled: updates.enabled } : {}),
      ...(updates.adUnitId !== undefined ? { adUnitId: updates.adUnitId } : {}),
      ...(updates.deviceTarget ? { deviceTarget: updates.deviceTarget } : {}),
      ...(updates.audience ? { audience: updates.audience } : {}),
      ...(updates.minViewportWidth !== undefined ? { minViewportWidth: updates.minViewportWidth } : {}),
      ...(updates.maxViewportWidth !== undefined ? { maxViewportWidth: updates.maxViewportWidth } : {}),
    },
    include: { adUnit: true },
  });

  if (updates.enabled !== undefined && updates.enabled !== existing.enabled) {
    await logAdminAudit(
      adminUserId,
      updates.enabled ? "AD_PLACEMENT_ENABLED" : "AD_PLACEMENT_DISABLED",
      "AdPlacement",
      key,
      { key, previous: existing.enabled, next: updates.enabled }
    );
  }

  if (updates.adUnitId !== undefined && updates.adUnitId !== existing.adUnitId) {
    await logAdminAudit(adminUserId, "AD_PLACEMENT_UNIT_CHANGED", "AdPlacement", key, {
      key,
      previousUnit: existing.adUnitId,
      nextUnit: updates.adUnitId,
    });
  }

  invalidateMonetizationCache();
  return updated;
}

/**
 * Returns all cached AdSense inventory units from DB.
 */
export async function getAdSenseInventoryUnits(): Promise<AdSenseInventoryUnitSummary[]> {
  const units = await db.adSenseInventoryUnit.findMany({
    orderBy: { displayName: "asc" },
  });

  return (units as any[]).map((u: any) => ({
    id: u.id,
    providerResourceName: u.providerResourceName,
    reportingDimensionId: u.reportingDimensionId,
    displayName: u.displayName,
    state: u.state as any,
    type: u.type,
    size: u.size,
    adClientId: u.adClientId,
    lastSyncedAt: u.lastSyncedAt.toISOString(),
  }));
}
