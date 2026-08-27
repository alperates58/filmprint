import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/service";
import { createBillingCheckout } from "@/lib/billing/service";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !user.isAuthenticated) {
      return NextResponse.json(
        { error: "UNAUTHORIZED: Lütfen önce giriş yapın." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const interval = body.interval === "YEARLY" ? "YEARLY" : "MONTHLY";

    const forwardedFor = req.headers.get("x-forwarded-for");
    const userIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

    const result = await createBillingCheckout({
      userId: user.id,
      interval,
      userIp,
    });

    if (result.status === "failed") {
      return NextResponse.json(
        { error: result.reason || "Ödeme oturumu başlatılamadı." },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: result.checkoutUrl,
      merchantOid: result.merchantOid,
      token: result.token,
    });
  } catch (error: any) {
    const msg = error?.message || "Ödeme başlatma sırasında hata oluştu.";
    const status = msg.includes("BILLING_NOT_READY") || msg.includes("PRICING_NOT_CONFIGURED") ? 503 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}