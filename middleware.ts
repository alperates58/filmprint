import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const authSessionToken = request.cookies.get("filmprint_user_session")?.value;

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
    return NextResponse.next();
  }

  // 2. Public API routes exemption
  const isPublicApiRoute =
    pathname.startsWith("/api/auth") ||
    pathname === "/api/health" ||
    pathname.startsWith("/api/admin");

  if (isApiRoute) {
    if (!isPublicApiRoute && !authSessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 3. Public static assets exemption
  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico";

  if (isPublicAsset) {
    return NextResponse.next();
  }

  // 4. Logged-in user visiting /auth -> Redirect to /
  if (isAuthPage) {
    if (authSessionToken) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // 5. Unauthenticated user visiting protected UI routes -> Redirect to /auth
  if (!authSessionToken) {
    const authUrl = new URL("/auth", request.url);
    if (pathname !== "/") {
      authUrl.searchParams.set("returnTo", pathname);
    }
    return NextResponse.redirect(authUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
