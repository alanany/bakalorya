/**
 * WhatsApp Notification Helper Utility for Entlq Platform
 * Handles phone formatting, link generation, and Arabic notification templates.
 */

export interface WhatsAppNotificationResult {
  phone: string;
  formattedPhone: string;
  whatsappUrl: string;
  messageText: string;
}

/**
 * Format raw phone number into WhatsApp international format.
 * Examples: "+213 555 123 456" -> "213555123456"
 *           "0555123456" (Algeria prefix +213 if local zero) -> "213555123456"
 */
export function formatPhoneForWhatsApp(phone: string, defaultCountryCode: string = "213"): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[^\d+]/g, ""); // Keep only digits and '+'
  
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith("00")) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith("0")) {
    // If phone starts with local '0', strip it and prepend default country code
    cleaned = defaultCountryCode + cleaned.substring(1);
  }
  
  return cleaned;
}

/**
 * Generate a WhatsApp click-to-send API link
 */
export function generateWhatsAppLink(phone: string, text: string, defaultCountryCode: string = "213"): string {
  const formattedPhone = formatPhoneForWhatsApp(phone, defaultCountryCode);
  if (!formattedPhone) return "";
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Build Account Registration Success WhatsApp Message
 */
export function buildRegistrationSuccessMessage(
  studentName?: string,
  role: string = "student",
  platformUrl: string = process.env.APP_URL || "https://entlqedu.com"
): string {
  if (role === "teacher") {
    return `تم تفعيل وتأكيد حسابك بنجاح كـ (معلم) في منصة *انطلق* للتعليم الإلكتروني 🎓.

يمكنك الآن تسجيل الدخول إلى حسابك والبدء في استكشاف الدورات والجلسات المباشرة:
https://entlqedu.com/#staff-login

نتمنى لك رحلة ممتعة وتفوقاً دراسياً باهراً! 🚀✨`;
  }

  const greeting = studentName ? `مرحباً ${studentName}! 🎉\n\n` : "";
  return `${greeting}تم تفعيل وتأكيد حسابك بنجاح كـ (طالب) في منصة *انطلق* للتعليم الإلكتروني 🎓.

يمكنك الآن تسجيل الدخول إلى حسابك والبدء في استكشاف الدورات والجلسات المباشرة:
${platformUrl}/#login

نتمنى لك رحلة ممتعة وتفوقاً دراسياً باهراً! 🚀✨`;
}

/**
 * Build Course Enrollment Acceptance WhatsApp Message
 */
export function buildEnrollmentAcceptedMessage(
  studentName: string,
  courseTitle: string,
  teacherName?: string,
  platformUrl: string = "http://localhost:3000"
): string {
  const teacherInfo = teacherName ? ` مع الأستاذ: *${teacherName}*` : "";
  return `مرحباً ${studentName}! 📚🎓

مبروك! تم قبول طلب تسجيلك وانضمامك بنجاح إلى الدورة التعليمية:
📖 *${courseTitle}*${teacherInfo}

يمكنك الآن الدخول والوصول المباشر لكافة الدروس، الفيديوهات، الملخصات والجلسات التفاعلية عبر الرابط:
🔗 ${platformUrl}/#courses

نتمنى لك توفيقاً وحصداً لأعلى العلامات في الانطلق! 🌟💯`;
}

/**
 * Helper to produce full notification object for API responses
 */
export function createWhatsAppNotificationPayload(
  phone: string,
  messageText: string,
  defaultCountryCode: string = "213"
): WhatsAppNotificationResult | null {
  const formattedPhone = formatPhoneForWhatsApp(phone, defaultCountryCode);
  if (!formattedPhone) return null;
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
  
  console.log(`[WhatsApp Notification Log] Destination: ${formattedPhone}`);
  console.log(`[WhatsApp Notification Link]: ${whatsappUrl}`);

  return {
    phone,
    formattedPhone,
    whatsappUrl,
    messageText
  };
}

/**
 * Build Teacher Session Reminder WhatsApp Message
 */
export function buildTeacherSessionReminderMessage(data: {
  teacherName: string;
  sessionTitle: string;
  studentOrGroupName: string;
  scheduledDateStr: string;
  scheduledTimeStr: string;
  meetingLink: string;
}): string {
  const teacher = data.teacherName ? `أستاذ ${data.teacherName}` : "أستاذنا العزيز";
  const meet = data.meetingLink
    ? `🔗 رابط قاعة Google Meet:\n${data.meetingLink}`
    : "🔗 رابط الحصة: يرجى التحقق من لوحة التحكم أو إضافة الرابط";

  return `مرحباً ${teacher} 🌸
تذكير بموعد حصتك القادمة على منصة بكالوريا:

📚 عنوان الحصة: *${data.sessionTitle}*
👥 مع: *${data.studentOrGroupName}*
⏰ الموعد: *${data.scheduledDateStr}* - الساعة *${data.scheduledTimeStr}*
${meet}

يرجى التواجد قبل موعد الحصة بـ 5 دقائق لتجهيز القاعة وتأكيد الحضور للطلاب.
نتمنى لك وللطلاب حصة موفقة ومثمرة! 🌟`;
}

/**
 * Build Student Session Reminder WhatsApp Message
 */
export function buildStudentSessionReminderMessage(data: {
  studentName: string;
  sessionTitle: string;
  teacherName: string;
  scheduledDateStr: string;
  scheduledTimeStr: string;
  meetingLink: string;
}): string {
  const student = data.studentName ? `يا بطل ${data.studentName}` : "عزيزي الطالب";
  const teacher = data.teacherName ? ` مع الأستاذ: *${data.teacherName}*` : "";
  const meet = data.meetingLink
    ? `🔗 رابط الانضمام المباشر للحصة:\n${data.meetingLink}`
    : "🔗 رابط الحصة: متاح داخل حسابك بالمنصة";

  return `أهلاً بك ${student} 👋
حصتك الدراسية ستبدأ قريباً! جاهز للتميّز؟ 🚀

📚 الحصة: *${data.sessionTitle}*${teacher}
⏰ التوقيت: *${data.scheduledDateStr}* - الساعة *${data.scheduledTimeStr}*
${meet}

💡 نصائح سريعة قبل البدء:
- تأكد من تجهيز كراسك وأدواتك.
- اختر مكاناً هادئاً وتأكد من عمل المايكروفون والسماعات.

نراك في القاعة، بالتوفيق والتألق الدائم! 🎓✨`;
}

/**
 * Build Group Broadcast Reminder WhatsApp Message
 */
export function buildGroupBroadcastReminderMessage(data: {
  groupTitle: string;
  teacherName: string;
  scheduledDateStr: string;
  scheduledTimeStr: string;
  meetingLink: string;
}): string {
  const teacher = data.teacherName ? ` مع الأستاذ: *${data.teacherName}*` : "";
  const meet = data.meetingLink ? `🔗 رابط الانضمام المباشر:\n${data.meetingLink}` : "";

  return `أعزاءنا طلاب *${data.groupTitle}* 🎓👋
تذكير بموعد حصتكم القادمة${teacher}:

⏰ التوقيت: *${data.scheduledDateStr}* - الساعة *${data.scheduledTimeStr}*
${meet}

يرجى الدخول قبل الموعد بـ 5 دقائق وتجهيز الأدوات.
نتمنى لكم جميعاً التوفيق والتفوق! 🌟`;
}

