import { NextResponse } from "next/server";
import { getAdminSession, logAdminAudit } from "@/lib/admin/auth";
import { verifyBingGrowthState, exchangeBingGrowthCode, saveBingGrowthTokens } from "@/lib/growth/bing/oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sineai.com.tr").replace(/\/+$/, "");

  if (errorParam) {
    return NextResponse.redirect(`${baseUrl}/admin/growth?tab=bing&error=${encodeURIComponent(errorParam)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/admin/growth?tab=bing&error=${encodeURIComponent("Eksik Bing yetkilendirme parametreleri")}`);
  }

  const isValidState = verifyBingGrowthState(state);
  if (!isValidState) {
    return NextResponse.redirect(`${baseUrl}/admin/growth?tab=bing&error=${encodeURIComponent("Geçersiz veya süresi dolmuş OAuth state")}`);
  }

  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.redirect(`${baseUrl}/admin/login?redirect=/admin/growth`);
  }

  try {
    const tokenResult = await exchangeBingGrowthCode(code);

    await saveBingGrowthTokens({
      refreshToken: tokenResult.refreshToken,
    });

    await logAdminAudit(
      adminSession.id,
      "GROWTH_BING_CONNECTED",
      "IntegrationSecret",
      "bing_webmaster"
    );

    return NextResponse.redirect(`${baseUrl}/admin/growth?tab=bing&status=connected`);
  } catch (err: any) {
    console.error("[BingGrowth Callback Error]:", err);
    return NextResponse.redirect(`${baseUrl}/admin/growth?tab=bing&error=${encodeURIComponent(err?.message || "Bing bağlantısı başarısız oldu")}`);
  }
}
