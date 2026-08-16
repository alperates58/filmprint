import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAudit } from "@/lib/admin/auth";
import {
  getCatalogIngestionOverviewStatus,
  executeAdminAction,
} from "@/lib/catalog-ingestion/service";
import type { CatalogAdminActionType } from "@/lib/catalog-ingestion/types";

export async function GET() {
  try {
    await requireAdminSession();
    const status = await getCatalogIngestionOverviewStatus();
    return NextResponse.json({ success: true, status });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Catalog Ingestion Status API Error]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession();
    const body = await request.json();
    const { action, mediaType, batchSize, resetCursorValue } = body;

    if (!action) {
      return NextResponse.json({ error: "Action is required." }, { status: 400 });
    }

    const actionType = action as CatalogAdminActionType;
    const actionResult = await executeAdminAction(actionType, {
      batchSize,
      resetCursorValue,
      ...(mediaType ? { mediaType } : {}),
    } as any);

    await logAdminAudit(
      admin.id,
      `CATALOG_INGESTION_${action}`,
      "CatalogIngestionState",
      mediaType || undefined,
      body
    );

    const refreshedStatus = await getCatalogIngestionOverviewStatus();

    return NextResponse.json({
      success: actionResult.success,
      message: actionResult.message,
      result: actionResult.result,
      status: refreshedStatus,
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Catalog Ingestion Action API Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
