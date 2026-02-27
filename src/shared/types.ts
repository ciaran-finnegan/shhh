/** A single encrypted file entry stored in KV */
export interface FileEntry {
  /** Encrypted JSON string containing {name, type, size} */
  encryptedMeta: string;
  /** Where the encrypted file data lives */
  storage: "kv" | "r2";
  /** Base64url-encoded encrypted data (present when storage=kv) */
  data?: string;
  /** R2 object key (present when storage=r2) */
  r2Key?: string;
}

/** V2 envelope stored in KV — supports text + files */
export interface SecretEnvelopeV2 {
  v: 2;
  /** Encrypted text (same format as v1 ciphertext) */
  text?: string;
  /** Encrypted file entries */
  files?: FileEntry[];
}

/** A file entry as returned by the retrieve API */
export interface RetrieveFileEntry {
  /** Encrypted JSON string containing {name, type, size} */
  encryptedMeta: string;
  /** Base64url-encoded encrypted file data */
  data: string;
}

/** V2 retrieve response shape */
export interface RetrieveResponseV2 {
  v: 2;
  text?: string;
  files?: RetrieveFileEntry[];
}
