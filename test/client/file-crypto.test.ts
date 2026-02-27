import { describe, expect, it } from "vitest";
import {
  decryptBytes,
  encryptBytes,
  fromBase64Url,
  toBase64Url,
} from "../../src/client/lib/crypto";
import { encryptFile } from "../../src/client/lib/file-crypto";
import { formatFileSize } from "../../src/client/lib/format";
import { KV_INLINE_THRESHOLD } from "../../src/shared/constants";

describe("encryptBytes / decryptBytes", () => {
  it("round-trips binary data", async () => {
    const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const passphrase = "test-passphrase";

    const encrypted = await encryptBytes(original.buffer, passphrase);
    const decrypted = await decryptBytes(encrypted, passphrase);

    expect(new Uint8Array(decrypted)).toEqual(original);
  });

  it("throws on wrong passphrase", async () => {
    const data = new Uint8Array([10, 20, 30]).buffer;
    const encrypted = await encryptBytes(data, "correct");
    await expect(decryptBytes(encrypted, "wrong")).rejects.toThrow(
      "Wrong passphrase or corrupted data",
    );
  });

  it("handles empty buffer", async () => {
    const empty = new ArrayBuffer(0);
    const encrypted = await encryptBytes(empty, "pass");
    const decrypted = await decryptBytes(encrypted, "pass");
    expect(new Uint8Array(decrypted).length).toBe(0);
  });

  it("produces different ciphertext for same input", async () => {
    const data = new Uint8Array([1, 2, 3]).buffer;
    const a = await encryptBytes(data, "pass");
    const b = await encryptBytes(data, "pass");
    expect(toBase64Url(a.buffer)).not.toBe(toBase64Url(b.buffer));
  });

  it("handles large binary data", async () => {
    const large = crypto.getRandomValues(new Uint8Array(64 * 1024));
    const encrypted = await encryptBytes(large.buffer, "big-pass");
    const decrypted = await decryptBytes(encrypted, "big-pass");
    expect(new Uint8Array(decrypted)).toEqual(large);
  });
});

describe("toBase64Url / fromBase64Url", () => {
  it("round-trips", () => {
    const data = new Uint8Array([0, 127, 255, 128, 64]);
    const encoded = toBase64Url(data.buffer);
    const decoded = fromBase64Url(encoded);
    expect(decoded).toEqual(data);
  });

  it("produces URL-safe output", () => {
    const data = crypto.getRandomValues(new Uint8Array(100));
    const encoded = toBase64Url(data.buffer);
    expect(encoded).not.toMatch(/[+/=]/);
  });
});

describe("encryptFile", () => {
  // jsdom's File/Blob don't fully support arrayBuffer(), so create a mock
  function makeFile(name: string, size: number, type = "text/plain"): File {
    const data = new Uint8Array(size);
    const buf = data.buffer;
    return {
      name,
      type,
      size,
      lastModified: Date.now(),
      webkitRelativePath: "",
      arrayBuffer: () => Promise.resolve(buf),
      text: () => Promise.resolve(new TextDecoder().decode(data)),
      slice: () => new Blob(),
      stream: () => new ReadableStream(),
      bytes: () => Promise.resolve(data),
    } as unknown as File;
  }

  it("classifies small file as KV storage", async () => {
    const file = makeFile("small.txt", 100);
    const result = await encryptFile(file, "pass");
    expect(result.storage).toBe("kv");
    expect(result.data).toBeDefined();
    expect(result.blob).toBeUndefined();
    expect(result.encryptedMeta).toBeTruthy();
  });

  it("classifies large file as R2 storage", async () => {
    // Use 2x threshold to ensure encrypted size clearly exceeds limit
    const file = makeFile("big.bin", KV_INLINE_THRESHOLD * 2);
    const result = await encryptFile(file, "pass");
    expect(result.storage).toBe("r2");
    expect(result.blob).toBeDefined();
    expect(result.data).toBeUndefined();
  });

  it("encrypts metadata with file info", async () => {
    const file = makeFile("report.pdf", 500, "application/pdf");
    const result = await encryptFile(file, "pass");
    expect(result.encryptedMeta.length).toBeGreaterThan(0);
    // We can't decrypt here without importing decrypt, but we verify it's non-empty
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(512)).toBe("512 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(1048576)).toBe("1.0 MB");
    expect(formatFileSize(52428800)).toBe("50.0 MB");
  });

  it("formats gigabytes", () => {
    expect(formatFileSize(1073741824)).toBe("1.0 GB");
  });
});
