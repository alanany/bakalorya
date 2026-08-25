import { Response } from "express";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { Course } from "../entity/Course";
import { Session } from "../entity/Session";
import { Enrollment } from "../entity/Enrollment";
import { Payment } from "../entity/Payment";
import { Lesson } from "../entity/Lesson";
import { AuthRequest } from "../middleware/auth";
import { createWhatsAppNotificationPayload, buildRegistrationSuccessMessage } from "../utils/whatsapp";

export class AdminController {

  // GET /admin/stats — Platform-wide statistics
  static async getStats(req: AuthRequest, res: Response) {
    try {
      const userRepo = AppDataSource.getRepository(User);
      const courseRepo = AppDataSource.getRepository(Course);
      const sessionRepo = AppDataSource.getRepository(Session);
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);

      const [totalStudents, totalTeachers, totalAdmins, totalCourses, totalSessions, totalEnrollments] = await Promise.all([
        userRepo.countBy({ role: "student" }),
        userRepo.countBy({ role: "teacher" }),
        userRepo.countBy({ role: "admin" }),
        courseRepo.count(),
        sessionRepo.count(),
        enrollmentRepo.count()
      ]);

      return res.json({ totalStudents, totalTeachers, totalAdmins, totalCourses, totalSessions, totalEnrollments });
    } catch (err) {
      return res.status(500).json({ error: "Failed to fetch stats." });
    }
  }

  // GET /admin/users?role=teacher|student|admin — All users with optional role filter
  static async getUsers(req: AuthRequest, res: Response) {
    try {
      const userRepo = AppDataSource.getRepository(User);
      const { role } = req.query;

      const where: any = {};
      if (role && ["teacher", "student", "admin"].includes(role as string)) {
        where.role = role;
      }

      const users = await userRepo.find({
        where,
        order: { createdAt: "DESC" },
        select: ["id", "name", "email", "role", "avatar", "phone", "parentPhone", "location", "education", "hourlyRate", "meetingLink", "teacherCapabilities", "createdAt"]
      });

      return res.json(users);
    } catch (err) {
      return res.status(500).json({ error: "Failed to fetch users." });
    }
  }

  // POST /admin/users — Create any member (Student, Teacher, Admin)
  static async createUser(req: AuthRequest, res: Response) {
    const { name, email, password, role, phone, parentPhone, education, hourlyRate } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Missing required fields (name, email, password, role)." });
    }

    if (!["student", "teacher", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role. Must be student, teacher, or admin." });
    }

    if (role === "student" && !parentPhone) {
      return res.status(400).json({ error: "رقم هاتف ولي الأمر مطلوب عند إضافة طالب." });
    }

    try {
      const userRepo = AppDataSource.getRepository(User);
      const existingUser = await userRepo.findOneBy({ email });
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = userRepo.create({
        name,
        email,
        password: hashedPassword,
        role,
        phone: phone || null,
        parentPhone: parentPhone || null,
        education: education || null,
        meetingLink: req.body.meetingLink || null,
        hourlyRate: hourlyRate !== undefined ? parseFloat(hourlyRate) : 150,
        teacherCapabilities: role === "teacher"
          ? (Array.isArray(req.body.teacherCapabilities) ? req.body.teacherCapabilities : ["COURSE_INSTRUCTOR", "SESSION_TEACHER"])
          : undefined,
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`
      });

      await userRepo.save(user);

      let whatsappNotification: any = null;
      if (user.phone) {
        const msg = buildRegistrationSuccessMessage(user.name, user.role);
        whatsappNotification = createWhatsAppNotificationPayload(user.phone, msg);
      }

      return res.status(201).json({
        message: "User created successfully.",
        user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, parentPhone: user.parentPhone, education: user.education, hourlyRate: user.hourlyRate, meetingLink: user.meetingLink, teacherCapabilities: user.teacherCapabilities, avatar: user.avatar, createdAt: user.createdAt },
        whatsappNotification
      });
    } catch (err) {
      return res.status(500).json({ error: "Failed to create user." });
    }
  }

  // PUT /admin/users/:id — Edit any user's profile, role, or password
  static async updateUser(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { name, email, role, password, phone, parentPhone, education, hourlyRate, meetingLink } = req.body;

    try {
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOneBy({ id });
      if (!user) return res.status(404).json({ error: "User not found." });

      if (name) user.name = name;
      if (phone !== undefined) user.phone = phone;
      if (parentPhone !== undefined) user.parentPhone = parentPhone;
      if (education !== undefined) user.education = education;
      if (meetingLink !== undefined) user.meetingLink = meetingLink;
      if (hourlyRate !== undefined) user.hourlyRate = parseFloat(hourlyRate) || 0;
      if (email) {
        const existing = await userRepo.findOneBy({ email });
        if (existing && existing.id !== id) {
          return res.status(400).json({ error: "Email is already taken by another user." });
        }
        user.email = email;
      }
      if (role) {
        if (!["student", "teacher", "admin"].includes(role)) {
          return res.status(400).json({ error: "Invalid role." });
        }
        if (req.user?.id === id && role !== "admin") {
          return res.status(400).json({ error: "Cannot remove admin role from yourself." });
        }
        user.role = role;
      }
      if (req.body.teacherCapabilities && Array.isArray(req.body.teacherCapabilities)) {
        user.teacherCapabilities = req.body.teacherCapabilities;
      }
      if (password && password.trim().length >= 4) {
        user.password = await bcrypt.hash(password, 10);
      }

      await userRepo.save(user);
      return res.json({
        message: "User updated successfully.",
        user: { id: user.id, name: user.name, email: user.email, role: user.role, hourlyRate: user.hourlyRate, meetingLink: user.meetingLink, teacherCapabilities: user.teacherCapabilities, avatar: user.avatar }
      });
    } catch (err) {
      return res.status(500).json({ error: "Failed to update user." });
    }
  }

  // PATCH /admin/users/:id/role — Quick Role Change
  static async updateUserRole(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { role } = req.body;

    if (!["student", "teacher", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role." });
    }

    if (req.user?.id === id) {
      return res.status(400).json({ error: "Cannot change your own role." });
    }

    try {
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOneBy({ id });
      if (!user) return res.status(404).json({ error: "User not found." });

      user.role = role;
      await userRepo.save(user);
      return res.json({ message: "Role updated successfully.", user: { id: user.id, name: user.name, role: user.role } });
    } catch (err) {
      return res.status(500).json({ error: "Failed to update role." });
    }
  }

  // DELETE /admin/users/:id — Delete a user
  static async deleteUser(req: AuthRequest, res: Response) {
    const { id } = req.params;

    if (req.user?.id === id) {
      return res.status(400).json({ error: "Cannot delete your own account." });
    }

    try {
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOneBy({ id });
      if (!user) return res.status(404).json({ error: "User not found." });

      await userRepo.remove(user);
      return res.json({ message: "User deleted successfully." });
    } catch (err) {
      return res.status(500).json({ error: "Failed to delete user." });
    }
  }

  // GET /admin/courses — All courses from all teachers
  static async getCourses(req: AuthRequest, res: Response) {
    try {
      const courseRepo = AppDataSource.getRepository(Course);
      const courses = await courseRepo.find({
        relations: ["teacher", "lessons", "enrollments"],
        order: { createdAt: "DESC" }
      });

      const result = courses.map(c => ({
        id: c.id,
        title: c.title,
        category: c.category,
        image: c.image,
        description: c.description,
        degree: c.degree,
        meetingLink: c.meetingLink,
        status: c.status,
        price: c.price,
        isFree: c.isFree,
        currency: c.currency || "EGP",
        paymentDetails: c.paymentDetails || null,
        createdAt: c.createdAt,
        teacher: c.teacher ? { id: c.teacher.id, name: c.teacher.name, avatar: c.teacher.avatar, education: c.teacher.education } : null,
        lessons: c.lessons?.map(l => ({ id: l.id, title: l.title, duration: l.duration, videoUrl: l.videoUrl })) || [],
        lessonsCount: c.lessons?.length || 0,
        enrollmentsCount: c.enrollments?.length || 0
      }));

      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: "Failed to fetch courses." });
    }
  }

  // DELETE /admin/courses/:id — Delete a course
  static async deleteCourse(req: AuthRequest, res: Response) {
    const { id } = req.params;
    try {
      const courseRepo = AppDataSource.getRepository(Course);
      const course = await courseRepo.findOneBy({ id });
      if (!course) return res.status(404).json({ error: "Course not found." });

      await courseRepo.remove(course);
      return res.json({ message: "Course deleted successfully." });
    } catch (err) {
      return res.status(500).json({ error: "Failed to delete course." });
    }
  }

  // DELETE /admin/sessions/:id — Delete a session
  static async deleteSession(req: AuthRequest, res: Response) {
    const { id } = req.params;
    try {
      const sessionRepo = AppDataSource.getRepository(Session);
      const session = await sessionRepo.findOneBy({ id });
      if (!session) return res.status(404).json({ error: "Session not found." });

      await sessionRepo.remove(session);
      return res.json({ message: "Session deleted successfully." });
    } catch (err) {
      return res.status(500).json({ error: "Failed to delete session." });
    }
  }

  // GET /admin/reports — Full platform system reports & activity audit log
  static async getReports(req: AuthRequest, res: Response) {
    try {
      const userRepo = AppDataSource.getRepository(User);
      const courseRepo = AppDataSource.getRepository(Course);
      const sessionRepo = AppDataSource.getRepository(Session);
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);
      const lessonRepo = AppDataSource.getRepository(Lesson);

      const [
        totalStudents,
        totalTeachers,
        totalAdmins,
        totalCourses,
        totalLessons,
        totalSessions,
        scheduledSessions,
        liveSessions,
        completedSessions,
        enrollments,
        recentUsers,
        recentEnrollments
      ] = await Promise.all([
        userRepo.countBy({ role: "student" }),
        userRepo.countBy({ role: "teacher" }),
        userRepo.countBy({ role: "admin" }),
        courseRepo.count(),
        lessonRepo.count(),
        sessionRepo.count(),
        sessionRepo.countBy({ status: "scheduled" }),
        sessionRepo.countBy({ status: "live" }),
        sessionRepo.countBy({ status: "completed" }),
        enrollmentRepo.find({ relations: ["student", "course"] }),
        userRepo.find({ order: { createdAt: "DESC" }, take: 10, select: ["id", "name", "email", "role", "avatar", "createdAt"] }),
        enrollmentRepo.find({ relations: ["student", "course"], order: { createdAt: "DESC" }, take: 10 })
      ]);

      // Calculate total completed lessons count across all enrollments
      let completedLessonsSum = 0;
      enrollments.forEach(e => {
        if (Array.isArray(e.completedLessons)) {
          completedLessonsSum += e.completedLessons.length;
        }
      });

      const avgProgress = enrollments.length > 0
        ? Math.round(enrollments.reduce((acc, e) => acc + (e.progress || 0), 0) / enrollments.length)
        : 0;

      return res.json({
        summary: {
          totalUsers: totalStudents + totalTeachers + totalAdmins,
          totalStudents,
          totalTeachers,
          totalAdmins,
          totalCourses,
          totalLessons,
          totalSessions,
          scheduledSessions,
          liveSessions,
          completedSessions,
          totalEnrollments: enrollments.length,
          completedLessonsSum,
          avgProgress
        },
        auditLogs: {
          recentUsers,
          recentEnrollments: recentEnrollments.map(e => ({
            id: e.id,
            studentName: e.student?.name || "Student",
            courseTitle: e.course?.title || "Course",
            progress: e.progress,
            createdAt: e.createdAt
          }))
        }
      });
    } catch (err) {
      console.error("Failed to generate report:", err);
      return res.status(500).json({ error: "Failed to generate system report." });
    }
  }

  // POST /admin/courses — Create a new course directly as Admin
  static async createCourse(req: AuthRequest, res: Response) {
    const { title, description, category, degree, image, meetingLink, teacherId, price, isFree, currency, paymentDetails } = req.body;

    if (!title || !category || !degree) {
      return res.status(400).json({ error: "عنوان الدورة، المادة، والصف الدراسي عناصر مطلوبة." });
    }

    try {
      const courseRepo = AppDataSource.getRepository(Course);
      const userRepo = AppDataSource.getRepository(User);

      let teacher: User | null = null;
      if (teacherId && teacherId.trim().length > 0) {
        teacher = await userRepo.findOneBy({ id: teacherId });
      }

      const numericPrice = parseFloat(price) || 0;
      const courseIsFree = isFree === true || isFree === "true" || numericPrice === 0;

      const course = new Course();
      course.title = title;
      course.description = description || "";
      course.category = category;
      course.degree = degree;
      course.image = image || "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600";
      course.meetingLink = meetingLink || null;
      course.teacher = teacher;
      course.price = courseIsFree ? 0 : numericPrice;
      course.isFree = courseIsFree;
      course.currency = currency || "EGP";
      course.paymentDetails = paymentDetails || null;
      course.status = "PUBLISHED";

      await courseRepo.save(course);
      return res.status(201).json({ message: "تم إنشاء وتفعيل الدورة بنجاح! 🎉", course });
    } catch (err) {
      console.error("Admin createCourse error:", err);
      return res.status(500).json({ error: "فشل إنشاء الدورة." });
    }
  }

  // GET /admin/enrollments — All student course enrollments
  static async getEnrollments(req: AuthRequest, res: Response) {
    try {
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);
      const enrollments = await enrollmentRepo.find({
        relations: ["student", "course", "course.teacher", "payment"],
        order: { createdAt: "DESC" }
      });

      return res.json(enrollments);
    } catch (err) {
      console.error("Admin getEnrollments error:", err);
      return res.status(500).json({ error: "Failed to fetch enrollments." });
    }
  }

  // POST /admin/enrollments/:id/approve — Admin approves course enrollment
  static async approveEnrollment(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { amount, receiptUrl, notes } = req.body;

    try {
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);
      const paymentRepo = AppDataSource.getRepository(Payment);

      const enrollment = await enrollmentRepo.findOne({
        where: { id },
        relations: ["student", "course", "payment"]
      });

      if (!enrollment) {
        return res.status(404).json({ error: "طلب التسجيل غير موجود." });
      }

      enrollment.status = "active";

      // Create or update Payment record
      let payment = enrollment.payment;
      if (!payment) {
        payment = new Payment();
        payment.student = enrollment.student;
        payment.type = "COURSE_ENROLLMENT";
        payment.courseEnrollment = enrollment;
      }

      const { amount, receiptUrl, notes, provider } = req.body;

      payment.amount = amount !== undefined ? Number(amount) : (payment.amount || 0);
      payment.currency = "EGP";
      payment.status = "SUCCESS";
      payment.provider = provider || payment.provider || "manual";
      if (receiptUrl) payment.receiptUrl = receiptUrl;
      if (notes) payment.notes = notes;

      const savedPayment = await paymentRepo.save(payment);
      enrollment.payment = savedPayment;
      await enrollmentRepo.save(enrollment);

      return res.json({ message: "تم قبول واعتماد تسجيل الطالب في الدورة بنجاح! ✅", enrollment });
    } catch (err) {
      console.error("Admin approveEnrollment error:", err);
      return res.status(500).json({ error: "فشل اعتماد التسجيل." });
    }
  }

  // POST /admin/enrollments/:id/reject — Admin rejects course enrollment
  static async rejectEnrollment(req: AuthRequest, res: Response) {
    const { id } = req.params;

    try {
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);
      const enrollment = await enrollmentRepo.findOneBy({ id });

      if (!enrollment) {
        return res.status(404).json({ error: "طلب التسجيل غير موجود." });
      }

      enrollment.status = "rejected";
      await enrollmentRepo.save(enrollment);

      return res.json({ message: "تم رفض طلب التسجيل.", enrollment });
    } catch (err) {
      console.error("Admin rejectEnrollment error:", err);
      return res.status(500).json({ error: "فشل رفض التسجيل." });
    }
  }
}
