export const MIN_LATIN_DISPLAY_TITLE_RATIO = 0.8;

const LETTER_REGEX = /\p{L}/u;
const LATIN_LETTER_REGEX = /\p{Script=Latin}/u;
const NUMBER_REGEX = /\p{N}/u;

export interface DisplayTitleAnalysis {
  normalized: string;
  alphabeticCount: number;
  latinAlphabeticCount: number;
  nonLatinAlphabeticCount: number;
  latinRatio: number;
  hasNonLatinAlphabeticScript: boolean;
  isNumericOnlyOrNumericTitle: boolean;
  allowed: boolean;
}

export type DisplayTitleScriptStats = DisplayTitleAnalysis;

/**
 * Central source of truth for display title script and numeric safety analysis.
 *
 * Rules:
 * A) Title contains alphabetic characters:
 *    - Valid if Latin/Turkish alphabetic ratio >= MIN_LATIN_DISPLAY_TITLE_RATIO (0.80).
 *    - Invalid if dominated by non-Latin scripts (CJK, Cyrillic, Arabic, Hangul, etc.).
 *
 * B) Title contains 0 alphabetic characters:
 *    - Valid if it contains numeric digits (e.g. "2012", "1917", "17", "9", "1408", "28", "24", "11.22.63").
 *    - Invalid if empty or pure punctuation/symbols with no digits or letters.
 */
export function analyzeDisplayTitle(title: string): DisplayTitleAnalysis {
  const normalized = typeof title === "string" ? title.trim() : "";
  let alphabeticCount = 0;
  let latinAlphabeticCount = 0;
  let nonLatinAlphabeticCount = 0;
  let hasDigits = false;

  for (const character of normalized) {
    if (LETTER_REGEX.test(character)) {
      alphabeticCount++;
      if (LATIN_LETTER_REGEX.test(character)) {
        latinAlphabeticCount++;
      } else {
        nonLatinAlphabeticCount++;
      }
    } else if (NUMBER_REGEX.test(character)) {
      hasDigits = true;
    }
  }

  const hasNonLatinAlphabeticScript = nonLatinAlphabeticCount > 0;
  const isNumericOnlyOrNumericTitle = alphabeticCount === 0 && hasDigits && normalized.length > 0;

  let latinRatio = 0.0;
  let allowed = false;

  if (normalized.length > 0) {
    if (alphabeticCount > 0) {
      latinRatio = latinAlphabeticCount / alphabeticCount;
      allowed = latinRatio >= MIN_LATIN_DISPLAY_TITLE_RATIO;
    } else {
      // 0 alphabetic characters: valid if it's a numeric title
      latinRatio = isNumericOnlyOrNumericTitle ? 1.0 : 0.0;
      allowed = isNumericOnlyOrNumericTitle;
    }
  }

  return {
    normalized,
    alphabeticCount,
    latinAlphabeticCount,
    nonLatinAlphabeticCount,
    latinRatio,
    hasNonLatinAlphabeticScript,
    isNumericOnlyOrNumericTitle,
    allowed,
  };
}

/**
 * Backward-compatible wrapper returning the full DisplayTitleAnalysis.
 */
export function getDisplayTitleScriptStats(title: string): DisplayTitleScriptStats {
  return analyzeDisplayTitle(title);
}

export function isDisplayTitleAllowed(title: string): boolean {
  return analyzeDisplayTitle(title).allowed;
}

export type DisplayTitleSource = "LOCALIZED" | "ENGLISH" | "ORIGINAL";

export interface ResolvedDisplayTitle {
  title: string;
  source: DisplayTitleSource;
}

/**
 * Uses only title alternatives already present in the caller. It deliberately
 * does not fetch a translation, avoiding an N+1 TMDB request during ingestion.
 */
export function resolveAllowedDisplayTitle(input: {
  localizedTitle?: string | null;
  englishTitle?: string | null;
  originalTitle?: string | null;
}): ResolvedDisplayTitle | null {
  const candidates: Array<[DisplayTitleSource, string | null | undefined]> = [
    ["LOCALIZED", input.localizedTitle],
    ["ENGLISH", input.englishTitle],
    ["ORIGINAL", input.originalTitle],
  ];

  for (const [source, rawTitle] of candidates) {
    const title = rawTitle?.trim() || "";
    if (isDisplayTitleAllowed(title)) return { title, source };
  }

  return null;
}
