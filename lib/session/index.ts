import { cookies } from "next/headers";
import { db } from "@/lib/db/client";

export const SESSION_COOKIE_NAME = "filmprint_session";

export interface SessionInfo {
  sessionId: string;
  userId: string;
}

/**
 * Retrieves existing anonymous session from request cookie or provisions a new User in DB.
 */
export async function getOrCreateSession(): Promise<SessionInfo> {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  // Look up user in PostgreSQL by id
  let user = await db.user.findUnique({
    where: { id: sessionId },
    select: { id: true, lastSeenAt: true },
  });

  const now = new Date();

  if (!user) {
    user = await db.user.create({
      data: {
        id: sessionId,
        lastSeenAt: now,
      },
      select: { id: true, lastSeenAt: true },
    });
  } else {
    // Throttled lastSeenAt update (only if older than 10 minutes)
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    if (!user.lastSeenAt || user.lastSeenAt < tenMinutesAgo) {
      await db.user.update({
        where: { id: sessionId },
        data: { lastSeenAt: now },
      }).catch(() => {});
    }
  }

  return {
    sessionId,
    userId: user.id,
  };
}
