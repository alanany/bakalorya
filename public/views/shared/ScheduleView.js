import { apiFetch, state, showToast, t, canJoinSession, validateSessionScheduledDate, getMinSessionDateTimeISO } from "../../app.js";

export default class ScheduleView {
  constructor(container) {
    this.container = container;
    this.sessions = [];
    this.courses = [];
    this.sessionFilter = "daily"; // Default to weekly timetable

    // Set current week start (Sunday)
    const now = new Date();
    this.currentWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  }

  async render() {
    try {
      if (!state.user) return;

      this.container.innerHTML = `
        <div style="max-width:1440px; margin:0 auto; padding:40px 24px; height:100%; display:flex; flex-direction:column;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
            <h2 class="dashboard-section-title" style="font-size:2rem; margin:0;">
              <i data-lucide="calendar"></i> ${t("nav.schedule")}
            </h2>
            ${state.user.role === 'teacher' || state.user.role === 'admin' ?
          `<button class="btn-primary" id="open-session-modal-btn"><i data-lucide="calendar-plus"></i> ${t("teacher.planSession")}</button>` : ''
        }
          </div>
          
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:24px; flex-wrap:wrap; background:var(--bg-card); padding:8px 12px; border-radius:30px; border:1px solid var(--border-color); width:fit-content;">
            <span style="font-size:0.85rem; font-weight:700; color:var(--text-muted); margin-inline-start:6px; margin-inline-end:8px;">${t("schedule.filterBy") || "Filter:"}</span>
            <button class="tab-btn ${this.sessionFilter === 'daily' ? 'active' : ''}" data-schedule-filter="daily" style="padding:6px 16px; border-radius:20px;">${t("schedule.daily") || "Daily"}</button>
            <button class="tab-btn ${this.sessionFilter === 'weekly' ? 'active' : ''}" data-schedule-filter="weekly" style="padding:6px 16px; border-radius:20px;">${t("schedule.weekly") || "Weekly"}</button>
            <button class="tab-btn ${this.sessionFilter === 'monthly' ? 'active' : ''}" data-schedule-filter="monthly" style="padding:6px 16px; border-radius:20px;">${t("schedule.monthly") || "Monthly"}</button>
            <button class="tab-btn ${this.sessionFilter === 'all' ? 'active' : ''}" data-schedule-filter="all" style="padding:6px 16px; border-radius:20px;">${t("schedule.all") || "All"}</button>
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
        const enrolledCourseIds = new Set((enrollments || []).filter(e => e.status === "active").map(e => e.course?.id).filter(Boolean));
        
        this.sessions = (allSessions || []).filter(s => {
          if (s.student?.id) {
            return s.student.id === state.user.id;
          }
          if (s.course?.id) {
            return enrolledCourseIds.has(s.course.id);
          }
          return false;
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
      container.innerHTML = `
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap:24px;">
          ${filtered.map(session => this.renderSessionGridCard(session, state.user.role === 'teacher' || state.user.role === 'admin')).join("")}
        </div>
      `;
    }
  }

  renderSessionGridCard(session, isTeacher) {
    const date = new Date(session.scheduledAt);
    const sessionTime = date.getTime();
    const durationMins = session.duration || 60;
    const durationMs = durationMins * 60 * 1000;
    const nowTime = Date.now();

    const isCompleted = session.status === "completed" || session.status === "COMPLETED" || session.status?.includes("CANCELLED");
    // If the scheduled time + duration has passed, it is strictly a past session (cannot remain live)
    const isPastSession = !isCompleted && (nowTime >= sessionTime + durationMs);
    // Live only if status is live AND the session duration has not ended
    const isLive = !isCompleted && !isPastSession && (session.status === "live" || session.status === "LIVE" || session.status === "active");

    const formattedTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const formattedDate = date.toLocaleDateString([], { month: "short", day: "numeric" });

    let statusTag = `<span class="session-tag">${t("session.scheduled") || "Scheduled"}</span>`;
    let sessionAction = "";

    if (isCompleted) {
      statusTag = `<span class="session-tag" style="background:rgba(16,185,129,0.12); color:#10b981; border-color:rgba(16,185,129,0.3); font-weight:800;">✅ مكتملة وموثقة</span>`;
      sessionAction = `<button class="btn-secondary session-action" style="cursor:default; margin-top:16px; font-size:0.85rem; padding:10px; opacity:0.85; width:100%; justify-content:center;" disabled>تم إنهاء الحصة واحتساب الأرصدة ✅</button>`;
    } else if (isPastSession) {
      statusTag = `<span class="session-tag" style="background:rgba(239,68,68,0.1); color:#ef4444; border-color:rgba(239,68,68,0.25); font-weight:800;">⌛ انتهى وقت الحصة</span>`;
      const isCheckedIn = window.checkedInSessions?.has(session.id);
      if (isTeacher) {
        sessionAction = `
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:16px;">
            <button class="btn-primary end-session-btn" data-id="${session.id}" style="background:linear-gradient(135deg, #10b981, #059669); border-color:#10b981; font-size:0.82rem; padding:10px; justify-content:center; font-weight:800; box-shadow:0 4px 12px rgba(16,185,129,0.25); cursor:pointer;">
              <i data-lucide="file-check" style="width:16px;height:16px;"></i> 📝 توثيق التقرير وإنهاء الحصة (واحتساب الرصيد)
            </button>
            ${isCheckedIn ? `
              <span style="font-size:0.78rem; font-weight:800; color:#10b981; padding:6px 10px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:10px; display:inline-flex; align-items:center; justify-content:center; gap:6px; width:100%; box-sizing:border-box;">
                <i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> تم تأكيد حضور المعلم (حاضر) ✅
              </span>
            ` : `
              <button class="btn-secondary session-checkin-btn" data-id="${session.id}" data-role="teacher" style="width:100%; justify-content:center; font-size:0.82rem; padding:7px; border-color:#10b981; color:#10b981; background:rgba(16,185,129,0.08); font-weight:800; cursor:pointer;">
                <i data-lucide="user-check" style="width:14px; height:14px;"></i> تأكيد حضور المعلم (لست غائباً) ✍️
              </button>
            `}
          </div>
        `;
      } else {
        sessionAction = `<button class="btn-secondary session-action" style="cursor:not-allowed; margin-top:16px; font-size:0.85rem; padding:10px; opacity:0.65; width:100%; justify-content:center; background:rgba(0,0,0,0.04); color:var(--text-muted);" disabled>⌛ انتهى موعد الحصة (مغلقة)</button>`;
      }
    } else if (isLive) {
      statusTag = `<span class="session-tag live">${t("session.liveNow") || "LIVE NOW"}</span>`;
      const isCheckedIn = window.checkedInSessions?.has(session.id);

      if (isTeacher) {
        if (isCheckedIn) {
          sessionAction = `
            <div style="display:flex; flex-direction:column; gap:8px; margin-top:16px;">
              <span style="font-size:0.78rem; font-weight:800; color:#10b981; padding:6px 10px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:10px; display:inline-flex; align-items:center; justify-content:center; gap:6px; width:100%; box-sizing:border-box;">
                <i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> تم تأكيد حضور المعلم (حاضر) ✅
              </span>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <a href="#classroom/${session.id}" class="btn-primary" style="background:var(--success); font-size:0.9rem; padding:10px; justify-content:center; text-decoration:none; font-weight:800;"><i data-lucide="video"></i> دخول القاعة 🎥</a>
                <button class="btn-secondary end-session-btn" data-id="${session.id}" style="font-size:0.85rem; padding:10px; justify-content:center; color:var(--error); border-color:var(--error); font-weight:800;"><i data-lucide="stop-circle"></i> إنهاء وتوثيق</button>
              </div>
            </div>
          `;
        } else {
          sessionAction = `
            <div class="session-actions-wrapper" data-id="${session.id}" style="display:flex; flex-direction:column; gap:8px; margin-top:16px;">
              <button class="btn-primary session-checkin-btn" data-id="${session.id}" data-role="teacher" style="background:linear-gradient(135deg, #10b981, #059669); border:none; color:#fff; font-size:0.9rem; padding:11px; justify-content:center; font-weight:800; width:100%; border-radius:12px; box-shadow:0 4px 15px rgba(16,185,129,0.3); cursor:pointer;">
                <i data-lucide="user-check" style="width:16px; height:16px;"></i> تأكيد حضور المعلم (لست غائباً) ✍️
              </button>
              <div style="font-size:0.75rem; color:var(--text-muted); text-align:center;">* اضغط لتأكيد حضورك وتفعيل زر دخول البث المباشر</div>
            </div>
          `;
        }
      } else {
        if (isCheckedIn) {
          sessionAction = `
            <div style="display:flex; flex-direction:column; gap:8px; margin-top:16px;">
              <span style="font-size:0.78rem; font-weight:800; color:#10b981; padding:6px 10px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:10px; display:inline-flex; align-items:center; justify-content:center; gap:6px; width:100%; box-sizing:border-box;">
                <i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> تم تأكيد حضور الطالب (حاضر) ✅
              </span>
              <a href="#classroom/${session.id}" class="btn-primary session-action" style="background:linear-gradient(135deg,#10b981,#059669); box-shadow:0 4px 15px rgba(16,185,129,0.3); font-size:0.92rem; padding:11px; justify-content:center; text-decoration:none; font-weight:900;"><i data-lucide="video"></i> دخول قاعة الحصة الآن 🎥</a>
            </div>
          `;
        } else {
          sessionAction = `
            <div class="session-actions-wrapper" data-id="${session.id}" style="display:flex; flex-direction:column; gap:8px; margin-top:16px;">
              <button class="btn-primary session-checkin-btn" data-id="${session.id}" data-role="student" style="background:linear-gradient(135deg, #10b981, #059669); border:none; color:#fff; font-size:0.9rem; padding:11px; justify-content:center; font-weight:800; width:100%; border-radius:12px; box-shadow:0 4px 15px rgba(16,185,129,0.3); cursor:pointer;">
                <i data-lucide="user-check" style="width:16px; height:16px;"></i> تأكيد الحضور (لست غائباً) ✍️
              </button>
              <div style="font-size:0.75rem; color:var(--text-muted); text-align:center;">* اضغط لتأكيد حضورك وتفعيل زر دخول البث المباشر</div>
            </div>
          `;
        }
      }
    } else if (isPastSession) {
      statusTag = `<span class="session-tag" style="background:rgba(239,68,68,0.1); color:#ef4444; border-color:rgba(239,68,68,0.25); font-weight:800;">⌛ انتهى وقت الحصة</span>`;
      if (isTeacher) {
        sessionAction = `
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:16px;">
            <button class="btn-primary end-session-btn" data-id="${session.id}" style="background:linear-gradient(135deg, #10b981, #059669); border-color:#10b981; font-size:0.82rem; padding:10px; justify-content:center; font-weight:800; box-shadow:0 4px 12px rgba(16,185,129,0.25); cursor:pointer;">
              <i data-lucide="file-check" style="width:16px;height:16px;"></i> 📝 توثيق التقرير وإنهاء الحصة (واحتساب الرصيد)
            </button>
            <button class="btn-secondary session-checkin-btn" data-id="${session.id}" data-role="teacher" style="width:100%; justify-content:center; font-size:0.82rem; padding:7px; border-color:#10b981; color:#10b981; background:rgba(16,185,129,0.08); font-weight:800; cursor:pointer;">
              <i data-lucide="user-check" style="width:14px; height:14px;"></i> تأكيد حضور المعلم (لست غائباً) ✍️
            </button>
          </div>
        `;
      } else {
        sessionAction = `<button class="btn-secondary session-action" style="cursor:not-allowed; margin-top:16px; font-size:0.85rem; padding:10px; opacity:0.65; width:100%; justify-content:center; background:rgba(0,0,0,0.04); color:var(--text-muted);" disabled>⌛ انتهى موعد الحصة (مغلقة)</button>`;
      }
    } else {
      // Future / Upcoming / Starting Soon
      const teacherWindow = 60 * 60 * 1000;
      const studentWindow = 30 * 60 * 1000;
      const isTeacherJoinable = nowTime >= (sessionTime - teacherWindow);
      const isStudentJoinable = nowTime >= (sessionTime - studentWindow);
      const isOnTime = nowTime >= sessionTime;
      const isCheckedIn = window.checkedInSessions?.has(session.id);

      if (isTeacher) {
        if (isTeacherJoinable) {
          statusTag = `<span class="session-tag" style="background:var(--info-glow); color:var(--info); border-color:var(--info); font-weight:800;">${isOnTime ? '🕐 موعد الحصة الآن' : '⚡ تبدأ قريباً'}</span>`;
          if (isCheckedIn) {
            sessionAction = `
              <div style="display:flex; flex-direction:column; gap:8px; margin-top:16px;">
                <span style="font-size:0.78rem; font-weight:800; color:#10b981; padding:6px 10px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:10px; display:inline-flex; align-items:center; justify-content:center; gap:6px; width:100%; box-sizing:border-box;">
                  <i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> تم تأكيد حضور المعلم (حاضر) ✅
                </span>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                  <button class="btn-primary start-session-btn" data-id="${session.id}" style="font-size:0.9rem; padding:10px; justify-content:center; font-weight:800;"><i data-lucide="play"></i> بدء البث 🔴</button>
                  <a href="#classroom/${session.id}" class="btn-secondary" style="font-size:0.9rem; padding:10px; justify-content:center; text-decoration:none; display:flex; align-items:center; gap:6px; font-weight:800;"><i data-lucide="video"></i> دخول 🎥</a>
                </div>
              </div>
            `;
          } else {
            sessionAction = `
              <div class="session-actions-wrapper" data-id="${session.id}" style="display:flex; flex-direction:column; gap:8px; margin-top:16px;">
                <button class="btn-primary session-checkin-btn" data-id="${session.id}" data-role="teacher" style="background:linear-gradient(135deg, #10b981, #059669); border:none; color:#fff; font-size:0.9rem; padding:11px; justify-content:center; font-weight:800; width:100%; border-radius:12px; box-shadow:0 4px 15px rgba(16,185,129,0.3); cursor:pointer;">
                  <i data-lucide="user-check" style="width:16px; height:16px;"></i> تأكيد حضور المعلم (لست غائباً) ✍️
                </button>
                <div style="font-size:0.75rem; color:var(--text-muted); text-align:center;">* اضغط لتأكيد حضورك وتفعيل زر بدء البث ودخول القاعة</div>
              </div>
            `;
          }
        } else {
          statusTag = `<span class="session-tag" style="background:rgba(99,102,241,0.1); color:var(--primary);">${t("session.scheduled") || "Scheduled"}</span>`;
          sessionAction = `
            <div style="display:grid; grid-template-columns:1fr; gap:10px; margin-top:16px;">
              <button disabled class="btn-secondary session-action restricted-join-btn" style="cursor:not-allowed; font-size:0.85rem; padding:10px; opacity:0.85; width:100%; justify-content:center; background:rgba(99,102,241,0.06); color:var(--primary); border-color:rgba(99,102,241,0.2); font-weight:700;" title="ينشط دخول المعلم قبل موعد الحصة بساعة واحدة (60 دقيقة)"><i data-lucide="lock" style="width:14px;height:14px;margin-inline-end:4px;"></i> ينشط دخول المعلم قبل الموعد بساعة 🔒</button>
            </div>
          `;
        }
      } else {
        if (isStudentJoinable) {
          statusTag = `<span class="session-tag" style="background:var(--info-glow); color:var(--info); border-color:var(--info); font-weight:800;">${isOnTime ? '🕐 موعد الحصة الآن' : '⚡ تبدأ قريباً'}</span>`;
          if (isCheckedIn) {
            sessionAction = `
              <div style="display:flex; flex-direction:column; gap:8px; margin-top:16px;">
                <span style="font-size:0.78rem; font-weight:800; color:#10b981; padding:6px 10px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:10px; display:inline-flex; align-items:center; justify-content:center; gap:6px; width:100%; box-sizing:border-box;">
                  <i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> تم تأكيد حضور الطالب (حاضر) ✅
                </span>
                <a href="#classroom/${session.id}" class="btn-primary session-action" style="background:linear-gradient(135deg,#10b981,#059669); box-shadow:0 4px 15px rgba(16,185,129,0.3); font-size:0.92rem; padding:11px; justify-content:center; text-decoration:none; font-weight:900;"><i data-lucide="video"></i> دخول قاعة الحصة الآن 🎥</a>
              </div>
            `;
          } else {
            sessionAction = `
              <div class="session-actions-wrapper" data-id="${session.id}" style="display:flex; flex-direction:column; gap:8px; margin-top:16px;">
                <button class="btn-primary session-checkin-btn" data-id="${session.id}" data-role="student" style="background:linear-gradient(135deg, #10b981, #059669); border:none; color:#fff; font-size:0.9rem; padding:11px; justify-content:center; font-weight:800; width:100%; border-radius:12px; box-shadow:0 4px 15px rgba(16,185,129,0.3); cursor:pointer;">
                  <i data-lucide="user-check" style="width:16px; height:16px;"></i> تأكيد الحضور (لست غائباً) ✍️
                </button>
                <div style="font-size:0.75rem; color:var(--text-muted); text-align:center;">* اضغط لتأكيد حضورك وتفعيل زر دخول قاعة الحصة</div>
              </div>
            `;
          }
        } else {
          statusTag = `<span class="session-tag" style="background:rgba(99,102,241,0.1); color:var(--primary);">${t("session.scheduled") || "Scheduled"}</span>`;
          sessionAction = `<button class="btn-secondary session-action restricted-join-btn" disabled style="cursor:not-allowed; margin-top:16px; font-size:0.85rem; padding:10px; opacity:0.85; width:100%; justify-content:center; background:rgba(99,102,241,0.06); color:var(--primary); border-color:rgba(99,102,241,0.2); font-weight:700;" title="ينشط زر الدخول قبل موعد الحصة بـ 30 دقيقة فقط"><i data-lucide="lock" style="width:14px;height:14px;margin-inline-end:4px;"></i> ينشط الدخول قبل الموعد بـ 30 دقيقة 🔒</button>`;
        }
      }
    }

    return `
      <div class="glass-card session-card" style="padding:24px; display:flex; flex-direction:column; ${isLive ? "border-color: var(--success); box-shadow: 0 0 20px rgba(16, 185, 129, 0.1);" : ""}">
        <div class="session-header-row" style="margin-bottom:12px;">
          ${statusTag}
          <span style="font-size: 0.85rem; color:var(--text-muted); font-weight:600;"><i data-lucide="clock" style="width:14px;height:14px;vertical-align:middle;margin-inline-end:4px;"></i>${session.duration} mins</span>
        </div>
        <h4 class="session-title" style="font-size:1.3rem; margin-bottom:8px;">${session.title}</h4>
        ${session.course ? `<div style="font-size:0.85rem; color:var(--primary); font-weight:600; margin-bottom:8px;"><i data-lucide="book" style="width:14px;height:14px;vertical-align:middle;margin-inline-end:4px;"></i> ${session.course.title}</div>` : ""}
        <p style="font-size:0.9rem; color:var(--text-muted); line-height:1.5; flex-grow:1;">${session.description || ''}</p>
        
        <div style="margin-top:auto;">
          <div class="session-time" style="margin-top:16px; padding:12px; background:var(--bg-app); border-radius:var(--radius-sm); border:1px solid var(--border-color);">
            <i data-lucide="calendar" style="width:16px;height:16px;color:var(--primary);"></i>
            <span style="font-weight:600; font-size:0.9rem;">${formattedDate} at ${formattedTime}</span>
          </div>
          ${sessionAction}
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

    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-card); padding:12px 24px; border-radius:12px; border:1px solid var(--border-color); margin-bottom:24px; flex-wrap:wrap; gap:16px;">
        <div style="display:flex; gap:8px;">
          <button class="btn-secondary" id="prev-week-btn" style="padding:8px 12px;"><i data-lucide="chevron-left"></i></button>
          <button class="btn-secondary" id="today-btn" style="padding:8px 16px;">Today</button>
          <button class="btn-secondary" id="next-week-btn" style="padding:8px 12px;"><i data-lucide="chevron-right"></i></button>
        </div>
        <div id="week-date-range" style="font-size:1.1rem; font-weight:700; color:var(--text-color);">
          ${rangeText}
        </div>
      </div>
      <div id="timetable-grid" style="flex-grow:1; min-height:600px; display:flex; gap:8px; padding-bottom:16px;">
    `;

    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(this.currentWeekStart);
      dayDate.setDate(dayDate.getDate() + i);

      const isToday = dayDate.toDateString() === now.toDateString();
      const dayName = dayDate.toLocaleDateString(locale, { weekday: 'long' });
      const dayNum = dayDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' });

      const daySessions = this.sessions.filter(s => {
        const sd = new Date(s.scheduledAt);
        return sd.toDateString() === dayDate.toDateString();
      }).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

      html += `
        <div style="min-width: 0; flex: 1; display:flex; flex-direction:column; background:var(--bg-app); border-radius:8px; border:1px solid ${isToday ? 'var(--primary)' : 'var(--border-color)'}; overflow:hidden;">
          <div style="padding:8px 4px; text-align:center; background:${isToday ? 'var(--primary-glow)' : 'var(--bg-card)'}; border-bottom:1px solid ${isToday ? 'var(--primary)' : 'var(--border-color)'};">
            <div style="font-weight:700; font-size:0.9rem; color:${isToday ? 'var(--primary)' : 'var(--text-color)'};">${dayName}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${dayNum}</div>
          </div>
          <div style="padding:8px; flex-grow:1; display:flex; flex-direction:column; gap:8px; overflow-y:auto; overflow-x:hidden;">
            ${daySessions.length === 0 ? `<div style="text-align:center; color:var(--text-muted); font-size:0.75rem; padding:10px 0;">-</div>` :
          daySessions.map(s => this.renderTimetableCard(s)).join("")
        }
          </div>
        </div>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;

    // Bind timetable specific events
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
      this.currentWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      this.renderCurrentView();
    });
  }

  renderTimetableCard(session) {
    const isTeacher = state.user.role === 'teacher' || state.user.role === 'admin';
    const isLive = session.status === "live";
    const isCompleted = session.status === "completed";
    const date = new Date(session.scheduledAt);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + (24 * 60 * 60 * 1000) - 1;
    const sessionTime = date.getTime();

    const isPastDay = sessionTime < todayStart;
    const isFutureDay = sessionTime > todayEnd;
    const isToday = sessionTime >= todayStart && sessionTime <= todayEnd;

    const isSoon = !isLive && !isCompleted && !isPastDay && (date.getTime() - Date.now() < 3 * 60 * 60 * 1000) && (date.getTime() - Date.now() > 0);
    const formattedTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    let statusStyle = "";
    let statusIcon = "";

    if (isPastDay) {
      statusStyle = "opacity:0.65; background:var(--bg-app); border: 1px solid var(--border-color);";
      statusIcon = `<span style="color:var(--text-muted); font-size:0.7rem; font-weight:700; display:block; margin-bottom:2px;">⌛ انتهت</span>`;
    } else if (isLive) {
      statusStyle = "border-inline-start: 4px solid var(--success); background: var(--bg-card);";
      statusIcon = `<span style="color:var(--success); font-size:0.75rem; font-weight:700; display:block; margin-bottom:4px;">LIVE NOW</span>`;
    } else if (isCompleted) {
      statusStyle = "opacity:0.6; background:var(--bg-card);";
      statusIcon = `<span style="color:var(--text-muted); font-size:0.7rem; font-weight:700; display:block; margin-bottom:2px;">مكتملة ✅</span>`;
    } else if (isSoon) {
      statusStyle = "border-inline-start: 4px solid var(--info); background:var(--info-glow);";
      statusIcon = `<span style="color:var(--info); font-size:0.7rem; font-weight:700; display:block; margin-bottom:2px;">قريباً ⏰</span>`;
    } else {
      statusStyle = "background:var(--bg-card); border: 1px solid var(--border-color);";
    }

    // Join Window check for student: active if teacher is live OR within 30 mins before scheduled start
    const diffMins = (sessionTime - now.getTime()) / (1000 * 60);
    const durationMins = session.duration || 60;
    const isWithinJoinWindow = diffMins <= 30 && (diffMins + durationMins) >= -15;

    let actionBtn = "";
    if (isPastDay && !isTeacher) {
      actionBtn = `<button disabled class="btn-secondary" style="padding:4px; font-size:0.7rem; width:100%; justify-content:center; margin-top:6px; opacity:0.6; cursor:not-allowed; border-color:var(--border-color);">غير متاحة للدخول</button>`;
    } else if (isLive && !isTeacher) {
      actionBtn = `
        <a href="#classroom/${session.id}" class="btn-primary" style="padding:6px; font-size:0.75rem; width:100%; justify-content:center; margin-top:6px; background:#10b981; border-color:#10b981; text-decoration:none; display:flex; align-items:center; gap:4px;">دخول 🎥</a>
        <button class="btn-secondary session-checkin-btn" data-id="${session.id}" style="padding:4px 6px; font-size:0.7rem; width:100%; justify-content:center; margin-top:4px; border-color:#10b981; color:#10b981; background:rgba(16,185,129,0.08); font-weight:800; cursor:pointer;">تأكيد الحضور ✍️</button>
      `;
    } else if (isLive && isTeacher) {
      actionBtn = `<a href="#classroom/${session.id}" class="btn-primary" style="padding:6px; font-size:0.75rem; width:100%; justify-content:center; margin-top:6px; text-decoration:none;">Enter</a>`;
    } else if (isSoon && isTeacher) {
      actionBtn = `<button class="btn-primary start-session-btn" data-id="${session.id}" style="padding:6px; font-size:0.75rem; width:100%; justify-content:center; margin-top:6px;">Start</button>`;
    } else if (!isPastDay && !isTeacher) {
      if (isWithinJoinWindow) {
        actionBtn = `
          <a href="#classroom/${session.id}" class="btn-primary" style="padding:6px; font-size:0.75rem; width:100%; justify-content:center; margin-top:6px; background:#10b981; border-color:#10b981; text-decoration:none; display:flex; align-items:center; gap:4px;">دخول 🎥</a>
          <button class="btn-secondary session-checkin-btn" data-id="${session.id}" style="padding:4px 6px; font-size:0.7rem; width:100%; justify-content:center; margin-top:4px; border-color:#10b981; color:#10b981; background:rgba(16,185,129,0.08); font-weight:800; cursor:pointer;">تأكيد الحضور ✍️</button>
        `;
      } else {
        actionBtn = `<button disabled class="btn-secondary" style="padding:4px; font-size:0.7rem; width:100%; justify-content:center; margin-top:6px; opacity:0.8; cursor:not-allowed; color:var(--primary);" title="ينشط زر الدخول قبل موعد الحصة بـ 30 دقيقة">⏰ ${formattedTime} (ينشط قبل 30د)</button>`;
      }
    }

    return `
      <div style="padding:8px; border-radius:6px; box-shadow:0 2px 4px rgba(0,0,0,0.05); ${statusStyle}">
        ${statusIcon}
        <div style="font-size:0.75rem; font-weight:700; color:var(--primary); margin-bottom:2px;">${formattedTime}</div>
        <div style="font-weight:600; font-size:0.8rem; margin-bottom:2px; line-height:1.2; word-wrap:break-word;">${session.title}</div>
        ${actionBtn}
      </div>
    `;
  }

  // --- Monthly View Logic ---

  renderMonthlyCalendarView(container) {
    const locale = document.documentElement.lang === 'ar' ? 'ar-EG' : 'en-US';
    const now = new Date();
    // Default to current month for simplicity, or we could add month navigation
    const year = now.getFullYear();
    const month = now.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); // 0 (Sun) to 6 (Sat)

    const monthName = firstDay.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

    let html = `
      <div style="display:flex; justify-content:center; align-items:center; background:var(--bg-card); padding:12px 24px; border-radius:12px; border:1px solid var(--border-color); margin-bottom:24px;">
        <div style="font-size:1.3rem; font-weight:700; color:var(--text-color);">${monthName}</div>
      </div>
      <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:4px; background:var(--border-color); border:1px solid var(--border-color); border-radius:8px; overflow:hidden;">
    `;

    // Day Headers
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(d => {
      html += `<div style="background:var(--bg-card); padding:10px; text-align:center; font-weight:700; font-size:0.9rem;">${d}</div>`;
    });

    // Empty cells before start of month
    for (let i = 0; i < startingDay; i++) {
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
        return `<a href="#classroom/${s.id}" style="background:var(--primary-glow); color:var(--primary); font-size:0.7rem; padding:4px 6px; border-radius:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-decoration:none; display:block; font-weight:700;" title="${s.title}">
                <b>${sTime}</b> ${s.title}
              </a>`;
      }).join('')}
          </div>
        </div>
      `;
    }

    // Empty cells after end of month
    const totalCells = startingDay + daysInMonth;
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
                    <a href="#classroom/${id}" class="btn-primary" style="background:linear-gradient(135deg,#6366f1,#4f46e5); font-size:0.88rem; padding:10px; justify-content:center; text-decoration:none; display:flex; align-items:center; gap:6px; font-weight:800;"><i data-lucide="video"></i> دخول القاعة 🎥</a>
                  </div>
                </div>
              `;
            } else {
              wrapper.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:8px;">
                  <span style="font-size:0.78rem; font-weight:800; color:#10b981; padding:6px 10px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:10px; display:inline-flex; align-items:center; justify-content:center; gap:6px; width:100%; box-sizing:border-box;">
                    <i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> تم تأكيد حضور الطالب (حاضر) ✅
                  </span>
                  <a href="#classroom/${id}" class="btn-primary session-action" style="background:linear-gradient(135deg,#10b981,#059669); box-shadow:0 4px 15px rgba(16,185,129,0.3); font-size:0.92rem; padding:11px; justify-content:center; text-decoration:none; font-weight:900; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="video" style="width:16px; height:16px;"></i> دخول قاعة الحصة الآن 🎥
                  </a>
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

  onDestroy() { }
}
