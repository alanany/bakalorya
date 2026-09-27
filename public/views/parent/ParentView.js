import { apiFetch, state, showToast, t, getUserTimezone, getTimezoneInfo, formatSessionDateTime } from "../../app.js";

export default class ParentView {
  constructor(container) {
    this.container = container;
    this._activeChildId = null;
    this._activeTab = "schedule";
    this._children = [];
    this._data = {};
    this.clockInterval = null;
  }

  async render() {
    if (!state.user || state.user.role !== "parent") {
      this.container.innerHTML = `
        <div style="text-align:center;padding:100px 24px;">
          <div style="font-size:3.5rem;margin-bottom:16px;">🚫</div>
          <h2 style="font-weight:800;color:var(--text-main);margin-bottom:8px;">غير مصرح بالدخول</h2>
          <p style="color:var(--text-muted);margin-bottom:24px;">هذه البوابة مخصصة فقط لأولياء الأمور المعتمدين.</p>
          <a href="#landing" class="btn-primary" style="padding:10px 24px;border-radius:24px;text-decoration:none;">الصفحة الرئيسية</a>
        </div>
      `;
      return;
    }

    this.container.innerHTML = this._skeleton();

    try {
      this._children = await apiFetch("/parent/children");
    } catch (e) {
      this._children = [];
    }

    if (this._children.length > 0 && !this._activeChildId) {
      this._activeChildId = this._children[0].student.id;
    }

    await this._renderDashboard();
    this._startLiveClock();
    this._attachListeners();
  }

  _skeleton() {
    return `
      <div style="width:100%;max-width:1440px;margin:0 auto;padding:40px 20px;text-align:center;color:var(--text-muted);">
        <div class="spinner" style="width:48px;height:48px;margin:0 auto 20px;border-color:var(--primary) transparent var(--primary) transparent;"></div>
        <p style="font-size:1.05rem;font-weight:700;">جاري تحميل بوابة ولي الأمر الذكية...</p>
      </div>
    `;
  }

  async _renderDashboard() {
    const hasChildren = this._children.length > 0;
    const activeChild = this._children.find(c => c.student.id === this._activeChildId) || this._children[0];

    // Load active child's data
    if (this._activeChildId && (!this._data[this._activeChildId] || !this._data[this._activeChildId].billing)) {
      try {
        const [groups, sessions, grades, billing] = await Promise.all([
          apiFetch(`/parent/children/${this._activeChildId}/groups`).catch(() => []),
          apiFetch(`/parent/children/${this._activeChildId}/sessions`).catch(() => []),
          apiFetch(`/parent/children/${this._activeChildId}/grades`).catch(() => []),
          apiFetch(`/parent/children/${this._activeChildId}/billing`).catch(() => ({ summary: {}, activeSubscriptions: [], packages: [], payments: [] }))
        ]);
        this._data[this._activeChildId] = {
          groups: Array.isArray(groups) ? groups : [],
          sessions: Array.isArray(sessions) ? sessions : [],
          grades: Array.isArray(grades) ? grades : [],
          billing: billing || { summary: {}, activeSubscriptions: [], packages: [], payments: [] }
        };
      } catch (e) {
        this._data[this._activeChildId] = { groups: [], sessions: [], grades: [], billing: { summary: {}, activeSubscriptions: [], packages: [], payments: [] } };
      }
    }

    const data = this._activeChildId ? (this._data[this._activeChildId] || { groups: [], sessions: [], grades: [], billing: {} }) : { groups: [], sessions: [], grades: [], billing: {} };
    const billing = data.billing || { summary: {}, activeSubscriptions: [], packages: [], payments: [] };

    // Calculations
    const now = new Date();
    const hour = now.getHours();
    const timeGreeting = hour >= 5 && hour < 12 ? "صباح الخير والهمة" : (hour >= 12 && hour < 17 ? "مساء النور والنشاط" : "مساء الخير والتفوق");
    const greetingIcon = hour >= 5 && hour < 18 ? "sun" : "moon";

    const userTz = getUserTimezone();
    const tzInfo = getTimezoneInfo(userTz);

    const parentName = state.user?.name || "ولي الأمر";
    const parentAvatar = (state.user?.avatar && !state.user.avatar.includes('dicebear.com')) ? state.user.avatar : 'assets/logo.png';

    // Child metric calculations
    const sessionsCount = data.sessions.length;
    const groupsCount = data.groups.length;
    const gradedList = data.grades.filter(g => g.grade != null && g.assignment?.maxGrade);
    const gradedCount = gradedList.length;
    const avgGradePct = gradedList.length > 0
      ? Math.round(gradedList.reduce((sum, g) => sum + (g.grade / g.assignment.maxGrade) * 100, 0) / gradedList.length)
      : 0;

    // SVG Circular Ring Offsets (circumference ≈ 226 for r=36)
    const circ = 226;
    const sessionsOffset = Math.max(0, circ - Math.min(sessionsCount / 8, 1) * circ);
    const groupsOffset = Math.max(0, circ - Math.min(groupsCount / 6, 1) * circ);
    const gradedOffset = Math.max(0, circ - Math.min(gradedCount / 12, 1) * circ);
    const avgOffset = Math.max(0, circ - Math.min(avgGradePct / 100, 1) * circ);

    // Extract unique teachers for active child
    const teachersMap = new Map();
    data.groups.forEach(g => {
      const tObj = g.group?.teacher;
      if (tObj && !teachersMap.has(tObj.id)) {
        teachersMap.set(tObj.id, {
          id: tObj.id,
          name: tObj.name,
          avatar: (tObj.avatar && !tObj.avatar.includes('dicebear.com')) ? tObj.avatar : 'assets/logo.png',
          courses: [g.group?.course?.title || g.group?.name || 'مادة دراسية']
        });
      } else if (tObj && teachersMap.has(tObj.id)) {
        const item = teachersMap.get(tObj.id);
        const title = g.group?.course?.title || g.group?.name;
        if (title && !item.courses.includes(title)) item.courses.push(title);
      }
    });
    const teachersList = Array.from(teachersMap.values());

    // Next upcoming/live session
    const nextSession = data.sessions.find(s => {
      const diff = new Date(s.scheduledAt).getTime() - now.getTime();
      return diff > -3600000; // scheduled within last hour or future
    }) || data.sessions[0];

    this.container.innerHTML = `
      <style>
        .parent-dashboard-modern {
          animation: fadeInParent 0.35s ease-out;
        }
        @keyframes fadeInParent {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-parent-banner {
          position: relative;
          overflow: hidden;
          border-radius: 28px;
          padding: 30px 34px;
          margin-bottom: 24px;
          background: linear-gradient(135deg, rgba(99,102,241,0.14) 0%, rgba(168,85,247,0.09) 50%, rgba(16,185,129,0.08) 100%);
          border: 1.5px solid rgba(99,102,241,0.25);
          box-shadow: 0 12px 36px rgba(0,0,0,0.06);
        }
        .parent-live-clock-card {
          background: rgba(15, 15, 23, 0.55);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(99,102,241,0.3);
          border-radius: 24px;
          padding: 16px 20px;
          box-shadow: 0 12px 32px rgba(0,0,0,0.25), inset 0 0 24px rgba(99,102,241,0.08);
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 290px;
        }
        /* 2-Section Column Layout for Parent Dashboard */
        .parent-dashboard-2col-layout {
          display: flex;
          gap: 24px;
          align-items: flex-start;
          margin-top: 8px;
        }
        .parent-children-sidebar {
          width: 320px;
          flex-shrink: 0;
          position: sticky;
          top: 84px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          z-index: 10;
        }
        .children-sidebar-header {
          padding: 18px;
          border-radius: 22px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.02);
        }
        .parent-children-vertical-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .child-switcher-pod {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 18px;
          border: 1.5px solid var(--border-color);
          background: var(--bg-app);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          color: var(--text-main);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
          text-align: right;
          width: 100%;
          box-sizing: border-box;
        }
        .child-switcher-pod:hover {
          transform: translateY(-2px);
          border-color: rgba(99, 102, 241, 0.4);
          background: var(--bg-card);
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.1);
        }
        .child-switcher-pod.active {
          border-color: #6366f1;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.06) 100%, var(--bg-card));
          box-shadow: 0 8px 22px rgba(99, 102, 241, 0.18);
          border-width: 2px;
        }
        .child-circle-avatar-wrapper {
          position: relative;
          width: 52px;
          height: 52px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .child-circle-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          object-fit: cover;
          border: 2.5px solid rgba(99, 102, 241, 0.25);
          background: var(--bg-card);
          transition: all 0.25s ease;
        }
        .child-switcher-pod.active .child-circle-avatar {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.22), 0 4px 14px rgba(99, 102, 241, 0.25);
          transform: scale(1.05);
        }
        .child-active-badge {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #10b981;
          color: #ffffff;
          border: 2px solid var(--bg-card);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .child-circle-name {
          font-weight: 900;
          font-size: 0.95rem;
          color: var(--text-main);
          margin-bottom: 2px;
          line-height: 1.25;
        }
        .child-circle-tag {
          font-size: 0.74rem;
          color: var(--text-muted);
          font-weight: 600;
          line-height: 1.35;
        }
        .child-current-indicator {
          font-size: 0.68rem;
          font-weight: 800;
          color: #6366f1;
          background: rgba(99, 102, 241, 0.12);
          padding: 2px 8px;
          border-radius: 10px;
          border: 1px solid rgba(99, 102, 241, 0.25);
          white-space: nowrap;
        }
        .child-switch-hint {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--text-muted);
          white-space: nowrap;
        }
        .parent-child-workspace {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        @media (max-width: 1024px) {
          .parent-dashboard-2col-layout {
            flex-direction: column;
          }
          .parent-children-sidebar {
            width: 100%;
            position: static;
          }
          .parent-children-vertical-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 10px;
          }
        }
        .circular-metrics-hub {
          padding: 22px 24px;
          border-radius: 26px;
          border: 1px solid var(--border-color);
          background: var(--bg-card);
          margin-bottom: 26px;
          display: flex;
          justify-content: space-around;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.03);
        }
        .circle-stat-pod {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .circle-stat-pod:hover {
          transform: translateY(-4px) scale(1.03);
        }
        .circle-ring-wrapper {
          position: relative;
          width: 84px;
          height: 84px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: box-shadow 0.25s ease;
        }
        .circle-stat-pod:hover .circle-ring-wrapper {
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.25);
        }
        .circle-ring-value {
          position: absolute;
          text-align: center;
          font-family: 'Outfit', sans-serif;
          font-size: 1.3rem;
          font-weight: 900;
          color: var(--text-main);
          line-height: 1;
        }
        .circle-stat-label {
          font-size: 0.85rem;
          font-weight: 800;
          color: var(--text-main);
          text-align: center;
        }
        .circle-stat-sub {
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 700;
          text-align: center;
        }
        .parent-segmented-tabs {
          display: flex;
          gap: 6px;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 6px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          width: fit-content;
        }
        .parent-nav-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 22px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          font-size: 0.88rem;
          font-weight: 700;
          transition: all 0.2s ease;
          background: transparent;
          color: var(--text-muted);
        }
        .parent-nav-tab:hover {
          color: var(--text-main);
          background: rgba(255,255,255,0.05);
        }
        .parent-nav-tab.active {
          background: var(--primary);
          color: #fff;
          box-shadow: 0 4px 14px rgba(99,102,241,0.35);
        }
        .creative-live-stage {
          position: relative;
          border-radius: 24px;
          background: radial-gradient(circle at 95% 5%, rgba(16,185,129,0.12) 0%, transparent 40%), radial-gradient(circle at 5% 95%, rgba(99,102,241,0.08) 0%, transparent 40%), var(--bg-card);
          border: 1.5px solid rgba(16, 185, 129, 0.35);
          box-shadow: 0 16px 40px -12px rgba(16, 185, 129, 0.12);
          overflow: hidden;
          padding: 22px 24px;
          margin-bottom: 28px;
        }
        .child-focus-studio-card {
          margin-bottom: 24px;
          border-radius: 24px;
          padding: 22px 24px;
          background: linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.05) 50%, var(--bg-card) 100%);
          border: 1.5px solid rgba(99,102,241,0.22);
          box-shadow: 0 8px 30px rgba(0,0,0,0.03);
          position: relative;
          overflow: hidden;
        }
        .child-focus-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-top: 18px;
        }
        .child-focus-kpi-item {
          background: var(--bg-app);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 14px 16px;
          cursor: pointer;
          transition: all 0.22s ease;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .child-focus-kpi-item:hover {
          transform: translateY(-2px);
          border-color: rgba(99,102,241,0.35);
          box-shadow: 0 8px 20px rgba(99,102,241,0.08);
        }
        .group-card-hover {
          transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease, border-color 0.22s ease;
        }
        .group-card-hover:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 30px rgba(0,0,0,0.08);
          border-color: rgba(99,102,241,0.35) !important;
        }
        .compact-cohort-card {
          border-radius: 20px;
          border: 1px solid var(--border-color);
          background: var(--bg-card);
          padding: 20px;
          display: flex;
          flex-direction: column;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, border-color 0.25s ease;
          box-shadow: 0 6px 20px rgba(0,0,0,0.03);
          cursor: pointer;
        }
        .compact-cohort-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 32px rgba(0,0,0,0.07);
          border-color: rgba(99,102,241,0.35);
        }
        .teacher-contact-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          transition: all 0.25s ease;
          box-shadow: 0 4px 16px rgba(0,0,0,0.02);
        }
        .teacher-contact-card:hover {
          border-color: rgba(99,102,241,0.3);
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(99,102,241,0.08);
        }
      </style>

      <!-- SVG Gradients -->
      <svg width="0" height="0" style="position:absolute;visibility:hidden;">
        <defs>
          <linearGradient id="circ-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#10b981" />
            <stop offset="100%" stop-color="#059669" />
          </linearGradient>
          <linearGradient id="circ-indigo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#6366f1" />
            <stop offset="100%" stop-color="#3b82f6" />
          </linearGradient>
          <linearGradient id="circ-amber" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f59e0b" />
            <stop offset="100%" stop-color="#d97706" />
          </linearGradient>
          <linearGradient id="circ-purple" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ec4899" />
            <stop offset="100%" stop-color="#a855f7" />
          </linearGradient>
        </defs>
      </svg>

      <div class="parent-dashboard-modern" style="width:100%;max-width:1440px;margin:0 auto;padding:24px 20px 80px;box-sizing:border-box;">

        <!-- 1. Hero Studio Banner -->
        <div class="glass-card hero-parent-banner">
          <!-- Decorative Floating Glow Orbs -->
          <div style="position:absolute;top:-30px;left:-30px;width:160px;height:160px;background:radial-gradient(circle,rgba(99,102,241,0.25) 0%,rgba(99,102,241,0) 70%);border-radius:50%;pointer-events:none;"></div>
          <div style="position:absolute;bottom:-40px;right:-20px;width:180px;height:180px;background:radial-gradient(circle,rgba(16,185,129,0.2) 0%,rgba(16,185,129,0) 70%);border-radius:50%;pointer-events:none;"></div>

          <div style="position:relative;z-index:2;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:24px;">

            <!-- Left Info -->
            <div style="display:flex;align-items:center;gap:20px;flex:1;min-width:280px;">
              <div style="position:relative;flex-shrink:0;">
                <img src="${parentAvatar}" alt="${parentName}" style="width:74px;height:74px;border-radius:50%;border:3px solid #8b5cf6;object-fit:cover;background:var(--bg-app);box-shadow:0 8px 24px rgba(139,92,246,0.25);" onerror="this.src='assets/logo.png'" />
                <span style="position:absolute;bottom:2px;right:2px;width:16px;height:16px;background:#10b981;border:2px solid var(--bg-card);border-radius:50%;" title="متصل الآن"></span>
              </div>

              <div>
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px;">
                  <span style="font-size:0.85rem;font-weight:800;color:var(--primary);background:var(--primary-glow);padding:3px 12px;border-radius:20px;border:1px solid rgba(99,102,241,0.2);display:inline-flex;align-items:center;gap:4px;">
                    <i data-lucide="${greetingIcon}" style="width:13px;height:13px;"></i> ${timeGreeting}
                  </span>
                  <span style="font-size:0.8rem;font-weight:700;color:var(--text-muted);background:rgba(255,255,255,0.06);padding:3px 10px;border-radius:20px;">
                    👨‍👩‍👧‍👦 حساب ولي أمر معتمد
                  </span>
                </div>

                <h1 style="font-size:clamp(1.4rem, 4vw, 1.9rem);font-weight:900;margin:0 0 6px 0;color:var(--text-main);letter-spacing:-0.5px;">
                  أهلاً بك مجدداً، <span style="background:linear-gradient(135deg, var(--primary), #a855f7); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">${parentName}</span> 👋
                </h1>

                <!-- Quick Metadata Line -->
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px;margin-bottom:4px;">
                  ${activeChild ? `
                    <span class="badge" style="font-size:0.82rem;font-weight:800;color:var(--primary);background:rgba(99,102,241,0.12);padding:4px 12px;border-radius:20px;border:1px solid rgba(99,102,241,0.25);display:inline-flex;align-items:center;gap:5px;">
                      👧 متابعة الطالب: <strong>${activeChild.student.name}</strong>
                    </span>
                    ${activeChild.student.education ? `
                      <span class="badge" style="font-size:0.78rem;font-weight:700;color:#10b981;background:rgba(16,185,129,0.12);padding:4px 10px;border-radius:20px;">
                        🎓 ${activeChild.student.education}
                      </span>
                    ` : ''}
                    <span class="badge" style="font-size:0.75rem;font-weight:700;color:var(--text-muted);background:rgba(255,255,255,0.05);padding:4px 10px;border-radius:20px;">
                      صلة القرابة: ${activeChild.relationship || 'ولي أمر'}
                    </span>
                  ` : ''}
                  ${state.user?.location ? `
                    <span class="badge" style="font-size:0.75rem;font-weight:700;color:var(--text-muted);background:rgba(255,255,255,0.05);padding:4px 10px;border-radius:20px;display:inline-flex;align-items:center;gap:4px;">
                      📍 ${state.user.location}
                    </span>
                  ` : ''}
                  <a href="#settings" style="color:var(--primary);font-size:0.78rem;font-weight:800;text-decoration:underline;padding:0 4px;display:inline-flex;align-items:center;gap:3px;">
                    <i data-lucide="settings" style="width:13px;height:13px;"></i> الإعدادات ⚙️
                  </a>
                </div>

                <p style="color:var(--text-muted);font-size:0.88rem;margin:4px 0 0 0;line-height:1.5;">
                  متابعة المسار الأكاديمي، الحضور المباشر، ونتائج أبنائك خطوة بخطوة بكل شفافية واحترافية.
                </p>
              </div>
            </div>

            <!-- Right Live Date, Time & Action Studio Widget -->
            <div class="glass-card parent-live-clock-card">
              <!-- Date & Day Header -->
              <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px;">
                <div style="display:flex;align-items:center;gap:6px;">
                  <span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:8px;background:rgba(99,102,241,0.2);color:var(--primary);">
                    <i data-lucide="calendar" style="width:13px;height:13px;"></i>
                  </span>
                  <span id="parent-live-day" style="color:var(--primary);font-weight:800;font-size:0.9rem;">-</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                  <span id="parent-live-date" style="font-size:0.8rem;font-weight:700;color:var(--text-main);">-</span>
                  <span class="tz-badge" style="display:inline-flex;align-items:center;gap:3px;font-size:0.72rem;font-weight:800;background:rgba(99,102,241,0.18);color:#a5b4fc;padding:2px 8px;border-radius:12px;border:1px solid rgba(99,102,241,0.3);">
                    ${tzInfo.flag} ${tzInfo.name}
                  </span>
                </div>
              </div>

              <!-- Live Clock & Status -->
              <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
                <div style="display:flex;align-items:baseline;gap:6px;">
                  <span id="parent-live-time" style="font-family:'Outfit',monospace,sans-serif;font-size:1.75rem;font-weight:900;letter-spacing:1px;color:#ffffff;text-shadow:0 0 20px rgba(99,102,241,0.6);">
                    00:00:00
                  </span>
                  <span id="parent-live-ampm" style="font-size:0.75rem;font-weight:800;color:#a5b4fc;background:rgba(99,102,241,0.15);padding:2px 6px;border-radius:6px;">--</span>
                </div>

                <div style="display:inline-flex;align-items:center;gap:5px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.35);padding:4px 9px;border-radius:20px;font-size:0.72rem;font-weight:800;color:#10b981;">
                  <span style="width:6px;height:6px;background:#10b981;border-radius:50%;box-shadow:0 0 8px #10b981;"></span>
                  <span>مباشر</span>
                </div>
              </div>

              <!-- Prayer Times Trigger Button -->
              <button id="parent-open-prayer-btn" style="width:100%;margin-top:4px;padding:8px 14px;font-weight:800;font-size:0.8rem;border-radius:14px;border:1px solid rgba(16,185,129,0.35);color:#10b981;background:rgba(16,185,129,0.08);display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;transition:all 0.2s;">
                <i data-lucide="moon-star" style="width:15px;height:15px;"></i> مواقيت الصلاة لليوم 🕌
              </button>
            </div>

          </div>
        </div>

        ${!hasChildren ? this._noChildrenView() : `
          <!-- ── Main 2-Section Column Dashboard Layout (Child right sidebar, Data left workspace) ── -->
          <div class="parent-dashboard-2col-layout">
            
            <!-- ── 1. Right Column: Children Selector Sidebar ── -->
            <aside class="parent-children-sidebar">
              <div class="children-sidebar-header">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                  <span style="width:32px; height:32px; border-radius:10px; background:rgba(99,102,241,0.12); color:var(--primary); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <i data-lucide="users" style="width:17px;height:17px;"></i>
                  </span>
                  <h3 style="font-size:1.02rem; font-weight:900; color:var(--text-main); margin:0;">اختر الطالب لمتابعة بياناته:</h3>
                </div>
                <div style="font-size:0.78rem; color:var(--text-muted); font-weight:700; line-height:1.45; margin-bottom:14px;">
                  انقر على بطاقة أي من أبنائك للتبديل ومتابعة خطته الدراسية
                </div>

                <div class="parent-children-vertical-list">
                  ${this._children.map(c => {
                    const isSelected = c.student.id === this._activeChildId;
                    const cData = this._data[c.student.id] || { groups: [], sessions: [], grades: [] };
                    const cAvatar = (c.student.avatar && !c.student.avatar.includes('dicebear.com')) ? c.student.avatar : 'assets/logo.png';
                    return `
                      <div class="child-switcher-pod ${isSelected ? 'active' : ''}" data-child-id="${c.student.id}" role="button" tabindex="0" title="عرض ومتابعة بيانات الطالب ${c.student.name}">
                        <div class="child-circle-avatar-wrapper">
                          <img src="${cAvatar}" 
                               class="child-circle-avatar" 
                               onerror="this.src='assets/logo.png'" />
                          ${isSelected ? `
                            <span class="child-active-badge">
                              <i data-lucide="check" style="width:11px;height:11px;stroke-width:3.5;"></i>
                            </span>
                          ` : ''}
                        </div>
                        <div style="flex:1; min-width:0;">
                          <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin-bottom:2px;">
                            <div class="child-circle-name" title="${c.student.name}">${c.student.name}</div>
                            ${isSelected ? `
                              <span class="child-current-indicator">المحدد 🎯</span>
                            ` : `
                              <span class="child-switch-hint">تبديل 👈</span>
                            `}
                          </div>
                          <div class="child-circle-tag">
                            <span>${c.relationship || 'ابن/ابنة'}</span>
                            ${c.student.education ? `<span> · 🎓 ${c.student.education}</span>` : ''}
                          </div>
                          <div style="margin-top:6px; display:flex; align-items:center; gap:6px; font-size:0.72rem; color:var(--text-muted); font-weight:700;">
                            <span style="background:rgba(99,102,241,0.08); color:var(--primary); padding:2px 7px; border-radius:6px; display:inline-flex; align-items:center; gap:3px;">
                              📚 ${cData.groups.length} مجموعات
                            </span>
                            <span style="background:rgba(16,185,129,0.08); color:#10b981; padding:2px 7px; border-radius:6px; display:inline-flex; align-items:center; gap:3px;">
                              📅 ${cData.sessions.length} حصص
                            </span>
                          </div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>

                <!-- Children Count Badge -->
                <div style="margin-top:14px; padding:10px 12px; border-radius:14px; background:rgba(0,0,0,0.02); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between; font-size:0.76rem; color:var(--text-muted); font-weight:700;">
                  <span>إجمالي الأبناء المربوطين:</span>
                  <span class="badge" style="background:rgba(99,102,241,0.12); color:var(--primary); font-weight:800; padding:2px 8px; border-radius:8px;">${this._children.length} طلاب</span>
                </div>
              </div>

              <!-- Quick Helper Info Card -->
              <div class="glass-card" style="padding:14px 16px; border-radius:20px; border:1px solid rgba(99,102,241,0.2); background:linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.03)); display:flex; align-items:flex-start; gap:10px;">
                <span style="font-size:1.2rem; flex-shrink:0;">🛡️</span>
                <div style="font-size:0.77rem; color:var(--text-muted); line-height:1.45; font-weight:600;">
                  يتم تحديث تقارير الحضور والتقييمات للابن المحدد مباشرةً وتلقائياً بالتزامن مع فصوله التعليمية.
                </div>
              </div>
            </aside>

            <!-- ── 2. Left Column: All Data Related to Active Child ── -->
            <main class="parent-child-workspace">

          <!-- 2.5 Child Focus Academic Spotlight Banner (مركز التركيز والمتابعة الأكاديمية للطالب) -->
          ${activeChild ? `
            <div class="glass-card child-focus-studio-card">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:16px;">
                <div style="display:flex;align-items:center;gap:14px;">
                  <div style="position:relative;">
                    <img src="${(activeChild.student.avatar && !activeChild.student.avatar.includes('dicebear.com')) ? activeChild.student.avatar : 'assets/logo.png'}"
                      style="width:56px;height:56px;border-radius:18px;object-fit:cover;border:2.5px solid #6366f1;box-shadow:0 6px 18px rgba(99,102,241,0.25);"
                      onerror="this.src='assets/logo.png'" />
                    <span style="position:absolute;bottom:-2px;right:-2px;width:14px;height:14px;background:#10b981;border:2px solid var(--bg-card);border-radius:50%;"></span>
                  </div>
                  <div>
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px;">
                      <h2 style="margin:0;font-size:1.15rem;font-weight:900;color:var(--text-main);">
                        ${activeChild.student.name}
                      </h2>
                      <span style="font-size:0.75rem;font-weight:800;background:rgba(99,102,241,0.12);color:var(--primary);padding:2px 10px;border-radius:12px;border:1px solid rgba(99,102,241,0.25);">
                        مركز التركيز الأكاديمي 🎯
                      </span>
                    </div>
                    <div style="font-size:0.8rem;color:var(--text-muted);display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                      <span>🎓 ${activeChild.student.education || 'المرحلة الدراسية غير محددة'}</span>
                      <span>· 👨‍👩‍👧 ${activeChild.relationship || 'ابن/ابنة'}</span>
                      ${nextSession && (nextSession.status === 'live' || nextSession.status === 'LIVE' || nextSession.status === 'active') ? `
                        <span style="color:#ef4444;font-weight:800;display:inline-flex;align-items:center;gap:4px;">
                          <span style="width:6px;height:6px;border-radius:50%;background:#ef4444;"></span> بث مباشر الآن 🔴
                        </span>
                      ` : nextSession ? `
                        <span style="color:#10b981;font-weight:700;">
                          ⏰ الحصة القادمة: ${formatSessionDateTime(nextSession.scheduledAt)}
                        </span>
                      ` : `
                        <span style="color:var(--text-muted);">🟢 الحساب نشط وجاهز</span>
                      `}
                    </div>
                  </div>
                </div>

                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                  <button data-switch-tab="billing" class="btn-secondary" style="padding:9px 14px;border-radius:14px;font-size:0.82rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;border:1px solid rgba(16,185,129,0.3);color:#10b981;background:rgba(16,185,129,0.06);">
                    <i data-lucide="credit-card" style="width:14px;height:14px;"></i> الفواتير والاشتراكات 💳
                  </button>
                  <a href="#courses" class="btn-primary" style="padding:9px 18px;border-radius:14px;font-size:0.82rem;font-weight:800;text-decoration:none;display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg, #6366f1, #8b5cf6);color:#fff;box-shadow:0 4px 14px rgba(99,102,241,0.25);">
                    <i data-lucide="plus-circle" style="width:14px;height:14px;"></i> تسجيل كورس جديد 📚
                  </a>
                  <button data-switch-tab="teachers" class="btn-secondary" style="padding:9px 14px;border-radius:14px;font-size:0.82rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;">
                    <i data-lucide="users" style="width:14px;height:14px;"></i> كادر الأساتذة (${teachersList.length})
                  </button>
                </div>
              </div>

              <!-- 4 Focus KPI Action Tiles -->
              <div class="child-focus-kpi-grid">
                <!-- KPI 1: Groups -->
                <div class="child-focus-kpi-item" data-switch-tab="groups" title="عرض كافة المجموعات والكورسات">
                  <div style="width:42px;height:42px;border-radius:12px;background:rgba(99,102,241,0.12);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">
                    👥
                  </div>
                  <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                      <span style="font-size:0.78rem;font-weight:700;color:var(--text-muted);">المجموعات والكورسات</span>
                      <span style="font-size:0.7rem;font-weight:800;color:${groupsCount > 0 ? 'var(--primary)' : '#d97706'};background:${groupsCount > 0 ? 'rgba(99,102,241,0.1)' : 'rgba(245,158,11,0.12)'};padding:1px 7px;border-radius:8px;">
                        ${groupsCount > 0 ? 'نشطة ⚡' : 'غير مسجل ⚠️'}
                      </span>
                    </div>
                    <div style="font-size:1.25rem;font-weight:900;color:var(--text-main);line-height:1.2;margin-top:2px;">
                      ${groupsCount} <span style="font-size:0.75rem;font-weight:600;color:var(--text-muted);">مجموعة</span>
                    </div>
                  </div>
                </div>

                <!-- KPI 2: Sessions -->
                <div class="child-focus-kpi-item" data-switch-tab="schedule" title="عرض جدول الحصص الأسبوعي">
                  <div style="width:42px;height:42px;border-radius:12px;background:rgba(16,185,129,0.12);color:#10b981;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">
                    📅
                  </div>
                  <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                      <span style="font-size:0.78rem;font-weight:700;color:var(--text-muted);">جدول الحصص</span>
                      <span style="font-size:0.7rem;font-weight:800;color:${sessionsCount > 0 ? '#10b981' : 'var(--text-muted)'};background:${sessionsCount > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.06)'};padding:1px 7px;border-radius:8px;">
                        ${sessionsCount > 0 ? 'مجدولة 🕒' : 'لا حصص'}
                      </span>
                    </div>
                    <div style="font-size:1.25rem;font-weight:900;color:var(--text-main);line-height:1.2;margin-top:2px;">
                      ${sessionsCount} <span style="font-size:0.75rem;font-weight:600;color:var(--text-muted);">حصة</span>
                    </div>
                  </div>
                </div>

                <!-- KPI 3: Grades -->
                <div class="child-focus-kpi-item" data-switch-tab="grades" title="عرض الواجبات والدرجات">
                  <div style="width:42px;height:42px;border-radius:12px;background:rgba(245,158,11,0.12);color:#f59e0b;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">
                    📝
                  </div>
                  <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                      <span style="font-size:0.78rem;font-weight:700;color:var(--text-muted);">الواجبات والتقييمات</span>
                      <span style="font-size:0.7rem;font-weight:800;color:${gradedCount > 0 ? '#d97706' : 'var(--text-muted)'};background:rgba(245,158,11,0.1);padding:1px 7px;border-radius:8px;">
                        ${gradedCount > 0 ? 'مصححة ✅' : 'بانتظار الرصد'}
                      </span>
                    </div>
                    <div style="font-size:1.25rem;font-weight:900;color:var(--text-main);line-height:1.2;margin-top:2px;">
                      ${gradedCount} <span style="font-size:0.75rem;font-weight:600;color:var(--text-muted);">من أصل ${data.grades.length}</span>
                    </div>
                  </div>
                </div>

                <!-- KPI 4: Academic Average -->
                <div class="child-focus-kpi-item" data-switch-tab="grades" title="عرض معدل التحصيل">
                  <div style="width:42px;height:42px;border-radius:12px;background:rgba(168,85,247,0.12);color:#a855f7;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">
                    ⭐
                  </div>
                  <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                      <span style="font-size:0.78rem;font-weight:700;color:var(--text-muted);">متوسط التحصيل</span>
                      <span style="font-size:0.7rem;font-weight:800;color:${avgGradePct >= 80 ? '#10b981' : avgGradePct >= 60 ? '#d97706' : '#a855f7'};background:rgba(168,85,247,0.1);padding:1px 7px;border-radius:8px;">
                        ${avgGradePct >= 80 ? 'تفوق 🌟' : avgGradePct >= 60 ? 'جيد جداً 📈' : avgGradePct > 0 ? 'مقبول' : 'لم يرصد'}
                      </span>
                    </div>
                    <div style="font-size:1.25rem;font-weight:900;color:var(--text-main);line-height:1.2;margin-top:2px;">
                      ${avgGradePct}% <span style="font-size:0.75rem;font-weight:600;color:var(--text-muted);">معدل عام</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Quick Focus Note if 0 groups -->
              ${groupsCount === 0 ? `
                <div style="margin-top:14px;padding:12px 16px;border-radius:14px;background:rgba(99,102,241,0.06);border:1px dashed rgba(99,102,241,0.25);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                  <div style="display:flex;align-items:center;gap:8px;font-size:0.83rem;color:var(--text-main);font-weight:700;">
                    <i data-lucide="sparkles" style="width:16px;height:16px;color:var(--primary);"></i>
                    <span>الطالب غير مقيد في أي مجموعة دراسية حالياً. يمكنك تسجيله في الدورات المناسبة لصفه لتفعيل الحصص والدرجات.</span>
                  </div>
                  <a href="#courses" class="btn-primary" style="padding:6px 14px;border-radius:10px;font-size:0.8rem;font-weight:800;text-decoration:none;display:inline-flex;align-items:center;gap:5px;">
                    استكشف الدورات 📚
                  </a>
                </div>
              ` : ''}
            </div>
          ` : ''}

          <!-- 3. Circular Metrics Hub (دوائر الإنجاز والتقدم الذكي للأبناء) -->
          <div class="glass-card circular-metrics-hub">
            <!-- Circle 1: Upcoming Sessions -->
            <div class="circle-stat-pod" data-switch-tab="schedule" title="عرض جدول الحصص واللقاءات المباشرة">
              <div class="circle-ring-wrapper">
                <svg width="84" height="84" viewBox="0 0 84 84">
                  <circle cx="42" cy="42" r="36" fill="transparent" stroke="rgba(16,185,129,0.12)" stroke-width="6.5" />
                  <circle cx="42" cy="42" r="36" fill="transparent" stroke="url(#circ-emerald)" stroke-width="6.5" stroke-dasharray="226" stroke-dashoffset="${sessionsOffset}" stroke-linecap="round" style="transform:rotate(-90deg);transform-origin:42px 42px;transition:stroke-dashoffset 0.8s ease;" />
                </svg>
                <div class="circle-ring-value" style="color:#10b981;">
                  ${sessionsCount}
                </div>
              </div>
              <div style="text-align:center;">
                <div class="circle-stat-label">جدول الحصص</div>
                <div class="circle-stat-sub">بث مباشر 🔴</div>
              </div>
            </div>

            <!-- Circle 2: Enrolled Groups -->
            <div class="circle-stat-pod" data-switch-tab="groups" title="عرض المجموعات والكورسات">
              <div class="circle-ring-wrapper">
                <svg width="84" height="84" viewBox="0 0 84 84">
                  <circle cx="42" cy="42" r="36" fill="transparent" stroke="rgba(99,102,241,0.12)" stroke-width="6.5" />
                  <circle cx="42" cy="42" r="36" fill="transparent" stroke="url(#circ-indigo)" stroke-width="6.5" stroke-dasharray="226" stroke-dashoffset="${groupsOffset}" stroke-linecap="round" style="transform:rotate(-90deg);transform-origin:42px 42px;transition:stroke-dashoffset 0.8s ease;" />
                </svg>
                <div class="circle-ring-value" style="color:var(--primary);">
                  ${groupsCount}
                </div>
              </div>
              <div style="text-align:center;">
                <div class="circle-stat-label">المجموعات والكورسات</div>
                <div class="circle-stat-sub">فصول نشطة 📚</div>
              </div>
            </div>

            <!-- Circle 3: Graded Assignments -->
            <div class="circle-stat-pod" data-switch-tab="grades" title="عرض الواجبات والتقييمات">
              <div class="circle-ring-wrapper">
                <svg width="84" height="84" viewBox="0 0 84 84">
                  <circle cx="42" cy="42" r="36" fill="transparent" stroke="rgba(245,158,11,0.12)" stroke-width="6.5" />
                  <circle cx="42" cy="42" r="36" fill="transparent" stroke="url(#circ-amber)" stroke-width="6.5" stroke-dasharray="226" stroke-dashoffset="${gradedOffset}" stroke-linecap="round" style="transform:rotate(-90deg);transform-origin:42px 42px;transition:stroke-dashoffset 0.8s ease;" />
                </svg>
                <div class="circle-ring-value" style="color:#f59e0b;">
                  ${gradedCount}
                </div>
              </div>
              <div style="text-align:center;">
                <div class="circle-stat-label">الدرجات والواجبات</div>
                <div class="circle-stat-sub">تم التصحيح 📝</div>
              </div>
            </div>

            <!-- Circle 4: Average Score -->
            <div class="circle-stat-pod" data-switch-tab="grades" title="معدل درجات الطالب">
              <div class="circle-ring-wrapper">
                <svg width="84" height="84" viewBox="0 0 84 84">
                  <circle cx="42" cy="42" r="36" fill="transparent" stroke="rgba(168,85,247,0.12)" stroke-width="6.5" />
                  <circle cx="42" cy="42" r="36" fill="transparent" stroke="url(#circ-purple)" stroke-width="6.5" stroke-dasharray="226" stroke-dashoffset="${avgOffset}" stroke-linecap="round" style="transform:rotate(-90deg);transform-origin:42px 42px;transition:stroke-dashoffset 0.8s ease;" />
                </svg>
                <div class="circle-ring-value" style="color:#a855f7;">
                  ${avgGradePct}%
                </div>
              </div>
              <div style="text-align:center;">
                <div class="circle-stat-label">متوسط التحصيل</div>
                <div class="circle-stat-sub">مستوى التفوق ⭐</div>
              </div>
            </div>
          </div>

          <!-- 4. Next Scheduled Session Spotlight (if available) -->
          ${nextSession ? `
            <div class="creative-live-stage">
              <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
                <div style="display:flex;align-items:center;gap:16px;">
                  <div style="width:52px;height:52px;border-radius:16px;background:rgba(16,185,129,0.15);color:#10b981;display:flex;align-items:center;justify-content:center;font-size:1.6rem;flex-shrink:0;">
                    ${(nextSession.status === 'live' || nextSession.status === 'LIVE' || nextSession.status === 'active') ? '🔴' : '📅'}
                  </div>
                  <div>
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;">
                      <span class="badge" style="background:${(nextSession.status === 'live' || nextSession.status === 'LIVE' || nextSession.status === 'active') ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'};color:${(nextSession.status === 'live' || nextSession.status === 'LIVE' || nextSession.status === 'active') ? '#ef4444' : '#10b981'};font-weight:800;font-size:0.75rem;padding:2px 10px;border-radius:12px;">
                        ${(nextSession.status === 'live' || nextSession.status === 'LIVE' || nextSession.status === 'active') ? 'بث مباشر الآن 🔴' : 'الحصة القادمة ⏰'}
                      </span>
                      <span style="font-size:0.8rem;color:var(--text-muted);">${nextSession.group?.name || 'مجموعة دراسية'}</span>
                    </div>
                    <h3 style="margin:0 0 2px 0;font-size:1.05rem;font-weight:800;color:var(--text-main);">${nextSession.title || nextSession.course?.title || 'حصة تعليمية'}</h3>
                    <p style="margin:0;font-size:0.82rem;color:var(--text-muted);">
                      ${formatSessionDateTime(nextSession.scheduledAt)} · مدة الحصة: ${nextSession.duration || 60} دقيقة
                    </p>
                  </div>
                </div>

                <div style="display:flex;align-items:center;gap:10px;">
                  ${nextSession.group?.id ? `
                    <button onclick="window.location.hash='#group-hub?id=${nextSession.group.id}'" class="btn-primary" style="padding:10px 20px;border-radius:14px;font-size:0.85rem;font-weight:800;display:flex;align-items:center;gap:6px;background:linear-gradient(135deg,#10b981,#059669);border:none;color:#fff;cursor:pointer;">
                      <i data-lucide="external-link" style="width:15px;height:15px;"></i> استعراض قاعة المجموعة
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
          ` : ''}

          <!-- 5. Segmented Navigation Tabs -->
          <div class="parent-segmented-tabs">
            <button class="parent-nav-tab ${this._activeTab === 'schedule' ? 'active' : ''}" data-tab="schedule">
              <i data-lucide="calendar" style="width:15px;height:15px;"></i> جدول الحصص (${data.sessions.length})
            </button>
            <button class="parent-nav-tab ${this._activeTab === 'groups' ? 'active' : ''}" data-tab="groups">
              <i data-lucide="book-open" style="width:15px;height:15px;"></i> المجموعات (${data.groups.length})
            </button>
            <button class="parent-nav-tab ${this._activeTab === 'grades' ? 'active' : ''}" data-tab="grades">
              <i data-lucide="award" style="width:15px;height:15px;"></i> الدرجات والواجبات (${data.grades.length})
            </button>
            <button class="parent-nav-tab ${this._activeTab === 'teachers' ? 'active' : ''}" data-tab="teachers">
              <i data-lucide="users" style="width:15px;height:15px;"></i> كادر الأساتذة (${teachersList.length})
            </button>
            <button class="parent-nav-tab ${this._activeTab === 'billing' ? 'active' : ''}" data-tab="billing" style="${this._activeTab === 'billing' ? 'background:linear-gradient(135deg, #10b981, #059669); color:#fff; border-color:#10b981;' : 'border:1px solid rgba(16,185,129,0.3); background:rgba(16,185,129,0.06); color:#10b981;'}">
              <i data-lucide="credit-card" style="width:15px;height:15px;"></i> الاشتراكات والفواتير (${(billing.payments || []).length})
            </button>
          </div>

          <!-- 6. Tab Content Container -->
          <div id="parent-tab-content">
            ${this._renderTabContent(data, teachersList)}
          </div>
        </main>
      </div>
    `}
  </div>
`;

    if (window.lucide) window.lucide.createIcons();
  }

  _noChildrenView() {
    return `
      <div style="text-align:center;padding:80px 24px;background:var(--bg-card);border-radius:26px;border:1.5px dashed rgba(99,102,241,0.25);box-shadow:0 8px 30px rgba(0,0,0,0.02);">
        <div style="font-size:4rem;margin-bottom:16px;">👨‍👩‍👧</div>
        <h2 style="color:var(--text-main);margin:0 0 10px;font-size:1.4rem;font-weight:800;">لم يتم ربط أي طالب بحسابك بعد</h2>
        <p style="color:var(--text-muted);max-width:520px;margin:0 auto 24px;font-size:0.92rem;line-height:1.6;">
          تقوم إدارة المنصة بربط حسابات الأبناء بحساب ولي الأمر مباشرة. إذا كان ابنك مسجلاً بالفعل، يرجى تزويد الإدارة برقم هاتفه أو بريده لربطه بحسابك فوراً.
        </p>
        <a href="#contact" class="btn-primary" style="display:inline-flex;align-items:center;gap:8px;padding:12px 28px;border-radius:24px;font-size:0.92rem;font-weight:800;text-decoration:none;">
          <i data-lucide="message-circle" style="width:18px;height:18px;"></i> تواصل مع إدارة المنصة
        </a>
      </div>
    `;
  }

  _renderTabContent(data, teachersList = []) {
    switch (this._activeTab) {
      case 'schedule': return this._scheduleTab(data.sessions);
      case 'groups':   return this._groupsTab(data.groups);
      case 'grades':   return this._gradesTab(data.grades);
      case 'teachers': return this._teachersTab(teachersList);
      case 'billing':  return this._billingTab(data.billing || { summary: {}, activeSubscriptions: [], packages: [], payments: [] }, data);
      default:         return '';
    }
  }

  _scheduleTab(sessions) {
    if (!sessions.length) {
      return this._emptyState(
        '📅',
        'لا توجد حصص مجدولة لهذا الطالب حالياً',
        'سيظهر جدول الحصص التفاعلية بمجرد أن يجدول الأستاذ مواعيد البث لمجموعات ابنك، أو عند تسجيله في دورات ومجموعات صفية جديدة.',
        `
          <button data-switch-tab="groups" class="btn-secondary" style="padding:10px 20px;border-radius:14px;font-size:0.85rem;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
            <i data-lucide="book-open" style="width:15px;height:15px;"></i> استعراض مجموعات الطالب 👥
          </button>
          <a href="#courses" class="btn-primary" style="padding:10px 20px;border-radius:14px;font-size:0.85rem;font-weight:800;text-decoration:none;display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg, #6366f1, #8b5cf6);color:#fff;">
            <i data-lucide="plus-circle" style="width:15px;height:15px;"></i> تصفح وتسجيل الدورات 📚
          </a>
        `
      );
    }
    return `
      <div style="display:flex;flex-direction:column;gap:14px;">
        ${sessions.map(s => {
          const isLive = s.status === 'live' || s.status === 'LIVE' || s.status === 'active';
          return `
            <div style="display:flex;align-items:center;gap:18px;padding:18px 22px;background:var(--bg-card);border-radius:18px;border:1px solid var(--border-color);transition:all .2s;flex-wrap:wrap;box-shadow:0 4px 16px rgba(0,0,0,0.02);" onmouseover="this.style.borderColor='rgba(99,102,241,0.35)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--border-color)';this.style.transform='none'">
              <div style="width:52px;height:52px;border-radius:14px;background:${isLive ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)'};color:${isLive ? '#ef4444' : 'var(--primary)'};display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;">
                ${isLive ? '🔴' : '📹'}
              </div>
              <div style="flex:1;min-width:200px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
                  <span style="font-weight:800;font-size:0.98rem;color:var(--text-main);">${s.title || (s.course?.title || 'حصة دراسية')}</span>
                  ${isLive ? `
                    <span style="padding:2px 10px;background:rgba(239,68,68,0.15);color:#ef4444;border-radius:12px;font-size:0.75rem;font-weight:800;">بث مباشر الآن 🔴</span>
                  ` : `
                    <span style="padding:2px 10px;background:rgba(16,185,129,0.12);color:#10b981;border-radius:12px;font-size:0.75rem;font-weight:700;">مجدولة</span>
                  `}
                </div>
                <div style="font-size:0.83rem;color:var(--text-muted);display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <span>👥 ${s.group?.name || 'مجموعة دراسية'}</span>
                  <span>· 📅 ${formatSessionDateTime(s.scheduledAt)}</span>
                  <span>· ⏱️ ${s.duration || 60} دقيقة</span>
                </div>
              </div>
              <div style="display:flex;gap:8px;">
                ${s.group?.id ? `
                  <button onclick="window.location.hash='#group-hub?id=${s.group.id}'" class="btn-secondary" style="padding:8px 16px;border-radius:12px;font-size:0.82rem;font-weight:700;display:flex;align-items:center;gap:6px;cursor:pointer;">
                    <i data-lucide="eye" style="width:14px;height:14px;"></i> عرض الغرفة
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  _groupsTab(groups) {
    if (!groups.length) {
      return this._emptyState(
        '🎒',
        'الطالب غير مسجل في أي كورس أو مجموعة بعد',
        'سجل ابنك في الكورسات والمجموعات المناسبة لمرحلته الدراسية لتفعيل قاعات البث المباشر، متابعة الحصص الأسبوعية، ورصد التقييمات أولاً بأول.',
        `
          <a href="#courses" class="btn-primary" style="padding:10px 22px;border-radius:14px;font-size:0.85rem;font-weight:800;text-decoration:none;display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg, #6366f1, #8b5cf6);color:#fff;box-shadow:0 4px 14px rgba(99,102,241,0.25);">
            <i data-lucide="sparkles" style="width:15px;height:15px;"></i> استعراض الكورسات والمناهج 📚
          </a>
        `
      );
    }
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;">
        ${groups.map(g => {
          const isPending = g.status === 'pending';
          const isLive = g.group.status === 'live' || g.group.status === 'LIVE' || (g.group.nextSession && (g.group.nextSession.status === 'live' || g.group.nextSession.status === 'LIVE' || g.group.nextSession.status === 'active'));
          const progressPct = Math.min(100, Math.max(0, Math.round(g.progress || 0)));
          const teacherName = g.group.teacher?.name || 'الأستاذ الأكاديمي';
          const teacherAvatar = (g.group.teacher?.avatar && !g.group.teacher.avatar.includes('dicebear.com')) ? g.group.teacher.avatar : 'assets/logo.png';
          const nextSessionStr = g.group.nextSession?.scheduledAt ? formatSessionDateTime(g.group.nextSession.scheduledAt) : null;
          const scheduleInfo = g.group.scheduleText || null;

          return `
            <div class="glass-card group-card-hover" style="border-radius:18px;border:1px solid ${isLive ? 'rgba(16,185,129,0.4)' : 'var(--border-color)'};background:var(--bg-card);display:flex;flex-direction:column;padding:18px 20px;gap:12px;box-shadow:0 2px 12px rgba(0,0,0,0.02);transition:all 0.2s ease;">
              
              <!-- Top Row: Course/Subject Tag & Status Badge -->
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <span style="font-size:0.75rem;font-weight:800;padding:3px 10px;border-radius:8px;background:rgba(99,102,241,0.08);color:var(--primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;">
                  ${g.group.course?.subject?.name || g.group.course?.title || 'مقرر دراسي'}
                </span>
                ${isPending
                  ? `<span style="padding:3px 10px;border-radius:12px;font-size:0.72rem;font-weight:800;background:rgba(245,158,11,0.12);color:#d97706;white-space:nowrap;">⏳ قيد المراجعة</span>`
                  : isLive
                    ? `<span style="padding:3px 10px;border-radius:12px;font-size:0.72rem;font-weight:800;background:rgba(239,68,68,0.12);color:#ef4444;white-space:nowrap;">🔴 مباشر الآن</span>`
                    : (progressPct >= 100 || g.status === 'completed')
                      ? `<span style="padding:3px 10px;border-radius:12px;font-size:0.72rem;font-weight:700;background:var(--bg-app);color:var(--text-muted);white-space:nowrap;">✅ مكتملة</span>`
                      : `<span style="padding:3px 10px;border-radius:12px;font-size:0.72rem;font-weight:800;background:rgba(16,185,129,0.1);color:#10b981;white-space:nowrap;">نشطة ⚡</span>`
                }
              </div>

              <!-- Group Title & Teacher Name (No contact) -->
              <div>
                <h3 style="font-size:1.02rem;font-weight:900;color:var(--text-main);margin:0 0 6px 0;line-height:1.35;">
                  👥 ${g.group.name}
                </h3>
                <div style="display:flex;align-items:center;gap:8px;">
                  <img src="${teacherAvatar}" alt="${teacherName}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;border:1px solid rgba(99,102,241,0.25);" onerror="this.src='assets/logo.png'" />
                  <span style="font-size:0.8rem;font-weight:700;color:var(--text-muted);">${teacherName}</span>
                </div>
              </div>

              <!-- Schedule / Next Session Pill -->
              <div style="padding:8px 12px;border-radius:10px;background:var(--bg-app);border:1px solid var(--border-color);display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:0.78rem;">
                <span style="color:var(--text-muted);font-weight:600;display:flex;align-items:center;gap:5px;">
                  <i data-lucide="calendar" style="width:13px;height:13px;color:var(--primary);"></i>
                  ${nextSessionStr ? 'الحصة القادمة:' : scheduleInfo ? 'المواعيد:' : 'الحصص:'}
                </span>
                <span style="font-weight:800;color:var(--text-main);">${nextSessionStr || scheduleInfo || `${g.group.sessionsCount || 0} حصص`}</span>
              </div>

              <!-- Academic Progress Bar -->
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;font-size:0.75rem;">
                  <span style="color:var(--text-muted);font-weight:600;">نسبة الإنجاز:</span>
                  <span style="font-weight:800;color:var(--primary);">${progressPct}%</span>
                </div>
                <div style="width:100%;height:5px;background:rgba(99,102,241,0.1);border-radius:10px;overflow:hidden;">
                  <div style="width:${progressPct}%;height:100%;background:linear-gradient(90deg, #6366f1, #8b5cf6);border-radius:10px;"></div>
                </div>
              </div>

              <!-- Action Button -->
              ${g.group.id ? `
                <a href="#group-hub?id=${g.group.id}" class="btn-primary"
                  style="display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:10px 14px;border-radius:12px;font-size:0.84rem;font-weight:800;text-decoration:none;margin-top:auto;box-shadow:none;">
                  <span>دخول قاعة المجموعة</span>
                  <i data-lucide="arrow-left" style="width:14px;height:14px;"></i>
                </a>
              ` : ''}

            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  _gradesTab(grades) {
    if (!grades.length) {
      return this._emptyState(
        '📊',
        'لا توجد درجات أو واجبات مرصودة حتى الآن 📝',
        'بمجرد إنجاز ابنك للواجبات وتصحيحها من قبل المعلم في قاعة المجموعة، ستظهر الدرجات، النسب المئوية، والملاحظات الأكاديمية هنا.',
        `
          <div style="padding:12px 18px;background:rgba(99,102,241,0.06);border-radius:14px;border:1px solid rgba(99,102,241,0.15);max-width:480px;font-size:0.83rem;color:var(--text-muted);display:flex;align-items:center;gap:8px;">
            <i data-lucide="lightbulb" style="width:18px;height:18px;color:#f59e0b;flex-shrink:0;"></i>
            <span>💡 نصيحة: شجع ابنك على تسليم واجباته في موعدها داخل قاعة المجموعة لتحقيق أعلى درجات التفوق.</span>
          </div>
        `
      );
    }
    const graded = grades.filter(g => g.grade != null);
    const pending = grades.filter(g => g.grade == null);

    return `
      <div>
        ${graded.length ? `
          <h4 style="font-size:1rem;color:var(--text-main);margin:0 0 14px 0;font-weight:800;display:flex;align-items:center;gap:8px;">
            <i data-lucide="check-circle-2" style="width:18px;height:18px;color:#10b981;"></i> الواجبات المقيّمة والدرجات (${graded.length})
          </h4>
          <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:28px;">
            ${graded.map(g => {
              const maxG = g.assignment?.maxGrade || 100;
              const pct = Math.round((g.grade / maxG) * 100);
              const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
              return `
                <div style="display:flex;align-items:center;gap:16px;padding:16px 20px;background:var(--bg-card);border-radius:16px;border:1px solid var(--border-color);flex-wrap:wrap;box-shadow:0 4px 14px rgba(0,0,0,0.02);">
                  <div style="width:48px;height:48px;border-radius:14px;background:${color}18;display:flex;align-items:center;justify-content:center;font-weight:900;color:${color};font-size:1.05rem;flex-shrink:0;border:1.5px solid ${color}33;">
                    ${pct}%
                  </div>
                  <div style="flex:1;min-width:180px;">
                    <div style="font-weight:800;font-size:0.95rem;color:var(--text-main);margin-bottom:3px;">${g.assignment?.title || 'واجب دراسي'}</div>
                    <div style="font-size:0.82rem;color:var(--text-muted);display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                      <span>الدرجة المستحقة: <strong style="color:${color};">${g.grade}</strong> من ${maxG}</span>
                      ${g.feedback ? `<span>· 💬 تعليق المعلم: "${g.feedback}"</span>` : ''}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        ${pending.length ? `
          <h4 style="font-size:1rem;color:var(--text-muted);margin:0 0 14px 0;font-weight:800;display:flex;align-items:center;gap:8px;">
            <i data-lucide="clock" style="width:18px;height:18px;color:#f59e0b;"></i> مهام تم تسليمها وقيد التصحيح (${pending.length})
          </h4>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${pending.map(g => `
              <div style="display:flex;align-items:center;gap:16px;padding:14px 20px;background:var(--bg-card);border-radius:14px;border:1px solid var(--border-color);opacity:.85;">
                <div style="width:42px;height:42px;border-radius:12px;background:rgba(245,158,11,0.12);color:#f59e0b;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">
                  ⏳
                </div>
                <div style="flex:1;">
                  <div style="font-weight:700;font-size:0.92rem;color:var(--text-main);">${g.assignment?.title || 'واجب دراسي'}</div>
                  <div style="font-size:0.8rem;color:var(--text-muted);">تم تسليم الإجابة وفي انتظار مراجعة وتصحيح المعلم</div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  _teachersTab(teachersList) {
    if (!teachersList.length) {
      return this._emptyState(
        '👨‍🏫',
        'لم يتم العثور على معلمين مرتبطين بالطالب بعد',
        'عند تسجيل ابنك في دورات ومجموعات صفية، ستظهر قائمة بالمعلمين والمشرفين الأكاديميين المتابعين لدراسته.',
        `
          <a href="#courses" class="btn-primary" style="padding:10px 22px;border-radius:14px;font-size:0.85rem;font-weight:800;text-decoration:none;display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg, #6366f1, #8b5cf6);color:#fff;">
            <i data-lucide="compass" style="width:15px;height:15px;"></i> استكشف نخبة أساتذة المنصة 🌟
          </a>
        `
      );
    }
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
        ${teachersList.map(tObj => `
          <div class="glass-card" style="padding:16px 20px;border-radius:18px;border:1px solid var(--border-color);background:var(--bg-card);display:flex;align-items:center;gap:14px;box-shadow:0 2px 10px rgba(0,0,0,0.02);">
            <img src="${(tObj.avatar && !tObj.avatar.includes('dicebear.com')) ? tObj.avatar : 'assets/logo.png'}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid rgba(99,102,241,0.25);flex-shrink:0;" onerror="this.src='assets/logo.png'" />
            <div style="flex:1;min-width:0;">
              <h4 style="margin:0 0 4px 0;font-weight:800;font-size:0.95rem;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${tObj.name}</h4>
              <div style="font-size:0.78rem;color:var(--text-muted);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${tObj.courses.join(' · ') || 'معلم المادة'}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  _billingTab(billing, childData) {
    const summary = billing.summary || { totalSpent: 0, monthlyCommitment: 0, activeGroupsCount: 0, pendingPaymentsCount: 0, totalInvoicesCount: 0 };
    const subscriptions = billing.activeSubscriptions || [];
    const packages = billing.packages || [];
    const payments = billing.payments || [];

    return `
      <div style="display:flex; flex-direction:column; gap:22px;">
        
        <!-- 1. Financial Summary 4-Cards Grid -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:14px;">
          <!-- Metric 1: Total Spent -->
          <div class="glass-card" style="padding:18px; border-radius:20px; border:1px solid rgba(16,185,129,0.25); background:linear-gradient(135deg, rgba(16,185,129,0.08), rgba(99,102,241,0.04)); display:flex; align-items:center; gap:14px;">
            <div style="width:46px; height:46px; border-radius:14px; background:rgba(16,185,129,0.15); color:#10b981; display:flex; align-items:center; justify-content:center; font-size:1.3rem; flex-shrink:0;">
              💳
            </div>
            <div>
              <div style="font-size:0.76rem; font-weight:700; color:var(--text-muted); margin-bottom:2px;">إجمالي المدفوعات المؤكدة</div>
              <div style="font-size:1.35rem; font-weight:900; color:var(--text-main); line-height:1.1;">
                ${summary.totalSpent || 0} <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted);">ج.م</span>
              </div>
              <div style="font-size:0.7rem; font-weight:700; color:#10b981; margin-top:3px;">عمليات سداد ناجحة ✅</div>
            </div>
          </div>

          <!-- Metric 2: Monthly Commitment -->
          <div class="glass-card" style="padding:18px; border-radius:20px; border:1px solid rgba(99,102,241,0.25); background:linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.04)); display:flex; align-items:center; gap:14px;">
            <div style="width:46px; height:46px; border-radius:14px; background:rgba(99,102,241,0.15); color:var(--primary); display:flex; align-items:center; justify-content:center; font-size:1.3rem; flex-shrink:0;">
              📅
            </div>
            <div>
              <div style="font-size:0.76rem; font-weight:700; color:var(--text-muted); margin-bottom:2px;">الالتزام الشهري للمجموعات</div>
              <div style="font-size:1.35rem; font-weight:900; color:var(--text-main); line-height:1.1;">
                ${summary.monthlyCommitment || 0} <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted);">ج.م / شهر</span>
              </div>
              <div style="font-size:0.7rem; font-weight:700; color:var(--primary); margin-top:3px;">لـ ${summary.activeGroupsCount || 0} مجموعات دراسية نشطة</div>
            </div>
          </div>

          <!-- Metric 3: Pending Payments -->
          <div class="glass-card" style="padding:18px; border-radius:20px; border:1px solid ${summary.pendingPaymentsCount > 0 ? 'rgba(245,158,11,0.35)' : 'var(--border-color)'}; background:var(--bg-card); display:flex; align-items:center; gap:14px;">
            <div style="width:46px; height:46px; border-radius:14px; background:${summary.pendingPaymentsCount > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(0,0,0,0.04)'}; color:${summary.pendingPaymentsCount > 0 ? '#d97706' : 'var(--text-muted)'}; display:flex; align-items:center; justify-content:center; font-size:1.3rem; flex-shrink:0;">
              ⏳
            </div>
            <div>
              <div style="font-size:0.76rem; font-weight:700; color:var(--text-muted); margin-bottom:2px;">فواتير قيد التأكيد</div>
              <div style="font-size:1.35rem; font-weight:900; color:${summary.pendingPaymentsCount > 0 ? '#d97706' : 'var(--text-main)'}; line-height:1.1;">
                ${summary.pendingPaymentsCount || 0} <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted);">فاتورة</span>
              </div>
              <div style="font-size:0.7rem; font-weight:700; color:var(--text-muted); margin-top:3px;">${summary.pendingPaymentsCount > 0 ? 'جاري مراجعتها وتأكيدها' : 'لا توجد فواتير معلقة'}</div>
            </div>
          </div>

          <!-- Metric 4: Total Invoices -->
          <div class="glass-card" style="padding:18px; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card); display:flex; align-items:center; gap:14px;">
            <div style="width:46px; height:46px; border-radius:14px; background:rgba(168,85,247,0.12); color:#a855f7; display:flex; align-items:center; justify-content:center; font-size:1.3rem; flex-shrink:0;">
              🧾
            </div>
            <div>
              <div style="font-size:0.76rem; font-weight:700; color:var(--text-muted); margin-bottom:2px;">أرشيف الفواتير</div>
              <div style="font-size:1.35rem; font-weight:900; color:var(--text-main); line-height:1.1;">
                ${summary.totalInvoicesCount || 0} <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted);">إيصال</span>
              </div>
              <div style="font-size:0.7rem; font-weight:700; color:#a855f7; margin-top:3px;">سجل المعاملات الكامل</div>
            </div>
          </div>
        </div>

        <!-- 2. Active Group Monthly Subscriptions Section -->
        <div class="glass-card" style="padding:22px; border-radius:24px; border:1px solid var(--border-color); background:var(--bg-card);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:16px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:1.2rem;">👥</span>
              <h3 style="font-size:1.05rem; font-weight:900; color:var(--text-main); margin:0;">
                الاشتراكات الشهرية في المجموعات الدراسية
              </h3>
            </div>
            <a href="#courses" class="btn-primary" style="padding:6px 14px; border-radius:12px; font-size:0.78rem; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:5px; background:linear-gradient(135deg, #6366f1, #8b5cf6); color:#fff;">
              <i data-lucide="plus-circle" style="width:13px;height:13px;"></i> اشتراك في مجموعة جديدة
            </a>
          </div>

          ${subscriptions.length === 0 ? `
            <div style="text-align:center; padding:32px 16px; color:var(--text-muted);">
              <i data-lucide="info" style="width:36px; height:36px; opacity:0.3; margin:0 auto 8px; display:block;"></i>
              <p style="font-weight:700; font-size:0.9rem; margin:0 0 6px 0;">لا توجد مجموعات دراسية مشتركة حالياً لهذا الطالب.</p>
              <span style="font-size:0.8rem;">يمكنك تصفح المجموعات المتاحة وحجز مقعد دراسي لابنك في أي وقت.</span>
            </div>
          ` : `
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(310px, 1fr)); gap:14px;">
              ${subscriptions.map(sub => {
                const isPaid = sub.paymentStatus === "SUCCESS" || sub.status === "active";
                const teacherAvatar = (sub.teacher?.avatar && !sub.teacher.avatar.includes('dicebear.com')) ? sub.teacher.avatar : 'assets/logo.png';
                return `
                  <div style="border-radius:18px; padding:16px; border:1px solid ${isPaid ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.35)'}; background:var(--bg-app); display:flex; flex-direction:column; justify-content:space-between; gap:12px;">
                    <div>
                      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:8px;">
                        <span class="badge" style="background:rgba(99,102,241,0.1); color:var(--primary); font-size:0.72rem; font-weight:800; padding:2px 8px; border-radius:8px;">
                          ${sub.course?.title || 'مادة دراسية'}
                        </span>
                        <span class="badge" style="background:${isPaid ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.15)'}; color:${isPaid ? '#10b981' : '#d97706'}; font-weight:800; font-size:0.72rem; padding:2px 8px; border-radius:8px;">
                          ${isPaid ? 'اشتراك نشط ومفعّل ✅' : 'بانتظار تأكيد الدفع ⏳'}
                        </span>
                      </div>
                      
                      <h4 style="font-size:0.98rem; font-weight:900; color:var(--text-main); margin:0 0 6px 0;">
                        👥 ${sub.group?.name || 'مجموعة تعليمية'}
                      </h4>

                      ${sub.group?.scheduleText ? `
                        <div style="font-size:0.76rem; color:var(--text-muted); font-weight:700; margin-bottom:10px; display:flex; align-items:center; gap:5px;">
                          <i data-lucide="clock" style="width:13px;height:13px;color:var(--primary);"></i>
                          <span>المواعيد: ${sub.group.scheduleText}</span>
                        </div>
                      ` : ''}

                      <div style="display:flex; align-items:center; gap:8px; padding-top:8px; border-top:1px solid var(--border-color);">
                        <img src="${teacherAvatar}" onerror="this.src='assets/logo.png'" style="width:30px; height:30px; border-radius:50%; object-fit:cover; border:1px solid var(--border-color);">
                        <span style="font-size:0.82rem; font-weight:800; color:var(--text-main);">${sub.teacher?.name || 'معلم معتمد'}</span>
                      </div>
                    </div>

                    <div style="background:var(--bg-card); padding:10px 12px; border-radius:12px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                      <div>
                        <div style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">الاشتراك الشهري</div>
                        <div style="font-size:1.1rem; font-weight:900; color:#e51d74;">${sub.monthlyPrice || 0} <span style="font-size:0.72rem; font-weight:700; color:var(--text-muted);">${sub.currency || 'ج.م'}</span></div>
                      </div>
                      <a href="#courses" class="btn-secondary" style="font-size:0.76rem; padding:6px 12px; border-radius:10px; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                        <span>تجديد الاشتراك</span> 💳
                      </a>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- 3. Private Tutoring Packages (if any) -->
        ${packages.length > 0 ? `
          <div class="glass-card" style="padding:22px; border-radius:24px; border:1px solid var(--border-color); background:var(--bg-card);">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
              <span style="font-size:1.2rem;">💎</span>
              <h3 style="font-size:1.05rem; font-weight:900; color:var(--text-main); margin:0;">
                باقات الحصص الفردية والخاصة
              </h3>
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:14px;">
              ${packages.map(pkg => {
                const pct = pkg.totalSessions > 0 ? Math.round((pkg.consumedSessions / pkg.totalSessions) * 100) : 0;
                return `
                  <div style="border-radius:18px; padding:16px; border:1px solid rgba(168,85,247,0.25); background:linear-gradient(135deg, rgba(168,85,247,0.05), transparent); display:flex; flex-direction:column; gap:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <h4 style="font-size:0.95rem; font-weight:900; color:var(--text-main); margin:0;">${pkg.planTitle}</h4>
                      <span class="badge" style="background:rgba(168,85,247,0.15); color:#a855f7; font-weight:800; font-size:0.7rem; padding:2px 8px; border-radius:8px;">${pkg.status || 'نشطة'}</span>
                    </div>
                    ${pkg.teacher ? `
                      <div style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">المعلم المشرف: <strong style="color:var(--text-main);">${pkg.teacher.name}</strong></div>
                    ` : ''}
                    <div>
                      <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:700; color:var(--text-muted); margin-bottom:4px;">
                        <span>الحصص المتبقية: <strong style="color:#10b981;">${pkg.remainingSessions}</strong> حصة</span>
                        <span>إجمالي الباقة: ${pkg.totalSessions}</span>
                      </div>
                      <div style="width:100%; height:7px; background:rgba(0,0,0,0.06); border-radius:10px; overflow:hidden;">
                        <div style="width:${pct}%; height:100%; background:linear-gradient(90deg, #a855f7, #6366f1); border-radius:10px;"></div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- 4. Payment History & Invoices Table -->
        <div class="glass-card" style="padding:22px; border-radius:24px; border:1px solid var(--border-color); background:var(--bg-card);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:1.2rem;">🧾</span>
              <h3 style="font-size:1.05rem; font-weight:900; color:var(--text-main); margin:0;">
                سجل الفواتير والإيصالات
              </h3>
            </div>
            <div style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">
              إجمالي العمليات: ${payments.length}
            </div>
          </div>

          ${payments.length === 0 ? `
            <div style="text-align:center; padding:36px 16px; color:var(--text-muted);">
              <i data-lucide="receipt" style="width:36px; height:36px; opacity:0.3; margin:0 auto 8px; display:block;"></i>
              <p style="font-weight:700; font-size:0.9rem; margin:0;">لا توجد أي فواتير أو مدفوعات سابقة لهذا الطالب حتى الآن.</p>
            </div>
          ` : `
            <div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse; text-align:start; font-size:0.85rem;">
                <thead>
                  <tr style="border-bottom:2px solid var(--border-color); color:var(--text-muted); font-weight:800; font-size:0.78rem;">
                    <th style="padding:10px 14px; text-align:start;">رقم الفاتورة</th>
                    <th style="padding:10px 14px; text-align:start;">التاريخ والوقت</th>
                    <th style="padding:10px 14px; text-align:start;">البند / الخدمة</th>
                    <th style="padding:10px 14px; text-align:start;">وسيلة الدفع</th>
                    <th style="padding:10px 14px; text-align:start;">المبلغ</th>
                    <th style="padding:10px 14px; text-align:start;">الحالة</th>
                    <th style="padding:10px 14px; text-align:center;">الإيصال</th>
                  </tr>
                </thead>
                <tbody>
                  ${payments.map(p => {
                    const shortId = p.id ? `#${p.id.substring(0, 8)}` : '-';
                    const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
                    const isSuccess = p.status === "SUCCESS";
                    const isPending = p.status === "PENDING";
                    
                    const providerMap = {
                      vodafone_cash: "فودافون كاش 📱",
                      fawry: "فوري 🏪",
                      instapay: "انستاباي ⚡",
                      visa: "بطاقة بنكية 💳",
                      manual: "تحويل مباشر 🏦"
                    };
                    const providerText = providerMap[p.provider] || p.provider || "تحويل";

                    return `
                      <tr style="border-bottom:1px solid var(--border-color); transition:background 0.15s;" onmouseenter="this.style.background='rgba(99,102,241,0.03)'" onmouseleave="this.style.background='transparent'">
                        <td style="padding:12px 14px; font-weight:800; font-family:monospace; color:var(--primary);">${shortId}</td>
                        <td style="padding:12px 14px; color:var(--text-muted); font-size:0.8rem;">${dateStr}</td>
                        <td style="padding:12px 14px;">
                          <div style="font-weight:800; color:var(--text-main);">${p.title}</div>
                          ${p.subTitle ? `<div style="font-size:0.74rem; color:var(--text-muted);">${p.subTitle}</div>` : ''}
                        </td>
                        <td style="padding:12px 14px;">
                          <span style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; font-weight:700; padding:2px 8px; border-radius:6px; background:rgba(0,0,0,0.04); color:var(--text-main);">
                            ${providerText}
                          </span>
                        </td>
                        <td style="padding:12px 14px; font-weight:900; color:var(--text-main); font-size:0.95rem;">
                          ${p.amount || 0} <span style="font-size:0.72rem; font-weight:700; color:var(--text-muted);">${p.currency === 'EGP' ? 'ج.م' : p.currency}</span>
                        </td>
                        <td style="padding:12px 14px;">
                          <span class="badge" style="background:${isSuccess ? 'rgba(16,185,129,0.12)' : (isPending ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.12)')}; color:${isSuccess ? '#10b981' : (isPending ? '#d97706' : '#ef4444')}; font-weight:800; font-size:0.72rem; padding:3px 9px; border-radius:8px;">
                            ${isSuccess ? 'ناجحة ومؤكدة ✅' : (isPending ? 'قيد المراجعة ⏳' : 'فاشلة / ملغية ❌')}
                          </span>
                        </td>
                        <td style="padding:12px 14px; text-align:center;">
                          ${p.receiptUrl ? `
                            <a href="${p.receiptUrl}" target="_blank" class="btn-secondary" style="font-size:0.72rem; padding:4px 10px; border-radius:8px; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:4px;" title="عرض إيصال التحويل المرفوع">
                              <i data-lucide="eye" style="width:12px;height:12px;"></i> الإيصال
                            </a>
                          ` : `
                            <span style="font-size:0.72rem; color:var(--text-muted);">-</span>
                          `}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

      </div>
    `;
  }

  _emptyState(icon, title, desc, actionHtml = '') {
    return `
      <div style="text-align:center;padding:54px 24px;background:var(--bg-card);border-radius:24px;border:1.5px dashed var(--border-color);color:var(--text-muted);box-shadow:0 6px 24px rgba(0,0,0,0.02);">
        <div style="font-size:3.2rem;margin-bottom:14px;line-height:1;">${icon}</div>
        <h4 style="color:var(--text-main);font-weight:900;margin:0 0 8px 0;font-size:1.15rem;">${title}</h4>
        <p style="margin:0 auto;max-width:500px;font-size:0.88rem;line-height:1.6;color:var(--text-muted);">${desc}</p>
        ${actionHtml ? `<div style="margin-top:20px;display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">${actionHtml}</div>` : ''}
      </div>
    `;
  }

  _startLiveClock() {
    if (this.clockInterval) clearInterval(this.clockInterval);

    const userTz = getUserTimezone();

    const updateTime = () => {
      const now = new Date();
      const dayElem = this.container.querySelector("#parent-live-day");
      const dateElem = this.container.querySelector("#parent-live-date");
      const timeElem = this.container.querySelector("#parent-live-time");
      const ampmElem = this.container.querySelector("#parent-live-ampm");

      if (!timeElem) return;

      try {
        const dateOptions = { timeZone: userTz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        const dateParts = new Intl.DateTimeFormat('ar-EG', dateOptions).formatToParts(now);

        let weekday = "";
        let day = "";
        let month = "";
        let year = "";

        dateParts.forEach(p => {
          if (p.type === 'weekday') weekday = p.value;
          if (p.type === 'day') day = p.value;
          if (p.type === 'month') month = p.value;
          if (p.type === 'year') year = p.value;
        });

        if (dayElem) dayElem.textContent = weekday || "اليوم";
        if (dateElem) dateElem.textContent = `${day} ${month} ${year}`;

        const timeOptions = { timeZone: userTz, hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true };
        const timeParts = new Intl.DateTimeFormat('en-US', timeOptions).formatToParts(now);

        let h = "00";
        let m = "00";
        let s = "00";
        let dayPeriod = "AM";

        timeParts.forEach(p => {
          if (p.type === 'hour') h = p.value.padStart(2, '0');
          if (p.type === 'minute') m = p.value.padStart(2, '0');
          if (p.type === 'second') s = p.value.padStart(2, '0');
          if (p.type === 'dayPeriod') dayPeriod = p.value.toUpperCase();
        });

        const isColonVisible = now.getSeconds() % 2 === 0;
        timeElem.innerHTML = `${h}<span style="opacity:${isColonVisible ? '1' : '0.25'};transition:opacity 0.15s;color:var(--primary);">:</span>${m}<span style="opacity:${isColonVisible ? '1' : '0.25'};transition:opacity 0.15s;color:var(--primary);">:</span>${s}`;

        if (ampmElem) {
          ampmElem.textContent = dayPeriod === 'PM' ? 'مساءً' : 'صباحاً';
        }
      } catch (e) {}
    };

    updateTime();
    this.clockInterval = setInterval(updateTime, 1000);
  }

  async renderPrayerTimesModal() {
    let container = document.getElementById("parent-prayer-modal-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "parent-prayer-modal-container";
      document.body.appendChild(container);
    }

    const userTz = getUserTimezone();
    const tzInfo = getTimezoneInfo(userTz);

    container.innerHTML = `
      <div class="modal-overlay" id="parent-prayer-modal" style="display:flex;z-index:9999;">
        <div class="modal-content" style="max-width:540px;background:var(--bg-card);border-radius:26px;border:1px solid rgba(16,185,129,0.3);box-shadow:0 20px 60px rgba(0,0,0,0.5);">
          <div class="modal-header" style="border-bottom:1px solid var(--border-color);padding-bottom:14px;">
            <h3 class="modal-title" style="display:flex;align-items:center;gap:8px;font-size:1.15rem;color:var(--text-main);margin:0;">
              <span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:10px;background:rgba(16,185,129,0.15);color:#10b981;">
                <i data-lucide="moon-star" style="width:18px;height:18px;"></i>
              </span>
              مواقيت الصلاة لليوم 🕌
            </h3>
            <span class="modal-close-btn" id="close-parent-prayer-modal" style="font-size:1.5rem;cursor:pointer;">&times;</span>
          </div>
          <div class="modal-body" style="padding:30px 20px;text-align:center;">
            <div class="spinner" style="width:36px;height:36px;border-width:3px;margin:0 auto 12px;border-color:#10b981 transparent #10b981 transparent;"></div>
            <p style="color:var(--text-muted);font-size:0.9rem;font-weight:700;margin:0;">جاري استرداد مواقيت الصلاة الدقيقة لـ ${tzInfo.name}...</p>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => { container.innerHTML = ""; };
    document.getElementById("close-parent-prayer-modal")?.addEventListener("click", closeModal);

    try {
      let apiUrl = "";
      if (userTz.includes("Cairo") || userTz.includes("Egypt")) {
        apiUrl = "https://api.aladhan.com/v1/timingsByCity?city=Cairo&country=Egypt&method=5";
      } else if (tzInfo.city && tzInfo.country && tzInfo.country !== "Global") {
        apiUrl = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(tzInfo.city)}&country=${encodeURIComponent(tzInfo.country)}&method=5`;
      } else {
        apiUrl = `https://api.aladhan.com/v1/timingsByAddress?address=${encodeURIComponent(userTz)}&method=5`;
      }

      const res = await fetch(apiUrl);
      let timings = null;
      let hijri = null;

      if (res.ok) {
        const data = await res.json();
        if (data.code === 200 && data.data) {
          timings = data.data.timings;
          hijri = data.data.date?.hijri;
        }
      }

      if (!timings) {
        timings = { Fajr: "04:55", Dhuhr: "12:05", Asr: "15:25", Maghrib: "18:05", Isha: "19:25" };
      }

      const format12H = (timeStr) => {
        if (!timeStr) return "--:--";
        const clean = timeStr.split(" ")[0];
        const [hh, mm] = clean.split(":").map(Number);
        if (isNaN(hh) || isNaN(mm)) return timeStr;
        const period = hh >= 12 ? "م" : "ص";
        const h12 = hh % 12 || 12;
        return `${h12}:${String(mm).padStart(2, '0')} ${period}`;
      };

      const prayerList = [
        { name: "الفجر", key: "Fajr", icon: "sunrise" },
        { name: "الظهر", key: "Dhuhr", icon: "sun" },
        { name: "العصر", key: "Asr", icon: "sun-dim" },
        { name: "المغرب", key: "Maghrib", icon: "sunset" },
        { name: "العشاء", key: "Isha", icon: "moon" }
      ];

      const modalBody = container.querySelector(".modal-body");
      if (modalBody) {
        modalBody.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;background:rgba(16,185,129,0.08);padding:10px 16px;border-radius:14px;border:1px solid rgba(16,185,129,0.2);">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:1.2rem;">📍</span>
              <strong style="color:var(--text-main);font-size:0.9rem;">${tzInfo.flag} ${tzInfo.name}</strong>
            </div>
            ${hijri ? `
              <span style="font-size:0.8rem;font-weight:700;color:#10b981;">
                ${hijri.day} ${hijri.month?.ar} ${hijri.year} هـ
              </span>
            ` : ''}
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:10px;margin-bottom:20px;">
            ${prayerList.map(p => `
              <div style="background:var(--bg-app);border:1px solid var(--border-color);border-radius:14px;padding:12px 8px;text-align:center;">
                <div style="font-size:0.82rem;font-weight:700;color:var(--text-muted);margin-bottom:6px;">${p.name}</div>
                <div style="font-size:1rem;font-weight:900;color:var(--text-main);font-family:'Outfit',sans-serif;">${format12H(timings[p.key])}</div>
              </div>
            `).join('')}
          </div>

          <button id="ok-parent-prayer-btn" class="btn-primary" style="width:100%;padding:10px;border-radius:14px;font-size:0.9rem;font-weight:800;">
            إغلاق
          </button>
        `;

        if (window.lucide) window.lucide.createIcons();
        container.querySelector("#ok-parent-prayer-btn")?.addEventListener("click", closeModal);
      }
    } catch (err) {
      const modalBody = container.querySelector(".modal-body");
      if (modalBody) {
        modalBody.innerHTML = `
          <p style="color:var(--error);font-weight:700;">تعذر جلب المواقيت حالياً.</p>
          <button id="ok-parent-prayer-btn" class="btn-secondary" style="padding:8px 20px;border-radius:12px;">إغلاق</button>
        `;
        container.querySelector("#ok-parent-prayer-btn")?.addEventListener("click", closeModal);
      }
    }
  }

  _attachListeners() {
    // Child switcher click
    this.container.querySelectorAll(".child-switcher-pod").forEach(pod => {
      pod.addEventListener("click", async () => {
        const childId = pod.dataset.childId;
        if (childId && childId !== this._activeChildId) {
          this._activeChildId = childId;
          await this._renderDashboard();
          this._attachListeners();
        }
      });
    });

    // Segmented tab switching
    this.container.querySelectorAll(".parent-nav-tab").forEach(tabBtn => {
      tabBtn.addEventListener("click", () => {
        const tab = tabBtn.dataset.tab;
        if (tab && tab !== this._activeTab) {
          this._activeTab = tab;
          const data = this._data[this._activeChildId] || { groups: [], sessions: [], grades: [] };
          const contentEl = document.getElementById("parent-tab-content");
          if (contentEl) {
            // Re-extract teachers
            const teachersMap = new Map();
            data.groups.forEach(g => {
              const tObj = g.group?.teacher;
              if (tObj && !teachersMap.has(tObj.id)) {
                teachersMap.set(tObj.id, {
                  id: tObj.id,
                  name: tObj.name,
                  avatar: (tObj.avatar && !tObj.avatar.includes('dicebear.com')) ? tObj.avatar : 'assets/logo.png',
                  courses: [g.group?.course?.title || g.group?.name || 'مادة دراسية']
                });
              } else if (tObj && teachersMap.has(tObj.id)) {
                const item = teachersMap.get(tObj.id);
                const title = g.group?.course?.title || g.group?.name;
                if (title && !item.courses.includes(title)) item.courses.push(title);
              }
            });
            contentEl.innerHTML = this._renderTabContent(data, Array.from(teachersMap.values()));
          }

          this.container.querySelectorAll(".parent-nav-tab").forEach(b => {
            b.classList.toggle("active", b.dataset.tab === tab);
          });

          if (window.lucide) window.lucide.createIcons();
        }
      });
    });

    // Quick tab switch trigger from pods or empty states
    this.container.querySelectorAll("[data-switch-tab]").forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const tab = el.dataset.switchTab;
        const targetBtn = this.container.querySelector(`.parent-nav-tab[data-tab="${tab}"]`);
        if (targetBtn) {
          targetBtn.click();
          targetBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    });

    // Prayer modal trigger
    this.container.querySelector("#parent-open-prayer-btn")?.addEventListener("click", () => {
      this.renderPrayerTimesModal();
    });
  }

  onDestroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
    this._data = {};
    this._children = [];
  }
}
