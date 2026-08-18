import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAudit } from "@/lib/admin/auth";
import { listGa4AccountSummaries, listGa4DataStreams, selectGa4Property } from "@/lib/growth/google/analytics";

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const url = new URL(request.url);
    const propertyId = url.searchParams.get("propertyId");

    if (propertyId) {
      const streams = await listGa4DataStreams(propertyId);
      return NextResponse.json({ streams });
    }

    const accounts = await listGa4AccountSummaries();
    return NextResponse.json({ accounts });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[GET /api/admin/growth/google/analytics] Error:", error);
    return NextResponse.json({ error: error?.message || "GA4 hesapları alınamadı" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdminSession();
    const body = await request.json();

    const { propertyId, propertyName, measurementId, trackingEnabled } = body;
    if (!propertyId) {
      return NextResponse.json({ error: "Mülk ID zorunludur" }, { status: 400 });
    }

    await selectGa4Property({
      propertyId,
      propertyName: propertyName || propertyId,
      measurementId,
      trackingEnabled,
    });

    await logAdminAudit(
      session.id,
      "GROWTH_GA_PROPERTY_CHANGED",
      "GoogleAnalytics",
      propertyId,
      { propertyName, measurementId, trackingEnabled }
    );

    return NextResponse.json({
      success: true,
      message: "Google Analytics 4 mülk seçimi kaydedildi.",
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || "Kayıt sırasında hata oluştu" }, { status: 500 });
  }
}
