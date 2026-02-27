import { describe, expect, it } from "vitest";
import { MAX_CIPHERTEXT_BYTES, MAX_FILES, TTL_MAX, TTL_MIN } from "../../src/shared/constants";
import {
  ValidationError,
  validateCreateBody,
  validateCreateManifest,
  validateUUID,
} from "../../src/worker/validation";

describe("validateCreateBody", () => {
  it("accepts valid body", () => {
    const result = validateCreateBody({ ciphertext: "data", ttl: 3600 });
    expect(result.ciphertext).toBe("data");
    expect(result.ttl).toBe(3600);
  });

  it("rejects non-object", () => {
    expect(() => validateCreateBody("string")).toThrow(ValidationError);
    expect(() => validateCreateBody(null)).toThrow(ValidationError);
    expect(() => validateCreateBody([])).toThrow(ValidationError);
  });

  it("rejects empty ciphertext", () => {
    expect(() => validateCreateBody({ ciphertext: "", ttl: 3600 })).toThrow(
      "ciphertext is required",
    );
  });

  it("rejects oversized ciphertext", () => {
    const large = "x".repeat(MAX_CIPHERTEXT_BYTES + 1);
    expect(() => validateCreateBody({ ciphertext: large, ttl: 3600 })).toThrow(
      "exceeds maximum size",
    );
  });

  it("rejects non-integer ttl", () => {
    expect(() => validateCreateBody({ ciphertext: "data", ttl: 3600.5 })).toThrow(
      "ttl must be an integer",
    );
  });

  it("rejects ttl below minimum", () => {
    expect(() => validateCreateBody({ ciphertext: "data", ttl: TTL_MIN - 1 })).toThrow(
      `ttl must be between ${TTL_MIN} and ${TTL_MAX}`,
    );
  });

  it("rejects ttl above maximum", () => {
    expect(() => validateCreateBody({ ciphertext: "data", ttl: TTL_MAX + 1 })).toThrow(
      `ttl must be between ${TTL_MIN} and ${TTL_MAX}`,
    );
  });

  it("accepts boundary TTL values", () => {
    expect(validateCreateBody({ ciphertext: "d", ttl: TTL_MIN }).ttl).toBe(TTL_MIN);
    expect(validateCreateBody({ ciphertext: "d", ttl: TTL_MAX }).ttl).toBe(TTL_MAX);
  });

  it("rejects unexpected fields", () => {
    expect(() => validateCreateBody({ ciphertext: "data", ttl: 3600, hack: true })).toThrow(
      "Unexpected field: hack",
    );
  });
});

describe("validateCreateManifest", () => {
  it("accepts valid manifest with text only", () => {
    const result = validateCreateManifest({ ttl: 3600, text: "encrypted" });
    expect(result.ttl).toBe(3600);
    expect(result.text).toBe("encrypted");
  });

  it("accepts valid manifest with files only", () => {
    const result = validateCreateManifest({
      ttl: 3600,
      files: [{ encryptedMeta: "meta", storage: "kv", data: "filedata" }],
    });
    expect(result.files).toHaveLength(1);
  });

  it("accepts manifest with text and files", () => {
    const result = validateCreateManifest({
      ttl: 3600,
      text: "text",
      files: [{ encryptedMeta: "meta", storage: "r2" }],
    });
    expect(result.text).toBe("text");
    expect(result.files).toHaveLength(1);
  });

  it("rejects manifest with neither text nor files", () => {
    expect(() => validateCreateManifest({ ttl: 3600 })).toThrow("At least text or files required");
  });

  it("rejects invalid TTL", () => {
    expect(() => validateCreateManifest({ ttl: 10, text: "x" })).toThrow("ttl must be between");
  });

  it("rejects too many files", () => {
    const files = Array.from({ length: MAX_FILES + 1 }, (_, i) => ({
      encryptedMeta: `meta-${i}`,
      storage: "kv" as const,
      data: "d",
    }));
    expect(() => validateCreateManifest({ ttl: 3600, files })).toThrow(
      `Maximum ${MAX_FILES} files`,
    );
  });

  it("rejects KV file without data", () => {
    expect(() =>
      validateCreateManifest({
        ttl: 3600,
        files: [{ encryptedMeta: "meta", storage: "kv" }],
      }),
    ).toThrow("data is required for KV");
  });

  it("rejects file with invalid storage type", () => {
    expect(() =>
      validateCreateManifest({
        ttl: 3600,
        files: [{ encryptedMeta: "meta", storage: "s3" }],
      }),
    ).toThrow('storage must be "kv" or "r2"');
  });

  it("rejects file with empty encryptedMeta", () => {
    expect(() =>
      validateCreateManifest({
        ttl: 3600,
        files: [{ encryptedMeta: "", storage: "kv", data: "d" }],
      }),
    ).toThrow("encryptedMeta is required");
  });

  it("rejects unexpected fields", () => {
    expect(() => validateCreateManifest({ ttl: 3600, text: "x", hack: true })).toThrow(
      "Unexpected field: hack",
    );
  });
});

describe("validateUUID", () => {
  it("accepts valid UUID v4", () => {
    expect(validateUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(validateUUID("not-a-uuid")).toBe(false);
    expect(validateUUID("")).toBe(false);
    expect(validateUUID("550e8400-e29b-31d4-a716-446655440000")).toBe(false); // v3
  });
});
