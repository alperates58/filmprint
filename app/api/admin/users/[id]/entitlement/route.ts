import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAudit } from "@/lib/admin/auth";
import {
  adminGrantUserEntitlement,
  adminRevokeUserEntitlement,
  getUserEntitlementSummary,
} from "@/lib/entitlements/service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
    const { id } = await context.params;
    const summary = await getUserEntitlementSummary(id);
    return NextResponse.json({ success: true, summary });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminSession();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    const tier = body.tier === "FREE" ? "FREE" : "PREMIUM";
    const validUntil = body.validUntil ? new Date(body.validUntil) : null;

    const record = await adminGrantUserEntitlement(id, tier, validUntil);

    await logAdminAudit(
      admin.id,
      "USER_ENTITLEMENT_GRANTED",
      "UserEntitlement",
      id,
      { tier, validUntil: validUntil?.toISOString() || null }
    );

    const summary = await getUserEntitlementSummary(id);
    return NextResponse.json({
      success: true,
      message: `Kullanıcı yetkisi ${tier} olarak güncellendi.`,
      entitlement: record,
      summary,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Admin Entitlement Grant Error]:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminSession();
    const { id } = await context.params;

    const record = await adminRevokeUserEntitlement(id);

    await logAdminAudit(
      admin.id,
      "USER_ENTITLEMENT_REVOKED",
      "UserEntitlement",
      id,
      { tier: "FREE" }
    );

    const summary = await getUserEntitlementSummary(id);
    return NextResponse.json({
      success: true,
      message: "Kullanıcı Premium yetkisi iptal edildi (FREE).",
      entitlement: record,
      summary,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Admin Entitlement Revoke Error]:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}