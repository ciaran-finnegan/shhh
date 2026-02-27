import { describe, expect, it } from "vitest";
import { decrypt, encrypt, generateId } from "../../src/client/lib/crypto";
import { IV_BYTES, SALT_BYTES } from "../../src/shared/constants";

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

describe("encrypt / decrypt", () => {
  it("round-trips plaintext correctly", async () => {
    const plaintext = "hello world";
    const passphrase = "test-passphrase-123";
    const blob = await encrypt(plaintext, passphrase);
    const result = await decrypt(blob, passphrase);
    expect(result).toBe(plaintext);
  });

  it("throws on wrong passphrase", async () => {
    const blob = await encrypt("secret data", "correct-passphrase");
    await expect(decrypt(blob, "wrong-passphrase")).rejects.toThrow(
      "Wrong passphrase or corrupted data",
    );
  });

  it("handles unicode content", async () => {
    const plaintext = "Hello 世界! 🔐 Ñoño café résumé";
    const passphrase = "unicode-pass-日本語";
    const blob = await encrypt(plaintext, passphrase);
    const result = await decrypt(blob, passphrase);
    expect(result).toBe(plaintext);
  });

  it("handles empty string", async () => {
    const blob = await encrypt("", "passphrase");
    const result = await decrypt(blob, "passphrase");
    expect(result).toBe("");
  });

  it("produces output with correct salt/iv prefix lengths", async () => {
    const blob = await encrypt("test", "pass");
    const data = fromBase64Url(blob);
    // At minimum: 16 bytes salt + 12 bytes IV + some ciphertext
    expect(data.length).toBeGreaterThanOrEqual(SALT_BYTES + IV_BYTES + 1);
  });

  it("produces different ciphertext each time (random salt/iv)", async () => {
    const plaintext = "same content";
    const passphrase = "same passphrase";
    const blob1 = await encrypt(plaintext, passphrase);
    const blob2 = await encrypt(plaintext, passphrase);
    expect(blob1).not.toBe(blob2);
  });

  it("produces base64url output (no +, /, or =)", async () => {
    const blob = await encrypt("test data here", "passphrase");
    expect(blob).not.toMatch(/[+/=]/);
  });
});

describe("generateId", () => {
  it("returns a valid UUID v4", () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});
