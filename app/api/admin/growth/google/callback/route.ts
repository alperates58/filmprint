import { NextResponse } from "next/server";
import { getAdminSession, logAdminAudit } from "@/lib/admin/auth";
import { verifyGoogleGrowthState, exchangeGoogleGrowthCode, saveGoogleGrowthTokens } from "@/lib/growth/google/oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sineai.com.tr").replace(/\/+$/, "");

  if (errorParam) {
    return NextResponse.redirect(`${baseUrl}/admin/growth?tab=google&error=${encodeURIComponent(errorParam)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/admin/growth?tab=google&error=${encodeURIComponent("Eksik yetkilendirme parametreleri")}`);
  }

  // 1. Verify OAuth State Signature & TTL
  const isValidState = verifyGoogleGrowthState(state);
  if (!isValidState) {
    return NextResponse.redirect(`${baseUrl}/admin/growth?tab=google&error=${encodeURIComponent("Geçersiz veya süresi dolmuş OAuth state doğrulaması")}`);
  }

  // 2. Validate current admin session
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.redirect(`${baseUrl}/admin/login?redirect=/admin/growth`);
  }

  try {
    // 3. Exchange code for tokens
    const tokenResult = await exchangeGoogleGrowthCode(code);

    // 4. Save encrypted tokens in IntegrationSecret
    await saveGoogleGrowthTokens({
      refreshToken: tokenResult.refreshToken,
      email: tokenResult.email,
    });

    // 5. Audit Log
    await logAdminAudit(
      adminSession.id,
      "GROWTH_GOOGLE_CONNECTED",
      "IntegrationSecret",
      "google_growth",
      { email: tokenResult.email }
    );

    return NextResponse.redirect(`${baseUrl}/admin/growth?tab=google&status=connected`);
  } catch (err: any) {
    console.error("[GoogleGrowth Callback Error]:", err);
    return NextResponse.redirect(`${baseUrl}/admin/growth?tab=google&error=${encodeURIComponent(err?.message || "Google bağlantısı başarısız oldu")}`);
  }
}
