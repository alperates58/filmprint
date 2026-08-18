import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";
import { getSeoCatalogMetrics } from "@/lib/growth/seo/staged-rollout";
import { getIndexNowConfig } from "@/lib/growth/indexnow/service";
import { getSeoSystemConfig } from "@/lib/growth/settings";
import { GoogleIntegrationMetadata, BingIntegrationMetadata, YandexIntegrationMetadata } from "@/lib/growth/types";

export async function GET() {
  try {
    await requireAdminSession();

    const [metrics, indexNowConfig, seoConfig, googleSecret, bingSecret, yandexSecret] = await Promise.all([
      getSeoCatalogMetrics(),
      getIndexNowConfig(),
      getSeoSystemConfig(),
      db.integrationSecret.findUnique({ where: { provider: "google_growth" } }),
      db.integrationSecret.findUnique({ where: { provider: "bing_webmaster" } }),
      db.integrationSecret.findUnique({ where: { provider: "yandex_webmaster" } }),
    ]);

    const googleMeta = ((googleSecret?.metadata as Record<string, any>) || {}) as GoogleIntegrationMetadata;
    const isGoogleConnected = Boolean(googleSecret && googleSecret.encryptedValue);

    const bingMeta = ((bingSecret?.metadata as Record<string, any>) || {}) as BingIntegrationMetadata;
    const isBingConnected = Boolean(bingSecret && bingSecret.encryptedValue);

    const yandexMeta = ((yandexSecret?.metadata as Record<string, any>) || {}) as YandexIntegrationMetadata;
    const isYandexConnected = Boolean(yandexSecret && yandexSecret.encryptedValue);

    const monetizationReadiness = {
      adsenseConnected: isGoogleConnected && Boolean(googleMeta.adsenseConnected),
      adsenseSiteStatus: googleMeta.adsenseSite?.state || "NOT_DETECTED",
      adsTxtStatus: "PHASE_ID_PENDING",
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
          connected: isGoogleConnected,
          email: googleMeta.connectedEmail || null,
          gaProperty: googleMeta.gaProperty?.displayName || null,
          gscProperty: googleMeta.gscProperty || null,
          adsenseConnected: Boolean(googleMeta.adsenseConnected),
          lastSyncAt: googleMeta.lastSyncAt || null,
        },
        bing: {
          connected: isBingConnected,
          siteUrl: bingMeta.siteUrl || null,
          lastSyncAt: bingMeta.lastSyncAt || null,
        },
        yandex: {
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
