import { Response } from "express";
import { AppDataSource } from "../data-source";
import { CourseGroup } from "../entity/CourseGroup";
import { Course } from "../entity/Course";
import { Enrollment } from "../entity/Enrollment";
import { User } from "../entity/User";
import { Session } from "../entity/Session";
import { Assignment } from "../entity/Assignment";
import { AssignmentSubmission } from "../entity/AssignmentSubmission";
import { SessionAttendance } from "../entity/SessionAttendance";
import { Lesson } from "../entity/Lesson";
import { NotificationController } from "./NotificationController";
import { AuthRequest } from "../middleware/auth";
import { IsNull } from "typeorm";
import crypto from "crypto";

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
        name,
        teacherId,
        scheduleDays,
        scheduleTime,
        scheduleText,
        meetingLink,
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

      if (name && typeof name === "string" && name.trim()) {
        group.name = name.trim();
      }

      if (teacherId) {
        group.teacher = { id: teacherId } as any;
      }

      if (scheduleDays !== undefined) group.scheduleDays = scheduleDays;
      if (scheduleTime !== undefined) group.scheduleTime = scheduleTime;
      if (scheduleText !== undefined) group.scheduleText = scheduleText;
      if (meetingLink !== undefined) group.meetingLink = meetingLink;

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
        group.monthlyPrice = (group.sessionPrice || 50) * 8;
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
        students: enrollments.map(e => {
          const isAdmin = req.user?.role === "admin";
          return {
            enrollmentId: e.id,
            studentId: e.student?.id || null,
            name: e.student?.name || "طالب",
            email: isAdmin ? (e.student?.email || "") : undefined,
            phone: isAdmin ? (e.student?.phone || e.payment?.providerTransactionId || "") : undefined,
            status: e.status,
            progress: e.progress || 0,
            payment: isAdmin && e.payment ? {
              amount: e.payment.amount,
              status: e.payment.status,
              provider: e.payment.provider,
              providerTransactionId: e.payment.providerTransactionId,
              receiptUrl: e.payment.receiptUrl
            } : null,
            enrolledAt: e.createdAt
          };
        })
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
          const allEnrollments = await enrollmentRepo.find({
            where: { group: { id: group.id } },
            relations: ["student", "payment"]
          });

          const activeEnrollments = allEnrollments.filter(e => 
            !e.status || e.status.toLowerCase() === "active" || e.status.toLowerCase() === "confirmed"
          );
          const pendingEnrollments = allEnrollments.filter(e => 
            e.status && e.status.toLowerCase() === "pending"
          );

          const activeCount = activeEnrollments.length;
          const pendingCount = pendingEnrollments.length;
          const totalOccupied = allEnrollments.length;
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
            students: allEnrollments
              .filter(e => e.student)
              .map(e => ({
                id: e.student.id,
                name: e.student.name,
                email: e.student.email,
                phone: e.student.phone,
                status: e.status || "active",
                progress: e.progress || 0,
                enrolledAt: e.createdAt
              }))
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
      const existingSessions = await sessionRepo.find({
        where: [
          { group: { id: group.id }, status: "SCHEDULED" },
          ...(group.course?.id ? [{ course: { id: group.course.id }, group: IsNull(), status: "SCHEDULED" as any }] : [])
        ]
      });
      if (existingSessions.length > 0) {
        await sessionRepo.remove(existingSessions);
      }

      const createdSessions: Session[] = [];

      if (Array.isArray(sessionsList) && sessionsList.length > 0) {
        for (let i = 0; i < sessionsList.length; i++) {
          const item = sessionsList[i];
          const sess = new Session();
          sess.title = item.title || `${group.name} - حصة ${i + 1}`;
          sess.description = item.description || `حصة تفاعلية مباشرة ضمن ${group.name}`;
          sess.course = group.course;
          sess.group = group;
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
            sess.group = group;
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
          relations: ["teacher", "course", "course.subject", "course.grade", "course.teacher"],
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

  // GET /groups/:id/hub - Fetch complete data for Group Hub Page
  static async getGroupHub(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id;
      const currentUserRole = req.user?.role;

      const groupRepo = AppDataSource.getRepository(CourseGroup);
      const sessionRepo = AppDataSource.getRepository(Session);
      const assignmentRepo = AppDataSource.getRepository(Assignment);
      const submissionRepo = AppDataSource.getRepository(AssignmentSubmission);
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);
      const attendanceRepo = AppDataSource.getRepository(SessionAttendance);

      const group = await groupRepo.findOne({
        where: { id },
        relations: [
          "course",
          "course.subject",
          "course.grade",
          "course.teacher",
          "teacher"
        ]
      });

      if (!group) {
        return res.status(404).json({ error: "المجموعة الدراسية غير موجودة." });
      }

      // Check access: Admin, Teacher of the group, or enrolled student
      const isTeacher = group.teacher?.id === currentUserId || group.course?.teacher?.id === currentUserId;
      const isAdmin = currentUserRole === "admin";

      let enrollment: Enrollment | null = null;
      if (!isAdmin && !isTeacher) {
        enrollment = await enrollmentRepo.findOne({
          where: { group: { id: group.id }, student: { id: currentUserId } }
        });
        if (!enrollment && group.course) {
          // Check if enrolled in course without group
          enrollment = await enrollmentRepo.findOne({
            where: { course: { id: group.course.id }, student: { id: currentUserId } }
          });
        }

        if (!enrollment) {
          return res.status(403).json({ error: "غير مصرح لك بالدخول إلى هذه المجموعة. يجب الاشتراك أولاً." });
        }
      }

      // Fetch group sessions (both explicitly assigned to this group, or course sessions if legacy)
      const courseId = group.course?.id;
      let sessions = await sessionRepo.find({
        where: [
          { group: { id: group.id } },
          ...(courseId ? [{ course: { id: courseId }, group: IsNull() }] : [])
        ],
        relations: ["teacher", "group"],
        order: { scheduledAt: "ASC" }
      });

      // Filter out duplicate sessions if any
      const seen = new Set<string>();
      const uniqueSessions: any[] = [];
      for (const s of sessions) {
        const timeKey = s.scheduledAt ? new Date(s.scheduledAt).toISOString().slice(0, 16) : s.id;
        const key = `${s.title}_${timeKey}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueSessions.push(s);
        }
      }

      // If student, attach attendance status for each session
      let attendedCount = 0;
      let completedSessionsCount = 0;
      const now = new Date();

      const sessionsWithAttendance = await Promise.all(
        uniqueSessions.map(async (sess) => {
          const sessDate = sess.scheduledAt ? new Date(sess.scheduledAt) : null;
          const isCompleted = sess.status === "COMPLETED" || (sessDate && (sessDate.getTime() + (sess.duration || 60) * 60000) < now.getTime());
          if (isCompleted) completedSessionsCount++;

          let myAttendance: string | null = null;
          if (currentUserId) {
            const att = await attendanceRepo.findOne({
              where: { session: { id: sess.id }, user: { id: currentUserId } }
            });
            if (att) {
              myAttendance = att.status;
              if (att.status === "PRESENT" || att.status === "LATE") {
                attendedCount++;
              }
            } else if (isCompleted) {
              myAttendance = "ABSENT";
            }
          }

          return {
            id: sess.id,
            title: sess.title,
            description: sess.description,
            scheduledAt: sess.scheduledAt,
            duration: sess.duration,
            status: sess.status,
            startedAt: sess.startedAt,
            completedAt: sess.completedAt,
            meetingLink: sess.meetingLink || group.meetingLink || group.course?.meetingLink,
            topic: sess.topic,
            whatWasCovered: sess.whatWasCovered,
            homework: sess.homework,
            teacherNotes: sess.teacherNotes,
            studentPerformance: sess.studentPerformance,
            myAttendance
          };
        })
      );

      // Fetch group assignments
      const assignments = await assignmentRepo.find({
        where: [
          { group: { id: group.id } },
          ...(courseId ? [{ course: { id: courseId }, group: IsNull() }] : [])
        ],
        relations: ["lesson"],
        order: { dueDate: "DESC", createdAt: "DESC" }
      });

      // Fetch lessons / videos for course (sorted newer first)
      const lessonRepo = AppDataSource.getRepository(Lesson);
      let videos: any[] = [];
      if (courseId) {
        const courseLessons = await lessonRepo.find({
          where: { course: { id: courseId } },
          order: { createdAt: "DESC" }
        });

        videos = (courseLessons || [])
          .filter((l: any) => l.videoUrl && l.videoUrl.trim().length > 0)
          .map((l: any) => ({
            id: l.id,
            title: l.title,
            description: l.description,
            videoUrl: l.videoUrl,
            duration: l.duration,
            chapter: l.chapter,
            photo: l.photo,
            notes: l.notes,
            resourceUrl: l.resourceUrl,
            resourceTitle: l.resourceTitle,
            createdAt: l.createdAt,
            updatedAt: l.updatedAt
          }))
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      const assignmentsWithSubmissions = await Promise.all(
        assignments.map(async (asgn) => {
          let mySubmission: any = null;
          if (currentUserId && !isTeacher && !isAdmin) {
            const sub = await submissionRepo.findOne({
              where: { assignment: { id: asgn.id }, student: { id: currentUserId } }
            });
            if (sub) {
              const isDraft = sub.status === 'draft_graded';
              mySubmission = {
                id: sub.id,
                status: isDraft ? 'submitted' : (sub.status || 'submitted'),
                grade: isDraft ? null : sub.grade,
                percentage: isDraft ? null : sub.percentage,
                overallFeedback: isDraft ? null : sub.overallFeedback,
                feedbackFileUrl: isDraft ? null : sub.feedbackFileUrl,
                feedbackFileName: isDraft ? null : sub.feedbackFileName,
                isLate: sub.isLate,
                submittedAt: sub.submittedAt,
                gradedAt: isDraft ? null : sub.gradedAt,
                content: sub.content,
                answers: isDraft ? (sub.answers || []).map((a: any) => ({ ...a, pointsAwarded: undefined, feedback: undefined })) : sub.answers
              };
            }
          }

          let submissionsCount = 0;
          if (isTeacher || isAdmin) {
            submissionsCount = await submissionRepo.count({
              where: { assignment: { id: asgn.id } }
            });
          }

          return {
            id: asgn.id,
            title: asgn.title,
            description: asgn.description,
            type: asgn.type || 'hybrid',
            totalPoints: asgn.totalPoints || 100,
            dueDate: asgn.dueDate,
            questions: asgn.questions,
            lesson: asgn.lesson ? { id: asgn.lesson.id, title: asgn.lesson.title } : null,
            createdAt: asgn.createdAt,
            mySubmission,
            submissionsCount
          };
        })
      );

      // Fetch roster / enrolled students
      const allEnrollments = await enrollmentRepo.find({
        where: { group: { id: group.id } },
        relations: ["student", "payment"],
        order: { createdAt: "ASC" }
      });

      const activeStudents = allEnrollments
        .filter(e => (!e.status || e.status === "active") && e.student)
        .map(e => ({
          id: e.student.id,
          name: e.student.name,
          avatar: e.student.avatar,
          email: (isTeacher || isAdmin) ? e.student.email : undefined,
          phone: (isTeacher || isAdmin) ? (e.student.phone || e.payment?.providerTransactionId) : undefined,
          progress: e.progress || 0,
          enrolledAt: e.createdAt
        }));

      const teacherData = group.teacher || group.course?.teacher;

      return res.status(200).json({
        group: {
          id: group.id,
          name: group.name,
          scheduleDays: group.scheduleDays,
          scheduleTime: group.scheduleTime,
          scheduleText: group.scheduleText,
          maxStudents: group.maxStudents,
          meetingLink: group.meetingLink || group.course?.meetingLink,
          status: group.status,
          startDate: group.startDate,
          endDate: group.endDate,
          totalSessions: group.totalSessions || 24,
          sessionDuration: group.sessionDuration || 60,
          sessionPrice: group.sessionPrice,
          monthlyPrice: group.monthlyPrice,
          billingCycle: group.billingCycle,
          announcements: group.announcements || []
        },
        course: group.course ? {
          id: group.course.id,
          title: group.course.title,
          description: group.course.description,
          image: group.course.image,
          subject: group.course.subject ? { id: group.course.subject.id, name: group.course.subject.name } : null,
          grade: group.course.grade ? { id: group.course.grade.id, name: group.course.grade.name } : null
        } : null,
        teacher: teacherData ? {
          id: teacherData.id,
          name: teacherData.name,
          avatar: teacherData.avatar,
          phone: (isAdmin || isTeacher) ? teacherData.phone : undefined
        } : null,
        videos, // Videos uploaded by teacher sorted newer first
        sessions: sessionsWithAttendance,
        assignments: assignmentsWithSubmissions,
        announcements: (group.announcements || []).sort((a: any, b: any) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }),
        stats: {
          totalSessions: group.totalSessions || sessionsWithAttendance.length,
          completedSessions: completedSessionsCount,
          enrolledCount: activeStudents.length,
          maxStudents: group.maxStudents || 25,
          userAttendance: (!isTeacher && !isAdmin) ? {
            attendedCount,
            completedSessionsCount,
            percentage: completedSessionsCount > 0 ? Math.round((attendedCount / completedSessionsCount) * 100) : 100
          } : null
        },
        students: (isTeacher || isAdmin) ? activeStudents : activeStudents.map(s => ({ id: s.id, name: s.name, avatar: s.avatar })),
        isTeacher,
        isAdmin,
        isStudent: !isTeacher && !isAdmin
      });
    } catch (err: any) {
      console.error("Error fetching group hub data:", err);
      return res.status(500).json({ error: "فشل تحميل بيانات صفحة المجموعة." });
    }
  }

  // POST /groups/:id/videos - Upload / Add a video lesson for group
  static async uploadGroupVideo(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { title, description, videoUrl, duration, chapter, photo, notes, resourceUrl, resourceTitle } = req.body;

      if (!title || !videoUrl) {
        return res.status(400).json({ error: "عنوان الفيديو ورابط الفيديو مطلوبان." });
      }

      const groupRepo = AppDataSource.getRepository(CourseGroup);
      const lessonRepo = AppDataSource.getRepository(Lesson);

      const group = await groupRepo.findOne({
        where: { id },
        relations: ["course", "course.teacher", "teacher"]
      });

      if (!group || !group.course) {
        return res.status(404).json({ error: "المجموعة أو الدورة غير موجودة." });
      }

      const isTeacher = group.teacher?.id === req.user?.id || group.course?.teacher?.id === req.user?.id;
      const isAdmin = req.user?.role === "admin";

      if (!isTeacher && !isAdmin) {
        return res.status(403).json({ error: "غير مصرح لك برفع فيديوهات لهذه المجموعة." });
      }

      const lesson = new Lesson();
      lesson.title = title.trim();
      lesson.description = description || null;
      lesson.videoUrl = videoUrl.trim();
      lesson.duration = duration || "0:00";
      lesson.chapter = chapter || "فيديوهات وشروحات";
      lesson.photo = photo || null;
      lesson.notes = notes || null;
      lesson.resourceUrl = resourceUrl || null;
      lesson.resourceTitle = resourceTitle || null;
      lesson.course = group.course;

      await lessonRepo.save(lesson);

      return res.status(201).json({ message: "تم رفع ونشر الفيديو بنجاح! 🎥✅", video: lesson });
    } catch (err: any) {
      console.error("Error uploading group video:", err);
      return res.status(500).json({ error: "فشل رفع الفيديو." });
    }
  }

  // DELETE /groups/:id/videos/:videoId - Delete a group video
  static async deleteGroupVideo(req: AuthRequest, res: Response) {
    try {
      const { id, videoId } = req.params;
      const groupRepo = AppDataSource.getRepository(CourseGroup);
      const lessonRepo = AppDataSource.getRepository(Lesson);

      const group = await groupRepo.findOne({
        where: { id },
        relations: ["course", "course.teacher", "teacher"]
      });

      if (!group) return res.status(404).json({ error: "المجموعة غير موجودة." });

      const isTeacher = group.teacher?.id === req.user?.id || group.course?.teacher?.id === req.user?.id;
      const isAdmin = req.user?.role === "admin";

      if (!isTeacher && !isAdmin) {
        return res.status(403).json({ error: "غير مصرح لك بحذف الفيديوهات." });
      }

      const lesson = await lessonRepo.findOne({ where: { id: videoId } });
      if (!lesson) return res.status(404).json({ error: "الفيديو غير موجود." });

      await lessonRepo.remove(lesson);
      return res.status(200).json({ message: "تم حذف الفيديو بنجاح." });
    } catch (err: any) {
      return res.status(500).json({ error: "فشل حذف الفيديو." });
    }
  }

  // POST /groups/:id/announcements
  static async postGroupAnnouncement(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { title, content, isPinned } = req.body;
      const currentUserId = req.user?.id;
      const currentUserRole = req.user?.role;

      if (!title || !content) {
        return res.status(400).json({ error: "يجب كتابة عنوان ومحتوى التنبيه." });
      }

      const groupRepo = AppDataSource.getRepository(CourseGroup);
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);

      const group = await groupRepo.findOne({
        where: { id },
        relations: ["teacher", "course", "course.teacher"]
      });

      if (!group) {
        return res.status(404).json({ error: "المجموعة غير موجودة." });
      }

      const isTeacher = group.teacher?.id === currentUserId || group.course?.teacher?.id === currentUserId;
      const isAdmin = currentUserRole === "admin";

      if (!isTeacher && !isAdmin) {
        return res.status(403).json({ error: "غير مصرح لك بنشر إعلانات في هذه المجموعة." });
      }

      const authorName = (req.user as any)?.name || (isTeacher ? (group.teacher?.name || "معلم المجموعة") : "إدارة المنصة");
      const authorRole = isAdmin ? "إدارة المنصة" : "معلم المادة";

      const newAnnouncement = {
        id: crypto.randomUUID ? crypto.randomUUID() : `ann_${Date.now()}`,
        title: title.trim(),
        content: content.trim(),
        authorName,
        authorRole,
        isPinned: !!isPinned,
        createdAt: new Date().toISOString()
      };

      const announcements = group.announcements || [];
      if (newAnnouncement.isPinned) {
        announcements.unshift(newAnnouncement);
      } else {
        const firstUnpinnedIndex = announcements.findIndex((a: any) => !a.isPinned);
        if (firstUnpinnedIndex === -1) {
          announcements.push(newAnnouncement);
        } else {
          announcements.splice(firstUnpinnedIndex, 0, newAnnouncement);
        }
      }

      group.announcements = announcements;
      await groupRepo.save(group);

      // Notify all active enrolled students
      try {
        const enrollments = await enrollmentRepo.find({
          where: { group: { id: group.id }, status: "active" },
          relations: ["student"]
        });

        for (const enr of enrollments) {
          if (enr.student) {
            await NotificationController.createNotification(
              enr.student.id,
              `تنبيه جديد في ${group.name} 📢`,
              `${title.trim()}: ${content.trim().slice(0, 100)}...`,
              "info",
              `#group/${group.id}`
            );
          }
        }
      } catch (e) {}

      return res.status(201).json({ message: "تم نشر التنبيه بنجاح!", announcement: newAnnouncement });
    } catch (err: any) {
      console.error("Error posting announcement:", err);
      return res.status(500).json({ error: "فشل نشر الإعلان." });
    }
  }

  // DELETE /groups/:id/announcements/:announcementId
  static async deleteGroupAnnouncement(req: AuthRequest, res: Response) {
    try {
      const { id, announcementId } = req.params;
      const currentUserId = req.user?.id;
      const currentUserRole = req.user?.role;

      const groupRepo = AppDataSource.getRepository(CourseGroup);
      const group = await groupRepo.findOne({
        where: { id },
        relations: ["teacher", "course", "course.teacher"]
      });

      if (!group) {
        return res.status(404).json({ error: "المجموعة غير موجودة." });
      }

      const isTeacher = group.teacher?.id === currentUserId || group.course?.teacher?.id === currentUserId;
      const isAdmin = currentUserRole === "admin";

      if (!isTeacher && !isAdmin) {
        return res.status(403).json({ error: "غير مصرح لك بحذف إعلانات هذه المجموعة." });
      }

      group.announcements = (group.announcements || []).filter((a: any) => a.id !== announcementId);
      await groupRepo.save(group);

      return res.status(200).json({ message: "تم حذف الإعلان بنجاح." });
    } catch (err: any) {
      console.error("Error deleting announcement:", err);
      return res.status(500).json({ error: "فشل حذف الإعلان." });
    }
  }

  // POST /groups/:id/assignments
  static async createGroupAssignment(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { title, description, dueDate, questions, type } = req.body;
      const currentUserId = req.user?.id;
      const currentUserRole = req.user?.role;

      if (!title || !dueDate) {
        return res.status(400).json({ error: "يرجى إدخال عنوان وتاريخ تسليم الواجب." });
      }

      const groupRepo = AppDataSource.getRepository(CourseGroup);
      const assignmentRepo = AppDataSource.getRepository(Assignment);
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);

      const group = await groupRepo.findOne({
        where: { id },
        relations: ["teacher", "course", "course.teacher"]
      });

      if (!group) {
        return res.status(404).json({ error: "المجموعة غير موجودة." });
      }

      const isTeacher = group.teacher?.id === currentUserId || group.course?.teacher?.id === currentUserId;
      const isAdmin = currentUserRole === "admin";

      if (!isTeacher && !isAdmin) {
        return res.status(403).json({ error: "غير مصرح لك بإضافة واجبات لهذه المجموعة." });
      }

      const assignment = new Assignment();
      assignment.title = title.trim();
      assignment.description = description || "";
      assignment.type = type || 'hybrid';
      assignment.dueDate = new Date(dueDate);

      let calculatedTotalPoints = 0;
      if (Array.isArray(questions)) {
        assignment.questions = questions
          .filter((q: any) => q && q.text && q.text.trim().length > 0)
          .map((q: any, i: number) => {
            const pts = Number(q.points) > 0 ? Number(q.points) : 10;
            calculatedTotalPoints += pts;
            return {
              id: q.id || `q_${i + 1}`,
              type: (q.type === 'mcq' || q.type === 'essay' || q.type === 'file') ? q.type : 'essay',
              text: q.text.trim(),
              points: pts,
              imageUrl: q.imageUrl ? String(q.imageUrl).trim() : undefined,
              options: Array.isArray(q.options) ? q.options.map((opt: any, optIdx: number) => ({
                id: opt.id || `opt_${optIdx + 1}`,
                text: String(opt.text || "").trim(),
                isCorrect: Boolean(opt.isCorrect)
              })) : undefined,
              explanation: q.explanation ? String(q.explanation).trim() : undefined,
              allowedFileTypes: Array.isArray(q.allowedFileTypes) ? q.allowedFileTypes : undefined,
              maxFileSizeMb: q.maxFileSizeMb ? Number(q.maxFileSizeMb) : 25,
              rubric: q.rubric ? String(q.rubric).trim() : undefined
            };
          });

        if (!assignment.description && assignment.questions.length > 0) {
          assignment.description = assignment.questions.map((q: any, i: number) => `س${i + 1} (${q.type === 'mcq' ? 'اختيار من متعدد' : q.type === 'file' ? 'رفع ملف' : 'سؤال مقالي'}): ${q.text} [${q.points} درجات]`).join('\n');
        }
      } else {
        assignment.questions = [];
      }
      assignment.totalPoints = calculatedTotalPoints || 100;
      assignment.group = group;
      assignment.course = group.course;

      const saved = await assignmentRepo.save(assignment);

      // Notify enrolled students
      try {
        const enrollments = await enrollmentRepo.find({
          where: { group: { id: group.id }, status: "active" },
          relations: ["student"]
        });

        for (const enr of enrollments) {
          if (enr.student) {
            await NotificationController.createNotification(
              enr.student.id,
              `واجب جديد: ${title.trim()} 📝`,
              `تم تعيين واجب جديد لمجموعة "${group.name}". آخر موعد للتسليم: ${new Date(dueDate).toLocaleDateString('ar-EG')}.`,
              "info",
              `#group/${group.id}`
            );
          }
        }
      } catch (e) {}

      return res.status(201).json({ message: "تم إضافة الواجب بنجاح للمجموعة!", assignment: saved });
    } catch (err: any) {
      console.error("Error creating group assignment:", err);
      return res.status(500).json({ error: "فشل إضافة الواجب." });
    }
  }
}


