import { Response } from "express";
import { AppDataSource } from "../data-source";
import { MarketingCampaign } from "../entity/MarketingCampaign";
import { Enrollment } from "../entity/Enrollment";
import { Payment } from "../entity/Payment";
import { AuthRequest } from "../middleware/auth";

export class MarketingCampaignController {
  // GET /api/admin/marketing-campaigns - List all campaigns with calculated ROI, ROAS, CAC, and Revenue
  static async getCampaigns(req: AuthRequest, res: Response) {
    try {
      const campaignRepo = AppDataSource.getRepository(MarketingCampaign);
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);
      const paymentRepo = AppDataSource.getRepository(Payment);

      const campaigns = await campaignRepo.find({
        order: { createdAt: "DESC" }
      });

      let totalAdSpend = 0;
      let totalAttributedRevenue = 0;
      let totalStudentsAcquired = 0;

      const platformBreakdown: Record<string, { spend: number; revenue: number; students: number }> = {
        facebook: { spend: 0, revenue: 0, students: 0 },
        instagram: { spend: 0, revenue: 0, students: 0 },
        tiktok: { spend: 0, revenue: 0, students: 0 },
        google_ads: { spend: 0, revenue: 0, students: 0 },
        snapchat: { spend: 0, revenue: 0, students: 0 },
        whatsapp: { spend: 0, revenue: 0, students: 0 },
        other: { spend: 0, revenue: 0, students: 0 }
      };

      const enrichedCampaigns = await Promise.all(
        campaigns.map(async (camp) => {
          // Count active/approved enrollments
          const enrollments = await enrollmentRepo.find({
            where: { campaign: { id: camp.id } },
            relations: ["student", "group", "course"]
          });

          // Unique students
          const studentMap = new Map<string, any>();
          enrollments.forEach(en => {
            if (en.student?.id) studentMap.set(en.student.id, en.student);
          });
          const studentsCount = studentMap.size;

          // Sum successful payments
          const payments = await paymentRepo.find({
            where: { campaign: { id: camp.id }, status: "SUCCESS" }
          });
          const revenue = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

          const spend = Number(camp.adSpend) || 0;
          const netProfit = Number((revenue - spend).toFixed(2));
          const roas = spend > 0 ? Number((revenue / spend).toFixed(2)) : (revenue > 0 ? 99 : 0);
          const cac = studentsCount > 0 ? Number((spend / studentsCount).toFixed(2)) : 0;
          const roiPercentage = spend > 0 ? Number((((revenue - spend) / spend) * 100).toFixed(1)) : 0;

          // Aggregates
          totalAdSpend += spend;
          totalAttributedRevenue += revenue;
          totalStudentsAcquired += studentsCount;

          const pKey = camp.platform in platformBreakdown ? camp.platform : "other";
          platformBreakdown[pKey].spend += spend;
          platformBreakdown[pKey].revenue += revenue;
          platformBreakdown[pKey].students += studentsCount;

          return {
            id: camp.id,
            name: camp.name,
            platform: camp.platform,
            adSpend: spend,
            currency: camp.currency || "EGP",
            status: camp.status || "active",
            startDate: camp.startDate,
            endDate: camp.endDate,
            targetAudience: camp.targetAudience,
            notes: camp.notes,
            createdAt: camp.createdAt,
            // Metrics
            studentsCount,
            enrollmentsCount: enrollments.length,
            revenue,
            netProfit,
            roas,
            cac,
            roiPercentage
          };
        })
      );

      const overallRoas = totalAdSpend > 0 
        ? Number((totalAttributedRevenue / totalAdSpend).toFixed(2)) 
        : (totalAttributedRevenue > 0 ? 99 : 0);
      const overallNetProfit = Number((totalAttributedRevenue - totalAdSpend).toFixed(2));
      const overallCac = totalStudentsAcquired > 0 
        ? Number((totalAdSpend / totalStudentsAcquired).toFixed(2)) 
        : 0;

      return res.status(200).json({
        campaigns: enrichedCampaigns,
        summary: {
          totalAdSpend: Number(totalAdSpend.toFixed(2)),
          totalAttributedRevenue: Number(totalAttributedRevenue.toFixed(2)),
          totalStudentsAcquired,
          overallRoas,
          overallNetProfit,
          overallCac,
          platformBreakdown
        }
      });
    } catch (err: any) {
      console.error("Get marketing campaigns error:", err);
      return res.status(500).json({ error: "فشل استرجاع الحملات التسويقية." });
    }
  }

  // GET /api/admin/marketing-campaigns/active - Lightweight list for dropdown selection
  static async getActiveCampaigns(req: AuthRequest, res: Response) {
    try {
      const campaignRepo = AppDataSource.getRepository(MarketingCampaign);
      const campaigns = await campaignRepo.find({
        where: { status: "active" },
        order: { createdAt: "DESC" },
        select: ["id", "name", "platform", "adSpend", "currency", "status"]
      });

      return res.status(200).json({ campaigns });
    } catch (err: any) {
      console.error("Get active campaigns error:", err);
      return res.status(500).json({ error: "فشل استرجاع الحملات النشطة." });
    }
  }

  // GET /api/admin/marketing-campaigns/:id - Detailed campaign view with enrolled students and transactions
  static async getCampaignDetails(req: AuthRequest, res: Response) {
    const { id } = req.params;
    try {
      const campaignRepo = AppDataSource.getRepository(MarketingCampaign);
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);
      const paymentRepo = AppDataSource.getRepository(Payment);

      const campaign = await campaignRepo.findOne({ where: { id } });
      if (!campaign) {
        return res.status(404).json({ error: "الحملة التسويقية غير موجودة." });
      }

      const enrollments = await enrollmentRepo.find({
        where: { campaign: { id } },
        relations: ["student", "group", "course", "payment"],
        order: { createdAt: "DESC" }
      });

      const payments = await paymentRepo.find({
        where: { campaign: { id } },
        relations: ["student"],
        order: { createdAt: "DESC" }
      });

      const revenue = payments
        .filter(p => p.status === "SUCCESS")
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const spend = Number(campaign.adSpend) || 0;
      const roas = spend > 0 ? Number((revenue / spend).toFixed(2)) : 0;
      const netProfit = Number((revenue - spend).toFixed(2));

      return res.status(200).json({
        campaign,
        metrics: {
          spend,
          revenue,
          netProfit,
          roas,
          enrollmentsCount: enrollments.length
        },
        enrollments: enrollments.map(e => ({
          id: e.id,
          student: e.student ? { id: e.student.id, name: e.student.name, phone: e.student.phone, email: e.student.email } : null,
          group: e.group ? { id: e.group.id, name: e.group.name } : null,
          course: e.course ? { id: e.course.id, title: e.course.title } : null,
          paidAmount: e.paidAmount,
          paymentStatus: e.paymentStatus,
          createdAt: e.createdAt
        })),
        payments: payments.map(p => ({
          id: p.id,
          student: p.student ? { id: p.student.id, name: p.student.name } : null,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          receiptUrl: p.receiptUrl,
          createdAt: p.createdAt
        }))
      });
    } catch (err: any) {
      console.error("Get campaign details error:", err);
      return res.status(500).json({ error: "فشل استرجاع تفاصيل الحملة." });
    }
  }

  // POST /api/admin/marketing-campaigns - Create a new marketing campaign
  static async createCampaign(req: AuthRequest, res: Response) {
    try {
      const { name, platform, adSpend, currency, startDate, endDate, targetAudience, notes } = req.body;

      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "اسم الحملة التسويقية مطلوب." });
      }

      const campaignRepo = AppDataSource.getRepository(MarketingCampaign);

      const campaign = new MarketingCampaign();
      campaign.name = name.trim();
      campaign.platform = (platform || "facebook").toLowerCase().trim();
      campaign.adSpend = adSpend !== undefined && !isNaN(Number(adSpend)) ? Number(adSpend) : 0;
      campaign.currency = currency || "EGP";
      campaign.status = "active";
      campaign.startDate = startDate || null;
      campaign.endDate = endDate || null;
      campaign.targetAudience = targetAudience ? targetAudience.trim() : null;
      campaign.notes = notes ? notes.trim() : null;

      const saved = await campaignRepo.save(campaign);

      return res.status(201).json({
        message: "تم إنشاء الحملة التسويقية بنجاح! 🚀",
        campaign: saved
      });
    } catch (err: any) {
      console.error("Create campaign error:", err);
      return res.status(500).json({ error: "فشل إنشاء الحملة التسويقية." });
    }
  }

  // PUT /api/admin/marketing-campaigns/:id - Update existing campaign
  static async updateCampaign(req: AuthRequest, res: Response) {
    const { id } = req.params;
    try {
      const { name, platform, adSpend, currency, status, startDate, endDate, targetAudience, notes } = req.body;
      const campaignRepo = AppDataSource.getRepository(MarketingCampaign);

      const campaign = await campaignRepo.findOne({ where: { id } });
      if (!campaign) {
        return res.status(404).json({ error: "الحملة التسويقية غير موجودة." });
      }

      if (name !== undefined) campaign.name = name.trim();
      if (platform !== undefined) campaign.platform = platform.toLowerCase().trim();
      if (adSpend !== undefined && !isNaN(Number(adSpend))) campaign.adSpend = Number(adSpend);
      if (currency !== undefined) campaign.currency = currency;
      if (status !== undefined) campaign.status = status;
      if (startDate !== undefined) campaign.startDate = startDate || null;
      if (endDate !== undefined) campaign.endDate = endDate || null;
      if (targetAudience !== undefined) campaign.targetAudience = targetAudience ? targetAudience.trim() : null;
      if (notes !== undefined) campaign.notes = notes ? notes.trim() : null;

      const saved = await campaignRepo.save(campaign);

      return res.status(200).json({
        message: "تم تحديث بيانات الحملة التسويقية بنجاح ✅",
        campaign: saved
      });
    } catch (err: any) {
      console.error("Update campaign error:", err);
      return res.status(500).json({ error: "فشل تحديث الحملة التسويقية." });
    }
  }

  // POST /api/admin/marketing-campaigns/:id/add-spend - Add additional spend to an existing campaign
  static async addCampaignSpend(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { additionalSpend, note } = req.body;

    if (additionalSpend === undefined || isNaN(Number(additionalSpend)) || Number(additionalSpend) <= 0) {
      return res.status(400).json({ error: "يرجى تحديد المبلغ الإضافي المصروف بشكل صحيح." });
    }

    try {
      const campaignRepo = AppDataSource.getRepository(MarketingCampaign);
      const campaign = await campaignRepo.findOne({ where: { id } });
      if (!campaign) {
        return res.status(404).json({ error: "الحملة التسويقية غير موجودة." });
      }

      const added = Number(additionalSpend);
      campaign.adSpend = (Number(campaign.adSpend) || 0) + added;
      if (note) {
        const timeStamp = new Date().toLocaleDateString("ar-EG");
        campaign.notes = campaign.notes 
          ? `${campaign.notes}\n[${timeStamp}] إضافة مصروف إعلاني: +${added} ${campaign.currency} (${note})`
          : `[${timeStamp}] إضافة مصروف إعلاني: +${added} ${campaign.currency} (${note})`;
      }

      const saved = await campaignRepo.save(campaign);

      return res.status(200).json({
        message: `تمت إضافة ${added} ${campaign.currency} إلى ميزانية الحملة بنجاح! 💳`,
        campaign: saved
      });
    } catch (err: any) {
      console.error("Add campaign spend error:", err);
      return res.status(500).json({ error: "فشل تسجيل المصروف الإضافي." });
    }
  }

  // DELETE /api/admin/marketing-campaigns/:id - Delete campaign
  static async deleteCampaign(req: AuthRequest, res: Response) {
    const { id } = req.params;
    try {
      const campaignRepo = AppDataSource.getRepository(MarketingCampaign);
      const campaign = await campaignRepo.findOne({ where: { id } });
      if (!campaign) {
        return res.status(404).json({ error: "الحملة غير موجودة." });
      }

      await campaignRepo.remove(campaign);
      return res.status(200).json({ message: "تم حذف الحملة التسويقية بنجاح 🗑️" });
    } catch (err: any) {
      console.error("Delete campaign error:", err);
      return res.status(500).json({ error: "فشل حذف الحملة التسويقية." });
    }
  }
}
