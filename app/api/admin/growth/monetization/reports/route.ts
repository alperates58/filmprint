import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { getAdSensePerformanceReports } from "@/lib/monetization/adsense-api";

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get("period") || "7d";
    const validPeriod = ["today", "yesterday", "7d", "28d"].includes(periodParam)
      ? (periodParam as "today" | "yesterday" | "7d" | "28d")
      : "7d";

    const report = await getAdSensePerformanceReports(validPeriod);
    return NextResponse.json(report);
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[GET /api/admin/growth/monetization/reports] Error:", error);
    return NextResponse.json({ error: "Rapor verileri alınamadı." }, { status: 500 });
  }
}
