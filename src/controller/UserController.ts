import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { Enrollment } from "../entity/Enrollment";
import { Course } from "../entity/Course";
import { AuthRequest } from "../middleware/auth";

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
      // Allow teacher or admin
      if (req.user?.role !== "teacher" && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      let students: User[] = [];

      if (req.user?.role === "admin") {
        const userRepository = AppDataSource.getRepository(User);
        students = await userRepository.find({
          where: { role: "student" },
          select: ["id", "name", "email", "role", "avatar", "location", "education", "phone", "createdAt"]
        });
      } else {
        const enrollmentRepository = AppDataSource.getRepository("Enrollment");
        const enrollments = await enrollmentRepository.find({
          where: { course: { teacher: { id: req.user!.id } } },
          relations: ["student", "course"]
        }) as any[];
        
        // Group by student
        const studentsMap = new Map();
        for (const enroll of enrollments) {
          if (enroll.student && enroll.student.role === "student") {
            const sid = enroll.student.id;
            if (!studentsMap.has(sid)) {
              studentsMap.set(sid, {
                id: enroll.student.id,
                name: enroll.student.name,
                email: enroll.student.email,
                role: enroll.student.role,
                avatar: enroll.student.avatar,
                location: enroll.student.location,
                education: enroll.student.education,
                phone: enroll.student.phone,
                createdAt: enroll.student.createdAt,
                enrollments: []
              });
            }
            studentsMap.get(sid).enrollments.push({
              id: enroll.id,
              status: enroll.status,
              course: enroll.course ? { id: enroll.course.id, title: enroll.course.title } : { id: "", title: "Course" }
            });
          }
        }
        students = Array.from(studentsMap.values());
      }

      return res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      return res.status(500).json({ error: "Internal server error" });
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
        relations: ["course", "course.teacher"]
      }) as any;

      if (!enrollment) {
        return res.status(404).json({ error: "Enrollment not found" });
      }

      if (req.user.role === "teacher" && enrollment.course.teacher.id !== req.user.id) {
        return res.status(403).json({ error: "You do not teach this course" });
      }

      enrollment.status = status;
      await enrollmentRepository.save(enrollment);

      return res.json({ message: "Status updated", status: enrollment.status });
    } catch (error) {
      console.error("Error toggling ban:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      const { name, meetingLink, customCategories } = req.body;
      const userRepository = AppDataSource.getRepository(User);
      
      const user = await userRepository.findOneBy({ id: req.user!.id });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (name) user.name = name;
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

      const { name, email, password, phone, location, education, courseId } = req.body;

      if (!name || !email || !education) {
        return res.status(400).json({ error: "الرجاء اختيار المستوى الدراسي وتعبئة الاسم والبريد الإلكتروني." });
      }

      const userRepo = AppDataSource.getRepository(User);
      const courseRepo = AppDataSource.getRepository(Course);
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);

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
          location: location || null,
          education: education || null,
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`
        });
        await userRepo.save(student);
      }

      // Enroll in course if courseId provided
      if (courseId) {
        const course = await courseRepo.findOne({
          where: { id: courseId },
          relations: ["teacher"]
        });

        if (!course) {
          return res.status(404).json({ error: "الدورة غير موجودة." });
        }

        if (req.user.role === "teacher" && course.teacher?.id !== req.user.id) {
          return res.status(403).json({ error: "غير مصرح لك بإضافة طالب لدورة معلم آخر." });
        }

        let enrollment = await enrollmentRepo.findOne({
          where: { student: { id: student.id }, course: { id: course.id } }
        });

        if (!enrollment) {
          enrollment = enrollmentRepo.create({
            student,
            course,
            status: "active",
            requestMessage: "تمت الإضافة مباشرة بواسطة المعلم/الأدمن"
          });
        } else {
          enrollment.status = "active";
        }
        await enrollmentRepo.save(enrollment);
      }

      return res.status(201).json({
        message: "تم تسجيل الطالب وإضافته بنجاح!",
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          phone: student.phone
        }
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
