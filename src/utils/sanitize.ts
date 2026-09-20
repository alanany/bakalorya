/**
 * Utility functions for input sanitization and XSS prevention.
 */

/**
 * Strips script tags, javascript: protocols, and inline event handlers from a string.
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== "string") return input;

  return input
    // Remove script tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove javascript: pseudo-protocols
    .replace(/javascript:[^"']*/gi, "")
    // Remove data: URLs that could contain HTML or JS
    .replace(/data:text\/html[^"']*/gi, "")
    // Remove inline event handlers (e.g. onload=, onerror=, onclick=)
    .replace(/on\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/on\w+\s*=\s*[^>\s]+/gi, "");
}

/**
 * Deep sanitizes all string properties in an object or array.
 */
export function sanitizeObject<T>(obj: T): T {
  if (!obj || typeof obj !== "object") {
    if (typeof obj === "string") {
      return sanitizeString(obj) as unknown as T;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as unknown as T;
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = sanitizeString(value);
    } else if (typeof value === "object" && value !== null) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
