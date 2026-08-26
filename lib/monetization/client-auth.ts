/**
 * Safe client-side authentication status detector.
 * Complies with HttpOnly session cookie architecture without reading raw cookies or exposing secrets.
 */

let cachedAuthStatus: boolean | null = null;
let cachedIsPremium: boolean | null = null;
let cachedIsAdFree: boolean | null = null;
let lastCheckTime = 0;
let inflightPromise: Promise<{ isAuthenticated: boolean; isPremium: boolean; isAdFree: boolean }> | null = null;

export async function checkClientAuthAndEntitlement(): Promise<{ isAuthenticated: boolean; isPremium: boolean; isAdFree: boolean }> {
  if (typeof window === "undefined") return { isAuthenticated: false, isPremium: false, isAdFree: false };

  const now = Date.now();
  if (cachedAuthStatus !== null && now - lastCheckTime < 30000) {
    return {
      isAuthenticated: cachedAuthStatus,
      isPremium: Boolean(cachedIsPremium),
      isAdFree: Boolean(cachedIsAdFree),
    };
  }

  if (inflightPromise) {
    return inflightPromise;
  }

  inflightPromise = fetch("/api/auth/me")
    .then((res) => (res.ok ? res.json() : { user: null }))
    .then((data) => {
      const isAuth = Boolean(data?.user?.isAuthenticated || data?.user?.id);
      const isPrem = Boolean(data?.entitlement?.isPremium);
      const isAdFree = Boolean(data?.entitlement?.isAdFree || data?.entitlement?.features?.AD_FREE);
      cachedAuthStatus = isAuth;
      cachedIsPremium = isPrem;
      cachedIsAdFree = isAdFree;
      lastCheckTime = Date.now();
      inflightPromise = null;
      return { isAuthenticated: isAuth, isPremium: isPrem, isAdFree };
    })
    .catch(() => {
      inflightPromise = null;
      return { isAuthenticated: false, isPremium: false, isAdFree: false };
    });

  return inflightPromise;
}

export async function checkIsAuthenticatedClient(): Promise<boolean> {
  const res = await checkClientAuthAndEntitlement();
  return res.isAuthenticated;
}

export async function checkIsPremiumClient(): Promise<boolean> {
  const res = await checkClientAuthAndEntitlement();
  return res.isPremium;
}

export async function checkIsAdFreeClient(): Promise<boolean> {
  const res = await checkClientAuthAndEntitlement();
  return res.isAdFree;
}

export function getCachedIsAuthenticatedClient(): boolean {
  return Boolean(cachedAuthStatus);
}

/**
 * Manually set or invalidate client auth cache (e.g. on login/logout)
 */
export function setCachedAuthStatus(isAuth: boolean | null): void {
  cachedAuthStatus = isAuth;
  cachedIsPremium = null;
  cachedIsAdFree = null;
  lastCheckTime = isAuth !== null ? Date.now() : 0;
}
