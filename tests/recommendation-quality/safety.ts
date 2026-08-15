import { URL } from "url";

/**
 * Hard Safety Allowlist & Production Blocker for Phase 9 Quality Lab.
 * 
 * Strict Rules:
 * 1. ENABLE_QUALITY_LAB=true environment flag is mandatory.
 * 2. DATABASE_URL host must strictly match allowed local/test Docker hosts.
 * 3. NEXT_PUBLIC_APP_URL must strictly match allowed local web hosts.
 * 4. Any unknown, production, or remote host triggers immediate FAIL-CLOSED (process.exit(1)).
 */

export const ALLOWED_DB_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "postgres",
  "filmprint-postgres",
]);

export const ALLOWED_APP_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
]);

export const BLOCKED_PRODUCTION_PATTERNS = [
  "filmprint.alperates.com.tr",
  "alperates.com.tr",
  "production",
  "prod-db",
];

export interface SafetyCheckResult {
  allowed: boolean;
  dbHost: string | null;
  appHost: string | null;
  reasons: string[];
}

/**
 * Evaluates environment safety for Phase 9 Quality Lab.
 */
export function evaluateSafety(env: Record<string, string | undefined> = process.env): SafetyCheckResult {
  const reasons: string[] = [];

  // 1. Mandatory flag check
  if (env.ENABLE_QUALITY_LAB !== "true") {
    reasons.push("ENABLE_QUALITY_LAB environment variable is not set to 'true'.");
  }

  // 2. DATABASE_URL validation
  const dbUrlStr = env.DATABASE_URL;
  let dbHost: string | null = null;

  if (!dbUrlStr) {
    reasons.push("DATABASE_URL is not defined.");
  } else {
    // Check for blocked production substrings
    for (const pattern of BLOCKED_PRODUCTION_PATTERNS) {
      if (dbUrlStr.toLowerCase().includes(pattern.toLowerCase())) {
        reasons.push(`DATABASE_URL contains blocked production pattern: '${pattern}'`);
      }
    }

    try {
      // Parse postgres URL
      const parsed = new URL(dbUrlStr.replace("postgresql://", "http://").replace("postgres://", "http://"));
      dbHost = parsed.hostname.toLowerCase();

      if (!ALLOWED_DB_HOSTNAMES.has(dbHost)) {
        reasons.push(`DATABASE_URL host '${dbHost}' is NOT in the allowed local hostname list: [${Array.from(ALLOWED_DB_HOSTNAMES).join(", ")}]. FAIL CLOSED.`);
      }
    } catch {
      reasons.push(`Failed to parse DATABASE_URL: '${dbUrlStr}'`);
    }
  }

  // 3. NEXT_PUBLIC_APP_URL validation
  const appUrlStr = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  let appHost: string | null = null;

  for (const pattern of BLOCKED_PRODUCTION_PATTERNS) {
    if (appUrlStr.toLowerCase().includes(pattern.toLowerCase())) {
      reasons.push(`NEXT_PUBLIC_APP_URL contains blocked production pattern: '${pattern}'`);
    }
  }

  try {
    const parsedApp = new URL(appUrlStr);
    appHost = parsedApp.hostname.toLowerCase();

    if (!ALLOWED_APP_HOSTNAMES.has(appHost)) {
      reasons.push(`NEXT_PUBLIC_APP_URL host '${appHost}' is NOT in the allowed local hostname list: [${Array.from(ALLOWED_APP_HOSTNAMES).join(", ")}]. FAIL CLOSED.`);
    }
  } catch {
    reasons.push(`Failed to parse NEXT_PUBLIC_APP_URL: '${appUrlStr}'`);
  }

  const allowed = reasons.length === 0;

  return {
    allowed,
    dbHost,
    appHost,
    reasons,
  };
}

/**
 * Enforces safety guard. Aborts with code 1 if safety check fails.
 */
export function assertSafetyOrExit(env: Record<string, string | undefined> = process.env): void {
  const result = evaluateSafety(env);

  if (!result.allowed) {
    console.error("===============================================================");
    console.error("❌ CRITICAL SAFETY GUARD VIOLATION — QUALITY LAB ABORTED");
    console.error("===============================================================");
    for (const reason of result.reasons) {
      console.error(`- ${reason}`);
    }
    console.error("===============================================================\n");
    process.exit(1);
  }

  console.log("===============================================================");
  console.log("✅ LOCAL DOCKER SAFETY GUARD PASSED (FAIL-CLOSED VERIFIED)");
  console.log(`- Database Host: ${result.dbHost}`);
  console.log(`- App Host     : ${result.appHost}`);
  console.log(`- Lab Mode     : ENABLE_QUALITY_LAB=true`);
  console.log("===============================================================\n");
}

/**
 * Runs automated negative and positive unit tests for the safety guard.
 */
export function runSafetyNegativeTests(): void {
  console.log("=== PHASE 9 SAFETY GUARD NEGATIVE & POSITIVE TESTS ===\n");
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total}: ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${testName}`);
    }
  }

  // 1. Negative: Production domain in NEXT_PUBLIC_APP_URL
  const res1 = evaluateSafety({
    ENABLE_QUALITY_LAB: "true",
    DATABASE_URL: "postgresql://filmprint:secret@postgres:5432/filmprint",
    NEXT_PUBLIC_APP_URL: "https://filmprint.alperates.com.tr",
  });
  assert(res1.allowed === false && res1.reasons.some((r) => r.includes("blocked production pattern")), "Production domain in NEXT_PUBLIC_APP_URL is strictly blocked");

  // 2. Negative: Production DB host
  const res2 = evaluateSafety({
    ENABLE_QUALITY_LAB: "true",
    DATABASE_URL: "postgresql://filmprint:secret@prod-db.internal:5432/filmprint",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  });
  assert(res2.allowed === false && res2.reasons.some((r) => r.includes("NOT in the allowed local hostname list")), "Production/remote DB host is strictly blocked");

  // 3. Negative: Unknown remote host (Fail Closed)
  const res3 = evaluateSafety({
    ENABLE_QUALITY_LAB: "true",
    DATABASE_URL: "postgresql://filmprint:secret@192.168.1.100:5432/filmprint",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  });
  assert(res3.allowed === false && res3.reasons.some((r) => r.includes("FAIL CLOSED")), "Unknown remote host triggers FAIL CLOSED");

  // 4. Negative: Missing ENABLE_QUALITY_LAB flag
  const res4 = evaluateSafety({
    DATABASE_URL: "postgresql://filmprint:secret@postgres:5432/filmprint",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  });
  assert(res4.allowed === false && res4.reasons.some((r) => r.includes("ENABLE_QUALITY_LAB")), "Missing ENABLE_QUALITY_LAB flag is strictly blocked");

  // 5. Positive: Local Docker PostgreSQL + local App URL + ENABLE_QUALITY_LAB=true
  const res5 = evaluateSafety({
    ENABLE_QUALITY_LAB: "true",
    DATABASE_URL: "postgresql://filmprint:filmprint_dev_secret@postgres:5432/filmprint?schema=public",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  });
  assert(res5.allowed === true && res5.dbHost === "postgres" && res5.appHost === "localhost", "Valid local Docker environment is correctly allowed");

  // 6. Positive: Localhost DB + 127.0.0.1
  const res6 = evaluateSafety({
    ENABLE_QUALITY_LAB: "true",
    DATABASE_URL: "postgresql://filmprint:dev@127.0.0.1:5432/filmprint",
    NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
  });
  assert(res6.allowed === true && res6.dbHost === "127.0.0.1", "Valid localhost/127.0.0.1 environment is correctly allowed");

  console.log(`\nSAFETY TEST RESULTS: Passed ${passed} of ${total} tests.\n`);
  if (passed !== total) {
    throw new Error(`Safety test failures: ${total - passed} tests failed.`);
  }
}
