import { NextRequest, NextResponse } from "next/server";
import { logoutUser, USER_SESSION_COOKIE_NAME, LEGACY_ANONYMOUS_COOKIE_NAME } from "@/lib/auth/service";

function createLogoutResponse(redirectUrl?: URL | string) {
  const response = redirectUrl
    ? NextResponse.redirect(redirectUrl)
    : NextResponse.json({ success: true, redirect: "/auth" });

  // Explicitly clear session cookies across all matching scopes
  response.cookies.delete(USER_SESSION_COOKIE_NAME);
  response.cookies.set(USER_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  response.cookies.delete(LEGACY_ANONYMOUS_COOKIE_NAME);
  response.cookies.set(LEGACY_ANONYMOUS_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}

export async function POST(request: NextRequest) {
  try {
    await logoutUser();
  } catch (error) {
    console.error("[Logout POST Error]:", error);
  }
  return createLogoutResponse();
}

export async function GET(request: NextRequest) {
  try {
    await logoutUser();
  } catch (error) {
    console.error("[Logout GET Error]:", error);
  }

  // Reliable absolute redirect target
  const redirectTarget = process.env.NEXT_PUBLIC_APP_URL
    ? new URL("/auth", process.env.NEXT_PUBLIC_APP_URL)
    : new URL("/auth", request.url);

  return createLogoutResponse(redirectTarget);
}
