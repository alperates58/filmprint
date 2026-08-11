import { NextResponse } from "next/server";
import { loginAdmin, ADMIN_COOKIE_NAME } from "@/lib/admin/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-posta ve parola zorunludur." },
        { status: 400 }
      );
    }

    const result = await loginAdmin(email, password);

    if (!result.success || !result.token) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    console.error("[Admin Login Error]:", error);
    return NextResponse.json(
      { error: "Giriş işlemi sırasında hata oluştu." },
      { status: 500 }
    );
  }
}
