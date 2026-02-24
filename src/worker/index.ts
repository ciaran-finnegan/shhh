import { Env } from "./types";
import { handleCreate, handleRetrieve } from "./handlers";
import { applySecurityHeaders } from "./headers";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    let response: Response;

    if (url.pathname === "/api/secrets" && request.method === "POST") {
      response = await handleCreate(request, env);
    } else if (
      url.pathname.startsWith("/api/secrets/") &&
      request.method === "GET"
    ) {
      const id = url.pathname.slice("/api/secrets/".length);
      response = await handleRetrieve(request, env, id);
    } else if (url.pathname.startsWith("/api/")) {
      response = new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      // Fall through to static assets (SPA)
      response = await env.ASSETS.fetch(request);
    }

    return applySecurityHeaders(response);
  },
} satisfies ExportedHandler<Env>;
