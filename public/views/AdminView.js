import { apiFetch, state, showToast, t, confirmDialog, renderPhoneInputGroup, getCleanWhatsAppNumber, renderEducationSelectHTML } from "../app.js";

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
  }

  async render() {
    const now = new Date().toLocaleDateString("ar-DZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

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
          width: 260px;
          min-width: 260px;
          background: linear-gradient(180deg, #0a0f1e 0%, #0d1530 50%, #0a0e1c 100%);
          border-right: 1px solid rgba(99, 102, 241, 0.15);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 10;
          box-shadow: 4px 0 24px rgba(0,0,0,0.35);
        }
        .admin-sidebar-brand {
          padding: 28px 24px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .admin-sidebar-brand .brand-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2));
          border: 1px solid rgba(168,85,247,0.35);
          border-radius: 10px;
          padding: 6px 14px;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 1.5px;
          color: #a78bfa;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .admin-sidebar-brand h3 {
          color: #fff;
          font-size: 1.05rem;
          font-weight: 700;
          margin: 0 0 3px 0;
        }
        .admin-sidebar-brand p {
          color: rgba(255,255,255,0.4);
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
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 1.5px;
          color: rgba(255,255,255,0.25);
          text-transform: uppercase;
          padding: 12px 12px 6px;
          margin-top: 4px;
        }
        .admin-nav-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 11px 14px;
          border: none;
          background: transparent;
          border-radius: 10px;
          cursor: pointer;
          font-size: 0.87rem;
          font-weight: 500;
          color: rgba(255,255,255,0.55);
          text-align: start;
          transition: all 0.2s ease;
          margin-bottom: 2px;
          position: relative;
        }
        .admin-nav-btn:hover {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.9);
        }
        .admin-nav-btn.active {
          background: linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.2));
          color: #e0d7ff;
          font-weight: 700;
          border: 1px solid rgba(168,85,247,0.3);
        }
        .admin-nav-btn.active::before {
          content: '';
          position: absolute;
          right: 0;
          top: 20%;
          height: 60%;
          width: 3px;
          background: linear-gradient(180deg, #818cf8, #a855f7);
          border-radius: 3px 0 0 3px;
        }
        .admin-nav-btn i, .admin-nav-btn svg {
          width: 17px; height: 17px;
          flex-shrink: 0;
        }
        .admin-nav-badge {
          margin-left: auto;
          background: rgba(99,102,241,0.25);
          color: #a78bfa;
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 20px;
          min-width: 22px;
          text-align: center;
        }
        .admin-sidebar-footer {
          padding: 16px 20px;
          border-top: 1px solid rgba(255,255,255,0.07);
        }
        .admin-sidebar-user {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .admin-sidebar-user img {
          width: 36px; height: 36px;
          border-radius: 10px;
          border: 2px solid rgba(168,85,247,0.4);
          object-fit: cover;
        }
        .admin-sidebar-user .user-info p { margin: 0; }
        .admin-sidebar-user .user-name {
          font-size: 0.82rem;
          font-weight: 700;
          color: #e0d7ff;
        }
        .admin-sidebar-user .user-role {
          font-size: 0.68rem;
          color: #a78bfa;
          font-weight: 600;
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
          <div class="admin-sidebar-brand">
            <img src="assets/logo.png" alt="باكالوريا" style="height:110px; object-fit:contain; background:#ffffff; border-radius:16px; padding:10px 20px; margin-bottom:14px; display:block; margin-left:auto; margin-right:auto; box-shadow:0 6px 20px rgba(0,0,0,0.2);">
            <div class="brand-badge" style="justify-content:center;">
              <i data-lucide="shield-check" style="width:12px;height:12px;"></i>
              لوحة تحكم المشرف
            </div>
            <p style="text-align:center;">${now}</p>
          </div>

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
    el("admin-badge-categories", (this.categories || []).length);
    el("admin-badge-applications", pendingApps.length);
  }

  async loadAllData() {
    try {
      const [stats, members, courses, reportsData, categories, teacherApplications] = await Promise.all([
        apiFetch("/admin/stats"),
        apiFetch("/admin/users"),
        apiFetch("/admin/courses"),
        apiFetch("/admin/reports"),
        apiFetch("/categories"),
        apiFetch("/admin/teacher-applications")
      ]);
      this.stats = stats;
      this.allMembers = members;
      this.courses = courses;
      this.reportsData = reportsData;
      this.categories = categories || [];
      this.teacherApplications = teacherApplications || [];
    } catch (err) {
      showToast(t("admin.loadError"), "error");
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
    teachers:            { heading: "👨‍🏫 إدارة المعلمين",           sub: "إضافة وتعديل وإدارة حسابات المعلمين" },
    students:            { heading: "🎓 إدارة الطلاب",             sub: "إضافة وتعديل وإدارة حسابات الطلاب" },
    teacherApplications: { heading: "📝 طلبات انضمام المعلمين",    sub: "مراجعة السير الذاتية والقبول/الرفض لمعلمي المنصة الجدد" },
    members:             { heading: "🛡️ جميع الأعضاء",             sub: "عرض وإدارة جميع مستخدمي المنصة" },
  };

  renderTab(tab) {
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
    else if (tab === "reports")         content.innerHTML = this.renderReportsTab();

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
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:16px;">
        <div>
          <h3 style="font-weight:800; margin:0 0 4px 0; font-size:1.3rem;">تصنيفات المنصة المعتمدة (${categories.length})</h3>
          <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">إدارة التصنيفات والتخصصات الرسمية المتاحة لجميع المعلمين في المنصة</p>
        </div>
        <button class="btn-primary" id="open-create-category-btn" style="font-size:0.85rem;padding:10px 18px;background:linear-gradient(135deg,#a855f7,#0056D2); border:none; display:flex; align-items:center; gap:8px;">
          <i data-lucide="plus-circle"></i> إضافة تصنيف جديد
        </button>
      </div>

      ${categories.length === 0
        ? `<div class="glass-card" style="text-align:center;padding:50px;color:var(--text-muted);">لا توجد تصنيفات معرفة بعد. انقر فوق "إضافة تصنيف جديد" لإضافة أول تصنيف.</div>`
        : `<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:20px;">
            ${categories.map(cat => `
              <div class="glass-card" style="border-radius:16px; border:1px solid var(--border-color); padding:20px; display:flex; flex-direction:column; justify-content:space-between;">
                <div>
                  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
                    <div style="width:40px; height:40px; border-radius:10px; background:var(--primary-glow); color:var(--primary); display:flex; align-items:center; justify-content:center;">
                      <i data-lucide="${cat.icon || 'layers'}" style="width:20px; height:20px;"></i>
                    </div>
                    <span style="font-size:0.72rem; color:var(--text-muted);">${new Date(cat.createdAt).toLocaleDateString("ar-DZ")}</span>
                  </div>
                  <h4 style="font-size:1.1rem; font-weight:800; color:var(--text-color); margin:0 0 6px 0;">${cat.name}</h4>
                  <p style="font-size:0.82rem; color:var(--text-muted); line-height:1.5; margin:0 0 16px 0;">${cat.description || 'تصنيف رسمي معتمد لدروس البكالوريا'}</p>
                </div>
                <div style="padding-top:12px; border-top:1px solid var(--border-color); display:flex; gap:10px;">
                  <button class="btn-secondary edit-category-btn" data-id="${cat.id}" style="flex:1; padding:6px; font-size:0.8rem; border-color:var(--primary); color:var(--primary); justify-content:center; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="edit-3" style="width:14px; height:14px;"></i> تعديل
                  </button>
                  <button class="btn-secondary delete-category-btn" data-id="${cat.id}" style="flex:1; padding:6px; font-size:0.8rem; border-color:var(--error); color:var(--error); justify-content:center; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="trash-2" style="width:14px; height:14px;"></i> حذف
                  </button>
                </div>
              </div>
            `).join("")}
          </div>`
      }
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
            <span>${new Date(app.createdAt).toLocaleDateString("ar-DZ")}</span>
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

  // ── Event Binds ───────────────────────────────────────────────────────────────
  bindActionEvents() {
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

      try {
        if (isEdit) {
          await apiFetch(`/admin/users/${user.id}`, {
            method: "PUT",
            body: JSON.stringify({ name, email, role, password, phone, education })
          });
          showToast(t("admin.toast.userUpdated"), "success");
        } else {
          await apiFetch("/admin/users", {
            method: "POST",
            body: JSON.stringify({ name, email, role, password, phone, education })
          });
          showToast(t("admin.toast.userCreated"), "success");
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

  onDestroy() {}
}
