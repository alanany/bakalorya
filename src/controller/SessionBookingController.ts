import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Session } from "../entity/Session";
import { Subscription } from "../entity/Subscription";
import { SessionCreditLedger } from "../entity/SessionCreditLedger";
import { SessionAttendance } from "../entity/SessionAttendance";
import { TeacherEarning } from "../entity/TeacherEarning";
import { User } from "../entity/User";
import { AuthRequest } from "../middleware/auth";
import { NotificationController } from "./NotificationController";

export class SessionBookingController {
  // Student books 1-on-1 private session using active subscription credit
  static async bookSession(req: AuthRequest, res: Response) {
    const { subscriptionId, scheduledAt, topic, title } = req.body;

    if (!subscriptionId || !scheduledAt) {
      return res.status(400).json({ error: "الرجاء توفير رقم الاشتراك وتاريخ موعد الجلسة." });
    }

    const scheduledDate = new Date(scheduledAt);
    const now = new Date();
    const isAdmin = req.user?.role === "admin";
    const minAllowedTime = isAdmin 
      ? new Date(now.getTime() - 5 * 60 * 1000) 
      : new Date(now.getTime() + 59 * 60 * 1000); // 1 hour in future for student

    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: "تاريخ البث المباشر غير صالح." });
    }

    if (scheduledDate < minAllowedTime) {
      return res.status(400).json({ error: isAdmin ? "عفواً، موعد الحصة غير صالح." : "عفواً، موعد البث المباشر يجب أن يكون في المستقبل وبعد الوقت الحالي بساعة واحدة على الأقل. ❌" });
    }

    try {
      const subscriptionRepository = AppDataSource.getRepository(Subscription);
      const ledgerRepository = AppDataSource.getRepository(SessionCreditLedger);
      const sessionRepository = AppDataSource.getRepository(Session);
      const userRepository = AppDataSource.getRepository(User);

      const subscription = await subscriptionRepository.findOne({
        where: { id: subscriptionId },
        relations: ["teacher", "plan", "student"]
      });

      if (!subscription) {
        return res.status(404).json({ error: "الاشتراك غير موجود." });
      }

      const isAdmin = req.user!.role === "admin";
      let student = subscription.student;

      if (!isAdmin) {
        if (student.id !== req.user!.id) {
           return res.status(403).json({ error: "غير مصرح لك بحجز موعد لهذا الاشتراك." });
        }
      }

      if (subscription.status !== "ACTIVE") {
        return res.status(400).json({ error: "عفواً، لا يملك الطالب اشتراكاً نشطاً لهذه المادة." });
      }

      // Allow admin to override the teacher via req.body.teacherId
      let sessionTeacher: User | null = subscription.teacher;
      if (isAdmin && req.body.teacherId) {
         sessionTeacher = await userRepository.findOneBy({ id: req.body.teacherId, role: "teacher" });
      }

      if (!sessionTeacher) {
        return res.status(400).json({ error: "الطلب قيد الانتظار لتعيين أستاذ للاشتراك من الإدارة." });
      }

      // Check available credit from ledger (sum of entries)
      const ledgers = await ledgerRepository.find({
        where: { subscription: { id: subscription.id } }
      });
      const currentCredits = ledgers.reduce((sum, e) => sum + e.amount, 0);

      if (currentCredits <= 0) {
        return res.status(400).json({ error: "عفواً، رصيد الحصص الخاص بك في هذا الاشتراك انتهى. يرجى تجديد الاشتراك." });
      }

      // Double-booking check: Check if teacher or student already has a conflicting scheduled session
      const startTime = scheduledDate;
      const endTime = new Date(startTime.getTime() + (subscription.plan?.sessionDurationMins || 60) * 60 * 1000);

      const conflictingSession = await sessionRepository.createQueryBuilder("session")
        .where("(session.teacherId = :teacherId OR session.studentId = :studentId)", {
          teacherId: subscription.teacher.id,
          studentId: student.id
        })
        .andWhere("session.status IN (:...activeStatuses)", {
          activeStatuses: ["SCHEDULED", "CONFIRMED", "scheduled", "live"]
        })
        .andWhere("session.scheduledAt >= :windowStart AND session.scheduledAt <= :windowEnd", {
          windowStart: new Date(startTime.getTime() - 45 * 60 * 1000),
          windowEnd: new Date(startTime.getTime() + 45 * 60 * 1000)
        })
        .getOne();

      if (conflictingSession) {
        return res.status(400).json({ error: "عفواً، هذا الموعد محجوز بالفعل أو يوجد تضارب مع مواعيد أخرى للأستاذ أو الطالب." });
      }

      const session = new Session();
      session.title = title || `حصة خاصة 1-على-1 في ${subscription.plan?.name || ''}`;
      session.description = topic || "حصة مراجعة وشرح تفاعلي مباشر";
      session.teacher = sessionTeacher;
      session.student = student;
      session.subscription = subscription;
      session.scheduledAt = scheduledDate;
      session.duration = subscription.plan?.sessionDurationMins || 60;
      session.status = "SCHEDULED";
      session.topic = topic || "";

      await sessionRepository.save(session);

      // Note: Booking does NOT consume credit from ledger yet.
      return res.status(201).json({
        message: "تم حجز موعد الحصة بنجاح! الرصيد متاح ولم يتم الخصم حتى إتمام الحصة.",
        session,
        remainingCredits: currentCredits
      });
    } catch (err) {
      console.error("Book session error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Teacher marks session as COMPLETED -> Consumes 1 credit from ledger & creates TeacherEarning
  static async completeSession(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { topic, whatWasCovered, studentPerformance, homework, teacherNotes } = req.body;

    try {
      const sessionRepository = AppDataSource.getRepository(Session);
      const ledgerRepository = AppDataSource.getRepository(SessionCreditLedger);
      const earningRepository = AppDataSource.getRepository(TeacherEarning);
      const attendanceRepository = AppDataSource.getRepository(SessionAttendance);

      const session = await sessionRepository.findOne({
        where: { id },
        relations: ["teacher", "student", "subscription"]
      });

      if (!session) return res.status(404).json({ error: "الحصة غير موجودة." });

      if (session.teacher.id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "غير مصرح لك بإكمال هذه الحصة." });
      }

      if (session.status === "COMPLETED" || session.status === "completed") {
        return res.status(400).json({ error: "تم إكمال هذه الحصة سابقاً بالفعل." });
      }

      session.status = "COMPLETED";
      session.completedAt = new Date();
      if (topic) session.topic = topic;
      if (whatWasCovered) session.whatWasCovered = whatWasCovered;
      if (studentPerformance) session.studentPerformance = studentPerformance;
      if (homework) session.homework = homework;
      if (teacherNotes) session.teacherNotes = teacherNotes;

      await sessionRepository.save(session);

      // Deduct 1 credit from ledger if tied to a subscription
      if (session.subscription) {
        const ledger = new SessionCreditLedger();
        ledger.subscription = session.subscription;
        ledger.session = session;
        ledger.amount = -1; // Deduct 1 credit
        ledger.type = "SESSION_COMPLETED";
        ledger.reason = `إتمام حصة مباشرة بتاريخ ${new Date(session.scheduledAt).toLocaleDateString()}`;
        ledger.createdBy = { id: req.user!.id } as User;
        await ledgerRepository.save(ledger);
      }

      // Mark Attendance (PRESENT)
      if (session.student) {
        const attendance = new SessionAttendance();
        attendance.session = session;
        attendance.user = session.student;
        attendance.status = "PRESENT";
        attendance.markedBy = { id: req.user!.id } as User;
        await attendanceRepository.save(attendance);
      }

      // Generate Teacher Earning record based on teacher hourly rate and session duration
      const durationHours = (session.duration || 60) / 60;
      const hourlyRate = (session.teacher && session.teacher.hourlyRate && session.teacher.hourlyRate > 0)
        ? session.teacher.hourlyRate
        : 150;
      const calculatedEarning = Math.round(durationHours * hourlyRate);

      const earning = new TeacherEarning();
      earning.teacher = session.teacher;
      earning.sourceType = "SESSION_COMPLETED";
      earning.sourceId = session.id;
      earning.amount = calculatedEarning;
      earning.currency = "EGP";
      earning.status = "pending";
      await earningRepository.save(earning);

      return res.status(200).json({
        message: "تم إتمام الحصة بنجاح وخصم حصة من رصيد الاشتراك وتسجيل المستحقات للمعلم! ✅",
        session,
        earning
      });
    } catch (err) {
      console.error("Complete session error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Cancel session according to policy
  static async cancelSession(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { reason } = req.body;

    try {
      const sessionRepository = AppDataSource.getRepository(Session);
      const ledgerRepository = AppDataSource.getRepository(SessionCreditLedger);

      const session = await sessionRepository.findOne({
        where: { id },
        relations: ["teacher", "student", "subscription"]
      });

      if (!session) return res.status(404).json({ error: "الحصة غير موجودة." });

      const isTeacher = session.teacher.id === req.user!.id;
      const isStudent = session.student?.id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isTeacher && !isStudent && !isAdmin) {
        return res.status(403).json({ error: "غير مصرح لك بإلغاء هذه الحصة." });
      }

      const scheduledTime = new Date(session.scheduledAt).getTime();
      const nowTime = Date.now();
      const hoursDiff = (scheduledTime - nowTime) / (1000 * 60 * 60);

      if (isStudent) {
        session.status = "CANCELLED_BY_STUDENT";
        await sessionRepository.save(session);

        if (hoursDiff < 2) {
          // Late cancellation (< 2 hours): deduct 1 credit from subscription balance
          if (session.subscription) {
            const ledger = new SessionCreditLedger();
            ledger.subscription = session.subscription;
            ledger.session = session;
            ledger.amount = -1;
            ledger.type = "SESSION_COMPLETED";
            ledger.reason = `إلغاء الحصة من الطالب قبل الموعد بأقل من ساعتين (سياسة الإلغاء المتأخر)`;
            ledger.createdBy = { id: req.user!.id } as User;
            await ledgerRepository.save(ledger);
          }

          return res.status(200).json({
            message: "تم إلغاء الحصة. نظراً للإلغاء المتأخر (قبل أقل من ساعتين)، تم خصم رصيد الحصة وفق سياسة المنصة تعويضاً عن وقت المعلم.",
            session,
            isLate: true
          });
        } else {
          // Early cancellation (>= 2 hours): refund/keep credit
          return res.status(200).json({
            message: "تم إلغاء الحصة بنجاح وحفظ رصيد الحصة في اشتراكك لإعادة جدولتها في أي وقت مجاناً.",
            session,
            isLate: false
          });
        }
      }

      if (isTeacher) {
        session.status = "CANCELLED_BY_TEACHER";
        await sessionRepository.save(session);

        // Teacher no-show / cancellation: Optional compensation credit added (+1)
        if (session.subscription) {
          const ledger = new SessionCreditLedger();
          ledger.subscription = session.subscription;
          ledger.session = session;
          ledger.amount = +1; // Compensation credit
          ledger.type = "ADMIN_COMPENSATION";
          ledger.reason = `تعويض حصة إضافية بسبب إلغاء المعلم للحصة المحددة`;
          ledger.createdBy = { id: req.user!.id } as User;
          await ledgerRepository.save(ledger);
        }

        return res.status(200).json({
          message: "تم إلغاء الحصة وإلحاق رصيد تعويضي للطالب.",
          session
        });
      }

      session.status = "CANCELLED_BY_STUDENT";
      await sessionRepository.save(session);
      return res.status(200).json({ message: "تم إلغاء الحصة بنجاح دون خصم أي رصيد.", session });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Admin reassign teacher for a session
  static async reassignSessionTeacher(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { teacherId } = req.body;

    if (!teacherId) {
      return res.status(400).json({ error: "الرجاء اختيار المعلم الجديد." });
    }

    try {
      const sessionRepository = AppDataSource.getRepository(Session);
      const userRepository = AppDataSource.getRepository(User);

      const session = await sessionRepository.findOne({
        where: { id },
        relations: ["teacher", "student"]
      });

      if (!session) return res.status(404).json({ error: "الحصة غير موجودة." });

      const newTeacher = await userRepository.findOneBy({ id: teacherId, role: "teacher" });
      if (!newTeacher) return res.status(404).json({ error: "المعلم المحدد غير موجود." });

      session.teacher = newTeacher;
      await sessionRepository.save(session);

      return res.status(200).json({ message: `تم إعادة تعيين المعلم للحصة بنجاح إلى: ${newTeacher.name}`, session });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Student: get own private sessions (linked to subscription)
  static async getMyPrivateSessions(req: AuthRequest, res: Response) {
    try {
      const sessionRepository = AppDataSource.getRepository(Session);
      const sessions = await sessionRepository.find({
        where: { student: { id: req.user!.id }, subscription: { id: undefined } },
        relations: ["teacher", "student", "subscription", "subscription.plan"],
        order: { scheduledAt: "DESC" }
      });

      // Actually get all sessions where student matches and subscription is not null
      const allSessions = await sessionRepository
        .createQueryBuilder("session")
        .leftJoinAndSelect("session.teacher", "teacher")
        .leftJoinAndSelect("session.student", "student")
        .leftJoinAndSelect("session.subscription", "subscription")
        .leftJoinAndSelect("subscription.plan", "plan")
        .where("student.id = :studentId", { studentId: req.user!.id })
        .andWhere("session.subscriptionId IS NOT NULL")
        .orderBy("session.scheduledAt", "DESC")
        .getMany();

      return res.status(200).json(allSessions);
    } catch (err) {
      console.error("getMyPrivateSessions error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Teacher: get own private sessions
  static async getTeacherPrivateSessions(req: AuthRequest, res: Response) {
    try {
      const sessionRepository = AppDataSource.getRepository(Session);
      const { status, limit } = req.query;

      const qb = sessionRepository
        .createQueryBuilder("session")
        .leftJoinAndSelect("session.teacher", "teacher")
        .leftJoinAndSelect("session.student", "student")
        .leftJoinAndSelect("session.subscription", "subscription")
        .leftJoinAndSelect("subscription.plan", "plan")
        .where("teacher.id = :teacherId", { teacherId: req.user!.id })
        .andWhere("session.subscriptionId IS NOT NULL")
        .orderBy("session.scheduledAt", "DESC");

      if (status) {
        qb.andWhere("session.status = :status", { status });
      }
      if (limit) {
        qb.take(Number(limit));
      }

      const sessions = await qb.getMany();
      return res.status(200).json(sessions);
    } catch (err) {
      console.error("getTeacherPrivateSessions error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Teacher: get today's private sessions
  static async getTodayPrivateSessions(req: AuthRequest, res: Response) {
    try {
      const sessionRepository = AppDataSource.getRepository(Session);
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const sessions = await sessionRepository
        .createQueryBuilder("session")
        .leftJoinAndSelect("session.teacher", "teacher")
        .leftJoinAndSelect("session.student", "student")
        .leftJoinAndSelect("session.subscription", "subscription")
        .leftJoinAndSelect("subscription.plan", "plan")
        .where("teacher.id = :teacherId", { teacherId: req.user!.id })
        .andWhere("session.scheduledAt >= :start AND session.scheduledAt <= :end", {
          start: startOfDay,
          end: endOfDay
        })
        .orderBy("session.scheduledAt", "ASC")
        .getMany();

      return res.status(200).json(sessions);
    } catch (err) {
      console.error("getTodayPrivateSessions error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Teacher: mark student as no-show
  static async noShowSession(req: AuthRequest, res: Response) {
    const { id } = req.params;

    try {
      const sessionRepository = AppDataSource.getRepository(Session);
      const ledgerRepository = AppDataSource.getRepository(SessionCreditLedger);
      const attendanceRepository = AppDataSource.getRepository(SessionAttendance);

      const session = await sessionRepository.findOne({
        where: { id },
        relations: ["teacher", "student", "subscription"]
      });

      if (!session) return res.status(404).json({ error: "الحصة غير موجودة." });

      if (session.teacher.id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "غير مصرح لك بتعديل هذه الحصة." });
      }

      if (session.status !== "SCHEDULED" && session.status !== "CONFIRMED" && session.status !== "scheduled") {
        return res.status(400).json({ error: "لا يمكن تسجيل غياب لهذه الحصة في حالتها الحالية." });
      }

      session.status = "NO_SHOW_STUDENT";
      session.completedAt = new Date();
      await sessionRepository.save(session);

      // Policy: No-show = session is charged (deduct from ledger)
      if (session.subscription) {
        const ledger = new SessionCreditLedger();
        ledger.subscription = session.subscription;
        ledger.session = session;
        ledger.amount = -1;
        ledger.type = "SESSION_COMPLETED";
        ledger.reason = `غياب الطالب عن الحصة المحددة (${new Date(session.scheduledAt).toLocaleDateString("ar")})`;
        ledger.createdBy = { id: req.user!.id } as User;
        await ledgerRepository.save(ledger);
      }

      // Mark Attendance as ABSENT
      if (session.student) {
        const attendance = new SessionAttendance();
        attendance.session = session;
        attendance.user = session.student;
        attendance.status = "ABSENT";
        attendance.markedBy = { id: req.user!.id } as User;
        await attendanceRepository.save(attendance);
      }

      return res.status(200).json({
        message: "تم تسجيل غياب الطالب. تم خصم حصة من رصيد الاشتراك وفق سياسة الأكاديمية.",
        session
      });
    } catch (err) {
      console.error("noShowSession error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Reschedule a session to a new time
  static async rescheduleSession(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { newScheduledAt } = req.body;

    if (!newScheduledAt) {
      return res.status(400).json({ error: "الرجاء تحديد الموعد الجديد للحصة." });
    }

    const newDate = new Date(newScheduledAt);
    const now = new Date();
    if (newDate < new Date(now.getTime() + 30 * 60 * 1000)) {
      return res.status(400).json({ error: "الموعد الجديد يجب أن يكون بعد 30 دقيقة على الأقل من الآن." });
    }

    try {
      const sessionRepository = AppDataSource.getRepository(Session);
      const session = await sessionRepository.findOne({
        where: { id },
        relations: ["teacher", "student", "subscription"]
      });

      if (!session) return res.status(404).json({ error: "الحصة غير موجودة." });

      const isTeacher = session.teacher.id === req.user!.id;
      const isAdmin = req.user!.role === "admin";
      if (!isTeacher && !isAdmin) {
        return res.status(403).json({ error: "غير مصرح لك بإعادة جدولة هذه الحصة." });
      }

      const oldDate = session.scheduledAt;
      session.scheduledAt = newDate;
      session.status = "RESCHEDULED";
      await sessionRepository.save(session);

      return res.status(200).json({
        message: `تم إعادة جدولة الحصة من ${new Date(oldDate).toLocaleDateString("ar")} إلى ${newDate.toLocaleDateString("ar")}.`,
        session
      });
    } catch (err) {
      console.error("rescheduleSession error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Teacher: get own availability slots
  static async getMyAvailability(req: AuthRequest, res: Response) {
    try {
      const { TeacherAvailability } = await import("../entity/TeacherAvailability");
      const availabilityRepository = AppDataSource.getRepository(TeacherAvailability);
      const slots = await availabilityRepository.find({
        where: { teacher: { id: req.user!.id } },
        order: { dayOfWeek: "ASC", startTime: "ASC" }
      });
      return res.status(200).json(slots);
    } catch (err) {
      console.error("getMyAvailability error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Batch schedule all remaining sessions for a subscription
  static async batchScheduleSessions(req: AuthRequest, res: Response) {
    const { subscriptionId, firstSessionDate, frequency, daysOfWeek, teacherId, titlePrefix, topic } = req.body;

    if (!subscriptionId || !firstSessionDate) {
      return res.status(400).json({ error: "الرجاء توفير رقم الاشتراك وتاريخ البداية." });
    }

    const startDate = new Date(firstSessionDate);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({ error: "تاريخ بداية الجدولة غير صالح." });
    }

    try {
      const subscriptionRepository = AppDataSource.getRepository(Subscription);
      const sessionRepository = AppDataSource.getRepository(Session);
      const userRepository = AppDataSource.getRepository(User);

      const subscription = await subscriptionRepository.findOne({
        where: { id: subscriptionId },
        relations: ["teacher", "plan", "student"]
      });

      if (!subscription) {
        return res.status(404).json({ error: "الاشتراك غير موجود." });
      }

      const isAdmin = req.user?.role === "admin";
      const isStudent = subscription.student.id === req.user?.id;
      const isTeacher = subscription.teacher?.id === req.user?.id;

      if (!isAdmin && !isStudent && !isTeacher) {
        return res.status(403).json({ error: "غير مصرح لك بجدولة حصص هذا الاشتراك." });
      }

      if (subscription.status !== "ACTIVE") {
        return res.status(400).json({ error: "الاشتراك ليس نشطاً حالياً." });
      }

      let sessionTeacher: User | null = subscription.teacher;
      if (isAdmin && teacherId) {
        sessionTeacher = await userRepository.findOneBy({ id: teacherId, role: "teacher" });
      }

      if (!sessionTeacher) {
        return res.status(400).json({ error: "الرجاء تعيين معلم للاشتراك أولاً قبل جدولة الحصص." });
      }

      // Find existing non-cancelled sessions for this subscription
      const existingSessions = await sessionRepository.find({
        where: { subscription: { id: subscription.id } }
      });
      const validExisting = existingSessions.filter(s => !s.status?.toLowerCase().includes("cancel"));

      const totalSessions = subscription.totalSessions || subscription.plan?.sessionsCount || 4;
      const remainingToSchedule = totalSessions - validExisting.length;

      if (remainingToSchedule <= 0) {
        return res.status(400).json({
          error: `تم جدولة جميع حصص الاشتراك (${totalSessions} حصة) بالفعل!`
        });
      }

      // Calculate scheduled dates for all remaining sessions
      const scheduledDates: Date[] = [];
      let currentDate = new Date(startDate.getTime());

      if (frequency === "custom_days" && Array.isArray(daysOfWeek) && daysOfWeek.length > 0) {
        const selectedDays = daysOfWeek.map((d: any) => parseInt(d, 10));
        while (scheduledDates.length < remainingToSchedule) {
          if (selectedDays.includes(currentDate.getDay())) {
            scheduledDates.push(new Date(currentDate.getTime()));
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else if (frequency === "biweekly") {
        for (let i = 0; i < remainingToSchedule; i++) {
          const weeks = Math.floor(i / 2);
          const offsetDays = weeks * 7 + (i % 2 === 1 ? 3 : 0);
          const sDate = new Date(startDate.getTime());
          sDate.setDate(sDate.getDate() + offsetDays);
          scheduledDates.push(sDate);
        }
      } else {
        // Default: Weekly (every 7 days)
        for (let i = 0; i < remainingToSchedule; i++) {
          const sDate = new Date(startDate.getTime());
          sDate.setDate(sDate.getDate() + (i * 7));
          scheduledDates.push(sDate);
        }
      }

      // Save sessions
      const newSessions: Session[] = [];
      for (let i = 0; i < scheduledDates.length; i++) {
        const sessionNum = validExisting.length + i + 1;
        const sess = new Session();
        sess.title = `${titlePrefix || 'حصة خاصة 1-على-1'} (${sessionNum}/${totalSessions})`;
        sess.description = topic || `حصة مراجعة وشرح تفاعلي مباشر - حصة رقم ${sessionNum}`;
        sess.teacher = sessionTeacher;
        sess.student = subscription.student;
        sess.subscription = subscription;
        sess.scheduledAt = scheduledDates[i];
        sess.duration = subscription.plan?.sessionDurationMins || 60;
        sess.status = "SCHEDULED";
        sess.topic = topic || "";

        const saved = await sessionRepository.save(sess);
        newSessions.push(saved);
      }

      // Send notifications
      try {
        await NotificationController.createNotification(
          subscription.student.id,
          "تمت جدولة جميع حصص الاشتراك! 🗓️",
          `تمت جدولة ${newSessions.length} حصة مباشرة في خطتك (${subscription.plan?.name || ''}) مع الأستاذ ${sessionTeacher.name}.`,
          "info",
          `#schedule`
        );
      } catch (e) {
        console.error("Notification trigger error:", e);
      }

      return res.status(201).json({
        message: `تمت جدولة جميع الحصص المتبقية (${newSessions.length} حصة) بنجاح! 🚀`,
        sessions: newSessions,
        totalScheduled: validExisting.length + newSessions.length,
        totalSessions
      });

    } catch (err) {
      console.error("Batch schedule error:", err);
      return res.status(500).json({ error: "حدث خطأ أثناء جدولة كافة الحصص." });
    }
  }

  // Get full schedule details of a subscription for wizard / edit schedule
  static async getSubscriptionScheduleDetails(req: AuthRequest, res: Response) {
    const { id } = req.params;
    try {
      const subscriptionRepository = AppDataSource.getRepository(Subscription);
      const sessionRepository = AppDataSource.getRepository(Session);
      const { TeacherAvailability } = await import("../entity/TeacherAvailability");
      const availabilityRepository = AppDataSource.getRepository(TeacherAvailability);

      const subscription = await subscriptionRepository.findOne({
        where: { id },
        relations: ["teacher", "plan", "student"]
      });

      if (!subscription) {
        return res.status(404).json({ error: "الاشتراك غير موجود." });
      }

      const sessions = await sessionRepository.find({
        where: { subscription: { id: subscription.id } },
        order: { scheduledAt: "ASC" }
      });

      let availability: any[] = [];
      if (subscription.teacher) {
        availability = await availabilityRepository.find({
          where: { teacher: { id: subscription.teacher.id } },
          order: { dayOfWeek: "ASC", startTime: "ASC" }
        });
      }

      const completedSessions = sessions.filter(s => s.status === "COMPLETED" || s.status === "completed");
      const scheduledSessions = sessions.filter(s => s.status === "SCHEDULED" || s.status === "scheduled" || s.status === "RESCHEDULED");

      const totalSessions = subscription.totalSessions || subscription.plan?.sessionsCount || 4;

      return res.json({
        subscription,
        sessions,
        completedSessions,
        scheduledSessions,
        availability,
        completedCount: completedSessions.length,
        scheduledCount: scheduledSessions.length,
        totalSessions,
        remainingCount: Math.max(0, totalSessions - completedSessions.length)
      });
    } catch (err) {
      console.error("getSubscriptionScheduleDetails error:", err);
      return res.status(500).json({ error: "حدث خطأ أثناء جلب تفاصيل الاشتراك." });
    }
  }

  // Preview package schedule with conflict resolution checks
  static async previewPackageSchedule(req: AuthRequest, res: Response) {
    const { subscriptionId, teacherId, startDate, frequency, daysOfWeek, timeOfDay, isEditMode } = req.body;

    if (!subscriptionId || !startDate) {
      return res.status(400).json({ error: "يرجى توفير رقم الاشتراك وتاريخ البداية." });
    }

    try {
      const subscriptionRepository = AppDataSource.getRepository(Subscription);
      const sessionRepository = AppDataSource.getRepository(Session);
      const userRepository = AppDataSource.getRepository(User);
      const { TeacherAvailability } = await import("../entity/TeacherAvailability");
      const availabilityRepository = AppDataSource.getRepository(TeacherAvailability);

      const subscription = await subscriptionRepository.findOne({
        where: { id: subscriptionId },
        relations: ["teacher", "plan", "student"]
      });

      if (!subscription) {
        return res.status(404).json({ error: "الاشتراك غير موجود." });
      }

      let teacher: User | null = subscription.teacher;
      if (teacherId) {
        teacher = await userRepository.findOneBy({ id: teacherId, role: "teacher" });
      }

      if (!teacher) {
        return res.status(400).json({ error: "يرجى تعيين معلم للاشتراك لمتابعة الجدولة." });
      }

      const existingSessions = await sessionRepository.find({
        where: { subscription: { id: subscription.id } }
      });
      const completedSessions = existingSessions.filter(s => s.status === "COMPLETED" || s.status === "completed");

      const totalSessions = subscription.totalSessions || subscription.plan?.sessionsCount || 4;
      const countNeeded = isEditMode ? Math.max(0, totalSessions - completedSessions.length) : totalSessions;

      const availability = await availabilityRepository.find({
        where: { teacher: { id: teacher.id }, isActive: true }
      });
      const availDays = availability.map(a => a.dayOfWeek);

      const baseStart = new Date(startDate);
      if (timeOfDay) {
        const [h, m] = timeOfDay.split(":").map((v: string) => parseInt(v, 10));
        baseStart.setHours(h || 18, m || 0, 0, 0);
      }

      const candidateDates: Date[] = [];
      let current = new Date(baseStart.getTime());

      if (frequency === "custom_days" && Array.isArray(daysOfWeek) && daysOfWeek.length > 0) {
        const selectedDays = daysOfWeek.map((d: any) => parseInt(d, 10));
        while (candidateDates.length < countNeeded) {
          if (selectedDays.includes(current.getDay())) {
            candidateDates.push(new Date(current.getTime()));
          }
          current.setDate(current.getDate() + 1);
        }
      } else if (frequency === "biweekly") {
        for (let i = 0; i < countNeeded; i++) {
          const weeks = Math.floor(i / 2);
          const offsetDays = weeks * 7 + (i % 2 === 1 ? 3 : 0);
          const d = new Date(baseStart.getTime());
          d.setDate(d.getDate() + offsetDays);
          candidateDates.push(d);
        }
      } else {
        // Default: weekly
        for (let i = 0; i < countNeeded; i++) {
          const d = new Date(baseStart.getTime());
          d.setDate(d.getDate() + (i * 7));
          candidateDates.push(d);
        }
      }

      const daysAr = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const items: any[] = [];
      let validCount = 0;
      let conflictCount = 0;

      // Get IDs of this subscription's own sessions — these will be deleted on confirm,
      // so they should NEVER count as conflicts during preview.
      const ownSessionIds = existingSessions.map(s => s.id);

      for (let i = 0; i < candidateDates.length; i++) {
        const d = candidateDates[i];
        const dayNum = d.getDay();

        let conflictReason: string | null = null;

        // Use session-duration window to detect real time overlaps
        const sessionDuration = subscription.plan?.sessionDurationMins || 60;
        const windowStart = new Date(d.getTime() - sessionDuration * 60 * 1000);
        const windowEnd = new Date(d.getTime() + sessionDuration * 60 * 1000);

        // Build query: find any session that overlaps this time slot
        let qb = sessionRepository.createQueryBuilder("session")
          .leftJoinAndSelect("session.teacher", "teacher")
          .leftJoinAndSelect("session.student", "student")
          .leftJoinAndSelect("session.subscription", "sub")
          .where("(session.teacherId = :teacherId OR session.studentId = :studentId)", {
            teacherId: teacher.id,
            studentId: subscription.student.id
          })
          .andWhere("session.status IN (:...activeStatuses)", {
            activeStatuses: ["SCHEDULED", "CONFIRMED", "scheduled", "live"]
          })
          .andWhere("session.scheduledAt >= :windowStart AND session.scheduledAt <= :windowEnd", {
            windowStart, windowEnd
          })
          // ALWAYS exclude this subscription's sessions (they get replaced on confirm)
          .andWhere("(session.subscriptionId IS NULL OR session.subscriptionId != :subId)", { subId: subscription.id });

        // Also exclude by individual IDs as extra safety
        if (ownSessionIds.length > 0) {
          qb = qb.andWhere("session.id NOT IN (:...ownIds)", { ownIds: ownSessionIds });
        }

        const conflictingSession = await qb.getOne();

        if (conflictingSession) {
          // Build a detailed reason so the admin knows exactly what's conflicting
          const conflictTime = new Date(conflictingSession.scheduledAt);
          const conflictTimeStr = conflictTime.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
          const conflictTeacher = conflictingSession.teacher?.name || "غير محدد";
          const conflictStudent = conflictingSession.student?.name || "غير محدد";

          if (String(conflictingSession.teacher?.id) === String(teacher.id)) {
            conflictReason = `المعلم "${conflictTeacher}" لديه حصة أخرى الساعة ${conflictTimeStr} مع طالب "${conflictStudent}".`;
          } else {
            conflictReason = `الطالب "${conflictStudent}" لديه حصة أخرى الساعة ${conflictTimeStr} مع المعلم "${conflictTeacher}".`;
          }
        }

        const status = conflictReason ? "CONFLICT" : "VALID";
        if (status === "VALID") validCount++; else conflictCount++;

        items.push({
          index: (isEditMode ? completedSessions.length : 0) + i + 1,
          scheduledAt: d.toISOString(),
          dayName: daysAr[dayNum],
          teacherId: teacher.id,
          teacherName: teacher.name,
          status,
          conflictReason
        });
      }

      return res.json({
        subscription,
        teacher,
        totalSessions,
        completedCount: completedSessions.length,
        countGenerated: items.length,
        validCount,
        conflictCount,
        teacherAvailDays: availDays,
        items
      });

    } catch (err) {
      console.error("previewPackageSchedule error:", err);
      return res.status(500).json({ error: "فشلت معاينة جدول الحصص." });
    }
  }

  // Re-check conflicts for manually edited session times
  static async recheckScheduleConflicts(req: AuthRequest, res: Response) {
    const { subscriptionId, teacherId, sessions, isEditMode } = req.body;

    if (!subscriptionId || !Array.isArray(sessions)) {
      return res.status(400).json({ error: "بيانات ناقصة." });
    }

    try {
      const subscriptionRepository = AppDataSource.getRepository(Subscription);
      const sessionRepository = AppDataSource.getRepository(Session);
      const userRepository = AppDataSource.getRepository(User);

      const subscription = await subscriptionRepository.findOne({
        where: { id: subscriptionId },
        relations: ["teacher", "plan", "student"]
      });

      if (!subscription) {
        return res.status(404).json({ error: "الاشتراك غير موجود." });
      }

      let teacher: User | null = subscription.teacher;
      if (teacherId) {
        teacher = await userRepository.findOneBy({ id: teacherId, role: "teacher" });
      }
      if (!teacher) {
        return res.status(400).json({ error: "يرجى تعيين معلم." });
      }

      // Get this subscription's own sessions to exclude from conflict check
      const existingSessions = await sessionRepository.find({
        where: { subscription: { id: subscription.id } }
      });
      const ownSessionIds = existingSessions.map(s => s.id);

      const daysAr = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const sessionDuration = subscription.plan?.sessionDurationMins || 60;
      const items: any[] = [];
      let validCount = 0;
      let conflictCount = 0;

      for (const session of sessions) {
        const d = new Date(session.scheduledAt);
        if (isNaN(d.getTime())) continue;

        const dayNum = d.getDay();
        let conflictReason: string | null = null;

        const windowStart = new Date(d.getTime() - sessionDuration * 60 * 1000);
        const windowEnd = new Date(d.getTime() + sessionDuration * 60 * 1000);

        let qb = sessionRepository.createQueryBuilder("session")
          .leftJoinAndSelect("session.teacher", "teacher")
          .leftJoinAndSelect("session.student", "student")
          .where("(session.teacherId = :teacherId OR session.studentId = :studentId)", {
            teacherId: teacher.id,
            studentId: subscription.student.id
          })
          .andWhere("session.status IN (:...activeStatuses)", {
            activeStatuses: ["SCHEDULED", "CONFIRMED", "scheduled", "live"]
          })
          .andWhere("session.scheduledAt >= :windowStart AND session.scheduledAt <= :windowEnd", {
            windowStart, windowEnd
          })
          .andWhere("(session.subscriptionId IS NULL OR session.subscriptionId != :subId)", { subId: subscription.id });

        if (ownSessionIds.length > 0) {
          qb = qb.andWhere("session.id NOT IN (:...ownIds)", { ownIds: ownSessionIds });
        }

        const conflictingSession = await qb.getOne();

        if (conflictingSession) {
          const conflictTime = new Date(conflictingSession.scheduledAt);
          const conflictTimeStr = conflictTime.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
          const conflictTeacher = conflictingSession.teacher?.name || "غير محدد";
          const conflictStudent = conflictingSession.student?.name || "غير محدد";

          if (String(conflictingSession.teacher?.id) === String(teacher.id)) {
            conflictReason = `المعلم "${conflictTeacher}" لديه حصة أخرى الساعة ${conflictTimeStr} مع طالب "${conflictStudent}".`;
          } else {
            conflictReason = `الطالب "${conflictStudent}" لديه حصة أخرى الساعة ${conflictTimeStr} مع المعلم "${conflictTeacher}".`;
          }
        }

        const status = conflictReason ? "CONFLICT" : "VALID";
        if (status === "VALID") validCount++; else conflictCount++;

        items.push({
          index: session.index,
          scheduledAt: d.toISOString(),
          dayName: daysAr[dayNum],
          teacherId: teacher.id,
          teacherName: teacher.name,
          status,
          conflictReason
        });
      }

      return res.json({
        countGenerated: items.length,
        validCount,
        conflictCount,
        items
      });

    } catch (err) {
      console.error("recheckScheduleConflicts error:", err);
      return res.status(500).json({ error: "فشل فحص التعارضات." });
    }
  }

  // Single transaction confirm package schedule
  static async confirmPackageSchedule(req: AuthRequest, res: Response) {
    const { subscriptionId, teacherId, sessions, isEditMode } = req.body;

    if (!subscriptionId || !Array.isArray(sessions) || sessions.length === 0) {
      return res.status(400).json({ error: "يرجى تقديم قائمة الحصص المؤكدة." });
    }

    try {
      const subscriptionRepository = AppDataSource.getRepository(Subscription);
      const userRepository = AppDataSource.getRepository(User);

      const subscription = await subscriptionRepository.findOne({
        where: { id: subscriptionId },
        relations: ["teacher", "plan", "student"]
      });

      if (!subscription) {
        return res.status(404).json({ error: "الاشتراك غير موجود." });
      }

      let sessionTeacher: User | null = subscription.teacher;
      if (teacherId) {
        sessionTeacher = await userRepository.findOneBy({ id: teacherId, role: "teacher" });
        if (sessionTeacher) {
          subscription.teacher = sessionTeacher;
          subscription.status = "ACTIVE";
          await subscriptionRepository.save(subscription);
        }
      }

      if (!sessionTeacher) {
        return res.status(400).json({ error: "يجب تحديد معلم للاشتراك." });
      }

      const totalSessions = subscription.totalSessions || subscription.plan?.sessionsCount || 4;

      await AppDataSource.transaction(async transactionalEntityManager => {
        const sessionRepo = transactionalEntityManager.getRepository(Session);

        if (isEditMode) {
          // Rule: COMPLETED sessions must NOT be modified or deleted
          const existing = await sessionRepo.find({ where: { subscription: { id: subscription.id } } });
          const toDelete = existing.filter(s => s.status !== "COMPLETED" && s.status !== "completed");
          if (toDelete.length > 0) {
            await sessionRepo.remove(toDelete);
          }
        } else {
          // Delete any existing uncompleted sessions to prevent duplicate overbooking
          const existing = await sessionRepo.find({ where: { subscription: { id: subscription.id } } });
          const uncompleted = existing.filter(s => s.status !== "COMPLETED" && s.status !== "completed");
          if (uncompleted.length > 0) {
            await sessionRepo.remove(uncompleted);
          }
        }

        for (let i = 0; i < sessions.length; i++) {
          const item = sessions[i];
          const sessionNum = item.index || (i + 1);
          const sess = new Session();
          sess.title = item.title || `حصة خاصة 1-على-1 (${sessionNum}/${totalSessions})`;
          sess.description = item.topic || `حصة مراجعة وشرح تفاعلي مباشر - حصة رقم ${sessionNum}`;
          sess.teacher = sessionTeacher!;
          sess.student = subscription.student;
          sess.subscription = subscription;
          sess.scheduledAt = new Date(item.scheduledAt);
          sess.duration = subscription.plan?.sessionDurationMins || 60;
          sess.status = "SCHEDULED";
          sess.topic = item.topic || "";

          await sessionRepo.save(sess);
        }
      });

      try {
        await NotificationController.createNotification(
          subscription.student.id,
          "تم تأكيد جدول حصص الباقة بنجاح! 🗓️",
          `تمت جدولة ${sessions.length} حصة مباشرة ضمن اشتراكك مع الأستاذ ${sessionTeacher.name}.`,
          "info",
          `#schedule`
        );
      } catch (e) {}

      return res.status(201).json({
        message: `تم تأكيد وجدولة كافة حصص الباقة بنجاح في معاملة واحدة! 🚀 (${sessions.length} حصة)`,
        totalScheduled: sessions.length
      });

    } catch (err) {
      console.error("confirmPackageSchedule error:", err);
      return res.status(500).json({ error: "فشلت عملية حفظ جدول الحصص." });
    }
  }

  // POST /sessions/group-preview-conflicts — Preview conflicts for teacher and students before creating group sessions
  static async previewGroupConflicts(req: AuthRequest, res: Response) {
    const { teacherId, studentIds, scheduledDates, duration } = req.body;

    if (!teacherId || !Array.isArray(scheduledDates) || scheduledDates.length === 0) {
      return res.status(400).json({ error: "الرجاء تحديد المعلم وتواريخ الحصص." });
    }

    try {
      const userRepository = AppDataSource.getRepository(User);
      const sessionRepository = AppDataSource.getRepository(Session);

      const teacher = await userRepository.findOneBy({ id: teacherId });
      if (!teacher) {
        return res.status(404).json({ error: "المعلم المحدد غير موجود." });
      }

      const validStudentIds: string[] = Array.isArray(studentIds) ? studentIds.map((id: any) => String(id).trim()).filter(id => id.length > 0) : [];
      const sessionDuration = parseInt(duration) || 60;

      const items: any[] = [];
      let totalConflicts = 0;

      for (let i = 0; i < scheduledDates.length; i++) {
        const d = new Date(scheduledDates[i]);
        if (isNaN(d.getTime())) continue;

        const windowStart = new Date(d.getTime() - sessionDuration * 60 * 1000);
        const windowEnd = new Date(d.getTime() + sessionDuration * 60 * 1000);

        // 1. Check Teacher Conflicts
        const teacherConflictSess = await sessionRepository.createQueryBuilder("session")
          .leftJoinAndSelect("session.student", "student")
          .where("session.teacherId = :teacherId", { teacherId: teacher.id })
          .andWhere("session.status IN (:...activeStatuses)", {
            activeStatuses: ["SCHEDULED", "CONFIRMED", "scheduled", "live"]
          })
          .andWhere("session.scheduledAt >= :windowStart AND session.scheduledAt <= :windowEnd", {
            windowStart, windowEnd
          })
          .getOne();

        let teacherConflict: any = null;
        if (teacherConflictSess) {
          const tTime = new Date(teacherConflictSess.scheduledAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
          teacherConflict = {
            sessionId: teacherConflictSess.id,
            title: teacherConflictSess.title,
            time: tTime,
            studentName: teacherConflictSess.student?.name || "طالب آخر"
          };
          totalConflicts++;
        }

        // 2. Check Student Conflicts
        const studentConflicts: any[] = [];
        if (validStudentIds.length > 0) {
          const studentConflictSesses = await sessionRepository.createQueryBuilder("session")
            .leftJoinAndSelect("session.student", "student")
            .leftJoinAndSelect("session.teacher", "teacher")
            .where("session.studentId IN (:...sIds)", { sIds: validStudentIds })
            .andWhere("session.status IN (:...activeStatuses)", {
              activeStatuses: ["SCHEDULED", "CONFIRMED", "scheduled", "live"]
            })
            .andWhere("session.scheduledAt >= :windowStart AND session.scheduledAt <= :windowEnd", {
              windowStart, windowEnd
            })
            .getMany();

          for (const cs of studentConflictSesses) {
            const sTime = new Date(cs.scheduledAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
            studentConflicts.push({
              studentId: cs.student?.id,
              studentName: cs.student?.name || "طالب",
              sessionId: cs.id,
              time: sTime,
              title: cs.title,
              teacherName: cs.teacher?.name || "معلم آخر"
            });
            totalConflicts++;
          }
        }

        items.push({
          index: i + 1,
          date: d.toISOString(),
          teacherConflict,
          studentConflicts,
          hasConflict: !!teacherConflict || studentConflicts.length > 0
        });
      }

      return res.json({
        items,
        totalConflicts
      });

    } catch (err) {
      console.error("previewGroupConflicts error:", err);
      return res.status(500).json({ error: "فشل فحص تعارضات الحصص الجماعية." });
    }
  }

  // POST /sessions/group-schedule — Schedule multiple live sessions for a group of students with a teacher
  static async scheduleGroupSession(req: AuthRequest, res: Response) {
    const { title, teacherId, studentIds, scheduledAt, scheduledDates, duration, meetingLink, allowConflicts } = req.body;

    if (!title || !teacherId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: "الرجاء توفير عنوان الحصة والمعلم وقائمة الطلاب." });
    }

    let datesToSchedule: Date[] = [];
    if (Array.isArray(scheduledDates) && scheduledDates.length > 0) {
      datesToSchedule = scheduledDates.map((d: string) => new Date(d)).filter((d: Date) => !isNaN(d.getTime()));
    } else if (scheduledAt) {
      const d = new Date(scheduledAt);
      if (!isNaN(d.getTime())) datesToSchedule.push(d);
    }

    if (datesToSchedule.length === 0) {
      return res.status(400).json({ error: "الرجاء توفير تواريخ وأوقات البث الجماعي." });
    }

    try {
      const userRepository = AppDataSource.getRepository(User);
      const sessionRepository = AppDataSource.getRepository(Session);

      const teacher = await userRepository.findOneBy({ id: teacherId });
      if (!teacher) {
        return res.status(404).json({ error: "المعلم المحدد غير موجود." });
      }

      const students = await userRepository.find({
        where: studentIds.map(id => ({ id }))
      });

      if (students.length === 0) {
        return res.status(400).json({ error: "لم يتم العثور على أي طالب من القائمة المحددة." });
      }

      const sessionDuration = parseInt(duration) || 60;

      // Conflict Prevention Check if allowConflicts is false
      if (!allowConflicts) {
        const conflictsList: string[] = [];

        for (const scheduledDate of datesToSchedule) {
          const windowStart = new Date(scheduledDate.getTime() - sessionDuration * 60 * 1000);
          const windowEnd = new Date(scheduledDate.getTime() + sessionDuration * 60 * 1000);

          // 1. Check Teacher Conflict
          const tConflict = await sessionRepository.createQueryBuilder("session")
            .where("session.teacherId = :teacherId", { teacherId: teacher.id })
            .andWhere("session.status IN (:...activeStatuses)", {
              activeStatuses: ["SCHEDULED", "CONFIRMED", "scheduled", "live"]
            })
            .andWhere("session.scheduledAt >= :windowStart AND session.scheduledAt <= :windowEnd", {
              windowStart, windowEnd
            })
            .getOne();

          const dateStr = scheduledDate.toLocaleString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

          if (tConflict) {
            conflictsList.push(`المعلم "${teacher.name}" لديه حصة أخرى في موعد ${dateStr}.`);
          }

          // 2. Check Students Conflict
          const sConflicts = await sessionRepository.createQueryBuilder("session")
            .leftJoinAndSelect("session.student", "student")
            .where("session.studentId IN (:...sIds)", { sIds: students.map(s => s.id) })
            .andWhere("session.status IN (:...activeStatuses)", {
              activeStatuses: ["SCHEDULED", "CONFIRMED", "scheduled", "live"]
            })
            .andWhere("session.scheduledAt >= :windowStart AND session.scheduledAt <= :windowEnd", {
              windowStart, windowEnd
            })
            .getMany();

          for (const sc of sConflicts) {
            conflictsList.push(`الطالب "${sc.student?.name}" لديه حصة أخرى في موعد ${dateStr}.`);
          }
        }

        if (conflictsList.length > 0) {
          return res.status(409).json({
            conflict: true,
            error: "تم اكتشاف تعارض في مواعيد الحصص الجماعية مع مواعيد أخرى مسجلة.",
            conflicts: conflictsList
          });
        }
      }

      const createdSessions: Session[] = [];

      for (let i = 0; i < datesToSchedule.length; i++) {
        const scheduledDate = datesToSchedule[i];
        const sessionTitle = datesToSchedule.length > 1 ? `${title} - حصة (${i + 1}/${datesToSchedule.length})` : title;

        for (const student of students) {
          const session = new Session();
          session.title = sessionTitle;
          session.teacher = teacher;
          session.student = student;
          session.scheduledAt = scheduledDate;
          session.duration = sessionDuration;
          session.status = "SCHEDULED";
          session.topic = sessionTitle;

          const saved = await sessionRepository.save(session);
          createdSessions.push(saved);

          try {
            await NotificationController.createNotification(
              student.id,
              "حصة بث مباشر جماعية جديدة! 🎥",
              `تم إضافة حصة جماعية بعنوان "${sessionTitle}" معك ومع المعلم ${teacher.name} بتاريخ ${scheduledDate.toLocaleString("ar")}.`,
              "info",
              `#classroom/${saved.id}`
            );
          } catch (nErr) {}
        }
      }

      return res.status(201).json({
        message: `تم إدراج وجدولة ${datesToSchedule.length} حصة جماعية لـ ${students.length} طلاب بنجاح! 🚀 (إجمالي ${createdSessions.length} سجل حصص)`,
        groupSize: students.length,
        datesCount: datesToSchedule.length,
        totalSessionsCreated: createdSessions.length
      });
    } catch (err) {
      console.error("scheduleGroupSession error:", err);
      return res.status(500).json({ error: "فشلت جدولة الحصص الجماعية." });
    }
  }

  // POST /admin/group-sessions/add-student — Add student to group session
  static async addStudentToGroupSession(req: AuthRequest, res: Response) {
    const { sessionId, studentId } = req.body;
    if (!sessionId || !studentId) {
      return res.status(400).json({ error: "sessionId and studentId are required" });
    }

    try {
      const sessionRepository = AppDataSource.getRepository(Session);
      const userRepository = AppDataSource.getRepository(User);

      const sess = await sessionRepository.findOne({
        where: { id: sessionId },
        relations: ["teacher", "course"]
      });

      if (!sess) {
        return res.status(404).json({ error: "الحصة غير موجودة." });
      }

      const student = await userRepository.findOneBy({ id: studentId });
      if (!student) {
        return res.status(404).json({ error: "الطالب غير موجود." });
      }

      const sameGroupSessions = await sessionRepository.find({
        where: {
          teacher: { id: sess.teacher.id },
          title: sess.title
        },
        relations: ["student"]
      });

      const datesToSchedule = Array.from(new Set(sameGroupSessions.map(s => s.scheduledAt.getTime()))).map(t => new Date(t));
      if (datesToSchedule.length === 0 && sess.scheduledAt) {
        datesToSchedule.push(sess.scheduledAt);
      }

      let addedCount = 0;
      for (const d of datesToSchedule) {
        const existing = await sessionRepository.findOne({
          where: {
            teacher: { id: sess.teacher.id },
            student: { id: student.id },
            scheduledAt: d
          }
        });

        if (!existing) {
          const newSess = new Session();
          newSess.title = sess.title;
          newSess.teacher = sess.teacher;
          newSess.student = student;
          newSess.scheduledAt = d;
          newSess.duration = sess.duration || 60;
          newSess.status = "SCHEDULED";
          newSess.topic = sess.topic || sess.title;
          if (sess.course) newSess.course = sess.course;

          await sessionRepository.save(newSess);
          addedCount++;

          try {
            await NotificationController.createNotification(
              student.id,
              "تم إضافتك لحصة جماعية! 👥",
              `تم إضافتك إلى المجموعة الدراسية "${sess.title}" مع المعلم ${sess.teacher?.name}.`,
              "info",
              `#classroom/${newSess.id}`
            );
          } catch (e) {}
        }
      }

      return res.json({ message: `تم إضافة الطالب ${student.name} إلى المجموعة بنجاح! 🎉 (${addedCount} حصص)` });
    } catch (err) {
      console.error("addStudentToGroupSession error:", err);
      return res.status(500).json({ error: "فشل إضافة الطالب إلى المجموعة." });
    }
  }

  // POST /admin/group-sessions/remove-student — Remove student from group session
  static async removeStudentFromGroupSession(req: AuthRequest, res: Response) {
    const { sessionId, studentId } = req.body;
    if (!sessionId || !studentId) {
      return res.status(400).json({ error: "sessionId and studentId are required" });
    }

    try {
      const sessionRepository = AppDataSource.getRepository(Session);
      const sess = await sessionRepository.findOne({
        where: { id: sessionId },
        relations: ["teacher"]
      });

      if (!sess) {
        return res.status(404).json({ error: "الحصة غير موجودة." });
      }

      const toRemove = await sessionRepository.find({
        where: {
          teacher: { id: sess.teacher.id },
          student: { id: studentId },
          title: sess.title
        }
      });

      if (toRemove.length > 0) {
        await sessionRepository.remove(toRemove);
      }

      return res.json({ message: `تم إزالة الطالب من المجموعة بنجاح. ✅ (${toRemove.length} حصص)` });
    } catch (err) {
      console.error("removeStudentFromGroupSession error:", err);
      return res.status(500).json({ error: "فشل إزالة الطالب من المجموعة." });
    }
  }
}
