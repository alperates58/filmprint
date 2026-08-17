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

    // Test connection with a minimal prompt on the configured model
    const targetUrl = `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`;

    let response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.modelId,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      }),
    });

    // If chat completions fails with 404/405, fallback to /models endpoint
    if (!response.ok && (response.status === 404 || response.status === 405)) {
      const modelsUrl = `${config.baseUrl.replace(/\/+$/, "")}/models`;
      response = await fetch(modelsUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
      });
    }

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        message: `AI bağlantı hatası (HTTP status ${response.status}). API anahtarınızı, Model ID (${config.modelId}) veya Base URL'i kontrol ediniz.`,
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
