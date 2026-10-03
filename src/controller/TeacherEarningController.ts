import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { AppDataSource } from "../data-source";
import { TeacherEarning } from "../entity/TeacherEarning";
import { Payment } from "../entity/Payment";
import { AuditLog } from "../entity/AuditLog";
import { User } from "../entity/User";
import { AuthRequest } from "../middleware/auth";
import { NotificationController } from "./NotificationController";

export class TeacherEarningController {
  // Teacher views own earnings breakdown & stats
  static async getTeacherEarnings(req: AuthRequest, res: Response) {
    try {
      const earningRepository = AppDataSource.getRepository(TeacherEarning);
      const earnings = await earningRepository.find({
        where: { teacher: { id: req.user!.id } },
        order: { createdAt: "DESC" }
      });

      const totalEarned = earnings.reduce((sum, e) => sum + e.amount, 0);
      const pendingAmount = earnings.filter(e => e.status === "pending").reduce((sum, e) => sum + e.amount, 0);
      const paidAmount = earnings.filter(e => e.status === "paid").reduce((sum, e) => sum + e.amount, 0);

      const courseSalesEarnings = earnings.filter(e => e.sourceType === "COURSE_SALE").reduce((sum, e) => sum + e.amount, 0);
      const sessionEarnings = earnings.filter(e => e.sourceType === "SESSION_COMPLETED").reduce((sum, e) => sum + e.amount, 0);

      return res.status(200).json({
        earnings,
        stats: {
          totalEarned,
          pendingAmount,
          paidAmount,
          courseSalesEarnings,
          sessionEarnings
        }
      });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Admin views platform revenue, total payouts & teacher earnings overview
  static async getAdminEarnings(req: Request, res: Response) {
    try {
      const earningRepository = AppDataSource.getRepository(TeacherEarning);
      const paymentRepository = AppDataSource.getRepository(Payment);

      const earnings = await earningRepository.find({
        relations: ["teacher"],
        order: { createdAt: "DESC" }
      });

      const payments = await paymentRepository.find({
        relations: ["student", "courseEnrollment", "courseEnrollment.course", "courseEnrollment.group", "subscription", "subscription.plan"],
        order: { createdAt: "DESC" }
      });

      const successfulPayments = payments.filter(p => p.status === "SUCCESS");
      const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalTeacherEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
      const platformNetRevenue = Math.max(0, totalRevenue - totalTeacherEarnings);

      return res.status(200).json({
        payments,
        earnings,
        stats: {
          totalRevenue,
          totalTeacherEarnings,
          platformNetRevenue
        }
      });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Admin: mark a teacher earning as paid & record payout receipt data (supports full or partial amount)
  static async markAsPaid(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { receiptUrl, paymentMethod, transactionRef, notes, amount } = req.body || {};

    if (!receiptUrl || typeof receiptUrl !== "string" || !receiptUrl.trim()) {
      return res.status(400).json({ error: "يلزم إرفاق ورفع صورة إيصال التحويل لإتمام تسديد المبلغ للمعلم." });
    }

    try {
      const earningRepository = AppDataSource.getRepository(TeacherEarning);
      const earning = await earningRepository.findOne({
        where: { id },
        relations: ["teacher"]
      });
      if (!earning) return res.status(404).json({ error: "سجل المستحقات غير موجود." });
      if (earning.status === "paid") return res.status(400).json({ error: "هذا المبلغ مدفوع بالفعل." });

      const originalAmount = Number(earning.amount || 0);
      const payAmount = (amount !== undefined && amount !== null && !isNaN(Number(amount))) 
        ? Number(amount) 
        : originalAmount;

      if (payAmount <= 0) {
        return res.status(400).json({ error: "يرجى تحديد مبلغ سداد صحيح أكبر من الصفر." });
      }

      if (payAmount > originalAmount + 0.01) {
        return res.status(400).json({ error: `المبلغ المدخل (${payAmount} ج.م) أكبر من قيمة المعاملة المستحقة (${originalAmount} ج.م).` });
      }

      const isPartial = payAmount < originalAmount - 0.01;
      const unpaidRemainder = isPartial ? Math.round((originalAmount - payAmount) * 100) / 100 : 0;

      earning.amount = payAmount;
      earning.status = "paid";
      earning.receiptUrl = receiptUrl.trim();
      earning.paymentMethod = paymentMethod || "manual";
      if (transactionRef) earning.transactionRef = transactionRef.trim();
      earning.paidAt = new Date();
      if (isPartial) {
        earning.notes = notes ? `${notes.trim()} (دفعة جزئية: ${payAmount} ج.م من أصل ${originalAmount} ج.م)` : `دفعة جزئية: ${payAmount} ج.م من أصل ${originalAmount} ج.م`;
      } else if (notes) {
        earning.notes = notes.trim();
      }

      await earningRepository.save(earning);

      if (isPartial) {
        const remainder = new TeacherEarning();
        remainder.teacher = earning.teacher;
        remainder.sourceType = earning.sourceType;
        remainder.sourceId = earning.sourceId;
        remainder.currency = earning.currency || "EGP";
        remainder.amount = unpaidRemainder;
        remainder.status = "pending";
        remainder.notes = `المتبقي المستحق بعد سداد دفعة جزئية بقيمة ${payAmount} ج.م`;
        await earningRepository.save(remainder);
      }

      // Notify the teacher about the payout with receipt info
      if (earning.teacher) {
        try {
          const methodLabel = paymentMethod === 'vodafone_cash' ? 'فودافون كاش' :
                             paymentMethod === 'instapay' ? 'إنستاباي' :
                             paymentMethod === 'bank_transfer' ? 'تحويل بنكي' :
                             paymentMethod === 'orange_cash' ? 'أورنج كاش' :
                             paymentMethod === 'etisalat_cash' ? 'اتصالات كاش' :
                             paymentMethod === 'we_pay' ? 'وي باي' :
                             (paymentMethod || 'تحويل مالي');
          const msg = isPartial
            ? `قامت إدارة المنصة بسداد دفعة قدرها ${payAmount} ${earning.currency || 'ج.م'} عبر (${methodLabel})، والمتبقي من هذا المستحق هو ${unpaidRemainder} ${earning.currency || 'ج.م'}.`
            : `قامت إدارة المنصة بتسديد مستحقاتك بقيمة ${payAmount} ${earning.currency || 'ج.م'} عبر (${methodLabel}) وإرفاق إيصال التحويل في سجلك المالي.`;

          await NotificationController.createNotification(
            earning.teacher.id,
            isPartial ? "تم سداد دفعة جزئية من مستحقاتك 💸" : "تم تحويل مستحقاتك المالية بنجاح 💸🎉",
            msg,
            "success",
            "#teacher-portal"
          );
        } catch (nErr) {}
      }

      return res.status(200).json({ 
        message: isPartial 
          ? `تم سداد ${payAmount} ج.م بنجاح، والمتبقي هو ${unpaidRemainder} ج.م! 💸⏳`
          : "تم تسديد المبلغ للمعلم واعتماد إيصال التحويل بنجاح! 💸✅", 
        earning,
        remainingPending: unpaidRemainder
      });
    } catch (err: any) {
      console.error("markAsPaid error:", err);
      return res.status(500).json({ error: err.message || "Internal server error." });
    }
  }

  // Admin: pay teacher earnings (full or partial amount across all pending earnings)
  static async payTeacher(req: AuthRequest, res: Response) {
    const { teacherId, amount, receiptUrl, paymentMethod, transactionRef, notes } = req.body || {};

    if (!teacherId) {
      return res.status(400).json({ error: "معرف المعلم مطلوب." });
    }

    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: "يرجى تحديد مبلغ سداد صحيح أكبر من الصفر." });
    }

    if (!receiptUrl || typeof receiptUrl !== "string" || !receiptUrl.trim()) {
      return res.status(400).json({ error: "يلزم إرفاق ورفع صورة إيصال التحويل لإتمام تسديد المبلغ للمعلم." });
    }

    try {
      const userRepo = AppDataSource.getRepository(User);
      const teacher = await userRepo.findOne({ where: { id: teacherId } });
      if (!teacher) {
        return res.status(404).json({ error: "المعلم غير موجود." });
      }

      const earningRepository = AppDataSource.getRepository(TeacherEarning);
      const pendingEarnings = await earningRepository.find({
        where: { teacher: { id: teacherId }, status: "pending" },
        order: { createdAt: "ASC" }
      });

      if (pendingEarnings.length === 0) {
        return res.status(400).json({ error: "لا توجد مستحقات معلقة لهذا المعلم حالياً." });
      }

      const totalPending = pendingEarnings.reduce((sum, e) => sum + Number(e.amount || 0), 0);

      if (payAmount > totalPending + 0.01) {
        return res.status(400).json({
          error: `المبلغ المدخل (${payAmount.toLocaleString()} ج.م) يتجاوز إجمالي المستحقات المعلقة (${totalPending.toLocaleString()} ج.م).`
        });
      }

      let remainingToPay = Math.round(payAmount * 100) / 100;
      const now = new Date();
      const updatedEarnings: TeacherEarning[] = [];

      for (const ear of pendingEarnings) {
        if (remainingToPay <= 0) break;

        const earAmount = Math.round(Number(ear.amount || 0) * 100) / 100;

        if (remainingToPay >= earAmount - 0.001) {
          // Fully pay this earning
          ear.status = "paid";
          ear.paidAt = now;
          ear.receiptUrl = receiptUrl.trim();
          ear.paymentMethod = paymentMethod || "manual";
          if (transactionRef) ear.transactionRef = transactionRef.trim();
          ear.notes = notes ? notes.trim() : ear.notes;
          await earningRepository.save(ear);
          updatedEarnings.push(ear);
          remainingToPay = Math.round((remainingToPay - earAmount) * 100) / 100;
        } else {
          // Partial coverage of this earning record
          const paidPart = remainingToPay;
          const unpaidPart = Math.round((earAmount - paidPart) * 100) / 100;

          // 1. Mark current record as paid for the paidPart amount
          ear.amount = paidPart;
          ear.status = "paid";
          ear.paidAt = now;
          ear.receiptUrl = receiptUrl.trim();
          ear.paymentMethod = paymentMethod || "manual";
          if (transactionRef) ear.transactionRef = transactionRef.trim();
          const baseNote = notes ? notes.trim() : (ear.notes || "");
          ear.notes = baseNote ? `${baseNote} (دفعة جزئية: ${paidPart} ج.م من أصل ${earAmount} ج.م)` : `دفعة جزئية: ${paidPart} ج.م من أصل ${earAmount} ج.م`;
          await earningRepository.save(ear);
          updatedEarnings.push(ear);

          // 2. Create a new pending record for the remainder
          const remainderEarning = new TeacherEarning();
          remainderEarning.teacher = teacher;
          remainderEarning.sourceType = ear.sourceType;
          remainderEarning.sourceId = ear.sourceId;
          remainderEarning.currency = ear.currency || "EGP";
          remainderEarning.amount = unpaidPart;
          remainderEarning.status = "pending";
          remainderEarning.notes = `المتبقي المستحق بعد سداد دفعة جزئية بقيمة ${paidPart} ج.م`;
          await earningRepository.save(remainderEarning);

          remainingToPay = 0;
          break;
        }
      }

      const remainingPending = Math.max(0, Math.round((totalPending - payAmount) * 100) / 100);

      // Notify the teacher about payout
      try {
        const methodLabel = paymentMethod === 'vodafone_cash' ? 'فودافون كاش' :
                           paymentMethod === 'instapay' ? 'إنستاباي' :
                           paymentMethod === 'bank_transfer' ? 'تحويل بنكي' :
                           paymentMethod === 'orange_cash' ? 'أورنج كاش' :
                           paymentMethod === 'etisalat_cash' ? 'اتصالات كاش' :
                           paymentMethod === 'we_pay' ? 'وي باي' :
                           (paymentMethod || 'تسليم نقدي');

        const isFull = remainingPending === 0;
        const msg = isFull
          ? `قامت إدارة المنصة بتسديد كامل مستحقاتك بقيمة ${payAmount.toLocaleString()} ج.م عبر (${methodLabel}) وإرفاق إيصال التحويل في سجلك المالي.`
          : `قامت إدارة المنصة بسداد دفعة قدرها ${payAmount.toLocaleString()} ج.م عبر (${methodLabel})، والمبلغ المتبقي من مستحقاتك هو ${remainingPending.toLocaleString()} ج.م.`;

        await NotificationController.createNotification(
          teacher.id,
          isFull ? "تم تسديد كامل مستحقاتك المالية بنجاح 💸🎉" : "تم سداد دفعة من مستحقاتك المالية 💸",
          msg,
          "success",
          "#teacher-portal"
        );
      } catch (nErr) {}

      // Log audit
      try {
        const auditRepo = AppDataSource.getRepository(AuditLog);
        const audit = new AuditLog();
        audit.actor = { id: req.user!.id } as User;
        audit.action = "TEACHER_PAYOUT_PROCESSED";
        audit.entityType = "TeacherEarning";
        audit.entityId = teacherId;
        audit.metadata = JSON.stringify({
          teacherName: teacher.name,
          amountPaid: payAmount,
          remainingPending,
          totalBefore: totalPending
        });
        await auditRepo.save(audit);
      } catch (aErr) {}

      return res.status(200).json({
        message: remainingPending === 0 
          ? `تم تسديد كامل مستحقات المعلم بقيمة ${payAmount.toLocaleString()} ج.م بنجاح! 💸✅`
          : `تم سداد ${payAmount.toLocaleString()} ج.م بنجاح، والمتبقي من المستحقات هو ${remainingPending.toLocaleString()} ج.م. 💸⏳`,
        paidAmount: payAmount,
        remainingPending,
        updatedEarningsCount: updatedEarnings.length
      });
    } catch (err: any) {
      console.error("payTeacher error:", err);
      return res.status(500).json({ error: err.message || "Internal server error." });
    }
  }

  // Admin: revert teacher payout status & remove receipt
  static async revertPayout(req: AuthRequest, res: Response) {
    const { id } = req.params;
    try {
      const earningRepository = AppDataSource.getRepository(TeacherEarning);
      const earning = await earningRepository.findOne({
        where: { id },
        relations: ["teacher"]
      });

      if (!earning) {
        return res.status(404).json({ error: "سجل المستحقات غير موجود." });
      }

      // Delete physical receipt file from disk if present
      if (earning.receiptUrl && earning.receiptUrl.includes("/uploads/")) {
        try {
          const filename = path.basename(earning.receiptUrl);
          const filepath = path.join(process.cwd(), "public", "uploads", filename);
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }
        } catch (fErr) {
          console.error("Failed to delete receipt file from disk:", fErr);
        }
      }

      const prevAmount = earning.amount;
      const teacherName = earning.teacher?.name || "معلم";

      // Revert status to pending and clear receipt info
      earning.status = "pending";
      earning.receiptUrl = (null as any);
      earning.paidAt = (null as any);
      earning.transactionRef = (null as any);
      earning.notes = (null as any);
      earning.paymentMethod = "manual";

      await earningRepository.save(earning);

      // Log audit
      try {
        const auditRepo = AppDataSource.getRepository(AuditLog);
        const audit = new AuditLog();
        audit.actor = { id: req.user!.id } as User;
        audit.action = "TEACHER_PAYOUT_REVERTED";
        audit.entityType = "TeacherEarning";
        audit.entityId = id;
        audit.metadata = JSON.stringify({
          teacherName,
          amount: prevAmount
        });
        await auditRepo.save(audit);
      } catch (aErr) {}

      return res.status(200).json({
        message: "تم حذف الإيصال والتراجع عن السداد بنجاح! أصبحت المستحقات معلقة مجدداً ويمكنك إعادة تسديدها.",
        earning
      });
    } catch (err: any) {
      console.error("revertPayout error:", err);
      return res.status(500).json({ error: err.message || "Internal server error." });
    }
  }

  // Admin: delete teacher earning record
  static async deleteEarning(req: AuthRequest, res: Response) {
    const { id } = req.params;
    try {
      const earningRepository = AppDataSource.getRepository(TeacherEarning);
      const earning = await earningRepository.findOne({
        where: { id },
        relations: ["teacher"]
      });

      if (!earning) {
        return res.status(404).json({ error: "سجل المستحقات غير موجود." });
      }

      // Delete physical receipt file from disk if present
      if (earning.receiptUrl && earning.receiptUrl.includes("/uploads/")) {
        try {
          const filename = path.basename(earning.receiptUrl);
          const filepath = path.join(process.cwd(), "public", "uploads", filename);
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }
        } catch (fErr) {
          console.error("Failed to delete receipt file from disk:", fErr);
        }
      }

      const prevAmount = earning.amount;
      const teacherName = earning.teacher?.name || "معلم";

      await earningRepository.remove(earning);

      // Log audit
      try {
        const auditRepo = AppDataSource.getRepository(AuditLog);
        const audit = new AuditLog();
        audit.actor = { id: req.user!.id } as User;
        audit.action = "TEACHER_EARNING_DELETED";
        audit.entityType = "TeacherEarning";
        audit.entityId = id;
        audit.metadata = JSON.stringify({
          teacherName,
          amount: prevAmount
        });
        await auditRepo.save(audit);
      } catch (aErr) {}

      return res.status(200).json({
        message: "تم حذف سجل المستحقات بنجاح."
      });
    } catch (err: any) {
      console.error("deleteEarning error:", err);
      return res.status(500).json({ error: err.message || "Internal server error." });
    }
  }
}
