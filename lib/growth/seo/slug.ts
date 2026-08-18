/**
 * Turkish-aware Unicode slug generator and canonical URL resolver for SINEAI.
 */

const TURKISH_CHAR_MAP: Record<string, string> = {
  ç: "c",
  Ç: "c",
  ğ: "g",
  Ğ: "g",
  ı: "i",
  I: "i",
  İ: "i",
  ö: "o",
  Ö: "o",
  ş: "s",
  Ş: "s",
  ü: "u",
  Ü: "u",
};

/**
 * Converts any Turkish or international string into a clean URL slug.
 */
export function slugify(text: string): string {
  if (!text || typeof text !== "string") return "";

  let normalized = text.trim();

  // Replace Turkish characters
  normalized = normalized.replace(/[çÇğĞıIİöÖşŞüÜ]/g, (char) => TURKISH_CHAR_MAP[char] || char);

  // Normalize Unicode
  normalized = normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  // Replace non-alphanumeric chars with hyphens
  normalized = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized;
}

/**
 * Generates canonical slug for a movie: e.g. "interstellar-157336" or "kis-uykusu-12345"
 */
export function generateMovieSlug(title: string, tmdbId: number): string {
  const baseSlug = slugify(title) || "film";
  return `${baseSlug}-${tmdbId}`;
}

/**
 * Generates canonical slug for a TV show: e.g. "dark-70523"
 */
export function generateTvSlug(name: string, tmdbId: number): string {
  const baseSlug = slugify(name) || "dizi";
  return `${baseSlug}-${tmdbId}`;
}

/**
 * Parses numeric TMDB ID from a slug. E.g. "interstellar-157336" -> 157336, "157336" -> 157336.
 */
export function parseSlugId(slug: string): number | null {
  if (!slug || typeof slug !== "string") return null;

  // If slug is purely numeric
  if (/^\d+$/.test(slug)) {
    const parsed = parseInt(slug, 10);
    return isNaN(parsed) ? null : parsed;
  }

  // Extract trailing numeric segment after the last hyphen
  const match = slug.match(/-(\d+)$/);
  if (match && match[1]) {
    const parsed = parseInt(match[1], 10);
    return isNaN(parsed) ? null : parsed;
  }

  return null;
}

/**
 * Returns canonical movie path, e.g. "/film/interstellar-157336"
 */
export function getMovieCanonicalPath(title: string, tmdbId: number): string {
  return `/film/${generateMovieSlug(title, tmdbId)}`;
}

/**
 * Returns canonical TV path, e.g. "/dizi/dark-70523"
 */
export function getTvCanonicalPath(name: string, tmdbId: number): string {
  return `/dizi/${generateTvSlug(name, tmdbId)}`;
}

/**
 * Returns full canonical URL including base origin.
 */
export function getAbsoluteCanonicalUrl(path: string, baseUrl?: string): string {
  const base = (baseUrl || process.env.NEXT_PUBLIC_APP_URL || "https://sineai.com.tr").replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
