import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { getAdSensePolicyCenter } from "@/lib/monetization/adsense-api";

export async function GET() {
  try {
    await requireAdminSession();
    const policy = await getAdSensePolicyCenter();
    return NextResponse.json(policy);
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[GET /api/admin/growth/monetization/policy] Error:", error);
    return NextResponse.json({ error: "Policy Center verileri alınamadı." }, { status: 500 });
  }
}
