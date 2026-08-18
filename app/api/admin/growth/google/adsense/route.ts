import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { getAdSenseHealth } from "@/lib/growth/google/adsense";

export async function GET() {
  try {
    await requireAdminSession();
    const health = await getAdSenseHealth();
    return NextResponse.json(health);
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[GET /api/admin/growth/google/adsense] Error:", error);
    return NextResponse.json({ error: error?.message || "AdSense verileri alınamadı" }, { status: 500 });
  }
}
