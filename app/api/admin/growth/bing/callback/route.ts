import { NextResponse } from "next/server";
import { getAdminSession, logAdminAudit } from "@/lib/admin/auth";
import { verifyBingGrowthState, exchangeBingGrowthCode, saveBingGrowthTokens } from "@/lib/growth/bing/oauth";
import { getAppBaseUrl } from "@/lib/growth/urls";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  const baseUrl = getAppBaseUrl();

  if (errorParam) {
    const combinedError = errorDescription ? `${errorParam}: ${errorDescription}` : errorParam;
    return NextResponse.redirect(`${baseUrl}/admin/growth?tab=bing&error_code=${encodeURIComponent(errorParam)}&error=${encodeURIComponent(combinedError)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/admin/growth?tab=bing&error_code=missing_params&error=${encodeURIComponent("Eksik Bing yetkilendirme parametreleri")}`);
  }

  const isValidState = verifyBingGrowthState(state);
  if (!isValidState) {
    return NextResponse.redirect(`${baseUrl}/admin/growth?tab=bing&error_code=invalid_state&error=${encodeURIComponent("Geçersiz veya süresi dolmuş OAuth state")}`);
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
    return NextResponse.redirect(`${baseUrl}/admin/growth?tab=bing&error_code=token_exchange_failed&error=${encodeURIComponent(err?.message || "Bing bağlantısı başarısız oldu")}`);
  }
}
