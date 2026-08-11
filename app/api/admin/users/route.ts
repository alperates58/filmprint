import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { getAdminUsersData } from "@/lib/admin/data";

export async function GET() {
  try {
    await requireAdminSession();
    const data = await getAdminUsersData();
    return NextResponse.json(data);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Admin Users List Error]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
