"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const data_source_1 = require("../data-source");
const User_1 = require("../entity/User");
const auth_1 = require("../middleware/auth");
const whatsapp_1 = require("../utils/whatsapp");
class AuthController {
    static async register(req, res) {
        const { name, email, password, role, location, education, phone } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: "Missing name, email, or password." });
        }
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        try {
            const existingUser = await userRepository.findOneBy({ email });
            if (existingUser) {
                return res.status(400).json({ error: "Email already registered." });
            }
            if (phone) {
                const existingPhone = await userRepository.findOneBy({ phone });
                if (existingPhone) {
                    return res.status(400).json({ error: "رقم الهاتف مسجل بالفعل بحساب آخر." });
                }
            }
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            const user = new User_1.User();
            user.name = name;
            user.email = email;
            user.password = hashedPassword;
            user.role = role === "teacher" || role === "admin" ? role : "student";
            if (location)
                user.location = location;
            if (education)
                user.education = education;
            if (phone)
                user.phone = phone;
            user.avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;
            await userRepository.save(user);
            let whatsappNotification = null;
            if (user.phone) {
                const msg = (0, whatsapp_1.buildRegistrationSuccessMessage)(user.name, user.role);
                whatsappNotification = (0, whatsapp_1.createWhatsAppNotificationPayload)(user.phone, msg);
            }
            const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, auth_1.JWT_SECRET, {
                expiresIn: "7d",
            });
            return res.status(201).json({
                token,
                user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, location: user.location, education: user.education, phone: user.phone },
                whatsappNotification
            });
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    static async login(req, res) {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "Missing email or password." });
        }
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        try {
            const user = await userRepository.findOneBy({ email });
            if (!user || !user.password) {
                return res.status(400).json({ error: "Invalid email or password." });
            }
            const isMatch = await bcryptjs_1.default.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ error: "Invalid email or password." });
            }
            const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, auth_1.JWT_SECRET, {
                expiresIn: "7d",
            });
            return res.status(200).json({
                token,
                user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
            });
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    static async me(req, res) {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized." });
        }
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        try {
            const user = await userRepository.findOneBy({ id: req.user.id });
            if (!user) {
                return res.status(404).json({ error: "User not found." });
            }
            return res.status(200).json({
                user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
            });
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
}
exports.AuthController = AuthController;
