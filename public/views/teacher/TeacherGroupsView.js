import { apiFetch, state, showToast, t, getCleanWhatsAppNumber, formatSessionDateTime, getTimezoneBadgeHTML } from "../../app.js";

export default class TeacherGroupsView {
  constructor(container) {
    this.container = container;
    this.searchQuery = "";
    this.filterStatus = "all"; // 'all', 'live', 'upcoming', 'completed'
    this.groupsData = [];
    this.expandedGroupKeys = new Set();
    this.activeModalGroupId = null;
  }

  async render() {
    try {
      const [sessions] = await Promise.all([
        apiFetch("/sessions")
      ]);

      const rawSessions = sessions || [];

      // Filter sessions belonging to this logged in teacher
      const myTeacherId = state.user?.id;
      const mySessions = rawSessions.filter(s => s.teacher?.id === myTeacherId || s.teacherId === myTeacherId);

      // Detect group sessions
      const isGroupSession = (s) =>
        !!s.course ||
        !s.student ||
        (s.type && String(s.type).toLowerCase().includes("group")) ||
        (s.title && String(s.title).includes("مجموعة"));

      const myGroupSessions = mySessions.filter(isGroupSession);

      // Group by Title + Course ID
      const groupMap = {};
      myGroupSessions.forEach(s => {
        const titleKey = (s.title || 'مجموعة بدون عنوان').trim();
        const courseKey = s.course?.id || 'nocourse';
        const key = `${titleKey}__${courseKey}`;

        if (!groupMap[key]) {
          groupMap[key] = {
            key,
            title: titleKey,
            teacher: s.teacher || state.user,
            meetingLink: s.meetingLink || s.teacher?.meetingLink || state.user?.meetingLink || null,
            course: s.course,
            sessions: [],
            studentsMap: {} // unique students in this group
          };
        }

        groupMap[key].sessions.push(s);

        if (s.student && s.student.id) {
          groupMap[key].studentsMap[s.student.id] = s.student;
        }
      });

      // Process dates and unique students
      Object.values(groupMap).forEach(g => {
        g.sessions.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
        g.students = Object.values(g.studentsMap);
      });

      this.groupsData = Object.values(groupMap);
      this.renderUI();
    } catch (err) {
      console.error("Error rendering TeacherGroupsView:", err);
      this.container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--error);">حدث خطأ أثناء تحميل مجموعات المعلم.</div>`;
    }
  }

  renderUI() {
    const now = Date.now();

    // Process group status
    const processedGroups = this.groupsData.map(group => {
      let liveSession = null;
      let upcomingSessions = [];
      let completedCount = 0;

      // Unique date/time slots
      const timeSlotsMap = {};
      group.sessions.forEach(s => {
        const slotKey = new Date(s.scheduledAt).toISOString();
        if (!timeSlotsMap[slotKey]) {
          timeSlotsMap[slotKey] = s;
        }
      });
      const uniqueSessions = Object.values(timeSlotsMap).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

      uniqueSessions.forEach(s => {
        const sTime = new Date(s.scheduledAt).getTime();
        const durM = s.duration || 60;
        const diffM = (sTime - now) / 60000;
        const isPast = diffM < -durM;
        const isLive = (s.status === "live" || s.status === "active") || (diffM <= 0 && diffM > -durM);
        const isSoon = diffM > 0 && diffM <= 30;

        if (isLive || isSoon) {
          if (!liveSession) liveSession = s;
        }
        if (!isPast) {
          upcomingSessions.push(s);
        } else {
          completedCount++;
        }
      });

      const isCompleted = uniqueSessions.length > 0 && completedCount === uniqueSessions.length;

      return {
        ...group,
        uniqueSessions,
        liveSession,
        upcomingSessions,
        nextSession: upcomingSessions[0] || null,
        completedCount,
        isCompleted
      };
    });

    // Summary stats
    const totalGroupsCount = processedGroups.length;
    const liveGroupsCount  = processedGroups.filter(g => g.liveSession).length;
    const totalStudentsEnrolled = processedGroups.reduce((acc, g) => acc + g.students.length, 0);

    // Apply Filter & Search
    let filteredGroups = processedGroups.filter(g => {
      const q = this.searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        g.title.toLowerCase().includes(q) ||
        (g.course?.title && g.course.title.toLowerCase().includes(q)) ||
        g.students.some(st => st.name?.toLowerCase().includes(q) || st.email?.toLowerCase().includes(q));

      if (!matchQuery) return false;

      if (this.filterStatus === "live") return !!g.liveSession;
      if (this.filterStatus === "upcoming") return !g.isCompleted;
      if (this.filterStatus === "completed") return g.isCompleted;
      return true;
    });

    this.container.innerHTML = `
      <style>
        .group-search-input:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15) !important;
        }
        .filter-tab-btn {
          padding: 8px 18px;
          border-radius: 20px;
          font-size: 0.84rem;
          font-weight: 800;
          border: 1px solid var(--border-color);
          background: var(--bg-card);
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .filter-tab-btn.active {
          background: #6366f1;
          color: #ffffff;
          border-color: #6366f1;
          box-shadow: 0 4px 12px rgba(99,102,241,0.3);
        }
        .group-card-hover {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .group-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(0,0,0,0.08);
        }
      </style>

      <div style="max-width:1280px; margin:0 auto; padding:24px 16px; display:flex; flex-direction:column; gap:24px; box-sizing:border-box;">
        
        <!-- Header Banner -->
        <div class="glass-card" style="padding:24px; border-radius:24px; background:linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.06)); border:1px solid rgba(99,102,241,0.2); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <div>
            <h2 style="font-size:1.6rem; font-weight:900; margin:0 0 6px 0; color:var(--text-main); display:flex; align-items:center; gap:10px;">
              <i data-lucide="users" style="width:28px; height:28px; color:#6366f1;"></i>
              مجموعاتي والحصص الجماعية (لوحة المعلم) 👨‍🏫
            </h2>
            <p style="color:var(--text-muted); font-size:0.88rem; margin:0;">
              إدارة مجموعات البث المباشر الخاصة بك، متابعة الطلاب المسجلين بالجروب، ومواعيد البث المباشر
            </p>
          </div>
          ${getTimezoneBadgeHTML()}
        </div>

        <!-- Summary Stats Bar -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px; width:100%; box-sizing:border-box;">
          <div class="glass-card" style="padding:16px 20px; border-radius:18px; border-inline-start:4px solid #6366f1; display:flex; align-items:center; gap:14px;">
            <div style="width:44px; height:44px; border-radius:14px; background:rgba(99,102,241,0.12); color:#6366f1; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="users" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <div style="font-size:1.4rem; font-weight:900; color:var(--text-main);">${totalGroupsCount}</div>
              <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">مجموعاتي التعليمية</div>
            </div>
          </div>

          <div class="glass-card" style="padding:16px 20px; border-radius:18px; border-inline-start:4px solid #10b981; display:flex; align-items:center; gap:14px;">
            <div style="width:44px; height:44px; border-radius:14px; background:rgba(16,185,129,0.12); color:#10b981; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="radio" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <div style="font-size:1.4rem; font-weight:900; color:#10b981;">${liveGroupsCount}</div>
              <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">بث مباشر الآن 🔴</div>
            </div>
          </div>

          <div class="glass-card" style="padding:16px 20px; border-radius:18px; border-inline-start:4px solid #a855f7; display:flex; align-items:center; gap:14px;">
            <div style="width:44px; height:44px; border-radius:14px; background:rgba(168,85,247,0.12); color:#a855f7; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="graduation-cap" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <div style="font-size:1.4rem; font-weight:900; color:var(--text-main);">${totalStudentsEnrolled}</div>
              <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">إجمالي الطلاب المسجلين</div>
            </div>
          </div>
        </div>

        <!-- Search & Filter Bar -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; width:100%; box-sizing:border-box;">
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="filter-tab-btn ${this.filterStatus === 'all' ? 'active' : ''}" data-filter="all">
              <i data-lucide="grid" style="width:14px; height:14px;"></i> الكل (${totalGroupsCount})
            </button>
            <button class="filter-tab-btn ${this.filterStatus === 'live' ? 'active' : ''}" data-filter="live">
              <span style="width:8px; height:8px; border-radius:50%; background:#10b981; display:inline-block;"></span> مباشر الآن (${liveGroupsCount})
            </button>
            <button class="filter-tab-btn ${this.filterStatus === 'upcoming' ? 'active' : ''}" data-filter="upcoming">
              <i data-lucide="clock" style="width:14px; height:14px;"></i> المجموعات النشطة
            </button>
            <button class="filter-tab-btn ${this.filterStatus === 'completed' ? 'active' : ''}" data-filter="completed">
              <i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> المكتملة
            </button>
          </div>

          <div style="position:relative; width:100%; max-width:320px;">
            <input type="text" id="group-search-input" class="group-search-input" value="${this.searchQuery}" placeholder="ابحث باسم المجموعة أو طالب..."
              style="width:100%; padding:10px 16px 10px 38px; border-radius:30px; border:1px solid var(--border-color); background:var(--bg-card); color:var(--text-main); font-size:0.88rem; outline:none; box-sizing:border-box;">
            <i data-lucide="search" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); width:16px; height:16px; color:var(--text-muted); pointer-events:none;"></i>
          </div>
        </div>

        <!-- Group Cards Grid -->
        ${filteredGroups.length === 0 ? `
          <div class="glass-card" style="text-align:center; padding:60px 24px; border-radius:24px; color:var(--text-muted);">
            <div style="width:64px; height:64px; border-radius:20px; background:rgba(99,102,241,0.08); display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto;">
              <i data-lucide="users" style="width:32px; height:32px; color:var(--primary); opacity:0.5;"></i>
            </div>
            <h3 style="font-size:1.1rem; font-weight:800; margin:0 0 8px 0; color:var(--text-main);">
              ${this.searchQuery ? 'لا توجد مجموعات تطابق نتائج البحث' : 'لا توجد مجموعات جماعية مخصصة بعد'}
            </h3>
            <p style="font-size:0.85rem; line-height:1.6; max-width:400px; margin:0 auto; color:var(--text-muted);">
              ${this.searchQuery ? 'جرب بحث بكلمة أخرى.' : 'يمكنك إنشاء وجدولة مجموعات أونلاين جديدة من خلال المشرف أو التواصل مع إدارة المنصة.'}
            </p>
          </div>
        ` : `
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(360px, 1fr)); gap:20px; width:100%; box-sizing:border-box;">
            ${filteredGroups.map(group => this.renderGroupCard(group, now)).join('')}
          </div>
        `}

      </div>

      <!-- Students Modal Container -->
      <div id="teacher-group-modal-container"></div>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  renderGroupCard(group, now) {
    const isExpanded = this.expandedGroupKeys.has(group.key);
    const meetLink = group.meetingLink || state.user?.meetingLink || null;
    const nextFmt = group.nextSession ? formatSessionDateTime(group.nextSession.scheduledAt, null, {}) : null;

    const totalCount = group.uniqueSessions.length;
    const completedPct = totalCount > 0 ? Math.round((group.completedCount / totalCount) * 100) : 0;
    const studentsCount = group.students.length;

    return `
      <div class="glass-card group-card-hover" style="border-radius:20px; border:1px solid ${group.liveSession ? 'rgba(16,185,129,0.4)' : 'var(--border-color)'}; background:var(--bg-card); display:flex; flex-direction:column; overflow:hidden; ${group.liveSession ? 'box-shadow:0 0 24px rgba(16,185,129,0.12);' : ''}">

        <!-- Header -->
        <div style="padding:18px 20px 14px; background:linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.04)); border-bottom:1px solid var(--border-color);">
          
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:8px;">
            <div>
              <span style="font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:12px; background:rgba(99,102,241,0.12); color:#6366f1; display:inline-block; margin-bottom:6px;">
                ${group.course?.title || 'مجموعة تعليمية'}
              </span>
              <h3 style="font-size:1.05rem; font-weight:900; color:var(--text-main); margin:0; line-height:1.3;">
                👥 ${group.title}
              </h3>
            </div>

            ${group.liveSession
              ? `<span style="padding:4px 12px; border-radius:20px; font-size:0.75rem; font-weight:800; background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); white-space:nowrap; flex-shrink:0;">🔴 مباشر الآن</span>`
              : group.isCompleted
                ? `<span style="padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700; background:var(--bg-app); color:var(--text-muted); white-space:nowrap; flex-shrink:0;">✅ مكتملة</span>`
                : `<span style="padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:800; background:rgba(99,102,241,0.1); color:var(--primary); white-space:nowrap; flex-shrink:0;">نشطة ⚡</span>`
            }
          </div>

          <!-- Students Summary Avatars Row -->
          <div style="display:flex; align-items:center; justify-content:space-between; margin-top:10px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <div style="display:flex; margin-inline-start:4px;">
                ${group.students.slice(0, 4).map((st, i) => `
                  <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(st.name || 'st')}" title="${st.name}"
                    style="width:28px; height:28px; border-radius:50%; border:2px solid var(--bg-card); margin-inline-start:-8px; object-fit:cover;">
                `).join('')}
              </div>
              <span style="font-size:0.8rem; font-weight:800; color:var(--text-main);">
                ${studentsCount} طلاب بالجروب
              </span>
            </div>

            <!-- View Students List Button -->
            <button class="view-students-modal-btn" data-key="${group.key}"
              style="padding:4px 10px; font-size:0.75rem; font-weight:800; border-radius:14px; border:1px solid var(--primary); background:rgba(99,102,241,0.08); color:var(--primary); cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
              <i data-lucide="users" style="width:12px; height:12px;"></i> الطلاب 💬
            </button>
          </div>

        </div>

        <!-- Body -->
        <div style="padding:16px 20px; flex:1; display:flex; flex-direction:column; gap:12px;">

          <!-- Next Session Pill -->
          ${group.nextSession ? `
            <div style="padding:10px 14px; border-radius:14px; background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.15); display:flex; align-items:center; justify-content:space-between; gap:8px;">
              <div style="display:flex; align-items:center; gap:6px; font-size:0.8rem; font-weight:700; color:var(--primary);">
                <i data-lucide="clock" style="width:14px; height:14px;"></i>
                <span>موعد البث القادم:</span>
              </div>
              <span style="font-size:0.8rem; font-weight:800; color:var(--text-main);">${nextFmt?.dateStr || ''} • ${nextFmt?.timeStr || ''}</span>
            </div>
          ` : `
            <div style="padding:8px 12px; border-radius:12px; background:rgba(34,197,94,0.06); color:#22c55e; font-size:0.8rem; font-weight:700; text-align:center;">
              🎉 تم تنفيذ جميع حصص المجموعة بالكامل
            </div>
          `}

          <!-- Progress -->
          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:700; color:var(--text-muted); margin-bottom:4px;">
              <span>تقدم الحصص</span>
              <span>${group.completedCount} من ${totalCount} حصة (${completedPct}%)</span>
            </div>
            <div style="width:100%; height:6px; background:var(--bg-app); border-radius:10px; overflow:hidden;">
              <div style="width:${completedPct}%; height:100%; background:linear-gradient(90deg, #6366f1, #10b981); border-radius:10px;"></div>
            </div>
          </div>

          <!-- Start Live Button -->
          ${group.liveSession ? `
            <a href="${meetLink || '#classroom/' + group.liveSession.id}" ${meetLink ? 'target="_blank" rel="noopener"' : ''}
              style="display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:11px 16px; border-radius:14px; font-size:0.88rem; font-weight:800; text-decoration:none; background:linear-gradient(135deg,#10b981,#059669); color:#fff; box-shadow:0 4px 14px rgba(16,185,129,0.3); transition:transform 0.15s;">
              <i data-lucide="video" style="width:16px; height:16px;"></i>
              بدء البث المباشر للمجموعة الآن 🎥🔴
            </a>
          ` : ''}

          <!-- Expand / Collapse Schedule -->
          <button class="toggle-schedule-btn" data-key="${group.key}"
            style="width:100%; padding:9px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.82rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; margin-top:auto; transition:background 0.2s;">
            <i data-lucide="${isExpanded ? 'chevron-up' : 'calendar'}" style="width:14px; height:14px;"></i>
            ${isExpanded ? 'إخفاء جدول الحصص ▲' : `عرض جدول الحصص والتفاصيل (${totalCount}) ▼`}
          </button>

        </div>

        <!-- Collapsible Drawer -->
        ${isExpanded ? `
          <div style="padding:16px 20px; border-top:1px dashed var(--border-color); background:rgba(0,0,0,0.02); display:flex; flex-direction:column; gap:8px;">
            <div style="font-size:0.78rem; font-weight:800; color:var(--text-muted); margin-bottom:4px;">
              📅 مواعيد الحصص المحددة للمجموعة:
            </div>
            ${group.uniqueSessions.map((s, idx) => {
              const sTime  = new Date(s.scheduledAt).getTime();
              const diffM  = (sTime - now) / 60000;
              const durM   = s.duration || 60;
              const isPast = diffM < -durM;
              const isNow  = (s.status === "live" || s.status === "active") || (diffM <= 0 && diffM > -durM);
              const isSoon = diffM > 0 && diffM <= 30;
              const fmt    = formatSessionDateTime(s.scheduledAt, null, {});

              let badgeText = isPast ? '✅ نفذت' : isNow ? '🔴 مباشر' : isSoon ? '⚡ قريباً' : '⏳ قادمة';
              let badgeColor = isPast ? '#22c55e' : isNow || isSoon ? '#10b981' : 'var(--primary)';
              let badgeBg    = isPast ? 'rgba(34,197,94,0.1)' : isNow || isSoon ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.1)';

              return `
                <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 12px; border-radius:10px; background:var(--bg-card); border:1px solid var(--border-color); font-size:0.8rem;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-weight:900; color:var(--primary); font-size:0.75rem;">#${idx + 1}</span>
                    <span style="font-weight:700; color:${isPast ? 'var(--text-muted)' : 'var(--text-main)'};">${fmt.dateStr}</span>
                    <span style="color:var(--text-muted); font-size:0.75rem;">🕐 ${fmt.timeStr}</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:6px;">
                    <span style="font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:12px; background:${badgeBg}; color:${badgeColor};">
                      ${badgeText}
                    </span>
                    ${(isNow || isSoon) ? `
                      <a href="${meetLink || '#classroom/' + s.id}" ${meetLink ? 'target="_blank" rel="noopener"' : ''}
                        style="font-size:0.7rem; font-weight:800; padding:3px 10px; border-radius:12px; background:#10b981; color:#fff; text-decoration:none;">
                        بدء
                      </a>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

      </div>
    `;
  }

  openStudentsModal(groupKey) {
    const group = this.groupsData.find(g => g.key === groupKey);
    if (!group) return;

    const container = document.getElementById("teacher-group-modal-container");
    if (!container) return;

    const students = group.students || [];

    container.innerHTML = `
      <div style="position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;">
        <div class="glass-card" style="width:100%; max-width:540px; border-radius:24px; padding:24px; max-height:85vh; display:flex; flex-direction:column; gap:16px; position:relative; overflow:hidden;">
          
          <!-- Modal Header -->
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:14px;">
            <div>
              <h3 style="font-size:1.15rem; font-weight:900; margin:0 0 4px 0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                <i data-lucide="users" style="width:20px; height:20px; color:#6366f1;"></i>
                طلاب المجموعة (${students.length})
              </h3>
              <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">
                👥 ${group.title}
              </p>
            </div>
            <button id="close-teacher-group-modal" style="background:var(--bg-app); border:1px solid var(--border-color); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--text-main);">
              &times;
            </button>
          </div>

          <!-- Students List -->
          <div style="overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:10px; padding-inline-end:4px;">
            ${students.length === 0 ? `
              <div style="text-align:center; padding:40px; color:var(--text-muted); font-size:0.88rem;">
                لا يوجد طلاب مسجلون في هذه المجموعة بعد.
              </div>
            ` : students.map(st => {
              const cleanWhatsApp = getCleanWhatsAppNumber(st.phone);
              const avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(st.name || 'student')}`;
              return `
                <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; border-radius:16px; background:var(--bg-app); border:1px solid var(--border-color); flex-wrap:wrap;">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <img src="${avatar}" alt="${st.name}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1px solid var(--border-color);">
                    <div>
                      <div style="font-size:0.9rem; font-weight:800; color:var(--text-main);">${st.name}</div>
                      <div style="font-size:0.78rem; color:var(--text-muted);">${st.email || ''}</div>
                      ${st.phone ? `<div style="font-size:0.75rem; color:var(--primary); font-weight:600; margin-top:2px;">📱 ${st.phone}</div>` : ''}
                    </div>
                  </div>

                  ${st.phone ? `
                    <a href="https://wa.me/${cleanWhatsApp}" target="_blank" rel="noopener"
                      style="display:inline-flex; align-items:center; gap:6px; padding:6px 14px; border-radius:20px; background:#25D366; color:#ffffff; font-size:0.78rem; font-weight:800; text-decoration:none; box-shadow:0 3px 10px rgba(37,211,102,0.25);">
                      💬 واتساب
                    </a>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>

        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    document.getElementById("close-teacher-group-modal")?.addEventListener("click", () => {
      container.innerHTML = "";
    });
  }

  bindEvents() {
    const searchInput = this.container.querySelector("#group-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value;
        this.renderUI();
      });
    }

    this.container.querySelectorAll(".filter-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.filterStatus = btn.getAttribute("data-filter");
        this.renderUI();
      });
    });

    this.container.querySelectorAll(".toggle-schedule-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-key");
        if (this.expandedGroupKeys.has(key)) {
          this.expandedGroupKeys.delete(key);
        } else {
          this.expandedGroupKeys.add(key);
        }
        this.renderUI();
      });
    });

    this.container.querySelectorAll(".view-students-modal-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-key");
        this.openStudentsModal(key);
      });
    });
  }
}
