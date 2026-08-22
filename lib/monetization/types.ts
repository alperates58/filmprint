import {
  AdSurface,
  AdDeviceTarget,
  AdAudienceTarget,
  AdSenseUnitState,
} from "@prisma/client";

export type {
  AdSurface,
  AdDeviceTarget,
  AdAudienceTarget,
  AdSenseUnitState,
};

export interface CanonicalPlacementDefinition {
  key: string;
  name: string;
  description: string;
  surface: AdSurface;
  position: number;
  defaultContribution: number;
}

export interface SafePlacementConfig {
  key: string;
  name: string;
  description: string;
  surface: AdSurface;
  position: number;
  enabled: boolean;
  adUnitId: string | null;
  reportingDimensionId: string | null;
  adClientId: string | null;
  deviceTarget: AdDeviceTarget;
  audience: AdAudienceTarget;
  minViewportWidth: number | null;
  maxViewportWidth: number | null;
  lastUpdated?: string;
}

export interface PublicMonetizationConfig {
  master: boolean;
  publisherId: string | null; // e.g. "pub-1234567890123456"
  adClientId: string | null;  // e.g. "ca-pub-1234567890123456"
  placements: Record<string, SafePlacementConfig>;
  maxAdsPerPage: number;
  adminPreviewMode: boolean;
  cmpConfigured: boolean;
  readiness: boolean;
}

export interface MonetizationReadinessGateResult {
  isReady: boolean;
  masterEnabled: boolean;
  gates: {
    adsenseAccountConnected: boolean;
    adsenseSiteReady: boolean;
    autoAdsDisabled: boolean;
    adClientReady: boolean;
    adsTxtHealthy: boolean;
    cmpConfigured: boolean;
    consentModeReady: boolean;
    tmdbCommercialLicenseVerified: boolean;
    privacyPageReady: boolean;
    policyCriticalIssuesZero: boolean;
  };
  blockedReasons: string[];
}

export interface AdSenseInventoryUnitSummary {
  id: string;
  providerResourceName: string;
  reportingDimensionId: string | null;
  displayName: string;
  state: AdSenseUnitState;
  type: string | null;
  size: string | null;
  adClientId: string | null;
  lastSyncedAt: string;
}

export interface AdSensePlacementPerformanceRow {
  key: string;
  name: string;
  surface: AdSurface;
  reportingDimensionId: string;
  revenue: number;
  impressions: number;
  rpm: number;
  clicks: number;
  ctr: number;
}

export interface AdSensePerformanceReportSummary {
  period: "today" | "yesterday" | "7d" | "28d";
  currency: string;
  metrics: {
    estimatedEarnings: number;
    pageViews: number;
    impressions: number;
    clicks: number;
    pageViewsRpm: number;
    impressionRpm: number;
    ctr: number;
    cpc: number;
  };
  placements: AdSensePlacementPerformanceRow[];
}

export interface AdSensePolicyIssue {
  entity: string;
  uri?: string;
  policyTopic: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  enforcementAction?: string;
  detectedDate?: string;
}

export interface AdSensePolicyCenterSummary {
  status: "HEALTHY" | "WARNING" | "CRITICAL";
  criticalCount: number;
  warningCount: number;
  issues: AdSensePolicyIssue[];
  alerts: { message: string; severity: string; type?: string }[];
  lastChecked: string;
}
