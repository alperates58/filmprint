import assert from "node:assert";
import { generateAiTasteWithDeepSeek, validateAiTasteJson } from "../lib/recommendation/ai-taste-service";
import * as configService from "../lib/config/service";

export async function runDeepSeekAiTasteThinkingTests() {
  console.log("\n🧪 Running DeepSeek AI Taste Thinking & Structured Output Tests...");

  const originalFetch = global.fetch;
  const originalEnvApiKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "sk-test-secret-key-123456";

  const validTasteJson = {
    schemaVersion: 1,
    corePreferences: ["Karakter Odaklı Dram", "Psikolojik Gerilim"],
    strongDislikes: ["Klişe Korku"],
    storyPreferences: {
      slowBurn: 0.8,
      complexNarrative: 0.9,
      characterDriven: 0.85,
      spectacle: 0.4,
      moralAmbiguity: 0.75,
      nonlinearNarrative: 0.7,
    },
    discoveryTolerance: 0.6,
    preferredCharacteristics: ["Yoğun Atmosfer", "Derin Karakterler"],
    avoidCharacteristics: ["Yüzeysel Diyalog"],
    confidence: 0.88,
  };

  try {
    // -------------------------------------------------------------------------
    // Test 1: Request Payload includes thinking disabled, max_tokens 2000, and json_object
    // -------------------------------------------------------------------------
    {
      let capturedBody: any = null;
      global.fetch = async (_url: any, options: any) => {
        capturedBody = JSON.parse(options.body);
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(validTasteJson) } }],
            usage: { total_tokens: 150 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const result = await generateAiTasteWithDeepSeek({ dummy: "payload" });
      assert.ok(result.profile, "Valid profile must be returned");
      assert.deepStrictEqual(
        capturedBody.thinking,
        { type: "disabled" },
        "Request must explicitly disable thinking mode"
      );
      assert.strictEqual(
        capturedBody.max_tokens,
        2000,
        "max_tokens must be set to 2000"
      );
      assert.deepStrictEqual(
        capturedBody.response_format,
        { type: "json_object" },
        "response_format must be json_object"
      );
      assert.strictEqual(
        capturedBody.temperature,
        0.3,
        "temperature must be 0.3"
      );
      console.log("  ✓ Test 1: Request includes thinking: { type: 'disabled' }, max_tokens: 2000, response_format: json_object.");
    }

    // -------------------------------------------------------------------------
    // Test 2: Successful valid JSON parsing and validation
    // -------------------------------------------------------------------------
    {
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify(validTasteJson),
                  reasoning_content: null,
                },
                finish_reason: "stop",
              },
            ],
            usage: { total_tokens: 210 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const result = await generateAiTasteWithDeepSeek({ test: true });
      assert.ok(result.profile, "Profile must be valid");
      assert.strictEqual(result.profile?.corePreferences[0], "Karakter Odaklı Dram");
      assert.strictEqual(result.profile?.confidence, 0.88);
      console.log("  ✓ Test 2: Successful valid JSON produces validated AiTasteProfile.");
    }

    // -------------------------------------------------------------------------
    // Test 3: Empty content (thinking truncation) -> Retry on attempt 2 succeeds
    // -------------------------------------------------------------------------
    {
      let callCount = 0;
      global.fetch = async () => {
        callCount++;
        if (callCount === 1) {
          // Attempt 1 returns empty content (e.g. reasoning token exhaustion)
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: { content: "", reasoning_content: "Long reasoning..." },
                  finish_reason: "length",
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        // Attempt 2 returns valid JSON
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: { content: JSON.stringify(validTasteJson) },
                finish_reason: "stop",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const result = await generateAiTasteWithDeepSeek({ test: true });
      assert.strictEqual(callCount, 2, "Must retry exactly once when attempt 1 returns empty content");
      assert.ok(result.profile, "Attempt 2 result must be returned on retry success");
      console.log("  ✓ Test 3: Empty content on attempt 1 triggers bounded retry and succeeds on attempt 2.");
    }

    // -------------------------------------------------------------------------
    // Test 4: Malformed JSON -> Retry on attempt 2 succeeds
    // -------------------------------------------------------------------------
    {
      let callCount = 0;
      global.fetch = async () => {
        callCount++;
        if (callCount === 1) {
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: { content: "{ incomplete_json: true, " },
                  finish_reason: "length",
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: { content: JSON.stringify(validTasteJson) },
                finish_reason: "stop",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const result = await generateAiTasteWithDeepSeek({ test: true });
      assert.strictEqual(callCount, 2, "Must retry on malformed JSON");
      assert.ok(result.profile, "Valid profile returned from retry");
      console.log("  ✓ Test 4: Malformed JSON triggers bounded retry and succeeds on attempt 2.");
    }

    // -------------------------------------------------------------------------
    // Test 5: Two consecutive failures -> Returns null (caller preserves existing fallback)
    // -------------------------------------------------------------------------
    {
      let callCount = 0;
      global.fetch = async () => {
        callCount++;
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: { content: "" },
                finish_reason: "length",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const result = await generateAiTasteWithDeepSeek({ test: true });
      assert.strictEqual(callCount, 2, "Must stop after maximum 2 attempts (1 initial + 1 retry)");
      assert.strictEqual(result.profile, null, "Must return null when both attempts fail");
      console.log("  ✓ Test 5: Two failures cleanly return null without infinite retry.");
    }

    // -------------------------------------------------------------------------
    // Test 6: Safe diagnostic logging (No API key or personal secret leakage)
    // -------------------------------------------------------------------------
    {
      const loggedWarnings: any[] = [];
      const originalWarn = console.warn;
      console.warn = (...args: any[]) => {
        loggedWarnings.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
      };

      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: { content: "invalid" },
                finish_reason: "error",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      await generateAiTasteWithDeepSeek({ personalTitle: "Secret Movie Title" });
      console.warn = originalWarn;

      const fullLogOutput = loggedWarnings.join("\n");
      assert.ok(!fullLogOutput.includes("sk-test-secret-key-123456"), "Logs must NEVER contain API key");
      assert.ok(!fullLogOutput.includes("Secret Movie Title"), "Logs must not leak prompt details");
      assert.ok(fullLogOutput.includes("[AiTasteService]"), "Logs must contain safe diagnostic tag");
      assert.ok(fullLogOutput.includes("validationSucceeded"), "Logs must contain diagnostic validation flag");
      console.log("  ✓ Test 6: Diagnostic logs contain structured metrics with 0 API key/data leakage.");
    }

    console.log("  ✅ All DeepSeek AI Taste Thinking & Structured Output Tests Passed!\n");
  } finally {
    global.fetch = originalFetch;
    if (originalEnvApiKey !== undefined) {
      process.env.DEEPSEEK_API_KEY = originalEnvApiKey;
    } else {
      delete process.env.DEEPSEEK_API_KEY;
    }
  }
}
