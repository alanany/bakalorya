import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { SubscriptionPlan } from "../entity/SubscriptionPlan";
import { Subscription } from "../entity/Subscription";
import { SessionCreditLedger } from "../entity/SessionCreditLedger";
import { Payment } from "../entity/Payment";
import { User } from "../entity/User";
import { AuditLog } from "../entity/AuditLog";
import { AuthRequest } from "../middleware/auth";

export class SubscriptionController {
  // Get active plans
  static async getPlans(req: Request, res: Response) {
    try {
      const planRepository = AppDataSource.getRepository(SubscriptionPlan);
      const plans = await planRepository.find({
        where: { isActive: true },
        order: { price: "ASC" }
      });
      return res.status(200).json(plans);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Admin create plan
  static async createPlan(req: AuthRequest, res: Response) {
    const { name, description, sessionsCount, price, currency, durationDays, sessionDurationMins } = req.body;

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

      await planRepository.save(plan);
      return res.status(201).json(plan);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Admin update plan
  static async updatePlan(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { name, description, sessionsCount, price, currency, durationDays, sessionDurationMins, isActive } = req.body;

    try {
      const planRepository = AppDataSource.getRepository(SubscriptionPlan);
      const plan = await planRepository.findOneBy({ id });
      if (!plan) return res.status(404).json({ error: "الخطة غير موجودة." });

      if (name) plan.name = name;
      if (description !== undefined) plan.description = description;
      if (sessionsCount !== undefined) plan.sessionsCount = Number(sessionsCount);
      if (price !== undefined) plan.price = Number(price);
      if (currency !== undefined) plan.currency = currency;
      if (durationDays !== undefined) plan.durationDays = Number(durationDays);
      if (sessionDurationMins !== undefined) plan.sessionDurationMins = Number(sessionDurationMins);
      if (isActive !== undefined) plan.isActive = Boolean(isActive);

      await planRepository.save(plan);
      return res.status(200).json(plan);
    } catch (err) {
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
      const ledgerRepository = AppDataSource.getRepository(SessionCreditLedger);
      const paymentRepository = AppDataSource.getRepository(Payment);

      const plan = await planRepository.findOneBy({ id: planId });
      if (!plan || !plan.isActive) {
        return res.status(404).json({ error: "خطة الاشتراك غير متوفرة." });
      }

      const student = await userRepository.findOneBy({ id: req.user!.id });
      if (!student) return res.status(404).json({ error: "حساب الطالب غير موجود." });

      let teacher: User | null = null;
      let status: "ACTIVE" | "TEACHER_ASSIGNMENT_PENDING" = "ACTIVE";

      if (requestTeacherRecommendation) {
        status = "TEACHER_ASSIGNMENT_PENDING";
      } else if (teacherId) {
        teacher = await userRepository.findOneBy({ id: teacherId, role: "teacher" });
        if (!teacher) {
          return res.status(404).json({ error: "الأستاذ المحدد غير موجود." });
        }
      } else {
        status = "TEACHER_ASSIGNMENT_PENDING";
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
      subscription.status = status;

      await subscriptionRepository.save(subscription);

      // Create Payment record
      const payment = new Payment();
      payment.student = student;
      payment.subscription = subscription;
      payment.amount = plan.price;
      payment.currency = plan.currency;
      payment.type = "SUBSCRIPTION";
      payment.status = "SUCCESS";
      payment.provider = "manual";
      await paymentRepository.save(payment);

      // Create Initial Ledger Credit Entry (+N credits)
      const ledger = new SessionCreditLedger();
      ledger.subscription = subscription;
      ledger.amount = plan.sessionsCount;
      ledger.type = "SUBSCRIPTION_PURCHASE";
      ledger.reason = `شراء اشتراك شهري (${plan.name})`;
      ledger.createdBy = student;
      await ledgerRepository.save(ledger);

      return res.status(201).json({
        subscription,
        payment,
        availableCredits: plan.sessionsCount
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
      if (subscription.status === "TEACHER_ASSIGNMENT_PENDING") {
        subscription.status = "ACTIVE";
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

  // Admin delete plan (only if no active subscriptions)
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
