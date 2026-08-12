import { NextResponse } from "next/server";
import { logoutUser } from "@/lib/auth/service";

export async function POST() {
  await logoutUser();
  return NextResponse.json({ success: true });
}

export async function GET() {
  await logoutUser();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  return NextResponse.redirect(`${baseUrl}/auth`);
}
