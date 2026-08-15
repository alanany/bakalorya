import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { JWT_SECRET, AuthRequest } from "../middleware/auth";
import { createWhatsAppNotificationPayload, buildRegistrationSuccessMessage } from "../utils/whatsapp";

export class AuthController {
  static async register(req: Request, res: Response) {
    const { name, email, password, role, location, education, phone, parentPhone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing name, email, or password." });
    }

    const userRole = role === "teacher" || role === "admin" ? role : "student";
    if (userRole === "student" && !parentPhone) {
      return res.status(400).json({ error: "رقم هاتف ولي الأمر مطلوب عند تسجيل الطالب." });
    }

    const userRepository = AppDataSource.getRepository(User);

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

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User();
      user.name = name;
      user.email = email;
      user.password = hashedPassword;
      user.role = userRole;
      if (location) user.location = location;
      if (education) user.education = education;
      if (phone) user.phone = phone;
      if (parentPhone) user.parentPhone = parentPhone;
      user.avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;

      await userRepository.save(user);

      let whatsappNotification: any = null;
      if (user.phone) {
        const msg = buildRegistrationSuccessMessage(user.name, user.role);
        whatsappNotification = createWhatsAppNotificationPayload(user.phone, msg);
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
        expiresIn: "7d",
      });

      return res.status(201).json({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, location: user.location, education: user.education, phone: user.phone, parentPhone: user.parentPhone, meetingLink: user.meetingLink, teacherCapabilities: user.teacherCapabilities || [] },
        whatsappNotification
      });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async login(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password." });
    }

    const userRepository = AppDataSource.getRepository(User);

    try {
      const user = await userRepository.findOneBy({ email });
      if (!user || !user.password) {
        return res.status(400).json({ error: "Invalid email or password." });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid email or password." });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
        expiresIn: "7d",
      });

      return res.status(200).json({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, phone: user.phone, parentPhone: user.parentPhone, location: user.location, education: user.education, meetingLink: user.meetingLink, teacherCapabilities: user.teacherCapabilities || [] },
      });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async me(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const userRepository = AppDataSource.getRepository(User);
    try {
      const user = await userRepository.findOneBy({ id: req.user.id });
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      return res.status(200).json({
        user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, phone: user.phone, parentPhone: user.parentPhone, location: user.location, education: user.education, meetingLink: user.meetingLink, teacherCapabilities: user.teacherCapabilities || [] },
      });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }
}
