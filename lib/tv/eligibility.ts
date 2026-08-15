import {
  EligibleTvShowInput,
  TvEligibilityContext,
  TvEligibilityResult,
  TvEligibilityRejectionReason,
} from "./types";
import { isExplicitAdultContent, isGenericOverview } from "../movies/denylist";

/**
 * Normalizes varied TV show objects (Prisma TvShow, TMDBTvShow, CandidateTvShow, etc.)
 * into a standard format for evaluation.
 */
function normalizeTvInput(show: EligibleTvShowInput) {
  const meta = (show.metadata as Record<string, unknown>) || {};

  const name = (show.name || (meta.name as string) || "").trim();
  const originalName = (
    show.originalName ||
    show.original_name ||
    (meta.originalName as string) ||
    ""
  ).trim();

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
      : (meta.posterPath as string | null) || null;

  const rawFirstAirDate =
    show.firstAirDate ||
    show.first_air_date ||
    (meta.firstAirDate as string) ||
    null;

  const voteAverage =
    typeof show.voteAverage === "number"
      ? show.voteAverage
      : typeof show.vote_average === "number"
      ? show.vote_average
      : typeof meta.voteAverage === "number"
      ? (meta.voteAverage as number)
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
      : undefined;

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

  return {
    name,
    originalName,
    overview,
    posterPath: posterPath ? posterPath.trim() : null,
    firstAirDate: rawFirstAirDate ? rawFirstAirDate.trim() : null,
    voteAverage,
    popularity,
    voteCount,
    genres,
    adult,
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

  // 2. HARD BLOCK: Explicit Pornographic / Erotic Signals Denylist
  const combinedTextToAudit = `${norm.name} ${norm.originalName} ${norm.overview} ${norm.genres.join(" ")}`;
  if (isExplicitAdultContent(combinedTextToAudit)) {
    reasons.push("EXPLICIT_ADULT_KEYWORD");
  }

  // 3. Name Check
  if (norm.name.length === 0 && norm.originalName.length === 0) {
    reasons.push("MISSING_TITLE");
  }

  // 4. Poster Requirement
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

  // 6. Release Date / Future Air Date Check
  if (norm.firstAirDate && norm.firstAirDate > todayStr) {
    reasons.push("FUTURE_RELEASE");
  }

  // 7. Vote Count & Quality Floor
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

  const isEligible = reasons.length === 0;

  return {
    isEligible,
    reason: reasons[0],
    reasons,
    context,
    details: {
      name: norm.name,
      firstAirDate: norm.firstAirDate,
      hasPoster: hasValidPoster,
      overviewLength: norm.overview.length,
      voteAverage: norm.voteAverage,
      voteCount: norm.voteCount,
      adult: norm.adult,
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
