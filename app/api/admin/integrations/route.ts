import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { getIntegrationStatus } from "@/lib/config/service";
import { getMaskedPaytrConfig } from "@/lib/billing/paytr/client";

export async function GET() {
  try {
    await requireAdminSession();

    const [tmdb, deepseek, paytr] = await Promise.all([
      getIntegrationStatus("tmdb"),
      getIntegrationStatus("deepseek"),
      getMaskedPaytrConfig(),
    ]);

    return NextResponse.json({
      integrations: {
        tmdb,
        deepseek,
        paytr,
      },
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Admin Integrations Error]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
