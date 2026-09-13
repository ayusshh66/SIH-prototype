import { createClient, RedisClientType } from "redis";

let redisClient: RedisClientType | null = null;
let connected = false;

export async function getRedis(): Promise<RedisClientType | null> {
  if (!process.env.REDIS_URL) return null;

  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL,
    });

    redisClient.on("error", (err) => {
      console.warn("Redis connection warning:", err.message);
    });
  }

  if (!connected) {
    try {
      await redisClient.connect();
      connected = true;
    } catch (err) {
      console.warn("Redis unavailable, continuing without cache:", (err as Error).message);
      return null;
    }
  }

  return redisClient;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = await getRedis();
    if (!client) return null;

    const value = await client.get(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
  try {
    const client = await getRedis();
    if (!client) return;

    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch {
    // Gracefully ignore cache write failures
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    const client = await getRedis();
    if (!client) return;

    await client.del(key);
  } catch {
    // Gracefully ignore cache deletion failures
  }
}
