import { apiFetch, state, setAuth, showToast, t, confirmDialog, renderPhoneInputGroup, getCleanWhatsAppNumber, renderEducationSelectHTML, handleWhatsAppResponse, formatSessionDateTime, getTimezoneBadgeHTML } from "../../app.js";

// ── Page Module Imports ──────────────────────────────────────────────────────
import { AdminStatsPage }         from './AdminStatsPage.js';
import { AdminUsersPage }          from './AdminUsersPage.js';
import { AdminCoursesPage }        from './AdminCoursesPage.js';
import { AdminSessionsPage }       from './AdminSessionsPage.js';
import { AdminSubscriptionsPage }  from './AdminSubscriptionsPage.js';
import { AdminReportsPage }        from './AdminReportsPage.js';
import { AdminEarningsPage }       from './AdminEarningsPage.js';
import { AdminPlansPage }          from './AdminPlansPage.js';

export default class AdminView {

  constructor(container, initialTab = "stats") {
    this.container = container;
    this.activeTab = initialTab || "stats";
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
    } catch (e) {
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
            <button class="admin-nav-btn ${this.activeTab === "groups" ? "active" : ""}" data-tab="groups">
              <i data-lucide="users"></i>
              👥 المجموعات والحصص الجماعية
              <span class="admin-nav-badge" id="admin-badge-groups">0</span>
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
    const isGroupCheck = (s) => !!s.course || !s.student || (s.type && String(s.type).toLowerCase().includes("group")) || (s.title && String(s.title).includes("مجموعة"));
    el("admin-badge-groups", (this.allSessions || []).filter(isGroupCheck).length);
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
      this.updateAddCourseModalTeachers();
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
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tab = btn.getAttribute("data-tab");
        if (!tab) return;
        this.activeTab = tab;
        this.container.querySelectorAll(".admin-nav-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        closeSidebar();
        try {
          if (window.location.hash !== `#admin-dashboard/${tab}`) {
            history.pushState(null, "", `#admin-dashboard/${tab}`);
          }
        } catch (err) { }
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
    stats: { heading: "📊 الإحصائيات العامة", sub: "نظرة شاملة على مؤشرات أداء المنصة" },
    reports: { heading: "📈 التقارير والسجلات", sub: "تقارير مفصلة عن النشاط والأداء" },
    categories: { heading: "🗂️ إدارة التصنيفات", sub: "التصنيفات الرسمية المتاحة لجميع المعلمين" },
    courses: { heading: "📚 إدارة الدورات", sub: "مراجعة والإشراف على جميع دورات المنصة" },
    enrollments: { heading: "🎓 طلبات وتسجيلات الكورسات", sub: "مراجعة واعتماد طلبات التحويل وتسجيل الطلاب في جميع الكورسات" },
    sessions: { heading: "📹 إدارة الحصص والجلسات", sub: "متابعة وإلغاء وإعادة جدولة حصص البث المباشر والحصص الخاصة 1-على-1" },
    groups: { heading: "👥 المجموعات والحصص الجماعية", sub: "إدارة المجموعات، الطلاب المسجلين بالجروب، وأوقات البث المباشر" },
    teachers: { heading: "👨‍🏫 إدارة المعلمين", sub: "إضافة وتعديل وإدارة حسابات المعلمين" },
    students: { heading: "🎓 إدارة الطلاب", sub: "إضافة وتعديل وإدارة حسابات الطلاب" },
    teacherApplications: { heading: "📝 طلبات انضمام المعلمين", sub: "مراجعة السير الذاتية والقبول/الرفض لمعلمي المنصة الجدد" },
    members: { heading: "🛡️ جميع الأعضاء", sub: "عرض وإدارة جميع مستخدمي المنصة" },
    subscriptions: { heading: "📅 إدارة الاشتراكات", sub: "متابعة وتعيين المعلمين لاشتراكات الحصص الخاصة" },
    earnings: { heading: "💰 المدفوعات والمستحقات", sub: "متابعة إيرادات المنصة ومستحقات المعلمين" },
    plans: { heading: "⚙️ إعدادات المنصة وخطط الباقات (Subscription Plans & Quota)", sub: "إدارة وتعديل أسعار الباقات، عدد الحصص (Quota)، والخصائص الحصرية" },
    settings: { heading: "⚙️ إعدادات المنصة وخطط الباقات (Subscription Plans & Quota)", sub: "إدارة وتعديل أسعار الباقات، عدد الحصص (Quota)، والخصائص الحصرية" },
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

    if (tab === "stats") content.innerHTML = this.renderStatsTab();
    else if (tab === "categories") content.innerHTML = this.renderCategoriesTab();
    else if (tab === "teachers") content.innerHTML = this.renderTeachersTab();
    else if (tab === "students") content.innerHTML = this.renderStudentsTab();
    else if (tab === "teacherApplications") content.innerHTML = this.renderTeacherApplicationsTab();
    else if (tab === "members") content.innerHTML = this.renderMembersTab();
    else if (tab === "courses") content.innerHTML = this.renderCoursesTab();
    else if (tab === "enrollments") content.innerHTML = this.renderEnrollmentsTab();
    else if (tab === "sessions") content.innerHTML = this.renderSessionsTab(args);
    else if (tab === "groups") content.innerHTML = this.renderGroupsTab(args);
    else if (tab === "reports") content.innerHTML = this.renderReportsTab();
    else if (tab === "subscriptions") content.innerHTML = this.renderSubscriptionsTab();
    else if (tab === "earnings") content.innerHTML = this.renderEarningsTab();
    else if (tab === "plans" || tab === "settings") content.innerHTML = this.renderPlansTab();

    // Always keep sidebar badges fresh
    this.updateBadges();

    if (window.lucide) window.lucide.createIcons();
    this.bindActionEvents();
  }

  bindActionEvents() {
    // Admin Add Course Modal Open & Close
    this.container.querySelector("#open-admin-add-course-modal-btn")?.addEventListener("click", () => {
      const modal = document.getElementById("admin-course-modal");
      if (modal) {
        modal.style.display = "flex";
        // Reset form & upload preview on modal open
        const form = document.getElementById("admin-course-form");
        if (form) form.reset();
        const imgHidden = document.getElementById("admin-course-image");
        if (imgHidden) imgHidden.value = "";
        const idleBox = document.getElementById("admin-image-upload-idle");
        const loadingBox = document.getElementById("admin-image-upload-loading");
        const previewWrapper = document.getElementById("admin-image-preview-wrapper");
        if (idleBox) idleBox.style.display = "block";
        if (loadingBox) loadingBox.style.display = "none";
        if (previewWrapper) previewWrapper.style.display = "none";
      }
    });

    document.getElementById("close-admin-course-modal")?.addEventListener("click", () => {
      const modal = document.getElementById("admin-course-modal");
      if (modal) modal.style.display = "none";
    });

    document.getElementById("cancel-admin-course-modal")?.addEventListener("click", () => {
      const modal = document.getElementById("admin-course-modal");
      if (modal) modal.style.display = "none";
    });

    // Submit Admin Course Form & Attach Upload Listeners to Fresh Form
    const adminCourseForm = document.getElementById("admin-course-form");
    if (adminCourseForm) {
      const freshForm = adminCourseForm.cloneNode(true);
      adminCourseForm.parentNode.replaceChild(freshForm, adminCourseForm);
      let isSubmitting = false;

      // Toggle custom category in admin course modal
      freshForm.querySelector("#admin-course-category-select")?.addEventListener("change", (e) => {
        const customWrapper = freshForm.querySelector("#admin-course-category-custom-wrapper");
        if (customWrapper) customWrapper.style.display = e.target.value === "__custom__" ? "block" : "none";
      });

      // Toggle direct URL input in admin course modal
      freshForm.querySelector("#admin-toggle-url-input-btn")?.addEventListener("click", () => {
        const urlWrapper = freshForm.querySelector("#admin-url-input-wrapper");
        if (urlWrapper) urlWrapper.style.display = urlWrapper.style.display === "none" ? "block" : "none";
      });

      // Dropzone click trigger & file input
      const dropzone = freshForm.querySelector("#admin-course-dropzone");
      const fileInput = freshForm.querySelector("#admin-course-image-file");

      dropzone?.addEventListener("click", (e) => {
        if (e.target.closest("#admin-remove-course-image-btn") || e.target.closest("#admin-url-input-wrapper")) return;
        fileInput?.click();
      });

      freshForm.querySelector("#admin-btn-trigger-upload")?.addEventListener("click", (e) => {
        e.stopPropagation();
        fileInput?.click();
      });

      // Drag and Drop support
      dropzone?.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.style.borderColor = "var(--primary)";
        dropzone.style.background = "rgba(99,102,241,0.08)";
      });
      dropzone?.addEventListener("dragleave", (e) => {
        e.preventDefault();
        dropzone.style.borderColor = "var(--border-color)";
        dropzone.style.background = "var(--bg-app)";
      });
      dropzone?.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.style.borderColor = "var(--border-color)";
        dropzone.style.background = "var(--bg-app)";
        if (e.dataTransfer?.files?.length > 0) {
          if (fileInput) {
            fileInput.files = e.dataTransfer.files;
            fileInput.dispatchEvent(new Event("change"));
          }
        }
      });

      // Handle Image Upload
      fileInput?.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const idleBox = freshForm.querySelector("#admin-image-upload-idle");
        const loadingBox = freshForm.querySelector("#admin-image-upload-loading");
        const previewWrapper = freshForm.querySelector("#admin-image-preview-wrapper");
        const previewImg = freshForm.querySelector("#admin-course-preview-img");

        if (idleBox) idleBox.style.display = "none";
        if (loadingBox) loadingBox.style.display = "block";

        const formData = new FormData();
        formData.append("file", file);
        try {
          const token = state.token || localStorage.getItem("token");
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });
          const uploadData = await uploadRes.json();
          if (uploadData.url) {
            const hiddenImg = freshForm.querySelector("#admin-course-image");
            if (hiddenImg) hiddenImg.value = uploadData.url;
            if (previewImg) previewImg.src = uploadData.url;
            if (loadingBox) loadingBox.style.display = "none";
            if (previewWrapper) previewWrapper.style.display = "block";
            showToast("تم رفع صورة الغلاف بنجاح! 📸", "success");
          } else {
            throw new Error(uploadData.error || "فشل رفع الصورة");
          }
        } catch (err) {
          if (loadingBox) loadingBox.style.display = "none";
          if (idleBox) idleBox.style.display = "block";
          showToast(err.message || "فشل رفع صورة الغلاف", "error");
        }
      });

      // Remove cover image
      freshForm.querySelector("#admin-remove-course-image-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        const hiddenImg = freshForm.querySelector("#admin-course-image");
        if (hiddenImg) hiddenImg.value = "";
        if (fileInput) fileInput.value = "";
        const directUrl = freshForm.querySelector("#admin-course-image-url-direct");
        if (directUrl) directUrl.value = "";
        const previewWrapper = freshForm.querySelector("#admin-image-preview-wrapper");
        const idleBox = freshForm.querySelector("#admin-image-upload-idle");
        if (previewWrapper) previewWrapper.style.display = "none";
        if (idleBox) idleBox.style.display = "block";
      });

      // Direct URL Input handler
      freshForm.querySelector("#admin-course-image-url-direct")?.addEventListener("input", (e) => {
        const url = e.target.value.trim();
        const hiddenImg = freshForm.querySelector("#admin-course-image");
        const previewImg = freshForm.querySelector("#admin-course-preview-img");
        const previewWrapper = freshForm.querySelector("#admin-image-preview-wrapper");
        const idleBox = freshForm.querySelector("#admin-image-upload-idle");

        if (url) {
          if (hiddenImg) hiddenImg.value = url;
          if (previewImg) previewImg.src = url;
          if (previewWrapper) previewWrapper.style.display = "block";
          if (idleBox) idleBox.style.display = "none";
        }
      });

      freshForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        isSubmitting = true;
        const submitBtn = freshForm.querySelector("button[type='submit']");
        if (submitBtn) submitBtn.disabled = true;

        const title = freshForm.querySelector("#admin-course-title").value.trim();
        const catSelectEl = freshForm.querySelector("#admin-course-category-select");
        const catCustomEl = freshForm.querySelector("#admin-course-category-custom");
        const category = catSelectEl.value === "__custom__" ? catCustomEl.value.trim() : catSelectEl.value;
        if (!category) {
          showToast("الرجاء اختيار أو إدخال تصنيف الدورة.", "error");
          isSubmitting = false;
          if (submitBtn) submitBtn.disabled = false;
          return;
        }
        const degree = freshForm.querySelector("#admin-course-degree").value;
        const teacherId = freshForm.querySelector("#admin-course-teacher-id").value;
        const description = freshForm.querySelector("#admin-course-desc").value.trim();
        let image = freshForm.querySelector("#admin-course-image").value;
        const directUrl = freshForm.querySelector("#admin-course-image-url-direct")?.value.trim();
        if (directUrl) image = directUrl;
        const meetingLink = freshForm.querySelector("#admin-course-meeting-link").value.trim();

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
          if (b.getAttribute("data-tab") === "sessions") b.classList.add("active");
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

    // Admin Billings Stat Cards Scroll Actions
    this.container.querySelector("#stat-card-total-revenue")?.addEventListener("click", () => {
      document.getElementById("admin-billings-section")?.scrollIntoView({ behavior: "smooth" });
    });

    this.container.querySelector("#stat-card-total-payouts")?.addEventListener("click", () => {
      document.getElementById("admin-payouts-section")?.scrollIntoView({ behavior: "smooth" });
    });

    // Admin Billings Table Filter & Search
    const filterBillings = () => {
      const q = (document.getElementById("admin-billing-search")?.value || "").toLowerCase().trim();
      const type = document.getElementById("admin-billing-type-filter")?.value || "ALL";
      const status = document.getElementById("admin-billing-status-filter")?.value || "ALL";

      this.container.querySelectorAll(".admin-billing-row").forEach(row => {
        const searchData = row.getAttribute("data-search") || "";
        const rowType = row.getAttribute("data-type") || "";
        const rowStatus = row.getAttribute("data-status") || "";

        const matchesSearch = !q || searchData.includes(q);
        const matchesType = type === "ALL" || rowType === type;
        const matchesStatus = status === "ALL" || rowStatus === status;

        row.style.display = (matchesSearch && matchesType && matchesStatus) ? "" : "none";
      });
    };

    document.getElementById("admin-billing-search")?.addEventListener("input", filterBillings);
    document.getElementById("admin-billing-type-filter")?.addEventListener("change", filterBillings);
    document.getElementById("admin-billing-status-filter")?.addEventListener("change", filterBillings);

    // Admin View Payment Details Modal
    this.container.querySelectorAll(".admin-view-payment-details-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const paymentId = btn.getAttribute("data-id");
        this.renderPaymentDetailsModal(paymentId);
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

    // Admin Groups Add & View Students Buttons
    this.container.querySelector("#admin-groups-add-btn")?.addEventListener("click", () => {
      this.renderGroupSessionModal();
    });

    this.container.querySelectorAll(".admin-view-group-students-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        this.renderGroupStudentsModal(id);
      });
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
        } catch (err) { btn.disabled = false; }
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
        } catch (err) { btn.disabled = false; }
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

  onDestroy() { }

}

// ── Assign page module methods to AdminView prototype ────────────────────────
Object.assign(AdminView.prototype, AdminStatsPage);
Object.assign(AdminView.prototype, AdminUsersPage);
Object.assign(AdminView.prototype, AdminCoursesPage);
Object.assign(AdminView.prototype, AdminSessionsPage);
Object.assign(AdminView.prototype, AdminSubscriptionsPage);
Object.assign(AdminView.prototype, AdminReportsPage);
Object.assign(AdminView.prototype, AdminEarningsPage);
Object.assign(AdminView.prototype, AdminPlansPage);
