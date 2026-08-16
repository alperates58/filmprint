import {
  TokenBucketLimiter,
  parseRetryAfterHeader,
  calculateExponentialBackoff,
} from "../lib/catalog-ingestion/rate-limiter";
import {
  CatalogCircuitBreaker,
  CircuitBreakerOpenError,
} from "../lib/catalog-ingestion/circuit-breaker";
import { analyzeDisplayTitle, isDisplayTitleAllowed } from "../lib/content/title-safety";
import { isMeaningfulOverview, normalizeOverviewForPersistence } from "../lib/content/overview-safety";
import { evaluateContentIngestionSafety } from "../lib/content/ingestion-safety";
import { mergeTmdbMovieLocalization } from "../lib/tmdb/movie-localization";
import { mergeTmdbTvLocalization } from "../lib/tmdb/tv/localization";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export async function runCatalogIngestionTests(): Promise<void> {
  console.log("  Running TMDB Catalog Ingestion Engine Unit Tests...");

  // 1. Rate Limiter Tests: Token Bucket Refill & Capacity
  {
    const limiter = new TokenBucketLimiter(2.0, 2); // 2 rps, capacity 4
    assert(limiter.getRate() === 2.0, "Limiter rate must match initial RPS");
    await limiter.acquire();
    await limiter.acquire();
    // Setting backoff should pause acquisitions
    limiter.setBackoff(500);
    assert(limiter.isBackedOff(), "Limiter must report backed off state");
    assert(limiter.getBackoffRemainingMs() > 0, "Remaining backoff must be > 0");
  }

  // 2. Retry-After Header Parsing
  {
    assert(parseRetryAfterHeader("12") === 12000, "Integer seconds header should convert to ms");
    assert(parseRetryAfterHeader("0") === 500, "Zero seconds header should clamp to minimum 500ms");
    assert(parseRetryAfterHeader(null) === 2000, "Null header should fallback to default 2000ms");
    assert(parseRetryAfterHeader("invalid-val") === 2000, "Invalid string header should fallback to 2000ms");

    const futureHttpDate = new Date(Date.now() + 5000).toUTCString();
    const parsedDateMs = parseRetryAfterHeader(futureHttpDate);
    assert(parsedDateMs >= 3000 && parsedDateMs <= 6000, "HTTP date string header must be parsed accurately");
  }

  // 3. Exponential Backoff Calculation
  {
    const b0 = calculateExponentialBackoff(0, 1000, 16000);
    const b1 = calculateExponentialBackoff(1, 1000, 16000);
    const b2 = calculateExponentialBackoff(2, 1000, 16000);
    assert(b0 >= 1000 && b0 <= 1200, "Attempt 0 backoff must be around 1s");
    assert(b1 >= 2000 && b1 <= 2200, "Attempt 1 backoff must be around 2s");
    assert(b2 >= 4000 && b2 <= 4200, "Attempt 2 backoff must be around 4s");
  }

  // 4. Circuit Breaker State Machine & Consecutive Failures
  {
    const cb = new CatalogCircuitBreaker(3, 5000); // 3 failures threshold, 5s cooldown
    assert(cb.getState() === "CLOSED", "Initial state must be CLOSED");
    assert(cb.canAttempt(), "Initial circuit breaker must allow attempts");

    cb.recordFailure();
    assert(cb.getState() === "CLOSED" && cb.getConsecutiveFailures() === 1, "1 failure remains CLOSED");

    cb.recordFailure();
    assert(cb.getState() === "CLOSED" && cb.getConsecutiveFailures() === 2, "2 failures remains CLOSED");

    const fail3 = cb.recordFailure();
    assert(fail3.opened === true, "3rd failure must trip circuit breaker to OPEN");
    assert(cb.getState() === "OPEN", "Circuit state must now be OPEN");
    assert(!cb.canAttempt(), "OPEN circuit breaker must reject attempts");

    // Resetting circuit breaker
    cb.reset();
    assert(cb.getState() === "CLOSED", "Reset must restore CLOSED state");
    assert(cb.getConsecutiveFailures() === 0, "Reset must zero consecutive failures");
  }

  // 5. Numeric Titles Allowed (e.g. 1917, 2012, 11.22.63, 24, 300)
  {
    const numericTitles = ["1917", "2012", "11.22.63", "24", "300", "9", "1408", "17"];
    for (const title of numericTitles) {
      const analysis = analyzeDisplayTitle(title);
      assert(analysis.allowed, `Numeric title '${title}' must be allowed`);
      assert(isDisplayTitleAllowed(title), `isDisplayTitleAllowed('${title}') must return true`);
    }
  }

  // 6. Non-Latin Titles Without Fallback Rejected (CJK, Cyrillic, Arabic)
  {
    const nonLatinTitles = ["千と千尋の神隠し", "기생충", "Брат", "مرحبا"];
    for (const title of nonLatinTitles) {
      assert(!isDisplayTitleAllowed(title), `Pure non-Latin title '${title}' without fallback must be rejected`);
    }

    const safety = evaluateContentIngestionSafety({
      localizedTitle: "千と千尋の神隠し",
      englishTitle: null,
      originalTitle: "千と千尋の神隠し",
      overview: "Some valid overview text for testing.",
      adult: false,
    });
    assert(!safety.allowed, "Safety evaluation must reject non-Latin title without Latin fallback");
    assert(safety.reasons.includes("NON_LATIN_DISPLAY_TITLE"), "Reason must specify NON_LATIN_DISPLAY_TITLE");
  }

  // 7. Non-Latin Original with Usable Turkish or English Fallback Allowed
  {
    const safetyTr = evaluateContentIngestionSafety({
      localizedTitle: "Ruhların Kaçışı",
      englishTitle: "Spirited Away",
      originalTitle: "千と千尋の神隠し",
      overview: "Büyülü ruhlar dünyasında geçen bir macera.",
      adult: false,
    });
    assert(safetyTr.allowed, "Non-Latin original with Turkish translation must be allowed");
    assert(safetyTr.displayTitle?.title === "Ruhların Kaçışı", "Turkish title should be resolved display title");

    const safetyEn = evaluateContentIngestionSafety({
      localizedTitle: "",
      englishTitle: "Spirited Away",
      originalTitle: "千と千尋の神隠し",
      overview: "An adventure in a magical spirit world.",
      adult: false,
    });
    assert(safetyEn.allowed, "Non-Latin original with English fallback must be allowed");
    assert(safetyEn.displayTitle?.title === "Spirited Away", "English title should be resolved display title");
  }

  // 8. Adult Content & Explicit Keyword Rejections
  {
    const adultFlagSafety = evaluateContentIngestionSafety({
      localizedTitle: "Sample Adult Film",
      adult: true,
    });
    assert(!adultFlagSafety.allowed, "adult: true flag must be rejected");
    assert(adultFlagSafety.reasons.includes("ADULT_FLAG"), "Reason must include ADULT_FLAG");

    const explicitKeywordSafety = evaluateContentIngestionSafety({
      localizedTitle: "Normal Sounding Title",
      overview: "This movie is a hardcore porn film with adult scenes.",
      adult: false,
    });
    assert(!explicitKeywordSafety.allowed, "Explicit keyword in overview must be rejected");
    assert(explicitKeywordSafety.reasons.includes("EXPLICIT_ADULT_KEYWORD"), "Reason must include EXPLICIT_ADULT_KEYWORD");
  }

  // 9. Overview Safety & Placeholder Rejections
  {
    const placeholders = [
      "Film hakkında özet bilgi bulunmuyor.",
      "film hakkında özet bilgisi bulunmuyor",
      "Dizi hakkında özet bilgi bulunmuyor.",
      "Özet bulunmuyor",
      "Henüz bir özet eklenmedi.",
      "No overview found.",
      "no overview available",
      "",
    ];

    for (const ph of placeholders) {
      assert(!isMeaningfulOverview(ph), `Placeholder '${ph}' must be detected as non-meaningful`);
      assert(normalizeOverviewForPersistence(ph) === "", `Placeholder '${ph}' must normalize to empty string`);
    }

    const realOverview = "İnsanlığın son günlerinde, uzayda keşfedilen bir solucan deliğinden geçen kaşiflerin hikayesi.";
    assert(isMeaningfulOverview(realOverview), "Actual synopsis must be detected as meaningful");
    assert(normalizeOverviewForPersistence(realOverview) === realOverview, "Actual synopsis must be preserved");
  }

  // 10. Shared Field-by-Field Localization Merge (Movie & TV Parity)
  {
    const movieTr = {
      id: 100,
      title: "Yıldızlararası",
      original_title: "Interstellar",
      overview: "",
      popularity: 150,
      vote_average: 8.6,
      poster_path: "/poster.jpg",
      backdrop_path: "/backdrop.jpg",
    };
    const movieEn = {
      id: 100,
      title: "Interstellar",
      original_title: "Interstellar",
      overview: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
      popularity: 150,
      vote_average: 8.6,
      poster_path: "/poster.jpg",
      backdrop_path: "/backdrop.jpg",
    };

    const mergedMovie = mergeTmdbMovieLocalization(movieTr, movieEn, true);
    assert(mergedMovie.movie.title === "Yıldızlararası", "Movie display title must stay Turkish");
    assert(mergedMovie.movie.overview === movieEn.overview, "Movie overview must fallback to English when Turkish is empty");
    assert(mergedMovie.titleSource === "TR", "Title source must be TR");
    assert(mergedMovie.overviewSource === "EN", "Overview source must be EN");

    const tvTr = {
      id: 200,
      name: "Taht Oyunları",
      original_name: "Game of Thrones",
      overview: "",
      popularity: 200,
      vote_average: 8.4,
      poster_path: "/tv_poster.jpg",
      backdrop_path: "/tv_backdrop.jpg",
    };
    const tvEn = {
      id: 200,
      name: "Game of Thrones",
      original_name: "Game of Thrones",
      overview: "Seven noble families fight for control of the mythical land of Westeros.",
      popularity: 200,
      vote_average: 8.4,
      poster_path: "/tv_poster.jpg",
      backdrop_path: "/tv_backdrop.jpg",
    };

    const mergedTv = mergeTmdbTvLocalization(tvTr, tvEn, true);
    assert(mergedTv.show.name === "Taht Oyunları", "TV display title must stay Turkish");
    assert(mergedTv.show.overview === tvEn.overview, "TV overview must fallback to English when Turkish is empty");
    assert(mergedTv.titleSource === "TR", "TV Title source must be TR");
    assert(mergedTv.overviewSource === "EN", "TV Overview source must be EN");
  }

  console.log("  ✅ TMDB Catalog Ingestion Engine Unit Tests Passed.");
}
