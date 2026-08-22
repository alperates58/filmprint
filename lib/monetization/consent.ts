export type ConsentModeState = "granted" | "denied";

export interface SineaiConsentSettings {
  analyticsStorage: ConsentModeState;
  adStorage: ConsentModeState;
  adUserData: ConsentModeState;
  adPersonalization: ConsentModeState;
  cmpDetected: boolean;
  cmpConfigured: boolean;
}

export const DEFAULT_CONSENT_SETTINGS: SineaiConsentSettings = {
  analyticsStorage: "granted", // Standard privacy-first default unless denied
  adStorage: "denied",        // Strictly denied by default until explicit grant/CMP
  adUserData: "denied",
  adPersonalization: "denied",
  cmpDetected: false,
  cmpConfigured: false,
};

/**
 * Checks if advertising consent has been explicitly granted by the user.
 */
export function hasAdStorageConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const item = localStorage.getItem("sineai_ad_consent");
    return item === "granted";
  } catch {
    return false;
  }
}

/**
 * Updates full consent mode state and informs window.gtag if active.
 */
export function updateConsentState(updates: Partial<SineaiConsentSettings>): void {
  if (typeof window === "undefined") return;
  try {
    if (updates.adStorage) {
      localStorage.setItem("sineai_ad_consent", updates.adStorage);
    }
    if (updates.analyticsStorage) {
      localStorage.setItem("sineai_analytics_consent", updates.analyticsStorage);
    }

    if (typeof (window as any).gtag === "function") {
      (window as any).gtag("consent", "update", {
        analytics_storage: updates.analyticsStorage || "granted",
        ad_storage: updates.adStorage || "denied",
        ad_user_data: updates.adUserData || updates.adStorage || "denied",
        ad_personalization: updates.adPersonalization || updates.adStorage || "denied",
      });
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Checks if IAB TCF CMP runtime is detected on the client.
 */
export function isCmpRuntimeDetected(): boolean {
  if (typeof window === "undefined") return false;
  return typeof (window as any).__tcfapi === "function";
}
