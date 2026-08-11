import { cookies } from "next/headers";
import { db } from "@/lib/db/client";

const SESSION_COOKIE_NAME = "filmprint_session";

export interface SessionUser {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Retrieves the current anonymous user session from HttpOnly cookie,
 * or provisions a new anonymous User record in PostgreSQL and sets the cookie.
 */
export async function getOrCreateSession(): Promise<{ userId: string; created: boolean }> {
  const cookieStore = await cookies();
  const existingSessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (existingSessionId) {
    try {
      const user = await db.user.findUnique({
        where: { id: existingSessionId },
        select: { id: true },
      });

      if (user) {
        return { userId: user.id, created: false };
      }
    } catch (err) {
      console.warn("Error verifying existing session user, creating new session:", err);
    }
  }

  // Create new anonymous user in PostgreSQL database
  const newUser = await db.user.create({
    data: {},
    select: { id: true },
  });

  // Set persistent HttpOnly cookie (1 year duration)
  try {
    cookieStore.set(SESSION_COOKIE_NAME, newUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: "/",
    });
  } catch (err) {
    // In read-only contexts (e.g. static rendering), cookie setting might be deferred
    console.warn("Could not set session cookie directly in current context:", err);
  }

  return { userId: newUser.id, created: true };
}
