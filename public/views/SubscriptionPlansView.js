import { apiFetch, state, showToast, t } from "../app.js";

export default class SubscriptionPlansView {
  constructor(container) {
    this.container = container;
    this.plans = [];
    this.teachers = [];
  }

  async render() {
    try {
      const [plans, teachers] = await Promise.all([
        apiFetch("/subscription-plans"),
        apiFetch("/teachers")
      ]);

      this.plans = plans || [];
      this.teachers = teachers || [];

      this.container.innerHTML = `
        <div style="max-width:1100px; margin:0 auto; padding:40px 20px; font-family:'Outfit', 'Cairo', sans-serif;">
          <div style="text-align:center; margin-bottom:48px;">
            <span class="badge" style="background:var(--primary-glow); color:var(--primary); font-size:0.85rem; font-weight:800; padding:6px 16px; border-radius:20px; border:1px solid var(--border-focus); display:inline-block; margin-bottom:12px;">
              ✨ خطط الاشتراكات الشهرية للحصص الخاصة 1-على-1
            </span>
            <h1 style="font-size:2.2rem; font-weight:900; color:var(--text-main); margin:0 0 12px 0;">اختر خطة الحصص الشهرية المناسبة لك</h1>
            <p style="color:var(--text-muted); font-size:1rem; max-width:640px; margin:0 auto;">
              تواصل مباشرة وبشكل فردي مع أفضل الأساتذة المعتمدين، واحجز مواعيد حصصك وفق تفرغك بحرية مع متابعة وشرح تفاعلي دقيق.
            </p>
          </div>

          <!-- Pricing Cards Grid -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:28px; margin-bottom:60px;">
            ${this.plans.map((plan, idx) => {
              const isPopular = idx === 1;
              return `
                <div class="glass-card" style="padding:32px; border-radius:24px; position:relative; display:flex; flex-direction:column; justify-space-between; border: ${isPopular ? '2px solid var(--primary)' : '1px solid var(--border-color)'}; box-shadow: ${isPopular ? '0 20px 40px var(--primary-glow)' : 'none'};">
                  ${isPopular ? `<span style="position:absolute; top:-14px; left:50%; transform:translateX(-50%); background:var(--primary); color:#fff; font-size:0.75rem; font-weight:800; padding:4px 14px; border-radius:20px;">🔥 الأكثر إقبالاً</span>` : ''}

                  <div>
                    <h3 style="font-size:1.3rem; font-weight:800; margin:0 0 8px 0; color:var(--text-main);">${plan.name}</h3>
                    <p style="font-size:0.85rem; color:var(--text-muted); min-height:42px; margin-bottom:20px;">${plan.description || ''}</p>

                    <div style="display:flex; align-items:baseline; gap:6px; margin-bottom:24px;">
                      <span style="font-size:2.5rem; font-weight:900; color:var(--primary);">${plan.price}</span>
                      <span style="font-size:0.9rem; font-weight:700; color:var(--text-muted);">${plan.currency} / شهر</span>
                    </div>

                    <ul style="list-style:none; padding:0; margin:0 0 32px 0; display:flex; flex-direction:column; gap:12px; font-size:0.88rem; color:var(--text-main);">
                      <li style="display:flex; align-items:center; gap:8px;"><i data-lucide="check" style="width:16px;height:16px;color:var(--success);"></i> <strong>${plan.sessionsCount} حصة مباشرة</strong> شهرياً</li>
                      <li style="display:flex; align-items:center; gap:8px;"><i data-lucide="check" style="width:16px;height:16px;color:var(--success);"></i> مدة الحصة: <strong>${plan.sessionDurationMins} دقيقة</strong></li>
                      <li style="display:flex; align-items:center; gap:8px;"><i data-lucide="check" style="width:16px;height:16px;color:var(--success);"></i> اختيار أستاذك المفضل أو ترشيح الإدارة</li>
                      <li style="display:flex; align-items:center; gap:8px;"><i data-lucide="check" style="width:16px;height:16px;color:var(--success);"></i> تقارير تقييم وملاحظات بعد كل حصة</li>
                      <li style="display:flex; align-items:center; gap:8px;"><i data-lucide="check" style="width:16px;height:16px;color:var(--success);"></i> حماية الرصيد وإمكانية الإلغاء والمرونة</li>
                    </ul>
                  </div>

                  <button class="btn-primary select-plan-btn" data-planid="${plan.id}" data-planname="${plan.name}" style="width:100%; justify-content:center; padding:12px; font-size:0.95rem; font-weight:800;">
                    اشترك الآن 🚀
                  </button>
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <div id="subscription-checkout-modal-overlay"></div>
      `;

      if (window.lucide) window.lucide.createIcons();
      this.bindEvents();
    } catch (err) {
      console.error("SubscriptionPlansView error:", err);
    }
  }

  bindEvents() {
    this.container.querySelectorAll(".select-plan-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const planId = e.currentTarget.getAttribute("data-planid");
        const planName = e.currentTarget.getAttribute("data-planname");
        this.openCheckoutModal(planId, planName);
      });
    });
  }

  openCheckoutModal(planId, planName) {
    const overlay = document.getElementById("subscription-checkout-modal-overlay");
    if (!overlay) return;

    if (!state.user) {
      showToast("يرجى تسجيل الدخول أولاً للاشتراك", "error");
      window.location.hash = "#login";
      return;
    }

    overlay.innerHTML = `
      <div class="modal-overlay" style="display:flex; backdrop-filter:blur(8px); background:rgba(0,0,0,0.6);">
        <div class="modal-content" style="max-width:550px; width:92%; border-radius:24px; padding:28px; background:var(--bg-card); border:1px solid var(--border-color);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3 style="font-weight:800; font-size:1.2rem; margin:0;">إتمام الاشتراك في ${planName}</h3>
            <button id="close-checkout-modal-btn" class="btn-secondary" style="border:none; padding:6px;">✕</button>
          </div>

          <form id="subscribe-checkout-form">
            <input type="hidden" name="planId" value="${planId}">

            <div style="margin-bottom:16px;">
              <label style="display:block; font-weight:700; font-size:0.85rem; margin-bottom:6px;">اختر الأستاذ المطلوب أو اطلب الترشيح:</label>
              <select name="teacherChoice" id="teacher-choice-select" class="form-input" style="width:100%; border-radius:12px; padding:10px;">
                <option value="recommend">🌟 اطلب من الإدارة ترشيح أفضل أستاذ لي</option>
                ${this.teachers.map(t => `<option value="${t.id}">أ. ${t.name} (${t.education || 'معلم معتمد'})</option>`).join("")}
              </select>
            </div>

            <div style="margin-bottom:24px; background:var(--bg-app); padding:16px; border-radius:14px; border:1px solid var(--border-color);">
              <h4 style="font-size:0.88rem; font-weight:800; margin:0 0 6px 0;">💳 ملخص عملية الاشتراك:</h4>
              <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">سيتم تفعيل رصيد الحصص المتاحة فوراً في حسابك، ويمكنك حجز المواعيد مباشرة.</p>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:12px;">
              <button type="button" id="cancel-checkout-btn" class="btn-secondary">إلغاء</button>
              <button type="submit" class="btn-primary">تأكيد الدفع والدخول للمواد 🚀</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById("close-checkout-modal-btn")?.addEventListener("click", () => overlay.innerHTML = "");
    document.getElementById("cancel-checkout-btn")?.addEventListener("click", () => overlay.innerHTML = "");

    const form = document.getElementById("subscribe-checkout-form");
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const choice = formData.get("teacherChoice");

      const payload = {
        planId: formData.get("planId"),
        requestTeacherRecommendation: choice === "recommend",
        teacherId: choice !== "recommend" ? choice : undefined
      };

      try {
        const res = await apiFetch("/subscriptions", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        showToast("تهانينا! تم اشتراكك بنجاح وتفعيل رصيد الحصص الخاص بك. 🎉", "success");
        overlay.innerHTML = "";
        window.location.hash = "#dashboard";
      } catch (err) {
        showToast(err.message || "فشل الاشتراك", "error");
      }
    });
  }
}
