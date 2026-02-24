# Security Model

## Zero-Knowledge Property

The server never has access to:
- The plaintext secret
- The passphrase
- The encryption key

The server only stores opaque ciphertext that is meaningless without the passphrase. This can be verified by inspecting the [client crypto module](src/client/lib/crypto.ts) and the [worker handlers](src/worker/handlers.ts) -- the passphrase never appears in any server-side code.

## Cryptographic Primitives

| Primitive | Usage | Parameters |
|-----------|-------|------------|
| PBKDF2 | Key derivation from passphrase | SHA-256, 600,000 iterations, 16-byte random salt |
| AES-256-GCM | Authenticated encryption | 12-byte random IV, 256-bit key |

All cryptographic operations use the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) (`crypto.subtle`), not third-party libraries. All randomness uses `crypto.getRandomValues()`.

## Wire Format

The ciphertext blob stored on the server is base64url-encoded:

```
base64url( salt[16 bytes] || iv[12 bytes] || ciphertext + auth_tag )
```

- **Salt** is unique per encryption, ensuring identical plaintexts produce different ciphertext
- **IV** is unique per encryption, required by GCM mode
- **Auth tag** (appended by GCM) ensures ciphertext integrity -- tampering is detected on decryption

## Passphrase Generation

- Uses `crypto.getRandomValues()` exclusively (no `Math.random()`)
- Default: 4 words from EFF short wordlist (~1,296 words) + 2-digit PIN
- Format: `word-word-word-word-NN` (e.g. `craggy-ember-vaults-maple-19`)
- Entropy: ~41 bits (words) + ~7 bits (PIN) = ~48 bits minimum
- Users can type custom passphrases; strength is shown via [zxcvbn-ts](https://github.com/zxcvbn-ts/zxcvbn)

## Server-Side Protections

| Protection | Implementation |
|-----------|----------------|
| One-time retrieval | Secret deleted from KV immediately after first read |
| TTL expiration | KV `expirationTtl` (5 minutes to 72 hours) |
| Rate limiting | 30 creates/hr, 60 retrieves/hr per IP (KV-based) |
| Input validation | Max 32KB ciphertext, strict TTL bounds, UUID v4 format |
| No info leakage | Generic 404 for missing, expired, and already-read secrets |
| Security headers | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| Console stripping | Production builds drop all `console.*` calls via esbuild |

## Threat Model

### What we protect against

- **Server compromise:** Attacker gets ciphertext but not keys; PBKDF2 with 600K iterations makes offline brute-force expensive
- **Network eavesdropping:** HTTPS + HSTS in transit, client-side encryption at rest
- **Replay attacks:** One-time retrieval -- secret is deleted after read
- **Brute force on API:** Rate limiting (30/60 per hour per IP)
- **XSS/injection:** Content Security Policy, no dynamic code execution, no `innerHTML`

### What we don't protect against

- Compromised browser or device on sender or recipient
- Passphrase shared over the same channel as the link (user responsibility)
- Targeted attacks by Cloudflare as infrastructure provider
- KV eventual consistency allowing a brief window for duplicate reads
- Side-channel attacks on the client-side crypto implementation

### Known Limitations

- KV rate limiting is approximate due to eventual consistency
- No server-side key stretching (intentional -- zero-knowledge design means the server never sees the passphrase)
- Maximum secret size: ~24KB plaintext (32KB ciphertext limit after encryption overhead)
- Passphrase entropy depends on user choice if they override the generated one

## Responsible Disclosure

If you discover a security vulnerability, please email the maintainer directly rather than opening a public issue. Include steps to reproduce and any relevant details.
