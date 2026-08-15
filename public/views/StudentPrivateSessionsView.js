import { apiFetch, showToast, t, getMinSessionDateTimeISO, validateSessionScheduledDate } from "../app.js";

export default class StudentPrivateSessionsView {
  constructor(container) {
    this.container = container;
    this.subscriptions = [];
  }

  async render() {
    try {
      const subscriptions = await apiFetch("/subscriptions/my").catch(() => []);
      this.subscriptions = subscriptions || [];

      this.renderContent();
    } catch (err) {
      console.error("StudentPrivateSessionsView error:", err);
      this.container.innerHTML = `<div class="error-msg">تعذر تحميل البيانات.</div>`;
    }
  }

  renderContent() {
    this.container.innerHTML = `
      <div class="student-dashboard-layout" style="display:block;">
        <h2 class="dashboard-section-title" style="font-size: 1.8rem; margin-bottom: 8px;">اشتراكاتي والحصص الخاصة</h2>
        <p style="color:var(--text-muted); margin-bottom: 32px;">إدارة اشتراكاتك الشهرية وحصصك الخاصة (1-على-1) مع المعلمين.</p>

        <!-- Subscriptions Widget -->
        <div style="margin-bottom: 40px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:8px;">
            <h3 class="dashboard-section-title" style="margin:0;"><i data-lucide="sparkles" style="color:var(--primary);"></i> اشتراكاتي النشطة</h3>
            <a href="#subscription-plans" class="btn-primary" style="font-size:0.82rem; padding:8px 16px; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
              <i data-lucide="plus-circle" style="width:14px;height:14px;"></i> شراء اشتراك شهري جديد
            </a>
          </div>

          ${this.renderSubscriptionsSection()}
        </div>

        <!-- Booking Modal Container -->
        <div id="student-booking-modal-overlay"></div>
      </div>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  renderSubscriptionsSection() {
    if (this.subscriptions.length === 0) {
      return `
        <div class="glass-card" style="text-align:center; padding:32px; color:var(--text-muted);">
          <i data-lucide="calendar-heart" style="width:40px; height:40px; color:var(--primary); margin-bottom:12px;"></i>
          <h4 style="color:var(--text-main); font-weight:700; margin-bottom:8px;">لا يوجد لديك اشتراك شهري نشط للحصص الخاصة</h4>
          <p style="font-size:0.88rem; max-width:480px; margin:0 auto 16px;">احصل على متابعة 1-على-1 مباشرة مع أستاذك المفضل وحجز مواعيد حصصك حسب تفرغك بحرية.</p>
          <a href="#subscription-plans" class="btn-primary" style="display:inline-flex; gap:8px;">تصفح خطط الحصص الشهرية (4, 8, 12 حصة)</a>
        </div>
      `;
    }

    return `
      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap:20px;">
        ${this.subscriptions.map(sub => {
      const used = sub.usedCredits || 0;
      const remaining = sub.remainingCredits || 0;
      const total = sub.totalSessions || 8;
      const pct = Math.min(100, Math.round((used / total) * 100));

      return `
            <div class="glass-card" style="padding:22px; position:relative; overflow:hidden; border:1px solid var(--border-color);">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">
                <div>
                  <span class="badge" style="background:var(--primary-glow); color:var(--primary); font-weight:800; font-size:0.75rem; border:1px solid var(--border-focus); margin-bottom:6px; display:inline-block;">
                    ${sub.plan?.name || 'اشتراك شهري'}
                  </span>
                  <h4 style="font-size:1.05rem; font-weight:800; margin:0;">الأستاذ: ${sub.teacher?.name || 'في انتظار التعيين'}</h4>
                </div>
                <div style="text-align:end;">
                  <span style="font-size:1.4rem; font-weight:900; color:var(--primary);">${remaining}</span>
                  <span style="font-size:0.75rem; color:var(--text-muted); display:block;">حصص متبقية</span>
                </div>
              </div>

              <!-- Progress Bar -->
              <div style="background:var(--bg-app); border-radius:10px; height:10px; width:100%; overflow:hidden; margin-bottom:12px; border:1px solid var(--border-color);">
                <div style="background:linear-gradient(90deg, var(--primary), var(--accent)); height:100%; width:${pct}%; border-radius:10px; transition:width 0.5s ease;"></div>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:var(--text-muted); margin-bottom:18px;">
                <span>تم استخدام ${used} من أصل ${total} حصص</span>
                <span>ينتهي: ${new Date(sub.endDate).toLocaleDateString("ar")}</span>
              </div>

              ${sub.status === "PENDING_PAYMENT"
          ? `<div style="background:rgba(245,158,11,0.15); color:#f59e0b; padding:10px; border-radius:12px; font-size:0.8rem; font-weight:700; text-align:center;">⏳ 1️⃣ في انتظار تأكيد الدفع ورفع الإيصال</div>`
          : sub.status === "TEACHER_ASSIGNMENT_PENDING"
          ? `<div style="background:rgba(59,130,246,0.15); color:#3b82f6; padding:10px; border-radius:12px; font-size:0.8rem; font-weight:700; text-align:center;">⏳ 2️⃣ تم تأكيد الدفع - قيد تعيين المعلم المناسب</div>`
          : sub.status === "SCHEDULE_PENDING"
          ? `<div style="background:rgba(139,92,246,0.15); color:#8b5cf6; padding:10px; border-radius:12px; font-size:0.8rem; font-weight:700; text-align:center;">🗓️ 3️⃣ تم تعيين المعلم - قيد جدولة الباقة من الإدارة</div>`
          : `<div style="display:flex; gap:8px;">
               <a href="#subscription-sessions?id=${sub.id}" class="btn-secondary" style="flex:1; justify-content:center; gap:8px; text-decoration:none;">
                 <i data-lucide="list" style="width:16px;height:16px;"></i> عرض سجل الحصص
               </a>
             </div>`
        }
            </div>
          `;
    }).join("")}
      </div>
    `;
  }

  bindEvents() {
    // Booking is now handled by Admin
  }
}
