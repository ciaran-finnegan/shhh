import { beforeEach, describe, expect, it } from "vitest";
import { handleCreate, handleRetrieve } from "../../src/worker/handlers";
import type { Env } from "../../src/worker/types";

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
    put: async (key: string, value: ArrayBuffer | ReadableStream | string) => {
      if (value instanceof ArrayBuffer) {
        store.set(key, value);
      } else if (typeof value === "string") {
        store.set(key, new TextEncoder().encode(value).buffer);
      }
      return {} as R2Object;
    },
    get: async (key: string) => {
      const data = store.get(key);
      if (!data) return null;
      return {
        arrayBuffer: async () => data,
      } as R2ObjectBody;
    },
    delete: async (key: string | string[]) => {
      if (Array.isArray(key)) {
        for (const k of key) store.delete(k);
      } else {
        store.delete(key);
      }
    },
    head: async () => null,
    list: async () => ({
      objects: [],
      truncated: false,
      delimitedPrefixes: [],
    }),
    createMultipartUpload: async () => ({}) as R2MultipartUpload,
    resumeMultipartUpload: async () => ({}) as R2MultipartUpload,
  } as unknown as R2Bucket;
}

function createEnv(): Env {
  return {
    SECRETS: createMockKV(),
    RATE_LIMITS: createMockKV(),
    ASSETS: {} as Fetcher,
    FILES: createMockR2(),
  };
}

describe("handleCreate multipart (file uploads)", () => {
  let env: Env;

  beforeEach(() => {
    env = createEnv();
  });

  it("creates a v2 secret with text + KV file", async () => {
    const manifest = {
      ttl: 3600,
      text: "encrypted-text-data",
      files: [
        {
          encryptedMeta: "encrypted-meta-001",
          storage: "kv",
          data: "base64url-encrypted-file-data",
        },
      ],
    };

    const formData = new FormData();
    formData.append("manifest", JSON.stringify(manifest));

    const req = new Request("https://example.com/api/secrets", {
      method: "POST",
      headers: { "CF-Connecting-IP": "127.0.0.1" },
      body: formData,
    });

    const res = await handleCreate(req, env);
    expect(res.status).toBe(201);
    const json = (await res.json()) as { id: string; expiresIn: number };
    expect(json.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(json.expiresIn).toBe(3600);
  });

  it("creates a v2 secret with R2 file", async () => {
    const manifest = {
      ttl: 3600,
      files: [
        {
          encryptedMeta: "encrypted-meta-r2",
          storage: "r2",
        },
      ],
    };

    const formData = new FormData();
    formData.append("manifest", JSON.stringify(manifest));
    formData.append("file-0", new Blob([new Uint8Array([1, 2, 3])]));

    const req = new Request("https://example.com/api/secrets", {
      method: "POST",
      headers: { "CF-Connecting-IP": "127.0.0.1" },
      body: formData,
    });

    const res = await handleCreate(req, env);
    expect(res.status).toBe(201);
  });

  it("rejects multipart with missing manifest", async () => {
    const formData = new FormData();
    formData.append("not-manifest", "something");

    const req = new Request("https://example.com/api/secrets", {
      method: "POST",
      headers: { "CF-Connecting-IP": "127.0.0.1" },
      body: formData,
    });

    const res = await handleCreate(req, env);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("manifest");
  });

  it("rejects manifest with neither text nor files", async () => {
    const formData = new FormData();
    formData.append("manifest", JSON.stringify({ ttl: 3600 }));

    const req = new Request("https://example.com/api/secrets", {
      method: "POST",
      headers: { "CF-Connecting-IP": "127.0.0.1" },
      body: formData,
    });

    const res = await handleCreate(req, env);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("At least text or files required");
  });

  it("rejects R2 file without blob in form data", async () => {
    const manifest = {
      ttl: 3600,
      files: [{ encryptedMeta: "meta", storage: "r2" }],
    };

    const formData = new FormData();
    formData.append("manifest", JSON.stringify(manifest));
    // Deliberately not adding file-0

    const req = new Request("https://example.com/api/secrets", {
      method: "POST",
      headers: { "CF-Connecting-IP": "127.0.0.1" },
      body: formData,
    });

    const res = await handleCreate(req, env);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("file blob");
  });
});

describe("handleRetrieve v2", () => {
  let env: Env;

  beforeEach(() => {
    env = createEnv();
  });

  it("returns v2 envelope with KV inline file", async () => {
    const id = crypto.randomUUID();
    const envelope = {
      v: 2,
      text: "encrypted-text",
      files: [
        {
          encryptedMeta: "meta-kv",
          storage: "kv",
          data: "inline-data",
        },
      ],
    };
    await env.SECRETS.put(id, JSON.stringify(envelope));

    const req = new Request(`https://example.com/api/secrets/${id}`, {
      headers: { "CF-Connecting-IP": "127.0.0.1" },
    });
    const res = await handleRetrieve(req, env, id);
    expect(res.status).toBe(200);

    const json = (await res.json()) as {
      v: number;
      text?: string;
      files?: Array<{ encryptedMeta: string; data: string }>;
    };
    expect(json.v).toBe(2);
    expect(json.text).toBe("encrypted-text");
    expect(json.files).toHaveLength(1);
    expect(json.files![0].encryptedMeta).toBe("meta-kv");
    expect(json.files![0].data).toBe("inline-data");
  });

  it("returns v2 envelope with R2 file and cleans up", async () => {
    const id = crypto.randomUUID();
    const r2Key = `${id}/0`;

    // Put R2 data
    const fileData = new Uint8Array([10, 20, 30, 40]);
    await env.FILES.put(r2Key, fileData.buffer);

    const envelope = {
      v: 2,
      files: [
        {
          encryptedMeta: "meta-r2",
          storage: "r2",
          r2Key,
        },
      ],
    };
    await env.SECRETS.put(id, JSON.stringify(envelope));

    const req = new Request(`https://example.com/api/secrets/${id}`, {
      headers: { "CF-Connecting-IP": "127.0.0.1" },
    });
    const res = await handleRetrieve(req, env, id);
    expect(res.status).toBe(200);

    const json = (await res.json()) as {
      v: number;
      files?: Array<{ encryptedMeta: string; data: string }>;
    };
    expect(json.v).toBe(2);
    expect(json.files).toHaveLength(1);
    expect(json.files![0].data).toBeTruthy();

    // R2 object should be deleted
    const r2After = await env.FILES.get(r2Key);
    expect(r2After).toBeNull();
  });

  it("backward compat: v1 plain ciphertext still works", async () => {
    const id = crypto.randomUUID();
    await env.SECRETS.put(id, "legacy-ciphertext-string");

    const req = new Request(`https://example.com/api/secrets/${id}`, {
      headers: { "CF-Connecting-IP": "127.0.0.1" },
    });
    const res = await handleRetrieve(req, env, id);
    expect(res.status).toBe(200);

    const json = (await res.json()) as { ciphertext: string };
    expect(json.ciphertext).toBe("legacy-ciphertext-string");
  });

  it("one-time read: second retrieve returns 404", async () => {
    const id = crypto.randomUUID();
    await env.SECRETS.put(id, JSON.stringify({ v: 2, text: "one-time" }));

    const req = new Request(`https://example.com/api/secrets/${id}`, {
      headers: { "CF-Connecting-IP": "127.0.0.1" },
    });

    const res1 = await handleRetrieve(req, env, id);
    expect(res1.status).toBe(200);

    const res2 = await handleRetrieve(req, env, id);
    expect(res2.status).toBe(404);
  });
});
