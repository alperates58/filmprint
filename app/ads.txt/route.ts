import { NextResponse } from "next/server";
import { getAdSenseSettings } from "@/lib/growth/credentials";

export async function GET() {
  const settings = await getAdSenseSettings();
  
  let content = settings.adsTxt?.trim();
  if (!content && settings.publisherId) {
    const cleanPub = settings.publisherId.replace(/^pub-/, "");
    content = `google.com, pub-${cleanPub}, DIRECT, f08c47fec0942fa0\n`;
  }

  if (!content) {
    return new NextResponse("# ads.txt pending configuration in Admin Panel\n", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  }

  return new NextResponse(content + "\n", {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
