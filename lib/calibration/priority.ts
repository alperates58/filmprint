import { ContentSafetyLevel } from "@prisma/client";
import { isCandidateBlocked } from "@/lib/content/safety";

export interface PriorityScoreInput {
  popularity: number;
  voteAverage: number;
  voteCount: number;
  releaseYear: number | null;
  safetyLevel?: ContentSafetyLevel | string | null;
  normalizedMinimumAge?: number | null;
  adult?: boolean | null;
}

/**
 * Deterministically computes the Calibration Priority Score for a movie or TV show.
 * Formula:
 * AwarenessScore = 0.35 * S_pop + 0.25 * S_vote + 0.25 * S_qual + 0.15 * S_rec
 *
 * Guarantees high-awareness, culturally recognized, high-quality titles rank first,
 * preventing obscure titles with artificially high averages from dominating calibration.
 */
export function computeCalibrationPriorityScore(input: PriorityScoreInput): number {
  // Hard block: Erotic/Adult/18+ content receives -1.0 (disqualified from calibration)
  if (
    isCandidateBlocked(
      {
        safetyLevel: input.safetyLevel,
        normalizedMinimumAge: input.normalizedMinimumAge,
        adult: input.adult,
      },
      false
    )
  ) {
    return -1.0;
  }

  const popularity = Math.max(0, input.popularity || 0);
  const voteCount = Math.max(0, input.voteCount || 0);
  const voteAverage = Math.max(0, Math.min(10, input.voteAverage || 0));
  const releaseYear = input.releaseYear;

  // 1. Popularity Factor (logarithmic scale up to 500)
  const sPop = Math.min(1.0, Math.log10(popularity + 1) / Math.log10(501));

  // 2. Vote Count Factor (logarithmic scale up to 30,000)
  const sVote = Math.min(1.0, Math.log10(voteCount + 1) / Math.log10(30001));

  // 3. Bayesian Quality Floor (m=500, C=6.5)
  const bayesianRating = (voteCount * voteAverage + 500 * 6.5) / (voteCount + 500);
  const sQual = Math.max(0.0, Math.min(1.0, bayesianRating / 10));

  // 4. Recency & Timeless Classic Factor
  const currentYear = new Date().getFullYear();
  let sRec = 0.85;

  if (releaseYear && releaseYear >= 1888 && releaseYear <= currentYear) {
    const age = currentYear - releaseYear;
    if (age <= 8) {
      sRec = 1.0;
    } else if (age <= 16) {
      sRec = 0.85;
    } else if (age <= 25) {
      sRec = 0.70;
    } else {
      // Classics (>25 years): default 0.55, but iconic masterpieces (high votes & high quality) boosted to 0.95
      if (sVote >= 0.75 && sQual >= 0.75) {
        sRec = 0.95;
      } else {
        sRec = 0.55;
      }
    }
  }

  const rawScore = 0.35 * sPop + 0.25 * sVote + 0.25 * sQual + 0.15 * sRec;
  return Math.round(rawScore * 1000) / 1000;
}

export function foldTurkishDiacritics(str: string): string {
  return str
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/ı/g, "i")
    .replace(/Ş/g, "s")
    .replace(/ş/g, "s")
    .replace(/Ç/g, "c")
    .replace(/ç/g, "c")
    .replace(/Ğ/g, "g")
    .replace(/ğ/g, "g")
    .replace(/Ü/g, "u")
    .replace(/ü/g, "u")
    .replace(/Ö/g, "o")
    .replace(/ö/g, "o")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Generates a denormalized normalized search string combining localized, original, and english titles.
 * Used for PostgreSQL pg_trgm GIN indexing to enable sub-millisecond local calibration search.
 */
export function generateSearchNormalizedTitle(
  title: string,
  originalTitle?: string | null,
  englishTitle?: string | null
): string {
  const titles = [title, originalTitle, englishTitle]
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    .flatMap((t) => {
      const clean = t
        .toLowerCase()
        .replace(/['’".,/#!$%^&*;:{}=\-_`~()]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const folded = foldTurkishDiacritics(clean)
        .replace(/['’".,/#!$%^&*;:{}=\-_`~()]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return [clean, folded];
    });

  const unique = Array.from(new Set(titles));
  return unique.join(" | ");
}
