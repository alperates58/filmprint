import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isMeaningfulOverview } from "../lib/content/overview-safety";
import { localizeTmdbMovie } from "../lib/tmdb/movie-localization";
import {
  resolveLocalizedTrailer,
  selectBestTrailer,
  type LocalizedTmdbVideo,
} from "../lib/tmdb/trailer";
import type { TMDBMovie } from "../lib/tmdb/client";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const OVERVIEW =
  "An extensive English overview follows the characters through a difficult conflict and explains their choices with enough detail for calibration quality checks.";

function movie(title: string, overview: string, originalTitle = title): TMDBMovie {
  return {
    id: 9001,
    title,
    original_title: originalTitle,
    overview,
    poster_path: "/poster.jpg",
    backdrop_path: "/backdrop.jpg",
    release_date: "2020-01-01",
    popularity: 50,
    vote_average: 7.5,
    vote_count: 500,
    adult: false,
  };
}

export async function runTmdbSharedLocalizationTests(): Promise<void> {
  // Movie metadata uses field-by-field TR title + EN overview merge.
  {
    let englishRequests = 0;
    const localized = await localizeTmdbMovie(movie("Örnek Film", ""), async () => {
      englishRequests++;
      return movie("Example Movie", OVERVIEW, "Example Movie");
    });
    assert(localized.movie.title === "Örnek Film", "Movie Turkish title must remain canonical display title");
    assert(localized.movie.overview === OVERVIEW, "Movie must use English overview when Turkish is empty");
    assert(localized.titleSource === "TR" && localized.overviewSource === "EN", "Movie fields must merge independently");
    assert(englishRequests === 1, "Missing Movie overview must make exactly one English fallback request");
  }

  // Complete Turkish Movie metadata does not request English.
  {
    let englishRequests = 0;
    await localizeTmdbMovie(movie("Örnek Film", OVERVIEW), async () => {
      englishRequests++;
      return movie("Example Movie", OVERVIEW);
    });
    assert(englishRequests === 0, "Complete Turkish Movie metadata must not request English");
  }

  assert(!isMeaningfulOverview("Film hakkında özet bilgi bulunmuyor."), "Movie placeholder must be meaningless");
  assert(!isMeaningfulOverview("Dizi hakkında özet bilgi bulunmuyor."), "TV placeholder must be meaningless");

  // Turkish official Trailer wins and avoids the English request.
  {
    let englishRequests = 0;
    const resolved = await resolveLocalizedTrailer(
      [{ key: "tr-official", site: "YouTube", type: "Trailer", official: true, name: "Resmi Fragman" }],
      async () => {
        englishRequests++;
        return [{ key: "en-official", site: "YouTube", type: "Trailer", official: true }];
      }
    );
    assert(resolved.trailer?.key === "tr-official", "Turkish Trailer must have first priority");
    assert(englishRequests === 0 && !resolved.englishRequested, "English videos must not be fetched when TR Trailer exists");
  }

  // English official Trailer fills a missing Turkish Trailer.
  {
    const resolved = await resolveLocalizedTrailer([], async () => [
      { key: "en-official", site: "YouTube", type: "Trailer", official: true, name: "Official Trailer" },
    ]);
    assert(resolved.trailer?.key === "en-official", "English Trailer must be selected when Turkish has none");
    assert(resolved.englishRequested, "English request must be recorded");
  }

  // Teaser is accepted only after both languages have no Trailer.
  {
    const resolved = await resolveLocalizedTrailer([], async () => [
      { key: "en-teaser", site: "YouTube", type: "Teaser", official: true, name: "Official Teaser" },
    ]);
    assert(resolved.trailer?.key === "en-teaser" && resolved.trailer.type === "Teaser", "Official teaser must be final fallback");
  }

  // Unsupported providers and low-trust clips cannot produce a YouTube embed.
  {
    const candidates: LocalizedTmdbVideo[] = [
      { key: "vimeo-key", site: "Vimeo", type: "Trailer", official: true, languageSource: "tr-TR" },
      { key: "random-clip", site: "YouTube", type: "Clip", official: false, name: "Scene 4", languageSource: "en-US" },
    ];
    assert(selectBestTrailer(candidates) === null, "Unsupported or low-trust videos must be rejected");
  }

  const movieWritePaths = [
    join(process.cwd(), "lib", "tmdb", "client.ts"),
    join(process.cwd(), "app", "api", "movies", "[movieId]", "route.ts"),
    join(process.cwd(), "scripts", "backfill-movie-localization.ts"),
  ];
  for (const file of movieWritePaths) {
    const source = readFileSync(file, "utf8");
    assert(
      !source.includes("Film hakkında özet bilgi bulunmuyor."),
      `Movie DB write path must not persist the internal placeholder: ${file}`
    );
  }

  console.log("✅ Shared Movie/TV metadata and trailer fallback tests passed");
}
