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
  studentName: string,
  role: string = "student",
  platformUrl: string = "http://localhost:3000"
): string {
  const roleTitle = role === "teacher" ? "معلم" : "طالب";
  return `مرحباً ${studentName}! 🎉

تم تفعيل وتأكيد حسابك بنجاح كـ (${roleTitle}) في منصة **انطلق** للتعليم الإلكتروني 🎓.

يمكنك الآن تسجيل الدخول إلى حسابك والبدء في استكشاف الدورات والجلسات المباشرة:
🔗 ${platformUrl}/#login

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
