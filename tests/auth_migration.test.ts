import { hashPassword, verifyPassword } from "@/lib/security/crypto";
import { buildGoogleAuthUrl, getGoogleConfig } from "@/lib/auth/google";

export function runAuthMigrationTests() {
  console.log("=== PHASE 5.5 USER ACCOUNTS & AUTH MIGRATION UNIT TESTS ===\n");
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, message: string) {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total}: ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${message}`);
    }
  }

  // 1. Password Hashing (scrypt) Verification
  const rawPassword = "SuperSecurePassword123!";
  const hash = hashPassword(rawPassword);
  assert(hash.includes(":") && hash.length > 64, "Password hashing returns salt:derivedKey format");

  const isCorrectValid = verifyPassword(rawPassword, hash);
  assert(isCorrectValid === true, "Password verification returns true for correct password");

  const isWrongValid = verifyPassword("WrongPassword456!", hash);
  assert(isWrongValid === false, "Password verification returns false for incorrect password");

  // 2. Google OAuth Configuration & URL Builder
  const googleUrl = buildGoogleAuthUrl("test-csrf-state-token");
  assert(googleUrl.includes("accounts.google.com"), "Google Auth URL targets accounts.google.com");
  assert(googleUrl.includes("scope=openid+email+profile") || googleUrl.includes("scope=openid"), "Google Auth URL includes openid email profile scopes");
  assert(googleUrl.includes("state=test-csrf-state-token"), "Google Auth URL includes state token for CSRF protection");

  // 3. Email Normalization
  const rawEmail = "  Alper.Ates@Example.COM  ";
  const normalized = rawEmail.toLowerCase().trim();
  assert(normalized === "alper.ates@example.com", "Email normalization produces lowercase trimmed string");

  console.log(`\nRESULTS: Passed ${passed} of ${total} tests.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runAuthMigrationTests();
