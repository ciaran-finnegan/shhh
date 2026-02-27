# Contributing to shhh

Thanks for your interest in contributing! This guide covers how to set up the project, the conventions we follow, and how to submit changes.

## Prerequisites

- **Node.js 22+**
- **pnpm** (see `packageManager` in `package.json` for the exact version)

## Getting Started

```bash
git clone https://github.com/ciaran-finnegan/shhh.git
cd shhh
pnpm install
pnpm dev          # Start wrangler dev server at localhost:8787
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start local dev server (localhost:8787) |
| `pnpm test` | Run all tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm check` | TypeScript strict mode type check |
| `pnpm build` | Build client (Vite → dist/client/) |

## Project Structure

- `src/client/` -- React 19 SPA (Vite + Tailwind CSS v4)
- `src/worker/` -- Cloudflare Worker (API routes, KV/R2 storage)
- `src/shared/` -- Constants and types shared between client and worker
- `test/client/` -- Client tests (jsdom environment)
- `test/worker/` -- Worker tests (node environment)
- `test/e2e/` -- End-to-end lifecycle tests (node environment)

## Code Conventions

- **TypeScript strict mode** throughout -- no `any`, no implicit returns
- **Web Crypto API only** -- no third-party crypto libraries
- **No `Math.random()`** -- use `crypto.getRandomValues()` for all randomness
- **Functional React** with hooks -- no class components
- **Tailwind CSS v4** with CSS-first `@theme` configuration
- **Path alias:** `@shared/*` maps to `src/shared/*`

## Testing

Tests use [vitest](https://vitest.dev/) with three project configurations:

| Project | Environment | What it covers |
|---------|-------------|----------------|
| client | jsdom | React components, crypto, passphrase generation |
| worker | node | API handlers, validation, rate limiting |
| e2e | node | Full encrypt → store → retrieve → decrypt lifecycle |

Before submitting a PR, make sure all checks pass:

```bash
pnpm check && pnpm test && pnpm build
```

## Submitting Changes

1. **Fork** the repository
2. **Create a branch** from `main` (`git checkout -b my-change`)
3. **Make your changes** -- keep commits focused and atomic
4. **Run the checks** -- `pnpm check && pnpm test && pnpm build`
5. **Push** your branch and open a **Pull Request** against `main`

### What makes a good PR

- Focused on a single change or closely related set of changes
- Includes tests for new functionality
- Passes all CI checks (type check, tests, build)
- Has a clear description of what changed and why
- Resolves any review conversations before requesting re-review

## Security

If you discover a security vulnerability, please **do not** open a public issue. Instead, use [GitHub's private vulnerability reporting](https://github.com/ciaran-finnegan/shhh/security/advisories/new) to disclose it responsibly. See [SECURITY.md](SECURITY.md) for details on the security model.
