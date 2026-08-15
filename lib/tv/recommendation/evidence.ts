import { db } from "@/lib/db/client";
import type {
  CandidateTvShow,
  TvTasteEvidenceShow,
  TvTasteEvidenceProfile,
  TvReferenceEvidenceShow,
} from "./types";

export const MIN_TV_REFERENCE_SIMILARITY = 0.55;

/**
 * Builds user's TV Taste Evidence Profile from PostgreSQL.
 * Strictly separates positive evidence (LOVE, LIKE) from negative penalty signals (DISLIKE).
 */
export async function buildTvTasteEvidenceProfile(
  userId: string
): Promise<TvTasteEvidenceProfile> {
  const [positiveInteractions, negativeInteractions] = await Promise.all([
    db.tvInteraction.findMany({
      where: {
        userId,
        status: { in: ["WATCHED", "PARTIALLY_WATCHED"] },
        rating: { in: ["LOVE", "LIKE"] },
      },
      include: { tvShow: true },
      orderBy: { updatedAt: "desc" },
      take: 60,
    }),
    db.tvInteraction.findMany({
      where: {
        userId,
        rating: "DISLIKE",
      },
      include: { tvShow: true },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);

  const mapEvidence = (i: any): TvTasteEvidenceShow => {
    const meta = (i.tvShow.metadata as Record<string, any>) || {};
    const rawGenres = meta.genres || [];
    const genres: string[] = Array.isArray(rawGenres)
      ? rawGenres.map((g: any) => (typeof g === "string" ? g : g.name || "")).filter(Boolean)
      : [];

    const rawRun = meta.episodeRunTime ?? meta.episode_run_time;
    let runtime: number | null = null;
    if (Array.isArray(rawRun) && rawRun.length > 0 && typeof rawRun[0] === "number") {
      runtime = rawRun[0];
    } else if (typeof rawRun === "number") {
      runtime = rawRun;
    }

    const yearStr = i.tvShow.firstAirDate?.slice(0, 4);
    const firstAirYear = yearStr ? parseInt(yearStr, 10) : null;

    const networks = [
      ...(meta.networks || []).map((n: any) => n.name?.toLowerCase() || ""),
      ...(meta.productionCompanies || meta.production_companies || []).map((p: any) => p.name?.toLowerCase() || ""),
    ].filter(Boolean);

    return {
      id: i.tvShow.id,
      tmdbId: i.tvShow.tmdbId,
      name: i.tvShow.name,
      posterPath: i.tvShow.posterPath,
      rating: i.rating,
      status: i.status,
      genres,
      seasons: meta.numberOfSeasons ?? meta.number_of_seasons ?? null,
      runtime,
      firstAirYear: firstAirYear && !isNaN(firstAirYear) ? firstAirYear : null,
      originalLanguage: i.tvShow.originalLanguage || "en",
      networks,
    };
  };

  return {
    positiveEvidence: positiveInteractions.map(mapEvidence),
    negativeEvidence: negativeInteractions.map(mapEvidence),
    evidenceCount: positiveInteractions.length + negativeInteractions.length,
  };
}

/**
 * Calculates multi-dimensional similarity between a candidate and an evidence show.
 * Dimensions: Genre overlap (35%), Format/Seasons (20%), Runtime (15%), Era (10%), Language (10%), Network (10%).
 */
export function calculateTvSimilarity(
  candidate: CandidateTvShow,
  evidence: TvTasteEvidenceShow
): { similarity: number; sharedAttributes: string[] } {
  const sharedAttributes: string[] = [];

  // 1. Genre Overlap (Jaccard similarity)
  const candGenres = new Set((candidate.metadata?.genres || []).map((g) => g.toLowerCase()));
  const evGenres = new Set(evidence.genres.map((g) => g.toLowerCase()));

  let genreScore = 0;
  const commonGenres: string[] = [];
  for (const g of candGenres) {
    if (evGenres.has(g)) {
      commonGenres.push(g);
    }
  }

  const unionSize = new Set([...candGenres, ...evGenres]).size;
  if (unionSize > 0) {
    genreScore = commonGenres.length / unionSize;
    if (commonGenres.length > 0) {
      sharedAttributes.push(`Benzer tür: ${commonGenres.slice(0, 2).join(", ")}`);
    }
  }

  // 2. Format & Season Proximity
  const candSeasons = candidate.metadata?.numberOfSeasons ?? null;
  const evSeasons = evidence.seasons;
  let seasonScore = 0.5;

  if (candSeasons !== null && evSeasons !== null) {
    const diff = Math.abs(candSeasons - evSeasons);
    if (diff === 0) {
      seasonScore = 1.0;
      if (candSeasons === 1) sharedAttributes.push("Kompakt mini dizi formatı");
      else sharedAttributes.push(`${candSeasons} sezonluk benzer yapı`);
    } else if (diff <= 2) {
      seasonScore = 0.75;
    } else {
      seasonScore = 0.3;
    }
  }

  // 3. Runtime Proximity
  const rawRun = candidate.metadata?.episodeRunTime ?? candidate.metadata?.episode_run_time;
  let candRuntime: number | null = null;
  if (Array.isArray(rawRun) && rawRun.length > 0 && typeof rawRun[0] === "number") {
    candRuntime = rawRun[0];
  } else if (typeof rawRun === "number") {
    candRuntime = rawRun;
  }

  let runtimeScore = 0.5;
  if (candRuntime !== null && evidence.runtime !== null) {
    const rDiff = Math.abs(candRuntime - evidence.runtime);
    if (rDiff <= 10) {
      runtimeScore = 1.0;
      sharedAttributes.push(`Benzer bölüm süresi (~${candRuntime} dk)`);
    } else if (rDiff <= 25) {
      runtimeScore = 0.65;
    } else {
      runtimeScore = 0.2;
    }
  }

  // 4. Era Proximity
  const candYearStr = candidate.firstAirDate?.slice(0, 4);
  const candYear = candYearStr ? parseInt(candYearStr, 10) : null;
  let eraScore = 0.5;

  if (candYear && evidence.firstAirYear) {
    const yDiff = Math.abs(candYear - evidence.firstAirYear);
    if (yDiff <= 3) eraScore = 1.0;
    else if (yDiff <= 8) eraScore = 0.7;
    else eraScore = 0.3;
  }

  // 5. Language / International Proximity
  const candLang = candidate.originalLanguage || "en";
  let langScore = 0.5;
  if (candLang === evidence.originalLanguage) {
    langScore = 1.0;
    if (candLang !== "en") {
      sharedAttributes.push(`Aynı dil / bölge (${candLang.toUpperCase()})`);
    }
  }

  // 6. Network / Prestige Proximity
  const rawProd = (candidate.metadata?.productionCompanies || (candidate.metadata as any)?.production_companies || []) as any[];
  const candNetworks = [
    ...(candidate.metadata?.networks || []).map((n) => n.name?.toLowerCase() || ""),
    ...rawProd.map((p: any) => p.name?.toLowerCase() || ""),
  ];
  let networkScore = 0.5;
  const commonNetworks = candNetworks.filter((cn) => evidence.networks.includes(cn));
  if (commonNetworks.length > 0) {
    networkScore = 1.0;
    sharedAttributes.push(`Benzer yapımcı / platform`);
  }

  // Weighted composite similarity
  const totalSimilarity =
    genreScore * 0.35 +
    seasonScore * 0.20 +
    runtimeScore * 0.15 +
    eraScore * 0.10 +
    langScore * 0.10 +
    networkScore * 0.10;

  return {
    similarity: Number(Math.max(0.0, Math.min(1.0, totalSimilarity)).toFixed(3)),
    sharedAttributes,
  };
}

/**
 * Finds 0–3 grounded reference shows from user's positive evidence for a candidate.
 * Strictly uses LIKE / LOVE ratings.
 */
export function findGroundedTvEvidence(
  candidate: CandidateTvShow,
  positiveEvidence: TvTasteEvidenceShow[]
): TvReferenceEvidenceShow[] {
  const matches: Array<{
    show: TvTasteEvidenceShow;
    similarity: number;
    sharedAttributes: string[];
  }> = [];

  for (const ev of positiveEvidence) {
    const { similarity, sharedAttributes } = calculateTvSimilarity(candidate, ev);
    if (similarity >= MIN_TV_REFERENCE_SIMILARITY) {
      matches.push({ show: ev, similarity, sharedAttributes });
    }
  }

  // Sort by similarity descending
  matches.sort((a, b) => b.similarity - a.similarity);

  return matches.slice(0, 3).map((m) => ({
    id: m.show.id,
    tmdbId: m.show.tmdbId,
    name: m.show.name,
    posterPath: m.show.posterPath,
    rating: m.show.rating,
    similarity: m.similarity,
    sharedAttributes: m.sharedAttributes,
  }));
}

/**
 * Calculates dislike penalty for a candidate if it heavily overlaps with user's disliked shows.
 * Prevents repeating past bad experiences while never banning an entire genre.
 */
export function calculateTvDislikePenalty(
  candidate: CandidateTvShow,
  negativeEvidence: TvTasteEvidenceShow[]
): number {
  if (negativeEvidence.length === 0) return 0;

  let maxDislikeSim = 0;
  for (const dis of negativeEvidence) {
    const { similarity } = calculateTvSimilarity(candidate, dis);
    if (similarity > maxDislikeSim) {
      maxDislikeSim = similarity;
    }
  }

  // Only apply penalty if candidate is strongly similar to a disliked show (> 0.70)
  if (maxDislikeSim >= 0.85) return 12; // -12 points
  if (maxDislikeSim >= 0.70) return 6;  // -6 points
  return 0;
}
