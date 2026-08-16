import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/service";
import { getUserProgression } from "@/lib/progression/server";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null, progression: null });
  }

  const mode = new URL(request.url).searchParams.get("mode") === "tv" ? "TV" : "FILM";
  const progression = await getUserProgression(user.id, mode);
  return NextResponse.json({ user, progression });
}
