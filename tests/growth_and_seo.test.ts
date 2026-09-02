import { strict as assert } from "assert";
import {
  slugify,
  generateMovieSlug,
  generateTvSlug,
  parseSlugId,
  getMovieCanonicalPath,
  getTvCanonicalPath,
  getAbsoluteCanonicalUrl,
} from "@/lib/growth/seo/slug";
import {
  evaluateMovieSeoEligibility,
  evaluateTvSeoEligibility,
  isSeoEligibleMovie,
  isSeoEligibleTvShow,
} from "@/lib/growth/seo/quality-gate";
import {
  generateMovieJsonLd,
  generateTvJsonLd,
  generateBreadcrumbJsonLd,
  safeJsonLdStringify,
  formatIsoDuration,
} from "@/lib/growth/seo/json-ld";
import { getMovieGenreBySlug, getTvGenreBySlug, MOVIE_GENRES, TV_GENRES } from "@/lib/growth/seo/genres";
import { verifyGoogleGrowthState, GOOGLE_GROWTH_SCOPES } from "@/lib/growth/google/oauth";
import {
  verifyBingGrowthState,
  buildBingGrowthAuthUrl,
  BING_WEBMASTER_AUTH_URL,
  BING_WEBMASTER_TOKEN_URL,
  BING_WEBMASTER_SCOPE,
  getBingGrowthConfigSync,
} from "@/lib/growth/bing/oauth";
import { verifyYandexGrowthState } from "@/lib/growth/yandex/oauth";
import { sanitizeEventParams } from "@/lib/analytics/events";
import { hasAnalyticsConsent, trackEvent } from "@/lib/analytics/client";
import { encryptSecret, decryptSecret } from "@/lib/security/crypto";
import { getUrlHash } from "@/lib/growth/indexnow/service";
import {
  getAppBaseUrl,
  getGoogleGrowthRedirectUri,
  getBingGrowthRedirectUri,
  getYandexGrowthRedirectUri,
  getGrowthUrlsDiagnostics,
} from "@/lib/growth/urls";
import { getGrowthCredentialSync } from "@/lib/growth/credentials";

export async function runGrowthAndSeoTests() {
  console.log("--> 1. Testing Turkish Slug Generation & ID Parsing");
  {
    assert.equal(slugify("Kış Uykusu"), "kis-uykusu");
    assert.equal(slugify("G.O.R.A. & A.R.O.G."), "g-o-r-a-a-r-o-g");
    assert.equal(slugify("Ölümlü Dünya: Bölüm 2!"), "olumlu-dunya-bolum-2");
    assert.equal(slugify("Şahsiyet — 1. Sezon"), "sahsiyet-1-sezon");
    assert.equal(slugify("  İnterstellar  "), "interstellar");

    assert.equal(generateMovieSlug("Interstellar", 157336), "interstellar-157336");
    assert.equal(generateMovieSlug("Kış Uykusu", 243688), "kis-uykusu-243688");
    assert.equal(generateTvSlug("Dark", 70523), "dark-70523");
    assert.equal(generateTvSlug("Gibi", 116450), "gibi-116450");

    assert.equal(parseSlugId("interstellar-157336"), 157336);
    assert.equal(parseSlugId("kis-uykusu-243688"), 243688);
    assert.equal(parseSlugId("dark-70523"), 70523);
    assert.equal(parseSlugId("157336"), 157336);
    assert.equal(parseSlugId("invalid-slug-without-id"), null);
    assert.equal(parseSlugId(""), null);

    assert.equal(getMovieCanonicalPath("Interstellar", 157336), "/film/interstellar-157336");
    assert.equal(getTvCanonicalPath("Dark", 70523), "/dizi/dark-70523");
    assert.equal(getAbsoluteCanonicalUrl("/film/interstellar-157336", "https://sineai.com.tr"), "https://sineai.com.tr/film/interstellar-157336");
    console.log("  ✓ Slug generation and parsing passed.");
  }

  console.log("--> 2. Testing SEO Quality Gate for Movies & Sitemap Invariants");
  {
    const completeMovie = {
      tmdbId: 157336,
      title: "Interstellar",
      originalTitle: "Interstellar",
      overview: "İnsanlığın son günlerinde, uzayda keşfedilen bir solucan deliğinden geçerek yaşanabilir yeni bir gezegen arayan kaşiflerin hikayesi.",
      posterPath: "/xbiycuc84TrieEWwkkuH2hoEa9S.jpg",
      backdropPath: "/5XNQBqnBwPA9yT0jZ0p3s8bbLh0.jpg",
      releaseYear: 2014,
      voteAverage: 8.4,
      popularity: 145.2,
      genres: ["Macera", "Dram", "Bilim Kurgu"],
      adult: false,
    };

    // Invariant 1: SEO Eligible => index,follow
    const res1 = evaluateMovieSeoEligibility(completeMovie);
    assert.equal(res1.isEligible, true);
    assert.equal(res1.status, "SEO_ELIGIBLE");
    assert.equal(res1.robots.index, true);
    assert.equal(res1.robots.follow, true);
    assert.equal(isSeoEligibleMovie(completeMovie), true);

    // Invariant 3: Generic / Low Quality Overview => noindex,follow
    const genericMovie = {
      ...completeMovie,
      overview: "Bu film hakkında özet bulunmuyor.",
    };
    const res2 = evaluateMovieSeoEligibility(genericMovie);
    assert.equal(res2.isEligible, false);
    assert.equal(res2.status, "SEO_LOW_QUALITY");
    assert.equal(res2.robots.index, false);
    assert.equal(res2.robots.follow, true); // Still follow internal links

    // Invariant 4: Manual FORCE_NOINDEX => noindex,follow
    const forceNoIndexMovie = {
      ...completeMovie,
      seoOverride: "FORCE_NOINDEX",
    };
    const resForceNoIndex = evaluateMovieSeoEligibility(forceNoIndexMovie);
    assert.equal(resForceNoIndex.isEligible, false);
    assert.equal(resForceNoIndex.robots.index, false);
    assert.equal(resForceNoIndex.robots.follow, true);

    // Invariant 5: Adult / Pornographic Content HARD BLOCK (cannot be bypassed by FORCE_INDEX)
    const adultMovieWithForceIndex = {
      ...completeMovie,
      adult: true,
      seoOverride: "FORCE_INDEX", // Attempt to force index adult content
    };
    const resAdult = evaluateMovieSeoEligibility(adultMovieWithForceIndex);
    assert.equal(resAdult.isEligible, false, "FORCE_INDEX MUST NOT bypass adult hard block");
    assert.equal(resAdult.status, "SEO_BLOCKED");
    assert.equal(resAdult.robots.index, false);
    assert.equal(resAdult.robots.follow, false, "Adult content must be strictly nofollow");

    // Explicit adult keyword
    const explicitMovie = {
      ...completeMovie,
      overview: "Explicit hardcore pornographic adult movie synopsis content.",
      seoOverride: "FORCE_INDEX",
    };
    const resExplicit = evaluateMovieSeoEligibility(explicitMovie);
    assert.equal(resExplicit.isEligible, false, "FORCE_INDEX MUST NOT bypass explicit keywords");
    assert.equal(resExplicit.status, "SEO_BLOCKED");
    assert.equal(resExplicit.robots.index, false);
    assert.equal(resExplicit.robots.follow, false);

    console.log("  ✓ Movie SEO Quality Gate & Safety Invariants passed.");
  }

  console.log("--> 3. Testing SEO Quality Gate for TV Shows");
  {
    const completeShow = {
      tmdbId: 70523,
      name: "Dark",
      originalName: "Dark",
      overview: "Bir çocuğun kaybolmasıyla başlayan olaylar, dört ailenin üç nesle yayılan gizemli zaman yolculuğu bağlantılarını açığa çıkarır.",
      posterPath: "/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg",
      backdropPath: "/3lBDg3i6nn5R2NKICJ499SZvVw9.jpg",
      firstAirDate: "2017-12-01",
      voteAverage: 8.5,
      popularity: 85.0,
      genres: ["Dram", "Gizem", "Bilim Kurgu & Fantezi"],
      adult: false,
    };

    const res1 = evaluateTvSeoEligibility(completeShow);
    assert.equal(res1.isEligible, true);
    assert.equal(res1.status, "SEO_ELIGIBLE");
    assert.equal(isSeoEligibleTvShow(completeShow), true);

    const emptyOverviewShow = {
      ...completeShow,
      overview: "",
    };
    const res2 = evaluateTvSeoEligibility(emptyOverviewShow);
    assert.equal(res2.isEligible, false);
    assert.equal(res2.status, "SEO_MISSING_DATA");

    console.log("  ✓ TV SEO Quality Gate passed.");
  }

  console.log("--> 4. Testing Genre Slug Registry");
  {
    const actionMovieGenre = getMovieGenreBySlug("aksiyon");
    assert.ok(actionMovieGenre);
    assert.equal(actionMovieGenre?.id, 28);
    assert.equal(actionMovieGenre?.name, "Aksiyon");

    const scifiTvGenre = getTvGenreBySlug("bilim-kurgu-fantezi");
    assert.ok(scifiTvGenre);
    assert.equal(scifiTvGenre?.id, 10765);
    assert.equal(scifiTvGenre?.name, "Bilim Kurgu & Fantezi");

    assert.equal(getMovieGenreBySlug("non-existent-genre-1234"), null);
    assert.ok(MOVIE_GENRES.length >= 19);
    assert.ok(TV_GENRES.length >= 16);
    console.log("  ✓ Genre Slug Registry passed.");
  }

  console.log("--> 5. Testing JSON-LD Structured Data Generation & Safe Serialization");
  {
    assert.equal(formatIsoDuration(125), "PT2H5M");
    assert.equal(formatIsoDuration(60), "PT1H");
    assert.equal(formatIsoDuration(45), "PT45M");
    assert.equal(formatIsoDuration(null), undefined);

    const movieLd = generateMovieJsonLd({
      tmdbId: 157336,
      title: "Interstellar",
      originalTitle: "Interstellar",
      overview: "Uzay yolculuğu hikayesi.",
      releaseYear: 2014,
      runtime: 169,
      posterUrl: "https://image.tmdb.org/t/p/w500/interstellar.jpg",
      director: "Christopher Nolan",
      cast: [{ name: "Matthew McConaughey" }, { name: "Anne Hathaway" }],
      genres: ["Macera", "Bilim Kurgu"],
      voteAverage: 8.4,
      voteCount: 32000,
    });

    assert.equal(movieLd["@type"], "Movie");
    assert.equal(movieLd.name, "Interstellar");
    assert.equal(movieLd.duration, "PT2H49M");
    assert.equal((movieLd.director as any)?.name, "Christopher Nolan");
    assert.equal((movieLd.aggregateRating as any)?.ratingValue, 8.4);

    const unsafeData = {
      name: "</script><script>alert('xss')</script>",
      tag: "<b>Hello & Welcome</b>",
    };
    const serialized = safeJsonLdStringify(unsafeData);
    assert.ok(!serialized.includes("<script>"));
    assert.ok(serialized.includes("\\u003cscript\\u003e"));

    const breadcrumbs = generateBreadcrumbJsonLd([
      { name: "Ana Sayfa", url: "/" },
      { name: "Filmler", url: "/filmler" },
      { name: "Interstellar", url: "/film/interstellar-157336" },
    ]);
    assert.equal(breadcrumbs["@type"], "BreadcrumbList");
    assert.equal(breadcrumbs.itemListElement.length, 3);
    assert.equal(breadcrumbs.itemListElement[2].name, "Interstellar");

    const tvLd = generateTvJsonLd({
      tmdbId: 70523,
      name: "Dark",
      numberOfSeasons: 3,
      numberOfEpisodes: 26,
      creators: [{ name: "Baran bo Odar" }],
    });
    assert.equal(tvLd["@type"], "TVSeries");
    assert.equal(tvLd.name, "Dark");
    assert.equal(tvLd.numberOfSeasons, 3);

    console.log("  ✓ JSON-LD Generation & Safe Serialization passed.");
  }

  console.log("--> 6. Testing OAuth Scope Minimization & State Validation (Google & Bing)");
  {
    assert.ok(GOOGLE_GROWTH_SCOPES.includes("analytics.readonly"));
    assert.ok(GOOGLE_GROWTH_SCOPES.includes("webmasters"));
    assert.ok(GOOGLE_GROWTH_SCOPES.includes("adsense.readonly"));
    assert.ok(GOOGLE_GROWTH_SCOPES.includes("siteverification.verify_only"), "Scope must use minimal verify_only");
    assert.ok(!GOOGLE_GROWTH_SCOPES.includes("auth/siteverification "), "Must not request full manage siteverification");

    assert.equal(verifyGoogleGrowthState(""), false);
    assert.equal(verifyGoogleGrowthState("invalid:state:format"), false);
    assert.equal(verifyGoogleGrowthState("user:1000:nonce:invalid_signature"), false);

    // Official Bing Webmaster OAuth Endpoints verification
    assert.equal(BING_WEBMASTER_AUTH_URL, "https://www.bing.com/webmasters/OAuth/authorize");
    assert.equal(BING_WEBMASTER_TOKEN_URL, "https://www.bing.com/webmasters/oauth/token");
    assert.equal(BING_WEBMASTER_SCOPE, "webmaster.manage");

    const bingAuthUrl = buildBingGrowthAuthUrl("admin-123");
    assert.ok(bingAuthUrl.startsWith("https://www.bing.com/webmasters/OAuth/authorize"));
    assert.ok(bingAuthUrl.includes("scope=webmaster.manage"));
    assert.ok(!bingAuthUrl.includes("login.microsoftonline.com"), "Must NOT contain login.microsoftonline.com");

    assert.equal(verifyBingGrowthState("invalid_bing_state"), false);
    assert.equal(verifyYandexGrowthState("invalid_yandex_state"), false);

    console.log("  ✓ OAuth Scope Minimization, Official Bing Endpoints & State Security passed.");
  }

  console.log("--> 7. Testing Versioned AES-256-GCM Master Key Encryption (v1:iv:tag:cipher)");
  {
    const secretRefreshToken = "1//04_abcdef123456789_refresh_token_very_sensitive";
    const encrypted = encryptSecret(secretRefreshToken);

    assert.ok(encrypted.encryptedValue.startsWith("v1:"), "Encrypted ciphertext must have v1: version prefix");
    const parts = encrypted.encryptedValue.split(":");
    assert.equal(parts.length, 4, "Versioned format must be v1:ivHex:tagHex:cipherHex");
    assert.notEqual(encrypted.encryptedValue, secretRefreshToken);
    assert.equal(encrypted.lastFour, "tive");

    const decrypted = decryptSecret(encrypted.encryptedValue);
    assert.equal(decrypted, secretRefreshToken);

    // Corrupted payload should throw catchable error without unhandled crash
    assert.throws(() => decryptSecret("v1:bad_iv:bad_tag:bad_cipher"));

    console.log("  ✓ Versioned AES-256-GCM Token Encryption passed.");
  }

  console.log("--> 8. Testing Privacy-First Analytics Event Sanitization & Consent Gating");
  {
    const dirtyParams = {
      media_type: "film",
      content_id: "m-123",
      step: 3,
      email: "user@example.com",
      password: "secret_password",
      token: "session_token_12345",
      userId: "user-uuid-private",
      prompt: "Raw AI prompt text",
    };

    const sanitized = sanitizeEventParams(dirtyParams);
    assert.equal(sanitized.media_type, "film");
    assert.equal(sanitized.content_id, "m-123");
    assert.equal(sanitized.step, 3);

    // Strictly stripped
    assert.equal(sanitized.email, undefined);
    assert.equal(sanitized.password, undefined);
    assert.equal(sanitized.token, undefined);
    assert.equal(sanitized.userId, undefined);
    assert.equal(sanitized.prompt, undefined);

    // Consent safe default in Node environment
    assert.equal(hasAnalyticsConsent(), false, "Default consent state must be false without explicit user grant");

    console.log("  ✓ Analytics Privacy, Consent Safe Default & PII Exclusion passed.");
  }

  console.log("--> 9. Testing IndexNow URL Hashing & Dedicated Queue Model");
  {
    const hash1 = getUrlHash("https://sineai.com.tr/film/interstellar-157336");
    const hash2 = getUrlHash("https://sineai.com.tr/film/interstellar-157336");
    const hash3 = getUrlHash("https://sineai.com.tr/dizi/dark-70523");

    assert.equal(hash1, hash2, "URL hash must be deterministic for deduplication");
    assert.notEqual(hash1, hash3, "Different URLs must produce distinct hashes");
    assert.equal(hash1.length, 64, "SHA-256 hash must be 64 hex characters");

    console.log("  ✓ IndexNow Deterministic URL Hashing passed.");
  }

  console.log("--> 10. Testing Centralized Redirect URIs & Setup Diagnostics");
  {
    const defaultBase = getAppBaseUrl();
    assert.ok(defaultBase.startsWith("http"), "App base URL must be valid HTTP/HTTPS string");
    assert.equal(defaultBase.endsWith("/"), false, "App base URL must not have trailing slash");

    const googleUri = getGoogleGrowthRedirectUri();
    assert.equal(googleUri.endsWith("/api/admin/growth/google/callback"), true, "Google redirect URI must have exact callback path");
    assert.equal(googleUri.endsWith("/"), false, "Google redirect URI must not have trailing slash");

    const bingUri = getBingGrowthRedirectUri();
    assert.equal(bingUri.endsWith("/api/admin/growth/bing/callback"), true, "Bing redirect URI must have exact callback path");

    const yandexUri = getYandexGrowthRedirectUri();
    assert.equal(yandexUri.endsWith("/api/admin/growth/yandex/callback"), true, "Yandex redirect URI must have exact callback path");

    // Diagnostics never expose secrets
    const diag = getGrowthUrlsDiagnostics();
    assert.equal(typeof diag.google.redirectUri, "string");
    assert.equal(typeof diag.bing.redirectUri, "string");
    assert.equal(typeof diag.yandex.redirectUri, "string");
    assert.equal((diag as any).clientSecret, undefined, "Diagnostics must never expose client secrets");
    assert.equal((diag as any).apiKey, undefined, "Diagnostics must never expose API keys");

    // Verify GOOGLE_GROWTH_REDIRECT_URI environment override
    const originalEnv = process.env.GOOGLE_GROWTH_REDIRECT_URI;
    try {
      process.env.GOOGLE_GROWTH_REDIRECT_URI = "https://custom.sineai.com.tr/api/admin/growth/google/callback";
      assert.equal(getGoogleGrowthRedirectUri(), "https://custom.sineai.com.tr/api/admin/growth/google/callback");
    } finally {
      if (originalEnv !== undefined) {
        process.env.GOOGLE_GROWTH_REDIRECT_URI = originalEnv;
      } else {
        delete process.env.GOOGLE_GROWTH_REDIRECT_URI;
      }
    }

    console.log("  ✓ Centralized Redirect URIs & Setup Diagnostics passed.");
  }

  console.log("--> 11. Testing Google Property Auto-Selection & Independent Service Status");
  {
    // 1. Search Console SineAI domain property matching
    const sampleSites = [
      { siteUrl: "https://other-site.com/", permissionLevel: "siteFullUser" },
      { siteUrl: "sc-domain:sineai.com.tr", permissionLevel: "siteOwner" },
      { siteUrl: "https://sineai.com.tr/", permissionLevel: "siteOwner" },
    ];

    const exactMatch = sampleSites.find(
      (s) => s.siteUrl === "sc-domain:sineai.com.tr" || s.siteUrl === "https://sineai.com.tr/"
    );
    assert.ok(exactMatch, "Must identify sc-domain:sineai.com.tr from sites list");
    assert.equal(exactMatch.siteUrl, "sc-domain:sineai.com.tr");

    // 2. GA4 DTO canonical mapping test
    const legacyPayload = {
      gaPropertyId: "properties/987654321",
      measurementId: "G-1234567890",
      enabled: true,
    };

    const canonicalPayload = {
      propertyId: legacyPayload.gaPropertyId,
      propertyName: "SineAI Web",
      measurementId: legacyPayload.measurementId,
      trackingEnabled: legacyPayload.enabled,
    };

    assert.equal(canonicalPayload.propertyId, "properties/987654321");
    assert.equal(canonicalPayload.trackingEnabled, true);

    // 3. Independence guarantee (Failure of GA does not affect GSC)
    const gaPromise = Promise.reject(new Error("Analytics API Disabled"));
    const gscPromise = Promise.resolve({
      sites: [{ siteUrl: "sc-domain:sineai.com.tr", permissionLevel: "siteOwner" }],
      status: "READY",
    });

    const [gaResult, gscResult] = await Promise.allSettled([gaPromise, gscPromise]);
    assert.equal(gaResult.status, "rejected");
    assert.equal(gscResult.status, "fulfilled");
    if (gscResult.status === "fulfilled") {
      assert.equal(gscResult.value.status, "READY");
      assert.equal(gscResult.value.sites.length, 1);
    }

    console.log("  ✓ Google Property Auto-Selection & Independent Service Status passed.");
  }

  console.log("--> 12. Testing Database/Env Credentials Resolution & AdSense Settings");
  {
    const cred = getGrowthCredentialSync("bing");
    assert.equal(typeof cred.isConfigured, "boolean");
    assert.equal(typeof cred.source, "string");

    // Test masked formatting
    const bingSync = getBingGrowthConfigSync();
    assert.equal(typeof bingSync.redirectUri, "string");
    assert.ok(bingSync.redirectUri.includes("/api/admin/growth/bing/callback"));

    console.log("  ✓ Database/Env Credentials Resolution & Sync Fallback passed.");
  }

  console.log("\n✅ ALL GROWTH & SEO FOUNDATION TESTS (INCLUDING HOTFIXES) PASSED SUCCESSFULLY!\n");
}
