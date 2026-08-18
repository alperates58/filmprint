import crypto from "crypto";
import { db } from "@/lib/db/client";
import { encryptSecret, decryptSecret } from "@/lib/security/crypto";
import { BingIntegrationMetadata } from "../types";

export const BING_WEBMASTER_AUTH_URL = "https://www.bing.com/webmasters/OAuth/authorize";
export const BING_WEBMASTER_TOKEN_URL = "https://www.bing.com/webmasters/oauth/token";
export const BING_WEBMASTER_SCOPE = "webmaster.manage";

export function getBingGrowthConfig() {
  const clientId = process.env.BING_WEBMASTER_CLIENT_ID || "";
  const clientSecret = process.env.BING_WEBMASTER_CLIENT_SECRET || "";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sineai.com.tr").replace(/\/+$/, "");
  const redirectUri = `${appUrl}/api/admin/growth/bing/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
    isConfigured: Boolean(clientId && clientSecret),
  };
}

/**
 * Builds official Bing Webmaster Tools OAuth 2.0 URL.
 * Uses dedicated Bing Webmaster OAuth authorization endpoint: https://www.bing.com/webmasters/OAuth/authorize
 */
export function buildBingGrowthAuthUrl(adminUserId: string): string {
  const config = getBingGrowthConfig();
  const rawState = `${adminUserId}:${Date.now()}:${crypto.randomBytes(16).toString("hex")}`;
  const stateSignature = crypto
    .createHmac("sha256", config.clientSecret || "bing_state_key")
    .update(rawState)
    .digest("hex");
  const state = `${rawState}:${stateSignature}`;

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: BING_WEBMASTER_SCOPE,
    state,
  });

  return `${BING_WEBMASTER_AUTH_URL}?${params.toString()}`;
}

/**
 * Validates Bing OAuth state.
 */
export function verifyBingGrowthState(state: string): boolean {
  if (!state || typeof state !== "string") return false;
  const parts = state.split(":");
  if (parts.length !== 4) return false;

  const [adminUserId, timestampStr, nonce, signature] = parts;
  const config = getBingGrowthConfig();

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp) || Date.now() - timestamp > 15 * 60 * 1000) {
    return false;
  }

  const rawState = `${adminUserId}:${timestampStr}:${nonce}`;
  const expectedSig = crypto
    .createHmac("sha256", config.clientSecret || "bing_state_key")
    .update(rawState)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSig, "hex"));
}

/**
 * Exchanges authorization code for Bing OAuth tokens via official Bing Webmaster token endpoint:
 * https://www.bing.com/webmasters/oauth/token
 */
export async function exchangeBingGrowthCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}> {
  const config = getBingGrowthConfig();

  const response = await fetch(BING_WEBMASTER_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Bing token exchange failed: ${errorText}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in || 3600,
  };
}

/**
 * Saves Bing tokens securely with encryption.
 * CRITICAL RULE: If new tokens do NOT contain a refreshToken, preserves existing encrypted refreshToken.
 */
export async function saveBingGrowthTokens(tokens: {
  refreshToken?: string;
  siteUrl?: string;
}): Promise<void> {
  const existing = await db.integrationSecret.findUnique({
    where: { provider: "bing_webmaster" },
  });

  let encryptedValue = existing?.encryptedValue || "";
  let lastFour = existing?.lastFour || null;

  if (tokens.refreshToken && tokens.refreshToken.trim().length > 0) {
    const enc = encryptSecret(tokens.refreshToken.trim());
    encryptedValue = enc.encryptedValue;
    lastFour = enc.lastFour;
  }

  const currentMeta = ((existing?.metadata as Record<string, any>) || {}) as BingIntegrationMetadata;
  const updatedMeta: BingIntegrationMetadata = {
    ...currentMeta,
    siteUrl: tokens.siteUrl || currentMeta.siteUrl || process.env.NEXT_PUBLIC_APP_URL || "https://sineai.com.tr",
    connectedAt: currentMeta.connectedAt || new Date().toISOString(),
    lastSyncAt: new Date().toISOString(),
    lastError: null,
  };

  await db.integrationSecret.upsert({
    where: { provider: "bing_webmaster" },
    update: {
      encryptedValue,
      lastFour,
      metadata: updatedMeta as any,
    },
    create: {
      provider: "bing_webmaster",
      encryptedValue,
      lastFour,
      metadata: updatedMeta as any,
    },
  });
}

// In-memory short-lived access token cache
let cachedBingAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Gets valid Bing access token, refreshing automatically via encrypted refresh token if needed.
 * Uses official Bing Webmaster token refresh endpoint: https://www.bing.com/webmasters/oauth/token
 */
export async function getBingGrowthAccessToken(): Promise<string | null> {
  if (cachedBingAccessToken && cachedBingAccessToken.expiresAt > Date.now() + 60000) {
    return cachedBingAccessToken.token;
  }

  const record = await db.integrationSecret.findUnique({
    where: { provider: "bing_webmaster" },
  });

  if (!record || !record.encryptedValue) {
    return null;
  }

  let refreshToken: string;
  try {
    refreshToken = decryptSecret(record.encryptedValue);
  } catch (err: any) {
    console.error("[BingGrowth] Failed to decrypt refresh token:", err);
    await markBingReauthRequired("Şifreli anahtar çözülemedi. Lütfen yeniden bağlanın.");
    return null;
  }

  const config = getBingGrowthConfig();
  try {
    const response = await fetch(BING_WEBMASTER_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[BingGrowth] Failed to refresh token:", errText);

      if (response.status === 400 || response.status === 401 || errText.includes("invalid_grant")) {
        await markBingReauthRequired("Bing oturum süresi doldu (invalid_grant). Lütfen Bing ile yeniden bağlanın.");
      }
      return null;
    }

    const data = await response.json();
    const token = data.access_token as string;
    const expiresIn = (data.expires_in as number) || 3600;

    cachedBingAccessToken = {
      token,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    return token;
  } catch (err) {
    console.error("[BingGrowth] Error refreshing access token:", err);
    return null;
  }
}

async function markBingReauthRequired(errorMessage: string) {
  cachedBingAccessToken = null;
  try {
    const existing = await db.integrationSecret.findUnique({
      where: { provider: "bing_webmaster" },
    });
    if (existing) {
      const meta = ((existing.metadata as Record<string, any>) || {}) as BingIntegrationMetadata;
      await db.integrationSecret.update({
        where: { provider: "bing_webmaster" },
        data: {
          metadata: {
            ...meta,
            lastError: errorMessage,
          } as any,
        },
      });
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Disconnects Bing Webmaster.
 */
export async function disconnectBingGrowth(): Promise<void> {
  cachedBingAccessToken = null;
  await db.integrationSecret.delete({
    where: { provider: "bing_webmaster" },
  }).catch(() => {});
}
