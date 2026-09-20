import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

interface CachedResponse {
  statusCode: number;
  body: any;
  headers: Record<string, string>;
  createdAt: number;
}

// In-memory cache for idempotency keys, retained for 2 minutes
const idempotencyCache = new Map<string, CachedResponse>();

// Clean up expired idempotency records every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of idempotencyCache.entries()) {
    if (now - record.createdAt > 2 * 60 * 1000) {
      idempotencyCache.delete(key);
    }
  }
}, 60000).unref();

/**
 * Idempotency Middleware.
 * Checks for `Idempotency-Key` or `X-Idempotency-Key` header on mutating requests.
 * If a request with the same key was already processed, replays the cached response.
 */
export function idempotency(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }

  const idempotencyKey = (req.headers["idempotency-key"] || req.headers["x-idempotency-key"]) as string;
  if (!idempotencyKey) {
    return next();
  }

  const userOrIp = req.user?.id || req.ip || "anon";
  const cacheKey = `${userOrIp}:${idempotencyKey}`;

  const cached = idempotencyCache.get(cacheKey);
  if (cached) {
    res.setHeader("X-Cache-Lookup", "HIT-IDEMPOTENT");
    for (const [headerName, headerVal] of Object.entries(cached.headers)) {
      res.setHeader(headerName, headerVal);
    }
    return res.status(cached.statusCode).json(cached.body);
  }

  // Intercept json() to capture the response
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    if (res.statusCode >= 200 && res.statusCode < 400) {
      idempotencyCache.set(cacheKey, {
        statusCode: res.statusCode,
        body,
        headers: { "X-Idempotency-Replayed": "true" },
        createdAt: Date.now()
      });
    }
    return originalJson(body);
  };

  next();
}
