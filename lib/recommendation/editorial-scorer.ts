import type { CandidateMovie } from "../calibration/types";
import type { EditorialCategoryMode } from "./types";

export interface CategoryDiagnostics {
  category: EditorialCategoryMode;
  initialCandidateCount: number;
  afterContextFilter: number;
  afterQualityFilter: number;
  afterWatchedExclusion: number;
  afterFeedbackExclusion: number;
  afterCrossRowDedupe: number;
  afterRelaxation: number;
  finalCount: number;
}

/**
 * Computes category-specific ContextFit score (0.0 to 1.0) for a candidate movie.
 */
export function calculateCategoryContextFit(
  candidate: CandidateMovie,
  mode: EditorialCategoryMode
): number {
  const genres = candidate.genres || [];
  const overview = (candidate.overview || "").toLowerCase();
  const year = candidate.releaseYear || 2020;
  const pop = candidate.popularity || 50;
  const vote = candidate.voteAverage || 7.0;
  const isKnownUnwatched =
    (candidate as any).candidateSource === "KNOWN_UNWATCHED" ||
    (candidate as any).knownUnwatched;

  switch (mode) {
    case "KNOWN_UNWATCHED_ROW": {
      if (!isKnownUnwatched) return 0.0;
      let score = 0.6;
      if (vote >= 7.2) score += 0.2;
      if (pop >= 40) score += 0.2;
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "RAINY_COFFEE": {
      // Drama, Romance, Character-driven, Atmospheric
      let score = 0.2;
      if (genres.includes("Dram")) score += 0.4;
      if (genres.includes("Romantik")) score += 0.3;
      if (
        overview.includes("duygusal") ||
        overview.includes("yaşam") ||
        overview.includes("hüzün") ||
        overview.includes("ilişki") ||
        overview.includes("hikaye")
      ) score += 0.1;
      if (genres.includes("Aksiyon") || genres.includes("Korku")) score -= 0.2;
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "FAMILY_COMEDY": {
      // Comedy, Family, Animation
      let score = 0.1;
      if (genres.includes("Komedi")) score += 0.4;
      if (genres.includes("Aile")) score += 0.3;
      if (genres.includes("Animasyon")) score += 0.3;
      if (genres.includes("Macera")) score += 0.2;
      if (genres.includes("Korku") || genres.includes("Gerilim")) score -= 0.4;
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "HIGH_TENSION": {
      // Thriller, Horror, Mystery, Crime, Dark Drama
      let score = 0.1;
      if (genres.includes("Gerilim")) score += 0.4;
      if (genres.includes("Korku")) score += 0.4;
      if (genres.includes("Gizem")) score += 0.3;
      if (genres.includes("Suç")) score += 0.3;
      if (genres.includes("Aksiyon")) score += 0.2;
      if (genres.includes("Dram") && vote >= 7.0) score += 0.15; // Dark drama inclusion at RELAXED
      if (!genres.some((g) => ["Gerilim", "Korku", "Gizem", "Suç", "Aksiyon", "Dram"].includes(g))) {
        score = 0.05;
      }
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "MIND_BENDING": {
      // Sci-Fi, Fantasy, Mystery, Psychological, Reality
      let score = 0.1;
      if (genres.includes("Bilim Kurgu")) score += 0.5;
      if (genres.includes("Fantezi")) score += 0.3;
      if (genres.includes("Gizem")) score += 0.3;
      if (genres.includes("Gerilim")) score += 0.2;
      if (
        overview.includes("zaman") ||
        overview.includes("gerçeklik") ||
        overview.includes("zihin") ||
        overview.includes("uzay") ||
        overview.includes("rüya") ||
        overview.includes("giz")
      ) score += 0.2;
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "LIGHT_BUT_GOOD": {
      // Comedy, Family, Romance, warm Drama, high voteAverage >= 7.0
      let score = 0.2;
      if (vote >= 7.0) score += 0.3;
      if (genres.includes("Komedi") || genres.includes("Romantik") || genres.includes("Aile")) score += 0.4;
      if (genres.includes("Dram")) score += 0.2;
      if (genres.includes("Macera")) score += 0.2;
      if (genres.includes("Korku")) score -= 0.4;
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "SOLO_NIGHT": {
      // Crime, Mystery, Thriller, Neo-Noir, Cult, Deep Cinema
      let score = 0.2;
      if (genres.includes("Suç") || genres.includes("Gizem")) score += 0.4;
      if (genres.includes("Gerilim")) score += 0.3;
      if (genres.includes("Dram")) score += 0.25;
      if (genres.includes("Bilim Kurgu")) score += 0.2;
      if (genres.includes("Animasyon") || genres.includes("Aile")) score -= 0.3;
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "BRAINY": {
      // High voteAverage >= 7.5, Mystery, Drama, Sci-Fi, History, Biography
      let score = 0.2;
      if (vote >= 7.5) score += 0.4;
      if (genres.includes("Gizem") || genres.includes("Dram") || genres.includes("Bilim Kurgu") || genres.includes("Suç") || genres.includes("Tarih")) score += 0.3;
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "CLASSIC": {
      // Release year < 2005 or High Quality Iconic
      let score = 0.1;
      if (year < 2000) score += 0.5;
      else if (year < 2005) score += 0.3;
      if (vote >= 7.5) score += 0.3;
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "SHORT": {
      // Short pace proxy / runtime <= 115 min or high popularity/vote
      const runtime = (candidate as any).runtime || (candidate as any).metadata?.runtime;
      let score = 0.3;
      if (runtime && runtime <= 115) score += 0.5;
      else if (!runtime) score += 0.3;
      if (vote >= 6.8) score += 0.2;
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "HIDDEN_GEMS": {
      // Vote average >= 7.4, lower/moderate popularity (< 65)
      let score = 0.1;
      if (vote >= 7.4) score += 0.5;
      if (pop < 65) score += 0.4;
      if (pop >= 85) score -= 0.4;
      return Math.max(0.0, Math.min(1.0, score));
    }

    default:
      return 0.5;
  }
}

/**
 * Resolves category candidates using progressive context relaxation (STRICT -> NORMAL -> RELAXED).
 * Preserves a minimum CategoryFit floor (0.20) to prevent out-of-category insertions.
 */
export function filterCategoryCandidatesWithRelaxation(
  candidates: CandidateMovie[],
  mode: EditorialCategoryMode,
  targetCount: number = 8
): CandidateMovie[] {
  // Level 1: STRICT (ContextFit >= 0.50)
  const strict = candidates.filter(
    (m) => calculateCategoryContextFit(m, mode) >= 0.50
  );
  if (strict.length >= targetCount) return strict;

  // Level 2: NORMAL (ContextFit >= 0.35)
  const normal = candidates.filter(
    (m) => calculateCategoryContextFit(m, mode) >= 0.35
  );
  if (normal.length >= targetCount) return normal;

  // Level 3: RELAXED (ContextFit >= 0.20 Minimum Floor)
  const relaxed = candidates.filter(
    (m) => calculateCategoryContextFit(m, mode) >= 0.20
  );
  return relaxed;
}

/**
 * Reranks home modules ensuring global cross-row deduplication.
 * Policy:
 * - Same movie max 1 row under normal conditions.
 * - If candidate scarcity occurs for a row (less than 8 items), allow same movie in max 2 rows IF ContextFit >= 0.40.
 * - Never 3+ rows.
 */
export function deduplicateHomeModules<T extends { id: string; movies: CandidateMovie[] }>(
  modules: T[],
  allowSoftScarcity: boolean = true
): T[] {
  const movieUsageCount = new Map<string, number>();

  return modules.map((mod) => {
    const cleanMovies: CandidateMovie[] = [];

    for (const movie of mod.movies) {
      const currentUsage = movieUsageCount.get(movie.id) || 0;

      if (currentUsage === 0) {
        cleanMovies.push(movie);
        movieUsageCount.set(movie.id, 1);
      } else if (currentUsage === 1 && allowSoftScarcity) {
        // Soft scarcity exception: allow second row if current row has fewer than 8 movies
        if (cleanMovies.length < 8) {
          cleanMovies.push(movie);
          movieUsageCount.set(movie.id, 2);
        }
      }
    }

    return {
      ...mod,
      movies: cleanMovies,
    };
  });
}
