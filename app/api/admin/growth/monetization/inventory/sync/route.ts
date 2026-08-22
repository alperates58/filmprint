import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAudit } from "@/lib/admin/auth";
import { syncAdSenseInventoryFromApi } from "@/lib/monetization/adsense-api";

export async function POST() {
  try {
    const session = await requireAdminSession();
    const result = await syncAdSenseInventoryFromApi();

    if (!result.success) {
      return NextResponse.json({ error: result.error || "AdSense envanteri senkronize edilemedi." }, { status: 400 });
    }

    await logAdminAudit(session.id, "ADS_INVENTORY_SYNCED", "AdSenseInventoryUnit", undefined, {
      syncedCount: result.syncedCount,
    });

    return NextResponse.json({
      success: true,
      message: `${result.syncedCount} adet AdSense reklam birimi başarıyla senkronize edildi.`,
      syncedCount: result.syncedCount,
      units: result.units,
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[POST /api/admin/growth/monetization/inventory/sync] Error:", error);
    return NextResponse.json({ error: error?.message || "Senkronizasyon sırasında hata oluştu." }, { status: 500 });
  }
}
