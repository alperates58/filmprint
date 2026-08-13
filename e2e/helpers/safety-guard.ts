/**
 * Safety Guard to prevent E2E tests from running against Production Database or Live Production Domain.
 */
export function enforceTestEnvironmentSafety(): void {
  const dbUrl = process.env.DATABASE_URL || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.TEST_APP_URL || "";

  const PROD_INDICATORS = [
    "filmprint.alperates.com.tr",
    "production",
    "prod-db",
    "coolify",
  ];

  for (const indicator of PROD_INDICATORS) {
    if (dbUrl.toLowerCase().includes(indicator) || appUrl.toLowerCase().includes(indicator)) {
      console.error("\n===============================================================");
      console.error("⛔ SAFETY GUARD TRIGGERED: PRODUCTION DATABASE OR DOMAIN DETECTED!");
      console.error(`DATABASE_URL: ${dbUrl}`);
      console.error(`APP_URL     : ${appUrl}`);
      console.error("E2E tests ABORTED to prevent production data corruption.");
      console.error("===============================================================\n");
      throw new Error(`SAFETY GUARD ABORT: Production environment indicator found '${indicator}'`);
    }
  }

  // Ensure database name ends with _test or uses test port/host in test environments
  if (process.env.NODE_ENV === "production" && !dbUrl.includes("test")) {
    console.warn("⚠️ Warning: Running E2E in production NODE_ENV without explicit _test database name.");
  }
}
