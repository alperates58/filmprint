import { cookies } from "next/headers";
import { db } from "@/lib/db/client";

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
 * Resolves authenticated user identity strictly from `filmprint_user_session` cookie.
 * Returns null if no valid registered session exists.
 */
export async function getAuthenticatedUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const authSessionToken = cookieStore.get(USER_SESSION_COOKIE_NAME)?.value;

  if (!authSessionToken) {
    return null;
  }

  const now = new Date();
  const sessionRecord = await db.userSession.findUnique({
    where: { token: authSessionToken },
    include: { user: true },
  });

  if (!sessionRecord || sessionRecord.expiresAt <= now) {
    return null;
  }

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

/**
 * Resolves legacy anonymous user ID from `filmprint_session` cookie if present.
 * Used exclusively for data upgrade / migration during authentication.
 */
export async function getLegacyAnonymousUser(): Promise<{ id: string } | null> {
  const cookieStore = await cookies();
  const anonSessionId = cookieStore.get(LEGACY_ANONYMOUS_COOKIE_NAME)?.value;
  if (!anonSessionId) return null;

  const user = await db.user.findUnique({
    where: { id: anonSessionId },
    select: { id: true, accountType: true },
  });

  if (user && user.accountType === "ANONYMOUS") {
    return { id: user.id };
  }

  return null;
}

/**
 * Central resolver for current user identity.
 * Alias for getAuthenticatedUser(). Returns null if unauthenticated.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  return getAuthenticatedUser();
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
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(USER_SESSION_COOKIE_NAME)?.value;

    if (token) {
      await db.userSession.deleteMany({
        where: { token },
      }).catch(() => {});
    }

    cookieStore.delete(USER_SESSION_COOKIE_NAME);
    cookieStore.delete(LEGACY_ANONYMOUS_COOKIE_NAME);
  } catch (err) {
    console.error("[logoutUser error]:", err);
  }
}
