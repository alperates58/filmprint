import { db } from "@/lib/db/client";
import { getGoogleGrowthAccessToken } from "./oauth";
import { GoogleIntegrationMetadata } from "../types";

export interface AdSenseAccountSummary {
  name: string; // e.g. "accounts/pub-1234567890"
  displayName: string;
  publisherId: string;
  state: "READY" | "NEEDS_ATTENTION" | "CLOSED" | "UNSPECIFIED";
  pendingTasks?: string[];
}

export interface AdSenseSiteSummary {
  name: string; // e.g. "accounts/pub-1234567890/sites/sineai.com.tr"
  domain: string;
  state: "READY" | "GETTING_READY" | "NEEDS_ATTENTION" | "UNSPECIFIED";
  autoAdsEnabled?: boolean;
}

export interface AdSenseHealthOverview {
  isAvailable: boolean;
  account: AdSenseAccountSummary | null;
  sites: AdSenseSiteSummary[];
  matchingSite: AdSenseSiteSummary | null;
  policyIssuesCount: number;
  message?: string;
}

/**
 * Discovers accessible Google AdSense accounts (READ-ONLY).
 * Strictly does NOT enable Auto Ads or inject any advertising tags.
 */
export async function getAdSenseHealth(): Promise<AdSenseHealthOverview> {
  const token = await getGoogleGrowthAccessToken();
  if (!token) {
    return {
      isAvailable: false,
      account: null,
      sites: [],
      matchingSite: null,
      policyIssuesCount: 0,
      message: "Google hesabı bağlı değil.",
    };
  }

  try {
    const response = await fetch("https://adsense.googleapis.com/v2/accounts", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        isAvailable: false,
        account: null,
        sites: [],
        matchingSite: null,
        policyIssuesCount: 0,
        message: "Bu Google hesabında erişilebilir AdSense hesabı bulunamadı.",
      };
    }

    const data = await response.json();
    const accounts = data.accounts || [];

    if (accounts.length === 0) {
      return {
        isAvailable: false,
        account: null,
        sites: [],
        matchingSite: null,
        policyIssuesCount: 0,
        message: "Bu Google hesabında aktif AdSense hesabı bulunamadı.",
      };
    }

    const firstAccount = accounts[0];
    const pubId = firstAccount.name.replace(/^accounts\//, "");
    const accountSummary: AdSenseAccountSummary = {
      name: firstAccount.name,
      displayName: firstAccount.displayName || pubId,
      publisherId: pubId,
      state: firstAccount.state || "UNSPECIFIED",
      pendingTasks: firstAccount.pendingTasks || [],
    };

    // Fetch Sites
    let sites: AdSenseSiteSummary[] = [];
    try {
      const sitesRes = await fetch(`https://adsense.googleapis.com/v2/${firstAccount.name}/sites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (sitesRes.ok) {
        const sitesData = await sitesRes.json();
        sites = (sitesData.sites || []).map((s: any) => ({
          name: s.name,
          domain: s.domain,
          state: s.state || "UNSPECIFIED",
          autoAdsEnabled: s.autoAdsEnabled || false,
        }));
      }
    } catch {
      // Non-fatal
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sineai.com.tr").replace(/\/+$/, "");
    const appHost = new URL(appUrl).host.toLowerCase();
    const matchingSite = sites.find((s) => s.domain.toLowerCase() === appHost) || null;

    // Update AdSense status in DB metadata
    const existing = await db.integrationSecret.findUnique({ where: { provider: "google_growth" } });
    if (existing) {
      const currentMeta = (existing.metadata as Record<string, any>) || {};
      await db.integrationSecret.update({
        where: { provider: "google_growth" },
        data: {
          metadata: {
            ...currentMeta,
            adsenseAccount: {
              id: accountSummary.publisherId,
              name: accountSummary.displayName,
              state: accountSummary.state,
            },
            adsenseSite: matchingSite
              ? { domain: matchingSite.domain, state: matchingSite.state }
              : null,
            adsenseConnected: true,
          } as any,
        },
      }).catch(() => {});
    }

    return {
      isAvailable: true,
      account: accountSummary,
      sites,
      matchingSite,
      policyIssuesCount: firstAccount.pendingTasks?.length || 0,
      message: "AdSense hesabı başarıyla tespit edildi (Salt-Okunur).",
    };
  } catch (err: any) {
    return {
      isAvailable: false,
      account: null,
      sites: [],
      matchingSite: null,
      policyIssuesCount: 0,
      message: err?.message || "AdSense durumu sorgulanırken hata oluştu.",
    };
  }
}
