import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/service";
import { getTvCalibrationQueue } from "@/lib/tv/calibration/service";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "5", 10)), 15);

    const queueResult = await getTvCalibrationQueue(user.id, limit);

    return NextResponse.json(queueResult);
  } catch (error) {
    console.error("[GET /api/tv/calibration Error]:", error);
    return NextResponse.json(
      { error: "TV kalibrasyon sırası yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
