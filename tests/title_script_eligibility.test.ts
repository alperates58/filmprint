import {
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
  const allowedTitles = [
    "Breaking Bad",
    "Alice in Borderland",
    "Pokémon Yeni Ufuklar: Dizi",
    "La Casa de Papel",
    "Dark",
    "3 Body Problem",
    "Squid Game",
    "Kingdom",
  ];
  const rejectedTitles = [
    "斗破苍穹",
    "哆啦A梦TV版",
    "ヤニねこ",
    "魔法少女にあこがれて",
    "Игра престолов",
    "مسلسل اختبار",
    "एक परीक्षण",
  ];

  for (const title of allowedTitles) {
    assert(isDisplayTitleAllowed(title), `Expected Latin/Turkish display title to pass: ${title}`);
  }
  for (const title of rejectedTitles) {
    assert(!isDisplayTitleAllowed(title), `Expected non-Latin display title to fail: ${title}`);
  }

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

  const tvContexts: TvEligibilityContext[] = ["CALIBRATION", "RECOMMENDATION", "HOME"];
  for (const context of tvContexts) {
    const result = evaluateTvEligibility(
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
      result.reasons.includes("NON_LATIN_DISPLAY_TITLE"),
      `TV ${context} must hard-reject a non-Latin display title`
    );
  }

  const movieContexts: MovieEligibilityContext[] = ["CALIBRATION", "RECOMMENDATION", "HOME"];
  for (const context of movieContexts) {
    const result = evaluateMovieEligibility(
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
      result.reasons.includes("NON_LATIN_DISPLAY_TITLE"),
      `Movie ${context} must hard-reject a non-Latin display title`
    );
  }

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

  const explicitExamples = [
    "僧侶と交わる色欲の夜に…",
    "洗い屋さん！～俺とアイツが女湯で！？～",
  ];
  for (const title of explicitExamples) {
    assert(isExplicitAdultContent(title), `Unicode explicit signal must be detected: ${title}`);
  }

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

  const ingestionAllowed = evaluateContentIngestionSafety({
    localizedTitle: "Alice in Borderland",
    originalTitle: "今際の国のアリス",
    overview: SAFE_OVERVIEW,
    adult: false,
  });
  assert(ingestionAllowed.allowed, "Safe Latin localized title must pass ingestion");

  const auditCounts = countCatalogSafetyFindings([
    { displayTitle: "Breaking Bad", originalTitle: "Breaking Bad", overview: SAFE_OVERVIEW },
    { displayTitle: "斗破苍穹", originalTitle: "斗破苍穹", overview: SAFE_OVERVIEW },
    { displayTitle: "Safe Latin Name", originalTitle: "成人向け", overview: SAFE_OVERVIEW },
  ]);
  assert(auditCounts.nonLatinDisplayTitle === 1, "Audit helper must count non-Latin display titles");
  assert(auditCounts.explicitContentSuspicious === 1, "Audit helper must count explicit suspicious records");

  console.log("✅ Title script, eligibility, ingestion and diagnostic audit tests passed");
}
