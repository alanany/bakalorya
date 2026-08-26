import { apiFetch, state, showToast, t } from "../app.js";

export default class SubscriptionPlansView {
  constructor(container, routeParam) {
    this.container = container;
    this.routeParam = routeParam;
    this.plans = [];
    this.teachers = [];
    this.courses = [];
    
    // Parse query params or routeParam
    let queryCourseId = null;
    let queryTeacherId = null;
    const hash = window.location.hash || "";
    if (hash.includes("?")) {
      const qs = hash.substring(hash.indexOf("?") + 1);
      const params = new URLSearchParams(qs);
      queryCourseId = params.get("courseId") || params.get("id");
      queryTeacherId = params.get("teacherId") || params.get("teacher");
    } else if (routeParam && !routeParam.includes("=")) {
      queryCourseId = routeParam;
    }

    this.selectedCourseId = queryCourseId || "all";
    this.selectedTeacherId = queryTeacherId || null;
  }

  async render() {
    try {
      const [plans, teachers, courses] = await Promise.all([
        apiFetch("/subscription-plans"),
        apiFetch("/teachers").catch(() => []),
        apiFetch("/courses").catch(() => [])
      ]);

      this.plans = plans || [];
      this.teachers = teachers || [];
      this.courses = courses || [];

      if (this.selectedCourseId !== "all") {
        const foundCourse = this.courses.find(c => c.id === this.selectedCourseId);
        if (foundCourse?.teacher?.id && !this.selectedTeacherId) {
          this.selectedTeacherId = foundCourse.teacher.id;
        }
      }

      this.renderContent();
    } catch (err) {
      console.error("SubscriptionPlansView error:", err);
    }
  }

  renderContent() {
    const filteredPlans = this.selectedCourseId === "all" 
      ? this.plans 
      : this.plans.filter(p => !p.courseId || p.courseId === this.selectedCourseId || p.course?.id === this.selectedCourseId);

    const matchedCourse = this.selectedCourseId !== "all" 
      ? this.courses.find(c => c.id === this.selectedCourseId) 
      : null;
    const matchedTeacher = this.selectedTeacherId 
      ? this.teachers.find(t => t.id === this.selectedTeacherId) || matchedCourse?.teacher
      : matchedCourse?.teacher;

    this.container.innerHTML = `
      <div style="max-width:1100px; margin:0 auto; padding:40px 20px; font-family:'Outfit', 'Cairo', sans-serif;">
        <div style="text-align:center; margin-bottom:36px;">
          <span class="badge" style="background:var(--primary-glow); color:var(--primary); font-size:0.85rem; font-weight:800; padding:6px 16px; border-radius:20px; border:1px solid var(--border-focus); display:inline-block; margin-bottom:12px;">
            ✨ خطط الاشتراكات الشهرية المخصصة للكورسات (1-على-1)
          </span>
          <h1 style="font-size:2.2rem; font-weight:900; color:var(--text-main); margin:0 0 12px 0;">اختر خطة الاشتراك الشهري المناسبة لكورس</h1>
          <p style="color:var(--text-muted); font-size:1rem; max-width:640px; margin:0 auto;">
            خطط اشتراكات شهرية مخصصة لكل مادة وكورس للربط المباشر مع أفضل المعلمين المعتمدين والمتابعة الخاصة.
          </p>
        </div>

        <!-- Matched Course & Teacher Banner -->
        ${matchedCourse ? `
          <div class="glass-card" style="margin-bottom:28px; padding:20px 24px; border-radius:18px; background:linear-gradient(135deg, rgba(16,185,129,0.12), rgba(99,102,241,0.08)); border:1.5px solid rgba(16,185,129,0.3); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;">
            <div style="display:flex; align-items:center; gap:14px;">
              <img src="${matchedTeacher?.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Teacher'}" style="width:52px; height:52px; border-radius:50%; border:2px solid #10b981; object-fit:cover;">
              <div>
                <div style="font-size:0.78rem; font-weight:800; color:#10b981; text-transform:uppercase;">🎯 باقات الحصص الخاصة لكورس</div>
                <div style="font-weight:900; font-size:1.15rem; color:var(--text-main); margin-top:2px;">${matchedCourse.title}</div>
                <div style="font-size:0.85rem; color:var(--text-muted); margin-top:2px;">الأستاذ المعتمـد: <strong style="color:var(--text-main);">${matchedTeacher?.name || 'أستاذ المادة'}</strong></div>
              </div>
            </div>
            <a href="#course-preview/${matchedCourse.id}" class="btn-secondary" style="font-size:0.82rem; padding:8px 16px; border-radius:12px; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
              <i data-lucide="arrow-right" style="width:14px;height:14px;"></i> العودة لصفحة الكورس
            </a>
          </div>
        ` : ''}

        <!-- Course Filter -->
        ${this.courses.length > 0 ? `
          <div style="margin-bottom:32px; display:flex; justify-content:center; align-items:center; gap:12px; flex-wrap:wrap;">
            <label style="font-weight:700; font-size:0.9rem; color:var(--text-main);">تصفية الخطط حسب الكورس المخصص:</label>
            <select id="plans-course-filter" class="form-input" style="max-width:320px; padding:10px 14px; border-radius:12px; font-size:0.88rem;">
              <option value="all" ${this.selectedCourseId === "all" ? 'selected' : ''}>🌐 جميع الكورسات والخطط العامة</option>
              ${this.courses.map(c => `<option value="${c.id}" ${this.selectedCourseId === c.id ? 'selected' : ''}>📚 ${c.title}</option>`).join('')}
            </select>
          </div>
        ` : ''}

        <!-- Pricing Cards Grid -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:28px; margin-bottom:60px;">
          ${filteredPlans.length === 0 ? `
            <div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted); grid-column:1/-1;">
              <i data-lucide="sparkles" style="width:40px;height:40px;margin-bottom:12px;opacity:0.3;"></i>
              <p>لا توجد خطط اشتراك شهرية مخصصة لهذا الكورس حالياً.</p>
            </div>
          ` : filteredPlans.map((plan, idx) => {
            const isPopular = idx === 1;
            return `
              <div class="glass-card" style="padding:32px; border-radius:24px; position:relative; display:flex; flex-direction:column; justify-content:space-between; border: ${isPopular ? '2px solid var(--primary)' : '1px solid var(--border-color)'}; box-shadow: ${isPopular ? '0 20px 40px var(--primary-glow)' : 'none'};">
                ${isPopular ? `<span style="position:absolute; top:-14px; left:50%; transform:translateX(-50%); background:var(--primary); color:#fff; font-size:0.75rem; font-weight:800; padding:4px 14px; border-radius:20px;">🔥 الأكثر إقبالاً</span>` : ''}

                <div>
                  <div style="margin-bottom:8px;">
                    <span style="font-size:0.75rem; font-weight:800; padding:4px 12px; border-radius:12px; background:rgba(99,102,241,0.12); color:var(--primary); display:inline-block;">
                      ${plan.course?.title ? `📚 كورس: ${plan.course.title}` : '🌐 ينطبق على جميع الكورسات'}
                    </span>
                  </div>
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
  }

  bindEvents() {
    const filter = this.container.querySelector("#plans-course-filter");
    if (filter) {
      filter.addEventListener("change", (e) => {
        this.selectedCourseId = e.target.value;
        const matchedCourse = this.courses.find(c => c.id === this.selectedCourseId);
        if (matchedCourse?.teacher?.id) {
          this.selectedTeacherId = matchedCourse.teacher.id;
        } else if (this.selectedCourseId === "all") {
          this.selectedTeacherId = null;
        }
        this.renderContent();
      });
    }

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

    const matchedCourse = this.selectedCourseId !== "all" 
      ? this.courses.find(c => c.id === this.selectedCourseId) 
      : null;
    const targetTeacherId = this.selectedTeacherId || matchedCourse?.teacher?.id;
    const matchedTeacher = targetTeacherId ? this.teachers.find(t => t.id === targetTeacherId) || matchedCourse?.teacher : null;

    overlay.innerHTML = `
      <div class="modal-overlay" style="display:flex; backdrop-filter:blur(8px); background:rgba(0,0,0,0.6); z-index:10000;">
        <div class="modal-content" style="max-width:550px; width:92%; border-radius:24px; padding:28px; background:var(--bg-card); border:1px solid var(--border-color); box-shadow:0 20px 40px rgba(0,0,0,0.3);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:14px;">
            <div>
              <h3 style="font-weight:800; font-size:1.2rem; margin:0; color:var(--text-main);">إتمام الاشتراك في ${planName}</h3>
              ${matchedCourse ? `<span style="font-size:0.8rem; color:var(--primary); font-weight:700;">📚 كورس: ${matchedCourse.title}</span>` : ''}
            </div>
            <button id="close-checkout-modal-btn" class="btn-secondary" style="border:none; padding:6px; font-size:1.2rem; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer;">✕</button>
          </div>

          <form id="subscribe-checkout-form">
            <input type="hidden" name="planId" value="${planId}">
            <input type="hidden" name="courseId" value="${this.selectedCourseId !== 'all' ? this.selectedCourseId : ''}">

            <div style="margin-bottom:16px;">
              <label style="display:block; font-weight:700; font-size:0.85rem; margin-bottom:6px;">اختر الأستاذ المطلوب للحصص الخاصة:</label>
              <select name="teacherChoice" id="teacher-choice-select" class="form-input" style="width:100%; border-radius:12px; padding:10px;">
                ${targetTeacherId ? `
                  ${this.teachers.map(t => `<option value="${t.id}" ${t.id === targetTeacherId ? 'selected' : ''}>${t.id === targetTeacherId ? '⭐ أستاذ هذا الكورس: ' : 'أ. '}${t.name} (${t.education || 'معلم معتمد'})</option>`).join("")}
                  <option value="recommend">🌟 اطلب من الإدارة ترشيح أستاذ آخر</option>
                ` : `
                  <option value="recommend">🌟 اطلب من الإدارة ترشيح أفضل أستاذ لي</option>
                  ${this.teachers.map(t => `<option value="${t.id}">أ. ${t.name} (${t.education || 'معلم معتمد'})</option>`).join("")}
                `}
              </select>
              ${matchedTeacher ? `
                <div style="font-size:0.82rem; color:#10b981; margin-top:8px; font-weight:700; display:flex; align-items:center; gap:6px; background:rgba(16,185,129,0.1); padding:8px 12px; border-radius:10px;">
                  <i data-lucide="check-circle" style="width:16px;height:16px;"></i> سيتم توجيه طلب الحصص للأستاذ: أ. ${matchedTeacher.name}
                </div>
              ` : ''}
            </div>

            <div style="margin-bottom:24px; background:var(--bg-app); padding:16px; border-radius:14px; border:1px solid var(--border-color);">
              <h4 style="font-size:0.88rem; font-weight:800; margin:0 0 6px 0;">💳 ملخص عملية الاشتراك:</h4>
              <p style="font-size:0.8rem; color:var(--text-muted); margin:0; line-height:1.5;">سيتم إرسال طلب الاشتراك للإدارة وللمعلم المعتمـد لتأكيد المواعيد وتفعيل رصيد الحصص في حسابك.</p>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:12px;">
              <button type="button" id="cancel-checkout-btn" class="btn-secondary" style="padding:10px 18px; border-radius:12px;">إلغاء</button>
              <button type="submit" class="btn-primary" style="padding:10px 22px; border-radius:12px; font-weight:800;">تأكيد الدفع والدخول للمواد 🚀</button>
            </div>
          </form>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    document.getElementById("close-checkout-modal-btn")?.addEventListener("click", () => overlay.innerHTML = "");
    document.getElementById("cancel-checkout-btn")?.addEventListener("click", () => overlay.innerHTML = "");

    const form = document.getElementById("subscribe-checkout-form");
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const choice = formData.get("teacherChoice");
      const courseId = formData.get("courseId");

      const payload = {
        planId: formData.get("planId"),
        requestTeacherRecommendation: choice === "recommend",
        teacherId: choice !== "recommend" ? choice : undefined,
        subjectId: courseId || undefined
      };

      try {
        const res = await apiFetch("/subscriptions", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        showToast("تهانينا! تم إرسال طلب الاشتراك بنجاح وربطه بالمعلم. 🎉", "success");
        overlay.innerHTML = "";
        window.location.hash = "#dashboard";
      } catch (err) {
        showToast(err.message || "فشل الاشتراك", "error");
      }
    });
  }
}
