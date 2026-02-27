import { IV_BYTES, PBKDF2_ITERATIONS, SALT_BYTES } from "@shared/constants";

const ALGO = "AES-GCM";
const KEY_BITS = 256;

export function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGO, length: KEY_BITS },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encrypt(plaintext: string, passphrase: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    encoder.encode(plaintext),
  );

  // Concatenate: salt[16] || iv[12] || ciphertext+authTag
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return toBase64Url(combined.buffer);
}

export async function decrypt(blob: string, passphrase: string): Promise<string> {
  const data = fromBase64Url(blob);

  const salt = data.slice(0, SALT_BYTES);
  const iv = data.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const ciphertext = data.slice(SALT_BYTES + IV_BYTES);

  const key = await deriveKey(passphrase, salt);

  try {
    const decrypted = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error("Wrong passphrase or corrupted data");
  }
}

export async function encryptBytes(data: ArrayBuffer, passphrase: string): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt);

  const ciphertext = await crypto.subtle.encrypt({ name: ALGO, iv }, key, data);

  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return combined;
}

export async function decryptBytes(
  encrypted: Uint8Array,
  passphrase: string,
): Promise<ArrayBuffer> {
  const salt = encrypted.slice(0, SALT_BYTES);
  const iv = encrypted.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const ciphertext = encrypted.slice(SALT_BYTES + IV_BYTES);

  const key = await deriveKey(passphrase, salt);

  try {
    return await crypto.subtle.decrypt({ name: ALGO, iv }, key, ciphertext);
  } catch {
    throw new Error("Wrong passphrase or corrupted data");
  }
}

export function generateId(): string {
  return crypto.randomUUID();
}
