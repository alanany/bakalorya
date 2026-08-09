import { apiFetch, showToast, t, renderPhoneInputGroup } from "../app.js";

export default class ContactView {
  constructor(container) {
    this.container = container;
  }

  async render() {
    this.container.innerHTML = `
      <div style="max-width:1200px; margin:0 auto; padding:40px 24px 80px; display:flex; flex-direction:column; gap:36px;">
        
        <!-- Header -->
        <div style="text-align:center;">
          <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(0,86,210,0.12); color:var(--primary); font-size:0.8rem; font-weight:800; padding:6px 18px; border-radius:30px; margin-bottom:14px;">
            <i data-lucide="headphones" style="width:14px; height:14px;"></i> تواصل معنا
          </div>
          <h1 style="font-size:2.2rem; font-weight:900; color:var(--text-color); margin:0 0 10px 0;">نحن هنا لدعمك وإجابة استفساراتك 💬</h1>
          <p style="font-size:0.98rem; color:var(--text-muted); max-width:600px; margin:0 auto; line-height:1.6;">
            سواء كنت طالباً، معلماً، أو ولي أمر، يسعدنا تواصلك معنا طوال أيام الأسبوع للحصول على الدعم الفني والأكاديمي.
          </p>
        </div>

        <!-- Contact Grid (Cards + Form) -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:32px;">
          
          <!-- Left Column: Contact Cards -->
          <div style="display:flex; flex-direction:column; gap:20px;">
            
            <div class="glass-card" style="padding:24px; border-radius:20px; border:1px solid var(--border-color); display:flex; align-items:flex-start; gap:16px;">
              <div style="width:48px; height:48px; border-radius:14px; background:rgba(16,185,129,0.12); color:#10b981; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="message-square" style="width:24px; height:24px;"></i>
              </div>
              <div>
                <h4 style="font-size:1.05rem; font-weight:800; color:var(--text-color); margin:0 0 4px 0;">الدعم المباشر عبر الواتساب</h4>
                <p style="font-size:0.85rem; color:var(--text-muted); margin:0 0 10px 0;">تواصل فورياً مع فريق خدمة العملاء والاستفسارات</p>
                <a href="https://wa.me/213555123456" target="_blank" class="btn-secondary" style="padding:6px 16px; font-size:0.82rem; border-color:#10b981; color:#10b981; border-radius:20px; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                  💬 بدء محادثة واتساب
                </a>
              </div>
            </div>

            <div class="glass-card" style="padding:24px; border-radius:20px; border:1px solid var(--border-color); display:flex; align-items:flex-start; gap:16px;">
              <div style="width:48px; height:48px; border-radius:14px; background:rgba(0,86,210,0.12); color:var(--primary); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="mail" style="width:24px; height:24px;"></i>
              </div>
              <div>
                <h4 style="font-size:1.05rem; font-weight:800; color:var(--text-color); margin:0 0 4px 0;">البريد الإلكتروني الرسمي</h4>
                <p style="font-size:0.85rem; color:var(--text-muted); margin:0 0 6px 0;">support@bakalorya.com</p>
                <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">info@bakalorya.com</p>
              </div>
            </div>

            <div class="glass-card" style="padding:24px; border-radius:20px; border:1px solid var(--border-color); display:flex; align-items:flex-start; gap:16px;">
              <div style="width:48px; height:48px; border-radius:14px; background:rgba(245,158,11,0.12); color:#f59e0b; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="phone-call" style="width:24px; height:24px;"></i>
              </div>
              <div>
                <h4 style="font-size:1.05rem; font-weight:800; color:var(--text-color); margin:0 0 4px 0;">الاتصال الهاتفي ورعاية المشتركين</h4>
                <p style="font-size:0.85rem; color:var(--text-muted); margin:0 0 6px 0;">+213 555 123 456 / +20 100 000 0000</p>
                <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">ساعات العمل: الأحد - الخميس (09:00 ص - 06:00 م)</span>
              </div>
            </div>

          </div>

          <!-- Right Column: Contact Form -->
          <div class="glass-card" style="padding:32px; border-radius:24px; border:1px solid var(--border-color);">
            <h3 style="font-size:1.3rem; font-weight:900; color:var(--text-color); margin:0 0 20px 0; display:flex; align-items:center; gap:8px;">
              <i data-lucide="send" style="color:var(--primary); width:20px; height:20px;"></i> أرسل رسالة مباشرة
            </h3>

            <form id="contact-us-form" style="display:flex; flex-direction:column; gap:16px;">
              <div class="form-group">
                <label style="font-weight:700; margin-bottom:6px; display:block; font-size:0.88rem;">الاسم بالكامل <span style="color:var(--error);">*</span></label>
                <input type="text" id="contact-name" class="form-input" placeholder="أدخل اسمك بالكامل" required style="padding:10px 14px;">
              </div>

              <div class="form-group">
                <label style="font-weight:700; margin-bottom:6px; display:block; font-size:0.88rem;">البريد الإلكتروني <span style="color:var(--error);">*</span></label>
                <input type="email" id="contact-email" class="form-input" placeholder="example@email.com" required style="padding:10px 14px;">
              </div>

              <div class="form-group">
                <label style="font-weight:700; margin-bottom:6px; display:block; font-size:0.88rem;">موضوع الرسالة <span style="color:var(--error);">*</span></label>
                <input type="text" id="contact-subject" class="form-input" placeholder="مثال: استفسار عن التسجيل بالدورة" required style="padding:10px 14px;">
              </div>

              <div class="form-group">
                <label style="font-weight:700; margin-bottom:6px; display:block; font-size:0.88rem;">تفاصيل الرسالة <span style="color:var(--error);">*</span></label>
                <textarea id="contact-message" class="form-input" style="height:120px; resize:vertical; padding:12px;" placeholder="اكتب تفاصيل استفسارك هنا..." required></textarea>
              </div>

              <button type="submit" class="btn-primary" style="padding:12px; font-weight:800; font-size:0.95rem; border-radius:30px; width:100%; justify-content:center; margin-top:8px;">
                إرسال الرسالة الآن 🚀
              </button>
            </form>
          </div>

        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.bindEvents();
  }

  bindEvents() {
    const form = this.container.querySelector("#contact-us-form");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      showToast("تم إرسال رسالتك بنجاح! سيتواصل معك فريق الدعم قريباً.", "success");
      form.reset();
    });
  }

  onDestroy() {}
}
