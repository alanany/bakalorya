"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_SECRET = void 0;
exports.authMiddleware = authMiddleware;
exports.optionalAuthMiddleware = optionalAuthMiddleware;
exports.requireRole = requireRole;
exports.requireCapability = requireCapability;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const data_source_1 = require("../data-source");
const User_1 = require("../entity/User");
exports.JWT_SECRET = process.env.JWT_SECRET || "bakalorya_secret_key_123_456";
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ error: "Access denied. Invalid token format." });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, exports.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (err) {
        res.status(401).json({ error: "Invalid token." });
    }
}
function optionalAuthMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader)
        return next();
    const token = authHeader.split(" ")[1];
    if (!token)
        return next();
    try {
        const decoded = jsonwebtoken_1.default.verify(token, exports.JWT_SECRET);
        req.user = decoded;
    }
    catch (err) {
        // Ignore invalid token for optional auth
    }
    next();
}
function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required." });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: "Forbidden. Insufficient permissions." });
        }
        next();
    };
}
function requireCapability(capability) {
    return async (req, res, next) => {
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
            const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
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
        }
        catch (err) {
            res.status(500).json({ error: "Internal server error." });
        }
    };
}
