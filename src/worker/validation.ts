import { MAX_CIPHERTEXT_BYTES, TTL_MIN, TTL_MAX } from "@shared/constants";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export interface CreateBody {
  ciphertext: string;
  ttl: number;
}

export function validateCreateBody(body: unknown): CreateBody {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ValidationError("Invalid request body");
  }

  const obj = body as Record<string, unknown>;
  const allowed = new Set(["ciphertext", "ttl"]);
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      throw new ValidationError(`Unexpected field: ${key}`);
    }
  }

  if (typeof obj.ciphertext !== "string" || obj.ciphertext.length === 0) {
    throw new ValidationError("ciphertext is required");
  }

  if (new TextEncoder().encode(obj.ciphertext).length > MAX_CIPHERTEXT_BYTES) {
    throw new ValidationError(
      `ciphertext exceeds maximum size of ${MAX_CIPHERTEXT_BYTES} bytes`,
    );
  }

  if (typeof obj.ttl !== "number" || !Number.isInteger(obj.ttl)) {
    throw new ValidationError("ttl must be an integer");
  }

  if (obj.ttl < TTL_MIN || obj.ttl > TTL_MAX) {
    throw new ValidationError(`ttl must be between ${TTL_MIN} and ${TTL_MAX}`);
  }

  return { ciphertext: obj.ciphertext, ttl: obj.ttl };
}

export function validateUUID(id: string): boolean {
  return UUID_RE.test(id);
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
