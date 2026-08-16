import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { Enrollment } from "../entity/Enrollment";
import { Course } from "../entity/Course";
import { Session } from "../entity/Session";
import { Subscription } from "../entity/Subscription";
import { AuthRequest } from "../middleware/auth";
import { 
  createWhatsAppNotificationPayload, 
  buildEnrollmentAcceptedMessage, 
  buildRegistrationSuccessMessage 
} from "../utils/whatsapp";

export class UserController {
  static async getTeachers(req: Request, res: Response) {
    try {
      const userRepository = AppDataSource.getRepository(User);
      const teachers = await userRepository.find({
        where: { role: "teacher" },
        select: ["id", "name", "email", "role", "avatar", "education", "location"]
      });
      return res.json(teachers);
    } catch (error) {
      console.error("Error fetching public teachers:", error);
      return res.status(500).json({ error: "Failed to fetch teachers" });
    }
  }

  static async getTeacherById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userRepository = AppDataSource.getRepository(User);
      const teacher = await userRepository.findOne({
        where: { id, role: "teacher" },
        select: ["id", "name", "email", "role", "avatar", "education", "location", "phone", "meetingLink", "customCategories", "createdAt"]
      });

      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      return res.json(teacher);
    } catch (error) {
      console.error("Error fetching teacher by id:", error);
      return res.status(500).json({ error: "Failed to fetch teacher profile" });
    }
  }

  static async getStudents(req: AuthRequest, res: Response) {
    try {
      if (req.user?.role !== "teacher" && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const userRepo = AppDataSource.getRepository(User);
      const enrollRepo = AppDataSource.getRepository(Enrollment);
      const courseRepo = AppDataSource.getRepository(Course);
      const sessionRepo = AppDataSource.getRepository(Session);
      const subRepo = AppDataSource.getRepository(Subscription);

      // Fetch all students registered in platform
      const allStudents = await userRepo.find({
        where: { role: "student" },
        select: ["id", "name", "email", "role", "avatar", "location", "education", "phone", "createdAt"],
        order: { createdAt: "DESC" }
      });

      // Fetch all enrollments with relations
      const allEnrollments = await enrollRepo.find({
        relations: ["student", "course"]
      });

      let teacherCourseIds: string[] = [];
      let teacherSessionStudentIds: Set<string> = new Set();
      let teacherSubStudentIds: Set<string> = new Set();

      if (req.user.role === "teacher") {
        const teacherCourses = await courseRepo.find({
          where: { teacher: { id: req.user.id } }
        });
        teacherCourseIds = teacherCourses.map(c => String(c.id));

        const teacherSessions = await sessionRepo.find({
          where: { teacher: { id: req.user.id } },
          relations: ["student"]
        });
        teacherSessions.forEach(s => {
          if (s.student?.id) teacherSessionStudentIds.add(String(s.student.id));
        });

        const teacherSubs = await subRepo.find({
          where: { teacher: { id: req.user.id } },
          relations: ["student", "plan"]
        });
        teacherSubs.forEach(sub => {
          if (sub.student?.id) teacherSubStudentIds.add(String(sub.student.id));
        });
      }

      let resultStudents = allStudents.map(s => {
        const sEnrollments = allEnrollments
          .filter(e => {
            if (!e.student || String(e.student.id) !== String(s.id)) return false;
            if (req.user?.role === "admin") return true;
            return e.course && teacherCourseIds.includes(String(e.course.id));
          })
          .map(e => ({
            id: e.id,
            status: e.status,
            course: e.course ? { id: e.course.id, title: e.course.title } : { id: "", title: "دورة تعليمية" }
          }));

        const isSessionStudent = teacherSessionStudentIds.has(String(s.id));
        const isSubStudent = teacherSubStudentIds.has(String(s.id));

        // If student has a session or subscription with teacher, ensure they have at least 1 descriptor
        if (req.user?.role === "teacher" && sEnrollments.length === 0 && (isSessionStudent || isSubStudent)) {
          sEnrollments.push({
            id: `sub-${s.id}`,
            status: "active",
            course: { id: "", title: "اشتراك حصص بث مباشر وتدريب خاص 🎯" }
          });
        }

        return {
          id: s.id,
          name: s.name,
          email: s.email,
          role: s.role || "student",
          avatar: s.avatar,
          phone: s.phone,
          location: s.location,
          education: s.education,
          createdAt: s.createdAt,
          enrollments: sEnrollments,
          hasSessionAssignment: isSessionStudent || isSubStudent
        };
      });

      if (req.user?.role === "teacher") {
        // Return students enrolled in teacher's courses OR assigned via sessions/subscriptions
        resultStudents = resultStudents.filter(s =>
          (s.enrollments && s.enrollments.length > 0) || s.hasSessionAssignment
        );
      }

      return res.json(resultStudents);
    } catch (error) {
      console.error("Error fetching students:", error);
      return res.status(500).json({ error: "فشل جلب قائمة الطلاب." });
    }
  }

  static async toggleBan(req: AuthRequest, res: Response) {
    try {
      if (req.user?.role !== "teacher" && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      const { enrollmentId } = req.params;
      const { status } = req.body; // "active" or "banned"

      const enrollmentRepository = AppDataSource.getRepository("Enrollment");
      const enrollment = await enrollmentRepository.findOne({
        where: { id: enrollmentId },
        relations: ["course", "course.teacher", "student"]
      }) as any;

      if (!enrollment) {
        return res.status(404).json({ error: "Enrollment not found" });
      }

      if (req.user.role === "teacher" && enrollment.course.teacher.id !== req.user.id) {
        return res.status(403).json({ error: "You do not teach this course" });
      }

      enrollment.status = status;
      await enrollmentRepository.save(enrollment);

      let whatsappNotification: any = null;
      if (status === "active" && enrollment.student?.phone) {
        const msg = buildEnrollmentAcceptedMessage(
          enrollment.student.name,
          enrollment.course?.title || "الدورة التعليمية",
          enrollment.course?.teacher?.name
        );
        whatsappNotification = createWhatsAppNotificationPayload(enrollment.student.phone, msg);
      }

      return res.json({
        message: status === "active" ? "تم قبول الطلب وتفعيل التسجيل بنجاح!" : "تم تحديث الحالة",
        status: enrollment.status,
        whatsappNotification
      });
    } catch (error) {
      console.error("Error toggling ban:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      const { name, meetingLink, customCategories, phone, education, location } = req.body;
      const userRepository = AppDataSource.getRepository(User);
      
      const user = await userRepository.findOneBy({ id: req.user!.id });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (phone) {
        const existingPhoneUser = await userRepository.findOneBy({ phone });
        if (existingPhoneUser && existingPhoneUser.id !== user.id) {
          return res.status(400).json({ error: "رقم الهاتف مسجل بالفعل بحساب آخر." });
        }
      }

      if (name) user.name = name;
      if (phone !== undefined) user.phone = phone;
      if (req.body.parentPhone !== undefined) user.parentPhone = req.body.parentPhone;
      if (education !== undefined) user.education = education;
      if (location !== undefined) user.location = location;
      if (meetingLink !== undefined) user.meetingLink = meetingLink;
      if (customCategories !== undefined) user.customCategories = customCategories;

      await userRepository.save(user);

      // exclude password
      const { password, ...safeUser } = user;
      return res.json(safeUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // Add Student (Teacher & Admin)
  static async addStudent(req: AuthRequest, res: Response) {
    try {
      if (req.user?.role !== "teacher" && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { name, email, password, phone, parentPhone, location, education, courseId } = req.body;

      if (!name || !email || !education || !parentPhone) {
        return res.status(400).json({ error: "الرجاء اختيار المستوى الدراسي وتعبئة الاسم والبريد الإلكتروني ورقم هاتف ولي الأمر." });
      }

      const userRepo = AppDataSource.getRepository(User);
      const courseRepo = AppDataSource.getRepository(Course);
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);

      // Check phone uniqueness if provided
      if (phone) {
        const existingPhoneUser = await userRepo.findOneBy({ phone });
        if (existingPhoneUser && existingPhoneUser.email !== email) {
          return res.status(400).json({ error: "رقم الهاتف مسجل بالفعل بحساب آخر." });
        }
      }

      // Check if user already exists
      let student = await userRepo.findOneBy({ email });

      if (!student) {
        const rawPassword = password || "student123";
        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        student = userRepo.create({
          name,
          email,
          password: hashedPassword,
          role: "student",
          phone: phone || null,
          parentPhone: parentPhone || null,
          location: location || null,
          education: education || null,
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`
        });
        await userRepo.save(student);
      } else {
        // Update existing student details if provided
        if (name) student.name = name;
        if (phone) student.phone = phone;
        if (parentPhone) student.parentPhone = parentPhone;
        if (location) student.location = location;
        if (education) student.education = education;
        await userRepo.save(student);
      }

      // Determine target course for enrollment
      let targetCourse: Course | null = null;
      if (req.user.role === "teacher") {
        const teacherCourses = await courseRepo.find({
          where: { teacher: { id: req.user.id } },
          relations: ["teacher"]
        });

        if (courseId) {
          targetCourse = teacherCourses.find(c => String(c.id) === String(courseId)) || null;
          if (!targetCourse && teacherCourses.length > 0) {
            targetCourse = teacherCourses[0];
          }
        } else if (teacherCourses.length > 0) {
          targetCourse = teacherCourses[0];
        }
      } else if (courseId) {
        targetCourse = await courseRepo.findOne({
          where: { id: courseId },
          relations: ["teacher"]
        });
      }

      if (targetCourse) {
        let enrollment = await enrollmentRepo.findOne({
          where: { student: { id: student.id }, course: { id: targetCourse.id } }
        });

        if (!enrollment) {
          enrollment = enrollmentRepo.create({
            student,
            course: targetCourse,
            status: "active"
          });
        } else {
          enrollment.status = "active";
        }
        await enrollmentRepo.save(enrollment);
      }

      let whatsappNotification: any = null;
      if (student.phone) {
        if (targetCourse) {
          const msg = buildEnrollmentAcceptedMessage(student.name, targetCourse.title || "الدورة التعليمية", targetCourse.teacher?.name);
          whatsappNotification = createWhatsAppNotificationPayload(student.phone, msg);
        } else {
          const msg = buildRegistrationSuccessMessage(student.name, "student");
          whatsappNotification = createWhatsAppNotificationPayload(student.phone, msg);
        }
      }

      return res.status(201).json({
        message: "تم تسجيل الطالب وإضافته بنجاح!",
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          phone: student.phone
        },
        whatsappNotification
      });
    } catch (error) {
      console.error("Error adding student:", error);
      return res.status(500).json({ error: "فشلت عملية إضافة الطالب." });
    }
  }

  // Delete Student or Remove Enrollment (Teacher & Admin)
  static async deleteStudent(req: AuthRequest, res: Response) {
    try {
      if (req.user?.role !== "teacher" && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { studentId } = req.params;
      const { courseId } = req.query;

      const userRepo = AppDataSource.getRepository(User);
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);

      const student = await userRepo.findOneBy({ id: studentId });
      if (!student) {
        return res.status(404).json({ error: "الطالب غير موجود." });
      }

      if (req.user.role === "admin") {
        if (courseId) {
          await enrollmentRepo.delete({ student: { id: studentId }, course: { id: courseId as string } });
          return res.json({ message: "تم إزالة الطالب من الدورة بنجاح." });
        } else {
          await enrollmentRepo.delete({ student: { id: studentId } });
          await userRepo.delete({ id: studentId });
          return res.json({ message: "تم حذف حساب الطالب بالكامل بنجاح." });
        }
      } else {
        if (courseId) {
          await enrollmentRepo.delete({ student: { id: studentId }, course: { id: courseId as string, teacher: { id: req.user.id } } });
        } else {
          const teacherEnrollments = await enrollmentRepo.find({
            where: { student: { id: studentId }, course: { teacher: { id: req.user.id } } },
            relations: ["course", "course.teacher"]
          });
          if (teacherEnrollments.length > 0) {
            await enrollmentRepo.remove(teacherEnrollments);
          }
        }
        return res.json({ message: "تم إزالة الطالب من دوراتك بنجاح." });
      }
    } catch (error) {
      console.error("Error deleting student:", error);
      return res.status(500).json({ error: "فشل حذف الطالب." });
    }
  }
}
