/**
 * SINEAI Growth & SEO — Centralized Callback & Redirect URL Resolution
 * 
 * Provides single-source-of-truth redirect URIs for Google, Bing, and Yandex OAuth integrations.
 * Ensures strict exact-match normalization (no trailing slashes, consistent protocol/domain).
 */

export const DEFAULT_PRODUCTION_APP_URL = "https://sineai.com.tr";

/**
 * Resolves the canonical base application URL without trailing slashes.
 */
export function getAppBaseUrl(): string {
  const envUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || DEFAULT_PRODUCTION_APP_URL;
  return envUrl.trim().replace(/\/+$/, "");
}

/**
 * Resolves the exact Google Growth OAuth authorized redirect URI.
 * Priority:
 * 1. Explicit GOOGLE_GROWTH_REDIRECT_URI environment variable
 * 2. Standard canonical path: {APP_BASE_URL}/api/admin/growth/google/callback
 */
export function getGoogleGrowthRedirectUri(): string {
  if (process.env.GOOGLE_GROWTH_REDIRECT_URI && process.env.GOOGLE_GROWTH_REDIRECT_URI.trim()) {
    return process.env.GOOGLE_GROWTH_REDIRECT_URI.trim().replace(/\/+$/, "");
  }
  return `${getAppBaseUrl()}/api/admin/growth/google/callback`;
}

/**
 * Resolves the exact Bing Webmaster OAuth authorized redirect URI.
 * Priority:
 * 1. Explicit BING_WEBMASTER_REDIRECT_URI environment variable
 * 2. Standard canonical path: {APP_BASE_URL}/api/admin/growth/bing/callback
 */
export function getBingGrowthRedirectUri(): string {
  if (process.env.BING_WEBMASTER_REDIRECT_URI && process.env.BING_WEBMASTER_REDIRECT_URI.trim()) {
    return process.env.BING_WEBMASTER_REDIRECT_URI.trim().replace(/\/+$/, "");
  }
  return `${getAppBaseUrl()}/api/admin/growth/bing/callback`;
}

/**
 * Resolves the exact Yandex Webmaster OAuth authorized redirect URI.
 * Priority:
 * 1. Explicit YANDEX_WEBMASTER_REDIRECT_URI environment variable
 * 2. Standard canonical path: {APP_BASE_URL}/api/admin/growth/yandex/callback
 */
export function getYandexGrowthRedirectUri(): string {
  if (process.env.YANDEX_WEBMASTER_REDIRECT_URI && process.env.YANDEX_WEBMASTER_REDIRECT_URI.trim()) {
    return process.env.YANDEX_WEBMASTER_REDIRECT_URI.trim().replace(/\/+$/, "");
  }
  return `${getAppBaseUrl()}/api/admin/growth/yandex/callback`;
}

export interface GrowthUrlsDiagnostics {
  appBaseUrl: string;
  isHttps: boolean;
  google: {
    redirectUri: string;
    source: "GOOGLE_GROWTH_REDIRECT_URI" | "APP_URL" | "NEXT_PUBLIC_APP_URL" | "DEFAULT_PRODUCTION";
    isOverride: boolean;
  };
  bing: {
    redirectUri: string;
    source: "BING_WEBMASTER_REDIRECT_URI" | "APP_URL" | "NEXT_PUBLIC_APP_URL" | "DEFAULT_PRODUCTION";
    isOverride: boolean;
  };
  yandex: {
    redirectUri: string;
    source: "YANDEX_WEBMASTER_REDIRECT_URI" | "APP_URL" | "NEXT_PUBLIC_APP_URL" | "DEFAULT_PRODUCTION";
    isOverride: boolean;
  };
}

/**
 * Returns diagnostic metadata for all provider redirect URIs.
 * Never exposes secrets or API keys.
 */
export function getGrowthUrlsDiagnostics(): GrowthUrlsDiagnostics {
  const appBaseUrl = getAppBaseUrl();
  const isHttps = appBaseUrl.startsWith("https://");

  const googleOverride = Boolean(process.env.GOOGLE_GROWTH_REDIRECT_URI?.trim());
  const bingOverride = Boolean(process.env.BING_WEBMASTER_REDIRECT_URI?.trim());
  const yandexOverride = Boolean(process.env.YANDEX_WEBMASTER_REDIRECT_URI?.trim());

  const getBaseSource = (): "APP_URL" | "NEXT_PUBLIC_APP_URL" | "DEFAULT_PRODUCTION" => {
    if (process.env.APP_URL?.trim()) return "APP_URL";
    if (process.env.NEXT_PUBLIC_APP_URL?.trim()) return "NEXT_PUBLIC_APP_URL";
    return "DEFAULT_PRODUCTION";
  };

  return {
    appBaseUrl,
    isHttps,
    google: {
      redirectUri: getGoogleGrowthRedirectUri(),
      source: googleOverride ? "GOOGLE_GROWTH_REDIRECT_URI" : getBaseSource(),
      isOverride: googleOverride,
    },
    bing: {
      redirectUri: getBingGrowthRedirectUri(),
      source: bingOverride ? "BING_WEBMASTER_REDIRECT_URI" : getBaseSource(),
      isOverride: bingOverride,
    },
    yandex: {
      redirectUri: getYandexGrowthRedirectUri(),
      source: yandexOverride ? "YANDEX_WEBMASTER_REDIRECT_URI" : getBaseSource(),
      isOverride: yandexOverride,
    },
  };
}
