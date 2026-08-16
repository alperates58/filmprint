import { readFileSync } from "node:fs";
import { join } from "node:path";
import { evaluateContentIngestionSafety } from "../lib/content/ingestion-safety";
import { isMeaningfulOverview } from "../lib/content/overview-safety";
import { isDisplayTitleAllowed } from "../lib/content/title-safety";
import {
  localizeTmdbTvShow,
  mergeTmdbTvLocalization,
} from "../lib/tmdb/tv/localization";
import type { TMDBTvShow } from "../lib/tmdb/tv/types";
import { evaluateTvEligibility } from "../lib/tv/eligibility";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const ENGLISH_OVERVIEW =
  "A celebrated surgeon leads a dedicated hospital team through difficult cases, personal conflicts, ethical dilemmas, and changing relationships while their patients force them to reconsider the meaning of hope and responsibility.";

function show(name: string, overview: string, originalName = name): TMDBTvShow {
  return {
    id: 6467,
    name,
    original_name: originalName,
    overview,
    poster_path: "/poster.jpg",
    backdrop_path: "/backdrop.jpg",
    first_air_date: "1994-09-18",
    popularity: 50,
    vote_average: 7.5,
    vote_count: 500,
    adult: false,
  };
}

export async function runTmdbTvLocalizationTests(): Promise<void> {
  // 1. Missing Turkish overview falls back to English.
  {
    const localized = await localizeTmdbTvShow(show("Chicago Hope", ""), async () =>
      show("Chicago Hope", ENGLISH_OVERVIEW)
    );
    assert(localized.show.overview === ENGLISH_OVERVIEW, "English overview must fill empty tr-TR overview");
    assert(localized.overviewSource === "EN", "Overview source must report EN");
  }

  // 2. Turkish title and English overview are independently mergeable.
  {
    const localized = await localizeTmdbTvShow(
      show("Pokémon Yeni Ufuklar: Dizi", "", "ポケットモンスター"),
      async () => show("Pokémon Horizons: The Series", ENGLISH_OVERVIEW, "ポケットモンスター")
    );
    assert(localized.show.name === "Pokémon Yeni Ufuklar: Dizi", "Turkish display title must be preserved");
    assert(localized.show.overview === ENGLISH_OVERVIEW, "English overview must be used independently");
    assert(localized.titleSource === "TR" && localized.overviewSource === "EN", "Field sources must be independent");
  }

  // 3. Non-Latin Turkish response falls back to English display title.
  {
    const localized = await localizeTmdbTvShow(show("斗破苍穹", ""), async () =>
      show("Fights Break Sphere", ENGLISH_OVERVIEW, "斗破苍穹")
    );
    assert(localized.show.name === "Fights Break Sphere", "English display title must replace raw CJK title");
    assert(localized.show.overview === ENGLISH_OVERVIEW, "English overview must be merged");
    assert(localized.titleSource === "EN", "Title source must report EN");
  }

  // 4. Both localized titles non-Latin remain ineligible for user-facing use.
  {
    const localized = mergeTmdbTvLocalization(
      show("斗破苍穹", ENGLISH_OVERVIEW),
      show("斗破苍穹", ENGLISH_OVERVIEW)
    );
    assert(!isDisplayTitleAllowed(localized.show.name), "All-non-Latin title candidates must remain invalid");
    const eligibility = evaluateTvEligibility({
      name: localized.show.name,
      original_name: localized.show.original_name,
      overview: localized.show.overview,
      posterPath: localized.show.poster_path,
      firstAirDate: localized.show.first_air_date,
      voteAverage: localized.show.vote_average,
      voteCount: localized.show.vote_count,
      popularity: localized.show.popularity,
      adult: localized.show.adult,
    });
    assert(
      eligibility.reasons.includes("NON_LATIN_DISPLAY_TITLE"),
      "Runtime eligibility must reject all-non-Latin localization"
    );
  }

  // 5. Valid Turkish metadata does not make an en-US request.
  {
    let englishRequests = 0;
    const localized = await localizeTmdbTvShow(show("Şahsiyet", ENGLISH_OVERVIEW), async () => {
      englishRequests++;
      return show("Persona", ENGLISH_OVERVIEW);
    });
    assert(englishRequests === 0, "Valid tr-TR metadata must use exactly zero English fallback requests");
    assert(!localized.englishRequested, "Localization result must record that English was not requested");
  }

  // 6. Internal placeholders are not meaningful metadata.
  assert(
    !isMeaningfulOverview("Dizi hakkında özet bilgi bulunmuyor."),
    "Internal TV placeholder must never be meaningful"
  );

  // Adult/explicit audit includes English title even when Turkish title is safe.
  const safety = evaluateContentIngestionSafety({
    localizedTitle: "Güvenli Başlık",
    englishTitle: "Explicit Porn Movie",
    originalTitle: "Güvenli Başlık",
    overview: ENGLISH_OVERVIEW,
    adult: false,
  });
  assert(
    safety.reasons.includes("EXPLICIT_ADULT_KEYWORD"),
    "English title must participate in ingestion explicit-content scanning"
  );

  // Mandatory persistence assertion: the TV upsert source cannot contain the placeholder literal.
  const tvWritePaths = [
    join(process.cwd(), "lib", "tmdb", "tv", "client.ts"),
    join(process.cwd(), "app", "api", "tv", "[id]", "route.ts"),
    join(process.cwd(), "scripts", "backfill-tv-localization.ts"),
  ];
  for (const file of tvWritePaths) {
    const source = readFileSync(file, "utf8");
    assert(
      !source.includes("Dizi hakkında özet bilgi bulunmuyor."),
      `TvShow DB write path must not persist the internal placeholder: ${file}`
    );
  }

  console.log("✅ TMDB TV localization fallback and request-economy tests passed");
}
