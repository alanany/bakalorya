import { apiFetch, state, showToast, t, confirmDialog, checkPendingRequestsNotification, renderCourseCard, handleWhatsAppResponse, showEnrollmentAcceptanceModal, getCleanWhatsAppNumber, validateSessionScheduledDate, getMinSessionDateTimeISO, formatSessionDateTime, getTimezoneBadgeHTML, canJoinSession } from "../../app.js";
import { AssignmentDetailsModal } from "../shared/AssignmentDetailsModal.js";
import { AssignmentGradingModal } from "../shared/AssignmentGradingModal.js";

export default class TeacherView {
  constructor(container) {
    this.container = container;
    this.courses = [];
    this.sessions = [];
    this.privateSessions = [];
    this.todaySessions = [];
    this.availability = [];
    this.blogs = [];
    this.assignedSubscriptions = [];
    this.assignments = [];
    this.groups = [];

    // New View State
    this.currentViewMode = 'dashboard';
    this.selectedSubscriptionId = null;
    this.sessionsFilterStatus = 'all';
  }

  async render() {
    this._curriculumEventsBound = false;
    try {
      const [allCourses, sessions, students, requests, allBlogs, privateSessions, todaySessions, availability, earnings, assignedSubscriptions, allAssignments, teacherGroups] = await Promise.all([
        apiFetch("/courses"),
        apiFetch("/sessions"),
        apiFetch("/users/students"),
        apiFetch("/teacher/enrollment-requests"),
        apiFetch("/blogs"),
        apiFetch("/teacher/private-sessions").catch(() => []),
        apiFetch("/teacher/private-sessions/today").catch(() => []),
        apiFetch("/teacher/availability/mine").catch(() => []),
        apiFetch("/teacher/earnings").catch(() => ({ stats: { pendingAmount: 0, totalEarned: 0 } })),
        apiFetch("/subscriptions/teacher-assigned").catch(() => []),
        apiFetch("/assignments").catch(() => []),
        apiFetch("/teacher/groups").catch(() => [])
      ]);

      this.courses = (allCourses || []).filter(c => c.teacher?.id === state.user.id);
      this.sessions = (sessions || []).filter(s => s.teacher?.id === state.user.id);
      this.privateSessions = privateSessions || [];
      this.todaySessions = todaySessions || [];
      this.availability = availability || [];
      this.blogs = (allBlogs || []).filter(b => b.author?.id === state.user.id);
      this.assignedSubscriptions = assignedSubscriptions || [];
      this.assignments = allAssignments || [];
      this.groups = teacherGroups || [];

      window.checkedInSessions = window.checkedInSessions || new Set();
      [...this.sessions, ...this.privateSessions, ...this.todaySessions].forEach(s => {
        if (s && s.isCheckedIn) {
          window.checkedInSessions.add(String(s.id));
        }
      });

      this.earningsData = earnings || { earnings: [], stats: {} };

      if (this.currentViewMode === 'financial' || window.location.hash.includes("teacher-financial")) {
        this.renderFinancialPage();
        return;
      }

      const totalCourses = this.courses.length;
      const upcomingSessions = this.sessions.filter(s => s.status === "scheduled").length;
      const activeStudentsCount = students ? students.length : 0;
      const filteredSessions = this.filterSessions(this.sessions);
      this.enrollmentRequests = requests || [];
      const pendingEarnings = earnings?.stats?.pendingAmount || 0;
      const completedPrivate = this.privateSessions.filter(s => s.status === "COMPLETED").length;

      // Compute today's unified sessions
      // Compute today's unified sessions (strictly deduplicated by ID)
      const now = new Date();
      const isToday = (dateVal) => {
        if (!dateVal) return false;
        const d = new Date(dateVal);
        return d.toDateString() === now.toDateString();
      };

      const sessionMap = new Map();
      (this.sessions || []).forEach(s => {
        if (s && s.id) {
          const isPriv = !!(s.student || s.subscription || s.studentId);
          sessionMap.set(String(s.id), {
            ...s,
            sessionType: isPriv ? 'private' : 'group'
          });
        }
      });

      (this.todaySessions || []).forEach(s => {
        if (s && s.id) {
          const existing = sessionMap.get(String(s.id)) || {};
          sessionMap.set(String(s.id), {
            ...existing,
            ...s,
            sessionType: 'private'
          });
        }
      });

      (this.privateSessions || []).forEach(s => {
        if (s && s.id) {
          const existing = sessionMap.get(String(s.id)) || {};
          sessionMap.set(String(s.id), {
            ...existing,
            ...s,
            sessionType: 'private'
          });
        }
      });

      const allSessionsList = Array.from(sessionMap.values());

      const allTodaySessions = allSessionsList
        .filter(s => isToday(s.scheduledAt) && !s.status?.toLowerCase().includes('cancel'))
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

      // Distinct today's private sessions for the right sidebar
      const distinctTodayPrivSessions = allTodaySessions.filter(s => s.sessionType === 'private' || !!s.student || !!s.subscription);

      // Upcoming sessions beyond today
      const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
      const upcomingFutureSessions = allSessionsList
        .filter(s => {
          if (!s.scheduledAt) return false;
          const sTime = new Date(s.scheduledAt).getTime();
          return sTime >= startOfTomorrow && s.status !== 'completed' && s.status !== 'COMPLETED' && !s.status?.toLowerCase().includes('cancel');
        })
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

      // Total pending grading solutions across all assignments
      let totalPendingGradingCount = 0;
      (this.assignments || []).forEach(asgn => {
        const subCount = asgn.submissionsCount || 0;
        const gradCount = asgn.gradedCount || 0;
        if (subCount > gradCount) {
          totalPendingGradingCount += (subCount - gradCount);
        }
      });

      const caps = state.user?.teacherCapabilities;
      const canAddCourse = state.user?.role === 'admin' || state.user?.role === 'teacher' || (!caps || caps.length === 0 || (Array.isArray(caps) ? caps.includes('COURSE_INSTRUCTOR') : (typeof caps === 'string' ? caps.includes('COURSE_INSTRUCTOR') : false)));

      const hour = new Date().getHours();
      let timeGreeting = "أهلاً بك يا أستاذ";
      if (hour >= 5 && hour < 12) timeGreeting = "صباح الهمة والعطاء يا أستاذ ☀️";
      else if (hour >= 12 && hour < 17) timeGreeting = "طاب يومك بكل خير يا أستاذ 🌤️";
      else timeGreeting = "مساء التميز والإنجاز يا أستاذ 🌙";

      const teacherName = state.user?.name || "المعلم";
      const teacherAvatar = state.user?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(teacherName)}`;

      this.container.innerHTML = `
        <div class="teacher-portal-modern" style="width:100%; max-width:1440px; margin:0 auto; padding:24px 20px 80px; box-sizing:border-box;">
          
          <!-- 1. Educator Studio Hero Header -->
          <div class="glass-card hero-teacher-banner" style="position:relative; overflow:hidden; border-radius:28px; padding:32px 36px; margin-bottom:28px; background:linear-gradient(135deg, rgba(79,70,229,0.12) 0%, rgba(168,85,247,0.08) 50%, rgba(245,158,11,0.08) 100%); border:1.5px solid var(--border-focus); box-shadow:0 12px 36px rgba(79,70,229,0.08);">
            
            <!-- Ambient Glow Orbs -->
            <div style="position:absolute; top:-30px; left:-30px; width:160px; height:160px; background:radial-gradient(circle, rgba(79,70,229,0.25) 0%, rgba(79,70,229,0) 70%); border-radius:50%; pointer-events:none;"></div>
            <div style="position:absolute; bottom:-40px; right:-20px; width:180px; height:180px; background:radial-gradient(circle, rgba(245,158,11,0.2) 0%, rgba(245,158,11,0) 70%); border-radius:50%; pointer-events:none;"></div>

            <div style="position:relative; z-index:2; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:24px;">
              
              <!-- Left: Teacher Info & Meta -->
              <div style="display:flex; align-items:center; gap:20px; flex:1; min-width:280px;">
                <div style="position:relative; flex-shrink:0;">
                  <img src="${teacherAvatar}" alt="${teacherName}" style="width:76px; height:76px; border-radius:50%; border:3px solid var(--primary); object-fit:cover; background:var(--bg-app); box-shadow:0 8px 24px rgba(79,70,229,0.25);">
                  <span style="position:absolute; bottom:2px; right:2px; width:16px; height:16px; background:#10b981; border:2px solid var(--bg-card); border-radius:50%;" title="متصل ومتاح للتدريس"></span>
                </div>

                <div>
                  <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:4px;">
                    <span style="font-size:0.82rem; font-weight:800; color:var(--primary); background:var(--primary-glow); padding:3px 12px; border-radius:20px; border:1px solid rgba(79,70,229,0.2); display:inline-flex; align-items:center; gap:4px;">
                      <i data-lucide="sparkles" style="width:13px;height:13px;"></i> ${timeGreeting}
                    </span>
                    <span style="font-size:0.8rem; font-weight:700; color:var(--text-muted); background:rgba(0,0,0,0.03); padding:3px 10px; border-radius:20px;">
                      👨‍🏫 لوحة المعلم المعتمد
                    </span>
                  </div>

                  <h1 style="font-size:clamp(1.4rem, 4vw, 1.9rem); font-weight:900; margin:0 0 6px 0; color:var(--text-main); letter-spacing:-0.5px;">
                    مرحباً بك، <span style="background:linear-gradient(135deg, var(--primary), #9333ea); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">${teacherName}</span> 👋
                  </h1>
                  
                  <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap;">
                    <span style="display:inline-flex; align-items:center; gap:6px; font-size:0.85rem; font-weight:800; color:var(--primary); background:rgba(99,102,241,0.08); padding:4px 14px; border-radius:20px; border:1px solid rgba(99,102,241,0.18);" title="المؤهل والتخصص الأكاديمي">
                      <i data-lucide="graduation-cap" style="width:15px;height:15px;"></i>
                      <span>${state.user?.education || 'أستاذ وخبير تربوي متميز'}</span>
                    </span>
                  </div>

                  <p style="color:var(--text-muted); font-size:0.92rem; margin:0; line-height:1.5;">
                    تابع دوراتك التعليمية، جدول حصص البث المباشر، وحصص الطلاب الخاصة واستحقاقاتك المالية.
                  </p>
                </div>
              </div>

              <!-- Right: Quick Action Buttons & Timezone -->
              <div style="display:flex; flex-direction:column; align-items:flex-end; gap:12px;">
                ${getTimezoneBadgeHTML()}
                
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                  ${canAddCourse ? `
                    <button class="btn-primary" id="open-course-modal-btn" style="padding:10px 20px; font-weight:800; font-size:0.88rem; border-radius:30px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 16px rgba(79,70,229,0.3);">
                      <i data-lucide="plus-circle" style="width:16px;height:16px;"></i> إضافة دورة جديدة ➕
                    </button>
                  ` : ''}

                  <button class="btn-secondary" id="open-financial-hub-btn" style="padding:10px 18px; font-weight:700; font-size:0.85rem; border-radius:30px; border-color:#f59e0b; color:#d97706; background:rgba(245,158,11,0.06); display:inline-flex; align-items:center; gap:6px;">
                    <i data-lucide="wallet" style="width:15px;height:15px;"></i> 💰 السجل المالي
                  </button>
                </div>
              </div>

            </div>
          </div>

          <!-- 2. Performance & Metric Stats Grid (5 Gamified Stat Cards) -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:16px; margin-bottom:32px;">
            
            <!-- Stat 1: Study Groups -->
            <div class="glass-card stat-card-hover" style="padding:20px; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card); display:flex; align-items:center; gap:16px; cursor:pointer;" title="انقر لعرض وإدارة المجموعات الدراسية" onclick="window.location.hash='#teacher-groups'">
              <div style="width:50px; height:50px; border-radius:16px; background:linear-gradient(135deg, rgba(79,70,229,0.15), rgba(79,70,229,0.05)); color:var(--primary); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="users" style="width:24px; height:24px;"></i>
              </div>
              <div style="flex:1;">
                <div style="font-size:1.5rem; font-weight:900; color:var(--text-main); line-height:1.1;">
                  ${this.groups?.length || 0}
                </div>
                <div style="font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-top:2px;">
                  مجموعاتي الدراسية
                </div>
              </div>
              <div style="color:var(--primary); opacity:0.6; font-size:0.85rem;">↗</div>
            </div>

            <!-- Stat 2: Today's Live Sessions -->
            <div class="glass-card stat-card-hover" style="padding:20px; border-radius:20px; border:1px solid ${allTodaySessions.length > 0 ? 'rgba(239,68,68,0.3)' : 'var(--border-color)'}; background:${allTodaySessions.length > 0 ? 'linear-gradient(135deg, rgba(239,68,68,0.04), var(--bg-card))' : 'var(--bg-card)'}; display:flex; align-items:center; gap:16px; cursor:pointer;" title="انقر للنزول لحصص اليوم المباشرة" onclick="document.getElementById('today-sessions-section')?.scrollIntoView({behavior:'smooth'})">
              <div style="width:50px; height:50px; border-radius:16px; background:linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05)); color:#ef4444; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="video" style="width:24px; height:24px;"></i>
              </div>
              <div style="flex:1;">
                <div style="font-size:1.5rem; font-weight:900; color:var(--text-main); line-height:1.1; display:flex; align-items:center; gap:8px;">
                  <span>${allTodaySessions.length}</span>
                  ${allTodaySessions.length > 0 ? `<span style="font-size:0.68rem; font-weight:900; background:rgba(239,68,68,0.12); color:#ef4444; padding:2px 7px; border-radius:6px;">اليوم ⚡</span>` : ''}
                </div>
                <div style="font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-top:2px;">
                  حصص اليوم المباشرة
                </div>
              </div>
              <div style="color:#ef4444; opacity:0.6; font-size:0.85rem;">↓</div>
            </div>

            <!-- Stat 3: Assignments & Tasks -->
            <div class="glass-card stat-card-hover" style="padding:20px; border-radius:20px; border:1px solid ${totalPendingGradingCount > 0 ? 'rgba(245,158,11,0.3)' : 'var(--border-color)'}; background:var(--bg-card); display:flex; align-items:center; gap:16px; cursor:pointer;" title="انقر لعرض ومتابعة الواجبات، والتسليمات بانتظار التصحيح" onclick="window.location.hash='#teacher-assignments'">
              <div style="width:50px; height:50px; border-radius:16px; background:linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05)); color:#8b5cf6; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="clipboard-check" style="width:24px; height:24px;"></i>
              </div>
              <div style="flex:1;">
                <div style="font-size:1.5rem; font-weight:900; color:var(--text-main); line-height:1.1;">
                  ${this.assignments?.length || 0}
                </div>
                <div style="font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-top:2px;">
                  ${totalPendingGradingCount > 0 ? `<span style="color:#d97706; font-weight:800;">${totalPendingGradingCount} بانتظار التصحيح ⏳</span>` : 'الواجبات والتكليفات'}
                </div>
              </div>
              <div style="color:#8b5cf6; opacity:0.6; font-size:0.85rem;">↗</div>
            </div>

            <!-- Stat 4: Active Students -->
            <div class="glass-card stat-card-hover" style="padding:20px; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card); display:flex; align-items:center; gap:16px; cursor:pointer;" title="انقر لعرض قائمة الطلاب الفعالين" onclick="window.location.hash='#students'">
              <div style="width:50px; height:50px; border-radius:16px; background:linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.05)); color:#06b6d4; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="graduation-cap" style="width:24px; height:24px;"></i>
              </div>
              <div>
                <div style="font-size:1.5rem; font-weight:900; color:var(--text-main); line-height:1.1;">
                  ${activeStudentsCount}
                </div>
                <div style="font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-top:2px;">
                  الطلاب الفعالون
                </div>
              </div>
              <div style="margin-inline-start:auto; color:#06b6d4; opacity:0.6; font-size:0.85rem;">↗</div>
            </div>

            <!-- Stat 5: Pending Earnings -->
            <div class="glass-card stat-card-hover" id="stat-box-earnings" style="cursor:pointer; padding:20px; border-radius:20px; border:1px solid rgba(245,158,11,0.3); background:rgba(245,158,11,0.04); display:flex; align-items:center; gap:16px;" title="انقر لعرض تفاصيل السجل المالي والمستحقات" onclick="window.location.hash='#teacher-financial'">
              <div style="width:50px; height:50px; border-radius:16px; background:linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.08)); color:#f59e0b; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="wallet" style="width:24px; height:24px;"></i>
              </div>
              <div style="flex:1;">
                <div style="font-size:1.4rem; font-weight:900; color:#b45309; line-height:1.1;">
                  ${pendingEarnings.toLocaleString()} <span style="font-size:0.85rem; font-weight:700;">ج.م</span>
                </div>
                <div style="font-size:0.78rem; font-weight:800; color:var(--text-main); margin-top:2px;">
                  مستحقات معلقة ↗
                </div>
              </div>
            </div>

          </div>

          <!-- 4. Main Command Layout -->
          <div style="display:flex; flex-direction:column; gap:36px;">
            
            <!-- SECTION 1: حصص اليوم المباشرة (Day Sessions - Timetable Style) 🔴📅 -->
            <div id="today-sessions-section">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
                <div>
                  <h2 style="font-size:1.28rem; font-weight:900; margin:0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                    <i data-lucide="calendar-days" style="width:22px; height:22px; color:var(--primary);"></i>
                    <span>حصص اليوم المباشرة (${allTodaySessions.length})</span>
                    ${allTodaySessions.length > 0 ? `<span style="font-size:0.75rem; font-weight:800; background:rgba(16,185,129,0.12); color:#10b981; border:1px solid rgba(16,185,129,0.3); padding:2px 8px; border-radius:8px;">اليوم 🟢</span>` : ''}
                  </h2>
                  <p style="color:var(--text-muted); font-size:0.84rem; margin:3px 0 0 0;">جميع الحصص الجماعية والخاصة المجدولة لليوم بتنسيق جدول الحصص (Timetable)</p>
                </div>

                <div style="display:flex; align-items:center; gap:8px;">
                  <a href="#schedule" class="btn-secondary" style="font-size:0.82rem; padding:8px 16px; border-radius:14px; border-color:var(--primary); color:var(--primary); font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                    <i data-lucide="calendar"></i> الجدول الأسبوعي الكامل ↗
                  </a>
                </div>
              </div>

              <!-- Timetable Day Row Container -->
              <div class="glass-card timetable-day-row" style="padding:18px 22px; border-radius:20px; border:1px solid var(--primary); background:rgba(99,102,241,0.02); transition:all 0.2s;">
                
                <!-- Day Row Header like Timetable -->
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid var(--border-color); flex-wrap:wrap; gap:10px;">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-weight:900; font-size:1.15rem; color:var(--primary);">
                      ${new Date().toLocaleDateString('ar-EG', { weekday: 'long' })}
                    </span>
                    <span style="font-size:0.85rem; color:var(--text-muted); font-weight:700; background:var(--bg-app); padding:3px 10px; border-radius:12px; border:1px solid var(--border-color);">
                      ${new Date().toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span style="font-size:0.75rem; font-weight:800; background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); padding:2px 8px; border-radius:12px;">اليوم 🟢</span>
                  </div>
                  <span style="font-size:0.8rem; font-weight:700; color:var(--text-muted); background:var(--bg-app); padding:3px 10px; border-radius:10px; border:1px solid var(--border-color);">
                    ${allTodaySessions.length > 0 ? `${allTodaySessions.length} حصص` : 'لا توجد حصص اليوم'}
                  </span>
                </div>

                <!-- Sessions in Columns (Timetable Style) -->
                ${allTodaySessions.length === 0 ? `
                  <div style="padding:24px 20px; text-align:center; color:var(--text-muted); font-size:0.85rem; background:var(--bg-app); border-radius:14px; border:1px dashed var(--border-color); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px;">
                    <i data-lucide="calendar-x" style="width:28px; height:28px; opacity:0.5; color:var(--primary);"></i>
                    <div style="font-weight:800; color:var(--text-main);">لا توجد حصص مباشرة مجدولة لليوم</div>
                    <div style="font-size:0.78rem;">يمكنك متابعة جدول الحصص الأسبوعي أو مراجعة واجبات وتكليفات الطلاب.</div>
                  </div>
                ` : `
                  <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:18px; width:100%;">
                    ${allTodaySessions.map(sess => this.renderTodaySessionCard(sess)).join('')}
                  </div>
                `}

              </div>
            </div>

            <!-- SECTION 2: دوراتي التعليمية والمقررات الدراسية (My Courses) 📚 -->
            <div id="teacher-courses-section">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
                <div>
                  <h2 style="font-size:1.28rem; font-weight:900; margin:0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                    <i data-lucide="book-open" style="width:22px; height:22px; color:var(--primary);"></i>
                    <span>دوراتي ومقرراتي الدراسية (${this.courses.length})</span>
                  </h2>
                  <p style="color:var(--text-muted); font-size:0.84rem; margin:3px 0 0 0;">إدارة وتعديل المقررات الدراسية والمناهج المعتمدة والدروس المرتبطة بها</p>
                </div>

                <div style="display:flex; align-items:center; gap:8px;">
                  <button type="button" class="btn-primary" id="open-course-modal-btn-2" style="font-size:0.85rem; padding:8px 18px; border-radius:14px; font-weight:800; display:inline-flex; align-items:center; gap:6px;">
                    <i data-lucide="plus-circle" style="width:16px;height:16px;"></i> إضافة دورة جديدة ➕
                  </button>
                  <a href="#courses" class="btn-secondary" style="font-size:0.82rem; padding:8px 16px; border-radius:14px; border-color:var(--primary); color:var(--primary); font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                    مستكشف الكورسات ➔
                  </a>
                </div>
              </div>

              ${this.courses.length === 0 ? `
                <div class="glass-card" style="padding:32px 24px; text-align:center; border-radius:20px; border:1px dashed var(--border-color);">
                  <i data-lucide="book-plus" style="width:40px; height:40px; color:var(--primary); opacity:0.4; margin-bottom:12px;"></i>
                  <h4 style="font-weight:800; font-size:1.05rem; color:var(--text-main); margin:0 0 6px 0;">لم تقم بإنشاء أي دورات تعليمية بعد</h4>
                  <p style="font-size:0.85rem; color:var(--text-muted); margin:0 0 16px 0;">ابدأ الآن بإضافة أول مقرر دراسي لك وحدد المرحلة والصف والمادة وفق المنهج المصري.</p>
                  <button type="button" class="btn-primary" id="open-course-modal-btn-empty" style="padding:9px 22px; border-radius:20px; font-weight:800; font-size:0.85rem; display:inline-flex; align-items:center; gap:6px;">
                    <i data-lucide="plus-circle" style="width:16px;height:16px;"></i> إضافة دورة جديدة الآن
                  </button>
                </div>
              ` : `
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap:20px;">
                  ${this.courses.map(c => `
                    <div class="glass-card" style="border-radius:20px; overflow:hidden; border:1px solid var(--border-color); display:flex; flex-direction:column; transition:transform 0.2s, box-shadow 0.2s;">
                      <div style="position:relative; height:150px; overflow:hidden; background:var(--bg-app);">
                        <img src="${c.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=60'}" alt="${c.title}" style="width:100%; height:100%; object-fit:cover;">
                        <span style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.65); backdrop-filter:blur(4px); color:#fff; font-size:0.75rem; font-weight:800; padding:3px 10px; border-radius:12px;">
                          ${c.category || 'عام'}
                        </span>
                        <span style="position:absolute; top:10px; left:10px; background:${c.status === 'PUBLISHED' ? '#10b981' : '#f59e0b'}; color:#fff; font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:10px;">
                          ${c.status === 'PUBLISHED' ? 'منشور 🟢' : 'قيد المراجعة ⏳'}
                        </span>
                      </div>
                      <div style="padding:16px; display:flex; flex-direction:column; flex:1;">
                        <div style="font-size:0.75rem; font-weight:800; color:var(--primary); margin-bottom:4px; display:flex; align-items:center; gap:4px;">
                          <i data-lucide="graduation-cap" style="width:14px;height:14px;"></i> ${c.grade?.name || c.degree || 'مستوى عام'}
                        </div>
                        <h4 style="font-size:1rem; font-weight:800; margin:0 0 6px 0; color:var(--text-main); line-height:1.4;">${c.title}</h4>
                        <p style="font-size:0.82rem; color:var(--text-muted); margin:0 0 14px 0; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                          ${c.description || 'لا يوجد وصف متاح.'}
                        </p>
                        <div style="margin-top:auto; display:flex; gap:8px; padding-top:12px; border-top:1px solid var(--border-color);">
                          <a href="#manage-course/${c.id}" class="btn-primary" style="flex:1; justify-content:center; padding:8px 12px; font-size:0.82rem; font-weight:800; text-decoration:none; border-radius:12px; display:inline-flex; align-items:center; gap:4px;">
                            <i data-lucide="settings" style="width:14px;height:14px;"></i> إدارة المحتوى
                          </a>
                          <button type="button" class="btn-secondary edit-course-btn" data-id="${c.id}" style="padding:8px 12px; font-size:0.82rem; font-weight:800; border-radius:12px; display:inline-flex; align-items:center; gap:4px;" title="تعديل تفاصيل الدورة">
                            <i data-lucide="edit-3" style="width:14px;height:14px;"></i> تعديل
                          </button>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>
          </div>
        </div>


        <!-- Course Creation Modal -->
        <div class="modal-overlay" id="course-modal" style="display:none; backdrop-filter:blur(8px); background:rgba(0,0,0,0.6);">
          <div class="modal-content" style="max-width:650px; width:92%; border-radius:24px; overflow:hidden; border:1px solid var(--border-color); padding:0; box-shadow:0 25px 50px -12px rgba(0,0,0,0.35); background:var(--bg-card);">
            
            <!-- Modal Header -->
            <div class="modal-header" style="padding:22px 28px; background:linear-gradient(135deg, rgba(0,86,210,0.08), rgba(168,85,247,0.08)); border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
              <div style="display:flex; align-items:center; gap:14px;">
                <div style="width:46px; height:46px; border-radius:14px; background:var(--primary-glow); color:var(--primary); display:flex; align-items:center; justify-content:center;">
                  <i data-lucide="book-plus" style="width:24px; height:24px;"></i>
                </div>
                <div>
                  <h3 class="modal-title" style="font-size:1.2rem; font-weight:800; margin:0 0 2px 0; color:var(--text-main);">${t("teacher.createCourse")}</h3>
                  <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">أدخل تفاصيل الدورة، القسم المعني، والسنة الدراسية للتلميذ</p>
                </div>
              </div>
              <span class="modal-close-btn" id="close-course-modal" style="font-size:1.4rem; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
            </div>

            <!-- Form -->
            <form id="create-course-form">
              <div class="modal-body" style="padding:24px 28px; display:flex; flex-direction:column; gap:18px;">
                
                <!-- Course Title -->
                <div class="form-group" style="margin:0;">
                  <label for="course-title" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="heading" style="width:14px; height:14px; color:var(--primary);"></i>
                    ${t("teacher.courseTitle")}
                  </label>
                  <input type="text" id="course-title" class="form-input" placeholder="مثال: مادة الفيزياء - وحدة الكهرباء للثانوية" style="border-radius:14px; padding:12px 16px; font-size:0.9rem;" required>
                </div>

                <!-- 🇪🇬 EGYPTIAN CURRICULUM SELECTOR (STAGE -> GRADE -> SUBJECT) -->
                <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:20px; padding:20px; display:flex; flex-direction:column; gap:16px;">
                  
                  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <label style="font-weight:900; font-size:0.92rem; color:var(--text-main); margin:0; display:flex; align-items:center; gap:8px;">
                      <i data-lucide="graduation-cap" style="width:18px; height:18px; color:#e51d74;"></i>
                      <span>تحديد المرحلة والصف والمادة الدراسية 🇪🇬 <span style="color:#ef4444;">*</span></span>
                    </label>
                    <span style="font-size:0.75rem; font-weight:800; color:#e51d74; background:rgba(229,29,116,0.1); padding:3px 12px; border-radius:12px; border:1px solid rgba(229,29,116,0.2);">
                      مناهج جمهورية مصر العربية
                    </span>
                  </div>

                  <!-- 1. Stage Selector Segmented Buttons -->
                  <div>
                    <label style="display:block; font-size:0.82rem; font-weight:800; color:var(--text-muted); margin-bottom:6px;">
                      1. اختر المرحلة التعليمية:
                    </label>
                    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;">
                      <button type="button" class="teacher-modal-stage-btn active" data-stage="PRIMARY" style="padding:10px 8px; border-radius:14px; font-weight:900; font-size:0.85rem; cursor:pointer; border:2px solid #10b981; background:#10b981; color:#ffffff; transition:all 0.2s ease; box-shadow:0 4px 12px rgba(16,185,129,0.25);">
                        🎒 الابتدائية
                      </button>
                      <button type="button" class="teacher-modal-stage-btn" data-stage="PREPARATORY" style="padding:10px 8px; border-radius:14px; font-weight:800; font-size:0.85rem; cursor:pointer; border:2px solid var(--border-color); background:var(--bg-card); color:var(--text-main); transition:all 0.2s ease;">
                        📚 الإعدادية
                      </button>
                      <button type="button" class="teacher-modal-stage-btn" data-stage="SECONDARY" style="padding:10px 8px; border-radius:14px; font-weight:800; font-size:0.85rem; cursor:pointer; border:2px solid var(--border-color); background:var(--bg-card); color:var(--text-main); transition:all 0.2s ease;">
                        🎓 الثانوية العامة
                      </button>
                    </div>
                  </div>

                  <!-- 2. Grade & Subject Dropdowns -->
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <!-- Grade Select -->
                    <div class="form-group" style="margin:0;">
                      <label for="modal-curriculum-grade-select" style="font-weight:800; font-size:0.82rem; margin-bottom:6px; display:block; color:var(--text-main);">
                        2. الصف الدراسي <span style="color:#ef4444;">*</span>
                      </label>
                      <select id="modal-curriculum-grade-select" class="form-select" style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;" required>
                        <option value="">-- جاري التحميل... --</option>
                      </select>
                    </div>

                    <!-- Subject Select -->
                    <div class="form-group" style="margin:0;">
                      <label for="modal-curriculum-subject-select" style="font-weight:800; font-size:0.82rem; margin-bottom:6px; display:block; color:var(--text-main);">
                        3. المادة الدراسية <span style="color:#ef4444;">*</span>
                      </label>
                      <select id="modal-curriculum-subject-select" class="form-select" style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;" required>
                        <option value="">-- اختر الصف أولاً --</option>
                      </select>
                    </div>
                  </div>

                  <!-- Custom Subject Wrapper (if needed) -->
                  <div id="modal-custom-subject-wrapper" style="display:none; margin-top:-4px;">
                    <label style="font-size:0.8rem; font-weight:800; color:var(--text-muted); margin-bottom:4px; display:block;">
                      اسم المادة أو التخصص المخصص:
                    </label>
                    <input type="text" id="modal-custom-subject-input" class="form-input" placeholder="اكتب اسم المادة يدوياً..." style="border-radius:12px; padding:9px 14px; font-size:0.88rem; width:100%;">
                  </div>

                  <!-- Hidden values for submission -->
                  <input type="hidden" id="course-category-select" value="">
                  <input type="hidden" id="course-degree" value="">
                  <input type="hidden" id="modal-selected-grade-id" value="">
                  <input type="hidden" id="modal-selected-subject-id" value="">
                </div>

                <!-- Course Description -->
                <div class="form-group" style="margin:0;">
                  <label for="course-desc" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="file-text" style="width:14px; height:14px; color:var(--text-muted);"></i>
                    ${t("teacher.courseDesc")}
                  </label>
                  <textarea id="course-desc" class="form-input" style="height:90px; resize:none; border-radius:14px; padding:12px 16px; font-size:0.88rem; line-height:1.5;" placeholder="${t("teacher.courseDescPlaceholder")}" required></textarea>
                </div>

                <!-- Course Image Upload -->
                <div class="form-group" style="margin:0;">
                  <label style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; justify-content:space-between;">
                    <span style="display:flex; align-items:center; gap:6px;">
                      <i data-lucide="image" style="width:14px; height:14px; color:#f59e0b;"></i>
                      ${t("teacher.courseImage")}
                    </span>
                    <button type="button" id="toggle-url-input-btn" style="background:none; border:none; color:var(--primary); font-weight:700; font-size:0.75rem; cursor:pointer;">
                      أو أدخل رابط صورة مباشرة 🔗
                    </button>
                  </label>
                  
                  <div id="course-dropzone" style="border:2px dashed var(--border-color); border-radius:16px; padding:18px; text-align:center; background:var(--bg-app); cursor:pointer; transition:all 0.2s ease;">
                    <input type="file" id="course-image-file" accept="image/*" style="display:none;">
                    
                    <div id="image-upload-idle">
                      <button type="button" class="btn-secondary" id="btn-trigger-upload" style="padding:8px 20px; border-radius:30px; font-size:0.85rem; margin:0 auto; display:inline-flex; align-items:center; gap:6px;">
                        <i data-lucide="upload-cloud" style="width:16px; height:16px;"></i> اختيار صورة غلاف الدورة
                      </button>
                      <p style="font-size:0.75rem; color:var(--text-muted); margin:8px 0 0 0;">الصغار المقبولة: JPG, PNG, WEBP (الحد الأقصى 5 ميجابايت)</p>
                    </div>

                    <div id="image-upload-loading" style="display:none; padding:10px; color:var(--primary); font-weight:700; font-size:0.88rem;">
                      <i data-lucide="loader" class="spinner" style="width:20px; height:20px; display:inline-block; vertical-align:middle; margin-inline-end:6px;"></i> جاري رفع الصورة...
                    </div>

                    <div id="image-preview-wrapper" style="display:none; text-align:center;">
                      <div style="position:relative; display:inline-block;">
                        <img id="course-preview-img" src="" style="max-height:130px; border-radius:12px; object-fit:cover; border:2px solid var(--primary); box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                        <button type="button" id="remove-course-image-btn" title="حذف الصورة" style="position:absolute; top:-8px; right:-8px; background:var(--error,#ef4444); color:#fff; border:none; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-weight:bold; box-shadow:0 2px 6px rgba(0,0,0,0.3);">✕</button>
                      </div>
                      <p style="font-size:0.78rem; color:var(--success,#10b981); font-weight:800; margin:6px 0 0 0;">✓ تم اختيار ورفع غلاف الدورة بنجاح</p>
                    </div>
                  </div>

                  <div id="url-input-wrapper" style="display:none; margin-top:10px;">
                    <input type="url" id="course-image-url-direct" class="form-input" placeholder="https://example.com/course-cover.jpg" style="border-radius:12px; padding:10px 14px; font-size:0.85rem;">
                  </div>

                  <input type="hidden" id="course-image-url">
                </div>

                <!-- Live Meeting Link -->
                <div class="form-group" style="margin:0;">
                  <label for="course-meeting-link" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="video" style="width:14px; height:14px; color:#06b6d4;"></i>
                    رابط البث المباشر (Zoom, Meet, Webex)
                  </label>
                  <input type="url" id="course-meeting-link" class="form-input" placeholder="https://zoom.us/j/123456789" style="border-radius:14px; padding:11px 16px; font-size:0.88rem;">
                </div>

              </div>

              <!-- Modal Footer -->
              <div class="modal-footer" style="padding:16px 28px; background:var(--bg-app); border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; gap:12px;">
                <button type="button" class="btn-secondary" id="cancel-course-modal" style="padding:10px 20px; border-radius:30px; font-size:0.88rem;">${t("common.cancel")}</button>
                <button type="submit" class="btn-primary" style="padding:10px 24px; border-radius:30px; font-size:0.88rem; font-weight:800; background:linear-gradient(135deg,#0056D2,#a855f7); border:none;">
                  <i data-lucide="check-circle-2" style="width:16px; height:16px; vertical-align:middle;"></i> ${t("teacher.publishCourse")}
                </button>
              </div>

            </form>
          </div>
        </div>

        <!-- Live Session Modal -->
        <div class="modal-overlay" id="session-modal" style="display:none;">
          <div class="modal-content">
            <div class="modal-header">
              <h3 class="modal-title">${t("teacher.scheduleSession")}</h3>
              <span class="modal-close-btn" id="close-session-modal">&times;</span>
            </div>
            <form id="create-session-form">
              <div class="modal-body">
                <div class="form-group">
                  <label for="session-title">${t("teacher.sessionTitle")}</label>
                  <input type="text" id="session-title" class="form-input" placeholder="${t("teacher.sessionTitlePlaceholder")}" required>
                </div>
                <div class="form-group">
                  <label for="session-course-id">${t("teacher.selectCourse")}</label>
                  <select id="session-course-id" class="form-select" required>
                    <option value="">${t("teacher.selectCoursePlaceholder")}</option>
                    ${this.courses.map(c => `<option value="${c.id}">${c.title}</option>`).join("")}
                  </select>
                </div>
                <div class="form-group">
                  <label for="session-desc">${t("teacher.sessionDesc")}</label>
                  <textarea id="session-desc" class="form-input" style="height:80px; resize:none;" placeholder="${t("teacher.sessionDescPlaceholder")}"></textarea>
                </div>
                <div class="form-group">
                  <label for="session-date">${t("teacher.sessionDate")}</label>
                  <input type="datetime-local" id="session-date" class="form-input" required>
                </div>
                <div class="form-group">
                  <label for="session-duration">${t("teacher.sessionDuration")}</label>
                  <input type="number" id="session-duration" class="form-input" value="60" min="15" max="180" required>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn-secondary" id="cancel-session-modal">${t("common.cancel")}</button>
                <button type="submit" class="btn-primary">${t("teacher.planSession")}</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Lesson Upload Modal -->
        <div class="modal-overlay" id="lesson-modal" style="display:none;">
          <div class="modal-content" style="max-width:680px; width:92%; max-height:90vh; display:flex; flex-direction:column; padding:0; overflow:hidden;">
            <div class="modal-header" style="padding:18px 24px; border-bottom:1px solid var(--border-color);">
              <h3 class="modal-title" id="lesson-modal-title" style="font-size:1.15rem; font-weight:800;">${t("teacher.addLesson")}</h3>
              <span class="modal-close-btn" id="close-lesson-modal">&times;</span>
            </div>

            <!-- Sub-tabs bar -->
            <div style="display:flex; border-bottom:1px solid var(--border-color); background:var(--bg-app); padding:4px 16px 0 16px; gap:8px; overflow-x:auto;">
              <button type="button" class="teacher-lesson-tab-btn active" data-tab="details" style="padding:10px 16px; border:none; background:none; font-weight:700; font-size:0.88rem; cursor:pointer; color:var(--primary); border-bottom:2px solid var(--primary);">
                📝 التفاصيل والوصف
              </button>
              <button type="button" class="teacher-lesson-tab-btn" data-tab="notes" style="padding:10px 16px; border:none; background:none; font-weight:700; font-size:0.88rem; cursor:pointer; color:var(--text-muted);">
                📌 الملاحظات (Notes)
              </button>
              <button type="button" class="teacher-lesson-tab-btn" data-tab="resource" style="padding:10px 16px; border:none; background:none; font-weight:700; font-size:0.88rem; cursor:pointer; color:var(--text-muted);">
                📎 المورد المرفق
              </button>
              <button type="button" class="teacher-lesson-tab-btn" data-tab="questions" style="padding:10px 16px; border:none; background:none; font-weight:700; font-size:0.88rem; cursor:pointer; color:var(--text-muted);">
                ❓ أسئلة الدرس
              </button>
            </div>

            <form id="add-lesson-form" style="display:flex; flex-direction:column; flex:1; overflow:hidden; margin:0;">
              <div class="modal-body" style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:16px;">
                
                <!-- Tab 1: Details -->
                <div class="teacher-lesson-tab-content" id="teacher-lesson-tab-details" style="display:flex; flex-direction:column; gap:14px;">
                  <div class="form-group">
                    <label for="lesson-title" style="font-weight:700; margin-bottom:6px; display:block;">${t("teacher.lessonTitle")} <span style="color:var(--error);">*</span></label>
                    <input type="text" id="lesson-title" class="form-input" placeholder="${t("teacher.lessonTitlePlaceholder")}" required style="padding:10px 14px;">
                  </div>
                  <div class="form-group">
                    <label for="lesson-chapter" style="font-weight:700; margin-bottom:6px; display:block;">${t("teacher.chapterName")} <span style="color:var(--error);">*</span></label>
                    <input type="text" id="lesson-chapter" class="form-input" placeholder="${t("teacher.chapterPlaceholder")}" value="General" required style="padding:10px 14px;">
                  </div>
                  <div class="form-group">
                    <label for="lesson-videourl" style="font-weight:700; margin-bottom:6px; display:block;">${t("teacher.videoUrl")} (اختياري / Optional)</label>
                    <input type="text" id="lesson-videourl" class="form-input" placeholder="https://..." style="padding:10px 14px;">
                  </div>
                  <div class="form-group">
                    <label for="lesson-desc" style="font-weight:700; margin-bottom:6px; display:block;">${t("teacher.lessonDesc")}</label>
                    <textarea id="lesson-desc" class="form-input" style="height:70px; resize:vertical; font-family:inherit; padding:10px 14px;" placeholder="${t("teacher.lessonDescPlaceholder")}"></textarea>
                  </div>
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <div>
                      <label for="lesson-duration" style="font-weight:700; margin-bottom:6px; display:block;">${t("teacher.lessonDuration")}</label>
                      <input type="text" id="lesson-duration" class="form-input" placeholder="12:45" value="10:00" required style="padding:10px 14px;">
                    </div>
                    <div>
                      <label for="lesson-order" style="font-weight:700; margin-bottom:6px; display:block;">${t("teacher.lessonOrder")}</label>
                      <input type="number" id="lesson-order" class="form-input" value="1" min="0" required style="padding:10px 14px;">
                    </div>
                  </div>
                </div>

                <!-- Tab 2: Notes -->
                <div class="teacher-lesson-tab-content" id="teacher-lesson-tab-notes" style="display:none; flex-direction:column; gap:14px;">
                  <div class="form-group">
                    <label style="font-weight:700; margin-bottom:6px; display:block;">ملاحظات المعلم للدرس (Teacher Notes)</label>
                    <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:8px;">سيتم عرض هذه الملاحظات للطلاب كإرشادات ونقاط استذكار سريعة لهذا الدرس.</p>
                    <textarea id="teacher-lesson-notes" class="form-input" rows="6" placeholder="اكتب أهم القوانين، الإرشادات أو التنبيهات الموجهة للطلاب في هذا الدرس..." style="padding:12px 14px; font-family:inherit; resize:vertical;"></textarea>
                  </div>
                </div>

                <!-- Tab 3: Resource -->
                <div class="teacher-lesson-tab-content" id="teacher-lesson-tab-resource" style="display:none; flex-direction:column; gap:14px;">
                  <div class="form-group">
                    <label style="font-weight:700; margin-bottom:6px; display:block;">عنوان المورد المرفق (Resource Title)</label>
                    <input type="text" id="teacher-lesson-resource-title" class="form-input" placeholder="مثال: ملخص PDF للدرس الأول أو كراس التمارين" style="padding:10px 14px;">
                  </div>
                  <div class="form-group">
                    <label style="font-weight:700; margin-bottom:6px; display:block;">رابط الملف المرفق (Resource URL - PDF / Drive)</label>
                    <input type="text" id="teacher-lesson-resource-url" class="form-input" placeholder="https://drive.google.com/file/d/..." style="padding:10px 14px;">
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">يستطيع الطالب فتح وتحميل الملف مباشرة من صفحة مشغل الدرس.</p>
                  </div>
                </div>

                <!-- Tab 4: Questions -->
                <div class="teacher-lesson-tab-content" id="teacher-lesson-tab-questions" style="display:none; flex-direction:column; gap:16px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <div>
                      <h4 style="font-weight:800; font-size:0.95rem; margin:0;">أسئلة واختبار الدرس الفوري</h4>
                      <p style="font-size:0.8rem; color:var(--text-muted); margin:2px 0 0 0;">أنشئ أسئلة اختيار من متعدد ليختبر الطالب فهمه للدرس.</p>
                    </div>
                    <button type="button" id="teacher-add-lesson-question-btn" class="btn-secondary" style="font-size:0.82rem; padding:6px 14px; font-weight:700; border-color:var(--primary); color:var(--primary);">
                      ➕ إضافة سؤال
                    </button>
                  </div>

                  <div id="teacher-lesson-questions-list" style="display:flex; flex-direction:column; gap:16px;">
                    <!-- Dynamic questions list -->
                  </div>
                </div>

              </div>

              <div class="modal-footer" style="padding:14px 24px; border-top:1px solid var(--border-color); background:var(--bg-card);">
                <button type="button" class="btn-secondary" id="cancel-lesson-modal">${t("common.cancel")}</button>
                <button type="submit" class="btn-primary" style="font-weight:800;">${t("teacher.uploadLesson")}</button>
              </div>
            </form>
          </div>
        </div>



        <!-- Complete Private Session Modal (Lesson Report) -->
        <div class="modal-overlay" id="complete-private-modal" style="display:none; backdrop-filter:blur(8px); background:rgba(0,0,0,0.6);">
          <div class="modal-content" style="max-width:520px; width:92%; border-radius:20px; padding:0; border:1px solid var(--border-color); max-height:90vh; overflow:hidden; display:flex; flex-direction:column;">
            <div class="modal-header" style="padding:20px 24px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(59,130,246,0.08));">
              <h3 style="margin:0; font-size:1.1rem; font-weight:800;">✅ إكمال الحصة + تقرير الدرس</h3>
              <span id="close-complete-modal" style="cursor:pointer; font-size:1.4rem; color:var(--text-muted);">&times;</span>
            </div>
            <div style="padding:24px; display:flex; flex-direction:column; gap:14px; overflow-y:auto; flex:1;">
              <input type="hidden" id="complete-session-id">
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.85rem; margin-bottom:5px; display:block;">📚 موضوع الحصة (Topic)</label>
                <input type="text" id="complete-topic" class="form-input" placeholder="مثال: الكسور وعملياتها" style="border-radius:12px; padding:10px 14px;">
              </div>
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.85rem; margin-bottom:5px; display:block;">📝 ما تم شرحه</label>
                <textarea id="complete-covered" class="form-input" rows="2" placeholder="ماذا تم تغطيته في هذه الحصة..." style="border-radius:12px; padding:10px 14px; resize:none;"></textarea>
              </div>
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.85rem; margin-bottom:5px; display:block;">⭐ أداء الطالب</label>
                <select id="complete-performance" class="form-select" style="border-radius:12px; padding:10px 14px;">
                  <option value="">-- اختر التقييم --</option>
                  <option value="ممتاز">ممتاز ❤️</option>
                  <option value="جيد">جيد 👍</option>
                  <option value="متوسط">متوسط ⚠️</option>
                  <option value="يحتاج متابعة">يحتاج متابعة ⚠️</option>
                </select>
              </div>
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.85rem; margin-bottom:5px; display:block;">📖 الواجب المنزلي</label>
                <input type="text" id="complete-homework" class="form-input" placeholder="مثال: تمارين 1 ← 10 صفحة 45" style="border-radius:12px; padding:10px 14px;">
              </div>
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.85rem; margin-bottom:5px; display:block;">💬 ملاحظات المعلم</label>
                <textarea id="complete-notes" class="form-input" rows="2" placeholder="أي ملاحظات إضافية..." style="border-radius:12px; padding:10px 14px; resize:none;"></textarea>
              </div>
            </div>
            <div style="padding:16px 24px; border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; gap:10px;">
              <button class="btn-secondary" id="cancel-complete-modal" style="padding:9px 18px; border-radius:30px;">إلغاء</button>
              <button class="btn-primary" id="submit-complete-btn" style="padding:9px 22px; border-radius:30px; font-weight:800; background:linear-gradient(135deg,#10b981,#3b82f6); border:none;">
                ✅ تأكيد إكمال الحصة
              </button>
            </div>
          </div>
        </div>

        <!-- All Private Sessions Modal -->
        <div class="modal-overlay" id="all-private-modal" style="display:none; backdrop-filter:blur(8px); background:rgba(0,0,0,0.6);">
          <div class="modal-content" style="max-width:700px; width:95%; border-radius:20px; padding:0; border:1px solid var(--border-color); max-height:90vh; overflow:hidden; display:flex; flex-direction:column;">
            <div class="modal-header" style="padding:20px 24px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
              <div>
                <h3 style="margin:0; font-size:1.1rem; font-weight:800;">📋 جميع حصصي الخاصة</h3>
                <div style="display:flex; gap:8px; margin-top:10px;">
                  <button class="private-filter-btn active" data-status="all" style="font-size:0.75rem; padding:4px 12px; border-radius:20px; border:1px solid var(--border-color); background:var(--primary); color:#fff; cursor:pointer;">الكل</button>
                  <button class="private-filter-btn" data-status="SCHEDULED" style="font-size:0.75rem; padding:4px 12px; border-radius:20px; border:1px solid var(--border-color); background:none; cursor:pointer;">مجدولة</button>
                  <button class="private-filter-btn" data-status="COMPLETED" style="font-size:0.75rem; padding:4px 12px; border-radius:20px; border:1px solid var(--border-color); background:none; cursor:pointer;">مكتملة</button>
                  <button class="private-filter-btn" data-status="CANCELLED_BY_STUDENT" style="font-size:0.75rem; padding:4px 12px; border-radius:20px; border:1px solid var(--border-color); background:none; cursor:pointer;">ملغاة</button>
                </div>
              </div>
              <span id="close-all-private-modal" style="cursor:pointer; font-size:1.4rem; color:var(--text-muted);">&times;</span>
            </div>
            <div id="all-private-sessions-list" style="padding:20px; display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; overflow-y:auto; flex:1;"></div>
          </div>
        </div>
      `;

      this.bindEvents();
      if (window.lucide) window.lucide.createIcons();

      if (window.location.hash.includes("enrollment-requests")) {
        setTimeout(() => {
          const reqSec = this.container.querySelector("#enrollment-requests-section");
          if (reqSec) reqSec.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch (err) {
      console.error("Teacher portal rendering failed:", err);
      this.container.innerHTML = `
        <div style="text-align:center; padding:100px 24px; color:var(--error);">
          <i data-lucide="alert-circle" style="width:48px; height:48px; margin-bottom:16px;"></i>
          <h3 style="font-size:1.5rem; margin-bottom:8px;">Failed to load Teacher Portal</h3>
          <p style="color:var(--text-muted); margin-bottom:20px;">${err.message || "An unexpected error occurred."}</p>
          <button onclick="window.location.hash='#landing'" class="btn-primary">Return to Home</button>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  filterSessions(sessions) {
    if (!sessions || sessions.length === 0) return [];
    const now = new Date();
    return sessions.filter(s => {
      const d = new Date(s.scheduledAt);
      return d.toDateString() === now.toDateString();
    });
  }

  renderPrivateSessionCard(session) {
    const studentTz = session.student?.timezone || "Asia/Riyadh";
    const formatted = formatSessionDateTime(session.scheduledAt, null, { secondaryTz: studentTz });

    const statusMap = {
      'SCHEDULED': { label: 'مجدولة', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
      'CONFIRMED': { label: 'مؤكدة', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
      'COMPLETED': { label: 'مكتملة', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
      'RESCHEDULED': { label: 'معاد جدولتها', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
      'CANCELLED_BY_STUDENT': { label: 'ملغاة (طالب)', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
      'CANCELLED_BY_TEACHER': { label: 'ملغاة (معلم)', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
      'NO_SHOW_STUDENT': { label: 'غياب طالب', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    };
    let st = statusMap[session.status] || { label: session.status, color: '#6b7280', bg: 'rgba(107,114,128,0.1)' };
    const isActive = ['SCHEDULED', 'CONFIRMED', 'scheduled', 'live', 'active'].includes(session.status);

    const scheduledTime = session.scheduledAt ? new Date(session.scheduledAt).getTime() : 0;
    const durationMins = session.duration || 60;
    const isPastTime = scheduledTime > 0 && (scheduledTime + durationMins * 60 * 1000 < Date.now());

    if (isPastTime && ['SCHEDULED', 'CONFIRMED', 'scheduled'].includes(session.status)) {
      st = { label: '⏳ انقضى الوقت (في انتظار التوثيق والإنهاء)', color: '#b45309', bg: 'rgba(245,158,11,0.18)' };
    }

    return `
      <div class="glass-card" style="padding:20px; border-radius:18px; border:${isPastTime && isActive ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--border-color)'}; display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:6px;">
          <span style="font-size:0.75rem; font-weight:800; padding:4px 10px; border-radius:20px; background:${st.bg}; color:${st.color};">${st.label}</span>
          ${formatted.badgeHTML}
        </div>

        <h4 style="font-weight:800; font-size:0.95rem; margin:0; color:var(--text-main);">${session.topic || session.title || 'حصة خاصة'}</h4>
        <div style="font-size:0.85rem; color:var(--text-main); font-weight:800; display:flex; align-items:center; gap:6px; background:var(--bg-app); padding:6px 10px; border-radius:10px; border:1px solid var(--border-color);">
          <i data-lucide="user" style="width:14px;height:14px;color:var(--primary);"></i>
          <span>الطالب: <strong style="color:var(--primary);">${session.student?.name || session.subscription?.student?.name || 'طالب'}</strong></span>
        </div>
        <div style="font-size:0.82rem; color:var(--primary); font-weight:600; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <i data-lucide="calendar" style="width:13px;height:13px;"></i> ${formatted.dateStr} • ${formatted.timeStr} ${formatted.secondaryTZHTML}
        </div>

        ${isActive ? `
        <div style="margin-top:10px; display:flex; flex-direction:column; gap:8px;">
          <button class="btn-primary" data-join-meet-id="${session.id}" style="padding:8px 12px; font-size:0.82rem; font-weight:800; justify-content:center; border-radius:12px; background:linear-gradient(135deg,#10b981,#059669); gap:6px; display:flex; align-items:center; border:none; color:#fff; cursor:pointer;">
            <i data-lucide="video" style="width:15px; height:15px;"></i> بدء البث عبر Google Meet 🎥
          </button>
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px;">
            <button class="btn-primary complete-private-btn" data-id="${session.id}" style="font-size:0.72rem; padding:6px 8px; justify-content:center; background:rgba(16,185,129,0.1); border-color:#10b981; color:#047857; font-weight:700;">
              ✓ إكمال
            </button>
            <button class="btn-secondary noshow-private-btn" data-id="${session.id}" style="font-size:0.72rem; padding:6px 8px; justify-content:center; color:#8b5cf6; border-color:#8b5cf6; font-weight:700;">
              ✕ غياب
            </button>
            <button class="btn-secondary cancel-private-btn" data-id="${session.id}" style="font-size:0.72rem; padding:6px 8px; justify-content:center; color:var(--error,#ef4444); border-color:var(--error,#ef4444); font-weight:700;">
              🚫 إلغاء
            </button>
          </div>
        </div>` : session.status === 'COMPLETED' ? `
        <div style="margin-top:10px; padding:10px; background:rgba(16,185,129,0.05); border-radius:10px; border:1px solid rgba(16,185,129,0.2);">
          ${session.topic ? `<div style="font-size:0.8rem;"><strong>الموضوع:</strong> ${session.topic}</div>` : ''}
          ${session.homework ? `<div style="font-size:0.8rem;"><strong>الواجب:</strong> ${session.homework}</div>` : ''}
        </div>` : ''}
      </div>
    `;
  }

  renderCourseListCard(course) {
    return renderCourseCard(course, { isTeacherView: true });
  }

  // ── Helper: Render Group Card for Teacher Dashboard ────────────────────
  renderTeacherGroupCard(group) {
    const course = group.course || {};
    const maxStudents = group.maxStudents || 25;
    const enrolled = group.enrolledCount || 0;
    const pct = Math.min(100, Math.round((enrolled / maxStudents) * 100));
    const isFull = enrolled >= maxStudents;

    return `
      <div class="glass-card group-dash-card" style="border-radius:22px; border:1px solid var(--border-color); background:var(--bg-card); overflow:hidden; display:flex; flex-direction:column; justify-content:space-between; transition:all 0.25s; box-shadow:0 4px 20px rgba(0,0,0,0.04);"
        onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 12px 30px rgba(0,0,0,0.08)';"
        onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 20px rgba(0,0,0,0.04)';">
        
        <div style="padding:20px;">
          <!-- Top Badges -->
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; gap:8px;">
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              ${course.subject ? `
                <span style="font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:10px; background:rgba(229,29,116,0.1); color:#e51d74; border:1px solid rgba(229,29,116,0.2);">
                  ${course.subject.name}
                </span>
              ` : ''}
              ${course.grade ? `
                <span style="font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:10px; background:rgba(16,185,129,0.1); color:#10b981; border:1px solid rgba(16,185,129,0.2);">
                  ${course.grade.name}
                </span>
              ` : ''}
            </div>

            <span style="font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:10px; background:${isFull ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)'}; color:${isFull ? '#ef4444' : '#10b981'}; border:1px solid ${isFull ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'};">
              ${isFull ? 'مكتملة العدد 🔒' : 'نشطة ومتاحة 🟢'}
            </span>
          </div>

          <!-- Group Name & Course Title -->
          <h3 style="font-size:1.1rem; font-weight:900; color:var(--text-main); margin:0 0 6px 0; line-height:1.35;">
            👥 ${group.name}
          </h3>
          <div style="font-size:0.82rem; color:var(--text-muted); font-weight:700; margin-bottom:14px; display:flex; align-items:center; gap:6px;">
            <i data-lucide="book-open" style="width:14px; height:14px; color:var(--primary);"></i>
            <span>${course.title || 'المقرر التعليمي'}</span>
          </div>

          <!-- Schedule Box -->
          <div style="background:var(--bg-app); border-radius:12px; padding:10px 12px; margin-bottom:14px; border:1px solid var(--border-color); display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:700; color:var(--text-main);">
            <i data-lucide="calendar" style="width:15px; height:15px; color:var(--primary); flex-shrink:0;"></i>
            <div>
              <span>${group.scheduleDays || 'مواعيد دورية'}</span>
              ${group.scheduleTime ? `<span style="color:var(--text-muted);"> • الساعة ${group.scheduleTime}</span>` : ''}
            </div>
          </div>

          <!-- Capacity Bar -->
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.76rem; font-weight:800; margin-bottom:6px;">
              <span style="color:var(--text-muted); display:inline-flex; align-items:center; gap:4px;">
                <i data-lucide="users" style="width:12px; height:12px;"></i>
                <span>الطلاب المشتركون</span>
              </span>
              <span style="color:var(--primary); font-weight:900;">
                ${enrolled} / ${maxStudents} طالب (${pct}%)
              </span>
            </div>
            <div style="height:6px; border-radius:10px; background:rgba(0,0,0,0.06); overflow:hidden;">
              <div style="height:100%; width:${pct}%; background:linear-gradient(90deg, var(--primary), #8b5cf6); border-radius:10px;"></div>
            </div>
          </div>
        </div>

        <!-- Bottom Action CTA -->
        <div style="padding:12px 20px; border-top:1px solid var(--border-color); background:rgba(0,0,0,0.015); display:flex; gap:8px;">
          <a href="#group/${group.id}" class="btn-primary" style="flex:1; justify-content:center; text-decoration:none; padding:9px 12px; font-size:0.82rem; font-weight:800; border-radius:12px; display:inline-flex; align-items:center; gap:6px;">
            <span>دخول مساحة المجموعة 👥</span>
            <i data-lucide="arrow-left" style="width:14px; height:14px;"></i>
          </a>
        </div>

      </div>
    `;
  }

  // ── Helper: Render Today's Session Card (Timetable Grid Card) ────────────
  renderTodaySessionCard(session) {
    const date = new Date(session.scheduledAt);
    const sessionTime = date.getTime();
    const durationMins = session.duration || 60;
    const durationMs = durationMins * 60 * 1000;
    const nowTime = Date.now();
    const sessionStart = sessionTime;
    const sessionEnd = sessionStart + durationMs;

    const endDate = new Date(sessionEnd);
    const formattedEndTime = endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const formattedTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const isCompleted = session.status === "completed" || session.status === "COMPLETED" || session.status?.includes("CANCELLED");
    const isPastSession = !isCompleted && (nowTime > sessionEnd);
    const isDuringSession = !isCompleted && (nowTime >= sessionStart && nowTime <= sessionEnd);
    const isLive = isDuringSession || session.status === "live" || session.status === "LIVE";
    const isCheckedIn = window.checkedInSessions?.has(String(session.id)) || !!session.isCheckedIn;

    const isGroup = session.sessionType === 'group' || (!session.student && (session.group || session.course));
    const studentName = session.student?.name || session.subscription?.student?.name || session.group?.name || (isGroup ? 'طلاب المجموعة' : 'طالب');
    const studentAvatar = session.student?.avatar || (session.student?.name ? `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(session.student.name)}` : null);

    const personLabel = (session.student || session.subscription) ? 'الطالب' : 'المجموعة';
    const personName = studentName;
    const personAvatar = studentAvatar;
    const personIcon = (session.student || session.subscription) ? 'user' : 'users';

    const rawSubject = session.course?.subject?.name || 
                        (typeof session.course?.subject === 'string' ? session.course.subject : null) || 
                        session.subject?.name || 
                        (typeof session.subject === 'string' ? session.subject : null);

    const courseTitle = session.course?.title || session.course?.category || session.topic || "";
    const hasSubject = !!rawSubject;
    const subjectName = rawSubject || courseTitle || "حصة تدريسية";
    const subjectLabel = hasSubject ? "المادة" : "الكورس";

    const gradeName = session.course?.grade?.name || 
                      (typeof session.course?.grade === 'string' ? session.course.grade : null) || 
                      null;

    let statusTag = `<span class="session-tag">${t("session.scheduled") || "مجدولة اليوم ⏰"}</span>`;
    let sessionAction = "";

    if (isCompleted) {
      statusTag = `<span class="session-tag" style="background:rgba(16,185,129,0.12); color:#10b981; border-color:rgba(16,185,129,0.3); font-weight:800;">✅ مكتملة وموثقة</span>`;
      sessionAction = `<button class="btn-secondary session-action" style="cursor:default; margin-top:14px; font-size:0.84rem; padding:10px; opacity:0.85; width:100%; justify-content:center;" disabled>تم إنهاء الحصة واحتساب الأرصدة ✅</button>`;
    } else if (isPastSession) {
      statusTag = `<span class="session-tag" style="background:rgba(239,68,68,0.1); color:#ef4444; border-color:rgba(239,68,68,0.25); font-weight:800;">⌛ انتهى وقت الحصة</span>`;
      if (isCheckedIn) {
        sessionAction = `
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:14px;">
            <span style="font-size:0.78rem; font-weight:800; color:#10b981; padding:6px 10px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:10px; display:inline-flex; align-items:center; justify-content:center; gap:6px; width:100%; box-sizing:border-box;">
              <i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> تم تأكيد حضور المعلم في موعد الحصة ✅
            </span>
            <button class="btn-primary ${isGroup ? 'end-session-btn' : 'complete-private-btn'}" data-id="${session.id}" style="background:linear-gradient(135deg, #10b981, #059669); border-color:#10b981; font-size:0.82rem; padding:10px; justify-content:center; font-weight:800; box-shadow:0 4px 12px rgba(16,185,129,0.25); cursor:pointer;">
              <i data-lucide="file-check" style="width:16px;height:16px;"></i> 📝 توثيق التقرير وإنهاء الحصة (واحتساب الرصيد)
            </button>
          </div>
        `;
      } else {
        sessionAction = `
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:14px;">
            <div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); border-radius:10px; padding:10px 12px; color:#ef4444; font-size:0.78rem; font-weight:800; text-align:center; line-height:1.4;">
              <i data-lucide="alert-triangle" style="width:15px; height:15px; vertical-align:middle;"></i> انتهى وقت الحصة ولم يؤكد الحضور في الموعد (مسجل غياب المعلم) ⚠️
            </div>
            <button disabled class="btn-secondary" style="opacity:0.6; cursor:not-allowed; font-size:0.78rem; padding:8px; width:100%; justify-content:center; background:rgba(0,0,0,0.04); color:var(--text-muted); font-weight:700;" title="لا يمكن توثيق التقرير لعدم تأكيد الحضور أثناء وقت الحصة">
              <i data-lucide="lock" style="width:13px;height:13px;margin-inline-end:4px;"></i> توثيق التقرير مقفل (غياب المعلم) 🔒
            </button>
          </div>
        `;
      }
    } else if (isDuringSession || session.status === "live" || session.status === "LIVE") {
      statusTag = `<span class="session-tag live">${session.status === "live" || session.status === "LIVE" ? (t("session.liveNow") || "LIVE NOW 🔴") : ("🔴 موعد الحصة الآن (" + formattedTime + " - " + formattedEndTime + ")")}</span>`;
      if (isCheckedIn) {
        sessionAction = `
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:14px;">
            <span style="font-size:0.78rem; font-weight:800; color:#10b981; padding:6px 10px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:10px; display:inline-flex; align-items:center; justify-content:center; gap:6px; width:100%; box-sizing:border-box;">
              <i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> تم تأكيد حضور المعلم (حاضر في الموعد) ✅
            </span>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <button class="btn-primary" data-join-meet-id="${session.id}" style="background:var(--success); font-size:0.88rem; padding:10px; justify-content:center; border:none; cursor:pointer; font-weight:800; color:#fff; display:flex; align-items:center; gap:6px; border-radius:10px;"><i data-lucide="video"></i> Google Meet 🎥</button>
              <button class="btn-secondary ${isGroup ? 'end-session-btn' : 'complete-private-btn'}" data-id="${session.id}" style="font-size:0.82rem; padding:10px; justify-content:center; color:var(--error); border-color:var(--error); font-weight:800;"><i data-lucide="stop-circle"></i> إنهاء وتوثيق</button>
            </div>
          </div>
        `;
      } else {
        sessionAction = `
          <div class="session-actions-wrapper" data-id="${session.id}" style="display:flex; flex-direction:column; gap:8px; margin-top:14px;">
            <button class="btn-primary session-checkin-btn" data-id="${session.id}" data-role="teacher" style="background:linear-gradient(135deg, #10b981, #059669); border:none; color:#fff; font-size:0.88rem; padding:11px; justify-content:center; font-weight:800; width:100%; border-radius:12px; box-shadow:0 4px 15px rgba(16,185,129,0.3); cursor:pointer;">
              <i data-lucide="user-check" style="width:16px; height:16px;"></i> تأكيد حضور المعلم الآن (في وقت الحصة) ✍️
            </button>
            <div style="font-size:0.74rem; color:var(--text-muted); text-align:center;">* متاح تأكيد الحضور الآن فقط حتى نهاية وقت الحصة (${formattedEndTime})</div>
          </div>
        `;
      }
    } else {
      const teacherWindow = 60 * 60 * 1000;
      const isTeacherJoinable = nowTime >= (sessionTime - teacherWindow);

      if (isTeacherJoinable) {
        statusTag = `<span class="session-tag" style="background:var(--info-glow); color:var(--info); border-color:var(--info); font-weight:800;">⚡ تبدأ في تمام ${formattedTime}</span>`;
        sessionAction = `
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:14px;">
            <div style="background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.25); border-radius:10px; padding:8px 12px; color:var(--primary); font-size:0.78rem; font-weight:800; text-align:center;">
              <i data-lucide="clock" style="width:14px; height:14px; vertical-align:middle;"></i> ينشط تأكيد الحضور في موعد الحصة تماماً (${formattedTime}) 🔒
            </div>
            <button class="btn-secondary" data-join-meet-id="${session.id}" style="font-size:0.85rem; padding:9px; justify-content:center; display:flex; align-items:center; gap:6px; font-weight:800; cursor:pointer; border-radius:10px;"><i data-lucide="video"></i> معاينة Google Meet 🎥</button>
          </div>
        `;
      } else {
        statusTag = `<span class="session-tag" style="background:rgba(99,102,241,0.1); color:var(--primary); font-weight:800;">${t("session.scheduled") || "مجدولة اليوم ⏰"}</span>`;
        sessionAction = `
          <div style="display:grid; grid-template-columns:1fr; gap:10px; margin-top:14px;">
            <button disabled class="btn-secondary session-action restricted-join-btn" style="cursor:not-allowed; font-size:0.82rem; padding:10px; opacity:0.85; width:100%; justify-content:center; background:rgba(99,102,241,0.06); color:var(--primary); border-color:rgba(99,102,241,0.2); font-weight:700;" title="ينشط دخول المعلم قبل موعد الحصة بساعة واحدة (60 دقيقة)"><i data-lucide="lock" style="width:14px;height:14px;margin-inline-end:4px;"></i> ينشط دخول المعلم قبل الموعد بساعة 🔒</button>
          </div>
        `;
      }
    }

    return `
      <div class="glass-card session-card" style="padding:22px 20px; display:flex; flex-direction:column; justify-content:space-between; border-radius:18px; ${isLive ? "border-color: var(--success); box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);" : ""}">
        <div>
          <div class="session-header-row" style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
            ${statusTag}
            <span style="font-size:0.82rem; color:var(--text-muted); font-weight:700;">
              <i data-lucide="clock" style="width:13px;height:13px;vertical-align:middle;margin-inline-end:4px;"></i>${durationMins} دقيقة
            </span>
          </div>

          <!-- Group / Session Name -->
          <h4 class="session-title" style="font-size:1.15rem; font-weight:800; margin:0 0 10px 0; color:var(--text-main); line-height:1.35;">
            ${session.title || (isGroup ? (session.group?.name || 'حصة تدريسية جماعية') : 'حصة خاصة')}
          </h4>

          <!-- Under Group Name: Teacher & Subject Details -->
          <div class="session-meta-strip" style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:14px; padding:12px 14px; margin-bottom:14px; display:flex; flex-direction:column; gap:10px;">
            
            <!-- Person Row: Student or Group -->
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
              <div style="display:flex; align-items:center; gap:9px;">
                ${personAvatar ? `
                  <img src="${personAvatar}" alt="${personName}" style="width:34px; height:34px; border-radius:50%; object-fit:cover; border:2px solid rgba(99,102,241,0.25);">
                ` : `
                  <div style="width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg, ${personIcon === 'user' ? '#a855f7, #6366f1' : '#10b981, #059669'}); color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.8rem; flex-shrink:0;">
                    <i data-lucide="${personIcon}" style="width:16px; height:16px;"></i>
                  </div>
                `}
                <div style="display:flex; flex-direction:column;">
                  <span style="font-size:0.72rem; color:var(--text-muted); font-weight:600; display:flex; align-items:center; gap:4px;">
                    <i data-lucide="${personIcon}" style="width:12px; height:12px; color:var(--primary);"></i> ${personLabel}
                  </span>
                  <span style="font-size:0.92rem; font-weight:800; color:var(--text-main);">${personName}</span>
                </div>
              </div>
              ${session.course && hasSubject ? `
                <span style="font-size:0.75rem; font-weight:700; color:var(--primary); background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.2); padding:3px 10px; border-radius:10px; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${session.course.title}">
                  <i data-lucide="book" style="width:12px; height:12px; vertical-align:middle;"></i> ${session.course.title}
                </span>
              ` : ''}
            </div>

            <!-- Subject & Grade Badges Row -->
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding-top:8px; border-top:1px dashed var(--border-color);">
              <div style="display:inline-flex; align-items:center; gap:6px; font-size:0.82rem; font-weight:800; color:#e51d74; background:rgba(229,29,116,0.08); padding:4px 10px; border-radius:10px; border:1px solid rgba(229,29,116,0.2);">
                <i data-lucide="book-open" style="width:13px; height:13px;"></i>
                <span>${subjectLabel}: <strong>${subjectName}</strong></span>
              </div>

              ${gradeName ? `
                <div style="display:inline-flex; align-items:center; gap:5px; font-size:0.8rem; font-weight:800; color:#10b981; background:rgba(16,185,129,0.08); padding:4px 10px; border-radius:10px; border:1px solid rgba(16,185,129,0.2);">
                  <i data-lucide="graduation-cap" style="width:13px; height:13px;"></i>
                  <span>${gradeName}</span>
                </div>
              ` : ''}
            </div>

          </div>

          ${session.description ? `<p style="font-size:0.84rem; color:var(--text-muted); line-height:1.5; margin:0 0 10px 0;">${session.description}</p>` : ''}
        </div>

        <div style="margin-top:auto;">
          <div class="session-time" style="padding:10px 12px; background:var(--bg-app); border-radius:10px; border:1px solid var(--border-color); display:flex; align-items:center; gap:8px; margin-bottom:12px;">
            <i data-lucide="calendar" style="width:15px;height:15px;color:var(--primary);"></i>
            <span style="font-weight:700; font-size:0.86rem; color:var(--text-main);">اليوم في تمام ${formattedTime} (حتى ${formattedEndTime})</span>
          </div>
          ${sessionAction}
        </div>
      </div>
    `;
  }

  // ── Helper: Render Assignment Card for Teacher Dashboard ────────────────
  renderTeacherAssignmentCard(asgn) {
    const qCount = Array.isArray(asgn.questions) ? asgn.questions.length : 0;
    const dueDate = asgn.dueDate ? new Date(asgn.dueDate) : null;
    const dueDateStr = dueDate ? dueDate.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'غير محدد';
    const isOverdue = dueDate && (new Date() > dueDate);

    const subCount = asgn.submissionsCount || 0;
    const gradCount = asgn.gradedCount || 0;
    const pendingGrading = Math.max(0, subCount - gradCount);

    return `
      <div class="glass-card teacher-dash-assignment-card" style="padding:20px; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card); display:flex; flex-direction:column; justify-content:space-between; gap:14px; transition:all 0.2s; box-shadow:0 4px 18px rgba(0,0,0,0.03);"
        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 10px 26px rgba(0,0,0,0.06)';"
        onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 18px rgba(0,0,0,0.03)';">
        
        <div>
          <!-- Header Meta -->
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; gap:8px;">
            <span class="badge" style="background:rgba(99,102,241,0.1); color:var(--primary); font-size:0.75rem; font-weight:800; border:1px solid rgba(99,102,241,0.2); border-radius:10px; padding:3px 10px;">
              ${asgn.group?.name ? `👥 مجموعة: ${asgn.group.name}` : (asgn.course?.title || 'واجب دراسي')}
            </span>

            <span style="font-size:0.75rem; font-weight:700; color:${isOverdue ? '#ef4444' : 'var(--text-muted)'}; display:inline-flex; align-items:center; gap:4px;">
              <i data-lucide="clock" style="width:13px; height:13px;"></i>
              <span>${dueDateStr}</span>
            </span>
          </div>

          <!-- Assignment Title -->
          <h4 style="font-size:1.05rem; font-weight:900; margin:0 0 6px 0; color:var(--text-main); line-height:1.4;">
            ${asgn.title}
          </h4>

          <div style="display:flex; align-items:center; gap:8px; font-size:0.78rem; color:var(--text-muted); font-weight:700; margin-bottom:12px;">
            <span>📝 ${qCount} أسئلة</span>
            <span>•</span>
            <span>🎯 ${asgn.totalPoints || 100} درجة</span>
            ${asgn.type === 'mcq' ? `<span>•</span><span style="color:#10b981;">تصحيح آلي MCQ</span>` : ''}
          </div>

          <!-- Submission & Grading Status Bar -->
          <div style="background:var(--bg-app); border-radius:14px; padding:10px 14px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
            <div style="display:flex; align-items:center; gap:12px; font-size:0.78rem; font-weight:800;">
              <span style="color:var(--primary); display:inline-flex; align-items:center; gap:4px;">
                <i data-lucide="inbox" style="width:14px; height:14px;"></i>
                <span>المستلم: <strong>${subCount}</strong></span>
              </span>
              <span style="color:#10b981; display:inline-flex; align-items:center; gap:4px;">
                <i data-lucide="check-check" style="width:14px; height:14px;"></i>
                <span>المصحح: <strong>${gradCount}</strong></span>
              </span>
            </div>

            <div>
              ${pendingGrading > 0 ? `
                <span style="font-size:0.74rem; font-weight:900; padding:3px 10px; border-radius:8px; background:rgba(245,158,11,0.15); color:#d97706; border:1px solid rgba(245,158,11,0.3); display:inline-flex; align-items:center; gap:4px;">
                  <i data-lucide="hourglass" style="width:12px; height:12px;"></i>
                  <span>بانتظار التصحيح: ${pendingGrading} ⏳</span>
                </span>
              ` : subCount > 0 ? `
                <span style="font-size:0.74rem; font-weight:900; padding:3px 10px; border-radius:8px; background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3);">
                  تم تصحيح الكل 🏆
                </span>
              ` : `
                <span style="font-size:0.74rem; color:var(--text-muted); font-weight:700;">
                  لا تسليمات بعد
                </span>
              `}
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display:flex; gap:8px; border-top:1px solid var(--border-color); padding-top:12px;">
          <button class="btn-secondary teacher-dash-asgn-details-btn" data-id="${asgn.id}"
            style="flex:1; justify-content:center; padding:8px 10px; border-radius:12px; font-size:0.8rem; font-weight:800; display:inline-flex; align-items:center; gap:4px; cursor:pointer;"
            title="عرض تفاصيل وأسئلة الواجب وتعديلها">
            <i data-lucide="clipboard-list" style="width:14px; height:14px;"></i>
            <span>التفاصيل والأسئلة 📋</span>
          </button>
          <button class="btn-primary teacher-dash-asgn-grade-btn" data-id="${asgn.id}" data-title="${asgn.title}" data-total="${asgn.totalPoints || 100}"
            style="flex:1; justify-content:center; padding:8px 10px; border-radius:12px; font-size:0.8rem; font-weight:800; display:inline-flex; align-items:center; gap:4px; cursor:pointer; background:linear-gradient(135deg, var(--primary), #8b5cf6);">
            <i data-lucide="check-square" style="width:14px; height:14px;"></i>
            <span>التصحيح ورصد الدرجات 🎯</span>
          </button>
        </div>

      </div>
    `;
  }

  renderTeacherSessionCard(session) {
    const date = new Date(session.scheduledAt);
    const sessionTime = date.getTime();
    const durationMins = session.duration || 60;
    const durationMs = durationMins * 60 * 1000;
    const nowTime = Date.now();

    const sessionStart = sessionTime;
    const sessionEnd = sessionStart + durationMs;

    const endDate = new Date(sessionEnd);
    const formattedEndTime = endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const formattedTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const formattedDate = date.toLocaleDateString([], { month: "short", day: "numeric" });

    const isCompleted = session.status === "completed" || session.status === "COMPLETED" || session.status?.includes("CANCELLED");
    const isPastSession = !isCompleted && (nowTime > sessionEnd);
    const isDuringSession = !isCompleted && (nowTime >= sessionStart && nowTime <= sessionEnd);
    const isLive = !isCompleted && (session.status === "live" || session.status === "active" || session.status === "LIVE");
    const isCheckedIn = window.checkedInSessions?.has(session.id) || !!session.isCheckedIn;

    let statusTag = `<span class="session-tag">${t("session.scheduled")}</span>`;
    let sessionAction = "";

    if (isCompleted) {
      statusTag = `<span class="session-tag" style="background:rgba(16,185,129,0.12); color:#10b981; border-color:rgba(16,185,129,0.3); font-weight:800;">${t("session.finished") || '✅ مكتملة وموثقة'}</span>`;
      sessionAction = `<button class="btn-secondary session-action" style="cursor:default; margin-top:12px; font-size:0.8rem; padding:8px; opacity:0.85;" disabled>تم توثيق التقرير واعتماد الرصيد ✅</button>`;
    } else if (isPastSession) {
      statusTag = `<span class="session-tag" style="background:rgba(239,68,68,0.1); color:#ef4444; border-color:rgba(239,68,68,0.25); font-weight:800;">⌛ انتهى وقت الحصة</span>`;
      if (isCheckedIn) {
        // Teacher was on time! Now can document the report and finalize
        sessionAction = `
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:14px;">
            <span style="font-size:0.78rem; font-weight:800; color:#10b981; padding:6px 10px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:10px; display:inline-flex; align-items:center; justify-content:center; gap:6px; width:100%; box-sizing:border-box;">
              <i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> تم تأكيد حضور المعلم في موعد الحصة ✅
            </span>
            <button class="btn-primary end-session-btn" data-id="${session.id}" style="background:linear-gradient(135deg, #10b981, #059669); border-color:#10b981; font-size:0.82rem; padding:9px 12px; justify-content:center; font-weight:800; border-radius:12px; box-shadow:0 4px 12px rgba(16,185,129,0.25); cursor:pointer;">
              <i data-lucide="file-check" style="width:15px;height:15px;"></i> 📝 توثيق التقرير وإنهاء الحصة (واحتساب الرصيد)
            </button>
          </div>
        `;
      } else {
        // Missed attendance window! (Past session end and never checked in)
        sessionAction = `
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:14px;">
            <div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); border-radius:10px; padding:10px 12px; color:#ef4444; font-size:0.78rem; font-weight:800; text-align:center; line-height:1.4;">
              <i data-lucide="alert-triangle" style="width:15px; height:15px; vertical-align:middle;"></i> انتهى وقت الحصة ولم يتم تأكيد الحضور في الموعد (مسجل غياب المعلم) ⚠️
            </div>
            <button disabled class="btn-secondary" style="opacity:0.6; cursor:not-allowed; font-size:0.78rem; padding:8px; width:100%; justify-content:center; background:rgba(0,0,0,0.04); color:var(--text-muted); font-weight:700;" title="لا يمكن توثيق التقرير لعدم تأكيد الحضور أثناء وقت الحصة">
              <i data-lucide="lock" style="width:13px;height:13px;margin-inline-end:4px;"></i> توثيق التقرير مقفل (غياب المعلم) 🔒
            </button>
          </div>
        `;
      }
    } else if (isDuringSession) {
      statusTag = `<span class="session-tag live">${session.status === "live" ? t("session.liveNow") : "🔴 موعد الحصة الآن (" + formattedTime + " - " + formattedEndTime + ")"}</span>`;
      if (isCheckedIn) {
        sessionAction = `
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:14px;">
            <span style="font-size:0.78rem; font-weight:800; color:#10b981; padding:6px 10px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:10px; display:inline-flex; align-items:center; justify-content:center; gap:6px; width:100%; box-sizing:border-box;">
              <i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> تم تأكيد حضور المعلم (حاضر في الموعد) ✅
            </span>
            <div style="display:grid; grid-template-columns:1fr auto; gap:8px;">
              <button class="btn-primary" data-join-meet-id="${session.id}" style="background:linear-gradient(135deg, #10b981, #059669); font-size:0.82rem; font-weight:800; padding:9px 14px; justify-content:center; border-radius:12px; display:flex; align-items:center; gap:6px; border:none; color:#fff; cursor:pointer;"><i data-lucide="video" style="width:16px;height:16px;"></i> فتح Google Meet الآن 🔴</button>
              <button class="btn-secondary end-session-btn" data-id="${session.id}" style="font-size:0.78rem; padding:6px 12px; justify-content:center; color:var(--error); border-color:var(--error); font-weight:800;"><i data-lucide="stop-circle" style="width:14px;height:14px;"></i> إنهاء وتوثيق</button>
            </div>
          </div>
        `;
      } else {
        // Teacher MUST check in right now during session window!
        sessionAction = `
          <div class="session-actions-wrapper" data-id="${session.id}" style="display:flex; flex-direction:column; gap:8px; margin-top:14px;">
            <button class="btn-primary session-checkin-btn" data-id="${session.id}" data-role="teacher" style="background:linear-gradient(135deg, #10b981, #059669); border:none; color:#fff; font-size:0.85rem; padding:10px; justify-content:center; font-weight:800; width:100%; border-radius:12px; box-shadow:0 4px 15px rgba(16,185,129,0.3); cursor:pointer;">
              <i data-lucide="user-check" style="width:15px; height:15px;"></i> تأكيد حضور المعلم الآن (في وقت الحصة) ✍️
            </button>
            <div style="font-size:0.74rem; color:var(--text-muted); text-align:center;">* متاح تأكيد الحضور الآن فقط حتى نهاية وقت الحصة (${formattedEndTime})</div>
          </div>
        `;
      }
    } else {
      // Pre-session (nowTime < sessionStart)
      const isWithinOneHour = canJoinSession(session);
      if (isWithinOneHour) {
        statusTag = `<span class="session-tag" style="background:var(--info-glow); color:var(--info); border-color:var(--info); font-weight:800;">⚡ تبدأ في ${formattedTime}</span>`;
        sessionAction = `
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:14px;">
            <div style="background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.25); border-radius:10px; padding:8px 12px; color:var(--primary); font-size:0.78rem; font-weight:800; text-align:center;">
              <i data-lucide="clock" style="width:14px; height:14px; vertical-align:middle;"></i> ينشط تأكيد الحضور في موعد الحصة تماماً (${formattedTime}) 🔒
            </div>
            <div style="display:grid; grid-template-columns:1fr auto; gap:6px;">
              <button class="btn-secondary" data-join-meet-id="${session.id}" style="font-size:0.78rem; padding:7px 10px; justify-content:center; display:flex; align-items:center; gap:4px; font-weight:800; cursor:pointer; border-radius:10px;"><i data-lucide="video" style="width:13px;height:13px;"></i> معاينة Google Meet 🎥</button>
              <button class="btn-secondary edit-session-btn" data-id="${session.id}" style="font-size:0.78rem; padding:7px 10px; justify-content:center; border-color:var(--primary); color:var(--primary);" title="تعديل تاريخ ووقت الجلسة">
                <i data-lucide="calendar-clock" style="width:13px;height:13px;"></i>
              </button>
            </div>
          </div>
        `;
      } else {
        statusTag = `<span class="session-tag">${t("session.scheduled")}</span>`;
        sessionAction = `
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:14px;">
            <div style="display:grid; grid-template-columns:1fr auto; gap:8px;">
              <button disabled class="btn-secondary" style="font-size:0.78rem; padding:7px 10px; opacity:0.85; cursor:not-allowed; justify-content:center; background:rgba(99,102,241,0.06); color:var(--primary); border-color:rgba(99,102,241,0.2); font-weight:700;">
                <i data-lucide="lock" style="width:13px;height:13px;margin-inline-end:4px;"></i> ينشط قبل الموعد بساعة 🔒
              </button>
              <button class="btn-secondary edit-session-btn" data-id="${session.id}" style="font-size:0.8rem; padding:7px 10px; justify-content:center; border-color:var(--primary); color:var(--primary);" title="تعديل تاريخ ووقت الجلسة">
                <i data-lucide="calendar-clock" style="width:13px;height:13px;"></i>
              </button>
            </div>
          </div>
        `;
      }
    }

    return `
      <div class="glass-card session-card" style="${isLive ? "border-color: var(--success);" : ""}">
        <div class="session-header-row">
          ${statusTag}
          <span style="font-size: 0.75rem; color:var(--text-muted); font-weight:600;">${session.duration} ${t("session.mins")}</span>
        </div>
        <h4 class="session-title">${session.title}</h4>
        
        <!-- Student Name & Course in Teacher Dashboard -->
        <div style="display:flex; flex-direction:column; gap:5px; margin-top:6px; margin-bottom:6px; background:var(--bg-app); border:1px solid var(--border-color); border-radius:10px; padding:8px 10px;">
          <div style="font-size:0.84rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:6px;">
            <i data-lucide="${session.student ? 'user' : 'users'}" style="width:14px; height:14px; color:var(--primary);"></i>
            <span>الطالب: <strong style="color:var(--primary);">${session.student?.name || session.subscription?.student?.name || 'طلاب المجموعة'}</strong></span>
          </div>
          ${session.course ? `<div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; display:flex; align-items:center; gap:5px;"><i data-lucide="book" style="width:12px;height:12px;color:#e51d74;"></i> ${session.course.subject?.name ? `المادة: <strong style="color:var(--text-main);">${session.course.subject.name}</strong> • ${session.course.title}` : `الكورس: <strong style="color:var(--text-main);">${session.course.title}</strong>`}</div>` : ""}
        </div>
        <div class="session-time" style="margin-top:6px;">
          <i data-lucide="calendar" style="width:14px;height:14px;"></i>
          <span>${formattedDate} ${t("session.at")} ${formattedTime}</span>
        </div>
        ${sessionAction}
      </div>
    `;
  }


  bindEvents() {
    document.querySelectorAll(".teacher-view-sub-sessions-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const subId = e.currentTarget.getAttribute("data-id");
        this.selectedSubscriptionId = subId;
        this.currentViewMode = 'student_sessions';
        this.render();
      });
    });

    document.getElementById("back-to-dashboard-btn")?.addEventListener("click", () => {
      this.currentViewMode = 'dashboard';
      this.selectedSubscriptionId = null;
      this.render();
    });

    document.getElementById("student-sessions-status-filter")?.addEventListener("change", (e) => {
      this.sessionsFilterStatus = e.target.value;
      this.render();
    });

    // Financial Hub Event Listeners
    this.container.querySelector("#open-financial-hub-btn")?.addEventListener("click", () => {
      this.currentViewMode = 'financial';
      window.location.hash = "#teacher-financial";
      this.render();
    });

    this.container.querySelector("#stat-box-earnings")?.addEventListener("click", () => {
      this.currentViewMode = 'financial';
      window.location.hash = "#teacher-financial";
      this.render();
    });

    // Session Table Actions
    document.querySelectorAll(".start-session-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        try {
          const res = await apiFetch(`/sessions/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "live" }) });
          if (res.message) showToast(res.message, "success");
          this.render();
        } catch (err) {
          showToast(err.message || "فشل بدء الجلسة", "error");
        }
      });
    });

    document.querySelectorAll(".end-session-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        if (typeof window.showEndSessionReportModal === 'function') {
          window.showEndSessionReportModal(id, () => this.render());
        }
      });
    });

    document.querySelectorAll(".session-checkin-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader" class="spinner" style="width:13px;height:13px;"></i> جاري تأكيد الحضور...`;
        if (window.lucide) window.lucide.createIcons();

        try {
          const res = await apiFetch(`/sessions/${id}/checkin`, { method: "POST" });
          showToast(res.message || "تم تأكيد حضورك في الحصة بنجاح ولن يتم احتسابك غائباً ✅", "success");
          window.checkedInSessions = window.checkedInSessions || new Set();
          window.checkedInSessions.add(id);

          const wrapper = btn.closest(".session-actions-wrapper") || btn.parentElement;
          if (wrapper) {
            wrapper.innerHTML = `
              <div style="display:flex; flex-direction:column; gap:8px;">
                <span style="font-size:0.78rem; font-weight:800; color:#10b981; padding:6px 10px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:10px; display:inline-flex; align-items:center; justify-content:center; gap:6px; width:100%; box-sizing:border-box;">
                  <i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> تم تأكيد حضور المعلم (حاضر) ✅
                </span>
                <div style="display:grid; grid-template-columns:1fr 1fr auto; gap:6px;">
                  <button class="btn-primary start-session-btn" data-id="${id}" style="font-size:0.78rem; padding:7px 10px; justify-content:center; font-weight:800;"><i data-lucide="play" style="width:13px;height:13px;"></i> بدء البث 🔴</button>
                  <button class="btn-secondary" data-join-meet-id="${id}" style="font-size:0.78rem; padding:7px 10px; justify-content:center; display:flex; align-items:center; gap:4px; font-weight:800; cursor:pointer; border-radius:10px;"><i data-lucide="video" style="width:13px;height:13px;"></i> Google Meet 🎥</button>
                  <button class="btn-secondary edit-session-btn" data-id="${id}" style="font-size:0.78rem; padding:7px 10px; justify-content:center; border-color:var(--primary); color:var(--primary);" title="تعديل تاريخ ووقت الجلسة">
                    <i data-lucide="calendar-clock" style="width:13px;height:13px;"></i>
                  </button>
                </div>
              </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            wrapper.querySelectorAll(".start-session-btn").forEach(sBtn => {
              sBtn.addEventListener("click", async () => {
                const sId = sBtn.getAttribute("data-id");
                try {
                  const r = await apiFetch(`/sessions/${sId}/status`, { method: "PATCH", body: JSON.stringify({ status: "live" }) });
                  if (r.message) showToast(r.message, "success");
                  this.render();
                } catch (err) {
                  showToast(err.message || "فشل بدء الجلسة", "error");
                }
              });
            });
          }
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = `<i data-lucide="user-check" style="width:14px; height:14px;"></i> تأكيد حضور المعلم (لست غائباً) ✍️`;
          if (window.lucide) window.lucide.createIcons();
          showToast(err.message || "تعذر تأكيد الحضور.", "error");
        }
      });
    });

    document.querySelectorAll(".handle-request-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        const action = e.currentTarget.getAttribute("data-action"); // active or rejected

        if (action === "active") {
          try {
            const requests = await apiFetch("/teacher/enrollment-requests");
            const req = Array.isArray(requests) ? requests.find(r => r.id === id) : null;

            showEnrollmentAcceptanceModal({
              enrollmentId: id,
              studentName: req?.student?.name || "الطالب",
              studentPhone: "",
              studentEmail: "",
              courseTitle: req?.course?.title || "الدورة التعليمية",
              teacherName: req?.course?.teacher?.name || state.user?.name,
              onAccept: async () => {
                try {
                  const res = await apiFetch(`/teacher/enrollment-requests/${id}`, {
                    method: "PUT",
                    body: JSON.stringify({ status: "active" })
                  });
                  showToast("تم قبول طلب الطالب بنجاح! 🎉", "success");
                  checkPendingRequestsNotification();
                  await this.render();
                } catch (err) {
                  console.error(err);
                  showToast(err.message || "حدث خطأ أثناء قبول الطلب", "error");
                }
              }
            });
          } catch (err) {
            console.error(err);
          }
        } else {
          try {
            await apiFetch(`/teacher/enrollment-requests/${id}`, {
              method: "PUT",
              body: JSON.stringify({ status: action })
            });
            showToast("تم رفض الطلب.", "info");
            checkPendingRequestsNotification();
            await this.render();
          } catch (err) {
            console.error(err);
          }
        }
      });
    });

    // Schedule filter buttons click handler for Teacher
    const filterBtns = this.container.querySelectorAll("[data-teacher-schedule-filter]");
    filterBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const filter = btn.getAttribute("data-teacher-schedule-filter");
        this.sessionFilter = filter;
        filterBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const container = this.container.querySelector("#teacher-schedule-container");
        if (container) {
          const filtered = this.filterSessions(this.sessions);
          container.innerHTML = filtered.length === 0
            ? `<div class="glass-card" style="text-align:center; padding: 30px; color:var(--text-muted);">${t("teacher.noSessions")}</div>`
            : filtered.map(session => this.renderTeacherSessionCard(session)).join("");
          if (window.lucide) window.lucide.createIcons();
          this.bindSessionActionButtons();
        }
      });
    });

    const courseModal = document.getElementById("course-modal");
    this.setupImageUploadEvents();

    const openCourseModalHandler = async () => {
      document.getElementById("create-course-form").reset();
      document.getElementById("create-course-form").removeAttribute("data-id");
      document.getElementById("course-image-url").value = "";
      const previewWrapper = document.getElementById("image-preview-wrapper");
      const idleBox = document.getElementById("image-upload-idle");
      if (previewWrapper) previewWrapper.style.display = "none";
      if (idleBox) idleBox.style.display = "block";
      await this.initTeacherCurriculumSelector();
      courseModal.querySelector(".modal-title").innerText = t("teacher.createCourse");
      courseModal.style.display = "flex";
    };

    // Open for Create
    document.getElementById("open-course-modal-btn")?.addEventListener("click", openCourseModalHandler);
    document.getElementById("open-course-modal-btn-2")?.addEventListener("click", openCourseModalHandler);
    document.getElementById("open-course-modal-btn-empty")?.addEventListener("click", openCourseModalHandler);

    document.getElementById("close-course-modal")?.addEventListener("click", () => { courseModal.style.display = "none"; });
    document.getElementById("cancel-course-modal")?.addEventListener("click", () => { courseModal.style.display = "none"; });

    // Open for Edit 
    const editButtons = this.container.querySelectorAll(".edit-course-btn");
    editButtons.forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const courseId = e.currentTarget.getAttribute("data-id");
        const course = await apiFetch(`/courses/${courseId}`);
        if (course) {
          document.getElementById("course-title").value = course.title || "";
          await this.initTeacherCurriculumSelector(course.grade?.id || course.gradeId, course.subject?.id || course.subjectId);
          document.getElementById("course-desc").value = course.description || "";
          document.getElementById("course-image-url").value = course.image || "";
          const directUrlInput = document.getElementById("course-image-url-direct");
          if (directUrlInput) directUrlInput.value = course.image || "";
          document.getElementById("course-meeting-link").value = course.meetingLink || "";

          const previewWrapper = document.getElementById("image-preview-wrapper");
          const previewImg = document.getElementById("course-preview-img");
          const idleBox = document.getElementById("image-upload-idle");
          if (course.image && previewWrapper && previewImg) {
            previewImg.src = course.image;
            previewWrapper.style.display = "block";
            if (idleBox) idleBox.style.display = "none";
          } else if (previewWrapper) {
            previewWrapper.style.display = "none";
            if (idleBox) idleBox.style.display = "block";
          }

          document.getElementById("create-course-form").setAttribute("data-id", courseId);
          courseModal.querySelector(".modal-title").innerText = "تعديل الدورة التعليمية";
          courseModal.style.display = "flex";
        }
      });
    });

    document.getElementById("create-course-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("course-title").value.trim();
      const hiddenCategory = document.getElementById("course-category-select");
      const hiddenDegree = document.getElementById("course-degree");
      const hiddenGradeId = document.getElementById("modal-selected-grade-id");
      const hiddenSubjectId = document.getElementById("modal-selected-subject-id");

      let category = hiddenCategory?.value?.trim();
      const customSubInput = document.getElementById("modal-custom-subject-input");
      if (!category && customSubInput && customSubInput.value) {
        category = customSubInput.value.trim();
      }

      if (!category) { 
        showToast("الرجاء اختيار المادة الدراسية أو كتابتها.", "error"); 
        return; 
      }

      const degree = hiddenDegree?.value || "";
      const gradeId = hiddenGradeId?.value || null;
      const subjectId = hiddenSubjectId?.value || null;
      const description = document.getElementById("course-desc").value;
      let image = document.getElementById("course-image-url")?.value || document.getElementById("course-image-url-direct")?.value.trim() || "";
      const meetingLink = document.getElementById("course-meeting-link").value;
      const fileInput = document.getElementById("course-image-file");

      // Handle file upload if not uploaded yet
      if (!image && fileInput && fileInput.files.length > 0) {
        const formData = new FormData();
        formData.append("file", fileInput.files[0]);
        try {
          const token = state.token || localStorage.getItem("token");
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            headers: { "Authorization": "Bearer " + token },
            body: formData
          });
          if (uploadRes.ok) {
            const data = await uploadRes.json();
            image = data.url;
          }
        } catch (err) {
          console.error("Upload failed", err);
        }
      }

      const courseId = document.getElementById("create-course-form").getAttribute("data-id");
      try {
        if (courseId) {
          await apiFetch(`/courses/${courseId}`, { 
            method: "PUT", 
            body: JSON.stringify({ title, category, degree, gradeId, subjectId, description, image, meetingLink }) 
          });
          showToast("تم تحديث بيانات الدورة بنجاح! ✅", "success");
        } else {
          await apiFetch("/courses", { 
            method: "POST", 
            body: JSON.stringify({ title, category, degree, gradeId, subjectId, description, image, meetingLink }) 
          });
          showToast("تم إنشاء الدورة التعليمية بنجاح وإرسالها للاعتماد! 🎉", "success");
        }
        courseModal.style.display = "none";
        await this.render();
      } catch (err) {
        showToast(err.message || "فشل حفظ الدورة التعليمية.", "error");
      }
    });

    const sessionModal = document.getElementById("session-modal");
    const openSessionModalHandler = () => {
      const form = document.getElementById("create-session-form");
      form.reset();
      form.removeAttribute("data-id");
      const dateInput = document.getElementById("session-date");
      if (dateInput) dateInput.min = getMinSessionDateTimeISO();
      sessionModal.querySelector(".modal-title").innerText = t("teacher.scheduleSession");
      sessionModal.style.display = "flex";
    };

    // Open for Session Create
    document.getElementById("open-session-modal-btn")?.addEventListener("click", openSessionModalHandler);
    document.getElementById("open-session-modal-btn-2")?.addEventListener("click", openSessionModalHandler);
    document.getElementById("close-session-modal")?.addEventListener("click", () => { sessionModal.style.display = "none"; });
    document.getElementById("cancel-session-modal")?.addEventListener("click", () => { sessionModal.style.display = "none"; });

    // Teacher Dashboard Assignment Details Modal (view details, questions, edit, delete)
    this.container.querySelectorAll(".teacher-dash-asgn-details-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.getAttribute("data-id"), 10);
        const asgn = (this.assignments || []).find(a => a.id === id);
        if (asgn) {
          const modal = new AssignmentDetailsModal(asgn, () => this.render());
          modal.open();
        }
      });
    });

    // Teacher Dashboard Assignment Grading Modal
    this.container.querySelectorAll(".teacher-dash-asgn-grade-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.getAttribute("data-id"), 10);
        const title = btn.getAttribute("data-title");
        const total = parseFloat(btn.getAttribute("data-total")) || 100;
        const modal = new AssignmentGradingModal(id, title, total, () => this.render());
        modal.open();
      });
    });


    document.querySelectorAll(".add-session-trigger").forEach(btn => {
      btn.addEventListener("click", () => {
        const courseId = btn.getAttribute("data-id");
        const form = document.getElementById("create-session-form");
        form.reset();
        form.removeAttribute("data-id");
        const dateInput = document.getElementById("session-date");
        if (dateInput) dateInput.min = getMinSessionDateTimeISO();
        sessionModal.querySelector(".modal-title").innerText = t("teacher.scheduleSession");
        sessionModal.style.display = "flex";
        const select = document.getElementById("session-course-id");
        if (select) select.value = courseId;
      });
    });

    // Edit Session Date & Time Handler
    this.container.querySelectorAll(".edit-session-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const sId = e.currentTarget.getAttribute("data-id");
        const session = (this.sessions || []).find(s => s.id === sId);
        if (!session) return;

        const form = document.getElementById("create-session-form");
        form.reset();
        form.setAttribute("data-id", session.id);
        sessionModal.querySelector(".modal-title").innerText = "تعديل موعد وتاريخ الجلسة (Edit Session)";

        document.getElementById("session-title").value = session.title || "";
        if (session.course) {
          document.getElementById("session-course-id").value = session.course.id;
        }
        document.getElementById("session-desc").value = session.description || "";
        document.getElementById("session-duration").value = session.duration || 60;

        const dateInput = document.getElementById("session-date");
        if (dateInput) dateInput.min = getMinSessionDateTimeISO();

        if (session.scheduledAt) {
          const d = new Date(session.scheduledAt);
          const pad = (n) => String(n).padStart(2, '0');
          const localISO = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          document.getElementById("session-date").value = localISO;
        }

        sessionModal.style.display = "flex";
      });
    });

    document.getElementById("create-session-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const sessionId = form.getAttribute("data-id");
      const title = document.getElementById("session-title").value;
      const courseId = document.getElementById("session-course-id").value;
      const description = document.getElementById("session-desc").value;
      const scheduledAt = document.getElementById("session-date").value;
      const duration = parseInt(document.getElementById("session-duration").value, 10);

      const validation = validateSessionScheduledDate(scheduledAt);
      if (!validation.valid) {
        showToast(validation.errorMsg, "error");
        return;
      }

      try {
        if (sessionId) {
          await apiFetch(`/sessions/${sessionId}`, {
            method: "PUT",
            body: JSON.stringify({ title, courseId, description, scheduledAt, duration })
          });
          showToast("تم تعديل موعد الجلسة بنجاح! ✅", "success");
        } else {
          await apiFetch("/sessions", {
            method: "POST",
            body: JSON.stringify({ title, courseId, description, scheduledAt, duration })
          });
          showToast(t("toast.sessionScheduled"), "success");
        }
        sessionModal.style.display = "none";
        form.reset();
        form.removeAttribute("data-id");
        await this.render();
      } catch (err) {
        showToast(err.message || "عفواً، لا يمكنك اختيار تاريخ سابق أو قريب جداً! يجب أن يكون موعد البث المباشر بعد الوقت الحالي بساعة واحدة على الأقل. ❌", "error");
      }
    });

    const lessonModal = document.getElementById("lesson-modal");
    const lessonTitleHeading = document.getElementById("lesson-modal-title");

    // Sub-tab toggling in Lesson Modal
    this.container.querySelectorAll(".teacher-lesson-tab-btn").forEach(tabBtn => {
      tabBtn.addEventListener("click", () => {
        this.container.querySelectorAll(".teacher-lesson-tab-btn").forEach(b => {
          b.classList.remove("active");
          b.style.color = "var(--text-muted)";
          b.style.borderBottom = "none";
        });
        tabBtn.classList.add("active");
        tabBtn.style.color = "var(--primary)";
        tabBtn.style.borderBottom = "2px solid var(--primary)";

        const targetTab = tabBtn.getAttribute("data-tab");
        this.container.querySelectorAll(".teacher-lesson-tab-content").forEach(c => c.style.display = "none");
        const activeContent = document.getElementById(`teacher-lesson-tab-${targetTab}`);
        if (activeContent) activeContent.style.display = "flex";
      });
    });

    const teacherQuestionsContainer = document.getElementById("teacher-lesson-questions-list");
    this.teacherLessonQuestions = [];

    document.getElementById("teacher-add-lesson-question-btn")?.addEventListener("click", () => {
      if (!this.teacherLessonQuestions) this.teacherLessonQuestions = [];
      this.teacherLessonQuestions.push({
        id: Date.now().toString(),
        questionText: "",
        options: ["", "", "", ""],
        correctAnswer: "0",
        explanation: ""
      });
      this.renderTeacherQuestionItemsInModal(teacherQuestionsContainer);
    });

    const resetTeacherLessonModalTabs = () => {
      const firstTab = this.container.querySelector('.teacher-lesson-tab-btn[data-tab="details"]');
      if (firstTab) firstTab.click();
    };

    document.querySelectorAll(".add-lesson-trigger").forEach(btn => {
      btn.addEventListener("click", () => {
        this.selectedCourseForLesson = btn.getAttribute("data-id");
        const courseTitle = btn.getAttribute("data-title");
        lessonTitleHeading.textContent = `${t("teacher.addLessonTo")}: ${courseTitle}`;
        this.teacherLessonQuestions = [];
        this.renderTeacherQuestionItemsInModal(teacherQuestionsContainer);
        resetTeacherLessonModalTabs();
        document.getElementById("add-lesson-form")?.reset();
        lessonModal.style.display = "flex";
      });
    });

    document.getElementById("close-lesson-modal")?.addEventListener("click", () => { lessonModal.style.display = "none"; });
    document.getElementById("cancel-lesson-modal")?.addEventListener("click", () => { lessonModal.style.display = "none"; });

    document.getElementById("add-lesson-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = e.target.querySelector("button[type='submit']");
      if (submitBtn) submitBtn.disabled = true;

      const title = document.getElementById("lesson-title").value.trim();
      const chapter = document.getElementById("lesson-chapter").value.trim() || "General";
      const videoUrl = document.getElementById("lesson-videourl").value.trim();
      const duration = document.getElementById("lesson-duration").value.trim() || "10:00";
      const order = parseInt(document.getElementById("lesson-order").value) || 1;
      const description = document.getElementById("lesson-desc").value.trim() || null;
      const notes = document.getElementById("teacher-lesson-notes")?.value.trim() || null;
      const resourceTitle = document.getElementById("teacher-lesson-resource-title")?.value.trim() || null;
      const resourceUrl = document.getElementById("teacher-lesson-resource-url")?.value.trim() || null;

      const validQuestions = (this.teacherLessonQuestions || []).filter(q => q.questionText && q.questionText.trim().length > 0);

      try {
        await apiFetch(`/courses/${this.selectedCourseForLesson}/lessons`, {
          method: "POST",
          body: JSON.stringify({
            title, chapter, videoUrl, duration, order, description, notes, resourceTitle, resourceUrl, questions: validQuestions
          })
        });
        showToast(t("toast.lessonUploaded"), "success");
        lessonModal.style.display = "none";
        document.getElementById("add-lesson-form").reset();
        await this.render();
      } catch (err) {
        console.error("Error saving lesson in TeacherView:", err);
        showToast(err.message || "فشل حفظ الدرس. الرجاء التحقق والمحاولة مجدداً.", "error");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });

    this.bindSessionActionButtons();
    this.bindPrivateSessionEvents();
  }

  bindPrivateSessionEvents() {
    // ─── Complete Private Session Modal ───
    const completeModal = document.getElementById('complete-private-modal');

    this.container.querySelectorAll('.complete-private-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (typeof window.showEndSessionReportModal === 'function') {
          window.showEndSessionReportModal(id, () => this.render());
          return;
        }
        document.getElementById('complete-session-id').value = id;
        document.getElementById('complete-topic').value = '';
        document.getElementById('complete-covered').value = '';
        document.getElementById('complete-performance').value = '';
        document.getElementById('complete-homework').value = '';
        document.getElementById('complete-notes').value = '';
        completeModal.style.display = 'flex';
      });
    });

    document.getElementById('close-complete-modal')?.addEventListener('click', () => {
      completeModal.style.display = 'none';
    });
    document.getElementById('cancel-complete-modal')?.addEventListener('click', () => {
      completeModal.style.display = 'none';
    });

    document.getElementById('submit-complete-btn')?.addEventListener('click', async () => {
      const id = document.getElementById('complete-session-id').value;
      const topic = document.getElementById('complete-topic').value;
      const whatWasCovered = document.getElementById('complete-covered').value;
      const studentPerformance = document.getElementById('complete-performance').value;
      const homework = document.getElementById('complete-homework').value;
      const teacherNotes = document.getElementById('complete-notes').value;

      const btn = document.getElementById('submit-complete-btn');
      btn.disabled = true;
      btn.textContent = 'جاري الحفظ...';
      try {
        await apiFetch(`/sessions/${id}/complete`, {
          method: 'POST',
          body: JSON.stringify({ topic, whatWasCovered, studentPerformance, homework, teacherNotes })
        });
        showToast('🎉 تم إكمال الحصة وتسجيل التقرير بنجاح!', 'success');
        completeModal.style.display = 'none';
        await this.render();
      } catch (err) {
        showToast(err.message || 'تعذر إكمال الحصة.', 'error');
        btn.disabled = false;
        btn.textContent = '✅ تأكيد إكمال الحصة';
      }
    });

    // ─── No-Show ───
    this.container.querySelectorAll('.noshow-private-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const confirmed = await confirmDialog({
          title: "تسجيل غياب طالب ⚠️",
          message: "هل أنت تأكد من تسجيل غياب الطالب لهذه الحصة؟ سيتم خصم حصة من رصيد الاشتراك وفق سياسة الأكاديمية.",
          confirmText: "تأكيد الغياب ⚠️",
          cancelText: "تراجع",
          danger: true
        });
        if (!confirmed) return;

        btn.disabled = true;
        try {
          await apiFetch(`/sessions/${id}/no-show`, { method: 'POST' });
          showToast('تم تسجيل غياب الطالب وخصم حصة. ⚠️', 'info');
          await this.render();
        } catch (err) {
          btn.disabled = false;
          showToast(err.message || 'تعذر تسجيل الغياب.', 'error');
        }
      });
    });

    // ─── Cancel Private Session ───
    this.container.querySelectorAll('.cancel-private-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const confirmed = await confirmDialog({
          title: "تأكيد إلغاء الحصة 🚫",
          message: "هل أنت تأكد من إلغاء هذه الحصة؟ سيتم استرداد رصيد الحصة للطالب وتسجيل الإلغاء.",
          confirmText: "تأكيد الإلغاء 🚫",
          cancelText: "تراجع",
          danger: true
        });
        if (!confirmed) return;

        btn.disabled = true;
        try {
          await apiFetch(`/sessions/${id}/cancel`, {
            method: 'POST',
            body: JSON.stringify({ reason: 'إلغاء من المعلم' })
          });
          showToast('تم إلغاء الحصة واسترداد رصيد للطالب. ✅', 'info');
          await this.render();
        } catch (err) {
          btn.disabled = false;
          showToast(err.message || 'تعذر إلغاء الحصة.', 'error');
        }
      });
    });

    // ─── View All Private Sessions Modal ───
    const allModal = document.getElementById('all-private-modal');
    const allList = document.getElementById('all-private-sessions-list');

    const renderAllSessions = (filter = 'all') => {
      const filtered = filter === 'all'
        ? this.privateSessions
        : this.privateSessions.filter(s => s.status === filter || (filter === 'CANCELLED_BY_STUDENT' && s.status.startsWith('CANCELLED')));
      allList.innerHTML = filtered.length === 0
        ? `<div style="text-align:center; padding:40px; color:var(--text-muted); grid-column:1/-1;">لا توجد حصص في هذا التصنيف.</div>`
        : filtered.map(s => this.renderPrivateSessionCard(s)).join('');
      if (window.lucide) window.lucide.createIcons();
    };

    document.getElementById('view-all-private-btn')?.addEventListener('click', () => {
      renderAllSessions('all');
      allModal.style.display = 'flex';
    });
    document.getElementById('close-all-private-modal')?.addEventListener('click', () => {
      allModal.style.display = 'none';
    });

    document.querySelectorAll('.private-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.private-filter-btn').forEach(b => {
          b.style.background = 'none';
          b.style.color = '';
          b.classList.remove('active');
        });
        btn.style.background = 'var(--primary)';
        btn.style.color = '#fff';
        btn.classList.add('active');
        renderAllSessions(btn.getAttribute('data-status'));
      });
    });
  }

  bindSessionActionButtons() {
    this.container.querySelectorAll(".start-session-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        try {
          await apiFetch(`/sessions/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "live" }) });
          showToast(t("toast.sessionLive"), "success");
          await this.render();
        } catch (err) { }
      });
    });

    document.querySelectorAll(".end-session-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        this.renderEndSessionReportModal(id);
      });
    });
  }

  async populateCategoryOptions(selectedCategory = "") {
    const catSelect = document.getElementById("course-category-select");
    if (!catSelect) return;

    let apiCategories = [];
    try {
      apiCategories = await apiFetch("/categories");
    } catch (e) {
      console.error("Failed to fetch categories", e);
    }

    let optionsHTML = `<option value="">-- اختر التصنيف المعتمد بالمنصة --</option>`;

    if (apiCategories && apiCategories.length > 0) {
      apiCategories.forEach(cat => {
        const isSel = selectedCategory && (selectedCategory === cat.name || selectedCategory.toLowerCase() === cat.name.toLowerCase());
        optionsHTML += `<option value="${cat.name}" ${isSel ? 'selected' : ''}>${cat.name}</option>`;
      });
    }

    catSelect.innerHTML = optionsHTML;
    if (selectedCategory && catSelect.querySelector(`option[value="${selectedCategory}"]`)) {
      catSelect.value = selectedCategory;
    }
  }

  async initTeacherCurriculumSelector(preselectedGradeId = null, preselectedSubjectId = null) {
    let allGrades = [];
    try {
      allGrades = await apiFetch("/curriculum/grades");
    } catch (e) {
      console.error("Failed to fetch curriculum grades for teacher modal:", e);
    }

    if (!Array.isArray(allGrades) || allGrades.length === 0) return;

    this.curriculumGradesData = allGrades;
    let currentStage = "PRIMARY";

    // If preselectedGradeId exists, infer the stage
    if (preselectedGradeId) {
      const g = allGrades.find(gr => gr.id === preselectedGradeId);
      if (g && g.stage) currentStage = g.stage;
    }

    const stageBtns = document.querySelectorAll(".teacher-modal-stage-btn");
    const gradeSelect = document.getElementById("modal-curriculum-grade-select");
    const subjectSelect = document.getElementById("modal-curriculum-subject-select");
    const customSubjectWrapper = document.getElementById("modal-custom-subject-wrapper");
    const customSubjectInput = document.getElementById("modal-custom-subject-input");
    const hiddenCategory = document.getElementById("course-category-select");
    const hiddenDegree = document.getElementById("course-degree");
    const hiddenGradeId = document.getElementById("modal-selected-grade-id");
    const hiddenSubjectId = document.getElementById("modal-selected-subject-id");

    const updateStageUI = (stage) => {
      currentStage = stage;
      stageBtns.forEach(btn => {
        const isCurrent = btn.getAttribute("data-stage") === stage;
        btn.classList.toggle("active", isCurrent);
        if (isCurrent) {
          const color = stage === "PRIMARY" ? "#10b981" : stage === "PREPARATORY" ? "#3b82f6" : "#e51d74";
          btn.style.background = color;
          btn.style.borderColor = color;
          btn.style.color = "#ffffff";
          btn.style.boxShadow = `0 4px 12px ${color}40`;
        } else {
          btn.style.background = "var(--bg-card)";
          btn.style.borderColor = "var(--border-color)";
          btn.style.color = "var(--text-main)";
          btn.style.boxShadow = "none";
        }
      });

      // Filter grades
      const stageGrades = allGrades.filter(g => g.stage === stage);
      if (stageGrades.length === 0) {
        if (gradeSelect) gradeSelect.innerHTML = `<option value="">لا توجد صفوف مسجلة لهذه المرحلة</option>`;
        if (subjectSelect) subjectSelect.innerHTML = `<option value="">-- اختر الصف أولاً --</option>`;
        return;
      }

      if (gradeSelect) {
        gradeSelect.innerHTML = stageGrades.map(g => `
          <option value="${g.id}" ${preselectedGradeId === g.id ? 'selected' : ''}>
            ${g.name}
          </option>
        `).join('');

        // Trigger grade change
        updateSubjectsUI(gradeSelect.value);
      }
    };

    const updateSubjectsUI = (gradeId) => {
      if (hiddenGradeId) hiddenGradeId.value = gradeId;
      const selectedGrade = allGrades.find(g => g.id === gradeId);
      if (selectedGrade && hiddenDegree) {
        hiddenDegree.value = selectedGrade.name;
      }

      const subjects = selectedGrade?.subjects || [];
      if (!subjectSelect) return;

      if (subjects.length === 0) {
        subjectSelect.innerHTML = `
          <option value="">لا توجد مواد مسجلة</option>
          <option value="__custom__">✏️ إدخال مادة مخصصة يدوياً</option>
        `;
        if (customSubjectWrapper) customSubjectWrapper.style.display = "block";
        return;
      }

      subjectSelect.innerHTML = `
        <option value="">-- اختر المادة الدراسية --</option>
        ${subjects.map(s => `
          <option value="${s.id}" data-name="${s.name}" ${preselectedSubjectId === s.id ? 'selected' : ''}>
            ${s.name} ${s.isLanguageTrack ? '(مسار لغات 🌐)' : '(منهج عام 🇪🇬)'}
          </option>
        `).join('')}
        <option value="__custom__">✏️ مادة أخرى / تخصص مخصص</option>
      `;

      if (preselectedSubjectId && subjects.some(s => s.id === preselectedSubjectId)) {
        const s = subjects.find(sub => sub.id === preselectedSubjectId);
        if (hiddenSubjectId) hiddenSubjectId.value = s.id;
        if (hiddenCategory) hiddenCategory.value = s.name;
        if (customSubjectWrapper) customSubjectWrapper.style.display = "none";
      } else {
        if (hiddenSubjectId) hiddenSubjectId.value = "";
        if (hiddenCategory) hiddenCategory.value = "";
        if (customSubjectWrapper) customSubjectWrapper.style.display = "none";
      }
    };

    if (!this._curriculumEventsBound) {
      this._curriculumEventsBound = true;
      stageBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          this._teacherCurriculumUpdateStageUI?.(btn.getAttribute("data-stage"));
        });
      });

      gradeSelect?.addEventListener("change", (e) => {
        this._teacherCurriculumUpdateSubjectsUI?.(e.target.value);
      });

      subjectSelect?.addEventListener("change", (e) => {
        const val = e.target.value;
        if (val === "__custom__") {
          if (customSubjectWrapper) customSubjectWrapper.style.display = "block";
          if (hiddenSubjectId) hiddenSubjectId.value = "";
          if (hiddenCategory) hiddenCategory.value = customSubjectInput?.value || "";
        } else {
          if (customSubjectWrapper) customSubjectWrapper.style.display = "none";
          if (hiddenSubjectId) hiddenSubjectId.value = val;
          const selectedOpt = subjectSelect.options[subjectSelect.selectedIndex];
          if (hiddenCategory) hiddenCategory.value = selectedOpt?.getAttribute("data-name") || selectedOpt?.text || "";
        }
      });

      customSubjectInput?.addEventListener("input", (e) => {
        if (subjectSelect?.value === "__custom__" && hiddenCategory) {
          hiddenCategory.value = e.target.value.trim();
        }
      });
    }

    this._teacherCurriculumUpdateStageUI = updateStageUI;
    this._teacherCurriculumUpdateSubjectsUI = updateSubjectsUI;

    // Initialize with current stage
    updateStageUI(currentStage);
  }

  renderTeacherQuestionItemsInModal(questionsContainer) {
    if (!questionsContainer) return;
    if (!this.teacherLessonQuestions) this.teacherLessonQuestions = [];

    if (this.teacherLessonQuestions.length === 0) {
      questionsContainer.innerHTML = `
        <div style="text-align:center; padding:20px; color:var(--text-muted); border:1px dashed var(--border-color); border-radius:10px; font-size:0.85rem;">
          لا توجد أسئلة مضافة حتى الآن. اضغط على "إضافة سؤال" لبدء إضافة الأسئلة لهذا الدرس.
        </div>
      `;
      return;
    }

    questionsContainer.innerHTML = this.teacherLessonQuestions.map((q, idx) => `
      <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:10px; position:relative;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:800; font-size:0.85rem; color:var(--primary);">سؤال ${idx + 1}</span>
          <button type="button" class="remove-teacher-question-btn" data-index="${idx}" style="background:none; border:none; color:var(--error); cursor:pointer; font-size:0.8rem; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
            <i data-lucide="trash-2" style="width:14px;height:14px;"></i> حذف السؤال
          </button>
        </div>

        <div class="form-group" style="margin:0;">
          <label style="font-size:0.8rem; font-weight:700; display:block; margin-bottom:4px;">نص السؤال</label>
          <input type="text" class="form-input t-q-text-input" data-index="${idx}" placeholder="اكتب نص السؤال هنا..." value="${q.questionText || ''}" style="padding:8px 12px; font-size:0.88rem;">
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <input type="text" class="form-input t-q-opt-input" data-index="${idx}" data-opt="0" placeholder="الخيار (أ)" value="${q.options?.[0] || ''}" style="padding:6px 10px; font-size:0.82rem;">
          <input type="text" class="form-input t-q-opt-input" data-index="${idx}" data-opt="1" placeholder="الخيار (ب)" value="${q.options?.[1] || ''}" style="padding:6px 10px; font-size:0.82rem;">
          <input type="text" class="form-input t-q-opt-input" data-index="${idx}" data-opt="2" placeholder="الخيار (ج)" value="${q.options?.[2] || ''}" style="padding:6px 10px; font-size:0.82rem;">
          <input type="text" class="form-input t-q-opt-input" data-index="${idx}" data-opt="3" placeholder="الخيار (د)" value="${q.options?.[3] || ''}" style="padding:6px 10px; font-size:0.82rem;">
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div>
            <label style="font-size:0.78rem; font-weight:700; display:block; margin-bottom:4px;">الإجابة الصحيحة</label>
            <select class="form-select t-q-correct-select" data-index="${idx}" style="padding:6px 10px; font-size:0.82rem;">
              <option value="0" ${q.correctAnswer === '0' || q.correctAnswer === q.options?.[0] ? 'selected' : ''}>الخيار (أ)</option>
              <option value="1" ${q.correctAnswer === '1' || q.correctAnswer === q.options?.[1] ? 'selected' : ''}>الخيار (ب)</option>
              <option value="2" ${q.correctAnswer === '2' || q.correctAnswer === q.options?.[2] ? 'selected' : ''}>الخيار (ج)</option>
              <option value="3" ${q.correctAnswer === '3' || q.correctAnswer === q.options?.[3] ? 'selected' : ''}>الخيار (د)</option>
            </select>
          </div>
          <div>
            <label style="font-size:0.78rem; font-weight:700; display:block; margin-bottom:4px;">شرح الإجابة (توضيح اختيار الطالب)</label>
            <input type="text" class="form-input t-q-explanation-input" data-index="${idx}" placeholder="سبب وتفسير الإجابة الصحيحة..." value="${q.explanation || ''}" style="padding:6px 10px; font-size:0.82rem;">
          </div>
        </div>
      </div>
    `).join("");

    if (window.lucide) window.lucide.createIcons();

    // Bind inputs changes
    questionsContainer.querySelectorAll(".t-q-text-input").forEach(input => {
      input.addEventListener("input", (e) => {
        const i = parseInt(e.target.getAttribute("data-index"));
        if (this.teacherLessonQuestions[i]) this.teacherLessonQuestions[i].questionText = e.target.value;
      });
    });

    questionsContainer.querySelectorAll(".t-q-opt-input").forEach(input => {
      input.addEventListener("input", (e) => {
        const i = parseInt(e.target.getAttribute("data-index"));
        const optIdx = parseInt(e.target.getAttribute("data-opt"));
        if (this.teacherLessonQuestions[i]) {
          if (!this.teacherLessonQuestions[i].options) this.teacherLessonQuestions[i].options = ["", "", "", ""];
          this.teacherLessonQuestions[i].options[optIdx] = e.target.value;
        }
      });
    });

    questionsContainer.querySelectorAll(".t-q-correct-select").forEach(select => {
      select.addEventListener("change", (e) => {
        const i = parseInt(e.target.getAttribute("data-index"));
        if (this.teacherLessonQuestions[i]) this.teacherLessonQuestions[i].correctAnswer = e.target.value;
      });
    });

    questionsContainer.querySelectorAll(".t-q-explanation-input").forEach(input => {
      input.addEventListener("input", (e) => {
        const i = parseInt(e.target.getAttribute("data-index"));
        if (this.teacherLessonQuestions[i]) this.teacherLessonQuestions[i].explanation = e.target.value;
      });
    });

    questionsContainer.querySelectorAll(".remove-teacher-question-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const i = parseInt(e.currentTarget.getAttribute("data-index"));
        this.teacherLessonQuestions.splice(i, 1);
        this.renderTeacherQuestionItemsInModal(questionsContainer);
      });
    });
  }

  setupImageUploadEvents() {
    const fileInput = document.getElementById("course-image-file");
    const triggerBtn = document.getElementById("btn-trigger-upload");
    const dropzone = document.getElementById("course-dropzone");
    const idleBox = document.getElementById("image-upload-idle");
    const loadingBox = document.getElementById("image-upload-loading");
    const previewWrapper = document.getElementById("image-preview-wrapper");
    const previewImg = document.getElementById("course-preview-img");
    const removeBtn = document.getElementById("remove-course-image-btn");
    const hiddenUrlInput = document.getElementById("course-image-url");
    const toggleUrlBtn = document.getElementById("toggle-url-input-btn");
    const urlInputWrapper = document.getElementById("url-input-wrapper");
    const directUrlInput = document.getElementById("course-image-url-direct");

    triggerBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      fileInput?.click();
    });

    dropzone?.addEventListener("click", (e) => {
      if (e.target === dropzone || idleBox?.contains(e.target)) {
        fileInput?.click();
      }
    });

    toggleUrlBtn?.addEventListener("click", () => {
      if (urlInputWrapper.style.display === "none") {
        urlInputWrapper.style.display = "block";
        toggleUrlBtn.innerText = "إلغاء أدخل الرابط ✕";
      } else {
        urlInputWrapper.style.display = "none";
        toggleUrlBtn.innerText = "أو أدخل رابط صورة مباشرة 🔗";
      }
    });

    directUrlInput?.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      if (val) {
        hiddenUrlInput.value = val;
        previewImg.src = val;
        previewWrapper.style.display = "block";
        if (idleBox) idleBox.style.display = "none";
      }
    });

    removeBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      hiddenUrlInput.value = "";
      if (fileInput) fileInput.value = "";
      if (directUrlInput) directUrlInput.value = "";
      previewWrapper.style.display = "none";
      if (idleBox) idleBox.style.display = "block";
    });

    fileInput?.addEventListener("change", async () => {
      if (!fileInput.files || fileInput.files.length === 0) return;
      const file = fileInput.files[0];

      if (idleBox) idleBox.style.display = "none";
      if (loadingBox) loadingBox.style.display = "block";
      if (previewWrapper) previewWrapper.style.display = "none";

      const formData = new FormData();
      formData.append("file", file);

      try {
        const token = state.token || localStorage.getItem("token");
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Authorization": "Bearer " + token },
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          hiddenUrlInput.value = data.url;
          previewImg.src = data.url;
          if (loadingBox) loadingBox.style.display = "none";
          if (previewWrapper) previewWrapper.style.display = "block";
          showToast("تم رفع صورة الدورة بنجاح 🎉", "success");
        } else {
          throw new Error("Upload failed with status " + res.status);
        }
      } catch (err) {
        console.error("Image upload failed", err);
        if (loadingBox) loadingBox.style.display = "none";
        if (idleBox) idleBox.style.display = "block";
        showToast("تعذر رفع الصورة، الرجاء إعادة المحاولة.", "error");
      }
    });
  }

  // ── Render Teacher Financial & Earnings Single Page with Sidebar Tabs ─────────────
  renderFinancialPage() {
    const data = this.earningsData || { earnings: [], stats: {} };
    const earningsList = data.earnings || [];
    const stats = data.stats || {
      totalEarned: 0,
      pendingAmount: 0,
      paidAmount: 0,
      courseSalesEarnings: 0,
      sessionEarnings: 0
    };

    const sourceTypeMap = {
      'COURSE_SALE': { label: '📖 مبيعات دورة مسجلة', bg: 'rgba(99,102,241,0.1)', color: 'var(--primary)' },
      'SESSION_COMPLETED': { label: '🎥 إكمال حصة مباشرة/خاصة', bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
      'ADJUSTMENT': { label: '⚖️ تسوية تعديل إداري', bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
      'BONUS': { label: '🎁 مكافأة تميز بالأكاديمية', bg: 'rgba(236,72,153,0.1)', color: '#ec4899' },
      'REFUND': { label: '↩️ استرداد/خصم', bg: 'rgba(239,68,68,0.1)', color: '#ef4444' }
    };

    const renderTableRows = (list) => {
      if (list.length === 0) {
        return `
          <tr>
            <td colspan="5" style="text-align:center; padding:50px 16px; color:var(--text-muted); font-size:0.9rem;">
              <i data-lucide="wallet" style="width:40px; height:40px; opacity:0.3; margin-bottom:10px; display:block; margin-inline:auto;"></i>
              لا توجد سجلات مالية في هذا التصنيف حالياً.
            </td>
          </tr>
        `;
      }
      return list.map((item, idx) => {
        const src = sourceTypeMap[item.sourceType] || { label: item.sourceType, bg: 'rgba(0,0,0,0.05)', color: 'var(--text-muted)' };
        const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString('ar', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
        const isPaid = item.status === 'paid';

        return `
          <tr style="border-bottom:1px solid var(--border-color);" class="table-row-hover">
            <td style="padding:14px 18px; font-weight:800; color:var(--primary);">#${idx + 1}</td>
            <td style="padding:14px 18px;">
              <span class="badge" style="background:${src.bg}; color:${src.color}; font-weight:800; font-size:0.8rem; padding:6px 12px; border-radius:12px;">
                ${src.label}
              </span>
            </td>
            <td style="padding:14px 18px; font-weight:900; font-size:1rem; color:#10b981;">
              + ${(item.amount || 0).toLocaleString()} ${item.currency || 'EGP'}
            </td>
            <td style="padding:14px 18px;">
              ${isPaid ? `
                <span class="badge" style="background:rgba(16,185,129,0.15); color:#047857; font-weight:800; font-size:0.8rem; padding:5px 12px; border-radius:12px; display:inline-flex; align-items:center; gap:4px;">
                  <i data-lucide="check-circle" style="width:14px; height:14px;"></i> تم الصرف والمقاصة
                </span>
              ` : `
                <span class="badge" style="background:rgba(245,158,11,0.15); color:#b45309; font-weight:800; font-size:0.8rem; padding:5px 12px; border-radius:12px; display:inline-flex; align-items:center; gap:4px;">
                  <i data-lucide="clock" style="width:14px; height:14px;"></i> معلق في انتظار الصرف
                </span>
              `}
            </td>
            <td style="padding:14px 18px; font-size:0.83rem; color:var(--text-muted);">${dateStr}</td>
          </tr>
        `;
      }).join('');
    };

    this.container.innerHTML = `
      <div style="max-width:1440px; margin:0 auto; padding:32px 24px; display:flex; flex-direction:column; gap:24px;">
        
        <!-- Top Navigation & Header Row -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; background:linear-gradient(135deg, rgba(245,158,11,0.08), rgba(99,102,241,0.08)); padding:22px 28px; border-radius:24px; border:1px solid var(--border-color);">
          <div>
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
              <button id="back-to-teacher-dash-btn" class="btn-secondary" style="font-weight:800; font-size:0.85rem; padding:7px 16px; border-radius:30px; display:inline-flex; align-items:center; gap:6px; border-color:var(--primary); color:var(--primary);">
                <i data-lucide="arrow-right" style="width:16px; height:16px;"></i> العودة للوحة الرئيسية
              </button>
            </div>
            <h2 style="font-size:1.8rem; font-weight:900; margin:0; display:flex; align-items:center; gap:10px; color:var(--text-main);">
              <i data-lucide="wallet" style="color:#f59e0b; width:28px; height:28px;"></i> السجل المالي والمستحقات (Financial Hub) 💰
            </h2>
            <p style="color:var(--text-muted); font-size:0.88rem; margin:6px 0 0 0;">متابعة تفصيلية وشاملة لكافة الأرباح، التسويات المالية، والمستحقات المعلقة والمدفوعة</p>
          </div>

          <!-- Quick Stats Cards Badge Row -->
          <div style="display:flex; gap:12px; flex-wrap:wrap;">
            <div style="background:var(--bg-card); border:1px solid rgba(16,185,129,0.3); border-radius:16px; padding:12px 20px; text-align:center; min-width:140px;">
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:800;">إجمالي الأرباح</div>
              <div style="font-size:1.3rem; font-weight:900; color:#10b981;">${(stats.totalEarned || 0).toLocaleString()} <span style="font-size:0.75rem;">ج.م</span></div>
            </div>
            <div style="background:rgba(245,158,11,0.06); border:1px solid rgba(245,158,11,0.3); border-radius:16px; padding:12px 20px; text-align:center; min-width:140px;">
              <div style="font-size:0.75rem; color:#b45309; font-weight:800;">مستحقات معلقة</div>
              <div style="font-size:1.3rem; font-weight:900; color:#f59e0b;">${(stats.pendingAmount || 0).toLocaleString()} <span style="font-size:0.75rem;">ج.م</span></div>
            </div>
          </div>
        </div>

        <!-- Sidebar Layout Container -->
        <div style="display:grid; grid-template-columns: minmax(260px, 280px) 1fr; gap:24px; align-items:start;" class="fin-layout-grid">
          
          <!-- Sidebar Navigation Tabs -->
          <div class="glass-card" style="padding:18px; border-radius:22px; border:1px solid var(--border-color); display:flex; flex-direction:column; gap:8px; position:sticky; top:90px; background:var(--bg-card);">
            <div style="font-size:0.75rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; padding:6px 12px; margin-bottom:4px;">
              📋 التبويبات المالية
            </div>

            <button class="fin-sidebar-tab-btn active" data-tab="overview" style="width:100%; text-align:start; padding:12px 16px; border-radius:14px; border:none; font-weight:800; font-size:0.88rem; display:flex; align-items:center; gap:10px; cursor:pointer; transition:all 0.2s ease; background:var(--primary); color:#fff;">
              <i data-lucide="layout-dashboard" style="width:18px; height:18px;"></i>
              <span>📊 نظرة عامة شاملة</span>
            </button>

            <button class="fin-sidebar-tab-btn" data-tab="pending" style="width:100%; text-align:start; padding:12px 16px; border-radius:14px; border:1px solid transparent; font-weight:800; font-size:0.88rem; display:flex; align-items:center; justify-content:space-between; gap:10px; cursor:pointer; transition:all 0.2s ease; background:transparent; color:var(--text-main);">
              <div style="display:flex; align-items:center; gap:10px;">
                <i data-lucide="clock" style="width:18px; height:18px; color:#f59e0b;"></i>
                <span>⏳ المستحقات المعلقة</span>
              </div>
              ${stats.pendingAmount > 0 ? `<span style="background:rgba(245,158,11,0.15); color:#b45309; font-size:0.72rem; padding:3px 8px; border-radius:10px; font-weight:900;">${stats.pendingAmount.toLocaleString()} ج.م</span>` : ''}
            </button>

            <button class="fin-sidebar-tab-btn" data-tab="paid" style="width:100%; text-align:start; padding:12px 16px; border-radius:14px; border:1px solid transparent; font-weight:800; font-size:0.88rem; display:flex; align-items:center; gap:10px; cursor:pointer; transition:all 0.2s ease; background:transparent; color:var(--text-main);">
              <i data-lucide="check-circle-2" style="width:18px; height:18px; color:#10b981;"></i>
              <span>✅ المستحقات المدفوعة</span>
            </button>

            <button class="fin-sidebar-tab-btn" data-tab="courses" style="width:100%; text-align:start; padding:12px 16px; border-radius:14px; border:1px solid transparent; font-weight:800; font-size:0.88rem; display:flex; align-items:center; gap:10px; cursor:pointer; transition:all 0.2s ease; background:transparent; color:var(--text-main);">
              <i data-lucide="book-open" style="width:18px; height:18px; color:var(--primary);"></i>
              <span>📖 مبيعات الكورسات</span>
            </button>

            <button class="fin-sidebar-tab-btn" data-tab="sessions" style="width:100%; text-align:start; padding:12px 16px; border-radius:14px; border:1px solid transparent; font-weight:800; font-size:0.88rem; display:flex; align-items:center; gap:10px; cursor:pointer; transition:all 0.2s ease; background:transparent; color:var(--text-main);">
              <i data-lucide="video" style="width:18px; height:18px; color:#ec4899;"></i>
              <span>🎥 أرباح الحصص المباشرة</span>
            </button>

            <div style="margin-top:16px; padding:14px; border-radius:14px; background:rgba(99,102,241,0.05); border:1px solid rgba(99,102,241,0.15); font-size:0.78rem; color:var(--text-muted); line-height:1.5;">
              <i data-lucide="info" style="width:16px; height:16px; color:var(--primary); margin-bottom:6px; display:block;"></i>
              يتم صرف وتحديث المستحقات المالية المعلقة من قِبل إدارة الأكاديمية بانتظام.
            </div>
          </div>

          <!-- Main Dynamic Content Panel -->
          <div id="fin-tab-content-panel" style="display:flex; flex-direction:column; gap:20px;">
            
            <!-- Overview Cards -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:14px;" id="fin-overview-cards-grid">
              
              <div class="glass-card" style="padding:18px; border-radius:18px; border:1px solid var(--border-color);">
                <div style="font-size:0.78rem; font-weight:800; color:var(--text-muted); margin-bottom:6px;">💵 إجمالي الأرباح المكتسبة</div>
                <div style="font-size:1.4rem; font-weight:900; color:#10b981;">${(stats.totalEarned || 0).toLocaleString()} <span style="font-size:0.8rem;">ج.م</span></div>
              </div>

              <div class="glass-card" style="padding:18px; border-radius:18px; border:1px solid rgba(245,158,11,0.3); background:rgba(245,158,11,0.04);">
                <div style="font-size:0.78rem; font-weight:800; color:#b45309; margin-bottom:6px;">⏳ مستحقات معلقة للصرف</div>
                <div style="font-size:1.4rem; font-weight:900; color:#f59e0b;">${(stats.pendingAmount || 0).toLocaleString()} <span style="font-size:0.8rem;">ج.م</span></div>
              </div>

              <div class="glass-card" style="padding:18px; border-radius:18px; border:1px solid rgba(16,185,129,0.3); background:rgba(16,185,129,0.04);">
                <div style="font-size:0.78rem; font-weight:800; color:#047857; margin-bottom:6px;">✅ مدفوع ومحول للبطاقة</div>
                <div style="font-size:1.4rem; font-weight:900; color:#10b981;">${(stats.paidAmount || 0).toLocaleString()} <span style="font-size:0.8rem;">ج.م</span></div>
              </div>

              <div class="glass-card" style="padding:18px; border-radius:18px; border:1px solid rgba(99,102,241,0.3); background:rgba(99,102,241,0.04);">
                <div style="font-size:0.78rem; font-weight:800; color:var(--primary); margin-bottom:6px;">📖 أرباح مبيعات الدورات</div>
                <div style="font-size:1.4rem; font-weight:900; color:var(--primary);">${(stats.courseSalesEarnings || 0).toLocaleString()} <span style="font-size:0.8rem;">ج.م</span></div>
              </div>

              <div class="glass-card" style="padding:18px; border-radius:18px; border:1px solid rgba(236,72,153,0.3); background:rgba(236,72,153,0.04);">
                <div style="font-size:0.78rem; font-weight:800; color:#ec4899; margin-bottom:6px;">🎥 أرباح الحصص والاشتراكات</div>
                <div style="font-size:1.4rem; font-weight:900; color:#ec4899;">${(stats.sessionEarnings || 0).toLocaleString()} <span style="font-size:0.8rem;">ج.م</span></div>
              </div>

            </div>

            <!-- Table Card Container -->
            <div class="glass-card" style="padding:22px; border-radius:22px; border:1px solid var(--border-color); background:var(--bg-card);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; flex-wrap:wrap; gap:12px;">
                <div>
                  <h3 id="fin-tab-title" style="font-weight:900; font-size:1.1rem; margin:0; color:var(--text-main);">📋 جدول المعاملات والمستحقات المالـية</h3>
                  <p id="fin-tab-subtitle" style="color:var(--text-muted); font-size:0.82rem; margin:4px 0 0 0;">عرض كافة سجلات الأرباح والتسويات المسجلة باسمك</p>
                </div>
              </div>

              <div style="overflow-x:auto; border:1px solid var(--border-color); border-radius:16px; background:var(--bg-app);">
                <table style="width:100%; border-collapse:collapse; font-size:0.88rem; text-align:start;">
                  <thead style="background:var(--bg-card); border-bottom:1px solid var(--border-color); color:var(--text-muted); font-weight:800;">
                    <tr>
                      <th style="padding:14px 18px;">#</th>
                      <th style="padding:14px 18px;">مصدر المعاملة / الدورة</th>
                      <th style="padding:14px 18px;">المبلغ المستحق</th>
                      <th style="padding:14px 18px;">حالة الصرف الإداري</th>
                      <th style="padding:14px 18px;">تاريخ التسوية والإنشاء</th>
                    </tr>
                  </thead>
                  <tbody id="fin-page-tbody">
                    ${renderTableRows(earningsList)}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Event handler for Back Button
    this.container.querySelector("#back-to-teacher-dash-btn")?.addEventListener("click", () => {
      this.currentViewMode = 'dashboard';
      window.location.hash = "#teacher-portal";
      this.render();
    });

    // Event handlers for Sidebar Tab buttons
    this.container.querySelectorAll(".fin-sidebar-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.container.querySelectorAll(".fin-sidebar-tab-btn").forEach(b => {
          b.classList.remove("active");
          b.style.background = "transparent";
          b.style.color = "var(--text-main)";
          b.style.borderColor = "transparent";
        });

        btn.classList.add("active");
        btn.style.background = "var(--primary)";
        btn.style.color = "#fff";

        const tab = btn.getAttribute("data-tab");
        const tbody = this.container.querySelector("#fin-page-tbody");
        const titleEl = this.container.querySelector("#fin-tab-title");
        const subTitleEl = this.container.querySelector("#fin-tab-subtitle");

        let filteredList = earningsList;
        if (tab === "pending") {
          filteredList = earningsList.filter(e => e.status === "pending");
          if (titleEl) titleEl.textContent = "⏳ المعاملات والمستحقات المعلقة للصرف";
          if (subTitleEl) subTitleEl.textContent = "قائمة المبالغ المعلقة التي سيتم تحويلها وصرفها من إدارة الأكاديمية";
        } else if (tab === "paid") {
          filteredList = earningsList.filter(e => e.status === "paid");
          if (titleEl) titleEl.textContent = "✅ المعاملات والمستحقات المدفوعة والمحولة";
          if (subTitleEl) subTitleEl.textContent = "سجل المبالغ والمستحقات التي تم تسويتها وصرفها لك بنجاح";
        } else if (tab === "courses") {
          filteredList = earningsList.filter(e => e.sourceType === "COURSE_SALE");
          if (titleEl) titleEl.textContent = "📖 أرباح ومبيعات الدورات المسجلة";
          if (subTitleEl) subTitleEl.textContent = "تفاصيل الأرباح الناتجة عن مبيعات كورساتك المسجلة عبر المنصة";
        } else if (tab === "sessions") {
          filteredList = earningsList.filter(e => e.sourceType === "SESSION_COMPLETED");
          if (titleEl) titleEl.textContent = "🎥 أرباح الحصص المباشرة والاشتراكات";
          if (subTitleEl) subTitleEl.textContent = "تفاصيل المستحقات المستحقة لإكمال الحصص الخاصة والبث المباشر";
        } else {
          if (titleEl) titleEl.textContent = "📊 نظرة عامة وكافة المعاملات المالية";
          if (subTitleEl) subTitleEl.textContent = "عرض كافة سجلات الأرباح والتسويات المسجلة باسمك";
        }

        if (tbody) {
          tbody.innerHTML = renderTableRows(filteredList);
          if (window.lucide) window.lucide.createIcons();
        }
      });
    });
  }

  onDestroy() { }
}
