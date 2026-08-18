import { db } from "@/lib/db/client";
import { getYandexGrowthAccessToken } from "./oauth";
import { YandexIntegrationMetadata } from "../types";

export interface YandexHostSummary {
  hostId: string;
  asciiHostUrl: string;
  unicodeHostUrl: string;
  verified: boolean;
  mainMirror?: { asciiHostUrl: string };
}

/**
 * Lists user's verified hosts in Yandex Webmaster.
 */
export async function listYandexHosts(): Promise<YandexHostSummary[]> {
  const token = await getYandexGrowthAccessToken();
  if (!token) {
    throw new Error("Yandex yetkilendirmesi bulunamadı.");
  }

  // 1. Get user ID
  const userRes = await fetch("https://api.webmaster.yandex.net/v4/user", {
    headers: { Authorization: `OAuth ${token}` },
  });

  if (!userRes.ok) {
    const err = await userRes.text();
    throw new Error(`Yandex kullanıcı bilgisi alınamadı: ${err}`);
  }

  const userData = await userRes.json();
  const userId = userData.user_id;

  // 2. Get hosts
  const hostsRes = await fetch(`https://api.webmaster.yandex.net/v4/user/${userId}/hosts`, {
    headers: { Authorization: `OAuth ${token}` },
  });

  if (!hostsRes.ok) {
    const err = await hostsRes.text();
    throw new Error(`Yandex siteleri alınamadı: ${err}`);
  }

  const hostsData = await hostsRes.json();
  const hosts = hostsData.hosts || [];

  return hosts.map((h: any) => ({
    hostId: h.host_id,
    asciiHostUrl: h.ascii_host_url,
    unicodeHostUrl: h.unicode_host_url,
    verified: h.verified !== false,
    mainMirror: h.main_mirror,
  }));
}

/**
 * Submits SINEAI sitemap to Yandex Webmaster.
 */
export async function submitYandexSitemap(hostId: string, sitemapUrl?: string): Promise<{ success: boolean; message: string }> {
  const token = await getYandexGrowthAccessToken();
  if (!token) {
    throw new Error("Yandex yetkilendirmesi bulunamadı.");
  }

  const userRes = await fetch("https://api.webmaster.yandex.net/v4/user", {
    headers: { Authorization: `OAuth ${token}` },
  });
  if (!userRes.ok) throw new Error("Yandex kullanıcı bilgisi alınamadı.");
  const { user_id: userId } = await userRes.json();

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sineai.com.tr").replace(/\/+$/, "");
  const target = sitemapUrl || `${baseUrl}/sitemap.xml`;

  const response = await fetch(`https://api.webmaster.yandex.net/v4/user/${userId}/hosts/${encodeURIComponent(hostId)}/sitemaps`, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: target }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Yandex sitemap gönderimi başarısız: ${err}`);
  }

  return { success: true, message: `Sitemap başarıyla Yandex Webmaster'a iletildi (${target}).` };
}

/**
 * Fetches Yandex integration status.
 */
export async function getYandexStatus(): Promise<YandexIntegrationMetadata & { isConnected: boolean }> {
  const record = await db.integrationSecret.findUnique({
    where: { provider: "yandex_webmaster" },
  });

  const isConnected = Boolean(record && record.encryptedValue);
  const meta = ((record?.metadata as Record<string, any>) || {}) as YandexIntegrationMetadata;

  return {
    ...meta,
    isConnected,
  };
}
