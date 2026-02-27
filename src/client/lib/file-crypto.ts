import { KV_INLINE_THRESHOLD } from "@shared/constants";
import { decryptBytes, encrypt, encryptBytes, fromBase64Url, toBase64Url } from "./crypto";

export interface EncryptedFile {
  /** Encrypted JSON string of {name, type, size} */
  encryptedMeta: string;
  /** "kv" if encrypted size <= KV_INLINE_THRESHOLD, else "r2" */
  storage: "kv" | "r2";
  /** Base64url-encoded encrypted data (for KV-inline files) */
  data?: string;
  /** Raw encrypted bytes (for R2 files, sent as blob in FormData) */
  blob?: Uint8Array;
}

export async function encryptFile(file: File, passphrase: string): Promise<EncryptedFile> {
  const arrayBuffer = await file.arrayBuffer();
  const encryptedData = await encryptBytes(arrayBuffer, passphrase);

  const meta = JSON.stringify({
    name: file.name,
    type: file.type,
    size: file.size,
  });
  const encryptedMeta = await encrypt(meta, passphrase);

  const isKV = encryptedData.byteLength <= KV_INLINE_THRESHOLD;

  if (isKV) {
    return {
      encryptedMeta,
      storage: "kv",
      data: toBase64Url(encryptedData.buffer as ArrayBuffer),
    };
  }

  return {
    encryptedMeta,
    storage: "r2",
    blob: encryptedData,
  };
}

export interface DecryptedFileMeta {
  name: string;
  type: string;
  size: number;
}

export async function decryptFileData(
  encryptedData: string,
  passphrase: string,
): Promise<ArrayBuffer> {
  const bytes = fromBase64Url(encryptedData);
  return decryptBytes(bytes, passphrase);
}
