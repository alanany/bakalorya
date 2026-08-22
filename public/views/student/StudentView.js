import { apiFetch, state, showToast, t, renderCourseCard, canJoinSession, getMinSessionDateTimeISO, validateSessionScheduledDate, formatSessionDateTime, getTimezoneBadgeHTML } from "../../app.js";

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
        <div class="student-dashboard-layout" style="width:100%; max-width:100vw; box-sizing:border-box; overflow-x:hidden;">
          <!-- Main Left Dashboard Content -->
          <div style="display:flex; flex-direction:column; gap:24px; width:100%; max-width:100%; box-sizing:border-box;">
            
            <!-- Hero Welcome Header Card -->
            <div class="glass-card" style="padding:20px; border-radius:24px; background:linear-gradient(135deg, rgba(79,70,229,0.1), rgba(168,85,247,0.06)); border:1px solid rgba(79,70,229,0.2); display:flex; flex-direction:column; gap:8px; position:relative; overflow:hidden; width:100%; box-sizing:border-box;">
              <div style="position:absolute; top:-20px; left:-20px; width:120px; height:120px; background:rgba(79,70,229,0.15); filter:blur(40px); border-radius:50%; pointer-events:none;"></div>
              <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; width:100%;">
                <div style="flex:1; min-width:200px;">
                  <h2 class="dashboard-section-title" style="font-size:clamp(1.2rem, 3.5vw, 1.7rem); font-weight:900; margin:0 0 6px 0; color:var(--text-main);">
                    ${t("student.welcome").replace("{name}", state.user?.name || "طالب")}
                  </h2>
                  <p style="color:var(--text-muted); font-size:0.85rem; margin:0; line-height:1.5;">
                    ${t("student.subtitle")}
                  </p>
                </div>
                ${getTimezoneBadgeHTML()}
              </div>
            </div>

            <!-- Stats Grid -->
            <div class="dashboard-stats-grid" style="width:100%; box-sizing:border-box;">
              <div class="glass-card stat-box">
                <div class="stat-box-icon"><i data-lucide="book-open"></i></div>
                <div>
                  <div class="stat-box-val">${stats?.totalCourses || 0}</div>
                  <div class="stat-box-lbl">${t("student.enrolledCourses")}</div>
                </div>
              </div>
              <div class="glass-card stat-box">
                <div class="stat-box-icon" style="color:var(--success); background:var(--success-glow);"><i data-lucide="check-circle-2"></i></div>
                <div>
                  <div class="stat-box-val">${stats?.completedLessonsCount || 0}</div>
                  <div class="stat-box-lbl">${t("student.completedLessons")}</div>
                </div>
              </div>
              <div class="glass-card stat-box">
                <div class="stat-box-icon" style="color:var(--info); background:var(--info-glow);"><i data-lucide="clock"></i></div>
                <div>
                  <div class="stat-box-val">${stats?.studyHours || 0}h</div>
                  <div class="stat-box-lbl">${t("student.studyHours")}</div>
                </div>
              </div>
            </div>

            <!-- Enrolled Courses Track -->
            <div style="display:flex; flex-direction:column; gap:16px; width:100%; box-sizing:border-box;">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; width:100%;">
                <h3 class="dashboard-section-title" style="margin:0; font-size:1.1rem; font-weight:800; display:flex; align-items:center; gap:8px;">
                  <i data-lucide="graduation-cap" style="width:20px; height:20px; color:var(--primary);"></i> ${t("student.myTrack")}
                </h3>
                <a href="#courses" style="font-size:0.85rem; color:var(--primary); font-weight:700; display:flex; align-items:center; gap:4px; text-decoration:none;">
                  ${t("nav.courses")} <i data-lucide="arrow-right" style="width:14px;height:14px;"></i>
                </a>
              </div>

              ${(enrollments || []).length === 0
                ? `<div class="glass-card" style="text-align:center; padding:36px 20px; color:var(--text-muted); border-radius:18px; width:100%; box-sizing:border-box;">
                    <i data-lucide="book-open" style="width:36px; height:36px; color:var(--text-muted); opacity:0.5; margin-bottom:12px;"></i>
                    <p style="margin-bottom:16px; font-size:0.9rem;">${t("student.noEnrollments")}</p>
                    <a href="#courses" class="btn-primary" style="justify-content:center; width:fit-content; margin:0 auto; padding:10px 20px; font-size:0.85rem; border-radius:30px;">${t("student.checkCatalog")}</a>
                  </div>`
                : `<div class="courses-grid" style="width:100%; box-sizing:border-box;">
                    ${enrollments.slice(0, 2).map(enroll => this.renderCourseCard(enroll.course, enroll.progress, true, enroll.status)).join("")}
                  </div>`
              }
            </div>

            <!-- Active Subscriptions Widget -->
            ${mySubscriptions.length > 0 ? `
              <div style="display:flex; flex-direction:column; gap:12px; width:100%; box-sizing:border-box;">
                <h3 class="dashboard-section-title" style="margin:0; font-size:1.1rem; font-weight:800; display:flex; align-items:center; gap:8px;">
                  <i data-lucide="sparkles" style="width:18px; height:18px; color:#a855f7;"></i> اشتراكاتي الفعالة في البث المباشر
                </h3>
                <div style="display:flex; flex-direction:column; gap:10px; width:100%;">
                  ${mySubscriptions.map(sub => `
                    <div class="glass-card" style="padding:14px 18px; border-radius:16px; border:1px solid rgba(168,85,247,0.2); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; width:100%; box-sizing:border-box;">
                      <div>
                        <div style="font-weight:800; font-size:0.9rem; color:var(--text-main);">${sub.packageTitle || 'اشتراك مخصص'}</div>
                        <div style="font-size:0.78rem; color:var(--text-muted);">👨‍🏫 المعلم: ${sub.teacher?.name || '-'} • المتبقي: ${sub.remainingSessions || 0} حصة</div>
                      </div>
                      <span style="font-size:0.75rem; font-weight:800; padding:4px 10px; border-radius:20px; background:rgba(168,85,247,0.12); color:#a855f7;">نشط ⚡</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

          </div>

          <!-- Sidebar (Today's Sessions) -->
          <div style="display:flex; flex-direction:column; gap:16px; width:100%; max-width:100%; box-sizing:border-box;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; width:100%;">
              <h3 class="dashboard-section-title" style="margin:0; font-size:1.15rem; font-weight:800; display:flex; align-items:center; gap:8px;">
                <i data-lucide="video" style="width:20px; height:20px; color:var(--primary);"></i> حصص اليوم المباشرة
              </h3>
              <a href="#schedule" style="font-size:0.85rem; color:var(--primary); font-weight:700; display:flex; align-items:center; gap:4px; text-decoration:none;">
                ${t("nav.schedule")} <i data-lucide="arrow-right" style="width:14px;height:14px;"></i>
              </a>
            </div>

            <div class="schedule-list" id="student-schedule-container" style="display:flex; flex-direction:column; gap:14px; width:100%; box-sizing:border-box;">
              ${filteredSessions.length === 0
                ? `<div class="glass-card" style="text-align:center; padding:32px 16px; color:var(--text-muted); border-radius:18px;">
                    <i data-lucide="calendar" style="width:32px; height:32px; color:var(--text-muted); opacity:0.5; margin-bottom:8px;"></i>
                    <div style="font-size:0.88rem;">${t("student.noSessions")}</div>
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

  renderCourseCard(course, progress = 0, showContinue = false, enrollmentStatus = "active") {
    return renderCourseCard(course, {
      progress: progress || 0,
      enrollmentStatus: showContinue ? (enrollmentStatus || "active") : null
    });
  }

  renderSessionCard(session) {
    if (!session) return "";

    const scheduledTime = session.scheduledAt ? new Date(session.scheduledAt).getTime() : 0;
    const durationMins = session.duration || 60;
    const now = Date.now();
    const diffMs = scheduledTime - now;
    const diffMins = Math.ceil(diffMs / (1000 * 60));
    const isPastSession = diffMins < -durationMins;

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

  bindEvents() {}
}
