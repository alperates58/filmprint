import { isGenericOverview } from "@/lib/movies/denylist";

/**
 * Returns true only for actual overview content. Internal catalog placeholders
 * are presentation copy, not TMDB metadata, and must never be persisted as if
 * they were a real synopsis.
 */
export function isMeaningfulOverview(overview: string | null | undefined): boolean {
  if (typeof overview !== "string") return false;
  const normalized = overview.trim();
  return normalized.length > 0 && !isGenericOverview(normalized);
}

export function normalizeOverviewForPersistence(
  overview: string | null | undefined
): string {
  return isMeaningfulOverview(overview) ? overview!.trim() : "";
}
