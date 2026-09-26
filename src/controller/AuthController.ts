import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { JWT_SECRET, AuthRequest } from "../middleware/auth";
import { createWhatsAppNotificationPayload, buildRegistrationSuccessMessage } from "../utils/whatsapp";
import { resetRateLimit } from "../middleware/rateLimiter";
import { sanitizeString } from "../utils/sanitize";

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


      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User();
      user.name = sanitizeString(name).trim();
      user.email = sanitizeString(email).trim().toLowerCase();
      user.password = hashedPassword;
      user.role = userRole;
      if (userRole === "student") {
        user.status = "PENDING";
      } else {
        user.status = "ACTIVE";
      }
      if (location) user.location = sanitizeString(location).trim();
      if (education) user.education = sanitizeString(education).trim();
      if (phone) user.phone = sanitizeString(phone).trim();
      if (parentPhone) user.parentPhone = sanitizeString(parentPhone).trim();
      user.avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.name)}`;

      await userRepository.save(user);

      let whatsappNotification: any = null;
      if (user.phone) {
        const msg = user.role === "student"
          ? `مرحباً ${user.name}! تم استلام طلب تسجيلك بنجاح في منصة انطلق. طلبك قيد المراجعة والاعتماد من قبل إدارة الأكاديمية وسنقوم بإشعارك فور التفعيل لتتمكن من الدخول إلى لوحة التحكم.`
          : buildRegistrationSuccessMessage(user.name, user.role);
        whatsappNotification = createWhatsAppNotificationPayload(user.phone, msg);
      }

      if (user.role === "student") {
        return res.status(201).json({
          pendingApproval: true,
          message: "تم إنشاء حسابك بنجاح! حسابك قيد المراجعة والاعتماد من قبل إدارة الأكاديمية قبل السماح بالدخول إلى لوحة التحكم.",
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status
          },
          whatsappNotification
        });
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
    const { email, password, expectedRole } = req.body;

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

      if (user.isBlocked || user.status === "BLOCKED" || user.status === "SUSPENDED") {
        const reason = user.blockReason ? ` (السبب: ${user.blockReason})` : "";
        return res.status(403).json({ error: `عفواً، تم حظر هذا الحساب ومنعه من تسجيل الدخول إلى الأكاديمية بواسطة الإدارة.${reason} يرجى التواصل مع الدعم الفني.` });
      }

      if (user.status === "PENDING") {
        return res.status(403).json({
          error: "عفواً، حسابك قيد المراجعة والاعتماد من قبل إدارة الأكاديمية. سيتم تفعيل حسابك والتواصل معك قريباً لتتمكن من الدخول إلى لوحة التحكم."
        });
      }

      if (expectedRole === "student" && user.role !== "student") {
        return res.status(403).json({ error: "عفواً، هذا المسار مخصص للطلاب فقط. يرجى استخدام بوابة المعلمين والإدارة." });
      }

      if (expectedRole === "staff" && user.role !== "teacher" && user.role !== "admin") {
        return res.status(403).json({ error: "عفواً، هذه البوابة مخصصة للمعلمين وإدارة المنصة فقط." });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
        expiresIn: "7d",
      });

      // Clear failed rate limit attempts upon successful authentication
      try {
        const ip = req.ip || req.headers["x-forwarded-for"] as string || "ip";
        resetRateLimit("auth_limiter", `${ip}:${email}`);
      } catch (e) {}

      return res.status(200).json({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, phone: user.phone, parentPhone: user.parentPhone, location: user.location, education: user.education, meetingLink: user.meetingLink, teacherCapabilities: user.teacherCapabilities || [], isBlocked: user.isBlocked, status: user.status },
      });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Dedicated Student Login (Mobile app and Student web portal)
  static async studentLogin(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "يرجى كتابة البريد الإلكتروني وكلمة المرور." });
    }

    const userRepository = AppDataSource.getRepository(User);

    try {
      const user = await userRepository.findOneBy({ email });
      if (!user || !user.password) {
        return res.status(400).json({ error: "بيانات الدخول غير صحيحة، يرجى التأكد من البريد وكلمة المرور." });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "بيانات الدخول غير صحيحة، يرجى التأكد من البريد وكلمة المرور." });
      }

      // Check if student is blocked
      if (user.isBlocked || user.status === "BLOCKED" || user.status === "SUSPENDED") {
        const reason = user.blockReason ? ` (السبب: ${user.blockReason})` : "";
        return res.status(403).json({ 
          error: `عفواً، تم حظر حساب الطالب ومنعه من تسجيل الدخول إلى الأكاديمية بواسطة الإدارة.${reason} يرجى مراجعة إدارة الأكاديمية.` 
        });
      }

      // Check if student account is pending approval
      if (user.status === "PENDING") {
        return res.status(403).json({
          error: "عفواً، حسابك قيد المراجعة والاعتماد من قبل إدارة الأكاديمية. سيتم تفعيل حسابك والتواصل معك قريباً لتتمكن من الدخول إلى لوحة التحكم."
        });
      }

      // Restrict strictly to Students
      if (user.role !== "student") {
        const roleName = user.role === "teacher" ? "معلم" : "مشرف / إدارة";
        return res.status(403).json({ 
          error: `عفواً، هذا المسار والتطبيق مخصص لحسابات الطلاب فقط. حسابك مسجل كـ (${roleName})، يرجى استخدام بوابة المعلمين والإدارة على الويب.` 
        });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
        expiresIn: "7d",
      });

      // Clear failed rate limit attempts upon successful authentication
      try {
        const ip = req.ip || req.headers["x-forwarded-for"] as string || "ip";
        resetRateLimit("auth_limiter", `${ip}:${email}`);
      } catch (e) {}

      return res.status(200).json({
        token,
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          role: user.role, 
          avatar: user.avatar, 
          phone: user.phone, 
          parentPhone: user.parentPhone, 
          location: user.location, 
          education: user.education, 
          meetingLink: user.meetingLink, 
          teacherCapabilities: user.teacherCapabilities || [],
          isBlocked: user.isBlocked,
          status: user.status
        },
      });
    } catch (err) {
      return res.status(500).json({ error: "حدث خطأ في السيرفر، يرجى المحاولة لاحقاً." });
    }
  }

  // Dedicated Staff / Teacher & Admin Login
  static async staffLogin(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "يرجى كتابة البريد الإلكتروني وكلمة المرور." });
    }

    const userRepository = AppDataSource.getRepository(User);

    try {
      const user = await userRepository.findOneBy({ email });
      if (!user || !user.password) {
        return res.status(400).json({ error: "بيانات الدخول غير صحيحة، يرجى التأكد من البريد وكلمة المرور." });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "بيانات الدخول غير صحيحة، يرجى التأكد من البريد وكلمة المرور." });
      }

      // Check if staff / teacher is blocked
      if (user.isBlocked || user.status === "BLOCKED" || user.status === "SUSPENDED") {
        const reason = user.blockReason ? ` (السبب: ${user.blockReason})` : "";
        return res.status(403).json({ 
          error: `عفواً، تم حظر هذا الحساب ومنعه من تسجيل الدخول إلى الأكاديمية بواسطة الإدارة.${reason} يرجى مراجعة إدارة الأكاديمية.` 
        });
      }

      // Restrict strictly to Teacher or Admin
      if (user.role !== "teacher" && user.role !== "admin") {
        return res.status(403).json({ 
          error: "عفواً، هذه البوابة مخصصة للمعلمين وإدارة المنصة فقط. يرجى تسجيل الدخول عبر بوابة الطلاب." 
        });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
        expiresIn: "7d",
      });

      // Clear failed rate limit attempts upon successful authentication
      try {
        const ip = req.ip || req.headers["x-forwarded-for"] as string || "ip";
        resetRateLimit("auth_limiter", `${ip}:${email}`);
      } catch (e) {}

      return res.status(200).json({
        token,
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          role: user.role, 
          avatar: user.avatar, 
          phone: user.phone, 
          parentPhone: user.parentPhone, 
          location: user.location, 
          education: user.education, 
          meetingLink: user.meetingLink, 
          teacherCapabilities: user.teacherCapabilities || [],
          isBlocked: user.isBlocked,
          status: user.status
        },
      });
    } catch (err) {
      return res.status(500).json({ error: "حدث خطأ في السيرفر، يرجى المحاولة لاحقاً." });
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

      if (user.isBlocked || user.status === "BLOCKED" || user.status === "SUSPENDED") {
        return res.status(403).json({ error: "تم حظر هذا الحساب من دخول الأكاديمية من قبل الإدارة." });
      }

      return res.status(200).json({
        user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, phone: user.phone, parentPhone: user.parentPhone, location: user.location, education: user.education, meetingLink: user.meetingLink, teacherCapabilities: user.teacherCapabilities || [], isBlocked: user.isBlocked, status: user.status },
      });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }
}
