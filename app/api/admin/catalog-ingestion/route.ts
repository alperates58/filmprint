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
    console.error("[Catalog Ingestion Status API Error]:", (error as Error).message);
    return NextResponse.json(
      { error: "CATALOG_INGESTION_INTERNAL_ERROR", message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession();
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { action, mediaType, batchSize, resetCursorValue } = body;

    if (!action || typeof action !== "string") {
      return NextResponse.json({ error: "Action is required." }, { status: 400 });
    }

    const actionType = action as CatalogAdminActionType;
    const actionResult = await executeAdminAction(actionType, {
      batchSize,
      resetCursorValue,
      ...(mediaType ? { mediaType } : {}),
    });

    // Safely log audit without blocking the response
    try {
      await logAdminAudit(
        admin.id,
        `CATALOG_INGESTION_${action}`,
        "CatalogIngestionState",
        mediaType || undefined,
        body
      );
    } catch (auditErr) {
      console.warn("[CatalogIngestion] Note: Admin audit log skipped:", (auditErr as Error).message);
    }

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
    console.error("[Catalog Ingestion Action API Error]:", (error as Error).message);
    return NextResponse.json(
      {
        error: "CATALOG_INGESTION_INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
