import { ContentSafetyLevel } from "@prisma/client";
import { isExplicitAdultContent } from "@/lib/movies/denylist";
import { isDisplayTitleAllowed } from "./title-safety";

export { ContentSafetyLevel };

export interface ParsedAgeCertification {
  contentRating: string | null;
  normalizedMinimumAge: number | null;
  sourceCountry: string | null;
}

export interface ContentSafetyEvaluationInput {
  adult?: boolean | null;
  contentRating?: string | null;
  normalizedMinimumAge?: number | null;
  title?: string | null;
  originalTitle?: string | null;
  englishTitle?: string | null;
  overview?: string | null;
  genres?: (string | number)[];
  keywords?: string[];
}

export interface ContentSafetyEvaluationResult {
  safetyLevel: ContentSafetyLevel;
  normalizedMinimumAge: number | null;
  contentRating: string | null;
  isBlocked: boolean; // Based on allow18PlusContent = false default
  reasons: string[];
}

/**
 * Extracts and normalizes minimum age from raw certification strings across international standards.
 * Respects country-specific nuances:
 * - Turkish (TR): "Genel İzleyici" -> 0, "6A"/"6+" -> 6, "10A"/"10+" -> 10, "13A"/"13+" -> 13, "16+" -> 16, "18+" -> 18
 * - US: "G" -> 0, "PG" -> 7, "PG-13" -> 13, "R" -> 17 (NOT 18+), "NC-17"/"X" -> 18, "TV-Y" -> 0, "TV-PG" -> 7, "TV-14" -> 14, "TV-MA" -> 17
 * - UK / DE / Global: parses exact numeric age tokens where available
 */
export function normalizeAgeCertification(
  rawRating?: string | null,
  countryCode: string = "GLOBAL"
): { contentRating: string | null; normalizedMinimumAge: number | null } {
  if (!rawRating || typeof rawRating !== "string") {
    return { contentRating: null, normalizedMinimumAge: null };
  }

  const clean = rawRating.trim();
  if (!clean || clean === "NR" || clean === "UNRATED" || clean === "NOT RATED") {
    return { contentRating: clean || null, normalizedMinimumAge: null };
  }

  const upper = clean
    .toUpperCase()
    .replace(/İ/g, "I")
    .replace(/ı/g, "I")
    .replace(/[\s-]/g, "");

  // 1. Explicit 18+ classifications (Hard 18)
  if (
    upper === "18" ||
    upper === "18+" ||
    upper === "NC17" ||
    upper === "X" ||
    upper === "XXX" ||
    upper === "FSK18" ||
    upper === "R18" ||
    upper === "R18+"
  ) {
    return { contentRating: clean, normalizedMinimumAge: 18 };
  }

  // 2. 16+ / 17 classifications (Allowed in general catalog, mature signal)
  if (
    upper === "16" ||
    upper === "16+" ||
    upper === "FSK16" ||
    upper === "R" ||
    upper === "TVMA" ||
    upper === "MA15+" ||
    upper === "15" ||
    upper === "15+"
  ) {
    const age = upper === "R" || upper === "TVMA" ? 17 : upper.startsWith("15") ? 15 : 16;
    return { contentRating: clean, normalizedMinimumAge: age };
  }

  // 3. 12+ / 13+ / 14+ classifications (Teens)
  if (
    upper === "12" ||
    upper === "12+" ||
    upper === "12A" ||
    upper === "13" ||
    upper === "13+" ||
    upper === "13A" ||
    upper === "PG13" ||
    upper === "TV14" ||
    upper === "FSK12" ||
    upper === "14" ||
    upper === "14+"
  ) {
    const age = upper === "TV14" || upper.startsWith("14") ? 14 : upper === "PG13" || upper.startsWith("13") ? 13 : 12;
    return { contentRating: clean, normalizedMinimumAge: age };
  }

  // 4. 6+ / 7+ / 10+ classifications (Children / Pre-teens)
  if (
    upper === "PG" ||
    upper === "TVPG" ||
    upper === "7" ||
    upper === "7+" ||
    upper === "6" ||
    upper === "6+" ||
    upper === "6A" ||
    upper === "10" ||
    upper === "10+" ||
    upper === "10A" ||
    upper === "FSK6"
  ) {
    const age = upper.startsWith("10") ? 10 : upper.startsWith("6") ? 6 : 7;
    return { contentRating: clean, normalizedMinimumAge: age };
  }

  // 5. Universal / General Audiences
  if (
    upper === "G" ||
    upper === "U" ||
    upper === "TVG" ||
    upper === "TVY" ||
    upper === "TVY7" ||
    upper === "0" ||
    upper === "0+" ||
    upper === "GENEL" ||
    upper === "GENELIZLEYICI"
  ) {
    return { contentRating: clean, normalizedMinimumAge: 0 };
  }

  // 6. Generic Numeric Fallback
  const numericMatch = clean.match(/\b(\d{1,2})\+?\b/);
  if (numericMatch) {
    const parsed = parseInt(numericMatch[1], 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 21) {
      return { contentRating: clean, normalizedMinimumAge: parsed };
    }
  }

  return { contentRating: clean, normalizedMinimumAge: null };
}

/**
 * Extracts the highest-confidence certification from TMDB details object with strict country precedence:
 * TR (Turkish) -> US -> GB -> Global.
 */
export function pickTmdbCertification(
  details: any,
  mediaType: "FILM" | "TV"
): ParsedAgeCertification {
  if (!details) {
    return { contentRating: null, normalizedMinimumAge: null, sourceCountry: null };
  }

  if (mediaType === "FILM") {
    const countries = details.release_dates?.results || [];
    for (const countryCode of ["TR", "US", "GB"]) {
      const entry = countries.find((c: any) => c.iso_3166_1 === countryCode);
      if (entry && Array.isArray(entry.release_dates)) {
        const rated = entry.release_dates
          .filter((r: any) => String(r.certification || "").trim().length > 0)
          .sort((a: any, b: any) => (a.type === 3 ? -1 : 0) - (b.type === 3 ? -1 : 0));
        if (rated[0]) {
          const raw = String(rated[0].certification).trim();
          const { contentRating, normalizedMinimumAge } = normalizeAgeCertification(raw, countryCode);
          return { contentRating, normalizedMinimumAge, sourceCountry: countryCode };
        }
      }
    }

    // Fallback to any available country rating
    for (const entry of countries) {
      if (Array.isArray(entry.release_dates)) {
        const rated = entry.release_dates.find((r: any) => String(r.certification || "").trim().length > 0);
        if (rated) {
          const raw = String(rated.certification).trim();
          const { contentRating, normalizedMinimumAge } = normalizeAgeCertification(raw, entry.iso_3166_1);
          return { contentRating, normalizedMinimumAge, sourceCountry: entry.iso_3166_1 || "OTHER" };
        }
      }
    }
  } else {
    const ratings = details.content_ratings?.results || [];
    for (const countryCode of ["TR", "US", "GB"]) {
      const entry = ratings.find((r: any) => r.iso_3166_1 === countryCode);
      if (entry && String(entry.rating || "").trim().length > 0) {
        const raw = String(entry.rating).trim();
        const { contentRating, normalizedMinimumAge } = normalizeAgeCertification(raw, countryCode);
        return { contentRating, normalizedMinimumAge, sourceCountry: countryCode };
      }
    }

    // Fallback to any available country rating
    for (const entry of ratings) {
      if (String(entry.rating || "").trim().length > 0) {
        const raw = String(entry.rating).trim();
        const { contentRating, normalizedMinimumAge } = normalizeAgeCertification(raw, entry.iso_3166_1);
        return { contentRating, normalizedMinimumAge, sourceCountry: entry.iso_3166_1 || "OTHER" };
      }
    }
  }

  return { contentRating: null, normalizedMinimumAge: null, sourceCountry: null };
}

/**
 * Centrally evaluates content safety across text, TMDB flags, certifications, and keywords.
 * Decouples content safety from age ratings:
 * - Adult / Erotic / Pornographic signals -> ADULT / EROTIC / SEXUAL_CONTENT
 * - High Age ratings without erotic signals (e.g. Saving Private Ryan, Fight Club) -> MATURE (with normalizedMinimumAge)
 */
export function evaluateContentSafety(
  input: ContentSafetyEvaluationInput
): ContentSafetyEvaluationResult {
  const reasons: string[] = [];

  // 1. Check Explicit TMDB Adult Flag
  if (input.adult === true) {
    reasons.push("ADULT_FLAG");
    return {
      safetyLevel: ContentSafetyLevel.ADULT,
      normalizedMinimumAge: 18,
      contentRating: input.contentRating || "18+",
      isBlocked: true,
      reasons,
    };
  }

  // 2. Check Explicit Erotic / Adult Text Signals across all available metadata
  const textCorpus = [
    input.title,
    input.originalTitle,
    input.englishTitle,
    input.overview,
    ...(input.keywords || []),
  ]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .join(" ");

  if (isExplicitAdultContent(textCorpus)) {
    reasons.push("EXPLICIT_ADULT_KEYWORD");
    return {
      safetyLevel: ContentSafetyLevel.EROTIC,
      normalizedMinimumAge: 18,
      contentRating: input.contentRating || "18+",
      isBlocked: true,
      reasons,
    };
  }

  // 3. Resolve Normalized Minimum Age from contentRating if not supplied
  let minimumAge = input.normalizedMinimumAge ?? null;
  if (minimumAge === null && input.contentRating) {
    const parsed = normalizeAgeCertification(input.contentRating);
    minimumAge = parsed.normalizedMinimumAge;
  }

  // 4. Classify Safety Level based on Age & Keywords
  let safetyLevel: ContentSafetyLevel = ContentSafetyLevel.SAFE;

  if (minimumAge !== null && minimumAge >= 18) {
    safetyLevel = ContentSafetyLevel.MATURE;
    reasons.push("AGE_18_PLUS");
  } else if (minimumAge !== null && minimumAge >= 16) {
    safetyLevel = ContentSafetyLevel.MATURE;
    reasons.push("AGE_16_PLUS");
  }

  const isBlocked = isCandidateBlocked(
    { safetyLevel, normalizedMinimumAge: minimumAge },
    false // allow18PlusContent = false
  );

  return {
    safetyLevel,
    normalizedMinimumAge: minimumAge,
    contentRating: input.contentRating || null,
    isBlocked,
    reasons,
  };
}

/**
 * Universal Gate: Evaluates if a candidate is blocked from calibration, discovery, or default recommendation supply.
 */
export function isCandidateBlocked(
  item: {
    safetyLevel?: ContentSafetyLevel | string | null;
    normalizedMinimumAge?: number | null;
    adult?: boolean | null;
  },
  allow18PlusContent: boolean = false
): boolean {
  if (item.adult === true) return true;

  const level = String(item.safetyLevel || "").toUpperCase();

  if (
    level === ContentSafetyLevel.ADULT ||
    level === ContentSafetyLevel.EROTIC ||
    level === ContentSafetyLevel.SEXUAL_CONTENT
  ) {
    return true;
  }

  if (!allow18PlusContent && (item.normalizedMinimumAge ?? 0) >= 18) {
    return true;
  }

  return false;
}
