import { cookies } from "next/headers";
import crypto from "crypto";
import { db } from "@/lib/db/client";
import { hashPassword, verifyPassword } from "@/lib/security/crypto";
import { AdminRole, Prisma } from "@prisma/client";

export const ADMIN_COOKIE_NAME = "filmprint_admin_session";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface AdminUserSessionData {
  id: string;
  email: string;
  role: AdminRole;
}

/**
 * Ensures initial admin account is bootstrapped atomically if no AdminUser exists.
 */
export async function bootstrapInitialAdmin(): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  const email = (process.env.ADMIN_EMAIL || "admin@filmprint.internal").toLowerCase().trim();
  const password = process.env.ADMIN_INITIAL_PASSWORD || "FilmprintAdmin2026!";

  const passwordHash = hashPassword(password);

  try {
    await db.adminUser.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash,
        role: AdminRole.SUPER_ADMIN,
        isActive: true,
      },
    });
  } catch {
    // Graceful catch for build-time static exports
  }
}

/**
 * Authenticates admin credentials and issues session token.
 */
export async function loginAdmin(
  emailInput: string,
  passwordInput: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  await bootstrapInitialAdmin();

  const email = emailInput.toLowerCase().trim();
  const admin = await db.adminUser.findUnique({
    where: { email },
  });

  if (!admin || !admin.isActive) {
    return { success: false, error: "Geçersiz e-posta veya parola" };
  }

  const isValid = verifyPassword(passwordInput, admin.passwordHash);
  if (!isValid) {
    return { success: false, error: "Geçersiz e-posta veya parola" };
  }

  // Create session token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.adminSession.create({
    data: {
      adminUserId: admin.id,
      token,
      expiresAt,
    },
  });

  // Update last login timestamp
  await db.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  // Log audit event
  await logAdminAudit(admin.id, "ADMIN_LOGIN", "AdminUser", admin.id, {
    email: admin.email,
  });

  return { success: true, token };
}

/**
 * Logs out admin by invalidating session record and clearing cookie.
 */
export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (token) {
    const session = await db.adminSession.findUnique({
      where: { token },
      select: { adminUserId: true },
    });

    if (session) {
      await logAdminAudit(session.adminUserId, "ADMIN_LOGOUT", "AdminSession", token);
      await db.adminSession.delete({ where: { token } }).catch(() => {});
    }

    cookieStore.delete(ADMIN_COOKIE_NAME);
  }
}

/**
 * Validates current request admin session.
 */
export async function getAdminSession(): Promise<AdminUserSessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!token) return null;

  const session = await db.adminSession.findUnique({
    where: { token },
    include: { adminUser: true },
  });

  if (!session || session.expiresAt < new Date() || !session.adminUser.isActive) {
    if (session) {
      await db.adminSession.delete({ where: { id: session.id } }).catch(() => {});
    }
    return null;
  }

  return {
    id: session.adminUser.id,
    email: session.adminUser.email,
    role: session.adminUser.role,
  };
}

/**
 * Strict authorization guard. Throws if unauthenticated.
 */
export async function requireAdminSession(): Promise<AdminUserSessionData> {
  const session = await getAdminSession();
  if (!session) {
    throw new Error("UNAUTHORIZED_ADMIN");
  }
  return session;
}

/**
 * Strict Super Admin authorization guard.
 */
export async function requireSuperAdminSession(): Promise<AdminUserSessionData> {
  const session = await requireAdminSession();
  if (session.role !== AdminRole.SUPER_ADMIN) {
    throw new Error("FORBIDDEN_SUPER_ADMIN_REQUIRED");
  }
  return session;
}

/**
 * Logs an administrative action to AdminAuditLog.
 */
export async function logAdminAudit(
  adminUserId: string | null,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await db.adminAuditLog.create({
      data: {
        adminUserId,
        action,
        entityType: entityType || null,
        entityId: entityId || null,
        metadata: (metadata || {}) as any,
      },
    });
  } catch (err) {
    console.error("[AdminAudit] Failed to log audit record:", err);
  }
}
