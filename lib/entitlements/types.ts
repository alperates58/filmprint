export type FeatureEntitlement =
  | "AI_DISCOVER"
  | "MOVIE_NIGHT_ADVANCED"
  | "AD_FREE"
  | "PROFILE_COMPARE"
  | "ADVANCED_DNA"
  | "TASTE_EVOLUTION"
  | "ADVANCED_FILTERS"
  | "WATCHLIST_INTELLIGENCE"
  | "WEEKLY_DIGEST"
  | "IMPORT_EXPORT";

export type SubscriptionTierType = "FREE" | "PREMIUM";

export interface UserEntitlementStatus {
  tier: SubscriptionTierType;
  isPremium: boolean;
  validUntil: Date | null;
  features: Record<FeatureEntitlement, boolean>;
}

export interface FeatureEntitlementDecision {
  feature: FeatureEntitlement;
  tier: SubscriptionTierType;
  allowed: boolean;
  remaining?: number | null;
  limit?: number | null;
  reason?: string;
}

export interface DailyQuotaCheckResult {
  allowed: boolean;
  tier: SubscriptionTierType;
  limit: number;
  consumed: number;
  remaining: number;
  resetAtUtc: string; // ISO string of next UTC midnight
}

export interface UserEntitlementSummary {
  tier: SubscriptionTierType;
  isPremium: boolean;
  validUntil: string | null;
  features: Record<FeatureEntitlement, boolean>;
  aiDiscoverQuota?: DailyQuotaCheckResult;
}
