import { NextResponse } from "next/server";
import { CANONICAL_DEEPSEEK_MODEL } from "@/lib/config/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const commitSha =
    process.env.GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_GIT_COMMIT ||
    process.env.COOLIFY_COMMIT_SHA ||
    "unknown";

  const buildTime =
    process.env.BUILD_TIME ||
    process.env.NEXT_PUBLIC_BUILD_TIME ||
    "unknown";

  const appVersion = process.env.npm_package_version || "0.1.0";

  return NextResponse.json(
    {
      commitSha,
      buildTime,
      appVersion,
      canonicalDeepSeekModel: CANONICAL_DEEPSEEK_MODEL,
      status: "healthy",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    }
  );
}
