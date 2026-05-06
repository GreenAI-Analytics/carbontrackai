/**
 * Lightweight in-memory rate limiter for Next.js API routes.
 * Uses a sliding window approach with IP-based tracking.
 *
 * For production at scale, replace with @upstash/ratelimit + Redis.
 */

interface WindowEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, WindowEntry>();

// Periodically clean up expired entries
const CLEANUP_INTERVAL = 60_000; // every 60s
if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, CLEANUP_INTERVAL).unref?.();
}

export interface RateLimitOptions {
  /** Maximum requests allowed within the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Optional key prefix (e.g. "login", "api") */
  keyPrefix?: string;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in the current window */
  remaining: number;
  /** Unix timestamp (ms) when the window resets */
  resetAt: number;
}

/**
 * Check if a request identified by `identifier` (usually IP) is rate-limited.
 * Returns result with `allowed`, `remaining`, and `resetAt`.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const key = `${options.keyPrefix ?? "default"}:${identifier}`;
  const now = Date.now();

  const existing = store.get(key);

  if (!existing || now > existing.resetAt) {
    // New window
    const entry: WindowEntry = {
      count: 1,
      resetAt: now + options.windowMs,
    };
    store.set(key, entry);
    return { allowed: true, remaining: options.maxRequests - 1, resetAt: entry.resetAt };
  }

  existing.count++;

  if (existing.count > options.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  return {
    allowed: true,
    remaining: options.maxRequests - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Extract client IP from NextRequest headers.
 * Checks x-forwarded-for (Vercel), x-real-ip, and falls back to "unknown".
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}

/** Pre-configured rate limit presets */

export const RATE_LIMITS = {
  /** Login / auth endpoints: 10 attempts per minute */
  auth: { maxRequests: 10, windowMs: 60_000, keyPrefix: "auth" } as const,
  /** API routes: 60 requests per minute */
  api: { maxRequests: 60, windowMs: 60_000, keyPrefix: "api" } as const,
  /** Admin routes: 30 requests per minute */
  admin: { maxRequests: 30, windowMs: 60_000, keyPrefix: "admin" } as const,
  /** Public forms (whistleblower): 5 submissions per minute */
  publicForm: { maxRequests: 5, windowMs: 60_000, keyPrefix: "public" } as const,
};
