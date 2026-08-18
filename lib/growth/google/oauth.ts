import crypto from "crypto";
import { db } from "@/lib/db/client";
import { encryptSecret, decryptSecret } from "@/lib/security/crypto";
import { GoogleIntegrationMetadata } from "../types";
import { getGoogleGrowthRedirectUri } from "../urls";

export const GOOGLE_GROWTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters",
  "https://www.googleapis.com/auth/adsense.readonly",
  "https://www.googleapis.com/auth/siteverification.verify_only",
].join(" ");

export function getGoogleGrowthConfig() {
  const clientId = (process.env.GOOGLE_GROWTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.GOOGLE_GROWTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "").trim();
  const redirectUri = getGoogleGrowthRedirectUri();

  return {
    clientId,
    clientSecret,
    redirectUri,
    isConfigured: Boolean(clientId && clientSecret),
  };
}

/**
 * Builds Google OAuth URL for Growth integrations with offline access.
 */
export function buildGoogleGrowthAuthUrl(adminUserId: string): string {
  const config = getGoogleGrowthConfig();
  const rawState = `${adminUserId}:${Date.now()}:${crypto.randomBytes(16).toString("hex")}`;
  const stateSignature = crypto
    .createHmac("sha256", config.clientSecret || "growth_state_key")
    .update(rawState)
    .digest("hex");
  const state = `${rawState}:${stateSignature}`;

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GOOGLE_GROWTH_SCOPES,
    state,
    access_type: "offline",
    prompt: "consent select_account",
    include_granted_scopes: "true",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Verifies OAuth state signature.
 */
export function verifyGoogleGrowthState(state: string): boolean {
  if (!state || typeof state !== "string") return false;

  const parts = state.split(":");
  if (parts.length !== 4) return false;

  const [adminUserId, timestampStr, nonce, receivedSignature] = parts;
  const timestamp = parseInt(timestampStr, 10);

  // Expire state after 10 minutes
  if (isNaN(timestamp) || Date.now() - timestamp > 10 * 60 * 1000) {
    return false;
  }

  const config = getGoogleGrowthConfig();
  const rawState = `${adminUserId}:${timestampStr}:${nonce}`;
  const expectedSignature = crypto
    .createHmac("sha256", config.clientSecret || "growth_state_key")
    .update(rawState)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(receivedSignature, "hex"),
    Buffer.from(expectedSignature, "hex")
  );
}

/**
 * Exchanges authorization code for Google access and refresh tokens.
 */
export async function exchangeGoogleGrowthCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  email?: string;
}> {
  const config = getGoogleGrowthConfig();

  const response = await fetch("https://oauth2.googleapis.com/token", {
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
    throw new Error(`Google token exchange failed (${response.status}): ${errorText}`);
  }

  const tokenData = await response.json();

  // Fetch email identity
  let email: string | undefined;
  try {
    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (userRes.ok) {
      const userData = await userRes.json();
      email = userData.email;
    }
  } catch {
    // Non-fatal
  }

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
    email,
  };
}

/**
 * Saves Google Growth tokens securely with encryption.
 * CRITICAL RULE: If new tokens do NOT contain a refreshToken, preserves existing encrypted refreshToken.
 */
export async function saveGoogleGrowthTokens(tokens: {
  refreshToken?: string;
  email?: string;
}): Promise<void> {
  const existing = await db.integrationSecret.findUnique({
    where: { provider: "google_growth" },
  });

  let encryptedValue = existing?.encryptedValue || "";
  let lastFour = existing?.lastFour || null;

  if (tokens.refreshToken && tokens.refreshToken.trim().length > 0) {
    const enc = encryptSecret(tokens.refreshToken.trim());
    encryptedValue = enc.encryptedValue;
    lastFour = enc.lastFour;
  }

  const currentMeta = ((existing?.metadata as Record<string, any>) || {}) as GoogleIntegrationMetadata;
  const updatedMeta: GoogleIntegrationMetadata = {
    ...currentMeta,
    connectedEmail: tokens.email || currentMeta.connectedEmail,
    connectedAt: currentMeta.connectedAt || new Date().toISOString(),
    lastSyncAt: new Date().toISOString(),
    lastError: null,
  };

  await db.integrationSecret.upsert({
    where: { provider: "google_growth" },
    update: {
      encryptedValue,
      lastFour,
      metadata: updatedMeta as any,
    },
    create: {
      provider: "google_growth",
      encryptedValue,
      lastFour,
      metadata: updatedMeta as any,
    },
  });
}

// In-memory short-lived access token cache
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Retrieves valid Google access token, refreshing automatically via encrypted refresh token if needed.
 * In case of 401/invalid_grant, avoids infinite loops and transitions status to REAUTH_REQUIRED.
 */
export async function getGoogleGrowthAccessToken(): Promise<string | null> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60000) {
    return cachedAccessToken.token;
  }

  const record = await db.integrationSecret.findUnique({
    where: { provider: "google_growth" },
  });

  if (!record || !record.encryptedValue) {
    return null;
  }

  let refreshToken: string;
  try {
    refreshToken = decryptSecret(record.encryptedValue);
  } catch (err: any) {
    console.error("[GoogleGrowth] Failed to decrypt refresh token:", err);
    // Mark record as error/reauth required
    await markGoogleReauthRequired("Şifreli anahtar çözülemedi. Lütfen yeniden bağlanın.");
    return null;
  }

  const config = getGoogleGrowthConfig();
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
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
      console.error("[GoogleGrowth] Failed to refresh access token:", errText);

      if (response.status === 400 || response.status === 401 || errText.includes("invalid_grant")) {
        await markGoogleReauthRequired("Yetkilendirme süresi doldu veya iptal edildi (invalid_grant). Lütfen Google ile yeniden bağlanın.");
      }

      return null;
    }

    const data = await response.json();
    const token = data.access_token as string;
    const expiresIn = (data.expires_in as number) || 3600;

    cachedAccessToken = {
      token,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    return token;
  } catch (e: any) {
    console.error("[GoogleGrowth] Error refreshing token:", e);
    return null;
  }
}

async function markGoogleReauthRequired(errorMessage: string) {
  cachedAccessToken = null;
  try {
    const existing = await db.integrationSecret.findUnique({
      where: { provider: "google_growth" },
    });
    if (existing) {
      const meta = ((existing.metadata as Record<string, any>) || {}) as GoogleIntegrationMetadata;
      await db.integrationSecret.update({
        where: { provider: "google_growth" },
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
 * Disconnects Google Growth integration and clears encrypted credentials.
 */
export async function disconnectGoogleGrowth(): Promise<void> {
  cachedAccessToken = null;
  await db.integrationSecret.delete({
    where: { provider: "google_growth" },
  }).catch(() => {});
}
