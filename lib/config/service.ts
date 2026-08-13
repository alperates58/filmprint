import { db } from "@/lib/db/client";
import { encryptSecret, decryptSecret } from "@/lib/security/crypto";
import type { Prisma } from "@prisma/client";

export interface IntegrationStatusInfo {
  provider: string;
  isConfigured: boolean;
  lastFour: string | null;
  source: "database" | "environment" | "none";
  metadata: Record<string, unknown>;
  updatedAt: Date | null;
}

export interface DeepSeekConfig {
  apiKey: string | null;
  baseUrl: string;
  modelId: string;
  enabled: boolean;
  source: "database" | "environment" | "none";
}

/**
 * Resolves TMDB API key following hierarchy:
 * 1. Encrypted DB IntegrationSecret
 * 2. Environment variable (TMDB_API_KEY)
 * 3. Null (Not configured)
 */
export async function getTMDBApiKey(): Promise<string | null> {
  const secretRecord = await db.integrationSecret.findUnique({
    where: { provider: "tmdb" },
  });

  if (secretRecord && secretRecord.encryptedValue) {
    try {
      return decryptSecret(secretRecord.encryptedValue);
    } catch (e) {
      console.error("[ConfigService] Failed to decrypt TMDB key from DB:", e);
    }
  }

  if (process.env.TMDB_API_KEY) {
    return process.env.TMDB_API_KEY;
  }

  return null;
}

/**
 * Resolves DeepSeek AI configuration following hierarchy.
 */
export async function getDeepSeekConfig(): Promise<DeepSeekConfig> {
  const secretRecord = await db.integrationSecret.findUnique({
    where: { provider: "deepseek" },
  });

  const defaultBaseUrl = "https://api.deepseek.com";
  const defaultModelId = "deepseek-chat";

  if (secretRecord && secretRecord.encryptedValue) {
    try {
      const apiKey = decryptSecret(secretRecord.encryptedValue);
      const meta = (secretRecord.metadata as Record<string, unknown>) || {};

      return {
        apiKey,
        baseUrl: (meta.baseUrl as string) || defaultBaseUrl,
        modelId: (meta.modelId as string) || defaultModelId,
        enabled: meta.enabled !== false,
        source: "database",
      };
    } catch (e) {
      console.error("[ConfigService] Failed to decrypt DeepSeek key from DB:", e);
    }
  }

  if (process.env.DEEPSEEK_API_KEY) {
    return {
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: process.env.DEEPSEEK_BASE_URL || defaultBaseUrl,
      modelId: process.env.DEEPSEEK_MODEL_ID || defaultModelId,
      enabled: true,
      source: "environment",
    };
  }

  return {
    apiKey: null,
    baseUrl: defaultBaseUrl,
    modelId: defaultModelId,
    enabled: false,
    source: "none",
  };
}

/**
 * Retrieves masked status info for an integration without returning raw secrets.
 */
export async function getIntegrationStatus(provider: string): Promise<IntegrationStatusInfo> {
  const record = await db.integrationSecret.findUnique({
    where: { provider },
  });

  if (record && record.encryptedValue) {
    return {
      provider,
      isConfigured: true,
      lastFour: record.lastFour,
      source: "database",
      metadata: (record.metadata as Record<string, unknown>) || {},
      updatedAt: record.updatedAt,
    };
  }

  const envKey = provider === "tmdb" ? process.env.TMDB_API_KEY : process.env.DEEPSEEK_API_KEY;
  if (envKey) {
    return {
      provider,
      isConfigured: true,
      lastFour: envKey.length >= 4 ? envKey.slice(-4) : envKey,
      source: "environment",
      metadata: provider === "deepseek" ? { baseUrl: "https://api.deepseek.com", modelId: "deepseek-chat", enabled: true } : {},
      updatedAt: null,
    };
  }

  return {
    provider,
    isConfigured: false,
    lastFour: null,
    source: "none",
    metadata: provider === "deepseek" ? { baseUrl: "https://api.deepseek.com", modelId: "deepseek-chat", enabled: false } : {},
    updatedAt: null,
  };
}

/**
 * Encrypts and saves or updates an integration secret in PostgreSQL.
 */
export async function saveIntegrationSecret(
  provider: string,
  secretValue: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { encryptedValue, lastFour } = encryptSecret(secretValue);

  const existing = await db.integrationSecret.findUnique({ where: { provider } });
  const mergedMetadata = {
    ...((existing?.metadata as Record<string, unknown>) || {}),
    ...(metadata || {}),
  } as Prisma.InputJsonValue;

  await db.integrationSecret.upsert({
    where: { provider },
    update: {
      encryptedValue,
      lastFour,
      metadata: mergedMetadata,
    },
    create: {
      provider,
      encryptedValue,
      lastFour,
      metadata: mergedMetadata,
    },
  });
}

/**
 * Updates metadata for an integration (e.g. modelId, baseUrl, enabled) without re-encrypting the key.
 */
export async function updateIntegrationMetadata(
  provider: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const existing = await db.integrationSecret.findUnique({ where: { provider } });
  const mergedMetadata = {
    ...((existing?.metadata as Record<string, unknown>) || {}),
    ...metadata,
  } as Prisma.InputJsonValue;

  if (existing) {
    await db.integrationSecret.update({
      where: { provider },
      data: { metadata: mergedMetadata },
    });
  } else {
    await db.integrationSecret.create({
      data: {
        provider,
        encryptedValue: "",
        lastFour: null,
        metadata: mergedMetadata,
      },
    });
  }
}

/**
 * System Settings Resolution (e.g. calibrationTarget, queuePreloadCount, aiEnabled, activeLearningEnabled, recommendationsEnabled, aiExplanationsEnabled).
 */
export async function getSystemSettings() {
  const settings = await db.systemSetting.findMany();
  const settingsMap = new Map<string, string>(settings.map((s: any) => [s.key, String(s.value)]));

  return {
    calibrationTarget: parseInt(settingsMap.get("calibration_target") || "30", 10),
    queuePreloadCount: parseInt(settingsMap.get("queue_preload_count") || "5", 10),
    aiEnabled: settingsMap.get("ai_enabled") !== "false",
    activeLearningEnabled: settingsMap.get("active_learning_enabled") !== "false",
    recentHistoryWindow: parseInt(settingsMap.get("recent_history_window") || "10", 10),
    recommendationsEnabled: settingsMap.get("recommendations_enabled") !== "false",
    aiExplanationsEnabled: settingsMap.get("ai_explanations_enabled") !== "false",
  };
}

/**
 * Updates system setting in database.
 */
export async function updateSystemSetting(key: string, value: string): Promise<void> {
  await db.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
