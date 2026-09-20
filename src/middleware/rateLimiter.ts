import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStores = new Map<string, Map<string, RateLimitRecord>>();

export interface RateLimiterOptions {
  name: string;
  windowMs: number; // Duration of window in ms
  max: number;      // Max allowed requests in the window
  message?: string; // Arabic error message
  keyGenerator?: (req: AuthRequest) => string;
  skipSuccessfulRequests?: boolean;
}

/**
 * High-performance sliding-window rate limiter.
 * Protects against brute-force attacks, credential stuffing, and DoS spam.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const { name, windowMs, max, message } = options;

  if (!rateLimitStores.has(name)) {
    rateLimitStores.set(name, new Map<string, RateLimitRecord>());
  }
  const store = rateLimitStores.get(name)!;

  // Periodic cleanup of stale entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      record.timestamps = record.timestamps.filter(ts => now - ts < windowMs);
      if (record.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, Math.max(windowMs, 60000)).unref();

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = options.keyGenerator 
      ? options.keyGenerator(req) 
      : (req.user?.id || req.ip || req.headers["x-forwarded-for"] as string || "unknown");

    let record = store.get(key);
    if (!record) {
      record = { timestamps: [] };
      store.set(key, record);
    }

    // Filter out timestamps outside the sliding window
    record.timestamps = record.timestamps.filter(ts => now - ts < windowMs);

    const remaining = Math.max(0, max - record.timestamps.length);
    const oldestTimestamp = record.timestamps[0] || now;
    const resetTimeSeconds = Math.ceil((oldestTimestamp + windowMs - now) / 1000);

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil((now + windowMs) / 1000));

    if (record.timestamps.length >= max) {
      res.setHeader("Retry-After", resetTimeSeconds);
      return res.status(429).json({
        error: message || "تم تجاوز الحد المسموح به من المحاولات. يرجى الانتظار والمحاولة لاحقاً.",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfterSeconds: resetTimeSeconds
      });
    }

    record.timestamps.push(now);
    next();
  };
}

/** Reset rate limit key manually (e.g. on successful login) */
export function resetRateLimit(limiterName: string, key: string) {
  const store = rateLimitStores.get(limiterName);
  if (store) {
    store.delete(key);
  }
}

// ─── Pre-configured Limiters ───────────────────────────────────────────────────

/**
 * Authentication Brute-Force Limiter:
 * Max 7 attempts per 15 minutes per IP on login/password endpoints.
 */
export const authRateLimiter = createRateLimiter({
  name: "auth_limiter",
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 7,
  message: "تم تجاوز عدد محاولات الدخول المسموح بها حفاظاً على أمان حسابك. يرجى الانتظار 15 دقيقة قبل المحاولة مجدداً 🔒",
  keyGenerator: (req) => {
    const ip = req.ip || req.headers["x-forwarded-for"] as string || "ip";
    const identifier = req.body?.email || req.body?.phone || req.body?.username || "";
    return `${ip}:${identifier}`;
  }
});

/**
 * General API Limiter:
 * Max 180 requests per minute per IP.
 */
export const apiRateLimiter = createRateLimiter({
  name: "global_api_limiter",
  windowMs: 60 * 1000, // 1 minute
  max: 180,
  message: "تم تجاوز المعدل الطبيعي للطلبات. يرجى الانتظار دقيقة واحدة."
});

/**
 * Sensitive Action Limiter (Bookings, Enrollments, Reviews, Payments):
 * Max 15 actions per minute.
 */
export const sensitiveActionLimiter = createRateLimiter({
  name: "sensitive_action_limiter",
  windowMs: 60 * 1000, // 1 minute
  max: 15,
  message: "عفواً، لقد قمت بإرسال عدد كبير من العمليات في وقت قصير. يرجى الانتظار لحظات."
});
