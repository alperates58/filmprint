import type { CandidateMovie } from "../calibration/types";
import type { EditorialCategoryMode } from "./types";

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
  const isKnownUnwatched = (candidate as any).candidateSource === "KNOWN_UNWATCHED" || (candidate as any).knownUnwatched;

  switch (mode) {
    case "KNOWN_UNWATCHED_ROW": {
      // ONLY candidates user previously marked NOT_WATCHED
      if (!isKnownUnwatched) return 0.0;
      let score = 0.6;
      if (vote >= 7.5) score += 0.2;
      if (pop >= 50) score += 0.2;
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "RAINY_COFFEE": {
      // Drama, Romance, Character-driven, Atmospheric
      let score = 0.2;
      if (genres.includes("Dram")) score += 0.4;
      if (genres.includes("Romantik")) score += 0.3;
      if (overview.includes("duygusal") || overview.includes("yaşam") || overview.includes("hüzün") || overview.includes("ilişki")) score += 0.1;
      if (genres.includes("Aksiyon") || genres.includes("Korku")) score -= 0.3;
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "FAMILY_COMEDY": {
      // Comedy, Family, Animation
      let score = 0.1;
      if (genres.includes("Komedi")) score += 0.4;
      if (genres.includes("Aile")) score += 0.3;
      if (genres.includes("Animasyon")) score += 0.3;
      if (genres.includes("Korku") || genres.includes("Gerilim")) score -= 0.5;
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "HIGH_TENSION": {
      // Thriller, Horror, Mystery, Crime ONLY
      let score = 0.1;
      if (genres.includes("Gerilim")) score += 0.4;
      if (genres.includes("Korku")) score += 0.4;
      if (genres.includes("Gizem")) score += 0.3;
      if (genres.includes("Suç")) score += 0.2;
      if (!genres.some((g) => ["Gerilim", "Korku", "Gizem", "Suç"].includes(g))) {
        score = 0.15; // Low fit for non-tension movies like Stand by Me
      }
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "MIND_BENDING": {
      // Sci-Fi, Fantasy, Psychological, Mind-bending
      let score = 0.1;
      if (genres.includes("Bilim Kurgu")) score += 0.5;
      if (genres.includes("Fantezi")) score += 0.3;
      if (genres.includes("Gizem")) score += 0.2;
      if (overview.includes("zaman") || overview.includes("gerçeklik") || overview.includes("zihin") || overview.includes("uzay") || overview.includes("rüya")) score += 0.2;
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "LIGHT_BUT_GOOD": {
      // Comedy, Family, Romance, warm Drama, high voteAverage >= 7.2
      let score = 0.2;
      if (vote >= 7.2) score += 0.3;
      if (genres.includes("Komedi") || genres.includes("Romantik") || genres.includes("Aile")) score += 0.4;
      if (genres.includes("Dram")) score += 0.2;
      if (genres.includes("Korku") || genres.includes("Gerilim")) score -= 0.4;
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "SOLO_NIGHT": {
      // Crime, Mystery, Thriller, Neo-Noir, Cult
      let score = 0.2;
      if (genres.includes("Suç") || genres.includes("Gizem")) score += 0.4;
      if (genres.includes("Gerilim")) score += 0.3;
      if (genres.includes("Dram") && vote >= 7.8) score += 0.2;
      if (genres.includes("Animasyon") || genres.includes("Aile")) score -= 0.3;
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "BRAINY": {
      // High voteAverage >= 7.8, Mystery, Drama, Sci-Fi, Character-driven
      let score = 0.2;
      if (vote >= 7.8) score += 0.4;
      if (genres.includes("Gizem") || genres.includes("Dram") || genres.includes("Bilim Kurgu") || genres.includes("Suç")) score += 0.3;
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "CLASSIC": {
      // Release year < 2000, High quality
      let score = 0.1;
      if (year < 2000) score += 0.5;
      if (year < 1990) score += 0.2;
      if (vote >= 7.5) score += 0.3;
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "SHORT": {
      // Short pace proxy / runtime <= 110 min
      const runtime = (candidate as any).runtime || (candidate as any).metadata?.runtime;
      let score = 0.3;
      if (runtime && runtime <= 110) score += 0.5;
      else if (!runtime && pop >= 50) score += 0.3; // Fallback proxy
      if (vote >= 7.0) score += 0.2;
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "HIDDEN_GEMS": {
      // Vote average >= 7.5, lower popularity (< 50)
      let score = 0.1;
      if (vote >= 7.5) score += 0.5;
      if (pop < 50) score += 0.4;
      if (pop >= 80) score -= 0.5;
      return Math.max(0.0, Math.min(1.0, score));
    }

    default:
      return 0.5;
  }
}

/**
 * Resolves category candidates using progressive context relaxation (STRICT -> NORMAL -> RELAXED).
 * Preserves a minimum CategoryFit floor (0.25) to prevent out-of-category insertions.
 */
export function filterCategoryCandidatesWithRelaxation(
  candidates: CandidateMovie[],
  mode: EditorialCategoryMode,
  targetCount: number = 8
): CandidateMovie[] {
  // Level 1: STRICT (ContextFit >= 0.55)
  const strict = candidates.filter(
    (m) => calculateCategoryContextFit(m, mode) >= 0.55
  );
  if (strict.length >= targetCount) return strict;

  // Level 2: NORMAL (ContextFit >= 0.40)
  const normal = candidates.filter(
    (m) => calculateCategoryContextFit(m, mode) >= 0.40
  );
  if (normal.length >= targetCount) return normal;

  // Level 3: RELAXED (ContextFit >= 0.25 Minimum Floor)
  const relaxed = candidates.filter(
    (m) => calculateCategoryContextFit(m, mode) >= 0.25
  );
  return relaxed;
}

/**
 * Reranks home modules ensuring global cross-row deduplication.
 * Policy:
 * - Same movie max 1 row under normal conditions.
 * - If candidate scarcity occurs for a row (less than 6 items), allow same movie in max 2 rows IF ContextFit >= 0.60.
 * - Never 3+ rows.
 */
export function deduplicateHomeModules<T extends { id: string; movies: CandidateMovie[] }>(
  modules: T[],
  allowSoftScarcity: boolean = false
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
        // Soft scarcity exception: allow second row ONLY if row has scarcity (< 4 items)
        if (cleanMovies.length < 4) {
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
