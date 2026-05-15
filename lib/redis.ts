import { Redis } from "@upstash/redis";

const url =
  process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  // Don't throw at module load — the server will boot fine without it,
  // and API routes will return a clear error instead.
  console.warn(
    "[redis] No Upstash credentials in env. Set KV_REST_API_URL / KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).",
  );
}

export const redis =
  url && token ? new Redis({ url, token }) : null;

export function hasRedis(): boolean {
  return redis !== null;
}
