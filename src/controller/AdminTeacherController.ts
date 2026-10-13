import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { CourseGroup } from "../entity/CourseGroup";
import { Course } from "../entity/Course";
import { Session } from "../entity/Session";
import { Subscription } from "../entity/Subscription";
import { TeacherEarning } from "../entity/TeacherEarning";
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
      teacher.avatar = avatar || "assets/logo.png";
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

  // Get full comprehensive profile & schedule details of a teacher for Admin Dashboard
  static async getTeacherProfile(req: AuthRequest, res: Response) {
    const { teacherId } = req.params;
    if (!teacherId) {
      return res.status(400).json({ error: "معرف المعلم مطلوب." });
    }

    try {
      const userRepo = AppDataSource.getRepository(User);
      const teacher = await userRepo.findOne({
        where: { id: teacherId, role: "teacher" }
      });

      if (!teacher) {
        return res.status(404).json({ error: "المعلم غير موجود أو تم حذفه." });
      }

      // 1. Groups & Courses
      const groupRepo = AppDataSource.getRepository(CourseGroup);
      const courseRepo = AppDataSource.getRepository(Course);

      const [groups, courses] = await Promise.all([
        groupRepo.find({
          where: { teacher: { id: teacherId } },
          relations: [
            "course",
            "course.grade",
            "course.subject",
            "sessions",
            "enrollments",
            "enrollments.student"
          ],
          order: { createdAt: "DESC" }
        }),
        courseRepo.find({
          where: { teacher: { id: teacherId } },
          relations: ["grade", "subject", "groups"],
          order: { createdAt: "DESC" }
        })
      ]);

      // 2. Enrolled Students across all groups
      const studentMap = new Map<string, any>();
      groups.forEach(grp => {
        (grp.enrollments || []).forEach(e => {
          if (e.student && e.status !== "rejected" && e.status !== "banned") {
            const sid = e.student.id;
            if (!studentMap.has(sid)) {
              studentMap.set(sid, {
                id: sid,
                name: e.student.name,
                email: e.student.email,
                phone: e.student.phone,
                avatar: e.student.avatar,
                education: e.student.education,
                status: e.student.status,
                enrolledGroups: []
              });
            }
            const sObj = studentMap.get(sid);
            sObj.enrolledGroups.push({
              groupId: grp.id,
              groupName: grp.name,
              courseTitle: grp.course?.title || null,
              enrolledAt: e.createdAt,
              progress: e.progress || 0
            });
          }
        });
      });
      const uniqueStudents = Array.from(studentMap.values());

      // 3. Sessions (All sessions where teacher is assigned or group's teacher)
      const sessionRepo = AppDataSource.getRepository(Session);
      const allSessions = await sessionRepo.find({
        where: [
          { teacher: { id: teacherId } },
          { group: { teacher: { id: teacherId } } }
        ],
        relations: [
          "group",
          "group.course",
          "group.course.subject",
          "course",
          "course.subject",
          "student"
        ],
        order: { scheduledAt: "DESC" },
        take: 300
      });

      // Deduplicate sessions by ID
      const sessionMap = new Map<string, Session>();
      allSessions.forEach(s => {
        if (!sessionMap.has(s.id)) sessionMap.set(s.id, s);
      });
      const uniqueSessions = Array.from(sessionMap.values());

      const groupMap = new Map<string, any>();
      groups.forEach(g => {
        if (g.id) groupMap.set(g.id, g);
      });

      // Load recorded Teacher Earnings for this teacher to respect actual payouts/earnings
      const earningRepo = AppDataSource.getRepository(TeacherEarning);
      const teacherEarnings = await earningRepo.find({
        where: { teacher: { id: teacherId } }
      });
      const earningBySessionMap = new Map<string, number>();
      teacherEarnings.forEach(e => {
        if (e.sourceId) earningBySessionMap.set(e.sourceId, Number(e.amount));
      });

      const now = new Date();
      const mappedSessions = uniqueSessions.map(s => {
        const fullGroup = s.group?.id ? (groupMap.get(s.group.id) || s.group) : s.group;
        const crs = fullGroup?.course || s.course;
        const subjectName = (crs as any)?.subject?.name || (crs as any)?.category || (crs as any)?.title || null;
        const sessionDate = new Date(s.scheduledAt);
        const isPast = sessionDate.getTime() < now.getTime() - (s.duration || 60) * 60000;
        const isToday = sessionDate.toDateString() === now.toDateString();

        const displaySubject = subjectName || (crs?.title) || "المادة الدراسية";
        const durationMinutes = s.duration || 60;
        const durationHours = durationMinutes / 60;

        // Group's fixed teacher hourly rate has priority, fallback to teacher base rate, default 150
        const isGroup = !!fullGroup;
        const groupHourlyRate = (fullGroup && fullGroup.teacherHourlyRate !== undefined && fullGroup.teacherHourlyRate !== null && Number(fullGroup.teacherHourlyRate) > 0)
          ? Number(fullGroup.teacherHourlyRate)
          : null;

        const effectiveHourlyRate = groupHourlyRate !== null
          ? groupHourlyRate
          : (teacher.hourlyRate !== undefined && teacher.hourlyRate !== null && Number(teacher.hourlyRate) > 0 ? Number(teacher.hourlyRate) : 150);

        // Actual earning: if recorded in teacher_earning use that, otherwise compute durationHours * effectiveHourlyRate
        const sessionEarnings = earningBySessionMap.has(s.id)
          ? earningBySessionMap.get(s.id)!
          : Math.round(durationHours * effectiveHourlyRate);

        return {
          id: s.id,
          title: displaySubject,
          subjectName: displaySubject,
          rawTitle: s.title || null,
          type: s.group ? "GROUP" : "PRIVATE",
          scheduledAt: s.scheduledAt,
          duration: durationMinutes,
          hourlyRate: effectiveHourlyRate,
          isGroupRate: groupHourlyRate !== null,
          earnings: sessionEarnings,
          meetingLink: s.meetingLink || fullGroup?.meetingLink || teacher.meetingLink || null,
          status: s.status || (isPast ? "COMPLETED" : "SCHEDULED"),
          isPast,
          isToday,
          group: fullGroup ? {
            id: fullGroup.id,
            name: fullGroup.name,
            teacherHourlyRate: fullGroup.teacherHourlyRate !== undefined && fullGroup.teacherHourlyRate !== null ? Number(fullGroup.teacherHourlyRate) : effectiveHourlyRate
          } : null,
          course: crs ? { id: crs.id, title: crs.title, subject: (crs as any).subject?.name || null } : null,
          student: s.student ? { id: s.student.id, name: s.student.name, phone: s.student.phone } : null
        };
      });

      const upcomingSessions = mappedSessions.filter(s => !s.isPast).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
      const pastSessions = mappedSessions.filter(s => s.isPast).sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

      // 4. Financial Calculations
      const completedSessions = mappedSessions.filter(s => s.status === "COMPLETED" || s.status === "completed" || s.isPast);
      const totalMinutes = completedSessions.reduce((sum, s) => sum + (s.duration || 60), 0);
      const completedHours = Math.round((totalMinutes / 60) * 10) / 10;
      const hourlyRate = teacher.hourlyRate !== undefined ? teacher.hourlyRate : 150;
      // Calculate total salary by accurately summing each completed session's earnings (based on fixed group hour rates)
      const totalSalary = completedSessions.reduce((sum, s) => sum + (s.earnings || 0), 0);

      // 5. Private Subscriptions
      const subRepo = AppDataSource.getRepository(Subscription);
      const subscriptions = await subRepo.find({
        where: { teacher: { id: teacherId } },
        relations: ["plan", "student"],
        order: { createdAt: "DESC" }
      });

      const mappedGroups = groups.map(g => {
        const nextSession = (g.sessions || []).find((s: any) => new Date(s.scheduledAt).getTime() > Date.now()) || null;
        const activeEnrollments = (g.enrollments || []).filter(e => e.status !== "rejected" && e.status !== "banned");
        return {
          id: g.id,
          name: g.name,
          scheduleText: g.scheduleText || (g.scheduleDays ? `${g.scheduleDays} ${g.scheduleTime ? 'الساعة ' + g.scheduleTime : ''}` : null),
          meetingLink: g.meetingLink || teacher.meetingLink || null,
          status: g.status,
          teacherHourlyRate: g.teacherHourlyRate !== undefined && g.teacherHourlyRate !== null ? Number(g.teacherHourlyRate) : (teacher.hourlyRate || 100),
          sessionPrice: g.sessionPrice,
          studentHourlyRate: g.studentHourlyRate,
          course: g.course ? {
            id: g.course.id,
            title: g.course.title,
            grade: (g.course as any).grade?.name || null,
            subject: (g.course as any).subject?.name || null
          } : null,
          sessionsCount: (g.sessions || []).length,
          studentsCount: activeEnrollments.length,
          nextSession: nextSession ? { id: nextSession.id, title: nextSession.title, scheduledAt: nextSession.scheduledAt } : null
        };
      });

      const mappedCourses = courses.map(c => ({
        id: c.id,
        title: c.title,
        grade: (c as any).grade?.name || null,
        subject: (c as any).subject?.name || null,
        groupsCount: (c.groups || []).length,
        status: (c as any).status || "PUBLISHED"
      }));

      return res.status(200).json({
        teacher: {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          phone: teacher.phone,
          avatar: teacher.avatar,
          bio: teacher.education,
          education: teacher.education,
          hourlyRate,
          meetingLink: teacher.meetingLink,
          teacherCapabilities: teacher.teacherCapabilities || ["COURSE_INSTRUCTOR", "SESSION_TEACHER"],
          status: teacher.status,
          isBlocked: teacher.isBlocked,
          blockReason: teacher.blockReason,
          notes: teacher.notes,
          plainPassword: teacher.plainPassword,
          createdAt: teacher.createdAt
        },
        stats: {
          groupsCount: groups.length,
          coursesCount: courses.length,
          totalStudentsCount: uniqueStudents.length,
          completedSessionsCount: completedSessions.length,
          completedHours,
          hourlyRate,
          totalSalary,
          upcomingSessionsCount: upcomingSessions.length,
          pastSessionsCount: pastSessions.length,
          privateSubscriptionsCount: subscriptions.length
        },
        groups: mappedGroups,
        courses: mappedCourses,
        students: uniqueStudents,
        sessions: {
          upcoming: upcomingSessions,
          past: pastSessions,
          all: mappedSessions
        },
        subscriptions: subscriptions.map(s => ({
          id: s.id,
          studentName: s.student?.name || "طالب",
          studentPhone: s.student?.phone || null,
          planName: s.plan?.name || "باقة حصص خاصة",
          status: s.status,
          sessionsLeft: (s as any).sessionsLeft ?? null,
          createdAt: s.createdAt
        }))
      });
    } catch (err: any) {
      console.error("AdminTeacherController.getTeacherProfile error:", err);
      return res.status(500).json({ error: "فشل جلب ملف المعلم الشامل." });
    }
  }

  // Update Admin private notes for this teacher
  static async updateTeacherNotes(req: AuthRequest, res: Response) {
    const { teacherId } = req.params;
    const { notes } = req.body;
    try {
      const userRepo = AppDataSource.getRepository(User);
      const teacher = await userRepo.findOne({ where: { id: teacherId, role: "teacher" } });
      if (!teacher) return res.status(404).json({ error: "المعلم غير موجود." });

      teacher.notes = notes !== undefined ? String(notes).trim() : teacher.notes;
      await userRepo.save(teacher);

      return res.status(200).json({ success: true, message: "تم حفظ ملاحظات المعلم بنجاح.", notes: teacher.notes });
    } catch (err: any) {
      console.error("updateTeacherNotes error:", err);
      return res.status(500).json({ error: "فشل تحديث ملاحظات المعلم." });
    }
  }

  // Update hourly rate for teacher
  static async updateTeacherHourlyRate(req: AuthRequest, res: Response) {
    const { teacherId } = req.params;
    const { hourlyRate } = req.body;
    try {
      const userRepo = AppDataSource.getRepository(User);
      const teacher = await userRepo.findOne({ where: { id: teacherId, role: "teacher" } });
      if (!teacher) return res.status(404).json({ error: "المعلم غير موجود." });

      const rateNum = Number(hourlyRate);
      if (isNaN(rateNum) || rateNum < 0) {
        return res.status(400).json({ error: "سعر الساعة يجب أن يكون رقماً صحيحاً أو عشرياً موجباً." });
      }

      teacher.hourlyRate = rateNum;
      await userRepo.save(teacher);

      if (req.body.applyToAllGroups) {
        const groupRepo = AppDataSource.getRepository(CourseGroup);
        await groupRepo.createQueryBuilder()
          .update(CourseGroup)
          .set({ teacherHourlyRate: rateNum })
          .where("teacherId = :teacherId", { teacherId })
          .execute();
      }

      return res.status(200).json({ success: true, message: "تم تحديث أجر الساعة بنجاح.", hourlyRate: teacher.hourlyRate });
    } catch (err: any) {
      console.error("updateTeacherHourlyRate error:", err);
      return res.status(500).json({ error: "فشل تحديث أجر الساعة." });
    }
  }
}
