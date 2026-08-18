import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { TeacherEarning } from "../entity/TeacherEarning";
import { Payment } from "../entity/Payment";
import { AuthRequest } from "../middleware/auth";

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
        relations: ["student", "courseEnrollment", "courseEnrollment.course", "subscription", "subscription.plan"],
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

  // Admin: mark a teacher earning as paid
  static async markAsPaid(req: AuthRequest, res: Response) {
    const { id } = req.params;
    try {
      const earningRepository = AppDataSource.getRepository(TeacherEarning);
      const earning = await earningRepository.findOne({
        where: { id },
        relations: ["teacher"]
      });
      if (!earning) return res.status(404).json({ error: "سجل المستحقات غير موجود." });
      if (earning.status === "paid") return res.status(400).json({ error: "هذا المبلغ مدفوع بالفعل." });
      earning.status = "paid";
      await earningRepository.save(earning);
      return res.status(200).json({ message: "تم تسجيل دفع المستحقات بنجاح.", earning });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }
}
