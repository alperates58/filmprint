import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, getGoogleUserInfo } from "@/lib/auth/google";
import { linkIdentityToAccount } from "@/lib/auth/migration";
import { USER_SESSION_COOKIE_NAME, LEGACY_ANONYMOUS_COOKIE_NAME } from "@/lib/auth/service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  if (error) {
    return NextResponse.redirect(`${baseUrl}/auth?error=${encodeURIComponent("Google girişi iptal edildi.")}`);
  }

  const storedState = request.cookies.get("filmprint_oauth_state")?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(`${baseUrl}/auth?error=${encodeURIComponent("Güvenlik doğrulaması başarısız oldu (state mismatch).")}`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/auth?error=${encodeURIComponent("Yetkilendirme kodu bulunamadı.")}`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const googleUser = await getGoogleUserInfo(tokens.access_token);

    if (!googleUser.email || !googleUser.email_verified) {
      return NextResponse.redirect(`${baseUrl}/auth?error=${encodeURIComponent("Doğrulanmış e-posta adresi gereklidir.")}`);
    }

    // Get current anonymous session ID if present
    const anonymousUserId = request.cookies.get(LEGACY_ANONYMOUS_COOKIE_NAME)?.value;

    const result = await linkIdentityToAccount({
      anonymousUserId,
      email: googleUser.email,
      name: googleUser.name,
      image: googleUser.picture,
      provider: "GOOGLE",
    });

    const response = NextResponse.redirect(`${baseUrl}/`);
    response.cookies.delete("filmprint_oauth_state");
    response.cookies.delete(LEGACY_ANONYMOUS_COOKIE_NAME);
    response.cookies.set(USER_SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(
      `${baseUrl}/auth?error=${encodeURIComponent(err.message || "Google ile giriş sırasında bir hata oluştu.")}`
    );
  }
}

