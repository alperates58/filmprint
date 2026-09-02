import { Prisma } from "@prisma/client";

/**
 * Hard-excluded TV genre IDs for automatic general discovery surfaces:
 * - 10762: Kids (Çocuk)
 * - 10763: News (Haber)
 * - 10767: Talk Show
 */
export const TV_DISCOVERY_EXCLUDED_GENRE_IDS = [10762, 10763, 10767] as const;

/**
 * Reusable database-level Prisma WHERE clause for automatic TV discovery.
 * Excludes Kids (10762), News (10763), Talk Show (10767), and Adult/Unsafe content.
 *
 * Applicable to all automatic TV discovery surfaces:
 * - CALIBRATION
 * - RECOMMENDATION
 * - HOME
 * - FRESH_DISCOVERY
 * - RELATED / SIMILAR
 */
export function buildAutomaticTvDiscoveryWhere(
  extraWhere: Record<string, any> = {}
): Record<string, any> {
  const notConditions: any[] = [];

  // Exclude canonical hard genres at the physical DB level
  notConditions.push({
    genreIds: {
      hasSome: Array.from(TV_DISCOVERY_EXCLUDED_GENRE_IDS),
    },
  });

  if (extraWhere.NOT) {
    if (Array.isArray(extraWhere.NOT)) {
      notConditions.push(...extraWhere.NOT);
    } else {
      notConditions.push(extraWhere.NOT);
    }
  }

  const { NOT: _ignoredNot, ...restExtra } = extraWhere;

  return {
    ...restExtra,
    posterPath: { not: null },
    safetyLevel: {
      notIn: ["ADULT", "EROTIC", "SEXUAL_CONTENT"],
    },
    OR: [
      { normalizedMinimumAge: null },
      { normalizedMinimumAge: { lt: 18 } },
    ],
    NOT: notConditions.length === 1 ? notConditions[0] : notConditions,
  };
}