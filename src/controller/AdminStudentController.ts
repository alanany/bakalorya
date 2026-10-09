import { Response } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { ParentStudentLink } from "../entity/ParentStudentLink";
import { Enrollment } from "../entity/Enrollment";
import { Session } from "../entity/Session";
import { SessionAttendance } from "../entity/SessionAttendance";
import { AssignmentSubmission } from "../entity/AssignmentSubmission";
import { Payment } from "../entity/Payment";
import { Subscription } from "../entity/Subscription";
import { AuthRequest } from "../middleware/auth";

export class AdminStudentController {
  /**
   * Get full comprehensive profile & schedule details of a student for Admin Dashboard
   */
  static async getStudentProfile(req: AuthRequest, res: Response) {
    const { studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({ error: "معرف الطالب مطلوب." });
    }

    try {
      const userRepo = AppDataSource.getRepository(User);
      const student = await userRepo.findOne({
        where: { id: studentId, role: "student" }
      });

      if (!student) {
        return res.status(404).json({ error: "الطالب غير موجود أو تم حذفه." });
      }

      // 1. Linked Parent(s)
      const linkRepo = AppDataSource.getRepository(ParentStudentLink);
      const parentLinks = await linkRepo.find({
        where: { studentId },
        relations: ["parent"]
      });
      const parents = parentLinks.map(l => ({
        id: l.parent?.id,
        name: l.parent?.name,
        email: l.parent?.email,
        phone: l.parent?.phone,
        relationship: l.relationship,
        status: l.parent?.status
      })).filter(p => !!p.id);

      // 2. Enrollments & Groups
      const enrollRepo = AppDataSource.getRepository(Enrollment);
      const studentEnrollments = await enrollRepo.find({
        where: { student: { id: studentId } },
        relations: [
          "course",
          "course.teacher",
          "course.grade",
          "course.subject",
          "group",
          "group.teacher",
          "group.course",
          "group.course.grade",
          "group.course.subject",
          "group.sessions"
        ],
        order: { createdAt: "DESC" }
      });

      const validEnrollments = studentEnrollments.filter(e => e.status !== "rejected" && e.status !== "banned");
      const groupIds = validEnrollments.map(e => e.group?.id).filter(Boolean) as string[];
      const courseIds = validEnrollments.map(e => e.course?.id).filter(Boolean) as string[];

      const groups = validEnrollments.map(e => {
        const grp = e.group;
        const crs = grp?.course || e.course;
        const tch = grp?.teacher || crs?.teacher;
        const sessions = grp?.sessions || [];
        const nextSession = sessions.find((s: any) => new Date(s.scheduledAt).getTime() > Date.now()) || null;

        return {
          enrollmentId: e.id,
          status: e.status,
          enrolledAt: e.createdAt,
          progress: e.progress || 0,
          group: grp ? {
            id: grp.id,
            name: grp.name,
            scheduleText: grp.scheduleText || (grp.scheduleDays ? `${grp.scheduleDays} ${grp.scheduleTime ? 'الساعة ' + grp.scheduleTime : ''}` : null),
            meetingLink: grp.meetingLink || null,
            status: grp.status,
            course: crs ? { id: crs.id, title: crs.title, grade: (crs as any).grade?.name || null, subject: (crs as any).subject?.name || null } : null,
            teacher: tch ? { id: tch.id, name: tch.name, avatar: tch.avatar, phone: tch.phone } : null,
            sessionsCount: sessions.length,
            nextSession: nextSession ? { id: nextSession.id, title: nextSession.title, scheduledAt: nextSession.scheduledAt } : null
          } : null,
          course: (!grp && crs) ? {
            id: crs.id,
            title: crs.title,
            grade: (crs as any).grade?.name || null,
            subject: (crs as any).subject?.name || null,
            teacher: tch ? { id: tch.id, name: tch.name, avatar: tch.avatar, phone: tch.phone } : null
          } : null
        };
      });

      // 3. Sessions (Private & Group Sessions)
      const sessionRepo = AppDataSource.getRepository(Session);
      const allCandidateSessions = await sessionRepo.find({
        relations: [
          "group",
          "group.course",
          "group.course.subject",
          "group.teacher",
          "course",
          "course.subject",
          "course.teacher",
          "teacher",
          "student"
        ],
        order: { scheduledAt: "DESC" },
        take: 300
      });

      // Filter sessions that belong to this student
      const studentSessions = allCandidateSessions.filter(s =>
        (s.student && s.student.id === studentId) ||
        (s.group && groupIds.includes(s.group.id)) ||
        (s.course && courseIds.includes(s.course.id))
      );

      // 4. Attendance Records
      const attendanceRepo = AppDataSource.getRepository(SessionAttendance);
      const attendances = await attendanceRepo.find({
        where: { user: { id: studentId } },
        relations: ["session"]
      });
      const attendanceMap = new Map<string, string>();
      attendances.forEach(a => {
        if (a.session?.id) attendanceMap.set(a.session.id, a.status);
      });

      const now = new Date();
      const mappedSessions = studentSessions.map(s => {
        const tch = s.teacher || s.group?.teacher || s.course?.teacher;
        const crs = s.group?.course || s.course;
        const subjectName = (crs as any)?.subject?.name || (crs as any)?.category || (crs as any)?.title || null;
        const sessionDate = new Date(s.scheduledAt);
        const isPast = sessionDate.getTime() < now.getTime() - (s.duration || 60) * 60000;
        const isToday = sessionDate.toDateString() === now.toDateString();
        const attendanceStatus = attendanceMap.get(s.id) || null;

        return {
          id: s.id,
          title: subjectName || s.title || (s.group?.name || crs?.title || "حصة تعليمية"),
          subjectName: subjectName || "المادة الدراسية",
          type: s.group ? "GROUP" : "PRIVATE",
          scheduledAt: s.scheduledAt,
          duration: s.duration || 60,
          meetingLink: s.meetingLink || s.group?.meetingLink || null,
          status: s.status || (isPast ? "COMPLETED" : "SCHEDULED"),
          isPast,
          isToday,
          group: s.group ? { id: s.group.id, name: s.group.name } : null,
          course: crs ? { id: crs.id, title: crs.title, subject: (crs as any).subject?.name || null } : null,
          teacher: tch ? { id: tch.id, name: tch.name, avatar: tch.avatar } : null,
          attendance: attendanceStatus // 'PRESENT' | 'ABSENT' | 'LATE' | null
        };
      });

      // Sort chronological: upcoming first, then past
      const upcomingSessions = mappedSessions.filter(s => !s.isPast).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
      const pastSessions = mappedSessions.filter(s => s.isPast).sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

      // 5. Assignment Submissions & Grades
      const submissionRepo = AppDataSource.getRepository(AssignmentSubmission);
      const submissions = await submissionRepo.find({
        where: { student: { id: studentId } },
        relations: ["assignment"],
        order: { submittedAt: "DESC" } as any,
        take: 50
      });

      const mappedSubmissions = submissions.map((sub: any) => ({
        id: sub.id,
        submittedAt: sub.submittedAt,
        status: sub.status,
        grade: sub.grade,
        percentage: sub.percentage || (sub.grade != null && sub.assignment?.maxGrade ? Math.round((sub.grade / sub.assignment.maxGrade) * 100) : null),
        feedback: sub.overallFeedback || sub.feedback,
        assignment: sub.assignment ? {
          id: sub.assignment.id,
          title: sub.assignment.title,
          maxGrade: sub.assignment.maxGrade || 100,
          dueDate: sub.assignment.dueDate
        } : null
      }));

      // 6. Payments & Billing
      const paymentRepo = AppDataSource.getRepository(Payment);
      const payments = await paymentRepo.find({
        where: { student: { id: studentId } },
        relations: ["courseEnrollment", "courseEnrollment.course", "courseEnrollment.group", "subscription"],
        order: { createdAt: "DESC" },
        take: 30
      });

      const mappedPayments = payments.map(p => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        method: p.provider,
        createdAt: p.createdAt,
        description: p.courseEnrollment?.group?.name || p.courseEnrollment?.course?.title || (p.subscription ? "باقة حصص خاصة" : "عملية دفع")
      }));

      // 7. Subscriptions
      const subRepo = AppDataSource.getRepository(Subscription);
      const subscriptions = await subRepo.find({
        where: { student: { id: studentId } },
        relations: ["plan", "teacher"],
        order: { createdAt: "DESC" }
      });

      // Metrics calculation
      const totalSessionsCount = mappedSessions.length;
      const attendedCount = attendances.filter(a => a.status === "PRESENT" || a.status === "LATE").length;
      const absentCount = attendances.filter(a => a.status === "ABSENT").length;
      const attendanceTotal = attendedCount + absentCount;
      const attendanceRate = attendanceTotal > 0 ? Math.round((attendedCount / attendanceTotal) * 100) : null;

      const gradedSubmissions = mappedSubmissions.filter(s => s.percentage != null);
      const avgGrade = gradedSubmissions.length > 0
        ? Math.round(gradedSubmissions.reduce((acc, s) => acc + s.percentage, 0) / gradedSubmissions.length)
        : null;

      const totalPaidAmount = mappedPayments
        .filter(p => p.status === "SUCCESS")
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      return res.json({
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          phone: student.phone,
          parentPhone: student.parentPhone,
          avatar: student.avatar,
          education: student.education,
          status: student.status,
          isBlocked: student.isBlocked,
          blockReason: student.blockReason,
          location: student.location,
          notes: student.notes,
          createdAt: student.createdAt,
          parents
        },
        stats: {
          enrolledGroupsCount: groups.length,
          upcomingSessionsCount: upcomingSessions.length,
          pastSessionsCount: pastSessions.length,
          attendanceRate,
          attendedCount,
          absentCount,
          avgGrade,
          submissionsCount: mappedSubmissions.length,
          totalPaidAmount
        },
        groups,
        sessions: {
          upcoming: upcomingSessions,
          past: pastSessions,
          all: mappedSessions
        },
        submissions: mappedSubmissions,
        payments: mappedPayments,
        subscriptions
      });
    } catch (err: any) {
      console.error("AdminStudentController.getStudentProfile error:", err);
      return res.status(500).json({ error: "فشل جلب ملف الطالب الشامل." });
    }
  }

  /**
   * Update student admin notes or details
   */
  static async updateStudentNotes(req: AuthRequest, res: Response) {
    const { studentId } = req.params;
    const { notes } = req.body;

    try {
      const userRepo = AppDataSource.getRepository(User);
      const student = await userRepo.findOne({ where: { id: studentId, role: "student" } });
      if (!student) return res.status(404).json({ error: "الطالب غير موجود." });

      student.notes = notes;
      await userRepo.save(student);

      return res.json({ message: "تم حفظ ملاحظات الطالب بنجاح.", notes: student.notes });
    } catch (err) {
      return res.status(500).json({ error: "فشل حفظ الملاحظات." });
    }
  }
}
