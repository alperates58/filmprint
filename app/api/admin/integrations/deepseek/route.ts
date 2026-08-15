import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAudit } from "@/lib/admin/auth";
import { saveIntegrationSecret, updateIntegrationMetadata } from "@/lib/config/service";

export async function PUT(request: Request) {
  try {
    const admin = await requireAdminSession();
    const body = await request.json();
    const { apiKey, baseUrl, modelId, enabled } = body;

    const metadata: Record<string, unknown> = {};
    if (baseUrl) metadata.baseUrl = baseUrl.trim();
    if (modelId) metadata.modelId = modelId.trim();
    if (typeof enabled === "boolean") metadata.enabled = enabled;

    if (apiKey && typeof apiKey === "string" && apiKey.trim().length > 0) {
      await saveIntegrationSecret("deepseek", apiKey.trim(), metadata);
      await logAdminAudit(admin.id, "DEEPSEEK_KEY_UPDATED", "IntegrationSecret", "deepseek", {
        lastFour: apiKey.slice(-4),
        modelId: metadata.modelId,
      });
    } else {
      await updateIntegrationMetadata("deepseek", metadata);
      await logAdminAudit(admin.id, "DEEPSEEK_METADATA_UPDATED", "IntegrationSecret", "deepseek", metadata);
    }

    return NextResponse.json({
      success: true,
      message: "Yapay Zeka (AI) sağlayıcı ayarları güvenli şekilde kaydedildi.",
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Admin DeepSeek Update Error]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
