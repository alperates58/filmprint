import { isExplicitAdultContent } from "@/lib/movies/denylist";
import { isDisplayTitleAllowed } from "./title-safety";

export interface CatalogSafetyAuditRecord {
  displayTitle: string;
  originalTitle?: string | null;
  overview?: string | null;
}

export interface CatalogSafetyAuditCounts {
  total: number;
  nonLatinDisplayTitle: number;
  explicitContentSuspicious: number;
}

/** Read-only, data-source-agnostic helper used by the local catalog audit. */
export function countCatalogSafetyFindings(
  records: CatalogSafetyAuditRecord[]
): CatalogSafetyAuditCounts {
  let nonLatinDisplayTitle = 0;
  let explicitContentSuspicious = 0;

  for (const record of records) {
    if (!isDisplayTitleAllowed(record.displayTitle)) nonLatinDisplayTitle++;

    if (
      isExplicitAdultContent(
        `${record.displayTitle || ""} ${record.originalTitle || ""} ${record.overview || ""}`
      )
    ) {
      explicitContentSuspicious++;
    }
  }

  return { total: records.length, nonLatinDisplayTitle, explicitContentSuspicious };
}
