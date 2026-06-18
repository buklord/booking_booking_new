import { test } from "node:test";
import assert from "node:assert/strict";

// Use a deterministic key for the test run.
process.env.CREDENTIALS_ENCRYPTION_KEY =
  "0".repeat(64); // 32 bytes of zeros, hex

const { encrypt, decrypt } = await import("../src/lib/crypto.js");

test("encrypt/decrypt round-trips a DVSA password", () => {
  const secret = "super-secret-dvsa-password!";
  const blob = encrypt(secret);
  assert.notEqual(blob, secret);
  assert.equal(blob.split(":").length, 3);
  assert.equal(decrypt(blob), secret);
});

test("encrypt produces a different ciphertext each time", () => {
  const a = encrypt("same-input");
  const b = encrypt("same-input");
  assert.notEqual(a, b);
  assert.equal(decrypt(a), "same-input");
  assert.equal(decrypt(b), "same-input");
});

test("null inputs return null", () => {
  assert.equal(encrypt(null), null);
  assert.equal(decrypt(null), null);
});
