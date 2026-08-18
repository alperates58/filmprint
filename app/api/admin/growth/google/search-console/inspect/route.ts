import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { inspectUrlInSearchConsole } from "@/lib/growth/google/search-console";

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const body = await request.json();

    const { siteUrl, inspectionUrl } = body;
    if (!siteUrl || !inspectionUrl) {
      return NextResponse.json({ error: "Site URL ve Denetlenecek URL zorunludur" }, { status: 400 });
    }

    const result = await inspectUrlInSearchConsole(siteUrl, inspectionUrl);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[POST /api/admin/growth/google/search-console/inspect] Error:", error);
    return NextResponse.json({ error: error?.message || "URL denetimi sırasında hata oluştu" }, { status: 500 });
  }
}
