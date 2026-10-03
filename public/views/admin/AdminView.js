import { apiFetch, state, setAuth, showToast, t, confirmDialog, renderPhoneInputGroup, getCleanWhatsAppNumber, renderEducationSelectHTML, handleWhatsAppResponse, formatSessionDateTime, getTimezoneBadgeHTML } from "../../app.js";

// ── Page Module Imports ──────────────────────────────────────────────────────
import { AdminStatsPage } from './AdminStatsPage.js';
import { AdminUsersPage } from './AdminUsersPage.js';
import { AdminCoursesPage } from './AdminCoursesPage.js';
import { AdminSessionsPage } from './AdminSessionsPage.js';
import { AdminSubscriptionsPage } from './AdminSubscriptionsPage.js';
import { AdminReportsPage } from './AdminReportsPage.js';
import { AdminEarningsPage } from './AdminEarningsPage.js';
import { AdminPlansPage } from './AdminPlansPage.js';
import { AdminSettingsPage } from './AdminSettingsPage.js';
import { AdminCurriculumPage } from './AdminCurriculumPage.js';
import { AdminBlogsPage } from './AdminBlogsPage.js';

export default class AdminView {

  constructor(container, initialTab = "stats") {
    this.container = container;
    let mainTab = initialTab || "stats";
    let subTab = null;
    if (typeof mainTab === "string" && mainTab.includes("/")) {
      const parts = mainTab.split("/");
      mainTab = parts[0];
      subTab = parts.slice(1).join("/");
    }
    this.activeTab = mainTab;
    if (mainTab === "settings" && subTab) {
      this._settingsSection = subTab;
    }
    window.adminViewInstance = this;
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
    this.allBlogs = [];
    this.platformSettings = null;
    this.subFilter = "all";
    this.expandedStudents = new Set();
    this.adminGroupFilterStatus = "all";
    this.adminGroupSearchQuery = "";
    this.adminGroupCourseFilter = "all";
    this.adminGroupTeacherFilter = "all";
    this.adminGroupSort = "newest";
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
              <input type="email" id="admin-login-email" class="form-input" placeholder="admin@example.com" required style="padding:10px; width:100%;">
            </div>
            <div>
              <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:4px;">كلمة السر:</label>
              <input type="password" id="admin-login-password" class="form-input" placeholder="••••••••" required style="padding:10px; width:100%;">
            </div>
            <button type="submit" class="btn-primary" style="padding:12px; font-weight:800; font-size:0.95rem; justify-content:center; margin-top:8px;">
              <i data-lucide="log-in"></i> تسجيل الدخول كـ Admin 🛡️
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
          border-radius: 14px;
          cursor: pointer;
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text-muted);
          text-align: start;
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          margin-bottom: 4px;
          position: relative;
        }
        .admin-nav-btn:hover {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.09) 0%, rgba(16, 185, 129, 0.05) 100%);
          color: var(--primary);
          border-color: rgba(99, 102, 241, 0.25);
          transform: translateX(-5px);
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.1);
        }
        [dir="ltr"] .admin-nav-btn:hover {
          transform: translateX(5px);
        }
        .admin-nav-btn:active {
          transform: scale(0.97) translateX(-3px);
        }
        [dir="ltr"] .admin-nav-btn:active {
          transform: scale(0.97) translateX(3px);
        }
        .admin-nav-btn.active {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.16), rgba(236, 72, 153, 0.08));
          color: var(--primary);
          font-weight: 800;
          border: 1px solid rgba(99, 102, 241, 0.35);
          box-shadow: 0 4px 18px rgba(99, 102, 241, 0.18);
        }
        .admin-nav-btn.active::before {
          content: '';
          position: absolute;
          inset-inline-start: 0;
          top: 20%;
          height: 60%;
          width: 4px;
          background: linear-gradient(180deg, var(--primary), #ec4899);
          border-radius: 0 4px 4px 0;
          box-shadow: 0 0 10px var(--primary);
        }
        [dir="ltr"] .admin-nav-btn.active::before {
          border-radius: 4px 0 0 4px;
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
            <button class="admin-nav-btn ${this.activeTab === "curriculum" ? "active" : ""}" data-tab="curriculum">
              <i data-lucide="book-marked"></i>
              🎓 المراحل والمواد الدراسية
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
              إدارة الحصص والحصص
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
            <button class="admin-nav-btn ${this.activeTab === "plans" ? "active" : ""}" data-tab="plans">
              <i data-lucide="sparkles"></i>
              خطط وباقات الاشتراكات
              <span class="admin-nav-badge" id="admin-badge-plans">0</span>
            </button>
            <button class="admin-nav-btn ${this.activeTab === "blogs" ? "active" : ""}" data-tab="blogs">
              <i data-lucide="newspaper"></i>
              📰 إدارة المدونة والمقالات
              <span class="admin-nav-badge" id="admin-badge-blogs" style="background:#ec4899; color:#fff;">0</span>
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
            <button class="admin-nav-btn ${this.activeTab === "parents" ? "active" : ""}" data-tab="parents">
              <i data-lucide="users-2"></i>
              👨‍👩‍👧 أولياء الأمور
              <span class="admin-nav-badge" id="admin-badge-parents" style="background:#8b5cf6;color:#fff;">0</span>
            </button>

            <div class="admin-nav-section">إعدادات النظام</div>
            <button class="admin-nav-btn ${this.activeTab === "earnings" ? "active" : ""}" data-tab="earnings">
              <i data-lucide="dollar-sign"></i>
              المدفوعات والمستحقات
            </button>
            <button class="admin-nav-btn ${this.activeTab === "settings" ? "active" : ""}" data-tab="settings" style="border:1px solid rgba(99,102,241,0.25); background:rgba(99,102,241,0.06);">
              <i data-lucide="settings-2"></i>
              ⚙️ إعدادات المنصة
            </button>
          </nav>

          <div class="admin-sidebar-footer">
            <div class="admin-sidebar-user">
              <img src="${(state.user?.avatar && !state.user.avatar.includes('dicebear.com')) ? state.user.avatar : 'assets/logo.png'}" onerror="this.src='assets/logo.png'" alt="Admin">
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
    const pendingStudents = students.filter(u => u.status === "PENDING");
    const pendingApps = (this.teacherApplications || []).filter(a => a.status === "pending");
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el("admin-badge-teachers", teachers.length);
    el("admin-badge-students", pendingStudents.length > 0 ? `${pendingStudents.length} معلق` : students.length);
    const studentBadge = document.getElementById("admin-badge-students");
    if (studentBadge) {
      if (pendingStudents.length > 0) {
        studentBadge.style.background = "#f59e0b";
        studentBadge.style.color = "#fff";
      } else {
        studentBadge.style.background = "";
        studentBadge.style.color = "";
      }
    }
    el("admin-badge-courses", (this.courses || []).length);
    el("admin-badge-enrollments", (this.enrollments || []).length);
    el("admin-badge-sessions", (this.allSessions || []).length);
    const isGroupCheck = (s) => !!s.course || !s.student || (s.type && String(s.type).toLowerCase().includes("group")) || (s.title && String(s.title).includes("مجموعة"));
    el("admin-badge-groups", (this.allSessions || []).filter(isGroupCheck).length);
    el("admin-badge-categories", (this.categories || []).length);
    el("admin-badge-applications", pendingApps.length);
    const groupSubsCount = (this.enrollments || []).filter(e => e.group).length;
    el("admin-badge-subscriptions", (this.subscriptions || []).length + groupSubsCount);
    el("admin-badge-plans", (this.allPlans || []).length);
    const pendingBlogs = (this.allBlogs || []).filter(b => b.status === "PENDING");
    el("admin-badge-blogs", pendingBlogs.length > 0 ? `${pendingBlogs.length} معلق` : (this.allBlogs || []).length);
    el("admin-badge-parents", (this.allParents || []).length);
  }


  async loadAllData() {
    try {
      const [stats, members, courses, reportsData, categories, teacherApplications, sessions, subscriptions, earnings, allPlans, enrollments, settings, pendingGroups, allGroups, blogs, parents] = await Promise.all([
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
        apiFetch("/admin/enrollments").catch(() => []),
        apiFetch("/admin/settings").catch(() => ({})),
        apiFetch("/admin/groups/pending-approval").catch(() => []),
        apiFetch("/admin/all-groups").catch(() => []),
        apiFetch("/admin/blogs").catch(() => []),
        apiFetch("/admin/parents").catch(() => [])
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
      this.pendingCourseGroups = pendingGroups || [];
      this.allCourseGroups = allGroups || [];
      this.allGroups = allGroups || [];
      this.allBlogs = blogs || [];
      this.allParents = parents || [];
      if (settings) {
        this.platformSettings = settings;
        state.platformSettings = { ...state.platformSettings, ...settings };
      }
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
          const targetUrl = tab === "settings" && this._settingsSection
            ? `#admin-dashboard/settings/${this._settingsSection}`
            : `#admin-dashboard/${tab}`;
          if (window.location.hash !== targetUrl) {
            history.pushState(null, "", targetUrl);
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
    curriculum: { heading: "🎓 إدارة المراحل والمواد الدراسية", sub: "إضافة وإخفاء وتعديل الصفوف الدراسية والمواد لكل مرحلة تعليمية" },
    categories: { heading: "🗂️ إدارة التصنيفات", sub: "التصنيفات الرسمية المتاحة لجميع المعلمين" },
    courses: { heading: "📚 إدارة الدورات", sub: "مراجعة والإشراف على جميع دورات المنصة" },
    enrollments: { heading: "🎓 طلبات وتسجيلات الكورسات", sub: "مراجعة واعتماد طلبات التحويل وتسجيل الطلاب في جميع الكورسات" },
    sessions: { heading: "📹 إدارة الحصص والحصص", sub: "متابعة وإلغاء وإعادة جدولة حصص البث المباشر والحصص الخاصة 1-على-1" },
    groups: { heading: "👥 المجموعات والحصص الجماعية", sub: "إدارة المجموعات، الطلاب المسجلين بالجروب، وأوقات البث المباشر" },
    teachers: { heading: "👨‍🏫 إدارة المعلمين", sub: "إضافة وتعديل وإدارة حسابات المعلمين" },
    students: { heading: "🎓 إدارة الطلاب", sub: "إضافة وتعديل وإدارة حسابات الطلاب" },
    teacherApplications: { heading: "📝 طلبات انضمام المعلمين", sub: "مراجعة السير الذاتية والقبول/الرفض لمعلمي المنصة الجدد" },
    members: { heading: "🛡️ جميع الأعضاء", sub: "عرض وإدارة جميع مستخدمي المنصة" },
    parents: { heading: "👨‍👩‍👧 أولياء الأمور", sub: "إضافة وإدارة حسابات أولياء الأمور وربط أبنائهم من الطلاب" },
    subscriptions: { heading: "📅 إدارة الاشتراكات", sub: "متابعة وتعيين المعلمين لاشتراكات الحصص الخاصة" },
    earnings: { heading: "💰 المدفوعات والمستحقات", sub: "متابعة إيرادات المنصة ومستحقات المعلمين" },
    plans: { heading: "✨ خطط وباقات الاشتراكات (Subscription Plans & Quota)", sub: "إدارة وتعديل أسعار الباقات، عدد الحصص (Quota)، وتخصيص الباقات لكل كورس" },
    blogs: { heading: "📰 إدارة المدونة والمقالات", sub: "مراجعة واعتماد أو رفض مقالات المعلمين، ونشر مقالات جديدة كمسؤول" },
    settings: { heading: "⚙️ إعدادات المنصة ورقم الواتساب", sub: "إدارة رقم الواتساب الرسمي، أرقام الدعم الهاتفي، والبريد الإلكتروني للواجهة الرئيسية" },
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

    if (tab === "stats") {
      content.innerHTML = this.renderStatsTab();
      this.bindAdminStatsEvents();
    }
    else if (tab === "curriculum") {
      content.innerHTML = "";
      const page = new AdminCurriculumPage(content, this);
      page.render();
      return; // page manages its own icons/events
    }
    else if (tab === "categories") content.innerHTML = this.renderCategoriesTab();
    else if (tab === "teachers") content.innerHTML = this.renderTeachersTab();
    else if (tab === "students") content.innerHTML = this.renderStudentsTab();
    else if (tab === "teacherApplications") content.innerHTML = this.renderTeacherApplicationsTab();
    else if (tab === "members") content.innerHTML = this.renderMembersTab();
    else if (tab === "courses") {
      content.innerHTML = this.renderCoursesTab();
      this.bindCoursesEvents?.();
    }
    else if (tab === "enrollments") content.innerHTML = this.renderEnrollmentsTab();
    else if (tab === "sessions") content.innerHTML = this.renderSessionsTab(args);
    else if (tab === "groups") content.innerHTML = this.renderGroupsTab(args);
    else if (tab === "reports") content.innerHTML = this.renderReportsTab();
    else if (tab === "subscriptions") content.innerHTML = this.renderSubscriptionsTab();
    else if (tab === "earnings") content.innerHTML = this.renderEarningsTab();
    else if (tab === "plans") content.innerHTML = this.renderPlansTab();
    else if (tab === "blogs") {
      content.innerHTML = this.renderBlogsTab();
      this.bindBlogsEvents?.();
    }
    else if (tab === "settings") {
      content.innerHTML = this.renderSettingsTab();
      this.bindSettingsEvents?.();
    }
    else if (tab === "parents") {
      content.innerHTML = this.renderParentsTab();
      this.bindParentsEvents?.();
    }

    // Always keep sidebar badges fresh
    this.updateBadges();

    if (window.lucide) window.lucide.createIcons();
    this.bindActionEvents();
  }

  bindActionEvents() {
    // Admin Add Course Modal Open
    this.container.querySelector("#open-admin-add-course-modal-btn")?.addEventListener("click", (e) => {
      e.preventDefault();
      this.renderAddCourseModal();
    });

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
        const confirmed = await confirmDialog("هل أنت متأكد من رفض هذه الدورة؟");
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

    // Admin Archive Course (Hides course from landing and all pages)
    this.container.querySelectorAll(".admin-archive-course-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const title = btn.getAttribute("data-title") || "الدورة";
        const confirmed = await confirmDialog(`هل أنت متأكد من أرشفة "${title}"؟ ستختفي الدورة فوراً من الصفحة الرئيسية وصفحات الطلاب وجميع الفهارس.`);
        if (!confirmed) return;
        try {
          const res = await apiFetch(`/admin/courses/${id}/archive`, { method: "POST" });
          showToast(res.message || "تمت أرشفة الدورة وإخفاؤها بنجاح 📦", "success");
          await this.loadAllData();
          this.renderTab("courses");
        } catch (err) {
          showToast(err.message || "فشل أرشفة الدورة", "error");
        }
      });
    });

    // Admin Unarchive Course (Restores course to PUBLISHED)
    this.container.querySelectorAll(".admin-unarchive-course-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        try {
          const res = await apiFetch(`/admin/courses/${id}/unarchive`, { method: "POST" });
          showToast(res.message || "تم إلغاء الأرشفة وإعادة إتاحة الدورة للجميع! 🎉", "success");
          await this.loadAllData();
          this.renderTab("courses");
        } catch (err) {
          showToast(err.message || "فشل إلغاء أرشفة الدورة", "error");
        }
      });
    });

    // Admin Open Approve Group Modal
    this.container.querySelectorAll(".admin-open-approve-group-modal-btn, .admin-approve-group-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const group = (this.pendingCourseGroups || []).find(g => String(g.id) === String(id)) ||
          (this.allCourseGroups || []).find(g => String(g.id) === String(id));
        if (group) {
          this.renderApproveGroupModal(group);
        } else {
          showToast("لم يتم العثور على بيانات المجموعة.", "error");
        }
      });
    });

    // Admin Reject Group
    this.container.querySelectorAll(".admin-reject-group-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const confirmed = await confirmDialog("هل تريد بالتأكيد رفض طلب إنشاء هذه المجموعة؟", { danger: true });
        if (!confirmed) return;

        try {
          btn.disabled = true;
          await apiFetch(`/admin/groups/${id}/reject`, { method: "POST" });
          showToast("تم رفض المجموعة.", "info");
          await this.loadAllData();
          this.renderTab("groups");
        } catch (err) {
          showToast(err.message || "فشل رفض المجموعة.", "error");
          btn.disabled = false;
        }
      });
    });

    // Admin Edit Group Full Details Modal
    this.container.querySelectorAll(".admin-edit-group-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const group = (this.allCourseGroups || []).find(g => String(g.id) === String(id));
        if (group) {
          this.renderEditGroupModal(group);
        } else {
          showToast("لم يتم العثور على بيانات المجموعة.", "error");
        }
      });
    });

    // Admin Toggle Group Status (Close for Teaching / Reopen for Enrollment)
    this.container.querySelectorAll(".admin-toggle-group-status-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const action = btn.getAttribute("data-action");
        const isClosing = action === "close";

        const message = isClosing
          ? "هل تريد بالتأكيد إغلاق هذه المجموعة وبدء التدريس؟\n• سيتم قفل باب التسجيل فوراً ولن يتمكن أي طالب جديد من الانضمام."
          : "هل تريد إعادة فتح المجموعة وإتاحتها لتسجيل الطلاب مرة أخرى؟";

        const confirmed = await confirmDialog(message);
        if (!confirmed) return;

        try {
          btn.disabled = true;
          const newStatus = isClosing ? "IN_PROGRESS" : "OPEN";
          await apiFetch(`/groups/${id}`, {
            method: "PUT",
            body: JSON.stringify({ status: newStatus })
          });

          showToast(
            isClosing
              ? "تم إغلاق المجموعة وبدء التدريس وقفل التسجيل بنجاح! 🔒🚀"
              : "تم فتح المجموعة للتسجيل بنجاح! 🔓✨",
            "success"
          );
          await this.loadAllData();
          this.renderTab("groups");
        } catch (err) {
          showToast(err.message || "فشل تغيير حالة المجموعة.", "error");
          btn.disabled = false;
        }
      });
    });

    // Admin Delete Group
    this.container.querySelectorAll(".admin-delete-group-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const name = btn.getAttribute("data-name") || "هذه المجموعة";
        const confirmed = await confirmDialog(`هل أنت متأكد من حذف "${name}" نهائياً؟`, { danger: true });
        if (!confirmed) return;

        try {
          btn.disabled = true;
          await apiFetch(`/groups/${id}`, { method: "DELETE" });
          showToast("تم حذف المجموعة بنجاح.", "success");
          await this.loadAllData();
          this.renderTab("groups");
        } catch (err) {
          showToast(err.message || "فشل حذف المجموعة.", "error");
          btn.disabled = false;
        }
      });
    });

    // Admin Groups Search Input
    const adminGroupSearchInput = this.container.querySelector("#admin-groups-search-input");
    if (adminGroupSearchInput) {
      adminGroupSearchInput.addEventListener("input", (e) => {
        this.adminGroupSearchQuery = e.target.value;
        this.renderTab("groups");
      });
    }

    // Admin Groups Status Tabs
    this.container.querySelectorAll(".admin-group-filter-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.adminGroupFilterStatus = btn.getAttribute("data-filter");
        this.renderTab("groups");
      });
    });

    // Admin Groups Course Filter Dropdown
    const adminGroupCourseFilter = this.container.querySelector("#admin-groups-course-filter");
    if (adminGroupCourseFilter) {
      adminGroupCourseFilter.addEventListener("change", (e) => {
        this.adminGroupCourseFilter = e.target.value;
        this.renderTab("groups");
      });
    }

    // Admin Groups Teacher Filter Dropdown
    const adminGroupTeacherFilter = this.container.querySelector("#admin-groups-teacher-filter");
    if (adminGroupTeacherFilter) {
      adminGroupTeacherFilter.addEventListener("change", (e) => {
        this.adminGroupTeacherFilter = e.target.value;
        this.renderTab("groups");
      });
    }

    // Admin Groups Sort Dropdown
    const adminGroupSort = this.container.querySelector("#admin-groups-sort");
    if (adminGroupSort) {
      adminGroupSort.addEventListener("change", (e) => {
        this.adminGroupSort = e.target.value;
        this.renderTab("groups");
      });
    }

    // Admin Groups Reset Filters Button
    const resetAdminGroupFilters = () => {
      this.adminGroupSearchQuery = "";
      this.adminGroupFilterStatus = "all";
      this.adminGroupCourseFilter = "all";
      this.adminGroupTeacherFilter = "all";
      this.adminGroupSort = "newest";
      this.renderTab("groups");
    };
    this.container.querySelector("#admin-reset-group-filters-btn")?.addEventListener("click", resetAdminGroupFilters);
    this.container.querySelector("#admin-empty-reset-filters-btn")?.addEventListener("click", resetAdminGroupFilters);

    // Admin Approve Course Enrollment
    this.container.querySelectorAll(".admin-approve-enrollment-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        this.renderApproveEnrollmentModal(id);
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

    // Admin Open Manual Subscription Modal (Private 1-on-1)
    this.container.querySelector("#admin-open-manual-sub-modal-btn")?.addEventListener("click", () => {
      this.renderManualSubscriptionModal();
    });

    // Admin Open Quick Group Enroll Modal
    this.container.querySelector("#admin-open-group-enroll-modal-btn")?.addEventListener("click", () => {
      this.renderQuickGroupEnrollModal();
    });

    // Search inside Subscriptions Tab
    this.container.querySelector("#admin-sub-search-input")?.addEventListener("input", (e) => {
      this.subSearchQuery = e.target.value;
      const q = (this.subSearchQuery || "").toLowerCase().trim();
      this.container.querySelectorAll(".table tbody tr").forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = (!q || text.includes(q)) ? "" : "none";
      });
    });

    // Group Subscriptions Actions in Subscriptions Tab
    this.container.querySelectorAll(".admin-view-group-students-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const groupId = btn.getAttribute("data-group-id");
        if (groupId) this.renderGroupStudentsModal(groupId);
      });
    });

    this.container.querySelectorAll(".admin-approve-group-enrollment-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        if (id) this.renderApproveEnrollmentModal(id);
      });
    });

    this.container.querySelectorAll(".admin-remove-group-student-sub-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const groupId = btn.getAttribute("data-group-id");
        const studentId = btn.getAttribute("data-student-id");
        if (!groupId || !studentId) return;

        const confirmed = await confirmDialog({
          title: "إلغاء اشتراك وإزالة الطالب من المجموعة",
          message: "هل أنت متأكد من إزالة هذا الطالب من المجموعة الدراسية؟ سيتم حذف التسجيل وإيصال الدفع المرتبط به."
        });
        if (!confirmed) return;

        try {
          const res = await apiFetch(`/admin/groups/${groupId}/remove-student`, {
            method: "POST",
            body: JSON.stringify({ studentId })
          });
          showToast(res.message || "تمت إزالة الطالب وإلغاء الاشتراك بنجاح", "success");
          await this.loadAllData();
          this.renderTab("subscriptions");
        } catch (err) {
          showToast(err.message || "فشل إزالة الطالب من المجموعة", "error");
        }
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

    // Admin Pay Teacher Total/Partial
    this.container.querySelectorAll(".admin-pay-teacher-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const teacherId = btn.getAttribute("data-teacher-id");
        this.renderPayTeacherModal(teacherId);
      });
    });

    // Admin Toggle Teacher Payout Accordion
    this.container.querySelectorAll(".admin-teacher-accordion-header").forEach(hdr => {
      hdr.addEventListener("click", () => {
        const targetId = hdr.getAttribute("data-target");
        const targetEl = document.getElementById(targetId);
        if (!targetEl) return;
        const isExpanded = targetEl.style.display !== "none";
        targetEl.style.display = isExpanded ? "none" : "block";
        const card = hdr.closest(".admin-teacher-payout-card");
        const chevron = card?.querySelector(".accordion-chevron");
        if (chevron) {
          chevron.style.transform = isExpanded ? "rotate(0deg)" : "rotate(180deg)";
        }
        const label = card?.querySelector(".accordion-label");
        if (label) {
          const count = card.querySelector(".admin-toggle-teacher-accordion-btn")?.getAttribute("data-count") || "";
          label.textContent = isExpanded ? `التفاصيل (${count})` : `إخفاء التفاصيل (${count})`;
        }
      });
    });

    this.container.querySelectorAll(".admin-toggle-teacher-accordion-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const targetId = btn.getAttribute("data-target");
        const targetEl = document.getElementById(targetId);
        if (!targetEl) return;
        const isExpanded = targetEl.style.display !== "none";
        targetEl.style.display = isExpanded ? "none" : "block";
        const chevron = btn.querySelector(".accordion-chevron");
        if (chevron) {
          chevron.style.transform = isExpanded ? "rotate(0deg)" : "rotate(180deg)";
        }
        const label = btn.querySelector(".accordion-label");
        if (label) {
          const count = btn.getAttribute("data-count") || "";
          label.textContent = isExpanded ? `التفاصيل (${count})` : `إخفاء التفاصيل (${count})`;
        }
      });
    });

    // Admin Teacher Payout Filter & Search
    const filterTeacherPayouts = () => {
      const q = (document.getElementById("admin-teacher-payout-search")?.value || "").toLowerCase().trim();
      const filter = document.getElementById("admin-teacher-payout-filter")?.value || "ALL";

      this.container.querySelectorAll(".admin-teacher-payout-card").forEach(card => {
        const searchData = (card.getAttribute("data-search") || "").toLowerCase();
        const status = card.getAttribute("data-status") || "";

        const matchesSearch = !q || searchData.includes(q);
        const matchesFilter = filter === "ALL" ||
          (filter === "PENDING" && status === "PENDING") ||
          (filter === "PAID" && status === "PAID");

        card.style.display = (matchesSearch && matchesFilter) ? "" : "none";
      });
    };

    document.getElementById("admin-teacher-payout-search")?.addEventListener("input", filterTeacherPayouts);
    document.getElementById("admin-teacher-payout-filter")?.addEventListener("change", filterTeacherPayouts);

    // Admin Pay Earning
    this.container.querySelectorAll(".admin-pay-earning-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        this.renderPayTeacherEarningModal(id);
      });
    });

    // Admin Delete Teacher Payout Receipt / Revert
    this.container.querySelectorAll(".admin-delete-earning-receipt-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        this.handleRevertTeacherPayout(id);
      });
    });

    // Admin Delete Teacher Earning
    this.container.querySelectorAll(".admin-delete-earning-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        this.handleDeleteTeacherEarning(id);
      });
    });

    // Admin Billings Stat Cards Scroll Actions
    this.container.querySelector("#stat-card-total-revenue")?.addEventListener("click", () => {
      document.getElementById("admin-billings-section")?.scrollIntoView({ behavior: "smooth" });
    });

    this.container.querySelector("#stat-card-total-payouts")?.addEventListener("click", () => {
      document.getElementById("admin-payouts-section")?.scrollIntoView({ behavior: "smooth" });
    });

    // Admin Student Billings Accordion Toggles
    this.container.querySelectorAll(".admin-student-accordion-header").forEach(header => {
      header.addEventListener("click", () => {
        const targetId = header.getAttribute("data-target");
        const targetEl = document.getElementById(targetId);
        if (!targetEl) return;
        const isExpanded = targetEl.style.display !== "none";
        targetEl.style.display = isExpanded ? "none" : "block";
        const chevron = header.querySelector(".accordion-chevron");
        if (chevron) {
          chevron.style.transform = isExpanded ? "rotate(0deg)" : "rotate(180deg)";
        }
        const label = header.querySelector(".accordion-label");
        if (label) {
          const btn = header.querySelector(".admin-toggle-student-accordion-btn");
          const count = btn?.getAttribute("data-count") || "";
          label.textContent = isExpanded ? `الفواتير (${count})` : `إخفاء الفواتير (${count})`;
        }
      });
    });

    this.container.querySelectorAll(".admin-toggle-student-accordion-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const targetId = btn.getAttribute("data-target");
        const targetEl = document.getElementById(targetId);
        if (!targetEl) return;
        const isExpanded = targetEl.style.display !== "none";
        targetEl.style.display = isExpanded ? "none" : "block";
        const chevron = btn.querySelector(".accordion-chevron");
        if (chevron) {
          chevron.style.transform = isExpanded ? "rotate(0deg)" : "rotate(180deg)";
        }
        const label = btn.querySelector(".accordion-label");
        if (label) {
          const count = btn.getAttribute("data-count") || "";
          label.textContent = isExpanded ? `الفواتير (${count})` : `إخفاء الفواتير (${count})`;
        }
      });
    });

    // Admin Student Billings Filter & Search
    const filterStudentBillings = () => {
      const q = (document.getElementById("admin-student-billing-search")?.value || "").toLowerCase().trim();
      const filter = document.getElementById("admin-student-billing-filter")?.value || "ALL";

      this.container.querySelectorAll(".admin-student-billing-card").forEach(card => {
        const searchData = (card.getAttribute("data-search") || "").toLowerCase();
        const status = card.getAttribute("data-status") || "";

        const matchesSearch = !q || searchData.includes(q);
        const matchesFilter = filter === "ALL" ||
          (filter === "PENDING" && status === "PENDING") ||
          (filter === "SUCCESS" && status === "SUCCESS");

        card.style.display = (matchesSearch && matchesFilter) ? "" : "none";
      });
    };

    document.getElementById("admin-student-billing-search")?.addEventListener("input", filterStudentBillings);
    document.getElementById("admin-student-billing-filter")?.addEventListener("change", filterStudentBillings);

    // Admin View Payment Details Modal
    this.container.querySelectorAll(".admin-view-payment-details-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const paymentId = btn.getAttribute("data-id");
        this.renderPaymentDetailsModal(paymentId);
      });
    });

    // Admin Delete Payment
    this.container.querySelectorAll(".admin-delete-payment-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const paymentId = btn.getAttribute("data-id");
        this.handleDeletePayment(paymentId);
      });
    });

    // Admin Open Group Session Modal
    this.container.querySelector("#admin-open-group-session-btn")?.addEventListener("click", () => {
      this.renderGroupSessionModal();
    });

    // Admin WhatsApp Session Reminder Modal
    this.container.querySelectorAll(".admin-session-whatsapp-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const sessionId = btn.getAttribute("data-id");
        if (sessionId) {
          this.renderSessionWhatsAppModal(sessionId);
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

    // Admin Complete Session & Credit Teacher Money
    this.container.querySelectorAll(".admin-complete-session-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const sessionId = btn.getAttribute("data-id");
        const groupId = btn.getAttribute("data-group-id");
        this.renderAdminCompleteSessionModal(sessionId, groupId);
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
        } catch (err) {
          btn.disabled = false;
          showToast(err.message || "فشل إلغاء الحصة", "error");
        }
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

    // Groups Accordion Item Toggle
    this.container.querySelectorAll(".group-accordion-header").forEach(header => {
      header.addEventListener("click", (e) => {
        // Prevent collapsing if clicked inside a button
        if (e.target.closest("button") || e.target.closest("a")) return;

        const item = header.closest(".group-accordion-item");
        if (!item) return;
        const body = item.querySelector(".group-accordion-body");
        const chevron = item.querySelector(".accordion-chevron-icon");

        const isOpen = body && body.style.display === "block";
        if (isOpen) {
          body.style.display = "none";
          if (chevron) chevron.style.transform = "rotate(0deg)";
          item.style.boxShadow = "0 4px 14px rgba(0,0,0,0.03)";
        } else {
          body.style.display = "block";
          if (chevron) chevron.style.transform = "rotate(180deg)";
          item.style.boxShadow = "0 8px 26px rgba(0,0,0,0.08)";
        }
      });
    });

    // Accordion Expand All / Collapse All Buttons
    this.container.querySelector("#admin-accordion-expand-all-btn")?.addEventListener("click", () => {
      this.container.querySelectorAll(".group-accordion-item").forEach(item => {
        const body = item.querySelector(".group-accordion-body");
        const chevron = item.querySelector(".accordion-chevron-icon");
        if (body) body.style.display = "block";
        if (chevron) chevron.style.transform = "rotate(180deg)";
        item.style.boxShadow = "0 8px 26px rgba(0,0,0,0.08)";
      });
    });

    this.container.querySelector("#admin-accordion-collapse-all-btn")?.addEventListener("click", () => {
      this.container.querySelectorAll(".group-accordion-item").forEach(item => {
        const body = item.querySelector(".group-accordion-body");
        const chevron = item.querySelector(".accordion-chevron-icon");
        if (body) body.style.display = "none";
        if (chevron) chevron.style.transform = "rotate(0deg)";
        item.style.boxShadow = "0 4px 14px rgba(0,0,0,0.03)";
      });
    });

    // Admin Groups Add Button
    this.container.querySelector("#admin-groups-add-btn")?.addEventListener("click", () => {
      this.renderAdminCreateGroupModal();
    });

    this.container.querySelectorAll(".admin-view-group-students-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        this.renderGroupStudentsModal(id);
      });
    });

    // Admin View Group Sessions Button
    this.container.querySelectorAll(".admin-view-group-sessions-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        this.renderGroupSessionsViewModal(id);
      });
    });

    // Admin Edit Group Button
    this.container.querySelectorAll(".admin-edit-group-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const group = (this.allCourseGroups || []).find(g => String(g.id) === String(id));
        if (group) {
          this.renderEditGroupModal(group);
        } else {
          showToast("لم يتم العثور على بيانات المجموعة.", "error");
        }
      });
    });

    // Admin Toggle Group Status (Open / In_Progress)
    this.container.querySelectorAll(".admin-toggle-group-status-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const action = btn.getAttribute("data-action");
        const group = (this.allCourseGroups || []).find(g => String(g.id) === String(id));

        if (action === "close") {
          // Open interactive Start Teaching & Session Generator Modal
          if (group) {
            this.renderStartTeachingModal(group);
          } else {
            showToast("لم يتم العثور على بيانات المجموعة.", "error");
          }
          return;
        }

        // Reopen group for registration
        const confirmed = await confirmDialog({ message: "هل تريد إعادة فتح باب التسجيل في هذه المجموعة؟" });
        if (!confirmed) return;
        btn.disabled = true;
        try {
          await apiFetch(`/groups/${id}`, {
            method: "PUT",
            body: JSON.stringify({ status: "OPEN" })
          });
          showToast("تمت إعادة فتح باب التسجيل بالمجموعة بنجاح!", "success");
          await this.loadAllData();
          this.renderTab("groups");
        } catch (err) {
          btn.disabled = false;
          showToast(err.message || "فشل تغيير حالة المجموعة.", "error");
        }
      });
    });

    // Admin Delete Group Button
    this.container.querySelectorAll(".admin-delete-group-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const name = btn.getAttribute("data-name") || "هذه المجموعة";
        const group = (this.allCourseGroups || []).find(g => String(g.id) === String(id)) || {};

        // Calculate enrolled students count across all sources (group, roster, allEnrollments)
        const matchedEnrollments = (this.allEnrollments || []).filter(e =>
          (e.group && String(e.group.id) === String(id))
        );
        const attrCount = parseInt(btn.getAttribute("data-enrolled") || "0", 10);
        const count = attrCount ||
          group.enrolledCount ||
          (Array.isArray(group.students) ? group.students.length : 0) ||
          (Array.isArray(group.enrollments) ? group.enrollments.length : 0) ||
          matchedEnrollments.length;

        if (count > 0) {
          // If group has students, ONLY show the Cannot Delete Alert Modal!
          this.renderCannotDeleteGroupModal({
            ...group,
            id,
            name: group.name || name,
            enrolledCount: count
          });
          return;
        }

        // ONLY if group has 0 students, show the deletion confirmation dialog
        const confirmed = await confirmDialog({
          message: `هل أنت متأكد من رغبتك في حذف المجموعة "${name}" نهائياً؟`,
          danger: true
        });
        if (!confirmed) return;
        btn.disabled = true;
        try {
          await apiFetch(`/groups/${id}`, { method: "DELETE" });
          showToast("تم حذف المجموعة الدراسية بنجاح 🗑️", "success");
          await this.loadAllData();
          this.renderTab("groups");
        } catch (err) {
          btn.disabled = false;
          if ((err.message || "").includes("طلاب") || (err.message || "").includes("مسجلين")) {
            this.renderCannotDeleteGroupModal({
              ...group,
              id,
              name: group.name || name,
              enrolledCount: count || 1
            });
          } else {
            showToast(err.message || "فشل حذف المجموعة.", "error");
          }
        }
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
        } catch (err) {
          btn.disabled = false;
          showToast(err.message || "فشل قبول طلب المعلم", "error");
        }
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
        } catch (err) {
          btn.disabled = false;
          showToast(err.message || "فشل رفض طلب المعلم", "error");
        }
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

    // Communicate User Button (WhatsApp / Direct Communication)
    this.container.querySelectorAll(".communicate-user-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const user = this.allMembers.find(u => u.id === id);
        if (user && typeof this.renderCommunicateModal === "function") {
          this.renderCommunicateModal(user);
        }
      });
    });

    // Approve Pending Student
    this.container.querySelectorAll(".approve-student-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const name = btn.getAttribute("data-name") || "الطالب";
        const confirmed = await confirmDialog({
          title: "اعتماد وتفعيل حساب الطالب ✅",
          message: `هل أنت متأكد من رغبتك في اعتماد وتفعيل حساب الطالب "${name}" والسماح له بالدخول إلى لوحة التحكم فوراً؟`,
          confirmText: "نعم، اعتماد وتفعيل الحساب ✅",
          cancelText: "تراجع"
        });
        if (!confirmed) return;
        btn.disabled = true;
        try {
          await apiFetch(`/admin/users/${id}`, {
            method: "PUT",
            body: JSON.stringify({ status: "ACTIVE", isBlocked: false })
          });
          showToast(`🎉 تم اعتماد وتفعيل حساب الطالب (${name}) بنجاح!`, "success");
          await this.loadAllData();
          this.renderTab("students");
        } catch (err) {
          btn.disabled = false;
          showToast(err.message || "فشل اعتماد وتفعيل حساب الطالب", "error");
        }
      });
    });

    // Student Filter Tabs
    this.container.querySelectorAll(".student-filter-tab-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const filter = e.currentTarget.getAttribute("data-filter");
        this.studentStatusFilter = filter;
        this.renderTab("students");
      });
    });

    // Toggle Block User (Teacher or Student)
    this.container.querySelectorAll(".toggle-block-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const name = btn.getAttribute("data-name") || "المستخدم";
        const isCurrentlyBlocked = btn.getAttribute("data-blocked") === "true";
        const role = btn.getAttribute("data-role") || "user";
        const roleLabel = role === "teacher" ? "المعلم" : (role === "student" ? "الطالب" : "المستخدم");

        if (!isCurrentlyBlocked) {
          const confirmed = await confirmDialog({
            title: `حظر ${roleLabel} من تسجيل الدخول 🚫`,
            message: `هل أنت متأكد من رغبتك في حظر ${roleLabel} "${name}" ومنعه من تسجيل الدخول إلى الأكاديمية؟`,
            confirmText: "نعم، تأكيد الحظر",
            cancelText: "إلغاء",
            danger: true
          });
          if (!confirmed) return;
        } else {
          const confirmed = await confirmDialog({
            title: `إلغاء حظر ${roleLabel} ✅`,
            message: `هل تريد إلغاء حظر ${roleLabel} "${name}" والسماح له بتسجيل الدخول إلى الأكاديمية مجدداً؟`,
            confirmText: "نعم، إلغاء الحظر",
            cancelText: "تراجع",
            danger: false
          });
          if (!confirmed) return;
        }

        btn.disabled = true;
        try {
          const res = await apiFetch(`/admin/users/${id}/block`, {
            method: "PATCH",
            body: JSON.stringify({ isBlocked: !isCurrentlyBlocked })
          });
          showToast(res.message || (isCurrentlyBlocked ? "تم إلغاء الحظر بنجاح" : "تم حظر الحساب بنجاح"), "success");
          await this.loadAllData();
          this.renderTab(this.activeTab);
        } catch (err) {
          btn.disabled = false;
          showToast(err.message || "فشل تغيير حالة الحظر", "error");
        }
      });
    });

    // Delete Member
    this.container.querySelectorAll(".delete-user-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const name = btn.getAttribute("data-name");
        const role = btn.getAttribute("data-role") || "";
        const isTeacher = role === "teacher";
        const isStudent = role === "student";

        const title = isTeacher 
          ? `حذف حساب المعلم "${name}" نهائياً ⚠️` 
          : (isStudent ? `حذف حساب الطالب "${name}" نهائياً ⚠️` : `تأكيد حذف الحساب`);

        const message = isTeacher 
          ? `هل أنت متأكد من رغبتك في حذف حساب المعلم "${name}" نهائياً من كافة أقسام المنصة وحذف جميع المجموعات والكورسات التابعة له؟\n\n(ملاحظة أمان: سيتحقق النظام تلقائياً من عدم وجود أي مجموعات لديها حصص أو أيام قادمة قبل إتمام الحذف).`
          : (isStudent
            ? `هل أنت متأكد من رغبتك في حذف حساب الطالب "${name}" نهائياً من كافة أقسام المنصة وإلغاء قيده وحذف معاملاته المالية؟\n\n(ملاحظة أمان: سيتحقق النظام تلقائياً من عدم وجود أي مجموعات دراسية أو حصص قادمة مجدولة في الأيام القادمة قبل إتمام الحذف).`
            : `${t("admin.confirmDelete")} "${name}"?`);

        const confirmed = await confirmDialog({
          title,
          message,
          confirmText: (isTeacher || isStudent) ? "تأكيد الحذف النهائي" : "نعم، حذف",
          cancelText: "إلغاء",
          danger: true
        });
        if (!confirmed) return;
        btn.disabled = true;
        try {
          const res = await apiFetch(`/admin/users/${id}`, { method: "DELETE" });
          showToast(res.message || t("admin.toast.userDeleted") || "تم حذف الحساب بنجاح", "success");
          await this.loadAllData();
          this.renderTab(this.activeTab);
        } catch (err) {
          btn.disabled = false;
          showToast(err.message || "فشل حذف العضو", "error");
        }
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
        } catch (err) {
          btn.disabled = false;
          showToast(err.message || "فشل حذف التصنيف", "error");
        }
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
        } catch (err) {
          btn.disabled = false;
          showToast(err.message || "فشل حذف الدورة", "error");
        }
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

    // Assign / Reassign Teacher to Course
    this.container.querySelectorAll(".admin-assign-course-teacher-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        this.renderAssignTeacherToCourseModal(id);
      });
    });

    // Duplicate Course
    this.container.querySelectorAll(".admin-duplicate-course-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        this.renderDuplicateCourseModal(id);
      });
    });

    // Edit Course
    this.container.querySelectorAll(".admin-edit-course-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        const course = (this.courses || []).find(c => String(c.id) === String(id));
        if (course) this.renderEditCourseModal(course);
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

  // ─── Parents Tab ──────────────────────────────────────────────────────────────
  renderParentsTab() {
    const parents = this.allParents || [];
    return `
      <div class="admin-section" style="padding:0;">
        <!-- Header row -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:24px;">
          <div>
            <h2 style="margin:0 0 4px;font-size:1.2rem;color:var(--text-primary,#fff);">👨‍👩‍👧 أولياء الأمور (${parents.length})</h2>
            <p style="margin:0;font-size:0.85rem;color:var(--text-muted,#888);">الإدارة هي الجهة الوحيدة المخولة بإضافة وإدارة حسابات أولياء الأمور وربط أبنائهم.</p>
          </div>
          <button id="admin-add-parent-btn" class="btn-primary" style="display:flex;align-items:center;gap:8px;padding:10px 20px;border-radius:10px;">
            <i data-lucide="user-plus" style="width:16px;height:16px;"></i> إضافة ولي أمر جديد
          </button>
        </div>

        ${parents.length === 0 ? `
          <div style="text-align:center;padding:60px 24px;background:rgba(255,255,255,0.03);border-radius:16px;border:1px dashed rgba(255,255,255,0.08);">
            <div style="font-size:3rem;margin-bottom:12px;">👨‍👩‍👧</div>
            <p style="color:var(--text-muted,#888);margin:0;">لم يتم إضافة أي ولي أمر بعد. استخدم الزر أعلاه لإضافة أول حساب.</p>
          </div>
        ` : `
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${parents.map(p => `
              <div class="parent-admin-card" data-parent-id="${p.id}" style="background:rgba(255,255,255,0.04);border-radius:14px;border:1px solid rgba(255,255,255,0.07);padding:18px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;transition:background .2s;" onmouseover="this.style.background='rgba(139,92,246,0.06)'" onmouseout="this.style.background='rgba(255,255,255,0.04)'">
                <div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#8b5cf6,#6366f1);display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;">👨‍👩‍👧</div>
                <div style="flex:1;min-width:150px;">
                  <div style="font-weight:600;color:var(--text-primary,#fff);margin-bottom:3px;">${p.name}</div>
                  <div style="font-size:0.82rem;color:var(--text-muted,#888);">${p.email}${p.phone ? ' · 📞 ' + p.phone : ''}${p.location ? ' · 📍 ' + p.location : ''}</div>
                  <div style="margin-top:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span style="font-size:0.75rem;padding:2px 10px;border-radius:20px;background:${p.isBlocked ? 'rgba(239,68,68,0.15)' : p.status === 'PENDING' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)'};color:${p.isBlocked ? '#ef4444' : p.status === 'PENDING' ? '#f59e0b' : '#10b981'};">${p.isBlocked ? 'محظور' : p.status === 'PENDING' ? 'قيد المراجعة' : 'نشط'}</span>
                    <span style="font-size:0.75rem;color:var(--text-muted,#888);">${p.childrenCount || 0} ابن/ابنة مربوط</span>
                  </div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                  <button class="parent-contact-btn btn-secondary" data-parent-id="${p.id}" data-parent-name="${p.name}" data-parent-email="${p.email}" data-parent-phone="${p.phone || ''}" style="padding:8px 14px;border-radius:9px;font-size:0.82rem;display:flex;align-items:center;gap:6px;border-color:rgba(16,185,129,0.35);color:#10b981;background:rgba(16,185,129,0.08);font-weight:700;" title="خيارات ونماذج التواصل">
                    <i data-lucide="message-circle" style="width:13px;height:13px;"></i> تواصل
                  </button>
                  ${p.phone ? `
                    <a href="https://wa.me/${p.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`السلام عليكم ولي أمر الطالب المحترم (${p.name})، نتواصل معكم من إدارة منصة انطلق.`)}" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="padding:8px 10px;border-radius:9px;font-size:0.82rem;display:inline-flex;align-items:center;justify-content:center;color:#25D366;border-color:rgba(37,211,102,0.3);background:rgba(37,211,102,0.08);" title="محادثة واتساب فورية">
                      <i data-lucide="phone-call" style="width:13px;height:13px;"></i>
                    </a>
                  ` : ''}
                  <button class="parent-edit-btn btn-secondary" data-parent-id="${p.id}" data-parent-name="${p.name}" data-parent-email="${p.email}" data-parent-phone="${p.phone || ''}" data-parent-location="${p.location || ''}" data-parent-status="${p.status || 'ACTIVE'}" style="padding:8px 14px;border-radius:9px;font-size:0.82rem;display:flex;align-items:center;gap:6px;">
                    <i data-lucide="edit-3" style="width:13px;height:13px;"></i> تعديل
                  </button>
                  <button class="parent-link-child-btn btn-secondary" data-parent-id="${p.id}" data-parent-name="${p.name}" style="padding:8px 14px;border-radius:9px;font-size:0.82rem;display:flex;align-items:center;gap:6px;">
                    <i data-lucide="link" style="width:13px;height:13px;"></i> ربط طالب
                  </button>
                  <button class="parent-view-children-btn btn-secondary" data-parent-id="${p.id}" data-parent-name="${p.name}" style="padding:8px 14px;border-radius:9px;font-size:0.82rem;display:flex;align-items:center;gap:6px;">
                    <i data-lucide="users" style="width:13px;height:13px;"></i> الأبناء
                  </button>
                  ${p.status === 'PENDING' ? `<button class="parent-approve-btn btn-primary" data-parent-id="${p.id}" style="padding:8px 14px;border-radius:9px;font-size:0.82rem;">✅ تفعيل</button>` : ''}
                  <button class="parent-block-btn" data-parent-id="${p.id}" data-blocked="${p.isBlocked}" style="padding:8px 14px;border-radius:9px;border:1px solid ${p.isBlocked ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'};background:${p.isBlocked ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'};color:${p.isBlocked ? '#10b981' : '#ef4444'};cursor:pointer;font-size:0.82rem;">${p.isBlocked ? '🔓 رفع الحظر' : '🚫 حظر'}</button>
                </div>
              </div>
            `).join('')}
          </div>
        `}

        <!-- Add Parent Modal (styled like Add Student with kinship & student-picker instead of grade) -->
        <div id="add-parent-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);z-index:9999;align-items:center;justify-content:center;padding:20px;">
          <div style="background:var(--bg-card,#1a1d2e);border-radius:20px;padding:32px;max-width:620px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5);border:1px solid var(--border-color,rgba(255,255,255,0.1));position:relative;max-height:90vh;overflow-y:auto;">
            <button type="button" id="close-add-parent-x-btn" style="position:absolute;top:20px;left:20px;background:none;border:none;color:var(--text-muted,#888);font-size:1.5rem;cursor:pointer;line-height:1;">&times;</button>

            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
              <div style="width:44px;height:44px;border-radius:12px;background:rgba(139,92,246,0.15);color:var(--primary,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:1.3rem;">
                <i data-lucide="user-plus" style="width:22px;height:22px;"></i>
              </div>
              <div>
                <h3 style="margin:0;font-size:1.15rem;font-weight:800;color:var(--text-primary,#fff);">👨‍👩‍👧 إضافة ولي أمر جديد</h3>
                <p style="margin:2px 0 0;font-size:0.82rem;color:var(--text-muted,#888);">تسجيل حساب ولي أمر وربطه بالطالب مباشرة للمتابعة</p>
              </div>
            </div>

            <form id="add-parent-form">
              <!-- Row 1: Name & Email -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:12px;">
                <div class="form-group" style="margin:0;">
                  <label style="font-weight:700;font-size:0.85rem;margin-bottom:4px;display:block;color:var(--text-primary,#fff);">الاسم الكامل لولي الأمر <span style="color:var(--error,#ef4444);">*</span></label>
                  <input type="text" id="new-parent-name" class="form-input" placeholder="مثال: يوسف عبد الله" required style="padding:10px 14px;font-size:0.88rem;border-radius:12px;width:100%;box-sizing:border-box;">
                </div>
                <div class="form-group" style="margin:0;">
                  <label style="font-weight:700;font-size:0.85rem;margin-bottom:4px;display:block;color:var(--text-primary,#fff);">البريد الإلكتروني <span style="color:var(--error,#ef4444);">*</span></label>
                  <input type="email" id="new-parent-email" class="form-input" placeholder="parent@example.com" required style="padding:10px 14px;font-size:0.88rem;border-radius:12px;width:100%;box-sizing:border-box;">
                </div>
              </div>

              <!-- Row 2: Password & Phone -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:12px;">
                <div class="form-group" style="margin:0;">
                  <label style="font-weight:700;font-size:0.85rem;margin-bottom:4px;display:block;color:var(--text-primary,#fff);">كلمة المرور (اختياري)</label>
                  <input type="password" id="new-parent-password" class="form-input" placeholder="افتراضي: parent123" style="padding:10px 14px;font-size:0.88rem;border-radius:12px;width:100%;box-sizing:border-box;">
                </div>
                <div class="form-group" style="margin:0;">
                  <label style="font-weight:700;font-size:0.85rem;margin-bottom:4px;display:block;color:var(--text-primary,#fff);">رقم هاتف ولي الأمر والواتساب</label>
                  ${renderPhoneInputGroup({ selectId: "new-parent-phone-code", inputId: "new-parent-phone-num", defaultCode: "+20", placeholder: "01012345678", required: false })}
                </div>
              </div>

              <!-- Row 3: Location & Relationship -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:12px;">
                <div class="form-group" style="margin:0;">
                  <label style="font-weight:700;font-size:0.85rem;margin-bottom:4px;display:block;color:var(--text-primary,#fff);">الولاية / المدينة</label>
                  <input type="text" id="new-parent-location" class="form-input" placeholder="مثال: القاهرة / الجزائر" style="padding:10px 14px;font-size:0.88rem;border-radius:12px;width:100%;box-sizing:border-box;">
                </div>
                <div class="form-group" style="margin:0;">
                  <label style="font-weight:700;font-size:0.85rem;margin-bottom:4px;display:block;color:var(--text-primary,#fff);">صفة القرابة / صلة العلاقة <span style="color:var(--error,#ef4444);">*</span></label>
                  <select id="new-parent-relationship" class="form-input" style="padding:10px 14px;font-size:0.88rem;border-radius:12px;width:100%;box-sizing:border-box;">
                    <option value="أب" selected>أب</option>
                    <option value="أم">أم</option>
                    <option value="ولي أمر">ولي أمر</option>
                    <option value="جد">جد</option>
                    <option value="أخ">أخ</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
              </div>

              <!-- Row 4: Student Selection & Status (Instead of Grade/Course) -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">
                <div class="form-group" style="margin:0;">
                  <label style="font-weight:700;font-size:0.85rem;margin-bottom:4px;display:block;color:var(--text-primary,#fff);">ربط الطالب (الابن/الابنة)</label>
                  <select id="new-parent-student-id" class="form-input" style="padding:10px 14px;font-size:0.88rem;border-radius:12px;width:100%;box-sizing:border-box;">
                    <option value="">-- بدون ربط حالياً (اختياري) --</option>
                    ${((this.allMembers || []).filter(u => u.role === "student")).map(s => `<option value="${s.id}">${s.name} (${s.email}${s.education ? ' · ' + s.education : ''})</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="margin:0;">
                  <label style="font-weight:700;font-size:0.85rem;margin-bottom:4px;display:block;color:var(--text-primary,#fff);">حالة الحساب</label>
                  <select id="new-parent-status" class="form-input" style="padding:10px 14px;font-size:0.88rem;border-radius:12px;width:100%;box-sizing:border-box;">
                    <option value="ACTIVE" selected>نشط ومفعّل مباشرة ✅</option>
                    <option value="PENDING">قيد المراجعة ⏳</option>
                  </select>
                </div>
              </div>

              <div style="display:flex;justify-content:flex-end;gap:12px;border-top:1px solid var(--border-color,rgba(255,255,255,0.1));padding-top:16px;">
                <button type="button" id="cancel-add-parent-btn" class="btn-secondary" style="padding:10px 20px;border-radius:30px;font-size:0.88rem;">إلغاء</button>
                <button type="submit" id="submit-add-parent-btn" class="btn-primary" style="padding:10px 24px;border-radius:30px;font-size:0.88rem;font-weight:800;display:flex;align-items:center;gap:6px;">
                  <i data-lucide="check" style="width:16px;height:16px;"></i> حفظ وإنشاء الحساب
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Edit Parent Modal -->
        <div id="edit-parent-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);z-index:9999;align-items:center;justify-content:center;padding:20px;">
          <div style="background:var(--bg-card,#1a1d2e);border-radius:20px;padding:32px;max-width:600px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5);border:1px solid var(--border-color,rgba(255,255,255,0.1));position:relative;max-height:90vh;overflow-y:auto;">
            <button type="button" id="close-edit-parent-x-btn" style="position:absolute;top:20px;left:20px;background:none;border:none;color:var(--text-muted,#888);font-size:1.5rem;cursor:pointer;line-height:1;">&times;</button>

            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
              <div style="width:44px;height:44px;border-radius:12px;background:rgba(139,92,246,0.15);color:var(--primary,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:1.3rem;">
                <i data-lucide="edit-3" style="width:22px;height:22px;"></i>
              </div>
              <div>
                <h3 style="margin:0;font-size:1.15rem;font-weight:800;color:var(--text-primary,#fff);">✏️ تعديل بيانات ولي الأمر</h3>
                <p id="edit-parent-subtitle" style="margin:2px 0 0;font-size:0.82rem;color:var(--text-muted,#888);">تحديث معلومات الحساب الشخصية</p>
              </div>
            </div>

            <form id="edit-parent-form">
              <input type="hidden" id="edit-parent-id" />
              <!-- Row 1: Name & Email -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:12px;">
                <div class="form-group" style="margin:0;">
                  <label style="font-weight:700;font-size:0.85rem;margin-bottom:4px;display:block;color:var(--text-primary,#fff);">الاسم الكامل <span style="color:var(--error,#ef4444);">*</span></label>
                  <input type="text" id="edit-parent-name" class="form-input" required style="padding:10px 14px;font-size:0.88rem;border-radius:12px;width:100%;box-sizing:border-box;">
                </div>
                <div class="form-group" style="margin:0;">
                  <label style="font-weight:700;font-size:0.85rem;margin-bottom:4px;display:block;color:var(--text-primary,#fff);">البريد الإلكتروني <span style="color:var(--error,#ef4444);">*</span></label>
                  <input type="email" id="edit-parent-email" class="form-input" required style="padding:10px 14px;font-size:0.88rem;border-radius:12px;width:100%;box-sizing:border-box;">
                </div>
              </div>

              <!-- Row 2: Password & Phone -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:12px;">
                <div class="form-group" style="margin:0;">
                  <label style="font-weight:700;font-size:0.85rem;margin-bottom:4px;display:block;color:var(--text-primary,#fff);">تغيير كلمة المرور (اختياري)</label>
                  <input type="password" id="edit-parent-password" class="form-input" placeholder="اتركه فارغاً للإبقاء على الحالية" style="padding:10px 14px;font-size:0.88rem;border-radius:12px;width:100%;box-sizing:border-box;">
                </div>
                <div class="form-group" style="margin:0;">
                  <label style="font-weight:700;font-size:0.85rem;margin-bottom:4px;display:block;color:var(--text-primary,#fff);">رقم الهاتف والواتساب</label>
                  <input type="text" id="edit-parent-phone" class="form-input" placeholder="+20..." style="padding:10px 14px;font-size:0.88rem;border-radius:12px;width:100%;box-sizing:border-box;">
                </div>
              </div>

              <!-- Row 3: Location & Status -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">
                <div class="form-group" style="margin:0;">
                  <label style="font-weight:700;font-size:0.85rem;margin-bottom:4px;display:block;color:var(--text-primary,#fff);">الولاية / المدينة</label>
                  <input type="text" id="edit-parent-location" class="form-input" placeholder="مثال: القاهرة / وهران" style="padding:10px 14px;font-size:0.88rem;border-radius:12px;width:100%;box-sizing:border-box;">
                </div>
                <div class="form-group" style="margin:0;">
                  <label style="font-weight:700;font-size:0.85rem;margin-bottom:4px;display:block;color:var(--text-primary,#fff);">حالة الحساب</label>
                  <select id="edit-parent-status" class="form-input" style="padding:10px 14px;font-size:0.88rem;border-radius:12px;width:100%;box-sizing:border-box;">
                    <option value="ACTIVE">نشط ومفعّل ✅</option>
                    <option value="PENDING">قيد المراجعة ⏳</option>
                    <option value="SUSPENDED">معلق ⏸️</option>
                  </select>
                </div>
              </div>

              <div style="display:flex;justify-content:flex-end;gap:12px;border-top:1px solid var(--border-color,rgba(255,255,255,0.1));padding-top:16px;">
                <button type="button" id="cancel-edit-parent-btn" class="btn-secondary" style="padding:10px 20px;border-radius:30px;font-size:0.88rem;">إلغاء</button>
                <button type="submit" id="submit-edit-parent-btn" class="btn-primary" style="padding:10px 24px;border-radius:30px;font-size:0.88rem;font-weight:800;display:flex;align-items:center;gap:6px;">
                  <i data-lucide="check" style="width:16px;height:16px;"></i> حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Link Child Modal -->
        <div id="link-child-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;align-items:center;justify-content:center;padding:20px;">
          <div style="background:var(--bg-card,#1a1d2e);border-radius:20px;padding:32px;max-width:520px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <h3 id="link-child-modal-title" style="margin:0 0 20px;color:var(--text-primary,#fff);font-size:1.1rem;">🔗 ربط طالب بولي الأمر</h3>
            <div><label style="display:block;margin-bottom:8px;font-size:0.85rem;color:var(--text-muted,#888);">ابحث عن الطالب بالاسم أو البريد:</label>
              <div style="display:flex;gap:8px;">
                <input id="student-search-input" class="form-input" placeholder="ابحث عن الطالب..." style="flex:1;padding:10px 14px;border-radius:10px;" />
                <button id="student-search-btn" class="btn-primary" style="padding:10px 16px;border-radius:10px;">بحث</button>
              </div>
              <div id="student-search-results" style="margin-top:12px;max-height:240px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;"></div>
              <div style="margin-top:14px;"><label style="display:block;margin-bottom:6px;font-size:0.85rem;color:var(--text-muted,#888);">صفة العلاقة:</label>
                <select id="parent-relationship-select" class="form-select" style="padding:10px 14px;border-radius:10px;width:100%;">
                  <option value="أب">أب</option><option value="أم">أم</option><option value="ولي أمر">ولي أمر</option><option value="جد">جد</option><option value="أخ">أخ</option>
                </select>
              </div>
            </div>
            <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
              <button id="cancel-link-child-btn" class="btn-secondary" style="padding:10px 20px;border-radius:10px;">إغلاق</button>
            </div>
          </div>
        </div>

        <!-- View Children Modal -->
        <div id="view-children-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;align-items:center;justify-content:center;padding:20px;">
          <div style="background:var(--bg-card,#1a1d2e);border-radius:20px;padding:32px;max-width:520px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <h3 id="view-children-title" style="margin:0 0 20px;color:var(--text-primary,#fff);font-size:1.1rem;">👧 أبناء ولي الأمر</h3>
            <div id="view-children-list" style="display:flex;flex-direction:column;gap:10px;max-height:320px;overflow-y:auto;"></div>
            <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
              <button id="close-view-children-btn" class="btn-secondary" style="padding:10px 20px;border-radius:10px;">إغلاق</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindParentsEvents() {
    const closeModal = (id) => { const m = document.getElementById(id); if (m) m.style.display = "none"; };
    const openModal = (id) => { const m = document.getElementById(id); if (m) m.style.display = "flex"; };
    let _linkParentId = null;
    let _linkStudentId = null;

    // Add parent modal handlers
    document.getElementById("admin-add-parent-btn")?.addEventListener("click", () => openModal("add-parent-modal"));
    document.getElementById("cancel-add-parent-btn")?.addEventListener("click", () => closeModal("add-parent-modal"));
    document.getElementById("close-add-parent-x-btn")?.addEventListener("click", () => closeModal("add-parent-modal"));

    document.getElementById("add-parent-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById("submit-add-parent-btn");
      const name = document.getElementById("new-parent-name")?.value.trim();
      const email = document.getElementById("new-parent-email")?.value.trim();
      const password = document.getElementById("new-parent-password")?.value.trim() || "parent123";
      const phoneCode = document.getElementById("new-parent-phone-code")?.value || "";
      const phoneNum = document.getElementById("new-parent-phone-num")?.value.trim() || "";
      const phone = phoneNum ? `${phoneCode}${phoneNum}` : "";
      const location = document.getElementById("new-parent-location")?.value.trim() || "";
      const relationship = document.getElementById("new-parent-relationship")?.value || "ولي أمر";
      const studentId = document.getElementById("new-parent-student-id")?.value || null;
      const status = document.getElementById("new-parent-status")?.value || "ACTIVE";

      if (!name || !email) { showToast("يرجى إدخال اسم ولي الأمر وبريده الإلكتروني.", "warning"); return; }

      if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i data-lucide="loader-2" class="spinner"></i> جارٍ الحفظ...'; }
      try {
        await apiFetch("/admin/parents", {
          method: "POST",
          body: JSON.stringify({ name, email, password, phone, location, relationship, studentId, status })
        });
        showToast("تم إنشاء حساب ولي الأمر بنجاح ✅", "success");
        closeModal("add-parent-modal");
        this.allParents = await apiFetch("/admin/parents").catch(() => []);
        this.updateBadges();
        const content = document.getElementById("admin-tab-content");
        if (content) { content.innerHTML = this.renderParentsTab(); this.bindParentsEvents(); if (window.lucide) window.lucide.createIcons(); }
      } catch (err) {
        showToast(err.message || "فشل إنشاء الحساب.", "error");
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i data-lucide="check" style="width:16px;height:16px;"></i> حفظ وإنشاء الحساب'; }
      }
    });

    // Edit parent modal handlers
    document.querySelectorAll(".parent-edit-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.parentId;
        const name = btn.dataset.parentName || "";
        const email = btn.dataset.parentEmail || "";
        const phone = btn.dataset.parentPhone || "";
        const location = btn.dataset.parentLocation || "";
        const status = btn.dataset.parentStatus || "ACTIVE";

        const idInput = document.getElementById("edit-parent-id");
        const nameInput = document.getElementById("edit-parent-name");
        const emailInput = document.getElementById("edit-parent-email");
        const phoneInput = document.getElementById("edit-parent-phone");
        const locationInput = document.getElementById("edit-parent-location");
        const statusSelect = document.getElementById("edit-parent-status");
        const passwordInput = document.getElementById("edit-parent-password");

        if (idInput) idInput.value = id;
        if (nameInput) nameInput.value = name;
        if (emailInput) emailInput.value = email;
        if (phoneInput) phoneInput.value = phone;
        if (locationInput) locationInput.value = location;
        if (statusSelect) statusSelect.value = status;
        if (passwordInput) passwordInput.value = "";

        openModal("edit-parent-modal");
      });
    });
    document.getElementById("cancel-edit-parent-btn")?.addEventListener("click", () => closeModal("edit-parent-modal"));
    document.getElementById("close-edit-parent-x-btn")?.addEventListener("click", () => closeModal("edit-parent-modal"));

    document.getElementById("edit-parent-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("edit-parent-id")?.value;
      const name = document.getElementById("edit-parent-name")?.value.trim();
      const email = document.getElementById("edit-parent-email")?.value.trim();
      const password = document.getElementById("edit-parent-password")?.value.trim();
      const phone = document.getElementById("edit-parent-phone")?.value.trim();
      const location = document.getElementById("edit-parent-location")?.value.trim();
      const status = document.getElementById("edit-parent-status")?.value;
      const submitBtn = document.getElementById("submit-edit-parent-btn");

      if (!id || !name || !email) { showToast("يرجى إدخال البيانات المطلوبة.", "warning"); return; }

      if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i data-lucide="loader-2" class="spinner"></i> جارٍ الحفظ...'; }
      try {
        const body = { name, email, phone, location, status };
        if (password && password.length >= 4) body.password = password;
        await apiFetch(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(body) });
        showToast("تم تحديث بيانات ولي الأمر بنجاح ✅", "success");
        closeModal("edit-parent-modal");
        this.allParents = await apiFetch("/admin/parents").catch(() => []);
        this.updateBadges();
        const content = document.getElementById("admin-tab-content");
        if (content) { content.innerHTML = this.renderParentsTab(); this.bindParentsEvents(); if (window.lucide) window.lucide.createIcons(); }
      } catch (err) {
        showToast(err.message || "فشل تحديث البيانات.", "error");
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i data-lucide="check" style="width:16px;height:16px;"></i> حفظ التعديلات'; }
      }
    });

    // Contact Parent (WhatsApp / Email Modal)
    document.querySelectorAll(".parent-contact-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.parentId;
        const name = btn.dataset.parentName || "";
        const email = btn.dataset.parentEmail || "";
        const phone = btn.dataset.parentPhone || "";
        if (typeof this.renderCommunicateModal === "function") {
          this.renderCommunicateModal({
            id,
            name,
            email,
            phone,
            role: "parent"
          });
        }
      });
    });

    // Block/unblock
    document.querySelectorAll(".parent-block-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const pid = btn.dataset.parentId;
        const isBlocked = btn.dataset.blocked === "true";
        const reason = isBlocked ? "" : (prompt("سبب الحظر (اختياري):") || "");
        try {
          await apiFetch(`/admin/parents/${pid}/block`, { method: "PATCH", body: JSON.stringify({ isBlocked: !isBlocked, reason }) });
          showToast(isBlocked ? "تم رفع الحظر ✅" : "تم حظر ولي الأمر 🚫", "success");
          this.allParents = await apiFetch("/admin/parents").catch(() => []);
          this.updateBadges();
          const content = document.getElementById("admin-tab-content");
          if (content) { content.innerHTML = this.renderParentsTab(); this.bindParentsEvents(); if (window.lucide) window.lucide.createIcons(); }
        } catch (e) { showToast("فشل تحديث الحالة.", "error"); }
      });
    });

    // Approve pending
    document.querySelectorAll(".parent-approve-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const pid = btn.dataset.parentId;
        try {
          await apiFetch(`/admin/parents/${pid}/approve`, { method: "PATCH" });
          showToast("تم تفعيل الحساب ✅", "success");
          this.allParents = await apiFetch("/admin/parents").catch(() => []);
          this.updateBadges();
          const content = document.getElementById("admin-tab-content");
          if (content) { content.innerHTML = this.renderParentsTab(); this.bindParentsEvents(); if (window.lucide) window.lucide.createIcons(); }
        } catch (e) { showToast("فشل التفعيل.", "error"); }
      });
    });

    // Link child modal
    document.querySelectorAll(".parent-link-child-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        _linkParentId = btn.dataset.parentId;
        _linkStudentId = null;
        document.getElementById("link-child-modal-title").textContent = `🔗 ربط طالب بـ ${btn.dataset.parentName}`;
        document.getElementById("student-search-results").innerHTML = "";
        document.getElementById("student-search-input").value = "";
        openModal("link-child-modal");
      });
    });
    document.getElementById("cancel-link-child-btn")?.addEventListener("click", () => closeModal("link-child-modal"));

    // Student search
    const doSearch = async () => {
      const q = document.getElementById("student-search-input")?.value.trim();
      const results = document.getElementById("student-search-results");
      if (!results) return;
      results.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted,#888);">جارٍ البحث...</div>`;
      try {
        const students = await apiFetch(`/admin/students/search?q=${encodeURIComponent(q || "")}`);
        if (!students.length) { results.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted,#888);">لا توجد نتائج.</div>`; return; }
        results.innerHTML = students.map(s => `
          <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:rgba(255,255,255,0.04);border-radius:10px;border:1px solid rgba(255,255,255,0.06);">
            <img src="${(s.avatar && !s.avatar.includes('dicebear.com')) ? s.avatar : 'assets/logo.png'}" style="width:36px;height:36px;border-radius:50%;flex-shrink:0;object-fit:cover;" onerror="this.src='assets/logo.png'" />
            <div style="flex:1;min-width:0;"><div style="font-weight:600;color:var(--text-primary,#fff);">${s.name}</div><div style="font-size:0.8rem;color:var(--text-muted,#888);">${s.email}${s.education ? ' · ' + s.education : ''}</div></div>
            <button class="link-this-student-btn btn-primary" data-student-id="${s.id}" data-student-name="${s.name}" style="padding:7px 14px;border-radius:8px;font-size:0.8rem;flex-shrink:0;">ربط</button>
          </div>
        `).join('');
        results.querySelectorAll(".link-this-student-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            const studentId = btn.dataset.studentId;
            const relationship = document.getElementById("parent-relationship-select")?.value || "ولي أمر";
            try {
              await apiFetch(`/admin/parents/${_linkParentId}/children`, { method: "POST", body: JSON.stringify({ studentId, relationship }) });
              showToast(`تم ربط ${btn.dataset.studentName} بنجاح ✅`, "success");
              this.allParents = await apiFetch("/admin/parents").catch(() => []);
              this.updateBadges();
              closeModal("link-child-modal");
              const content = document.getElementById("admin-tab-content");
              if (content) { content.innerHTML = this.renderParentsTab(); this.bindParentsEvents(); if (window.lucide) window.lucide.createIcons(); }
            } catch (e) { showToast(e.message || "فشل الربط.", "error"); }
          });
        });
      } catch (e) { results.innerHTML = `<div style="color:var(--error,#ef4444);padding:12px;">فشل البحث.</div>`; }
    };
    document.getElementById("student-search-btn")?.addEventListener("click", doSearch);
    document.getElementById("student-search-input")?.addEventListener("keydown", e => { if (e.key === "Enter") doSearch(); });

    // View children modal
    document.querySelectorAll(".parent-view-children-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const pid = btn.dataset.parentId;
        document.getElementById("view-children-title").textContent = `👧 أبناء ${btn.dataset.parentName}`;
        document.getElementById("view-children-list").innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted,#888);"><div class="spinner" style="width:32px;height:32px;margin:0 auto 8px;"></div>جارٍ التحميل...</div>`;
        openModal("view-children-modal");
        try {
          const children = await apiFetch(`/admin/parents/${pid}/children`);
          const list = document.getElementById("view-children-list");
          if (!list) return;
          if (!children.length) { list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted,#888);">لم يتم ربط أي طالب بعد.</div>`; return; }
          list.innerHTML = children.map(c => `
            <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:rgba(255,255,255,0.04);border-radius:10px;border:1px solid rgba(255,255,255,0.06);">
              <img src="${(c.student.avatar && !c.student.avatar.includes('dicebear.com')) ? c.student.avatar : 'assets/logo.png'}" style="width:36px;height:36px;border-radius:50%;flex-shrink:0;object-fit:cover;" onerror="this.src='assets/logo.png'" />
              <div style="flex:1;min-width:0;"><div style="font-weight:600;color:var(--text-primary,#fff);">${c.student.name}</div><div style="font-size:0.8rem;color:var(--text-muted,#888);">${c.student.email} · ${c.relationship}</div></div>
              <button class="unlink-child-btn" data-link-id="${c.linkId}" data-name="${c.student.name}" style="padding:7px 14px;border-radius:8px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);color:#ef4444;font-size:0.8rem;cursor:pointer;flex-shrink:0;">إلغاء الربط</button>
            </div>
          `).join('');
          list.querySelectorAll(".unlink-child-btn").forEach(unlinkBtn => {
            unlinkBtn.addEventListener("click", async () => {
              if (!confirm(`هل أنت متأكد من إلغاء ربط ${unlinkBtn.dataset.name}؟`)) return;
              try {
                await apiFetch(`/admin/parent-links/${unlinkBtn.dataset.linkId}`, { method: "DELETE" });
                showToast("تم إلغاء الربط ✅", "success");
                unlinkBtn.closest("div[style*='display:flex']").remove();
                this.allParents = await apiFetch("/admin/parents").catch(() => []);
                this.updateBadges();
              } catch (e) { showToast("فشل إلغاء الربط.", "error"); }
            });
          });
        } catch (e) { document.getElementById("view-children-list").innerHTML = `<div style="color:var(--error,#ef4444);">فشل تحميل البيانات.</div>`; }
      });
    });
    document.getElementById("close-view-children-btn")?.addEventListener("click", () => closeModal("view-children-modal"));
  }


  onDestroy() {
    if (this.adminChartInstance) {
      this.adminChartInstance.destroy();
      this.adminChartInstance = null;
    }
  }

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
Object.assign(AdminView.prototype, AdminBlogsPage);
Object.assign(AdminView.prototype, AdminSettingsPage);
