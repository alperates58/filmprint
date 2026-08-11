import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  // 1. Anonymous User Session Management (for client-facing application)
  const sessionCookieName = "filmprint_session";
  let sessionId = request.cookies.get(sessionCookieName)?.value;

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    response.cookies.set(sessionCookieName, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year persistent session
    });
  }

  // 2. Admin Route Protection
  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminApiRoute = pathname.startsWith("/api/admin") && !pathname.startsWith("/api/admin/auth");

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

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files, _next, favicon.ico, etc.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
