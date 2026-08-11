import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";

export async function GET() {
  let dbStatus = "disconnected";
  let dbError: string | null = null;

  try {
    // Perform light database check
    await db.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch (err: unknown) {
    dbError = err instanceof Error ? err.message : "Unknown database connection error";
    console.error("[Health Check] Database connection failure:", dbError);
  }

  const isHealthy = dbStatus === "connected";

  return NextResponse.json(
    {
      status: isHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        error: dbError,
      },
      environment: process.env.NODE_ENV || "unknown",
    },
    { status: isHealthy ? 200 : 503 }
  );
}
