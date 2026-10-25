import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { Enrollment } from "../entity/Enrollment";
import { Course } from "../entity/Course";
import { CourseGroup } from "../entity/CourseGroup";
import { Session } from "../entity/Session";
import { Subscription } from "../entity/Subscription";
import { SessionAttendance } from "../entity/SessionAttendance";
import { AssignmentSubmission } from "../entity/AssignmentSubmission";
import { AuthRequest } from "../middleware/auth";
import { 
  createWhatsAppNotificationPayload, 
  buildEnrollmentAcceptedMessage, 
  buildRegistrationSuccessMessage 
} from "../utils/whatsapp";
import { NotificationController } from "./NotificationController";

export class UserController {
  static async getTeachers(req: Request, res: Response) {
    try {
      const userRepository = AppDataSource.getRepository(User);
      // Public view: only show approved/ACTIVE teachers
      const teachers = await userRepository.find({
        where: { role: "teacher", status: "ACTIVE" },
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
      let teacher = await userRepository.findOne({
        where: [
          { id, role: "teacher" },
          { id, role: "admin" }
        ],
        select: ["id", "name", "email", "role", "avatar", "education", "location", "phone", "meetingLink", "customCategories", "teacherCapabilities", "createdAt"]
      });

      if (!teacher) {
        teacher = await userRepository.findOne({
          where: { id },
          select: ["id", "name", "email", "role", "avatar", "education", "location", "phone", "meetingLink", "customCategories", "teacherCapabilities", "createdAt"]
        });
      }

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
      const groupRepo = AppDataSource.getRepository(CourseGroup);
      const sessionRepo = AppDataSource.getRepository(Session);
      const subRepo = AppDataSource.getRepository(Subscription);
      const attendanceRepo = AppDataSource.getRepository(SessionAttendance);
      const submissionRepo = AppDataSource.getRepository(AssignmentSubmission);

      // Fetch all enrollments with full relations
      const allEnrollments = await enrollRepo.find({
        relations: [
          "student",
          "course",
          "course.teacher",
          "group",
          "group.teacher",
          "group.course",
          "group.course.teacher"
        ]
      });

      const teacherCourseIds = new Set<string>();
      const teacherGroupIds = new Set<string>();
      const teacherSubStudentMap = new Map<string, string>(); // studentId -> plan/sub title
      const teacherSessionStudentIds = new Set<string>();
      const teacherEnrolledStudentIds = new Set<string>();

      if (req.user.role === "teacher") {
        const teacherId = String(req.user.id);

        // 1. Courses taught by this teacher
        const teacherCourses = await courseRepo
          .createQueryBuilder("course")
          .leftJoin("course.teacher", "teacher")
          .where("teacher.id = :teacherId", { teacherId })
          .getMany();
        teacherCourses.forEach(c => teacherCourseIds.add(String(c.id)));

        // 2. Groups taught by this teacher directly OR via course
        const teacherGroups = await groupRepo
          .createQueryBuilder("group")
          .leftJoinAndSelect("group.course", "course")
          .leftJoin("group.teacher", "teacher")
          .leftJoin("course.teacher", "courseTeacher")
          .where("teacher.id = :teacherId OR courseTeacher.id = :teacherId", { teacherId })
          .getMany();

        teacherGroups.forEach(g => {
          teacherGroupIds.add(String(g.id));
          if (g.course?.id) teacherCourseIds.add(String(g.course.id));
        });

        // 3. Collect student IDs from enrollments belonging to this teacher
        allEnrollments.forEach(e => {
          if (!e.student?.id) return;
          const matchesCourse = e.course && (
            teacherCourseIds.has(String(e.course.id)) ||
            (e.course.teacher && String(e.course.teacher.id) === teacherId)
          );
          const matchesGroup = e.group && (
            teacherGroupIds.has(String(e.group.id)) ||
            (e.group.teacher && String(e.group.teacher.id) === teacherId) ||
            (e.group.course?.teacher && String(e.group.course.teacher.id) === teacherId)
          );

          if (matchesCourse || matchesGroup) {
            teacherEnrolledStudentIds.add(String(e.student.id));
          }
        });

        // 4. Subscriptions assigned to this teacher
        const teacherSubs = await subRepo
          .createQueryBuilder("sub")
          .leftJoinAndSelect("sub.student", "student")
          .leftJoinAndSelect("sub.plan", "plan")
          .leftJoin("sub.teacher", "teacher")
          .where("teacher.id = :teacherId", { teacherId })
          .getMany();

        teacherSubs.forEach(sub => {
          if (sub.student?.id) {
            const title = sub.plan?.name ? `اشتراك باقة: ${sub.plan.name}` : "اشتراك حصص بث مباشر وتدريب خاص 🎯";
            teacherSubStudentMap.set(String(sub.student.id), title);
          }
        });

        // 5. Sessions belonging to this teacher (1-on-1, subscription, group sessions)
        const teacherSessions = await sessionRepo
          .createQueryBuilder("session")
          .leftJoinAndSelect("session.student", "student")
          .leftJoinAndSelect("session.subscription", "subscription")
          .leftJoinAndSelect("subscription.student", "subStudent")
          .leftJoinAndSelect("session.group", "group")
          .leftJoin("group.teacher", "groupTeacher")
          .leftJoin("session.teacher", "teacher")
          .leftJoin("session.course", "course")
          .leftJoin("course.teacher", "courseTeacher")
          .where("teacher.id = :teacherId OR groupTeacher.id = :teacherId OR courseTeacher.id = :teacherId", { teacherId })
          .getMany();

        teacherSessions.forEach(s => {
          if (s.student?.id) teacherSessionStudentIds.add(String(s.student.id));
          if (s.subscription?.student?.id) teacherSessionStudentIds.add(String(s.subscription.student.id));
        });

        // 6. Session attendances
        try {
          const attendances = await attendanceRepo
            .createQueryBuilder("att")
            .leftJoinAndSelect("att.session", "session")
            .leftJoin("session.teacher", "teacher")
            .leftJoin("session.group", "group")
            .leftJoin("group.teacher", "groupTeacher")
            .leftJoinAndSelect("att.user", "user")
            .where("(teacher.id = :teacherId OR groupTeacher.id = :teacherId) AND user.role = 'student'", { teacherId })
            .getMany();

          attendances.forEach(a => {
            if (a.user?.id) teacherSessionStudentIds.add(String(a.user.id));
          });
        } catch (attErr) {
          console.warn("Attendance fetch error in getStudents:", attErr);
        }

        // 7. Assignment submissions
        try {
          const submissions = await submissionRepo
            .createQueryBuilder("subm")
            .leftJoinAndSelect("subm.assignment", "assignment")
            .leftJoin("assignment.teacher", "teacher")
            .leftJoinAndSelect("subm.student", "student")
            .where("teacher.id = :teacherId", { teacherId })
            .getMany();

          submissions.forEach(sub => {
            if (sub.student?.id) teacherSessionStudentIds.add(String(sub.student.id));
          });
        } catch (submErr) {
          console.warn("Submissions fetch error in getStudents:", submErr);
        }
      }

      // Fetch students list
      let candidateStudents: User[] = [];

      if (req.user.role === "admin") {
        candidateStudents = await userRepo
          .createQueryBuilder("user")
          .where("LOWER(user.role) = 'student' OR user.role IS NULL")
          .orderBy("user.createdAt", "DESC")
          .getMany();
      } else {
        // Teacher mode: union of all detected student IDs
        const relevantStudentIds = new Set<string>([
          ...teacherEnrolledStudentIds,
          ...teacherSubStudentMap.keys(),
          ...teacherSessionStudentIds
        ]);

        if (relevantStudentIds.size === 0) {
          return res.json([]);
        }

        const idsArray = Array.from(relevantStudentIds);
        candidateStudents = await userRepo
          .createQueryBuilder("u")
          .where("u.id IN (:...ids)", { ids: idsArray })
          .orderBy("u.createdAt", "DESC")
          .getMany();
      }

      const resultStudents = candidateStudents.map(s => {
        const studentIdStr = String(s.id);
        const sEnrollments = allEnrollments
          .filter(e => {
            if (!e.student || String(e.student.id) !== studentIdStr) return false;
            if (req.user?.role === "admin") return true;

            const matchesCourse = e.course && (
              teacherCourseIds.has(String(e.course.id)) ||
              (e.course.teacher && String(e.course.teacher.id) === String(req.user!.id))
            );
            const matchesGroup = e.group && (
              teacherGroupIds.has(String(e.group.id)) ||
              (e.group.teacher && String(e.group.teacher.id) === String(req.user!.id)) ||
              (e.group.course?.teacher && String(e.group.course.teacher.id) === String(req.user!.id))
            );

            return matchesCourse || matchesGroup;
          })
          .map(e => {
            let title = "دورة تعليمية";
            let cId = e.course?.id || e.group?.id || "";

            if (e.course?.title && e.group?.name) {
              title = `${e.course.title} (${e.group.name})`;
            } else if (e.group?.name) {
              title = `مجموعة: ${e.group.name}`;
            } else if (e.course?.title) {
              title = e.course.title;
            }

            return {
              id: e.id,
              status: e.status || "active",
              course: { id: cId, title },
              group: e.group ? { id: e.group.id, name: e.group.name } : null
            };
          });

        const isSessionStudent = teacherSessionStudentIds.has(studentIdStr);
        const isSubStudent = teacherSubStudentMap.has(studentIdStr);

        // If student has a session or subscription with teacher, ensure they have at least 1 descriptor
        if (req.user?.role === "teacher" && sEnrollments.length === 0 && (isSessionStudent || isSubStudent)) {
          const desc = teacherSubStudentMap.get(studentIdStr) || "اشتراك حصص بث مباشر وتدريب خاص 🎯";
          sEnrollments.push({
            id: `sub-${s.id}`,
            status: "active",
            course: { id: "", title: desc },
            group: null
          });
        }

        return {
          id: s.id,
          name: s.name,
          email: s.email,
          role: s.role || "student",
          avatar: s.avatar,
          phone: s.phone,
          parentPhone: s.parentPhone,
          location: s.location,
          education: s.education,
          notes: s.notes || null,
          status: s.status,
          isBlocked: s.isBlocked,
          createdAt: s.createdAt,
          enrollments: sEnrollments,
          hasSessionAssignment: isSessionStudent || isSubStudent
        };
      });

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

      const enrollmentRepository = AppDataSource.getRepository(Enrollment);
      const enrollment = await enrollmentRepository.findOne({
        where: { id: enrollmentId },
        relations: ["course", "course.teacher", "group", "group.teacher", "student"]
      });

      if (!enrollment) {
        return res.status(404).json({ error: "Enrollment not found" });
      }

      if (req.user.role === "teacher") {
        const isCourseTeacher = enrollment.course?.teacher && String(enrollment.course.teacher.id) === String(req.user.id);
        const isGroupTeacher = enrollment.group?.teacher && String(enrollment.group.teacher.id) === String(req.user.id);
        if (!isCourseTeacher && !isGroupTeacher) {
          return res.status(403).json({ error: "You do not teach this course or group" });
        }
      }

      enrollment.status = status;
      await enrollmentRepository.save(enrollment);

      let whatsappNotification: any = null;
      if (status === "active" && enrollment.student?.phone) {
        const title = enrollment.course?.title || enrollment.group?.name || "الدورة التعليمية";
        const teacherName = enrollment.course?.teacher?.name || enrollment.group?.teacher?.name;
        const msg = buildEnrollmentAcceptedMessage(
          enrollment.student.name,
          title,
          teacherName
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
      const { name, meetingLink, customCategories, phone, education, location, avatar } = req.body;
      const userRepository = AppDataSource.getRepository(User);
      
      const user = await userRepository.findOneBy({ id: req.user!.id });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // If user is student, allow updating education and avatar only (phone numbers are managed by admin)
      if (req.user?.role === "student") {
        if (avatar !== undefined) user.avatar = avatar;
        if (education !== undefined) user.education = education;
        await userRepository.save(user);
        const { password, ...safeUser } = user;
        return res.json(safeUser);
      }

      if (name) user.name = name;
      // Phone numbers are locked and can only be directly updated by admin; others use requestPhoneChange
      if (req.user?.role === "admin") {
        if (phone !== undefined) user.phone = phone;
        if (req.body.parentPhone !== undefined) user.parentPhone = req.body.parentPhone;
      }
      if (location !== undefined) user.location = location;
      if (customCategories !== undefined) user.customCategories = customCategories;
      if (avatar !== undefined) user.avatar = avatar;

      await userRepository.save(user);

      // exclude password
      const { password, ...safeUser } = user;
      return res.json(safeUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // Request phone number change (sent to admin for review and approval)
  static async requestPhoneChange(req: AuthRequest, res: Response) {
    try {
      const { newPhone, phoneType, reason } = req.body;
      if (!newPhone || !newPhone.trim()) {
        return res.status(400).json({ error: "رقم الهاتف الجديد مطلوب." });
      }

      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOneBy({ id: req.user!.id });
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود." });
      }

      const currentPhone = phoneType === "parent" ? (user.parentPhone || "غير مسجل") : (user.phone || "غير مسجل");
      const targetLabel = phoneType === "parent" ? "هاتف ولي الأمر" : "هاتف الحساب";

      // Find all admins
      const admins = await userRepo.find({ where: { role: "admin" } });
      const roleLabel = user.role === "student" ? "طالب" : user.role === "parent" ? "ولي أمر" : user.role === "teacher" ? "معلم" : user.role;
      const title = `طلب تعديل ${targetLabel} 📱`;
      const message = `قام (${user.name} - ${roleLabel}) بطلب تعديل ${targetLabel} من [${currentPhone}] إلى [${newPhone.trim()}]. ${reason ? 'السبب: ' + reason.trim() : ''}`;

      for (const admin of admins) {
        await NotificationController.createNotification(
          admin.id,
          title,
          message,
          "warning",
          `#admin-dashboard`
        );
      }

      return res.json({
        success: true,
        message: "تم إرسال طلب تعديل رقم الهاتف إلى إدارة المنصة بنجاح. سيتم مراجعته واعتماده قريباً."
      });
    } catch (error) {
      console.error("Error in requestPhoneChange:", error);
      return res.status(500).json({ error: "فشل إرسال طلب تعديل رقم الهاتف." });
    }
  }

  // Upload Avatar for any authenticated user (Student, Teacher, Admin)
  static async uploadAvatar(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "لم يتم اختيار أي ملف صورة" });
      }

      const avatarUrl = `/uploads/${req.file.filename}`;
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOneBy({ id: req.user!.id });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      user.avatar = avatarUrl;
      await userRepository.save(user);

      const { password, ...safeUser } = user;
      return res.json({
        success: true,
        message: "تم تحديث صورتك الشخصية بنجاح! 📸",
        avatar: avatarUrl,
        user: safeUser
      });
    } catch (error) {
      console.error("Avatar upload error:", error);
      return res.status(500).json({ error: "فشل رفع الصورة الشخصية" });
    }
  }

  // Change Password for any authenticated user (Student, Teacher, Admin)
  static async changePassword(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "غير مصرح / Unauthorized" });
      }

      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "يرجى إدخال كلمة المرور الحالية وكلمة المرور الجديدة." });
      }

      if (typeof newPassword !== "string" || newPassword.length < 6) {
        return res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تكون 6 أحرف أو أرقام على الأقل." });
      }

      if (confirmPassword !== undefined && newPassword !== confirmPassword) {
        return res.status(400).json({ error: "كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقين." });
      }

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOneBy({ id: userId });

      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود." });
      }

      if (user.password) {
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(400).json({ error: "كلمة المرور الحالية غير صحيحة." });
        }

        const isSame = await bcrypt.compare(newPassword, user.password);
        if (isSame) {
          return res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية." });
        }
      }

      user.password = await bcrypt.hash(newPassword, 10);
      await userRepository.save(user);

      return res.json({
        success: true,
        message: "تم تغيير كلمة المرور بنجاح! 🔒"
      });
    } catch (error) {
      console.error("Change password error:", error);
      return res.status(500).json({ error: "حدث خطأ أثناء تغيير كلمة المرور، يرجى المحاولة لاحقاً." });
    }
  }

  // Add Student (Admin only)
  static async addStudent(req: AuthRequest, res: Response) {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized. Admin only." });
      }

      const { name, email, password, phone, parentPhone, location, education, courseId, notes } = req.body;

      if (!name || !email || !education || !parentPhone) {
        return res.status(400).json({ error: "الرجاء اختيار المستوى الدراسي وتعبئة الاسم والبريد الإلكتروني ورقم هاتف ولي الأمر." });
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
          parentPhone: parentPhone || null,
          location: location || null,
          education: education || null,
          notes: notes || null,
          avatar: "assets/logo.png"
        });
        await userRepo.save(student);
      } else {
        // Update existing student details if provided
        if (name) student.name = name;
        if (phone) student.phone = phone;
        if (parentPhone) student.parentPhone = parentPhone;
        if (location) student.location = location;
        if (education) student.education = education;
        if (notes !== undefined) student.notes = notes;
        await userRepo.save(student);
      }

      // Determine target course for enrollment
      let targetCourse: Course | null = null;
      if (courseId) {
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

  // Delete Student or Remove Enrollment (Admin Only)
  static async deleteStudent(req: AuthRequest, res: Response) {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "عفواً، لا يملك المعلم صلاحية حذف أو إزالة الطلاب. هذه الصلاحية خاصة بإدارة المنصة فقط." });
      }

      const { studentId } = req.params;
      const { courseId } = req.query;

      const userRepo = AppDataSource.getRepository(User);
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);

      const student = await userRepo.findOneBy({ id: studentId });
      if (!student) {
        return res.status(404).json({ error: "الطالب غير موجود." });
      }

      if (courseId) {
        await enrollmentRepo.delete({ student: { id: studentId }, course: { id: courseId as string } });
        return res.json({ message: "تم إزالة الطالب من الدورة بنجاح." });
      } else {
        await enrollmentRepo.delete({ student: { id: studentId } });
        await userRepo.delete({ id: studentId });
        return res.json({ message: "تم حذف حساب الطالب بالكامل بنجاح." });
      }
    } catch (error) {
      console.error("Error deleting student:", error);
      return res.status(500).json({ error: "فشل حذف الطالب." });
    }
  }
}
