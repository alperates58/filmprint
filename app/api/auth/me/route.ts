import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/service";
import { getUserProgression } from "@/lib/progression/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null, progression: null });
  }

  const progression = await getUserProgression(user.id);
  return NextResponse.json({ user, progression });
}
