import { apiFetch, state, showToast, t, formatSessionDateTime, getTimezoneBadgeHTML } from "../../app.js";

export default class StudentGroupsView {
  constructor(container) {
    this.container = container;
    this.searchQuery = "";
    this.filterStatus = "all"; // 'all', 'live', 'upcoming', 'completed'
    this.groupsData = [];
    this.expandedGroupKeys = new Set();
  }

  async render() {
    try {
      const [sessions, enrollments] = await Promise.all([
        apiFetch("/sessions").catch(() => []),
        apiFetch("/student/enrollments").catch(() => [])
      ]);

      const rawSessions = sessions || [];
      const currentStudentId = state.user?.id;
      const activeEnrollments = (enrollments || []).filter(e => e.status === "active");
      const pendingEnrollments = (enrollments || []).filter(e => e.status === "pending");
      const enrolledCourseIds = new Set(activeEnrollments.map(e => e.course?.id).filter(Boolean));

      // 1. First add groups from active enrollments (CourseGroup cohorts)
      const groupMap = {};

      activeEnrollments.forEach(enr => {
        if (enr.group) {
          const g = enr.group;
          const course = enr.course;
          const key = `cohort_${g.id}`;
          groupMap[key] = {
            key,
            isCohortGroup: true,
            isPending: false,
            id: g.id,
            title: g.name || `${course?.title} - مجموعة`,
            scheduleText: g.scheduleText || `${g.scheduleDays || 'الأحد، الثلاثاء'} الساعة ${g.scheduleTime || '6:00م'}`,
            scheduleDays: g.scheduleDays,
            scheduleTime: g.scheduleTime,
            maxStudents: g.maxStudents || 25,
            teacher: g.teacher || course?.teacher || state.user,
            meetingLink: g.meetingLink || course?.meetingLink || null,
            course: course,
            grade: course?.grade,
            subject: course?.subject,
            sessions: []
          };
        }
      });

      // 1b. Add groups from PENDING enrollments (show as pending-approval card)
      pendingEnrollments.forEach(enr => {
        if (enr.group) {
          const g = enr.group;
          const course = enr.course;
          const key = `cohort_${g.id}`;
          // Only add if not already active
          if (!groupMap[key]) {
            groupMap[key] = {
              key,
              isCohortGroup: true,
              isPending: true,
              id: g.id,
              title: g.name || `${course?.title} - مجموعة`,
              scheduleText: g.scheduleText || `${g.scheduleDays || 'الأحد، الثلاثاء'} الساعة ${g.scheduleTime || '6:00م'}`,
              scheduleDays: g.scheduleDays,
              scheduleTime: g.scheduleTime,
              maxStudents: g.maxStudents || 25,
              teacher: g.teacher || course?.teacher || state.user,
              meetingLink: null, // no meeting link until approved
              course: course,
              grade: course?.grade,
              subject: course?.subject,
              sessions: []
            };
          }
        } else if (enr.course && !activeEnrollments.find(a => a.course?.id === enr.course.id)) {
          // Pending enrollment without a specific group
          const course = enr.course;
          const key = `pending_course_${course.id}`;
          if (!groupMap[key]) {
            groupMap[key] = {
              key,
              isCohortGroup: false,
              isPending: true,
              id: null,
              title: course.title || 'دورة دراسية',
              scheduleText: '',
              maxStudents: 0,
              teacher: course.teacher || null,
              meetingLink: null,
              course: course,
              grade: course?.grade,
              subject: course?.subject,
              sessions: []
            };
          }
        }
      });

      // 2. Add sessions and link them to course cohorts or general groups
      const isGroupSessionForMe = (s) => {
        if (s.student?.id) return s.student.id === currentStudentId;
        if (s.course?.id) return enrolledCourseIds.has(s.course.id);
        return false;
      };

      const myGroupSessions = rawSessions.filter(isGroupSessionForMe);

      myGroupSessions.forEach(s => {
        const courseId = s.course?.id;
        // Find existing cohort group for this course or create a general group
        const matchingCohortKey = Object.keys(groupMap).find(k => groupMap[k].course?.id === courseId);

        if (matchingCohortKey) {
          groupMap[matchingCohortKey].sessions.push(s);
        } else {
          const key = `${s.title || 'مجموعة'}__${s.teacher?.id || ''}`;
          if (!groupMap[key]) {
            groupMap[key] = {
              key,
              isCohortGroup: false,
              title: s.title || 'مجموعة دراسية',
              teacher: s.teacher,
              meetingLink: s.meetingLink || s.teacher?.meetingLink || null,
              course: s.course,
              grade: s.course?.grade,
              subject: s.course?.subject,
              sessions: []
            };
          }
          groupMap[key].sessions.push(s);
        }
      });

      // Sort sessions for each group
      Object.values(groupMap).forEach(g => {
        g.sessions.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
      });

      this.groupsData = Object.values(groupMap);
      this.renderUI();
    } catch (err) {
      console.error("Error rendering StudentGroupsView:", err);
      this.container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--error);">حدث خطأ أثناء تحميل بيانات المجموعات.</div>`;
    }
  }

  renderUI() {
    const now = Date.now();

    // Process status for each group
    const processedGroups = this.groupsData.map(group => {
      let liveSession = null;
      let upcomingSessions = [];
      let completedCount = 0;

      group.sessions.forEach(s => {
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

      const isCompleted = group.sessions.length > 0 && completedCount === group.sessions.length;

      return {
        ...group,
        liveSession,
        upcomingSessions,
        nextSession: upcomingSessions[0] || null,
        completedCount,
        isCompleted
      };
    });

    // Sort groups so earlier sessions appear first:
    // 1. Live sessions come first
    // 2. Earliest upcoming session (Today, Tomorrow, next days...) in ascending chronological order
    // 3. Completed groups last
    processedGroups.sort((a, b) => {
      // 1. Live session first
      if (a.liveSession && !b.liveSession) return -1;
      if (!a.liveSession && b.liveSession) return 1;

      // 2. Earliest upcoming session
      if (a.nextSession && b.nextSession) {
        return new Date(a.nextSession.scheduledAt).getTime() - new Date(b.nextSession.scheduledAt).getTime();
      }
      if (a.nextSession && !b.nextSession) return -1;
      if (!a.nextSession && b.nextSession) return 1;

      // 3. Both completed -> most recent session first
      const lastA = a.sessions[a.sessions.length - 1]?.scheduledAt ? new Date(a.sessions[a.sessions.length - 1].scheduledAt).getTime() : 0;
      const lastB = b.sessions[b.sessions.length - 1]?.scheduledAt ? new Date(b.sessions[b.sessions.length - 1].scheduledAt).getTime() : 0;
      return lastB - lastA;
    });

    // Summary stats
    const totalGroupsCount = processedGroups.length;
    const liveGroupsCount = processedGroups.filter(g => g.liveSession).length;
    const todaySessionsCount = processedGroups.reduce((acc, g) => {
      const todayStr = new Date().toDateString();
      const countToday = g.sessions.filter(s => new Date(s.scheduledAt).toDateString() === todayStr).length;
      return acc + countToday;
    }, 0);

    // Apply Filter & Search
    let filteredGroups = processedGroups.filter(g => {
      // Search match
      const q = this.searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        g.title.toLowerCase().includes(q) ||
        (g.teacher?.name && g.teacher.name.toLowerCase().includes(q)) ||
        (g.course?.title && g.course.title.toLowerCase().includes(q));

      if (!matchQuery) return false;

      // Filter status
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
              مجموعاتي والحصص الجماعية 👥
            </h2>
            <p style="color:var(--text-muted); font-size:0.88rem; margin:0;">
              استعرض المجموعات المسجل بها، متابعة الحصص القادمة، والدخول الفوري للبث المباشر
            </p>
          </div>
          ${getTimezoneBadgeHTML()}
        </div>

        <!-- Stat Summary Bar -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px; width:100%; box-sizing:border-box;">
          <div class="glass-card" style="padding:16px 20px; border-radius:18px; border-inline-start:4px solid #6366f1; display:flex; align-items:center; gap:14px;">
            <div style="width:44px; height:44px; border-radius:14px; background:rgba(99,102,241,0.12); color:#6366f1; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="users" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <div style="font-size:1.4rem; font-weight:900; color:var(--text-main);">${totalGroupsCount}</div>
              <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">إجمالي المجموعات</div>
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
              <i data-lucide="calendar" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <div style="font-size:1.4rem; font-weight:900; color:var(--text-main);">${todaySessionsCount}</div>
              <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">حصص اليوم المباشرة</div>
            </div>
          </div>
        </div>

        <!-- Search & Filter Bar -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; width:100%; box-sizing:border-box;">
          <!-- Filter Tabs -->
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="filter-tab-btn ${this.filterStatus === 'all' ? 'active' : ''}" data-filter="all">
              <i data-lucide="grid" style="width:14px; height:14px;"></i> الكل (${totalGroupsCount})
            </button>
            <button class="filter-tab-btn ${this.filterStatus === 'live' ? 'active' : ''}" data-filter="live">
              <span style="width:8px; height:8px; border-radius:50%; background:#10b981; display:inline-block;"></span> مباشر الآن (${liveGroupsCount})
            </button>
            <button class="filter-tab-btn ${this.filterStatus === 'upcoming' ? 'active' : ''}" data-filter="upcoming">
              <i data-lucide="clock" style="width:14px; height:14px;"></i> النشطة والقادمة
            </button>
            <button class="filter-tab-btn ${this.filterStatus === 'completed' ? 'active' : ''}" data-filter="completed">
              <i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> المكتملة
            </button>
          </div>

          <!-- Search Input -->
          <div style="position:relative; width:100%; max-width:320px;">
            <input type="text" id="group-search-input" class="group-search-input" value="${this.searchQuery}" placeholder="ابحث باسم المجموعة أو المعلم..."
              style="width:100%; padding:10px 16px 10px 38px; border-radius:30px; border:1px solid var(--border-color); background:var(--bg-card); color:var(--text-main); font-size:0.88rem; outline:none; box-sizing:border-box;">
            <i data-lucide="search" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); width:16px; height:16px; color:var(--text-muted); pointer-events:none;"></i>
          </div>
        </div>

        <!-- Groups Cards Grid -->
        ${filteredGroups.length === 0 ? `
          <div class="glass-card" style="text-align:center; padding:60px 24px; border-radius:24px; color:var(--text-muted);">
            <div style="width:64px; height:64px; border-radius:20px; background:rgba(99,102,241,0.08); display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto;">
              <i data-lucide="users" style="width:32px; height:32px; color:var(--primary); opacity:0.5;"></i>
            </div>
            <h3 style="font-size:1.1rem; font-weight:800; margin:0 0 8px 0; color:var(--text-main);">
              ${this.searchQuery ? 'لا توجد مجموعات تطابق بحثك' : 'لا توجد مجموعات حالياً'}
            </h3>
            <p style="font-size:0.85rem; line-height:1.6; max-width:400px; margin:0 auto; color:var(--text-muted);">
              ${this.searchQuery ? 'جرب البحث بكلمة أخرى أو إعادة ضبط الفلتر.' : 'تواصل مع إدارة المنصة لإضافتك لمجموعات البث المباشر المتاحة.'}
            </p>
          </div>
        ` : `
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(360px, 1fr)); gap:20px; width:100%; box-sizing:border-box;">
            ${filteredGroups.map(group => this.renderGroupCard(group, now)).join('')}
          </div>
        `}

      </div>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  getRelativeDateLabel(dateInput) {
    if (!dateInput) return null;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { text: "اليوم", bg: "rgba(239,68,68,0.12)", color: "#ef4444", icon: "🔥" };
    if (diffDays === 1) return { text: "غداً", bg: "rgba(245,158,11,0.14)", color: "#d97706", icon: "⚡" };
    if (diffDays === 2) return { text: "بعد غد", bg: "rgba(99,102,241,0.12)", color: "#6366f1", icon: "📅" };
    if (diffDays < 0) return { text: "سابقاً", bg: "rgba(107,114,128,0.1)", color: "#6b7280", icon: "✓" };
    return null;
  }

  renderGroupCard(group, now) {
    const isExpanded = this.expandedGroupKeys.has(group.key);
    const teacherAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(group.teacher?.name || 'teacher')}`;
    const meetLink = group.meetingLink || group.teacher?.meetingLink || null;
    const nextFmt = group.nextSession ? formatSessionDateTime(group.nextSession.scheduledAt, null, {}) : null;
    const nextRel = group.nextSession ? this.getRelativeDateLabel(group.nextSession.scheduledAt) : null;

    // Progress percentage
    const totalCount = group.sessions.length;
    const completedPct = totalCount > 0 ? Math.round((group.completedCount / totalCount) * 100) : 0;

    // Find latest completed session with report/summary details
    const completedSessions = (group.sessions || []).filter(s =>
      s.status === "completed" || s.status === "COMPLETED" || Boolean(s.completedAt) || Boolean(s.whatWasCovered || s.homework || s.topic)
    );
    const latestCompleted = completedSessions.length > 0 ? completedSessions[completedSessions.length - 1] : null;

    return `
      <div class="glass-card group-card-hover" style="border-radius:20px; border:1px solid ${group.liveSession ? 'rgba(16,185,129,0.4)' : 'var(--border-color)'}; background:var(--bg-card); display:flex; flex-direction:column; overflow:hidden; ${group.liveSession ? 'box-shadow:0 0 24px rgba(16,185,129,0.12);' : ''}">

        <!-- Card Header Header -->
        <div style="padding:18px 20px 14px; background:linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.04)); border-bottom:1px solid var(--border-color);">
          
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:12px;">
            <!-- Group Badge & Title -->
            <div>
              <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:6px;">
                <span style="font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:12px; background:rgba(99,102,241,0.12); color:#6366f1; display:inline-block;">
                  ${group.course?.title || 'مجموعة تعليمية'}
                </span>
                ${group.grade ? `<span style="font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:12px; background:rgba(16,185,129,0.12); color:#10b981;">${group.grade.name}</span>` : ''}
                ${group.subject ? `<span style="font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:12px; background:rgba(229,29,116,0.12); color:#e51d74;">${group.subject.name}</span>` : ''}
              </div>
              <h3 style="font-size:1.05rem; font-weight:900; color:var(--text-main); margin:0; line-height:1.3;">
                👥 ${group.title}
              </h3>
            </div>

            <!-- Live or Status Badge -->
            ${group.isPending
        ? `<span style="padding:4px 12px; border-radius:20px; font-size:0.75rem; font-weight:800; background:rgba(245,158,11,0.15); color:#d97706; border:1px solid rgba(245,158,11,0.35); white-space:nowrap; flex-shrink:0;">⏳ قيد المراجعة</span>`
        : group.liveSession
          ? `<span style="padding:4px 12px; border-radius:20px; font-size:0.75rem; font-weight:800; background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); white-space:nowrap; flex-shrink:0;">🔴 مباشر الآن</span>`
          : group.isCompleted
            ? `<span style="padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700; background:var(--bg-app); color:var(--text-muted); white-space:nowrap; flex-shrink:0;">✅ مكتملة</span>`
            : `<span style="padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:800; background:rgba(99,102,241,0.1); color:var(--primary); white-space:nowrap; flex-shrink:0;">نشطة ⚡</span>`
      }
          </div>

          <!-- Teacher Row -->
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${teacherAvatar}" alt="${group.teacher?.name || ''}"
              style="width:36px; height:36px; border-radius:12px; object-fit:cover; border:1.5px solid rgba(99,102,241,0.25);">
            <div>
              <div style="font-size:0.85rem; font-weight:800; color:var(--text-main);">${group.teacher?.name || 'الأستاذ'}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">معلم المجموعة الرسمي</div>
            </div>
          </div>

        </div>

        <!-- Card Body Info -->
        <div style="padding:16px 20px; flex:1; display:flex; flex-direction:column; gap:12px;">

          <!-- Pending Approval Notice (shows only for pending enrollments) -->
          ${group.isPending ? `
            <div style="padding:14px 16px; border-radius:14px; background:rgba(245,158,11,0.08); border:1.5px solid rgba(245,158,11,0.3); display:flex; flex-direction:column; gap:6px; margin-top:auto;">
              <div style="display:flex; align-items:center; gap:8px; font-size:0.88rem; font-weight:900; color:#d97706;">
                <i data-lucide="clock" style="width:16px; height:16px;"></i>
                <span>طلبك قيد المراجعة والاعتماد ⏳</span>
              </div>
              <p style="font-size:0.8rem; color:var(--text-muted); margin:0; line-height:1.5;">
                تم استلام طلب اشتراكك وإيصال الدفع. سيتم تفعيل مقعدك وإتاحة قاعة المجموعة فور مراجعة واعتماد الإدارة.
              </p>
            </div>
          ` : `
            <!-- Next Session Pill -->
            ${group.nextSession ? `
              <div style="padding:9px 12px; border-radius:12px; background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.15); display:flex; align-items:center; justify-content:space-between; gap:8px;">
                <div style="display:flex; align-items:center; gap:6px; font-size:0.78rem; font-weight:700; color:var(--primary);">
                  <i data-lucide="clock" style="width:14px; height:14px;"></i>
                  <span>الحصة القادمة:</span>
                </div>
                <span style="font-size:0.78rem; font-weight:800; color:var(--text-main);">${nextFmt?.dateStr || ''} • ${nextFmt?.timeStr || ''}</span>
              </div>
            ` : ''}

            <!-- Latest Session Report (When completed & report available) -->
            ${latestCompleted ? `
              <div style="padding:12px 14px; border-radius:14px; background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.22); display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                  <div style="display:flex; align-items:center; gap:6px; font-size:0.78rem; font-weight:800; color:#10b981;">
                    <i data-lucide="file-check-2" style="width:15px; height:15px;"></i>
                    <span>تقرير آخر حصة منجزة:</span>
                  </div>
                  <button class="view-session-report-btn" data-session-id="${latestCompleted.id}"
                    style="background:rgba(16,185,129,0.15); color:#059669; border:1px solid rgba(16,185,129,0.3); padding:4px 10px; border-radius:10px; font-size:0.75rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:4px; transition:transform 0.1s;"
                    onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='none'">
                    <i data-lucide="file-text" style="width:13px; height:13px;"></i>
                    <span>عرض الملخص 📋</span>
                  </button>
                </div>

                ${latestCompleted.topic ? `
                  <div style="font-size:0.84rem; font-weight:800; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${latestCompleted.topic}">
                    📌 ${latestCompleted.topic}
                  </div>
                ` : latestCompleted.whatWasCovered ? `
                  <div style="font-size:0.82rem; color:var(--text-main); font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${latestCompleted.whatWasCovered}">
                    📝 ${latestCompleted.whatWasCovered}
                  </div>
                ` : `
                  <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">
                    ${latestCompleted.title || 'تم إكمال الحصة وتوثيقها بنجاح'} ✅
                  </div>
                `}

                ${latestCompleted.homework ? `
                  <div style="font-size:0.78rem; font-weight:800; color:#d97706; background:rgba(245,158,11,0.1); padding:4px 8px; border-radius:8px; border:1px solid rgba(245,158,11,0.2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    📚 الواجب: ${latestCompleted.homework}
                  </div>
                ` : ''}
              </div>
            ` : ''}

            <!-- Live Session Quick Join Button (If Live) -->
            ${group.liveSession ? `
              <button class="btn-primary" data-join-meet-id="${group.liveSession.id}"
                style="display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:10px 16px; border-radius:14px; font-size:0.85rem; font-weight:800; border:none; background:linear-gradient(135deg,#10b981,#059669); color:#fff; box-shadow:0 4px 14px rgba(16,185,129,0.3); cursor:pointer;">
                <i data-lucide="video" style="width:15px; height:15px;"></i>
                الانضمام للبث المباشر الآن 🔴
              </button>
            ` : ''}

            <!-- Primary Action: Enter Group Hub -->
            ${group.id ? `
              <a href="#group/${group.id}" class="btn-primary"
                style="display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:12px 16px; border-radius:14px; font-size:0.9rem; font-weight:900; text-decoration:none; background:linear-gradient(135deg, #6366f1, #8b5cf6); color:#fff; box-shadow:0 4px 14px rgba(99,102,241,0.25); margin-top:auto; transition:transform 0.15s;"
                onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                <i data-lucide="layout-dashboard" style="width:17px; height:17px;"></i>
                <span>دخول قاعة المجموعة 🚀</span>
              </a>
            ` : ''}
          `}

        </div>

      </div>
    `;
  }

  bindEvents() {
    // Search input
    const searchInput = this.container.querySelector("#group-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value;
        this.renderUI();
      });
    }

    // Filter tabs
    this.container.querySelectorAll(".filter-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.filterStatus = btn.getAttribute("data-filter");
        this.renderUI();
      });
    });

    // Session report view modal
    this.container.querySelectorAll(".view-session-report-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const sId = btn.getAttribute("data-session-id");
        let foundSession = null;
        for (const g of this.groupsData) {
          const s = (g.sessions || []).find(x => String(x.id) === String(sId));
          if (s) { foundSession = s; break; }
        }
        if (foundSession && typeof window.showStudentSessionReportModal === "function") {
          window.showStudentSessionReportModal(foundSession);
        }
      });
    });
  }
}
