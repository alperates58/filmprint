import assert from "node:assert";
import { isValidTmdbImagePath, getTmdbImageUrl } from "@/lib/tmdb/image";

export async function runTmdbImageGuardTests() {
  console.log("=== TMDB IMAGE GUARD & POSTER PATH VALIDATION TESTS ===");

  // 1. Valid TMDB image paths with leading slash and genuine extension
  assert.strictEqual(
    isValidTmdbImagePath("/6GAvS2e6VIRsms9FpVt33PsCoEW.jpg"),
    true,
    "Valid TMDB hash starting with / is valid"
  );
  assert.strictEqual(
    isValidTmdbImagePath("/xn0Kcg4e6p0mLxVS3nAWhNmW2Ni.png"),
    true,
    "Valid TMDB PNG hash is valid"
  );
  assert.strictEqual(
    isValidTmdbImagePath("/dark.jpg"),
    true,
    "Valid relative test poster path starting with / is valid"
  );

  // 2. Unslashed filenames (the exact production bug) MUST be rejected
  assert.strictEqual(
    isValidTmdbImagePath("homeland.jpg"),
    false,
    "Unslashed homeland.jpg must be rejected"
  );
  assert.strictEqual(
    isValidTmdbImagePath("friends.jpg"),
    false,
    "Unslashed friends.jpg must be rejected"
  );
  assert.strictEqual(
    isValidTmdbImagePath("dexter.jpg"),
    false,
    "Unslashed dexter.jpg must be rejected"
  );

  // 3. Known dummy placeholder slugs MUST be rejected even if slashed
  assert.strictEqual(
    isValidTmdbImagePath("/homeland.jpg"),
    false,
    "Slashed /homeland.jpg placeholder must be rejected"
  );
  assert.strictEqual(
    isValidTmdbImagePath("/friends.jpg"),
    false,
    "Slashed /friends.jpg placeholder must be rejected"
  );
  assert.strictEqual(
    isValidTmdbImagePath("/dexter.jpg"),
    false,
    "Slashed /dexter.jpg placeholder must be rejected"
  );
  assert.strictEqual(
    isValidTmdbImagePath("/placeholder-poster.png"),
    false,
    "Slashed /placeholder-poster.png must be rejected"
  );

  // 4. Null, undefined, empty, and literal 'null' strings MUST be rejected
  assert.strictEqual(isValidTmdbImagePath(null), false, "null must return false");
  assert.strictEqual(isValidTmdbImagePath(undefined), false, "undefined must return false");
  assert.strictEqual(isValidTmdbImagePath(""), false, "empty string must return false");
  assert.strictEqual(isValidTmdbImagePath("/"), false, "'/' must return false");
  assert.strictEqual(isValidTmdbImagePath("/null"), false, "'/null' must return false");
  assert.strictEqual(isValidTmdbImagePath("null"), false, "'null' must return false");

  // 5. URL Construction
  assert.strictEqual(
    getTmdbImageUrl("/6GAvS2e6VIRsms9FpVt33PsCoEW.jpg", "w500"),
    "https://image.tmdb.org/t/p/w500/6GAvS2e6VIRsms9FpVt33PsCoEW.jpg",
    "Constructs valid w500 URL"
  );
  assert.strictEqual(
    getTmdbImageUrl("/6GAvS2e6VIRsms9FpVt33PsCoEW.jpg", "w1280"),
    "https://image.tmdb.org/t/p/w1280/6GAvS2e6VIRsms9FpVt33PsCoEW.jpg",
    "Constructs valid w1280 backdrop URL"
  );
  assert.strictEqual(
    getTmdbImageUrl("homeland.jpg"),
    null,
    "getTmdbImageUrl('homeland.jpg') must return null (fallback to placeholder)"
  );
  assert.strictEqual(
    getTmdbImageUrl("/homeland.jpg"),
    null,
    "getTmdbImageUrl('/homeland.jpg') must return null (fallback to placeholder)"
  );
  assert.strictEqual(
    getTmdbImageUrl(null),
    null,
    "getTmdbImageUrl(null) must return null"
  );

  console.log("✓ TMDB Image Guard tests passed (7 of 7 scenarios).");
}
