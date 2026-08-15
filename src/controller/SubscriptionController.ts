import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { SubscriptionPlan } from "../entity/SubscriptionPlan";
import { Subscription } from "../entity/Subscription";
import { SessionCreditLedger } from "../entity/SessionCreditLedger";
import { Payment } from "../entity/Payment";
import { User } from "../entity/User";
import { Course } from "../entity/Course";
import { AuditLog } from "../entity/AuditLog";
import { AuthRequest } from "../middleware/auth";

export class SubscriptionController {
  // Get active plans (with optional courseId filtering)
  static async getPlans(req: Request, res: Response) {
    try {
      const planRepository = AppDataSource.getRepository(SubscriptionPlan);
      const { courseId, includeInactive } = req.query;

      const qb = planRepository.createQueryBuilder("plan")
        .leftJoinAndSelect("plan.course", "course")
        .orderBy("plan.price", "ASC");

      if (includeInactive !== "true") {
        qb.andWhere("plan.isActive = :isActive", { isActive: true });
      }

      if (courseId) {
        qb.andWhere("(plan.courseId = :courseId OR plan.courseId IS NULL)", { courseId });
      }

      const plans = await qb.getMany();
      return res.status(200).json(plans);
    } catch (err) {
      console.error("getPlans error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Admin create plan
  static async createPlan(req: AuthRequest, res: Response) {
    const { name, description, sessionsCount, price, currency, durationDays, sessionDurationMins, courseId } = req.body;

    if (!name || !sessionsCount || !price) {
      return res.status(400).json({ error: "الرجاء تحديد اسم الخطة، عدد الحصص، والسعر." });
    }

    try {
      const planRepository = AppDataSource.getRepository(SubscriptionPlan);
      const plan = new SubscriptionPlan();
      plan.name = name;
      plan.description = description;
      plan.sessionsCount = Number(sessionsCount);
      plan.price = Number(price);
      plan.currency = currency || "EGP";
      plan.durationDays = Number(durationDays) || 30;
      plan.sessionDurationMins = Number(sessionDurationMins) || 60;
      plan.isActive = true;

      if (courseId) {
        const courseRepo = AppDataSource.getRepository(Course);
        const course = await courseRepo.findOneBy({ id: courseId });
        if (course) {
          plan.course = course;
          plan.courseId = course.id;
        }
      }

      await planRepository.save(plan);
      return res.status(201).json(plan);
    } catch (err) {
      console.error("createPlan error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Admin update plan
  static async updatePlan(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { name, description, sessionsCount, price, currency, durationDays, sessionDurationMins, isActive, courseId } = req.body;

    try {
      const planRepository = AppDataSource.getRepository(SubscriptionPlan);
      const plan = await planRepository.findOne({
        where: { id },
        relations: ["course"]
      });
      if (!plan) return res.status(404).json({ error: "الخطة غير موجودة." });

      if (name) plan.name = name;
      if (description !== undefined) plan.description = description;
      if (sessionsCount !== undefined) plan.sessionsCount = Number(sessionsCount);
      if (price !== undefined) plan.price = Number(price);
      if (currency !== undefined) plan.currency = currency;
      if (durationDays !== undefined) plan.durationDays = Number(durationDays);
      if (sessionDurationMins !== undefined) plan.sessionDurationMins = Number(sessionDurationMins);
      if (isActive !== undefined) plan.isActive = Boolean(isActive);

      if (courseId !== undefined) {
        if (courseId) {
          const courseRepo = AppDataSource.getRepository(Course);
          const course = await courseRepo.findOneBy({ id: courseId });
          plan.course = course || (null as any);
          plan.courseId = course ? course.id : (null as any);
        } else {
          plan.course = null as any;
          plan.courseId = null as any;
        }
      }

      await planRepository.save(plan);
      return res.status(200).json(plan);
    } catch (err) {
      console.error("updatePlan error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Student buys subscription plan
  static async subscribe(req: AuthRequest, res: Response) {
    const { planId, teacherId, subjectId, levelId, requestTeacherRecommendation } = req.body;

    if (!planId) {
      return res.status(400).json({ error: "الرجاء اختيار خطة الاشتراك." });
    }

    try {
      const planRepository = AppDataSource.getRepository(SubscriptionPlan);
      const userRepository = AppDataSource.getRepository(User);
      const subscriptionRepository = AppDataSource.getRepository(Subscription);

      const plan = await planRepository.findOneBy({ id: planId });
      if (!plan || !plan.isActive) {
        return res.status(404).json({ error: "خطة الاشتراك غير متوفرة." });
      }

      const student = await userRepository.findOneBy({ id: req.user!.id });
      if (!student) return res.status(404).json({ error: "حساب الطالب غير موجود." });

      let teacher: User | null = null;
      if (!requestTeacherRecommendation && teacherId) {
        teacher = await userRepository.findOneBy({ id: teacherId, role: "teacher" });
        if (!teacher) {
          return res.status(404).json({ error: "الأستاذ المحدد غير موجود." });
        }
      }

      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

      const subscription = new Subscription();
      subscription.student = student;
      if (teacher) subscription.teacher = teacher;
      subscription.plan = plan;
      subscription.subjectId = subjectId || null;
      subscription.levelId = levelId || null;
      subscription.totalSessions = plan.sessionsCount;
      subscription.startDate = startDate;
      subscription.endDate = endDate;
      // Always start as PENDING_PAYMENT – admin must approve and upload receipt
      subscription.status = "PENDING_PAYMENT";

      await subscriptionRepository.save(subscription);

      return res.status(201).json({
        subscription,
        message: "تم إرسال طلب الاشتراك بنجاح. سيتم تفعيله بعد مراجعة الأدمن وتأكيد الدفع."
      });
    } catch (err) {
      console.error("Subscribe error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Student view active subscriptions & calculated ledger credits
  static async getMySubscriptions(req: AuthRequest, res: Response) {
    try {
      const subscriptionRepository = AppDataSource.getRepository(Subscription);
      const ledgerRepository = AppDataSource.getRepository(SessionCreditLedger);

      const subscriptions = await subscriptionRepository.find({
        where: { student: { id: req.user!.id } },
        relations: ["teacher", "plan"],
        order: { createdAt: "DESC" }
      });

      const result = await Promise.all(subscriptions.map(async (sub) => {
        const ledgers = await ledgerRepository.find({
          where: { subscription: { id: sub.id } }
        });
        const remainingCredits = ledgers.reduce((sum, entry) => sum + entry.amount, 0);

        return {
          ...sub,
          remainingCredits: Math.max(0, remainingCredits),
          usedCredits: Math.max(0, sub.totalSessions - remainingCredits)
        };
      }));

      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Teacher view assigned subscriptions & calculated ledger credits
  static async getTeacherSubscriptions(req: AuthRequest, res: Response) {
    try {
      const subscriptionRepository = AppDataSource.getRepository(Subscription);
      const ledgerRepository = AppDataSource.getRepository(SessionCreditLedger);

      const subscriptions = await subscriptionRepository.find({
        where: { teacher: { id: req.user!.id } },
        relations: ["student", "plan"],
        order: { createdAt: "DESC" }
      });

      const result = await Promise.all(subscriptions.map(async (sub) => {
        const ledgers = await ledgerRepository.find({
          where: { subscription: { id: sub.id } }
        });
        const remainingCredits = ledgers.reduce((sum, entry) => sum + entry.amount, 0);

        return {
          ...sub,
          remainingCredits: Math.max(0, remainingCredits),
          usedCredits: Math.max(0, sub.totalSessions - remainingCredits)
        };
      }));

      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Admin view all subscriptions
  static async getAllSubscriptions(req: Request, res: Response) {
    try {
      const subscriptionRepository = AppDataSource.getRepository(Subscription);
      const subscriptions = await subscriptionRepository.find({
        relations: ["student", "teacher", "plan"],
        order: { createdAt: "DESC" }
      });
      return res.status(200).json(subscriptions);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Admin assign or change teacher for subscription
  static async assignTeacher(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { teacherId } = req.body;

    if (!teacherId) return res.status(400).json({ error: "الرجاء اختيار المعلم." });

    try {
      const subscriptionRepository = AppDataSource.getRepository(Subscription);
      const userRepository = AppDataSource.getRepository(User);
      const auditRepository = AppDataSource.getRepository(AuditLog);

      const subscription = await subscriptionRepository.findOne({
        where: { id },
        relations: ["student", "teacher", "plan"]
      });

      if (!subscription) return res.status(404).json({ error: "الاشتراك غير موجود." });

      const newTeacher = await userRepository.findOneBy({ id: teacherId, role: "teacher" });
      if (!newTeacher) return res.status(404).json({ error: "المعلم المحدد غير موجود." });

      const oldTeacherName = subscription.teacher?.name || "بدون معلم";
      subscription.teacher = newTeacher;
      if (subscription.status === "TEACHER_ASSIGNMENT_PENDING" || subscription.status === "PENDING_PAYMENT") {
        subscription.status = "SCHEDULE_PENDING";
      }

      await subscriptionRepository.save(subscription);

      // Audit Log
      const audit = new AuditLog();
      audit.actor = { id: req.user!.id } as User;
      audit.action = "SUBSCRIPTION_TEACHER_REASSIGNED";
      audit.entityType = "Subscription";
      audit.entityId = subscription.id;
      audit.metadata = JSON.stringify({ oldTeacher: oldTeacherName, newTeacher: newTeacher.name });
      await auditRepository.save(audit);

      return res.status(200).json(subscription);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Admin approve subscription – creates Payment record + ledger credits
  static async approveSubscription(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { receiptUrl, notes, amount, currency, provider } = req.body;

    try {
      const subscriptionRepository = AppDataSource.getRepository(Subscription);
      const ledgerRepository = AppDataSource.getRepository(SessionCreditLedger);
      const paymentRepository = AppDataSource.getRepository(Payment);
      const auditRepository = AppDataSource.getRepository(AuditLog);

      const subscription = await subscriptionRepository.findOne({
        where: { id },
        relations: ["student", "teacher", "plan"]
      });

      if (!subscription) return res.status(404).json({ error: "الاشتراك غير موجود." });
      if (subscription.status !== "PENDING_PAYMENT") {
        return res.status(400).json({ error: "الاشتراك ليس في حالة انتظار الدفع." });
      }

      // Set status to SCHEDULE_PENDING if teacher assigned, or TEACHER_ASSIGNMENT_PENDING if teacher not assigned yet
      subscription.status = subscription.teacher ? "SCHEDULE_PENDING" : "TEACHER_ASSIGNMENT_PENDING";
      await subscriptionRepository.save(subscription);

      // Create Payment record with receipt
      const payment = new Payment();
      payment.student = subscription.student;
      payment.subscription = subscription;
      payment.amount = amount !== undefined ? Number(amount) : subscription.plan.price;
      payment.currency = currency || subscription.plan.currency || "EGP";
      payment.type = "SUBSCRIPTION";
      payment.status = "SUCCESS";
      payment.provider = provider || "manual";
      payment.receiptUrl = receiptUrl || null;
      payment.notes = notes || null;
      await paymentRepository.save(payment);

      // Grant ledger credits
      const ledger = new SessionCreditLedger();
      ledger.subscription = subscription;
      ledger.amount = subscription.plan.sessionsCount;
      ledger.type = "SUBSCRIPTION_PURCHASE";
      ledger.reason = `تفعيل اشتراك بواسطة الأدمن (${subscription.plan.name})`;
      ledger.createdBy = { id: req.user!.id } as User;
      await ledgerRepository.save(ledger);

      // Audit Log
      const audit = new AuditLog();
      audit.actor = { id: req.user!.id } as User;
      audit.action = "SUBSCRIPTION_APPROVED";
      audit.entityType = "Subscription";
      audit.entityId = subscription.id;
      audit.metadata = JSON.stringify({ studentName: subscription.student.name, plan: subscription.plan.name, receiptUrl });
      await auditRepository.save(audit);

      return res.status(200).json({ subscription, payment });
    } catch (err) {
      console.error("Approve subscription error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Admin reject subscription
  static async rejectSubscription(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { reason } = req.body;

    try {
      const subscriptionRepository = AppDataSource.getRepository(Subscription);
      const auditRepository = AppDataSource.getRepository(AuditLog);

      const subscription = await subscriptionRepository.findOne({
        where: { id },
        relations: ["student", "plan"]
      });

      if (!subscription) return res.status(404).json({ error: "الاشتراك غير موجود." });

      subscription.status = "CANCELLED";
      await subscriptionRepository.save(subscription);

      const audit = new AuditLog();
      audit.actor = { id: req.user!.id } as User;
      audit.action = "SUBSCRIPTION_REJECTED";
      audit.entityType = "Subscription";
      audit.entityId = subscription.id;
      audit.metadata = JSON.stringify({ studentName: subscription.student.name, reason });
      await auditRepository.save(audit);

      return res.status(200).json({ message: "تم رفض الاشتراك.", subscription });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Admin renew subscription & attach receipt
  static async renewSubscription(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { planId, sessionsCount, amount, currency, provider, receiptUrl, notes } = req.body;

    try {
      const subscriptionRepository = AppDataSource.getRepository(Subscription);
      const planRepository = AppDataSource.getRepository(SubscriptionPlan);
      const ledgerRepository = AppDataSource.getRepository(SessionCreditLedger);
      const paymentRepository = AppDataSource.getRepository(Payment);
      const auditRepository = AppDataSource.getRepository(AuditLog);

      const subscription = await subscriptionRepository.findOne({
        where: { id },
        relations: ["student", "teacher", "plan"]
      });

      if (!subscription) return res.status(404).json({ error: "الاشتراك غير موجود." });

      let addedSessions = Number(sessionsCount);
      let renewalPlan = subscription.plan;
      let cost = amount !== undefined ? Number(amount) : subscription.plan?.price || 0;

      if (planId) {
        const foundPlan = await planRepository.findOneBy({ id: planId });
        if (foundPlan) {
          renewalPlan = foundPlan;
          if (!addedSessions) addedSessions = foundPlan.sessionsCount;
          if (amount === undefined) cost = foundPlan.price;
        }
      }

      if (!addedSessions || addedSessions <= 0) {
        addedSessions = renewalPlan?.sessionsCount || 8;
      }

      // Update totalSessions & extend endDate
      subscription.plan = renewalPlan;
      subscription.totalSessions = (subscription.totalSessions || 0) + addedSessions;

      const durationDays = renewalPlan?.durationDays || 30;
      const baseDate = subscription.endDate && new Date(subscription.endDate) > new Date()
        ? new Date(subscription.endDate)
        : new Date();
      subscription.endDate = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
      subscription.status = subscription.teacher ? "SCHEDULE_PENDING" : "TEACHER_ASSIGNMENT_PENDING";

      await subscriptionRepository.save(subscription);

      // Create Payment record
      const payment = new Payment();
      payment.student = subscription.student;
      payment.subscription = subscription;
      payment.amount = cost;
      payment.currency = currency || renewalPlan?.currency || "EGP";
      payment.type = "SUBSCRIPTION";
      payment.status = "SUCCESS";
      payment.provider = provider || "manual";
      payment.receiptUrl = receiptUrl || null;
      payment.notes = notes ? `تجديد اشتراك (${renewalPlan?.name || 'حصة خاصة'}) - ${notes}` : `تجديد اشتراك (${renewalPlan?.name || 'حصة خاصة'})`;
      await paymentRepository.save(payment);

      // Add Ledger credits
      const ledger = new SessionCreditLedger();
      ledger.subscription = subscription;
      ledger.amount = addedSessions;
      ledger.type = "SUBSCRIPTION_PURCHASE";
      ledger.reason = `تجديد اشتراك بواسطة الأدمن (${renewalPlan?.name || 'حصة خاصة'}) (+${addedSessions} حصة)`;
      ledger.createdBy = { id: req.user!.id } as User;
      await ledgerRepository.save(ledger);

      // Audit Log
      const audit = new AuditLog();
      audit.actor = { id: req.user!.id } as User;
      audit.action = "SUBSCRIPTION_RENEWED";
      audit.entityType = "Subscription";
      audit.entityId = subscription.id;
      audit.metadata = JSON.stringify({ studentName: subscription.student.name, addedSessions, cost, receiptUrl });
      await auditRepository.save(audit);

      return res.status(200).json({ subscription, payment, message: "تم تجديد الاشتراك وإضافة الرصيد والإيصال بنجاح 🎉" });
    } catch (err) {
      console.error("Renew subscription error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }




  static async deletePlan(req: AuthRequest, res: Response) {
    const { id } = req.params;
    try {
      const planRepository = AppDataSource.getRepository(SubscriptionPlan);
      const subscriptionRepository = AppDataSource.getRepository(Subscription);

      const plan = await planRepository.findOneBy({ id });
      if (!plan) return res.status(404).json({ error: "خطة الاشتراك غير موجودة." });

      // Soft-deactivate instead of hard-delete
      plan.isActive = false;
      await planRepository.save(plan);
      return res.status(200).json({ message: "تم إلغاء تفعيل الخطة بنجاح." });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }
}
