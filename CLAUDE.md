# CLAUDE.md

## Commands

```bash
pnpm dev            # Start wrangler dev server (localhost:8787)
pnpm build          # Build client (Vite)
pnpm test           # Run all tests (vitest)
pnpm test:watch     # Watch mode
pnpm check          # TypeScript type check
pnpm deploy         # Build + deploy to Cloudflare
```

## Architecture

Cloudflare Workers with static assets. Single `wrangler.toml` serves both the Worker API and the Vite-built React SPA.

- `src/worker/` -- Cloudflare Worker (API routes, KV storage)
- `src/client/` -- React SPA (Vite + Tailwind v4)
- `src/shared/` -- Constants shared between client and worker
- `test/client/` -- Client tests (jsdom environment)
- `test/worker/` -- Worker tests (node environment)

## Key Conventions

- **TypeScript strict mode** throughout
- **Path alias:** `@shared/*` maps to `src/shared/*`
- **Crypto:** Web Crypto API only, no third-party crypto libs
- **No `Math.random()`:** Use `crypto.getRandomValues()` for all randomness
- **No console.log in production:** Vite drops console calls in prod builds
- **Tests:** vitest with two projects (client=jsdom, worker=node)
- **Styling:** Tailwind CSS v4 with CSS-first `@theme` configuration
- **Components:** Functional React with hooks, no class components
