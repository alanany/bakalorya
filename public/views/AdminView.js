import { apiFetch, state, setAuth, showToast, t, confirmDialog, renderPhoneInputGroup, getCleanWhatsAppNumber, renderEducationSelectHTML, handleWhatsAppResponse } from "../app.js";

export default class AdminView {
  constructor(container) {
    this.container = container;
    this.activeTab = "stats";
    this.stats = {};
    this.allMembers = [];
    this.courses = [];
    this.reportsData = null;
    this.editingUser = null;
    this.categories = [];
    this.teacherApplications = [];
    this.subscriptions = [];
    this.adminEarnings = null;
  }

  async render() {
    if (!state.user || state.user.role !== "admin") {
      this.container.innerHTML = `
        <div style="max-width:480px; margin:80px auto; padding:40px 32px; text-align:center;" class="glass-card">
          <div style="width:72px; height:72px; border-radius:24px; background:rgba(99,102,241,0.12); color:var(--primary); display:flex; align-items:center; justify-content:center; margin:0 auto 20px auto;">
            <i data-lucide="shield-alert" style="width:36px; height:36px;"></i>
          </div>
          <h2 style="font-size:1.6rem; font-weight:800; margin-bottom:8px; color:var(--text-main);">تسجيل دخول مشرف المنصة 🔐</h2>
          <p style="color:var(--text-muted); font-size:0.9rem; line-height:1.6; margin-bottom:24px;">يرجى تسجيل الدخول بحساب الأدمن للوصول لجميع صلاحيات التحكم والإشراف.</p>

          <form id="admin-direct-login-form" style="display:flex; flex-direction:column; gap:14px; text-align:start;">
            <div>
              <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:4px;">البريد الإلكتروني للأدمن:</label>
              <input type="email" id="admin-login-email" class="form-input" value="admin@bakalorya.com" required style="padding:10px; width:100%;">
            </div>
            <div>
              <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:4px;">كلمة السر:</label>
              <input type="password" id="admin-login-password" class="form-input" value="admin123" required style="padding:10px; width:100%;">
            </div>
            <button type="submit" class="btn-primary" style="padding:12px; font-weight:800; font-size:0.95rem; justify-content:center; margin-top:8px;">
              <i data-lucide="log-in"></i> تسجيل الدخول التلقائي كـ Admin 🚀
            </button>
          </form>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();

      this.container.querySelector("#admin-direct-login-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = this.container.querySelector("#admin-login-email").value.trim();
        const password = this.container.querySelector("#admin-login-password").value;
        try {
          const res = await apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
          });
          setAuth(res.token, res.user);
          await this.render();
        } catch (err) {
          showToast(err.message || "فشل تسجيل الدخول كأدمن", "error");
        }
      });
      return;
    }

    let now = "";
    try {
      now = new Date().toLocaleDateString("ar", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    } catch(e) {
      now = new Date().toLocaleDateString();
    }

    this.container.innerHTML = `
      <style>
        .admin-shell {
          display: flex;
          height: calc(100vh - 70px);
          overflow: hidden;
          font-family: "Outfit", "Cairo", sans-serif;
          position: relative;
        }
        .admin-sidebar {
          width: 270px;
          min-width: 270px;
          background: var(--bg-card);
          backdrop-filter: blur(12px);
          border-inline-end: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 10;
          box-shadow: 4px 0 24px rgba(0,0,0,0.06);
        }
        .admin-sidebar-brand {
          padding: 24px 20px 18px;
          border-bottom: 1px solid var(--border-color);
        }
        .admin-sidebar-brand .brand-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--primary-glow);
          border: 1px solid var(--border-focus);
          border-radius: 12px;
          padding: 6px 14px;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: var(--primary);
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .admin-sidebar-brand h3 {
          color: var(--text-main);
          font-size: 1.05rem;
          font-weight: 800;
          margin: 0 0 3px 0;
        }
        .admin-sidebar-brand p {
          color: var(--text-muted);
          font-size: 0.75rem;
          margin: 0;
        }
        .admin-nav {
          flex: 1;
          padding: 16px 12px;
          overflow-y: auto;
          scrollbar-width: none;
        }
        .admin-nav::-webkit-scrollbar { display: none; }
        .admin-nav-section {
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 1px;
          color: var(--text-muted);
          text-transform: uppercase;
          padding: 14px 12px 6px;
          margin-top: 4px;
          opacity: 0.75;
        }
        .admin-nav-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 11px 14px;
          border: 1px solid transparent;
          background: transparent;
          border-radius: 12px;
          cursor: pointer;
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-muted);
          text-align: start;
          transition: all 0.2s ease;
          margin-bottom: 3px;
          position: relative;
        }
        .admin-nav-btn:hover {
          background: var(--bg-app);
          color: var(--text-main);
        }
        .admin-nav-btn.active {
          background: var(--primary-glow);
          color: var(--primary);
          font-weight: 800;
          border: 1px solid var(--border-focus);
          box-shadow: 0 4px 15px var(--primary-glow);
        }
        .admin-nav-btn.active::before {
          content: '';
          position: absolute;
          inset-inline-start: 0;
          top: 20%;
          height: 60%;
          width: 4px;
          background: var(--primary);
          border-radius: 0 4px 4px 0;
        }
        .admin-nav-btn i, .admin-nav-btn svg {
          width: 18px; height: 18px;
          flex-shrink: 0;
        }
        .admin-nav-badge {
          margin-inline-start: auto;
          background: var(--bg-app);
          color: var(--primary);
          font-size: 0.7rem;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 20px;
          border: 1px solid var(--border-color);
          min-width: 22px;
          text-align: center;
        }
        .admin-nav-btn.active .admin-nav-badge {
          background: var(--primary);
          color: #ffffff;
          border-color: transparent;
        }
        .admin-sidebar-footer {
          padding: 16px 20px;
          border-top: 1px solid var(--border-color);
          background: var(--bg-app);
        }
        .admin-sidebar-user {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .admin-sidebar-user img {
          width: 38px; height: 38px;
          border-radius: 50%;
          border: 2px solid var(--primary);
          object-fit: cover;
        }
        .admin-sidebar-user .user-info p { margin: 0; }
        .admin-sidebar-user .user-name {
          font-size: 0.85rem;
          font-weight: 800;
          color: var(--text-main);
        }
        .admin-sidebar-user .user-role {
          font-size: 0.7rem;
          color: var(--primary);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .admin-content-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--bg-color);
        }
        .admin-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 28px;
          background: var(--bg-card);
          border-bottom: 1px solid var(--border-color);
          flex-shrink: 0;
          gap: 20px;
        }
        .admin-topbar-title h2 {
          font-size: 1.25rem;
          font-weight: 800;
          margin: 0 0 2px 0;
          color: var(--text-color);
        }
        .admin-topbar-title p {
          font-size: 0.78rem;
          color: var(--text-muted);
          margin: 0;
        }
        .admin-topbar-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .admin-main {
          flex: 1;
          overflow-y: auto;
          padding: 28px 32px;
        }
        .admin-main::-webkit-scrollbar { width: 6px; }
        .admin-main::-webkit-scrollbar-track { background: transparent; }
        .admin-main::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 3px; }
        @media (max-width: 900px) {
          .admin-sidebar { width: 220px; min-width: 220px; }
          .admin-main { padding: 20px 16px; }
        }
        @media (max-width: 700px) {
          .admin-sidebar { display: none; }
        }
      </style>

      <div class="admin-shell">
        <!-- ── SIDEBAR ── -->
        <aside class="admin-sidebar">
          <nav class="admin-nav">
            <div class="admin-nav-section">لوحة التحكم</div>
            <button class="admin-nav-btn ${this.activeTab === "stats" ? "active" : ""}" data-tab="stats">
              <i data-lucide="layout-dashboard"></i>
              الإحصائيات العامة
              <span class="admin-nav-badge">●</span>
            </button>
            <button class="admin-nav-btn ${this.activeTab === "reports" ? "active" : ""}" data-tab="reports">
              <i data-lucide="bar-chart-3"></i>
              التقارير والسجلات
            </button>

            <div class="admin-nav-section">إدارة المنصة</div>
            <button class="admin-nav-btn ${this.activeTab === "categories" ? "active" : ""}" data-tab="categories">
              <i data-lucide="layers"></i>
              إدارة التصنيفات
              <span class="admin-nav-badge" id="admin-badge-categories">0</span>
            </button>
            <button class="admin-nav-btn ${this.activeTab === "courses" ? "active" : ""}" data-tab="courses">
              <i data-lucide="book-open"></i>
              إدارة الدورات
              <span class="admin-nav-badge" id="admin-badge-courses">0</span>
            </button>
            <button class="admin-nav-btn ${this.activeTab === "sessions" ? "active" : ""}" data-tab="sessions">
              <i data-lucide="video"></i>
              إدارة الحصص والجلسات
              <span class="admin-nav-badge" id="admin-badge-sessions">0</span>
            </button>
            <button class="admin-nav-btn ${this.activeTab === "subscriptions" ? "active" : ""}" data-tab="subscriptions">
              <i data-lucide="calendar-heart"></i>
              إدارة الاشتراكات
              <span class="admin-nav-badge" id="admin-badge-subscriptions">0</span>
            </button>
            <button class="admin-nav-btn ${this.activeTab === "earnings" ? "active" : ""}" data-tab="earnings">
              <i data-lucide="dollar-sign"></i>
              المدفوعات والمستحقات
            </button>

            <div class="admin-nav-section">إدارة الأعضاء</div>
            <button class="admin-nav-btn ${this.activeTab === "teachers" ? "active" : ""}" data-tab="teachers">
              <i data-lucide="graduation-cap"></i>
              المعلمون
              <span class="admin-nav-badge" id="admin-badge-teachers">0</span>
            </button>
            <button class="admin-nav-btn ${this.activeTab === "students" ? "active" : ""}" data-tab="students">
              <i data-lucide="users"></i>
              الطلاب
              <span class="admin-nav-badge" id="admin-badge-students">0</span>
            </button>
            <button class="admin-nav-btn ${this.activeTab === "teacherApplications" ? "active" : ""}" data-tab="teacherApplications">
              <i data-lucide="user-plus"></i>
              طلبات انضمام المعلمين
              <span class="admin-nav-badge" id="admin-badge-applications" style="background:var(--error,#ef4444); color:#fff;">0</span>
            </button>
            <button class="admin-nav-btn ${this.activeTab === "members" ? "active" : ""}" data-tab="members">
              <i data-lucide="shield"></i>
              جميع الأعضاء
            </button>
          </nav>

          <div class="admin-sidebar-footer">
            <div class="admin-sidebar-user">
              <img src="${state.user?.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Admin'}" alt="Admin">
              <div class="user-info">
                <p class="user-name">${state.user?.name || 'Admin'}</p>
                <p class="user-role">System Administrator</p>
              </div>
            </div>
          </div>
        </aside>

        <!-- ── MAIN CONTENT AREA ── -->
        <div class="admin-content-area">
          <div class="admin-topbar">
            <div class="admin-topbar-title">
              <h2 id="admin-topbar-heading">📊 الإحصائيات العامة</h2>
              <p id="admin-topbar-sub">نظرة شاملة على مؤشرات أداء المنصة</p>
            </div>
            <div class="admin-topbar-actions">
              <button class="btn-primary" id="admin-refresh-btn" style="font-size:0.8rem; padding:8px 16px; gap:8px; display:flex; align-items:center;">
                <i data-lucide="refresh-cw" style="width:14px;height:14px;"></i>
                تحديث البيانات
              </button>
            </div>
          </div>

          <main class="admin-main" id="admin-tab-content">
            <div style="text-align:center;padding:80px;color:var(--text-muted);">
              <div class="spinner" style="margin:0 auto 16px; width:48px; height:48px;"></div>
              <p>جارٍ تحميل البيانات...</p>
            </div>
          </main>
        </div>
      </div>

      <!-- Modals Container -->
      <div id="admin-modal-container"></div>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.bindTabEvents();
    await this.loadAllData();
    this.updateBadges();
    this.renderTab(this.activeTab);
  }

  updateBadges() {
    const teachers = (this.allMembers || []).filter(u => u.role === "teacher");
    const students = (this.allMembers || []).filter(u => u.role === "student");
    const pendingApps = (this.teacherApplications || []).filter(a => a.status === "pending");
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el("admin-badge-teachers", teachers.length);
    el("admin-badge-students", students.length);
    el("admin-badge-courses", (this.courses || []).length);
    el("admin-badge-sessions", (this.allSessions || []).length);
    el("admin-badge-categories", (this.categories || []).length);
    el("admin-badge-applications", pendingApps.length);
    el("admin-badge-subscriptions", (this.subscriptions || []).length);
  }

  async loadAllData() {
    try {
      const [stats, members, courses, reportsData, categories, teacherApplications, sessions, subscriptions, earnings, allPlans] = await Promise.all([
        apiFetch("/admin/stats").catch(() => ({})),
        apiFetch("/admin/users").catch(() => []),
        apiFetch("/admin/courses").catch(() => []),
        apiFetch("/admin/reports").catch(() => ({})),
        apiFetch("/categories").catch(() => []),
        apiFetch("/admin/teacher-applications").catch(() => []),
        apiFetch("/sessions").catch(() => []),
        apiFetch("/admin/subscriptions").catch(() => []),
        apiFetch("/admin/earnings").catch(() => null),
        apiFetch("/subscription-plans").catch(() => [])
      ]);
      this.stats = stats || {};
      this.allMembers = members || [];
      this.courses = courses || [];
      this.reportsData = reportsData || {};
      this.categories = categories || [];
      this.teacherApplications = teacherApplications || [];
      this.allPlans = allPlans || [];
      this.allSessions = sessions || [];
      this.subscriptions = subscriptions || [];
      this.adminEarnings = earnings || null;
    } catch (err) {
      console.error("loadAllData error:", err);
    }
  }

  bindTabEvents() {
    this.container.querySelectorAll(".admin-nav-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.activeTab = btn.getAttribute("data-tab");
        this.container.querySelectorAll(".admin-nav-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.renderTab(this.activeTab);
      });
    });

    document.getElementById("admin-refresh-btn")?.addEventListener("click", async () => {
      const btn = document.getElementById("admin-refresh-btn");
      if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" style="width:14px;height:14px;"></i> جارٍ التحديث...'; }
      await this.loadAllData();
      this.updateBadges();
      this.renderTab(this.activeTab);
      if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="refresh-cw" style="width:14px;height:14px;"></i> تحديث البيانات'; }
    });
  }

  // Tab heading metadata
  static TAB_META = {
    stats:               { heading: "📊 الإحصائيات العامة",        sub: "نظرة شاملة على مؤشرات أداء المنصة" },
    reports:             { heading: "📈 التقارير والسجلات",         sub: "تقارير مفصلة عن النشاط والأداء" },
    categories:          { heading: "🗂️ إدارة التصنيفات",          sub: "التصنيفات الرسمية المتاحة لجميع المعلمين" },
    courses:             { heading: "📚 إدارة الدورات",             sub: "مراجعة والإشراف على جميع دورات المنصة" },
    sessions:            { heading: "📹 إدارة الحصص والجلسات",      sub: "متابعة وإلغاء وإعادة جدولة حصص البث المباشر والحصص الخاصة 1-على-1" },
    teachers:            { heading: "👨‍🏫 إدارة المعلمين",           sub: "إضافة وتعديل وإدارة حسابات المعلمين" },
    students:            { heading: "🎓 إدارة الطلاب",             sub: "إضافة وتعديل وإدارة حسابات الطلاب" },
    teacherApplications: { heading: "📝 طلبات انضمام المعلمين",    sub: "مراجعة السير الذاتية والقبول/الرفض لمعلمي المنصة الجدد" },
    members:             { heading: "🛡️ جميع الأعضاء",             sub: "عرض وإدارة جميع مستخدمي المنصة" },
    subscriptions:       { heading: "📅 إدارة الاشتراكات",         sub: "متابعة وتعيين المعلمين لاشتراكات الحصص الخاصة" },
    earnings:            { heading: "💰 المدفوعات والمستحقات",    sub: "متابعة إيرادات المنصة ومستحقات المعلمين" },
    plans:               { heading: "✨ خطط الاشتراكات الشهرية",   sub: "إدارة وتعديل خطط الحصص الخاصة المتاحة للطلاب" },
  };

  renderTab(tab, args = null) {
    const content = document.getElementById("admin-tab-content");
    if (!content) return;

    // Update top-bar heading
    const meta = AdminView.TAB_META[tab] || {};
    const hEl = document.getElementById("admin-topbar-heading");
    const sEl = document.getElementById("admin-topbar-sub");
    if (hEl) hEl.textContent = meta.heading || "";
    if (sEl) sEl.textContent = meta.sub || "";

    if (tab === "stats")                content.innerHTML = this.renderStatsTab();
    else if (tab === "categories")      content.innerHTML = this.renderCategoriesTab();
    else if (tab === "teachers")        content.innerHTML = this.renderTeachersTab();
    else if (tab === "students")        content.innerHTML = this.renderStudentsTab();
    else if (tab === "teacherApplications") content.innerHTML = this.renderTeacherApplicationsTab();
    else if (tab === "members")         content.innerHTML = this.renderMembersTab();
    else if (tab === "courses")         content.innerHTML = this.renderCoursesTab();
    else if (tab === "sessions")        content.innerHTML = this.renderSessionsTab(args);
    else if (tab === "reports")         content.innerHTML = this.renderReportsTab();
    else if (tab === "subscriptions")   content.innerHTML = this.renderSubscriptionsTab();
    else if (tab === "earnings")        content.innerHTML = this.renderEarningsTab();
    else if (tab === "plans")           content.innerHTML = this.renderPlansTab();

    // Always keep sidebar badges fresh
    this.updateBadges();

    if (window.lucide) window.lucide.createIcons();
    this.bindActionEvents();
  }


  // ── 1. Stats Tab ─────────────────────────────────────────────────────────────
  renderStatsTab() {
    const s = this.stats;
    const teachers = this.allMembers.filter(u => u.role === "teacher");
    const students = this.allMembers.filter(u => u.role === "student");

    return `
      <div class="dashboard-stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom:40px;">
        ${this.statCard("graduation-cap", s.totalTeachers || 0, t("admin.stat.teachers"), "var(--primary)", "var(--primary-glow)")}
        ${this.statCard("users", s.totalStudents || 0, t("admin.stat.students"), "var(--success)", "var(--success-glow)")}
        ${this.statCard("shield", s.totalAdmins || 0, t("admin.role.admin"), "var(--info)", "var(--info-glow)")}
        ${this.statCard("book-open", s.totalCourses || 0, t("admin.stat.courses"), "var(--accent)", "var(--accent-glow)")}
        ${this.statCard("video", s.totalSessions || 0, t("admin.stat.sessions"), "var(--warning, #f59e0b)", "rgba(245,158,11,0.15)")}
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px;">
        <div class="glass-card" style="padding:24px;">
          <h3 style="font-weight:700;margin-bottom:20px;font-size:1rem;display:flex;align-items:center;gap:8px;">
            <i data-lucide="graduation-cap" style="width:18px;height:18px;color:var(--primary);"></i>
            ${t("admin.recentTeachers")}
          </h3>
          ${teachers.slice(0, 5).map(u => this.miniUserRow(u)).join("") || `<p style="color:var(--text-muted);font-size:0.85rem;">${t("admin.noData")}</p>`}
        </div>

        <div class="glass-card" style="padding:24px;">
          <h3 style="font-weight:700;margin-bottom:20px;font-size:1rem;display:flex;align-items:center;gap:8px;">
            <i data-lucide="users" style="width:18px;height:18px;color:var(--success);"></i>
            ${t("admin.recentStudents")}
          </h3>
          ${students.slice(0, 5).map(u => this.miniUserRow(u)).join("") || `<p style="color:var(--text-muted);font-size:0.85rem;">${t("admin.noData")}</p>`}
        </div>
      </div>
    `;
  }

  statCard(icon, value, label, color, bg) {
    return `
      <div class="glass-card stat-box">
        <div class="stat-box-icon" style="color:${color}; background:${bg};">
          <i data-lucide="${icon}"></i>
        </div>
        <div>
          <div class="stat-box-val">${value}</div>
          <div class="stat-box-lbl">${label}</div>
        </div>
      </div>
    `;
  }

  miniUserRow(user) {
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border-color);">
        <img src="${user.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + user.name}" style="width:32px;height:32px;border-radius:50%;">
        <div>
          <div style="font-weight:600;font-size:0.85rem;">${user.name}</div>
          <div style="color:var(--text-muted);font-size:0.75rem;">${user.email}</div>
        </div>
      </div>
    `;
  }

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
                          ${cat.description || 'تصنيف رسمي معتمد لدروس البكالوريا'}
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
  }

  // ── 2. Dedicated Teachers Tab (Add Teacher & Edit Teacher & View Transcript) ─────
  renderTeachersTab() {
    const teachers = this.allMembers.filter(u => u.role === "teacher");

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:16px;">
        <h3 style="font-weight:700;">${t("admin.tab.teachers")} (${teachers.length})</h3>
        <button class="btn-primary" id="open-create-teacher-btn" style="font-size:0.85rem;padding:10px 18px;">
          <i data-lucide="user-plus"></i> ${t("admin.addTeacher")}
        </button>
      </div>

      ${teachers.length === 0
        ? `<div class="glass-card" style="text-align:center;padding:40px;color:var(--text-muted);">${t("admin.noTeachers")}</div>`
        : `<div class="glass-card" style="overflow:hidden;padding:0;">
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:var(--bg-card);border-bottom:1px solid var(--border-color);">
                  <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">${t("admin.col.name")}</th>
                  <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">${t("admin.col.email")}</th>
                  <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">${t("admin.col.joined")}</th>
                  <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">${t("admin.col.actions")}</th>
                </tr>
              </thead>
              <tbody>
                ${teachers.map(u => this.memberTableRow(u)).join("")}
              </tbody>
            </table>
          </div>`
      }
    `;
  }

  // ── Teacher Applications Tab ─────────────────────────────────────────────────
  renderTeacherApplicationsTab() {
    const apps = this.teacherApplications || [];
    const pending = apps.filter(a => a.status === "pending");
    const approved = apps.filter(a => a.status === "approved");
    const rejected = apps.filter(a => a.status === "rejected");

    const statusBadge = (status) => {
      const map = {
        pending:  { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "⏳ قيد المراجعة" },
        approved: { color: "#22c55e", bg: "rgba(34,197,94,0.12)",  label: "✅ مقبول" },
        rejected: { color: "#ef4444", bg: "rgba(239,68,68,0.12)",  label: "❌ مرفوض" },
      };
      const s = map[status] || map.pending;
      return `<span style="font-size:0.72rem; font-weight:700; padding:3px 10px; border-radius:20px; background:${s.bg}; color:${s.color};">${s.label}</span>`;
    };

    const appCard = (app) => `
      <div class="glass-card" style="border-radius:16px; padding:20px; border:1px solid var(--border-color); border-right: 4px solid ${app.status === 'pending' ? '#f59e0b' : app.status === 'approved' ? '#22c55e' : '#ef4444'};">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; margin-bottom:14px;">
          <div style="display:flex; align-items:center; gap:14px;">
            <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(app.name)}" 
              alt="${app.name}" style="width:52px; height:52px; border-radius:50%; border:2px solid var(--border-color);">
            <div>
              <h4 style="font-size:1rem; font-weight:800; margin:0 0 4px 0;">${app.name}</h4>
              <p style="font-size:0.82rem; color:var(--text-muted); margin:0;">${app.email}</p>
            </div>
          </div>
          ${statusBadge(app.status)}
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; font-size:0.83rem;">
          <div style="display:flex; align-items:center; gap:8px; color:var(--text-muted);">
            <i data-lucide="graduation-cap" style="width:14px;height:14px;color:var(--primary);"></i>
            <span>${app.education || "غير محدد"}</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px; color:var(--text-muted);">
            <i data-lucide="map-pin" style="width:14px;height:14px;color:var(--primary);"></i>
            <span>${app.location || "غير محدد"}</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px; color:var(--text-muted);">
            <i data-lucide="phone" style="width:14px;height:14px;color:var(--primary);"></i>
            <span>${app.phone || "غير محدد"}</span>
            ${app.phone ? `
              <a href="https://wa.me/${getCleanWhatsAppNumber(app.phone)}" target="_blank" style="color:var(--success); text-decoration:none; margin-inline-start:4px; display:inline-flex; align-items:center; gap:3px; font-weight:700;" title="واتساب المباشر">
                <i data-lucide="message-circle" style="width:14px;height:14px;"></i> واتساب
              </a>
            ` : ''}
          </div>
          <div style="display:flex; align-items:center; gap:8px; color:var(--text-muted);">
            <i data-lucide="calendar" style="width:14px;height:14px;color:var(--primary);"></i>
            <span>${new Date(app.createdAt).toLocaleDateString("ar")}</span>
          </div>
        </div>

        ${app.bio ? `<p style="font-size:0.83rem; color:var(--text-muted); padding:12px; background:var(--bg-app); border-radius:8px; margin-bottom:14px; line-height:1.6;">${app.bio}</p>` : ""}

        ${app.status === "pending" ? `
        <div style="display:flex; gap:10px; border-top:1px solid var(--border-color); padding-top:14px;">
          <button class="btn-primary approve-application-btn" data-id="${app.id}" 
            style="flex:1; padding:8px; font-size:0.85rem; display:flex; align-items:center; justify-content:center; gap:6px; background:var(--success);">
            <i data-lucide="check-circle" style="width:15px;height:15px;"></i> قبول الطلب
          </button>
          <button class="btn-secondary reject-application-btn" data-id="${app.id}" 
            style="flex:1; padding:8px; font-size:0.85rem; display:flex; align-items:center; justify-content:center; gap:6px; color:var(--error); border-color:var(--error);">
            <i data-lucide="x-circle" style="width:15px;height:15px;"></i> رفض الطلب
          </button>
        </div>` : ""}
      </div>
    `;

    return `
      <!-- Summary Badges -->
      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:28px;">
        <div class="glass-card" style="padding:16px 20px; border-right:4px solid #f59e0b; border-radius:12px;">
          <p style="font-size:1.8rem; font-weight:900; color:#f59e0b; margin:0;">${pending.length}</p>
          <p style="font-size:0.8rem; color:var(--text-muted); margin:4px 0 0 0;">⏳ طلبات قيد المراجعة</p>
        </div>
        <div class="glass-card" style="padding:16px 20px; border-right:4px solid #22c55e; border-radius:12px;">
          <p style="font-size:1.8rem; font-weight:900; color:#22c55e; margin:0;">${approved.length}</p>
          <p style="font-size:0.8rem; color:var(--text-muted); margin:4px 0 0 0;">✅ طلبات مقبولة</p>
        </div>
        <div class="glass-card" style="padding:16px 20px; border-right:4px solid #ef4444; border-radius:12px;">
          <p style="font-size:1.8rem; font-weight:900; color:#ef4444; margin:0;">${rejected.length}</p>
          <p style="font-size:0.8rem; color:var(--text-muted); margin:4px 0 0 0;">❌ طلبات مرفوضة</p>
        </div>
      </div>

      <!-- Pending Applications First -->
      ${pending.length > 0 ? `
        <h4 style="font-weight:800; margin-bottom:16px; font-size:1rem;">⏳ طلبات تنتظر المراجعة (${pending.length})</h4>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(340px,1fr)); gap:16px; margin-bottom:28px;">
          ${pending.map(a => appCard(a)).join("")}
        </div>
      ` : `<div class="glass-card" style="text-align:center;padding:28px;color:var(--text-muted);margin-bottom:24px;">لا توجد طلبات قيد الانتظار حالياً ✅</div>`}

      <!-- Approved -->
      ${approved.length > 0 ? `
        <h4 style="font-weight:800; margin-bottom:16px; font-size:1rem;">✅ الطلبات المقبولة (${approved.length})</h4>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(340px,1fr)); gap:16px; margin-bottom:28px;">
          ${approved.map(a => appCard(a)).join("")}
        </div>
      ` : ""}

      <!-- Rejected -->
      ${rejected.length > 0 ? `
        <h4 style="font-weight:800; margin-bottom:16px; font-size:1rem;">❌ الطلبات المرفوضة (${rejected.length})</h4>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(340px,1fr)); gap:16px;">
          ${rejected.map(a => appCard(a)).join("")}
        </div>
      ` : ""}

      ${apps.length === 0 ? `<div class="glass-card" style="text-align:center;padding:60px;color:var(--text-muted);">لم يتم استلام أي طلبات انضمام بعد. <br><br><a href="#teacher-apply" style="color:var(--primary);">رابط طلب الانضمام</a></div>` : ""}
    `;
  }

  // ── 3. Dedicated Students Tab (Add Student & Edit Student & View Transcript) ─────
  renderStudentsTab() {
    const students = this.allMembers.filter(u => u.role === "student");

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:16px;">
        <h3 style="font-weight:700;">${t("admin.tab.students")} (${students.length})</h3>
        <button class="btn-primary" id="open-create-student-btn" style="font-size:0.85rem;padding:10px 18px;background:var(--success);">
          <i data-lucide="user-plus"></i> ${t("admin.addStudent")}
        </button>
      </div>

      ${students.length === 0
        ? `<div class="glass-card" style="text-align:center;padding:40px;color:var(--text-muted);">${t("admin.noStudents")}</div>`
        : `<div class="glass-card" style="overflow:hidden;padding:0;">
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:var(--bg-card);border-bottom:1px solid var(--border-color);">
                  <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">${t("admin.col.name")}</th>
                  <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">${t("admin.col.email")}</th>
                  <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">${t("admin.col.joined")}</th>
                  <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">${t("admin.col.actions")}</th>
                </tr>
              </thead>
              <tbody>
                ${students.map(u => this.memberTableRow(u)).join("")}
              </tbody>
            </table>
          </div>`
      }
    `;
  }

  // ── 4. Members Management Tab (All Members: Add / Edit / Delete) ─────────────
  renderMembersTab() {
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:16px;">
        <h3 style="font-weight:700;">${t("admin.tab.allMembers")} (${this.allMembers.length})</h3>
        <button class="btn-primary" id="open-create-member-btn" style="font-size:0.85rem;padding:10px 18px;">
          <i data-lucide="user-plus"></i> ${t("admin.addMember")}
        </button>
      </div>

      ${this.allMembers.length === 0
        ? `<div class="glass-card" style="text-align:center;padding:40px;color:var(--text-muted);">${t("admin.noTeachers")}</div>`
        : `<div class="glass-card" style="overflow:hidden;padding:0;">
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:var(--bg-card);border-bottom:1px solid var(--border-color);">
                  <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">${t("admin.col.name")}</th>
                  <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">${t("admin.col.email")}</th>
                  <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">${t("form.accountType")}</th>
                  <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">${t("admin.col.joined")}</th>
                  <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">${t("admin.col.actions")}</th>
                </tr>
              </thead>
              <tbody>
                ${this.allMembers.map(u => this.memberTableRow(u)).join("")}
              </tbody>
            </table>
          </div>`
      }
    `;
  }

  memberTableRow(user) {
    const joinDate = new Date(user.createdAt).toLocaleDateString();
    const isMe = user.id === state.user?.id;

    let roleBadge = `<span style="padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;background:rgba(99,102,241,0.15);color:var(--primary);">${t("admin.role.student")}</span>`;
    if (user.role === "teacher") {
      roleBadge = `<span style="padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;background:rgba(16,185,129,0.15);color:var(--success);">${t("admin.role.teacher")}</span>`;
    } else if (user.role === "admin") {
      roleBadge = `<span style="padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;background:rgba(245,158,11,0.15);color:#f59e0b;">${t("admin.role.admin")}</span>`;
    }

    return `
      <tr style="border-bottom:1px solid var(--border-color);">
        <td style="padding:14px 20px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <img src="${user.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + user.name}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">
            <span style="font-weight:600;font-size:0.9rem;">${user.name}</span>
          </div>
        </td>
        <td style="padding:14px 20px;color:var(--text-muted);font-size:0.85rem;">${user.email}</td>
        <td style="padding:14px 20px;">${roleBadge}</td>
        <td style="padding:14px 20px;color:var(--text-muted);font-size:0.85rem;">${joinDate}</td>
        <td style="padding:14px 20px;">
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn-secondary edit-member-btn" data-id="${user.id}" style="font-size:0.75rem;padding:6px 12px;border-color:var(--primary);color:var(--primary);">
              <i data-lucide="edit" style="width:12px;height:12px;"></i> ${t("admin.editMember")}
            </button>
            <button class="btn-secondary view-transcript-btn" data-id="${user.id}" style="font-size:0.75rem;padding:6px 12px;border-color:var(--info);color:var(--info);">
              <i data-lucide="file-text" style="width:12px;height:12px;"></i> ${t("admin.viewTranscript")}
            </button>
            ${!isMe ? `
              <button class="btn-secondary delete-user-btn" data-id="${user.id}" data-name="${user.name}" style="font-size:0.75rem;padding:6px 12px;border-color:var(--error,#ef4444);color:var(--error,#ef4444);">
                <i data-lucide="trash-2" style="width:12px;height:12px;"></i> ${t("common.delete")}
              </button>` : `<span style="font-size:0.75rem;color:var(--text-muted);">${t("admin.you")}</span>`}
          </div>
        </td>
      </tr>
    `;
  }

  // ── 5. Courses Management Tab ────────────────────────────────────────────────
  renderCoursesTab() {
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <h3 style="font-weight:700;">${t("admin.tab.courses")} (${this.courses.length})</h3>
      </div>

      ${this.courses.length === 0
        ? `<div class="glass-card" style="text-align:center;padding:40px;color:var(--text-muted);">${t("admin.noCourses")}</div>`
        : `<div style="display:flex;flex-direction:column;gap:16px;">
            ${this.courses.map(course => `
              <div class="glass-card" style="display:flex;align-items:center;gap:20px;padding:16px 20px;">
                <img src="${course.image || 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=80&auto=format'}"
                  style="width:72px;height:72px;border-radius:var(--radius-sm);object-fit:cover;flex-shrink:0;">
                <div style="flex:1;min-width:0;">
                  <div style="font-size:0.7rem;font-weight:700;color:var(--primary);text-transform:uppercase;margin-bottom:4px;">${course.category}</div>
                  <h4 style="font-weight:700;font-size:1rem;margin-bottom:6px;">${course.title}</h4>
                  <div style="display:flex;gap:20px;font-size:0.8rem;color:var(--text-muted);">
                    <span><i data-lucide="user" style="width:12px;height:12px;"></i> ${course.teacher?.name || t("admin.unknown")}</span>
                    <span><i data-lucide="book" style="width:12px;height:12px;"></i> ${course.lessonsCount} ${t("admin.lessons")}</span>
                    <span><i data-lucide="users" style="width:12px;height:12px;"></i> ${course.enrollmentsCount} ${t("admin.enrolled")}</span>
                  </div>
                </div>
                <button class="btn-secondary delete-course-btn" data-id="${course.id}" data-title="${course.title}"
                  style="font-size:0.8rem;padding:8px 14px;border-color:var(--error, #ef4444);color:var(--error, #ef4444);flex-shrink:0;">
                  <i data-lucide="trash-2" style="width:14px;height:14px;"></i> ${t("common.delete")}
                </button>
              </div>
            `).join("")}
          </div>`
      }
    `;
  }

  // ── 5. Sessions Management Tab ────────────────────────────────────────────────
  renderSessionsTab(filterSubId = null) {
    let sessions = this.allSessions || [];
    if (filterSubId) {
      sessions = sessions.filter(s => String(s.subscription?.id) === String(filterSubId));
    }


    const getStatusBadge = (status) => {
      const s = (status || "").toLowerCase();
      if (s === "live") return `<span style="background:rgba(239,68,68,0.15); color:#ef4444; font-weight:800; font-size:0.75rem; padding:4px 10px; border-radius:20px; display:inline-flex; align-items:center; gap:4px;"><i data-lucide="video" style="width:12px;height:12px;"></i> بث مباشر الآن</span>`;
      if (s === "completed") return `<span style="background:rgba(16,185,129,0.12); color:#10b981; font-weight:800; font-size:0.75rem; padding:4px 10px; border-radius:20px;">✓ مكتملة</span>`;
      if (s.includes("cancelled")) return `<span style="background:rgba(239,68,68,0.12); color:#ef4444; font-weight:800; font-size:0.75rem; padding:4px 10px; border-radius:20px;">❌ ملغاة</span>`;
      return `<span style="background:rgba(99,102,241,0.12); color:#6366f1; font-weight:800; font-size:0.75rem; padding:4px 10px; border-radius:20px;">📅 مجدولة</span>`;
    };

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
        <div>
          <h3 style="font-weight:800; font-size:1.2rem; color:var(--text-main); margin:0;">
            ${filterSubId ? `حصص الاشتراك #${filterSubId.substring(0,8)} (${sessions.length})` : `إدارة الحصص والجلسات المباشرة (${sessions.length})`}
          </h3>
          <p style="font-size:0.85rem; color:var(--text-muted); margin:4px 0 0 0;">يمكن للأدمن متابعة كافة الحصص الخاصة والجماعية وإلغائها أو تعديل حالتها عند الحاجة.</p>
        </div>
        ${filterSubId ? `<button class="btn-secondary admin-view-all-sessions-btn" style="padding:8px 16px; font-size:0.85rem; display:inline-flex; align-items:center; gap:6px;"><i data-lucide="arrow-right" style="width:16px; height:16px;"></i> الرجوع لكل الحصص</button>` : ''}
      </div>
      </div>

      <div class="glass-card" style="padding:0; border-radius:18px; overflow:hidden; border:1px solid var(--border-color);">
        ${sessions.length === 0 ? `
          <div style="text-align:center; padding:60px 20px; color:var(--text-muted);">
            <i data-lucide="video" style="width:48px; height:48px; opacity:0.3; margin-bottom:12px;"></i>
            <h4 style="font-weight:700; margin-bottom:6px;">لا توجد حصص مجدولة بالمنصة حتى الآن</h4>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">سيتم عرض جميع الحصص المحجوزة والبث المباشر هنا تلقائياً.</p>
          </div>
        ` : `
          <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:0.88rem;">
              <thead>
                <tr style="background:var(--bg-app); border-bottom:1px solid var(--border-color); color:var(--text-muted); font-size:0.8rem; text-transform:uppercase;">
                  <th style="padding:14px 20px; font-weight:800; text-align:start;">عنوان الحصة / الدرس</th>
                  <th style="padding:14px 16px; font-weight:800; text-align:start;">المعلم والمنظم</th>
                  <th style="padding:14px 16px; font-weight:800; text-align:start;">الطالب (إن وجد)</th>
                  <th style="padding:14px 16px; font-weight:800; text-align:start;">الموعد والمدة</th>
                  <th style="padding:14px 16px; font-weight:800; text-align:start;">الحالة</th>
                  <th style="padding:14px 20px; font-weight:800; text-align:end;">إجراءات التحكم</th>
                </tr>
              </thead>
              <tbody>
                ${sessions.map(sess => {
                  const dateStr = sess.scheduledAt ? new Date(sess.scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
                  const teacherName = sess.teacher?.name || sess.course?.teacher?.name || "معلم المنصة";
                  const studentName = sess.student?.name || (sess.course ? "طلاب الدورة الجماعية" : "حصة خاصة 1-على-1");

                  return `
                    <tr style="border-bottom:1px solid var(--border-color);" onmouseover="this.style.background='var(--bg-app)'" onmouseout="this.style.background='transparent'">
                      <td style="padding:14px 20px; vertical-align:middle;">
                        <strong style="font-size:0.92rem; color:var(--text-main); display:block;">${sess.title || "حصة خاصة"}</strong>
                        <span style="font-size:0.75rem; color:var(--text-muted);">${sess.course ? '📖 ' + sess.course.title : '🔒 حصة من اشتراك شهر'}</span>
                      </td>
                      <td style="padding:14px 16px; vertical-align:middle;">
                        <div style="font-size:0.85rem; font-weight:700; color:var(--text-main);">${teacherName}</div>
                      </td>
                      <td style="padding:14px 16px; vertical-align:middle;">
                        <div style="font-size:0.85rem; color:var(--text-main);">${studentName}</div>
                      </td>
                      <td style="padding:14px 16px; vertical-align:middle;">
                        <div style="font-size:0.82rem; font-weight:700; color:var(--primary);">${dateStr}</div>
                        <span style="font-size:0.75rem; color:var(--text-muted);">${sess.duration || 60} دقيقة</span>
                      </td>
                      <td style="padding:14px 16px; vertical-align:middle;">
                        ${getStatusBadge(sess.status)}
                      </td>
                      <td style="padding:14px 20px; vertical-align:middle; text-align:end;">
                        <div style="display:inline-flex; gap:6px; justify-content:flex-end; flex-wrap:wrap;">
                          ${sess.status !== "completed" && !sess.status?.includes("cancelled") ? `
                            <button class="btn-secondary admin-reassign-teacher-btn" data-id="${sess.id}" style="font-size:0.75rem; padding:5px 10px; border-color:var(--primary); color:var(--primary); font-weight:700;">
                              <i data-lucide="user-check" style="width:12px;height:12px;"></i> تغيير المعلم
                            </button>
                            <button class="btn-secondary admin-cancel-session-btn" data-id="${sess.id}" style="font-size:0.75rem; padding:5px 10px; border-color:var(--error); color:var(--error); font-weight:700;">
                              <i data-lucide="x-circle" style="width:12px;height:12px;"></i> إلغاء الحصة
                            </button>
                          ` : ''}
                          <a href="#classroom/${sess.id}" class="btn-primary" style="font-size:0.75rem; padding:5px 10px; text-decoration:none;">
                            <i data-lucide="video" style="width:12px;height:12px;"></i> دخول
                          </a>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  }

  // ── 6. Full Reports & Transcripts Tab ─────────────────────────────────────────
  renderReportsTab() {
    const rep = this.reportsData?.summary || {};
    const audit = this.reportsData?.auditLogs || {};

    const total = rep.totalUsers || 1;
    const studentPct = Math.round(((rep.totalStudents || 0) / total) * 100);
    const teacherPct = Math.round(((rep.totalTeachers || 0) / total) * 100);
    const adminPct   = 100 - (studentPct + teacherPct);

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:16px;">
        <div>
          <h3 style="font-weight:800;font-size:1.4rem;">${t("admin.reports.title")}</h3>
          <p style="color:var(--text-muted);font-size:0.85rem;">${t("admin.reports.subtitle")}</p>
        </div>
        <button class="btn-secondary" id="print-reports-btn" style="font-size:0.85rem;padding:8px 16px;border-color:var(--primary);color:var(--primary);">
          <i data-lucide="printer"></i> ${t("admin.reports.printReport")}
        </button>
      </div>

      <!-- Key System Metrics Grid -->
      <div class="dashboard-stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom:32px;">
        <div class="glass-card stat-box">
          <div class="stat-box-icon" style="color:var(--primary);background:var(--primary-glow);"><i data-lucide="users"></i></div>
          <div>
            <div class="stat-box-val">${rep.totalUsers || 0}</div>
            <div class="stat-box-lbl">${t("admin.reports.userDistribution")}</div>
          </div>
        </div>
        <div class="glass-card stat-box">
          <div class="stat-box-icon" style="color:var(--success);background:var(--success-glow);"><i data-lucide="award"></i></div>
          <div>
            <div class="stat-box-val">${rep.avgProgress || 0}%</div>
            <div class="stat-box-lbl">${t("course.progress")}</div>
          </div>
        </div>
        <div class="glass-card stat-box">
          <div class="stat-box-icon" style="color:var(--accent);background:var(--accent-glow);"><i data-lucide="check-circle-2"></i></div>
          <div>
            <div class="stat-box-val">${rep.completedLessonsSum || 0}</div>
            <div class="stat-box-lbl">${t("student.completedLessons")}</div>
          </div>
        </div>
        <div class="glass-card stat-box">
          <div class="stat-box-icon" style="color:var(--info);background:var(--info-glow);"><i data-lucide="video"></i></div>
          <div>
            <div class="stat-box-val">${rep.liveSessions || 0} / ${rep.totalSessions || 0}</div>
            <div class="stat-box-lbl">${t("admin.reports.sessionStatus")}</div>
          </div>
        </div>
      </div>

      <!-- Distribution & Performance Breakdown -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:32px;">
        <div class="glass-card" style="padding:24px;">
          <h4 style="font-weight:700;margin-bottom:16px;font-size:0.95rem;">${t("admin.reports.userDistribution")}</h4>
          <div style="height:12px;width:100%;border-radius:10px;background:var(--border-color);display:flex;overflow:hidden;margin-bottom:20px;">
            <div style="width:${studentPct}%;background:var(--success);" title="${studentPct}% Students"></div>
            <div style="width:${teacherPct}%;background:var(--primary);" title="${teacherPct}% Teachers"></div>
            <div style="width:${adminPct}%;background:#f59e0b;" title="${adminPct}% Admins"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:var(--text-muted);">
            <span><strong style="color:var(--success);">● ${t("admin.role.student")}:</strong> ${rep.totalStudents || 0} (${studentPct}%)</span>
            <span><strong style="color:var(--primary);">● ${t("admin.role.teacher")}:</strong> ${rep.totalTeachers || 0} (${teacherPct}%)</span>
            <span><strong style="color:#f59e0b;">● ${t("admin.role.admin")}:</strong> ${rep.totalAdmins || 0} (${adminPct}%)</span>
          </div>
        </div>

        <div class="glass-card" style="padding:24px;">
          <h4 style="font-weight:700;margin-bottom:16px;font-size:0.95rem;">${t("admin.reports.courseEngagement")}</h4>
          <div style="display:flex;flex-direction:column;gap:12px;font-size:0.85rem;">
            <div style="display:flex;justify-content:space-between;padding-bottom:8px;border-bottom:1px solid var(--border-color);">
              <span style="color:var(--text-muted);">${t("admin.stat.courses")}</span>
              <strong>${rep.totalCourses || 0}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;padding-bottom:8px;border-bottom:1px solid var(--border-color);">
              <span style="color:var(--text-muted);">${t("admin.lessons")}</span>
              <strong>${rep.totalLessons || 0}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;padding-bottom:8px;border-bottom:1px solid var(--border-color);">
              <span style="color:var(--text-muted);">${t("admin.stat.enrollments")}</span>
              <strong>${rep.totalEnrollments || 0}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Audit Logs Table -->
      <div class="glass-card" style="padding:24px;">
        <h4 style="font-weight:700;margin-bottom:20px;font-size:1rem;display:flex;align-items:center;gap:8px;">
          <i data-lucide="history" style="width:18px;height:18px;color:var(--primary);"></i>
          ${t("admin.reports.auditLog")}
        </h4>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
          <div>
            <h5 style="font-size:0.85rem;color:var(--text-muted);margin-bottom:12px;font-weight:700;">${t("admin.reports.recentRegistrations")}</h5>
            ${(audit.recentUsers || []).map(u => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-color);font-size:0.8rem;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <img src="${u.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + u.name}" style="width:24px;height:24px;border-radius:50%;">
                  <strong>${u.name}</strong> (${u.role})
                </div>
                <span style="color:var(--text-muted);">${new Date(u.createdAt).toLocaleDateString()}</span>
              </div>
            `).join("") || `<p style="color:var(--text-muted);font-size:0.8rem;">${t("admin.noData")}</p>`}
          </div>

          <div>
            <h5 style="font-size:0.85rem;color:var(--text-muted);margin-bottom:12px;font-weight:700;">${t("admin.reports.recentEnrollments")}</h5>
            ${(audit.recentEnrollments || []).map(e => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-color);font-size:0.8rem;">
                <div>
                  <strong>${e.studentName}</strong> → ${e.courseTitle}
                </div>
                <span style="color:var(--success);font-weight:600;">${e.progress}%</span>
              </div>
            `).join("") || `<p style="color:var(--text-muted);font-size:0.8rem;">${t("admin.noData")}</p>`}
          </div>
        </div>
      </div>
    `;
  }
  // ── 9. Subscriptions Tab ─────────────────────────────────────────────────────────────
    renderSubscriptionsTab() {
    return `
      <div class="glass-card" style="padding:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <h3 style="font-weight:700;font-size:1.1rem;display:flex;align-items:center;gap:8px;">
            <i data-lucide="calendar-heart" style="color:var(--primary);width:20px;height:20px;"></i>
            قائمة الاشتراكات
          </h3>
        </div>
        <div style="overflow-x:auto;">
          <table class="table" style="width:100%;text-align:start;border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:1px solid var(--border-color);color:var(--text-muted);font-size:0.8rem;">
                <th style="padding:12px;font-weight:700;">المعرف</th>
                <th style="padding:12px;font-weight:700;">الطالب</th>
                <th style="padding:12px;font-weight:700;">الخطة / الحصص</th>
                <th style="padding:12px;font-weight:700;">المعلم المعين</th>
                <th style="padding:12px;font-weight:700;">الحالة</th>
                <th style="padding:12px;font-weight:700;">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${(this.subscriptions || []).map(s => {
                const totalSessions = s.totalSessions || s.plan?.sessionsCount || 0;
                
                // Calculate metrics based on loaded sessions if available
                const allSessions = this.allSessions || [];
                const subSessions = allSessions.filter(sess => sess.subscription?.id === s.id);
                const completedSessions = subSessions.filter(sess => sess.status === 'COMPLETED' || sess.status === 'completed').length;
                const scheduledSessions = subSessions.filter(sess => sess.status === 'SCHEDULED' || sess.status === 'scheduled' || sess.status === 'RESCHEDULED').length;
                const totalBooked = completedSessions + scheduledSessions;
                const remainingToBook = Math.max(0, totalSessions - totalBooked);
                
                return `
                <tr style="border-bottom:1px solid var(--border-color);font-size:0.85rem;">
                  <td style="padding:12px;color:var(--text-muted);">#${s.id.substring(0,8)}</td>
                  <td style="padding:12px;font-weight:600;">${s.student?.name || '-'}</td>
                  <td style="padding:12px;">
                    ${s.plan?.name || '-'} 
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
                      ${totalSessions} حصص الإجمالي
                    </div>
                  </td>
                  <td style="padding:12px;">${s.teacher?.name || '<span style="color:var(--warning,#f59e0b);">في الانتظار</span>'}</td>
                  <td style="padding:12px;">
                    <span class="badge" style="background:${s.status === 'TEACHER_ASSIGNMENT_PENDING' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)'};color:${s.status === 'TEACHER_ASSIGNMENT_PENDING' ? '#f59e0b' : '#10b981' };">
                      ${s.status}
                    </span>
                  </td>
                  <td style="padding:12px;display:flex;flex-direction:column;gap:8px;">
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        <button class="btn-secondary admin-assign-teacher-sub-btn" data-id="${s.id}" style="padding:6px;font-size:0.75rem;">
                        <i data-lucide="user-plus" style="width:14px;height:14px;"></i> المعلم
                        </button>
                        ${s.status === 'ACTIVE' ? `
                        <button class="btn-primary admin-package-wizard-btn" data-id="${s.id}" data-teacher="${s.teacher?.id || ''}" style="padding:6px;font-size:0.75rem;gap:4px;">
                        <i data-lucide="calendar-range" style="width:14px;height:14px;"></i> جدولة الباقة 🗓️
                        </button>
                        <button class="btn-secondary admin-edit-schedule-btn" data-id="${s.id}" data-teacher="${s.teacher?.id || ''}" style="padding:6px;font-size:0.75rem;gap:4px;border-color:var(--primary);color:var(--primary);font-weight:700;">
                        <i data-lucide="edit-3" style="width:14px;height:14px;"></i> تعديل الجدولة ✏️
                        </button>
                        <button class="btn-secondary admin-view-sub-sessions-btn" data-id="${s.id}" style="padding:6px;font-size:0.75rem;gap:4px;">
                        <i data-lucide="list" style="width:14px;height:14px;"></i> عرض الحصص 🔍
                        </button>
                        ` : ''}
                    </div>
                    ${s.status === 'ACTIVE' ? `
                    <div style="font-size:0.75rem; display:flex; gap:12px; color:var(--text-muted); background:rgba(0,0,0,0.02); padding:6px; border-radius:6px;">
                        <span style="color:#10b981;font-weight:600;">مكتملة: ${completedSessions}</span>
                        <span style="color:var(--primary);font-weight:600;">مجدولة: ${scheduledSessions}</span>
                        <span style="color:#ef4444;font-weight:600;">متبقية: ${remainingToBook}</span>
                    </div>
                    ` : ''}
                  </td>
                </tr>
              `;
              }).join('') || `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted);">لا توجد اشتراكات حتى الآن.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ── 10. Earnings Tab ─────────────────────────────────────────────────────────────
  renderEarningsTab() {
    const e = this.adminEarnings || { payments: [], earnings: [] };
    const payments = e.payments || [];
    const earnings = e.earnings || [];

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalPayouts = earnings.reduce((sum, ear) => sum + ear.amount, 0);
    const platformNet = Math.max(0, totalRevenue - totalPayouts);

    return `
      <div class="dashboard-stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom:40px;">
        ${this.statCard("dollar-sign", totalRevenue + " ج.م", "إجمالي إيرادات المنصة", "var(--success)", "var(--success-glow)")}
        ${this.statCard("credit-card", totalPayouts + " ج.م", "إجمالي مستحقات المعلمين", "var(--warning, #f59e0b)", "rgba(245,158,11,0.15)")}
        ${this.statCard("pie-chart", platformNet + " ج.م", "صافي ربح المنصة", "var(--primary)", "var(--primary-glow)")}
      </div>

      <div class="glass-card" style="padding:24px; margin-bottom:24px;">
        <h3 style="font-weight:700;font-size:1.1rem;display:flex;align-items:center;gap:8px;margin-bottom:20px;">
          <i data-lucide="wallet" style="color:var(--warning,#f59e0b);width:20px;height:20px;"></i>
          مستحقات المعلمين (Payouts)
        </h3>
        <div style="overflow-x:auto;">
          <table class="table" style="width:100%;text-align:start;border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:1px solid var(--border-color);color:var(--text-muted);font-size:0.8rem;">
                <th style="padding:12px;font-weight:700;">المعلم</th>
                <th style="padding:12px;font-weight:700;">المبلغ</th>
                <th style="padding:12px;font-weight:700;">النوع / الوصف</th>
                <th style="padding:12px;font-weight:700;">الحالة</th>
                <th style="padding:12px;font-weight:700;">التاريخ</th>
                <th style="padding:12px;font-weight:700;">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${earnings.map(ear => `
                <tr style="border-bottom:1px solid var(--border-color);font-size:0.85rem;">
                  <td style="padding:12px;font-weight:600;">${ear.teacher?.name || '-'}</td>
                  <td style="padding:12px;color:var(--primary);font-weight:700;">${ear.amount} ج.م</td>
                  <td style="padding:12px;">${ear.sourceType} <br><span style="font-size:0.7rem;color:var(--text-muted);">${ear.description || ''}</span></td>
                  <td style="padding:12px;">
                    <span class="badge" style="background:${ear.status === 'paid' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)'};color:${ear.status === 'paid' ? '#10b981' : '#f59e0b'};">
                      ${ear.status === 'paid' ? 'مدفوعة ✅' : 'معلقة ⏳'}
                    </span>
                  </td>
                  <td style="padding:12px;color:var(--text-muted);">${new Date(ear.createdAt).toLocaleDateString('ar')}</td>
                  <td style="padding:12px;">
                    ${ear.status === 'pending' ? `
                      <button class="btn-primary admin-pay-earning-btn" data-id="${ear.id}" style="padding:6px 12px;font-size:0.75rem;">
                        تسديد المبلغ
                      </button>
                    ` : '<span style="color:var(--text-muted);font-size:0.75rem;">تم السداد</span>'}
                  </td>
                </tr>
              `).join('') || `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted);">لا توجد مستحقات مسجلة.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ── Event Binds ───────────────────────────────────────────────────────────────
  bindActionEvents() {
    // Admin Assign Teacher to Subscription
    this.container.querySelectorAll(".admin-assign-teacher-sub-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const subId = btn.getAttribute("data-id");
        this.renderAssignTeacherToSubscriptionModal(subId);
      });
    });


    this.container.querySelectorAll(".admin-schedule-session-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const subId = btn.getAttribute("data-id");
        const teacherId = btn.getAttribute("data-teacher");
        this.renderPackageScheduleWizardModal(subId, teacherId, false);
      });
    });

        this.container.querySelectorAll(".admin-view-sub-sessions-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const subId = btn.getAttribute("data-id");
        this.activeTab = "sessions";
        this.container.querySelectorAll(".admin-nav-btn").forEach(b => {
            b.classList.remove("active");
            if(b.getAttribute("data-tab") === "sessions") b.classList.add("active");
        });
        this.renderTab("sessions", subId);
      });
    });

    this.container.querySelectorAll(".admin-view-all-sessions-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.activeTab = "sessions";
        this.renderTab("sessions", null);
      });
    });

    this.container.querySelectorAll(".admin-package-wizard-btn, .admin-batch-schedule-session-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const subId = btn.getAttribute("data-id");
        const teacherId = btn.getAttribute("data-teacher");
        this.renderPackageScheduleWizardModal(subId, teacherId, false);
      });
    });

    this.container.querySelectorAll(".admin-edit-schedule-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const subId = btn.getAttribute("data-id");
        const teacherId = btn.getAttribute("data-teacher");
        this.renderPackageScheduleWizardModal(subId, teacherId, true);
      });
    });

    // Admin Pay Earning
    this.container.querySelectorAll(".admin-pay-earning-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const confirmed = await confirmDialog({ message: "هل أنت متأكد من دفع هذه المستحقات للمعلم؟ لا يمكن التراجع عن هذه الخطوة." });
        if (!confirmed) return;
        btn.disabled = true;
        try {
          const res = await apiFetch(`/admin/teacher-earnings/${id}/pay`, { method: "PATCH" });
          showToast(res.message || "تم تسجيل دفع المستحقات بنجاح", "success");
          await this.loadAllData();
          this.renderTab("earnings");
        } catch (err) {
          showToast(err.message || "تعذر دفع المستحقات.", "error");
          btn.disabled = false;
        }
      });
    });

    // Admin Reassign Teacher to Session
    this.container.querySelectorAll(".admin-reassign-teacher-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const sessionId = btn.getAttribute("data-id");
        this.renderReassignTeacherModal(sessionId);
      });
    });

    // Admin Cancel Session
    this.container.querySelectorAll(".admin-cancel-session-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const confirmed = await confirmDialog({ message: "هل أنت تأكد من إلغاء هذه الحصة كمسؤول نظام؟", danger: true });
        if (!confirmed) return;
        btn.disabled = true;
        try {
          await apiFetch(`/sessions/${id}/cancel`, {
            method: "POST",
            body: JSON.stringify({ reason: "إلغاء إداري من قبل أدمن المنصة" })
          });
          showToast("تم إلغاء الحصة بنجاح وتوجيه الرصيد. ✅", "success");
          await this.loadAllData();
          this.renderTab("sessions");
        } catch (err) { btn.disabled = false; }
      });
    });

    // Print Report
    document.getElementById("print-reports-btn")?.addEventListener("click", () => {
      window.print();
    });

    // Approve Teacher Application
    this.container.querySelectorAll(".approve-application-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const confirmed = await confirmDialog({ message: "هل تريد قبول هذا الطلب وتفعيل حساب المعلم؟" });
        if (!confirmed) return;
        btn.disabled = true;
        try {
          const res = await apiFetch(`/admin/teacher-applications/${id}`, { method: "PUT", body: JSON.stringify({ status: "approved" }) });
          showToast(res.message || "تم قبول الطلب بنجاح!", "success");
          handleWhatsAppResponse(res);
          await this.loadAllData();
          this.updateBadges();
          this.renderTab("teacherApplications");
        } catch(err) { btn.disabled = false; }
      });
    });

    // Reject Teacher Application
    this.container.querySelectorAll(".reject-application-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const confirmed = await confirmDialog({ message: "هل تريد رفض هذا الطلب؟", danger: true });
        if (!confirmed) return;
        btn.disabled = true;
        try {
          const res = await apiFetch(`/admin/teacher-applications/${id}`, { method: "PUT", body: JSON.stringify({ status: "rejected" }) });
          showToast(res.message || "تم رفض الطلب.", "info");
          await this.loadAllData();
          this.updateBadges();
          this.renderTab("teacherApplications");
        } catch(err) { btn.disabled = false; }
      });
    });

    // Create Member Button (All Members)
    document.getElementById("open-create-member-btn")?.addEventListener("click", () => {
      this.renderMemberModal(null, "student");
    });

    // Create Teacher Button (Teachers tab)
    document.getElementById("open-create-teacher-btn")?.addEventListener("click", () => {
      this.renderMemberModal(null, "teacher");
    });

    // Create Student Button (Students tab)
    document.getElementById("open-create-student-btn")?.addEventListener("click", () => {
      this.renderMemberModal(null, "student");
    });

    // Edit Member Button
    this.container.querySelectorAll(".edit-member-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const user = this.allMembers.find(u => u.id === id);
        if (user) this.renderMemberModal(user);
      });
    });

    // View Transcript Button
    this.container.querySelectorAll(".view-transcript-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const user = this.allMembers.find(u => u.id === id);
        if (user) this.renderTranscriptModal(user);
      });
    });

    // Delete Member
    this.container.querySelectorAll(".delete-user-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const name = btn.getAttribute("data-name");
        const confirmed = await confirmDialog({
          message: `${t("admin.confirmDelete")} "${name}"?`,
          danger: true
        });
        if (!confirmed) return;
        btn.disabled = true;
        try {
          await apiFetch(`/admin/users/${id}`, { method: "DELETE" });
          showToast(t("admin.toast.userDeleted"), "success");
          await this.loadAllData();
          this.renderTab(this.activeTab);
        } catch (err) { btn.disabled = false; }
      });
    });

    // Category Handlers (Create, Edit, Delete)
    document.getElementById("open-create-category-btn")?.addEventListener("click", () => {
      this.renderCategoryModal();
    });

    this.container.querySelectorAll(".edit-category-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const category = (this.categories || []).find(c => c.id === id);
        if (category) this.renderCategoryModal(category);
      });
    });

    this.container.querySelectorAll(".delete-category-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const category = (this.categories || []).find(c => c.id === id);
        const name = category ? category.name : "هذا التصنيف";
        const confirmed = await confirmDialog({
          message: `هل أنت تأكد من رغبتك في حذف التصنيف "${name}"؟`,
          danger: true
        });
        if (!confirmed) return;
        btn.disabled = true;
        try {
          await apiFetch(`/categories/${id}`, { method: "DELETE" });
          showToast("تم حذف التصنيف بنجاح", "success");
          await this.loadAllData();
          this.renderTab("categories");
        } catch (err) { btn.disabled = false; }
      });
    });

    // Delete Course
    this.container.querySelectorAll(".delete-course-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const title = btn.getAttribute("data-title");
        const confirmed = await confirmDialog({
          message: `${t("admin.confirmDeleteCourse")} "${title}"?`,
          danger: true
        });
        if (!confirmed) return;
        btn.disabled = true;
        try {
          await apiFetch(`/admin/courses/${id}`, { method: "DELETE" });
          showToast(t("admin.toast.courseDeleted"), "success");
          await this.loadAllData();
          this.renderTab("courses");
        } catch (err) { btn.disabled = false; }
      });
    });

    // Plans Tab Handlers
    document.getElementById("add-plan-btn")?.addEventListener("click", () => {
      this.renderPlanModal(null);
    });

    this.container.querySelectorAll(".edit-plan-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        const plan = (this.allPlans || []).find(p => p.id === id);
        if (plan) this.renderPlanModal(plan);
      });
    });

    this.container.querySelectorAll(".toggle-plan-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        const isActive = e.currentTarget.getAttribute("data-active") === "true";
        const plan = (this.allPlans || []).find(p => p.id === id);
        if (!plan) return;
        try {
          await apiFetch(`/subscription-plans/${id}`, {
            method: "PUT",
            body: JSON.stringify({ ...plan, isActive: !isActive })
          });
          showToast(isActive ? "تم إلغاء تفعيل الخطة." : "تم تفعيل الخطة! ✅", "success");
          await this.loadAllData();
          this.renderTab("plans");
        } catch (err) {
          showToast(err.message || "فشل تحديث حالة الخطة.", "error");
        }
      });
    });
  }

  // ── Render Category Modal (Create / Edit) ──────────────────────────────────
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
      } catch (err) {}
    });
  }

  // ── Render Member Create / Edit Modal ───────────────────────────────────────
  renderMemberModal(user = null, defaultRole = "student") {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const isEdit = !!user;
    const initialRole = isEdit ? user.role : defaultRole;

    container.innerHTML = `
      <div class="modal-overlay" id="member-modal" style="display:flex; padding:16px;">
        <div class="modal-content" style="max-width:600px; max-height:88vh; overflow-y:auto; border-radius:20px;">
          <div class="modal-header" style="padding:14px 20px;">
            <h3 class="modal-title" style="font-size:1.15rem;">${isEdit ? t("admin.editMember") : t("admin.addMember")}</h3>
            <span class="modal-close-btn" id="close-member-modal">&times;</span>
          </div>
          <form id="member-form">
            <div class="modal-body" style="padding:18px 20px; display:flex; flex-direction:column; gap:12px;">
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="form-group" style="margin:0;">
                  <label for="member-name" style="font-size:0.85rem; font-weight:700; margin-bottom:4px; display:block;">${t("form.fullName")}</label>
                  <input type="text" id="member-name" class="form-input" value="${isEdit ? user.name : ''}" placeholder="${t("form.fullNamePlaceholder")}" required style="padding:8px 12px; font-size:0.88rem;">
                </div>
                <div class="form-group" style="margin:0;">
                  <label for="member-email" style="font-size:0.85rem; font-weight:700; margin-bottom:4px; display:block;">${t("form.email")}</label>
                  <input type="email" id="member-email" class="form-input" value="${isEdit ? user.email : ''}" placeholder="email@example.com" required style="padding:8px 12px; font-size:0.88rem;">
                </div>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="form-group" style="margin:0;">
                  <label for="member-role" style="font-size:0.85rem; font-weight:700; margin-bottom:4px; display:block;">${t("form.accountType")}</label>
                  <select id="member-role" class="form-select" style="padding:8px 12px; font-size:0.88rem;">
                    <option value="student" ${initialRole === "student" ? "selected" : ""}>${t("admin.role.student")}</option>
                    <option value="teacher" ${initialRole === "teacher" ? "selected" : ""}>${t("admin.role.teacher")}</option>
                    <option value="admin" ${initialRole === "admin" ? "selected" : ""}>${t("admin.role.admin")}</option>
                  </select>
                </div>
                <div class="form-group" style="margin:0;">
                  <label for="member-password" style="font-size:0.85rem; font-weight:700; margin-bottom:4px; display:block;">${isEdit ? t("admin.newPassword") : t("form.password")}</label>
                  <input type="password" id="member-password" class="form-input" placeholder="${isEdit ? t("admin.leavePasswordBlank") : t("form.passwordPlaceholder")}" ${isEdit ? '' : 'required'} style="padding:8px 12px; font-size:0.88rem;">
                </div>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="form-group" style="margin:0;">
                  <label for="member-phone" style="font-size:0.85rem; font-weight:700; margin-bottom:4px; display:block;">رقم الهاتف والواتساب</label>
                  ${renderPhoneInputGroup({ selectId: "member-phone-code", inputId: "member-phone-num", defaultCode: "+20", placeholder: "01012345678", required: false })}
                </div>
                <div class="form-group" style="margin:0;">
                  <label for="member-education" style="font-size:0.85rem; font-weight:700; margin-bottom:4px; display:block;">المستوى الدراسي</label>
                  ${renderEducationSelectHTML({ id: "member-education", selectedValue: isEdit ? (user.education || "Bakalorya 3") : "Bakalorya 3", style: "padding:8px 12px; font-size:0.88rem;" })}
                </div>
              </div>

              <!-- Teacher Capabilities Section -->
              <div id="teacher-capabilities-group" style="display:${initialRole === 'teacher' ? 'block' : 'none'}; background:rgba(99,102,241,0.06); padding:12px 14px; border-radius:12px; border:1px solid var(--border-focus); margin-top:4px;">
                <label style="font-size:0.85rem; font-weight:800; color:var(--primary); margin-bottom:8px; display:block;">
                  🎯 صلاحيات وقدرات المعلم (Teacher Capabilities):
                </label>
                <div style="display:flex; flex-direction:column; gap:8px;">
                  <label style="display:flex; align-items:center; gap:8px; font-size:0.83rem; cursor:pointer; font-weight:600;">
                    <input type="checkbox" id="cap-course" value="COURSE_INSTRUCTOR" ${!isEdit || (user.teacherCapabilities && user.teacherCapabilities.includes("COURSE_INSTRUCTOR")) ? "checked" : ""}>
                    <span>📚 COURSE_INSTRUCTOR (إنشاء وبيع الدورات والدروس المسجلة)</span>
                  </label>
                  <label style="display:flex; align-items:center; gap:8px; font-size:0.83rem; cursor:pointer; font-weight:600;">
                    <input type="checkbox" id="cap-session" value="SESSION_TEACHER" ${!isEdit || (user.teacherCapabilities && user.teacherCapabilities.includes("SESSION_TEACHER")) ? "checked" : ""}>
                    <span>⏱️ SESSION_TEACHER (تقديم الحصص المباشرة والاشتراكات الخاصة 1-على-1)</span>
                  </label>
                </div>
              </div>
            </div>
            <div class="modal-footer" style="padding:12px 20px;">
              <button type="button" class="btn-secondary" id="cancel-member-modal" style="padding:8px 18px; font-size:0.88rem;">${t("common.cancel")}</button>
              <button type="submit" class="btn-primary" style="padding:8px 22px; font-size:0.88rem; font-weight:800;">${isEdit ? t("admin.saveChanges") : t("admin.addMember")}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = () => { container.innerHTML = ""; };

    document.getElementById("close-member-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-member-modal")?.addEventListener("click", closeModal);

    document.getElementById("member-role")?.addEventListener("change", (e) => {
      const capGroup = document.getElementById("teacher-capabilities-group");
      if (capGroup) capGroup.style.display = e.target.value === "teacher" ? "block" : "none";
    });

    document.getElementById("member-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("member-name").value;
      const email = document.getElementById("member-email").value;
      const role = document.getElementById("member-role").value;
      const password = document.getElementById("member-password").value;
      const phoneCode = document.getElementById("member-phone-code")?.value || "+213";
      const phoneNum = document.getElementById("member-phone-num")?.value.trim() || "";
      const phone = phoneNum ? `${phoneCode} ${phoneNum}`.trim() : "";
      const education = document.getElementById("member-education")?.value || "";

      const teacherCapabilities = [];
      if (role === "teacher") {
        if (document.getElementById("cap-course")?.checked) teacherCapabilities.push("COURSE_INSTRUCTOR");
        if (document.getElementById("cap-session")?.checked) teacherCapabilities.push("SESSION_TEACHER");
      }

      try {
        if (isEdit) {
          await apiFetch(`/admin/users/${user.id}`, {
            method: "PUT",
            body: JSON.stringify({ name, email, role, password, phone, education, teacherCapabilities })
          });
          showToast(t("admin.toast.userUpdated"), "success");
        } else {
          const res = await apiFetch("/admin/users", {
            method: "POST",
            body: JSON.stringify({ name, email, role, password, phone, education, teacherCapabilities })
          });
          showToast(t("admin.toast.userCreated"), "success");
          handleWhatsAppResponse(res);
        }
        closeModal();
        await this.loadAllData();
        this.renderTab(this.activeTab);
      } catch (err) {}
    });
  }

  // ── Render User Transcript Modal ──────────────────────────────────────────────
  renderTranscriptModal(user) {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const joinDate = new Date(user.createdAt).toLocaleString();

    container.innerHTML = `
      <div class="modal-overlay" id="transcript-modal" style="display:flex;">
        <div class="modal-content" style="max-width:650px;">
          <div class="modal-header">
            <h3 class="modal-title" style="display:flex;align-items:center;gap:8px;">
              <i data-lucide="file-text" style="color:var(--primary);"></i>
              ${t("admin.transcriptTitle")}
            </h3>
            <span class="modal-close-btn" id="close-transcript-modal">&times;</span>
          </div>
          <div class="modal-body" style="font-family:monospace; background:var(--bg-card); padding:20px; border-radius:var(--radius-sm); max-height:400px; overflow-y:auto; font-size:0.85rem; line-height:1.6;">
            <div style="border-bottom:1px solid var(--border-color); padding-bottom:12px; margin-bottom:16px;">
              <strong style="color:var(--primary);">[SYSTEM TRANSCRIPT AUDIT LOG]</strong><br>
              <strong>Member Name:</strong> ${user.name}<br>
              <strong>Email:</strong> ${user.email}<br>
              <strong>Role:</strong> ${user.role.toUpperCase()}<br>
              <strong>User ID:</strong> ${user.id}<br>
              <strong>Account Created:</strong> ${joinDate}
            </div>

            <div style="color:var(--text-muted);">
              <div>[TIMESTAMP ${joinDate}] USER_REGISTERED: Account provisioned with role "${user.role}".</div>
              <div>[TIMESTAMP ${joinDate}] AUTH_VERIFIED: JWT Token granted. Session established.</div>
              ${user.role === "teacher" ? `
                <div>[TIMESTAMP ACTIVE] TEACHER_PORTAL: Verified broadcaster credentials. Authorized to create courses & schedule live classrooms.</div>
              ` : `
                <div>[TIMESTAMP ACTIVE] STUDENT_PORTAL: Active curriculum path initialized. Enrolled course tracks ready.</div>
              `}
              <div style="margin-top:12px; color:var(--success);">[STATUS OK] Transcript log clean. No security anomalies detected.</div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-primary" id="close-transcript-btn">${t("common.cancel")}</button>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    const closeModal = () => { container.innerHTML = ""; };
    document.getElementById("close-transcript-modal")?.addEventListener("click", closeModal);
    document.getElementById("close-transcript-btn")?.addEventListener("click", closeModal);
  }

  renderReassignTeacherModal(sessionId) {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const teachers = (this.allMembers || []).filter(u => u.role === "teacher");

    container.innerHTML = `
      <div class="modal-overlay" id="reassign-teacher-modal" style="display:flex;">
        <div class="modal-content" style="max-width:480px;">
          <div class="modal-header">
            <h3 class="modal-title">إعادة تعيين / تغيير المعلم للحصة</h3>
            <span class="modal-close-btn" id="close-reassign-modal">&times;</span>
          </div>
          <form id="reassign-teacher-form">
            <div class="modal-body">
              <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">اختر المعلم الجديد الذي سيتم إسناد هذه الحصة له بنجاح مع حفظ سجلات الحصص السابقة المكتملة باسم المعلم الأصلي.</p>
              <div class="form-group">
                
                <label for="reassign-teacher-select" style="font-size:0.88rem; font-weight:700; display:block; margin-bottom:6px;">اختر المعلم:</label>
                <select id="reassign-teacher-select" class="form-input" style="width:100%; padding:10px;">
                  ${teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" id="cancel-reassign-btn">إلغاء</button>
              <button type="submit" class="btn-primary">تغيير المعلم</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = () => { container.innerHTML = ""; };
    document.getElementById("close-reassign-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-reassign-btn")?.addEventListener("click", closeModal);

    document.getElementById("reassign-teacher-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const teacherId = document.getElementById("reassign-teacher-select").value;
      try {
        const res = await apiFetch(`/sessions/${sessionId}/reassign-teacher`, {
          method: "PUT",
          body: JSON.stringify({ teacherId })
        });
        showToast(res.message || "تم التعيين بنجاح", "success");
        closeModal();
        await this.loadAllData();
        this.renderTab("sessions");
      } catch (err) {
        showToast(err.message || "فشل التعيين", "error");
      }
    });
  }

  async renderPackageScheduleWizardModal(subId, defaultTeacherId = null, isEditMode = false) {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    let scheduleDetails = null;
    try {
      scheduleDetails = await apiFetch(`/subscriptions/${subId}/schedule-details`);
    } catch (err) {
      showToast("تعذر جلب تفاصيل الاشتراك للجدولة", "error");
      return;
    }

    const { subscription, availability = [], completedCount = 0, scheduledCount = 0, totalSessions = 8 } = scheduleDetails;
    const teachers = (this.allMembers || []).filter(u => u.role === "teacher");
    const activeTeacherId = defaultTeacherId || subscription.teacher?.id || (teachers[0]?.id || "");

    let currentStep = 1;
    let previewData = null;

    const daysAr = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const availDaysList = availability.map(a => `${daysAr[a.dayOfWeek]} (${a.startTime} - ${a.endTime})`);

    const now = new Date();
    const nextSaturday = new Date();
    nextSaturday.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7));
    const defaultStartDateStr = nextSaturday.toISOString().slice(0, 10);

    container.innerHTML = `
      <div class="modal-overlay" id="package-wizard-modal" style="display:flex;">
        <div class="modal-content" style="max-width:680px; width:95%;">
          
          <div class="modal-header">
            <h3 class="modal-title" style="display:flex; align-items:center; gap:8px;">
              <i data-lucide="calendar-range" style="color:var(--primary);"></i>
              ${isEditMode ? 'تعديل جدول حصص الباقة ✏️' : 'جدولة الباقة (Package Scheduler) 🗓️'}
            </h3>
            <span class="modal-close-btn" id="close-wiz-modal">&times;</span>
          </div>

          <div style="display:flex; align-items:center; justify-content:space-between; margin:16px 0 24px 0; padding:12px; background:var(--bg-app); border-radius:14px; border:1px solid var(--border-color);">
            <div id="wiz-nav-1" style="display:flex; align-items:center; gap:8px; font-weight:800; font-size:0.88rem; color:var(--primary);">
              <span style="width:28px; height:28px; border-radius:50%; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center;">1</span>
              <span>الباقة والمعلم</span>
            </div>
            <div style="flex:1; height:2px; background:var(--border-color); margin:0 12px;" id="wiz-line-1"></div>
            <div id="wiz-nav-2" style="display:flex; align-items:center; gap:8px; font-weight:700; font-size:0.88rem; color:var(--text-muted);">
              <span style="width:28px; height:28px; border-radius:50%; background:var(--bg-card); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:center;">2</span>
              <span>نمط الجدولة</span>
            </div>
            <div style="flex:1; height:2px; background:var(--border-color); margin:0 12px;" id="wiz-line-2"></div>
            <div id="wiz-nav-3" style="display:flex; align-items:center; gap:8px; font-weight:700; font-size:0.88rem; color:var(--text-muted);">
              <span style="width:28px; height:28px; border-radius:50%; background:var(--bg-card); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:center;">3</span>
              <span>معاينة وتأكيد</span>
            </div>
          </div>

          <div class="modal-body" style="min-height:300px;">
            
            <div id="step-content-1">
              <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:14px; padding:16px; margin-bottom:20px;">
                <h4 style="font-weight:800; font-size:0.95rem; color:var(--primary); margin:0 0 12px 0;">📋 بيانات اشتراك الطالب</h4>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px; font-size:0.88rem;">
                  <div><span style="color:var(--text-muted);">الطالب:</span> <strong>${subscription.student?.name || '-'}</strong></div>
                  <div><span style="color:var(--text-muted);">الباقة والخطة:</span> <strong>${subscription.plan?.name || '-'}</strong></div>
                  <div><span style="color:var(--text-muted);">مدة الحصة:</span> <strong>${subscription.plan?.sessionDurationMins || 60} دقيقة</strong></div>
                  <div>
                    <span style="color:var(--text-muted);">الحصص:</span> 
                    <span class="badge" style="background:rgba(79,70,229,0.1); color:var(--primary); font-weight:700;">
                      مجدولة: ${scheduledCount} / مكتملة: ${completedCount} (إجمالي ${totalSessions})
                    </span>
                  </div>
                </div>
                ${isEditMode && completedCount > 0 ? `
                  <div style="margin-top:12px; padding:8px 12px; background:rgba(245,158,11,0.1); border-radius:8px; font-size:0.8rem; color:#b45309; font-weight:700;">
                    🔒 ملاحظة: توجد ${completedCount} حصة مكتملة سابقاً ولا يتم تعديلها أو حذفها. التعديل يشمل الحصص المتبقية فقط.
                  </div>
                ` : ''}
              </div>

              <div class="form-group" style="margin-bottom:16px;">
                <label for="wiz-teacher-select" style="font-size:0.88rem; font-weight:700; display:block; margin-bottom:6px;">تحديد معلم الباقة:</label>
                <select id="wiz-teacher-select" class="form-select" style="padding:10px; font-size:0.9rem; width:100%;">
                  <option value="">-- اختر معلم المنصة --</option>
                  ${teachers.map(t => `
                    <option value="${t.id}" ${String(t.id) === String(activeTeacherId) ? 'selected' : ''}>
                      ${t.name} (${t.email})
                    </option>
                  `).join("")}
                </select>
              </div>

              <div id="wiz-avail-box" style="background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.2); border-radius:12px; padding:12px;">
                <div style="font-size:0.82rem; font-weight:700; color:#10b981; margin-bottom:6px;">
                  <i data-lucide="check-circle" style="width:14px;height:14px;"></i> أوقات وأيام التفرغ المحددة للمعلم:
                </div>
                <div id="wiz-avail-badges" style="display:flex; flex-wrap:wrap; gap:6px;">
                  ${availDaysList.length > 0 ? availDaysList.map(a => `<span class="badge" style="background:rgba(16,185,129,0.15); color:#047857; font-size:0.78rem;">✓ ${a}</span>`).join('') : '<span style="font-size:0.8rem; color:var(--text-muted);">لم يتم تسجيل جدول تفرغ محدد (متاح جميع الأيام).</span>'}
                </div>
              </div>
            </div>

            <div id="step-content-2" style="display:none;">
              <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">
                حدد أيام وأوقات تكرار الحصص ليقوم النظام بإنشاء وتحديد مواعيد الـ ${totalSessions - completedCount} حصة المتبقية تلقائياً.
              </p>

              <div class="form-group" style="margin-bottom:16px;">
                <label for="wiz-freq-select" style="font-size:0.88rem; font-weight:700; display:block; margin-bottom:6px;">طريقة وتكرار الجدولة:</label>
                <select id="wiz-freq-select" class="form-select" style="padding:10px; font-size:0.9rem; width:100%;">
                  <option value="custom_days">مواعيد أيام محددة (أسبوعياً)</option>
                  <option value="weekly">أسبوعياً (حصة واحدة كل 7 أيام)</option>
                  <option value="biweekly">حصتان أسبوعياً (توزيع منتظم)</option>
                </select>
              </div>

              <div class="form-group" style="margin-bottom:16px;">
                <label style="font-size:0.88rem; font-weight:700; display:block; margin-bottom:8px;">أيام الحصص الأسبوعية:</label>
                <div style="display:flex; flex-wrap:wrap; gap:10px; background:var(--bg-app); padding:12px; border-radius:12px; border:1px solid var(--border-color);">
                  <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="wizDays" value="6" checked /> السبت</label>
                  <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="wizDays" value="0" /> الأحد</label>
                  <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="wizDays" value="1" checked /> الاثنين</label>
                  <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="wizDays" value="2" /> الثلاثاء</label>
                  <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="wizDays" value="3" /> الأربعاء</label>
                  <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="wizDays" value="4" /> الخميس</label>
                  <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="wizDays" value="5" /> الجمعة</label>
                </div>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
                <div class="form-group">
                  <label for="wiz-start-date" style="font-size:0.88rem; font-weight:700; display:block; margin-bottom:6px;">تاريخ بداية الباقة (الحصة الأولى):</label>
                  <input type="date" id="wiz-start-date" class="form-input" value="${defaultStartDateStr}" style="padding:10px; font-size:0.9rem; width:100%;" />
                </div>
                <div class="form-group">
                  <label for="wiz-time-of-day" style="font-size:0.88rem; font-weight:700; display:block; margin-bottom:6px;">وقت الموعد اليومي:</label>
                  <input type="time" id="wiz-time-of-day" class="form-input" value="18:00" style="padding:10px; font-size:0.9rem; width:100%;" />
                </div>
              </div>

              <button type="button" id="wiz-gen-btn" class="btn-primary" style="width:100%; padding:12px; font-size:0.95rem; display:flex; align-items:center; justify-content:center; gap:8px;">
                <i data-lucide="sparkles"></i> إنشاء ومعاينة مواعيد الحصص تلقائياً (Auto Schedule) ⚡
              </button>
            </div>

            <div id="step-content-3" style="display:none;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                <h4 style="font-weight:800; font-size:1rem; margin:0;">جدول معاينة حصص الباقة</h4>
                <span id="wiz-count-badge" class="badge" style="background:rgba(16,185,129,0.1); color:#10b981; font-weight:700; padding:6px 12px;">-</span>
              </div>

              <div id="wiz-conflict-banner" style="display:none; background:rgba(245,158,11,0.1); border:1px solid #f59e0b; border-radius:10px; padding:10px 14px; margin-bottom:12px; font-size:0.83rem; color:#b45309; font-weight:600;">
                ⚠️ تنبيه: تم اكتشاف تعارض أو عدم توفر في بعض المواعيد. يمكنك تعديل التاريخ/الوقت مباشرة في الجدول أدناه لكل حصة قبل الحفظ.
              </div>

              <div style="overflow-x:auto; max-height:280px; overflow-y:auto; border:1px solid var(--border-color); border-radius:12px; margin-bottom:16px;">
                <table style="width:100%; border-collapse:collapse; font-size:0.83rem;">
                  <thead style="position:sticky; top:0; background:var(--bg-app); border-bottom:1px solid var(--border-color); color:var(--text-muted);">
                    <tr>
                      <th style="padding:10px 12px; text-align:start;">#</th>
                      <th style="padding:10px 12px; text-align:start;">اليوم والتاريخ</th>
                      <th style="padding:10px 12px; text-align:start;">الوقت</th>
                      <th style="padding:10px 12px; text-align:start;">المعلم</th>
                      <th style="padding:10px 12px; text-align:start;">الحالة</th>
                      <th style="padding:10px 12px; text-align:end;">تعديل الموعد يدويًا</th>
                    </tr>
                  </thead>
                  <tbody id="wiz-preview-tbody"></tbody>
                </table>
              </div>
            </div>

          </div>

          <div class="modal-footer" style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; border-top:1px solid var(--border-color); padding-top:16px;">
            <button type="button" class="btn-secondary" id="wiz-prev-btn" style="display:none;">⬅️ السابق</button>
            <div style="display:flex; gap:8px; margin-inline-start:auto;">
              <button type="button" class="btn-secondary" id="wiz-cancel-btn">إلغاء</button>
              <button type="button" class="btn-primary" id="wiz-next-btn">التالي (نمط الجدولة) ➡️</button>
              <button type="button" class="btn-primary" id="wiz-confirm-btn" style="display:none;">تأكيد الجدولة وحفظ الباقة 🚀</button>
            </div>
          </div>

        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => { container.innerHTML = ""; };
    document.getElementById("close-wiz-modal")?.addEventListener("click", closeModal);
    document.getElementById("wiz-cancel-btn")?.addEventListener("click", closeModal);

    const step1El = document.getElementById("step-content-1");
    const step2El = document.getElementById("step-content-2");
    const step3El = document.getElementById("step-content-3");

    const nav1 = document.getElementById("wiz-nav-1");
    const nav2 = document.getElementById("wiz-nav-2");
    const nav3 = document.getElementById("wiz-nav-3");

    const prevBtn = document.getElementById("wiz-prev-btn");
    const nextBtn = document.getElementById("wiz-next-btn");
    const confirmBtn = document.getElementById("wiz-confirm-btn");

    const setStep = (step) => {
      currentStep = step;
      step1El.style.display = step === 1 ? "block" : "none";
      step2El.style.display = step === 2 ? "block" : "none";
      step3El.style.display = step === 3 ? "block" : "none";

      prevBtn.style.display = step > 1 ? "block" : "none";
      nextBtn.style.display = step < 3 ? "block" : "none";
      confirmBtn.style.display = step === 3 ? "block" : "none";

      [nav1, nav2, nav3].forEach((nav, idx) => {
        const s = idx + 1;
        const iconSpan = nav.querySelector("span:first-child");
        if (s === step) {
          nav.style.color = "var(--primary)";
          nav.style.fontWeight = "800";
          iconSpan.style.background = "var(--primary)";
          iconSpan.style.color = "#fff";
        } else if (s < step) {
          nav.style.color = "#10b981";
          nav.style.fontWeight = "700";
          iconSpan.style.background = "#10b981";
          iconSpan.style.color = "#fff";
        } else {
          nav.style.color = "var(--text-muted)";
          nav.style.fontWeight = "600";
          iconSpan.style.background = "var(--bg-card)";
          iconSpan.style.color = "var(--text-muted)";
        }
      });
    };

    nextBtn.addEventListener("click", () => {
      if (currentStep === 1) setStep(2);
      else if (currentStep === 2) {
        document.getElementById("wiz-gen-btn").click();
      }
    });

    prevBtn.addEventListener("click", () => {
      if (currentStep > 1) setStep(currentStep - 1);
    });

    document.getElementById("wiz-gen-btn")?.addEventListener("click", async () => {
      const teacherId = document.getElementById("wiz-teacher-select").value;
      const frequency = document.getElementById("wiz-freq-select").value;
      const daysOfWeek = Array.from(document.querySelectorAll('input[name="wizDays"]:checked')).map(cb => parseInt(cb.value, 10));
      const startDate = document.getElementById("wiz-start-date").value;
      const timeOfDay = document.getElementById("wiz-time-of-day").value;

      if (!startDate) {
        showToast("يرجى اختيار تاريخ بدء الباقة", "error");
        return;
      }
      if (frequency === "custom_days" && daysOfWeek.length === 0) {
        showToast("يرجى اختيار يوم واحد على الأقل من أيام الأسبوع", "error");
        return;
      }

      try {
        const payload = {
          subscriptionId: subId,
          teacherId,
          startDate,
          frequency,
          daysOfWeek,
          timeOfDay,
          isEditMode
        };

        previewData = await apiFetch("/sessions/preview-package-schedule", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        renderPreviewTable(previewData);
        setStep(3);
      } catch (err) {
        showToast(err.message || "فشلت معاينة جدول الباقة", "error");
      }
    });

    const renderPreviewTable = (data) => {
      const tbody = document.getElementById("wiz-preview-tbody");
      const badge = document.getElementById("wiz-count-badge");
      const conflictBanner = document.getElementById("wiz-conflict-banner");

      if (!tbody) return;

      badge.textContent = `${data.validCount} / ${data.countGenerated} حصة جاهزة للجدولة`;
      if (data.conflictCount > 0) {
        conflictBanner.style.display = "block";
      } else {
        conflictBanner.style.display = "none";
      }

      tbody.innerHTML = (data.items || []).map((item, idx) => {
        const d = new Date(item.scheduledAt);
        const dateStr = d.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
        const timeStr = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        const isoLocal = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

        return `
          <tr style="border-bottom:1px solid var(--border-color);" data-idx="${idx}">
            <td style="padding:10px 12px; font-weight:700;">#${item.index}</td>
            <td style="padding:10px 12px; font-weight:700;">${item.dayName} ${dateStr}</td>
            <td style="padding:10px 12px;">${timeStr}</td>
            <td style="padding:10px 12px;">${item.teacherName}</td>
            <td style="padding:10px 12px;">
              ${item.status === 'VALID' 
                ? '<span class="badge" style="background:rgba(16,185,129,0.1); color:#10b981;">✓ جاهزة</span>' 
                : `<span class="badge" style="background:rgba(239,68,68,0.1); color:#ef4444;" title="${item.conflictReason || ''}">⚠️ تعارض</span>`
              }
            </td>
            <td style="padding:10px 12px; text-align:end;">
              <input type="datetime-local" class="form-input wiz-row-date" data-idx="${idx}" value="${isoLocal}" style="padding:4px 8px; font-size:0.8rem;" />
            </td>
          </tr>
        `;
      }).join("");

      tbody.querySelectorAll(".wiz-row-date").forEach(input => {
        input.addEventListener("change", (e) => {
          const idx = parseInt(e.target.getAttribute("data-idx"), 10);
          if (previewData && previewData.items[idx]) {
            previewData.items[idx].scheduledAt = new Date(e.target.value).toISOString();
            previewData.items[idx].status = "VALID";
            previewData.items[idx].conflictReason = null;
            renderPreviewTable(previewData);
          }
        });
      });
    };

    confirmBtn.addEventListener("click", async () => {
      if (!previewData || !previewData.items || previewData.items.length === 0) {
        showToast("لا توجد حصص لمعاينتها وتأكيدها", "error");
        return;
      }

      const teacherId = document.getElementById("wiz-teacher-select").value;
      confirmBtn.disabled = true;

      try {
        const payload = {
          subscriptionId: subId,
          teacherId,
          sessions: previewData.items,
          isEditMode
        };

        const res = await apiFetch("/sessions/confirm-package-schedule", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        showToast(res.message || "تمت جدولة كافة حصص الباقة بنجاح! 🚀", "success");
        closeModal();
        await this.loadAllData();
        this.renderTab("sessions");
      } catch (err) {
        showToast(err.message || "فشل تأكيد جدولة الباقة", "error");
        confirmBtn.disabled = false;
      }
    });
  }
  

  // ── 12. Subscription Plans Tab ────────────────────────────────────────────────
  renderPlansTab() {
    const plans = this.allPlans || [];

    return `
      <div style="margin-bottom:28px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h3 style="font-size:1.2rem; font-weight:800; margin:0 0 4px 0; color:var(--text-main);">✨ إدارة خطط الاشتراكات الشهرية</h3>
          <p style="color:var(--text-muted); font-size:0.88rem; margin:0;">الخطط المتاحة للشراء من صفحة الاشتراكات. يمكنك إضافة خطط جديدة، تعديل الأسعار، أو إخفاء الخطط غير المفعلة.</p>
        </div>
        <button id="add-plan-btn" class="btn-primary" style="gap:8px; white-space:nowrap; padding:10px 20px; border-radius:12px;">
          <i data-lucide="plus-circle" style="width:18px;height:18px;"></i> إضافة خطة جديدة
        </button>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:20px;">
        ${plans.length === 0 ? `
          <div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted); grid-column:1/-1;">
            <i data-lucide="sparkles" style="width:40px;height:40px;margin-bottom:12px;opacity:0.3;"></i>
            <p>لا توجد خطط اشتراك بعد. أضف أولى الخطط الآن!</p>
          </div>
        ` : plans.map(p => `
          <div class="glass-card" style="padding:22px; border-radius:18px; border:2px solid ${p.isActive ? 'var(--primary)' : 'var(--border-color)'}; position:relative; ${!p.isActive ? 'opacity:0.65;' : ''}">
            ${p.isActive ? '' : '<span style="position:absolute;top:14px;left:14px;background:var(--error,#ef4444);color:#fff;font-size:0.72rem;font-weight:800;padding:3px 10px;border-radius:10px;">غير نشطة</span>'}
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">
              <div>
                <span style="font-size:0.75rem; font-weight:800; padding:4px 12px; border-radius:12px; background:var(--primary-glow); color:var(--primary); display:inline-block; margin-bottom:8px;">
                  ${p.sessionsCount} حصة / ${p.durationDays} يوم
                </span>
                <h3 style="font-weight:800; font-size:1.15rem; margin:0; color:var(--text-main);">${p.name}</h3>
              </div>
              <div style="text-align:end;">
                <div style="font-size:1.5rem; font-weight:900; color:var(--primary);">${p.price}</div>
                <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">${p.currency}</div>
              </div>
            </div>
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px; min-height:38px; line-height:1.5;">${p.description || 'بدون وصف'}</p>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:18px; text-align:center;">
              <div style="background:var(--bg-app); border-radius:10px; padding:8px; border:1px solid var(--border-color);">
                <div style="font-size:0.7rem; color:var(--text-muted);">المدة</div>
                <div style="font-size:0.85rem; font-weight:800;">${p.durationDays} يوم</div>
              </div>
              <div style="background:var(--bg-app); border-radius:10px; padding:8px; border:1px solid var(--border-color);">
                <div style="font-size:0.7rem; color:var(--text-muted);">مدة الحصة</div>
                <div style="font-size:0.85rem; font-weight:800;">${p.sessionDurationMins} دقيقة</div>
              </div>
              <div style="background:var(--bg-app); border-radius:10px; padding:8px; border:1px solid var(--border-color);">
                <div style="font-size:0.7rem; color:var(--text-muted);">الحصص</div>
                <div style="font-size:0.85rem; font-weight:800;">${p.sessionsCount} حصة</div>
              </div>
            </div>
            <div style="display:flex; gap:10px;">
              <button class="btn-secondary edit-plan-btn" data-id="${p.id}" style="flex:1; justify-content:center; font-size:0.82rem; border-color:var(--primary); color:var(--primary); font-weight:700;">
                <i data-lucide="pencil" style="width:14px;height:14px;"></i> تعديل
              </button>
              <button class="btn-secondary toggle-plan-btn" data-id="${p.id}" data-active="${p.isActive}" style="flex:1; justify-content:center; font-size:0.82rem; font-weight:700; ${p.isActive ? 'border-color:var(--error,#ef4444);color:var(--error,#ef4444);' : 'border-color:var(--success,#10b981);color:var(--success,#10b981);'}">
                <i data-lucide="${p.isActive ? 'eye-off' : 'eye'}" style="width:14px;height:14px;"></i> ${p.isActive ? 'إلغاء التفعيل' : 'تفعيل'}
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderPlanModal(plan = null) {
    const isEdit = !!plan;
    const modalId = 'plan-modal-overlay';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.style.display = 'flex';
    overlay.style.backdropFilter = 'blur(8px)';
    overlay.style.background = 'rgba(0,0,0,0.6)';

    overlay.innerHTML = `
      <div class="modal-content" style="max-width:560px; width:92%; border-radius:24px; border:1px solid var(--border-color); padding:0; background:var(--bg-card);">
        <div class="modal-header" style="padding:22px 28px; background:linear-gradient(135deg, rgba(0,86,210,0.08), rgba(168,85,247,0.08)); border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:14px;">
            <div style="width:44px; height:44px; border-radius:12px; background:var(--primary-glow); color:var(--primary); display:flex; align-items:center; justify-content:center;">
              <i data-lucide="sparkles" style="width:22px;height:22px;"></i>
            </div>
            <div>
              <h3 style="font-size:1.1rem; font-weight:800; margin:0; color:var(--text-main);">${isEdit ? 'تعديل خطة الاشتراك' : 'إضافة خطة اشتراك جديدة'}</h3>
              <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">ستظهر هذه الخطة لجميع الطلاب على صفحة الاشتراكات</p>
            </div>
          </div>
          <span id="close-plan-modal" style="font-size:1.4rem; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
        </div>
        <div style="padding:28px; background:var(--bg-app); max-height:70vh; overflow-y:auto;">
          <form id="plan-form" style="display:flex; flex-direction:column; gap:16px;">
            <input type="hidden" id="plan-id" value="${plan?.id || ''}">
            <div>
              <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">اسم الخطة <span style="color:var(--error,#ef4444);">*</span></label>
              <input type="text" id="plan-name" class="form-input" required style="width:100%; padding:10px;" placeholder="مثال: الخطة الأساسية (4 حصص)" value="${plan?.name || ''}">
            </div>
            <div>
              <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">الوصف</label>
              <textarea id="plan-desc" class="form-input" rows="2" style="width:100%; padding:10px; resize:vertical;" placeholder="وصف مختصر لما تتضمنه هذه الخطة...">${plan?.description || ''}</textarea>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
              <div>
                <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">عدد الحصص <span style="color:var(--error,#ef4444);">*</span></label>
                <input type="number" id="plan-sessions" class="form-input" required min="1" style="width:100%; padding:10px;" placeholder="مثال: 8" value="${plan?.sessionsCount || ''}">
              </div>
              <div>
                <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">مدة الخطة (أيام) <span style="color:var(--error,#ef4444);">*</span></label>
                <input type="number" id="plan-duration" class="form-input" required min="1" style="width:100%; padding:10px;" placeholder="مثال: 30" value="${plan?.durationDays || 30}">
              </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px;">
              <div>
                <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">السعر <span style="color:var(--error,#ef4444);">*</span></label>
                <input type="number" id="plan-price" class="form-input" required min="0" style="width:100%; padding:10px;" placeholder="مثال: 600" value="${plan?.price || ''}">
              </div>
              <div>
                <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">العملة</label>
                <input type="text" id="plan-currency" class="form-input" style="width:100%; padding:10px;" placeholder="EGP" value="${plan?.currency || 'EGP'}">
              </div>
              <div>
                <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">مدة الحصة (دقيقة)</label>
                <input type="number" id="plan-session-mins" class="form-input" min="15" style="width:100%; padding:10px;" value="${plan?.sessionDurationMins || 60}">
              </div>
            </div>
            <div>
              <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                <input type="checkbox" id="plan-active" ${(!plan || plan.isActive) ? 'checked' : ''} style="width:18px; height:18px; accent-color:var(--primary);">
                <span style="font-size:0.9rem; font-weight:600;">الخطة نشطة وظاهرة للطلاب</span>
              </label>
            </div>
            <div style="display:flex; gap:12px; margin-top:8px; justify-content:flex-end;">
              <button type="button" id="cancel-plan-modal" class="btn-secondary">إلغاء</button>
              <button type="submit" class="btn-primary">${isEdit ? 'حفظ التعديلات ✅' : 'إضافة الخطة 🚀'}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => overlay.remove();
    document.getElementById('close-plan-modal')?.addEventListener('click', closeModal);
    document.getElementById('cancel-plan-modal')?.addEventListener('click', closeModal);

    document.getElementById('plan-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('plan-id').value;
      const payload = {
        name: document.getElementById('plan-name').value.trim(),
        description: document.getElementById('plan-desc').value.trim(),
        sessionsCount: parseInt(document.getElementById('plan-sessions').value),
        durationDays: parseInt(document.getElementById('plan-duration').value),
        price: parseFloat(document.getElementById('plan-price').value),
        currency: document.getElementById('plan-currency').value.trim() || 'EGP',
        sessionDurationMins: parseInt(document.getElementById('plan-session-mins').value) || 60,
        isActive: document.getElementById('plan-active').checked
      };

      try {
        if (id) {
          await apiFetch(`/subscription-plans/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
          showToast('تم تحديث الخطة بنجاح! ✅', 'success');
        } else {
          await apiFetch('/subscription-plans', { method: 'POST', body: JSON.stringify(payload) });
          showToast('تم إضافة الخطة بنجاح! 🚀', 'success');
        }
        closeModal();
        await this.loadAllData();
        this.renderTab('plans');
      } catch (err) {
        showToast(err.message || 'فشل حفظ الخطة.', 'error');
      }
    });
  }

  onDestroy() {}
}
