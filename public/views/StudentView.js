import { apiFetch, state, showToast, t, renderCourseCard, canJoinSession, getMinSessionDateTimeISO, validateSessionScheduledDate, formatSessionDateTime, getTimezoneBadgeHTML } from "../app.js";

export default class StudentView {
  constructor(container) {
    this.container = container;
    this.sessionFilter = "all";
    this.rawSessions = [];
  }

  async render() {
    try {
      const [stats, enrollments, allCourses, sessions, subscriptions] = await Promise.all([
        apiFetch("/student/stats"),
        apiFetch("/student/enrollments"),
        apiFetch("/courses"),
        apiFetch("/sessions"),
        apiFetch("/subscriptions/my").catch(() => [])
      ]);
      const mySubscriptions = subscriptions || [];

      this.rawSessions = sessions || [];
      const enrolledCourseIds = (enrollments || []).map(e => e.course?.id);
      const filteredSessions = this.filterSessions(this.rawSessions);

      this.container.innerHTML = `
        <div class="student-dashboard-layout">
          <!-- Main Left Dashboard Content -->
          <div>
            <h2 class="dashboard-section-title" style="font-size: 1.8rem; margin-bottom: 8px;">${t("student.welcome").replace("{name}", state.user.name)}</h2>
            <p style="color:var(--text-muted); margin-bottom: 32px;">${t("student.subtitle")}</p>

            <!-- Stats -->
            <div class="dashboard-stats-grid">
              <div class="glass-card stat-box">
                <div class="stat-box-icon"><i data-lucide="book-open"></i></div>
                <div>
                  <div class="stat-box-val">${stats.totalCourses || 0}</div>
                  <div class="stat-box-lbl">${t("student.enrolledCourses")}</div>
                </div>
              </div>
              <div class="glass-card stat-box">
                <div class="stat-box-icon" style="color:var(--success); background:var(--success-glow);"><i data-lucide="check-circle-2"></i></div>
                <div>
                  <div class="stat-box-val">${stats.completedLessonsCount || 0}</div>
                  <div class="stat-box-lbl">${t("student.completedLessons")}</div>
                </div>
              </div>
              <div class="glass-card stat-box">
                <div class="stat-box-icon" style="color:var(--info); background:var(--info-glow);"><i data-lucide="clock"></i></div>
                <div>
                  <div class="stat-box-val">${stats.studyHours || 0}h</div>
                  <div class="stat-box-lbl">${t("student.studyHours")}</div>
                </div>
              </div>
            </div>

            <!-- Enrolled Courses -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
              <h3 class="dashboard-section-title" style="margin:0;"><i data-lucide="graduation-cap"></i> ${t("student.myTrack")}</h3>
              <a href="#courses" style="font-size:0.9rem; color:var(--primary); font-weight:600; display:flex; align-items:center; gap:4px;">
                ${t("nav.courses")} <i data-lucide="arrow-right" style="width:16px;height:16px;"></i>
              </a>
            </div>
            ${(enrollments || []).length === 0
          ? `<div class="glass-card" style="text-align:center; padding: 40px; color:var(--text-muted); margin-bottom: 40px;">
                    <p style="margin-bottom:16px;">${t("student.noEnrollments")}</p>
                    <a href="#courses" class="btn-primary" style="justify-content:center; width:fit-content; margin:0 auto;">${t("student.checkCatalog")}</a>
                  </div>`
          : `<div class="courses-grid" style="margin-bottom: 40px;">
                    ${enrollments.slice(0, 2).map(enroll => this.renderCourseCard(enroll.course, enroll.progress, true, enroll.status)).join("")}
                  </div>`
        }

            <!-- Active Subscriptions Widget -->
         
          </div>

          <!-- Sidebar (Today's Sessions) -->
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:8px;">
              <h3 class="dashboard-section-title" style="margin:0;"><i data-lucide="video"></i> Today's Sessions</h3>
              <a href="#schedule" style="font-size:0.9rem; color:var(--primary); font-weight:600; display:flex; align-items:center; gap:4px;">
                ${t("nav.schedule")} <i data-lucide="arrow-right" style="width:16px;height:16px;"></i>
              </a>
            </div>

            <div class="schedule-list" id="student-schedule-container" style="display:flex; flex-direction:column; gap:16px;">
              ${filteredSessions.length === 0
          ? `<div class="glass-card" style="text-align:center; padding: 30px; color:var(--text-muted);">
                      ${t("student.noSessions")}
                    </div>`
          : filteredSessions.map(session => this.renderSessionCard(session)).join("")
        }
            </div>
          </div>
        </div>

      `;

      this.bindEvents();
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error("Dashboard loading error:", err);
    }
  }

  filterSessions(sessions) {
    const todayStr = new Date().toDateString();
    return (sessions || []).filter(s => {
      const d = new Date(s.scheduledAt).toDateString();
      return d === todayStr;
    });
  }

  renderCourseCard(course, progress, showContinue = false, enrollmentStatus = "active") {
    return renderCourseCard(course, progress, showContinue, enrollmentStatus);
  }

  renderSessionCard(session) {
    if (!session) return "";

    const scheduledTime = session.scheduledAt ? new Date(session.scheduledAt).getTime() : 0;
    const durationMins = session.duration || 60;
    const now = Date.now();
    const diffMs = scheduledTime - now;
    const diffMins = Math.ceil(diffMs / (1000 * 60));
    const isPastSession = diffMins < -durationMins;

    // Joinable if starting within 30 mins, live/active, or if session time has passed today
    const isLive = session.status === "live" || session.status === "active";
    const isStartingSoon = diffMins <= 30 && !isPastSession;
    const teacherTz = session.teacher?.timezone || "Africa/Cairo";
    const formatted = formatSessionDateTime(session.scheduledAt, null, { secondaryTz: teacherTz });

    let remainingText = "";
    if (isPastSession && !isLive) {
      remainingText = `انقضى موعد الحصة (في انتظار التوثيق)`;
    } else if (diffMins > 30) {
      if (diffMins >= 60) {
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        remainingText = `تبقي ${hours} ساعة ${mins > 0 ? `و ${mins}د` : ''}`;
      } else {
        remainingText = `تبقي ${diffMins} دقيقة`;
      }
    }

    return `
      <div class="glass-card" style="padding:16px; display:flex; flex-direction:column; gap:10px; border-radius:18px; border:1px solid var(--border-color); background:var(--bg-card); position:relative;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
          <span style="font-size:0.88rem; font-weight:800; color:var(--primary); display:flex; align-items:center; gap:6px;">
            <i data-lucide="video" style="width:16px; height:16px;"></i>
            ${session.title || 'حصة خاصة'}
          </span>
          ${formatted.badgeHTML}
        </div>

        <div style="font-size:0.82rem; color:var(--text-main); display:flex; flex-direction:column; gap:4px;">
          <div style="font-weight:700;">👨‍🏫 المعلم: ${session.teacher?.name || '-'}</div>
          <div style="color:var(--primary); font-weight:600;">⏰ الموعد: ${formatted.dateStr} • ${formatted.timeStr} ${formatted.secondaryTZHTML}</div>
          ${session.topic ? `<div style="color:var(--text-muted);">📖 الموضوع: ${session.topic}</div>` : ''}
        </div>
          ${session.topic ? `<div style="color:var(--text-muted);">📖 الموضوع: ${session.topic}</div>` : ''}
        </div>

        <div style="margin-top:4px;">
          ${isLive || isStartingSoon ? `
            <a href="#classroom/${session.id}" class="btn-primary" style="width:100%; padding:9px 14px; font-size:0.85rem; font-weight:800; justify-content:center; text-decoration:none; border-radius:12px; background:linear-gradient(135deg, #10b981, #059669); gap:8px; border:none; display:flex; align-items:center;">
              <i data-lucide="video" style="width:16px; height:16px;"></i> دخول غرفة الحصة للبث المباشر 🔴
            </a>
          ` : `
            <a href="#classroom/${session.id}" class="btn-primary" style="width:100%; padding:9px 14px; font-size:0.85rem; font-weight:800; justify-content:center; text-decoration:none; border-radius:12px; background:linear-gradient(135deg, var(--primary), #4f46e5); gap:8px; border:none; display:flex; align-items:center;">
              <i data-lucide="door-open" style="width:16px; height:16px;"></i> دخول قاعة الحصة (${remainingText}) ⏳
            </a>
          `}
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Only used for global event binding if needed, no longer handles private sessions here.
  }

}
