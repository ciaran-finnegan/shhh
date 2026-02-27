import { MAX_CIPHERTEXT_BYTES, MAX_FILES, TTL_MAX, TTL_MIN } from "@shared/constants";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

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
    throw new ValidationError(`ciphertext exceeds maximum size of ${MAX_CIPHERTEXT_BYTES} bytes`);
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

export interface ManifestFile {
  encryptedMeta: string;
  storage: "kv" | "r2";
  data?: string;
}

export interface CreateManifest {
  ttl: number;
  text?: string;
  files?: ManifestFile[];
}

export function validateCreateManifest(body: unknown): CreateManifest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ValidationError("Invalid manifest");
  }

  const obj = body as Record<string, unknown>;
  const allowed = new Set(["ttl", "text", "files"]);
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      throw new ValidationError(`Unexpected field: ${key}`);
    }
  }

  // Validate TTL
  if (typeof obj.ttl !== "number" || !Number.isInteger(obj.ttl)) {
    throw new ValidationError("ttl must be an integer");
  }
  if (obj.ttl < TTL_MIN || obj.ttl > TTL_MAX) {
    throw new ValidationError(`ttl must be between ${TTL_MIN} and ${TTL_MAX}`);
  }

  // Validate text (optional)
  if (obj.text !== undefined) {
    if (typeof obj.text !== "string") {
      throw new ValidationError("text must be a string");
    }
    if (new TextEncoder().encode(obj.text).length > MAX_CIPHERTEXT_BYTES) {
      throw new ValidationError(`text exceeds maximum size of ${MAX_CIPHERTEXT_BYTES} bytes`);
    }
  }

  // Validate files (optional)
  let files: ManifestFile[] | undefined;
  if (obj.files !== undefined) {
    if (!Array.isArray(obj.files)) {
      throw new ValidationError("files must be an array");
    }
    if (obj.files.length > MAX_FILES) {
      throw new ValidationError(`Maximum ${MAX_FILES} files allowed`);
    }
    files = [];
    for (let i = 0; i < obj.files.length; i++) {
      const f = obj.files[i] as Record<string, unknown>;
      if (typeof f !== "object" || f === null) {
        throw new ValidationError(`files[${i}] is invalid`);
      }
      if (typeof f.encryptedMeta !== "string" || f.encryptedMeta.length === 0) {
        throw new ValidationError(`files[${i}].encryptedMeta is required`);
      }
      if (f.storage !== "kv" && f.storage !== "r2") {
        throw new ValidationError(`files[${i}].storage must be "kv" or "r2"`);
      }
      if (f.storage === "kv") {
        if (typeof f.data !== "string" || f.data.length === 0) {
          throw new ValidationError(`files[${i}].data is required for KV storage`);
        }
      }
      files.push({
        encryptedMeta: f.encryptedMeta as string,
        storage: f.storage,
        data: f.storage === "kv" ? (f.data as string) : undefined,
      });
    }
  }

  // At least text or files required
  if (!obj.text && (!files || files.length === 0)) {
    throw new ValidationError("At least text or files required");
  }

  const result: CreateManifest = { ttl: obj.ttl };
  if (obj.text) result.text = obj.text as string;
  if (files && files.length > 0) result.files = files;
  return result;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
