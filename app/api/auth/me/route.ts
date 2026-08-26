import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/service";
import { getUserProgression } from "@/lib/progression/server";
import { getUserEntitlementSummary } from "@/lib/entitlements/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null, progression: null, entitlement: null });
  }

  const mode = new URL(request.url).searchParams.get("mode") === "tv" ? "TV" : "FILM";
  const [progression, entitlement] = await Promise.all([
    getUserProgression(user.id, mode),
    getUserEntitlementSummary(user.id),
  ]);

  return NextResponse.json({ user, progression, entitlement });
}
