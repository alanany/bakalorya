import { apiFetch, showToast, t, renderPhoneInputGroup } from "../../app.js";

export default class TeacherApplyView {
  constructor(container) {
    this.container = container;
  }

  async render() {
    this.container.innerHTML = `
      <div style="width:100%; max-width:900px; margin:0 auto; padding:40px 24px 80px;">
        
        <!-- Header / Title -->
        <div style="text-align:center; margin-bottom:36px;">
          <div style="display:inline-flex; align-items:center; gap:8px; background:var(--primary-glow); border:1px solid var(--border-focus); border-radius:30px; padding:6px 18px; font-size:0.8rem; font-weight:800; color:var(--primary); text-transform:uppercase; margin-bottom:14px;">
            <i data-lucide="graduation-cap" style="width:14px; height:14px;"></i> الانضمام لنخبة معلمي منصة باكالوريا
          </div>
          <h1 style="font-size:2.2rem; font-weight:900; color:var(--text-color); margin:0 0 10px 0;">طلب انضمام أستاذ جديد 👨‍🏫</h1>
          <p style="font-size:1rem; color:var(--text-muted); max-width:600px; margin:0 auto; line-height:1.6;">
            قم بتعبئة سيرتك الذاتية ومعلوماتك الأكاديمية للانضمام إلى طاقم التدريس التفاعلي بالمنصة. يتم مراجعة جميع الطلبات بدقة من قبل إدارة المنصة.
          </p>
        </div>

        <!-- Application Form Card -->
        <div class="glass-card" style="border-radius:24px; padding:36px; border:1px solid var(--border-color); box-shadow:0 12px 40px rgba(0,0,0,0.15);">
          <form id="teacher-apply-form">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px;">
              
              <div class="form-group" style="grid-column:1/-1;">
                <label style="font-weight:700; margin-bottom:8px; display:block;">الاسم واللقب الكامل <span style="color:var(--error);">*</span></label>
                <input type="text" id="apply-name" class="form-input" placeholder="مثال: الأستاذ محمد بن علي" required style="padding:12px 16px;">
              </div>

              <div class="form-group">
                <label style="font-weight:700; margin-bottom:8px; display:block;">البريد الإلكتروني الرسمي <span style="color:var(--error);">*</span></label>
                <input type="email" id="apply-email" class="form-input" placeholder="teacher@example.com" required style="padding:12px 16px;">
              </div>

              <div class="form-group">
                <label style="font-weight:700; margin-bottom:8px; display:block;">كلمة المرور للحساب <span style="color:var(--error);">*</span></label>
                <input type="password" id="apply-password" class="form-input" placeholder="أدخل كلمة مرور قوية" required style="padding:12px 16px;">
              </div>

              <div class="form-group">
                <label style="font-weight:700; margin-bottom:8px; display:block;">رقم الهاتف (واتساب) <span style="color:var(--error);">*</span></label>
                ${renderPhoneInputGroup({ selectId: "apply-phone-code", inputId: "apply-phone-num", defaultCode: "+20", placeholder: "01012345678" })}
              </div>

              <div class="form-group">
                <label style="font-weight:700; margin-bottom:8px; display:block;">الولاية / المدينة <span style="color:var(--error);">*</span></label>
                <input type="text" id="apply-location" class="form-input" placeholder="مثال:  العاصمة / " required style="padding:12px 16px;">
              </div>

              <div class="form-group" style="grid-column:1/-1;">
                <label style="font-weight:700; margin-bottom:8px; display:block;">التخصص والمؤهل الأكاديمي <span style="color:var(--error);">*</span></label>
                <input type="text" id="apply-education" class="form-input" placeholder="مثال: أستاذ تعليم ثانوي مادة العلوم الفيزيائية - خبرة 10 سنوات" required style="padding:12px 16px;">
              </div>

              <div class="form-group" style="grid-column:1/-1;">
                <label style="font-weight:700; margin-bottom:8px; display:block;">نبذة عن منهجيتك في التدريس والخبرة الميدانية</label>
                <textarea id="apply-bio" class="form-input" rows="4" placeholder="اكتب ملخصاً قصيراً عن منهجيتك وتجربتك في إعداد طلاب البكالوريا..." style="padding:12px 16px; resize:vertical;"></textarea>
              </div>

            </div>

            <div style="border-top:1px solid var(--border-color); padding-top:24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
              <a href="#landing" class="btn-secondary" style="text-decoration:none; padding:10px 20px; font-size:0.9rem;">
                إلغاء والعودة
              </a>
              <button type="submit" class="btn-primary" id="submit-apply-btn" style="padding:12px 32px; font-size:1rem; font-weight:800;">
                <i data-lucide="send"></i> إرسال طلب الانضمام
              </button>
            </div>
          </form>
        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.bindEvents();
  }

  bindEvents() {
    const form = document.getElementById("teacher-apply-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById("submit-apply-btn");
      if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i data-lucide="loader-2" class="spinner"></i> جارٍ إرسال الطلب...'; }

      const name = document.getElementById("apply-name").value.trim();
      const email = document.getElementById("apply-email").value.trim();
      const password = document.getElementById("apply-password").value;
      const phoneCode = document.getElementById("apply-phone-code")?.value || "+213";
      const phoneNum = document.getElementById("apply-phone-num")?.value.trim() || "";
      const phone = `${phoneCode} ${phoneNum}`.trim();
      const location = document.getElementById("apply-location").value.trim();
      const education = document.getElementById("apply-education").value.trim();
      const bio = document.getElementById("apply-bio").value.trim();

      try {
        const res = await apiFetch("/teacher-applications", {
          method: "POST",
          body: JSON.stringify({ name, email, password, phone, location, education, bio })
        });

        showToast(res.message || "تم إرسال الطلب بنجاح!", "success");

        // Display Success State screen
        this.container.innerHTML = `
          <div style="max-width:600px; margin:60px auto; text-align:center; padding:48px 32px;" class="glass-card">
            <div style="width:72px; height:72px; border-radius:50%; background:var(--success-glow); color:var(--success); display:flex; align-items:center; justify-content:center; margin:0 auto 20px auto;">
              <i data-lucide="check-circle-2" style="width:36px; height:36px;"></i>
            </div>
            <h2 style="font-size:1.8rem; font-weight:900; margin-bottom:12px; color:var(--text-color);">تم تسليم طلبك بنجاح 🎉</h2>
            <p style="color:var(--text-muted); line-height:1.6; margin-bottom:28px;">
              شكراً لرغبتك في الانضمام لطاقم التدريس في منصة باكالوريا. سيقوم قسم الإشراف بمراجعة بياناتك والتواصل معك عبر بريدك الإلكتروني والواتساب في أقرب وقت.
            </p>
            <a href="#landing" class="btn-primary" style="text-decoration:none; display:inline-flex; align-items:center; gap:8px;">
              <i data-lucide="home"></i> العودة للصفحة الرئيسية
            </a>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
      } catch (err) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i data-lucide="send"></i> إرسال طلب الانضمام'; }
      }
    });
  }

  onDestroy() { }
}
