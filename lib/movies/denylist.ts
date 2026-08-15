/**
 * Centralized denylist and pattern matchers for explicit adult / pornographic content
 * and meaningless generic overview placeholders.
 */

export const EXPLICIT_ADULT_KEYWORDS: string[] = [
  "porn",
  "porno",
  "pornography",
  "pornographic",
  "hardcore porn",
  "softcore porn",
  "hentai",
  "nsfw",
  "sex tape",
  "xxx",
  "erotik film",
  "adult film",
  "adult movie",
  "camsoda",
  "chaturbate",
  "playboy",
  "penthouse",
  "brazzers",
  "x-rated",
  "x rated",
  "sexploitation",
  "erotic animation",
  "nudity only",
  "webcam model",
];

// Compiled regex with strict word boundaries to avoid false positives (e.g., 'contemporary', 'support', 'transport')
const EXPLICIT_ADULT_REGEX = new RegExp(
  `\\b(${[
    "porno?",
    "pornograph(y|ic)",
    "hardcore\\s+porn",
    "softcore\\s+porn",
    "hentai",
    "nsfw",
    "sex\\s+tape",
    "xxx",
    "erotik\\s+film",
    "adult\\s+film",
    "adult\\s+movie",
    "camsoda",
    "chaturbate",
    "playboy\\s+video",
    "penthouse\\s+video",
    "brazzers",
    "x-rated",
    "x\\s+rated",
    "sexploitation",
    "webcam\\s+model",
  ].join("|")})\\b`,
  "i"
);

export const GENERIC_OVERVIEW_PATTERNS: string[] = [
  "film hakkında özet bilgi bulunmuyor",
  "film hakkında özet bilgisi bulunmuyor",
  "özet bilgisi bulunmuyor",
  "özet bilgi bulunmuyor",
  "özet bulunmuyor",
  "henüz bir özet eklenmedi",
  "no overview found",
  "no overview available",
  "no overview",
  "overview is not available",
  "no summary available",
  "no description available",
  "plot is unknown",
  "plot unknown",
];

/**
 * Checks if the text contains explicit pornographic or adult signals.
 * Safe for normal romance, relationship drama, and sensual cinematic themes.
 */
export function isExplicitAdultContent(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  return EXPLICIT_ADULT_REGEX.test(text);
}

/**
 * Checks if an overview text is merely a placeholder or generic empty note.
 */
export function isGenericOverview(overview: string): boolean {
  if (!overview || typeof overview !== "string") return true;
  const normalized = overview
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
    .trim();

  if (normalized.length === 0) return true;

  for (const pattern of GENERIC_OVERVIEW_PATTERNS) {
    const cleanPattern = pattern.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim();
    if (normalized === cleanPattern || normalized.startsWith(cleanPattern)) {
      return true;
    }
  }

  return false;
}
