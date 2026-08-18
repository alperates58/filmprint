import { SineaiAnalyticsEvent, sanitizeEventParams } from "./events";

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

// In-memory debounce set to prevent duplicate rapid events
const recentEventTimestamps = new Map<string, number>();
const DUPLICATE_WINDOW_MS = 500;

/**
 * Checks if user has explicitly granted analytics consent.
 * Privacy-safe default: returns false when consent state is unknown or not granted.
 */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("sineai_analytics_consent") === "granted";
  } catch {
    return false;
  }
}

/**
 * Updates analytics consent in localStorage and updates gtag consent state if active.
 */
export function setAnalyticsConsent(granted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("sineai_analytics_consent", granted ? "granted" : "denied");
    if (typeof window.gtag === "function") {
      window.gtag("consent", "update", {
        analytics_storage: granted ? "granted" : "denied",
        ad_storage: "denied", // Strictly denied in Phase I-A/I-B
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Dispatches a sanitized analytics event to Google Analytics 4.
 * Operates as a safe no-op if GA is disabled, not consented, or gtag is missing.
 */
export function trackEvent(event: SineaiAnalyticsEvent): void {
  if (typeof window === "undefined") return;

  // Privacy-safe gate: Only dispatch if explicit consent is granted
  if (!hasAnalyticsConsent()) {
    return;
  }

  // Deduplication check
  const eventFingerprint = `${event.name}:${JSON.stringify(event.params)}`;
  const now = Date.now();
  const lastTime = recentEventTimestamps.get(eventFingerprint);

  if (lastTime && now - lastTime < DUPLICATE_WINDOW_MS) {
    return;
  }
  recentEventTimestamps.set(eventFingerprint, now);

  const cleanParams = sanitizeEventParams(event.params as Record<string, any>);

  if (process.env.NODE_ENV === "development") {
    // Development debug logging
    console.debug(`[SineAI Analytics] Event "${event.name}":`, cleanParams);
  }

  if (typeof window.gtag === "function") {
    try {
      window.gtag("event", event.name, cleanParams);
    } catch (e) {
      console.warn("[SineAI Analytics] Failed to emit gtag event:", e);
    }
  }
}
