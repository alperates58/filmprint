import type { CandidateMovie } from "@/lib/calibration/types";
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

  switch (mode) {
    case "RAINY_COFFEE": {
      // Drama, Romance, Atmospheric
      let score = 0.2;
      if (genres.includes("Dram")) score += 0.4;
      if (genres.includes("Romantik")) score += 0.3;
      if (overview.includes("duygusal") || overview.includes("yaşam") || overview.includes("hüzün")) score += 0.1;
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
      // Sci-Fi, Fantasy, Mind-bending
      let score = 0.1;
      if (genres.includes("Bilim Kurgu")) score += 0.5;
      if (genres.includes("Fantezi")) score += 0.3;
      if (overview.includes("zaman") || overview.includes("gerçeklik") || overview.includes("zihin") || overview.includes("uzay")) score += 0.2;
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "LIGHT_BUT_GOOD": {
      // Comedy, Drama, High voteAverage >= 7.5, light feel
      let score = 0.2;
      if (vote >= 7.5) score += 0.3;
      if (genres.includes("Komedi") || genres.includes("Dram")) score += 0.3;
      if (genres.includes("Korku") || genres.includes("Gerilim")) score -= 0.4;
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "SOLO_NIGHT": {
      // Crime, Mystery, Neo-Noir, Cult
      let score = 0.2;
      if (genres.includes("Suç") || genres.includes("Gizem")) score += 0.4;
      if (genres.includes("Dram") && vote >= 7.8) score += 0.2;
      if (genres.includes("Animasyon")) score -= 0.3;
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "BRAINY": {
      // Vote average >= 8.0, Character-driven, Mystery, Drama
      let score = 0.2;
      if (vote >= 8.0) score += 0.4;
      if (genres.includes("Gizem") || genres.includes("Dram") || genres.includes("Bilim Kurgu")) score += 0.3;
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "CLASSIC": {
      // Release year < 2000, High vote
      let score = 0.1;
      if (year < 2000) score += 0.6;
      if (year < 1990) score += 0.2;
      if (vote >= 7.5) score += 0.2;
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "SHORT": {
      // Short pace / single sitting
      let score = 0.4;
      if (pop >= 60) score += 0.3;
      if (vote >= 7.2) score += 0.3;
      return Math.max(0.0, Math.min(1.0, score));
    }

    case "HIDDEN_GEMS": {
      // Vote average >= 7.6, lower popularity (< 45)
      let score = 0.1;
      if (vote >= 7.6) score += 0.5;
      if (pop < 45) score += 0.4;
      if (pop >= 80) score -= 0.5;
      return Math.max(0.0, Math.min(1.0, score));
    }

    default:
      return 0.5;
  }
}

/**
 * Reranks home modules ensuring global cross-row deduplication.
 * Ensures a movie appears in AT MOST 1 row per home generation.
 */
export function deduplicateHomeModules<T extends { id: string; movies: CandidateMovie[] }>(
  modules: T[]
): T[] {
  const usedMovieIds = new Set<string>();

  return modules.map((mod) => {
    const cleanMovies: CandidateMovie[] = [];
    for (const movie of mod.movies) {
      if (!usedMovieIds.has(movie.id)) {
        cleanMovies.push(movie);
        usedMovieIds.add(movie.id);
      }
    }
    return {
      ...mod,
      movies: cleanMovies,
    };
  });
}
