/**
 * Sliding Window Rate Limiter for Dumal-NEXT
 * 
 * Features:
 * - Distributed Upstash Redis support via REST API (if UPSTASH_REDIS_REST_URL/TOKEN are provided)
 * - Automatic graceful fallback to In-Memory Sliding Window (Zero external dependencies needed)
 * - Provides standard rate limit HTTP headers (Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
 */

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
  retryAfter: number; // Seconds to wait before retry
}

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

// In-Memory store for Edge / Serverless fallback
const memoryStore = new Map<string, number[]>();
const MAX_KEYS = 5000;

function cleanupExpired(now: number, windowMs: number) {
  if (memoryStore.size > MAX_KEYS) {
    const oldestAllowed = now - windowMs;
    for (const [k, timestamps] of memoryStore.entries()) {
      const valid = timestamps.filter((t) => t > oldestAllowed);
      if (valid.length === 0) {
        memoryStore.delete(k);
      } else {
        memoryStore.set(k, valid);
      }
    }
  }
}

function rateLimitMemory(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  cleanupExpired(now, windowMs);

  const existing = memoryStore.get(key) || [];
  const validTimestamps = existing.filter((t) => t > windowStart);
  const resetUnix = Math.ceil((now + windowMs) / 1000);

  if (validTimestamps.length >= limit) {
    const oldestTimestamp = validTimestamps[0] || now;
    const retryAfter = Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000));
    return {
      success: false,
      limit,
      remaining: 0,
      reset: Math.ceil((oldestTimestamp + windowMs) / 1000),
      retryAfter,
    };
  }

  validTimestamps.push(now);
  memoryStore.set(key, validTimestamps);

  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - validTimestamps.length),
    reset: resetUnix,
    retryAfter: 0,
  };
}

async function rateLimitUpstash(
  redisUrl: string,
  redisToken: string,
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult | null> {
  try {
    const now = Date.now();
    const windowStart = now - windowMs;
    const expireSec = Math.ceil(windowMs / 1000);
    const memberId = `${now}-${Math.random().toString(36).slice(2, 7)}`;

    // REST Pipeline: ZADD, ZREMRANGEBYSCORE, ZCARD, EXPIRE
    const res = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["ZADD", key, now, memberId],
        ["ZREMRANGEBYSCORE", key, "-inf", windowStart],
        ["ZCARD", key],
        ["EXPIRE", key, expireSec],
      ]),
      cache: "no-store",
    });

    if (!res.ok) return null;
    const json = (await res.json()) as Array<{ result?: any }>;
    const count = Number(json?.[2]?.result || 1);

    if (count > limit) {
      return {
        success: false,
        limit,
        remaining: 0,
        reset: Math.ceil((now + windowMs) / 1000),
        retryAfter: Math.max(1, Math.ceil(windowMs / 1000)),
      };
    }

    return {
      success: true,
      limit,
      remaining: Math.max(0, limit - count),
      reset: Math.ceil((now + windowMs) / 1000),
      retryAfter: 0,
    };
  } catch (err) {
    console.warn("Upstash Redis connection unavailable, falling back to memory:", err);
    return null;
  }
}

export async function checkRateLimit(
  key: string,
  options: RateLimitOptions = { limit: 60, windowMs: 60000 }
): Promise<RateLimitResult> {
  const env = typeof process !== "undefined" ? process.env : ({} as Record<string, string | undefined>);
  const redisUrl = env.UPSTASH_REDIS_REST_URL;
  const redisToken = env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    const upstashRes = await rateLimitUpstash(
      redisUrl,
      redisToken,
      key,
      options.limit,
      options.windowMs
    );
    if (upstashRes !== null) {
      return upstashRes;
    }
  }

  return rateLimitMemory(key, options.limit, options.windowMs);
}

export function getClientIp(req: Request): string {
  const headers = req.headers;
  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "127.0.0.1";
}
