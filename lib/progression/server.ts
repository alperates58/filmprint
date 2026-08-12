import { db } from "@/lib/db/client";
import { getProgressionForCount } from "./service";
import { UserProgression } from "./types";

/**
 * Helper to fetch user evaluated movie count from DB and calculate UserProgression on the server.
 */
export async function getUserProgression(userId: string): Promise<UserProgression> {
  const count = await db.movieInteraction.count({
    where: { userId },
  });

  return getProgressionForCount(count);
}
