import { NextResponse } from "next/server";
import { buildGoogleAuthUrl, getGoogleConfig } from "@/lib/auth/google";

export async function GET() {
  const config = getGoogleConfig();

  if (!config.isConfigured) {
    return NextResponse.json(
      { error: "Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are not configured." },
      { status: 500 }
    );
  }

  const state = crypto.randomUUID();
  const authUrl = buildGoogleAuthUrl(state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("filmprint_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });

  return response;
}
