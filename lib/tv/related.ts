import { db } from "@/lib/db/client";
import { tmdbTvClient } from "@/lib/tmdb/tv/client";
import { isTvShowEligible } from "@/lib/tv/eligibility";
import { buildAutomaticTvDiscoveryWhere } from "@/lib/tv/discovery";

export interface RelatedTvInput {
  id: string;
  tmdbId: number;
  name: string;
  genres: string[];
  creators?: string[];
  firstAirYear?: number | null;
}

export interface RelatedTvResult {
  id: string;
  tmdbId: number;
  name: string;
  posterPath: string | null;
  firstAirDate: string | null;
}

/**
 * Calculates a semantic similarity score between two TV shows based on
 * genre overlap, creator match, release year proximity, and general quality.
 */
export function scoreTvSimilarity(
  source: { genres: string[]; creators?: string[]; firstAirYear?: number | null },
  candidate: { genres: string[]; creators?: string[]; firstAirYear?: number | null; voteAverage?: number; popularity?: number }
): number {
  let score = 0;

  // 1. Genre overlap (heavily weighted: +25 per shared genre)
  const sourceGenres = (source.genres || []).map((g) => g.toLowerCase().trim());
  const candidateGenres = (candidate.genres || []).map((g) => g.toLowerCase().trim());

  let genreOverlapCount = 0;
  for (const g of candidateGenres) {
    if (sourceGenres.includes(g)) {
      genreOverlapCount++;
    }
  }

  score += genreOverlapCount * 25;

  if (sourceGenres.length > 0 && genreOverlapCount === 0) {
    score -= 50;
  }

  // 2. Creator match (+30 points)
  const sourceCreators = (source.creators || []).map((c) => c.toLowerCase().trim());
  const candidateCreators = (candidate.creators || []).map((c) => c.toLowerCase().trim());
  const hasSharedCreator = candidateCreators.some((c) => sourceCreators.includes(c));
  if (hasSharedCreator) {
    score += 30;
  }

  // 3. Air era proximity (up to +15 points)
  if (source.firstAirYear && candidate.firstAirYear) {
    const diff = Math.abs(source.firstAirYear - candidate.firstAirYear);
    if (diff <= 3) score += 15;
    else if (diff <= 7) score += 10;
    else if (diff <= 15) score += 5;
  }

  // 4. Quality & popularity anchor
  const voteAvg = candidate.voteAverage || 0;
  const popularity = candidate.popularity || 0;
  score += voteAvg * 2 + Math.min(popularity / 20, 8);

  return score;
}

/**
 * Fetches high-quality related and similar TV shows for a TV detail page.
 * Uses TMDB Recommendations & Similar API first, then supplements/falls back
 * to local database similarity matching on genres, creators, and eras.
 */
export async function getRelatedTvShowsForShow(
  currentShow: RelatedTvInput,
  limit: number = 6
): Promise<RelatedTvResult[]> {
  const results: RelatedTvResult[] = [];
  const seenTmdbIds = new Set<number>([currentShow.tmdbId]);
  const seenDbIds = new Set<string>([currentShow.id]);

  // 1. Try fetching from TMDB Recommendations & Similar API
  try {
    const tmdbRecommendations = await tmdbTvClient.getSimilarAndRecommendedTvShows(
      currentShow.tmdbId,
      limit * 2
    );

    if (tmdbRecommendations && tmdbRecommendations.length > 0) {
      for (const rec of tmdbRecommendations) {
        if (!rec.id || seenTmdbIds.has(rec.id) || !rec.poster_path || rec.adult) continue;

        let dbShow: RelatedTvResult | null = await db.tvShow.findUnique({
          where: { tmdbId: rec.id },
          select: { id: true, tmdbId: true, name: true, posterPath: true, firstAirDate: true },
        });

        if (!dbShow) {
          const synced = await tmdbTvClient.syncTvShowToDatabase(rec);
          if (synced && synced.posterPath) {
            dbShow = {
              id: synced.id,
              tmdbId: synced.tmdbId,
              name: synced.name,
              posterPath: synced.posterPath,
              firstAirDate: synced.firstAirDate,
            };
          }
        }

        if (dbShow && dbShow.posterPath && !seenDbIds.has(dbShow.id)) {
          if (!isTvShowEligible(dbShow as any, "RECOMMENDATION")) continue;
          seenTmdbIds.add(dbShow.tmdbId);
          seenDbIds.add(dbShow.id);
          results.push(dbShow);
          if (results.length >= limit) break;
        }
      }
    }
  } catch (error) {
    console.error("[Related TV] TMDB fetch error; using local DB fallback:", error);
  }

  // 2. If we still need more shows to reach limit, perform smart local DB matching
  if (results.length < limit) {
    try {
      const localCandidates = await db.tvShow.findMany({
        where: buildAutomaticTvDiscoveryWhere({
          id: { notIn: Array.from(seenDbIds) },
          tmdbId: { notIn: Array.from(seenTmdbIds) },
        }),
        select: {
          id: true,
          tmdbId: true,
          name: true,
          posterPath: true,
          firstAirDate: true,
          voteAverage: true,
          popularity: true,
          genreIds: true,
          metadata: true,
        },
        take: 100,
      });

      const scored = localCandidates
        .filter((candidate) => isTvShowEligible(candidate as any, "RECOMMENDATION"))
        .map((candidate) => {
        const meta = (candidate.metadata as Record<string, any>) || {};
        const genres = Array.isArray(meta.genres) ? meta.genres : [];
        const creators = Array.isArray(meta.creators) ? meta.creators : [];
        const firstAirYear = candidate.firstAirDate
          ? parseInt(candidate.firstAirDate.slice(0, 4), 10)
          : null;

        const similarity = scoreTvSimilarity(
          {
            genres: currentShow.genres,
            creators: currentShow.creators,
            firstAirYear: currentShow.firstAirYear,
          },
          {
            genres,
            creators,
            firstAirYear,
            voteAverage: candidate.voteAverage,
            popularity: candidate.popularity,
          }
        );

        return {
          show: {
            id: candidate.id,
            tmdbId: candidate.tmdbId,
            name: candidate.name,
            posterPath: candidate.posterPath,
            firstAirDate: candidate.firstAirDate,
          },
          similarity,
        };
      });

      scored.sort((a, b) => b.similarity - a.similarity);

      for (const item of scored) {
        if (results.length >= limit) break;
        results.push(item.show);
        seenDbIds.add(item.show.id);
        seenTmdbIds.add(item.show.tmdbId);
      }
    } catch (error) {
      console.error("[Related TV] Local DB matching error:", error);
    }
  }

  return results.slice(0, limit);
}
