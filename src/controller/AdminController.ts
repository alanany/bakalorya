import { Response } from "express";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { Course } from "../entity/Course";
import { Session } from "../entity/Session";
import { Enrollment } from "../entity/Enrollment";
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
        select: ["id", "name", "email", "role", "avatar", "phone", "parentPhone", "location", "education", "createdAt"]
      });

      return res.json(users);
    } catch (err) {
      return res.status(500).json({ error: "Failed to fetch users." });
    }
  }

  // POST /admin/users — Create any member (Student, Teacher, Admin)
  static async createUser(req: AuthRequest, res: Response) {
    const { name, email, password, role, phone, parentPhone, education } = req.body;

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
        teacherCapabilities: role === "teacher" 
          ? (Array.isArray(req.body.teacherCapabilities) && req.body.teacherCapabilities.length > 0 ? req.body.teacherCapabilities : ["COURSE_INSTRUCTOR", "SESSION_TEACHER"]) 
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
        user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, parentPhone: user.parentPhone, education: user.education, avatar: user.avatar, createdAt: user.createdAt },
        whatsappNotification
      });
    } catch (err) {
      return res.status(500).json({ error: "Failed to create user." });
    }
  }

  // PUT /admin/users/:id — Edit any user's profile, role, or password
  static async updateUser(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { name, email, role, password, phone, parentPhone, education } = req.body;

    try {
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOneBy({ id });
      if (!user) return res.status(404).json({ error: "User not found." });

      if (name) user.name = name;
      if (phone !== undefined) user.phone = phone;
      if (parentPhone !== undefined) user.parentPhone = parentPhone;
      if (education !== undefined) user.education = education;
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
        user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }
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
        createdAt: c.createdAt,
        teacher: c.teacher ? { id: c.teacher.id, name: c.teacher.name, avatar: c.teacher.avatar } : null,
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
}
