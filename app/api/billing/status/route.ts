import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/service";
import { getUserBillingDetails } from "@/lib/billing/service";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !user.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const details = await getUserBillingDetails(user.id);
    return NextResponse.json({ success: true, ...details });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Faturalandırma bilgileri alınamadı." },
      { status: 500 }
    );
  }
}