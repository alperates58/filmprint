import { getAuthenticatedUser } from "@/lib/auth/service";

export interface SessionInfo {
  sessionId: string;
  userId: string;
}

/**
 * Resolves current authenticated user session. Returns null if unauthenticated.
 */
export async function getOrCreateSession(): Promise<SessionInfo | null> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return null;
  }
  return {
    sessionId: user.id,
    userId: user.id,
  };
}
