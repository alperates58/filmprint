import crypto from "crypto";

export interface GenerateIframeTokenHashInput {
  merchantId: string;
  userIp: string;
  merchantOid: string;
  email: string;
  paymentAmount: number; // in kuruş
  userBasketBase64: string;
  noInstallment: number; // 1
  maxInstallment: number; // 0
  currency: string; // "TL" or "TRY"
  testMode: number; // 0 or 1
  merchantSalt: string;
  merchantKey: string;
}

/**
 * Generates PayTR HMAC-SHA256 Token for hosted checkout iframe.
 * Format: base64(hmac_sha256(hash_str + merchant_salt, merchant_key))
 */
export function generatePaytrIframeToken(input: GenerateIframeTokenHashInput): string {
  const hashStr =
    input.merchantId +
    input.userIp +
    input.merchantOid +
    input.email +
    input.paymentAmount.toString() +
    input.userBasketBase64 +
    input.noInstallment.toString() +
    input.maxInstallment.toString() +
    input.currency +
    input.testMode.toString();

  const tokenConcat = hashStr + input.merchantSalt;
  const hmac = crypto.createHmac("sha256", input.merchantKey);
  hmac.update(tokenConcat);
  return hmac.digest("base64");
}

export interface VerifyCallbackHashInput {
  merchantOid: string;
  merchantSalt: string;
  status: string; // "success" or "failed"
  totalAmount: string; // amount string from payload, e.g. "9900"
  merchantKey: string;
  incomingHash: string;
}

/**
 * Verifies incoming PayTR server-to-server webhook callback signature.
 * Uses timingSafeEqual to prevent timing attacks.
 * Format: hash_str = merchant_oid + merchant_salt + status + total_amount
 * calculated_hash = base64(hmac_sha256(hash_str, merchant_key))
 */
export function verifyPaytrCallbackHash(input: VerifyCallbackHashInput): boolean {
  if (!input.incomingHash || !input.merchantKey || !input.merchantSalt) {
    return false;
  }

  const hashStr = input.merchantOid + input.merchantSalt + input.status + input.totalAmount;
  const hmac = crypto.createHmac("sha256", input.merchantKey);
  hmac.update(hashStr);
  const calculatedHash = hmac.digest("base64");

  const incomingBuffer = Buffer.from(input.incomingHash, "utf8");
  const calculatedBuffer = Buffer.from(calculatedHash, "utf8");

  if (incomingBuffer.length !== calculatedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(incomingBuffer, calculatedBuffer);
}

/**
 * Generates canonical deterministic payload hash for database-level deduplication.
 */
export function generatePayloadHash(merchantOid: string, totalAmount: string, status: string): string {
  return crypto
    .createHash("sha256")
    .update(`${merchantOid}:${totalAmount}:${status}`)
    .digest("hex");
}