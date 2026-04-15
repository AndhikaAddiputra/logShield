/**
 * AES-256-GCM for sensitive payloads (UU PDP–oriented).
 * Uses Web Crypto (Capacitor / modern browsers). Key: 256-bit raw.
 */

const ALGO = "AES-GCM" as const;
const IV_LENGTH = 12;

function toBuf(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}

export async function importAes256KeyFromBytes(keyBytes: Uint8Array): Promise<CryptoKey> {
  if (keyBytes.byteLength !== 32) {
    throw new Error("AES-256 key must be 32 bytes");
  }
  return crypto.subtle.importKey("raw", toBuf(keyBytes), ALGO, false, [
    "encrypt",
    "decrypt",
  ]);
}

/** Returns base64(iv || ciphertext) */
export async function aes256GcmEncrypt(
  key: CryptoKey,
  plaintext: string
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const enc = new TextEncoder();
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: ALGO, iv },
      key,
      enc.encode(plaintext)
    )
  );
  const combined = new Uint8Array(iv.length + ct.length);
  combined.set(iv, 0);
  combined.set(ct, iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function aes256GcmDecrypt(
  key: CryptoKey,
  payloadB64: string
): Promise<string> {
  const raw = Uint8Array.from(atob(payloadB64), (c) => c.charCodeAt(0));
  const iv = raw.slice(0, IV_LENGTH);
  const data = raw.slice(IV_LENGTH);
  const dec = await crypto.subtle.decrypt({ name: ALGO, iv }, key, toBuf(data));
  return new TextDecoder().decode(dec);
}
