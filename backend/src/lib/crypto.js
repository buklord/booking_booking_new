import crypto from "node:crypto";
import { env } from "../config.js";

// AES-256-GCM encryption for DVSA passwords at rest.
// CREDENTIALS_ENCRYPTION_KEY must be 64 hex chars (32 bytes).
const ALGO = "aes-256-gcm";

function getKey() {
  const key = env.CREDENTIALS_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). " +
        "Generate one with: openssl rand -hex 32",
    );
  }
  return Buffer.from(key, "hex");
}

export function encrypt(plainText) {
  if (plainText == null) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plainText), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // Store as iv:tag:ciphertext, all hex.
  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decrypt(blob) {
  if (!blob) return null;
  const [ivHex, tagHex, dataHex] = blob.split(":");
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
