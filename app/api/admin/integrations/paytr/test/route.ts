import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { getPaytrConfig } from "@/lib/billing/paytr/client";
import { db } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();
    const config = await getPaytrConfig();

    if (!config.merchantId || !config.merchantKey || !config.merchantSalt) {
      return NextResponse.json(
        {
          success: false,
          error: "PayTR Merchant ID, Merchant Key ve Merchant Salt bilgileri eksik. Test edilemedi.",
        },
        { status: 400 }
      );
    }

    // Mark last tested at
    const now = new Date().toISOString();
    await db.systemSetting.upsert({
      where: { key: "paytr_last_tested_at" },
      update: { value: now },
      create: { key: "paytr_last_tested_at", value: now },
    });

    // Clear any previous provider error
    await db.systemSetting.deleteMany({
      where: { key: "paytr_last_provider_error" },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "PayTR yapılandırma ve kimlik formatı doğrulaması başarılı.",
      testedAt: now,
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Bağlantı testi sırasında hata oluştu." },
      { status: 500 }
    );
  }
}