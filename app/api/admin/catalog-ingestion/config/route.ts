import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAudit } from "@/lib/admin/auth";
import {
  getCatalogIngestionOverviewStatus,
  updateCatalogIngestionConfig,
} from "@/lib/catalog-ingestion/service";

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession();
    const body = await request.json();

    const {
      masterEnabled,
      globalMaxRps,
      staleDays,
      film,
      tv,
    } = body;

    // Validation
    if (typeof globalMaxRps === "number" && (globalMaxRps < 0.1 || globalMaxRps > 10.0)) {
      return NextResponse.json(
        { error: "globalMaxRps must be between 0.1 and 10.0" },
        { status: 400 }
      );
    }

    if (film) {
      if (typeof film.requestsPerSecond === "number" && (film.requestsPerSecond < 0.1 || film.requestsPerSecond > (globalMaxRps || 10.0))) {
        return NextResponse.json(
          { error: "Film requestsPerSecond must be between 0.1 and globalMaxRps" },
          { status: 400 }
        );
      }
      if (typeof film.concurrency === "number" && (film.concurrency < 1 || film.concurrency > 4)) {
        return NextResponse.json(
          { error: "Film concurrency must be between 1 and 4" },
          { status: 400 }
        );
      }
    }

    if (tv) {
      if (typeof tv.requestsPerSecond === "number" && (tv.requestsPerSecond < 0.1 || tv.requestsPerSecond > (globalMaxRps || 10.0))) {
        return NextResponse.json(
          { error: "TV requestsPerSecond must be between 0.1 and globalMaxRps" },
          { status: 400 }
        );
      }
      if (typeof tv.concurrency === "number" && (tv.concurrency < 1 || tv.concurrency > 4)) {
        return NextResponse.json(
          { error: "TV concurrency must be between 1 and 4" },
          { status: 400 }
        );
      }
    }

    await updateCatalogIngestionConfig({
      masterEnabled,
      globalMaxRps,
      staleDays,
      film,
      tv,
    });

    await logAdminAudit(
      admin.id,
      "CATALOG_INGESTION_CONFIG_UPDATED",
      "CatalogIngestionState",
      undefined,
      body
    );

    const refreshedStatus = await getCatalogIngestionOverviewStatus();

    return NextResponse.json({
      success: true,
      message: "Katalog altyapı ayarları kaydedildi.",
      status: refreshedStatus,
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Catalog Ingestion Config API Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
