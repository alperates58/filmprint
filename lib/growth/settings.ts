import { db } from "@/lib/db/client";
import { SeoSystemConfig } from "./types";

/**
 * Default SEO & Growth configuration values (Safe defaults: disabled until admin explicitly enables).
 */
export const DEFAULT_SEO_CONFIG: SeoSystemConfig = {
  seoMasterEnabled: false,
  movieIndexingEnabled: false,
  tvIndexingEnabled: false,
  movieMaxIndexed: 5000,
  tvMaxIndexed: 2000,
  googleVerificationMeta: "",
  bingVerificationMeta: "",
  yandexVerificationMeta: "",
  gaMeasurementId: "",
  gaTrackingEnabled: false,
  tmdbCommercialLicenseVerified: false,
};

/**
 * Safe guard for Next.js build phase or isolated environment without DATABASE_URL.
 */
export function isBuildPhaseOrDbUnavailable(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    (!process.env.DATABASE_URL?.trim() && process.env.NODE_ENV !== "test")
  );
}

/**
 * Loads current SEO & Growth system settings from PostgreSQL.
 */
export async function getSeoSystemConfig(): Promise<SeoSystemConfig> {
  if (isBuildPhaseOrDbUnavailable()) {
    return DEFAULT_SEO_CONFIG;
  }

  try {
    const records = await db.systemSetting.findMany({
      where: {
        key: {
          in: [
            "seo_master_enabled",
            "seo_movie_indexing_enabled",
            "seo_tv_indexing_enabled",
            "seo_movie_max_indexed",
            "seo_tv_max_indexed",
            "google_site_verification",
            "bing_site_verification",
            "yandex_site_verification",
            "ga_measurement_id",
            "ga_tracking_enabled",
            "tmdb_commercial_license_verified",
          ],
        },
      },
    });

    const map = new Map<string, string>(records.map((r: any) => [r.key, String(r.value)]));

    const movieMax = parseInt(map.get("seo_movie_max_indexed") || "5000", 10);
    const tvMax = parseInt(map.get("seo_tv_max_indexed") || "2000", 10);

    return {
      seoMasterEnabled: map.get("seo_master_enabled") === "true",
      movieIndexingEnabled: map.get("seo_movie_indexing_enabled") === "true",
      tvIndexingEnabled: map.get("seo_tv_indexing_enabled") === "true",
      movieMaxIndexed: isNaN(movieMax) || movieMax <= 0 ? 5000 : movieMax,
      tvMaxIndexed: isNaN(tvMax) || tvMax <= 0 ? 2000 : tvMax,
      googleVerificationMeta: map.get("google_site_verification") || "",
      bingVerificationMeta: map.get("bing_site_verification") || "",
      yandexVerificationMeta: map.get("yandex_site_verification") || "",
      gaMeasurementId: map.get("ga_measurement_id") || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "",
      gaTrackingEnabled: map.get("ga_tracking_enabled") === "true",
      tmdbCommercialLicenseVerified: map.get("tmdb_commercial_license_verified") === "true",
    };
  } catch (error) {
    console.error("[SEO Settings] Error reading settings from DB, using safe defaults:", error);
    return DEFAULT_SEO_CONFIG;
  }
}

/**
 * Updates SEO & Growth system settings in PostgreSQL.
 */
export async function updateSeoSystemConfig(
  updates: Partial<SeoSystemConfig>
): Promise<SeoSystemConfig> {
  const entries: { key: string; value: string }[] = [];

  if (updates.seoMasterEnabled !== undefined) {
    entries.push({ key: "seo_master_enabled", value: String(updates.seoMasterEnabled) });
  }
  if (updates.movieIndexingEnabled !== undefined) {
    entries.push({ key: "seo_movie_indexing_enabled", value: String(updates.movieIndexingEnabled) });
  }
  if (updates.tvIndexingEnabled !== undefined) {
    entries.push({ key: "seo_tv_indexing_enabled", value: String(updates.tvIndexingEnabled) });
  }
  if (updates.movieMaxIndexed !== undefined) {
    entries.push({ key: "seo_movie_max_indexed", value: String(updates.movieMaxIndexed) });
  }
  if (updates.tvMaxIndexed !== undefined) {
    entries.push({ key: "seo_tv_max_indexed", value: String(updates.tvMaxIndexed) });
  }
  if (updates.googleVerificationMeta !== undefined) {
    entries.push({ key: "google_site_verification", value: updates.googleVerificationMeta.trim() });
  }
  if (updates.bingVerificationMeta !== undefined) {
    entries.push({ key: "bing_site_verification", value: updates.bingVerificationMeta.trim() });
  }
  if (updates.yandexVerificationMeta !== undefined) {
    entries.push({ key: "yandex_site_verification", value: updates.yandexVerificationMeta.trim() });
  }
  if (updates.gaMeasurementId !== undefined) {
    entries.push({ key: "ga_measurement_id", value: updates.gaMeasurementId.trim() });
  }
  if (updates.gaTrackingEnabled !== undefined) {
    entries.push({ key: "ga_tracking_enabled", value: String(updates.gaTrackingEnabled) });
  }
  if (updates.tmdbCommercialLicenseVerified !== undefined) {
    entries.push({ key: "tmdb_commercial_license_verified", value: String(updates.tmdbCommercialLicenseVerified) });
  }

  for (const entry of entries) {
    await db.systemSetting.upsert({
      where: { key: entry.key },
      update: { value: entry.value },
      create: { key: entry.key, value: entry.value },
    });
  }

  return getSeoSystemConfig();
}

export const saveSeoSystemConfig = updateSeoSystemConfig;

export async function updateSeoSystemSetting(key: string, value: string): Promise<void> {
  await db.systemSetting.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  });
}
