import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { getDeepSeekConfig } from "@/lib/config/service";

export async function POST() {
  try {
    await requireAdminSession();

    const config = await getDeepSeekConfig();
    if (!config.apiKey) {
      return NextResponse.json({
        success: false,
        message: "AI API Anahtarı yapılandırılmamış.",
      });
    }

    // Call models list endpoint server-side to test key and connection
    const targetUrl = `${config.baseUrl.replace(/\/+$/, "")}/models`;

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        message: `AI bağlantı hatası (HTTP status ${response.status}). API anahtarınızı veya Base URL'i kontrol ediniz.`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `AI sağlayıcı bağlantısı başarılı! Model: ${config.modelId}`,
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Admin AI Test Error]:", error);
    return NextResponse.json({
      success: false,
      message: "AI bağlantı testi sırasında bir hata oluştu.",
    });
  }
}
