import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/security/crypto";
import { linkIdentityToAccount } from "@/lib/auth/migration";
import { LEGACY_ANONYMOUS_COOKIE_NAME } from "@/lib/auth/service";
import { db } from "@/lib/db/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, confirmPassword } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Lütfen adınızı girin." }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Geçerli bir e-posta adresi girin." }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Parola en az 6 karakter olmalıdır." }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Parolalar eşleşmiyor." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if registered user already exists
    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing && existing.accountType === "REGISTERED") {
      return NextResponse.json(
        { error: "Bu e-posta adresi ile zaten bir hesap oluşturulmuş." },
        { status: 400 }
      );
    }

    const passwordHash = hashPassword(password);
    const anonymousUserId = request.cookies.get(LEGACY_ANONYMOUS_COOKIE_NAME)?.value;

    const result = await linkIdentityToAccount({
      anonymousUserId,
      email: normalizedEmail,
      name: name.trim(),
      passwordHash,
      provider: "EMAIL",
    });

    return NextResponse.json({ success: true, userId: result.userId });
  } catch (err: any) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Kayıt işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}
