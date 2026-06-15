// AES-256-GCM encryption for provider API keys at rest. The 32-byte key comes
// from AI_CONFIG_SECRET (base64). Ciphertext, iv, and auth tag are stored
// separately on AiProviderConfig; the plaintext key is never persisted.
import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.AI_CONFIG_SECRET;
  if (!secret) {
    throw new Error(
      "AI_CONFIG_SECRET is not set. Generate one with `openssl rand -base64 32` and add it to .env.local."
    );
  }
  const key = Buffer.from(secret, "base64");
  if (key.length !== 32) {
    throw new Error(
      "AI_CONFIG_SECRET must decode to 32 bytes. Generate one with `openssl rand -base64 32`."
    );
  }
  return key;
}

export interface EncryptedSecret {
  enc: string;
  iv: string;
  tag: string;
}

export function encryptSecret(plaintext: string): EncryptedSecret {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    enc: enc.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptSecret(secret: EncryptedSecret): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(secret.iv, "base64"));
  decipher.setAuthTag(Buffer.from(secret.tag, "base64"));
  const dec = Buffer.concat([decipher.update(Buffer.from(secret.enc, "base64")), decipher.final()]);
  return dec.toString("utf8");
}

/** True if AI_CONFIG_SECRET is present and valid — used to surface a clear UI hint. */
export function isCryptoConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}
