import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { getMaskedPaytrConfig, savePaytrConfig } from "@/lib/billing/paytr/client";

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();
    const config = await getMaskedPaytrConfig();
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdminSession();
    const body = await req.json();

    await savePaytrConfig({
      merchantId: body.merchantId,
      merchantKey: body.merchantKey,
      merchantSalt: body.merchantSalt,
      testMode: body.testMode,
      enabled: body.enabled,
      billingEnabled: body.billingEnabled,
      monthlyPrice: typeof body.monthlyPrice === "number" ? body.monthlyPrice : undefined,
      yearlyPrice: typeof body.yearlyPrice === "number" ? body.yearlyPrice : undefined,
      currency: body.currency,
      gracePeriodDays: typeof body.gracePeriodDays === "number" ? body.gracePeriodDays : undefined,
      recurringEnabled: body.recurringEnabled,
      non3dEnabled: body.non3dEnabled,
    });

    const updated = await getMaskedPaytrConfig();
    return NextResponse.json({
      success: true,
      message: "PayTR entegrasyon ayarları başarıyla kaydedildi.",
      config: updated,
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Admin PayTR Save Error]:", error);
    return NextResponse.json({ error: error?.message || "Ayarlar kaydedilemedi." }, { status: 500 });
  }
}