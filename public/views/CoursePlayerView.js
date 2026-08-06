import { apiFetch, state, showToast, t } from "../app.js";

export default class CoursePlayerView {
  constructor(container, courseId) {
    this.container = container;
    this.courseId = courseId;
    this.course = null;
    this.enrollment = null;
    this.currentLesson = null;
    this.completedLessons = [];
    this.activeTab = "details";
    this.liveSessions = [];
  }

  async render() {
    try {
      const [course, enrollments, sessions, resources] = await Promise.all([
        apiFetch(`/courses/${this.courseId}`),
        apiFetch("/student/enrollments"),
        apiFetch("/sessions"),
        apiFetch("/resources")
      ]);

      this.course = course;
      this.enrollment = (enrollments || []).find(e => e.course?.id === this.courseId);
      this.completedLessons = this.enrollment ? (this.enrollment.completedLessons || []) : [];
      this.liveSessions = (sessions || []).filter(s => (s.course && s.course.id === this.courseId) || (!s.course && s.teacher?.id === this.course.teacher?.id));
      this.courseResources = (resources || []).filter(r => r.course && String(r.course.id) === String(this.courseId));

      const hasLessons = this.course.lessons && this.course.lessons.length > 0;

      // If no recorded lessons yet but there are live sessions, default active tab to 'sessions'
      if (!hasLessons && this.liveSessions.length > 0) {
        this.activeTab = "sessions";
      }

      if (hasLessons && !this.currentLesson) {
        this.currentLesson = this.course.lessons[0];
      }

      const chapters = {};
      if (hasLessons) {
        this.course.lessons.forEach(lesson => {
          const chName = lesson.chapter || t("course.generalChapter");
          if (!chapters[chName]) chapters[chName] = [];
          chapters[chName].push(lesson);
        });
      }

      // Active live session if any
      const activeLiveSession = this.liveSessions.find(s => s.status === "live");
      const isTeacherOrAdmin = state.user && (state.user.role === "teacher" || state.user.role === "admin");
      
      // Block access if enrollment is pending or rejected (banned is handled below)
      if (!isTeacherOrAdmin && this.enrollment) {
        if (this.enrollment.status === 'pending') {
          this.container.innerHTML = `
            <div style="padding:100px 20px; text-align:center;">
              <i data-lucide="clock" style="width:64px; height:64px; color:var(--text-muted); margin-bottom:24px;"></i>
              <h2 style="font-size:2rem; margin-bottom:16px;">Enrollment Pending</h2>
              <p style="color:var(--text-muted); font-size:1.1rem; margin-bottom:24px;">Your request to join this course is pending teacher approval.</p>
              <button onclick="window.location.hash='#courses'" class="btn-primary">Return to My Courses</button>
            </div>
          `;
          if (window.lucide) window.lucide.createIcons();
          return;
        }
        if (this.enrollment.status === 'rejected') {
          this.container.innerHTML = `
            <div style="padding:100px 20px; text-align:center;">
              <i data-lucide="x-circle" style="width:64px; height:64px; color:var(--error); margin-bottom:24px;"></i>
              <h2 style="font-size:2rem; margin-bottom:16px;">Enrollment Rejected</h2>
              <p style="color:var(--text-muted); font-size:1.1rem; margin-bottom:24px;">Your request to join this course was rejected.</p>
              <button onclick="window.location.hash='#courses'" class="btn-primary">Return to My Courses</button>
            </div>
          `;
          if (window.lucide) window.lucide.createIcons();
          return;
        }
      }

      this.container.innerHTML = `
        <div class="course-player-container">
          <!-- Main Video Area -->
          <div class="player-main-area">
            
            ${activeLiveSession ? `
              <!-- Active Live Session Notification Banner -->
              <div class="glass-card" style="border-color:var(--success); background:rgba(16,185,129,0.08); padding:16px 24px; margin-bottom:20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;">
                <div style="display:flex; align-items:center; gap:12px;">
                  <span class="session-tag live">${t("session.liveNow")}</span>
                  <div>
                    <strong style="font-size:0.95rem; color:var(--text-main);">${activeLiveSession.title}</strong>
                    <div style="font-size:0.8rem; color:var(--text-muted);">${t("course.instructedBy")} ${this.course.teacher?.name}</div>
                  </div>
                </div>
                <a href="#classroom/${activeLiveSession.id}" class="btn-primary" style="background:var(--success); font-size:0.85rem; padding:8px 16px;">
                  <i data-lucide="video"></i> ${t("course.joinLiveClass")}
                </a>
              </div>
            ` : ""}

            <div class="video-container" id="video-wrapper">
              ${this.currentLesson ? this.renderVideoPlayer() : `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding:40px; text-align:center; color:var(--text-muted);">
                  <i data-lucide="video" style="width:48px; height:48px; color:var(--primary); margin-bottom:16px;"></i>
                  <h3 style="color:var(--text-main); font-weight:700; margin-bottom:8px;">${t("course.onlineSessionsTitle")}</h3>
                  <p style="font-size:0.85rem; max-width:400px; line-height:1.5;">${t("course.noLessonsSub")}</p>
                </div>
              `}
            </div>

            <div class="player-details-card">
              <div class="player-details-header">
                <h1 class="player-course-title">${this.course.title}</h1>
                <h3 class="player-lesson-title" id="active-lesson-heading">${this.currentLesson ? this.currentLesson.title : t("course.onlineSessionsTitle")}</h3>

                <div style="display:flex; justify-content:space-between; align-items:center; color:var(--text-muted); font-size:0.85rem; margin-top:8px;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <img src="${this.course.teacher?.avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=Teacher"}" alt="Avatar" class="teacher-avatar">
                    <span>${t("course.instructedBy")} <strong>${this.course.teacher?.name || t("course.instructor")}</strong></span>
                  </div>
                  ${this.currentLesson ? `<span style="font-weight:600; color:var(--primary);">${this.currentLesson.duration} ${t("course.minsDuration")}</span>` : ""}
                </div>
              </div>

              <!-- Tabs -->
              <div class="tabs-header">
                <button class="tab-btn ${this.activeTab === "resources" ? "active" : ""}" data-tab="resources">
                  <i data-lucide="folder-open"></i> الموارد التعليمية (${this.courseResources.length})
                </button>
                <button class="tab-btn ${this.activeTab === "sessions" ? "active" : ""}" data-tab="sessions">
                  <i data-lucide="video"></i> ${t("course.tabLiveSessions")} (${this.liveSessions.length})
                </button>
                <button class="tab-btn ${this.activeTab === "details" ? "active" : ""}" data-tab="details">
                  <i data-lucide="info"></i> ${t("course.tabDetails")}
                </button>
                <button class="tab-btn ${this.activeTab === "notes" ? "active" : ""}" data-tab="notes">
                  <i data-lucide="file-text"></i> ${t("course.tabNotes")}
                </button>
                <button class="tab-btn ${this.activeTab === "qa" ? "active" : ""}" data-tab="qa">
                  <i data-lucide="message-square"></i> ${t("course.tabQA")}
                </button>
              </div>

              <!-- Online Live Sessions Pane -->
              <div class="tab-content-pane ${this.activeTab === "sessions" ? "active" : ""}" id="pane-sessions">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
                  <h4 style="font-weight:700;">${t("course.onlineSessionsTitle")}</h4>
                  ${isTeacherOrAdmin ? `
                    <button class="btn-primary" id="open-course-session-modal-btn" style="font-size:0.8rem; padding:8px 14px;">
                      <i data-lucide="plus-circle"></i> ${t("teacher.planSession")}
                    </button>
                  ` : ""}
                </div>

                ${
                  this.liveSessions.length === 0
                    ? `<div style="text-align:center; padding:30px; color:var(--text-muted); background:var(--bg-card); border-radius:var(--radius-sm);">
                        ${t("course.noLiveSessions")}
                      </div>`
                    : `<div style="display:flex; flex-direction:column; gap:12px;">
                        ${this.liveSessions.map(session => this.renderSessionRow(session)).join("")}
                      </div>`
                }
              </div>

              <!-- Resources Content Pane -->
              <div class="tab-content-pane ${this.activeTab === "resources" ? "active" : ""}" id="pane-resources">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
                  <h4 style="font-weight:800; font-size:1.1rem; color:var(--text-main); margin:0;">
                    <i data-lucide="folder-open" style="width:18px;height:18px;color:var(--primary);vertical-align:middle;margin-inline-end:6px;"></i>
                    الموارد التعليمية والملفات المرفقة بالدورة
                  </h4>
                </div>

                ${this.courseResources.length === 0 ? `
                  <div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted);">
                    <i data-lucide="folder-open" style="width:48px; height:48px; margin-bottom:12px; opacity:0.4;"></i>
                    <p>لا توجد موارد مرفقة بهذه الدورة حتى الآن.</p>
                  </div>
                ` : `
                  <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:16px;">
                    ${this.courseResources.map(r => this.renderResourceCardInCourse(r)).join("")}
                  </div>
                `}
              </div>

              <!-- Details Pane -->
              <div class="tab-content-pane ${this.activeTab === "details" ? "active" : ""}" id="pane-details">
                <p style="margin-bottom: 16px; line-height: 1.6;">
                  ${this.currentLesson ? (this.currentLesson.description || t("course.noDescription")) : (this.course.description || t("course.noDescription"))}
                </p>
                <div style="border-top:1px solid var(--border-color); padding-top:16px; margin-top:20px;">
                  <h4 style="color:var(--text-main); margin-bottom:12px; font-size:1rem; font-weight:800; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="library" style="color:var(--primary); width:18px; height:18px;"></i>
                    الموارد المرفقة بالدورة (${this.courseResources.length})
                  </h4>
                  ${this.courseResources.length > 0 ? `
                    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:12px; margin-top:12px;">
                      ${this.courseResources.map(r => `
                        <a href="${r.url}" target="_blank" rel="noopener" class="btn-secondary" style="padding:10px 14px; font-size:0.85rem; justify-content:space-between; text-decoration:none; border-color:var(--primary-glow);">
                          <span style="font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:140px;">${r.title}</span>
                          <i data-lucide="external-link" style="width:14px;height:14px;color:var(--primary);flex-shrink:0;"></i>
                        </a>
                      `).join("")}
                    </div>
                  ` : `
                    <p style="font-size:0.85rem; color:var(--text-muted);">لا توجد موارد مرفقة حتى الآن.</p>
                  `}
                </div>
              </div>

              <!-- Notes Pane -->
              <div class="tab-content-pane ${this.activeTab === "notes" ? "active" : ""}" id="pane-notes">
                <p style="margin-bottom: 12px;">${t("course.notesHint")}</p>
                <textarea id="notes-textarea" class="form-input" style="width: 100%; height: 120px; font-family: monospace; resize: none; margin-bottom: 12px;" placeholder="${t("course.notesPlaceholder")}"></textarea>
                <button class="btn-primary" id="save-notes-btn" style="font-size:0.85rem; padding:8px 16px;">${t("course.saveNotes")}</button>
              </div>

              <!-- Q&A Pane -->
              <div class="tab-content-pane ${this.activeTab === "qa" ? "active" : ""}" id="pane-qa">
                <div style="display:flex; flex-direction:column; gap:16px;">
                  <div style="border-bottom:1px solid var(--border-color); padding-bottom:12px;">
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:600; margin-bottom:4px;">
                      <span style="color:var(--primary);">هاني س. (طالب)</span>
                      <span style="color:var(--text-muted)">منذ يوم واحد</span>
                    </div>
                    <p style="font-size:0.85rem; line-height:1.4;">في حساب النهايات، كيف نختار بين المرافق وقاعدة لوبيتال؟</p>
                    <div style="background:var(--bg-card); padding:10px; border-radius:4px; margin-top:8px; font-size:0.85rem; border-left:2px solid var(--primary);">
                      <strong>د. يوسف الحسن:</strong> المرافق يعمل بشكل أفضل للتعبيرات الجبرية التي تحتوي على جذور تربيعية. قاعدة لوبيتال تعمل لأي دوال تُقيَّم عند 0/0.
                    </div>
                  </div>
                  <div>
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:600; margin-bottom:4px;">
                      <span style="color:var(--primary);">ليلى م. (طالبة)</span>
                      <span style="color:var(--text-muted)">منذ 3 أيام</span>
                    </div>
                    <p style="font-size:0.85rem; line-height:1.4;">أين يمكنني تحميل فصول الكتاب؟</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Sidebar Curriculum -->
          <div class="sidebar-curriculum">
            <h3 class="curriculum-title">${t("course.curriculum")}</h3>

            ${hasLessons ? Object.keys(chapters).map(chName => `
              <div class="chapter-group">
                <h4 class="chapter-header">${chName}</h4>
                <div class="lesson-list-items">
                  ${chapters[chName].map(lesson => {
                    const isActive = this.currentLesson && lesson.id === this.currentLesson.id;
                    const isChecked = this.completedLessons.includes(lesson.id);
                    return `
                      <div class="lesson-item-row ${isActive ? "active" : ""}" data-lesson-id="${lesson.id}">
                        <div class="lesson-item-left">
                          <div class="lesson-checkbox ${isChecked ? "checked" : ""}" data-lesson-id="${lesson.id}">
                            ${isChecked ? '<i data-lucide="check" style="width:14px;height:14px;"></i>' : ""}
                          </div>
                          <div class="lesson-item-title-meta">
                            <span class="lesson-item-title">${lesson.title}</span>
                            <span class="lesson-item-duration">${lesson.duration} ${t("session.mins")}</span>
                          </div>
                        </div>
                        <i data-lucide="play" style="width:14px;height:14px;color:var(--text-muted); opacity:${isActive ? "1" : "0.3"};"></i>
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>
            `).join("") : `
              <div style="padding:20px; text-align:center; color:var(--text-muted); font-size:0.85rem;">
                ${t("course.noLessons")}
              </div>
            `}
          </div>
        </div>

        <!-- Add Live Session Modal (for Teachers & Admins inside Course Page) -->
        <div class="modal-overlay" id="course-session-modal" style="display:none;">
          <div class="modal-content">
            <div class="modal-header">
              <h3 class="modal-title">${t("teacher.scheduleSession")} - ${this.course.title}</h3>
              <span class="modal-close-btn" id="close-course-session-modal">&times;</span>
            </div>
            <form id="create-course-session-form">
              <div class="modal-body">
                <div class="form-group">
                  <label for="course-session-title">${t("teacher.sessionTitle")}</label>
                  <input type="text" id="course-session-title" class="form-input" placeholder="${t("teacher.sessionTitlePlaceholder")}" required>
                </div>
                <div class="form-group">
                  <label for="course-session-desc">${t("teacher.sessionDesc")}</label>
                  <textarea id="course-session-desc" class="form-input" style="height:80px; resize:none;" placeholder="${t("teacher.sessionDescPlaceholder")}"></textarea>
                </div>
                <div class="form-group">
                  <label for="course-session-date">${t("teacher.sessionDate")}</label>
                  <input type="datetime-local" id="course-session-date" class="form-input" required>
                </div>
                <div class="form-group">
                  <label for="course-session-duration">${t("teacher.sessionDuration")}</label>
                  <input type="number" id="course-session-duration" class="form-input" value="60" min="15" max="180" required>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn-secondary" id="cancel-course-session-modal">${t("common.cancel")}</button>
                <button type="submit" class="btn-primary">${t("teacher.planSession")}</button>
              </div>
            </form>
          </div>
        </div>
      `;

      this.bindEvents();
      this.loadNotes();
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error("Course player rendering failed:", err);
    }
  }

  renderResourceCardInCourse(res) {
    const defaultPhoto = `https://placehold.co/400x200/6366f1/ffffff?text=${encodeURIComponent(res.title?.charAt(0) || "R")}`;
    const photo = res.photo || defaultPhoto;
    const isDrive = res.url?.includes("drive.google.com");
    const isDoc = res.url?.includes("docs.google.com");
    const iconLabel = isDrive ? "Google Drive" : isDoc ? "Google Docs" : "فتح المورد";

    return `
      <div class="glass-card" style="padding:0; overflow:hidden; border:1px solid var(--border-color); border-radius:12px; display:flex; flex-direction:column;">
        <div style="position:relative; height:120px; overflow:hidden;">
          <img src="${photo}" alt="${res.title}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='${defaultPhoto}'">
        </div>
        <div style="padding:14px; display:flex; flex-direction:column; gap:8px; flex-grow:1;">
          <h4 style="font-size:0.95rem; font-weight:800; margin:0; color:var(--text-color);">${res.title}</h4>
          <a href="${res.url}" target="_blank" rel="noopener" class="btn-primary" style="margin-top:auto; font-size:0.8rem; padding:6px 12px; justify-content:center; text-decoration:none;">
            <i data-lucide="${isDrive || isDoc ? 'hard-drive' : 'external-link'}"></i> ${iconLabel}
          </a>
        </div>
      </div>
    `;
  }

  renderSessionRow(session) {
    const isLive = session.status === "live";
    const date = new Date(session.scheduledAt);
    const formattedTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const formattedDate = date.toLocaleDateString([], { month: "short", day: "numeric" });

    return `
      <div style="background:var(--bg-card); border:1px solid ${isLive ? 'var(--success)' : 'var(--border-color)'}; padding:14px 18px; border-radius:var(--radius-sm); display:flex; justify-content:space-between; align-items:center; gap:16px;">
        <div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            ${isLive ? `<span class="session-tag live">${t("session.liveNow")}</span>` : `<span class="session-tag">${t("session.scheduled")}</span>`}
            <span style="font-size:0.75rem; color:var(--text-muted);">${session.duration} ${t("session.mins")}</span>
          </div>
          <strong style="font-size:0.9rem; color:var(--text-main);">${session.title}</strong>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">${formattedDate} ${t("session.at")} ${formattedTime}</div>
        </div>

        <div>
          ${isLive 
            ? `<a href="#classroom/${session.id}" class="btn-primary" style="background:var(--success); font-size:0.8rem; padding:6px 14px;"><i data-lucide="door-open"></i> ${t("session.joinClassroom")}</a>`
            : `<button class="btn-secondary" style="font-size:0.8rem; padding:6px 14px;" disabled>${t("session.scheduledFor")} ${formattedTime}</button>`
          }
        </div>
      </div>
    `;
  }

  renderVideoPlayer() {
    if (!this.currentLesson) return "";
    const isMp4 = this.currentLesson.videoUrl.endsWith(".mp4");
    if (isMp4) {
      return `
        <video id="course-video-element" controls autoplay style="width:100%;height:100%;">
          <source src="${this.currentLesson.videoUrl}" type="video/mp4">
          ${t("course.videoNotSupported")}
        </video>
      `;
    } else {
      return `
        <iframe src="${this.currentLesson.videoUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      `;
    }
  }

  bindEvents() {
    const rows = this.container.querySelectorAll(".lesson-item-row");
    rows.forEach(row => {
      row.addEventListener("click", (e) => {
        if (e.target.closest(".lesson-checkbox")) return;
        const lessonId = row.getAttribute("data-lesson-id");
        const selected = (this.course.lessons || []).find(l => l.id === lessonId);
        if (selected) { this.currentLesson = selected; this.render(); }
      });
    });

    const checkboxes = this.container.querySelectorAll(".lesson-checkbox");
    checkboxes.forEach(cb => {
      cb.addEventListener("click", async (e) => {
        e.stopPropagation();
        const lessonId = cb.getAttribute("data-lesson-id");
        const isCurrentlyChecked = cb.classList.contains("checked");
        cb.disabled = true;
        try {
          await apiFetch(`/student/enrollments/${this.courseId}/lessons/complete`, {
            method: "POST",
            body: JSON.stringify({ lessonId, complete: !isCurrentlyChecked })
          });
          showToast(isCurrentlyChecked ? t("toast.lessonIncomplete") : t("toast.lessonComplete"), "success");
          await this.render();
        } catch (err) { cb.disabled = false; }
      });
    });

    const tabBtns = this.container.querySelectorAll(".tab-btn");
    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");
        this.activeTab = tab;
        tabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const panes = this.container.querySelectorAll(".tab-content-pane");
        panes.forEach(p => p.classList.remove("active"));
        const targetPane = this.container.querySelector(`#pane-${tab}`);
        if (targetPane) targetPane.classList.add("active");
      });
    });

    const saveBtn = this.container.querySelector("#save-notes-btn");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        if (!this.currentLesson) return;
        const text = this.container.querySelector("#notes-textarea").value;
        localStorage.setItem(`notes_${state.user.id}_${this.currentLesson.id}`, text);
        showToast(t("toast.notesSaved"), "success");
      });
    }

    // Modal binding for teacher scheduling live session directly inside Course Page
    const sessionModal = this.container.querySelector("#course-session-modal");
    if (sessionModal) {
      this.container.querySelector("#open-course-session-modal-btn")?.addEventListener("click", () => {
        sessionModal.style.display = "flex";
      });
      this.container.querySelector("#close-course-session-modal")?.addEventListener("click", () => {
        sessionModal.style.display = "none";
      });
      this.container.querySelector("#cancel-course-session-modal")?.addEventListener("click", () => {
        sessionModal.style.display = "none";
      });

      this.container.querySelector("#create-course-session-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = this.container.querySelector("#course-session-title").value;
        const description = this.container.querySelector("#course-session-desc").value;
        const scheduledAt = this.container.querySelector("#course-session-date").value;
        const duration = parseInt(this.container.querySelector("#course-session-duration").value);

        try {
          await apiFetch("/sessions", {
            method: "POST",
            body: JSON.stringify({
              title,
              description,
              scheduledAt,
              duration,
              courseId: this.courseId
            })
          });
          showToast(t("toast.sessionScheduled"), "success");
          sessionModal.style.display = "none";
          this.activeTab = "sessions";
          await this.render();
        } catch (err) {}
      });
    }
  }

  loadNotes() {
    const textarea = this.container.querySelector("#notes-textarea");
    if (textarea && state.user && this.currentLesson) {
      const saved = localStorage.getItem(`notes_${state.user.id}_${this.currentLesson.id}`);
      textarea.value = saved || "";
    }
  }

  onDestroy() {
    const video = this.container.querySelector("#course-video-element");
    if (video) video.pause();
  }
}
