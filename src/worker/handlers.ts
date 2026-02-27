import type { FileEntry, RetrieveFileEntry, SecretEnvelopeV2 } from "@shared/types";
import { checkRateLimit } from "./rate-limit";
import type { Env } from "./types";
import {
  ValidationError,
  validateCreateBody,
  validateCreateManifest,
  validateUUID,
} from "./validation";

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleCreate(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  const allowed = await checkRateLimit(env, ip, "create");
  if (!allowed) {
    return jsonResponse({ error: "Rate limit exceeded" }, 429);
  }

  const contentType = request.headers.get("Content-Type") || "";

  if (contentType.includes("multipart/form-data")) {
    return handleCreateMultipart(request, env);
  }

  // Legacy JSON flow
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  let validated: ReturnType<typeof validateCreateBody>;
  try {
    validated = validateCreateBody(body);
  } catch (err) {
    if (err instanceof ValidationError) {
      return jsonResponse({ error: err.message }, 400);
    }
    throw err;
  }

  const id = crypto.randomUUID();
  await env.SECRETS.put(id, validated.ciphertext, {
    expirationTtl: validated.ttl,
  });

  return jsonResponse({ id, expiresIn: validated.ttl }, 201);
}

async function handleCreateMultipart(request: Request, env: Env): Promise<Response> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse({ error: "Invalid multipart data" }, 400);
  }

  const manifestField = formData.get("manifest");
  if (typeof manifestField !== "string") {
    return jsonResponse({ error: "Missing manifest field" }, 400);
  }

  let manifestJson: unknown;
  try {
    manifestJson = JSON.parse(manifestField);
  } catch {
    return jsonResponse({ error: "Invalid manifest JSON" }, 400);
  }

  let manifest: ReturnType<typeof validateCreateManifest>;
  try {
    manifest = validateCreateManifest(manifestJson);
  } catch (err) {
    if (err instanceof ValidationError) {
      return jsonResponse({ error: err.message }, 400);
    }
    throw err;
  }

  const id = crypto.randomUUID();

  // Build the V2 envelope
  const envelope: SecretEnvelopeV2 = { v: 2 };
  if (manifest.text) {
    envelope.text = manifest.text;
  }

  if (manifest.files && manifest.files.length > 0) {
    const fileEntries: FileEntry[] = [];

    for (let i = 0; i < manifest.files.length; i++) {
      const mf = manifest.files[i];

      if (mf.storage === "kv") {
        fileEntries.push({
          encryptedMeta: mf.encryptedMeta,
          storage: "kv",
          data: mf.data,
        });
      } else {
        // R2: read binary blob from form field
        const blob = formData.get(`file-${i}`);
        if (blob === null || typeof blob === "string") {
          return jsonResponse({ error: `Missing file blob for file-${i}` }, 400);
        }
        const r2Key = `${id}/${i}`;
        await env.FILES.put(r2Key, await blob.arrayBuffer());

        fileEntries.push({
          encryptedMeta: mf.encryptedMeta,
          storage: "r2",
          r2Key,
        });
      }
    }

    envelope.files = fileEntries;
  }

  await env.SECRETS.put(id, JSON.stringify(envelope), {
    expirationTtl: manifest.ttl,
  });

  return jsonResponse({ id, expiresIn: manifest.ttl }, 201);
}

export async function handleRetrieve(request: Request, env: Env, id: string): Promise<Response> {
  if (!validateUUID(id)) {
    return jsonResponse({ error: "Not found" }, 404);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const allowed = await checkRateLimit(env, ip, "retrieve");
  if (!allowed) {
    return jsonResponse({ error: "Rate limit exceeded" }, 429);
  }

  const raw = await env.SECRETS.get(id);
  if (raw === null) {
    return jsonResponse({ error: "Not found" }, 404);
  }

  // Delete KV entry immediately (one-time read)
  await env.SECRETS.delete(id);

  // Try to detect V2 envelope
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Not JSON — legacy v1 plain ciphertext
    return jsonResponse({ ciphertext: raw });
  }

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    (parsed as Record<string, unknown>).v === 2
  ) {
    const envelope = parsed as SecretEnvelopeV2;
    const responseFiles: RetrieveFileEntry[] = [];

    if (envelope.files) {
      for (const file of envelope.files) {
        if (file.storage === "kv" && file.data) {
          responseFiles.push({
            encryptedMeta: file.encryptedMeta,
            data: file.data,
          });
        } else if (file.storage === "r2" && file.r2Key) {
          const r2Object = await env.FILES.get(file.r2Key);
          if (r2Object) {
            const buf = await r2Object.arrayBuffer();
            const b64 = toBase64Url(buf);
            responseFiles.push({
              encryptedMeta: file.encryptedMeta,
              data: b64,
            });
            // Clean up R2 object
            await env.FILES.delete(file.r2Key);
          }
        }
      }
    }

    const response: Record<string, unknown> = { v: 2 };
    if (envelope.text) response.text = envelope.text;
    if (responseFiles.length > 0) response.files = responseFiles;
    return jsonResponse(response);
  }

  // Parsed as JSON but not v2 — legacy v1 ciphertext stored as JSON string
  return jsonResponse({ ciphertext: raw });
}
