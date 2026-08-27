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

    let monthlyPrice: number | null | undefined = undefined;
    if (body.monthlyPrice !== undefined) {
      if (body.monthlyPrice === null || body.monthlyPrice === "") {
        monthlyPrice = null;
      } else {
        const val = typeof body.monthlyPrice === "number" ? body.monthlyPrice : parseFloat(body.monthlyPrice);
        if (isNaN(val) || val <= 0) {
          return NextResponse.json({ error: "Aylık fiyat 0'dan büyük olmalıdır veya boş bırakılmalıdır." }, { status: 400 });
        }
        monthlyPrice = val;
      }
    }

    let yearlyPrice: number | null | undefined = undefined;
    if (body.yearlyPrice !== undefined) {
      if (body.yearlyPrice === null || body.yearlyPrice === "") {
        yearlyPrice = null;
      } else {
        const val = typeof body.yearlyPrice === "number" ? body.yearlyPrice : parseFloat(body.yearlyPrice);
        if (isNaN(val) || val <= 0) {
          return NextResponse.json({ error: "Yıllık fiyat 0'dan büyük olmalıdır veya boş bırakılmalıdır." }, { status: 400 });
        }
        yearlyPrice = val;
      }
    }

    await savePaytrConfig({
      merchantId: body.merchantId,
      merchantKey: body.merchantKey,
      merchantSalt: body.merchantSalt,
      testMode: body.testMode,
      enabled: body.enabled,
      billingEnabled: body.billingEnabled,
      monthlyPrice,
      yearlyPrice,
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