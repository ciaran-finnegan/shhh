# shhh

Zero-knowledge secret sharing. Send passwords, keys, and files that self-destruct after one read.

**Live:** [shhh.riskscope-consulting.com](https://shhh.riskscope-consulting.com)

## Features

- **Zero-knowledge encryption** -- passphrase never leaves the browser; the server only stores opaque ciphertext
- **One-time read** -- secrets are deleted immediately after retrieval
- **File attachments** -- attach up to 5 files (50 MB each), encrypted client-side with AES-256-GCM
- **Auto-expire** -- TTL from 1 hour to 72 hours, enforced server-side
- **Passphrase generator** -- cryptographically random word-based passphrases with strength meter
- **No accounts** -- no sign-up, no tracking, no cookies

## How It Works

```
Sender                          Server                         Recipient
  │                               │                               │
  │  1. Encrypt in browser        │                               │
  │     (PBKDF2 + AES-256-GCM)   │                               │
  │                               │                               │
  │  2. POST ciphertext ────────► │  3. Store in KV/R2            │
  │                               │     (with TTL)                │
  │  4. Share link + passphrase   │                               │
  │     (out of band)  ──────────────────────────────────────────►│
  │                               │                               │
  │                               │  5. GET ciphertext ◄──────── │
  │                               │     (delete after read)       │
  │                               │                               │
  │                               │                  6. Decrypt ──│
  │                               │                     in browser│
```

## Architecture

```
┌─────────────────┐     ┌───────────────────┐     ┌────────────┐
│  React 19 SPA   │────►│ Cloudflare Worker  │────►│  KV Store  │
│  (Vite + TW v4) │     │   (API routes)     │     │ (secrets)  │
└─────────────────┘     └───────────────────┘     ├────────────┤
                                │                  │ KV Store   │
                                │                  │ (rate lim) │
                                │                  └────────────┘
                                │
                                └────────────────►┌────────────┐
                                                  │  R2 Bucket │
                                                  │ (lg files) │
                                                  └────────────┘
```

## Tech Stack

TypeScript | React 19 | Vite | Tailwind CSS v4 | Cloudflare Workers | KV | R2 | Web Crypto API

## Quick Start

```bash
git clone https://github.com/ciaran-finnegan/shhh.git
cd shhh
pnpm install
pnpm dev        # Start dev server at localhost:8787
pnpm test       # Run all tests
pnpm check      # TypeScript type check
```

**Prerequisites:** Node.js 22+, pnpm

## Project Structure

```
src/
├── client/          React SPA
│   ├── components/  UI components (SealView, OpenView, FileDropZone, ...)
│   ├── lib/         Crypto, API client, file encryption
│   └── App.tsx      Router + layout
├── worker/          Cloudflare Worker
│   ├── index.ts     Request router
│   ├── handlers.ts  Create + retrieve handlers
│   ├── validation.ts Input validation
│   └── rate-limit.ts KV-based rate limiting
└── shared/          Constants + types shared between client and worker

test/
├── client/          Component + crypto tests (jsdom)
├── worker/          Handler + validation tests (node)
└── e2e/             Full lifecycle tests (node)
```

## Security

Cryptographic details, threat model, and known limitations are documented in [SECURITY.md](SECURITY.md).

**TL;DR:** PBKDF2 (600K iterations) + AES-256-GCM, Web Crypto API only, server never sees plaintext or passphrase.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code conventions, and PR guidelines.

## License

[MIT](LICENSE)
