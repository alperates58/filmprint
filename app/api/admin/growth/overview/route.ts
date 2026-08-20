import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";
import { getSeoCatalogMetrics } from "@/lib/growth/seo/staged-rollout";
import { getIndexNowConfig } from "@/lib/growth/indexnow/service";
import { getSeoSystemConfig } from "@/lib/growth/settings";
import { GoogleIntegrationMetadata, BingIntegrationMetadata, YandexIntegrationMetadata } from "@/lib/growth/types";
import { getGrowthUrlsDiagnostics } from "@/lib/growth/urls";
import { getGoogleGrowthConfig } from "@/lib/growth/google/oauth";
import { getBingGrowthConfig } from "@/lib/growth/bing/oauth";
import { getYandexGrowthConfig } from "@/lib/growth/yandex/oauth";
import { getAdSenseSettings } from "@/lib/growth/credentials";

export async function GET() {
  try {
    await requireAdminSession();

    const [
      metrics,
      indexNowConfig,
      seoConfig,
      googleSecret,
      bingSecret,
      yandexSecret,
      googleConfig,
      bingConfig,
      yandexConfig,
      adsenseSettings,
    ] = await Promise.all([
      getSeoCatalogMetrics(),
      getIndexNowConfig(),
      getSeoSystemConfig(),
      db.integrationSecret.findUnique({ where: { provider: "google_growth" } }),
      db.integrationSecret.findUnique({ where: { provider: "bing_webmaster" } }),
      db.integrationSecret.findUnique({ where: { provider: "yandex_webmaster" } }),
      getGoogleGrowthConfig(),
      getBingGrowthConfig(),
      getYandexGrowthConfig(),
      getAdSenseSettings(),
    ]);

    const urlDiagnostics = getGrowthUrlsDiagnostics();

    const googleMeta = ((googleSecret?.metadata as Record<string, any>) || {}) as GoogleIntegrationMetadata;
    const isGoogleConnected = Boolean(
      (googleSecret && (googleSecret.encryptedValue || googleMeta.connectedEmail || googleMeta.gscProperty || googleMeta.gaProperty)) ||
      seoConfig.gaMeasurementId ||
      seoConfig.googleVerificationMeta
    );
    const googleStatus: "CONNECTED" | "READY" | "SETUP_REQUIRED" = isGoogleConnected
      ? "CONNECTED"
      : googleConfig.isConfigured
      ? "READY"
      : "SETUP_REQUIRED";

    const bingMeta = ((bingSecret?.metadata as Record<string, any>) || {}) as BingIntegrationMetadata;
    const isBingConnected = Boolean(bingSecret && bingSecret.encryptedValue);
    const bingStatus: "CONNECTED" | "READY" | "SETUP_REQUIRED" = isBingConnected
      ? "CONNECTED"
      : bingConfig.isConfigured
      ? "READY"
      : "SETUP_REQUIRED";

    const yandexMeta = ((yandexSecret?.metadata as Record<string, any>) || {}) as YandexIntegrationMetadata;
    const isYandexConnected = Boolean(yandexSecret && yandexSecret.encryptedValue);
    const yandexStatus: "CONNECTED" | "READY" | "SETUP_REQUIRED" = isYandexConnected
      ? "CONNECTED"
      : yandexConfig.isConfigured
      ? "READY"
      : "SETUP_REQUIRED";

    const monetizationReadiness = {
      adsenseConnected: isGoogleConnected && Boolean(googleMeta.adsenseConnected || adsenseSettings.publisherId),
      adsenseSiteStatus: googleMeta.adsenseSite?.state || (adsenseSettings.publisherId ? "READY" : "NOT_DETECTED"),
      adsTxtStatus: adsenseSettings.adsTxt ? "CONFIGURED" : "PHASE_ID_PENDING",
      cmpStatus: "PHASE_ID_PENDING",
      consentModeReady: true,
      tmdbCommercialLicenseVerified: Boolean(seoConfig.tmdbCommercialLicenseVerified),
      privacyPageReady: true,
      adsMasterEnabled: false, // Strictly false in Phase I-A/I-B
    };

    return NextResponse.json({
      metrics,
      seoConfig,
      monetizationReadiness,
      providers: {
        google: {
          status: googleStatus,
          connected: isGoogleConnected,
          email: googleMeta.connectedEmail || null,
          gaProperty: googleMeta.gaProperty?.displayName || null,
          gscProperty: googleMeta.gscProperty || null,
          adsenseConnected: Boolean(googleMeta.adsenseConnected),
          lastSyncAt: googleMeta.lastSyncAt || null,
        },
        bing: {
          status: bingStatus,
          connected: isBingConnected,
          siteUrl: bingMeta.siteUrl || null,
          lastSyncAt: bingMeta.lastSyncAt || null,
        },
        yandex: {
          status: yandexStatus,
          connected: isYandexConnected,
          login: yandexMeta.connectedLogin || null,
          hostUrl: yandexMeta.hostUrl || null,
          lastSyncAt: yandexMeta.lastSyncAt || null,
        },
        indexnow: {
          enabled: indexNowConfig.enabled,
          totalSubmissions: indexNowConfig.totalSubmissions,
          lastStatus: indexNowConfig.lastStatus,
          lastSubmittedAt: indexNowConfig.lastSubmittedAt,
          key: indexNowConfig.key,
          keyLocation: indexNowConfig.keyLocation,
        },
      },
      diagnostics: {
        urls: urlDiagnostics,
        encryptionKeyConfigured: Boolean(process.env.MASTER_ENCRYPTION_KEY?.trim() || process.env.GROWTH_ENCRYPTION_KEY?.trim()),
        google: {
          status: googleStatus,
          clientIdConfigured: Boolean(googleConfig.clientId),
          clientSecretConfigured: Boolean(googleConfig.clientSecret),
          clientIdMasked: googleConfig.clientIdMasked,
          clientSecretMasked: googleConfig.clientSecretMasked,
          source: googleConfig.source,
          redirectUri: googleConfig.redirectUri,
        },
        bing: {
          status: bingStatus,
          clientIdConfigured: Boolean(bingConfig.clientId),
          clientSecretConfigured: Boolean(bingConfig.clientSecret),
          clientIdMasked: bingConfig.clientIdMasked,
          clientSecretMasked: bingConfig.clientSecretMasked,
          source: bingConfig.source,
          redirectUri: bingConfig.redirectUri,
        },
        yandex: {
          status: yandexStatus,
          clientIdConfigured: Boolean(yandexConfig.clientId),
          clientSecretConfigured: Boolean(yandexConfig.clientSecret),
          clientIdMasked: yandexConfig.clientIdMasked,
          clientSecretMasked: yandexConfig.clientSecretMasked,
          source: yandexConfig.source,
          redirectUri: yandexConfig.redirectUri,
        },
        adsense: {
          publisherId: adsenseSettings.publisherId,
          adsTxt: adsenseSettings.adsTxt,
          autoAdsEnabled: adsenseSettings.autoAdsEnabled,
        },
      },
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[GET /api/admin/growth/overview] Error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
