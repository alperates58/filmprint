import {
  EligibleTvShowInput,
  TvEligibilityContext,
  TvEligibilityResult,
  TvEligibilityRejectionReason,
} from "./types";
import { isExplicitAdultContent, isGenericOverview } from "../movies/denylist";
import { getDisplayTitleScriptStats, isDisplayTitleAllowed } from "@/lib/content/title-safety";
import { resolveCanonicalGenreIds } from "@/lib/catalog/genres";

/**
 * Hard exclusion TV genre IDs for automatic general discovery contexts:
 * - 10762: Kids (Çocuk)
 * - 10763: News (Haber)
 * - 10767: Talk Show
 */
export const TV_DISCOVERY_EXCLUDED_GENRE_IDS = [10762, 10763, 10767] as const;

export const AUTOMATIC_TV_DISCOVERY_CONTEXTS: ReadonlySet<TvEligibilityContext> = new Set([
  "CALIBRATION",
  "RECOMMENDATION",
  "HOME",
  "FRESH_DISCOVERY",
]);

/**
 * Normalizes varied TV show objects (Prisma TvShow, TMDBTvShow, CandidateTvShow, etc.)
 * into a standard format for evaluation.
 */
function normalizeTvInput(show: EligibleTvShowInput) {
  const meta = (show.metadata as Record<string, unknown>) || {};

  const name = (show.name || show.title || (meta.name as string) || (meta.title as string) || "").trim();
  const originalName = (
    show.originalName ||
    show.original_name ||
    (meta.originalName as string) ||
    (meta.original_name as string) ||
    ""
  ).trim();
  const englishTitle = ((meta.englishTitle as string) || "").trim();

  const overview = (
    show.overview ||
    (meta.overview as string) ||
    ""
  ).trim();

  const posterPath =
    show.posterPath !== undefined
      ? show.posterPath
      : show.poster_path !== undefined
      ? show.poster_path
      : (meta.posterPath as string | null) || (meta.poster_path as string | null) || null;

  const rawFirstAirDate =
    show.firstAirDate ||
    show.first_air_date ||
    (meta.firstAirDate as string) ||
    (meta.first_air_date as string) ||
    null;

  const voteAverage =
    typeof show.voteAverage === "number"
      ? show.voteAverage
      : typeof show.vote_average === "number"
      ? show.vote_average
      : typeof meta.voteAverage === "number"
      ? (meta.voteAverage as number)
      : typeof meta.vote_average === "number"
      ? (meta.vote_average as number)
      : 0.0;

  const popularity =
    typeof show.popularity === "number"
      ? show.popularity
      : typeof meta.popularity === "number"
      ? (meta.popularity as number)
      : 0.0;

  const voteCount =
    typeof show.voteCount === "number"
      ? show.voteCount
      : typeof show.vote_count === "number"
      ? show.vote_count
      : typeof meta.voteCount === "number"
      ? (meta.voteCount as number)
      : typeof meta.vote_count === "number"
      ? (meta.vote_count as number)
      : undefined;

  let rawGenresList: Array<number | string | { id?: number; name?: string }> = [];
  if (Array.isArray(show.genreIds) && show.genreIds.length > 0) {
    rawGenresList = show.genreIds;
  } else if (Array.isArray(show.genre_ids) && show.genre_ids.length > 0) {
    rawGenresList = show.genre_ids;
  } else if (Array.isArray(meta.genreIds) && (meta.genreIds as number[]).length > 0) {
    rawGenresList = meta.genreIds as number[];
  } else if (Array.isArray(meta.genre_ids) && (meta.genre_ids as number[]).length > 0) {
    rawGenresList = meta.genre_ids as number[];
  } else if (Array.isArray(show.genres) && show.genres.length > 0) {
    rawGenresList = show.genres;
  } else if (Array.isArray(meta.genres) && (meta.genres as any[]).length > 0) {
    rawGenresList = meta.genres as any[];
  }

  const canonicalGenreIds = resolveCanonicalGenreIds(rawGenresList, "TV");

  let genres: string[] = [];
  if (Array.isArray(show.genres)) {
    genres = show.genres.map((g: any) =>
      typeof g === "string" ? g : g.name || ""
    );
  } else if (Array.isArray(meta.genres)) {
    genres = meta.genres.map((g: any) =>
      typeof g === "string" ? g : g.name || ""
    );
  }

  const adult =
    show.adult === true ||
    (meta.adult as boolean) === true ||
    false;

  const safetyLevel = (show as any).safetyLevel || meta.safetyLevel || null;
  const normalizedMinimumAge = typeof (show as any).normalizedMinimumAge === "number"
    ? (show as any).normalizedMinimumAge
    : typeof meta.normalizedMinimumAge === "number"
    ? meta.normalizedMinimumAge
    : null;
  const contentRating = (show as any).contentRating || (meta.contentRating as string) || null;

  return {
    name,
    originalName,
    englishTitle,
    overview,
    posterPath: posterPath ? posterPath.trim() : null,
    firstAirDate: rawFirstAirDate ? rawFirstAirDate.trim() : null,
    voteAverage,
    popularity,
    voteCount,
    genres,
    canonicalGenreIds,
    adult,
    safetyLevel,
    normalizedMinimumAge,
    contentRating,
  };
}

/**
 * Centrally evaluates global eligibility for a TV show in a specific user-facing context.
 */
export function evaluateTvEligibility(
  show: EligibleTvShowInput,
  context: TvEligibilityContext = "CALIBRATION"
): TvEligibilityResult {
  const norm = normalizeTvInput(show);
  const reasons: TvEligibilityRejectionReason[] = [];

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // 1. HARD BLOCK: TMDB Adult Flag
  if (norm.adult) {
    reasons.push("ADULT_FLAG");
  }

  // 2. HARD BLOCK: Explicit Pornographic / Erotic Signals Denylist & 18+ Age Restriction
  const combinedTextToAudit = `${norm.name} ${norm.englishTitle} ${norm.originalName} ${norm.overview} ${norm.genres.join(" ")}`;
  if (isExplicitAdultContent(combinedTextToAudit)) {
    reasons.push("EXPLICIT_ADULT_KEYWORD");
  }

  if (
    norm.safetyLevel === "ADULT" ||
    norm.safetyLevel === "EROTIC" ||
    norm.safetyLevel === "SEXUAL_CONTENT" ||
    (norm.normalizedMinimumAge !== null && norm.normalizedMinimumAge >= 18)
  ) {
    if (!reasons.includes("ADULT_FLAG") && !reasons.includes("EXPLICIT_ADULT_KEYWORD")) {
      reasons.push("ADULT_FLAG");
    }
  }

  // 3. CANONICAL GENERAL-DISCOVERY EXCLUSIONS (Kids, News, Talk Show)
  // Applied strictly to automatic discovery contexts (CALIBRATION, RECOMMENDATION, HOME, FRESH_DISCOVERY).
  // SEARCH preserves explicit user intent. LIBRARY preserves historical user content.
  if (AUTOMATIC_TV_DISCOVERY_CONTEXTS.has(context)) {
    if (norm.canonicalGenreIds.includes(10762)) {
      reasons.push("KIDS_CONTENT");
    }
    if (norm.canonicalGenreIds.includes(10763)) {
      reasons.push("NEWS_CONTENT");
    }
    if (norm.canonicalGenreIds.includes(10767)) {
      reasons.push("TALK_SHOW_CONTENT");
    }
  }

  // 4. Display Name Check (the user-facing localized field, not original language)
  if (norm.name.length === 0) {
    reasons.push("MISSING_TITLE");
  } else if (!isDisplayTitleAllowed(norm.name)) {
    reasons.push("NON_LATIN_DISPLAY_TITLE");
  }

  // 5. Poster Requirement (Relaxed for LIBRARY or SEARCH if title is present, but required for discovery)
  const hasValidPoster =
    norm.posterPath !== null &&
    norm.posterPath.length > 3 &&
    norm.posterPath !== "null" &&
    norm.posterPath !== "/null";

  if (!hasValidPoster && context !== "LIBRARY" && context !== "SEARCH") {
    reasons.push("MISSING_POSTER");
  }

  // 6. Overview Quality Check (Only for automatic discovery)
  if (context !== "SEARCH" && context !== "LIBRARY") {
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
  }

  // 7. Release Date / Future Air Date Check
  if (norm.firstAirDate && norm.firstAirDate > todayStr && context !== "SEARCH" && context !== "LIBRARY") {
    reasons.push("FUTURE_RELEASE");
  }

  // 8. Vote Count & Quality Floor (Only for automatic discovery)
  if (context !== "SEARCH" && context !== "LIBRARY") {
    if (typeof norm.voteCount === "number") {
      if (context === "CALIBRATION") {
        if (norm.voteCount < 40 && !(norm.popularity >= 30 && norm.voteCount >= 20)) {
          reasons.push("LOW_VOTE_CONFIDENCE");
        }
      } else {
        if (norm.voteCount < 10) {
          reasons.push("LOW_VOTE_CONFIDENCE");
        }
      }
    } else {
      if (context === "CALIBRATION") {
        if (norm.voteAverage === 0 && norm.popularity < 5.0) {
          reasons.push("LOW_VOTE_CONFIDENCE");
        } else if (norm.popularity < 1.5 && norm.voteAverage < 5.0) {
          reasons.push("LOW_POPULARITY");
        }
      } else {
        if (norm.voteAverage === 0 && norm.popularity < 1.0) {
          reasons.push("LOW_VOTE_CONFIDENCE");
        }
      }
    }
  }

  const isEligible = reasons.length === 0;
  const titleScript = getDisplayTitleScriptStats(norm.name);

  return {
    isEligible,
    reason: reasons[0],
    reasons,
    context,
    details: {
      name: norm.name,
      titleLatinRatio: titleScript.latinRatio,
      firstAirDate: norm.firstAirDate,
      hasPoster: hasValidPoster,
      overviewLength: norm.overview.length,
      voteAverage: norm.voteAverage,
      voteCount: norm.voteCount,
      adult: norm.adult,
      canonicalGenreIds: norm.canonicalGenreIds,
    },
  };
}

/**
 * Boolean convenience helper to check if a TV show is eligible for a given context.
 */
export function isTvShowEligible(
  show: EligibleTvShowInput,
  context: TvEligibilityContext = "CALIBRATION"
): boolean {
  return evaluateTvEligibility(show, context).isEligible;
}

/**
 * Filters an array of candidate TV shows for a specific context.
 */
export function filterEligibleTvShows<T extends EligibleTvShowInput>(
  shows: T[],
  context: TvEligibilityContext = "CALIBRATION"
): T[] {
  return shows.filter((s) => isTvShowEligible(s, context));
}

/**
 * Classifies TV show discovery eligibility and returns machine-readable exclusion reasons.
 */
export function classifyTvDiscoveryEligibility(show: EligibleTvShowInput): {
  discoveryEligible: boolean;
  discoveryExclusionReasons: string[];
} {
  const result = evaluateTvEligibility(show, "RECOMMENDATION");
  const exclusionReasons = result.reasons.filter(
    (r) => r === "KIDS_CONTENT" || r === "NEWS_CONTENT" || r === "TALK_SHOW_CONTENT"
  );
  return {
    discoveryEligible: exclusionReasons.length === 0,
    discoveryExclusionReasons: exclusionReasons,
  };
}

