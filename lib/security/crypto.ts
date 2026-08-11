import crypto from "crypto";

// Fallback key derived for development if MASTER_ENCRYPTION_KEY is omitted
const DEV_FALLBACK_KEY = "filmprint_dev_master_encryption_key_256bit_secret_hash_value_32_bytes";

function getMasterKey(): Buffer {
  const rawKey = process.env.MASTER_ENCRYPTION_KEY || DEV_FALLBACK_KEY;
  return crypto.createHash("sha256").update(rawKey).digest();
}

/**
 * Encrypts a secret using AES-256-GCM authenticated encryption.
 */
export function encryptSecret(plaintext: string): { encryptedValue: string; lastFour: string } {
  const key = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");
  const ivHex = iv.toString("hex");

  const encryptedValue = `${ivHex}:${authTag}:${encrypted}`;
  const lastFour = plaintext.length >= 4 ? plaintext.slice(-4) : plaintext;

  return { encryptedValue, lastFour };
}

/**
 * Decrypts an AES-256-GCM encrypted secret.
 */
export function decryptSecret(encryptedValue: string): string {
  const parts = encryptedValue.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted secret format");
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getMasterKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Strong password hashing using Node.js scrypt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

/**
 * Verifies a password against an scrypt hash.
 */
export function verifyPassword(password: string, passwordHash: string): boolean {
  const parts = passwordHash.split(":");
  if (parts.length !== 2) return false;

  const [salt, key] = parts;
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");

  return crypto.timingSafeEqual(Buffer.from(key, "hex"), Buffer.from(derivedKey, "hex"));
}
