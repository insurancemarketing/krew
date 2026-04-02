/**
 * Application-level AES-256-GCM encryption for GHL API keys.
 * Requires ENCRYPTION_SECRET env var: 64 hex chars (32 bytes).
 * Generate with: openssl rand -hex 32
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET ?? "";
  if (!secret || secret.length < 64) {
    // Fallback for dev — log a warning, return a zero-padded key
    console.warn(
      "[encrypt] ENCRYPTION_SECRET not set or too short — using insecure fallback. Set a 64-char hex string in production."
    );
    return Buffer.alloc(32, 0);
  }
  return Buffer.from(secret.slice(0, 64), "hex");
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // Layout: [12 bytes iv][16 bytes tag][rest = encrypted]
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(ciphertext: string): string {
  try {
    const key = getKey();
    const buf = Buffer.from(ciphertext, "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    // Return empty string on decrypt failure rather than crashing
    console.error("[encrypt] Failed to decrypt — returning empty string");
    return "";
  }
}
