import { describe, it, expect } from "vitest";
import {
  validateCreateBody,
  validateUUID,
  ValidationError,
} from "../../src/worker/validation";
import { MAX_CIPHERTEXT_BYTES, TTL_MIN, TTL_MAX } from "../../src/shared/constants";

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
    expect(() =>
      validateCreateBody({ ciphertext: "data", ttl: 3600.5 }),
    ).toThrow("ttl must be an integer");
  });

  it("rejects ttl below minimum", () => {
    expect(() =>
      validateCreateBody({ ciphertext: "data", ttl: TTL_MIN - 1 }),
    ).toThrow(`ttl must be between ${TTL_MIN} and ${TTL_MAX}`);
  });

  it("rejects ttl above maximum", () => {
    expect(() =>
      validateCreateBody({ ciphertext: "data", ttl: TTL_MAX + 1 }),
    ).toThrow(`ttl must be between ${TTL_MIN} and ${TTL_MAX}`);
  });

  it("accepts boundary TTL values", () => {
    expect(validateCreateBody({ ciphertext: "d", ttl: TTL_MIN }).ttl).toBe(TTL_MIN);
    expect(validateCreateBody({ ciphertext: "d", ttl: TTL_MAX }).ttl).toBe(TTL_MAX);
  });

  it("rejects unexpected fields", () => {
    expect(() =>
      validateCreateBody({ ciphertext: "data", ttl: 3600, hack: true }),
    ).toThrow("Unexpected field: hack");
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
