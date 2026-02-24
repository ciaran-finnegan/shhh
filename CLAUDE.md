# CLAUDE.md

## Commands

```bash
pnpm dev            # Start wrangler dev server (localhost:8787)
pnpm build          # Build client (Vite -> dist/client/)
pnpm test           # Run all tests (vitest, 52 tests across 8 files)
pnpm test:watch     # Watch mode
pnpm check          # TypeScript strict mode type check
pnpm deploy         # Build + deploy to Cloudflare
```

## Architecture

Cloudflare Workers with static assets. Single `wrangler.toml` serves both the Worker API and the Vite-built React SPA.

- `src/worker/` -- Cloudflare Worker (API routes at `/api/*`, KV storage)
- `src/client/` -- React 19 SPA (Vite + Tailwind CSS v4)
- `src/shared/` -- Constants shared between client and worker
- `test/client/` -- Client tests (jsdom environment)
- `test/worker/` -- Worker tests (node environment)
- `test/e2e/` -- End-to-end lifecycle tests (node environment)

## Routing

- `POST /api/secrets` -- Create secret (stores ciphertext in KV)
- `GET /api/secrets/:id` -- Retrieve + delete secret (one-time read)
- `/api/*` -- 404 for all other API routes
- `*` -- Static assets with SPA fallback (`not_found_handling = "single-page-application"`)
- `/s/:id` -- Client-side route, parsed by `App.tsx` to show OpenView

## Key Conventions

- **TypeScript strict mode** throughout
- **Path alias:** `@shared/*` maps to `src/shared/*` (configured in tsconfig, vite, vitest)
- **Crypto:** Web Crypto API only (`crypto.subtle`), no third-party crypto libs
- **No `Math.random()`:** Use `crypto.getRandomValues()` for all randomness
- **No console.log in production:** Vite `esbuild.drop: ["console"]` in prod builds
- **Tests:** vitest with three projects (client=jsdom, worker=node, e2e=node)
- **Styling:** Tailwind CSS v4 with CSS-first `@theme` block in `index.css`
- **Components:** Functional React with hooks, no class components
- **Validation:** Shared constants in `src/shared/constants.ts`, enforced on both client and server

## Design System

- Colors: paper `#E8E4DD`, signal-red `#E63B2E`, off-white `#F5F3EE`, black `#111`, mid-gray `#888880`
- Fonts: Space Grotesk (body), DM Serif Display italic (headings), Space Mono (data/code)
- Radius: 2rem (card), 1rem (inner elements)
- SVG noise overlay at 0.05 opacity

## Deployment

- **Live URL:** https://shhh.riskscope-consulting.com
- **Account:** Kanyini - Cloudflare (`6a9e4591f2bb3711c87592659eeee480`)
- **KV namespaces:** SECRETS + RATE_LIMITS (production + preview)
- **CI:** GitHub Actions on push to main (test -> build -> deploy)
- **Secret required:** `CLOUDFLARE_API_TOKEN` in GitHub repo secrets
