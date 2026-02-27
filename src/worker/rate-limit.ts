import { RATE_LIMIT_CREATE, RATE_LIMIT_RETRIEVE, RATE_LIMIT_WINDOW } from "@shared/constants";
import type { Env } from "./types";

const LIMITS: Record<string, number> = {
  create: RATE_LIMIT_CREATE,
  retrieve: RATE_LIMIT_RETRIEVE,
};

async function hashIP(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function checkRateLimit(env: Env, ip: string, action: string): Promise<boolean> {
  const limit = LIMITS[action];
  if (!limit) return true;

  const hashed = await hashIP(ip);
  const key = `${action}:${hashed}`;

  const current = await env.RATE_LIMITS.get(key);
  const count = current ? parseInt(current, 10) : 0;

  if (count >= limit) {
    return false;
  }

  await env.RATE_LIMITS.put(key, String(count + 1), {
    expirationTtl: RATE_LIMIT_WINDOW,
  });

  return true;
}
