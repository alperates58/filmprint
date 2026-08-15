/**
 * TMDB Image URL Helper and Path Validator
 * Ensures only valid TMDB CDN paths (starting with '/') are converted to image URLs,
 * preventing 404 errors from unslashed or dummy placeholder filenames (e.g. homeland.jpg, /friends.jpg).
 */

const PLACEHOLDER_BLACKLIST = new Set([
  "homeland.jpg",
  "friends.jpg",
  "friendsbg.jpg",
  "dexter.jpg",
  "dexterbg.jpg",
  "fargo.jpg",
  "fargobg.jpg",
  "dw.jpg",
  "dwbg.jpg",
  "aot.jpg",
  "aotbg.jpg",
  "bob.jpg",
  "bobbg.jpg",
  "b99.jpg",
  "b99bg.jpg",
  "hotd.jpg",
  "bear.jpg",
  "breakingbad.jpg",
  "tlou.jpg",
  "fc2rg.jpg",
  "sahsiyetbg.jpg",
  "kulupbg.jpg",
  "3lbd.jpg",
  "apbrkmd9w25jf33z89q.jpg",
  "placeholder.jpg",
  "placeholder-poster.png",
  "default.jpg",
  "none.jpg",
  "null.jpg",
  "null",
]);

/**
 * Validates whether a given string is a valid TMDB image path.
 * - Must start with '/'
 * - Must not be null/empty/'/null'
 * - Must not be a known 404 dummy slug
 * - Must have an image extension (.jpg, .jpeg, .png, .webp)
 */
export function isValidTmdbImagePath(path: string | null | undefined): boolean {
  if (!path || typeof path !== "string") return false;
  const trimmed = path.trim();

  // Must start with '/'
  if (!trimmed.startsWith("/")) return false;

  // Must have a valid path beyond just '/'
  if (trimmed === "/" || trimmed === "/null" || trimmed === "/undefined") return false;

  // Filename after leading slash
  const filename = trimmed.slice(1).toLowerCase();

  // Must not be in placeholder blacklist
  if (PLACEHOLDER_BLACKLIST.has(filename)) return false;

  // Must end with a valid image extension
  if (!/\.(jpg|jpeg|png|webp)$/i.test(filename)) return false;

  return true;
}

/**
 * Returns full TMDB CDN image URL if path is valid, or null if invalid/placeholder.
 */
export function getTmdbImageUrl(
  path: string | null | undefined,
  size: "w185" | "w300" | "w500" | "w780" | "w1280" | "original" = "w500"
): string | null {
  if (!isValidTmdbImagePath(path)) return null;
  const cleanPath = path!.trim();
  return `https://image.tmdb.org/t/p/${size}${cleanPath}`;
}
