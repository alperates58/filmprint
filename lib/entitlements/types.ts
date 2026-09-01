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

export type FeatureImplementationStatus = "ACTIVE" | "COMING_SOON" | "DEPRECATED";

export interface FeatureDefinition {
  key: FeatureEntitlement;
  name: string;
  description: string;
  status: FeatureImplementationStatus;
  defaultTier: "FREE" | "PREMIUM";
}

export const FEATURE_REGISTRY: Record<FeatureEntitlement, FeatureDefinition> = {
  AI_DISCOVER: {
    key: "AI_DISCOVER",
    name: "AI Keşif Stüdyosu",
    description: "Doğal dille ve ruh haline göre film & dizi keşfi",
    status: "ACTIVE",
    defaultTier: "FREE",
  },
  MOVIE_NIGHT_ADVANCED: {
    key: "MOVIE_NIGHT_ADVANCED",
    name: "Movie Night+ Gelişmiş Grup Eşleşmesi",
    description: "Mod filtreleri, yıl aralıkları ve genişletilmiş grup havuzu",
    status: "ACTIVE",
    defaultTier: "PREMIUM",
  },
  AD_FREE: {
    key: "AD_FREE",
    name: "Reklamsız Deneyim Garantisi",
    description: "Sıfır reklam kesintisi ve tam odaklı sinefil deneyimi",
    status: "ACTIVE",
    defaultTier: "PREMIUM",
  },
  PROFILE_COMPARE: {
    key: "PROFILE_COMPARE",
    name: "Gelişmiş Profil Karşılaştırma",
    description: "Detaylı zevk uyumu ve ortak izleme haritası",
    status: "COMING_SOON",
    defaultTier: "PREMIUM",
  },
  ADVANCED_DNA: {
    key: "ADVANCED_DNA",
    name: "Derin Zevk DNA Analitiği",
    description: "Yönetmen, dönem ve alt tür ağırlıklı mikro sinyaller",
    status: "COMING_SOON",
    defaultTier: "PREMIUM",
  },
  TASTE_EVOLUTION: {
    key: "TASTE_EVOLUTION",
    name: "Zevk Evrimi & Zaman Yolculuğu",
    description: "Sinema zevkinin aylar ve yıllar içindeki değişimi",
    status: "COMING_SOON",
    defaultTier: "PREMIUM",
  },
  ADVANCED_FILTERS: {
    key: "ADVANCED_FILTERS",
    name: "Stüdyo Kalitesinde Filtreler",
    description: "Kürasyon, ödül, süre ve spesifik platform filtreleri",
    status: "COMING_SOON",
    defaultTier: "PREMIUM",
  },
  WATCHLIST_INTELLIGENCE: {
    key: "WATCHLIST_INTELLIGENCE",
    name: "Akıllı İzleme Listesi Analizi",
    description: "Hangi filmi ne zaman izlemeniz gerektiğine dair yapay zeka sıralaması",
    status: "COMING_SOON",
    defaultTier: "PREMIUM",
  },
  WEEKLY_DIGEST: {
    key: "WEEKLY_DIGEST",
    name: "Kişiselleştirilmiş Haftalık Sinefil Bülteni",
    description: "Her cuma zevkinize özel taze keşifler ve bülten",
    status: "COMING_SOON",
    defaultTier: "PREMIUM",
  },
  IMPORT_EXPORT: {
    key: "IMPORT_EXPORT",
    name: "Letterboxd & IMDb İçe / Dışa Aktarım",
    description: "Tüm kütüphaneyi tek tıkla senkronize etme",
    status: "COMING_SOON",
    defaultTier: "PREMIUM",
  },
};

export type SubscriptionTierType = "FREE" | "PREMIUM";

export interface UserCustomLimits {
  featureOverrides?: Partial<Record<FeatureEntitlement, boolean>>;
  dailyLimits?: {
    AI_DISCOVER?: number;
    [key: string]: number | undefined;
  };
}

export interface UserEntitlementStatus {
  tier: SubscriptionTierType;
  isPremium: boolean;
  validUntil: Date | null;
  features: Record<FeatureEntitlement, boolean>;
  customLimits?: UserCustomLimits;
}

export interface FeatureEntitlementDecision {
  feature: FeatureEntitlement;
  tier: SubscriptionTierType;
  allowed: boolean;
  remaining?: number | null;
  limit?: number | null;
  reason?: "FEATURE_NOT_AVAILABLE" | "FEATURE_GATED" | "FEATURE_DISABLED_BY_OVERRIDE" | "QUOTA_EXHAUSTED" | "PREMIUM_FAIR_USE_LIMIT" | string;
}

export interface DailyQuotaCheckResult {
  allowed: boolean;
  tier: SubscriptionTierType;
  limit: number;
  consumed: number;
  remaining: number;
  resetAtUtc: string; // ISO string of next UTC midnight
}

export interface QuotaReservationResult extends DailyQuotaCheckResult {
  reservationId: string | null;
  reason?: string;
}

export interface UserEntitlementSummary {
  tier: SubscriptionTierType;
  isPremium: boolean;
  isAdFree: boolean;
  source?: "MANUAL" | "BILLING" | "PROMOTIONAL" | "SYSTEM" | string | null;
  validUntil: string | null;
  features: Record<FeatureEntitlement, boolean>;
  aiDiscoverQuota?: DailyQuotaCheckResult;
}
