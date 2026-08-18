import { db } from "@/lib/db/client";
import { getGoogleGrowthAccessToken } from "./oauth";
import { GoogleIntegrationMetadata } from "../types";
import { updateSeoSystemSetting } from "../settings";

export interface GaAccountSummary {
  id: string;
  name: string;
  displayName: string;
  propertySummaries: {
    property: string; // e.g. "properties/123456"
    displayName: string;
    propertyType: string;
  }[];
}

export interface GaDataStream {
  id: string; // e.g. "properties/123456/dataStreams/987654"
  displayName: string;
  type: string;
  measurementId?: string;
}

/**
 * Lists GA4 accounts and properties accessible to the authorized Google Growth account.
 */
export async function listGa4AccountSummaries(): Promise<GaAccountSummary[]> {
  const token = await getGoogleGrowthAccessToken();
  if (!token) {
    throw new Error("Google yetkilendirmesi bulunamadı veya süresi doldu.");
  }

  const response = await fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GA4 hesap listesi alınamadı: ${errorText}`);
  }

  const data = await response.json();
  const rawSummaries = data.accountSummaries || [];

  return rawSummaries.map((acc: any) => ({
    id: acc.account,
    name: acc.name,
    displayName: acc.displayName || acc.account,
    propertySummaries: (acc.propertySummaries || []).map((p: any) => ({
      property: p.property,
      displayName: p.displayName,
      propertyType: p.propertyType,
    })),
  }));
}

/**
 * Lists web data streams for a specific GA4 property.
 */
export async function listGa4DataStreams(propertyId: string): Promise<GaDataStream[]> {
  const token = await getGoogleGrowthAccessToken();
  if (!token) {
    throw new Error("Google yetkilendirmesi bulunamadı.");
  }

  // Ensure format "properties/123456"
  const formattedProp = propertyId.startsWith("properties/") ? propertyId : `properties/${propertyId}`;

  const response = await fetch(`https://analyticsadmin.googleapis.com/v1beta/${formattedProp}/dataStreams`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GA4 Veri Akışları alınamadı: ${errorText}`);
  }

  const data = await response.json();
  const streams = data.dataStreams || [];

  return streams.map((s: any) => ({
    id: s.name,
    displayName: s.displayName || s.name,
    type: s.type,
    measurementId: s.webStreamData?.measurementId || null,
  }));
}

/**
 * Saves selected GA4 property and measurement ID into integration metadata and system settings.
 */
export async function selectGa4Property(params: {
  propertyId: string;
  propertyName: string;
  measurementId?: string;
  trackingEnabled?: boolean;
}): Promise<void> {
  const existing = await db.integrationSecret.findUnique({
    where: { provider: "google_growth" },
  });

  const currentMeta = ((existing?.metadata as Record<string, any>) || {}) as GoogleIntegrationMetadata;
  const updatedMeta: GoogleIntegrationMetadata = {
    ...currentMeta,
    gaProperty: {
      id: params.propertyId,
      displayName: params.propertyName,
    },
    gaMeasurementId: params.measurementId || currentMeta.gaMeasurementId || "",
    gaTrackingEnabled: params.trackingEnabled !== false,
    lastSyncAt: new Date().toISOString(),
  };

  await db.integrationSecret.upsert({
    where: { provider: "google_growth" },
    update: { metadata: updatedMeta as any },
    create: {
      provider: "google_growth",
      encryptedValue: "",
      metadata: updatedMeta as any,
    },
  });

  if (params.measurementId) {
    await updateSeoSystemSetting("ga_measurement_id", params.measurementId.trim());
  }
  if (typeof params.trackingEnabled === "boolean") {
    await updateSeoSystemSetting("ga_tracking_enabled", String(params.trackingEnabled));
  }
}
