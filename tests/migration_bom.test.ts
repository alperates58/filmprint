import fs from "fs";
import path from "path";

export function runBomScanTest() {
  console.log("=== REPOSITORY MIGRATION UTF-8 BOM VALIDATION ===");

  const migrationsDir = path.resolve(process.cwd(), "prisma/migrations");
  if (!fs.existsSync(migrationsDir)) {
    console.error("[FAIL] prisma/migrations directory not found");
    process.exit(1);
  }

  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
  const migrationFiles: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const sqlPath = path.join(migrationsDir, entry.name, "migration.sql");
      if (fs.existsSync(sqlPath)) {
        migrationFiles.push(sqlPath);
      }
    }
  }

  console.log("Found " + migrationFiles.length + " migration.sql files.");
  const failedFiles: string[] = [];

  for (const file of migrationFiles) {
    const buffer = fs.readFileSync(file);
    const hasBom =
      buffer.length >= 3 &&
      buffer[0] === 0xef &&
      buffer[1] === 0xbb &&
      buffer[2] === 0xbf;

    const relPath = path.relative(process.cwd(), file);
    if (hasBom) {
      console.error("[FAIL] BOM DETECTED in: " + relPath);
      failedFiles.push(relPath);
    } else {
      console.log("[PASS] Clean UTF-8 without BOM: " + relPath);
    }
  }

  if (failedFiles.length > 0) {
    console.error("\nFAILED: " + failedFiles.length + " migration file(s) contain UTF-8 BOM!");
    process.exit(1);
  }

  console.log("\nRESULTS: All " + migrationFiles.length + " migrations are 100% clean (UTF-8 without BOM).");
}

runBomScanTest();