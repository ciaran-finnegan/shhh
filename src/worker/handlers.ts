import { Env } from "./types";
import { validateCreateBody, validateUUID, ValidationError } from "./validation";
import { checkRateLimit } from "./rate-limit";

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleCreate(
  request: Request,
  env: Env,
): Promise<Response> {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  const allowed = await checkRateLimit(env, ip, "create");
  if (!allowed) {
    return jsonResponse({ error: "Rate limit exceeded" }, 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  let validated;
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

export async function handleRetrieve(
  request: Request,
  env: Env,
  id: string,
): Promise<Response> {
  if (!validateUUID(id)) {
    return jsonResponse({ error: "Not found" }, 404);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const allowed = await checkRateLimit(env, ip, "retrieve");
  if (!allowed) {
    return jsonResponse({ error: "Rate limit exceeded" }, 429);
  }

  const ciphertext = await env.SECRETS.get(id);
  if (ciphertext === null) {
    // Generic message: don't reveal if it existed or was already retrieved
    return jsonResponse({ error: "Not found" }, 404);
  }

  // One-time retrieval: delete after reading
  await env.SECRETS.delete(id);

  return jsonResponse({ ciphertext });
}
