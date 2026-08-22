import { getProgressionForCount, getTvProgressionForCount } from "./service";
import { UserProgression } from "./types";
import { getCanonicalWatchedCounts } from "./watched-service";

/**
 * Fetches the canonical watched count for the requested media mode and calculates Rank V2 progression.
 * Progression is strictly calculated from distinct watched titles (status === "WATCHED").
 */
export async function getUserProgression(
  userId: string,
  mediaType: "FILM" | "TV" = "FILM"
): Promise<UserProgression> {
  const stats = await getCanonicalWatchedCounts(userId);

  if (mediaType === "TV") {
    return getTvProgressionForCount(stats.tvWatchedCount);
  }

  return getProgressionForCount(stats.movieWatchedCount);
}
