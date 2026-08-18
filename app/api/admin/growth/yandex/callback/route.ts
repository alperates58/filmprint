import { NextResponse } from "next/server";
import { getAdminSession, logAdminAudit } from "@/lib/admin/auth";
import { verifyYandexGrowthState, exchangeYandexGrowthCode, saveYandexGrowthTokens } from "@/lib/growth/yandex/oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sineai.com.tr").replace(/\/+$/, "");

  if (errorParam) {
    return NextResponse.redirect(`${baseUrl}/admin/growth?tab=yandex&error=${encodeURIComponent(errorParam)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/admin/growth?tab=yandex&error=${encodeURIComponent("Eksik Yandex yetkilendirme parametreleri")}`);
  }

  const isValidState = verifyYandexGrowthState(state);
  if (!isValidState) {
    return NextResponse.redirect(`${baseUrl}/admin/growth?tab=yandex&error=${encodeURIComponent("Geçersiz veya süresi dolmuş OAuth state")}`);
  }

  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.redirect(`${baseUrl}/admin/login?redirect=/admin/growth`);
  }

  try {
    const tokenResult = await exchangeYandexGrowthCode(code);

    await saveYandexGrowthTokens({
      refreshToken: tokenResult.refreshToken,
    });

    await logAdminAudit(
      adminSession.id,
      "GROWTH_YANDEX_CONNECTED",
      "IntegrationSecret",
      "yandex_webmaster"
    );

    return NextResponse.redirect(`${baseUrl}/admin/growth?tab=yandex&status=connected`);
  } catch (err: any) {
    console.error("[YandexGrowth Callback Error]:", err);
    return NextResponse.redirect(`${baseUrl}/admin/growth?tab=yandex&error=${encodeURIComponent(err?.message || "Yandex bağlantısı başarısız oldu")}`);
  }
}
