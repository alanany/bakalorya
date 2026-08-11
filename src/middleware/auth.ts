import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";

export const JWT_SECRET = process.env.JWT_SECRET || "bakalorya_secret_key_123_456";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: "student" | "teacher" | "admin";
    teacherCapabilities?: string[];
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Access denied. Invalid token format." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token." });
  }
}

export function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();

  const token = authHeader.split(" ")[1];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
  } catch (err) {
    // Ignore invalid token for optional auth
  }
  next();
}

export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden. Insufficient permissions." });
    }
    next();
  };
}

export function requireCapability(capability: "COURSE_INSTRUCTOR" | "SESSION_TEACHER") {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }

    if (req.user.role === "admin") {
      return next(); // Admin has all capabilities
    }

    if (req.user.role !== "teacher") {
      return res.status(403).json({ error: "Forbidden. Teacher role required." });
    }

    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOneBy({ id: req.user.id });

      if (!user || user.status === "SUSPENDED" || user.status === "INACTIVE") {
        return res.status(403).json({ error: "حساب المعلم غير نشط أو معلق من الإدارة." });
      }

      const capabilities = user.teacherCapabilities || [];
      if (!capabilities.includes(capability)) {
        return res.status(403).json({
          error: `عفواً، لا يملك حسابك صلاحية ${capability === "COURSE_INSTRUCTOR" ? "مُحاضر كورس" : "مُدرس حصص خاصة"}.`
        });
      }

      next();
    } catch (err) {
      res.status(500).json({ error: "Internal server error." });
    }
  };
}
