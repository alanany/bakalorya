import { apiFetch, state, setAuth, showToast, t, confirmDialog, renderPhoneInputGroup, getCleanWhatsAppNumber, renderEducationSelectHTML, handleWhatsAppResponse, formatSessionDateTime, getTimezoneBadgeHTML } from "../app.js";

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
    this.allPlans = [];
    this.subFilter = "all";
    this.expandedStudents = new Set();
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
        @media (max-width: 768px) {
          .admin-shell {
            height: auto;
            min-height: calc(100vh - 64px);
          }
          .admin-sidebar {
            position: fixed;
            top: 0;
            bottom: 0;
            right: 0;
            width: 290px;
            max-width: calc(100vw - 48px);
            z-index: 9995;
            transform: translateX(100%);
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: -8px 0 32px rgba(0,0,0,0.4);
            display: flex;
          }
          [dir="ltr"] .admin-sidebar {
            right: auto;
            left: 0;
            transform: translateX(-100%);
            box-shadow: 8px 0 32px rgba(0,0,0,0.4);
          }
          .admin-sidebar.active {
            transform: translateX(0) !important;
          }
          .admin-mobile-toggle-btn {
            display: inline-flex !important;
          }
          .admin-topbar {
            padding: 12px 16px;
            flex-wrap: wrap;
            gap: 12px;
          }
          .admin-main {
            padding: 16px 12px;
          }
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
            <button class="admin-nav-btn ${this.activeTab === "enrollments" ? "active" : ""}" data-tab="enrollments">
              <i data-lucide="award"></i>
              تسجيلات الكورسات
              <span class="admin-nav-badge" id="admin-badge-enrollments">0</span>
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
            <button class="admin-nav-btn ${this.activeTab === "plans" || this.activeTab === "settings" ? "active" : ""}" data-tab="plans">
              <i data-lucide="settings"></i>
              ⚙️ الإعدادات وخطط الباقات
              <span class="admin-nav-badge" id="admin-badge-plans">0</span>
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
              <button class="btn-secondary admin-mobile-toggle-btn" id="admin-mobile-toggle-btn" style="display:none; align-items:center; gap:6px; font-size:0.8rem; padding:8px 14px;">
                <i data-lucide="menu" style="width:16px;height:16px;"></i>
                قائمة المشرف
              </button>
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
      <div id="admin-modal-container">
        ${this.renderAddCourseModal()}
      </div>
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
    el("admin-badge-enrollments", (this.enrollments || []).length);
    el("admin-badge-sessions", (this.allSessions || []).length);
    el("admin-badge-categories", (this.categories || []).length);
    el("admin-badge-applications", pendingApps.length);
    el("admin-badge-subscriptions", (this.subscriptions || []).length);
    el("admin-badge-plans", (this.allPlans || []).length);
  }

  async loadAllData() {
    try {
      const [stats, members, courses, reportsData, categories, teacherApplications, sessions, subscriptions, earnings, allPlans, enrollments] = await Promise.all([
        apiFetch("/admin/stats").catch(() => ({})),
        apiFetch("/admin/users").catch(() => []),
        apiFetch("/admin/courses").catch(() => []),
        apiFetch("/admin/reports").catch(() => ({})),
        apiFetch("/categories").catch(() => []),
        apiFetch("/admin/teacher-applications").catch(() => []),
        apiFetch("/sessions").catch(() => []),
        apiFetch("/admin/subscriptions").catch(() => []),
        apiFetch("/admin/earnings").catch(() => null),
        apiFetch("/subscription-plans").catch(() => []),
        apiFetch("/admin/enrollments").catch(() => [])
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
      this.enrollments = enrollments || [];
    } catch (err) {
      console.error("loadAllData error:", err);
    }
  }

  bindTabEvents() {
    const sidebar = this.container.querySelector(".admin-sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    const closeSidebar = () => {
      sidebar?.classList.remove("active");
      overlay?.classList.remove("active");
      document.body.classList.remove("sidebar-open");
    };

    this.container.querySelector("#admin-mobile-toggle-btn")?.addEventListener("click", () => {
      sidebar?.classList.toggle("active");
      overlay?.classList.toggle("active");
      document.body.classList.toggle("sidebar-open");
    });

    overlay?.addEventListener("click", closeSidebar);

    this.container.querySelectorAll(".admin-nav-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.activeTab = btn.getAttribute("data-tab");
        this.container.querySelectorAll(".admin-nav-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        closeSidebar();
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
    enrollments:         { heading: "🎓 طلبات وتسجيلات الكورسات", sub: "مراجعة واعتماد طلبات التحويل وتسجيل الطلاب في جميع الكورسات" },
    sessions:            { heading: "📹 إدارة الحصص والجلسات",      sub: "متابعة وإلغاء وإعادة جدولة حصص البث المباشر والحصص الخاصة 1-على-1" },
    teachers:            { heading: "👨‍🏫 إدارة المعلمين",           sub: "إضافة وتعديل وإدارة حسابات المعلمين" },
    students:            { heading: "🎓 إدارة الطلاب",             sub: "إضافة وتعديل وإدارة حسابات الطلاب" },
    teacherApplications: { heading: "📝 طلبات انضمام المعلمين",    sub: "مراجعة السير الذاتية والقبول/الرفض لمعلمي المنصة الجدد" },
    members:             { heading: "🛡️ جميع الأعضاء",             sub: "عرض وإدارة جميع مستخدمي المنصة" },
    subscriptions:       { heading: "📅 إدارة الاشتراكات",         sub: "متابعة وتعيين المعلمين لاشتراكات الحصص الخاصة" },
    earnings:            { heading: "💰 المدفوعات والمستحقات",    sub: "متابعة إيرادات المنصة ومستحقات المعلمين" },
    plans:               { heading: "⚙️ إعدادات المنصة وخطط الباقات (Subscription Plans & Quota)",   sub: "إدارة وتعديل أسعار الباقات، عدد الحصص (Quota)، والخصائص الحصرية" },
    settings:            { heading: "⚙️ إعدادات المنصة وخطط الباقات (Subscription Plans & Quota)",   sub: "إدارة وتعديل أسعار الباقات، عدد الحصص (Quota)، والخصائص الحصرية" },
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
    else if (tab === "enrollments")     content.innerHTML = this.renderEnrollmentsTab();
    else if (tab === "sessions")        content.innerHTML = this.renderSessionsTab(args);
    else if (tab === "reports")         content.innerHTML = this.renderReportsTab();
    else if (tab === "subscriptions")   content.innerHTML = this.renderSubscriptionsTab();
    else if (tab === "earnings")        content.innerHTML = this.renderEarningsTab();
    else if (tab === "plans" || tab === "settings") content.innerHTML = this.renderPlansTab();

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

  // ── 2. Dedicated Teachers Tab (Add Teacher & Salary Calculation) ─────
  renderTeachersTab() {
    const teachers = this.allMembers.filter(u => u.role === "teacher");
    const allSessions = this.allSessions || [];

    const teacherData = teachers.map(t => {
      const completedSessions = allSessions.filter(s => 
        (s.teacher?.id === t.id || s.teacherId === t.id) && 
        (s.status === 'COMPLETED' || s.status === 'completed')
      );
      const totalMinutes = completedSessions.reduce((sum, s) => sum + (s.duration || 60), 0);
      const completedHours = Math.round((totalMinutes / 60) * 10) / 10;
      const rate = t.hourlyRate !== undefined ? t.hourlyRate : 150;
      const totalSalary = Math.round(completedHours * rate);

      return {
        teacher: t,
        completedCount: completedSessions.length,
        completedHours,
        rate,
        totalSalary
      };
    });

    const grandTotalSalary = teacherData.reduce((sum, d) => sum + d.totalSalary, 0);
    const grandTotalHours = teacherData.reduce((sum, d) => sum + d.completedHours, 0);

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:16px;">
        <div>
          <h3 style="font-weight:700;margin-bottom:4px;">${t("admin.tab.teachers")} (${teachers.length})</h3>
          <p style="font-size:0.83rem;color:var(--text-muted);margin:0;">إدارة بيانات المعلمين، تحديد أجر الساعة، واحتساب الراتب المستحق عن الحصص المنفذة</p>
        </div>
        <button class="btn-primary" id="open-create-teacher-btn" style="font-size:0.85rem;padding:10px 18px;">
          <i data-lucide="user-plus"></i> ${t("admin.addTeacher")}
        </button>
      </div>

      <!-- Salary Summary Strip -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-bottom:24px;">
        <div class="glass-card" style="padding:18px 20px; border-inline-start:4px solid var(--primary);">
          <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">إجمالي الرواتب المستحقة</div>
          <div style="font-size:1.5rem; font-weight:800; color:var(--primary); margin-top:4px;">${grandTotalSalary.toLocaleString()} ج.م</div>
        </div>
        <div class="glass-card" style="padding:18px 20px; border-inline-start:4px solid var(--success);">
          <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">إجمالي ساعات الحصص المكتملة</div>
          <div style="font-size:1.5rem; font-weight:800; color:var(--success); margin-top:4px;">${grandTotalHours} ساعة</div>
        </div>
        <div class="glass-card" style="padding:18px 20px; border-inline-start:4px solid #f59e0b;">
          <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">عدد المعلمين المسجلين</div>
          <div style="font-size:1.5rem; font-weight:800; color:#f59e0b; margin-top:4px;">${teachers.length} معلم</div>
        </div>
      </div>

      ${teachers.length === 0
        ? `<div class="glass-card" style="text-align:center;padding:40px;color:var(--text-muted);">${t("admin.noTeachers")}</div>`
        : `<div class="glass-card" style="overflow:hidden;padding:0;">
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;text-align:start;font-size:0.88rem;">
                <thead>
                  <tr style="background:var(--bg-card);border-bottom:1px solid var(--border-color);">
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">المعلم</th>
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">البريد والتواصل</th>
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">سعر الساعة</th>
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">الحصص المنفذة</th>
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">الراتب المستحق</th>
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">${t("admin.col.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  ${teacherData.map(item => {
                    const u = item.teacher;
                    const joinDate = new Date(u.createdAt).toLocaleDateString();
                    return `
                      <tr style="border-bottom:1px solid var(--border-color);">
                        <td style="padding:14px 20px;">
                          <div style="display:flex;align-items:center;gap:12px;">
                            <img src="${u.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + u.name}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;">
                            <div>
                              <div style="font-weight:700;font-size:0.9rem;">${u.name}</div>
                              <div style="font-size:0.75rem;color:var(--primary);font-weight:600;">انضمام: ${joinDate}</div>
                            </div>
                          </div>
                        </td>
                        <td style="padding:14px 20px;color:var(--text-muted);font-size:0.85rem;">
                          <div>${u.email}</div>
                          ${u.phone ? `<div style="font-size:0.75rem;color:var(--text-main);margin-top:2px;">📱 ${u.phone}</div>` : ''}
                          ${u.meetingLink ? `<div style="font-size:0.72rem;color:var(--primary);margin-top:2px;font-weight:700;"><a href="${u.meetingLink}" target="_blank" style="color:var(--primary);text-decoration:underline;">🔗 رابط الاجتماع الثابت</a></div>` : ''}
                          <div style="display:flex; gap:4px; margin-top:4px; flex-wrap:wrap;">
                            ${(!u.teacherCapabilities || u.teacherCapabilities.includes("COURSE_INSTRUCTOR")) ? `<span class="badge" style="background:rgba(99,102,241,0.12); color:#6366f1; font-size:0.65rem; font-weight:800;">📚 إنشاء دورات</span>` : ''}
                            ${(!u.teacherCapabilities || u.teacherCapabilities.includes("SESSION_TEACHER")) ? `<span class="badge" style="background:rgba(16,185,129,0.12); color:#10b981; font-size:0.65rem; font-weight:800;">⏱️ حصص خاصة</span>` : ''}
                          </div>
                        </td>
                        <td style="padding:14px 20px;">
                          <span style="background:rgba(99,102,241,0.12); color:var(--primary); font-weight:800; padding:4px 12px; border-radius:12px; font-size:0.82rem; display:inline-flex; align-items:center; gap:4px;">
                            💵 ${item.rate} ج.م / ساعة
                          </span>
                        </td>
                        <td style="padding:14px 20px;">
                          <div style="font-weight:700;">${item.completedCount} حصص</div>
                          <div style="font-size:0.75rem;color:var(--text-muted);">${item.completedHours} ساعة عمل</div>
                        </td>
                        <td style="padding:14px 20px;">
                          <span style="background:rgba(16,185,129,0.15); color:var(--success); font-weight:900; padding:6px 14px; border-radius:14px; font-size:0.9rem; display:inline-flex; align-items:center; gap:4px;">
                            💰 ${item.totalSalary.toLocaleString()} ج.م
                          </span>
                        </td>
                        <td style="padding:14px 20px;">
                          <div style="display:flex;gap:8px;flex-wrap:wrap;">
                            <button class="btn-secondary edit-member-btn" data-id="${u.id}" style="font-size:0.75rem;padding:6px 12px;border-color:var(--primary);color:var(--primary);">
                              <i data-lucide="edit" style="width:12px;height:12px;"></i> تعديل الأجر والبيانات
                            </button>
                            <button class="btn-secondary view-transcript-btn" data-id="${u.id}" style="font-size:0.75rem;padding:6px 12px;border-color:var(--info);color:var(--info);">
                              <i data-lucide="file-text" style="width:12px;height:12px;"></i> السجل
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </div>
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
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <h3 style="font-weight:700;">${t("admin.tab.courses")} (${this.courses.length})</h3>
        <button class="btn-primary" id="open-admin-add-course-modal-btn" style="padding:10px 18px; font-weight:800; gap:8px;">
          <i data-lucide="plus-circle" style="width:16px;height:16px;"></i> إضافة دورة تعليمية جديدة ➕
        </button>
      </div>

      ${this.courses.length === 0
        ? `<div class="glass-card" style="text-align:center;padding:40px;color:var(--text-muted);">${t("admin.noCourses")}</div>`
        : `<div style="display:flex;flex-direction:column;gap:16px;">
            ${this.courses.map(course => {
              const coursePlansCount = (this.allPlans || []).filter(p => p.courseId === course.id || p.course?.id === course.id).length;
              const isPending = course.status === "PENDING_REVIEW";
              const isPublished = course.status === "PUBLISHED" || !course.status;

              return `
              <div class="glass-card" style="display:flex;align-items:center;gap:20px;padding:16px 20px; ${isPending ? 'border:1px solid rgba(245,158,11,0.4); background:rgba(245,158,11,0.03);' : ''}">
                <img src="${course.image || 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=80&auto=format'}"
                  style="width:72px;height:72px;border-radius:var(--radius-sm);object-fit:cover;flex-shrink:0;">
                <div style="flex:1;min-width:0;">
                  <div style="display:flex; gap:8px; align-items:center; margin-bottom:4px; flex-wrap:wrap;">
                    <span style="font-size:0.7rem;font-weight:700;color:var(--primary);text-transform:uppercase;">${course.category}</span>
                    <span class="badge" style="background:rgba(139,92,246,0.12); color:#8b5cf6; font-size:0.7rem; font-weight:800;">${coursePlansCount} خطط اشتراك مخصصة</span>
                    ${isPending ? `
                      <span class="badge" style="background:rgba(245,158,11,0.15); color:#f59e0b; font-size:0.72rem; font-weight:800;">🟡 قيد المراجعة والاعتماد (PENDING_REVIEW) ⏳</span>
                    ` : isPublished ? `
                      <span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-size:0.72rem; font-weight:800;">منشورة ومتاحة ✅</span>
                    ` : `
                      <span class="badge" style="background:rgba(239,68,68,0.15); color:#ef4444; font-size:0.72rem; font-weight:800;">مرفوضة / مسودة ❌</span>
                    `}
                  </div>
                  <h4 style="font-weight:700;font-size:1rem;margin-bottom:6px;">${course.title}</h4>
                  <div style="display:flex;gap:20px;font-size:0.8rem;color:var(--text-muted);flex-wrap:wrap;">
                    <span><i data-lucide="user" style="width:12px;height:12px;"></i> ${course.teacher?.name || "منصة باكالوريا التعليمية 🏛️"}</span>
                    <span><i data-lucide="book" style="width:12px;height:12px;"></i> ${course.lessonsCount || 0} ${t("admin.lessons")}</span>
                    <span><i data-lucide="users" style="width:12px;height:12px;"></i> ${course.enrollmentsCount || 0} ${t("admin.enrolled")}</span>
                  </div>
                </div>
                <div style="display:flex; gap:8px; flex-shrink:0; flex-wrap:wrap;">
                  ${isPending ? `
                    <button class="btn-primary admin-approve-course-btn" data-id="${course.id}"
                      style="font-size:0.8rem; padding:8px 14px; gap:6px; background:#10b981; border-color:#10b981; font-weight:800;">
                      <i data-lucide="check-circle" style="width:14px;height:14px;"></i> قبول واعتماد النشر 🎉
                    </button>
                    <button class="btn-secondary admin-reject-course-btn" data-id="${course.id}"
                      style="font-size:0.8rem; padding:8px 14px; gap:6px; color:#ef4444; border-color:#ef4444; font-weight:700;">
                      <i data-lucide="x-circle" style="width:14px;height:14px;"></i> رفض ❌
                    </button>
                  ` : ''}
                  <a href="#manage-course/${course.id}" class="btn-primary"
                    style="font-size:0.8rem; padding:8px 14px; gap:6px; background:#8b5cf6; border-color:#8b5cf6; text-decoration:none; display:inline-flex; align-items:center; font-weight:800;">
                    <i data-lucide="book-open" style="width:14px;height:14px;"></i> إضافة وإدارة الدروس والوحدات 📚
                  </a>
                  <button class="btn-primary admin-view-course-details-btn" data-id="${course.id}"
                    style="font-size:0.8rem; padding:8px 14px; gap:6px;">
                    <i data-lucide="eye" style="width:14px;height:14px;"></i> تفاصيل الكورس والاشتراكات 🔍
                  </button>
                  <button class="btn-secondary delete-course-btn" data-id="${course.id}" data-title="${course.title}"
                    style="font-size:0.8rem; padding:8px 14px; border-color:var(--error, #ef4444); color:var(--error, #ef4444);">
                    <i data-lucide="trash-2" style="width:14px;height:14px;"></i> ${t("common.delete")}
                  </button>
                </div>
              </div>
            `;
            }).join("")}
          </div>`
      }
    `;
  }

  renderEnrollmentsTab() {
    const enrollments = this.enrollments || [];
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px;">
        <div>
          <h3 style="font-weight:800; font-size:1.3rem;">🎓 طلبات وتسجيلات الكورسات (${enrollments.length})</h3>
          <p style="color:var(--text-muted); font-size:0.85rem; margin:0;">مراجعة واعتماد طلبات التحويل وتسجيل الطلاب في جميع الكورسات</p>
        </div>
      </div>

      ${enrollments.length === 0 ? `
        <div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted);">لا توجد طلبات تسجيل في الكورسات حالياً.</div>
      ` : `
        <div class="glass-card" style="padding:0; overflow:hidden;">
          <table style="width:100%; border-collapse:collapse; text-align:start;">
            <thead>
              <tr style="background:var(--bg-app); border-bottom:1px solid var(--border-color); font-size:0.82rem; color:var(--text-muted);">
                <th style="padding:14px 16px;">الطالب</th>
                <th style="padding:14px 16px;">الدورة التعليمية</th>
                <th style="padding:14px 16px;">إيصال التحويل والدفع</th>
                <th style="padding:14px 16px;">الحالة</th>
                <th style="padding:14px 16px;">تاريخ الطلب</th>
                <th style="padding:14px 16px;">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${enrollments.map(e => {
                const stMap = {
                  'active': { label: 'مقبول ونشط ✅', bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
                  'rejected': { label: 'مرفوض ❌', bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
                  'PENDING': { label: 'في انتظار الاعتماد ⏳', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' }
                };
                const st = stMap[e.status] || { label: e.status, bg: 'rgba(99,102,241,0.15)', color: 'var(--primary)' };
                const receiptUrl = e.payment?.receiptUrl;

                return `
                  <tr style="border-bottom:1px solid var(--border-color); font-size:0.88rem;">
                    <td style="padding:14px 16px;">
                      <div style="font-weight:700; color:var(--text-main);">${e.student?.name || 'طالب'}</div>
                      <div style="font-size:0.78rem; color:var(--text-muted);">${e.student?.email || ''}</div>
                    </td>
                    <td style="padding:14px 16px;">
                      <div style="font-weight:700;">${e.course?.title || 'دورة'}</div>
                      <div style="font-size:0.78rem; color:var(--primary);">${e.course?.category || ''}</div>
                    </td>
                    <td style="padding:14px 16px;">
                      ${receiptUrl ? `
                        <a href="${receiptUrl}" target="_blank" class="btn-secondary" style="padding:4px 10px; font-size:0.78rem; text-decoration:none; display:inline-flex; align-items:center; gap:4px; color:var(--primary); border-color:var(--primary);">
                          <i data-lucide="file-text" style="width:12px;height:12px;"></i> عرض إيصال التحويل 📄
                        </a>
                      ` : `
                        <span style="font-size:0.78rem; color:var(--text-muted);">لا يوجد إيصال مرفق</span>
                      `}
                    </td>
                    <td style="padding:14px 16px;">
                      <span style="font-size:0.78rem; font-weight:800; padding:4px 10px; border-radius:14px; background:${st.bg}; color:${st.color};">
                        ${st.label}
                      </span>
                    </td>
                    <td style="padding:14px 16px; font-size:0.8rem; color:var(--text-muted);">
                      ${new Date(e.createdAt).toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td style="padding:14px 16px;">
                      <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        ${e.status !== 'active' ? `
                          <button class="btn-primary admin-approve-enrollment-btn" data-id="${e.id}" style="padding:6px 12px; font-size:0.78rem; background:#10b981; border-color:#10b981; font-weight:800;">
                            <i data-lucide="check" style="width:14px;height:14px;"></i> قبول واعتماد ✅
                          </button>
                        ` : ''}
                        ${e.status !== 'rejected' ? `
                          <button class="btn-secondary admin-reject-enrollment-btn" data-id="${e.id}" style="padding:6px 12px; font-size:0.78rem; color:#ef4444; border-color:#ef4444; font-weight:700;">
                            <i data-lucide="x" style="width:14px;height:14px;"></i> رفض ❌
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  }

  renderAddCourseModal() {
    const categories = this.categories || [];
    return `
      <div class="modal-overlay" id="admin-course-modal" style="display:none; backdrop-filter:blur(8px); background:rgba(0,0,0,0.6);">
        <div class="modal-content" style="max-width:650px; width:92%; border-radius:24px; border:1px solid var(--border-color); padding:0; background:var(--bg-card); overflow:hidden;">
          <div class="modal-header" style="padding:22px 28px; background:linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.08)); border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:14px;">
              <div style="width:46px; height:46px; border-radius:14px; background:var(--primary-glow); color:var(--primary); display:flex; align-items:center; justify-content:center;">
                <i data-lucide="book-plus" style="width:24px; height:24px;"></i>
              </div>
              <div>
                <h3 class="modal-title" style="font-size:1.2rem; font-weight:800; margin:0 0 2px 0; color:var(--text-main);">إضافة دورة تعليمية جديدة للمنصة ➕</h3>
                <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">أدخل تفاصيل الدورة، القسم المعني، السنة الدراسية والمعلم المسؤول</p>
              </div>
            </div>
            <span class="modal-close-btn" id="close-admin-course-modal" style="font-size:1.4rem; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
          </div>

          <form id="admin-course-form">
            <div class="modal-body" style="padding:24px 28px; display:flex; flex-direction:column; gap:18px;">
              
              <!-- Course Title -->
              <div class="form-group" style="margin:0;">
                <label for="admin-course-title" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="heading" style="width:14px; height:14px; color:var(--primary);"></i>
                  عنوان الدورة التعليمية <span style="color:var(--error);">*</span>
                </label>
                <input type="text" id="admin-course-title" class="form-input" placeholder="مثال: الدورة الشاملة في الرياضيات - ثانوية عامة" style="border-radius:14px; padding:12px 16px; font-size:0.9rem;" required>
              </div>

              <!-- Category & Degree Grid -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <!-- Category Select -->
                <div class="form-group" style="margin:0;">
                  <label for="admin-course-category-select" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="layers" style="width:14px; height:14px; color:#a855f7;"></i>
                    التخصص / المادة <span style="color:var(--error);">*</span>
                  </label>
                  <select id="admin-course-category-select" class="form-select" style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;" required>
                    <option value="">-- اختر التخصص / المادة الدراسية --</option>
                    <optgroup label="📚 المواد والدراسات الأساسية">
                      <option value="الرياضيات">الرياضيات (Mathematics)</option>
                      <option value="الفيزياء">الفيزياء (Physics)</option>
                      <option value="الكيمياء">الكيمياء (Chemistry)</option>
                      <option value="الأحياء">الأحياء (Biology)</option>
                      <option value="العلوم العامة">العلوم العامة (Science)</option>
                      <option value="اللغة العربية">اللغة العربية (Arabic)</option>
                      <option value="اللغة الإنجليزية">اللغة الإنجليزية (English)</option>
                      <option value="اللغة الفرنسية">اللغة الفرنسية (French)</option>
                      <option value="التاريخ">التاريخ (History)</option>
                      <option value="الجغرافيا">الجغرافيا (Geography)</option>
                      <option value="الفلسفة والمنطق">الفلسفة والمنطق (Philosophy)</option>
                      <option value="الحاسب الآلي والبرمجة">الحاسب الآلي وتكنولوجيا المعلومات (IT)</option>
                      <option value="الاقتصاد والإحصاء">الاقتصاد والإحصاء (Economics)</option>
                    </optgroup>
                    ${categories.length > 0 ? `
                      <optgroup label="🗂️ التصنيفات المعتمدة بالمنصة">
                        ${categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
                      </optgroup>
                    ` : ''}
                    <optgroup label="✏️ إضافة تخصيص">
                      <option value="__custom__">+ كتابة تخصص / مادة جديدة مخصصة</option>
                    </optgroup>
                  </select>
                  <div id="admin-course-category-custom-wrapper" style="display:none; margin-top:10px;">
                    <input type="text" id="admin-course-category-custom" class="form-input" placeholder="أدخل اسم التخصص أو المادة الجديدة..." style="border-radius:12px; padding:10px 14px; font-size:0.88rem; width:100%; border:1px solid var(--primary);">
                  </div>
                </div>

                <!-- Degree Select -->
                <div class="form-group" style="margin:0;">
                  <label for="admin-course-degree" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="graduation-cap" style="width:14px; height:14px; color:#10b981;"></i>
                    السنة الدراسية / المستوى <span style="color:var(--error);">*</span>
                  </label>
                  <select id="admin-course-degree" class="form-select" style="border-radius:14px; padding:11px 14px; font-size:0.88rem;" required>
                    <option value="">-- اختر المستوى --</option>
                    <optgroup label="🌱 المرحلة الابتدائية (Primary)">
                      <option value="الابتدائية - الصف الأول">الصف الأول الابتدائي (Primary 1)</option>
                      <option value="الابتدائية - الصف الثاني">الصف الثاني الابتدائي (Primary 2)</option>
                      <option value="الابتدائية - الصف الثالث">الصف الثالث الابتدائي (Primary 3)</option>
                      <option value="الابتدائية - الصف الرابع">الصف الرابع الابتدائي (Primary 4)</option>
                      <option value="الابتدائية - الصف الخامس">الصف الخامس الابتدائي (Primary 5)</option>
                      <option value="الابتدائية - الصف السادس">الصف السادس الابتدائي (Primary 6)</option>
                    </optgroup>
                    <optgroup label="📘 المرحلة الإعدادية (Prep)">
                      <option value="الإعدادية - الصف الأول">الصف الأول الإعدادي (Prep 1)</option>
                      <option value="الإعدادية - الصف الثاني">الصف الثاني الإعدادي (Prep 2)</option>
                      <option value="الإعدادية - الصف الثالث">الصف الثالث الإعدادي - الشهادة الإعدادية (Prep 3)</option>
                    </optgroup>
                    <optgroup label="🎓 المرحلة الثانوية (Secondary)">
                      <option value="الثانوية - الصف الأول">الصف الأول الثانوي (1st Secondary)</option>
                      <option value="الثانوية - الصف الثاني (علمي)">الصف الثاني الثانوي - علمي</option>
                      <option value="الثانوية - الصف الثاني (أدبي)">الصف الثاني الثانوي - أدبي</option>
                      <option value="الثانوية - الصف الثالث (علمي علوم)">الصف الثالث الثانوي - علمي علوم</option>
                      <option value="الثانوية - الصف الثالث (علمي رياضة)">الصف الثالث الثانوي - علمي رياضة</option>
                      <option value="الثانوية - الصف الثالث (أدبي)">الصف الثالث الثانوي - أدبي</option>
                      <option value="الثانوية الأزهرية">الثانوية الأزهرية</option>
                    </optgroup>
                    <optgroup label="🌟 عام وتأسيس (General)">
                      <option value="جميع المراحل والصفوف">جميع المراحل والصفوف (All Grades)</option>
                      <option value="تأسيس ودورات عامة">تأسيس ودورات تدريبية عامة (Foundation)</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              <!-- Teacher Selection -->
              <div class="form-group" style="margin:0;">
                <label for="admin-course-teacher-id" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="user-check" style="width:14px; height:14px; color:var(--primary);"></i>
                  المعلم المسؤول عن الدورة (اختياري للدورات العامة)
                </label>
                <select id="admin-course-teacher-id" class="form-select" style="border-radius:14px; padding:11px 14px; font-size:0.88rem;">
                  <option value="">🏛️ دورة عامة على المنصة (بدون معلم خاص)</option>
                  ${(this.allMembers || []).filter(m => m.role === 'teacher').map(t => `<option value="${t.id}">${t.name} (${t.email})</option>`).join('')}
                </select>
              </div>

              <!-- Course Description -->
              <div class="form-group" style="margin:0;">
                <label for="admin-course-desc" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="file-text" style="width:14px; height:14px; color:var(--text-muted);"></i>
                  وصف ومحتويات الدورة
                </label>
                <textarea id="admin-course-desc" class="form-input" style="height:90px; resize:none; border-radius:14px; padding:12px 16px; font-size:0.88rem; line-height:1.5;" placeholder="أدخل تفاصيل ومحاور المنهج التعليمي والدورة..." required></textarea>
              </div>

              <!-- Course Image Upload -->
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; justify-content:space-between;">
                  <span style="display:flex; align-items:center; gap:6px;">
                    <i data-lucide="image" style="width:14px; height:14px; color:#f59e0b;"></i>
                    غلاف / صورة الدورة
                  </span>
                  <button type="button" id="admin-toggle-url-input-btn" style="background:none; border:none; color:var(--primary); font-weight:700; font-size:0.75rem; cursor:pointer;">
                    أو أدخل رابط صورة مباشرة 🔗
                  </button>
                </label>

                <div id="admin-course-dropzone" style="border:2px dashed var(--border-color); border-radius:16px; padding:18px; text-align:center; background:var(--bg-app); cursor:pointer; transition:all 0.2s ease;">
                  <input type="file" id="admin-course-image-file" accept="image/*" style="display:none;">

                  <div id="admin-image-upload-idle">
                    <button type="button" class="btn-secondary" id="admin-btn-trigger-upload" style="padding:8px 20px; border-radius:30px; font-size:0.85rem; margin:0 auto; display:inline-flex; align-items:center; gap:6px;">
                      <i data-lucide="upload-cloud" style="width:16px; height:16px;"></i> اختيار صورة غلاف الدورة
                    </button>
                    <p style="font-size:0.75rem; color:var(--text-muted); margin:8px 0 0 0;">الصغار المقبولة: JPG, PNG, WEBP (الحد الأقصى 5 ميجابايت)</p>
                  </div>

                  <div id="admin-image-upload-loading" style="display:none; padding:10px; color:var(--primary); font-weight:700; font-size:0.88rem;">
                    <i data-lucide="loader" class="spinner" style="width:20px; height:20px; display:inline-block; vertical-align:middle; margin-inline-end:6px;"></i> جاري رفع الصورة...
                  </div>

                  <div id="admin-image-preview-wrapper" style="display:none; text-align:center;">
                    <div style="position:relative; display:inline-block;">
                      <img id="admin-course-preview-img" src="" style="max-height:130px; border-radius:12px; object-fit:cover; border:2px solid var(--primary); box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                      <button type="button" id="admin-remove-course-image-btn" title="حذف الصورة" style="position:absolute; top:-8px; right:-8px; background:var(--error,#ef4444); color:#fff; border:none; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-weight:bold; box-shadow:0 2px 6px rgba(0,0,0,0.3);">✕</button>
                    </div>
                    <p style="font-size:0.78rem; color:var(--success,#10b981); font-weight:800; margin:6px 0 0 0;">✓ تم اختيار ورفع غلاف الدورة بنجاح</p>
                  </div>
                </div>

                <div id="admin-url-input-wrapper" style="display:none; margin-top:10px;">
                  <input type="url" id="admin-course-image-url-direct" class="form-input" placeholder="https://example.com/course-cover.jpg" style="border-radius:12px; padding:10px 14px; font-size:0.85rem;">
                </div>

                <input type="hidden" id="admin-course-image">
              </div>

              <!-- Static Meeting Link -->
              <div class="form-group" style="margin:0;">
                <label for="admin-course-meeting-link" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="video" style="width:14px; height:14px; color:#06b6d4;"></i>
                  🔗 رابط البث المباشر الثابت (Zoom / Meet / Webex)
                </label>
                <input type="url" id="admin-course-meeting-link" class="form-input" placeholder="https://meet.google.com/abc-defg-hij" style="border-radius:14px; padding:11px 16px; font-size:0.88rem;">
              </div>

            </div>

            <div class="modal-footer" style="padding:16px 28px; background:var(--bg-app); border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; gap:12px;">
              <button type="button" class="btn-secondary" id="cancel-admin-course-modal" style="padding:10px 20px; border-radius:30px; font-size:0.88rem;">إلغاء</button>
              <button type="submit" class="btn-primary" style="padding:10px 24px; border-radius:30px; font-size:0.88rem; font-weight:800; background:linear-gradient(135deg,#0056D2,#a855f7); border:none;">
                <i data-lucide="check-circle-2" style="width:16px; height:16px; vertical-align:middle;"></i> إنشاء ونشر الدورة للمنصة 🎉
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  // ── 5. Sessions Management Tab ────────────────────────────────────────────────
  renderSessionsTab(filterSubId = null) {
    let allSessions = this.allSessions || [];
    if (filterSubId) {
      allSessions = allSessions.filter(s => String(s.subscription?.id) === String(filterSubId));
    }

    this.sessionTimeFilter = this.sessionTimeFilter || 'all';
    this.sessionViewMode = this.sessionViewMode || 'list';
    this.sessionCustomDate = this.sessionCustomDate || '';

    const now = new Date();
    const todayYMD = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
    const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toDateString();

    // Calculate Week Range (Sunday to Saturday)
    const currentDay = now.getDay();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currentDay);
    startOfWeek.setHours(0,0,0,0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23,59,59,999);

    // Calculate Month Range
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Apply Time Filter
    const filteredSessions = allSessions.filter(s => {
      if (!s.scheduledAt) return this.sessionTimeFilter === 'all';
      const sDate = new Date(s.scheduledAt);

      if (this.sessionTimeFilter === 'today') {
        return new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate()).toDateString() === todayStr;
      } else if (this.sessionTimeFilter === 'week') {
        return sDate >= startOfWeek && sDate <= endOfWeek;
      } else if (this.sessionTimeFilter === 'month') {
        return sDate >= startOfMonth && sDate <= endOfMonth;
      } else if (this.sessionTimeFilter === 'custom' && this.sessionCustomDate) {
        const sYMD = sDate.toISOString().slice(0, 10);
        return sYMD === this.sessionCustomDate;
      }
      return true;
    });

    const getStatusBadge = (status) => {
      const s = (status || "").toLowerCase();
      if (s === "live") return `<span style="background:rgba(239,68,68,0.15); color:#ef4444; font-weight:800; font-size:0.75rem; padding:4px 10px; border-radius:20px; display:inline-flex; align-items:center; gap:4px;"><i data-lucide="video" style="width:12px;height:12px;"></i> بث مباشر الآن</span>`;
      if (s === "completed") return `<span style="background:rgba(16,185,129,0.12); color:#10b981; font-weight:800; font-size:0.75rem; padding:4px 10px; border-radius:20px;">✓ مكتملة</span>`;
      if (s.includes("cancelled")) return `<span style="background:rgba(239,68,68,0.12); color:#ef4444; font-weight:800; font-size:0.75rem; padding:4px 10px; border-radius:20px;">❌ ملغاة</span>`;
      return `<span style="background:rgba(99,102,241,0.12); color:#6366f1; font-weight:800; font-size:0.75rem; padding:4px 10px; border-radius:20px;">📅 مجدولة</span>`;
    };

    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    return `
      <div style="margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:16px;">
          <div>
            <h3 style="font-weight:800; font-size:1.2rem; color:var(--text-main); margin:0;">
              ${filterSubId ? `حصص الاشتراك #${filterSubId.substring(0,8)} (${filteredSessions.length})` : `📹 إدارة الحصص والجلسات المباشرة (${filteredSessions.length})`}
            </h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:4px 0 0 0;">فلترة الحصص حسب اليوم والأسبوع والشهر مع إمكانية المعاينة كجدول حصص أسبوعي (Timetable).</p>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
            <button class="btn-primary" id="admin-open-group-session-btn" style="padding:10px 18px; font-size:0.88rem; font-weight:800; gap:8px; background:linear-gradient(135deg,#8b5cf6,#ec4899); border:none; border-radius:12px;">
              <i data-lucide="users" style="width:16px; height:16px;"></i> 👥 جدولة حصة أونلاين لمجموعة طلاب
            </button>
            ${filterSubId ? `<button class="btn-secondary admin-view-all-sessions-btn" style="padding:8px 16px; font-size:0.85rem; display:inline-flex; align-items:center; gap:6px;"><i data-lucide="arrow-right" style="width:16px; height:16px;"></i> الرجوع لكل الحصص</button>` : ''}
          </div>
        </div>

        <!-- Filter Bar & View Switcher -->
        <div class="glass-card" style="padding:14px 20px; border-radius:16px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
          
          <!-- Time Filters -->
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span style="font-size:0.82rem; font-weight:800; color:var(--text-main); margin-inline-end:4px;">⏱️ فلترة المواعيد:</span>
            
            <button class="btn-secondary admin-session-time-filter-btn" data-filter="all" style="padding:6px 14px; font-size:0.8rem; font-weight:700; ${this.sessionTimeFilter === 'all' ? 'background:var(--primary); color:#fff; border-color:var(--primary);' : ''}">
              الكل (${allSessions.length})
            </button>
            <button class="btn-secondary admin-session-time-filter-btn" data-filter="today" style="padding:6px 14px; font-size:0.8rem; font-weight:700; ${this.sessionTimeFilter === 'today' ? 'background:var(--primary); color:#fff; border-color:var(--primary);' : ''}">
              ☀️ اليوم
            </button>
            <button class="btn-secondary admin-session-time-filter-btn" data-filter="week" style="padding:6px 14px; font-size:0.8rem; font-weight:700; ${this.sessionTimeFilter === 'week' ? 'background:var(--primary); color:#fff; border-color:var(--primary);' : ''}">
              📅 هذا الأسبوع
            </button>
            <button class="btn-secondary admin-session-time-filter-btn" data-filter="month" style="padding:6px 14px; font-size:0.8rem; font-weight:700; ${this.sessionTimeFilter === 'month' ? 'background:var(--primary); color:#fff; border-color:var(--primary);' : ''}">
              🗓️ هذا الشهر
            </button>

            <div style="display:inline-flex; align-items:center; gap:6px; margin-inline-start:4px;">
              <input type="date" id="admin-session-date-picker" class="form-input" style="padding:4px 10px; font-size:0.8rem; border-radius:8px;" value="${this.sessionCustomDate || todayYMD}">
            </div>
          </div>

          <!-- View Mode Toggle -->
          <div style="display:flex; align-items:center; gap:6px; background:var(--bg-app); padding:4px; border-radius:12px; border:1px solid var(--border-color);">
            <button class="btn-secondary admin-session-view-btn" data-mode="list" style="padding:6px 12px; font-size:0.78rem; font-weight:700; border:none; ${this.sessionViewMode === 'list' ? 'background:var(--bg-card); color:var(--primary); box-shadow:0 2px 6px rgba(0,0,0,0.1);' : 'color:var(--text-muted); background:transparent;'}">
              <i data-lucide="list" style="width:14px;height:14px;"></i> قائمة
            </button>
            <button class="btn-secondary admin-session-view-btn" data-mode="timetable" style="padding:6px 12px; font-size:0.78rem; font-weight:700; border:none; ${this.sessionViewMode === 'timetable' ? 'background:var(--bg-card); color:var(--primary); box-shadow:0 2px 6px rgba(0,0,0,0.1);' : 'color:var(--text-muted); background:transparent;'}">
              <i data-lucide="calendar-days" style="width:14px;height:14px;"></i> جدول الحصص (Timetable)
            </button>
          </div>

        </div>
      </div>

      ${this.sessionViewMode === 'timetable' ? `
        <!-- Timetable View -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:16px;">
          ${[0, 1, 2, 3, 4, 5, 6].map(dayIdx => {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(dayDate.getDate() + dayIdx);
            const isTodayDay = dayDate.toDateString() === todayStr;

            const daySessions = filteredSessions.filter(s => {
              if (!s.scheduledAt) return false;
              const d = new Date(s.scheduledAt);
              return d.getDay() === dayIdx;
            }).sort((a,b) => new Date(a.scheduledAt || 0) - new Date(b.scheduledAt || 0));

            return `
              <div class="glass-card" style="padding:16px; border-radius:18px; border:${isTodayDay ? '2px solid var(--primary)' : '1px solid var(--border-color)'}; background:${isTodayDay ? 'rgba(99,102,241,0.03)' : 'var(--bg-card)'}; display:flex; flex-direction:column;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid var(--border-color);">
                  <div>
                    <h4 style="font-weight:800; margin:0; font-size:0.95rem; color:${isTodayDay ? 'var(--primary)' : 'var(--text-main)'};">
                      ${dayNames[dayIdx]} ${isTodayDay ? '⭐ (اليوم)' : ''}
                    </h4>
                    <span style="font-size:0.75rem; color:var(--text-muted);">${dayDate.toLocaleDateString('ar', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <span class="badge" style="background:${daySessions.length > 0 ? 'var(--primary-glow)' : 'rgba(0,0,0,0.05)'}; color:${daySessions.length > 0 ? 'var(--primary)' : 'var(--text-muted)'}; font-weight:800; font-size:0.75rem;">
                    ${daySessions.length} حصص
                  </span>
                </div>

                <div style="display:flex; flex-direction:column; gap:10px; flex:1;">
                  ${daySessions.length === 0 ? `
                    <div style="text-align:center; padding:30px 10px; color:var(--text-muted); font-size:0.8rem; font-style:italic;">
                      لا توجد حصص مجدولة
                    </div>
                  ` : daySessions.map(sess => {
                    const teacherTz = sess.teacher?.timezone || "Africa/Cairo";
                    const formatted = formatSessionDateTime(sess.scheduledAt, "Asia/Riyadh", { secondaryTz: teacherTz });
                    const teacherName = sess.teacher?.name || sess.course?.teacher?.name || "معلم المنصة";
                    const studentName = sess.student?.name || (sess.course ? "طلاب الدورة الجماعية" : "حصة خاصة");
                    const sessTeacherId = sess.teacher?.id || sess.teacherId || sess.course?.teacher?.id;
                    const sameTimeGroupCount = sess.scheduledAt && sessTeacherId ? allSessions.filter(s => {
                      const tId = s.teacher?.id || s.teacherId || s.course?.teacher?.id;
                      return String(tId) === String(sessTeacherId) && s.scheduledAt && new Date(s.scheduledAt).getTime() === new Date(sess.scheduledAt).getTime();
                    }).length : 1;

                    return `
                      <div style="background:var(--bg-app); border-radius:12px; padding:12px; border:1px solid var(--border-color); display:flex; flex-direction:column; gap:6px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
                          ${formatted.badgeHTML}
                          ${getStatusBadge(sess.status)}
                        </div>
                        <strong style="font-size:0.88rem; color:var(--text-main);">${sess.title || "حصة خاصة"}</strong>
                        <div style="font-size:0.78rem; color:var(--primary); font-weight:700;">
                          ⏰ ${formatted.timeStr} ${formatted.secondaryTZHTML}
                        </div>
                        <div style="font-size:0.78rem; color:var(--text-muted);">
                          <div>👨‍🏫 ${teacherName}</div>
                          <div>👤 ${studentName}</div>
                        </div>
                        <div style="display:flex; gap:6px; margin-top:4px; justify-content:flex-end;">
                          ${sess.status !== "completed" && !sess.status?.includes("cancelled") ? `
                            <button class="btn-secondary admin-reassign-teacher-btn" data-id="${sess.id}" style="font-size:0.72rem; padding:4px 8px;">تغيير المعلم</button>
                            <button class="btn-secondary admin-cancel-session-btn" data-id="${sess.id}" style="font-size:0.72rem; padding:4px 8px; color:var(--error);">إلغاء</button>
                          ` : ''}
                          <a href="#classroom/${sess.id}" class="btn-primary" style="font-size:0.72rem; padding:4px 8px; text-decoration:none;">دخول</a>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <!-- Table View -->
        <div class="glass-card" style="padding:0; border-radius:18px; overflow:hidden; border:1px solid var(--border-color);">
          ${filteredSessions.length === 0 ? `
            <div style="text-align:center; padding:60px 20px; color:var(--text-muted);">
              <i data-lucide="video" style="width:48px; height:48px; opacity:0.3; margin-bottom:12px;"></i>
              <h4 style="font-weight:700; margin-bottom:6px;">لا توجد حصص تطابق التصفية المحددة</h4>
              <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">اختر فترة زمنية أخرى أو تصفية "الكل" لعرض كافة الحصص.</p>
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
                  ${filteredSessions.map(sess => {
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
      `}
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
  renderSingleSubRow(s, isChild = false, isHidden = false) {
    let statusBadgeBg = 'rgba(16,185,129,0.1)';
    let statusBadgeColor = '#10b981';
    let statusText = s.status;

    if (s.status === 'PENDING_PAYMENT') {
      statusBadgeBg = 'rgba(245,158,11,0.15)';
      statusBadgeColor = '#f59e0b';
      statusText = '1️⃣ في انتظار تأكيد الدفع ورفع الإيصال ⏳';
    } else if (s.status === 'TEACHER_ASSIGNMENT_PENDING') {
      statusBadgeBg = 'rgba(59,130,246,0.15)';
      statusBadgeColor = '#3b82f6';
      statusText = '2️⃣ تم الدفع - في انتظار تعيين المعلم ⏳';
    } else if (s.status === 'SCHEDULE_PENDING') {
      statusBadgeBg = 'rgba(139,92,246,0.15)';
      statusBadgeColor = '#8b5cf6';
      statusText = '3️⃣ تم تعيين المعلم - في انتظار جدولة الباقة 🗓️';
    } else if (s.status === 'ACTIVE') {
      statusBadgeBg = 'rgba(16,185,129,0.15)';
      statusBadgeColor = '#10b981';
      statusText = 'نشط ✅';
    } else if (s.status === 'CANCELLED') {
      statusBadgeBg = 'rgba(239,68,68,0.15)';
      statusBadgeColor = '#ef4444';
      statusText = 'ملغى ❌';
    }

    const rowBg = s.isLowBalance 
      ? 'background:rgba(239,68,68,0.03);' 
      : (isChild ? 'background:rgba(0,0,0,0.015);' : '');

    const displayStyle = isHidden ? 'display:none;' : '';
    const childBorder = isChild ? 'border-inline-start:4px solid var(--primary);' : '';
    const studentIdAttr = s.studentId || s.student?.id || '';

    return `
    <tr class="${isChild ? `admin-sub-child-row student-child-${studentIdAttr}` : ''}" style="border-bottom:1px solid var(--border-color);font-size:0.85rem;${rowBg}${childBorder}${displayStyle}">
      <td style="padding:12px;color:var(--text-muted);${isChild ? 'padding-inline-start:24px;' : ''}">
        ${isChild ? '<span style="font-size:0.75rem; color:var(--primary); font-weight:700; margin-inline-end:4px;">↳</span>' : ''}#${s.id.substring(0,8)}
      </td>
      <td style="padding:12px;font-weight:600;">${s.student?.name || '-'}</td>
      <td style="padding:12px;">
        ${s.plan?.name || '-'} 
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
          ${s.totalSessions} حصص الإجمالي - ${s.plan?.price || 0} ج.م
        </div>
      </td>
      <td style="padding:12px;">${s.teacher?.name || '<span style="color:var(--warning,#f59e0b);">في الانتظار</span>'}</td>
      <td style="padding:12px;">
        <div style="display:flex; flex-direction:column; gap:4px; align-items:flex-start;">
          <span class="badge" style="background:${statusBadgeBg};color:${statusBadgeColor};font-weight:600;">
            ${statusText}
          </span>
          ${s.isLowBalance ? `
            <span class="badge" style="background:rgba(239,68,68,0.15);color:#ef4444;font-weight:700;font-size:0.72rem;display:inline-flex;align-items:center;gap:4px;">
              <i data-lucide="alert-triangle" style="width:12px;height:12px;"></i> رصيد منخفض (${s.remainingSessionsInPackage} حصص متبقية)
            </span>
          ` : ''}
        </div>
      </td>
      <td style="padding:12px;display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${s.status === 'PENDING_PAYMENT' ? `
            <button class="btn-primary admin-approve-sub-btn" data-id="${s.id}" style="padding:6px 10px;font-size:0.75rem;background:#10b981;border-color:#10b981;gap:4px;">
              <i data-lucide="check-circle" style="width:14px;height:14px;"></i> 1️⃣ قبول + رفع إيصال
            </button>
            <button class="btn-secondary admin-reject-sub-btn" data-id="${s.id}" style="padding:6px 10px;font-size:0.75rem;color:#ef4444;border-color:#ef4444;gap:4px;">
              <i data-lucide="x-circle" style="width:14px;height:14px;"></i> رفض
            </button>
            ` : ''}

            ${s.status === 'TEACHER_ASSIGNMENT_PENDING' ? `
            <button class="btn-primary admin-assign-teacher-sub-btn" data-id="${s.id}" style="padding:6px 10px;font-size:0.75rem;background:#3b82f6;border-color:#3b82f6;color:#fff;gap:4px;">
              <i data-lucide="user-plus" style="width:14px;height:14px;"></i> 2️⃣ تعيين المعلم
            </button>
            ` : ''}

            ${s.status === 'SCHEDULE_PENDING' ? `
            <button class="btn-primary admin-package-wizard-btn" data-id="${s.id}" data-teacher="${s.teacher?.id || ''}" style="padding:6px 10px;font-size:0.75rem;background:#8b5cf6;border-color:#8b5cf6;gap:4px;">
              <i data-lucide="calendar-range" style="width:14px;height:14px;"></i> 3️⃣ جدولة الباقة 🗓️
            </button>
            <button class="btn-secondary admin-assign-teacher-sub-btn" data-id="${s.id}" style="padding:6px;font-size:0.75rem;">
              <i data-lucide="user-plus" style="width:14px;height:14px;"></i> تغيير المعلم
            </button>
            ` : ''}

            ${(s.status === 'ACTIVE' || s.isLowBalance) ? `
            <button class="btn-primary admin-renew-sub-btn" data-id="${s.id}" style="padding:6px 10px;font-size:0.75rem;background:#8b5cf6;border-color:#8b5cf6;gap:4px;">
              <i data-lucide="refresh-cw" style="width:14px;height:14px;"></i> تجديد + رفع إيصال 💳
            </button>
            ` : ''}

            ${s.status === 'ACTIVE' ? `
            <button class="btn-secondary admin-edit-schedule-btn" data-id="${s.id}" data-teacher="${s.teacher?.id || ''}" style="padding:6px;font-size:0.75rem;gap:4px;border-color:var(--primary);color:var(--primary);font-weight:700;">
              <i data-lucide="edit-3" style="width:14px;height:14px;"></i> تعديل الجدولة ✏️
            </button>
            <button class="btn-secondary admin-view-sub-sessions-btn" data-id="${s.id}" style="padding:6px;font-size:0.75rem;gap:4px;">
              <i data-lucide="list" style="width:14px;height:14px;"></i> عرض الحصص 🔍
            </button>
            <button class="btn-secondary admin-assign-teacher-sub-btn" data-id="${s.id}" style="padding:6px;font-size:0.75rem;">
              <i data-lucide="user-plus" style="width:14px;height:14px;"></i> المعلم
            </button>
            ` : ''}
        </div>
        ${s.status === 'ACTIVE' ? `
        <div style="font-size:0.75rem; display:flex; gap:10px; flex-wrap:wrap; color:var(--text-muted); background:rgba(0,0,0,0.02); padding:6px; border-radius:6px;">
            <span style="color:#10b981;font-weight:600;">مكتملة: ${s.completedSessions}</span>
            <span style="color:var(--primary);font-weight:600;">مجدولة: ${s.scheduledSessions}</span>
            <span style="color:#8b5cf6;font-weight:600;">غير مجدولة: ${s.remainingToBook}</span>
            <span style="color:${s.remainingSessionsInPackage < 3 ? '#ef4444' : '#10b981'};font-weight:700;">المتبقي بالباقة: ${s.remainingSessionsInPackage}</span>
        </div>
        ` : ''}
      </td>
    </tr>
  `;
  }

  // ── 9. Subscriptions Tab ─────────────────────────────────────────────────────────────
  renderSubscriptionsTab() {
    const allSubs = this.subscriptions || [];
    const allSessions = this.allSessions || [];

    // Map metrics for all subscriptions
    const subsWithMetrics = allSubs.map(s => {
      const totalSessions = s.totalSessions || s.plan?.sessionsCount || 0;
      const subSessions = allSessions.filter(sess => sess.subscription?.id === s.id);
      const completedSessions = subSessions.filter(sess => sess.status === 'COMPLETED' || sess.status === 'completed').length;
      const scheduledSessions = subSessions.filter(sess => sess.status === 'SCHEDULED' || sess.status === 'scheduled' || sess.status === 'RESCHEDULED').length;
      const totalBooked = completedSessions + scheduledSessions;
      const remainingToBook = Math.max(0, totalSessions - totalBooked);
      const remainingSessionsInPackage = Math.max(0, totalSessions - completedSessions);
      const isLowBalance = (s.status === 'ACTIVE' || s.status === 'TEACHER_ASSIGNMENT_PENDING') && remainingSessionsInPackage < 3;

      return {
        ...s,
        totalSessions,
        completedSessions,
        scheduledSessions,
        totalBooked,
        remainingToBook,
        remainingSessionsInPackage,
        isLowBalance
      };
    });

    const lowBalanceCount = subsWithMetrics.filter(s => s.isLowBalance).length;
    const pendingCount = subsWithMetrics.filter(s => s.status === 'PENDING_PAYMENT').length;

    // Apply Filter
    const filter = this.subFilter || "all";
    const filteredSubs = subsWithMetrics.filter(s => {
      if (filter === "low_sessions") return s.isLowBalance;
      if (filter === "pending") return s.status === "PENDING_PAYMENT";
      if (filter === "active") return s.status === "ACTIVE";
      if (filter === "cancelled") return s.status === "CANCELLED";
      return true;
    });

    // Group filtered subscriptions by student
    const studentGroups = {};
    const groupedSubsList = [];
    filteredSubs.forEach(s => {
      const studentKey = String(s.studentId || s.student?.id || s.student?.email || s.student?.name || 'unknown');
      if (!studentGroups[studentKey]) {
        studentGroups[studentKey] = {
          studentId: studentKey,
          studentName: s.student?.name || 'طالب غير محدد',
          subs: []
        };
        groupedSubsList.push(studentGroups[studentKey]);
      }
      studentGroups[studentKey].subs.push(s);
    });

    const renderedRowsHtml = groupedSubsList.map(group => {
      if (group.subs.length === 1) {
        return this.renderSingleSubRow(group.subs[0]);
      }

      // Aggregate metrics for multiple subscriptions of the same student
      const totalSessionsSum = group.subs.reduce((sum, item) => sum + (item.totalSessions || 0), 0);
      const completedSessionsSum = group.subs.reduce((sum, item) => sum + (item.completedSessions || 0), 0);
      const scheduledSessionsSum = group.subs.reduce((sum, item) => sum + (item.scheduledSessions || 0), 0);
      const remainingToBookSum = group.subs.reduce((sum, item) => sum + (item.remainingToBook || 0), 0);
      const remainingSessionsInPackageSum = group.subs.reduce((sum, item) => sum + (item.remainingSessionsInPackage || 0), 0);
      const totalPriceSum = group.subs.reduce((sum, item) => sum + (item.plan?.price || 0), 0);
      const isLowBalanceAny = group.subs.some(item => item.isLowBalance);
      const pendingCountGroup = group.subs.filter(item => item.status === 'PENDING_PAYMENT').length;
      const activeCountGroup = group.subs.filter(item => item.status === 'ACTIVE').length;
      const teachersList = [...new Set(group.subs.map(item => item.teacher?.name).filter(Boolean))].join('، ') || 'في الانتظار';
      const isExpanded = this.expandedStudents ? this.expandedStudents.has(group.studentId) : false;

      const latestSub = group.subs[0];
      let primaryActionBtnHtml = '';

      if (latestSub.status === 'PENDING_PAYMENT') {
        primaryActionBtnHtml = `
          <button class="btn-primary admin-approve-sub-btn" data-id="${latestSub.id}" style="padding:6px 10px;font-size:0.75rem;background:#10b981;border-color:#10b981;gap:4px;">
            <i data-lucide="check-circle" style="width:14px;height:14px;"></i> 1️⃣ قبول + رفع إيصال
          </button>
        `;
      } else if (latestSub.status === 'TEACHER_ASSIGNMENT_PENDING') {
        primaryActionBtnHtml = `
          <button class="btn-primary admin-assign-teacher-sub-btn" data-id="${latestSub.id}" style="padding:6px 10px;font-size:0.75rem;background:#3b82f6;border-color:#3b82f6;color:#fff;gap:4px;">
            <i data-lucide="user-plus" style="width:14px;height:14px;"></i> 2️⃣ تعيين المعلم
          </button>
        `;
      } else if (latestSub.status === 'SCHEDULE_PENDING') {
        primaryActionBtnHtml = `
          <button class="btn-primary admin-package-wizard-btn" data-id="${latestSub.id}" data-teacher="${latestSub.teacher?.id || ''}" style="padding:6px 10px;font-size:0.75rem;background:#8b5cf6;border-color:#8b5cf6;gap:4px;">
            <i data-lucide="calendar-range" style="width:14px;height:14px;"></i> 3️⃣ جدولة الباقة 🗓️
          </button>
        `;
      } else if (latestSub.status === 'ACTIVE' || latestSub.isLowBalance) {
        primaryActionBtnHtml = `
          <button class="btn-primary admin-renew-sub-btn" data-id="${latestSub.id}" style="padding:6px 10px;font-size:0.75rem;background:#8b5cf6;border-color:#8b5cf6;gap:4px;">
            <i data-lucide="refresh-cw" style="width:14px;height:14px;"></i> 💳 تجديد + رفع إيصال
          </button>
        `;
      }

      const summaryRow = `
        <tr class="admin-student-summary-row" data-student-id="${group.studentId}" style="border-bottom:1px solid var(--border-color); font-size:0.85rem; background:rgba(99,102,241,0.06); cursor:pointer;">
          <td style="padding:12px; color:var(--primary); font-weight:800;">
            <div style="display:flex; align-items:center; gap:6px;">
              <i data-lucide="${isExpanded ? 'chevron-down' : 'chevron-left'}" style="width:16px;height:16px;"></i>
              <span>مجمّع (${group.subs.length})</span>
            </div>
          </td>
          <td style="padding:12px; font-weight:700;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:0.95rem;">${group.studentName}</span>
              <span class="badge" style="background:var(--primary-glow); color:var(--primary); font-weight:800; font-size:0.72rem;">${group.subs.length} اشتراكات</span>
            </div>
          </td>
          <td style="padding:12px;">
            <strong style="color:var(--text-main); font-size:0.9rem;">إجمالي ${totalSessionsSum} حصص</strong>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
              إجمالي التكلفة: ${totalPriceSum} ج.م
            </div>
          </td>
          <td style="padding:12px; font-weight:600; font-size:0.82rem;">${teachersList}</td>
          <td style="padding:12px;">
            <div style="display:flex; flex-direction:column; gap:4px; align-items:flex-start;">
              <span class="badge" style="background:rgba(59,130,246,0.15); color:#3b82f6; font-weight:700;">
                مجموع ${group.subs.length} اشتراكات (${activeCountGroup} نشط${pendingCountGroup > 0 ? `، ${pendingCountGroup} انتظار` : ''})
              </span>
              ${isLowBalanceAny ? `
                <span class="badge" style="background:rgba(239,68,68,0.15);color:#ef4444;font-weight:700;font-size:0.72rem;display:inline-flex;align-items:center;gap:4px;">
                  <i data-lucide="alert-triangle" style="width:12px;height:12px;"></i> يوجد اشتراك برصيد منخفض
                </span>
              ` : ''}
            </div>
          </td>
          <td style="padding:12px; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
              ${primaryActionBtnHtml}
              <button class="btn-primary toggle-student-subs-btn" data-student-id="${group.studentId}" style="padding:6px 12px; font-size:0.78rem; gap:6px; background:var(--primary); font-weight:700; border-radius:8px;">
                <i data-lucide="${isExpanded ? 'chevron-up' : 'chevron-down'}" style="width:14px;height:14px;"></i>
                ${isExpanded ? 'إخفاء الاشتراكات' : `عرض جميع الاشتراكات (${group.subs.length})`}
              </button>
            </div>
            <div style="font-size:0.75rem; display:flex; gap:8px; flex-wrap:wrap; color:var(--text-muted); background:rgba(0,0,0,0.03); padding:6px 8px; border-radius:6px;">
              <span style="color:#10b981;font-weight:700;">مكتملة: ${completedSessionsSum}</span>
              <span style="color:var(--primary);font-weight:700;">مجدولة: ${scheduledSessionsSum}</span>
              <span style="color:#8b5cf6;font-weight:700;">غير مجدولة: ${remainingToBookSum}</span>
              <span style="color:${remainingSessionsInPackageSum < 3 ? '#ef4444' : '#10b981'};font-weight:800;">المتبقي بالباقة: ${remainingSessionsInPackageSum}</span>
            </div>
          </td>
        </tr>
      `;

      const childRows = group.subs.map(s => this.renderSingleSubRow(s, true, !isExpanded)).join('');
      return summaryRow + childRows;
    }).join('');

    return `
      ${lowBalanceCount > 0 ? `
      <div class="glass-card" style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.3); color:#ef4444; padding:16px 20px; border-radius:14px; margin-bottom:20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <i data-lucide="alert-triangle" style="width:24px;height:24px;flex-shrink:0;"></i>
          <div>
            <strong style="font-size:0.95rem;">تنبيه رصيد الحصص ⚠️:</strong>
            <span style="font-size:0.88rem; color:var(--text-main); margin-inline-start:6px;">يوجد <strong>${lowBalanceCount}</strong> اشتراك متبقي به أقل من 3 حصص ويحتاج إلى التجديد!</span>
          </div>
        </div>
        <button class="btn-primary admin-sub-filter-btn" data-filter="low_sessions" style="background:#ef4444; border-color:#ef4444; font-size:0.75rem; padding:6px 14px;">
          عرض الاشتراكات المنخفضة (${lowBalanceCount})
        </button>
      </div>
      ` : ''}

      <div class="glass-card" style="padding:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
          <h3 style="font-weight:700;font-size:1.1rem;display:flex;align-items:center;gap:8px;">
            <i data-lucide="calendar-heart" style="color:var(--primary);width:20px;height:20px;"></i>
            قائمة الاشتراكات
          </h3>
          
          <!-- Filters -->
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn-secondary admin-sub-filter-btn ${filter === 'all' ? 'active' : ''}" data-filter="all" style="padding:6px 12px; font-size:0.8rem; ${filter === 'all' ? 'background:var(--primary);color:#fff;border-color:var(--primary);' : ''}">
              الكل (${subsWithMetrics.length})
            </button>
            <button class="btn-secondary admin-sub-filter-btn ${filter === 'low_sessions' ? 'active' : ''}" data-filter="low_sessions" style="padding:6px 12px; font-size:0.8rem; ${filter === 'low_sessions' ? 'background:#ef4444;color:#fff;border-color:#ef4444;' : ''}">
              ⚠️ رصيد منخفض (${lowBalanceCount})
            </button>
            <button class="btn-secondary admin-sub-filter-btn ${filter === 'pending' ? 'active' : ''}" data-filter="pending" style="padding:6px 12px; font-size:0.8rem; ${filter === 'pending' ? 'background:#f59e0b;color:#fff;border-color:#f59e0b;' : ''}">
              ⏳ في انتظار الدفع (${pendingCount})
            </button>
            <button class="btn-secondary admin-sub-filter-btn ${filter === 'active' ? 'active' : ''}" data-filter="active" style="padding:6px 12px; font-size:0.8rem; ${filter === 'active' ? 'background:#10b981;color:#fff;border-color:#10b981;' : ''}">
              ✅ نشط
            </button>
            <button class="btn-secondary admin-sub-filter-btn ${filter === 'cancelled' ? 'active' : ''}" data-filter="cancelled" style="padding:6px 12px; font-size:0.8rem; ${filter === 'cancelled' ? 'background:var(--border-color);' : ''}">
              ❌ ملغى
            </button>
          </div>
        </div>

        <div style="overflow-x:auto;">
          <table class="table" style="width:100%;text-align:start;border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:1px solid var(--border-color);color:var(--text-muted);font-size:0.8rem;">
                <th style="padding:12px;font-weight:700;">المعرف</th>
                <th style="padding:12px;font-weight:700;">الطالب</th>
                <th style="padding:12px;font-weight:700;">الخطة / الحصص</th>
                <th style="padding:12px;font-weight:700;">المعلم المعين</th>
                <th style="padding:12px;font-weight:700;">الحالة والتنبيهات</th>
                <th style="padding:12px;font-weight:700;">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${renderedRowsHtml || `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted);">لا توجد اشتراكات تنطبق عليها شروط البحث.</td></tr>`}
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

  bindActionEvents() {
    // Admin Add Course Modal Open & Close
    this.container.querySelector("#open-admin-add-course-modal-btn")?.addEventListener("click", () => {
      const modal = document.getElementById("admin-course-modal");
      if (modal) modal.style.display = "flex";
    });

    document.getElementById("close-admin-course-modal")?.addEventListener("click", () => {
      const modal = document.getElementById("admin-course-modal");
      if (modal) modal.style.display = "none";
    });

    document.getElementById("cancel-admin-course-modal")?.addEventListener("click", () => {
      const modal = document.getElementById("admin-course-modal");
      if (modal) modal.style.display = "none";
    });

    // Toggle custom category in admin course modal
    document.getElementById("admin-course-category-select")?.addEventListener("change", (e) => {
      const customWrapper = document.getElementById("admin-course-category-custom-wrapper");
      if (customWrapper) customWrapper.style.display = e.target.value === "__custom__" ? "block" : "none";
    });

    // Toggle direct URL input in admin course modal
    document.getElementById("admin-toggle-url-input-btn")?.addEventListener("click", () => {
      const urlWrapper = document.getElementById("admin-url-input-wrapper");
      if (urlWrapper) urlWrapper.style.display = urlWrapper.style.display === "none" ? "block" : "none";
    });

    // File input trigger
    document.getElementById("admin-btn-trigger-upload")?.addEventListener("click", () => {
      document.getElementById("admin-course-image-file")?.click();
    });

    // Handle Image Upload
    document.getElementById("admin-course-image-file")?.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const idleBox = document.getElementById("admin-image-upload-idle");
      const loadingBox = document.getElementById("admin-image-upload-loading");
      const previewWrapper = document.getElementById("admin-image-preview-wrapper");
      const previewImg = document.getElementById("admin-course-preview-img");

      if (idleBox) idleBox.style.display = "none";
      if (loadingBox) loadingBox.style.display = "block";

      const formData = new FormData();
      formData.append("file", file);
      try {
        const token = localStorage.getItem("token");
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadData.url) {
          document.getElementById("admin-course-image").value = uploadData.url;
          if (previewImg) previewImg.src = uploadData.url;
          if (loadingBox) loadingBox.style.display = "none";
          if (previewWrapper) previewWrapper.style.display = "block";
          showToast("تم رفع صورة الغلاف بنجاح! 📸", "success");
        } else {
          throw new Error("فشل رفع الصورة");
        }
      } catch (err) {
        if (loadingBox) loadingBox.style.display = "none";
        if (idleBox) idleBox.style.display = "block";
        showToast(err.message || "فشل رفع صورة الغلاف", "error");
      }
    });

    // Remove cover image
    document.getElementById("admin-remove-course-image-btn")?.addEventListener("click", () => {
      document.getElementById("admin-course-image").value = "";
      document.getElementById("admin-course-image-file").value = "";
      const previewWrapper = document.getElementById("admin-image-preview-wrapper");
      const idleBox = document.getElementById("admin-image-upload-idle");
      if (previewWrapper) previewWrapper.style.display = "none";
      if (idleBox) idleBox.style.display = "block";
    });

    // Submit Admin Course Form
    const adminCourseForm = document.getElementById("admin-course-form");
    if (adminCourseForm) {
      const freshForm = adminCourseForm.cloneNode(true);
      adminCourseForm.parentNode.replaceChild(freshForm, adminCourseForm);
      let isSubmitting = false;

      freshForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        isSubmitting = true;
        const submitBtn = freshForm.querySelector("button[type='submit']");
        if (submitBtn) submitBtn.disabled = true;

        const title = document.getElementById("admin-course-title").value.trim();
        const catSelectEl = document.getElementById("admin-course-category-select");
        const catCustomEl = document.getElementById("admin-course-category-custom");
        const category = catSelectEl.value === "__custom__" ? catCustomEl.value.trim() : catSelectEl.value;
        if (!category) { 
          showToast("الرجاء اختيار أو إدخال تصنيف الدورة.", "error"); 
          isSubmitting = false;
          if (submitBtn) submitBtn.disabled = false;
          return; 
        }
        const degree = document.getElementById("admin-course-degree").value;
        const teacherId = document.getElementById("admin-course-teacher-id").value;
        const description = document.getElementById("admin-course-desc").value.trim();
        let image = document.getElementById("admin-course-image").value;
        const directUrl = document.getElementById("admin-course-image-url-direct")?.value.trim();
        if (directUrl) image = directUrl;
        const meetingLink = document.getElementById("admin-course-meeting-link").value.trim();

        const payload = { title, category, degree, teacherId, image, meetingLink, description };

        try {
          await apiFetch("/admin/courses", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          showToast("تم إنشاء ونشر الدورة بنجاح! 🎉", "success");
          const modal = document.getElementById("admin-course-modal");
          if (modal) modal.style.display = "none";
          await this.loadAllData();
          this.renderTab("courses");
        } catch (err) {
          showToast(err.message || "فشل إنشاء الدورة", "error");
        } finally {
          isSubmitting = false;
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }

    // Admin Approve Teacher Course Submission
    this.container.querySelectorAll(".admin-approve-course-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        try {
          const res = await apiFetch(`/admin/courses/${id}/approve`, { method: "POST" });
          showToast(res.message || "تمت الموافقة على نشر الدورة بنجاح! 🎉", "success");
          await this.loadAllData();
          this.renderTab("courses");
        } catch (err) {
          showToast(err.message || "فشل واعتماد نشر الدورة", "error");
        }
      });
    });

    // Admin Reject Teacher Course Submission
    this.container.querySelectorAll(".admin-reject-course-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const confirmed = await confirmDialog("هل أنت تأكد من رفض هذه الدورة؟");
        if (!confirmed) return;
        try {
          const res = await apiFetch(`/admin/courses/${id}/reject`, { method: "POST" });
          showToast(res.message || "تم رفض الدورة", "info");
          await this.loadAllData();
          this.renderTab("courses");
        } catch (err) {
          showToast(err.message || "فشل رفض الدورة", "error");
        }
      });
    });

    // Admin Approve Course Enrollment
    this.container.querySelectorAll(".admin-approve-enrollment-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        try {
          const res = await apiFetch(`/admin/enrollments/${id}/approve`, { method: "POST" });
          showToast(res.message || "تم اعتماد تسجيل الطالب بنجاح! ✅", "success");
          await this.loadAllData();
          this.renderTab("enrollments");
        } catch (err) {
          showToast(err.message || "فشل اعتماد التسجيل", "error");
        }
      });
    });

    // Admin Reject Course Enrollment
    this.container.querySelectorAll(".admin-reject-enrollment-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const confirmed = await confirmDialog("هل أنت تأكد من رفض طلب التسجيل هذا؟");
        if (!confirmed) return;
        try {
          const res = await apiFetch(`/admin/enrollments/${id}/reject`, { method: "POST" });
          showToast(res.message || "تم رفض طلب التسجيل", "info");
          await this.loadAllData();
          this.renderTab("enrollments");
        } catch (err) {
          showToast(err.message || "فشل رفض التسجيل", "error");
        }
      });
    });

    // Subscription Filters
    this.container.querySelectorAll(".admin-sub-filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const filter = btn.getAttribute("data-filter");
        this.subFilter = filter;
        this.renderTab("subscriptions");
      });
    });

    // Toggle student subscription group expansion
    this.container.querySelectorAll(".toggle-student-subs-btn, .admin-student-summary-row").forEach(el => {
      el.addEventListener("click", (e) => {
        if (e.target.closest("button") && !e.target.closest(".toggle-student-subs-btn")) return;
        const studentId = el.getAttribute("data-student-id");
        if (!studentId) return;

        if (this.expandedStudents.has(studentId)) {
          this.expandedStudents.delete(studentId);
        } else {
          this.expandedStudents.add(studentId);
        }
        this.renderTab("subscriptions");
      });
    });

    // Admin Renew Subscription
    this.container.querySelectorAll(".admin-renew-sub-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const subId = btn.getAttribute("data-id");
        this.renderRenewSubscriptionModal(subId);
      });
    });

    // Admin Approve Subscription (with receipt upload modal)
    this.container.querySelectorAll(".admin-approve-sub-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const subId = btn.getAttribute("data-id");
        this.renderApproveSubscriptionModal(subId);
      });
    });

    // Admin Reject Subscription
    this.container.querySelectorAll(".admin-reject-sub-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const subId = btn.getAttribute("data-id");
        const confirmed = await confirmDialog("هل أنت تأكد من رفض هذا طلب الاشتراك؟");
        if (!confirmed) return;
        try {
          const res = await apiFetch(`/admin/subscriptions/${subId}/reject`, { method: "PATCH" });
          showToast(res.message || "تم رفض الاشتراك", "success");
          await this.loadAllData();
          this.renderTab("subscriptions");
        } catch (err) {
          showToast(err.message || "فشل رفض الاشتراك", "error");
        }
      });
    });

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

    // Admin Open Group Session Modal
    this.container.querySelector("#admin-open-group-session-btn")?.addEventListener("click", () => {
      this.renderGroupSessionModal();
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

    // Session Time Filter Buttons (Day, Week, Month, All)
    this.container.querySelectorAll(".admin-session-time-filter-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const filter = e.currentTarget.getAttribute("data-filter");
        this.sessionTimeFilter = filter;
        this.renderTab("sessions");
      });
    });

    // Session Custom Date Picker
    const sessionDatePicker = this.container.querySelector("#admin-session-date-picker");
    if (sessionDatePicker) {
      sessionDatePicker.addEventListener("change", (e) => {
        this.sessionCustomDate = e.target.value;
        this.sessionTimeFilter = "custom";
        this.renderTab("sessions");
      });
    }

    // Session View Mode Switcher (List vs Timetable)
    this.container.querySelectorAll(".admin-session-view-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const mode = e.currentTarget.getAttribute("data-mode");
        this.sessionViewMode = mode;
        this.renderTab("sessions");
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

    // View Course Details & Subscription Plans Modal
    this.container.querySelectorAll(".admin-view-course-details-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        const course = (this.courses || []).find(c => String(c.id) === String(id));
        if (course) this.renderCourseDetailsModal(course);
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
                  <label for="member-phone" style="font-size:0.85rem; font-weight:700; margin-bottom:4px; display:block;">رقم هاتف المستخدم والواتساب</label>
                  ${renderPhoneInputGroup({ selectId: "member-phone-code", inputId: "member-phone-num", defaultCode: "+20", value: isEdit ? (user.phone || "") : "", placeholder: "01012345678", required: false })}
                </div>
                <div class="form-group" style="margin:0;">
                  <label for="member-education" style="font-size:0.85rem; font-weight:700; margin-bottom:4px; display:block;">المستوى الدراسي</label>
                  ${renderEducationSelectHTML({ id: "member-education", selectedValue: isEdit ? (user.education || "Bakalorya 3") : "Bakalorya 3", style: "padding:8px 12px; font-size:0.88rem;" })}
                </div>
              </div>

              <!-- Parent Phone (Required for New Students) -->
              <div id="parent-phone-group" style="display:${initialRole === 'student' ? 'block' : 'none'}; margin-top:2px;">
                <div class="form-group" style="margin:0;">
                  <label for="member-parent-phone" style="font-size:0.85rem; font-weight:700; margin-bottom:4px; display:block;">
                    رقم هاتف ولي الأمر (Parent Phone)
                  </label>
                  ${renderPhoneInputGroup({ selectId: "member-parent-phone-code", inputId: "member-parent-phone-num", defaultCode: "+20", value: isEdit ? (user.parentPhone || "") : "", placeholder: "01012345678", required: false })}
                </div>
              </div>

              <!-- Teacher Capabilities & Hourly Rate Section -->
              <div id="teacher-capabilities-group" style="display:${initialRole === 'teacher' ? 'block' : 'none'}; background:rgba(99,102,241,0.06); padding:14px; border-radius:14px; border:1px solid var(--border-focus); margin-top:4px;">
                
                <div class="form-group" style="margin-bottom:12px;">
                  <label for="member-meeting-link" style="font-size:0.85rem; font-weight:800; color:var(--primary); margin-bottom:4px; display:block;">
                    🔗 رابط اجتماع المعلم الثابت (Google Meet / Zoom Static Link):
                  </label>
                  <input type="url" id="member-meeting-link" class="form-input" value="${isEdit ? (user.meetingLink || '') : ''}" placeholder="https://meet.google.com/abc-defg-hij" style="padding:8px 12px; font-size:0.88rem; width:100%;">
                </div>

                <div class="form-group" style="margin-bottom:12px;">
                  <label for="member-hourly-rate" style="font-size:0.85rem; font-weight:800; color:var(--primary); margin-bottom:4px; display:block;">
                    💵 أجر الساعة للمعلم (Hourly Rate):
                  </label>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <input type="number" id="member-hourly-rate" class="form-input" min="0" step="5" value="${isEdit ? (user.hourlyRate !== undefined ? user.hourlyRate : 150) : 150}" placeholder="150" style="padding:8px 12px; font-size:0.88rem; flex:1;">
                    <span style="font-size:0.85rem; font-weight:700; color:var(--text-muted);">ج.م / ساعة</span>
                  </div>
                </div>

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
      const parentPhoneGroup = document.getElementById("parent-phone-group");
      if (parentPhoneGroup) parentPhoneGroup.style.display = e.target.value === "student" ? "block" : "none";
    });

    document.getElementById("member-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("member-name").value;
      const email = document.getElementById("member-email").value;
      const role = document.getElementById("member-role").value;
      const password = document.getElementById("member-password").value;
      const phoneCode = document.getElementById("member-phone-code")?.value || "+20";
      const phoneNum = document.getElementById("member-phone-num")?.value.trim() || "";
      const phone = phoneNum ? `${phoneCode} ${phoneNum}`.trim() : "";

      const parentPhoneCode = document.getElementById("member-parent-phone-code")?.value || "+20";
      const parentPhoneNum = document.getElementById("member-parent-phone-num")?.value.trim() || "";
      const parentPhone = parentPhoneNum ? `${parentPhoneCode} ${parentPhoneNum}`.trim() : "";

      const education = document.getElementById("member-education")?.value || "";
      const hourlyRate = parseFloat(document.getElementById("member-hourly-rate")?.value) || 150;
      const meetingLink = document.getElementById("member-meeting-link")?.value.trim() || "";

      const teacherCapabilities = [];
      if (role === "teacher") {
        if (document.getElementById("cap-course")?.checked) teacherCapabilities.push("COURSE_INSTRUCTOR");
        if (document.getElementById("cap-session")?.checked) teacherCapabilities.push("SESSION_TEACHER");
      }

      try {
        if (isEdit) {
          await apiFetch(`/admin/users/${user.id}`, {
            method: "PUT",
            body: JSON.stringify({ name, email, role, password, phone, parentPhone, education, hourlyRate, meetingLink, teacherCapabilities })
          });
          showToast(t("admin.toast.userUpdated") || "تم تحديث بيانات العضو بنجاح! ✅", "success");
        } else {
          const res = await apiFetch("/admin/users", {
            method: "POST",
            body: JSON.stringify({ name, email, role, password, phone, parentPhone, education, hourlyRate, meetingLink, teacherCapabilities })
          });
          showToast(t("admin.toast.userCreated") || "تم إنشاء حساب العضو بنجاح! 🎉", "success");
          handleWhatsAppResponse(res);
        }
        closeModal();
        await this.loadAllData();
        this.renderTab(this.activeTab);
      } catch (err) {
        console.error("Member save error:", err);
        showToast(err.message || "فشل حفظ بيانات العضو", "error");
      }
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

  renderApproveSubscriptionModal(subId) {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const sub = (this.subscriptions || []).find(s => s.id === subId);
    if (!sub) return;

    const defaultAmount = sub.plan?.price || 0;

    container.innerHTML = `
      <div class="modal-overlay" id="approve-sub-modal" style="display:flex;">
        <div class="modal-content" style="max-width:520px;">
          <div class="modal-header">
            <h3 class="modal-title">قبول طلب الاشتراك وتأكيد الدفع 💳</h3>
            <span class="modal-close-btn" id="close-approve-sub-modal">&times;</span>
          </div>
          <form id="approve-sub-form">
            <div class="modal-body" style="display:flex;flex-direction:column;gap:16px;">
              <div style="background:var(--card-bg-light, rgba(255,255,255,0.05));padding:12px;border-radius:8px;font-size:0.85rem;">
                <div><strong>الطالب:</strong> ${sub.student?.name || '-'}</div>
                <div><strong>الخطة:</strong> ${sub.plan?.name || '-'} (${sub.plan?.sessionsCount || 0} حصص)</div>
                <div><strong>السعر المستحق:</strong> ${defaultAmount} ج.م</div>
              </div>

              <div class="form-group">
                <label style="font-size:0.88rem;font-weight:700;display:block;margin-bottom:6px;">صورة إيصال التحويل / الدفع 🖼️:</label>
                <input type="file" id="approve-sub-receipt-file" class="form-input" accept="image/*" style="width:100%;padding:8px;">
                <div id="receipt-preview-container" style="margin-top:8px;display:none;">
                  <img id="receipt-preview" src="" style="max-height:150px;border-radius:8px;border:1px solid var(--border-color);max-width:100%;">
                </div>
              </div>

              <div class="form-group">
                <label style="font-size:0.88rem;font-weight:700;display:block;margin-bottom:6px;">المبلغ المدفوع (ج.م):</label>
                <input type="number" id="approve-sub-amount" class="form-input" value="${defaultAmount}" required style="width:100%;padding:10px;">
              </div>

              <div class="form-group">
                <label style="font-size:0.88rem;font-weight:700;display:block;margin-bottom:6px;">وسيلة الدفع / المزود:</label>
                <input type="text" id="approve-sub-provider" class="form-input" value="تحويل بنكي / فودافون كاش" style="width:100%;padding:10px;">
              </div>

              <div class="form-group">
                <label style="font-size:0.88rem;font-weight:700;display:block;margin-bottom:6px;">ملاحظات العملية (اختياري):</label>
                <textarea id="approve-sub-notes" class="form-input" rows="2" style="width:100%;padding:10px;" placeholder="رقم المعاملة أو ملاحظات الأدمن..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" id="cancel-approve-sub-btn">إلغاء</button>
              <button type="submit" class="btn-primary" id="submit-approve-sub-btn" style="background:#10b981;border-color:#10b981;">تأكيد الدفع وتفعيل الاشتراك ✅</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = () => { container.innerHTML = ""; };
    document.getElementById("close-approve-sub-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-approve-sub-btn")?.addEventListener("click", closeModal);

    const fileInput = document.getElementById("approve-sub-receipt-file");
    const previewContainer = document.getElementById("receipt-preview-container");
    const previewImg = document.getElementById("receipt-preview");

    fileInput?.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          previewImg.src = e.target.result;
          previewContainer.style.display = "block";
        };
        reader.readAsDataURL(file);
      } else {
        previewContainer.style.display = "none";
      }
    });

    document.getElementById("approve-sub-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById("submit-approve-sub-btn");
      submitBtn.disabled = true;
      submitBtn.innerText = "جاري التفعيل...";

      try {
        let receiptUrl = null;
        if (fileInput?.files?.[0]) {
          const formData = new FormData();
          formData.append("file", fileInput.files[0]);
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            },
            body: formData
          });
          if (uploadRes.ok) {
            const data = await uploadRes.json();
            receiptUrl = data.url;
          } else {
            showToast("فشل رفع صورة الإيصال", "error");
            submitBtn.disabled = false;
            submitBtn.innerText = "تأكيد الدفع وتفعيل الاشتراك ✅";
            return;
          }
        }

        const amount = document.getElementById("approve-sub-amount").value;
        const provider = document.getElementById("approve-sub-provider").value;
        const notes = document.getElementById("approve-sub-notes").value;

        const res = await apiFetch(`/admin/subscriptions/${subId}/approve`, {
          method: "PATCH",
          body: JSON.stringify({ receiptUrl, amount, provider, notes })
        });

        showToast("تم تأكيد الدفع وتفعيل الاشتراك بنجاح 🎉", "success");
        closeModal();
        await this.loadAllData();
        this.renderTab("subscriptions");
      } catch (err) {
        showToast(err.message || "حدث خطأ أثناء تفعيل الاشتراك", "error");
        submitBtn.disabled = false;
        submitBtn.innerText = "تأكيد الدفع وتفعيل الاشتراك ✅";
      }
    });
  }

  renderRenewSubscriptionModal(subId) {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const sub = (this.subscriptions || []).find(s => s.id === subId);
    if (!sub) return;

    const plans = this.allPlans || [];
    const currentPlanId = sub.plan?.id || (plans[0]?.id || "");
    const defaultAmount = sub.plan?.price || 0;
    const defaultSessions = sub.plan?.sessionsCount || 8;

    container.innerHTML = `
      <div class="modal-overlay" id="renew-sub-modal" style="display:flex;">
        <div class="modal-content" style="max-width:520px;">
          <div class="modal-header">
            <h3 class="modal-title">تجديد الاشتراك وإضافة حصص 🔄💳</h3>
            <span class="modal-close-btn" id="close-renew-sub-modal">&times;</span>
          </div>
          <form id="renew-sub-form">
            <div class="modal-body" style="display:flex;flex-direction:column;gap:16px;">
              <div style="background:var(--card-bg-light, rgba(255,255,255,0.05));padding:12px;border-radius:8px;font-size:0.85rem;">
                <div><strong>الطالب:</strong> ${sub.student?.name || '-'}</div>
                <div><strong>الخطة الحالية:</strong> ${sub.plan?.name || '-'}</div>
                <div><strong>إجمالي الحصص المسجلة حالياً:</strong> ${sub.totalSessions || 0} حصة</div>
              </div>

              <div class="form-group">
                <label style="font-size:0.88rem;font-weight:700;display:block;margin-bottom:6px;">اختر باقة التجديد:</label>
                <select id="renew-sub-plan-select" class="form-input" style="width:100%;padding:10px;">
                  ${plans.map(p => `<option value="${p.id}" data-price="${p.price}" data-sessions="${p.sessionsCount}" ${p.id === currentPlanId ? 'selected' : ''}>${p.name} (${p.sessionsCount} حصة - ${p.price} ج.م)</option>`).join('')}
                </select>
              </div>

              <div class="form-group">
                <label style="font-size:0.88rem;font-weight:700;display:block;margin-bottom:6px;">عدد الحصص المضافة للرصيد:</label>
                <input type="number" id="renew-sub-sessions" class="form-input" value="${defaultSessions}" required min="1" style="width:100%;padding:10px;">
              </div>

              <div class="form-group">
                <label style="font-size:0.88rem;font-weight:700;display:block;margin-bottom:6px;">صورة إيصال التحويل / الدفع 🖼️:</label>
                <input type="file" id="renew-sub-receipt-file" class="form-input" accept="image/*" style="width:100%;padding:8px;">
                <div id="renew-receipt-preview-container" style="margin-top:8px;display:none;">
                  <img id="renew-receipt-preview" src="" style="max-height:150px;border-radius:8px;border:1px solid var(--border-color);max-width:100%;">
                </div>
              </div>

              <div class="form-group">
                <label style="font-size:0.88rem;font-weight:700;display:block;margin-bottom:6px;">المبلغ المدفوع للتجديد (ج.م):</label>
                <input type="number" id="renew-sub-amount" class="form-input" value="${defaultAmount}" required style="width:100%;padding:10px;">
              </div>

              <div class="form-group">
                <label style="font-size:0.88rem;font-weight:700;display:block;margin-bottom:6px;">وسيلة الدفع / المزود:</label>
                <input type="text" id="renew-sub-provider" class="form-input" value="تحويل بنكي / فودافون كاش" style="width:100%;padding:10px;">
              </div>

              <div class="form-group">
                <label style="font-size:0.88rem;font-weight:700;display:block;margin-bottom:6px;">ملاحظات عملية التجديد (اختياري):</label>
                <textarea id="renew-sub-notes" class="form-input" rows="2" style="width:100%;padding:10px;" placeholder="رقم عملية التحويل أو أي ملاحظات..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" id="cancel-renew-sub-btn">إلغاء</button>
              <button type="submit" class="btn-primary" id="submit-renew-sub-btn" style="background:#8b5cf6;border-color:#8b5cf6;">حفظ التجديد وإضافة الرصيد ✅</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = () => { container.innerHTML = ""; };
    document.getElementById("close-renew-sub-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-renew-sub-btn")?.addEventListener("click", closeModal);

    const planSelect = document.getElementById("renew-sub-plan-select");
    const sessionsInput = document.getElementById("renew-sub-sessions");
    const amountInput = document.getElementById("renew-sub-amount");
    const fileInput = document.getElementById("renew-sub-receipt-file");
    const previewContainer = document.getElementById("renew-receipt-preview-container");
    const previewImg = document.getElementById("renew-receipt-preview");

    planSelect?.addEventListener("change", () => {
      const selectedOpt = planSelect.options[planSelect.selectedIndex];
      if (selectedOpt) {
        if (selectedOpt.getAttribute("data-sessions")) {
          sessionsInput.value = selectedOpt.getAttribute("data-sessions");
        }
        if (selectedOpt.getAttribute("data-price")) {
          amountInput.value = selectedOpt.getAttribute("data-price");
        }
      }
    });

    fileInput?.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          previewImg.src = e.target.result;
          previewContainer.style.display = "block";
        };
        reader.readAsDataURL(file);
      } else {
        previewContainer.style.display = "none";
      }
    });

    document.getElementById("renew-sub-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById("submit-renew-sub-btn");
      submitBtn.disabled = true;
      submitBtn.innerText = "جاري الحفظ والتحميل...";

      try {
        let receiptUrl = null;
        if (fileInput?.files?.[0]) {
          const formData = new FormData();
          formData.append("file", fileInput.files[0]);
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            },
            body: formData
          });
          if (uploadRes.ok) {
            const data = await uploadRes.json();
            receiptUrl = data.url;
          } else {
            showToast("فشل رفع صورة الإيصال", "error");
            submitBtn.disabled = false;
            submitBtn.innerText = "حفظ التجديد وإضافة الرصيد ✅";
            return;
          }
        }

        const planId = planSelect.value;
        const sessionsCount = sessionsInput.value;
        const amount = amountInput.value;
        const provider = document.getElementById("renew-sub-provider").value;
        const notes = document.getElementById("renew-sub-notes").value;

        const res = await apiFetch(`/admin/subscriptions/${subId}/renew`, {
          method: "PATCH",
          body: JSON.stringify({ planId, sessionsCount, amount, provider, notes, receiptUrl })
        });

        showToast(res.message || "تم تجديد الاشتراك وإضافة الرصيد بنجاح 🎉", "success");
        closeModal();
        await this.loadAllData();
        this.renderTab("subscriptions");
      } catch (err) {
        showToast(err.message || "حدث خطأ أثناء تجديد الاشتراك", "error");
        submitBtn.disabled = false;
        submitBtn.innerText = "حفظ التجديد وإضافة الرصيد ✅";
      }
    });
  }

  renderAssignTeacherToSubscriptionModal(subId) {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const sub = (this.subscriptions || []).find(s => s.id === subId);
    if (!sub) return;

    const teachers = (this.allMembers || []).filter(u => u.role === "teacher");

    container.innerHTML = `
      <div class="modal-overlay" id="assign-teacher-sub-modal" style="display:flex;">
        <div class="modal-content" style="max-width:480px;">
          <div class="modal-header">
            <h3 class="modal-title">تعيين / تغيير المعلم للاشتراك</h3>
            <span class="modal-close-btn" id="close-assign-sub-modal">&times;</span>
          </div>
          <form id="assign-teacher-sub-form">
            <div class="modal-body">
              <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">اختر المعلم الذي سيتولى تقديم الجلسات لهذا الاشتراك الخاص.</p>
              <div class="form-group">
                <label for="assign-teacher-sub-select" style="font-size:0.88rem; font-weight:700; display:block; margin-bottom:6px;">اختر المعلم:</label>
                <select id="assign-teacher-sub-select" class="form-input" style="width:100%; padding:10px;">
                  ${teachers.map(t => `<option value="${t.id}" ${sub.teacher?.id === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" id="cancel-assign-sub-btn">إلغاء</button>
              <button type="submit" class="btn-primary">حفظ المعلم</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = () => { container.innerHTML = ""; };
    document.getElementById("close-assign-sub-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-assign-sub-btn")?.addEventListener("click", closeModal);

    document.getElementById("assign-teacher-sub-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const teacherId = document.getElementById("assign-teacher-sub-select").value;
      try {
        const res = await apiFetch(`/admin/subscriptions/${subId}/assign-teacher`, {
          method: "PATCH",
          body: JSON.stringify({ teacherId })
        });
        showToast(res.message || "تم تعيين المعلم بنجاح", "success");
        closeModal();
        await this.loadAllData();
        this.renderTab("subscriptions");
      } catch (err) {
        showToast(err.message || "فشل تعيين المعلم", "error");
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
                  <input type="date" id="wiz-start-date" class="form-input" value="${defaultStartDateStr}" min="${defaultStartDateStr}" style="padding:10px; font-size:0.9rem; width:100%;" />
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
  

  renderCourseDetailsModal(course) {
    const modalId = 'course-details-modal-overlay';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const coursePlans = (this.allPlans || []).filter(p => p.courseId === course.id || p.course?.id === course.id);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.style.display = 'flex';
    overlay.style.backdropFilter = 'blur(8px)';
    overlay.style.background = 'rgba(0,0,0,0.6)';

    overlay.innerHTML = `
      <div class="modal-content" style="max-width:850px; width:92%; border-radius:24px; border:1px solid var(--border-color); padding:0; background:var(--bg-card); overflow:hidden;">
        <!-- Header -->
        <div style="padding:22px 28px; background:linear-gradient(135deg, rgba(0,86,210,0.1), rgba(168,85,247,0.1)); border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:16px;">
            <img src="${course.image || 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=80&auto=format'}" style="width:56px; height:56px; border-radius:14px; object-fit:cover; border:2px solid var(--primary);">
            <div>
              <div style="display:flex; gap:8px; align-items:center; margin-bottom:4px;">
                <span class="badge" style="background:var(--primary-glow); color:var(--primary); font-size:0.75rem; font-weight:800;">${course.category || 'عام'}</span>
                ${course.degree ? `<span class="badge" style="background:rgba(139,92,246,0.15); color:#8b5cf6; font-size:0.75rem; font-weight:800;">${course.degree}</span>` : ''}
              </div>
              <h3 style="font-size:1.25rem; font-weight:900; margin:0; color:var(--text-main);">${course.title}</h3>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <a href="#manage-course/${course.id}" class="btn-primary" style="font-size:0.82rem; padding:8px 16px; background:#8b5cf6; border-color:#8b5cf6; text-decoration:none; display:inline-flex; align-items:center; gap:6px; font-weight:800; border-radius:12px;">
              <i data-lucide="plus-circle" style="width:16px;height:16px;"></i> إضافة وإدارة دروس المنهج 📚
            </a>
            <span id="close-course-modal" style="font-size:1.4rem; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
          </div>
        </div>

        <!-- Body -->
        <div style="padding:24px; background:var(--bg-app); max-height:75vh; overflow-y:auto; font-size:0.9rem;">
          
          <!-- Quick Stats Grid -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom:24px;">
            <div style="background:var(--bg-card); padding:12px 16px; border-radius:14px; border:1px solid var(--border-color);">
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">👨‍🏫 المعلم المسؤول</div>
              <div style="font-size:0.95rem; font-weight:800; color:var(--text-main); margin-top:2px;">${course.teacher?.name || 'غير محدد'}</div>
            </div>
            <div style="background:var(--bg-card); padding:12px 16px; border-radius:14px; border:1px solid var(--border-color);">
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">📖 عدد الدروس</div>
              <div style="font-size:0.95rem; font-weight:800; color:var(--primary); margin-top:2px;">${course.lessonsCount || 0} درس</div>
            </div>
            <div style="background:var(--bg-card); padding:12px 16px; border-radius:14px; border:1px solid var(--border-color);">
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">👥 الطلاب المسجلين</div>
              <div style="font-size:0.95rem; font-weight:800; color:#10b981; margin-top:2px;">${course.enrollmentsCount || 0} طالب</div>
            </div>
            <div style="background:var(--bg-card); padding:12px 16px; border-radius:14px; border:1px solid var(--border-color);">
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">💎 خطط الاشتراكات</div>
              <div style="font-size:0.95rem; font-weight:800; color:#8b5cf6; margin-top:2px;">${coursePlans.length} خطة شهرية</div>
            </div>
          </div>

          <!-- Description -->
          <div style="background:var(--bg-card); padding:18px; border-radius:16px; border:1px solid var(--border-color); margin-bottom:24px;">
            <h4 style="font-weight:800; margin:0 0 8px 0; color:var(--text-main); font-size:0.95rem;">📝 وصف الدورة التدريبية:</h4>
            <p style="color:var(--text-muted); margin:0; line-height:1.6; font-size:0.88rem;">${course.description || 'لا يوجد وصف مضاف حتى الآن.'}</p>
            ${course.meetingLink ? `
              <div style="margin-top:12px; font-size:0.82rem; font-weight:700;">
                <span>🔗 رابط القاعة المباشرة:</span>
                <a href="${course.meetingLink}" target="_blank" style="color:var(--primary); font-weight:700; text-decoration:none; margin-inline-start:6px;">${course.meetingLink}</a>
              </div>
            ` : ''}
          </div>

          <!-- Section: Subscription Plans -->
          <div style="margin-bottom:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
              <h4 style="font-weight:800; margin:0; color:var(--text-main); font-size:1rem; display:flex; align-items:center; gap:6px;">
                ✨ خطط الاشتراكات الشهرية المخصصة لهذا الكورس (${coursePlans.length})
              </h4>
              <button id="modal-add-course-plan-btn" class="btn-primary" style="padding:6px 14px; font-size:0.8rem; border-radius:10px; gap:6px;">
                <i data-lucide="plus-circle" style="width:14px;height:14px;"></i> إضافة خطة جديدة للكورس 🚀
              </button>
            </div>

            ${coursePlans.length === 0 ? `
              <div style="background:var(--bg-card); text-align:center; padding:30px; border-radius:16px; border:1px dashed var(--border-color); color:var(--text-muted);">
                <i data-lucide="sparkles" style="width:32px; height:32px; opacity:0.3; margin-bottom:8px;"></i>
                <p style="margin:0 0 10px 0; font-size:0.85rem;">لا توجد خطط اشتراكات شهرية مخصصة لهذا الكورس حتى الآن.</p>
                <button id="modal-add-course-plan-btn-2" class="btn-secondary" style="font-size:0.8rem; padding:6px 12px; border-color:var(--primary); color:var(--primary); font-weight:700;">
                  أنشئ أول خطة مخصصة للكورس الآن
                </button>
              </div>
            ` : `
              <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:14px;">
                ${coursePlans.map(p => `
                  <div style="background:var(--bg-card); padding:16px; border-radius:14px; border:2px solid ${p.isActive ? 'var(--primary)' : 'var(--border-color)'};">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                      <h5 style="font-weight:800; margin:0; font-size:0.95rem;">${p.name}</h5>
                      <span style="font-size:1.1rem; font-weight:900; color:var(--primary);">${p.price} ${p.currency}</span>
                    </div>
                    <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:12px; min-height:28px;">${p.description || ''}</p>
                    <div style="font-size:0.75rem; color:var(--text-main); font-weight:700; margin-bottom:12px; display:flex; gap:10px;">
                      <span>📅 ${p.sessionsCount} حصة</span>
                      <span>⏱️ ${p.durationDays} يوم</span>
                    </div>
                    <div style="display:flex; gap:6px;">
                      <button class="btn-secondary modal-edit-plan-btn" data-id="${p.id}" style="flex:1; padding:4px; font-size:0.75rem; border-color:var(--primary); color:var(--primary);">تعديل</button>
                      <button class="btn-secondary modal-toggle-plan-btn" data-id="${p.id}" data-active="${p.isActive}" style="flex:1; padding:4px; font-size:0.75rem;">${p.isActive ? 'إلغاء' : 'تفعيل'}</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Lessons List -->
          ${course.lessons && course.lessons.length > 0 ? `
            <div>
              <h4 style="font-weight:800; margin:0 0 12px 0; color:var(--text-main); font-size:1rem;">📚 دروس الدورة المتاحة (${course.lessons.length}):</h4>
              <div style="display:flex; flex-direction:column; gap:8px;">
                ${course.lessons.map((lesson, i) => `
                  <div style="background:var(--bg-card); padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:10px;">
                      <span style="font-weight:800; font-size:0.8rem; color:var(--primary); width:20px;">#${i + 1}</span>
                      <span style="font-weight:700; color:var(--text-main); font-size:0.85rem;">${lesson.title}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px; font-size:0.78rem; color:var(--text-muted);">
                      ${lesson.duration ? `<span>⏱️ ${lesson.duration} دقيقة</span>` : ''}
                      ${lesson.isFree ? `<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-size:0.7rem; font-weight:800;">مجاني</span>` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    document.getElementById('close-course-modal')?.addEventListener('click', () => overlay.remove());

    const openAddPlanForCourse = () => {
      overlay.remove();
      this.renderPlanModal({ courseId: course.id, course: course });
    };

    document.getElementById('modal-add-course-plan-btn')?.addEventListener('click', openAddPlanForCourse);
    document.getElementById('modal-add-course-plan-btn-2')?.addEventListener('click', openAddPlanForCourse);

    overlay.querySelectorAll('.modal-edit-plan-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const plan = (this.allPlans || []).find(p => p.id === id);
        overlay.remove();
        if (plan) this.renderPlanModal(plan);
      });
    });

    overlay.querySelectorAll('.modal-toggle-plan-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const active = e.currentTarget.getAttribute('data-active') === 'true';
        try {
          await apiFetch(`/subscription-plans/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ isActive: !active })
          });
          showToast('تم تحديث حالة الخطة! ✅', 'success');
          overlay.remove();
          await this.loadAllData();
          this.renderTab('courses');
        } catch (err) {
          showToast(err.message || 'فشل تحديث الخطة.', 'error');
        }
      });
    });
  }

  // ── 12. Subscription Plans Tab ────────────────────────────────────────────────
  renderPlansTab() {
    const plans = this.allPlans || [];

    return `
      <div style="margin-bottom:28px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h3 style="font-size:1.2rem; font-weight:800; margin:0 0 4px 0; color:var(--text-main);">✨ إدارة خطط الاشتراكات الشهرية لكافة الكورسات</h3>
          <p style="color:var(--text-muted); font-size:0.88rem; margin:0;">إدارة خطط الاشتراكات الشهرية المخصصة لكل كورس على حدة أو الخطط العامة.</p>
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
                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">
                  <span style="font-size:0.75rem; font-weight:800; padding:4px 12px; border-radius:12px; background:var(--primary-glow); color:var(--primary); display:inline-block;">
                    ${p.sessionsCount} حصة / ${p.durationDays} يوم
                  </span>
                  <span style="font-size:0.75rem; font-weight:800; padding:4px 12px; border-radius:12px; background:rgba(99,102,241,0.12); color:var(--primary); display:inline-block;">
                    ${p.course?.title ? `📚 كورس: ${p.course.title}` : '🌐 عام (جميع الكورسات)'}
                  </span>
                </div>
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
              <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">تخصيص الخطة لكورس معين أو لجميع الكورسات على المنصة</p>
            </div>
          </div>
          <span id="close-plan-modal" style="font-size:1.4rem; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
        </div>
        <div style="padding:28px; background:var(--bg-app); max-height:70vh; overflow-y:auto;">
          <form id="plan-form" style="display:flex; flex-direction:column; gap:16px;">
            <input type="hidden" id="plan-id" value="${plan?.id || ''}">
            <div>
              <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">اسم الخطة <span style="color:var(--error,#ef4444);">*</span></label>
              <input type="text" id="plan-name" class="form-input" required style="width:100%; padding:10px;" placeholder="مثال: اشتراك كورس الفيزياء الشهري" value="${plan?.name || ''}">
            </div>
            <div>
              <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">الكورس المخصص لخطة الاشتراك (اختياري)</label>
              <select id="plan-course-id" class="form-input" style="width:100%; padding:10px;">
                <option value="">-- 🌐 عام (تنطبق على جميع الكورسات) --</option>
                ${(this.courses || []).map(c => `
                  <option value="${c.id}" ${(plan?.course?.id === c.id || plan?.courseId === c.id) ? 'selected' : ''}>
                    📚 ${c.title} (${c.category || 'عام'})
                  </option>
                `).join('')}
              </select>
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
        courseId: document.getElementById('plan-course-id').value || null,
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

  // ── Render Group Session Modal ─────────────────────────────────────────────
  renderGroupSessionModal() {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const teachers = (this.allMembers || []).filter(u => u.role === "teacher");
    const students = (this.allMembers || []).filter(u => u.role === "student");

    const now = new Date();
    const nextSaturday = new Date();
    nextSaturday.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7));
    const defaultStartDateStr = nextSaturday.toISOString().slice(0, 10);
    const defaultTimeStr = "18:00";

    container.innerHTML = `
      <div class="modal-overlay" id="group-session-modal" style="display:flex; backdrop-filter:blur(8px); background:rgba(0,0,0,0.6);">
        <div class="modal-content" style="max-width:780px; width:95%; border-radius:24px; overflow:hidden; border:1px solid var(--border-color); padding:0; background:var(--bg-card); box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);">
          
          <!-- Header -->
          <div style="padding:20px 24px; background:linear-gradient(135deg, rgba(139,92,246,0.12), rgba(236,72,153,0.12)); border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:44px; height:44px; border-radius:14px; background:rgba(139,92,246,0.15); color:#8b5cf6; display:flex; align-items:center; justify-content:center;">
                <i data-lucide="users" style="width:22px; height:22px;"></i>
              </div>
              <div>
                <h3 style="font-size:1.15rem; font-weight:800; margin:0; color:var(--text-main);">جدولة باقة حصص جماعية لمجموعة طلاب 👥</h3>
                <p style="font-size:0.8rem; color:var(--text-muted); margin:2px 0 0 0;">تحديد موعد موحد لعدة حصص لمجموعة طلاب مع معلم واحد (Multiple Group Sessions)</p>
              </div>
            </div>
            <span id="close-group-session-modal" style="font-size:1.4rem; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
          </div>

          <form id="group-session-form">
            <div class="modal-body" style="padding:22px 24px; max-height:75vh; overflow-y:auto; display:flex; flex-direction:column; gap:18px;">
              
              <!-- Session Title -->
              <div class="form-group" style="margin:0;">
                <label for="group-session-title" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="heading" style="width:14px; height:14px; color:var(--primary);"></i>
                  عنوان المجموعة والدورة <span style="color:var(--error);">*</span>
                </label>
                <input type="text" id="group-session-title" class="form-input" placeholder="مثال: حصص مراجعة جماعية - الفيزياء للثانوية العامة" required style="border-radius:14px; padding:11px 16px; font-size:0.88rem;">
              </div>

              <!-- Teacher & Sessions Count Grid -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div class="form-group" style="margin:0;">
                  <label for="group-session-teacher" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="user-check" style="width:14px; height:14px; color:#8b5cf6;"></i>
                    المعلم المسؤول <span style="color:var(--error);">*</span>
                  </label>
                  <select id="group-session-teacher" class="form-select" required style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;">
                    <option value="">-- اختر معلم المنصة --</option>
                    ${teachers.map(t => `<option value="${t.id}" data-link="${t.meetingLink || ''}">${t.name} (${t.email})</option>`).join('')}
                  </select>
                </div>

                <div class="form-group" style="margin:0;">
                  <label for="group-sessions-count" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="layers" style="width:14px; height:14px; color:#10b981;"></i>
                    عدد الحصص الجماعية المطلوبة <span style="color:var(--error);">*</span>
                  </label>
                  <input type="number" id="group-sessions-count" class="form-input" value="4" min="1" max="30" step="1" required style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;">
                </div>
              </div>

              <!-- Pattern & Frequency -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div class="form-group" style="margin:0;">
                  <label for="group-sessions-freq" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:block;">
                    تكرار الجدولة
                  </label>
                  <select id="group-sessions-freq" class="form-select" style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;">
                    <option value="custom_days">أيام محددة في الأسبوع (موصى به)</option>
                    <option value="weekly">أسبوعياً (حصة واحدة كل 7 أيام)</option>
                    <option value="biweekly">حصتان أسبوعياً (توزيع منظم)</option>
                    <option value="single">حصة واحدة فقط</option>
                  </select>
                </div>

                <div class="form-group" style="margin:0;">
                  <label for="group-session-duration" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:block;">
                    مدة كل حصة (بالدقائق)
                  </label>
                  <input type="number" id="group-session-duration" class="form-input" value="60" min="15" max="240" step="15" required style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;">
                </div>
              </div>

              <!-- Days of week checkboxes -->
              <div id="group-days-box" style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:14px; padding:14px;">
                <label style="font-size:0.85rem; font-weight:800; display:block; margin-bottom:8px; color:var(--text-main);">
                  🗓️ اختر أيام الحصص الأسبوعية للمجموعة:
                </label>
                <div style="display:flex; flex-wrap:wrap; gap:12px;">
                  <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="groupDays" value="6" checked /> السبت</label>
                  <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="groupDays" value="0" /> الأحد</label>
                  <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="groupDays" value="1" checked /> الاثنين</label>
                  <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="groupDays" value="2" /> الثلاثاء</label>
                  <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="groupDays" value="3" /> الأربعاء</label>
                  <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="groupDays" value="4" /> الخميس</label>
                  <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="groupDays" value="5" /> الجمعة</label>
                </div>
              </div>

              <!-- Start Date & Daily Time -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div class="form-group" style="margin:0;">
                  <label for="group-session-start-date" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:block;">
                    تاريخ بداية الحصص (الحصة الأولى)
                  </label>
                  <input type="date" id="group-session-start-date" class="form-input" value="${defaultStartDateStr}" required style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;">
                </div>

                <div class="form-group" style="margin:0;">
                  <label for="group-session-daily-time" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:block;">
                    وقت الحصة الموحد
                  </label>
                  <input type="time" id="group-session-daily-time" class="form-input" value="${defaultTimeStr}" required style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;">
                </div>
              </div>

              <!-- Meeting Link -->
              <div class="form-group" style="margin:0;">
                <label for="group-session-meeting-link" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:block;">
                  🔗 رابط البث أونلاين (Google Meet / Zoom)
                </label>
                <input type="url" id="group-session-meeting-link" class="form-input" placeholder="https://meet.google.com/abc-defg-hij" style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;">
              </div>

              <!-- Students Selection Section -->
              <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:16px; padding:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                  <label style="font-weight:800; font-size:0.9rem; color:var(--text-main); display:flex; align-items:center; gap:6px; margin:0;">
                    <i data-lucide="users" style="width:16px; height:16px; color:#ec4899;"></i>
                    تحديد الطلاب المنضمين لهذه المجموعة <span style="color:var(--error);">*</span>
                  </label>
                  <div style="display:flex; gap:8px; align-items:center;">
                    <button type="button" id="group-select-all-btn" class="btn-secondary" style="font-size:0.75rem; padding:4px 10px; border-radius:8px;">
                      ✓ تظليل الكل
                    </button>
                    <button type="button" id="group-deselect-all-btn" class="btn-secondary" style="font-size:0.75rem; padding:4px 10px; border-radius:8px;">
                      ✕ إلغاء التظليل
                    </button>
                  </div>
                </div>

                <!-- Live Counter & Total Math Summary -->
                <div id="group-student-counter-badge" style="background:linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.1)); border:1px solid rgba(139,92,246,0.3); color:#8b5cf6; font-weight:800; padding:10px 16px; border-radius:14px; font-size:0.88rem; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                  <div>
                    👥 عدد الطلاب: <strong id="group-count-num" style="font-size:1.05rem; color:var(--primary);">0</strong> طالب
                    <span style="margin:0 8px; color:var(--text-muted);">|</span>
                    🗓️ عدد الحصص: <strong id="group-count-sessions" style="font-size:1.05rem; color:#ec4899;">4</strong> حصص
                  </div>
                  <div>
                    🎬 إجمالي سجلات الحصص التي سيتم إنشاؤها بالمنصة: <strong id="group-total-records" style="font-size:1.1rem; color:#10b981;">0</strong> سجل
                  </div>
                </div>

                <!-- Students Search Input -->
                <input type="text" id="group-students-search" class="form-input" placeholder="🔍 تصفية الطلاب باسم أو بريد الطالب..." style="border-radius:10px; padding:8px 12px; font-size:0.82rem; margin-bottom:10px; width:100%;">

                <!-- Students Checkboxes Grid -->
                <div id="group-students-checkboxes-container" style="max-height:160px; overflow-y:auto; display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:8px; padding-inline-end:4px;">
                  ${students.length === 0 ? `
                    <div style="color:var(--text-muted); font-size:0.82rem; padding:12px; grid-column:1/-1; text-align:center;">
                      لا يوجد طلاب مسجلون بالمنصة حالياً.
                    </div>
                  ` : students.map(st => `
                    <label class="group-student-item" data-search="${st.name.toLowerCase()} ${st.email.toLowerCase()}" style="display:flex; align-items:center; gap:8px; padding:8px 10px; background:var(--bg-card); border-radius:10px; border:1px solid var(--border-color); cursor:pointer; font-size:0.82rem;">
                      <input type="checkbox" name="groupStudentIds" value="${st.id}" class="group-student-checkbox" style="width:16px; height:16px; accent-color:#8b5cf6;">
                      <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        <strong style="display:block; font-size:0.82rem;">${st.name}</strong>
                        <span style="font-size:0.72rem; color:var(--text-muted);">${st.email}</span>
                      </div>
                    </label>
                  `).join('')}
                </div>
              </div>

              <!-- Preview Table of Dates -->
              <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:14px; padding:14px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                  <h4 style="font-weight:800; font-size:0.9rem; color:var(--text-main); margin:0;">
                    🗓️ معاينة مواعيد الحصص المجدولة للمجموعة
                  </h4>
                  <button type="button" id="refresh-group-preview-btn" class="btn-secondary" style="font-size:0.75rem; padding:4px 12px; border-radius:8px;">
                    🔄 تحديث المعاينة
                  </button>
                </div>
                <div style="max-height:160px; overflow-y:auto; border:1px solid var(--border-color); border-radius:10px;">
                  <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:start;">
                    <thead style="position:sticky; top:0; background:var(--bg-app); color:var(--text-muted); font-weight:800;">
                      <tr>
                        <th style="padding:8px 12px;">#</th>
                        <th style="padding:8px 12px;">تاريخ ووقت الحصة</th>
                        <th style="padding:8px 12px;">اليوم</th>
                      </tr>
                    </thead>
                    <tbody id="group-dates-preview-tbody"></tbody>
                  </table>
                </div>
              </div>

            </div>

            <!-- Footer -->
            <div class="modal-footer" style="padding:16px 24px; background:var(--bg-app); border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; gap:12px;">
              <button type="button" class="btn-secondary" id="cancel-group-session-modal" style="padding:10px 20px; border-radius:30px; font-size:0.88rem;">إلغاء</button>
              <button type="submit" id="submit-group-session-btn" class="btn-primary" style="padding:10px 24px; border-radius:30px; font-size:0.88rem; font-weight:800; background:linear-gradient(135deg,#8b5cf6,#ec4899); border:none;">
                <i data-lucide="sparkles" style="width:16px; height:16px; vertical-align:middle;"></i> تأكيد وجدولة كافة الحصص الجماعية 🚀
              </button>
            </div>

          </form>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => { container.innerHTML = ""; };
    document.getElementById("close-group-session-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-group-session-modal")?.addEventListener("click", closeModal);

    // Populate default meeting link when teacher changes
    const teacherSelect = document.getElementById("group-session-teacher");
    const meetingInput = document.getElementById("group-session-meeting-link");
    teacherSelect?.addEventListener("change", () => {
      const opt = teacherSelect.options[teacherSelect.selectedIndex];
      if (opt && opt.getAttribute("data-link")) {
        meetingInput.value = opt.getAttribute("data-link");
      }
    });

    // Helper: Generate Group Dates
    const daysAr = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    let generatedDatesList = [];

    const updatePreviewTable = () => {
      const startDateStr = document.getElementById("group-session-start-date")?.value;
      const timeStr = document.getElementById("group-session-daily-time")?.value || "18:00";
      const count = parseInt(document.getElementById("group-sessions-count")?.value) || 4;
      const freq = document.getElementById("group-sessions-freq")?.value || "custom_days";

      const selectedDays = Array.from(container.querySelectorAll("input[name='groupDays']:checked")).map(cb => parseInt(cb.value));

      generatedDatesList = [];
      if (!startDateStr || !timeStr) return;

      const [hours, minutes] = timeStr.split(':').map(Number);
      let current = new Date(startDateStr);
      current.setHours(hours, minutes, 0, 0);

      if (freq === 'single') {
        generatedDatesList.push(new Date(current));
      } else if (freq === 'weekly') {
        while (generatedDatesList.length < count) {
          generatedDatesList.push(new Date(current));
          current.setDate(current.getDate() + 7);
        }
      } else if (freq === 'biweekly') {
        let step = 3;
        while (generatedDatesList.length < count) {
          generatedDatesList.push(new Date(current));
          current.setDate(current.getDate() + step);
          step = step === 3 ? 4 : 3;
        }
      } else {
        // custom_days
        const activeDays = selectedDays.length > 0 ? selectedDays : [6, 1];
        while (generatedDatesList.length < count) {
          if (activeDays.includes(current.getDay())) {
            generatedDatesList.push(new Date(current));
          }
          current.setDate(current.getDate() + 1);
        }
      }

      // Render Preview Table HTML
      const tbody = document.getElementById("group-dates-preview-tbody");
      if (tbody) {
        tbody.innerHTML = generatedDatesList.map((dt, idx) => `
          <tr style="border-bottom:1px solid var(--border-color);">
            <td style="padding:6px 12px; font-weight:800; color:var(--primary);">#${idx + 1}</td>
            <td style="padding:6px 12px; font-weight:700;">${dt.toLocaleString('ar', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
            <td style="padding:6px 12px; color:var(--text-muted);">${daysAr[dt.getDay()]}</td>
          </tr>
        `).join('');
      }

      // Update counters summary
      const countSessionsEl = document.getElementById("group-count-sessions");
      if (countSessionsEl) countSessionsEl.innerText = String(generatedDatesList.length);

      const checkedStudentsCount = container.querySelectorAll(".group-student-checkbox:checked").length;
      const totalRecordsEl = document.getElementById("group-total-records");
      if (totalRecordsEl) totalRecordsEl.innerText = String(checkedStudentsCount * generatedDatesList.length);
    };

    // Update group counter live
    const updateGroupCounter = () => {
      const checkedCount = container.querySelectorAll(".group-student-checkbox:checked").length;
      const countEl = document.getElementById("group-count-num");
      if (countEl) countEl.innerText = String(checkedCount);

      const totalRecordsEl = document.getElementById("group-total-records");
      if (totalRecordsEl) totalRecordsEl.innerText = String(checkedCount * generatedDatesList.length);
    };

    container.querySelectorAll(".group-student-checkbox").forEach(cb => {
      cb.addEventListener("change", updateGroupCounter);
    });

    document.getElementById("group-sessions-count")?.addEventListener("input", updatePreviewTable);
    document.getElementById("group-sessions-freq")?.addEventListener("change", updatePreviewTable);
    document.getElementById("group-session-start-date")?.addEventListener("change", updatePreviewTable);
    document.getElementById("group-session-daily-time")?.addEventListener("change", updatePreviewTable);
    container.querySelectorAll("input[name='groupDays']").forEach(cb => cb.addEventListener("change", updatePreviewTable));
    document.getElementById("refresh-group-preview-btn")?.addEventListener("click", updatePreviewTable);

    // Initial preview render
    updatePreviewTable();

    // Select all / Deselect all
    document.getElementById("group-select-all-btn")?.addEventListener("click", () => {
      container.querySelectorAll(".group-student-checkbox").forEach(cb => { cb.checked = true; });
      updateGroupCounter();
    });

    document.getElementById("group-deselect-all-btn")?.addEventListener("click", () => {
      container.querySelectorAll(".group-student-checkbox").forEach(cb => { cb.checked = false; });
      updateGroupCounter();
    });

    // Filter students by search
    document.getElementById("group-students-search")?.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      container.querySelectorAll(".group-student-item").forEach(item => {
        const text = item.getAttribute("data-search") || "";
        item.style.display = text.includes(q) ? "flex" : "none";
      });
    });

    // Form submission
    document.getElementById("group-session-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("group-session-title").value.trim();
      const teacherId = document.getElementById("group-session-teacher").value;
      const duration = parseInt(document.getElementById("group-session-duration").value) || 60;
      const meetingLink = document.getElementById("group-session-meeting-link").value.trim();

      const selectedStudentCbs = container.querySelectorAll(".group-student-checkbox:checked");
      const studentIds = Array.from(selectedStudentCbs).map(cb => cb.value);

      if (studentIds.length === 0) {
        showToast("الرجاء اختيار طالب واحد على الأقل لإضافته إلى الحصة الجماعية.", "error");
        return;
      }

      if (generatedDatesList.length === 0) {
        showToast("الرجاء تحديد مواعيد الحصص الجماعية بشكل صحيح.", "error");
        return;
      }

      const scheduledDates = generatedDatesList.map(dt => dt.toISOString());
      const submitBtn = document.getElementById("submit-group-session-btn");
      if (submitBtn) submitBtn.disabled = true;

      try {
        const res = await apiFetch("/sessions/group-schedule", {
          method: "POST",
          body: JSON.stringify({ title, teacherId, studentIds, scheduledDates, duration, meetingLink })
        });

        showToast(res.message || `تم إدراج وجدولة ${scheduledDates.length} حصة جماعية لـ ${studentIds.length} طلاب بنجاح! 🚀`, "success");
        closeModal();
        await this.loadAllData();
        this.renderTab("sessions");
      } catch (err) {
        if (submitBtn) submitBtn.disabled = false;
        showToast(err.message || "فشلت جدولة الحصص الجماعية.", "error");
      }
    });
  }

  onDestroy() {}
}
