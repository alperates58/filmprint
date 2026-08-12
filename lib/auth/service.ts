import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { hashPassword, verifyPassword } from "@/lib/security/crypto";

export const USER_SESSION_COOKIE_NAME = "filmprint_user_session";
export const LEGACY_ANONYMOUS_COOKIE_NAME = "filmprint_session";

export interface CurrentUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  accountType: "ANONYMOUS" | "REGISTERED";
  provider: "ANONYMOUS" | "GOOGLE" | "EMAIL";
  isAuthenticated: boolean;
  lastSeenAt: Date;
}

/**
  Central resolver for current user identity.
  1. Resolves authenticated user session from `filmprint_user_session` cookie if present and valid.
  2. Fallback: Resolves or provisions anonymous user from `filmprint_session` cookie.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const cookieStore = await cookies();
  const authSessionToken = cookieStore.get(USER_SESSION_COOKIE_NAME)?.value;

  const now = new Date();

  if (authSessionToken) {
    const sessionRecord = await db.userSession.findUnique({
      where: { token: authSessionToken },
      include: { user: true },
    });

    if (sessionRecord && sessionRecord.expiresAt > now) {
      const user = sessionRecord.user;
      // Throttled lastSeenAt update (only if older than 10 minutes)
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      if (!user.lastSeenAt || user.lastSeenAt < tenMinutesAgo) {
        await db.user.update({
          where: { id: user.id },
          data: { lastSeenAt: now },
        }).catch(() => {});
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        accountType: user.accountType,
        provider: user.provider,
        isAuthenticated: true,
        lastSeenAt: user.lastSeenAt,
      };
    }
  }

  // Fallback: Legacy / Anonymous session handling
  let anonSessionId = cookieStore.get(LEGACY_ANONYMOUS_COOKIE_NAME)?.value;
  if (!anonSessionId) {
    anonSessionId = crypto.randomUUID();
    cookieStore.set(LEGACY_ANONYMOUS_COOKIE_NAME, anonSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  let user = await db.user.findUnique({
    where: { id: anonSessionId },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        id: anonSessionId,
        accountType: "ANONYMOUS",
        provider: "ANONYMOUS",
        lastSeenAt: now,
      },
    });
  } else {
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    if (!user.lastSeenAt || user.lastSeenAt < tenMinutesAgo) {
      await db.user.update({
        where: { id: user.id },
        data: { lastSeenAt: now },
      }).catch(() => {});
    }
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    accountType: user.accountType,
    provider: user.provider,
    isAuthenticated: user.accountType === "REGISTERED",
    lastSeenAt: user.lastSeenAt,
  };
}

/**
 * Creates a new persistent authenticated session for a user.
 */
export async function createUserSession(userId: string): Promise<string> {
  const cookieStore = await cookies();
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days session

  await db.userSession.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  cookieStore.set(USER_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  return token;
}

/**
 * Invalidates user session and removes session cookies.
 */
export async function logoutUser(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_SESSION_COOKIE_NAME)?.value;

  if (token) {
    await db.userSession.deleteMany({
      where: { token },
    }).catch(() => {});
  }

  cookieStore.delete(USER_SESSION_COOKIE_NAME);
  // Do NOT auto-create a new anonymous session on logout. User must go to /auth.
}
