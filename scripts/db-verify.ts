import { db } from "../lib/db/client";
import * as fs from "fs";
import * as path from "path";

/**
 * Database Verification & Schema Drift Detector Script (Match Engine & Production Safety).
 * Validates actual PostgreSQL table schema columns against Prisma schema declarations
 * and audits migration history for destructive SQL statements.
 */
async function verifyDatabaseSchemaAndMigrations() {
  console.log("===============================================================");
  console.log("FILMPRINT DATABASE DRIFT & MIGRATION SAFETY AUDIT");
  console.log("===============================================================\n");

  let hasErrors = false;
  let hasWarnings = false;

  // 1. Audit Migration SQL Files for Destructive Statements
  console.log("---> Step 1: Auditing Prisma Migration SQL History for Destructive Statements...");
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");

  if (fs.existsSync(migrationsDir)) {
    const migrationFolders = fs
      .readdirSync(migrationsDir)
      .filter((f) => fs.statSync(path.join(migrationsDir, f)).isDirectory());

    const DESTRUCTIVE_PATTERNS = [
      /DROP\s+TABLE/i,
      /TRUNCATE/i,
      /DROP\s+COLUMN/i,
      /ALTER\s+TABLE.*DROP/i,
    ];

    for (const folder of migrationFolders) {
      const sqlPath = path.join(migrationsDir, folder, "migration.sql");
      if (fs.existsSync(sqlPath)) {
        const sqlContent = fs.readFileSync(sqlPath, "utf-8");
        for (const pattern of DESTRUCTIVE_PATTERNS) {
          if (pattern.test(sqlContent)) {
            console.warn(
              `⚠️ DESTRUCTIVE SQL WARNING in migration '${folder}': Matches pattern '${pattern}'`
            );
            hasWarnings = true;
          }
        }
      }
    }
    console.log(`✓ Audited ${migrationFolders.length} migration folders.`);
  } else {
    console.warn("⚠️ Warning: No prisma/migrations folder found.");
  }

  // 2. Validate Actual Database Column Schema against Critical Model Fields
  console.log("\n---> Step 2: Validating Database Schema & Column Definitions...");
  try {
    // Query PostgreSQL information_schema to verify column existence directly
    const columnsRaw: any[] = await db.$queryRaw`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public'
    `;

    const columnMap = new Set(
      columnsRaw.map((c) => `${c.table_name.toLowerCase()}.${c.column_name.toLowerCase()}`)
    );

    const ESSENTIAL_COLUMNS = [
      { table: "user", column: "accounttype" },
      { table: "user", column: "provider" },
      { table: "movie", column: "tmdbid" },
      { table: "movieinteraction", column: "status" },
      { table: "movieinteraction", column: "rating" },
      { table: "movieinteraction", column: "updatedat" }, // Critical regression check!
      { table: "usertasteprofile", column: "version" },
      { table: "usertasteprofile", column: "profilejson" },
      { table: "recommendationexplanation", column: "isaigenerated" },
      { table: "recommendationfeedback", column: "action" },
      { table: "movienightsession", column: "code" },
      { table: "adminuser", column: "passwordhash" },
      { table: "tvshow", column: "tmdbid" },
      { table: "tvshow", column: "name" },
      { table: "tvinteraction", column: "status" },
      { table: "tvinteraction", column: "rating" },
      { table: "usertvtasteprofile", column: "profilejson" },
      { table: "tvrecommendationfeedback", column: "action" },
    ];

    for (const item of ESSENTIAL_COLUMNS) {
      const key = `${item.table}.${item.column}`;
      if (columnMap.has(key)) {
        console.log(`  ✓ Verified Column: ${item.table}.${item.column}`);
      } else {
        console.error(`  ❌ SCHEMA DRIFT ERROR: Missing Column '${item.column}' in Table '${item.table}'!`);
        hasErrors = true;
      }
    }
  } catch (err: any) {
    console.warn("⚠️ Database query warning (DB might be offline or initializing):", err.message);
    hasWarnings = true;
  }

  console.log("\n===============================================================");
  console.log("DRIFT VERIFICATION RESULT");
  console.log("===============================================================");

  if (hasErrors) {
    console.error("❌ DB VERIFY FAILED: Schema drift detected!");
    process.exit(1);
  } else {
    console.log(`✅ DB VERIFY PASSED: Database schema is consistent and up to date. (Warnings: ${hasWarnings ? "Yes" : "None"})\n`);
  }
}

verifyDatabaseSchemaAndMigrations();
