import { beforeEach, describe, expect, it } from "vitest";
import {
  decrypt,
  decryptBytes,
  encrypt,
  encryptBytes,
  fromBase64Url,
  toBase64Url,
} from "../../src/client/lib/crypto";
import { generatePassphrase } from "../../src/client/lib/passphrase";

function createMockKV(): KVNamespace {
  const store = new Map<string, { value: string; expiration?: number }>();
  return {
    get: async (key: string) => {
      const entry = store.get(key);
      return entry ? entry.value : null;
    },
    put: async (key: string, value: string, opts?: { expirationTtl?: number }) => {
      store.set(key, { value, expiration: opts?.expirationTtl });
    },
    delete: async (key: string) => {
      store.delete(key);
    },
    list: async () => ({ keys: [], list_complete: true, cacheStatus: null }),
    getWithMetadata: async () => ({
      value: null,
      metadata: null,
      cacheStatus: null,
    }),
  } as unknown as KVNamespace;
}

function createMockR2(): R2Bucket {
  const store = new Map<string, ArrayBuffer>();
  return {
    put: async (key: string, value: ArrayBuffer) => {
      store.set(key, value);
      return {} as R2Object;
    },
    get: async (key: string) => {
      const data = store.get(key);
      if (!data) return null;
      return { arrayBuffer: async () => data } as R2ObjectBody;
    },
    delete: async (key: string) => {
      store.delete(key);
    },
  } as unknown as R2Bucket;
}

describe("E2E: file upload lifecycle", () => {
  let secretsKV: KVNamespace;
  let filesR2: R2Bucket;

  beforeEach(() => {
    secretsKV = createMockKV();
    filesR2 = createMockR2();
  });

  it("encrypt file -> store -> retrieve -> decrypt -> verify deleted", async () => {
    const passphrase = generatePassphrase();
    const fileContent = new TextEncoder().encode("SSH key content here");

    // 1. Sender encrypts file content and metadata
    const encryptedData = await encryptBytes(fileContent.buffer, passphrase);
    const meta = JSON.stringify({
      name: "id_rsa",
      type: "text/plain",
      size: fileContent.length,
    });
    const encryptedMeta = await encrypt(meta, passphrase);
    const encryptedText = await encrypt("Here is my SSH key", passphrase);

    // 2. Store in KV+R2 (simulating multipart POST)
    const id = crypto.randomUUID();
    const r2Key = `${id}/0`;
    await filesR2.put(r2Key, encryptedData.buffer);

    const envelope = {
      v: 2,
      text: encryptedText,
      files: [
        {
          encryptedMeta,
          storage: "r2",
          r2Key,
        },
      ],
    };
    await secretsKV.put(id, JSON.stringify(envelope), {
      expirationTtl: 3600,
    });

    // 3. Recipient retrieves
    const raw = await secretsKV.get(id);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.v).toBe(2);

    // 4. Decrypt text
    const plaintext = await decrypt(parsed.text, passphrase);
    expect(plaintext).toBe("Here is my SSH key");

    // 5. Fetch R2 file and decrypt
    const r2Obj = await filesR2.get(parsed.files[0].r2Key);
    expect(r2Obj).toBeTruthy();
    const r2Buf = await r2Obj!.arrayBuffer();
    const decryptedContent = await decryptBytes(new Uint8Array(r2Buf), passphrase);
    expect(new TextDecoder().decode(decryptedContent)).toBe("SSH key content here");

    // 6. Decrypt metadata
    const decryptedMeta = await decrypt(parsed.files[0].encryptedMeta, passphrase);
    const metaParsed = JSON.parse(decryptedMeta);
    expect(metaParsed.name).toBe("id_rsa");
    expect(metaParsed.type).toBe("text/plain");
    expect(metaParsed.size).toBe(fileContent.length);

    // 7. Clean up (one-time read)
    await secretsKV.delete(id);
    await filesR2.delete(r2Key);

    // 8. Verify deleted
    expect(await secretsKV.get(id)).toBeNull();
    expect(await filesR2.get(r2Key)).toBeNull();
  });

  it("text-only v2 envelope round-trips", async () => {
    const passphrase = generatePassphrase();
    const encryptedText = await encrypt("just text, no files", passphrase);

    const id = crypto.randomUUID();
    const envelope = { v: 2, text: encryptedText };
    await secretsKV.put(id, JSON.stringify(envelope));

    const raw = await secretsKV.get(id);
    const parsed = JSON.parse(raw!);
    expect(parsed.v).toBe(2);

    const plaintext = await decrypt(parsed.text, passphrase);
    expect(plaintext).toBe("just text, no files");
  });

  it("KV-inline file round-trips", async () => {
    const passphrase = generatePassphrase();
    const smallContent = new Uint8Array([1, 2, 3, 4, 5]);

    const encryptedData = await encryptBytes(smallContent.buffer, passphrase);
    const dataB64 = toBase64Url(encryptedData.buffer);
    const encryptedMeta = await encrypt(
      JSON.stringify({ name: "tiny.bin", type: "application/octet-stream", size: 5 }),
      passphrase,
    );

    const id = crypto.randomUUID();
    const envelope = {
      v: 2,
      files: [{ encryptedMeta, storage: "kv", data: dataB64 }],
    };
    await secretsKV.put(id, JSON.stringify(envelope));

    const raw = await secretsKV.get(id);
    const parsed = JSON.parse(raw!);
    const fileEntry = parsed.files[0];

    const encBytes = fromBase64Url(fileEntry.data);
    const decrypted = await decryptBytes(encBytes, passphrase);
    expect(new Uint8Array(decrypted)).toEqual(smallContent);
  });
});
