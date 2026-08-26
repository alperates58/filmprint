/**
 * Safe client-side authentication status detector.
 * Complies with HttpOnly session cookie architecture without reading raw cookies or exposing secrets.
 */

let cachedAuthStatus: boolean | null = null;
let cachedIsPremium: boolean | null = null;
let lastCheckTime = 0;
let inflightPromise: Promise<{ isAuthenticated: boolean; isPremium: boolean }> | null = null;

export async function checkClientAuthAndEntitlement(): Promise<{ isAuthenticated: boolean; isPremium: boolean }> {
  if (typeof window === "undefined") return { isAuthenticated: false, isPremium: false };

  const now = Date.now();
  if (cachedAuthStatus !== null && now - lastCheckTime < 30000) {
    return {
      isAuthenticated: cachedAuthStatus,
      isPremium: Boolean(cachedIsPremium),
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
      cachedAuthStatus = isAuth;
      cachedIsPremium = isPrem;
      lastCheckTime = Date.now();
      inflightPromise = null;
      return { isAuthenticated: isAuth, isPremium: isPrem };
    })
    .catch(() => {
      inflightPromise = null;
      return { isAuthenticated: false, isPremium: false };
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

export function getCachedIsAuthenticatedClient(): boolean {
  return Boolean(cachedAuthStatus);
}

/**
 * Manually set or invalidate client auth cache (e.g. on login/logout)
 */
export function setCachedAuthStatus(isAuth: boolean | null): void {
  cachedAuthStatus = isAuth;
  cachedIsPremium = null;
  lastCheckTime = isAuth !== null ? Date.now() : 0;
}
