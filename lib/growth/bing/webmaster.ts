import { db } from "@/lib/db/client";
import { getBingGrowthAccessToken } from "./oauth";
import { BingIntegrationMetadata } from "../types";

export interface BingSiteSummary {
  url: string;
  isVerified: boolean;
  authenticationCode?: string;
}

/**
 * Lists user's sites in Bing Webmaster Tools.
 */
export async function listBingSites(): Promise<BingSiteSummary[]> {
  const token = await getBingGrowthAccessToken();
  if (!token) {
    throw new Error("Bing yetkilendirmesi bulunamadı.");
  }

  try {
    const response = await fetch("https://ssl.bing.com/webmaster/api.svc/json/GetUserSites", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Bing siteleri alınamadı: ${err}`);
    }

    const data = await response.json();
    const sites = data.d || [];

    return sites.map((s: any) => ({
      url: s.Url,
      isVerified: s.IsVerified !== false,
      authenticationCode: s.AuthenticationCode || null,
    }));
  } catch (err: any) {
    throw new Error(err?.message || "Bing Webmaster API bağlantı hatası");
  }
}

/**
 * Submits SINEAI sitemap to Bing Webmaster Tools.
 */
export async function submitBingSitemap(siteUrl: string, sitemapUrl?: string): Promise<{ success: boolean; message: string }> {
  const token = await getBingGrowthAccessToken();
  if (!token) {
    throw new Error("Bing yetkilendirmesi bulunamadı.");
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sineai.com.tr").replace(/\/+$/, "");
  const target = sitemapUrl || `${baseUrl}/sitemap.xml`;

  try {
    const response = await fetch("https://ssl.bing.com/webmaster/api.svc/json/SubmitSitemap", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        siteUrl,
        feedUrl: target,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Bing sitemap gönderim hatası: ${err}`);
    }

    return { success: true, message: `Sitemap başarıyla Bing Webmaster'a iletildi (${target}).` };
  } catch (err: any) {
    throw new Error(err?.message || "Bing sitemap gönderimi sırasında hata oluştu.");
  }
}

/**
 * Fetches Bing integration status.
 */
export async function getBingStatus(): Promise<BingIntegrationMetadata & { isConnected: boolean }> {
  const record = await db.integrationSecret.findUnique({
    where: { provider: "bing_webmaster" },
  });

  const isConnected = Boolean(record && record.encryptedValue);
  const meta = ((record?.metadata as Record<string, any>) || {}) as BingIntegrationMetadata;

  return {
    ...meta,
    isConnected,
  };
}
