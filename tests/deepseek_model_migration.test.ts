import assert from "node:assert";
import { normalizeDeepSeekModel, CANONICAL_DEEPSEEK_MODEL } from "../lib/config/service";

export async function runDeepSeekModelMigrationTests() {
  console.log("[Test] Running DeepSeek Model Migration & Canonical Resolution Tests...");

  // 1. Default canonical model check
  assert.strictEqual(CANONICAL_DEEPSEEK_MODEL, "deepseek-v4-flash", "Canonical default must be deepseek-v4-flash");

  // 2. Empty / null / undefined normalization
  assert.strictEqual(normalizeDeepSeekModel(null), "deepseek-v4-flash", "Null should normalize to deepseek-v4-flash");
  assert.strictEqual(normalizeDeepSeekModel(undefined), "deepseek-v4-flash", "Undefined should normalize to deepseek-v4-flash");
  assert.strictEqual(normalizeDeepSeekModel(""), "deepseek-v4-flash", "Empty string should normalize to deepseek-v4-flash");
  assert.strictEqual(normalizeDeepSeekModel("   "), "deepseek-v4-flash", "Whitespace string should normalize to deepseek-v4-flash");

  // 3. Legacy deepseek-chat normalization
  assert.strictEqual(normalizeDeepSeekModel("deepseek-chat"), "deepseek-v4-flash", "Legacy deepseek-chat must normalize to deepseek-v4-flash");

  // 4. Legacy deepseek-reasoner normalization
  assert.strictEqual(normalizeDeepSeekModel("deepseek-reasoner"), "deepseek-v4-flash", "Legacy deepseek-reasoner must normalize to deepseek-v4-flash");

  // 5. Custom valid user-specified model preservation
  assert.strictEqual(normalizeDeepSeekModel("deepseek-v4-flash"), "deepseek-v4-flash", "deepseek-v4-flash should remain deepseek-v4-flash");
  assert.strictEqual(normalizeDeepSeekModel("custom-ai-model-v1"), "custom-ai-model-v1", "Custom model names should be preserved");

  console.log("  ✓ All DeepSeek Model Migration & Canonical Resolution Tests passed!");
}
