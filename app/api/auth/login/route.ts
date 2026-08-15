import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { verifyPassword } from "@/lib/security/crypto";
import { createUserSession, USER_SESSION_COOKIE_NAME, LEGACY_ANONYMOUS_COOKIE_NAME } from "@/lib/auth/service";
import { mergeAnonymousUserIntoAccount } from "@/lib/auth/migration";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "E-posta veya parola hatalı." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "E-posta veya parola hatalı." }, { status: 400 });
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "E-posta veya parola hatalı." }, { status: 400 });
    }

    // Check if current session has anonymous user data to merge
    const anonymousUserId = request.cookies.get(LEGACY_ANONYMOUS_COOKIE_NAME)?.value;
    if (anonymousUserId && anonymousUserId !== user.id) {
      await mergeAnonymousUserIntoAccount(anonymousUserId, user.id);
    }

    const sessionToken = await createUserSession(user.id);

    const response = NextResponse.json({ success: true, userId: user.id });
    response.cookies.delete(LEGACY_ANONYMOUS_COOKIE_NAME);
    response.cookies.set(USER_SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "E-posta veya parola hatalı." }, { status: 400 });
  }
}
