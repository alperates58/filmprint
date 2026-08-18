import crypto from "crypto";
import { db } from "@/lib/db/client";
import { encryptSecret, decryptSecret } from "@/lib/security/crypto";
import { YandexIntegrationMetadata } from "../types";
import { getYandexGrowthRedirectUri } from "../urls";

export function getYandexGrowthConfig() {
  const clientId = (process.env.YANDEX_WEBMASTER_CLIENT_ID || "").trim();
  const clientSecret = (process.env.YANDEX_WEBMASTER_CLIENT_SECRET || "").trim();
  const redirectUri = getYandexGrowthRedirectUri();

  return {
    clientId,
    clientSecret,
    redirectUri,
    isConfigured: Boolean(clientId && clientSecret),
  };
}

/**
 * Builds Yandex OAuth 2.0 URL.
 */
export function buildYandexGrowthAuthUrl(adminUserId: string): string {
  const config = getYandexGrowthConfig();
  const rawState = `${adminUserId}:${Date.now()}:${crypto.randomBytes(16).toString("hex")}`;
  const stateSignature = crypto
    .createHmac("sha256", config.clientSecret || "yandex_state_key")
    .update(rawState)
    .digest("hex");
  const state = `${rawState}:${stateSignature}`;

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    state,
    force_confirm: "yes",
  });

  return `https://oauth.yandex.com/authorize?${params.toString()}`;
}

/**
 * Validates Yandex OAuth state.
 */
export function verifyYandexGrowthState(state: string): boolean {
  if (!state || typeof state !== "string") return false;
  const parts = state.split(":");
  if (parts.length !== 4) return false;

  const [adminUserId, timestampStr, nonce, signature] = parts;
  const config = getYandexGrowthConfig();

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp) || Date.now() - timestamp > 15 * 60 * 1000) {
    return false;
  }

  const rawState = `${adminUserId}:${timestampStr}:${nonce}`;
  const expectedSig = crypto
    .createHmac("sha256", config.clientSecret || "yandex_state_key")
    .update(rawState)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSig, "hex"));
}

/**
 * Exchanges authorization code for Yandex tokens.
 */
export async function exchangeYandexGrowthCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}> {
  const config = getYandexGrowthConfig();

  const response = await fetch("https://oauth.yandex.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Yandex token exchange failed: ${errorText}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in || 3600,
  };
}

/**
 * Saves Yandex tokens securely.
 */
export async function saveYandexGrowthTokens(tokens: {
  refreshToken?: string;
  login?: string;
}): Promise<void> {
  const existing = await db.integrationSecret.findUnique({
    where: { provider: "yandex_webmaster" },
  });

  let encryptedValue = existing?.encryptedValue || "";
  let lastFour = existing?.lastFour || null;

  if (tokens.refreshToken) {
    const enc = encryptSecret(tokens.refreshToken);
    encryptedValue = enc.encryptedValue;
    lastFour = enc.lastFour;
  }

  const currentMeta = ((existing?.metadata as Record<string, any>) || {}) as YandexIntegrationMetadata;
  const updatedMeta: YandexIntegrationMetadata = {
    ...currentMeta,
    connectedLogin: tokens.login || currentMeta.connectedLogin,
    connectedAt: currentMeta.connectedAt || new Date().toISOString(),
    lastSyncAt: new Date().toISOString(),
    lastError: null,
  };

  await db.integrationSecret.upsert({
    where: { provider: "yandex_webmaster" },
    update: {
      encryptedValue,
      lastFour,
      metadata: updatedMeta as any,
    },
    create: {
      provider: "yandex_webmaster",
      encryptedValue,
      lastFour,
      metadata: updatedMeta as any,
    },
  });
}

/**
 * Gets valid Yandex access token.
 */
export async function getYandexGrowthAccessToken(): Promise<string | null> {
  const record = await db.integrationSecret.findUnique({
    where: { provider: "yandex_webmaster" },
  });

  if (!record || !record.encryptedValue) {
    return null;
  }

  try {
    return decryptSecret(record.encryptedValue);
  } catch {
    return null;
  }
}

/**
 * Disconnects Yandex Webmaster.
 */
export async function disconnectYandexGrowth(): Promise<void> {
  await db.integrationSecret.delete({
    where: { provider: "yandex_webmaster" },
  }).catch(() => {});
}
