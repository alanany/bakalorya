import { apiFetch, showToast, t, renderPhoneInputGroup } from "../../app.js";

export default class TeacherApplyView {
  constructor(container) {
    this.container = container;
  }

  async render() {
    this.container.innerHTML = `
      <div class="teacher-apply-container">
        
        <!-- Header / Title -->
        <div class="teacher-apply-header">
          <div class="teacher-apply-badge">
            <i data-lucide="graduation-cap" style="width:16px; height:16px; flex-shrink:0;"></i>
            <span>الانضمام لنخبة معلمي منصة انطلق</span>
          </div>
          <h1 class="teacher-apply-title">طلب انضمام أستاذ جديد 👨‍🏫</h1>
          <p class="teacher-apply-desc">
            قم بتعبئة سيرتك الذاتية ومعلوماتك الأكاديمية للانضمام إلى طاقم التدريس التفاعلي بالمنصة. يتم مراجعة جميع الطلبات بدقة من قبل إدارة المنصة.
          </p>
        </div>

        <!-- Application Form Card -->
        <div class="glass-card teacher-apply-card">
          <form id="teacher-apply-form">
            <div class="teacher-apply-form-grid">
              
              <div class="form-group col-full">
                <label for="apply-name">الاسم واللقب الكامل <span style="color:var(--error);">*</span></label>
                <input type="text" id="apply-name" class="form-input" placeholder="مثال: الأستاذ محمد بن علي" required autocomplete="name">
              </div>

              <div class="form-group">
                <label for="apply-email">البريد الإلكتروني الرسمي <span style="color:var(--error);">*</span></label>
                <input type="email" id="apply-email" class="form-input" placeholder="teacher@example.com" required autocomplete="email" dir="ltr" style="text-align:right;">
              </div>

              <div class="form-group">
                <label for="apply-password">كلمة المرور للحساب <span style="color:var(--error);">*</span></label>
                <input type="password" id="apply-password" class="form-input" placeholder="أدخل كلمة مرور قوية" required autocomplete="new-password">
              </div>

              <div class="form-group">
                <label for="apply-phone-num">رقم الهاتف (واتساب) <span style="color:var(--error);">*</span></label>
                ${renderPhoneInputGroup({ selectId: "apply-phone-code", inputId: "apply-phone-num", defaultCode: "+20", placeholder: "01012345678" })}
              </div>

              <div class="form-group">
                <label for="apply-location">الولاية / المدينة <span style="color:var(--error);">*</span></label>
                <input type="text" id="apply-location" class="form-input" placeholder="مثال: الجزائر العاصمة / وهران" required>
              </div>

              <div class="form-group col-full">
                <label for="apply-education">التخصص والمؤهل الأكاديمي <span style="color:var(--error);">*</span></label>
                <input type="text" id="apply-education" class="form-input" placeholder="مثال: أستاذ تعليم ثانوي مادة العلوم الفيزيائية - خبرة 10 سنوات" required>
              </div>

              <div class="form-group col-full">
                <label for="apply-bio">نبذة عن منهجيتك في التدريس والخبرة الميدانية</label>
                <textarea id="apply-bio" class="form-input" rows="4" placeholder="اكتب ملخصاً قصيراً عن منهجيتك وتجربتك في إعداد طلاب انطلق..."></textarea>
              </div>

            </div>

            <div class="teacher-apply-actions">
              <a href="#landing" class="btn-secondary btn-cancel">
                <i data-lucide="arrow-right" style="width:16px; height:16px;"></i> إلغاء والعودة
              </a>
              <button type="submit" class="btn-primary btn-submit" id="submit-apply-btn">
                <i data-lucide="send" style="width:16px; height:16px;"></i> إرسال طلب الانضمام
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

      const name = document.getElementById("apply-name").value.trim();
      const email = document.getElementById("apply-email").value.trim();
      const password = document.getElementById("apply-password").value;
      const phoneCode = document.getElementById("apply-phone-code")?.value || "+20";
      const phoneNum = document.getElementById("apply-phone-num")?.value.trim() || "";
      const phone = phoneNum ? `${phoneCode} ${phoneNum}`.trim() : "";
      const location = document.getElementById("apply-location").value.trim();
      const education = document.getElementById("apply-education").value.trim();
      const bio = document.getElementById("apply-bio").value.trim();

      if (!name || !email || !password) {
        showToast("يرجى إدخال جميع الحقول الإلزامية (الاسم، البريد الإلكتروني، كلمة المرور).", "warning");
        return;
      }

      const submitBtn = document.getElementById("submit-apply-btn");
      if (submitBtn) { 
        submitBtn.disabled = true; 
        submitBtn.innerHTML = '<i data-lucide="loader-2" class="spinner" style="width:16px; height:16px;"></i> جارٍ إرسال الطلب...'; 
        if (window.lucide) window.lucide.createIcons();
      }

      try {
        const res = await apiFetch("/teacher-applications", {
          method: "POST",
          body: JSON.stringify({ name, email, password, phone, location, education, bio })
        });

        showToast(res.message || "تم إرسال الطلب بنجاح!", "success");

        // Display Success State screen
        this.container.innerHTML = `
          <div class="teacher-apply-container">
            <div class="glass-card teacher-apply-success-card">
              <div class="teacher-apply-success-icon">
                <i data-lucide="check-circle-2" style="width:38px; height:38px;"></i>
              </div>
              <h2 style="font-size:clamp(1.4rem, 3.5vw, 1.85rem); font-weight:900; margin-bottom:12px; color:var(--text-color);">تم تسليم طلبك بنجاح 🎉</h2>
              <p style="color:var(--text-muted); line-height:1.6; margin-bottom:28px; font-size:clamp(0.9rem, 2vw, 1rem);">
                شكراً لرغبتك في الانضمام لطاقم التدريس في منصة انطلق. سيقوم قسم الإشراف بمراجعة بياناتك والتواصل معك عبر بريدك الإلكتروني والواتساب في أقرب وقت.
              </p>
              <a href="#landing" class="btn-primary" style="text-decoration:none; display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:46px; padding:12px 28px;">
                <i data-lucide="home" style="width:18px; height:18px;"></i> العودة للصفحة الرئيسية
              </a>
            </div>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
      } catch (err) {
        if (submitBtn) { 
          submitBtn.disabled = false; 
          submitBtn.innerHTML = '<i data-lucide="send" style="width:16px; height:16px;"></i> إرسال طلب الانضمام'; 
          if (window.lucide) window.lucide.createIcons();
        }
      }
    });
  }

  onDestroy() { }
}
