import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAudit } from "@/lib/admin/auth";
import {
  getIndexNowConfig,
  rotateIndexNowKey,
  setIndexNowCustomKey,
  setIndexNowEnabled,
  submitUrlsToIndexNow,
  processPendingIndexNowJobs,
} from "@/lib/growth/indexnow/service";

export async function GET() {
  try {
    await requireAdminSession();
    const config = await getIndexNowConfig();
    return NextResponse.json(config);
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    return NextResponse.json({ error: "IndexNow durumu alınamadı" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdminSession();
    const body = await request.json();

    if (body.action === "ROTATE_KEY") {
      const updated = await rotateIndexNowKey();

      await logAdminAudit(
        session.id,
        "INDEXNOW_KEY_ROTATED",
        "IntegrationSecret",
        "indexnow",
        { keyLocation: updated.keyLocation }
      );

      return NextResponse.json({
        success: true,
        message: "IndexNow anahtarı başarıyla yenilendi.",
        config: updated,
      });
    }

    if (body.action === "SET_CUSTOM_KEY") {
      const updated = await setIndexNowCustomKey(body.key);

      await logAdminAudit(
        session.id,
        "INDEXNOW_CUSTOM_KEY_SET",
        "IntegrationSecret",
        "indexnow",
        { keyLocation: updated.keyLocation }
      );

      return NextResponse.json({
        success: true,
        message: "IndexNow özel anahtarı başarıyla kaydedildi.",
        config: updated,
      });
    }

    if (body.action === "TOGGLE_ENABLED") {
      const enabled = Boolean(body.enabled);
      await setIndexNowEnabled(enabled);

      await logAdminAudit(
        session.id,
        "INDEXNOW_STATUS_TOGGLED",
        "IntegrationSecret",
        "indexnow",
        { enabled }
      );

      const updated = await getIndexNowConfig();
      return NextResponse.json({
        success: true,
        message: `IndexNow ${enabled ? "etkinleştirildi" : "devre dışı bırakıldı"}.`,
        config: updated,
      });
    }

    if (body.action === "PROCESS_QUEUE") {
      const result = await processPendingIndexNowJobs();
      const updated = await getIndexNowConfig();
      return NextResponse.json({
        success: true,
        message: `Kuyruktaki ${result.processed} URL işlendi (${result.succeeded} başarılı, ${result.failed} başarısız).`,
        result,
        config: updated,
      });
    }

    if (body.action === "TEST_PING") {
      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sineai.com.tr").replace(/\/+$/, "");
      const testUrls = [
        `${baseUrl}/`,
        `${baseUrl}/how-it-works`,
      ];

      const result = await submitUrlsToIndexNow(testUrls);

      await logAdminAudit(
        session.id,
        "INDEXNOW_TEST_PING",
        "IntegrationSecret",
        "indexnow",
        result
      );

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || "İşlem sırasında hata oluştu" }, { status: 500 });
  }
}
