import { normalizeOverviewForPersistence } from "@/lib/content/overview-safety";
import { resolveAllowedDisplayTitle } from "@/lib/content/title-safety";

export type MetadataTitleSource = "TR" | "EN" | "ORIGINAL" | "NONE";
export type MetadataOverviewSource = "TR" | "EN" | "ORIGINAL" | "NONE";

export interface LocalizedMetadataFields {
  displayTitle: string;
  overview: string;
  turkishTitle: string;
  englishTitle: string;
  originalTitle: string;
  titleSource: MetadataTitleSource;
  overviewSource: MetadataOverviewSource;
}

/** Shared field-by-field text merge used by both Movie and TV. */
export function mergeLocalizedMetadataFields(input: {
  turkishTitle?: string | null;
  englishTitle?: string | null;
  originalTitle?: string | null;
  turkishOverview?: string | null;
  englishOverview?: string | null;
  originalOverview?: string | null;
}): LocalizedMetadataFields {
  const turkishTitle = input.turkishTitle?.trim() || "";
  const englishTitle = input.englishTitle?.trim() || "";
  const originalTitle = input.originalTitle?.trim() || "";
  const resolvedTitle = resolveAllowedDisplayTitle({
    localizedTitle: turkishTitle,
    englishTitle,
    originalTitle,
  });
  const titleSource: MetadataTitleSource =
    resolvedTitle?.source === "LOCALIZED"
      ? "TR"
      : resolvedTitle?.source === "ENGLISH"
        ? "EN"
        : resolvedTitle?.source === "ORIGINAL"
          ? "ORIGINAL"
          : "NONE";

  const turkishOverview = normalizeOverviewForPersistence(input.turkishOverview);
  const englishOverview = normalizeOverviewForPersistence(input.englishOverview);
  const originalOverview = normalizeOverviewForPersistence(input.originalOverview);
  const overview = turkishOverview || englishOverview || originalOverview;
  const overviewSource: MetadataOverviewSource = turkishOverview
    ? "TR"
    : englishOverview
      ? "EN"
      : originalOverview
        ? "ORIGINAL"
        : "NONE";

  return {
    displayTitle:
      resolvedTitle?.title || turkishTitle || englishTitle || originalTitle,
    overview,
    turkishTitle,
    englishTitle,
    originalTitle,
    titleSource,
    overviewSource,
  };
}
