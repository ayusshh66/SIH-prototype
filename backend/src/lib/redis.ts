import { createClient } from "redis";

const redis = createClient({
  url: process.env.REDIS_URL,
});

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

let connected = false;

export async function getRedis() {
  if (!process.env.REDIS_URL) return null;

  if (!connected) {
    await redis.connect();
    connected = true;
  }

  return redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = await getRedis();
  if (!client) return null;

  const value = await client.get(key);
  return value ? JSON.parse(value) as T : null;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 60) {
  const client = await getRedis();
  if (!client) return;

  await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
}

export async function cacheDelete(key: string) {
  const client = await getRedis();
  if (!client) return;

  await client.del(key);
}
