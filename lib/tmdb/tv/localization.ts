import { isMeaningfulOverview } from "@/lib/content/overview-safety";
import { isDisplayTitleAllowed } from "@/lib/content/title-safety";
import { mergeLocalizedMetadataFields } from "@/lib/tmdb/localization";
import type { TMDBTvShow } from "./types";

export type TvTitleLocalizationSource = "TR" | "EN" | "ORIGINAL" | "NONE";
export type TvOverviewLocalizationSource = "TR" | "EN" | "NONE";

export interface LocalizedTmdbTvShow {
  show: TMDBTvShow;
  turkishTitle: string;
  englishTitle: string;
  titleSource: TvTitleLocalizationSource;
  overviewSource: TvOverviewLocalizationSource;
  englishRequested: boolean;
}

export type FetchEnglishTvShow = () => Promise<TMDBTvShow | null>;
export type FetchTvShowLanguage = (language: "tr-TR" | "en-US") => Promise<TMDBTvShow>;

export function needsEnglishTvLocalization(show: TMDBTvShow): boolean {
  return !isMeaningfulOverview(show.overview) || !isDisplayTitleAllowed(show.name || "");
}

export function mergeTmdbTvLocalization(
  turkish: TMDBTvShow,
  english: TMDBTvShow | null = null,
  englishRequested = false
): LocalizedTmdbTvShow {
  const fields = mergeLocalizedMetadataFields({
    turkishTitle: turkish.name,
    englishTitle: english?.name,
    originalTitle: turkish.original_name || english?.original_name,
    turkishOverview: turkish.overview,
    englishOverview: english?.overview,
  });

  return {
    show: {
      ...turkish,
      name: fields.displayTitle,
      original_name: fields.originalTitle,
      overview: fields.overview,
      adult: turkish.adult === true || english?.adult === true,
    },
    turkishTitle: fields.turkishTitle,
    englishTitle: fields.englishTitle,
    titleSource: fields.titleSource as TvTitleLocalizationSource,
    overviewSource: fields.overviewSource as TvOverviewLocalizationSource,
    englishRequested,
  };
}

/** Fetches English only when Turkish overview/title cannot satisfy display policy. */
export async function localizeTmdbTvShow(
  turkish: TMDBTvShow,
  fetchEnglish?: FetchEnglishTvShow
): Promise<LocalizedTmdbTvShow> {
  const needsEnglish = needsEnglishTvLocalization(turkish);
  const english = needsEnglish && fetchEnglish ? await fetchEnglish() : null;
  return mergeTmdbTvLocalization(turkish, english, needsEnglish && Boolean(fetchEnglish));
}

export async function fetchLocalizedTmdbTvShow(
  fetchLanguage: FetchTvShowLanguage
): Promise<LocalizedTmdbTvShow> {
  const turkish = await fetchLanguage("tr-TR");
  try {
    return await localizeTmdbTvShow(turkish, () => fetchLanguage("en-US"));
  } catch {
    // English is an optional localization fallback; usable Turkish/original
    // metadata must survive a failed or rate-limited fallback request.
    return mergeTmdbTvLocalization(turkish, null, true);
  }
}
