import { Response } from "express";
import { AppDataSource } from "../data-source";
import { CourseGroup } from "../entity/CourseGroup";
import { Course } from "../entity/Course";
import { Enrollment } from "../entity/Enrollment";
import { User } from "../entity/User";
import { Session } from "../entity/Session";
import { NotificationController } from "./NotificationController";
import { AuthRequest } from "../middleware/auth";

export class CourseGroupController {
  // GET /courses/:courseId/groups
  static async getCourseGroups(req: any, res: Response) {
    try {
      const { courseId } = req.params;
      const groupRepo = AppDataSource.getRepository(CourseGroup);
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);

      const groups = await groupRepo.find({
        where: { course: { id: courseId } },
        relations: ["teacher", "course"],
        order: { createdAt: "ASC" }
      });

      const groupsWithStats = await Promise.all(
        groups.map(async (group) => {
          const enrolledCount = await enrollmentRepo.count({
            where: {
              group: { id: group.id },
              status: "active"
            }
          });

          const pendingCount = await enrollmentRepo.count({
            where: {
              group: { id: group.id },
              status: "pending"
            }
          });

          const totalOccupied = enrolledCount + pendingCount;
          const maxSeats = group.maxStudents || 20;
          const availableSeats = Math.max(0, maxSeats - totalOccupied);
          const isFull = totalOccupied >= maxSeats;

          return {
            ...group,
            enrolledCount: totalOccupied,
            activeCount: enrolledCount,
            pendingCount: pendingCount,
            availableSeats,
            isFull,
            status: isFull ? "FULL" : group.status
          };
        })
      );

      return res.status(200).json(groupsWithStats);
    } catch (err: any) {
      console.error("Error fetching course groups:", err);
      return res.status(500).json({ error: "Failed to fetch course groups." });
    }
  }

  // POST /courses/:courseId/groups
  static async createGroup(req: AuthRequest, res: Response) {
    try {
      const { courseId } = req.params;
      let { 
        name, 
        scheduleDays, 
        scheduleTime, 
        scheduleText, 
        maxStudents, 
        meetingLink,
        startDate,
        endDate,
        totalSessions,
        sessionDuration,
        sessionPrice,
        billingCycle,
        monthlyPrice,
        platformCommissionPercent
      } = req.body;

      const scheduleDaysStr = scheduleDays || "";
      const scheduleTimeStr = scheduleTime || "";
      const scheduleTextStr = scheduleText || `${scheduleDaysStr} ${scheduleTimeStr}`.trim() || "يحدد لاحقاً";

      if (!name || !name.trim()) {
        name = `مجموعة ${scheduleDaysStr || 'الأسبوعية'} (${scheduleTimeStr || 'مسائي'})`.trim();
      }

      const courseRepo = AppDataSource.getRepository(Course);
      const groupRepo = AppDataSource.getRepository(CourseGroup);
      const userRepo = AppDataSource.getRepository(User);

      const course = await courseRepo.findOne({
        where: { id: courseId },
        relations: ["teacher"]
      });

      if (!course) {
        return res.status(404).json({ error: "Course not found." });
      }

      // Check authorization (must be course teacher or admin)
      if (req.user!.role !== "admin" && course.teacher?.id !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to add groups to this course." });
      }

      const teacher = course.teacher || (await userRepo.findOneBy({ id: req.user!.id }));
      const isAdmin = req.user!.role === "admin";

      // If non-admin (Teacher), enforce platform defaults and PENDING_APPROVAL status
      // Teacher gets paid BY HOUR (not multiplied by students count)
      const defaultTeacherHourly = teacher?.hourlyRate || 100;
      const parsedTeacherHourlyRate = isAdmin && req.body.teacherHourlyRate !== undefined ? parseFloat(req.body.teacherHourlyRate) : defaultTeacherHourly;
      const parsedStudentHourlyRate = isAdmin && req.body.studentHourlyRate !== undefined ? parseFloat(req.body.studentHourlyRate) : 40;
      const parsedSessionPrice = isAdmin && sessionPrice !== undefined ? parseFloat(sessionPrice) : parsedStudentHourlyRate;
      const parsedMonthlyPrice = isAdmin && monthlyPrice !== undefined ? parseFloat(monthlyPrice) : (parsedSessionPrice * 8);
      const parsedMaxStudents = isAdmin && maxStudents !== undefined ? parseInt(maxStudents, 10) : 25;
      const parsedCommission = isAdmin && platformCommissionPercent !== undefined ? parseFloat(platformCommissionPercent) : 50;

      const group = new CourseGroup();
      group.name = name;
      group.course = course;
      group.teacher = teacher;
      group.scheduleDays = scheduleDaysStr;
      group.scheduleTime = scheduleTimeStr;
      group.scheduleText = scheduleTextStr;
      group.maxStudents = parsedMaxStudents;
      group.totalSessions = totalSessions ? parseInt(totalSessions, 10) : 24;
      group.sessionDuration = sessionDuration ? parseInt(sessionDuration, 10) : 60;
      group.sessionPrice = parsedSessionPrice;
      group.studentHourlyRate = parsedStudentHourlyRate;
      group.teacherHourlyRate = parsedTeacherHourlyRate;
      group.billingCycle = billingCycle || "شهريًّا";
      group.monthlyPrice = parsedMonthlyPrice;
      group.platformCommissionPercent = parsedCommission;
      group.startDate = startDate ? new Date(startDate) : null;
      group.endDate = endDate ? new Date(endDate) : null;
      group.meetingLink = meetingLink || course.meetingLink || "";
      group.status = isAdmin ? "OPEN" : "PENDING_APPROVAL";

      const saved = await groupRepo.save(group);
      return res.status(201).json(saved);
    } catch (err: any) {
      console.error("Error creating course group:", err);
      return res.status(500).json({ error: "Failed to create course group." });
    }
  }

  // GET /admin/groups/pending-approval
  static async getPendingGroups(req: AuthRequest, res: Response) {
    try {
      const groupRepo = AppDataSource.getRepository(CourseGroup);
      const groups = await groupRepo.find({
        where: { status: "PENDING_APPROVAL" },
        relations: ["teacher", "course", "course.subject", "course.grade"],
        order: { createdAt: "DESC" }
      });
      return res.status(200).json(groups);
    } catch (err: any) {
      console.error("Error fetching pending groups:", err);
      return res.status(500).json({ error: "Failed to fetch pending groups." });
    }
  }

  // POST /admin/groups/:id/approve
  static async approveGroup(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { 
        sessionPrice, 
        studentHourlyRate, 
        teacherHourlyRate, 
        monthlyPrice, 
        maxStudents, 
        platformCommissionPercent,
        startDate,
        endDate,
        totalSessions,
        sessionDuration
      } = req.body;
      const groupRepo = AppDataSource.getRepository(CourseGroup);
      const group = await groupRepo.findOne({
        where: { id },
        relations: ["teacher", "course"]
      });

      if (!group) {
        return res.status(404).json({ error: "Group not found." });
      }

      if (studentHourlyRate !== undefined) {
        group.studentHourlyRate = parseFloat(studentHourlyRate);
        group.sessionPrice = parseFloat(studentHourlyRate);
      } else if (sessionPrice !== undefined) {
        group.sessionPrice = parseFloat(sessionPrice);
        group.studentHourlyRate = parseFloat(sessionPrice);
      }

      if (teacherHourlyRate !== undefined) {
        group.teacherHourlyRate = parseFloat(teacherHourlyRate);
      }

      if (monthlyPrice !== undefined) {
        group.monthlyPrice = parseFloat(monthlyPrice);
      } else {
        group.monthlyPrice = group.sessionPrice * 8;
      }
      
      if (maxStudents !== undefined) group.maxStudents = parseInt(maxStudents, 10);
      if (totalSessions !== undefined) group.totalSessions = parseInt(totalSessions, 10);
      if (sessionDuration !== undefined) group.sessionDuration = parseInt(sessionDuration, 10);
      if (startDate !== undefined) group.startDate = startDate ? new Date(startDate) : null;
      if (endDate !== undefined) group.endDate = endDate ? new Date(endDate) : null;
      if (platformCommissionPercent !== undefined) group.platformCommissionPercent = parseFloat(platformCommissionPercent);
      
      group.status = "OPEN";
      const saved = await groupRepo.save(group);
      return res.status(200).json({ message: "Group approved successfully.", group: saved });
    } catch (err: any) {
      console.error("Error approving group:", err);
      return res.status(500).json({ error: "Failed to approve group." });
    }
  }

  // POST /admin/groups/:id/reject
  static async rejectGroup(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const groupRepo = AppDataSource.getRepository(CourseGroup);
      const group = await groupRepo.findOne({ where: { id } });

      if (!group) {
        return res.status(404).json({ error: "Group not found." });
      }

      group.status = "REJECTED";
      const saved = await groupRepo.save(group);
      return res.status(200).json({ message: "Group rejected.", group: saved });
    } catch (err: any) {
      console.error("Error rejecting group:", err);
      return res.status(500).json({ error: "Failed to reject group." });
    }
  }

  // PUT /groups/:id
  static async updateGroup(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { 
        name, 
        scheduleDays, 
        scheduleTime, 
        scheduleText, 
        maxStudents, 
        meetingLink, 
        status,
        startDate,
        endDate,
        totalSessions,
        sessionDuration,
        sessionPrice,
        studentHourlyRate,
        teacherHourlyRate,
        billingCycle,
        monthlyPrice,
        platformCommissionPercent,
        teacherId
      } = req.body;

      const groupRepo = AppDataSource.getRepository(CourseGroup);
      const userRepo = AppDataSource.getRepository(User);
      const group = await groupRepo.findOne({
        where: { id },
        relations: ["course", "course.teacher", "teacher"]
      });

      if (!group) {
        return res.status(404).json({ error: "Course group not found." });
      }

      // Authorization
      if (req.user!.role !== "admin" && group.course?.teacher?.id !== req.user!.id && group.teacher?.id !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to update this group." });
      }

      if (name !== undefined) group.name = name;
      if (scheduleDays !== undefined) group.scheduleDays = scheduleDays;
      if (scheduleTime !== undefined) group.scheduleTime = scheduleTime;
      if (scheduleText !== undefined) group.scheduleText = scheduleText;
      if (maxStudents !== undefined) group.maxStudents = parseInt(maxStudents, 10);
      if (totalSessions !== undefined) group.totalSessions = parseInt(totalSessions, 10);
      if (sessionDuration !== undefined) group.sessionDuration = parseInt(sessionDuration, 10);
      
      if (studentHourlyRate !== undefined) {
        group.studentHourlyRate = parseFloat(studentHourlyRate);
        group.sessionPrice = parseFloat(studentHourlyRate);
      } else if (sessionPrice !== undefined) {
        group.sessionPrice = parseFloat(sessionPrice);
        group.studentHourlyRate = parseFloat(sessionPrice);
      }

      if (teacherHourlyRate !== undefined) {
        group.teacherHourlyRate = parseFloat(teacherHourlyRate);
      }

      if (billingCycle !== undefined) group.billingCycle = billingCycle;
      if (monthlyPrice !== undefined) {
        group.monthlyPrice = parseFloat(monthlyPrice);
      } else if (group.sessionPrice) {
        group.monthlyPrice = group.sessionPrice * 8;
      }

      if (platformCommissionPercent !== undefined) group.platformCommissionPercent = parseFloat(platformCommissionPercent);
      if (startDate !== undefined) group.startDate = startDate ? new Date(startDate) : null;
      if (endDate !== undefined) group.endDate = endDate ? new Date(endDate) : null;
      if (meetingLink !== undefined) group.meetingLink = meetingLink;
      if (status !== undefined) group.status = status;

      if (teacherId !== undefined && req.user!.role === "admin") {
        const newTeacher = await userRepo.findOneBy({ id: teacherId });
        if (newTeacher) {
          group.teacher = newTeacher;
        }
      }

      const updated = await groupRepo.save(group);
      return res.status(200).json(updated);
    } catch (err: any) {
      console.error("Error updating course group:", err);
      return res.status(500).json({ error: "Failed to update course group." });
    }
  }

  // DELETE /groups/:id
  static async deleteGroup(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const groupRepo = AppDataSource.getRepository(CourseGroup);
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);
      const sessionRepo = AppDataSource.getRepository(Session);

      const group = await groupRepo.findOne({
        where: { id },
        relations: ["course", "course.teacher"]
      });

      if (!group) {
        return res.status(404).json({ error: "المجموعة الدراسية غير موجودة." });
      }

      // Authorization
      if (req.user!.role !== "admin" && group.course?.teacher?.id !== req.user!.id) {
        return res.status(403).json({ error: "ليس لديك صلاحية لحذف هذه المجموعة." });
      }

      // Check if there are any enrolled students in this group (active or pending)
      const enrolledCount = await enrollmentRepo.count({
        where: { group: { id } }
      });

      if (enrolledCount > 0) {
        return res.status(400).json({
          error: `لا يمكن حذف هذه المجموعة لوجود طلاب مسجلين بها (${enrolledCount} طالب). يجب إزالة أو نقل جميع الطلاب من المجموعة أولاً قبل حذفها.`
        });
      }

      // If group has no students, remove any leftover scheduled sessions for this group's course
      if (group.course?.id) {
        const sessions = await sessionRepo.find({
          where: { course: { id: group.course.id } }
        });
        if (sessions.length > 0) {
          await sessionRepo.remove(sessions);
        }
      }

      await groupRepo.remove(group);
      return res.status(200).json({ message: "تم حذف المجموعة الدراسية بنجاح." });
    } catch (err: any) {
      console.error("Error deleting course group:", err);
      return res.status(500).json({ error: "فشل حذف المجموعة الدراسية." });
    }
  }

  // GET /groups/:id/roster
  static async getGroupRoster(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const groupRepo = AppDataSource.getRepository(CourseGroup);
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);

      const group = await groupRepo.findOne({
        where: { id },
        relations: ["course", "course.teacher", "teacher"]
      });

      if (!group) {
        return res.status(404).json({ error: "Course group not found." });
      }

      if (req.user!.role !== "admin" && group.course?.teacher?.id !== req.user!.id && group.teacher?.id !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to view this group's roster." });
      }

      const enrollments = await enrollmentRepo.find({
        where: { group: { id } },
        relations: ["student", "payment"],
        order: { createdAt: "ASC" }
      });

      return res.status(200).json({
        group: {
          id: group.id,
          name: group.name,
          maxStudents: group.maxStudents || 25,
          scheduleText: group.scheduleText || `${group.scheduleDays || ''} ${group.scheduleTime || ''}`.trim(),
          status: group.status,
          teacher: group.teacher || group.course?.teacher || null
        },
        totalStudents: enrollments.length,
        students: enrollments.map(e => ({
          enrollmentId: e.id,
          studentId: e.student?.id || null,
          name: e.student?.name || "طالب",
          email: e.student?.email || "",
          phone: e.student?.phone || e.payment?.providerTransactionId || "",
          status: e.status,
          progress: e.progress || 0,
          payment: e.payment ? {
            amount: e.payment.amount,
            status: e.payment.status,
            provider: e.payment.provider,
            providerTransactionId: e.payment.providerTransactionId,
            receiptUrl: e.payment.receiptUrl
          } : null,
          enrolledAt: e.createdAt
        }))
      });
    } catch (err: any) {
      console.error("Error fetching group roster:", err);
      return res.status(500).json({ error: "Failed to fetch group roster." });
    }
  }

  // GET /teacher/groups - Get all groups for the logged-in teacher
  static async getMyTeacherGroups(req: AuthRequest, res: Response) {
    try {
      const teacherId = req.user!.id;
      const groupRepo = AppDataSource.getRepository(CourseGroup);
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);

      const groups = await groupRepo.find({
        where: [
          { teacher: { id: teacherId } },
          { course: { teacher: { id: teacherId } } }
        ],
        relations: ["course", "course.grade", "course.subject", "teacher"],
        order: { createdAt: "DESC" }
      });

      const groupsWithStats = await Promise.all(
        groups.map(async (group) => {
          const activeEnrollments = await enrollmentRepo.find({
            where: { group: { id: group.id }, status: "active" },
            relations: ["student"]
          });
          const pendingCount = await enrollmentRepo.count({
            where: { group: { id: group.id }, status: "pending" }
          });

          const activeCount = activeEnrollments.length;
          const totalOccupied = activeCount + pendingCount;
          const maxSeats = group.maxStudents || 25;
          const availableSeats = Math.max(0, maxSeats - totalOccupied);
          const isFull = totalOccupied >= maxSeats;

          return {
            ...group,
            enrolledCount: totalOccupied,
            activeCount,
            pendingCount,
            availableSeats,
            isFull,
            students: activeEnrollments.map(e => e.student)
          };
        })
      );

      return res.status(200).json(groupsWithStats);
    } catch (err: any) {
      console.error("Error fetching teacher groups:", err);
      return res.status(500).json({ error: "Failed to fetch teacher groups." });
    }
  }

  // GET /admin/all-groups - Get all groups in system
  static async getAllGroups(req: AuthRequest, res: Response) {
    try {
      const groupRepo = AppDataSource.getRepository(CourseGroup);
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);

      const groups = await groupRepo.find({
        relations: ["course", "course.grade", "course.subject", "teacher", "course.teacher"],
        order: { createdAt: "DESC" }
      });

      const groupsWithStats = await Promise.all(
        groups.map(async (group) => {
          const activeCount = await enrollmentRepo.count({
            where: { group: { id: group.id }, status: "active" }
          });
          const maxSeats = group.maxStudents || 25;
            return {
              ...group,
              enrolledCount: activeCount,
              availableSeats: Math.max(0, maxSeats - activeCount),
              isFull: activeCount >= maxSeats
            };
          })
        );

        return res.status(200).json(groupsWithStats);
      } catch (err: any) {
        console.error("Error fetching all groups for admin:", err);
        return res.status(500).json({ error: "Failed to fetch groups." });
      }
    }

  // POST /admin/groups/:id/add-student
  static async addStudentToGroup(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { studentId } = req.body;
      if (!studentId) {
        return res.status(400).json({ error: "Missing studentId." });
      }

      const groupRepo = AppDataSource.getRepository(CourseGroup);
      const userRepo = AppDataSource.getRepository(User);
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);
      const sessionRepo = AppDataSource.getRepository(Session);

      const group = await groupRepo.findOne({
        where: { id },
        relations: ["course", "teacher", "course.teacher"]
      });
      if (!group) {
        return res.status(404).json({ error: "المجموعة الدراسية غير موجودة." });
      }

      const student = await userRepo.findOneBy({ id: studentId });
      if (!student) {
        return res.status(404).json({ error: "الطالب غير موجود بالنظام." });
      }

      // Check current capacity and available seats
      const activeCount = await enrollmentRepo.count({
        where: { group: { id }, status: "active" }
      });
      const maxSeats = group.maxStudents || 25;

      let enrollment = await enrollmentRepo.findOne({
        where: { student: { id: studentId }, group: { id } }
      });

      // If student is not already active in this group, enforce seat availability
      if (!enrollment || enrollment.status !== "active") {
        if (activeCount >= maxSeats) {
          return res.status(400).json({
            error: `عذراً، اكتملت جميع مقاعد هذه المجموعة (${maxSeats} من ${maxSeats} مقعداً). لا توجد مقاعد شاغرة لإضافة طلاب جدد.`
          });
        }
      }

      if (!enrollment) {
        enrollment = new Enrollment();
        enrollment.student = student;
        enrollment.course = group.course;
        enrollment.group = group;
        enrollment.progress = 0;
        enrollment.completedLessons = [];
      }

      enrollment.status = "active";
      await enrollmentRepo.save(enrollment);

      // Fetch group sessions to confirm auto-scheduled sessions count
      const courseId = group.course?.id;
      let groupSessions: Session[] = [];
      if (courseId) {
        groupSessions = await sessionRepo.find({
          where: { course: { id: courseId } }
        });
      }

      const teacher = group.teacher || group.course?.teacher;

      // 1. Notify Student about new group enrollment and schedule access
      try {
        await NotificationController.createNotification(
          student.id,
          "تم إضافتك وتسكينك بمجموعة دراسية جديدة! 🎓",
          `قام المشرف بتسكينك في مجموعة "${group.name}" مع الأستاذ ${teacher?.name || 'المعلم'}. تم إدراج كافة مواعيد الحصص التفاعلية (${groupSessions.length} حصة) في جدولك الدراسي.`,
          "success",
          "#student/groups"
        );
      } catch (e) {}

      // 2. Notify Teacher about new enrolled student
      if (teacher) {
        try {
          await NotificationController.createNotification(
            teacher.id,
            "طالب جديد انضم لمجموعتك 👨‍🎓",
            `قام المشرف بتسكين الطالب "${student.name}" في مجموعة "${group.name}". إجمالي المقاعد المشغولة الآن: (${activeCount + 1} من ${maxSeats}).`,
            "info",
            "#teacher-dashboard/groups"
          );
        } catch (e) {}
      }

      const remainingSeats = Math.max(0, maxSeats - (activeCount + 1));

      return res.status(200).json({
        message: `تمت إضافة الطالب للمجموعة وتفعيل مقعده تلقائياً وإدراج جدول الحصص (${groupSessions.length} حصة) بنجاح! 🎉`,
        enrollment,
        sessionsCount: groupSessions.length,
        availableSeats: remainingSeats,
        enrolledCount: activeCount + 1
      });
    } catch (err: any) {
      console.error("Error adding student to group:", err);
      return res.status(500).json({ error: err.message || "فشل إضافة الطالب إلى المجموعة." });
    }
  }

  // POST /admin/groups/:id/remove-student
  static async removeStudentFromGroup(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { studentId, enrollmentId } = req.body;

      const enrollmentRepo = AppDataSource.getRepository(Enrollment);
      const sessionRepo = AppDataSource.getRepository(Session);
      const groupRepo = AppDataSource.getRepository(CourseGroup);

      let enrollment: Enrollment | null = null;
      if (enrollmentId) {
        enrollment = await enrollmentRepo.findOne({
          where: { id: enrollmentId },
          relations: ["student", "group", "course", "group.course"]
        });
      } else if (studentId) {
        enrollment = await enrollmentRepo.findOne({
          where: { student: { id: studentId }, group: { id } },
          relations: ["student", "group", "course", "group.course"]
        });
      }

      if (!enrollment) {
        return res.status(404).json({ error: "تسجيل الطالب غير موجود." });
      }

      const student = enrollment.student;
      const group = enrollment.group;
      const course = enrollment.course || group?.course;

      // Delete any student-specific 1-on-1 sessions created for this student in this course/group
      if (student && course) {
        const studentSpecificSessions = await sessionRepo.find({
          where: {
            student: { id: student.id },
            course: { id: course.id }
          }
        });
        if (studentSpecificSessions.length > 0) {
          await sessionRepo.remove(studentSpecificSessions);
        }
      }

      // Remove enrollment (this instantly removes cohort group & all group sessions from student dashboard)
      await enrollmentRepo.remove(enrollment);

      // Notify student
      if (student) {
        try {
          await NotificationController.createNotification(
            student.id,
            "تم إلغاء قيدك من المجموعة الدراسية ⚠️",
            `تم إلغاء قيدك من مجموعة "${group?.name || 'المجموعة'}" وحذف جميع الحصص والمواعيد التابعة لها من جدولك وحسابك.`,
            "info",
            "#student/groups"
          );
        } catch (e) {}
      }

      return res.status(200).json({
        message: "تمت إزالة الطالب من المجموعة وحذف جميع الحصص التابعة لها من حسابه بنجاح! ✅"
      });
    } catch (err: any) {
      console.error("Error removing student from group:", err);
      return res.status(500).json({ error: err.message || "فشل إزالة الطالب من المجموعة." });
    }
  }

  // POST /admin/groups/:id/start-teaching
  static async startTeachingAndGenerateSessions(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { startDate, sessionsList, meetingLink } = req.body || {};

      const groupRepo = AppDataSource.getRepository(CourseGroup);
      const sessionRepo = AppDataSource.getRepository(Session);
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);

      const group = await groupRepo.findOne({
        where: { id },
        relations: ["course", "teacher", "course.teacher"]
      });

      if (!group) {
        return res.status(404).json({ error: "المجموعة الدراسية غير موجودة." });
      }

      const teacher = group.teacher || group.course?.teacher;
      if (!teacher) {
        return res.status(400).json({ error: "يجب تحديد معلم مشرف للمجموعة أولاً قبل بدء التدريس." });
      }

      if (meetingLink) {
        group.meetingLink = meetingLink;
      }
      if (startDate) {
        group.startDate = new Date(startDate);
      }
      group.status = "IN_PROGRESS";
      await groupRepo.save(group);

      // Remove any previous scheduled sessions for this group/course to prevent duplication on reopen & re-close
      if (group.course?.id) {
        const existingSessions = await sessionRepo.find({
          where: {
            course: { id: group.course.id },
            status: "SCHEDULED"
          }
        });
        if (existingSessions.length > 0) {
          await sessionRepo.remove(existingSessions);
        }
      }

      const createdSessions: Session[] = [];

      if (Array.isArray(sessionsList) && sessionsList.length > 0) {
        for (let i = 0; i < sessionsList.length; i++) {
          const item = sessionsList[i];
          const sess = new Session();
          sess.title = item.title || `${group.name} - حصة ${i + 1}`;
          sess.description = item.description || `حصة تفاعلية مباشرة ضمن ${group.name}`;
          sess.course = group.course;
          sess.teacher = teacher;
          sess.student = null as any;
          sess.scheduledAt = new Date(item.scheduledAt);
          sess.duration = item.duration || group.sessionDuration || 60;
          sess.status = "SCHEDULED";
          createdSessions.push(sess);
        }
      } else {
        const dayIndexMap: Record<string, number> = {
          'الأحد': 0, 'الاثنين': 1, 'الإثنين': 1, 'الثلاثاء': 2,
          'الأربعاء': 3, 'الخميس': 4, 'الجمعة': 5, 'السبت': 6
        };

        const daysArr = (group.scheduleDays || "الأحد، الثلاثاء").split(/[,،]+/).map(d => d.trim());
        const targetDays = daysArr.map(d => dayIndexMap[d]).filter(d => d !== undefined);
        const total = group.totalSessions || 24;
        const duration = group.sessionDuration || 60;

        let hour = 18;
        let min = 0;
        const timeStr = group.scheduleTime || "18:00";
        const isPM = timeStr.includes("م") || timeStr.toLowerCase().includes("pm");
        const isAM = timeStr.includes("ص") || timeStr.toLowerCase().includes("am");
        const cleanTime = timeStr.replace(/[^0-9:]/g, "");
        const parts = cleanTime.split(":");
        if (parts.length >= 1) {
          hour = parseInt(parts[0], 10) || 18;
          if (isPM && hour < 12) hour += 12;
          if (isAM && hour === 12) hour = 0;
        }
        if (parts.length >= 2) {
          min = parseInt(parts[1], 10) || 0;
        }

        let currDate = new Date(startDate || group.startDate || new Date());
        currDate.setHours(hour, min, 0, 0);

        let count = 0;
        let safety = 0;
        while (count < total && safety < 1000) {
          safety++;
          if (targetDays.length === 0 || targetDays.includes(currDate.getDay())) {
            count++;
            const sess = new Session();
            sess.title = `${group.name} - حصة ${count}`;
            sess.description = `حصة تفاعلية مباشرة ضمن ${group.name}`;
            sess.course = group.course;
            sess.teacher = teacher;
            sess.student = null as any;
            sess.scheduledAt = new Date(currDate);
            sess.duration = duration;
            sess.status = "SCHEDULED";
            createdSessions.push(sess);
          }
          currDate.setDate(currDate.getDate() + 1);
        }
      }

      await sessionRepo.save(createdSessions);

      // Notify Teacher
      try {
        await NotificationController.createNotification(
          teacher.id,
          "تم بدء التدريس لمجموعتك بنجاح! 🎓",
          `تم إغلاق التسجيل وبدء التدريس لمجموعة "${group.name}". تم توليد وإضافة (${createdSessions.length}) حصة مباشرة إلى جدولك وتعيين مواعيدها.`,
          "success",
          "#teacher-dashboard/groups"
        );
      } catch (e) {}

      // Notify all active enrolled students
      try {
        const enrollments = await enrollmentRepo.find({
          where: { group: { id }, status: "active" },
          relations: ["student"]
        });

        for (const enr of enrollments) {
          if (enr.student) {
            await NotificationController.createNotification(
              enr.student.id,
              "انطلاق الحصص الدراسية لمجموعتك! 🚀",
              `تهانينا! تم إغلاق باب التسجيل وبدء الدراسة لمجموعة "${group.name}". تم إدراج جدول الحصص (${createdSessions.length} حصة) في حسابك ويمكنك الدخول لقاعة البث المباشر في المواعيد المحددة.`,
              "info",
              "#student/groups"
            );
          }
        }
      } catch (e) {}

      return res.status(200).json({
        message: `تم بدء التدريس وتوليد (${createdSessions.length}) حصة دراسية بنجاح! 🚀`,
        group,
        sessionsCount: createdSessions.length,
        firstSession: createdSessions[0]?.scheduledAt,
        lastSession: createdSessions[createdSessions.length - 1]?.scheduledAt
      });
    } catch (err: any) {
      console.error("Error starting teaching and generating sessions:", err);
      return res.status(500).json({ error: err.message || "فشل بدء التدريس وتوليد الحصص." });
    }
  }

  // GET /groups/:id/sessions
  static async getGroupSessions(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const groupRepo = AppDataSource.getRepository(CourseGroup);
      const sessionRepo = AppDataSource.getRepository(Session);

      const group = await groupRepo.findOne({
        where: { id },
        relations: ["course", "teacher", "course.teacher"]
      });

      if (!group) {
        return res.status(404).json({ error: "Group not found." });
      }

      const courseId = group.course?.id;
      let sessions: Session[] = [];
      if (courseId) {
        sessions = await sessionRepo.find({
          where: { course: { id: courseId } },
          relations: ["teacher", "course"],
          order: { scheduledAt: "ASC" }
        });
      }

      // De-duplicate any legacy duplicated sessions
      const seen = new Set<string>();
      const uniqueSessions: Session[] = [];
      const duplicatesToRemove: Session[] = [];

      for (const s of sessions) {
        const timeKey = s.scheduledAt ? new Date(s.scheduledAt).toISOString().slice(0, 16) : s.id;
        const key = `${s.title}_${timeKey}`;
        if (seen.has(key)) {
          duplicatesToRemove.push(s);
        } else {
          seen.add(key);
          uniqueSessions.push(s);
        }
      }

      if (duplicatesToRemove.length > 0) {
        try {
          await sessionRepo.remove(duplicatesToRemove);
        } catch (e) {}
      }

      return res.status(200).json({
        group: {
          id: group.id,
          name: group.name,
          status: group.status,
          totalSessions: group.totalSessions,
          scheduleDays: group.scheduleDays,
          scheduleTime: group.scheduleTime,
          scheduleText: group.scheduleText,
          startDate: group.startDate,
          endDate: group.endDate,
          meetingLink: group.meetingLink,
          teacher: group.teacher || group.course?.teacher
        },
        sessionsCount: sessions.length,
        sessions
      });
    } catch (err: any) {
      console.error("Error fetching group sessions:", err);
      return res.status(500).json({ error: "Failed to fetch group sessions." });
    }
  }
}


