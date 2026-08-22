import { NextResponse } from "next/server";
import { getPublicMonetizationConfig } from "@/lib/monetization/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getPublicMonetizationConfig();
    return NextResponse.json(config, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch {
    return NextResponse.json({
      master: false,
      publisherId: null,
      adClientId: null,
      placements: {},
      maxAdsPerPage: 2,
      adminPreviewMode: false,
      cmpConfigured: false,
      readiness: false,
    });
  }
}
