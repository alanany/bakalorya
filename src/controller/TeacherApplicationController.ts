import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../data-source";
import { TeacherApplication } from "../entity/TeacherApplication";
import { User } from "../entity/User";
import { AuthRequest } from "../middleware/auth";
import { createWhatsAppNotificationPayload, buildRegistrationSuccessMessage } from "../utils/whatsapp";

export class TeacherApplicationController {

  // POST /teacher-applications — Submit a teacher application (Public)
  static async apply(req: Request, res: Response) {
    try {
      const { name, email, password, phone, education, location, bio } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: "الرجاء إدخال جميع الحقول الإلزامية (الاسم، البريد، كلمة المرور)." });
      }

      const userRepo = AppDataSource.getRepository(User);
      const appRepo = AppDataSource.getRepository(TeacherApplication);

      // Check if email registered in Users
      const existingUser = await userRepo.findOneBy({ email });
      if (existingUser) {
        return res.status(400).json({ error: "هذا البريد الإلكتروني مسجل بالفعل كحساب بالمنصة." });
      }

      // Check if pending application exists
      const existingApp = await appRepo.findOneBy({ email, status: "pending" });
      if (existingApp) {
        return res.status(400).json({ error: "يوجد طلب انضمام قيد مراجعة الإدارة حالياً بنفس البريد." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const application = appRepo.create({
        name,
        email,
        password: hashedPassword,
        phone,
        education,
        location,
        bio,
        status: "pending"
      });

      await appRepo.save(application);

      return res.status(201).json({
        message: "تم إرسال طلب الانضمام بنجاح! سيتم مراجعته والتواصل معك فور الموافقة.",
        applicationId: application.id
      });
    } catch (error) {
      console.error("Error submitting teacher application:", error);
      return res.status(500).json({ error: "فشل إرسال الطلب. الرجاء المحاولة لاحقاً." });
    }
  }

  // GET /admin/teacher-applications — Get all teacher applications (Admin)
  static async getApplications(req: AuthRequest, res: Response) {
    try {
      const appRepo = AppDataSource.getRepository(TeacherApplication);
      const applications = await appRepo.find({
        order: { createdAt: "DESC" }
      });
      return res.json(applications);
    } catch (error) {
      console.error("Error fetching teacher applications:", error);
      return res.status(500).json({ error: "Failed to fetch teacher applications." });
    }
  }

  // PUT /admin/teacher-applications/:id — Approve or Reject application (Admin)
  static async reviewApplication(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body; // "approved" | "rejected"

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "حالة غير صالحة. يجب اختيار قبول أو رفض." });
      }

      const appRepo = AppDataSource.getRepository(TeacherApplication);
      const userRepo = AppDataSource.getRepository(User);

      const application = await appRepo.findOneBy({ id });
      if (!application) {
        return res.status(404).json({ error: "الطلب غير موجود." });
      }

      if (application.status !== "pending") {
        return res.status(400).json({ error: `تمت معالجة هذا الطلب سابقاً (الحالة الحالية: ${application.status}).` });
      }

      let whatsappNotification: any = null;
      if (status === "approved") {
        // Create active teacher account
        const teacher = userRepo.create({
          name: application.name,
          email: application.email,
          password: application.password, // Already hashed
          role: "teacher",
          phone: application.phone,
          education: application.education,
          location: application.location,
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(application.name)}`
        });
        await userRepo.save(teacher);

        if (application.phone) {
          const msg = buildRegistrationSuccessMessage(application.name, "teacher");
          whatsappNotification = createWhatsAppNotificationPayload(application.phone, msg);
        }
      }

      application.status = status;
      await appRepo.save(application);

      return res.json({
        message: status === "approved" ? "تم قبول طلب المعلم وتفعيل حسابه بنجاح!" : "تم رفض طلب الانضمام.",
        application,
        whatsappNotification
      });
    } catch (error) {
      console.error("Error reviewing teacher application:", error);
      return res.status(500).json({ error: "Failed to process application decision." });
    }
  }
}
