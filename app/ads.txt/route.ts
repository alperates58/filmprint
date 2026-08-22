import { NextResponse } from "next/server";
import { getOrCreateMonetizationSetting } from "@/lib/monetization/service";
import { generateGoogleAdsTxtLine, normalizePublisherId } from "@/lib/monetization/ads-txt";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const setting = await getOrCreateMonetizationSetting();
    const pubId = normalizePublisherId(setting?.publisherId);
    
    let content = setting?.adsTxtCustom?.trim();
    if (!content && pubId) {
      const generatedLine = generateGoogleAdsTxtLine(pubId);
      if (generatedLine) {
        content = `${generatedLine}\n`;
      }
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

    // Ensure content ends with newline and uses proper header
    const cleanContent = content.endsWith("\n") ? content : `${content}\n`;

    return new NextResponse(cleanContent, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    return new NextResponse("# ads.txt temporarily unavailable\n", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  }
}
