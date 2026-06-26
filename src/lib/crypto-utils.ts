const ENCRYPTION_KEY = "ems_ai_config_2024_secure_key";

export function encryptApiKey(key: string): string {
  // Simple base64 + reversal obfuscation (not cryptographic but prevents plaintext storage)
  const encoded = Buffer.from(key).toString("base64");
  return encoded.split("").reverse().join("");
}

export function decryptApiKey(encrypted: string): string {
  const reversed = encrypted.split("").reverse().join("");
  return Buffer.from(reversed, "base64").toString("utf-8");
}