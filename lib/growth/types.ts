export type IntegrationConnectionState =
  | "CONNECTED"
  | "DISCONNECTED"
  | "ERROR"
  | "REAUTH_REQUIRED";

export interface ProviderStatusSummary {
  provider: "google" | "bing" | "yandex" | "indexnow";
  state: IntegrationConnectionState;
  connectedAccount?: string | null;
  selectedProperty?: string | null;
  capabilities: {
    analytics?: boolean;
    searchConsole?: boolean;
    adsense?: boolean;
    siteVerification?: boolean;
    sitemaps?: boolean;
    indexing?: boolean;
  };
  lastSuccessfulSync?: string | null;
  lastChecked?: string | null;
  lastError?: string | null;
}

export interface GoogleIntegrationMetadata {
  connectedEmail?: string;
  connectedAt?: string;
  scopes?: string[];
  // GA4
  gaAccount?: { id: string; name: string };
  gaProperty?: { id: string; displayName: string };
  gaDataStream?: { id: string; displayName: string; measurementId: string };
  gaMeasurementId?: string;
  gaTrackingEnabled?: boolean;
  // Search Console
  gscProperty?: string;
  gscPermissionLevel?: string;
  gscLastSitemapSubmission?: string;
  // AdSense Read-Only
  adsenseAccount?: { id: string; name: string; state?: string };
  adsenseSite?: { domain: string; state?: string; autoAdsEnabled?: boolean };
  adsenseConnected?: boolean;
  // Verification
  googleSiteVerificationToken?: string;
  googleSiteVerificationMethod?: string;
  // Timestamps & Errors
  lastSyncAt?: string;
  lastError?: string | null;
}

export interface BingIntegrationMetadata {
  connectedEmail?: string;
  connectedAt?: string;
  siteUrl?: string;
  verificationToken?: string;
  lastSyncAt?: string;
  lastError?: string | null;
}

export interface YandexIntegrationMetadata {
  connectedLogin?: string;
  connectedAt?: string;
  hostId?: string;
  hostUrl?: string;
  verificationToken?: string;
  lastSyncAt?: string;
  lastError?: string | null;
}

export interface IndexNowQueueJob {
  url: string;
  enqueuedAt: string;
  retryCount: number;
  lastError?: string | null;
}

export interface IndexNowSubmissionHistory {
  url: string;
  submittedAt: string;
  status: "SUCCESS" | "FAILED";
  error?: string | null;
}

export interface IndexNowMetadata {
  key: string;
  keyLocation: string;
  enabled: boolean;
  totalSubmissions: number;
  lastSubmittedAt?: string | null;
  lastStatus?: "SUCCESS" | "FAILED" | "IDLE";
  lastError?: string | null;
  pendingQueue?: IndexNowQueueJob[];
  recentHistory?: IndexNowSubmissionHistory[];
  queuedUrlsCount?: number;
}

export interface SeoSystemConfig {
  seoMasterEnabled: boolean;
  movieIndexingEnabled: boolean;
  tvIndexingEnabled: boolean;
  movieMaxIndexed: number;
  tvMaxIndexed: number;
  googleVerificationMeta: string;
  bingVerificationMeta: string;
  yandexVerificationMeta: string;
  gaMeasurementId: string;
  gaTrackingEnabled: boolean;
  tmdbCommercialLicenseVerified: boolean;
}

export interface SeoCatalogMetrics {
  totalMovies: number;
  totalTvShows: number;
  eligibleMovies: number;
  eligibleTvShows: number;
  lowQualityMovies: number;
  lowQualityTvShows: number;
  movieRolloutLimit: number;
  tvRolloutLimit: number;
  indexedMoviesCount: number;
  indexedTvShowsCount: number;
  totalSitemapUrls: number;
}
