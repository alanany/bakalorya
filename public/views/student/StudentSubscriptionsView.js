import { apiFetch, showToast, t } from "../../app.js";

export default class StudentSubscriptionsView {
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
      console.error("StudentSubscriptionsView error:", err);
      this.container.innerHTML = `<div class="error-msg">تعذر تحميل بيانات الاشتراكات.</div>`;
    }
  }

  renderContent() {
    const totalSubs = this.subscriptions.length;
    const activeSubs = this.subscriptions.filter(s => s.status === "ACTIVE" || !s.status).length;
    const totalRemaining = this.subscriptions.reduce((acc, s) => acc + (s.remainingCredits || 0), 0);
    const totalUsed = this.subscriptions.reduce((acc, s) => acc + (s.usedCredits || 0), 0);

    this.container.innerHTML = `
      <div class="student-dashboard-layout" style="display:block; max-width:1280px; margin:0 auto; padding:24px 16px;">
        
        <!-- Header Banner -->
        <div class="glass-card" style="padding:24px; border-radius:24px; background:linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.06)); border:1px solid rgba(99,102,241,0.2); margin-bottom: 24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <div>
            <h2 style="font-size:1.6rem; font-weight:900; margin:0 0 6px 0; color:var(--text-main); display:flex; align-items:center; gap:10px;">
              <i data-lucide="sparkles" style="width:28px; height:28px; color:#6366f1;"></i>
              اشتراكاتي وباقاتي الشهرية 💎
            </h2>
            <p style="color:var(--text-muted); font-size:0.88rem; margin:0;">
              متابعة وإدارة باقات الحصص الخاصة النشطة، رصيد الحصص المتبقية، وتجديد الاشتراكات.
            </p>
          </div>
          
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a href="#student-private-sessions" class="btn-secondary" style="font-size:0.85rem; padding:9px 16px; text-decoration:none; display:inline-flex; align-items:center; gap:6px; font-weight:700;">
              <i data-lucide="calendar"></i> جدول الحصص الخاصة ➔
            </a>
            <a href="#subscription-plans" class="btn-primary" style="font-size:0.85rem; padding:9px 18px; text-decoration:none; display:inline-flex; align-items:center; gap:6px; font-weight:800;">
              <i data-lucide="plus-circle" style="width:16px; height:16px;"></i> شراء باقة جديدة
            </a>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div style="display:flex; gap:10px; margin-bottom: 24px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
          <a href="#student-subscriptions" style="padding:8px 20px; border-radius:20px; font-size:0.88rem; font-weight:800; background:#6366f1; color:#fff; text-decoration:none; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 12px rgba(99,102,241,0.3);">
            <i data-lucide="sparkles" style="width:16px;height:16px;"></i> باقات اشتراكاتي
          </a>
          <a href="#student-private-sessions" style="padding:8px 20px; border-radius:20px; font-size:0.88rem; font-weight:700; background:var(--bg-card); color:var(--text-muted); text-decoration:none; border:1px solid var(--border-color); display:inline-flex; align-items:center; gap:6px;">
            <i data-lucide="calendar" style="width:16px;height:16px;"></i> جدول الحصص الخاصة (1-على-1)
          </a>
        </div>

        <!-- Stat Summary Bar -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:14px; width:100%; box-sizing:border-box; margin-bottom: 30px;">
          <div class="glass-card" style="padding:16px 20px; border-radius:18px; border-inline-start:4px solid #6366f1; display:flex; align-items:center; gap:14px;">
            <div style="width:44px; height:44px; border-radius:14px; background:rgba(99,102,241,0.12); color:#6366f1; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="package" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <div style="font-size:1.4rem; font-weight:900; color:var(--text-main);">${totalSubs}</div>
              <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">إجمالي الباقات</div>
            </div>
          </div>

          <div class="glass-card" style="padding:16px 20px; border-radius:18px; border-inline-start:4px solid #10b981; display:flex; align-items:center; gap:14px;">
            <div style="width:44px; height:44px; border-radius:14px; background:rgba(16,185,129,0.12); color:#10b981; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="check-circle-2" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <div style="font-size:1.4rem; font-weight:900; color:#10b981;">${totalRemaining}</div>
              <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">حصص متبقية للجدولة</div>
            </div>
          </div>

          <div class="glass-card" style="padding:16px 20px; border-radius:18px; border-inline-start:4px solid #a855f7; display:flex; align-items:center; gap:14px;">
            <div style="width:44px; height:44px; border-radius:14px; background:rgba(168,85,247,0.12); color:#a855f7; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="history" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <div style="font-size:1.4rem; font-weight:900; color:var(--text-main);">${totalUsed}</div>
              <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">حصص تم إتمامها</div>
            </div>
          </div>
        </div>

        <!-- Subscriptions Grid -->
        <div>
          ${this.renderSubscriptionsList()}
        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  renderSubscriptionsList() {
    if (this.subscriptions.length === 0) {
      return `
        <div class="glass-card" style="text-align:center; padding:50px 24px; color:var(--text-muted); border-radius:20px; border:1px dashed var(--border-color);">
          <div style="width:64px; height:64px; border-radius:20px; background:rgba(99,102,241,0.08); display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto;">
            <i data-lucide="sparkles" style="width:32px; height:32px; color:var(--primary); opacity:0.6;"></i>
          </div>
          <h3 style="color:var(--text-main); font-weight:800; font-size:1.15rem; margin-bottom:8px;">لا يوجد لديك اشتراك نشط حالياً</h3>
          <p style="font-size:0.88rem; max-width:480px; margin:0 auto 20px; line-height:1.6; color:var(--text-muted);">
            احصل على متابعة وتدريس 1-على-1 مباشر مع معلمك المفضل، مع تقارير دورية وإمكانية اختيار مواعيدك بحرية.
          </p>
          <a href="#subscription-plans" class="btn-primary" style="display:inline-flex; gap:8px; padding:10px 24px; font-weight:800;">
            <i data-lucide="plus-circle"></i> تصفح باقات الحصص الشهرية (4, 8, 12 حصة)
          </a>
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
            <div class="glass-card" style="padding:22px; position:relative; overflow:hidden; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card); display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">
                  <div>
                    <span class="badge" style="background:rgba(99,102,241,0.12); color:var(--primary); font-weight:800; font-size:0.75rem; border:1px solid rgba(99,102,241,0.2); margin-bottom:6px; display:inline-block; border-radius:10px; padding:2px 8px;">
                      ${sub.plan?.name || 'باقة اشتراك شهري'}
                    </span>
                    <h4 style="font-size:1.1rem; font-weight:900; margin:0; color:var(--text-main);">
                      الأستاذ: ${sub.teacher?.name || 'في انتظار التعيين'}
                    </h4>
                  </div>
                  <div style="text-align:end;">
                    <span style="font-size:1.5rem; font-weight:900; color:var(--primary);">${remaining}</span>
                    <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:700;">حصص متبقية</span>
                  </div>
                </div>

                <!-- Progress Bar -->
                <div style="background:var(--bg-app); border-radius:10px; height:10px; width:100%; overflow:hidden; margin-bottom:12px; border:1px solid var(--border-color);">
                  <div style="background:linear-gradient(90deg, #6366f1, #10b981); height:100%; width:${pct}%; border-radius:10px; transition:width 0.5s ease;"></div>
                </div>
                
                <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:var(--text-muted); margin-bottom:18px; font-weight:700;">
                  <span>تم استخدام ${used} من أصل ${total} حصص (${pct}%)</span>
                  <span>ينتهي: ${new Date(sub.endDate).toLocaleDateString("ar-EG")}</span>
                </div>
              </div>

              ${sub.status === "PENDING_PAYMENT"
                ? `<div style="background:rgba(245,158,11,0.15); color:#f59e0b; padding:10px; border-radius:12px; font-size:0.8rem; font-weight:700; text-align:center;">⏳ 1️⃣ في انتظار تأكيد الدفع ورفع الإيصال</div>`
                : sub.status === "TEACHER_ASSIGNMENT_PENDING"
                ? `<div style="background:rgba(59,130,246,0.15); color:#3b82f6; padding:10px; border-radius:12px; font-size:0.8rem; font-weight:700; text-align:center;">⏳ 2️⃣ تم تأكيد الدفع - قيد تعيين المعلم المناسب</div>`
                : sub.status === "SCHEDULE_PENDING"
                ? `<div style="background:rgba(139,92,246,0.15); color:#8b5cf6; padding:10px; border-radius:12px; font-size:0.8rem; font-weight:700; text-align:center;">🗓️ 3️⃣ تم تعيين المعلم - قيد جدولة الباقة من الإدارة</div>`
                : `<div style="display:flex; gap:8px;">
                     <a href="#subscription-sessions?id=${sub.id}" class="btn-primary" style="flex:1; justify-content:center; gap:8px; text-decoration:none; font-weight:700; font-size:0.85rem; padding:10px; border-radius:12px;">
                       <i data-lucide="calendar"></i> عرض جدول وسجل الحصص
                     </a>
                   </div>`
              }
            </div>
          `;
        }).join("")}
      </div>
    `;
  }
}
