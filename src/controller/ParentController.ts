import { Response } from "express";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { ParentStudentLink } from "../entity/ParentStudentLink";
import { Enrollment } from "../entity/Enrollment";
import { Session } from "../entity/Session";
import { AuthRequest } from "../middleware/auth";

export class ParentController {

  // ─── Admin: Create a parent account ───────────────────────────────────────
  static async adminCreateParent(req: AuthRequest, res: Response) {
    const { name, email, password, phone, location, studentId, relationship, status } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "الاسم والبريد الإلكتروني وكلمة المرور مطلوبة." });
    }
    try {
      const userRepo = AppDataSource.getRepository(User);
      if (await userRepo.findOneBy({ email })) {
        return res.status(400).json({ error: "البريد الإلكتروني مستخدم بالفعل." });
      }
      const hashed = await bcrypt.hash(password, 10);
      const parent = userRepo.create({
        name, email,
        password: hashed,
        role: "parent",
        status: status === "PENDING" ? "PENDING" : "ACTIVE",
        phone: phone || null,
        location: location || null,
        avatar: "assets/logo.png"
      });
      await userRepo.save(parent);

      if (studentId) {
        const student = await userRepo.findOneBy({ id: studentId, role: "student" });
        if (student) {
          const linkRepo = AppDataSource.getRepository(ParentStudentLink);
          const link = linkRepo.create({
            parentId: parent.id,
            studentId: student.id,
            relationship: relationship || "ولي أمر",
            addedByAdminId: req.user?.id
          });
          await linkRepo.save(link);
        }
      }

      return res.status(201).json({
        message: "تم إنشاء حساب ولي الأمر بنجاح.",
        parent: { id: parent.id, name: parent.name, email: parent.email, phone: parent.phone, status: parent.status, role: parent.role, createdAt: parent.createdAt }
      });
    } catch (err) {
      return res.status(500).json({ error: "فشل إنشاء الحساب." });
    }
  }

  // ─── Admin: List all parents ──────────────────────────────────────────────
  static async adminListParents(req: AuthRequest, res: Response) {
    try {
      const userRepo = AppDataSource.getRepository(User);
      const linkRepo = AppDataSource.getRepository(ParentStudentLink);
      const parents = await userRepo.find({ where: { role: "parent" }, order: { createdAt: "DESC" } });
      const enriched = await Promise.all(parents.map(async (p) => {
        const childrenCount = await linkRepo.count({ where: { parentId: p.id } });
        return { id: p.id, name: p.name, email: p.email, phone: p.phone, location: p.location, status: p.status, isBlocked: p.isBlocked, blockReason: p.blockReason, childrenCount, createdAt: p.createdAt };
      }));
      return res.json(enriched);
    } catch (err) {
      return res.status(500).json({ error: "فشل جلب بيانات أولياء الأمور." });
    }
  }

  // ─── Admin: Approve a PENDING parent ──────────────────────────────────────
  static async adminApproveParent(req: AuthRequest, res: Response) {
    const { id } = req.params;
    try {
      const userRepo = AppDataSource.getRepository(User);
      const parent = await userRepo.findOneBy({ id, role: "parent" });
      if (!parent) return res.status(404).json({ error: "ولي الأمر غير موجود." });
      parent.status = "ACTIVE";
      await userRepo.save(parent);
      return res.json({ message: "تم تفعيل حساب ولي الأمر." });
    } catch (err) {
      return res.status(500).json({ error: "فشل تفعيل الحساب." });
    }
  }

  // ─── Admin: Block/unblock a parent ───────────────────────────────────────
  static async adminToggleBlockParent(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { isBlocked, reason } = req.body || {};
    try {
      const userRepo = AppDataSource.getRepository(User);
      const parent = await userRepo.findOneBy({ id, role: "parent" });
      if (!parent) return res.status(404).json({ error: "ولي الأمر غير موجود." });
      parent.isBlocked = !!isBlocked;
      parent.status = isBlocked ? "BLOCKED" : "ACTIVE";
      parent.blockReason = isBlocked ? (reason || undefined) : undefined;
      await userRepo.save(parent);
      return res.json({ message: isBlocked ? "تم حظر ولي الأمر." : "تم رفع الحظر عن ولي الأمر." });
    } catch (err) {
      return res.status(500).json({ error: "فشل تحديث حالة الحساب." });
    }
  }

  // ─── Admin: Link a student to a parent ───────────────────────────────────
  static async adminAddChild(req: AuthRequest, res: Response) {
    const { parentId } = req.params;
    const { studentId, relationship } = req.body;
    if (!studentId) return res.status(400).json({ error: "معرف الطالب مطلوب." });
    try {
      const userRepo = AppDataSource.getRepository(User);
      const linkRepo = AppDataSource.getRepository(ParentStudentLink);

      const parent = await userRepo.findOneBy({ id: parentId, role: "parent" });
      if (!parent) return res.status(404).json({ error: "ولي الأمر غير موجود." });

      const student = await userRepo.findOneBy({ id: studentId, role: "student" });
      if (!student) return res.status(404).json({ error: "الطالب غير موجود." });

      const exists = await linkRepo.findOne({ where: { parentId, studentId } });
      if (exists) return res.status(400).json({ error: "هذا الطالب مرتبط بولي الأمر هذا مسبقاً." });

      const link = linkRepo.create({
        parentId, studentId,
        relationship: relationship || "ولي أمر",
        addedByAdminId: req.user?.id
      });
      await linkRepo.save(link);
      return res.status(201).json({
        message: "تم ربط الطالب بولي الأمر بنجاح.",
        link: { id: link.id, studentId, parentId, relationship: link.relationship }
      });
    } catch (err) {
      return res.status(500).json({ error: "فشل ربط الطالب." });
    }
  }

  // ─── Admin: Unlink a student from a parent ───────────────────────────────
  static async adminRemoveChild(req: AuthRequest, res: Response) {
    const { linkId } = req.params;
    try {
      const linkRepo = AppDataSource.getRepository(ParentStudentLink);
      const link = await linkRepo.findOneBy({ id: linkId });
      if (!link) return res.status(404).json({ error: "الرابط غير موجود." });
      await linkRepo.remove(link);
      return res.json({ message: "تم إلغاء ربط الطالب بولي الأمر." });
    } catch (err) {
      return res.status(500).json({ error: "فشل إلغاء الربط." });
    }
  }

  // ─── Admin: Get all children of a parent ─────────────────────────────────
  static async adminGetChildren(req: AuthRequest, res: Response) {
    const { parentId } = req.params;
    try {
      const linkRepo = AppDataSource.getRepository(ParentStudentLink);
      const links = await linkRepo.find({ where: { parentId }, relations: ["student"] });
      const children = links.map(l => ({
        linkId: l.id,
        relationship: l.relationship,
        student: { id: l.student.id, name: l.student.name, email: l.student.email, avatar: l.student.avatar, education: l.student.education, status: l.student.status }
      }));
      return res.json(children);
    } catch (err) {
      return res.status(500).json({ error: "فشل جلب بيانات الأبناء." });
    }
  }

  // ─── Parent: Get my children ──────────────────────────────────────────────
  static async myChildren(req: AuthRequest, res: Response) {
    const parentId = req.user!.id;
    try {
      const linkRepo = AppDataSource.getRepository(ParentStudentLink);
      const links = await linkRepo.find({ where: { parentId }, relations: ["student"] });
      const children = links.map(l => ({
        linkId: l.id,
        relationship: l.relationship,
        student: {
          id: l.student.id, name: l.student.name, email: l.student.email,
          avatar: l.student.avatar, education: l.student.education,
          status: l.student.status, phone: l.student.phone
        }
      }));
      return res.json(children);
    } catch (err) {
      return res.status(500).json({ error: "فشل جلب بيانات الأبناء." });
    }
  }

  // ─── Parent: Get a specific child's enrolled groups ──────────────────────
  static async childGroups(req: AuthRequest, res: Response) {
    const parentId = req.user!.id;
    const { studentId } = req.params;
    try {
      const linkRepo = AppDataSource.getRepository(ParentStudentLink);
      const link = await linkRepo.findOne({ where: { parentId, studentId } });
      if (!link) return res.status(403).json({ error: "غير مصرح لك بعرض بيانات هذا الطالب." });

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

      const activeOrPending = studentEnrollments.filter(e => e.status !== "rejected" && e.status !== "banned");

      const groups = activeOrPending.map(e => {
        const groupObj = e.group;
        const courseObj = groupObj?.course || e.course;
        const teacherObj = groupObj?.teacher || courseObj?.teacher;
        const sessions = groupObj?.sessions || [];
        const nextSession = sessions.find((s: any) => new Date(s.scheduledAt).getTime() > Date.now()) || sessions[0] || null;

        return {
          enrollmentId: e.id,
          enrolledAt: e.createdAt,
          progress: e.progress || 0,
          status: e.status,
          group: {
            id: groupObj ? groupObj.id : (courseObj ? courseObj.id : e.id),
            name: groupObj ? groupObj.name : (courseObj ? courseObj.title : 'مجموعة تعليمية'),
            meetingLink: groupObj?.meetingLink || null,
            status: groupObj?.status || e.status,
            scheduleText: groupObj?.scheduleText || (groupObj?.scheduleDays ? `${groupObj.scheduleDays} ${groupObj.scheduleTime ? 'الساعة ' + groupObj.scheduleTime : ''}` : null),
            course: courseObj ? {
              id: courseObj.id,
              title: courseObj.title,
              thumbnail: (courseObj as any).image || (courseObj as any).thumbnail || null,
              category: courseObj.category,
              grade: (courseObj as any).grade?.name || null,
              subject: (courseObj as any).subject?.name || null
            } : null,
            teacher: teacherObj ? {
              id: teacherObj.id,
              name: teacherObj.name,
              avatar: teacherObj.avatar,
              phone: teacherObj.phone,
              email: teacherObj.email
            } : null,
            sessionsCount: sessions.length,
            nextSession: nextSession ? { id: nextSession.id, title: nextSession.title, scheduledAt: nextSession.scheduledAt } : null
          }
        };
      });

      return res.json(groups);
    } catch (err) {
      return res.status(500).json({ error: "فشل جلب مجموعات الطالب." });
    }
  }

  // ─── Parent: Get a specific child's upcoming sessions ────────────────────
  static async childSessions(req: AuthRequest, res: Response) {
    const parentId = req.user!.id;
    const { studentId } = req.params;
    try {
      const linkRepo = AppDataSource.getRepository(ParentStudentLink);
      const link = await linkRepo.findOne({ where: { parentId, studentId } });
      if (!link) return res.status(403).json({ error: "غير مصرح لك بعرض بيانات هذا الطالب." });

      const enrollRepo = AppDataSource.getRepository(Enrollment);
      const studentEnrollments = await enrollRepo.find({
        where: { student: { id: studentId } },
        relations: ["group", "course"]
      });
      const validEnrollments = studentEnrollments.filter(e => e.status !== "rejected" && e.status !== "banned");
      const groupIds = validEnrollments.map(e => e.group?.id).filter(Boolean) as string[];
      const courseIds = validEnrollments.map(e => e.course?.id).filter(Boolean) as string[];

      const sessionRepo = AppDataSource.getRepository(Session);
      const allSessions = await sessionRepo.find({
        relations: ["group", "group.course", "group.teacher", "course", "course.teacher", "teacher", "student"],
        order: { scheduledAt: "ASC" },
        take: 100
      });

      const filtered = allSessions.filter(s =>
        (s.student && s.student.id === studentId) ||
        (s.group && groupIds.includes(s.group.id)) ||
        (s.course && courseIds.includes(s.course.id))
      );

      const now = new Date();
      const upcoming = filtered.filter(s => new Date(s.scheduledAt).getTime() >= now.getTime() - 3600000);
      const past = filtered.filter(s => new Date(s.scheduledAt).getTime() < now.getTime() - 3600000).reverse();
      const resultSessions = [...upcoming, ...past].slice(0, 30);

      return res.json(resultSessions.map(s => ({
        id: s.id,
        title: s.title || (s.course?.title || 'حصة تعليمية'),
        scheduledAt: s.scheduledAt,
        duration: s.duration || 60,
        meetingLink: s.meetingLink,
        status: s.status,
        group: s.group ? { id: s.group.id, name: s.group.name } : null,
        course: (s.group?.course || s.course) ? { title: (s.group?.course || s.course).title } : null,
        teacher: (s.teacher || s.group?.teacher || s.course?.teacher) ? {
          id: (s.teacher || s.group?.teacher || s.course?.teacher).id,
          name: (s.teacher || s.group?.teacher || s.course?.teacher).name,
          avatar: (s.teacher || s.group?.teacher || s.course?.teacher).avatar
        } : null
      })));
    } catch (err) {
      return res.status(500).json({ error: "فشل جلب جدول الطالب." });
    }
  }

  // ─── Parent: Get a specific child's assignment grades ────────────────────
  static async childGrades(req: AuthRequest, res: Response) {
    const parentId = req.user!.id;
    const { studentId } = req.params;
    try {
      const linkRepo = AppDataSource.getRepository(ParentStudentLink);
      const link = await linkRepo.findOne({ where: { parentId, studentId } });
      if (!link) return res.status(403).json({ error: "غير مصرح لك بعرض بيانات هذا الطالب." });

      const { AssignmentSubmission } = await import("../entity/AssignmentSubmission");
      const submissionRepo = AppDataSource.getRepository(AssignmentSubmission);
      const submissions = await submissionRepo.find({
        where: { student: { id: studentId } },
        relations: ["assignment", "student"],
        order: { submittedAt: "DESC" } as any,
        take: 50
      });

      return res.json(submissions.map((s: any) => ({
        id: s.id,
        submittedAt: s.submittedAt,
        grade: s.grade,
        feedback: s.overallFeedback || s.feedback,
        status: s.status,
        assignment: s.assignment ? {
          id: s.assignment.id,
          title: s.assignment.title,
          maxGrade: s.assignment.maxGrade || 100
        } : null
      })));
    } catch (err) {
      return res.status(500).json({ error: "فشل جلب درجات الطالب." });
    }
  }

  // ─── Parent: Get a specific child's billing & financial data ─────────────
  static async childBilling(req: AuthRequest, res: Response) {
    const parentId = req.user!.id;
    const { studentId } = req.params;
    try {
      const linkRepo = AppDataSource.getRepository(ParentStudentLink);
      const link = await linkRepo.findOne({ where: { parentId, studentId } });
      if (!link) return res.status(403).json({ error: "غير مصرح لك بعرض بيانات هذا الطالب." });

      const { Payment } = await import("../entity/Payment");
      const { Subscription } = await import("../entity/Subscription");
      const { SessionCreditLedger } = await import("../entity/SessionCreditLedger");
      const { Enrollment } = await import("../entity/Enrollment");

      const paymentRepo = AppDataSource.getRepository(Payment);
      const payments = await paymentRepo.find({
        where: { student: { id: studentId } },
        relations: [
          "courseEnrollment",
          "courseEnrollment.course",
          "courseEnrollment.group",
          "courseEnrollment.group.teacher",
          "subscription",
          "subscription.plan",
          "subscription.teacher"
        ],
        order: { createdAt: "DESC" }
      });

      const enrollRepo = AppDataSource.getRepository(Enrollment);
      const enrollments = await enrollRepo.find({
        where: { student: { id: studentId } },
        relations: [
          "group",
          "group.course",
          "group.teacher",
          "course",
          "course.teacher",
          "payment"
        ],
        order: { createdAt: "DESC" }
      });

      const activeGroups = enrollments
        .filter(e => e.status !== "rejected" && e.status !== "banned")
        .map(e => {
          const g = e.group;
          const c = g?.course || e.course;
          const t = g?.teacher || c?.teacher;
          const monthlyPrice = g?.monthlyPrice || 0;
          const sessionPrice = g?.sessionPrice || 0;
          return {
            enrollmentId: e.id,
            status: e.status,
            enrolledAt: e.createdAt,
            monthlyPrice,
            sessionPrice,
            currency: "ج.م",
            group: g ? {
              id: g.id,
              name: g.name,
              scheduleText: g.scheduleText || (g.scheduleDays ? `${g.scheduleDays} ${g.scheduleTime || ''}` : null),
              monthlyPrice: g.monthlyPrice,
              sessionsPerMonth: 8
            } : null,
            course: c ? {
              id: c.id,
              title: c.title,
              category: c.category
            } : null,
            teacher: t ? {
              id: t.id,
              name: t.name,
              avatar: t.avatar
            } : null,
            paymentStatus: e.payment?.status || (e.status === "active" ? "SUCCESS" : "PENDING")
          };
        });

      const subRepo = AppDataSource.getRepository(Subscription);
      const ledgerRepo = AppDataSource.getRepository(SessionCreditLedger);
      const rawSubscriptions = await subRepo.find({
        where: { student: { id: studentId } },
        relations: ["plan", "teacher"],
        order: { createdAt: "DESC" }
      });

      const subscriptions = await Promise.all(rawSubscriptions.map(async sub => {
        let remainingCredits = sub.totalSessions;
        try {
          const ledgers = await ledgerRepo.find({ where: { subscription: { id: sub.id } } });
          const sum = ledgers.reduce((acc, entry) => acc + (entry.amount || 0), 0);
          if (sum > 0) remainingCredits = sum;
        } catch (_) {}
        return {
          id: sub.id,
          status: sub.status,
          planTitle: sub.plan?.name || "باقة حصص خاصة",
          price: sub.plan?.price || 0,
          totalSessions: sub.totalSessions || 0,
          remainingSessions: Math.max(0, remainingCredits),
          consumedSessions: Math.max(0, (sub.totalSessions || 0) - remainingCredits),
          startDate: sub.startDate,
          endDate: sub.endDate,
          teacher: sub.teacher ? { id: sub.teacher.id, name: sub.teacher.name, avatar: sub.teacher.avatar } : null
        };
      }));

      const successfulPayments = payments.filter(p => p.status === "SUCCESS");
      const totalSpent = successfulPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const monthlyCommitment = activeGroups
        .filter(g => g.status === "active")
        .reduce((sum, g) => sum + (Number(g.monthlyPrice) || 0), 0);

      const formattedPayments = payments.map(p => {
        let title = "رسوم دراسية";
        let subTitle = "";
        if (p.type === "GROUP_ENROLLMENT" || p.courseEnrollment?.group) {
          title = p.courseEnrollment?.group?.name || p.courseEnrollment?.course?.title || "اشتراك مجموعة دراسية";
          subTitle = p.courseEnrollment?.group?.teacher?.name ? `مع أ. ${p.courseEnrollment.group.teacher.name}` : "";
        } else if (p.type === "COURSE_ENROLLMENT" || p.courseEnrollment?.course) {
          title = p.courseEnrollment?.course?.title || "شراء كورس تعليمي";
        } else if (p.type === "SUBSCRIPTION" || p.subscription) {
          title = p.subscription?.plan?.name || "باقة حصص دراسية خاصة";
          subTitle = p.subscription?.teacher?.name ? `مع أ. ${p.subscription.teacher.name}` : "";
        } else if (p.notes) {
          title = p.notes;
        }

        return {
          id: p.id,
          amount: p.amount,
          currency: p.currency || "EGP",
          type: p.type,
          title,
          subTitle,
          provider: p.provider,
          providerTransactionId: p.providerTransactionId,
          status: p.status,
          receiptUrl: p.receiptUrl,
          notes: p.notes,
          createdAt: p.createdAt
        };
      });

      return res.json({
        summary: {
          totalSpent,
          monthlyCommitment,
          activeGroupsCount: activeGroups.filter(g => g.status === "active").length,
          pendingPaymentsCount: payments.filter(p => p.status === "PENDING").length,
          totalInvoicesCount: payments.length
        },
        activeSubscriptions: activeGroups,
        packages: subscriptions,
        payments: formattedPayments
      });
    } catch (err) {
      return res.status(500).json({ error: "فشل جلب البيانات المالية للطالب." });
    }
  }

  // ─── Admin: Search students (for linking) ────────────────────────────────
  static async adminSearchStudents(req: AuthRequest, res: Response) {
    const { q } = req.query as { q?: string };
    try {
      const userRepo = AppDataSource.getRepository(User);
      const { ILike } = await import("typeorm");
      let students: User[];
      if (q && q.trim()) {
        const allStudents = await userRepo.find({ where: { role: "student" }, select: ["id", "name", "email", "avatar", "education", "phone"], take: 100 });
        const ql = q.toLowerCase().trim();
        students = allStudents.filter(s => s.name?.toLowerCase().includes(ql) || s.email?.toLowerCase().includes(ql));
        students = students.slice(0, 20);
      } else {
        students = await userRepo.find({ where: { role: "student" }, select: ["id", "name", "email", "avatar", "education", "phone"], take: 20 });
      }
      return res.json(students);
    } catch (err) {
      return res.status(500).json({ error: "فشل البحث عن الطلاب." });
    }
  }
}
