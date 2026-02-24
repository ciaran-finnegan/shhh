import { describe, it, expect, beforeEach } from "vitest";
import { encrypt, decrypt } from "../../src/client/lib/crypto";
import { generatePassphrase } from "../../src/client/lib/passphrase";

/**
 * End-to-end flow test: simulates the full create -> retrieve -> gone lifecycle.
 * Uses mock KV (same as worker tests) to test the complete chain without a running server.
 */

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
    getWithMetadata: async () => ({ value: null, metadata: null, cacheStatus: null }),
  } as unknown as KVNamespace;
}

describe("E2E: full secret lifecycle", () => {
  let secretsKV: KVNamespace;

  beforeEach(() => {
    secretsKV = createMockKV();
  });

  it("encrypt -> store -> retrieve -> decrypt -> gone", async () => {
    // 1. Sender creates secret
    const secret = "my super secret API key: sk-1234567890";
    const passphrase = generatePassphrase();
    const ciphertext = await encrypt(secret, passphrase);

    // 2. Store in KV (simulating POST /api/secrets)
    const id = crypto.randomUUID();
    await secretsKV.put(id, ciphertext, { expirationTtl: 3600 });

    // 3. Recipient retrieves (simulating GET /api/secrets/:id)
    const retrieved = await secretsKV.get(id);
    expect(retrieved).toBe(ciphertext);

    // 4. Delete after retrieval (one-time read)
    await secretsKV.delete(id);

    // 5. Recipient decrypts
    const plaintext = await decrypt(retrieved!, passphrase);
    expect(plaintext).toBe(secret);

    // 6. Verify it's gone
    const gone = await secretsKV.get(id);
    expect(gone).toBeNull();
  });

  it("wrong passphrase fails decryption", async () => {
    const secret = "sensitive data";
    const correctPassphrase = generatePassphrase();
    const wrongPassphrase = generatePassphrase();

    const ciphertext = await encrypt(secret, correctPassphrase);
    const id = crypto.randomUUID();
    await secretsKV.put(id, ciphertext);

    const retrieved = await secretsKV.get(id);
    await expect(decrypt(retrieved!, wrongPassphrase)).rejects.toThrow(
      "Wrong passphrase or corrupted data",
    );
  });

  it("handles unicode secrets end-to-end", async () => {
    const secret = "密码是: P@$$w0rd! 🔐 Ñoño";
    const passphrase = generatePassphrase(6);

    const ciphertext = await encrypt(secret, passphrase);
    const id = crypto.randomUUID();
    await secretsKV.put(id, ciphertext, { expirationTtl: 300 });

    const retrieved = await secretsKV.get(id);
    await secretsKV.delete(id);

    const plaintext = await decrypt(retrieved!, passphrase);
    expect(plaintext).toBe(secret);
  });
});
