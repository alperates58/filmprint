import { TV_EDITORIAL_CATEGORIES } from "../lib/tv/recommendation/editorial-scorer";
import { getTvHomeModules } from "../lib/tv/recommendation/service";
import { db } from "../lib/db/client";

export async function runHomeVisualContractTests(): Promise<void> {
  console.log("\n🧪 Running Home Visual Contract & UX Consistency Tests...");

  // Test 1: TV Editorial Categories Definition
  {
    console.log("  → Test 1: TV Editorial Categories include all 8 expected modules matching Mood Chips");

    const expectedCategoryIds = [
      "FOR_YOU",
      "MINISERIES",
      "MYSTERY_CRIME",
      "GLOBAL_DISCOVERY",
      "SHORT_EPISODES",
      "LONG_RUNNING",
      "COMPLETED_GEMS",
      "COMEDY",
    ];

    const actualCategoryIds = TV_EDITORIAL_CATEGORIES.map((c) => c.id);

    for (const catId of expectedCategoryIds) {
      if (!actualCategoryIds.includes(catId)) {
        throw new Error(`Missing expected TV editorial category: ${catId}`);
      }
    }

    console.log(`     ✓ Verified all ${expectedCategoryIds.length} TV editorial categories (${expectedCategoryIds.join(", ")}).`);
  }

  // Test 2: TV Home Modules Generation Contract
  {
    console.log("  → Test 2: TV Home Modules generator builds valid horizontal row structures");

    const { isDbAvailable } = await import("./test_helpers");
    if (await isDbAvailable()) {
      // Create a temporary user
      const user = await db.user.create({
        data: {
          email: `test_home_contract_${Date.now()}@filmprint.io`,
          name: "Home Contract User",
        },
      });

      const modules = await getTvHomeModules(user.id);

      if (!Array.isArray(modules)) {
        throw new Error("getTvHomeModules must return an array of modules");
      }

      for (const mod of modules) {
        if (!mod.id || !mod.title || !mod.subtitle || !Array.isArray(mod.items)) {
          throw new Error(`Module ${mod.id} is missing required presentational fields`);
        }
      }

      console.log(`     ✓ TV Home generated ${modules.length} compliant editorial modules.`);
      await db.user.deleteMany({ where: { id: user.id } }).catch(() => {});
    } else {
      console.log("     ⚠️ Skipping Live DB module generation (PostgreSQL offline in test environment)");
    }
  }

  console.log("  ✅ Home Visual Contract Tests Passed!\n");
}
