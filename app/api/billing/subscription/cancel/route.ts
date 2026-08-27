import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/service";
import { cancelSubscriptionAtPeriodEnd } from "@/lib/billing/service";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !user.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cancelled = await cancelSubscriptionAtPeriodEnd(user.id);
    if (!cancelled) {
      return NextResponse.json(
        { error: "Aktif bir abonelik bulunamadı veya zaten iptal edilmiş." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Aboneliğiniz mevcut dönem sonunda yenilenmeyecek şekilde planlandı. Haklarınız dönem sonuna kadar geçerlidir.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "İptal işlemi sırasında hata oluştu." }, { status: 500 });
  }
}