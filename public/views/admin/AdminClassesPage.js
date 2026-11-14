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
      list = list.filter(c => {
        if (c.grades && c.grades.length > 0) {
          return c.grades.some(g => g.stage === this.activeStage);
        }
        return c.grade?.stage === this.activeStage;
      });
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(c => 
        c.name?.toLowerCase().includes(q) || 
        c.badge?.toLowerCase().includes(q) || 
        c.grade?.name?.toLowerCase().includes(q) ||
        (c.grades || []).some(g => g.name?.toLowerCase().includes(q)) ||
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

        /* ── MODERN REDESIGNED CLASS CARDS ── */
        .acp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 24px;
        }
        @media (max-width: 640px) {
          .acp-grid {
            grid-template-columns: 1fr;
          }
        }
        .acp-card {
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-top: 5px solid var(--card-accent, #0284c7);
          border-radius: 26px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02);
          transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .acp-card::before {
          content: "";
          position: absolute;
          top: 0;
          right: 0;
          left: 0;
          height: 120px;
          background: radial-gradient(circle at top right, var(--card-glow, rgba(2,132,199,0.08)), transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        .acp-card:hover {
          border-color: var(--card-accent, #0284c7);
          box-shadow: 0 20px 38px -10px var(--card-glow, rgba(2,132,199,0.18)), 0 0 0 1.5px var(--card-accent, #0284c7);
          transform: translateY(-4px);
        }
        .acp-card.hidden-card {
          opacity: 0.78;
          border-style: dashed;
          background: var(--bg-app, #f8fafc);
        }
        .acp-card > * {
          position: relative;
          z-index: 1;
        }

        /* Top Header */
        .acp-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        .acp-header-start {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .acp-class-icon-avatar {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: var(--card-avatar-bg, rgba(2,132,199,0.12));
          color: var(--card-accent, #0284c7);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px var(--card-glow, rgba(2,132,199,0.15));
        }
        .acp-grade-pill {
          background: var(--card-avatar-bg, rgba(2, 132, 199, 0.1));
          color: var(--card-accent, #0284c7);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.76rem;
          font-weight: 800;
          border: 1px solid var(--card-border-light, rgba(2, 132, 199, 0.25));
          display: inline-flex;
          align-items: center;
          gap: 5px;
          max-width: 210px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .acp-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: -0.2px;
          flex-shrink: 0;
        }
        .acp-status-badge.active {
          background: rgba(16, 185, 129, 0.12);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .acp-status-badge.hidden {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }
        .acp-pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
          display: inline-block;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.35);
          animation: acpPulse 1.8s infinite;
        }
        @keyframes acpPulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6); }
          70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        /* Title & Meta */
        .acp-title-box {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .acp-badge-pill {
          align-self: flex-start;
          font-size: 0.73rem;
          font-weight: 800;
          color: var(--card-accent, #0284c7);
          background: var(--card-avatar-bg, rgba(2, 132, 199, 0.1));
          border: 1px solid var(--card-border-light, rgba(2, 132, 199, 0.25));
          padding: 2px 10px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .acp-card-title {
          font-size: 1.22rem;
          font-weight: 900;
          color: var(--text-main, #0f172a);
          line-height: 1.35;
          margin: 0;
        }
        .acp-card-desc {
          margin: 0;
          font-size: 0.83rem;
          color: var(--text-muted, #64748b);
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Financial split card */
        .acp-finance-card {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 12px;
          padding: 13px 18px;
          border-radius: 18px;
          background: linear-gradient(135deg, var(--bg-app, #f8fafc) 0%, rgba(255,255,255,0.7) 100%);
          border: 1.5px solid var(--border-color, #e2e8f0);
        }
        .acp-finance-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .acp-finance-label {
          font-size: 0.74rem;
          font-weight: 700;
          color: var(--text-muted, #64748b);
        }
        .acp-finance-value {
          display: flex;
          align-items: baseline;
          gap: 4px;
          flex-wrap: wrap;
        }
        .acp-finance-value.student-price strong {
          font-size: 1.32rem;
          font-weight: 900;
          color: var(--card-accent, #0284c7);
        }
        .acp-finance-value.teacher-rate strong {
          font-size: 1.15rem;
          font-weight: 900;
          color: #059669;
        }
        .acp-finance-sub {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-muted, #64748b);
        }
        .acp-finance-divider {
          width: 1px;
          height: 38px;
          background: var(--border-color, #e2e8f0);
        }

        /* Quick KPI bar */
        .acp-kpi-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          padding: 8px 12px;
          border-radius: 12px;
          background: var(--bg-app, #f8fafc);
          font-size: 0.76rem;
          color: var(--text-muted, #64748b);
          border: 1px solid var(--border-color, #e2e8f0);
        }
        .acp-kpi-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .acp-kpi-item strong {
          color: var(--text-main, #0f172a);
          font-weight: 800;
        }
        .acp-kpi-sep {
          color: var(--border-color, #cbd5e1);
        }

        /* Groups & Subjects Box */
        .acp-groups-box {
          border: 1.5px solid var(--border-color, #e2e8f0);
          border-radius: 18px;
          padding: 12px 14px;
          background: var(--bg-app, #f8fafc);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .acp-groups-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.78rem;
          font-weight: 800;
          color: var(--text-muted, #64748b);
          padding-bottom: 4px;
          border-bottom: 1px dashed var(--border-color, #e2e8f0);
        }
        .acp-groups-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 140px;
          overflow-y: auto;
          padding-inline-end: 2px;
        }
        .acp-groups-list::-webkit-scrollbar {
          width: 4px;
        }
        .acp-groups-list::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .acp-group-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 12px;
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          font-size: 0.78rem;
          transition: border-color 0.15s ease;
        }
        .acp-group-row:hover {
          border-color: #0284c7;
        }
        .acp-group-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .acp-group-title {
          font-weight: 800;
          color: var(--text-main, #0f172a);
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .acp-group-meta {
          font-size: 0.72rem;
          color: var(--text-muted, #64748b);
          display: flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .acp-rate-pill {
          color: #059669;
          background: rgba(5, 150, 105, 0.1);
          border: 1px solid rgba(5, 150, 105, 0.22);
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 8px;
          font-size: 0.74rem;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .acp-no-groups-notice {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: rgba(245, 158, 11, 0.08);
          border: 1px dashed rgba(245, 158, 11, 0.35);
          border-radius: 12px;
          font-size: 0.78rem;
          color: #b45309;
          font-weight: 700;
          gap: 8px;
        }
        .acp-link-now-btn {
          background: #f59e0b;
          color: #ffffff;
          border: none;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 0.72rem;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        /* Action Buttons */
        .acp-card-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: auto;
          padding-top: 14px;
          border-top: 1px solid var(--border-color, #e2e8f0);
        }
        .acp-enroll-primary-btn {
          width: 100%;
          padding: 11px 16px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          color: #ffffff;
          font-size: 0.86rem;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(5, 150, 105, 0.28);
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .acp-enroll-primary-btn:hover {
          background: linear-gradient(135deg, #047857 0%, #065f46 100%);
          box-shadow: 0 6px 18px rgba(5, 150, 105, 0.4);
          transform: translateY(-1px);
        }
        .acp-sub-actions-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
        }
        .acp-sub-action-btn {
          padding: 8px 10px;
          border-radius: 12px;
          border: 1px solid var(--border-color, #cbd5e1);
          background: var(--bg-card, #ffffff);
          color: var(--text-main, #334155);
          font-size: 0.78rem;
          font-weight: 800;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          transition: all 0.15s ease;
          font-family: inherit;
        }
        .acp-sub-action-btn:hover {
          border-color: #0284c7;
          color: #0284c7;
          background: rgba(2, 132, 199, 0.05);
        }
        .acp-sub-action-btn.danger:hover {
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

    // لوحة ألوان الثيمات لتخصيص الهوية البصرية للكارت
    const themeStyles = {
      blue: {
        accent: "#0284c7",
        glow: "rgba(2,132,199,0.2)",
        avatarBg: "rgba(2,132,199,0.12)",
        borderLight: "rgba(2,132,199,0.28)",
        icon: "book-open"
      },
      green: {
        accent: "#059669",
        glow: "rgba(5,150,105,0.2)",
        avatarBg: "rgba(5,150,105,0.12)",
        borderLight: "rgba(5,150,105,0.28)",
        icon: "graduation-cap"
      },
      purple: {
        accent: "#7c3aed",
        glow: "rgba(124,58,237,0.2)",
        avatarBg: "rgba(124,58,237,0.12)",
        borderLight: "rgba(124,58,237,0.28)",
        icon: "sparkles"
      },
      amber: {
        accent: "#d97706",
        glow: "rgba(217,119,6,0.2)",
        avatarBg: "rgba(217,119,6,0.12)",
        borderLight: "rgba(217,119,6,0.28)",
        icon: "award"
      }
    };
    const currentTheme = themeStyles[pkg.theme] || themeStyles.blue;

    const targetGrades = (pkg.grades && pkg.grades.length > 0) ? pkg.grades : (pkg.grade ? [pkg.grade] : []);
    const gradesBadgeText = targetGrades.length > 1
      ? `🎒 ${targetGrades.length} صفوف (${targetGrades.map(g => g.name).join('، ')})`
      : (targetGrades[0]?.name ? `🎓 ${targetGrades[0].name}` : "🎓 صف دراسي عام");

    // احتساب مؤشرات الفصل بدقة
    const hourlyRates = linkedGroups.map(g => Number(g.teacherHourlyRate) || 100);
    const minHourly = hourlyRates.length > 0 ? Math.min(...hourlyRates) : 100;
    const maxHourly = hourlyRates.length > 0 ? Math.max(...hourlyRates) : 100;
    const hourlyDisplay = hourlyRates.length === 0 
      ? '100 ج.م' 
      : (minHourly === maxHourly ? `${minHourly} ج.م` : `${minHourly} - ${maxHourly} ج.م`);

    const totalSessions = linkedGroups.reduce((sum, g) => sum + (Number(g.totalSessions) || 8), 0);
    const distinctTeachers = [...new Set(linkedGroups.map(g => g.teacher?.name || g.course?.teacher?.name).filter(Boolean))];
    const priceFormatted = pkg.priceEg ? Number(pkg.priceEg).toLocaleString() : (pkg.price ? pkg.price.split('•')[0].trim() : '1,200');

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
      gradeId: targetGrades[0]?.id || pkg.grade?.id,
      gradeIds: targetGrades.map(g => g.id),
      groupIds: linkedGroups.map(g => g.id)
    }).replace(/"/g, "&quot;");

    return `
      <div class="acp-card ${isHidden ? "hidden-card" : ""}" style="--card-accent:${currentTheme.accent}; --card-glow:${currentTheme.glow}; --card-avatar-bg:${currentTheme.avatarBg}; --card-border-light:${currentTheme.borderLight};">
        
        <!-- ترويسة الكارت العلوية -->
        <div class="acp-card-header">
          <div class="acp-header-start">
            <div class="acp-class-icon-avatar">
              <i data-lucide="${currentTheme.icon}" style="width:22px;height:22px;"></i>
            </div>
            <span class="acp-grade-pill" title="${targetGrades.map(g => g.name).join(' • ')}">
              ${gradesBadgeText}
            </span>
          </div>

          <div style="display:flex; align-items:center; gap:8px;">
            <span class="acp-status-badge ${isHidden ? 'hidden' : 'active'}">
              ${isHidden ? `
                <i data-lucide="eye-off" style="width:12px;height:12px;"></i>
                <span>مخفي / مسودة</span>
              ` : `
                <span class="acp-pulse-dot"></span>
                <span>معروض للطلاب</span>
              `}
            </span>
          </div>
        </div>

        <!-- عنوان الفصل والشارة الترويجية والوصف -->
        <div class="acp-title-box">
          ${pkg.badge ? `
            <div class="acp-badge-pill">
              <i data-lucide="sparkles" style="width:12px;height:12px;"></i>
              <span>${pkg.badge}</span>
            </div>
          ` : ''}
          <h3 class="acp-card-title">${pkg.name}</h3>
          <p class="acp-card-desc" title="${pkg.description || ''}">
            ${pkg.description || "باقة دراسية متكاملة تجمع كل المواد المقررة بجدول أسبوعي موحد وتسكين الطلاب آلياً."}
          </p>
        </div>

        <!-- بطاقة النموذج المالي المقسم -->
        <div class="acp-finance-card">
          <div class="acp-finance-item">
            <span class="acp-finance-label">اشتراك الطالب الشهري</span>
            <div class="acp-finance-value student-price">
              <strong>${priceFormatted}</strong>
              <span class="acp-finance-sub">ج.م / شهر</span>
            </div>
          </div>
          <div class="acp-finance-divider"></div>
          <div class="acp-finance-item">
            <span class="acp-finance-label">أجور ساعات المعلمين</span>
            <div class="acp-finance-value teacher-rate">
              <strong>${hourlyDisplay}</strong>
              <span class="acp-finance-sub">/ ساعة</span>
            </div>
          </div>
        </div>

        <!-- شريط المؤشرات السريعة (KPIs) -->
        <div class="acp-kpi-bar">
          <div class="acp-kpi-item" title="عدد المواد والمجموعات المربوطة">
            <i data-lucide="layers" style="width:13px;height:13px;color:var(--card-accent);"></i>
            <span><strong>${linkedGroups.length}</strong> مواد دراسية</span>
          </div>
          <span class="acp-kpi-sep">•</span>
          <div class="acp-kpi-item" title="عدد المعلمين المعتمدين بالفصل">
            <i data-lucide="graduation-cap" style="width:13px;height:13px;color:#10b981;"></i>
            <span><strong>${distinctTeachers.length}</strong> معلمين</span>
          </div>
          <span class="acp-kpi-sep">•</span>
          <div class="acp-kpi-item" title="إجمالي الحصص المجدولة شهرياً">
            <i data-lucide="video" style="width:13px;height:13px;color:#8b5cf6;"></i>
            <span><strong>${totalSessions}</strong> حصة شهرياً</span>
          </div>
        </div>

        <!-- صندوق مجموعات المواد المربوطة -->
        <div class="acp-groups-box">
          <div class="acp-groups-header">
            <span>📚 مجموعات المواد المربوطة بالفصل (${linkedGroups.length}):</span>
            <span style="color:#059669; font-weight:800;">أجر الساعة</span>
          </div>
          <div class="acp-groups-list">
            ${linkedGroups.length > 0 ? linkedGroups.map(g => {
              const teacherName = g.teacher?.name || g.course?.teacher?.name || 'معلم معتمد';
              const subjectName = g.course?.subject?.name || g.name;
              const scheduleStr = g.scheduleDays ? `${g.scheduleDays} ${g.scheduleTime || ''}` : '';
              const duration = g.sessionDuration || 40;
              const rate = g.teacherHourlyRate || 100;
              return `
                <div class="acp-group-row">
                  <div class="acp-group-info">
                    <div class="acp-group-title">
                      <i data-lucide="book" style="width:13px;height:13px;color:var(--card-accent);flex-shrink:0;"></i>
                      <span>${subjectName}</span>
                    </div>
                    <div class="acp-group-meta">
                      <span>👨‍🏫 ${teacherName}</span>
                      ${scheduleStr ? `<span>• 📅 ${scheduleStr}</span>` : ''}
                      <span>• ⏱️ ${duration} د</span>
                    </div>
                  </div>
                  <div class="acp-rate-pill">
                    ${rate} ج.م/س
                  </div>
                </div>
              `;
            }).join('') : `
              <div class="acp-no-groups-notice">
                <div style="display:flex; align-items:center; gap:6px;">
                  <i data-lucide="alert-triangle" style="width:15px;height:15px;color:#d97706;flex-shrink:0;"></i>
                  <span>لم يتم ربط مجموعات بعد بهذا الفصل.</span>
                </div>
                <button type="button" class="acp-link-now-btn acp-edit-btn" data-class="${rawData}" title="تعديل وربط مجموعات المواد">
                  + ربط الآن
                </button>
              </div>
            `}
          </div>
        </div>

        <!-- أزرار الإجراءات المتناسقة -->
        <div class="acp-card-actions">
          <button type="button" class="acp-enroll-primary-btn acp-enroll-btn" data-class-id="${pkg.id}" title="تسكين طالب جديد في جميع مجموعات الفصل فوراً">
            <i data-lucide="user-plus" style="width:16px;height:16px;"></i>
            <span>تسكين طالب في الفصل 🚀</span>
          </button>
          
          <div class="acp-sub-actions-row">
            <button type="button" class="acp-sub-action-btn acp-toggle-btn" data-class-id="${pkg.id}" title="${isHidden ? 'إظهار الفصل للطلاب' : 'إخفاء الفصل عن الطلاب'}">
              <i data-lucide="${isHidden ? 'eye' : 'eye-off'}" style="width:14px;height:14px;"></i>
              <span>${isHidden ? 'إظهار' : 'إخفاء'}</span>
            </button>
            <button type="button" class="acp-sub-action-btn acp-edit-btn" data-class="${rawData}" title="تعديل بيانات الفصل ومجموعاته">
              <i data-lucide="edit-3" style="width:14px;height:14px;"></i>
              <span>تعديل</span>
            </button>
            <button type="button" class="acp-sub-action-btn danger acp-del-btn" data-class-id="${pkg.id}" data-class-name="${pkg.name}" title="حذف الفصل نهائياً">
              <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
              <span>حذف</span>
            </button>
          </div>
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
    const initialSelectedGradeIds = (pkg?.gradeIds && pkg.gradeIds.length > 0)
      ? pkg.gradeIds.map(String)
      : (pkg?.grades && pkg.grades.length > 0)
        ? pkg.grades.map(g => String(g.id))
        : (pkg?.gradeId ? [String(pkg.gradeId)] : (this.grades[0] ? [String(this.grades[0].id)] : []));
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
          
          <!-- اختيار الصفوف الدراسية الموجه لها الفصل (متعدد) -->
          <div class="acp-form-group" style="margin-bottom:18px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
              <label style="margin-bottom:0; font-size:0.86rem; font-weight:800; color:var(--text-main);">
                🎯 الصفوف الدراسية الموجه لها الفصل (يمكن اختيار أكثر من صف) *
              </label>
              <span id="acm-grades-counter" style="font-size:0.78rem; color:#0284c7; font-weight:800; background:rgba(2,132,199,0.1); padding:3px 10px; border-radius:10px;">
                ${initialSelectedGradeIds.length} صفوف محددة
              </span>
            </div>

            <!-- أزرار الاختيار السريع للمراحل -->
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px;">
              <button type="button" class="acm-quick-stage-btn" data-stage="PRIMARY" style="padding:4px 10px; font-size:0.75rem; border-radius:8px; border:1px solid #0284c7; background:rgba(2,132,199,0.08); color:#0284c7; cursor:pointer; font-weight:700;">
                🏫 كل الابتدائي
              </button>
              <button type="button" class="acm-quick-stage-btn" data-stage="PREPARATORY" style="padding:4px 10px; font-size:0.75rem; border-radius:8px; border:1px solid #8b5cf6; background:rgba(139,92,246,0.08); color:#8b5cf6; cursor:pointer; font-weight:700;">
                📚 كل الإعدادي
              </button>
              <button type="button" class="acm-quick-stage-btn" data-stage="SECONDARY" style="padding:4px 10px; font-size:0.75rem; border-radius:8px; border:1px solid #10b981; background:rgba(16,185,129,0.08); color:#10b981; cursor:pointer; font-weight:700;">
                🎓 كل الثانوي
              </button>
              <button type="button" class="acm-clear-grades-btn" style="padding:4px 10px; font-size:0.75rem; border-radius:8px; border:1px solid #cbd5e1; background:var(--bg-app); color:var(--text-muted); cursor:pointer; font-weight:700;">
                إلغاء التحديد
              </button>
            </div>

            <!-- قائمة الصفوف مصنفة بالمراحل -->
            <div id="acm-grades-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap:8px; max-height:165px; overflow-y:auto; padding:10px; border:1.5px solid var(--border-color); border-radius:14px; background:var(--bg-app);">
              ${this.grades.map(g => {
                const isChecked = initialSelectedGradeIds.includes(String(g.id));
                const stageLabel = g.stage === 'SECONDARY' ? 'ثانوي' : (g.stage === 'PREPARATORY' ? 'إعدادي' : 'ابتدائي');
                const stageColor = g.stage === 'SECONDARY' ? '#10b981' : (g.stage === 'PREPARATORY' ? '#8b5cf6' : '#0284c7');
                return `
                  <label class="acm-grade-pill ${isChecked ? 'active' : ''}" data-stage="${g.stage}" style="display:flex; align-items:center; gap:8px; padding:7px 11px; border-radius:10px; background:${isChecked ? 'rgba(2,132,199,0.12)' : 'var(--bg-card)'}; border:1.5px solid ${isChecked ? '#0284c7' : 'var(--border-color)'}; cursor:pointer; user-select:none; transition:all 0.15s ease;">
                    <input type="checkbox" class="acm-grade-check" value="${g.id}" data-stage="${g.stage}" ${isChecked ? 'checked' : ''} style="width:16px; height:16px; accent-color:#0284c7; cursor:pointer;">
                    <div style="display:flex; flex-direction:column; line-height:1.2;">
                      <span style="font-size:0.82rem; font-weight:800; color:var(--text-main);">${g.name}</span>
                      <span style="font-size:0.68rem; color:${stageColor}; font-weight:700;">${stageLabel}</span>
                    </div>
                  </label>
                `;
              }).join('')}
            </div>
          </div>

          <!-- اسم الفصل وشارة التمييز -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
            <div class="acp-form-group">
              <label>اسم الفصل / الباقة *</label>
              <input class="acp-form-input" id="acm-name" type="text" placeholder="مثال: فصل المتفوقين (باقة شاملة)" value="${pkg?.name || ""}">
            </div>
            <div class="acp-form-group">
              <label>شارة التمييز الترويجية (Badge)</label>
              <input class="acp-form-input" id="acm-badge" type="text" placeholder="مثال: الأكثر طلباً ⭐ أو باقة شاملة" value="${pkg?.badge || "متاح للاشتراك"}">
            </div>
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
              <!-- تُحقن عبر JS عند تغيير الصفوف -->
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

    const groupsContainer = overlay.querySelector("#acm-groups-list");
    const counterBadge = overlay.querySelector("#acm-selected-counter");
    const gradesCounterBadge = overlay.querySelector("#acm-grades-counter");
    const footerSummary = overlay.querySelector("#acm-footer-summary");

    const getSelectedGradeIds = () => {
      return Array.from(overlay.querySelectorAll(".acm-grade-check:checked")).map(cb => cb.value);
    };

    const updateGradeCounter = () => {
      const ids = getSelectedGradeIds();
      if (gradesCounterBadge) {
        gradesCounterBadge.textContent = `${ids.length} صفوف محددة`;
      }
    };

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

    const renderGroupsForSelectedGrades = (selectedIds) => {
      // دالة مساعدة لتوحيد النصوص العربية لتفادي أي فروقات في كتابة الهمزات أو التاء المربوطة
      const norm = (s) => (s || '').toString().toLowerCase().replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim();

      const selectedGrades = this.grades.filter(g => selectedIds.includes(String(g.id)));
      const selectedGradeNames = selectedGrades.map(g => (g.name || '').trim()).filter(Boolean);
      const normalizedSelectedNames = selectedGradeNames.map(norm).filter(Boolean);

      let list = [];
      if (selectedIds.length > 0) {
        // حصر المجموعات التابعة حصراً للصفوف الدراسية المحددة فقط
        list = (this.allGroups || []).filter(g => {
          const courseGradeId = g.course?.grade?.id 
            ? String(g.course.grade.id) 
            : (g.course?.subject?.grade?.id ? String(g.course.subject.grade.id) : (g.course?.gradeId ? String(g.course.gradeId) : ''));
          const courseGradeNameNorm = norm(g.course?.grade?.name || g.course?.subject?.grade?.name);
          const courseDegreeNorm = norm(g.course?.degree);
          const groupNameNorm = norm(g.name);

          // 1. مطابقة مباشرة بالمعرف الخاص بالصف (Grade ID)
          if (courseGradeId && selectedIds.includes(courseGradeId)) return true;

          // 2. مطابقة بالاسم الرسمي للصف الدراسي
          if (courseGradeNameNorm && normalizedSelectedNames.some(sn => courseGradeNameNorm === sn || courseGradeNameNorm.includes(sn) || sn.includes(courseGradeNameNorm))) return true;

          // 3. مطابقة بنص المرحلة/الصف الدراسي المخزن في الكورس (Course Degree)
          if (courseDegreeNorm && normalizedSelectedNames.some(sn => courseDegreeNorm === sn || courseDegreeNorm.includes(sn) || sn.includes(courseDegreeNorm))) return true;

          // 4. مطابقة إذا كان اسم المجموعة نفسه يتضمن اسم الصف المحدد بوضوح
          if (groupNameNorm && normalizedSelectedNames.some(sn => groupNameNorm.includes(sn))) return true;

          return false;
        });
      }

      // إذا لم يتم تحديد أي صف دراسي بعد
      if (selectedIds.length === 0) {
        groupsContainer.innerHTML = `
          <div style="font-size:0.84rem; color:var(--text-muted); text-align:center; padding:22px; line-height:1.6;">
            <i data-lucide="layers" style="width:24px;height:24px;margin-bottom:6px;display:inline-block;color:#0284c7;"></i><br>
            يرجى تحديد صف دراسي واحد على الأقل من الأعلى لعرض المجموعات التابعة له فقط.
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        updateSelectionStats();
        return;
      }

      // إذا لم توجد مجموعات تابعة لهذا الصف (لا نرجع لكل المجموعات بل نعرض رسالة واضحة)
      if (list.length === 0) {
        const gradeNamesDisplay = selectedGradeNames.join('، ') || 'الصف المحدد';
        groupsContainer.innerHTML = `
          <div style="font-size:0.84rem; color:var(--text-muted); text-align:center; padding:22px; line-height:1.6;">
            <i data-lucide="alert-circle" style="width:24px;height:24px;margin-bottom:6px;display:inline-block;color:#f59e0b;"></i><br>
            لا توجد أي مجموعات مسجلة تابعة لـ (<strong>${gradeNamesDisplay}</strong>) حالياً.<br>
            <span style="font-size:0.76rem; color:var(--text-muted);">يتم إظهار المجموعات التابعة للصف المحدد فقط لضمان دقة ربط المواد، ويمكنك إنشاء مجموعة جديدة لهذا الصف من صفحة المجموعات.</span>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        updateSelectionStats();
        return;
      }

      groupsContainer.innerHTML = list.map(g => {
        const isChecked = selectedGroupIds.includes(g.id);
        const rate = g.teacherHourlyRate || 100;
        const groupGradeLabel = g.course?.grade?.name || g.course?.subject?.grade?.name || g.course?.degree || '';
        return `
          <label class="acp-group-row ${isChecked ? 'selected' : ''}" style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 14px; border-radius:12px; background:${isChecked ? 'rgba(2,132,199,0.07)' : 'var(--bg-card)'}; border:1.5px solid ${isChecked ? '#0284c7' : 'var(--border-color)'}; cursor:pointer; user-select:none; transition:all 0.15s ease;">
            <div style="display:flex; align-items:center; gap:11px;">
              <input type="checkbox" class="acm-group-check" value="${g.id}" data-rate="${rate}" ${isChecked ? 'checked' : ''} style="width:18px; height:18px; accent-color:#0284c7; cursor:pointer;">
              <div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-weight:900; font-size:0.88rem; color:var(--text-main);">${g.course?.subject?.name || g.name}</span>
                  ${groupGradeLabel ? `<span class="badge" style="background:rgba(2,132,199,0.1); color:#0284c7; font-size:0.68rem; padding:2px 7px; border-radius:6px; font-weight:700;">🎓 ${groupGradeLabel}</span>` : ''}
                </div>
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

      // تفعيل تغيير الستايل وتحديث قائمة المحدد عند النقر
      groupsContainer.querySelectorAll(".acm-group-check").forEach(cb => {
        cb.addEventListener("change", e => {
          const val = e.target.value;
          if (e.target.checked) {
            if (!selectedGroupIds.includes(val)) selectedGroupIds.push(val);
          } else {
            const idx = selectedGroupIds.indexOf(val);
            if (idx > -1) selectedGroupIds.splice(idx, 1);
          }

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

      if (window.lucide) window.lucide.createIcons();
      updateSelectionStats();
    };

    // ربط تفاعلات اختيار الصفوف
    const bindGradeCheckEvents = () => {
      overlay.querySelectorAll(".acm-grade-check").forEach(cb => {
        cb.addEventListener("change", e => {
          const pill = e.target.closest("label");
          if (pill) {
            if (e.target.checked) {
              pill.classList.add("active");
              pill.style.background = "rgba(2,132,199,0.12)";
              pill.style.borderColor = "#0284c7";
            } else {
              pill.classList.remove("active");
              pill.style.background = "var(--bg-card)";
              pill.style.borderColor = "var(--border-color)";
            }
          }
          updateGradeCounter();
          renderGroupsForSelectedGrades(getSelectedGradeIds());
        });
      });
    };

    // أزرار الاختيار السريع للمراحل
    overlay.querySelectorAll(".acm-quick-stage-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const stage = btn.getAttribute("data-stage");
        overlay.querySelectorAll(`.acm-grade-check[data-stage="${stage}"]`).forEach(cb => {
          cb.checked = true;
          const pill = cb.closest("label");
          if (pill) {
            pill.classList.add("active");
            pill.style.background = "rgba(2,132,199,0.12)";
            pill.style.borderColor = "#0284c7";
          }
        });
        updateGradeCounter();
        renderGroupsForSelectedGrades(getSelectedGradeIds());
      });
    });

    overlay.querySelector(".acm-clear-grades-btn")?.addEventListener("click", () => {
      overlay.querySelectorAll(".acm-grade-check").forEach(cb => {
        cb.checked = false;
        const pill = cb.closest("label");
        if (pill) {
          pill.classList.remove("active");
          pill.style.background = "var(--bg-card)";
          pill.style.borderColor = "var(--border-color)";
        }
      });
      updateGradeCounter();
      renderGroupsForSelectedGrades([]);
    });

    bindGradeCheckEvents();
    renderGroupsForSelectedGrades(initialSelectedGradeIds);

    const closeModal = () => overlay.remove();
    overlay.querySelector("#acm-close-x")?.addEventListener("click", closeModal);
    overlay.querySelector("#acm-cancel")?.addEventListener("click", closeModal);
    overlay.addEventListener("click", e => { if (e.target === overlay) closeModal(); });

    overlay.querySelector("#acm-save").addEventListener("click", async () => {
      const name = overlay.querySelector("#acm-name").value.trim();
      const badge = overlay.querySelector("#acm-badge").value.trim();
      const priceEg = overlay.querySelector("#acm-price-eg").value.trim();
      const theme = overlay.querySelector("#acm-theme").value;
      const description = overlay.querySelector("#acm-desc").value.trim();
      const isActive = overlay.querySelector("#acm-active").checked;

      const checkedGradeIds = getSelectedGradeIds();
      if (checkedGradeIds.length === 0) {
        showToast("يرجى اختيار صف دراسي واحد على الأقل", "error");
        return;
      }
      const primaryGradeId = checkedGradeIds[0];

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
        gradeId: primaryGradeId,
        gradeIds: checkedGradeIds,
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
          await apiFetch(`/admin/curriculum/grades/${primaryGradeId}/classes`, {
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
