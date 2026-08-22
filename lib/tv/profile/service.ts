import { createHash } from "crypto";
import { db } from "@/lib/db/client";
import { Prisma } from "@prisma/client";
import { calculateTvTasteProfile } from "./calculator";
import { TV_DNA_SCHEMA_VERSION, TV_DNA_ALGORITHM_VERSION } from "./constants";
import type {
  TvInteractionData,
  TvDnaResult,
  TvProfileServiceResponse,
} from "./types";

/**
 * Generates deterministic SHA-256 fingerprint for TV interactions.
 * Incorporates tvShowId, status, rating, updatedAt timestamp, and TV DNA algorithm versions.
 * This guarantees same-row rating changes (e.g. PARTIAL -> WATCHED, LIKE -> DISLIKE) trigger staleness detection.
 */
export function generateTvSourceFingerprint(
  interactions: Array<{
    tvShowId: string;
    status: string;
    rating: string | null;
    updatedAt: Date | string;
  }>,
  schemaVersion: number = TV_DNA_SCHEMA_VERSION,
  algoVersion: number = TV_DNA_ALGORITHM_VERSION
): string {
  const sortedRows = [...interactions].sort((a, b) =>
    a.tvShowId.localeCompare(b.tvShowId)
  );

  const payload = JSON.stringify({
    v: schemaVersion,
    algo: algoVersion,
    rows: sortedRows.map((r) => [
      r.tvShowId,
      r.status,
      r.rating || "",
      new Date(r.updatedAt).toISOString(),
    ]),
  });

  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Resolves or recalculates the Dizi DNA profile for a user.
 * Flow:
 * 1. Batch fetch TvInteractions + TvShow metadata in a single query.
 * 2. Calculate source fingerprint.
 * 3. Freshness check against cached UserTvTasteProfile (zero recalculation if fresh).
 * 4. Stale/Missing -> Pure deterministic calculateTvTasteProfile execution.
 * 5. Upsert cache & return canonical response.
 */
export async function getOrRecalculateTvTasteProfile(
  userId: string
): Promise<TvProfileServiceResponse> {
  const requiredCount = 10; // TV calibration milestone

  // 1. Batch fetch all TV interactions with show metadata in 1 DB query (No N+1)
  const interactions = await db.tvInteraction.findMany({
    where: { userId },
    orderBy: { answeredAt: "desc" },
    include: {
      tvShow: {
        select: {
          id: true,
          tmdbId: true,
          name: true,
          originalName: true,
          firstAirDate: true,
          lastAirDate: true,
          status: true,
          originalLanguage: true,
          popularity: true,
          voteAverage: true,
          voteCount: true,
          metadata: true,
        },
      },
    },
  });

  const totalInteractions = interactions.length;

  // Format raw interaction data
  const formattedData: TvInteractionData[] = interactions.map((i: any) => {
    const meta = (i.tvShow.metadata as Record<string, unknown>) || {};
    return {
      id: i.id,
      tvShowId: i.tvShowId,
      status: i.status,
      rating: i.rating,
      answeredAt: i.answeredAt,
      updatedAt: i.updatedAt,
      tvShow: {
        id: i.tvShow.id,
        tmdbId: i.tvShow.tmdbId,
        name: i.tvShow.name,
        originalName: i.tvShow.originalName,
        firstAirDate: i.tvShow.firstAirDate,
        lastAirDate: i.tvShow.lastAirDate,
        status: i.tvShow.status,
        originalLanguage: i.tvShow.originalLanguage,
        popularity: i.tvShow.popularity,
        voteAverage: i.tvShow.voteAverage,
        voteCount: i.tvShow.voteCount,
        metadata: {
          genres: (meta.genres as string[]) || [],
          numberOfSeasons: (meta.numberOfSeasons as number | null) ?? (meta.number_of_seasons as number | null) ?? null,
          numberOfEpisodes: (meta.numberOfEpisodes as number | null) ?? (meta.number_of_episodes as number | null) ?? null,
          episodeRunTime: (meta.episodeRunTime as number[] | number | null) ?? (meta.episode_run_time as number[] | number | null) ?? null,
          networks: (meta.networks as Array<{ id?: number; name?: string }>) || [],
          productionCompanies:
            (meta.productionCompanies as Array<{ id?: number; name?: string }>) ||
            (meta.production_companies as Array<{ id?: number; name?: string }>) ||
            [],
          originCountry: (meta.originCountry as string[] | string | null) ?? (meta.origin_country as string[] | string | null) ?? null,
          overview: (meta.overview as string) || "",
          status: (meta.status as string) || i.tvShow.status || "",
        },
      },
    };
  });

  // Calculate source fingerprint
  const currentFingerprint = generateTvSourceFingerprint(interactions);

  // Check if existing profile in DB is fresh
  const existingProfile = await db.userTvTasteProfile.findUnique({
    where: { userId },
  });

  if (existingProfile && existingProfile.profileJson) {
    try {
      const parsed = existingProfile.profileJson as unknown as TvDnaResult;
      const cachedFingerprint = (parsed as any)?.sourceFingerprint;

      const isFresh =
        cachedFingerprint === currentFingerprint &&
        existingProfile.version === TV_DNA_SCHEMA_VERSION &&
        (parsed as any)?.algorithmVersion === TV_DNA_ALGORITHM_VERSION;

      if (isFresh) {
        return {
          ready: parsed.evidenceCount >= 5,
          required: requiredCount,
          current: parsed.evidenceCount,
          evaluatedCount: totalInteractions,
          evidenceCount: parsed.evidenceCount,
          confidence: parsed.confidence,
          maturity: parsed.maturity,
          maturityLabel: parsed.maturityLabel,
          profile: parsed,
          lastUpdated: existingProfile.updatedAt.toISOString(),
        };
      }
    } catch {
      // If cached profile JSON is invalid, recalculate
    }
  }

  // 2. Deterministic Calculation (Stale or Missing)
  const result = calculateTvTasteProfile(formattedData);
  result.sourceFingerprint = currentFingerprint;

  // 3. Persist Updated Profile in PostgreSQL
  await db.userTvTasteProfile.upsert({
    where: { userId },
    update: {
      version: TV_DNA_SCHEMA_VERSION,
      profileJson: result as unknown as Prisma.InputJsonValue,
      confidence: result.confidence,
      sourceInteractionCount: totalInteractions,
    },
    create: {
      userId,
      version: TV_DNA_SCHEMA_VERSION,
      profileJson: result as unknown as Prisma.InputJsonValue,
      confidence: result.confidence,
      sourceInteractionCount: totalInteractions,
    },
  });

  return {
    ready: result.evidenceCount >= 5,
    required: requiredCount,
    current: result.evidenceCount,
    evaluatedCount: totalInteractions,
    evidenceCount: result.evidenceCount,
    confidence: result.confidence,
    maturity: result.maturity,
    maturityLabel: result.maturityLabel,
    profile: result,
    lastUpdated: new Date().toISOString(),
  };
}
