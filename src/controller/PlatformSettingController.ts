import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { PlatformSetting } from "../entity/PlatformSetting";
import { User } from "../entity/User";
import { NotificationController } from "./NotificationController";
import { formatPhoneForWhatsApp } from "../utils/whatsapp";

export class PlatformSettingController {
  
  // GET /public/settings — Get public platform contact settings
  static async getPublicSettings(req: Request, res: Response) {
    try {
      const settingRepo = AppDataSource.getRepository(PlatformSetting);
      const settings = await settingRepo.find();
      const map: Record<string, string> = {};
      settings.forEach(s => {
        map[s.key] = s.value;
      });

      const whatsappNumber = map["whatsapp_number"] || "+213 555 123 456";
      const cleanWhatsApp = formatPhoneForWhatsApp(whatsappNumber);
      const contactPhone = map["contact_phone"] || "+213 555 123 456 / +20 100 000 0000";
      const contactEmail = map["contact_email"] || "support@entlqedu.com";
      const contactEmail2 = map["contact_email2"] || "info@entlqedu.com";
      const workingHours = map["working_hours"] || "الأحد - الخميس (09:00 ص - 06:00 م)";
      const contactTitle = map["contact_title"] || "نحن هنا لدعمك وإجابة استفساراتك 💬";
      const contactSubtitle = map["contact_subtitle"] || "سواء كنت طالباً، معلماً، أو ولي أمر، يسعدنا تواصلك معنا طوال أيام الأسبوع للحصول على الدعم الفني والأكاديمي.";
      const contactAddress = map["contact_address"] || "الجزائر العاصمة / القاهرة";

      // Platform Financial Transfer Accounts
      const vodafoneCashNumber = map["vodafone_cash_number"] || "01098765432";
      const instapayHandle = map["instapay_handle"] || "bakalorya@instapay";
      const orangeCashNumber = map["orange_cash_number"] || "";
      const etisalatCashNumber = map["etisalat_cash_number"] || "";
      const bankAccountDetails = map["bank_account_details"] || "";
      const paymentInstructions = map["payment_instructions"] || "";

      return res.json({
        whatsappNumber,
        cleanWhatsApp,
        whatsappUrl: cleanWhatsApp ? `https://wa.me/${cleanWhatsApp}` : "https://wa.me/213555123456",
        contactPhone,
        contactEmail,
        contactEmail2,
        workingHours,
        contactTitle,
        contactSubtitle,
        contactAddress,
        vodafoneCashNumber,
        instapayHandle,
        orangeCashNumber,
        etisalatCashNumber,
        bankAccountDetails,
        paymentInstructions
      });
    } catch (err: any) {
      console.error("getPublicSettings error:", err);
      return res.status(500).json({ error: "Failed to fetch platform settings." });
    }
  }

  // GET /admin/settings — Get settings for admin dashboard
  static async getAdminSettings(req: Request, res: Response) {
    try {
      const settingRepo = AppDataSource.getRepository(PlatformSetting);
      const settings = await settingRepo.find();
      const map: Record<string, string> = {};
      settings.forEach(s => {
        map[s.key] = s.value;
      });

      const whatsappNumber = map["whatsapp_number"] || "+213 555 123 456";
      const cleanWhatsApp = formatPhoneForWhatsApp(whatsappNumber);
      const contactPhone = map["contact_phone"] || "+213 555 123 456 / +20 100 000 0000";
      const contactEmail = map["contact_email"] || "support@entlqedu.com";
      const contactEmail2 = map["contact_email2"] || "info@entlqedu.com";
      const workingHours = map["working_hours"] || "الأحد - الخميس (09:00 ص - 06:00 م)";
      const contactTitle = map["contact_title"] || "نحن هنا لدعمك وإجابة استفساراتك 💬";
      const contactSubtitle = map["contact_subtitle"] || "سواء كنت طالباً، معلماً، أو ولي أمر، يسعدنا تواصلك معنا طوال أيام الأسبوع للحصول على الدعم الفني والأكاديمي.";
      const contactAddress = map["contact_address"] || "الجزائر العاصمة / القاهرة";

      // Platform Financial Transfer Accounts
      const vodafoneCashNumber = map["vodafone_cash_number"] || "01098765432";
      const instapayHandle = map["instapay_handle"] || "bakalorya@instapay";
      const orangeCashNumber = map["orange_cash_number"] || "";
      const etisalatCashNumber = map["etisalat_cash_number"] || "";
      const bankAccountDetails = map["bank_account_details"] || "";
      const paymentInstructions = map["payment_instructions"] || "";

      return res.json({
        whatsappNumber,
        cleanWhatsApp,
        whatsappUrl: cleanWhatsApp ? `https://wa.me/${cleanWhatsApp}` : "https://wa.me/213555123456",
        contactPhone,
        contactEmail,
        contactEmail2,
        workingHours,
        contactTitle,
        contactSubtitle,
        contactAddress,
        vodafoneCashNumber,
        instapayHandle,
        orangeCashNumber,
        etisalatCashNumber,
        bankAccountDetails,
        paymentInstructions
      });
    } catch (err: any) {
      console.error("getAdminSettings error:", err);
      return res.status(500).json({ error: "Failed to fetch admin settings." });
    }
  }

  // PUT /admin/settings — Update settings from admin panel
  static async updateSettings(req: Request, res: Response) {
    try {
      const {
        whatsappNumber,
        contactPhone,
        contactEmail,
        contactEmail2,
        workingHours,
        contactTitle,
        contactSubtitle,
        contactAddress,
        vodafoneCashNumber,
        instapayHandle,
        orangeCashNumber,
        etisalatCashNumber,
        bankAccountDetails,
        paymentInstructions
      } = req.body;
      const settingRepo = AppDataSource.getRepository(PlatformSetting);

      const itemsToUpdate = [
        { key: "whatsapp_number", value: whatsappNumber !== undefined ? String(whatsappNumber).trim() : undefined },
        { key: "contact_phone", value: contactPhone !== undefined ? String(contactPhone).trim() : undefined },
        { key: "contact_email", value: contactEmail !== undefined ? String(contactEmail).trim() : undefined },
        { key: "contact_email2", value: contactEmail2 !== undefined ? String(contactEmail2).trim() : undefined },
        { key: "working_hours", value: workingHours !== undefined ? String(workingHours).trim() : undefined },
        { key: "contact_title", value: contactTitle !== undefined ? String(contactTitle).trim() : undefined },
        { key: "contact_subtitle", value: contactSubtitle !== undefined ? String(contactSubtitle).trim() : undefined },
        { key: "contact_address", value: contactAddress !== undefined ? String(contactAddress).trim() : undefined },
        { key: "vodafone_cash_number", value: vodafoneCashNumber !== undefined ? String(vodafoneCashNumber).trim() : undefined },
        { key: "instapay_handle", value: instapayHandle !== undefined ? String(instapayHandle).trim() : undefined },
        { key: "orange_cash_number", value: orangeCashNumber !== undefined ? String(orangeCashNumber).trim() : undefined },
        { key: "etisalat_cash_number", value: etisalatCashNumber !== undefined ? String(etisalatCashNumber).trim() : undefined },
        { key: "bank_account_details", value: bankAccountDetails !== undefined ? String(bankAccountDetails).trim() : undefined },
        { key: "payment_instructions", value: paymentInstructions !== undefined ? String(paymentInstructions).trim() : undefined },
      ].filter(item => item.value !== undefined);

      for (const item of itemsToUpdate) {
        let record = await settingRepo.findOneBy({ key: item.key });
        if (!record) {
          record = new PlatformSetting();
          record.key = item.key;
        }
        record.value = item.value!;
        await settingRepo.save(record);
      }

      const updatedSettings = await settingRepo.find();
      const map: Record<string, string> = {};
      updatedSettings.forEach(s => {
        map[s.key] = s.value;
      });

      const savedWhatsapp = map["whatsapp_number"] || "+213 555 123 456";
      const cleanWhatsApp = formatPhoneForWhatsApp(savedWhatsapp);

      return res.json({
        message: "تم حفظ كافة إعدادات المنصة وبيانات التحويل المالي بنجاح ✅",
        settings: {
          whatsappNumber: savedWhatsapp,
          cleanWhatsApp,
          whatsappUrl: cleanWhatsApp ? `https://wa.me/${cleanWhatsApp}` : "https://wa.me/213555123456",
          contactPhone: map["contact_phone"] || "+213 555 123 456 / +20 100 000 0000",
          contactEmail: map["contact_email"] || "support@entlqedu.com",
          contactEmail2: map["contact_email2"] || "info@entlqedu.com",
          workingHours: map["working_hours"] || "الأحد - الخميس (09:00 ص - 06:00 م)",
          contactTitle: map["contact_title"] || "نحن هنا لدعمك وإجابة استفساراتك 💬",
          contactSubtitle: map["contact_subtitle"] || "سواء كنت طالباً، معلماً، أو ولي أمر، يسعدنا تواصلك معنا طوال أيام الأسبوع للحصول على الدعم الفني والأكاديمي.",
          contactAddress: map["contact_address"] || "الجزائر العاصمة / القاهرة",
          vodafoneCashNumber: map["vodafone_cash_number"] || "01098765432",
          instapayHandle: map["instapay_handle"] || "bakalorya@instapay",
          orangeCashNumber: map["orange_cash_number"] || "",
          etisalatCashNumber: map["etisalat_cash_number"] || "",
          bankAccountDetails: map["bank_account_details"] || "",
          paymentInstructions: map["payment_instructions"] || ""
        }
      });
    } catch (err: any) {
      console.error("updateSettings error:", err);
      return res.status(500).json({ error: "فشل تحديث إعدادات المنصة." });
    }
  }

  // POST /public/free-trial — Submit a free test session request (Public)
  static async submitFreeTrial(req: Request, res: Response) {
    try {
      const { name, phone, stage, grade, subject, timing, notes } = req.body || {};

      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: "يرجى إدخال اسم الطالب." });
      }
      const studentPhone = phone && String(phone).trim() ? String(phone).trim() : "عبر واتساب";

      // Notify all admins about the new free trial booking
      const userRepo = AppDataSource.getRepository(User);
      const admins = await userRepo.find({ where: { role: "admin" } });

      const notificationMsg = `طلب جديد لحجز حصة تجريبية مجانية:\nالطالب: ${String(name).trim()}\nالتواصل: ${studentPhone}\nالمرحلة: ${stage || "غير محدد"}\nالصف: ${grade || "غير محدد"}\nالمادة: ${subject || "عامة"}\nالموعد: ${timing || "مرن"}`;

      for (const admin of admins) {
        try {
          await NotificationController.createNotification(
            admin.id,
            "🎁 طلب حجز حصة تجريبية مجانية جديد",
            notificationMsg,
            "info"
          );
        } catch (e) {
          // continue
        }
      }

      return res.status(200).json({
        success: true,
        message: "تم تسجيل طلب حجز الحصة التجريبية المجانية بنجاح! سيتواصل معك المنسق قريباً لتأكيد الموعد ورابط الحصة.",
        data: { name, phone, stage, grade, subject, timing }
      });
    } catch (err: any) {
      console.error("submitFreeTrial error:", err);
      return res.status(500).json({ error: "فشل تسجيل طلب الحصة التجريبية. يرجى المحاولة مرة أخرى." });
    }
  }
}

