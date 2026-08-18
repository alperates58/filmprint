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

// Unicode-script signals that cannot be detected by the Latin word-boundary
// regex above. Exact production-like phrases stay narrow to avoid treating a
// country/language/script itself as an adult-content signal.
const EXPLICIT_ADULT_UNICODE_REGEXES: RegExp[] = [
  /僧侶と交わる色欲の夜に/u,
  /洗い屋さん[^\n]{0,40}女湯/u,
  /成人向け/u,
  /アダルト(?:アニメ|ビデオ|作品)/u,
  /エロ(?:アニメ|動画)/u,
  /ポルノ/u,
  /色情(?:片|电影|電影|影片)/u,
  /成人视频/u,
  /성인\s*(?:애니메이션|비디오|영화)/u,
];

export const GENERIC_OVERVIEW_PATTERNS: string[] = [
  "film hakkında özet bilgi bulunmuyor",
  "film hakkında özet bilgisi bulunmuyor",
  "film hakkında özet bulunmamaktadır",
  "dizi hakkında özet bilgi bulunmuyor",
  "dizi hakkında özet bilgisi bulunmuyor",
  "dizi hakkında özet bulunmamaktadır",
  "özet bilgisi bulunmuyor",
  "özet bilgi bulunmuyor",
  "özet bulunmamaktadır",
  "özet bulunmuyor",
  "henüz bir özet eklenmedi",
  "henüz bir özet eklenmemiştir",
  "özet eklenmemiştir",
  "bu film için özet bulunmamaktadır",
  "bu film için özet bulunmuyor",
  "bu dizi için özet bulunmamaktadır",
  "bu dizi için özet bulunmuyor",
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
  return (
    EXPLICIT_ADULT_REGEX.test(text) ||
    EXPLICIT_ADULT_UNICODE_REGEXES.some((pattern) => pattern.test(text))
  );
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
    if (
      normalized === cleanPattern ||
      normalized.startsWith(cleanPattern) ||
      normalized.includes(cleanPattern)
    ) {
      return true;
    }
  }

  return false;
}
