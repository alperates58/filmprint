import { db } from "@/lib/db/client";
import { getProgressionForCount } from "./service";
import { UserProgression } from "./types";

/**
 * Fetches the evaluated count for the requested media mode and calculates progression.
 */
export async function getUserProgression(
  userId: string,
  mediaType: "FILM" | "TV" = "FILM"
): Promise<UserProgression> {
  const count =
    mediaType === "TV"
      ? await db.tvInteraction.count({ where: { userId } })
      : await db.movieInteraction.count({ where: { userId } });

  return getProgressionForCount(count);
}
