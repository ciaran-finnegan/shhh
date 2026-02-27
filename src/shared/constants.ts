export const MAX_CIPHERTEXT_BYTES = 32 * 1024; // 32 KB

export const TTL_MIN = 300; // 5 minutes
export const TTL_MAX = 259_200; // 72 hours

export const TTL_PRESETS = [
  { label: "1h", seconds: 3_600 },
  { label: "12h", seconds: 43_200 },
  { label: "24h", seconds: 86_400 },
  { label: "72h", seconds: 259_200 },
] as const;

export const RATE_LIMIT_WINDOW = 3_600; // 1 hour
export const RATE_LIMIT_CREATE = 30;
export const RATE_LIMIT_RETRIEVE = 60;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB per file
export const MAX_FILES = 5;
export const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100 MB total
export const KV_INLINE_THRESHOLD = 1 * 1024 * 1024; // 1 MB — files <=1MB go in KV

export const GITHUB_URL = "https://github.com/ciaran-finnegan/shhh";

export const PBKDF2_ITERATIONS = 600_000;
export const SALT_BYTES = 16;
export const IV_BYTES = 12;
