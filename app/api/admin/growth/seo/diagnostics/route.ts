import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { runSeoDiagnostics } from "@/lib/growth/seo/diagnostics";

export async function POST() {
  try {
    await requireAdminSession();
    const report = await runSeoDiagnostics();
    return NextResponse.json(report);
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[POST /api/admin/growth/seo/diagnostics] Error:", error);
    return NextResponse.json({ error: "SEO Teşhisi çalıştırılırken hata oluştu" }, { status: 500 });
  }
}
