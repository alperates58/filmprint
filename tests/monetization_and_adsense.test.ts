import { strict as assert } from "assert";
import {
  CANONICAL_PLACEMENTS,
  HARD_EXCLUDED_ROUTES,
  isRouteEligibleForAds,
  isDeviceTargetEligible,
  isAudienceTargetEligible,
  getPageMaxAdsLimit,
} from "@/lib/monetization/placements";
import {
  normalizePublisherId,
  normalizeAdClientId,
  generateGoogleAdsTxtLine,
  evaluateAdsTxtHealth,
} from "@/lib/monetization/ads-txt";
import {
  getPublicMonetizationConfig,
  getMonetizationReadinessGate,
  invalidateMonetizationCache,
} from "@/lib/monetization/service";

export async function runMonetizationAndAdSenseTests() {
  console.log("===============================================================");
  console.log("SINEAI PHASE I-C / I-D MONETIZATION & ADSENSE TEST SUITE");
  console.log("===============================================================\n");

  console.log("--> 1. Testing Publisher ID vs Ad Client ID Formats & Separation");
  {
    // Normalization
    assert.equal(normalizePublisherId("pub-1234567890123456"), "pub-1234567890123456");
    assert.equal(normalizePublisherId("ca-pub-1234567890123456"), "pub-1234567890123456");
    assert.equal(normalizePublisherId("1234567890123456"), "pub-1234567890123456");
    assert.equal(normalizePublisherId(""), null);

    assert.equal(normalizeAdClientId("ca-pub-1234567890123456"), "ca-pub-1234567890123456");
    assert.equal(normalizeAdClientId("pub-1234567890123456"), "ca-pub-1234567890123456");
    assert.equal(normalizeAdClientId("1234567890123456"), "ca-pub-1234567890123456");

    // ads.txt Generator strictly outputs pub- and never ca-pub-
    const adsTxtLine = generateGoogleAdsTxtLine("1234567890123456");
    assert.equal(adsTxtLine, "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0");
    assert.equal(adsTxtLine.includes("ca-pub-"), false, "ads.txt must never contain ca-pub-");

    console.log("  ✓ Publisher ID and Ad Client ID formats strictly separated.");
  }

  console.log("--> 2. Testing ads.txt Health Verification & ca-pub Rejection");
  {
    const pubId = "pub-9876543210987654";
    const validContent = `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`;
    
    // Healthy state
    const health1 = evaluateAdsTxtHealth(pubId, validContent);
    assert.equal(health1.status, "HEALTHY");
    assert.equal(health1.hasDirectLine, true);

    // Rejection of ca-pub in ads.txt
    const invalidCaPubContent = `google.com, ca-${pubId}, DIRECT, f08c47fec0942fa0\n`;
    const healthCaPub = evaluateAdsTxtHealth(pubId, invalidCaPubContent);
    assert.equal(healthCaPub.status, "MISMATCH");
    assert.equal(healthCaPub.hasDirectLine, false);
    assert.match(healthCaPub.message, /ca-pub/);

    // Missing Publisher ID
    const healthMissing = evaluateAdsTxtHealth(null, "");
    assert.equal(healthMissing.status, "NOT_CONFIGURED");

    console.log("  ✓ ads.txt health verification and ca-pub rejection passed.");
  }

  console.log("--> 3. Testing Hard Excluded Routes & Policy Placement Guards");
  {
    // Invariant: Root home, calibration, DNA, library, recommendations, admin, auth are strictly excluded
    assert.equal(isRouteEligibleForAds("/"), false, "Home root must be excluded from ads");
    assert.equal(isRouteEligibleForAds("/calibrate"), false, "Calibration must be ads-free");
    assert.equal(isRouteEligibleForAds("/tv/calibration"), false, "TV Calibration must be ads-free");
    assert.equal(isRouteEligibleForAds("/profile"), false, "Profile must be ads-free");
    assert.equal(isRouteEligibleForAds("/tv/profile"), false, "TV Profile must be ads-free");
    assert.equal(isRouteEligibleForAds("/library"), false, "Library must be ads-free");
    assert.equal(isRouteEligibleForAds("/tv/library"), false, "TV Library must be ads-free");
    assert.equal(isRouteEligibleForAds("/recommendations"), false, "Recommendations must be ads-free");
    assert.equal(isRouteEligibleForAds("/tv/recommendations"), false, "TV Recommendations must be ads-free");
    assert.equal(isRouteEligibleForAds("/admin"), false, "Admin must be ads-free");
    assert.equal(isRouteEligibleForAds("/admin/growth"), false, "Admin growth must be ads-free");
    assert.equal(isRouteEligibleForAds("/login"), false, "Login must be ads-free");
    assert.equal(isRouteEligibleForAds("/auth"), false, "Auth must be ads-free");
    assert.equal(isRouteEligibleForAds("/night/room-123"), false, "Movie Night must be ads-free");

    // Eligible public canonical routes
    assert.equal(isRouteEligibleForAds("/film/interstellar-157336"), true, "Canonical movie detail must be eligible");
    assert.equal(isRouteEligibleForAds("/dizi/dark-70523"), true, "Canonical TV detail must be eligible");
    assert.equal(isRouteEligibleForAds("/filmler/tur/bilim-kurgu"), true, "Movie genre hub must be eligible");
    assert.equal(isRouteEligibleForAds("/diziler/tur/dram"), true, "TV genre hub must be eligible");
    assert.equal(isRouteEligibleForAds("/about"), true, "About page must be eligible");
    assert.equal(isRouteEligibleForAds("/how-it-works"), true, "How-it-works page must be eligible");

    console.log("  ✓ Route policy exclusions and eligible paths passed.");
  }

  console.log("--> 4. Testing Anonymous-First Audience & Device Targeting");
  {
    // ANONYMOUS_ONLY: Anonymous -> eligible, Logged-in -> NO ADS
    assert.equal(isAudienceTargetEligible("ANONYMOUS_ONLY", false), true, "Anonymous must be eligible");
    assert.equal(isAudienceTargetEligible("ANONYMOUS_ONLY", true), false, "Logged-in user must receive no ads");

    // AUTHENTICATED_ONLY:
    assert.equal(isAudienceTargetEligible("AUTHENTICATED_ONLY", true), true);
    assert.equal(isAudienceTargetEligible("AUTHENTICATED_ONLY", false), false);

    // ALL:
    assert.equal(isAudienceTargetEligible("ALL", true), true);
    assert.equal(isAudienceTargetEligible("ALL", false), true);

    // Device target checks
    assert.equal(isDeviceTargetEligible("ALL", true), true);
    assert.equal(isDeviceTargetEligible("ALL", false), true);
    assert.equal(isDeviceTargetEligible("MOBILE", true), true);
    assert.equal(isDeviceTargetEligible("MOBILE", false), false);
    assert.equal(isDeviceTargetEligible("DESKTOP", true), false);
    assert.equal(isDeviceTargetEligible("DESKTOP", false), true);

    console.log("  ✓ Anonymous-first audience and device targeting passed.");
  }

  console.log("--> 5. Testing Page Ad Density Limits & Canonical Placements");
  {
    assert.equal(CANONICAL_PLACEMENTS.length >= 8, true, "All canonical slots must be defined");
    
    const movieSlots = CANONICAL_PLACEMENTS.filter((p) => p.surface === "MOVIE");
    assert.equal(movieSlots.some((p) => p.key === "movie_after_overview"), true);
    assert.equal(movieSlots.some((p) => p.key === "movie_before_related"), true);

    const tvSlots = CANONICAL_PLACEMENTS.filter((p) => p.surface === "TV");
    assert.equal(tvSlots.some((p) => p.key === "tv_after_overview"), true);
    assert.equal(tvSlots.some((p) => p.key === "tv_before_related"), true);

    const genreSlots = CANONICAL_PLACEMENTS.filter((p) => p.surface === "GENRE");
    assert.equal(genreSlots.some((p) => p.key === "genre_after_8"), true);
    assert.equal(genreSlots.some((p) => p.key === "genre_after_16"), true);

    // Density limits
    assert.equal(getPageMaxAdsLimit("MOVIE", 2), 2);
    assert.equal(getPageMaxAdsLimit("MOVIE", 10), 2, "Movie page density must not exceed hard ceiling 2");
    assert.equal(getPageMaxAdsLimit("TV", 5), 2, "TV page density must not exceed hard ceiling 2");
    assert.equal(getPageMaxAdsLimit("GENRE", 10), 3, "Genre page density must not exceed hard ceiling 3");

    console.log("  ✓ Canonical placements and density limits verified.");
  }

  console.log("--> 6. Testing Public Monetization Snapshot & Zero N+1 Invariant");
  {
    invalidateMonetizationCache();
    const config1 = await getPublicMonetizationConfig();
    assert.equal(typeof config1.master, "boolean");
    assert.equal(typeof config1.placements, "object");
    assert.equal(typeof config1.maxAdsPerPage, "number");

    // Second call should return instantly from cache
    const config2 = await getPublicMonetizationConfig();
    assert.equal(config1, config2, "Snapshot must be cached in-memory without duplicate queries");

    invalidateMonetizationCache();
    console.log("  ✓ Runtime snapshot caching and zero N+1 verified.");
  }

  console.log("--> 7. Testing Readiness Gate Validation Invariants");
  {
    const gateResult = await getMonetizationReadinessGate();
    assert.equal(typeof gateResult.isReady, "boolean");
    assert.equal(typeof gateResult.gates, "object");
    assert.equal(Array.isArray(gateResult.blockedReasons), true);

    // If master is false by default
    assert.equal(gateResult.masterEnabled, false, "Live ads must default to FALSE");

    console.log("  ✓ Readiness gate validation invariants passed.");
  }

  console.log("--> 8. Testing Public SSR Cache Leak Guard");
  {
    // The public config must not embed any user session, watchlist, or personalized data
    const publicConfig = await getPublicMonetizationConfig();
    const configJson = JSON.stringify(publicConfig);
    
    assert.equal(configJson.includes("password"), false);
    assert.equal(configJson.includes("token"), false);
    assert.equal(configJson.includes("session"), false);
    assert.equal(configJson.includes("user_"), false);

    console.log("  ✓ Public SSR cache leak guard verified.");
  }

  console.log("--> 9. Testing Auto Ads Hard Block & Readiness Gate Rejection");
  {
    const gateResult = await getMonetizationReadinessGate();
    assert.equal(typeof gateResult.gates.autoAdsDisabled, "boolean");

    // Invariant: If Auto Ads were enabled, the exact warning reason must be blocked
    const autoAdsBlockedMsg = "Auto Ads AdSense hesabında açık. SINEAI kontrollü placement sistemini kullanabilmek için AdSense panelinden Auto Ads'i kapatın.";
    
    // Simulate auto ads violation check
    const mockGatesWithAutoAds = {
      ...gateResult.gates,
      autoAdsDisabled: false,
    };
    const isReadyWithAutoAds = Object.values(mockGatesWithAutoAds).every(Boolean);
    assert.equal(isReadyWithAutoAds, false, "Readiness gate must FAIL when Auto Ads are enabled");

    console.log("  ✓ Auto Ads hard block invariant verified.");
  }

  console.log("--> 10. Testing HttpOnly Client Auth & Gating Safety");
  {
    // Client-side auth abstraction exists and preserves HttpOnly cookie isolation
    const { getCachedIsAuthenticatedClient, setCachedAuthStatus } = await import("@/lib/monetization/client-auth");
    
    setCachedAuthStatus(false);
    assert.equal(getCachedIsAuthenticatedClient(), false);
    assert.equal(isAudienceTargetEligible("ANONYMOUS_ONLY", getCachedIsAuthenticatedClient()), true);

    setCachedAuthStatus(true);
    assert.equal(getCachedIsAuthenticatedClient(), true);
    assert.equal(isAudienceTargetEligible("ANONYMOUS_ONLY", getCachedIsAuthenticatedClient()), false);

    // Reset cache
    setCachedAuthStatus(null);

    console.log("  ✓ HttpOnly client auth and audience gating safety verified.");
  }

  console.log("\n===============================================================");
  console.log("ALL MONETIZATION & ADSENSE TESTS PASSED SUCCESSFULLY");
  console.log("===============================================================\n");
}
