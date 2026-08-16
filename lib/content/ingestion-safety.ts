import { isExplicitAdultContent } from "@/lib/movies/denylist";
import { resolveAllowedDisplayTitle, ResolvedDisplayTitle } from "./title-safety";

export type ContentIngestionRejectionReason =
  | "ADULT_FLAG"
  | "EXPLICIT_ADULT_KEYWORD"
  | "NON_LATIN_DISPLAY_TITLE"
  | "MISSING_TITLE";

export interface ContentIngestionSafetyResult {
  allowed: boolean;
  displayTitle: ResolvedDisplayTitle | null;
  reasons: ContentIngestionRejectionReason[];
}

/**
 * Content-safety gate for TMDB writes. The explicit scan intentionally sees
 * every supplied title plus overview, even when another title becomes display.
 */
export function evaluateContentIngestionSafety(input: {
  localizedTitle?: string | null;
  englishTitle?: string | null;
  originalTitle?: string | null;
  overview?: string | null;
  adult?: boolean | null;
}): ContentIngestionSafetyResult {
  const displayTitle = resolveAllowedDisplayTitle(input);
  const reasons: ContentIngestionRejectionReason[] = [];

  if (input.adult === true) reasons.push("ADULT_FLAG");

  const explicitAuditText = [
    input.localizedTitle,
    input.englishTitle,
    input.originalTitle,
    input.overview,
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");

  if (isExplicitAdultContent(explicitAuditText)) {
    reasons.push("EXPLICIT_ADULT_KEYWORD");
  }

  if (!displayTitle) {
    const hasAnyTitle = [input.localizedTitle, input.englishTitle, input.originalTitle].some(
      (value) => typeof value === "string" && value.trim().length > 0
    );
    reasons.push(hasAnyTitle ? "NON_LATIN_DISPLAY_TITLE" : "MISSING_TITLE");
  }

  return { allowed: reasons.length === 0, displayTitle, reasons };
}
