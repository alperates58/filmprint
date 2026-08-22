/**
 * Safe client-side authentication status detector.
 * Complies with HttpOnly session cookie architecture without reading raw cookies or exposing secrets.
 */

let cachedAuthStatus: boolean | null = null;
let lastCheckTime = 0;
let inflightPromise: Promise<boolean> | null = null;

export async function checkIsAuthenticatedClient(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const now = Date.now();
  if (cachedAuthStatus !== null && now - lastCheckTime < 30000) {
    return cachedAuthStatus;
  }

  if (inflightPromise) {
    return inflightPromise;
  }

  inflightPromise = fetch("/api/auth/me")
    .then((res) => (res.ok ? res.json() : { user: null }))
    .then((data) => {
      const isAuth = Boolean(data?.user?.isAuthenticated || data?.user?.id);
      cachedAuthStatus = isAuth;
      lastCheckTime = Date.now();
      inflightPromise = null;
      return isAuth;
    })
    .catch(() => {
      inflightPromise = null;
      return false;
    });

  return inflightPromise;
}

export function getCachedIsAuthenticatedClient(): boolean {
  return Boolean(cachedAuthStatus);
}

/**
 * Manually set or invalidate client auth cache (e.g. on login/logout)
 */
export function setCachedAuthStatus(isAuth: boolean | null): void {
  cachedAuthStatus = isAuth;
  lastCheckTime = isAuth !== null ? Date.now() : 0;
}
