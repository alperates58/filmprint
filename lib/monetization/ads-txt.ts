export interface AdsTxtHealth {
  status: "HEALTHY" | "MISSING" | "MISMATCH" | "NOT_CONFIGURED";
  publisherId: string | null;
  expectedLine: string | null;
  currentContent: string;
  hasDirectLine: boolean;
  message: string;
}

export const GOOGLE_ADS_TXT_CERT_AUTHORITY_ID = "f08c47fec0942fa0";

/**
 * Normalizes publisher ID to standard 'pub-XXXXXXXXXXXXXXXX' format.
 * Strips any accidental 'ca-pub-' or whitespace.
 */
export function normalizePublisherId(raw?: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const clean = raw.trim().replace(/^ca-pub-/, "pub-");
  if (!clean.startsWith("pub-")) {
    const digitsOnly = clean.replace(/\D/g, "");
    if (!digitsOnly) return null;
    return `pub-${digitsOnly}`;
  }
  return clean;
}

/**
 * Normalizes ad client ID to standard 'ca-pub-XXXXXXXXXXXXXXXX' format.
 */
export function normalizeAdClientId(raw?: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const clean = raw.trim().replace(/^pub-/, "ca-pub-");
  if (!clean.startsWith("ca-pub-")) {
    const digitsOnly = clean.replace(/\D/g, "");
    if (!digitsOnly) return null;
    return `ca-pub-${digitsOnly}`;
  }
  return clean;
}

/**
 * Generates the canonical Google AdSense direct ads.txt line.
 * Strictly guarantees pub- format and never outputs ca-pub-.
 */
export function generateGoogleAdsTxtLine(publisherIdRaw?: string | null): string | null {
  const pubId = normalizePublisherId(publisherIdRaw);
  if (!pubId) return null;
  return `google.com, ${pubId}, DIRECT, ${GOOGLE_ADS_TXT_CERT_AUTHORITY_ID}`;
}

/**
 * Validates ads.txt health and consistency against publisher ID.
 */
export function evaluateAdsTxtHealth(
  publisherIdRaw?: string | null,
  customAdsTxt?: string | null
): AdsTxtHealth {
  const pubId = normalizePublisherId(publisherIdRaw);
  const expectedLine = pubId ? generateGoogleAdsTxtLine(pubId) : null;

  if (!pubId) {
    return {
      status: "NOT_CONFIGURED",
      publisherId: null,
      expectedLine: null,
      currentContent: customAdsTxt || "",
      hasDirectLine: false,
      message: "AdSense Publisher ID henüz tanımlanmamış.",
    };
  }

  const effectiveContent = customAdsTxt?.trim() || (expectedLine ? `${expectedLine}\n` : "");

  if (!effectiveContent) {
    return {
      status: "MISSING",
      publisherId: pubId,
      expectedLine,
      currentContent: "",
      hasDirectLine: false,
      message: "ads.txt içeriği boş.",
    };
  }

  // Reject ca-pub- in ads.txt
  if (effectiveContent.includes("ca-pub-")) {
    return {
      status: "MISMATCH",
      publisherId: pubId,
      expectedLine,
      currentContent: effectiveContent,
      hasDirectLine: false,
      message: "ads.txt içinde 'ca-pub-' kullanılamaz. Google ads.txt standardı 'pub-' gerektirir.",
    };
  }

  const lines = effectiveContent
    .split("\n")
    .map((l) => l.trim().toLowerCase())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  const targetLineLower = expectedLine?.toLowerCase() || "";
  const hasDirectLine = lines.some((l) => l.includes("google.com") && l.includes(pubId.toLowerCase()) && l.includes("direct"));

  if (!hasDirectLine) {
    return {
      status: "MISMATCH",
      publisherId: pubId,
      expectedLine,
      currentContent: effectiveContent,
      hasDirectLine: false,
      message: `ads.txt içinde ${pubId} için geçerli DIRECT kaydı bulunamadı.`,
    };
  }

  return {
    status: "HEALTHY",
    publisherId: pubId,
    expectedLine,
    currentContent: effectiveContent,
    hasDirectLine: true,
    message: "ads.txt sağlıklı ve AdSense Publisher ID ile tam uyumlu.",
  };
}
