import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { getTMDBApiKey } from "@/lib/config/service";

export async function POST() {
  try {
    await requireAdminSession();

    const apiKey = await getTMDBApiKey();
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: "TMDB API Anahtarı yapılandırılmamış.",
      });
    }

    // Call TMDB authentication endpoint or popular list server-side
    const response = await fetch(
      `https://api.themoviedb.org/3/authentication?api_key=${apiKey}`
    );

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        message: `TMDB Bağlantı hatası (HTTP status ${response.status}). Anahtarınızı kontrol ediniz.`,
      });
    }

    const data = await response.json();
    if (data.success) {
      return NextResponse.json({
        success: true,
        message: "TMDB API bağlantısı başarılı ve aktif!",
      });
    }

    return NextResponse.json({
      success: false,
      message: "TMDB API cevabı başarısız.",
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Admin TMDB Test Error]:", error);
    return NextResponse.json({
      success: false,
      message: "Bağlantı testi sırasında bir hata oluştu.",
    });
  }
}
