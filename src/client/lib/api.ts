import type { RetrieveFileEntry } from "@shared/types";
import type { EncryptedFile } from "./file-crypto";

interface CreateResponse {
  id: string;
  expiresIn: number;
}

interface RetrieveResponseV1 {
  ciphertext: string;
}

export interface RetrieveResponseV2 {
  v: 2;
  text?: string;
  files?: RetrieveFileEntry[];
}

export type RetrieveResult = RetrieveResponseV1 | RetrieveResponseV2;

interface ErrorResponse {
  error: string;
}

export async function createSecret(ciphertext: string, ttl: number): Promise<CreateResponse> {
  const res = await fetch("/api/secrets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ciphertext, ttl }),
  });

  if (!res.ok) {
    const data = (await res.json()) as ErrorResponse;
    throw new Error(data.error || "Failed to create secret");
  }

  return res.json() as Promise<CreateResponse>;
}

export async function createSecretWithFiles(
  encryptedText: string | null,
  files: EncryptedFile[],
  ttl: number,
): Promise<CreateResponse> {
  const formData = new FormData();

  const manifest: Record<string, unknown> = { ttl };
  if (encryptedText) {
    manifest.text = encryptedText;
  }

  const manifestFiles: Array<{
    encryptedMeta: string;
    storage: string;
    data?: string;
  }> = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (f.storage === "kv") {
      manifestFiles.push({
        encryptedMeta: f.encryptedMeta,
        storage: "kv",
        data: f.data,
      });
    } else {
      manifestFiles.push({
        encryptedMeta: f.encryptedMeta,
        storage: "r2",
      });
      // Add binary blob as form field
      formData.append(`file-${i}`, new Blob([f.blob! as BlobPart]));
    }
  }

  manifest.files = manifestFiles;
  formData.append("manifest", JSON.stringify(manifest));

  const res = await fetch("/api/secrets", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const data = (await res.json()) as ErrorResponse;
    throw new Error(data.error || "Failed to create secret");
  }

  return res.json() as Promise<CreateResponse>;
}

export async function retrieveSecret(id: string): Promise<string> {
  const result = await retrieveSecretV2(id);
  if ("ciphertext" in result) {
    return result.ciphertext;
  }
  return result.text || "";
}

export async function retrieveSecretV2(id: string): Promise<RetrieveResult> {
  const res = await fetch(`/api/secrets/${id}`);

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("This secret has already been opened or never existed.");
    }
    if (res.status === 429) {
      throw new Error("Too many requests. Please wait a moment.");
    }
    const data = (await res.json()) as ErrorResponse;
    throw new Error(data.error || "Failed to retrieve secret");
  }

  return res.json() as Promise<RetrieveResult>;
}
