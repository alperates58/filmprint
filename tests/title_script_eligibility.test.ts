import {
  analyzeDisplayTitle,
  getDisplayTitleScriptStats,
  isDisplayTitleAllowed,
  MIN_LATIN_DISPLAY_TITLE_RATIO,
  resolveAllowedDisplayTitle,
} from "../lib/content/title-safety";
import { evaluateContentIngestionSafety } from "../lib/content/ingestion-safety";
import { countCatalogSafetyFindings } from "../lib/content/catalog-safety-audit";
import { isExplicitAdultContent } from "../lib/movies/denylist";
import { evaluateMovieEligibility } from "../lib/movies/eligibility";
import { evaluateTvEligibility } from "../lib/tv/eligibility";
import type { MovieEligibilityContext } from "../lib/movies/types";
import type { TvEligibilityContext } from "../lib/tv/types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const SAFE_OVERVIEW =
  "Karakterlerin değişimini ve çatışmalarını ayrıntılı biçimde anlatan yeterince uzun bir özet metnidir.";

export async function runTitleScriptEligibilityTests() {
  console.log("=== RUNNING TITLE SCRIPT & NUMERIC TITLE SAFETY TESTS ===\n");

  // 1. Valid Latin / Turkish titles
  const allowedAlphabeticTitles = [
    "Breaking Bad",
    "Alice in Borderland",
    "Pokémon Yeni Ufuklar: Dizi",
    "La Casa de Papel",
    "Dark",
    "3 Body Problem",
    "Squid Game",
    "Kingdom",
    "Çakallarla Dans",
    "Parasite",
    "Amélie",
    "Interstellar",
    "Dune: Part Two",
    "Se7en",
    "2001: A Space Odyssey",
  ];

  for (const title of allowedAlphabeticTitles) {
    assert(isDisplayTitleAllowed(title), `Expected Latin/Turkish display title to pass: ${title}`);
  }

  // 2. Valid Numeric-Only / Numeric Titles (Mandatory: 2012, 1917, 17, 9, 1408, 28)
  const allowedNumericTitles = [
    "2012",
    "1917",
    "17",
    "9",
    "1408",
    "28",
    "24",
    "11.22.63",
    "3:10",
  ];

  for (const title of allowedNumericTitles) {
    assert(isDisplayTitleAllowed(title), `Expected numeric display title to pass: ${title}`);
    const stats = analyzeDisplayTitle(title);
    assert(stats.isNumericOnlyOrNumericTitle, `Expected ${title} to be recognized as numeric title`);
    assert(!stats.hasNonLatinAlphabeticScript, `Expected ${title} to have no non-Latin alphabetic script`);
    assert(stats.alphabeticCount === 0, `Expected ${title} to have 0 alphabetic letters`);
    assert(stats.latinRatio === 1.0, `Expected ${title} latinRatio to be 1.0 (got ${stats.latinRatio})`);
    assert(stats.allowed, `Expected ${title} to be allowed`);
  }

  // 3. Rejected non-Latin Script Titles without fallback
  const rejectedTitles = [
    "仙逆剧场版 弑仙之战",
    "君の名は。",
    "기생충",
    "進撃の巨人",
    "斗破苍穹",
    "哆啦A梦TV版",
    "ヤニねこ",
    "魔法少女にあこがれて",
    "Игра престолов",
    "مسلسل اختبار",
    "एक परीक्षण",
  ];

  for (const title of rejectedTitles) {
    assert(!isDisplayTitleAllowed(title), `Expected non-Latin display title to fail: ${title}`);
    const stats = analyzeDisplayTitle(title);
    assert(stats.hasNonLatinAlphabeticScript, `Expected ${title} to flag hasNonLatinAlphabeticScript`);
    assert(!stats.isNumericOnlyOrNumericTitle, `Expected ${title} not to be numeric title`);
    assert(!stats.allowed, `Expected ${title} to be disallowed`);
  }

  // 4. Invalid Empty / Pure Punctuation Titles
  const invalidEmptyOrPunctuationTitles = [
    "",
    "   ",
    "...",
    "???",
    "---",
  ];

  for (const title of invalidEmptyOrPunctuationTitles) {
    assert(!isDisplayTitleAllowed(title), `Expected empty/punctuation title to fail: '${title}'`);
  }

  // 5. Mixed Script Ratio Validation
  const mixedTitle = "Tokyo Revengers 東京卍リベンジャーズ";
  const mixedStats = getDisplayTitleScriptStats(mixedTitle);
  assert(
    mixedStats.latinRatio < MIN_LATIN_DISPLAY_TITLE_RATIO && !mixedStats.allowed,
    "Mixed Tokyo Revengers title must reject because its alphabetic Latin ratio is below 0.80"
  );
  assert(
    isDisplayTitleAllowed("Tokyo Revengers 東"),
    "A single non-Latin letter must not reject an otherwise Latin-heavy title"
  );

  // 6. Localization Fallback Priority
  const localizedPriority = resolveAllowedDisplayTitle({
    localizedTitle: "Alice in Borderland",
    originalTitle: "今際の国のアリス",
  });
  assert(localizedPriority?.source === "LOCALIZED", "Latin localized title must win over original title");

  const existingOriginalFallback = resolveAllowedDisplayTitle({
    localizedTitle: "今際の国のアリス",
    originalTitle: "Alice in Borderland",
  });
  assert(
    existingOriginalFallback?.source === "ORIGINAL",
    "Already-available Latin original/global title may be used without a translation request"
  );

  const numericOriginalFallback = resolveAllowedDisplayTitle({
    localizedTitle: null,
    englishTitle: null,
    originalTitle: "1917",
  });
  assert(
    numericOriginalFallback?.source === "ORIGINAL" && numericOriginalFallback?.title === "1917",
    "Numeric original title must be usable display title fallback"
  );

  // 7. Production Test Fixtures (Section 11)
  // TMDB 14161: title "2012" -> VALID
  const tmdb14161Stats = analyzeDisplayTitle("2012");
  assert(tmdb14161Stats.allowed, "TMDB 14161 '2012' must be VALID");

  // TMDB 530915: title "1917" -> VALID
  const tmdb530915Stats = analyzeDisplayTitle("1917");
  assert(tmdb530915Stats.allowed, "TMDB 530915 '1917' must be VALID");

  // TMDB 1619815: title "17" -> VALID
  const tmdb1619815Stats = analyzeDisplayTitle("17");
  assert(tmdb1619815Stats.allowed, "TMDB 1619815 '17' must be VALID");

  // TMDB 1599191: title "仙逆剧场版 弑仙之战" without fallback -> INVALID (NON_LATIN_DISPLAY_TITLE)
  const tmdb1599191Stats = analyzeDisplayTitle("仙逆剧场版 弑仙之战");
  assert(!tmdb1599191Stats.allowed, "TMDB 1599191 without fallback must be INVALID");

  // 8. TV Eligibility Evaluation
  const tvContexts: TvEligibilityContext[] = ["CALIBRATION", "RECOMMENDATION", "HOME"];
  for (const context of tvContexts) {
    const nonLatinResult = evaluateTvEligibility(
      {
        name: "斗破苍穹",
        originalName: "斗破苍穹",
        overview: SAFE_OVERVIEW,
        posterPath: "/poster.jpg",
        firstAirDate: "2018-01-01",
        popularity: 100,
        voteAverage: 8,
        voteCount: 1000,
      },
      context
    );
    assert(
      nonLatinResult.reasons.includes("NON_LATIN_DISPLAY_TITLE"),
      `TV ${context} must hard-reject a non-Latin display title`
    );

    // TV Numeric Title: 1917
    const numericTv1917Result = evaluateTvEligibility(
      {
        name: "1917",
        originalName: "1917",
        overview: SAFE_OVERVIEW,
        posterPath: "/poster.jpg",
        firstAirDate: "2019-12-25",
        popularity: 50,
        voteAverage: 8.0,
        voteCount: 500,
      },
      context
    );
    assert(
      !numericTv1917Result.reasons.includes("NON_LATIN_DISPLAY_TITLE"),
      `TV ${context} must NOT flag NON_LATIN_DISPLAY_TITLE for '1917'`
    );
    assert(numericTv1917Result.isEligible, `TV ${context} '1917' must be eligible`);

    // TV Numeric Title: 17
    const numericTv17Result = evaluateTvEligibility(
      {
        name: "17",
        originalName: "17",
        overview: SAFE_OVERVIEW,
        posterPath: "/poster.jpg",
        firstAirDate: "2020-01-01",
        popularity: 50,
        voteAverage: 7.0,
        voteCount: 500,
      },
      context
    );
    assert(
      !numericTv17Result.reasons.includes("NON_LATIN_DISPLAY_TITLE"),
      `TV ${context} must NOT flag NON_LATIN_DISPLAY_TITLE for '17'`
    );
    assert(numericTv17Result.isEligible, `TV ${context} '17' must be eligible`);
  }

  // 9. Movie Eligibility Evaluation
  const movieContexts: MovieEligibilityContext[] = ["CALIBRATION", "RECOMMENDATION", "HOME"];
  for (const context of movieContexts) {
    const nonLatinResult = evaluateMovieEligibility(
      {
        title: "Игра престолов",
        originalTitle: "Game of Thrones",
        overview: SAFE_OVERVIEW,
        posterPath: "/poster.jpg",
        releaseYear: 2019,
        popularity: 100,
        voteAverage: 8,
        voteCount: 1000,
      },
      context
    );
    assert(
      nonLatinResult.reasons.includes("NON_LATIN_DISPLAY_TITLE"),
      `Movie ${context} must hard-reject a non-Latin display title`
    );

    // Movie Numeric Title: 2012
    const numericMovie2012Result = evaluateMovieEligibility(
      {
        title: "2012",
        originalTitle: "2012",
        overview: SAFE_OVERVIEW,
        posterPath: "/poster.jpg",
        releaseYear: 2009,
        popularity: 100,
        voteAverage: 6.5,
        voteCount: 10000,
      },
      context
    );
    assert(
      !numericMovie2012Result.reasons.includes("NON_LATIN_DISPLAY_TITLE"),
      `Movie ${context} must NOT flag NON_LATIN_DISPLAY_TITLE for '2012'`
    );
    assert(numericMovie2012Result.isEligible, `Movie ${context} '2012' must be eligible`);
    assert(numericMovie2012Result.details?.titleLatinRatio === 1.0, "titleLatinRatio for 2012 must report 1.0");
  }

  // 10. Japanese production with Latin localized display name passes
  const localizedTv = evaluateTvEligibility({
    name: "Alice in Borderland",
    originalName: "今際の国のアリス",
    overview: SAFE_OVERVIEW,
    posterPath: "/poster.jpg",
    firstAirDate: "2020-12-10",
    popularity: 100,
    voteAverage: 8,
    voteCount: 1000,
  });
  assert(localizedTv.isEligible, "A Japanese production with a Latin localized display name must pass");

  // 11. Explicit adult content detection
  const explicitExamples = [
    "僧侶と交わる色欲の夜に…",
    "洗い屋さん！～俺とアイツが女湯で！？～",
  ];
  for (const title of explicitExamples) {
    assert(isExplicitAdultContent(title), `Unicode explicit signal must be detected: ${title}`);
  }

  // 12. Ingestion Safety Evaluation
  const ingestionRejected = evaluateContentIngestionSafety({
    localizedTitle: "僧侶と交わる色欲の夜に…",
    originalTitle: "僧侶と交わる色欲の夜に…",
    overview: SAFE_OVERVIEW,
    adult: false,
  });
  assert(!ingestionRejected.allowed, "Explicit/non-Latin content must be blocked before ingestion");
  assert(
    ingestionRejected.reasons.includes("EXPLICIT_ADULT_KEYWORD") &&
      ingestionRejected.reasons.includes("NON_LATIN_DISPLAY_TITLE"),
    "Ingestion guard must expose both explicit and title-script findings"
  );

  const ingestionCjkRejected = evaluateContentIngestionSafety({
    localizedTitle: "仙逆剧场版 弑仙之战",
    originalTitle: "仙逆剧场版 弑仙之战",
    overview: SAFE_OVERVIEW,
    adult: false,
  });
  assert(!ingestionCjkRejected.allowed, "CJK title without Latin fallback must be blocked in ingestion");
  assert(
    ingestionCjkRejected.reasons.includes("NON_LATIN_DISPLAY_TITLE"),
    "Ingestion must record NON_LATIN_DISPLAY_TITLE for CJK without fallback"
  );

  const ingestionNumeric2012 = evaluateContentIngestionSafety({
    localizedTitle: "2012",
    originalTitle: "2012",
    overview: SAFE_OVERVIEW,
    adult: false,
  });
  assert(ingestionNumeric2012.allowed, "2012 must pass ingestion safety");
  assert(ingestionNumeric2012.displayTitle?.title === "2012", "Display title must resolve to '2012'");

  const ingestionNumeric1917 = evaluateContentIngestionSafety({
    localizedTitle: "1917",
    originalTitle: "1917",
    overview: SAFE_OVERVIEW,
    adult: false,
  });
  assert(ingestionNumeric1917.allowed, "1917 must pass ingestion safety");

  const ingestionNumeric17 = evaluateContentIngestionSafety({
    localizedTitle: "17",
    originalTitle: "17",
    overview: SAFE_OVERVIEW,
    adult: false,
  });
  assert(ingestionNumeric17.allowed, "17 must pass ingestion safety");

  // 13. Catalog Safety Audit Evaluation
  const numericAuditCounts = countCatalogSafetyFindings([
    { displayTitle: "2012", originalTitle: "2012", overview: SAFE_OVERVIEW },
    { displayTitle: "1917", originalTitle: "1917", overview: SAFE_OVERVIEW },
    { displayTitle: "17", originalTitle: "17", overview: SAFE_OVERVIEW },
  ]);
  assert(
    numericAuditCounts.nonLatinDisplayTitle === 0,
    `Audit helper must count 0 nonLatinDisplayTitle for ['2012', '1917', '17'] (got ${numericAuditCounts.nonLatinDisplayTitle})`
  );

  const cjkAuditCounts = countCatalogSafetyFindings([
    { displayTitle: "Breaking Bad", originalTitle: "Breaking Bad", overview: SAFE_OVERVIEW },
    { displayTitle: "2012", originalTitle: "2012", overview: SAFE_OVERVIEW },
    { displayTitle: "仙逆剧场版 弑仙之战", originalTitle: "仙逆剧场版 弑仙之战", overview: SAFE_OVERVIEW },
  ]);
  assert(
    cjkAuditCounts.nonLatinDisplayTitle === 1,
    `Audit helper must count 1 nonLatinDisplayTitle for CJK record (got ${cjkAuditCounts.nonLatinDisplayTitle})`
  );

  console.log("✅ Title script, numeric titles, eligibility, ingestion, and diagnostic audit tests passed successfully!\n");
}
