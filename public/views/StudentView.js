import { apiFetch, state, showToast, t, renderCourseCard, showEnrollmentRequestedModal, canJoinSession } from "../app.js";

export default class StudentView {
  constructor(container) {
    this.container = container;
    this.sessionFilter = "all";
    this.rawSessions = [];
  }

  async render() {
    try {
      const [stats, enrollments, allCourses, sessions] = await Promise.all([
        apiFetch("/student/stats"),
        apiFetch("/student/enrollments"),
        apiFetch("/courses"),
        apiFetch("/sessions")
      ]);

      this.rawSessions = sessions || [];
      const enrolledCourseIds = (enrollments || []).map(e => e.course?.id);
      const catalogCourses = (allCourses || []).filter(c => !enrolledCourseIds.includes(c.id));
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

            <!-- Active Courses (Recent) -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
              <h3 class="dashboard-section-title" style="margin:0;"><i data-lucide="graduation-cap"></i> ${t("student.myTrack")}</h3>
              <a href="#courses" style="font-size:0.9rem; color:var(--primary); font-weight:600; display:flex; align-items:center; gap:4px;">
                ${t("nav.courses")} <i data-lucide="arrow-right" style="width:16px;height:16px;"></i>
              </a>
            </div>
            ${
              (enrollments || []).length === 0
                ? `<div class="glass-card" style="text-align:center; padding: 40px; color:var(--text-muted); margin-bottom: 40px;">
                    <p style="margin-bottom:16px;">${t("student.noEnrollments")}</p>
                    <a href="#courses" class="btn-primary" style="justify-content:center; width:fit-content; margin:0 auto;">${t("student.checkCatalog")}</a>
                  </div>`
                : `<div class="courses-grid" style="margin-bottom: 40px;">
                    ${enrollments.slice(0, 2).map(enroll => this.renderCourseCard(enroll.course, enroll.progress, true, enroll.status)).join("")}
                  </div>`
            }
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
              ${
                filteredSessions.length === 0
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
    if (!sessions || sessions.length === 0) return [];
    const now = new Date();
    
    // In Dashboard, we ONLY show today's sessions by default
    return sessions.filter(s => {
      const d = new Date(s.scheduledAt);
      return d.toDateString() === now.toDateString();
    });
  }

  renderCourseCard(course, progress, isEnrolled, status = "active") {
    const isBanned = status === "banned";
    return renderCourseCard(course, {
      enrollmentStatus: isEnrolled ? (isBanned ? "rejected" : "active") : null,
      isBanned,
      progress
    });
  }

  renderSessionCard(session) {
    const isLive = session.status === "live";
    const date = new Date(session.scheduledAt);
    const isJoinable = isLive || canJoinSession(session);
    const formattedTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const formattedDate = date.toLocaleDateString([], { month: "short", day: "numeric" });

    let statusTag = `<span class="session-tag">${t("session.scheduled")}</span>`;
    let actionBtn = "";

    if (isLive) {
      statusTag = `<span class="session-tag live">${t("session.liveNow")}</span>`;
      actionBtn = `<a href="${session.course?.meetingLink || session.teacher?.meetingLink || '#'}" target="_blank" class="btn-primary session-action" style="background:var(--success); box-shadow:0 4px 15px var(--success-glow);"><i data-lucide="external-link"></i> دخول البث المباشر 🎥</a>`;
    } else if (isJoinable) {
      statusTag = `<span class="session-tag" style="background:var(--info-glow); color:var(--info); border-color:var(--info);">${t("session.startingSoon")}</span>`;
      actionBtn = `<a href="${session.course?.meetingLink || session.teacher?.meetingLink || '#'}" target="_blank" class="btn-primary session-action" style="background:var(--primary);"><i data-lucide="external-link"></i> دخول البث 🎥</a>`;
    } else {
      actionBtn = `<button class="btn-secondary session-action restricted-join-btn" style="cursor:pointer; opacity:0.9;" title="متاح الانضمام قبل الموعد بـ 30 دقيقة فقط"><i data-lucide="lock" style="width:14px;height:14px;margin-inline-end:4px;"></i> الانضمام (قبل الموعد بـ 30د)</button>`;
    }

    return `
      <div class="glass-card session-card" style="${isLive ? "border-color: var(--success);" : ""}">
        <div class="session-header-row">
          ${statusTag}
          <span style="font-size: 0.75rem; color:var(--text-muted); font-weight:600;">${session.duration} ${t("session.mins")}</span>
        </div>
        <h4 class="session-title">${session.title}</h4>
        <p style="font-size:0.8rem; color:var(--text-muted); margin-top:6px; line-height:1.4;">${session.description || ''}</p>
        <div class="session-time">
          <i data-lucide="calendar" style="width:14px;height:14px;"></i>
          <span>${formattedDate} ${t("session.at")} ${formattedTime}</span>
        </div>
        ${actionBtn}
      </div>
    `;
  }

  bindEvents() {
    // Schedule filter buttons click handler
    const filterBtns = this.container.querySelectorAll("[data-schedule-filter]");
    filterBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const filter = btn.getAttribute("data-schedule-filter");
        this.sessionFilter = filter;
        filterBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const container = this.container.querySelector("#student-schedule-container");
        if (container) {
          const filtered = this.filterSessions(this.rawSessions);
          container.innerHTML = filtered.length === 0
            ? `<div class="glass-card" style="text-align:center; padding: 30px; color:var(--text-muted);">${t("student.noSessions")}</div>`
            : filtered.map(session => this.renderSessionCard(session)).join("");
          if (window.lucide) window.lucide.createIcons();
        }
      });
    });

    const enrollButtons = this.container.querySelectorAll(".enroll-course-btn");
    enrollButtons.forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const courseId = e.currentTarget.getAttribute("data-id");
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader" class="spinner" style="width:14px;height:14px;border-width:2px;"></i> ${t("course.enrolling")}`;
        if (window.lucide) window.lucide.createIcons();
        try {
          await apiFetch("/student/enrollments", { method: "POST", body: JSON.stringify({ courseId }) });
          showToast("تم تقديم طلب التسجيل بنجاح! في انتظار موافقة المعلم.", "success");
          showEnrollmentRequestedModal();
          await this.render();
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = `<i data-lucide="plus-circle"></i> ${t("course.enroll")}`;
          if (window.lucide) window.lucide.createIcons();
        }
      });
    });
  }

  onDestroy() {}
}
