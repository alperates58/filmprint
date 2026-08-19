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
      return NextResponse.json({ streams, status: "READY" });
    }

    const result = await listGa4AccountSummaries();
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[GET /api/admin/growth/google/analytics] Error:", error);
    return NextResponse.json(
      {
        accounts: [],
        status: "ERROR",
        error: error?.message || "GA4 hesapları alınamadı",
      },
      { status: 200 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdminSession();
    const body = await request.json();

    // Canonical DTO with legacy fallback
    const propertyId = body.propertyId || body.gaPropertyId;
    const propertyName = body.propertyName || body.gaPropertyName || propertyId;
    const measurementId = body.measurementId;
    const trackingEnabled =
      body.trackingEnabled !== undefined
        ? body.trackingEnabled
        : body.enabled !== undefined
        ? body.enabled
        : true;

    if (!propertyId && !measurementId && trackingEnabled === undefined) {
      return NextResponse.json({ error: "En az bir ayar (mülk ID, measurement ID veya izleme durumu) belirtilmelidir" }, { status: 400 });
    }

    await selectGa4Property({
      propertyId: propertyId || undefined,
      propertyName: propertyName || undefined,
      measurementId: measurementId !== undefined ? measurementId : undefined,
      trackingEnabled,
    });

    await logAdminAudit(
      session.id,
      "GROWTH_GA_PROPERTY_CHANGED",
      "GoogleAnalytics",
      propertyId || measurementId || "settings",
      { propertyName, measurementId, trackingEnabled }
    );

    return NextResponse.json({
      success: true,
      message: "Google Analytics 4 ayarları kaydedildi.",
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || "Kayıt sırasında hata oluştu" }, { status: 500 });
  }
}
