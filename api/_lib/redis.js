import { Redis } from "@upstash/redis";

const url =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  process.env.VERCEL_KV_REST_API_URL;

const token =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  process.env.VERCEL_KV_REST_API_TOKEN;

if (!url || !token) {
  throw new Error(
    "Missing Redis env vars. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (or KV_REST_* / VERCEL_KV_REST_*)."
  );
}

export const redis = new Redis({ url, token });
