import { NextResponse } from "next/server";
import { getIndexNowConfig } from "@/lib/growth/indexnow/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key: rawKey } = await params;

  if (!rawKey || !rawKey.endsWith(".txt")) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const keyWithoutExt = rawKey.replace(/\.txt$/, "").trim();
  const config = await getIndexNowConfig();

  if (config.enabled && config.key && config.key === keyWithoutExt) {
    return new NextResponse(config.key, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  }

  return new NextResponse("Not Found", { status: 404 });
}
