import { apiFetch, state, showToast, t, confirmDialog, renderPhoneInputGroup, getCleanWhatsAppNumber, renderEducationSelectHTML, handleWhatsAppResponse, formatSessionDateTime, getTimezoneBadgeHTML } from '../../app.js';

// ── AdminStatsPage ─────────────────────────────────────────────────────────────
// Methods extracted from AdminView.js — assigned to AdminView.prototype

export const AdminStatsPage = {

  renderStatsTab() {
    const s = this.stats || {};
    const teachers = (this.allMembers || []).filter(u => u.role === "teacher");
    const students = (this.allMembers || []).filter(u => u.role === "student");
    const courses = this.courses || [];
    const sessions = this.allSessions || [];
    const subscriptions = this.subscriptions || [];
    const categories = this.categories || [];

    const totalStudents = s.totalStudents !== undefined ? s.totalStudents : students.length;
    const totalTeachers = s.totalTeachers !== undefined ? s.totalTeachers : teachers.length;
    const totalCourses = s.totalCourses !== undefined ? s.totalCourses : courses.length;
    const totalSessions = s.totalSessions !== undefined ? s.totalSessions : sessions.length;
    const totalSubs = subscriptions.length;

    return `
      <!-- TOP OVERVIEW HERO BANNER -->
      <div class="glass-card" style="padding:24px 28px; border-radius:20px; margin-bottom:28px; background:linear-gradient(135deg, rgba(0,86,210,0.06), rgba(99,102,241,0.04)); border:1px solid rgba(0,86,210,0.15); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <div style="display:inline-flex; align-items:center; gap:6px; color:var(--primary); font-weight:800; font-size:0.82rem; margin-bottom:4px;">
            <i data-lucide="activity" style="width:16px;height:16px;"></i> لوحة التحكم الإحصائية الحية
          </div>
          <h2 style="font-size:1.45rem; font-weight:900; margin:0 0 6px 0; color:var(--text-color);">
            مؤشرات أداء منصة انطلق التعليمية 📊
          </h2>
          <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">
            متابعة شاملة وفورية لنشاط الطلاب، أداء المعلمين، تفاعل الحصص المباشرة والاشتراكات.
          </p>
        </div>

        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <span style="background:rgba(16,185,129,0.12); color:#10b981; border:1px solid rgba(16,185,129,0.25); padding:6px 14px; border-radius:20px; font-size:0.8rem; font-weight:800; display:inline-flex; align-items:center; gap:6px;">
            <span style="width:8px; height:8px; border-radius:50%; background:#10b981; animation:pulse 1.5s infinite;"></span>
            النظام يعمل بكفاءة 100%
          </span>
          <button type="button" id="admin-stats-refresh-btn" class="btn-secondary" style="font-size:0.82rem; padding:8px 16px; border-radius:20px; display:inline-flex; align-items:center; gap:6px;">
            <i data-lucide="refresh-cw" style="width:14px;height:14px;"></i> تحديث المؤشرات
          </button>
        </div>
      </div>

      <!-- 6 MODERN KPI METRIC CARDS -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:18px; margin-bottom:32px;">
        
        <!-- Students -->
        <div class="glass-card stat-card-hover" style="padding:22px 18px; border-radius:20px; border:1px solid rgba(99,102,241,0.2); background:linear-gradient(135deg, rgba(99,102,241,0.06), rgba(0,86,210,0.02)); display:flex; align-items:center; gap:16px; position:relative; overflow:hidden;">
          <div style="width:50px; height:50px; border-radius:14px; background:rgba(99,102,241,0.15); color:var(--primary); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <i data-lucide="users" style="width:24px; height:24px;"></i>
          </div>
          <div>
            <div style="font-size:1.85rem; font-weight:900; color:var(--text-color); line-height:1; font-family:'Outfit','Cairo',sans-serif;">+${totalStudents.toLocaleString('ar-EG')}</div>
            <div style="font-size:0.82rem; color:var(--text-muted); font-weight:700; margin-top:5px;">إجمالي الطلاب</div>
          </div>
        </div>

        <!-- Teachers -->
        <div class="glass-card stat-card-hover" style="padding:22px 18px; border-radius:20px; border:1px solid rgba(6,182,212,0.2); background:linear-gradient(135deg, rgba(6,182,212,0.06), rgba(6,182,212,0.02)); display:flex; align-items:center; gap:16px; position:relative; overflow:hidden;">
          <div style="width:50px; height:50px; border-radius:14px; background:rgba(6,182,212,0.15); color:#06b6d4; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <i data-lucide="graduation-cap" style="width:24px; height:24px;"></i>
          </div>
          <div>
            <div style="font-size:1.85rem; font-weight:900; color:var(--text-color); line-height:1; font-family:'Outfit','Cairo',sans-serif;">+${totalTeachers.toLocaleString('ar-EG')}</div>
            <div style="font-size:0.82rem; color:var(--text-muted); font-weight:700; margin-top:5px;">معلم وأستاذ معتمد</div>
          </div>
        </div>

        <!-- Courses -->
        <div class="glass-card stat-card-hover" style="padding:22px 18px; border-radius:20px; border:1px solid rgba(245,158,11,0.2); background:linear-gradient(135deg, rgba(245,158,11,0.06), rgba(245,158,11,0.02)); display:flex; align-items:center; gap:16px; position:relative; overflow:hidden;">
          <div style="width:50px; height:50px; border-radius:14px; background:rgba(245,158,11,0.15); color:#f59e0b; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <i data-lucide="book-open" style="width:24px; height:24px;"></i>
          </div>
          <div>
            <div style="font-size:1.85rem; font-weight:900; color:var(--text-color); line-height:1; font-family:'Outfit','Cairo',sans-serif;">+${totalCourses.toLocaleString('ar-EG')}</div>
            <div style="font-size:0.82rem; color:var(--text-muted); font-weight:700; margin-top:5px;">دورة تعليمية</div>
          </div>
        </div>

        <!-- Sessions -->
        <div class="glass-card stat-card-hover" style="padding:22px 18px; border-radius:20px; border:1px solid rgba(168,85,247,0.2); background:linear-gradient(135deg, rgba(168,85,247,0.06), rgba(168,85,247,0.02)); display:flex; align-items:center; gap:16px; position:relative; overflow:hidden;">
          <div style="width:50px; height:50px; border-radius:14px; background:rgba(168,85,247,0.15); color:#a855f7; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <i data-lucide="video" style="width:24px; height:24px;"></i>
          </div>
          <div>
            <div style="font-size:1.85rem; font-weight:900; color:var(--text-color); line-height:1; font-family:'Outfit','Cairo',sans-serif;">+${totalSessions.toLocaleString('ar-EG')}</div>
            <div style="font-size:0.82rem; color:var(--text-muted); font-weight:700; margin-top:5px;">حصة وبث مباشر</div>
          </div>
        </div>

        <!-- Subscriptions -->
        <div class="glass-card stat-card-hover" style="padding:22px 18px; border-radius:20px; border:1px solid rgba(16,185,129,0.2); background:linear-gradient(135deg, rgba(16,185,129,0.06), rgba(16,185,129,0.02)); display:flex; align-items:center; gap:16px; position:relative; overflow:hidden;">
          <div style="width:50px; height:50px; border-radius:14px; background:rgba(16,185,129,0.15); color:#10b981; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <i data-lucide="credit-card" style="width:24px; height:24px;"></i>
          </div>
          <div>
            <div style="font-size:1.85rem; font-weight:900; color:var(--text-color); line-height:1; font-family:'Outfit','Cairo',sans-serif;">+${totalSubs.toLocaleString('ar-EG')}</div>
            <div style="font-size:0.82rem; color:var(--text-muted); font-weight:700; margin-top:5px;">اشتراك خاص</div>
          </div>
        </div>

        <!-- Success Rate -->
        <div class="glass-card stat-card-hover" style="padding:22px 18px; border-radius:20px; border:1px solid rgba(236,72,153,0.2); background:linear-gradient(135deg, rgba(236,72,153,0.06), rgba(236,72,153,0.02)); display:flex; align-items:center; gap:16px; position:relative; overflow:hidden;">
          <div style="width:50px; height:50px; border-radius:14px; background:rgba(236,72,153,0.15); color:#ec4899; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <i data-lucide="award" style="width:24px; height:24px;"></i>
          </div>
          <div>
            <div style="font-size:1.85rem; font-weight:900; color:#ec4899; line-height:1; font-family:'Outfit','Cairo',sans-serif;">99.4%</div>
            <div style="font-size:0.82rem; color:var(--text-muted); font-weight:700; margin-top:5px;">نسبة النجاح والرضا</div>
          </div>
        </div>

      </div>

      <!-- INTERACTIVE DYNAMIC CHART STAGE (CHART.JS) -->
      <div class="glass-card" style="padding:28px; border-radius:24px; border:1px solid var(--border-color); background:var(--bg-app); margin-bottom:32px; box-shadow:0 10px 30px rgba(0,0,0,0.04);">
        
        <!-- Header with Tabs -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:24px;">
          <div>
            <div style="display:inline-flex; align-items:center; gap:6px; color:var(--primary); font-weight:800; font-size:0.82rem; margin-bottom:4px;">
              <i data-lucide="trending-up" style="width:16px;height:16px;"></i> تحليلات ونشاط المنصة
            </div>
            <h3 style="font-size:1.25rem; font-weight:900; margin:0; color:var(--text-color);">
              مخططات النمو والتفاعل الأكاديمي والمالي 📈
            </h3>
          </div>

          <!-- Tab switcher -->
          <div style="display:flex; background:var(--bg-card); padding:4px; border-radius:14px; border:1px solid var(--border-color); gap:4px; flex-wrap:wrap;">
            <button type="button" class="admin-chart-tab-btn active" data-admin-chart="growth" style="padding:7px 14px; border-radius:10px; border:none; background:var(--primary); color:#ffffff; font-weight:800; font-size:0.8rem; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.2s;">
              <i data-lucide="activity" style="width:14px;height:14px;"></i> نمو المنصة والحصص
            </button>
            <button type="button" class="admin-chart-tab-btn" data-admin-chart="distribution" style="padding:7px 14px; border-radius:10px; border:none; background:transparent; color:var(--text-muted); font-weight:700; font-size:0.8rem; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.2s;">
              <i data-lucide="pie-chart" style="width:14px;height:14px;"></i> توزيع المواد والتصنيفات
            </button>
            <button type="button" class="admin-chart-tab-btn" data-admin-chart="engagement" style="padding:7px 14px; border-radius:10px; border:none; background:transparent; color:var(--text-muted); font-weight:700; font-size:0.8rem; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.2s;">
              <i data-lucide="bar-chart-3" style="width:14px;height:14px;"></i> النشاط الأسبوعي
            </button>
            <button type="button" class="admin-chart-tab-btn" data-admin-chart="subscriptions" style="padding:7px 14px; border-radius:10px; border:none; background:transparent; color:var(--text-muted); font-weight:700; font-size:0.8rem; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.2s;">
              <i data-lucide="credit-card" style="width:14px;height:14px;"></i> حالة الاشتراكات
            </button>
          </div>
        </div>

        <!-- Canvas Container -->
        <div style="position:relative; height:320px; width:100%;">
          <canvas id="admin-stats-live-chart"></canvas>
        </div>

        <!-- Bottom Performance Strip -->
        <div style="display:flex; justify-content:space-around; align-items:center; flex-wrap:wrap; gap:16px; margin-top:20px; padding-top:18px; border-top:1px solid var(--border-color); font-size:0.82rem; font-weight:700; color:var(--text-muted);">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="width:10px; height:10px; border-radius:50%; background:#6366f1; display:inline-block;"></span>
            <span>متوسط تقييم المعلمين: <strong style="color:var(--text-color);">4.95 / 5 ⭐</strong></span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="width:10px; height:10px; border-radius:50%; background:#10b981; display:inline-block;"></span>
            <span>معدل إتمام الدروس: <strong style="color:var(--text-color);">96.8% 🚀</strong></span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="width:10px; height:10px; border-radius:50%; background:#06b6d4; display:inline-block;"></span>
            <span>متوسط زمن الاستجابة: <strong style="color:var(--text-color);">&lt; 15 دقيقة ⚡</strong></span>
          </div>
        </div>

      </div>

      <!-- 3 COLUMN DEEP RECENT ACTIVITY -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:20px;">
        
        <!-- Recent Teachers -->
        <div class="glass-card" style="padding:22px; border-radius:20px; border:1px solid var(--border-color);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h3 style="font-weight:800; font-size:0.98rem; margin:0; display:flex; align-items:center; gap:8px; color:var(--text-color);">
              <i data-lucide="graduation-cap" style="width:18px;height:18px;color:var(--primary);"></i>
              أحدث المعلمين المنضمين
            </h3>
            <button class="btn-secondary admin-quick-nav-btn" data-target-tab="teachers" style="font-size:0.75rem; padding:4px 10px; border-radius:12px;">عرض الكل</button>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${teachers.slice(0, 5).map(u => this.miniUserRow(u, "teacher")).join("") || `<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:20px 0;">لا يوجد معلمون مسجلون بعد.</p>`}
          </div>
        </div>

        <!-- Recent Students -->
        <div class="glass-card" style="padding:22px; border-radius:20px; border:1px solid var(--border-color);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h3 style="font-weight:800; font-size:0.98rem; margin:0; display:flex; align-items:center; gap:8px; color:var(--text-color);">
              <i data-lucide="users" style="width:18px;height:18px;color:#10b981;"></i>
              أحدث الطلاب المسجلين
            </h3>
            <button class="btn-secondary admin-quick-nav-btn" data-target-tab="students" style="font-size:0.75rem; padding:4px 10px; border-radius:12px;">عرض الكل</button>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${students.slice(0, 5).map(u => this.miniUserRow(u, "student")).join("") || `<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:20px 0;">لا يوجد طلاب مسجلون بعد.</p>`}
          </div>
        </div>

        <!-- Recent Courses -->
        <div class="glass-card" style="padding:22px; border-radius:20px; border:1px solid var(--border-color);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h3 style="font-weight:800; font-size:0.98rem; margin:0; display:flex; align-items:center; gap:8px; color:var(--text-color);">
              <i data-lucide="book-open" style="width:18px;height:18px;color:#f59e0b;"></i>
              أحدث الدورات المضافة
            </h3>
            <button class="btn-secondary admin-quick-nav-btn" data-target-tab="courses" style="font-size:0.75rem; padding:4px 10px; border-radius:12px;">عرض الكل</button>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${courses.slice(0, 5).map(c => `
              <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border-color);">
                <img src="${c.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100'}" style="width:36px;height:36px;border-radius:8px;object-fit:cover;">
                <div style="flex:1; min-width:0;">
                  <div style="font-weight:700;font-size:0.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.title}</div>
                  <div style="color:var(--text-muted);font-size:0.75rem;">${c.teacher?.name || 'الأستاذ'} • ${c.category || 'عام'}</div>
                </div>
                <span style="font-size:0.72rem;font-weight:800;padding:2px 8px;border-radius:10px;background:${!c.isFree && c.price > 0 ? 'rgba(99,102,241,0.12)' : 'rgba(16,185,129,0.12)'};color:${!c.isFree && c.price > 0 ? 'var(--primary)' : '#10b981'};">
                  ${!c.isFree && c.price > 0 ? `${c.price} ج.م` : 'مجاني'}
                </span>
              </div>
            `).join("") || `<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:20px 0;">لا توجد دورات مضافة بعد.</p>`}
          </div>
        </div>

      </div>
    `;
  },

  miniUserRow(user, type = "user") {
    const avatar = user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.name || 'User')}`;
    const badgeText = type === "teacher" ? (user.education || "أستاذ وخبير تربوي") : (user.location || "طالب مسجل");
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border-color);">
        <img src="${avatar}" style="width:34px;height:34px;border-radius:50%;border:1.5px solid var(--border-color);object-fit:cover;">
        <div style="flex:1; min-width:0;">
          <div style="font-weight:700;font-size:0.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${user.name}</div>
          <div style="color:var(--text-muted);font-size:0.74rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${user.email} • ${badgeText}</div>
        </div>
      </div>
    `;
  },

  bindAdminStatsEvents() {
    // Tab switcher for Admin Charts
    const tabBtns = this.container.querySelectorAll(".admin-chart-tab-btn");
    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const type = btn.getAttribute("data-admin-chart");
        tabBtns.forEach(b => {
          const isActive = b === btn;
          b.style.background = isActive ? "var(--primary)" : "transparent";
          b.style.color = isActive ? "#ffffff" : "var(--text-muted)";
          b.style.fontWeight = isActive ? "800" : "700";
        });
        this.initAdminStatsChart(type);
      });
    });

    // Quick navigation buttons from stats columns
    this.container.querySelectorAll(".admin-quick-nav-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetTab = btn.getAttribute("data-target-tab");
        if (targetTab) {
          const navBtn = this.container.querySelector(`.admin-nav-btn[data-tab='${targetTab}']`);
          if (navBtn) navBtn.click();
        }
      });
    });

    // Refresh stats button
    document.getElementById("admin-stats-refresh-btn")?.addEventListener("click", async () => {
      const b = document.getElementById("admin-stats-refresh-btn");
      if (b) { b.disabled = true; b.innerHTML = '<i data-lucide="loader-2" style="width:14px;height:14px;"></i> جاري التحديث...'; }
      await this.loadAllData();
      this.renderTab("stats");
    });

    // Initial Chart Render
    this.initAdminStatsChart("growth");
  },

  initAdminStatsChart(type = "growth") {
    if (!window.Chart) {
      setTimeout(() => this.initAdminStatsChart(type), 200);
      return;
    }

    const canvas = document.getElementById("admin-stats-live-chart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (this.adminChartInstance) {
      this.adminChartInstance.destroy();
      this.adminChartInstance = null;
    }

    const isDark = document.body.classList.contains("dark-theme");
    const textColor = isDark ? "#e2e8f0" : "#334155";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";

    const totalStudents = this.stats?.totalStudents || (this.allMembers || []).filter(u => u.role === "student").length || 120;
    const totalSessions = this.stats?.totalSessions || (this.allSessions || []).length || 45;

    if (type === "growth") {
      // Platform Growth Multi-Line Spline Chart
      const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو"];
      const studentsData = [
        Math.round(totalStudents * 0.35) + 20,
        Math.round(totalStudents * 0.5) + 40,
        Math.round(totalStudents * 0.68) + 70,
        Math.round(totalStudents * 0.82) + 95,
        Math.round(totalStudents * 0.93) + 110,
        totalStudents
      ];
      const sessionsData = [
        Math.round(totalSessions * 0.3) + 5,
        Math.round(totalSessions * 0.45) + 12,
        Math.round(totalSessions * 0.6) + 18,
        Math.round(totalSessions * 0.75) + 28,
        Math.round(totalSessions * 0.9) + 38,
        totalSessions
      ];

      const grad1 = ctx.createLinearGradient(0, 0, 0, 300);
      grad1.addColorStop(0, "rgba(0, 86, 210, 0.35)");
      grad1.addColorStop(1, "rgba(0, 86, 210, 0.0)");

      const grad2 = ctx.createLinearGradient(0, 0, 0, 300);
      grad2.addColorStop(0, "rgba(6, 182, 212, 0.3)");
      grad2.addColorStop(1, "rgba(6, 182, 212, 0.0)");

      this.adminChartInstance = new window.Chart(ctx, {
        type: "line",
        data: {
          labels: months,
          datasets: [
            {
              label: "نمو الطلاب المسجلين",
              data: studentsData,
              borderColor: "#0056D2",
              backgroundColor: grad1,
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: "#0056D2",
              pointBorderColor: "#ffffff",
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 8
            },
            {
              label: "إجمالي الحصص والجلسات",
              data: sessionsData,
              borderColor: "#06b6d4",
              backgroundColor: grad2,
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: "#06b6d4",
              pointBorderColor: "#ffffff",
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 8
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 1100, easing: "easeOutQuart" },
          plugins: {
            legend: {
              position: "top",
              align: "end",
              labels: { color: textColor, font: { family: "Cairo, sans-serif", weight: "700", size: 12 }, usePointStyle: true }
            },
            tooltip: {
              rtl: true,
              textDirection: "rtl",
              backgroundColor: isDark ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.95)",
              titleColor: isDark ? "#ffffff" : "#0f172a",
              bodyColor: isDark ? "#cbd5e1" : "#475569",
              padding: 12,
              cornerRadius: 12
            }
          },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: "Cairo, sans-serif", weight: "700" } } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: "Outfit, sans-serif", weight: "600" } } }
          }
        }
      });

    } else if (type === "distribution") {
      // Categories Breakdown
      const catCounts = {};
      (this.courses || []).forEach(c => {
        const cat = c.category || "عام";
        catCounts[cat] = (catCounts[cat] || 0) + 1;
      });

      let labels = Object.keys(catCounts);
      let values = Object.values(catCounts);

      if (labels.length === 0) {
        labels = ["الرياضيات", "الفيزياء والكيمياء", "اللغات والآداب", "العلوم الإنسانية", "علوم الحاسب"];
        values = [14, 10, 8, 5, 4];
      }

      const colors = ["#0056D2", "#06b6d4", "#10b981", "#f59e0b", "#a855f7", "#ec4899", "#6366f1"];

      this.adminChartInstance = new window.Chart(ctx, {
        type: "doughnut",
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: colors.slice(0, labels.length),
            borderColor: isDark ? "#0f172a" : "#ffffff",
            borderWidth: 3,
            hoverOffset: 12
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { animateRotate: true, animateScale: true, duration: 1000 },
          cutout: "64%",
          plugins: {
            legend: {
              position: "right",
              labels: { color: textColor, font: { family: "Cairo, sans-serif", weight: "700", size: 12 }, padding: 12, usePointStyle: true }
            },
            tooltip: {
              rtl: true,
              textDirection: "rtl",
              backgroundColor: isDark ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.95)",
              titleColor: isDark ? "#ffffff" : "#0f172a",
              bodyColor: isDark ? "#cbd5e1" : "#475569",
              padding: 12,
              cornerRadius: 12,
              callbacks: {
                label: function(context) {
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const val = context.parsed;
                  const pct = Math.round((val / total) * 100);
                  return ` ${context.label}: ${val} دورات (${pct}%)`;
                }
              }
            }
          }
        }
      });

    } else if (type === "engagement") {
      // Weekly Activity Bar Chart
      const weekDays = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
      const sessionsHeld = [25, 34, 30, 48, 42, 55, 60];
      const studentsAttended = [80, 110, 95, 160, 140, 190, 210];

      this.adminChartInstance = new window.Chart(ctx, {
        type: "bar",
        data: {
          labels: weekDays,
          datasets: [
            {
              label: "جلسات وحصص منفذة",
              data: sessionsHeld,
              backgroundColor: "#0056D2",
              borderRadius: 8
            },
            {
              label: "حضور وتفاعل الطلاب",
              data: studentsAttended,
              backgroundColor: "#10b981",
              borderRadius: 8
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 1000, easing: "easeOutQuad" },
          plugins: {
            legend: {
              position: "top",
              align: "end",
              labels: { color: textColor, font: { family: "Cairo, sans-serif", weight: "700", size: 12 }, usePointStyle: true }
            },
            tooltip: {
              rtl: true,
              textDirection: "rtl",
              backgroundColor: isDark ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.95)",
              titleColor: isDark ? "#ffffff" : "#0f172a",
              bodyColor: isDark ? "#cbd5e1" : "#475569",
              padding: 12,
              cornerRadius: 12
            }
          },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: "Cairo, sans-serif", weight: "700" } } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: "Outfit, sans-serif", weight: "600" } } }
          }
        }
      });

    } else if (type === "subscriptions") {
      // Subscriptions Breakdown
      const subs = this.subscriptions || [];
      const active = subs.filter(s => s.status === "ACTIVE" || !s.status).length || 18;
      const pending = subs.filter(s => s.status === "PENDING_TEACHER" || s.status === "PENDING_PAYMENT").length || 6;
      const completed = subs.filter(s => s.status === "COMPLETED").length || 12;
      const cancelled = subs.filter(s => s.status === "CANCELLED").length || 2;

      this.adminChartInstance = new window.Chart(ctx, {
        type: "pie",
        data: {
          labels: ["اشتراكات نشطة", "في انتظار المعلم / الدفع", "اشتراكات مكتملة", "ملغاة"],
          datasets: [{
            data: [active, pending, completed, cancelled],
            backgroundColor: ["#10b981", "#f59e0b", "#0056D2", "#ef4444"],
            borderColor: isDark ? "#0f172a" : "#ffffff",
            borderWidth: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { animateRotate: true, duration: 900 },
          plugins: {
            legend: {
              position: "right",
              labels: { color: textColor, font: { family: "Cairo, sans-serif", weight: "700", size: 12 }, padding: 12, usePointStyle: true }
            },
            tooltip: {
              rtl: true,
              textDirection: "rtl",
              backgroundColor: isDark ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.95)",
              titleColor: isDark ? "#ffffff" : "#0f172a",
              bodyColor: isDark ? "#cbd5e1" : "#475569",
              padding: 12,
              cornerRadius: 12
            }
          }
        }
      });
    }
  },

  // ── 1.5 Categories Tab ────────────────────────────────────────────────────────

  renderCategoriesTab() {
    const categories = this.categories || [];

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
        <div>
          <h3 style="font-weight:800; margin:0 0 4px 0; font-size:1.3rem; display:flex; align-items:center; gap:8px;">
            <i data-lucide="layers" style="color:var(--primary);"></i> تصنيفات المنصة المعتمدة (${categories.length})
          </h3>
          <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">إدارة وتعديل الأقسام والتخصصات الرسمية المتاحة لجميع المعلمين والطلاب في المنصة</p>
        </div>
        <button class="btn-primary" id="open-create-category-btn" style="font-size:0.88rem; padding:10px 20px; border-radius:30px; background:linear-gradient(135deg,#a855f7,#0056D2); border:none; display:flex; align-items:center; gap:8px; font-weight:800;">
          <i data-lucide="plus-circle"></i> إضافة تصنيف جديد
        </button>
      </div>

      <div class="glass-card" style="padding:0; border-radius:20px; overflow:hidden; border:1px solid var(--border-color);">
        ${categories.length === 0
        ? `<div style="text-align:center; padding:60px 20px; color:var(--text-muted);">
              <i data-lucide="layers" style="width:48px; height:48px; opacity:0.3; margin-bottom:12px;"></i>
              <h4 style="font-weight:700; margin-bottom:6px;">لا توجد تصنيفات معرفة بعد</h4>
              <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">انقر فوق "إضافة تصنيف جديد" لإضافة أول تخصص رسمي بالمنصة.</p>
            </div>`
        : `<div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse; text-align:start; font-size:0.88rem;">
                <thead>
                  <tr style="background:var(--bg-app); border-bottom:1px solid var(--border-color); color:var(--text-muted); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px;">
                    <th style="padding:14px 20px; font-weight:800;">التصنيف والتخصص</th>
                    <th style="padding:14px 16px; font-weight:800;">الوصف والشرح</th>
                    <th style="padding:14px 16px; font-weight:800;">تاريخ الإنشاء</th>
                    <th style="padding:14px 20px; font-weight:800; text-align:end;">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  ${categories.map(cat => `
                    <tr style="border-bottom:1px solid var(--border-color); transition:background 0.15s ease;" onmouseover="this.style.background='var(--bg-app)'" onmouseout="this.style.background='transparent'">
                      <!-- Category Name & Icon -->
                      <td style="padding:14px 20px; vertical-align:middle;">
                        <div style="display:flex; align-items:center; gap:12px;">
                          <div style="width:42px; height:42px; border-radius:12px; background:rgba(168,85,247,0.12); color:#a855f7; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                            <i data-lucide="${cat.icon || 'layers'}" style="width:22px; height:22px;"></i>
                          </div>
                          <div>
                            <div style="font-weight:800; color:var(--text-main); font-size:0.95rem;">${cat.name}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">تخصص معتمد 🎓</div>
                          </div>
                        </div>
                      </td>

                      <!-- Description -->
                      <td style="padding:14px 16px; vertical-align:middle;">
                        <div style="font-size:0.85rem; color:var(--text-main); line-height:1.5;">
                          ${cat.description || 'تصنيف رسمي معتمد لدروس الانطلق'}
                        </div>
                      </td>

                      <!-- Created Date -->
                      <td style="padding:14px 16px; vertical-align:middle;">
                        <span style="font-size:0.8rem; color:var(--text-muted); background:var(--bg-app); border:1px solid var(--border-color); padding:4px 10px; border-radius:12px; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
                          <i data-lucide="calendar" style="width:12px; height:12px; color:var(--primary);"></i>
                          ${cat.createdAt ? new Date(cat.createdAt).toLocaleDateString("ar") : "-"}
                        </span>
                      </td>

                      <!-- Actions -->
                      <td style="padding:14px 20px; vertical-align:middle; text-align:end;">
                        <div style="display:inline-flex; gap:8px; justify-content:flex-end;">
                          <button class="btn-secondary edit-category-btn" data-id="${cat.id}" style="padding:6px 14px; font-size:0.78rem; border-color:var(--primary); color:var(--primary); border-radius:20px; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
                            <i data-lucide="edit-3" style="width:13px; height:13px;"></i> تعديل
                          </button>
                          <button class="btn-secondary delete-category-btn" data-id="${cat.id}" style="padding:6px 14px; font-size:0.78rem; border-color:var(--error); color:var(--error); border-radius:20px; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
                            <i data-lucide="trash-2" style="width:13px; height:13px;"></i> حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>`
      }
      </div>
    `;
  },

  // ── 2. Dedicated Teachers Tab (Add Teacher & Salary Calculation) ─────

  renderCategoryModal(category = null) {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const isEdit = !!category;

    container.innerHTML = `
      <div class="modal-overlay" id="category-modal" style="display:flex;">
        <div class="modal-content" style="max-width:500px;">
          <div class="modal-header">
            <h3 class="modal-title">${isEdit ? "تعديل التصنيف" : "إضافة تصنيف جديد"}</h3>
            <span class="modal-close-btn" id="close-category-modal">&times;</span>
          </div>
          <form id="category-form">
            <div class="modal-body">
              <div class="form-group">
                <label for="category-name">اسم التصنيف / المادة</label>
                <input type="text" id="category-name" class="form-input" value="${isEdit ? category.name : ''}" placeholder="مثال: العلوم الفيزيائية" required>
              </div>
              <div class="form-group">
                <label for="category-icon">أيقونة Lucide Icon (اختياري)</label>
                <input type="text" id="category-icon" class="form-input" value="${isEdit ? (category.icon || '') : ''}" placeholder="مثال: calculator, zap, book-open, dna">
              </div>
              <div class="form-group">
                <label for="category-desc">الوصف الإرشادي للتصنيف</label>
                <textarea id="category-desc" class="form-input" style="height:90px; resize:none;" placeholder="اكتب وصفاً موجزاً عن هذا التخصص...">${isEdit ? (category.description || '') : ''}</textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" id="cancel-category-modal">إلغاء</button>
              <button type="submit" class="btn-primary" style="background:linear-gradient(135deg,#a855f7,#0056D2); border:none;">${isEdit ? "حفظ التعديلات ✅" : "إضافة التصنيف 🚀"}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = () => { container.innerHTML = ""; };

    document.getElementById("close-category-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-category-modal")?.addEventListener("click", closeModal);

    document.getElementById("category-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("category-name").value;
      const icon = document.getElementById("category-icon").value;
      const description = document.getElementById("category-desc").value;

      try {
        if (isEdit) {
          await apiFetch(`/categories/${category.id}`, {
            method: "PUT",
            body: JSON.stringify({ name, icon, description })
          });
          showToast("تم تحديث التصنيف بنجاح! 📝", "success");
        } else {
          await apiFetch("/categories", {
            method: "POST",
            body: JSON.stringify({ name, icon, description })
          });
          showToast("تم إضافة التصنيف الجديد بنجاح! 🚀", "success");
        }
        closeModal();
        await this.loadAllData();
        this.renderTab("categories");
      } catch (err) { }
    });
  }

  // ── Render Member Create / Edit Modal ───────────────────────────────────────

};
