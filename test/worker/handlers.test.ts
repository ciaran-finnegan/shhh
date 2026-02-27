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
    getWithMetadata: async () => ({ value: null, metadata: null, cacheStatus: null }),
  } as unknown as KVNamespace;
}

function createEnv(): Env {
  return {
    SECRETS: createMockKV(),
    RATE_LIMITS: createMockKV(),
    ASSETS: {} as Fetcher,
    FILES: {} as R2Bucket,
  };
}

function makeRequest(method: string, body?: unknown, ip = "127.0.0.1"): Request {
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "CF-Connecting-IP": ip,
    },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new Request("https://example.com/api/secrets", init);
}

describe("handleCreate", () => {
  let env: Env;

  beforeEach(() => {
    env = createEnv();
  });

  it("creates a secret and returns 201", async () => {
    const req = makeRequest("POST", { ciphertext: "encrypted-data", ttl: 3600 });
    const res = await handleCreate(req, env);
    expect(res.status).toBe(201);
    const json = (await res.json()) as { id: string; expiresIn: number };
    expect(json.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(json.expiresIn).toBe(3600);
  });

  it("rejects invalid JSON", async () => {
    const req = new Request("https://example.com/api/secrets", {
      method: "POST",
      body: "not json",
      headers: { "CF-Connecting-IP": "127.0.0.1" },
    });
    const res = await handleCreate(req, env);
    expect(res.status).toBe(400);
  });

  it("rejects missing ciphertext", async () => {
    const req = makeRequest("POST", { ttl: 3600 });
    const res = await handleCreate(req, env);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("ciphertext");
  });

  it("rejects invalid ttl", async () => {
    const req = makeRequest("POST", { ciphertext: "data", ttl: 10 });
    const res = await handleCreate(req, env);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("ttl");
  });

  it("rejects unexpected fields", async () => {
    const req = makeRequest("POST", {
      ciphertext: "data",
      ttl: 3600,
      extra: "field",
    });
    const res = await handleCreate(req, env);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("Unexpected field");
  });
});

describe("handleRetrieve", () => {
  let env: Env;

  beforeEach(() => {
    env = createEnv();
  });

  it("retrieves and deletes a secret (one-time read)", async () => {
    // Store a secret directly in KV
    const id = crypto.randomUUID();
    await env.SECRETS.put(id, "encrypted-data");

    const req = new Request(`https://example.com/api/secrets/${id}`, {
      headers: { "CF-Connecting-IP": "127.0.0.1" },
    });
    const res = await handleRetrieve(req, env, id);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ciphertext: string };
    expect(json.ciphertext).toBe("encrypted-data");

    // Second retrieval should 404
    const res2 = await handleRetrieve(req, env, id);
    expect(res2.status).toBe(404);
  });

  it("returns 404 for non-existent secret", async () => {
    const id = crypto.randomUUID();
    const req = new Request(`https://example.com/api/secrets/${id}`, {
      headers: { "CF-Connecting-IP": "127.0.0.1" },
    });
    const res = await handleRetrieve(req, env, id);
    expect(res.status).toBe(404);
  });

  it("returns 404 for invalid UUID format", async () => {
    const req = new Request("https://example.com/api/secrets/not-a-uuid", {
      headers: { "CF-Connecting-IP": "127.0.0.1" },
    });
    const res = await handleRetrieve(req, env, "not-a-uuid");
    expect(res.status).toBe(404);
  });
});

describe("rate limiting", () => {
  it("blocks after exceeding create limit", async () => {
    const env = createEnv();

    // Make 30 requests (the limit)
    for (let i = 0; i < 30; i++) {
      const req = makeRequest("POST", { ciphertext: "data", ttl: 3600 });
      const res = await handleCreate(req, env);
      expect(res.status).toBe(201);
    }

    // 31st should be rate limited
    const req = makeRequest("POST", { ciphertext: "data", ttl: 3600 });
    const res = await handleCreate(req, env);
    expect(res.status).toBe(429);
  });
});
