export const MIN_LATIN_DISPLAY_TITLE_RATIO = 0.8;

const LETTER_REGEX = /\p{L}/u;
const LATIN_LETTER_REGEX = /\p{Script=Latin}/u;
const NUMBER_REGEX = /\p{N}/u;

export interface DisplayTitleScriptStats {
  alphabeticCount: number;
  latinAlphabeticCount: number;
  latinRatio: number;
  allowed: boolean;
}

/**
 * Measures only alphabetic characters. Digits, punctuation, emoji and spacing
 * are neutral, so a single decorative non-Latin character does not reject an
 * otherwise Latin display title.
 */
export function getDisplayTitleScriptStats(title: string): DisplayTitleScriptStats {
  const normalized = typeof title === "string" ? title.trim() : "";
  let alphabeticCount = 0;
  let latinAlphabeticCount = 0;

  for (const character of normalized) {
    if (!LETTER_REGEX.test(character)) continue;
    alphabeticCount++;
    if (LATIN_LETTER_REGEX.test(character)) latinAlphabeticCount++;
  }

  const latinRatio = alphabeticCount === 0 ? 0 : latinAlphabeticCount / alphabeticCount;
  const allowed =
    normalized.length > 0 &&
    (alphabeticCount === 0 ? NUMBER_REGEX.test(normalized) : latinRatio >= MIN_LATIN_DISPLAY_TITLE_RATIO);

  return {
    alphabeticCount,
    latinAlphabeticCount,
    latinRatio,
    allowed,
  };
}

export function isDisplayTitleAllowed(title: string): boolean {
  return getDisplayTitleScriptStats(title).allowed;
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
