import {
  EligibleMovieInput,
  MovieEligibilityContext,
  MovieEligibilityResult,
  EligibilityRejectionReason,
} from "./types";
import { isExplicitAdultContent, isGenericOverview } from "./denylist";
import { getDisplayTitleScriptStats, isDisplayTitleAllowed } from "@/lib/content/title-safety";

/**
 * Normalizes varied movie objects (Prisma Movie, TMDBMovie, CandidateMovie, etc.)
 * into a standard format for evaluation.
 */
function normalizeMovieInput(movie: EligibleMovieInput) {
  const meta = (movie.metadata as Record<string, unknown>) || {};

  const title = (movie.title || (meta.title as string) || "").trim();
  const originalTitle = (
    movie.originalTitle ||
    movie.original_title ||
    (meta.originalTitle as string) ||
    ""
  ).trim();
  const englishTitle = ((meta.englishTitle as string) || "").trim();

  const overview = (
    movie.overview ||
    (meta.overview as string) ||
    ""
  ).trim();

  const posterPath =
    movie.posterPath !== undefined
      ? movie.posterPath
      : movie.poster_path !== undefined
      ? movie.poster_path
      : (meta.posterPath as string | null) || null;

  const rawReleaseDate =
    movie.releaseDate ||
    movie.release_date ||
    (meta.releaseDate as string) ||
    null;

  let releaseYear =
    typeof movie.releaseYear === "number"
      ? movie.releaseYear
      : rawReleaseDate
      ? parseInt(rawReleaseDate.substring(0, 4), 10)
      : typeof meta.releaseYear === "number"
      ? (meta.releaseYear as number)
      : null;

  if (releaseYear && isNaN(releaseYear)) releaseYear = null;

  const voteAverage =
    typeof movie.voteAverage === "number"
      ? movie.voteAverage
      : typeof movie.vote_average === "number"
      ? movie.vote_average
      : typeof meta.voteAverage === "number"
      ? (meta.voteAverage as number)
      : 0.0;

  const popularity =
    typeof movie.popularity === "number"
      ? movie.popularity
      : typeof meta.popularity === "number"
      ? (meta.popularity as number)
      : 0.0;

  const voteCount =
    typeof movie.voteCount === "number"
      ? movie.voteCount
      : typeof movie.vote_count === "number"
      ? movie.vote_count
      : typeof meta.voteCount === "number"
      ? (meta.voteCount as number)
      : undefined;

  let genres: string[] = [];
  if (Array.isArray(movie.genres)) {
    genres = movie.genres.map((g: any) =>
      typeof g === "string" ? g : g.name || ""
    );
  } else if (Array.isArray(meta.genres)) {
    genres = meta.genres.map((g: any) =>
      typeof g === "string" ? g : g.name || ""
    );
  }

  const adult =
    movie.adult === true ||
    (meta.adult as boolean) === true ||
    false;

  return {
    title,
    originalTitle,
    englishTitle,
    overview,
    posterPath: posterPath ? posterPath.trim() : null,
    releaseYear,
    releaseDate: rawReleaseDate ? rawReleaseDate.trim() : null,
    voteAverage,
    popularity,
    voteCount,
    genres,
    adult,
  };
}

/**
 * Centrally evaluates global eligibility for a movie in a specific user-facing context.
 */
export function evaluateMovieEligibility(
  movie: EligibleMovieInput,
  context: MovieEligibilityContext = "CALIBRATION"
): MovieEligibilityResult {
  const norm = normalizeMovieInput(movie);
  const reasons: EligibilityRejectionReason[] = [];

  const now = new Date();
  const currentYear = now.getFullYear();
  const todayStr = now.toISOString().slice(0, 10);

  // 1. HARD BLOCK: TMDB Adult Flag
  if (norm.adult) {
    reasons.push("ADULT_FLAG");
  }

  // 2. HARD BLOCK: Explicit Pornographic / Erotic Signals Denylist
  const combinedTextToAudit = `${norm.title} ${norm.englishTitle} ${norm.originalTitle} ${norm.overview} ${norm.genres.join(" ")}`;
  if (isExplicitAdultContent(combinedTextToAudit)) {
    reasons.push("EXPLICIT_ADULT_KEYWORD");
  }

  // 3. Display Title Check (the user-facing localized field, not original language)
  if (norm.title.length === 0) {
    reasons.push("MISSING_TITLE");
  } else if (!isDisplayTitleAllowed(norm.title)) {
    reasons.push("NON_LATIN_DISPLAY_TITLE");
  }

  // 4. Poster Requirement (Critical for Calibration & Visual Quality)
  const hasValidPoster =
    norm.posterPath !== null &&
    norm.posterPath.length > 3 &&
    norm.posterPath !== "null" &&
    norm.posterPath !== "/null";

  if (!hasValidPoster) {
    reasons.push("MISSING_POSTER");
  }

  // 5. Overview Quality Check
  if (norm.overview.length === 0) {
    reasons.push("MISSING_OVERVIEW");
  } else if (isGenericOverview(norm.overview)) {
    reasons.push("GENERIC_NO_OVERVIEW");
  } else {
    const minOverviewLength = context === "CALIBRATION" ? 40 : 25;
    if (norm.overview.length < minOverviewLength) {
      reasons.push("OVERVIEW_TOO_SHORT");
    }
  }

  // 6. Release Date / Future Release Check
  if (norm.releaseDate && norm.releaseDate > todayStr) {
    reasons.push("FUTURE_RELEASE");
  } else if (norm.releaseYear !== null) {
    if (norm.releaseYear > currentYear) {
      reasons.push("FUTURE_RELEASE");
    } else if (norm.releaseYear < 1888) {
      reasons.push("INVALID_YEAR");
    }
  }

  // 7. Vote Count & Quality Floor
  if (typeof norm.voteCount === "number") {
    if (context === "CALIBRATION") {
      if (norm.voteCount < 50 && !(norm.popularity >= 35 && norm.voteCount >= 25)) {
        reasons.push("LOW_VOTE_CONFIDENCE");
      }
    } else if (context === "HIDDEN_GEMS") {
      if (norm.voteCount < 15) {
        reasons.push("LOW_VOTE_CONFIDENCE");
      }
    } else {
      if (norm.voteCount < 10) {
        reasons.push("LOW_VOTE_CONFIDENCE");
      }
    }
  } else {
    // When voteCount is not recorded in local DB
    if (context === "CALIBRATION") {
      if (norm.voteAverage === 0 && norm.popularity < 5.0) {
        reasons.push("LOW_VOTE_CONFIDENCE");
      } else if (norm.popularity < 1.5 && norm.voteAverage < 5.0) {
        reasons.push("LOW_POPULARITY");
      }
    } else if (context === "HIDDEN_GEMS") {
      if (norm.voteAverage < 6.0) {
        reasons.push("LOW_VOTE_CONFIDENCE");
      }
    } else {
      if (norm.voteAverage === 0 && norm.popularity < 1.0) {
        reasons.push("LOW_VOTE_CONFIDENCE");
      }
    }
  }

  const isEligible = reasons.length === 0;
  const titleScript = getDisplayTitleScriptStats(norm.title);

  return {
    isEligible,
    reason: reasons[0],
    reasons,
    context,
    details: {
      title: norm.title,
      titleLatinRatio: titleScript.latinRatio,
      releaseYear: norm.releaseYear,
      hasPoster: hasValidPoster,
      overviewLength: norm.overview.length,
      voteAverage: norm.voteAverage,
      voteCount: norm.voteCount,
      adult: norm.adult,
    },
  };
}

/**
 * Boolean convenience helper to check if a movie is eligible for a given context.
 */
export function isMovieEligible(
  movie: EligibleMovieInput,
  context: MovieEligibilityContext = "CALIBRATION"
): boolean {
  return evaluateMovieEligibility(movie, context).isEligible;
}

/**
 * Filters an array of candidate movies for a specific context.
 */
export function filterEligibleMovies<T extends EligibleMovieInput>(
  movies: T[],
  context: MovieEligibilityContext = "CALIBRATION"
): T[] {
  return movies.filter((m) => isMovieEligible(m, context));
}
