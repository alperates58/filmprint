import { NextResponse } from "next/server";
import { logoutAdmin } from "@/lib/admin/auth";

export async function POST() {
  try {
    await logoutAdmin();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Admin Logout Error]:", error);
    return NextResponse.json(
      { error: "Çıkış işlemi sırasında hata oluştu." },
      { status: 500 }
    );
  }
}
