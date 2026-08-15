import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAudit } from "@/lib/admin/auth";
import { saveIntegrationSecret } from "@/lib/config/service";

export async function PUT(request: Request) {
  try {
    const admin = await requireAdminSession();
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
      return NextResponse.json({ error: "Geçerli bir Katalog API Anahtarı giriniz." }, { status: 400 });
    }

    await saveIntegrationSecret("tmdb", apiKey.trim());
    await logAdminAudit(admin.id, "TMDB_KEY_UPDATED", "IntegrationSecret", "tmdb", {
      lastFour: apiKey.slice(-4),
    });

    return NextResponse.json({ success: true, message: "Katalog API anahtarı güvenli şekilde kaydedildi." });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Admin TMDB Update Error]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
