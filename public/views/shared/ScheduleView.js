import { apiFetch, state, showToast, t, canJoinSession, validateSessionScheduledDate, getMinSessionDateTimeISO } from "../../app.js";

export default class ScheduleView {
  constructor(container) {
    this.container = container;
    this.sessions = [];
    this.courses = [];
    // Default to weekly Timetable for teachers and admins, daily for others
    this.sessionFilter = (state.user?.role === "teacher" || state.user?.role === "admin") ? "weekly" : "weekly";

    // Set current week start (Saturday as first day of week)
    const now = new Date();
    const saturdayOffset = (now.getDay() + 1) % 7;
    this.currentWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - saturdayOffset);
    this.currentWeekStart.setHours(0, 0, 0, 0);
    window.scheduleViewInstance = this;
    window.exportWeeklyTimetable = (autoDownloadImage = false) => this.exportWeeklyTimetableToPDF(autoDownloadImage);
  }

  async render() {
    try {
      if (!state.user) return;

      this.container.innerHTML = `
        <div style="max-width:1440px; margin:0 auto; padding:32px 20px 80px; height:100%; display:flex; flex-direction:column;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:16px;">
            <div>
              <h2 class="dashboard-section-title" style="font-size:1.85rem; margin:0 0 4px 0; font-weight:900; display:flex; align-items:center; gap:10px;">
                <i data-lucide="calendar" style="color:var(--primary); width:28px; height:28px;"></i>
                <span>${t("nav.schedule") || "جدول الحصص والبث المباشر (Timetable)"}</span>
              </h2>
              <p style="color:var(--text-muted); font-size:0.88rem; margin:0;">
                ${state.user?.role === 'teacher' ? 'متابعة مواعيد حصص البث المباشر الأسبوعية وإدارتها بسهولة.' : 'جدول ومواعيد حصصك الدراسية عبر الأكاديمية.'}
              </p>
            </div>
          </div>
          
          <!-- View Switcher & Filter Bar -->
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:22px; flex-wrap:wrap; background:var(--bg-card); padding:8px 14px; border-radius:18px; border:1px solid var(--border-color);">
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <span style="font-size:0.82rem; font-weight:800; color:var(--text-muted); margin-inline-start:4px; margin-inline-end:6px;">عرض الجدول:</span>
              <button class="tab-btn ${this.sessionFilter === 'weekly' ? 'active' : ''}" data-schedule-filter="weekly" style="padding:7px 16px; border-radius:12px; font-weight:800; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px;">
                <i data-lucide="calendar-days" style="width:14px; height:14px;"></i> جدول الحصص (Timetable)
              </button>
              <button class="tab-btn ${this.sessionFilter === 'daily' ? 'active' : ''}" data-schedule-filter="daily" style="padding:7px 16px; border-radius:12px; font-weight:800; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px;">
                <i data-lucide="sun" style="width:14px; height:14px;"></i> اليوم
              </button>
              <button class="tab-btn ${this.sessionFilter === 'monthly' ? 'active' : ''}" data-schedule-filter="monthly" style="padding:7px 16px; border-radius:12px; font-weight:800; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px;">
                <i data-lucide="calendar" style="width:14px; height:14px;"></i> تقويم شهري
              </button>
              <button class="tab-btn ${this.sessionFilter === 'all' ? 'active' : ''}" data-schedule-filter="all" style="padding:7px 16px; border-radius:12px; font-weight:800; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px;">
                <i data-lucide="list" style="width:14px; height:14px;"></i> قائمة الكل
              </button>
            </div>
          </div>

          <div id="dynamic-schedule-area" style="flex-grow:1; display:flex; flex-direction:column;">
            <div style="text-align:center; padding:50px; width:100%;">
              <i data-lucide="loader" class="spinner" style="width:40px;height:40px;border-width:3px;margin:0 auto;"></i>
            </div>
          </div>
        </div>

        <!-- Live Session Modal (Teacher Only) -->
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
      `;

      if (window.lucide) window.lucide.createIcons();
      await this.loadContent();
    } catch (err) {
      console.error("Schedule loading error:", err);
    }
  }

  async loadContent() {
    try {
      const allSessions = await apiFetch("/sessions");

      window.checkedInSessions = window.checkedInSessions || new Set();
      (allSessions || []).forEach(s => {
        if (s && s.isCheckedIn) window.checkedInSessions.add(String(s.id));
      });

      if (state.user.role === "teacher") {
        this.sessions = (allSessions || []).filter(s => s.teacher?.id === state.user.id);
        this.courses = await apiFetch("/courses").then(res => res.filter(c => c.teacher?.id === state.user.id)).catch(() => []);
        const courseSelect = document.getElementById("session-course-id");
        if (courseSelect) {
          courseSelect.innerHTML = `<option value="">${t("teacher.selectCoursePlaceholder")}</option>` +
            this.courses.map(c => `<option value="${c.id}">${c.title}</option>`).join("");
        }
      } else if (state.user.role === "student") {
        const enrollments = await apiFetch("/student/enrollments").catch(() => []);
        const enrolledCourseIds = new Set((enrollments || []).filter(e => e.status === "active").map(e => e.course?.id || e.group?.course?.id).filter(Boolean));
        
        this.sessions = (allSessions || []).filter(s => {
          if (s.student?.id) {
            return s.student.id === state.user.id;
          }
          if (s.course?.id) {
            return enrolledCourseIds.has(s.course.id);
          }
          return true;
        });
      } else {
        // Admin & other staff
        this.sessions = allSessions || [];
      }

      this.renderCurrentView();
      this.bindEvents();
    } catch (error) {
      console.error(error);
      this.container.querySelector("#dynamic-schedule-area").innerHTML = `<div class="glass-card" style="text-align:center;color:var(--error); width:100%;">${t("error.loadFailed") || "Failed to load"}</div>`;
    }
  }

  renderCurrentView() {
    const container = this.container.querySelector("#dynamic-schedule-area");
    if (!container) return;

    if (this.sessionFilter === "weekly") {
      this.renderTimetableView(container);
    } else if (this.sessionFilter === "monthly") {
      this.renderMonthlyCalendarView(container);
    } else {
      this.renderGridView(container);
    }

    if (window.lucide) window.lucide.createIcons();
    this.bindSessionActionButtons();
  }

  // --- Grid View Logic (Daily, Monthly, All) ---

  filterSessionsForGrid() {
    if (!this.sessions || this.sessions.length === 0) return [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return this.sessions.filter(s => {
      const d = new Date(s.scheduledAt);
      if (this.sessionFilter === "daily") {
        return d.toDateString() === now.toDateString();
      }
      if (this.sessionFilter === "monthly") {
        const nextMonth = new Date(startOfToday.getTime() + 30 * 24 * 60 * 60 * 1000);
        return d >= startOfToday && d <= nextMonth;
      }
      return true;
    }).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  }

  renderGridView(container) {
    const filtered = this.filterSessionsForGrid();

    if (filtered.length === 0) {
      container.innerHTML = `<div class="glass-card" style="text-align:center; padding: 40px; color:var(--text-muted); font-size:1.1rem; width:100%;">
        ${t(state.user.role === 'teacher' ? "teacher.noSessions" : "student.noSessions")}
      </div>`;
    } else {
      // Group sessions by day: Days in ROWS, sessions in COLUMNS
      const daysMap = new Map();
      filtered.forEach(session => {
        const d = new Date(session.scheduledAt);
        const key = d.toDateString();
        if (!daysMap.has(key)) {
          daysMap.set(key, { date: d, sessions: [] });
        }
        daysMap.get(key).sessions.push(session);
      });

      const isTeacher = state.user.role === 'teacher' || state.user.role === 'admin';
      const now = new Date();
      const locale = document.documentElement.lang === 'ar' ? 'ar-EG' : 'en-US';

      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:20px; width:100%;">
          ${Array.from(daysMap.values()).map(({ date, sessions }) => {
            const isToday = date.toDateString() === now.toDateString();
            const dayName = date.toLocaleDateString(locale, { weekday: 'long' });
            const dayNum = date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
            return `
              <div class="glass-card day-schedule-row" style="padding:18px 22px; border-radius:18px; border:1px solid ${isToday ? 'var(--primary)' : 'var(--border-color)'}; background:${isToday ? 'rgba(99,102,241,0.03)' : 'var(--bg-card)'};">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid var(--border-color); flex-wrap:wrap; gap:10px;">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-weight:900; font-size:1.1rem; color:${isToday ? 'var(--primary)' : 'var(--text-main)'};">${dayName}</span>
                    <span style="font-size:0.85rem; color:var(--text-muted); font-weight:700; background:var(--bg-app); padding:3px 10px; border-radius:12px; border:1px solid var(--border-color);">${dayNum}</span>
                    ${isToday ? `<span style="font-size:0.75rem; font-weight:800; background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); padding:2px 8px; border-radius:12px;">اليوم 🟢</span>` : ''}
                  </div>
                  <span style="font-size:0.8rem; font-weight:700; color:var(--text-muted); background:var(--bg-app); padding:3px 10px; border-radius:10px; border:1px solid var(--border-color);">${sessions.length} حصص</span>
                </div>
                <!-- Sessions in Columns -->
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap:14px; width:100%;">
                  ${sessions.map(s => this.renderSessionGridCard(s, isTeacher)).join("")}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;
    }
  }

  renderSessionGridCard(session, isTeacher) {
    return this.renderSimpleSessionCard(session, isTeacher);
  }

  // ── Redesigned Simple Session Card ─────────────────────────────────────────
  renderSimpleSessionCard(session, isTeacher) {
    const date = new Date(session.scheduledAt);
    const sessionTime = date.getTime();
    const durationMins = session.duration || 60;
    const durationMs = durationMins * 60 * 1000;
    const nowTime = Date.now();
    const sessionStart = sessionTime;
    const sessionEnd = sessionStart + durationMs;

    const formattedTime = date.toLocaleTimeString('ar-EG', { hour: "2-digit", minute: "2-digit" });
    const formattedEndTime = new Date(sessionEnd).toLocaleTimeString('ar-EG', { hour: "2-digit", minute: "2-digit" });

    const isCompleted = session.status === "completed" || session.status === "COMPLETED" || session.status?.includes("CANCELLED");
    const isPastSession = !isCompleted && (nowTime > sessionEnd);
    const isDuringSession = !isCompleted && (nowTime >= sessionStart && nowTime <= sessionEnd);
    const isLive = isDuringSession || session.status === "live" || session.status === "LIVE";
    const isCheckedIn = window.checkedInSessions?.has(String(session.id)) || !!session.isCheckedIn;

    const isTeacherRole = isTeacher || state.user?.role === 'teacher' || state.user?.role === 'admin';
    const teacherName = session.teacher?.name || session.course?.teacher?.name || "معلم المنصة";
    const isGroup = session.sessionType === 'group' || (!session.student && (session.group || session.course));
    const studentName = session.student?.name || session.subscription?.student?.name || (isGroup ? (session.group?.name || 'مجموعة دراسية') : (isTeacherRole ? 'حصة خاصة' : (state.user?.name || 'طالب')));
    const personName = isTeacherRole ? studentName : teacherName;
    const personIcon = isTeacherRole ? (isGroup ? 'users' : 'user') : 'graduation-cap';

    const rawSubject = session.course?.subject?.name || 
                        (typeof session.course?.subject === 'string' ? session.course.subject : null) || 
                        session.subject?.name || 
                        (typeof session.subject === 'string' ? session.subject : null);
    const courseTitle = session.course?.title || session.course?.category || session.topic || "";
    const subjectName = rawSubject || courseTitle || "حصة دراسية";

    const gradeName = session.course?.grade?.name || 
                      (typeof session.course?.grade === 'string' ? session.course.grade : null) || 
                      null;

    // Status Badge
    let statusBadge = "";
    if (isCompleted) {
      statusBadge = `<span style="background:rgba(16,185,129,0.12); color:#10b981; font-weight:800; font-size:0.72rem; padding:2px 8px; border-radius:10px; display:inline-flex; align-items:center; gap:3px;"><i data-lucide="check-circle" style="width:11px;height:11px;"></i> مكتملة</span>`;
    } else if (isLive) {
      statusBadge = `<span style="background:rgba(239,68,68,0.12); color:#ef4444; font-weight:800; font-size:0.72rem; padding:2px 8px; border-radius:10px; display:inline-flex; align-items:center; gap:3px;"><i data-lucide="radio" style="width:11px;height:11px;"></i> مباشر الآن</span>`;
    } else if (isPastSession) {
      statusBadge = `<span style="background:rgba(245,158,11,0.12); color:#d97706; font-weight:800; font-size:0.72rem; padding:2px 8px; border-radius:10px; display:inline-flex; align-items:center; gap:3px;"><i data-lucide="clock" style="width:11px;height:11px;"></i> انتهت</span>`;
    } else {
      statusBadge = `<span style="background:rgba(99,102,241,0.1); color:var(--primary); font-weight:800; font-size:0.72rem; padding:2px 8px; border-radius:10px; display:inline-flex; align-items:center; gap:3px;">📅 مجدولة</span>`;
    }

    // Action Buttons
    let actionHtml = "";
    if (isCompleted) {
      actionHtml = `
        <div style="font-size:0.73rem; color:#10b981; font-weight:800; background:rgba(16,185,129,0.08); padding:5px 8px; border-radius:8px; text-align:center; display:flex; align-items:center; justify-content:center; gap:4px;">
          <i data-lucide="check-circle-2" style="width:12px;height:12px;"></i> تم إنهاء الحصة واحتساب الرصيد ✅
        </div>
      `;
    } else if (isLive) {
      if (isTeacherRole) {
        if (isCheckedIn) {
          actionHtml = `
            <div style="display:flex; gap:6px;">
              <button class="btn-primary" data-join-meet-id="${session.id}" style="flex:1; padding:6px 10px; font-size:0.76rem; font-weight:800; background:linear-gradient(135deg,#10b981,#059669); border:none; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:4px; box-shadow:0 2px 6px rgba(16,185,129,0.25);">
                <i data-lucide="video" style="width:12px;height:12px;"></i> Google Meet 🎥
              </button>
              <button class="btn-secondary end-session-btn" data-id="${session.id}" style="padding:6px 10px; font-size:0.76rem; font-weight:800; color:var(--error); border-color:var(--error); border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; gap:3px;" title="إنهاء وتوثيق التقرير">
                <i data-lucide="stop-circle" style="width:12px;height:12px;"></i> إنهاء
              </button>
            </div>
          `;
        } else {
          actionHtml = `
            <div class="session-actions-wrapper" data-id="${session.id}">
              <button class="btn-primary session-checkin-btn" data-id="${session.id}" data-role="teacher" style="width:100%; padding:7px 10px; font-size:0.78rem; font-weight:800; background:linear-gradient(135deg,#10b981,#059669); border:none; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:5px; box-shadow:0 2px 8px rgba(16,185,129,0.25);">
                <i data-lucide="user-check" style="width:13px;height:13px;"></i> تأكيد حضور المعلم الآن ✍️
              </button>
            </div>
          `;
        }
      } else {
        if (isCheckedIn) {
          actionHtml = `
            <button class="btn-primary session-action" data-join-meet-id="${session.id}" style="width:100%; padding:7px 10px; font-size:0.78rem; font-weight:800; background:linear-gradient(135deg,#10b981,#059669); border:none; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:5px; box-shadow:0 2px 8px rgba(16,185,129,0.25);">
              <i data-lucide="video" style="width:13px;height:13px;"></i> الانضمام عبر Google Meet 🎥
            </button>
          `;
        } else {
          actionHtml = `
            <div class="session-actions-wrapper" data-id="${session.id}">
              <button class="btn-primary session-checkin-btn" data-id="${session.id}" data-role="student" style="width:100%; padding:7px 10px; font-size:0.78rem; font-weight:800; background:linear-gradient(135deg,#10b981,#059669); border:none; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:5px; box-shadow:0 2px 8px rgba(16,185,129,0.25);">
                <i data-lucide="user-check" style="width:13px;height:13px;"></i> تأكيد الحضور (لست غائباً) ✍️
              </button>
            </div>
          `;
        }
      }
    } else if (isPastSession) {
      if (isTeacherRole) {
        actionHtml = `
          <button class="btn-primary end-session-btn" data-id="${session.id}" style="width:100%; padding:6px 10px; font-size:0.76rem; font-weight:800; background:linear-gradient(135deg,#10b981,#059669); border:none; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:4px; box-shadow:0 2px 6px rgba(16,185,129,0.2);">
            <i data-lucide="file-check" style="width:12px;height:12px;"></i> توثيق وإنهاء الحصة 📝
          </button>
        `;
      } else {
        actionHtml = `
          <div style="font-size:0.72rem; color:var(--text-muted); text-align:center; padding:4px 6px; background:var(--bg-app); border-radius:8px; border:1px solid var(--border-color);">
            انتهى موعد الحصة
          </div>
        `;
      }
    } else {
      // Future scheduled
      const teacherWindow = 60 * 60 * 1000;
      const studentWindow = 30 * 60 * 1000;
      const isTeacherJoinable = nowTime >= (sessionTime - teacherWindow);
      const isStudentJoinable = nowTime >= (sessionTime - studentWindow);

      if (isTeacherRole) {
        if (isTeacherJoinable) {
          actionHtml = `
            <button class="btn-secondary" data-join-meet-id="${session.id}" style="width:100%; padding:6px 10px; font-size:0.76rem; font-weight:800; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:4px;">
              <i data-lucide="video" style="width:12px;height:12px;"></i> رابط Google Meet 🎥
            </button>
          `;
        } else {
          actionHtml = `
            <div style="font-size:0.72rem; color:var(--text-muted); text-align:center; padding:4px 6px; background:var(--bg-card); border-radius:8px; border:1px solid var(--border-color); display:flex; align-items:center; justify-content:center; gap:4px;">
              <i data-lucide="lock" style="width:11px;height:11px;"></i> ينشط الرابط قبل الموعد بساعة
            </div>
          `;
        }
      } else {
        if (isStudentJoinable) {
          actionHtml = `
            <button class="btn-secondary" data-join-meet-id="${session.id}" style="width:100%; padding:6px 10px; font-size:0.76rem; font-weight:800; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:4px;">
              <i data-lucide="video" style="width:12px;height:12px;"></i> رابط Google Meet 🎥
            </button>
          `;
        } else {
          actionHtml = `
            <div style="font-size:0.72rem; color:var(--text-muted); text-align:center; padding:4px 6px; background:var(--bg-card); border-radius:8px; border:1px solid var(--border-color); display:flex; align-items:center; justify-content:center; gap:4px;">
              <i data-lucide="lock" style="width:11px;height:11px;"></i> ينشط الدخول قبل الموعد بنصف ساعة
            </div>
          `;
        }
      }
    }

    return `
      <div class="session-simple-card" style="background:var(--bg-app); border-radius:12px; padding:12px; border:1px solid ${isLive ? '#10b981' : 'var(--border-color)'}; display:flex; flex-direction:column; gap:7px; position:relative; ${isLive ? 'box-shadow:0 0 12px rgba(16,185,129,0.15);' : ''}">
        
        <!-- Header: Time & Status -->
        <div style="display:flex; justify-content:space-between; align-items:center; gap:4px; flex-wrap:wrap;">
          <span style="font-size:0.76rem; color:var(--primary); font-weight:800; display:inline-flex; align-items:center; gap:3px;">
            <i data-lucide="clock" style="width:12px;height:12px;"></i> ${formattedTime} (${durationMins} د)
          </span>
          ${statusBadge}
        </div>

        <!-- Title -->
        <div style="font-size:0.88rem; font-weight:800; color:var(--text-main); line-height:1.3; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${session.title || 'حصة دراسية'}">
          ${session.title || "حصة دراسية"}
        </div>

        <!-- Chips / Meta -->
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <span style="font-size:0.72rem; font-weight:700; color:#e51d74; background:rgba(229,29,116,0.08); padding:2px 7px; border-radius:6px; display:inline-flex; align-items:center; gap:3px; max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${subjectName}">
            <i data-lucide="book-open" style="width:10px;height:10px;"></i> ${subjectName}
          </span>
          <span style="font-size:0.72rem; font-weight:700; color:var(--primary); background:rgba(99,102,241,0.08); padding:2px 7px; border-radius:6px; display:inline-flex; align-items:center; gap:3px; max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${personName}">
            <i data-lucide="${personIcon}" style="width:10px;height:10px;"></i> ${personName}
          </span>
          ${gradeName ? `
            <span style="font-size:0.7rem; font-weight:700; color:#10b981; background:rgba(16,185,129,0.08); padding:2px 6px; border-radius:6px;">
              ${gradeName}
            </span>
          ` : ''}
        </div>

        <!-- Action Button -->
        <div style="margin-top:2px;">
          ${actionHtml}
        </div>

      </div>
    `;
  }

  // --- Timetable View Logic (Weekly) ---

  renderTimetableView(container) {
    const weekEnd = new Date(this.currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const locale = document.documentElement.lang === 'ar' ? 'ar-EG' : 'en-US';
    const rangeText = `${this.currentWeekStart.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}`;

    const dayNames = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    const now = new Date();
    const todayStr = now.toDateString();
    const isTeacher = state.user.role === 'teacher' || state.user.role === 'admin';

    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-card); padding:10px 18px; border-radius:14px; border:1px solid var(--border-color); margin-bottom:18px; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <button class="btn-secondary" id="prev-week-btn" style="padding:6px 12px; font-size:0.82rem; font-weight:700; border-radius:10px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
            <i data-lucide="chevron-right" style="width:14px;height:14px;"></i> الأسبوع السابق
          </button>
          <button class="btn-secondary" id="today-btn" style="padding:6px 14px; font-size:0.82rem; font-weight:800; border-radius:10px; color:var(--primary); border-color:var(--primary); background:rgba(99,102,241,0.06); cursor:pointer;">
            ⭐ هذا الأسبوع
          </button>
          <button class="btn-secondary" id="next-week-btn" style="padding:6px 12px; font-size:0.82rem; font-weight:700; border-radius:10px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
            الأسبوع القادم <i data-lucide="chevron-left" style="width:14px;height:14px;"></i>
          </button>
        </div>
        <div id="week-date-range" style="font-size:0.92rem; font-weight:800; color:var(--text-main); display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="calendar" style="width:15px;height:15px;color:var(--primary);"></i>
          <span>${rangeText}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <button id="export-schedule-pdf-btn" class="btn-primary" style="padding:7px 14px; border-radius:10px; font-size:0.82rem; font-weight:800; display:inline-flex; align-items:center; gap:6px; background:linear-gradient(135deg, #ef4444, #b91c1c); color:#fff; border:none; box-shadow:0 3px 12px rgba(239,68,68,0.28); cursor:pointer;" title="معاينة وتصدير الجدول كملف PDF">
            <i data-lucide="file-down" style="width:14px;height:14px;"></i> تصدير (PDF) 📄
          </button>
          <button id="export-schedule-img-btn" class="btn-primary" style="padding:7px 14px; border-radius:10px; font-size:0.82rem; font-weight:800; display:inline-flex; align-items:center; gap:6px; background:linear-gradient(135deg, #8b5cf6, #6d28d9); color:#fff; border:none; box-shadow:0 3px 12px rgba(139,92,246,0.28); cursor:pointer;" title="تحميل وتصدير الجدول كصورة عالية الجودة PNG">
            <i data-lucide="image" style="width:14px;height:14px;"></i> تحميل كصورة (PNG) 🖼️
          </button>
        </div>
      </div>

      <!-- 7-Day Timetable Grid (Saturday to Friday) -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(230px, 1fr)); gap:14px; width:100%; align-items:start; padding-bottom:24px;">
    `;

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const dayDate = new Date(this.currentWeekStart);
      dayDate.setDate(dayDate.getDate() + dayIdx);
      const isTodayDay = dayDate.toDateString() === todayStr;

      const daySessions = (this.sessions || []).filter(s => {
        if (!s.scheduledAt) return false;
        const d = new Date(s.scheduledAt);
        return d.toDateString() === dayDate.toDateString();
      }).sort((a, b) => new Date(a.scheduledAt || 0) - new Date(b.scheduledAt || 0));

      html += `
        <div class="glass-card" style="padding:14px; border-radius:16px; border:${isTodayDay ? '2px solid var(--primary)' : '1px solid var(--border-color)'}; background:${isTodayDay ? 'rgba(99,102,241,0.03)' : 'var(--bg-card)'}; display:flex; flex-direction:column; min-height:220px; box-shadow:${isTodayDay ? '0 4px 20px rgba(99,102,241,0.1)' : '0 2px 8px rgba(0,0,0,0.03)'};">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid var(--border-color);">
            <div>
              <h4 style="font-weight:800; margin:0; font-size:0.95rem; color:${isTodayDay ? 'var(--primary)' : 'var(--text-main)'}; display:flex; align-items:center; gap:4px;">
                ${dayNames[dayIdx]} ${isTodayDay ? '<span style="font-size:0.7rem; font-weight:800; color:#10b981;">(اليوم ⭐)</span>' : ''}
              </h4>
              <span style="font-size:0.75rem; color:var(--text-muted);">${dayDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}</span>
            </div>
            <span class="badge" style="background:${daySessions.length > 0 ? 'var(--primary-glow)' : 'rgba(0,0,0,0.04)'}; color:${daySessions.length > 0 ? 'var(--primary)' : 'var(--text-muted)'}; font-weight:800; font-size:0.75rem; padding:3px 8px; border-radius:10px;">
              ${daySessions.length} حصص
            </span>
          </div>

          <div style="display:flex; flex-direction:column; gap:10px; flex:1;">
            ${daySessions.length === 0 ? `
              <div style="text-align:center; padding:36px 10px; color:var(--text-muted); font-size:0.8rem; font-style:italic; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px;">
                <i data-lucide="calendar-x" style="width:20px; height:20px; opacity:0.35;"></i>
                <span>لا توجد حصص مجدولة</span>
              </div>
            ` : daySessions.map(sess => this.renderSimpleSessionCard(sess, isTeacher)).join('')}
          </div>
        </div>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;

    // Bind timetable specific navigation & export
    document.getElementById("prev-week-btn")?.addEventListener("click", () => {
      this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
      this.renderCurrentView();
    });

    document.getElementById("next-week-btn")?.addEventListener("click", () => {
      this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
      this.renderCurrentView();
    });

    document.getElementById("today-btn")?.addEventListener("click", () => {
      const now = new Date();
      const saturdayOffset = (now.getDay() + 1) % 7;
      this.currentWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - saturdayOffset);
      this.currentWeekStart.setHours(0, 0, 0, 0);
      this.renderCurrentView();
    });

    document.getElementById("export-schedule-pdf-btn")?.addEventListener("click", () => {
      this.exportWeeklyTimetableToPDF(false);
    });

    document.getElementById("export-schedule-img-btn")?.addEventListener("click", () => {
      this.exportWeeklyTimetableToPDF(true);
    });
  }

  // --- Monthly View Logic ---

  renderMonthlyCalendarView(container) {
    const locale = document.documentElement.lang === 'ar' ? 'ar-EG' : 'en-US';
    const now = new Date();
    // Default to current month for simplicity
    const year = now.getFullYear();
    const month = now.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingOffset = (firstDay.getDay() + 1) % 7; // Saturday = 0, Sun = 1, ...

    const monthName = firstDay.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

    let html = `
      <div style="display:flex; justify-content:center; align-items:center; background:var(--bg-card); padding:12px 24px; border-radius:12px; border:1px solid var(--border-color); margin-bottom:24px;">
        <div style="font-size:1.3rem; font-weight:700; color:var(--text-color);">${monthName}</div>
      </div>
      <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:4px; background:var(--border-color); border:1px solid var(--border-color); border-radius:8px; overflow:hidden;">
    `;

    // Day Headers (Saturday to Friday)
    const days = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    days.forEach(d => {
      html += `<div style="background:var(--bg-card); padding:10px; text-align:center; font-weight:700; font-size:0.9rem;">${d}</div>`;
    });

    // Empty cells before start of month
    for (let i = 0; i < startingOffset; i++) {
      html += `<div style="background:var(--bg-app); min-height:100px;"></div>`;
    }

    // Days
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDate = new Date(year, month, i);
      const isToday = currentDate.toDateString() === now.toDateString();

      const daySessions = this.sessions.filter(s => {
        return new Date(s.scheduledAt).toDateString() === currentDate.toDateString();
      });

      html += `
        <div style="background:var(--bg-card); min-height:100px; padding:8px; display:flex; flex-direction:column; border: ${isToday ? '2px solid var(--primary)' : 'none'};">
          <div style="text-align:right; font-weight:bold; color:${isToday ? 'var(--primary)' : 'var(--text-muted)'}; margin-bottom:4px;">${i}</div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            ${daySessions.map(s => {
              const sTime = new Date(s.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const sTeacher = s.teacher?.name || s.course?.teacher?.name || '';
              const sSub = s.course?.subject?.name || (typeof s.course?.subject === 'string' ? s.course.subject : null) || s.subject?.name || s.course?.title || s.course?.category || '';
              return `<button data-join-meet-id="${s.id}" style="background:var(--primary-glow); color:var(--primary); font-size:0.72rem; padding:5px 8px; border-radius:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-decoration:none; display:block; font-weight:700; width:100%; text-align:start; border:none; cursor:pointer;" title="${s.title} • ${sTeacher} • ${sSub}">
                <b>${sTime}</b> ${s.title}
                <div style="font-size:0.65rem; color:var(--text-muted); font-weight:600; margin-top:2px; display:flex; gap:4px; overflow:hidden; text-overflow:ellipsis;">
                  ${sTeacher ? `<span>👨‍🏫 ${sTeacher}</span>` : ''}
                  ${sSub ? `<span>• 📚 ${sSub}</span>` : ''}
                </div>
              </button>`;
            }).join('')}
          </div>
        </div>
      `;
    }

    // Empty cells after end of month
    const totalCells = startingOffset + daysInMonth;
    const remainder = 7 - (totalCells % 7);
    if (remainder < 7) {
      for (let i = 0; i < remainder; i++) {
        html += `<div style="background:var(--bg-app); min-height:100px;"></div>`;
      }
    }

    html += `</div>`;
    container.innerHTML = html;
  }

  // --- Common Logic ---

  bindEvents() {
    document.getElementById("top-download-timetable-btn")?.addEventListener("click", () => {
      this.exportWeeklyTimetableToPDF(false);
    });
    const filterBtns = this.container.querySelectorAll("[data-schedule-filter]");
    filterBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const filter = btn.getAttribute("data-schedule-filter");
        this.sessionFilter = filter;
        filterBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.renderCurrentView();
      });
    });

    const sessionModal = document.getElementById("session-modal");
    document.getElementById("open-session-modal-btn")?.addEventListener("click", () => {
      const sessionDateInput = document.getElementById("session-date");
      if (sessionDateInput) {
        sessionDateInput.min = getMinSessionDateTimeISO();
      }
      sessionModal.style.display = "flex"; 
    });
    document.getElementById("close-session-modal")?.addEventListener("click", () => { sessionModal.style.display = "none"; });
    document.getElementById("cancel-session-modal")?.addEventListener("click", () => { sessionModal.style.display = "none"; });

    document.getElementById("create-session-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("session-title").value;
      const courseId = document.getElementById("session-course-id").value;
      const description = document.getElementById("session-desc").value;
      const scheduledAt = document.getElementById("session-date").value;
      const duration = parseInt(document.getElementById("session-duration").value);

      const validation = validateSessionScheduledDate(scheduledAt);
      if (!validation.valid) {
        showToast(validation.errorMsg, "error");
        return;
      }

      try {
        await apiFetch("/sessions", { method: "POST", body: JSON.stringify({ title, courseId, description, scheduledAt, duration }) });
        showToast(t("toast.sessionScheduled"), "success");
        sessionModal.style.display = "none";
        await this.loadContent();
      } catch (err) {
        showToast(err.message || "عفواً، لا يمكنك اختيار تاريخ سابق أو قريب جداً! يجب أن يكون موعد البث المباشر بعد الوقت الحالي بساعة واحدة على الأقل. ❌", "error");
      }
    });
  }

  bindSessionActionButtons() {
    this.container.querySelectorAll(".start-session-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        try {
          await apiFetch(`/sessions/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "live" }) });
          showToast(t("toast.sessionLive") || "Session Live", "success");
          await this.loadContent();
        } catch (err) { }
      });
    });

    this.container.querySelectorAll(".end-session-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        if (typeof window.showEndSessionReportModal === 'function') {
          window.showEndSessionReportModal(id, () => this.loadContent());
        }
      });
    });

    this.container.querySelectorAll(".session-checkin-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const role = btn.getAttribute("data-role") || (state.user?.role === 'teacher' ? 'teacher' : 'student');
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader" class="spinner" style="width:13px;height:13px;"></i> جاري تأكيد الحضور...`;
        if (window.lucide) window.lucide.createIcons();

        try {
          const res = await apiFetch(`/sessions/${id}/checkin`, { method: "POST" });
          showToast(res.message || "تم تأكيد حضورك رسمياً بنجاح، ولن يتم احتسابك غائباً ✅", "success");
          window.checkedInSessions = window.checkedInSessions || new Set();
          window.checkedInSessions.add(id);

          const wrapper = btn.closest(".session-actions-wrapper") || btn.parentElement;
          if (wrapper) {
            if (role === "teacher") {
              wrapper.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:8px;">
                  <span style="font-size:0.78rem; font-weight:800; color:#10b981; padding:6px 10px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:10px; display:inline-flex; align-items:center; justify-content:center; gap:6px; width:100%; box-sizing:border-box;">
                    <i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> تم تأكيد حضور المعلم (حاضر) ✅
                  </span>
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                    <button class="btn-primary start-session-btn" data-id="${id}" style="font-size:0.88rem; padding:10px; justify-content:center; font-weight:800;"><i data-lucide="play"></i> بدء البث 🔴</button>
                    <button class="btn-primary" data-join-meet-id="${id}" style="background:linear-gradient(135deg,#6366f1,#4f46e5); font-size:0.88rem; padding:10px; justify-content:center; border:none; color:#fff; cursor:pointer; display:flex; align-items:center; gap:6px; font-weight:800; border-radius:10px;"><i data-lucide="video"></i> Google Meet 🎥</button>
                  </div>
                </div>
              `;
            } else {
              wrapper.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:8px;">
                  <span style="font-size:0.78rem; font-weight:800; color:#10b981; padding:6px 10px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:10px; display:inline-flex; align-items:center; justify-content:center; gap:6px; width:100%; box-sizing:border-box;">
                    <i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> تم تأكيد حضور الطالب (حاضر) ✅
                  </span>
                  <button class="btn-primary session-action" data-join-meet-id="${id}" style="background:linear-gradient(135deg,#10b981,#059669); box-shadow:0 4px 15px rgba(16,185,129,0.3); font-size:0.92rem; padding:11px; justify-content:center; border:none; color:#fff; cursor:pointer; font-weight:900; display:flex; align-items:center; gap:6px; border-radius:12px;">
                    <i data-lucide="video" style="width:16px; height:16px;"></i> الانضمام عبر Google Meet 🎥
                  </button>
                </div>
              `;
            }
            if (window.lucide) window.lucide.createIcons();
            wrapper.querySelectorAll(".start-session-btn").forEach(sBtn => {
              sBtn.addEventListener("click", async () => {
                const sId = sBtn.getAttribute("data-id");
                try {
                  await apiFetch(`/sessions/${sId}/status`, { method: "PATCH", body: JSON.stringify({ status: "live" }) });
                  showToast(t("toast.sessionLive") || "Session Live", "success");
                  await this.loadContent();
                } catch (err) { }
              });
            });
          }
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = `<i data-lucide="user-check" style="width:15px; height:15px;"></i> تأكيد الحضور (لست غائباً) ✍️`;
          if (window.lucide) window.lucide.createIcons();
          showToast(err.message || "تعذر تأكيد الحضور.", "error");
        }
      });
    });
  }

  // ── Weekly Timetable Export & Print Logic ──────────────────────────────
  async exportWeeklyTimetableToPDF(autoDownloadImage = false) {
    const user = state.user || {};
    const isTeacher = user.role === 'teacher';
    const isStudent = user.role === 'student';
    const allSessions = this.sessions || [];
    const academyManagerName = state.platformSettings?.academyManagerName || "أ. محمد عبد الله";

    const d = new Date(this.currentWeekStart);
    const saturdayOffset = (d.getDay() + 1) % 7;
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - saturdayOffset);
    startOfWeek.setHours(0, 0, 0, 0);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const cur = new Date(startOfWeek);
      cur.setDate(startOfWeek.getDate() + i);
      weekDays.push(cur);
    }

    const endOfWeek = new Date(weekDays[6]);
    const dayNames = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    const weekRangeStr = `${startOfWeek.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    let logoSrc = 'assets/logo.png';
    try {
      const res = await fetch('assets/logo.png');
      const blob = await res.blob();
      logoSrc = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (_) {
      logoSrc = window.location.origin + '/assets/logo.png';
    }

    const reportTitle = isTeacher ? '📅 الجدول الدراسي الأسبوعي للمعلم' : (isStudent ? '📅 الجدول الدراسي الأسبوعي للطالب' : '📅 الجدول الدراسي الأسبوعي');
    const personName = user.name || (isTeacher ? 'المعلم' : 'المستخدم');

    const printableInnerContent = `
      <style>
        #tch-export-timetable-container {
          width: 1040px;
          min-width: 1040px;
          max-width: 1040px;
          margin: 0 auto;
          background: #ffffff !important;
          color: #1e293b !important;
          padding: 22px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          box-sizing: border-box;
          direction: rtl;
          font-family: 'Cairo', 'Outfit', sans-serif;
        }
        #tch-export-timetable-container * {
          box-sizing: border-box;
        }
        #tch-export-timetable-container .pdf-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid #4f46e5;
          padding-bottom: 14px;
          margin-bottom: 14px;
        }
        #tch-export-timetable-container .academy-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        #tch-export-timetable-container .academy-logo {
          width: 60px;
          height: 60px;
          object-fit: contain;
          border-radius: 10px;
        }
        #tch-export-timetable-container .academy-title {
          font-size: 19px;
          font-weight: 900;
          color: #1e1b4b;
          margin: 0;
        }
        #tch-export-timetable-container .academy-subtitle {
          font-size: 11px;
          color: #64748b;
          font-weight: 700;
          margin: 2px 0 0;
        }
        #tch-export-timetable-container .report-badge {
          text-align: center;
        }
        #tch-export-timetable-container .report-tag {
          background: #e0e7ff;
          color: #4338ca;
          padding: 4px 14px;
          border-radius: 20px;
          font-weight: 800;
          font-size: 12px;
          display: inline-block;
          margin-bottom: 4px;
        }
        #tch-export-timetable-container .teacher-banner {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 16px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        #tch-export-timetable-container .teacher-banner-item {
          font-size: 11.5px;
        }
        #tch-export-timetable-container .teacher-banner-label {
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
          margin-bottom: 2px;
        }
        #tch-export-timetable-container .teacher-banner-val {
          font-weight: 800;
          color: #0f172a;
        }
        #tch-export-timetable-container .timetable-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          margin-bottom: 14px;
        }
        #tch-export-timetable-container .timetable-table th {
          background: #f1f5f9;
          color: #1e293b;
          font-weight: 800;
          padding: 8px 6px;
          border: 1px solid #cbd5e1;
          font-size: 11.5px;
          text-align: center;
        }
        #tch-export-timetable-container .timetable-table td {
          vertical-align: top;
          padding: 6px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          min-height: 185px;
          height: 185px;
        }
        #tch-export-timetable-container .session-card {
          background: #eef2ff;
          border: 1px solid #c7d2fe;
          border-right: 4px solid #6366f1;
          border-radius: 6px;
          padding: 6px 8px;
          margin-bottom: 6px;
          text-align: right;
        }
        #tch-export-timetable-container .session-card.private {
          background: #fefce8;
          border-color: #fef08a;
          border-right-color: #ca8a04;
        }
        #tch-export-timetable-container .session-time {
          font-weight: 800;
          color: #4338ca;
          font-size: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2px;
        }
        #tch-export-timetable-container .session-card.private .session-time {
          color: #a16207;
        }
        #tch-export-timetable-container .session-name {
          font-weight: 800;
          color: #0f172a;
          font-size: 11px;
          line-height: 1.3;
          margin-bottom: 2px;
        }
        #tch-export-timetable-container .session-group {
          color: #64748b;
          font-size: 9.5px;
          font-weight: 700;
        }
        #tch-export-timetable-container .session-student {
          color: #0284c7;
          font-size: 9.5px;
          font-weight: 700;
        }
        #tch-export-timetable-container .no-sessions {
          text-align: center;
          color: #94a3b8;
          font-size: 10.5px;
          padding: 28px 4px 0;
          font-weight: 600;
        }
        #tch-export-timetable-container .pdf-footer {
          border-top: 1px solid #e2e8f0;
          padding-top: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10px;
          color: #64748b;
        }
      </style>

      <div id="tch-export-timetable-container">
        <!-- Header with Academy Logo -->
        <div class="pdf-header">
          <div class="academy-brand">
            <img src="${logoSrc}" class="academy-logo" alt="Academy Logo">
            <div>
              <h1 class="academy-title">منصة انطلق التعليمية</h1>
              <p class="academy-subtitle">Entlq Educational Academy • التفوق الدراسي الذكي</p>
            </div>
          </div>

          <div class="report-badge">
            <span class="report-tag">${reportTitle}</span>
            <div style="font-weight:800;font-size:12px;color:#1e293b;">${weekRangeStr}</div>
          </div>

          <div style="text-align:left;font-size:10.5px;line-height:1.5;">
            <div>تاريخ الإصدار: <strong>${new Date().toLocaleDateString('ar-EG')}</strong></div>
            <div>مدير الأكاديمية: <strong style="color:#4f46e5;">${academyManagerName}</strong></div>
            <div>الحالة: <span style="color:#16a34a;font-weight:800;">معتمد من الإدارة ✅</span></div>
          </div>
        </div>

        <!-- User Information Bar -->
        <div class="teacher-banner">
          <div class="teacher-banner-item">
            <div class="teacher-banner-label">${isTeacher ? '👨‍🏫 اسم المعلم:' : (isStudent ? '👨‍🎓 اسم الطالب:' : '👤 الاسم:')}</div>
            <div class="teacher-banner-val">${isTeacher ? `أ. ${personName}` : personName}</div>
          </div>
          <div class="teacher-banner-item">
            <div class="teacher-banner-label">${isTeacher ? '💵 سعر الساعة المعتمد:' : '🏷️ الفئة:'}</div>
            <div class="teacher-banner-val" style="color:#10b981;">${isTeacher ? `${user.hourlyRate || user.teacherProfile?.hourlyRate || 150} ج.م / ساعة` : (isStudent ? 'طالب رسمي' : 'إدارة')}</div>
          </div>
          <div class="teacher-banner-item">
            <div class="teacher-banner-label">📧 البريد الإلكتروني:</div>
            <div class="teacher-banner-val">${user.email || 'غير مسجل'}</div>
          </div>
          <div class="teacher-banner-item">
            <div class="teacher-banner-label">📞 هاتف التواصل:</div>
            <div class="teacher-banner-val">${user.phone || 'غير مسجل'}</div>
          </div>
        </div>

        <!-- 7-Day Timetable Grid (Saturday to Friday) -->
        <table class="timetable-table">
          <thead>
            <tr>
              ${weekDays.map((day, idx) => `
                <th>
                  ${dayNames[idx]}<br>
                  <span style="font-size:10px;font-weight:600;color:#64748b;">${day.getDate()} / ${day.getMonth() + 1}</span>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              ${weekDays.map(day => {
                const daySessions = allSessions.filter(s => {
                  if (!s.scheduledAt) return false;
                  return new Date(s.scheduledAt).toDateString() === day.toDateString();
                }).sort((a, b) => new Date(a.scheduledAt || 0) - new Date(b.scheduledAt || 0));

                return `
                  <td>
                    ${daySessions.length === 0 ? `
                      <div class="no-sessions">— لا توجد حصص —</div>
                    ` : daySessions.map(s => {
                      const sTime = new Date(s.scheduledAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
                      const isPriv = s.sessionType !== 'group' && s.type !== 'GROUP' && !s.group;
                      const rawSub = s.course?.subject?.name || (typeof s.course?.subject === 'string' ? s.course.subject : null) || s.subject?.name || s.course?.title || s.topic || s.title || "حصة دراسية";
                      const studentName = s.student?.name || s.subscription?.student?.name || '';
                      const groupName = s.group?.name || '';
                      const teacherName = s.teacher?.name || s.course?.teacher?.name || '';

                      return `
                        <div class="session-card ${isPriv ? 'private' : ''}">
                          <div class="session-time">
                            <span>⏰ ${sTime}</span>
                            <span style="font-size:8.5px;">${isPriv ? 'حصة خاصة' : 'مجموعة'}</span>
                          </div>
                          <div class="session-name">📚 ${rawSub}</div>
                          ${groupName ? `<div class="session-group">👥 ${groupName}</div>` : ''}
                          ${studentName ? `<div class="session-student">👤 ${studentName}</div>` : ''}
                          ${(!studentName && !groupName && teacherName) ? `<div class="session-group">👨‍🏫 ${teacherName}</div>` : ''}
                        </div>
                      `;
                    }).join('')}
                  </td>
                `;
              }).join('')}
            </tr>
          </tbody>
        </table>

        <!-- Footer & Approval Stamp -->
        <div class="pdf-footer">
          <div>
            📌 <strong>إرشادات هامة:</strong> يرجى التواجد في القاعة الافتراضية قبل موعد الحصة بـ 5 دقائق والالتزام بالخطة التدريسية المعتمدة.
          </div>
          <div style="text-align:left;">
            <div>ختم واعتماد الأكاديمية:</div>
            <div style="font-weight:900;color:#1e1b4b;font-size:11.5px;margin-top:2px;">مدير الأكاديمية: <strong style="color:#4f46e5;">${academyManagerName}</strong> 🎓</div>
          </div>
        </div>
      </div>
    `;

    this.showPdfExportModal(printableInnerContent, personName, autoDownloadImage);
  }

  async ensureExportLibraries() {
    const loadScript = (src) => new Promise((resolve) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = resolve;
      document.head.appendChild(s);
    });

    if (typeof window.html2canvas === "undefined") {
      try {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
      } catch (_) {}
      if (typeof window.html2canvas === "undefined") {
        try {
          await loadScript("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js");
        } catch (_) {}
      }
    }

    const hasJsPdf = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!hasJsPdf) {
      try {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
      } catch (_) {}
      if (!((window.jspdf && window.jspdf.jsPDF) || window.jsPDF)) {
        try {
          await loadScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js");
        } catch (_) {}
      }
    }
  }

  showPdfExportModal(innerContent, personName, autoDownloadImage = false) {
    const existing = document.getElementById("schedule-pdf-export-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "schedule-pdf-export-modal";
    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.background = "rgba(0,0,0,0.75)";
    modal.style.backdropFilter = "blur(8px)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = "99999";
    modal.style.padding = "20px";

    modal.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:20px;max-width:1120px;width:100%;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.45);">
        <div style="padding:16px 22px;border-bottom:1px solid var(--border-color);display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.02);">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:1.4rem;">📅</span>
            <div>
              <h3 style="margin:0;font-size:1.1rem;font-weight:900;color:var(--text-main);">تصدير الجدول الدراسي الأسبوعي</h3>
              <p style="margin:2px 0 0;font-size:0.8rem;color:var(--text-muted);">معاينة وتنزيل الجدول كـ PDF مطابق للمعاينة أو صورة عالية الدقة PNG أو الطباعة المباشرة</p>
            </div>
          </div>
          <button id="close-schedule-pdf-modal-btn" style="background:transparent;border:none;cursor:pointer;color:var(--text-muted);font-size:1.4rem;padding:4px 8px;">✕</button>
        </div>

        <div style="flex:1;overflow:auto;padding:24px 16px;background:#334155;display:flex;justify-content:center;align-items:flex-start;">
          <div id="schedule-render-wrapper">
            ${innerContent}
          </div>
        </div>

        <div style="padding:16px 22px;border-top:1px solid var(--border-color);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:var(--bg-card);">
          <div style="font-size:0.82rem;color:var(--text-muted);">
            ✨ يتم تصدير ملف الـ PDF والصورة بشكل مطابق تماماً لما تراه في المعاينة وبأعلى دقة.
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <button id="schedule-direct-print-pdf-btn" class="btn-primary" style="padding:9px 18px;border-radius:12px;font-weight:800;display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,var(--primary),#6366f1);color:#fff;box-shadow:0 4px 14px rgba(99,102,241,0.35);cursor:pointer;">
              🖨️ طباعة الجدول
            </button>
            <button id="schedule-direct-download-pdf-btn" class="btn-primary" style="padding:9px 18px;border-radius:12px;font-weight:800;display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;box-shadow:0 4px 14px rgba(16,185,129,0.3);cursor:pointer;">
              📥 تحميل PDF مطابق للمعاينة
            </button>
            <button id="schedule-direct-download-img-btn" class="btn-primary" style="padding:9px 18px;border-radius:12px;font-weight:800;display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;box-shadow:0 4px 14px rgba(139,92,246,0.3);cursor:pointer;">
              🖼️ تحميل كصورة (PNG)
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#close-schedule-pdf-modal-btn")?.addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

    const getTargetElement = () => modal.querySelector("#tch-export-timetable-container");

    // Print
    modal.querySelector("#schedule-direct-print-pdf-btn")?.addEventListener("click", () => {
      const el = getTargetElement();
      if (!el) return;
      const printWin = window.open('', '_blank');
      if (!printWin) {
        showToast("يرجى السماح بالنوافذ المنبثقة للطباعة", "warning");
        return;
      }
      printWin.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>الجدول الأسبوعي - ${personName}</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { margin: 0; background: #fff; font-family: 'Cairo', sans-serif; direction: rtl; }
          </style>
        </head>
        <body>
          ${el.outerHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 300);
            };
          <\/script>
        </body>
        </html>
      `);
      printWin.document.close();
    });

    const generateCanvas = async () => {
      await this.ensureExportLibraries();
      if (!window.html2canvas) {
        throw new Error("تعذر تحميل أداة التقاط الصورة. يرجى التحقق من الاتصال بالإنترنت.");
      }
      const element = getTargetElement();
      if (!element) throw new Error("لم يتم العثور على محتوى الجدول");

      return await window.html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });
    };

    // Download PDF
    modal.querySelector("#schedule-direct-download-pdf-btn")?.addEventListener("click", async () => {
      const btn = modal.querySelector("#schedule-direct-download-pdf-btn");
      const origText = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ جارٍ تجهيز PDF مطابق...';
      }

      try {
        const canvas = await generateCanvas();
        const jsPdfClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
        if (!jsPdfClass) throw new Error("تعذر تحميل مكتبة توليد PDF");

        const pdf = new jsPdfClass({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth(); // 297mm
        const pageHeight = pdf.internal.pageSize.getHeight(); // 210mm
        const margin = 8;
        const availWidth = pageWidth - (margin * 2);
        const availHeight = pageHeight - (margin * 2);

        const ratio = canvas.width / canvas.height;
        let printWidth = availWidth;
        let printHeight = availWidth / ratio;

        if (printHeight > availHeight) {
          printHeight = availHeight;
          printWidth = availHeight * ratio;
        }

        const posX = margin + (availWidth - printWidth) / 2;
        const posY = margin + (availHeight - printHeight) / 2;

        const imgData = canvas.toDataURL("image/jpeg", 0.98);
        pdf.addImage(imgData, "JPEG", posX, posY, printWidth, printHeight);
        pdf.save(`الجدول_الأسبوعي_${personName}.pdf`);
        showToast("تم تنزيل ملف PDF بنجاح وبنفس تصميم المعاينة بدقة عالية 🎉", "success");
      } catch (err) {
        console.error("PDF generation error:", err);
        showToast(err.message || "حدث خطأ أثناء تصدير PDF", "error");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = origText || '📥 تحميل PDF مطابق للمعاينة';
        }
      }
    });

    // Download PNG
    const handleDownloadImage = async () => {
      const btn = modal.querySelector("#schedule-direct-download-img-btn");
      const origText = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ جارٍ توليد الصورة...';
      }

      try {
        const canvas = await generateCanvas();
        const link = document.createElement("a");
        link.download = `الجدول_الأسبوعي_${personName}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        showToast("تم تنزيل الجدول كصورة عالية الجودة بنجاح 🎉", "success");
      } catch (err) {
        console.error("Image download error:", err);
        showToast(err.message || "تعذر توليد الصورة، يرجى المحاولة مرة أخرى", "error");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = origText || '🖼️ تحميل كصورة (PNG)';
        }
      }
    };

    modal.querySelector("#schedule-direct-download-img-btn")?.addEventListener("click", handleDownloadImage);

    if (autoDownloadImage) {
      setTimeout(() => {
        handleDownloadImage();
      }, 500);
    }
  }

  onDestroy() { }
}
