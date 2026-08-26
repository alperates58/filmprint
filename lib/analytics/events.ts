/**
 * Semantic Event Taxonomy for SINEAI Analytics.
 * Strictly Privacy-First: NEVER includes PII, tokens, or private user IDs.
 */

export type SineaiAnalyticsEvent =
  // Calibration Flow
  | { name: "calibration_start"; params: { media_type: "film" | "tv"; source?: string } }
  | { name: "calibration_answer"; params: { media_type: "film" | "tv"; step: number; status: string } }
  | { name: "calibration_milestone"; params: { media_type: "film" | "tv"; count: number; rank_title?: string } }
  | { name: "calibration_complete"; params: { media_type: "film" | "tv"; total_answers: number } }

  // Content & Interaction
  | { name: "content_detail_open"; params: { media_type: "film" | "tv"; content_id: string; tmdb_id?: number; surface: string } }
  | { name: "trailer_play"; params: { media_type: "film" | "tv"; content_id: string } }

  // Recommendations
  | { name: "recommendation_view"; params: { media_type: "film" | "tv"; count: number; engine_mode?: string } }
  | { name: "recommendation_open"; params: { media_type: "film" | "tv"; content_id: string; rank_position?: number } }
  | { name: "recommendation_feedback"; params: { media_type: "film" | "tv"; action: string; match_score?: number } }

  // Library & Favorites
  | { name: "watchlist_add"; params: { media_type: "film" | "tv"; content_id: string } }
  | { name: "watchlist_remove"; params: { media_type: "film" | "tv"; content_id: string } }
  | { name: "favorite_add"; params: { media_type: "film" | "tv"; content_id: string } }
  | { name: "favorite_remove"; params: { media_type: "film" | "tv"; content_id: string } }
  | { name: "mark_watched"; params: { media_type: "film" | "tv"; content_id: string } }
  | { name: "rating_submitted"; params: { media_type: "film" | "tv"; rating: string } }

  // DNA & Profile
  | { name: "film_dna_view"; params: { archetypes_count?: number } }
  | { name: "tv_dna_view"; params: { archetypes_count?: number } }

  // User Lifecycle (Strictly without PII)
  | { name: "signup_complete"; params: { method: "google" | "email" | "anonymous" } }
  | { name: "login_complete"; params: { method: "google" | "email" } }
  | { name: "library_view"; params: { media_type: "film" | "tv"; active_tab: string } }

  // Premium & Monetization (Privacy-Safe)
  | { name: "premium_page_view"; params: { source?: string } }
  | { name: "premium_cta_click"; params: { plan?: string; source?: string } }
  | { name: "ai_discover_quota_exhausted"; params: { limit: number; remaining: number } }
  | { name: "ai_discover_premium_usage"; params: { model?: string } }
  | { name: "movie_night_premium_opened"; params: { session_code: string; is_host: boolean } }
  | { name: "movie_night_premium_session_created"; params: { session_code: string } };

/**
 * Validates that event payloads do not contain sensitive fields.
 */
export function sanitizeEventParams(params: Record<string, any>): Record<string, any> {
  const disallowedKeys = [
    "email",
    "password",
    "token",
    "userId",
    "user_id",
    "name",
    "prompt",
    "profileText",
    "secret",
    "key",
  ];

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!disallowedKeys.includes(key) && typeof value !== "function" && typeof value !== "object") {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
