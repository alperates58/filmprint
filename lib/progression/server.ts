import { db } from "@/lib/db/client";
import { getProgressionForCount, getTvProgressionForCount } from "./service";
import { UserProgression } from "./types";

/**
 * Fetches the evaluated count for the requested media mode and calculates progression.
 */
export async function getUserProgression(
  userId: string,
  mediaType: "FILM" | "TV" = "FILM"
): Promise<UserProgression> {
  if (mediaType === "TV") {
    const count = await db.tvInteraction.count({ where: { userId } });
    return getTvProgressionForCount(count);
  }

  const count = await db.movieInteraction.count({ where: { userId } });
  return getProgressionForCount(count);
}
