import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { AuditLog } from "../entity/AuditLog";
import { AuthRequest } from "../middleware/auth";
import crypto from "crypto";

export class AdminTeacherController {
  // Admin creates teacher with capabilities and sends invitation
  static async inviteTeacher(req: AuthRequest, res: Response) {
    const { fullName, email, phone, country, language, bio, capabilities, avatar } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({ error: "الرجاء توفير الاسم الكامل والبريد الإلكتروني للمعلم." });
    }

    try {
      const userRepository = AppDataSource.getRepository(User);
      const auditRepository = AppDataSource.getRepository(AuditLog);

      const existingUser = await userRepository.findOneBy({ email });
      if (existingUser) {
        return res.status(400).json({ error: "هذا البريد الإلكتروني مستخدم بالفعل لنظام آخر." });
      }

      const invitationToken = crypto.randomBytes(32).toString("hex");
      const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const teacher = new User();
      teacher.name = fullName;
      teacher.email = email;
      teacher.phone = phone;
      teacher.country = country;
      teacher.language = language;
      teacher.education = bio;
      teacher.avatar = avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(fullName)}`;
      teacher.role = "teacher";
      teacher.status = "PENDING";
      teacher.teacherCapabilities = Array.isArray(capabilities) && capabilities.length > 0 ? capabilities : ["COURSE_INSTRUCTOR", "SESSION_TEACHER"];
      teacher.invitationToken = invitationToken;
      teacher.invitationExpiresAt = invitationExpiresAt;

      await userRepository.save(teacher);

      // Audit Log
      const audit = new AuditLog();
      audit.actor = { id: req.user!.id } as User;
      audit.action = "TEACHER_INVITED";
      audit.entityType = "User";
      audit.entityId = teacher.id;
      audit.metadata = JSON.stringify({ email: teacher.email, capabilities: teacher.teacherCapabilities });
      await auditRepository.save(audit);

      const invitationLink = `http://localhost:3000/#accept-invitation?token=${invitationToken}`;

      return res.status(201).json({
        message: "تم إنشاء حساب المعلم وإرسال رابط الدعوة بنجاح.",
        teacher,
        invitationLink
      });
    } catch (err) {
      console.error("Invite teacher error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Teacher accepts invitation and sets password
  static async acceptInvitation(req: Request, res: Response) {
    const { token, password } = req.body;

    if (!token || !password || password.length < 6) {
      return res.status(400).json({ error: "رمز الدعوة أو كلمة السر غير صالحة (يجب أن تكون 6 أحرف على الأقل)." });
    }

    try {
      const userRepository = AppDataSource.getRepository(User);
      const bcrypt = require("bcryptjs");

      const teacher = await userRepository.findOne({
        where: { invitationToken: token }
      });

      if (!teacher) {
        return res.status(404).json({ error: "رمز الدعوة غير صحيح أو غير موجود." });
      }

      if (teacher.invitationExpiresAt && new Date() > new Date(teacher.invitationExpiresAt)) {
        return res.status(400).json({ error: "انتهت صلاحية رابط الدعوة. الرجاء طلب رابط جديد من الإدارة." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      teacher.password = hashedPassword;
      teacher.status = "ACTIVE";
      teacher.invitationToken = undefined;
      teacher.invitationExpiresAt = undefined;

      await userRepository.save(teacher);

      return res.status(200).json({ message: "تم تفعيل حسابك بنجاح! يمكنك الآن تسجيل الدخول." });
    } catch (err) {
      console.error("Accept invitation error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Admin lists all teachers with filters
  static async getAllTeachers(req: Request, res: Response) {
    try {
      const userRepository = AppDataSource.getRepository(User);
      const teachers = await userRepository.find({
        where: { role: "teacher" },
        order: { createdAt: "DESC" }
      });

      return res.status(200).json(teachers);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Admin updates teacher status or capabilities
  static async updateTeacherCapabilities(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { capabilities, status, meetingLink } = req.body;

    try {
      const userRepository = AppDataSource.getRepository(User);
      const auditRepository = AppDataSource.getRepository(AuditLog);

      const teacher = await userRepository.findOneBy({ id, role: "teacher" });
      if (!teacher) {
        return res.status(404).json({ error: "المعلم غير موجود." });
      }

      if (capabilities && Array.isArray(capabilities)) {
        teacher.teacherCapabilities = capabilities;
      }

      if (status && ["PENDING", "ACTIVE", "SUSPENDED", "INACTIVE"].includes(status)) {
        teacher.status = status;
      }

      if (meetingLink !== undefined) {
        teacher.meetingLink = meetingLink;
      }

      await userRepository.save(teacher);

      // Audit Log
      const audit = new AuditLog();
      audit.actor = { id: req.user!.id } as User;
      audit.action = "TEACHER_CAPABILITIES_UPDATED";
      audit.entityType = "User";
      audit.entityId = teacher.id;
      audit.metadata = JSON.stringify({ capabilities: teacher.teacherCapabilities, status: teacher.status });
      await auditRepository.save(audit);

      return res.status(200).json(teacher);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }
}
