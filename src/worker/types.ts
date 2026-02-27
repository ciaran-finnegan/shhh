export interface Env {
  SECRETS: KVNamespace;
  RATE_LIMITS: KVNamespace;
  ASSETS: Fetcher;
  FILES: R2Bucket;
}
