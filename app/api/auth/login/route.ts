import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { verifyPassword } from "@/lib/security/crypto";
import { createUserSession, LEGACY_ANONYMOUS_COOKIE_NAME } from "@/lib/auth/service";
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

    await createUserSession(user.id);

    return NextResponse.json({ success: true, userId: user.id });
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "E-posta veya parola hatalı." }, { status: 400 });
  }
}
