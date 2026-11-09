import { apiFetch, showToast, confirmDialog } from "../../app.js";

export class AdminClassesPage {
  constructor(container, adminView) {
    this.container = container;
    this.adminView = adminView;
    this.classes = [];
    this.grades = [];
    this.allGroups = [];
    this.allUsers = [];
    this.activeStage = "ALL";
    this.searchQuery = "";
  }

  async render() {
    this.container.innerHTML = `
      <div style="padding:60px 0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px;">
        <i data-lucide="loader-2" style="width:32px;height:32px;animation:acpSpin 1s linear infinite;color:#0284c7;"></i>
        <span style="font-size:0.92rem; color:var(--text-muted); font-weight:800;">جارٍ تحميل الفصول والباقات والمجموعات...</span>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();

    await this.loadData();
    this.renderPage();
    this.bindEvents();
  }

  async loadData() {
    try {
      const [classesRes, gradesRes, groupsRes, usersRes] = await Promise.all([
        apiFetch("/admin/curriculum/classes").catch(() => []),
        apiFetch("/curriculum/grades").catch(() => []),
        apiFetch("/admin/all-groups").catch(() => []),
        apiFetch("/admin/users").catch(() => [])
      ]);
      this.classes = classesRes || [];
      this.grades = gradesRes || [];
      this.allGroups = groupsRes || [];
      this.allUsers = (usersRes || []).filter(u => u.role === "student");
    } catch (e) {
      console.error("Error loading classes data:", e);
      showToast("فشل تحميل بيانات الفصول والباقات", "error");
    }
  }

  filteredClasses() {
    let list = this.classes || [];
    if (this.activeStage !== "ALL") {
      list = list.filter(c => c.grade?.stage === this.activeStage);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(c => 
        c.name?.toLowerCase().includes(q) || 
        c.badge?.toLowerCase().includes(q) || 
        c.grade?.name?.toLowerCase().includes(q) ||
        (c.linkedGroups || []).some(g => g.name?.toLowerCase().includes(q) || g.course?.subject?.name?.toLowerCase().includes(q) || g.teacher?.name?.toLowerCase().includes(q))
      );
    }
    return list;
  }

  renderPage() {
    const list = this.filteredClasses();
    const activeCount = (this.classes || []).filter(c => c.isActive).length;
    const totalLinkedGroups = (this.classes || []).reduce((sum, c) => sum + (c.linkedGroups?.length || 0), 0);

    this.container.innerHTML = `
      <style>
        @keyframes acpSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes acpFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes acpSlideUp { from { transform: translateY(22px) scale(0.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }

        .acp-root {
          padding: 24px 28px;
          max-width: 1260px;
          margin: 0 auto;
          font-family: 'Cairo', 'Outfit', sans-serif;
          direction: rtl;
          color: var(--text-main, #0f172a);
        }

        /* ── STATS ROW ── */
        .acp-stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .acp-stat-card {
          background: var(--bg-card, #ffffff);
          border: 1.5px solid var(--border-color, #e2e8f0);
          border-radius: 20px;
          padding: 18px 22px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.02);
        }
        .acp-stat-icon {
          width: 50px;
          height: 50px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        .acp-stat-val {
          font-size: 1.7rem;
          font-weight: 900;
          color: var(--text-main, #0f172a);
          line-height: 1.15;
        }
        .acp-stat-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-muted, #64748b);
          margin-top: 2px;
        }

        /* ── BANNER ── */
        .acp-banner-info {
          background: linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%);
          border: 1.5px solid rgba(2, 132, 199, 0.25);
          border-radius: 22px;
          padding: 20px 24px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 18px;
        }
        .acp-banner-text h4 {
          margin: 0 0 6px 0;
          font-size: 1.05rem;
          font-weight: 900;
          color: #0284c7;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .acp-banner-text p {
          margin: 0;
          font-size: 0.86rem;
          color: var(--text-main, #1e293b);
          line-height: 1.55;
          max-width: 820px;
        }

        /* ── TOOLBAR ── */
        .acp-toolbar {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .acp-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .acp-tab {
          padding: 9px 20px;
          border-radius: 50px;
          border: 1.5px solid var(--border-color, #cbd5e1);
          background: var(--bg-card, #ffffff);
          color: var(--text-muted, #64748b);
          font-weight: 800;
          font-size: 0.84rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .acp-tab.active {
          background: #0284c7;
          border-color: #0284c7;
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
        }
        .acp-search {
          flex: 1;
          min-width: 220px;
          padding: 11px 16px;
          border-radius: 14px;
          border: 1.5px solid var(--border-color, #cbd5e1);
          background: var(--bg-card, #ffffff);
          color: var(--text-main, #0f172a);
          font-size: 0.9rem;
          font-weight: 600;
          outline: none;
          transition: all 0.2s;
        }
        .acp-search:focus {
          border-color: #0284c7;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
        }
        .acp-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 22px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          font-size: 0.88rem;
          font-weight: 800;
          transition: all 0.2s;
          font-family: inherit;
        }
        .acp-btn-primary {
          background: linear-gradient(135deg, #0284c7 0%, #1e40af 100%);
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
        }
        .acp-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(2, 132, 199, 0.45);
        }
        .acp-btn-outline {
          background: var(--bg-card, #ffffff);
          color: var(--text-main, #0f172a);
          border: 1.5px solid var(--border-color, #cbd5e1);
        }
        .acp-btn-outline:hover {
          border-color: #0284c7;
          color: #0284c7;
        }

        /* ── CARDS GRID ── */
        .acp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 20px;
        }
        .acp-card {
          background: var(--bg-card, #ffffff);
          border: 1.5px solid var(--border-color, #e2e8f0);
          border-radius: 22px;
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.03);
          transition: all 0.25s ease;
          position: relative;
        }
        .acp-card:hover {
          border-color: #0284c7;
          box-shadow: 0 12px 30px rgba(2, 132, 199, 0.1);
          transform: translateY(-3px);
        }
        .acp-card.hidden-card {
          opacity: 0.68;
          border-style: dashed;
        }
        .acp-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }
        .acp-grade-badge {
          background: rgba(2, 132, 199, 0.1);
          color: #0284c7;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.76rem;
          font-weight: 800;
          border: 1px solid rgba(2, 132, 199, 0.2);
        }
        .acp-card-title {
          font-size: 1.15rem;
          font-weight: 900;
          color: var(--text-main, #0f172a);
          line-height: 1.35;
          margin: 6px 0 4px 0;
        }
        .acp-price-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 11px 16px;
          border-radius: 14px;
          background: var(--bg-app, #f8fafc);
          border: 1px solid var(--border-color, #e2e8f0);
        }
        .acp-price-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-muted, #64748b);
        }
        .acp-price-val {
          font-size: 1.25rem;
          font-weight: 900;
          color: #0284c7;
        }
        .acp-groups-box {
          border: 1.5px solid var(--border-color, #e2e8f0);
          border-radius: 16px;
          padding: 12px 14px;
          background: var(--bg-app, #f8fafc);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .acp-group-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 7px 10px;
          border-radius: 10px;
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          font-size: 0.78rem;
        }
        .acp-card-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: auto;
          padding-top: 14px;
          border-top: 1px solid var(--border-color, #e2e8f0);
        }
        .acp-action-btn {
          padding: 7px 14px;
          border-radius: 11px;
          border: 1px solid var(--border-color, #cbd5e1);
          background: var(--bg-card, #ffffff);
          color: var(--text-muted, #64748b);
          font-size: 0.8rem;
          font-weight: 800;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: all 0.15s;
          font-family: inherit;
        }
        .acp-action-btn:hover {
          border-color: #0284c7;
          color: #0284c7;
        }
        .acp-action-btn.enroll {
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.35);
        }
        .acp-action-btn.enroll:hover {
          background: #10b981;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        .acp-action-btn.danger:hover {
          border-color: #ef4444;
          color: #ef4444;
          background: #fee2e2;
        }
        .acp-empty {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-muted);
          background: var(--bg-card);
          border: 2px dashed var(--border-color);
          border-radius: 24px;
          grid-column: 1 / -1;
        }

        /* ── MODAL STYLES (EXPLICIT & SELF-CONTAINED) ── */
        .acp-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.72);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          direction: rtl;
          animation: acpFadeIn 0.2s ease;
          box-sizing: border-box;
        }
        .acp-modal-dialog {
          background: var(--bg-card, #ffffff);
          border: 1.5px solid var(--border-color, #e2e8f0);
          border-radius: 26px;
          width: 100%;
          max-width: 640px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.35);
          padding: 28px 26px;
          animation: acpSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          box-sizing: border-box;
          color: var(--text-main, #0f172a);
          font-family: 'Cairo', sans-serif;
        }
        .acp-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 22px;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--border-color, #e2e8f0);
        }
        .acp-modal-title {
          font-size: 1.25rem;
          font-weight: 900;
          color: var(--text-main, #0f172a);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .acp-modal-close-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid var(--border-color, #e2e8f0);
          background: var(--bg-app, #f8fafc);
          color: var(--text-muted, #64748b);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.15rem;
          transition: all 0.15s;
        }
        .acp-modal-close-btn:hover {
          background: #fee2e2;
          color: #ef4444;
          border-color: #fca5a5;
        }
        .acp-form-group {
          margin-bottom: 16px;
        }
        .acp-form-group label {
          display: block;
          font-size: 0.84rem;
          font-weight: 800;
          color: var(--text-main, #1e293b);
          margin-bottom: 7px;
        }
        .acp-form-input, .acp-form-select, .acp-form-textarea {
          width: 100%;
          padding: 11px 15px;
          border-radius: 13px;
          border: 1.5px solid var(--border-color, #cbd5e1);
          background: var(--bg-app, #f8fafc);
          color: var(--text-main, #0f172a);
          font-size: 0.9rem;
          font-weight: 700;
          font-family: inherit;
          outline: none;
          box-sizing: border-box;
          transition: all 0.2s;
        }
        .acp-form-input:focus, .acp-form-select:focus, .acp-form-textarea:focus {
          border-color: #0284c7;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
        }
        .acp-modal-footer {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          align-items: center;
          margin-top: 24px;
          padding-top: 18px;
          border-top: 1px solid var(--border-color, #e2e8f0);
        }
      </style>

      <div class="acp-root">
        <!-- صف الإحصائيات العلوية -->
        <div class="acp-stats-row">
          <div class="acp-stat-card">
            <div class="acp-stat-icon" style="background:rgba(2, 132, 199, 0.12); color:#0284c7;">🏫</div>
            <div>
              <div class="acp-stat-val">${this.classes.length}</div>
              <div class="acp-stat-label">إجمالي الفصول والباقات</div>
            </div>
          </div>
          <div class="acp-stat-card">
            <div class="acp-stat-icon" style="background:rgba(16, 185, 129, 0.12); color:#10b981;">✅</div>
            <div>
              <div class="acp-stat-val" style="color:#10b981;">${activeCount}</div>
              <div class="acp-stat-label">فصول نشطة ومعروضة للطلاب</div>
            </div>
          </div>
          <div class="acp-stat-card">
            <div class="acp-stat-icon" style="background:rgba(139, 92, 246, 0.12); color:#8b5cf6;">👥</div>
            <div>
              <div class="acp-stat-val" style="color:#8b5cf6;">${totalLinkedGroups}</div>
              <div class="acp-stat-label">مجموعات مواد مربوطة بالفصول</div>
            </div>
          </div>
          <div class="acp-stat-card">
            <div class="acp-stat-icon" style="background:rgba(245, 158, 11, 0.12); color:#f59e0b;">💰</div>
            <div>
              <div class="acp-stat-val" style="color:#f59e0b;">الأجر بالساعة</div>
              <div class="acp-stat-label">نظام محاسبة المعلمين المعتمد</div>
            </div>
          </div>
        </div>

        <!-- شريط التوضيح المالي للفصول -->
        <div class="acp-banner-info">
          <div class="acp-banner-text">
            <h4>
              <i data-lucide="sparkles" style="width:17px;height:17px;"></i>
              <span>نظام الفصول المجمعة ومحاسبة المعلمين بالساعة (teacherHourlyRate)</span>
            </h4>
            <p>
              يقوم الطالب بدفع اشتراك الفصل الموحد مباشرة للمنصة (مثلاً: 1,200 ج.م شهرياً)، ويتم تسكينه آلياً في كل مجموعات مواد الفصل. يحصل كل معلم على أجر ساعته المعتمد عن كل حصة مكتملة، ويبقى الفارق كربح صافٍ مضمون للمنصة.
            </p>
          </div>
          <button type="button" class="acp-btn acp-btn-primary" id="acp-add-class-btn">
            <i data-lucide="plus-circle" style="width:17px;height:17px;"></i>
            <span>إضافة فصل وباقة جديدة</span>
          </button>
        </div>

        <!-- شريط الفلترة والبحث -->
        <div class="acp-toolbar">
          <div class="acp-tabs">
            <button type="button" class="acp-tab ${this.activeStage === "ALL" ? "active" : ""}" data-stage="ALL">جميع المراحل (${this.classes.length})</button>
            <button type="button" class="acp-tab ${this.activeStage === "PRIMARY" ? "active" : ""}" data-stage="PRIMARY">🏫 الابتدائي</button>
            <button type="button" class="acp-tab ${this.activeStage === "PREPARATORY" ? "active" : ""}" data-stage="PREPARATORY">📚 الإعدادي</button>
            <button type="button" class="acp-tab ${this.activeStage === "SECONDARY" ? "active" : ""}" data-stage="SECONDARY">🎓 الثانوي</button>
          </div>
          <input type="search" class="acp-search" id="acp-search-input" placeholder="🔍 ابحث باسم الفصل، الصف، المادة أو المعلم..." value="${this.searchQuery}">
        </div>

        <!-- شبكة كروت الفصول -->
        <div class="acp-grid" id="acp-classes-grid">
          ${list.length > 0 ? list.map(c => this.renderClassCard(c)).join("") : `
            <div class="acp-empty">
              <div style="font-size:3rem; margin-bottom:12px;">🏫</div>
              <h3 style="margin:0 0 8px 0; color:var(--text-main); font-size:1.2rem; font-weight:900;">لا توجد فصول دراسية مضافة حتى الآن</h3>
              <p style="font-size:0.88rem; margin:0 0 18px 0;">اضغط على الزر أدناه لإنشاء باقة فصل جديدة وربط مجموعات المواد بها بسهولة.</p>
              <button type="button" class="acp-btn acp-btn-primary" id="acp-empty-add-btn">
                <i data-lucide="plus-circle" style="width:16px;height:16px;"></i>
                <span>إنشاء أول فصل دراسي الآن</span>
              </button>
            </div>
          `}
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  renderClassCard(pkg) {
    const isHidden = !pkg.isActive;
    const linkedGroups = pkg.linkedGroups || [];
    const themeColors = { blue: "#0284c7", green: "#10b981", purple: "#8b5cf6", amber: "#f59e0b" };
    const accentColor = themeColors[pkg.theme] || "#0284c7";

    const rawData = JSON.stringify({
      id: pkg.id,
      name: pkg.name,
      badge: pkg.badge || "",
      theme: pkg.theme || "blue",
      priceEg: pkg.priceEg || "",
      price: pkg.price || "",
      description: pkg.description || "",
      order: pkg.order || 0,
      isActive: !!pkg.isActive,
      gradeId: pkg.grade?.id,
      groupIds: linkedGroups.map(g => g.id)
    }).replace(/"/g, "&quot;");

    return `
      <div class="acp-card ${isHidden ? "hidden-card" : ""}">
        <div class="acp-card-top">
          <span class="acp-grade-badge">${pkg.grade?.name || "صف دراسي"}</span>
          <span style="font-size:0.75rem; font-weight:800; padding:3px 10px; border-radius:10px; ${isHidden ? 'background:rgba(239,68,68,0.12); color:#ef4444;' : 'background:rgba(16,185,129,0.12); color:#10b981;'}">
            ${isHidden ? "مخفي عن الموقع" : "ظاهر للطلاب"}
          </span>
        </div>

        <div>
          ${pkg.badge ? `<span style="font-size:0.75rem; font-weight:800; color:${accentColor}; background:${accentColor}15; padding:3px 10px; border-radius:8px; display:inline-block; margin-bottom:6px;">${pkg.badge}</span>` : ''}
          <h3 class="acp-card-title">${pkg.name}</h3>
          <p style="margin:0; font-size:0.82rem; color:var(--text-muted); line-height:1.45;">${pkg.description || "باقة دراسية متكاملة تجمع كل المواد المقررة بجدول أسبوعي موحد."}</p>
        </div>

        <div class="acp-price-row">
          <span class="acp-price-label">اشتراك الطالب الشهري:</span>
          <strong class="acp-price-val">${pkg.priceEg || (pkg.price ? pkg.price.split('•')[0] : '1,200 جنيه')}</strong>
        </div>

        <!-- المجموعات المربوطة وأجور المعلمين بالساعة -->
        <div class="acp-groups-box">
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; font-weight:800; color:var(--text-muted);">
            <span>المجموعات المربوطة بالفصل (${linkedGroups.length}):</span>
            <span style="color:#10b981;">أجر الساعة</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:5px; max-height:130px; overflow-y:auto; padding-inline-end:2px;">
            ${linkedGroups.length > 0 ? linkedGroups.map(g => `
              <div class="acp-group-row">
                <span style="font-weight:700; color:var(--text-main);">
                  ${g.course?.subject?.name || g.name} • ${g.teacher?.name || 'معلم'} • ⏱️ ${g.sessionDuration || 40} دقيقة
                </span>
                <span style="color:#10b981; font-weight:800;">${g.teacherHourlyRate || 100} ج.م/س</span>
              </div>
            `).join('') : '<div style="font-size:0.75rem; color:#f59e0b; padding:6px 0;">⚠️ لم يتم ربط مجموعات بعد. اضغط تعديل لربط المجموعات.</div>'}
          </div>
        </div>

        <div class="acp-card-actions">
          <button type="button" class="acp-action-btn enroll acp-enroll-btn" data-class-id="${pkg.id}" title="تسكين طالب في جميع مجموعات الفصل">
            <i data-lucide="user-plus" style="width:14px;height:14px;"></i>
            <span>تسكين طالب</span>
          </button>
          <button type="button" class="acp-action-btn acp-toggle-btn" data-class-id="${pkg.id}" title="${isHidden ? 'إظهار الفصل' : 'إخفاء الفصل'}">
            <i data-lucide="${isHidden ? 'eye' : 'eye-off'}" style="width:14px;height:14px;"></i>
            <span>${isHidden ? 'إظهار' : 'إخفاء'}</span>
          </button>
          <button type="button" class="acp-action-btn acp-edit-btn" data-class="${rawData}" title="تعديل الفصل والمجموعات المربوطة">
            <i data-lucide="pencil" style="width:14px;height:14px;"></i>
            <span>تعديل</span>
          </button>
          <button type="button" class="acp-action-btn danger acp-del-btn" data-class-id="${pkg.id}" data-class-name="${pkg.name}" title="حذف الفصل">
            <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
            <span>حذف</span>
          </button>
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.container.querySelectorAll(".acp-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        this.activeStage = btn.getAttribute("data-stage");
        this.renderPage();
        this.bindEvents();
      });
    });

    const searchInput = this.container.querySelector("#acp-search-input");
    searchInput?.addEventListener("input", e => {
      this.searchQuery = e.target.value;
      const grid = this.container.querySelector("#acp-classes-grid");
      if (grid) {
        const list = this.filteredClasses();
        grid.innerHTML = list.length > 0 ? list.map(c => this.renderClassCard(c)).join("") : `
          <div class="acp-empty">
            <h3 style="margin:0; color:var(--text-main); font-size:1.1rem;">لا توجد فصول تطابق البحث</h3>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        this.bindCardEvents();
      }
    });

    this.container.querySelector("#acp-add-class-btn")?.addEventListener("click", () => this.openClassModal(null));
    this.container.querySelector("#acp-empty-add-btn")?.addEventListener("click", () => this.openClassModal(null));

    this.bindCardEvents();
  }

  bindCardEvents() {
    this.container.querySelectorAll(".acp-enroll-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const id = btn.getAttribute("data-class-id");
        const pkg = this.classes.find(c => c.id === id);
        if (pkg) this.openEnrollModal(pkg);
      });
    });

    this.container.querySelectorAll(".acp-toggle-btn").forEach(btn => {
      btn.addEventListener("click", async e => {
        e.stopPropagation();
        const id = btn.getAttribute("data-class-id");
        btn.disabled = true;
        try {
          const res = await apiFetch(`/admin/curriculum/classes/${id}/toggle`, { method: "PATCH" });
          showToast(res.message || "تم تغيير حالة الفصل", "success");
          await this.loadData();
          this.renderPage();
          this.bindEvents();
        } catch (err) {
          showToast(err.message || "فشل التحديث", "error");
          btn.disabled = false;
        }
      });
    });

    this.container.querySelectorAll(".acp-edit-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        try {
          const data = JSON.parse(btn.getAttribute("data-class").replace(/&quot;/g, '"'));
          this.openClassModal(data);
        } catch (_) {
          showToast("خطأ في قراءة بيانات الفصل", "error");
        }
      });
    });

    this.container.querySelectorAll(".acp-del-btn").forEach(btn => {
      btn.addEventListener("click", async e => {
        e.stopPropagation();
        const id = btn.getAttribute("data-class-id");
        const name = btn.getAttribute("data-class-name");
        if (!await confirmDialog(`حذف فصل "${name}"؟ لا يمكن التراجع.`)) return;
        btn.disabled = true;
        try {
          const res = await apiFetch(`/admin/curriculum/classes/${id}`, { method: "DELETE" });
          showToast(res.message || "تم حذف الفصل بنجاح", "success");
          await this.loadData();
          this.renderPage();
          this.bindEvents();
        } catch (err) {
          showToast(err.message || "فشل الحذف", "error");
          btn.disabled = false;
        }
      });
    });
  }

  // نافذة إنشاء أو تعديل الفصل الدراسي وربط المجموعات بتصميم عصري وأنيق
  async openClassModal(pkg = null) {
    const isEdit = !!pkg;
    const selectedGradeId = pkg?.gradeId || this.grades[0]?.id;
    const selectedGroupIds = (pkg?.groupIds || []).slice();

    const overlay = document.createElement("div");
    overlay.className = "acp-modal-overlay";
    overlay.innerHTML = `
      <div class="acp-modal-dialog">
        
        <!-- رأس النافذة الثابت -->
        <div class="acp-modal-header">
          <div class="acp-modal-title-box">
            <div class="acp-modal-title-icon">
              <i data-lucide="${isEdit ? 'edit-3' : 'layers'}" style="width:22px;height:22px;"></i>
            </div>
            <div>
              <h3 class="acp-modal-title">${isEdit ? "تعديل بيانات الفصل والباقة الشاملة" : "➕ إنشاء فصل وباقة شاملة جديدة"}</h3>
              <p class="acp-modal-subtitle">تجميع مجموعات المواد باشتراك شهري موحد للطالب وأجر ساعة معتمد للمعلمين</p>
            </div>
          </div>
          <button type="button" class="acp-modal-close-btn" id="acm-close-x" title="إغلاق">✕</button>
        </div>

        <!-- جسم النافذة القابل للتمرير -->
        <div class="acp-modal-body">
          
          <!-- الصف والشارة -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
            <div class="acp-form-group">
              <label>الصف الدراسي الموجه له الفصل *</label>
              <select class="acp-form-select" id="acm-grade-id">
                ${this.grades.map(g => `
                  <option value="${g.id}" ${g.id === selectedGradeId ? 'selected' : ''}>
                    ${g.name} (${g.stage === 'SECONDARY' ? 'ثانوي' : (g.stage === 'PREPARATORY' ? 'إعدادي' : 'ابتدائي')})
                  </option>
                `).join('')}
              </select>
            </div>
            <div class="acp-form-group">
              <label>شارة التمييز الترويجية (Badge)</label>
              <input class="acp-form-input" id="acm-badge" type="text" placeholder="مثال: الأكثر طلباً ⭐ أو باقة شاملة" value="${pkg?.badge || "متاح للاشتراك"}">
            </div>
          </div>

          <!-- اسم الفصل -->
          <div class="acp-form-group">
            <label>اسم الفصل / الباقة *</label>
            <input class="acp-form-input" id="acm-name" type="text" placeholder="مثال: فصل المتفوقين (باقة مجمعة - الصف الأول الثانوي)" value="${pkg?.name || ""}">
          </div>

          <!-- السعر والثيم -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
            <div class="acp-form-group">
              <label>اشتراك الطالب الشهري (EGP) *</label>
              <input class="acp-form-input" id="acm-price-eg" type="text" placeholder="مثال: 1200 جنيه" value="${pkg?.priceEg || ""}">
            </div>
            <div class="acp-form-group">
              <label>الثيم اللوني للبطاقة</label>
              <select class="acp-form-select" id="acm-theme">
                <option value="blue" ${(!pkg || pkg.theme === "blue") ? "selected" : ""}>🔵 أزرق ناصع (Blue)</option>
                <option value="green" ${pkg?.theme === "green" ? "selected" : ""}>🟢 أخضر زمردي (Green)</option>
                <option value="purple" ${pkg?.theme === "purple" ? "selected" : ""}>🟣 بنفسجي ملوكي (Purple)</option>
                <option value="amber" ${pkg?.theme === "amber" ? "selected" : ""}>🟡 كهرماني ذهبي (Amber)</option>
              </select>
            </div>
          </div>

          <!-- المجموعات المربوطة بالفصل -->
          <div class="acp-form-group">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <label style="margin-bottom:0;">👥 مجموعات المواد التابعة لهذا الفصل</label>
              <span id="acm-selected-counter" style="font-size:0.78rem; color:#0284c7; font-weight:800; background:rgba(2,132,199,0.1); padding:2px 10px; border-radius:8px;">
                0 مجموعات محددة
              </span>
            </div>
            <p style="font-size:0.77rem; color:var(--text-muted); margin:0 0 10px 0; line-height:1.5;">
              حدد المجموعات التي تشكل هذا الفصل. عند اشتراك الطالب يتم تسكينه تلقائياً في كل المجموعات المحددة، ويُصرف لكل معلم أجر ساعته المعتمد عن الحصص المكتملة.
            </p>
            <div id="acm-groups-list" style="max-height:190px; overflow-y:auto; border:1.5px solid var(--border-color); border-radius:14px; padding:10px; background:var(--bg-app); display:flex; flex-direction:column; gap:8px;">
              <!-- تُحقن عبر JS عند تغيير الصف -->
            </div>
          </div>

          <!-- شريط النموذج المالي المعتمد -->
          <div style="background:rgba(2, 132, 199, 0.05); border:1.5px solid rgba(2, 132, 199, 0.2); border-radius:16px; padding:12px 16px;">
            <div style="font-size:0.82rem; font-weight:900; color:#0284c7; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
              <i data-lucide="shield-check" style="width:16px;height:16px;"></i>
              <span>النموذج المالي: اشتراك الطالب للمنصة + أجر الساعة للمعلمين</span>
            </div>
            <div style="font-size:0.77rem; color:var(--text-main); line-height:1.5;">
              يدفع الطالب اشتراك الفصل الموحد (مثلاً 1,200 ج.م) لحساب المنصة، ويحصل كل معلم على أجر ساعته المعتمد فقط عند إتمام حصته على زوم.
            </div>
          </div>

          <!-- نبذة عن الفصل -->
          <div class="acp-form-group">
            <label>نبذة ومميزات الباقة للطلاب</label>
            <textarea class="acp-form-textarea" id="acm-desc" rows="2" placeholder="شرح مبسط لمميزات الباقة والجدول الأسبوعي للطلاب...">${pkg?.description || ""}</textarea>
          </div>

          <!-- التفعيل والظهور -->
          <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:var(--bg-app); border-radius:13px; border:1px solid var(--border-color);">
            <label style="display:flex; align-items:center; gap:10px; cursor:pointer; user-select:none; margin:0;">
              <input type="checkbox" id="acm-active" ${(!pkg || pkg.isActive) ? "checked" : ""} style="width:18px; height:18px; accent-color:#0284c7; cursor:pointer;">
              <div>
                <div style="font-weight:800; font-size:0.86rem; color:var(--text-main);">تفعيل وعرض الفصل فوراً في الموقع</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">سيتمكن الطلاب من رؤية هذا الفصل والاشتراك به من الصفحة الرئيسية</div>
              </div>
            </label>
          </div>

        </div>

        <!-- شريط الأزرار الثابت بالأسفل -->
        <div class="acp-modal-footer">
          <div id="acm-footer-summary" style="font-size:0.8rem; font-weight:800; color:var(--text-muted);">
            <!-- يتم تحديثه ديناميكياً -->
          </div>
          <div style="display:flex; gap:10px; align-items:center;">
            <button type="button" class="acp-btn acp-btn-outline" id="acm-cancel">إلغاء</button>
            <button type="button" class="acp-btn acp-btn-primary" id="acm-save">
              <i data-lucide="check" style="width:16px;height:16px;"></i>
              <span>${isEdit ? "حفظ التعديلات" : "إنشاء وتأكيد ربط الفصل 🚀"}</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    const gradeSelect = overlay.querySelector("#acm-grade-id");
    const groupsContainer = overlay.querySelector("#acm-groups-list");
    const counterBadge = overlay.querySelector("#acm-selected-counter");
    const footerSummary = overlay.querySelector("#acm-footer-summary");

    const updateSelectionStats = () => {
      const checkedBoxes = Array.from(overlay.querySelectorAll(".acm-group-check:checked"));
      const count = checkedBoxes.length;
      let totalHourly = 0;
      checkedBoxes.forEach(cb => {
        totalHourly += parseFloat(cb.getAttribute("data-rate")) || 0;
      });

      if (counterBadge) {
        counterBadge.textContent = `${count} مجموعات محددة`;
      }
      if (footerSummary) {
        footerSummary.innerHTML = count > 0 
          ? `تم تحديد <strong style="color:#0284c7;">${count} مواد</strong> • تكلفة الحصة: <strong style="color:#10b981;">${totalHourly} ج.م/ساعة</strong>`
          : `يرجى تحديد مجموعة واحدة على الأقل`;
      }
    };

    const renderGroupsForGrade = (gradeId) => {
      const selectedGrade = this.grades.find(g => g.id === gradeId);
      const gradeGroups = (this.allGroups || []).filter(g => 
        g.course?.grade?.id === gradeId || 
        g.course?.grade?.name === selectedGrade?.name || 
        g.course?.grade?.stage === selectedGrade?.stage ||
        (g.course?.degree && selectedGrade?.name && g.course.degree.includes(selectedGrade.name))
      );
      const list = gradeGroups.length > 0 ? gradeGroups : this.allGroups;

      if (list.length === 0) {
        groupsContainer.innerHTML = `<div style="font-size:0.82rem; color:var(--text-muted); text-align:center; padding:16px;">لا توجد مجموعات متاحة لهذا الصف بعد. يمكنك إنشاء مجموعات من صفحة الحصص أولاً.</div>`;
        updateSelectionStats();
        return;
      }

      groupsContainer.innerHTML = list.map(g => {
        const isChecked = selectedGroupIds.includes(g.id);
        const rate = g.teacherHourlyRate || 100;
        return `
          <label class="acp-group-row ${isChecked ? 'selected' : ''}" style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 14px; border-radius:12px; background:${isChecked ? 'rgba(2,132,199,0.07)' : 'var(--bg-card)'}; border:1.5px solid ${isChecked ? '#0284c7' : 'var(--border-color)'}; cursor:pointer; user-select:none; transition:all 0.15s ease;">
            <div style="display:flex; align-items:center; gap:11px;">
              <input type="checkbox" class="acm-group-check" value="${g.id}" data-rate="${rate}" ${isChecked ? 'checked' : ''} style="width:18px; height:18px; accent-color:#0284c7; cursor:pointer;">
              <div>
                <div style="font-weight:900; font-size:0.88rem; color:var(--text-main);">${g.course?.subject?.name || g.name}</div>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                  <strong style="color:var(--text-main);">${g.teacher?.name || g.course?.teacher?.name || 'معلم معتمد'}</strong> 
                  ${g.scheduleDays ? `• ${g.scheduleDays} ${g.scheduleTime || ''}` : ''}
                  • ⏱️ ${g.sessionDuration || 40} دقيقة
                </div>
              </div>
            </div>
            <div style="font-size:0.8rem; font-weight:900; color:#10b981; background:rgba(16,185,129,0.1); padding:4px 10px; border-radius:8px; white-space:nowrap;">
              ${rate} ج.م/ساعة
            </div>
          </label>
        `;
      }).join('');

      // تفعيل تغيير الستايل عند النقر على الشيك بوكس
      groupsContainer.querySelectorAll(".acm-group-check").forEach(cb => {
        cb.addEventListener("change", e => {
          const row = e.target.closest("label");
          if (row) {
            if (e.target.checked) {
              row.classList.add("selected");
              row.style.background = "rgba(2,132,199,0.07)";
              row.style.borderColor = "#0284c7";
            } else {
              row.classList.remove("selected");
              row.style.background = "var(--bg-card)";
              row.style.borderColor = "var(--border-color)";
            }
          }
          updateSelectionStats();
        });
      });

      updateSelectionStats();
    };

    renderGroupsForGrade(gradeSelect.value);
    gradeSelect.addEventListener("change", () => renderGroupsForGrade(gradeSelect.value));

    const closeModal = () => overlay.remove();
    overlay.querySelector("#acm-close-x")?.addEventListener("click", closeModal);
    overlay.querySelector("#acm-cancel")?.addEventListener("click", closeModal);
    overlay.addEventListener("click", e => { if (e.target === overlay) closeModal(); });

    overlay.querySelector("#acm-save").addEventListener("click", async () => {
      const name = overlay.querySelector("#acm-name").value.trim();
      const gradeId = gradeSelect.value;
      const badge = overlay.querySelector("#acm-badge").value.trim();
      const priceEg = overlay.querySelector("#acm-price-eg").value.trim();
      const theme = overlay.querySelector("#acm-theme").value;
      const description = overlay.querySelector("#acm-desc").value.trim();
      const isActive = overlay.querySelector("#acm-active").checked;

      const checkedGroups = Array.from(overlay.querySelectorAll(".acm-group-check:checked")).map(cb => cb.value);

      if (!name) {
        showToast("اسم الفصل أو الباقة مطلوب", "error");
        return;
      }

      const saveBtn = overlay.querySelector("#acm-save");
      saveBtn.disabled = true;
      saveBtn.textContent = "جارٍ الحفظ والربط...";

      const payload = {
        name,
        badge,
        priceEg,
        price: priceEg ? `${priceEg} / شهرياً` : "",
        theme,
        description,
        isActive,
        groupIds: checkedGroups
      };

      try {
        if (isEdit) {
          await apiFetch(`/admin/curriculum/classes/${pkg.id}`, {
            method: "PUT",
            body: JSON.stringify(payload)
          });
          showToast("تم تحديث بيانات الفصل والمجموعات بنجاح ✅", "success");
        } else {
          await apiFetch(`/admin/curriculum/grades/${gradeId}/classes`, {
            method: "POST",
            body: JSON.stringify(payload)
          });
          showToast("تم إنشاء الفصل وربط مجموعاته بنجاح 🚀", "success");
        }
        overlay.remove();
        await this.loadData();
        this.renderPage();
        this.bindEvents();
      } catch (err) {
        showToast(err.message || "فشلت العملية", "error");
        saveBtn.disabled = false;
        saveBtn.textContent = isEdit ? "حفظ التعديلات" : "إنشاء وتأكيد ربط الفصل 🚀";
      }
    });
  }

  // نافذة تسكين طالب في جميع مجموعات الفصل بنقرة واحدة بتصميم متناسق ومتقن
  openEnrollModal(pkg) {
    const linkedGroups = pkg.linkedGroups || [];
    if (linkedGroups.length === 0) {
      showToast("يرجى ربط مجموعات بهذا الفصل أولاً قبل تسكين الطلاب.", "error");
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = "acp-modal-overlay";
    overlay.innerHTML = `
      <div class="acp-modal-dialog" style="max-width:620px;">
        
        <!-- رأس النافذة الثابت -->
        <div class="acp-modal-header">
          <div class="acp-modal-title-box">
            <div class="acp-modal-title-icon" style="background:rgba(16, 185, 129, 0.14); color:#10b981;">
              <i data-lucide="user-plus" style="width:22px;height:22px;"></i>
            </div>
            <div>
              <h3 class="acp-modal-title">تسكين طالب في فصل: ${pkg.name}</h3>
              <p class="acp-modal-subtitle">تسكين فوري في جميع مجموعات الفصل المربوطة (${linkedGroups.length} مجموعات)</p>
            </div>
          </div>
          <button type="button" class="acp-modal-close-btn" id="aces-close-x" title="إغلاق">✕</button>
        </div>

        <!-- جسم النافذة القابل للتمرير -->
        <div class="acp-modal-body">
          
          <!-- صندوق استعراض المجموعات -->
          <div style="background:rgba(16, 185, 129, 0.05); border:1.5px solid rgba(16, 185, 129, 0.2); border-radius:14px; padding:12px 16px;">
            <div style="font-size:0.8rem; font-weight:800; color:#10b981; margin-bottom:4px;">
              سيتم تسكين الطالب آلياً في المجموعات التالية (${linkedGroups.length}):
            </div>
            <div style="font-size:0.78rem; color:var(--text-main); line-height:1.6;">
              ${linkedGroups.map(g => `<span style="display:inline-block; background:var(--bg-card); border:1px solid var(--border-color); padding:2px 8px; border-radius:6px; margin:2px 4px 2px 0;"><strong>${g.course?.subject?.name || g.name}</strong> (${g.teacher?.name || 'معلم'})</span>`).join('')}
            </div>
          </div>

          <!-- اختيار الطالب -->
          <div class="acp-form-group">
            <label>اختر الطالب من المنصة *</label>
            <select class="acp-form-select" id="aces-student-id">
              <option value="">-- اختر طالباً (${this.allUsers.length} طالب مسجل) --</option>
              ${this.allUsers.map(s => `
                <option value="${s.id}">${s.name} ${s.phone ? `(${s.phone})` : ''} - ${s.email || ''}</option>
              `).join('')}
            </select>
          </div>

          <!-- المبلغ وخطة السداد -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
            <div class="acp-form-group">
              <label>المبلغ المدفوع للاشتراك (EGP) *</label>
              <input class="acp-form-input" id="aces-amount" type="number" placeholder="المبلغ المدفوع" value="${parseInt(pkg.priceEg) || 1200}">
            </div>
            <div class="acp-form-group">
              <label>خطة السداد</label>
              <select class="acp-form-select" id="aces-plan">
                <option value="PAID">مسدد بالكامل (PAID)</option>
                <option value="PARTIAL">دفعة جزئية (PARTIAL)</option>
                <option value="POSTPONED">سيدفع لاحقاً (POSTPONED)</option>
              </select>
            </div>
          </div>

          <!-- وسيلة الدفع -->
          <div class="acp-form-group">
            <label>وسيلة الدفع / التحويل</label>
            <select class="acp-form-select" id="aces-provider">
              <option value="VODAFONE_CASH">فودافون كاش / محافظ إلكترونية</option>
              <option value="INSTAPAY">انستاباي (InstaPay)</option>
              <option value="BANK_TRANSFER">تحويل بنكي</option>
              <option value="CASH">نقدي باليد</option>
            </select>
          </div>

          <!-- رابط الإيصال والملاحظات -->
          <div class="acp-form-group">
            <label>رابط صورة الإيصال (اختياري)</label>
            <input class="acp-form-input" id="aces-receipt" type="text" placeholder="رابط صورة الإيصال أو رقم عملية التحويل">
          </div>

          <div class="acp-form-group">
            <label>ملاحظات إدارية</label>
            <input class="acp-form-input" id="aces-notes" type="text" placeholder="مثال: اشتراك شهري باقة الفصل الشاملة">
          </div>

        </div>

        <!-- شريط الأزرار الثابت -->
        <div class="acp-modal-footer">
          <button type="button" class="acp-btn acp-btn-outline" id="aces-cancel">إلغاء</button>
          <button type="button" class="acp-btn acp-btn-primary" id="aces-save" style="background:linear-gradient(135deg, #10b981 0%, #059669 100%);">
            <i data-lucide="check-circle" style="width:16px;height:16px;"></i>
            <span>تسكين في كل المجموعات (${linkedGroups.length}) 🚀</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => overlay.remove();
    overlay.querySelector("#aces-close-x")?.addEventListener("click", closeModal);
    overlay.querySelector("#aces-cancel")?.addEventListener("click", closeModal);
    overlay.addEventListener("click", e => { if (e.target === overlay) closeModal(); });

    overlay.querySelector("#aces-save").addEventListener("click", async () => {
      const studentId = overlay.querySelector("#aces-student-id").value;
      const amount = parseFloat(overlay.querySelector("#aces-amount").value) || 0;
      const paymentPlan = overlay.querySelector("#aces-plan").value;
      const provider = overlay.querySelector("#aces-provider").value;
      const receiptUrl = overlay.querySelector("#aces-receipt").value.trim();
      const notes = overlay.querySelector("#aces-notes").value.trim();

      if (!studentId) {
        showToast("يرجى اختيار الطالب أولاً", "error");
        return;
      }

      const saveBtn = overlay.querySelector("#aces-save");
      saveBtn.disabled = true;
      saveBtn.textContent = "جارٍ تسكين الطالب في جميع المجموعات...";

      try {
        const res = await apiFetch(`/admin/curriculum/classes/${pkg.id}/enroll-student`, {
          method: "POST",
          body: JSON.stringify({
            studentId,
            amount,
            paymentPlan,
            provider,
            receiptUrl,
            notes
          })
        });
        showToast(res.message || "تم تسكين الطالب بنجاح في جميع مجموعات الفصل! 🎉", "success");
        overlay.remove();
        await this.loadData();
        this.renderPage();
        this.bindEvents();
      } catch (err) {
        showToast(err.message || "فشل تسكين الطالب", "error");
        saveBtn.disabled = false;
        saveBtn.textContent = `تسكين في كل المجموعات (${linkedGroups.length}) 🚀`;
      }
    });
  }
}
