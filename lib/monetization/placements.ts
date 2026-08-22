import { AdSurface, CanonicalPlacementDefinition, SafePlacementConfig } from "./types";

export const CANONICAL_PLACEMENTS: CanonicalPlacementDefinition[] = [
  {
    key: "movie_after_overview",
    name: "Film — Özetten Sonra",
    description: "Film detay sayfasında özet ve künye kartının hemen altında güvenli reklam alanı",
    surface: "MOVIE",
    position: 10,
    defaultContribution: 1,
  },
  {
    key: "movie_before_related",
    name: "Film — Benzer Filmlerden Önce",
    description: "Film detay sayfasında fragman/kadro sonrası, önerilen filmler öncesi ayrılmış reklam alanı",
    surface: "MOVIE",
    position: 20,
    defaultContribution: 1,
  },
  {
    key: "tv_after_overview",
    name: "Dizi — Özetten Sonra",
    description: "Dizi detay sayfasında özet ve künye kartının hemen altında güvenli reklam alanı",
    surface: "TV",
    position: 10,
    defaultContribution: 1,
  },
  {
    key: "tv_before_related",
    name: "Dizi — Benzer Dizilerden Önce",
    description: "Dizi detay sayfasında fragman/kadro sonrası, benzer diziler öncesi reklam alanı",
    surface: "TV",
    position: 20,
    defaultContribution: 1,
  },
  {
    key: "genre_after_8",
    name: "Tür Listesi — 8. İçerikten Sonra",
    description: "Film/Dizi tür sayfalarında ilk 8 poster kartından sonraki doğal akış reklamı",
    surface: "GENRE",
    position: 10,
    defaultContribution: 1,
  },
  {
    key: "genre_after_16",
    name: "Tür Listesi — 16. İçerikten Sonra",
    description: "Film/Dizi tür sayfalarında 16. içerikten sonraki akış sonu reklamı",
    surface: "GENRE",
    position: 20,
    defaultContribution: 1,
  },
  {
    key: "editorial_after_intro",
    name: "Yazı — Giriş Sonrası",
    description: "Editoryal / rehber makalelerinde giriş paragrafının ardından gelen reklam alanı",
    surface: "EDITORIAL",
    position: 10,
    defaultContribution: 1,
  },
  {
    key: "editorial_mid_content",
    name: "Yazı — İçerik Ortası",
    description: "Editoryal makalelerde orta bölüm reklam alanı",
    surface: "EDITORIAL",
    position: 20,
    defaultContribution: 1,
  },
  {
    key: "desktop_sidebar",
    name: "Masaüstü — Yan Panel",
    description: "Geniş ekranlarda güvenli yan panel alanı",
    surface: "GLOBAL",
    position: 30,
    defaultContribution: 1,
  },
];

/**
 * Hard excluded paths where advertising is strictly prohibited by policy.
 */
export const HARD_EXCLUDED_ROUTES = [
  "/",
  "/calibrate",
  "/tv/calibration",
  "/profile",
  "/tv/profile",
  "/library",
  "/tv/library",
  "/recommendations",
  "/tv/recommendations",
  "/admin",
  "/login",
  "/auth",
  "/account",
  "/night",
  "/compare",
  "/watch-later",
];

/**
 * Validates if a route path is eligible for ad rendering.
 */
export function isRouteEligibleForAds(pathname: string | null | undefined): boolean {
  if (!pathname || typeof pathname !== "string") return false;
  
  const cleanPath = pathname.split("?")[0].toLowerCase().replace(/\/+$/, "") || "/";

  // Check exact match on root
  if (cleanPath === "/" || cleanPath === "") {
    return false;
  }

  // Check exclusion list prefix
  for (const excluded of HARD_EXCLUDED_ROUTES) {
    if (excluded === "/") continue;
    if (cleanPath === excluded || cleanPath.startsWith(`${excluded}/`)) {
      return false;
    }
  }

  // Allowed public canonical surfaces
  const allowedPrefixes = [
    "/film/",
    "/movie/",
    "/dizi/",
    "/tv/show/",
    "/filmler/tur/",
    "/diziler/tur/",
    "/about",
    "/how-it-works",
    "/contact",
  ];

  return allowedPrefixes.some((prefix) => cleanPath.startsWith(prefix) || cleanPath === prefix.replace(/\/+$/, ""));
}

/**
 * Validates device targeting against client viewport or mobile state.
 */
export function isDeviceTargetEligible(
  target: string | null | undefined,
  isMobile: boolean,
  viewportWidth?: number | null
): boolean {
  if (!target || target === "ALL") return true;
  if (target === "MOBILE") return isMobile;
  if (target === "DESKTOP") return !isMobile;
  return true;
}

/**
 * Validates audience targeting.
 * Default is ANONYMOUS_ONLY.
 */
export function isAudienceTargetEligible(
  audience: string | null | undefined,
  isAuthenticated: boolean
): boolean {
  if (!audience || audience === "ANONYMOUS_ONLY") {
    return !isAuthenticated;
  }
  if (audience === "AUTHENTICATED_ONLY") {
    return isAuthenticated;
  }
  if (audience === "ALL") {
    return true;
  }
  return !isAuthenticated;
}

/**
 * Computes maximum allowable ads density for a page surface.
 */
export function getPageMaxAdsLimit(surface: AdSurface, configuredMax: number = 2): number {
  const boundedConfigured = Math.max(1, Math.min(3, configuredMax || 2));
  switch (surface) {
    case "MOVIE":
      return Math.min(2, boundedConfigured);
    case "TV":
      return Math.min(2, boundedConfigured);
    case "GENRE":
      return Math.min(3, boundedConfigured);
    case "EDITORIAL":
      return Math.min(2, boundedConfigured);
    case "GLOBAL":
    default:
      return Math.min(2, boundedConfigured);
  }
}
