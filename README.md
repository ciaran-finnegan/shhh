# shhh

Zero-knowledge secret sharing. Encrypt a secret in your browser, share the link, and the recipient decrypts it with a passphrase you share separately. The server never sees the plaintext.

**Live at [shhh.riskscope-consulting.com](https://shhh.riskscope-consulting.com)**

## How it works

```
Sender's Browser                    Cloudflare Worker + KV                  Recipient's Browser
      |                                      |                                      |
      |  1. Enter secret + passphrase        |                                      |
      |  2. Encrypt (AES-256-GCM)            |                                      |
      |  3. POST /api/secrets {ciphertext} ->|                                      |
      |                                      |  4. Store ciphertext in KV (with TTL) |
      |                              <- 201  |  5. Return {id}                       |
      |                                      |                                      |
      |  6. Share link + passphrase separately (e.g. different channels)             |
      |                                      |                                      |
      |                                      |  <- 7. GET /api/secrets/:id           |
      |                                      |  8. Return ciphertext, delete from KV |
      |                                      |                                      |
      |                                      |  9. Decrypt with passphrase  -------> |
      |                                      | 10. Display plaintext                 |
```

- The passphrase **never leaves the browser**
- The server only stores **opaque ciphertext**
- Each secret can only be **opened once** -- it's deleted after retrieval
- Secrets **auto-expire** after the chosen TTL (1h to 72h)

## Architecture

| Layer | Technology |
|-------|-----------|
| Client | React 19, Vite, Tailwind CSS v4 |
| Server | Cloudflare Worker |
| Storage | Cloudflare KV (ciphertext + rate limits) |
| Crypto | Web Crypto API (PBKDF2 + AES-256-GCM) |
| Hosting | Cloudflare Workers Static Assets |
| CI/CD | GitHub Actions -> Cloudflare deploy |

Single `wrangler.toml` serves both the Worker API (`/api/*`) and the Vite-built SPA (everything else).

## Security

- **Encryption:** AES-256-GCM with PBKDF2 key derivation (600,000 iterations, random salt + IV)
- **Zero-knowledge:** Passphrase and plaintext never touch the server
- **One-time read:** Secrets deleted from KV immediately after retrieval
- **Rate limiting:** 30 creates/hr, 60 retrieves/hr per IP
- **Security headers:** CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **No `Math.random()`:** All randomness via `crypto.getRandomValues()`
- **No third-party crypto:** Web Crypto API only

See [SECURITY.md](SECURITY.md) for the full threat model.

## Local Development

```bash
pnpm install
pnpm dev          # Starts wrangler dev server at localhost:8787
```

## Testing

```bash
pnpm test          # Run all tests (52 tests across 8 files)
pnpm test:watch    # Watch mode
pnpm check         # TypeScript strict mode type checking
```

Tests are split into three vitest projects:

| Project | Environment | Coverage |
|---------|-------------|----------|
| `client` | jsdom | React components, crypto, passphrase generation |
| `worker` | node | API handlers, validation, rate limiting |
| `e2e` | node | Full encrypt -> store -> retrieve -> decrypt flow |

## Deployment

CI auto-deploys to Cloudflare on push to `main`. For manual deployment:

```bash
pnpm deploy        # Build + deploy
```

Requires `CLOUDFLARE_API_TOKEN` set as a GitHub Actions secret for CI, or authenticated via `wrangler login` for manual deploys.

## Project Structure

```
src/
  shared/
    constants.ts          # Shared constants (limits, TTLs, crypto params)
  client/
    App.tsx               # State machine (seal -> share -> open -> error)
    index.css             # Tailwind v4 theme (brutalist design system)
    components/
      SealView.tsx        # Secret input, passphrase, expiry selection
      ShareView.tsx       # Link + passphrase display with copy buttons
      OpenView.tsx        # Passphrase input, decryption, reveal
      ErrorState.tsx      # Error display (expired/already opened)
      MagneticButton.tsx  # Animated button component
      CopyButton.tsx      # Clipboard with confirmation
      StrengthBar.tsx     # Passphrase strength via zxcvbn
    lib/
      crypto.ts           # PBKDF2 + AES-256-GCM encrypt/decrypt
      passphrase.ts       # EFF wordlist passphrase generator
      api.ts              # Fetch wrappers for /api/secrets
      clipboard.ts        # Clipboard API with fallback
  worker/
    index.ts              # Router (API routes + SPA fallback)
    handlers.ts           # Create + retrieve handlers
    validation.ts         # Input validation + schema enforcement
    rate-limit.ts         # KV-based IP rate limiting
    headers.ts            # Security headers for all responses
    types.ts              # Env interface (KV bindings)
test/
  client/                 # Component + crypto tests (jsdom)
  worker/                 # Handler + validation tests (node)
  e2e/                    # Full lifecycle tests (node)
```

## License

MIT
