import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  const authSessionToken = request.cookies.get("filmprint_user_session")?.value;
  const legacySessionId = request.cookies.get("filmprint_session")?.value;

  const isAuthPage = pathname.startsWith("/auth");
  const isApiRoute = pathname.startsWith("/api");
  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminApiRoute = pathname.startsWith("/api/admin") && !pathname.startsWith("/api/admin/auth");

  // 1. Admin Route Protection
  if (isAdminRoute || isAdminApiRoute) {
    const adminToken = request.cookies.get("filmprint_admin_session")?.value;

    if (!adminToken) {
      if (isAdminApiRoute) {
        return NextResponse.json({ error: "Unauthorized admin access" }, { status: 401 });
      }
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Client Application Auth Redirects (First Visit Protection)
  // If user visits /auth while already logged in as a registered user, redirect to /
  if (isAuthPage && authSessionToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If user visits protected app routes (e.g. /, /profile, /recommendations, /watch-later, /night)
  // without any session cookie (neither auth session nor legacy anonymous session), redirect to /auth
  const isPublicAsset = pathname.startsWith("/_next") || pathname.includes(".");
  if (!isAuthPage && !isApiRoute && !isAdminRoute && !isPublicAsset) {
    if (!authSessionToken && !legacySessionId) {
      const authUrl = new URL("/auth", request.url);
      return NextResponse.redirect(authUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files, _next, favicon.ico, images.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
