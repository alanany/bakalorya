import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

interface LockEntry {
  timestamp: number;
  timeoutId: NodeJS.Timeout;
}

const activeLocks = new Map<string, LockEntry>();

export interface ConcurrencyLockOptions {
  /** Lock timeout in milliseconds (default: 15,000ms = 15s) */
  timeoutMs?: number;
  /** Custom key generator. Defaults to (userId || ip) + method + path */
  keyGenerator?: (req: AuthRequest) => string;
  /** Custom Arabic error message */
  message?: string;
}

/**
 * High-performance in-memory concurrency mutex.
 * Rejects concurrent overlapping mutation requests from the same user or IP
 * for sensitive operations (bookings, purchases, registrations, payments).
 */
export function createConcurrencyLock(options: ConcurrencyLockOptions = {}) {
  const timeoutMs = options.timeoutMs || 15000;
  const customMessage = options.message || "طلبك السابق قيد المعالجة حالياً، يرجى الانتظار بضع ثوانٍ وعدم تكرار الضغط ⏳";

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Only lock mutating requests
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
      return next();
    }

    const identifier = req.user?.id || req.ip || "anonymous";
    const lockKey = options.keyGenerator 
      ? options.keyGenerator(req) 
      : `${identifier}:${req.method}:${req.baseUrl || ""}${req.path}`;

    if (activeLocks.has(lockKey)) {
      res.setHeader("Retry-After", "3");
      return res.status(429).json({
        error: customMessage,
        code: "CONCURRENT_REQUEST_BLOCKED",
        retryAfterSeconds: 3
      });
    }

    // Set lock with auto-expiry timeout to prevent deadlocks
    const timeoutId = setTimeout(() => {
      activeLocks.delete(lockKey);
    }, timeoutMs);

    activeLocks.set(lockKey, { timestamp: Date.now(), timeoutId });

    // Release lock once the response completes or is terminated
    const releaseLock = () => {
      const entry = activeLocks.get(lockKey);
      if (entry) {
        clearTimeout(entry.timeoutId);
        activeLocks.delete(lockKey);
      }
    };

    res.once("finish", releaseLock);
    res.once("close", releaseLock);

    next();
  };
}

/** Default concurrency lock middleware for sensitive mutating requests */
export const concurrencyLock = createConcurrencyLock();
