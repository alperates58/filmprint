import { isExplicitAdultContent, isGenericOverview } from "@/lib/movies/denylist";
import { getDisplayTitleScriptStats, isDisplayTitleAllowed } from "@/lib/content/title-safety";
import { isMeaningfulOverview } from "@/lib/content/overview-safety";

export type SeoEligibilityStatus =
  | "SEO_ELIGIBLE"
  | "SEO_LOW_QUALITY"
  | "SEO_BLOCKED"
  | "SEO_MISSING_DATA";

export type SeoRejectionReason =
  | "ADULT_FLAG"
  | "EXPLICIT_ADULT_KEYWORD"
  | "NON_LATIN_DISPLAY_TITLE"
  | "MISSING_TITLE"
  | "MISSING_POSTER_OR_BACKDROP"
  | "MISSING_OVERVIEW"
  | "GENERIC_OVERVIEW"
  | "OVERVIEW_TOO_SHORT"
  | "MISSING_GENRES"
  | "FUTURE_RELEASE"
  | "INVALID_YEAR"
  | "LOW_POPULARITY_OR_VOTES"
  | "MANUAL_FORCE_NOINDEX";

export interface SeoEligibilityResult {
  isEligible: boolean;
  status: SeoEligibilityStatus;
  primaryReason: SeoRejectionReason | "ELIGIBLE";
  reasons: SeoRejectionReason[];
  robots: {
    index: boolean;
    follow: boolean;
  };
  details: {
    title: string;
    tmdbId: number;
    hasPoster: boolean;
    hasBackdrop: boolean;
    overviewLength: number;
    genresCount: number;
    voteAverage: number;
    popularity: number;
    releaseYear: number | null;
  };
}

export interface GenericMediaInput {
  id?: string;
  tmdbId: number;
  title?: string;
  name?: string;
  originalTitle?: string | null;
  originalName?: string | null;
  overview?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseYear?: number | null;
  releaseDate?: string | null;
  firstAirDate?: string | null;
  voteAverage?: number;
  voteCount?: number | null;
  popularity?: number;
  genres?: string[] | { id: number; name: string }[];
  adult?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Normalizes movie input for SEO evaluation.
 */
function normalizeMovieInput(movie: GenericMediaInput) {
  const meta = (movie.metadata as Record<string, unknown>) || {};
  const title = (movie.title || (meta.title as string) || (meta.turkishTitle as string) || "").trim();
  const originalTitle = (movie.originalTitle || (meta.originalTitle as string) || "").trim();
  const englishTitle = ((meta.englishTitle as string) || "").trim();
  const overview = (movie.overview || (meta.overview as string) || "").trim();

  const posterPath = movie.posterPath || (meta.posterPath as string | null) || null;
  const backdropPath = movie.backdropPath || (meta.backdropPath as string | null) || null;

  const rawDate = movie.releaseDate || (meta.releaseDate as string) || null;
  let releaseYear =
    typeof movie.releaseYear === "number"
      ? movie.releaseYear
      : rawDate
      ? parseInt(rawDate.substring(0, 4), 10)
      : typeof meta.releaseYear === "number"
      ? (meta.releaseYear as number)
      : null;

  if (releaseYear && isNaN(releaseYear)) releaseYear = null;

  const voteAverage =
    typeof movie.voteAverage === "number"
      ? movie.voteAverage
      : typeof meta.voteAverage === "number"
      ? (meta.voteAverage as number)
      : 0.0;

  const popularity =
    typeof movie.popularity === "number"
      ? movie.popularity
      : typeof meta.popularity === "number"
      ? (meta.popularity as number)
      : 0.0;

  let genres: string[] = [];
  if (Array.isArray(movie.genres)) {
    genres = movie.genres.map((g: any) => (typeof g === "string" ? g : g?.name || "")).filter(Boolean);
  } else if (Array.isArray(meta.genres)) {
    genres = meta.genres.map((g: any) => (typeof g === "string" ? g : g?.name || "")).filter(Boolean);
  }

  const adult = movie.adult === true || (meta.adult as boolean) === true;
  const seoOverride = ((movie as any).seoOverride as string) || (meta.seoOverride as string) || null;

  return {
    tmdbId: movie.tmdbId,
    title,
    originalTitle,
    englishTitle,
    overview,
    posterPath,
    backdropPath,
    releaseYear,
    releaseDate: rawDate,
    voteAverage,
    popularity,
    genres,
    adult,
    seoOverride,
  };
}

/**
 * Normalizes TV input for SEO evaluation.
 */
function normalizeTvInput(show: GenericMediaInput) {
  const meta = (show.metadata as Record<string, unknown>) || {};
  const name = (show.name || show.title || (meta.name as string) || (meta.turkishTitle as string) || "").trim();
  const originalName = (show.originalName || (meta.originalName as string) || "").trim();
  const englishTitle = ((meta.englishTitle as string) || "").trim();
  const overview = (show.overview || (meta.overview as string) || "").trim();

  const posterPath = show.posterPath || (meta.posterPath as string | null) || null;
  const backdropPath = show.backdropPath || (meta.backdropPath as string | null) || null;

  const rawDate = show.firstAirDate || (meta.firstAirDate as string) || null;
  let releaseYear = rawDate ? parseInt(rawDate.substring(0, 4), 10) : null;
  if (releaseYear && isNaN(releaseYear)) releaseYear = null;

  const voteAverage =
    typeof show.voteAverage === "number"
      ? show.voteAverage
      : typeof meta.voteAverage === "number"
      ? (meta.voteAverage as number)
      : 0.0;

  const popularity =
    typeof show.popularity === "number"
      ? show.popularity
      : typeof meta.popularity === "number"
      ? (meta.popularity as number)
      : 0.0;

  let genres: string[] = [];
  if (Array.isArray(show.genres)) {
    genres = show.genres.map((g: any) => (typeof g === "string" ? g : g?.name || "")).filter(Boolean);
  } else if (Array.isArray(meta.genres)) {
    genres = meta.genres.map((g: any) => (typeof g === "string" ? g : g?.name || "")).filter(Boolean);
  }

  const adult = show.adult === true || (meta.adult as boolean) === true;
  const seoOverride = ((show as any).seoOverride as string) || (meta.seoOverride as string) || null;

  return {
    tmdbId: show.tmdbId,
    title: name,
    originalTitle: originalName,
    englishTitle,
    overview,
    posterPath,
    backdropPath,
    releaseYear,
    releaseDate: rawDate,
    voteAverage,
    popularity,
    genres,
    adult,
    seoOverride,
  };
}

/**
 * Deterministically evaluates SEO quality gate for any Movie.
 */
export function evaluateMovieSeoEligibility(movie: GenericMediaInput): SeoEligibilityResult {
  const norm = normalizeMovieInput(movie);
  return evaluateNormalizedMedia(norm);
}

/**
 * Deterministically evaluates SEO quality gate for any TV Show.
 */
export function evaluateTvSeoEligibility(show: GenericMediaInput): SeoEligibilityResult {
  const norm = normalizeTvInput(show);
  return evaluateNormalizedMedia(norm);
}

/**
 * Shared deterministic quality evaluation.
 */
function evaluateNormalizedMedia(norm: ReturnType<typeof normalizeMovieInput>): SeoEligibilityResult {
  const reasons: SeoRejectionReason[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const todayStr = now.toISOString().slice(0, 10);

  // Manual Force Override
  if (norm.seoOverride === "FORCE_NOINDEX") {
    reasons.push("MANUAL_FORCE_NOINDEX");
  }

  // 1. HARD BLOCKS: Adult / Explicit
  if (norm.adult) {
    reasons.push("ADULT_FLAG");
  }
  const combinedAudit = `${norm.title} ${norm.englishTitle} ${norm.originalTitle} ${norm.overview} ${norm.genres.join(" ")}`;
  if (isExplicitAdultContent(combinedAudit)) {
    reasons.push("EXPLICIT_ADULT_KEYWORD");
  }

  // 2. Title Script & Presence
  if (!norm.title || norm.title.length === 0) {
    reasons.push("MISSING_TITLE");
  } else if (!isDisplayTitleAllowed(norm.title)) {
    reasons.push("NON_LATIN_DISPLAY_TITLE");
  }

  // 3. Poster or Backdrop Requirement
  const hasValidPoster = Boolean(
    norm.posterPath &&
      norm.posterPath.length > 3 &&
      norm.posterPath !== "null" &&
      norm.posterPath !== "/null"
  );
  const hasValidBackdrop = Boolean(
    norm.backdropPath &&
      norm.backdropPath.length > 3 &&
      norm.backdropPath !== "null" &&
      norm.backdropPath !== "/null"
  );
  if (!hasValidPoster && !hasValidBackdrop) {
    reasons.push("MISSING_POSTER_OR_BACKDROP");
  }

  // 4. Overview Meaningfulness
  if (!norm.overview || norm.overview.length === 0) {
    reasons.push("MISSING_OVERVIEW");
  } else if (!isMeaningfulOverview(norm.overview) || isGenericOverview(norm.overview)) {
    reasons.push("GENERIC_OVERVIEW");
  } else if (norm.overview.trim().length < 25) {
    reasons.push("OVERVIEW_TOO_SHORT");
  }

  // 5. Genres
  if (!norm.genres || norm.genres.length === 0) {
    reasons.push("MISSING_GENRES");
  }

  // 6. Release Date Validity
  if (norm.releaseDate && norm.releaseDate > todayStr) {
    reasons.push("FUTURE_RELEASE");
  } else if (norm.releaseYear !== null) {
    if (norm.releaseYear > currentYear) {
      reasons.push("FUTURE_RELEASE");
    } else if (norm.releaseYear < 1888) {
      reasons.push("INVALID_YEAR");
    }
  }

  // 7. Minimum Quality Floor
  // Filter out zero-signal ghost records
  if (norm.voteAverage <= 0 && norm.popularity < 0.5) {
    reasons.push("LOW_POPULARITY_OR_VOTES");
  }

  // Manual Force Index override bypasses non-safety quality checks
  const isForceIndex = norm.seoOverride === "FORCE_INDEX" && !norm.adult && !reasons.includes("EXPLICIT_ADULT_KEYWORD");

  const isEligible = isForceIndex || reasons.length === 0;

  let status: SeoEligibilityStatus = "SEO_ELIGIBLE";
  if (!isEligible) {
    if (reasons.includes("ADULT_FLAG") || reasons.includes("EXPLICIT_ADULT_KEYWORD") || reasons.includes("MANUAL_FORCE_NOINDEX")) {
      status = "SEO_BLOCKED";
    } else if (reasons.includes("MISSING_TITLE") || reasons.includes("MISSING_POSTER_OR_BACKDROP") || reasons.includes("MISSING_OVERVIEW") || reasons.includes("MISSING_GENRES")) {
      status = "SEO_MISSING_DATA";
    } else {
      status = "SEO_LOW_QUALITY";
    }
  }

  const primaryReason = isEligible ? "ELIGIBLE" : reasons[0];
  const isAdultBlocked = reasons.includes("ADULT_FLAG") || reasons.includes("EXPLICIT_ADULT_KEYWORD");

  return {
    isEligible,
    status,
    primaryReason,
    reasons,
    robots: {
      index: isEligible,
      follow: !isAdultBlocked, // Follow internal links on normal pages, but strictly nofollow on adult/blocked
    },
    details: {
      title: norm.title,
      tmdbId: norm.tmdbId,
      hasPoster: hasValidPoster,
      hasBackdrop: hasValidBackdrop,
      overviewLength: norm.overview.length,
      genresCount: norm.genres.length,
      voteAverage: norm.voteAverage,
      popularity: norm.popularity,
      releaseYear: norm.releaseYear,
    },
  };
}

/**
 * Boolean helper for Movie SEO eligibility.
 */
export function isSeoEligibleMovie(movie: GenericMediaInput): boolean {
  return evaluateMovieSeoEligibility(movie).isEligible;
}

/**
 * Boolean helper for TV Show SEO eligibility.
 */
export function isSeoEligibleTvShow(show: GenericMediaInput): boolean {
  return evaluateTvSeoEligibility(show).isEligible;
}
