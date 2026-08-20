import { db } from "@/lib/db/client";
import { encryptSecret, decryptSecret } from "@/lib/security/crypto";

export type GrowthProviderType = "google" | "bing" | "yandex";

export interface GrowthCredentialInfo {
  provider: GrowthProviderType;
  clientId: string;
  clientSecret: string;
  isConfigured: boolean;
  clientIdMasked: string | null;
  clientSecretMasked: string | null;
  source: "database" | "environment" | "none";
}

// In-memory cache for synchronous fallback during high-speed checks & tests
const credentialsCache: Record<string, { clientId: string; clientSecret: string; source: "database" | "environment" | "none"; cachedAt: number }> = {};

function maskString(str?: string | null): string | null {
  if (!str || !str.trim()) return null;
  const trimmed = str.trim();
  if (trimmed.length <= 4) return "••••";
  if (trimmed.length <= 8) return `••••${trimmed.slice(-4)}`;
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
}

function maskSecret(str?: string | null): string | null {
  if (!str || !str.trim()) return null;
  return "••••••••";
}

/**
 * Safely decrypts a stored secret, handling plain strings, legacy, or versioned AES-256 ciphertexts.
 */
function safelyDecryptSecret(rawVal?: string | null): string {
  if (!rawVal || !rawVal.trim()) return "";
  const trimmed = rawVal.trim();
  if (trimmed.startsWith("v1:") || (trimmed.includes(":") && trimmed.length > 32)) {
    try {
      return decryptSecret(trimmed);
    } catch {
      return trimmed; // fallback if stored unencrypted
    }
  }
  return trimmed;
}

/**
 * Reads growth credentials for a provider with DB > Env > None priority.
 */
export async function getGrowthCredential(provider: GrowthProviderType): Promise<GrowthCredentialInfo> {
  let dbClientId = "";
  let dbClientSecret = "";

  try {
    const records = await db.systemSetting.findMany({
      where: {
        key: {
          in: [
            `${provider}_webmaster_client_id`,
            `${provider}_growth_client_id`,
            `${provider}_client_id`,
            `${provider}_webmaster_client_secret`,
            `${provider}_growth_client_secret`,
            `${provider}_client_secret`,
          ],
        },
      },
    });

    const map = new Map<string, string>(records.map((r: any) => [r.key, String(r.value)]));

    if (provider === "google") {
      dbClientId = map.get("google_growth_client_id") || map.get("google_client_id") || "";
      dbClientSecret = safelyDecryptSecret(map.get("google_growth_client_secret") || map.get("google_client_secret"));
    } else if (provider === "bing") {
      dbClientId = map.get("bing_webmaster_client_id") || map.get("bing_client_id") || "";
      dbClientSecret = safelyDecryptSecret(map.get("bing_webmaster_client_secret") || map.get("bing_client_secret"));
    } else if (provider === "yandex") {
      dbClientId = map.get("yandex_webmaster_client_id") || map.get("yandex_client_id") || "";
      dbClientSecret = safelyDecryptSecret(map.get("yandex_webmaster_client_secret") || map.get("yandex_client_secret"));
    }
  } catch (err) {
    console.error(`[GrowthCredentials] Error fetching ${provider} credentials from DB:`, err);
  }

  // Environment fallback
  let envClientId = "";
  let envClientSecret = "";

  if (provider === "google") {
    envClientId = (process.env.GOOGLE_GROWTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "").trim();
    envClientSecret = (process.env.GOOGLE_GROWTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "").trim();
  } else if (provider === "bing") {
    envClientId = (process.env.BING_WEBMASTER_CLIENT_ID || "").trim();
    envClientSecret = (process.env.BING_WEBMASTER_CLIENT_SECRET || "").trim();
  } else if (provider === "yandex") {
    envClientId = (process.env.YANDEX_WEBMASTER_CLIENT_ID || "").trim();
    envClientSecret = (process.env.YANDEX_WEBMASTER_CLIENT_SECRET || "").trim();
  }

  const clientId = dbClientId || envClientId;
  const clientSecret = dbClientSecret || envClientSecret;

  const isDb = Boolean(dbClientId || dbClientSecret);
  const isEnv = Boolean(!isDb && (envClientId || envClientSecret));
  const source: "database" | "environment" | "none" = isDb ? "database" : isEnv ? "environment" : "none";

  // Update in-memory cache
  credentialsCache[provider] = {
    clientId,
    clientSecret,
    source,
    cachedAt: Date.now(),
  };

  return {
    provider,
    clientId,
    clientSecret,
    isConfigured: Boolean(clientId && clientSecret),
    clientIdMasked: maskString(clientId),
    clientSecretMasked: maskSecret(clientSecret),
    source,
  };
}

/**
 * Synchronous credential getter using in-memory cache / environment fallback.
 */
export function getGrowthCredentialSync(provider: GrowthProviderType): GrowthCredentialInfo {
  const cached = credentialsCache[provider];
  if (cached && Date.now() - cached.cachedAt < 5 * 60 * 1000) {
    return {
      provider,
      clientId: cached.clientId,
      clientSecret: cached.clientSecret,
      isConfigured: Boolean(cached.clientId && cached.clientSecret),
      clientIdMasked: maskString(cached.clientId),
      clientSecretMasked: maskSecret(cached.clientSecret),
      source: cached.source,
    };
  }

  let envClientId = "";
  let envClientSecret = "";

  if (provider === "google") {
    envClientId = (process.env.GOOGLE_GROWTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "").trim();
    envClientSecret = (process.env.GOOGLE_GROWTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "").trim();
  } else if (provider === "bing") {
    envClientId = (process.env.BING_WEBMASTER_CLIENT_ID || "").trim();
    envClientSecret = (process.env.BING_WEBMASTER_CLIENT_SECRET || "").trim();
  } else if (provider === "yandex") {
    envClientId = (process.env.YANDEX_WEBMASTER_CLIENT_ID || "").trim();
    envClientSecret = (process.env.YANDEX_WEBMASTER_CLIENT_SECRET || "").trim();
  }

  return {
    provider,
    clientId: envClientId,
    clientSecret: envClientSecret,
    isConfigured: Boolean(envClientId && envClientSecret),
    clientIdMasked: maskString(envClientId),
    clientSecretMasked: maskSecret(envClientSecret),
    source: envClientId || envClientSecret ? "environment" : "none",
  };
}

/**
 * Saves growth credentials to PostgreSQL with AES-256 encryption.
 */
export async function saveGrowthCredential(
  provider: GrowthProviderType,
  credentials: { clientId?: string; clientSecret?: string }
): Promise<GrowthCredentialInfo> {
  const primaryIdKey = provider === "google"
    ? "google_growth_client_id"
    : provider === "bing"
    ? "bing_webmaster_client_id"
    : "yandex_webmaster_client_id";

  const primarySecretKey = provider === "google"
    ? "google_growth_client_secret"
    : provider === "bing"
    ? "bing_webmaster_client_secret"
    : "yandex_webmaster_client_secret";

  if (credentials.clientId !== undefined) {
    const trimmedId = credentials.clientId.trim();
    await db.systemSetting.upsert({
      where: { key: primaryIdKey },
      update: { value: trimmedId },
      create: { key: primaryIdKey, value: trimmedId },
    });
  }

  if (credentials.clientSecret !== undefined && credentials.clientSecret.trim().length > 0) {
    const trimmedSecret = credentials.clientSecret.trim();
    const enc = encryptSecret(trimmedSecret);
    await db.systemSetting.upsert({
      where: { key: primarySecretKey },
      update: { value: enc.encryptedValue },
      create: { key: primarySecretKey, value: enc.encryptedValue },
    });
  }

  // Invalidate cache and fetch fresh
  delete credentialsCache[provider];
  return getGrowthCredential(provider);
}

/**
 * AdSense & Monetization Settings Service
 */
export interface AdSenseSettings {
  publisherId: string;
  adsTxt: string;
  autoAdsEnabled: boolean;
}

export async function getAdSenseSettings(): Promise<AdSenseSettings> {
  try {
    const records = await db.systemSetting.findMany({
      where: {
        key: {
          in: ["adsense_publisher_id", "adsense_ads_txt", "adsense_auto_ads_enabled"],
        },
      },
    });

    const map = new Map<string, string>(records.map((r: any) => [r.key, String(r.value)]));
    return {
      publisherId: map.get("adsense_publisher_id") || "",
      adsTxt: map.get("adsense_ads_txt") || "",
      autoAdsEnabled: map.get("adsense_auto_ads_enabled") === "true",
    };
  } catch {
    return { publisherId: "", adsTxt: "", autoAdsEnabled: false };
  }
}

export async function saveAdSenseSettings(settings: Partial<AdSenseSettings>): Promise<AdSenseSettings> {
  if (settings.publisherId !== undefined) {
    await db.systemSetting.upsert({
      where: { key: "adsense_publisher_id" },
      update: { value: settings.publisherId.trim() },
      create: { key: "adsense_publisher_id", value: settings.publisherId.trim() },
    });
  }

  if (settings.adsTxt !== undefined) {
    await db.systemSetting.upsert({
      where: { key: "adsense_ads_txt" },
      update: { value: settings.adsTxt },
      create: { key: "adsense_ads_txt", value: settings.adsTxt },
    });
  }

  if (settings.autoAdsEnabled !== undefined) {
    await db.systemSetting.upsert({
      where: { key: "adsense_auto_ads_enabled" },
      update: { value: String(settings.autoAdsEnabled) },
      create: { key: "adsense_auto_ads_enabled", value: String(settings.autoAdsEnabled) },
    });
  }

  return getAdSenseSettings();
}
