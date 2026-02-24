# Security Model

## Zero-Knowledge Property

The server never has access to:
- The plaintext secret
- The passphrase
- The encryption key

The server only stores opaque ciphertext that is meaningless without the passphrase.

## Cryptographic Primitives

| Primitive | Usage | Parameters |
|-----------|-------|------------|
| PBKDF2 | Key derivation from passphrase | SHA-256, 600,000 iterations, 16-byte random salt |
| AES-256-GCM | Authenticated encryption | 12-byte random IV, 256-bit key |

All cryptographic operations use the Web Crypto API (`crypto.subtle`), not third-party libraries.

## Wire Format

The ciphertext blob is base64url-encoded:

```
salt[16 bytes] || iv[12 bytes] || ciphertext + auth_tag
```

## Passphrase Generation

- Uses `crypto.getRandomValues()` exclusively (no `Math.random()`)
- 4 words from EFF short wordlist (~1,296 words) + 2-digit PIN
- Entropy: ~41 bits (words) + ~7 bits (PIN) = ~48 bits minimum
- Users can set custom passphrases; strength is shown via zxcvbn

## Server-Side Protections

- **One-time retrieval:** Secrets are deleted from KV immediately after first read
- **TTL expiration:** Secrets auto-expire (5 minutes to 72 hours)
- **Rate limiting:** 30 creates/hour, 60 retrieves/hour per IP (KV-based)
- **Input validation:** Max 32KB ciphertext, strict TTL bounds, UUID format validation
- **Security headers:** CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy

## Threat Model

### What we protect against
- Server compromise: attacker gets ciphertext but not keys
- Network eavesdropping: HTTPS + HSTS in transit, client-side encryption at rest
- Replay attacks: one-time retrieval, secret deleted after read
- Brute force: PBKDF2 with 600K iterations, rate limiting on API

### What we don't protect against
- Compromised browser/device on sender or recipient
- Passphrase shared over the same channel as the link
- Targeted attacks by Cloudflare (as infrastructure provider)
- KV eventual consistency allowing a brief window for duplicate reads

### Known Limitations
- KV rate limiting is approximate due to eventual consistency
- No server-side key stretching (intentional: zero-knowledge design)
- Maximum secret size: 32KB (after encryption overhead)

## Responsible Disclosure

If you discover a security vulnerability, please report it by opening a GitHub issue or contacting the maintainer directly. Do not create public issues for security vulnerabilities.
