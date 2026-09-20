import { Request, Response, NextFunction } from "express";

/**
 * Security headers middleware to harden Express HTTP responses
 * Protects against Clickjacking, MIME-sniffing, XSS, and server fingerprinting.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking by forbidding embedding in external iframes
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  // Prevent browser MIME-sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Enable XSS filter in legacy browsers
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Control referrer information leakage
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Prevent site from being opened in malicious cross-origin context
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");

  // Hide server tech stack information
  res.removeHeader("X-Powered-By");

  // Strict Transport Security for production HTTPS
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  next();
}
