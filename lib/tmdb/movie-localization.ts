import { isMeaningfulOverview } from "@/lib/content/overview-safety";
import { isDisplayTitleAllowed } from "@/lib/content/title-safety";
import { mergeLocalizedMetadataFields } from "./localization";
import type { TMDBMovie } from "./client";

export interface LocalizedTmdbMovie {
  movie: TMDBMovie;
  turkishTitle: string;
  englishTitle: string;
  titleSource: "TR" | "EN" | "ORIGINAL" | "NONE";
  overviewSource: "TR" | "EN" | "ORIGINAL" | "NONE";
  englishRequested: boolean;
}

export function needsEnglishMovieLocalization(movie: TMDBMovie): boolean {
  return !isMeaningfulOverview(movie.overview) || !isDisplayTitleAllowed(movie.title || "");
}

export function mergeTmdbMovieLocalization(
  turkish: TMDBMovie,
  english: TMDBMovie | null = null,
  englishRequested = false
): LocalizedTmdbMovie {
  const fields = mergeLocalizedMetadataFields({
    turkishTitle: turkish.title,
    englishTitle: english?.title,
    originalTitle: turkish.original_title || english?.original_title,
    turkishOverview: turkish.overview,
    englishOverview: english?.overview,
  });

  return {
    movie: {
      ...turkish,
      title: fields.displayTitle,
      original_title: fields.originalTitle,
      overview: fields.overview,
      adult: turkish.adult === true || english?.adult === true,
    },
    turkishTitle: fields.turkishTitle,
    englishTitle: fields.englishTitle,
    titleSource: fields.titleSource,
    overviewSource: fields.overviewSource,
    englishRequested,
  };
}

export async function localizeTmdbMovie(
  turkish: TMDBMovie,
  fetchEnglish?: () => Promise<TMDBMovie | null>
): Promise<LocalizedTmdbMovie> {
  const needsEnglish = needsEnglishMovieLocalization(turkish);
  if (!needsEnglish || !fetchEnglish) return mergeTmdbMovieLocalization(turkish);
  try {
    return mergeTmdbMovieLocalization(turkish, await fetchEnglish(), true);
  } catch {
    return mergeTmdbMovieLocalization(turkish, null, true);
  }
}
