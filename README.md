# shhh

Zero-knowledge secret sharing. Encrypt a secret in your browser, share the link, and the recipient decrypts it with a passphrase you share separately. The server never sees the plaintext.

## Architecture

```
Browser (Encrypt)  -->  Cloudflare Worker + KV  -->  Browser (Decrypt)
                        (stores ciphertext)
```

- **Client:** React + Vite + Tailwind CSS v4, served as static assets
- **Server:** Cloudflare Worker with KV for storage and rate limiting
- **Crypto:** Web Crypto API -- PBKDF2 (600K iterations) + AES-256-GCM
- **Deployment:** Single Cloudflare Workers project with static assets

### How it works

1. Sender enters a secret and a passphrase in the browser
2. Client encrypts the secret with AES-256-GCM (key derived via PBKDF2 from passphrase)
3. Only the ciphertext is sent to the server, stored in KV with a TTL
4. Sender shares the link and passphrase separately with the recipient
5. Recipient enters the passphrase, client fetches the ciphertext and decrypts locally
6. The ciphertext is deleted from KV after the first retrieval (one-time read)

The passphrase never leaves the browser. The server only sees opaque ciphertext.

## Local Development

```bash
pnpm install
pnpm dev          # Starts wrangler dev server at localhost:8787
```

For client-only development with HMR:

```bash
pnpm build:client  # Build client
pnpm dev           # Serve via wrangler
```

## Testing

```bash
pnpm test          # Run all tests
pnpm test:watch    # Watch mode
```

Tests are split into two vitest projects:
- `client` -- jsdom environment for React components and crypto
- `worker` -- Node environment for API handlers and validation

## Type Checking

```bash
pnpm check         # TypeScript type checking
```

## Deployment

```bash
# Create KV namespaces (first time only)
wrangler kv namespace create SECRETS
wrangler kv namespace create RATE_LIMITS

# Update wrangler.toml with the namespace IDs, then:
pnpm deploy
```

## Project Structure

```
src/
  shared/           # Constants shared between client and worker
  client/           # React SPA
    components/     # UI components
    lib/            # Crypto, API, clipboard utilities
  worker/           # Cloudflare Worker
    index.ts        # Router
    handlers.ts     # API handlers
    validation.ts   # Input validation
    rate-limit.ts   # KV-based rate limiting
    headers.ts      # Security headers
test/
  client/           # Client tests (jsdom)
  worker/           # Worker tests (node)
```

## License

MIT
