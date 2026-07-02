const ENCRYPTION_KEY = "ems_ai_config_2024_secure_key";

export function encryptApiKey(key: string): string {
  // Simple base64 + reversal obfuscation (not cryptographic but prevents plaintext storage)
  const encoded = Buffer.from(key).toString("base64");
  return encoded.split("").reverse().join("");
}

export function decryptApiKey(encrypted: string): string {
  try {
    const reversed = encrypted.split("").reverse().join("");
    const decoded = Buffer.from(reversed, "base64").toString("utf-8");
    // If the result looks like valid text (printable ASCII), return it
    if (decoded && /^[\x20-\x7E\n\r\t]+$/.test(decoded)) {
      return decoded;
    }
  } catch {
    // Base64 decode failed — key might be plain text
  }
  // Fallback: return as-is (handles plain-text keys stored before encryption was added)
  return encrypted;
}