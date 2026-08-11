import { apiFetch, state, showToast, t, canJoinSession, validateSessionScheduledDate, getMinSessionDateTimeISO } from "../app.js";

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
      const [course, enrollments, sessions, resources, qaList, reviewsRes] = await Promise.all([
        apiFetch(`/courses/${this.courseId}`).catch(() => null),
        apiFetch("/student/enrollments").catch(() => []),
        apiFetch("/sessions").catch(() => []),
        apiFetch("/resources").catch(() => []),
        apiFetch(`/courses/${this.courseId}/qa`).catch(() => []),
        apiFetch(`/reviews/course/${this.courseId}`).catch(() => ({ reviews: [], totalReviews: 0, averageRating: 0 }))
      ]);

      this.course = course;
      if (!this.course) {
        this.container.innerHTML = `
          <div style="padding:100px 20px; text-align:center;">
            <i data-lucide="alert-circle" style="width:64px; height:64px; color:var(--error); margin-bottom:24px;"></i>
            <h2 style="font-size:1.8rem; margin-bottom:16px;">الدورة غير موجودة</h2>
            <p style="color:var(--text-muted); font-size:1rem; margin-bottom:24px;">تعذر العثور على الدورة المطلوبة أو تم حذفه.</p>
            <a href="#courses" class="btn-primary">العودة إلى قائمة الدورات</a>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      this.enrollment = Array.isArray(enrollments) ? enrollments.find(e => e.course?.id === this.courseId) : null;
      this.completedLessons = (this.enrollment && Array.isArray(this.enrollment.completedLessons)) ? this.enrollment.completedLessons : [];
      this.liveSessions = Array.isArray(sessions) ? sessions.filter(s => (s.course && s.course.id === this.courseId) || (!s.course && s.teacher?.id === this.course?.teacher?.id)) : [];
      this.courseResources = Array.isArray(resources) ? resources.filter(r => r.course && String(r.course.id) === String(this.courseId)) : [];
      this.qaList = Array.isArray(qaList) ? qaList : [];
      this.courseReviews = reviewsRes?.reviews || [];
      this.courseAvgRating = reviewsRes?.averageRating || 0;
      this.courseReviewsCount = reviewsRes?.totalReviews || 0;

      const allLessons = (this.course && Array.isArray(this.course.lessons)) ? this.course.lessons : [];
      const hasLessons = allLessons.length > 0;

      // If no recorded lessons yet but there are live sessions, default active tab to 'sessions'
      if (!hasLessons && this.liveSessions.length > 0) {
        this.activeTab = "sessions";
      }

      if (hasLessons && !this.currentLesson) {
        this.currentLesson = allLessons[0];
      }

      const chapters = {};
      if (hasLessons) {
        allLessons.forEach(lesson => {
          const chName = lesson.chapter || t("course.generalChapter");
          if (!chapters[chName]) chapters[chName] = [];
          chapters[chName].push(lesson);
        });
      }

      const totalLessonsCount = allLessons.length;
      const completedCount = allLessons.filter(l => Array.isArray(this.completedLessons) && this.completedLessons.includes(l.id)).length;
      const completionPercentage = totalLessonsCount > 0 ? Math.round((completedCount / totalLessonsCount) * 100) : 0;

      const currentIdx = allLessons.findIndex(l => l.id === this.currentLesson?.id);
      const nextLesson = (currentIdx >= 0 && currentIdx < allLessons.length - 1) ? allLessons[currentIdx + 1] : null;
      const isCurrentCompleted = (this.currentLesson && Array.isArray(this.completedLessons)) ? this.completedLessons.includes(this.currentLesson.id) : false;

      // Active live session if any
      const activeLiveSession = this.liveSessions.find(s => s.status === "live");
      const isTeacherOrAdmin = state.user && (state.user.role === "teacher" || state.user.role === "admin");

      // Block access if enrollment is pending or rejected (banned is handled below)
      if (!isTeacherOrAdmin && this.enrollment) {
        if (this.enrollment.status === 'pending') {
          this.container.innerHTML = `
            <div style="max-width:600px; margin:80px auto; padding:48px 32px; text-align:center;" class="glass-card">
              <div style="width:72px; height:72px; border-radius:20px; background:rgba(245,158,11,0.12); color:#f59e0b; display:flex; align-items:center; justify-content:center; margin:0 auto 20px auto;">
                <i data-lucide="clock" style="width:36px; height:36px;"></i>
              </div>
              <h2 style="font-size:1.8rem; font-weight:800; margin-bottom:12px; color:var(--text-main);">طلب التسجيل قيد الانتظار ⏳</h2>
              <p style="color:var(--text-muted); font-size:1rem; line-height:1.6; margin-bottom:28px;">طلب انضمامك إلى هذه الدورة قيد المراجعة والانتظار لموافقة المعلم. سنقوم بإبلاغك فور قبول الطلب.</p>
              <button onclick="window.location.hash='#courses'" class="btn-primary" style="margin:0 auto; padding:10px 24px; border-radius:30px; font-weight:800; display:inline-flex; align-items:center; gap:8px;">
                <i data-lucide="arrow-right" style="width:16px; height:16px;"></i> العودة إلى دوراتي التعليمية
              </button>
            </div>
          `;
          if (window.lucide) window.lucide.createIcons();
          return;
        }
        if (this.enrollment.status === 'rejected') {
          this.container.innerHTML = `
            <div style="max-width:600px; margin:80px auto; padding:48px 32px; text-align:center;" class="glass-card">
              <div style="width:72px; height:72px; border-radius:20px; background:rgba(239,68,68,0.12); color:#ef4444; display:flex; align-items:center; justify-content:center; margin:0 auto 20px auto;">
                <i data-lucide="x-circle" style="width:36px; height:36px;"></i>
              </div>
              <h2 style="font-size:1.8rem; font-weight:800; margin-bottom:12px; color:var(--text-main);">تم رفض طلب الانضمام ❌</h2>
              <p style="color:var(--text-muted); font-size:1rem; line-height:1.6; margin-bottom:28px;">نأسف، تم رفض طلب انضمامك لهذه الدورة من قبل المعلم. يمكنك استكشاف باقي الدورات المتاحة.</p>
              <button onclick="window.location.hash='#courses'" class="btn-primary" style="margin:0 auto; padding:10px 24px; border-radius:30px; font-weight:800; display:inline-flex; align-items:center; gap:8px;">
                <i data-lucide="arrow-right" style="width:16px; height:16px;"></i> العودة إلى دوراتي التعليمية
              </button>
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
                    <div style="font-size:0.8rem; color:var(--text-muted);">${t("course.instructedBy")} ${this.course?.teacher?.name || ''}</div>
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
                <h1 class="player-course-title">${this.course?.title || ''}</h1>
                <h3 class="player-lesson-title" id="active-lesson-heading">${this.currentLesson ? this.currentLesson.title : t("course.onlineSessionsTitle")}</h3>

                <div style="display:flex; justify-content:space-between; align-items:center; color:var(--text-muted); font-size:0.85rem; margin-top:8px;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <img src="${this.course?.teacher?.avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=Teacher"}" alt="Avatar" class="teacher-avatar">
                    <span>${t("course.instructedBy")} <strong>${this.course?.teacher?.name || t("course.instructor")}</strong></span>
                  </div>
                  ${this.currentLesson ? `<span style="font-weight:600; color:var(--primary); background:rgba(99,102,241,0.08); padding:4px 12px; border-radius:20px; border:1px solid var(--primary-glow);">⏱️ ${this.currentLesson.duration} ${t("course.minsDuration")}</span>` : ""}
                </div>
              </div>

              <!-- Lesson Focal Action Bar -->
              ${this.currentLesson ? `
                <div class="lesson-focal-action-bar" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:16px; padding:16px 20px; margin:16px 0 24px 0; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px; box-shadow:0 8px 30px rgba(0,0,0,0.06);">
                  <!-- Left: Completion & Next Lesson Buttons -->
                  <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                    <button class="lesson-completion-hero-btn ${isCurrentCompleted ? 'completed' : ''}" data-lesson-id="${this.currentLesson.id}" style="padding:10px 22px; border-radius:30px; font-weight:800; font-size:0.88rem; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:all 0.25s ease; ${isCurrentCompleted ? 'background:linear-gradient(135deg, #10b981, #059669); color:#fff; box-shadow:0 6px 20px rgba(16,185,129,0.35);' : 'background:linear-gradient(135deg, #6366f1, #4f46e5); color:#fff; box-shadow:0 6px 20px rgba(99,102,241,0.35);'}">
                      <i data-lucide="${isCurrentCompleted ? 'check-circle-2' : 'circle'}" style="width:18px;height:18px;"></i>
                      <span>${isCurrentCompleted ? 'تم إكمال هذا الدرس بنجاح ✓' : 'إكمال ومتابعة الدرس'}</span>
                    </button>

                    ${nextLesson ? `
                      <button class="btn-secondary next-lesson-btn" data-lesson-id="${nextLesson.id}" style="padding:10px 18px; border-radius:30px; font-size:0.85rem; font-weight:700; border-color:var(--primary-glow); display:inline-flex; align-items:center; gap:6px;">
                        <span>الدرس التالي</span>
                        <i data-lucide="arrow-left" style="width:16px;height:16px;"></i>
                      </button>
                    ` : ''}
                  </div>

                  <!-- Right: Quick Content Shortcuts -->
                  <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    ${this.currentLesson.notes ? `
                      <button class="focal-shortcut-btn switch-tab-shortcut" data-tab="notes" style="background:rgba(245,158,11,0.1); color:var(--accent); border:1px solid rgba(245,158,11,0.3); padding:6px 14px; border-radius:20px; font-size:0.78rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                        <i data-lucide="bookmark" style="width:14px;height:14px;"></i> ملاحظات المعلم
                      </button>
                    ` : ''}

                    ${this.currentLesson.resourceUrl ? `
                      <button class="focal-shortcut-btn switch-tab-shortcut" data-tab="details" style="background:rgba(99,102,241,0.1); color:var(--primary); border:1px solid var(--primary-glow); padding:6px 14px; border-radius:20px; font-size:0.78rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                        <i data-lucide="paperclip" style="width:14px;height:14px;"></i> المورد المرفق
                      </button>
                    ` : ''}

                    ${(this.currentLesson.questions || []).length > 0 ? `
                      <button class="focal-shortcut-btn switch-tab-shortcut" data-tab="quiz" style="background:rgba(16,185,129,0.1); color:var(--success); border:1px solid rgba(16,185,129,0.3); padding:6px 14px; border-radius:20px; font-size:0.78rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                        <i data-lucide="help-circle" style="width:14px;height:14px;"></i> أسئلة الدرس (${(this.currentLesson.questions || []).length})
                      </button>
                    ` : ''}
                  </div>
                </div>
              ` : ''}

              <!-- Tabs -->
              <div class="tabs-header">
                <button class="tab-btn ${this.activeTab === "details" ? "active" : ""}" data-tab="details">
                  <i data-lucide="info"></i> ${t("course.tabDetails")}
                </button>
                <button class="tab-btn ${this.activeTab === "notes" ? "active" : ""}" data-tab="notes">
                  <i data-lucide="file-text"></i> ${t("course.tabNotes")}
                </button>
                <button class="tab-btn ${this.activeTab === "quiz" ? "active" : ""}" data-tab="quiz">
                  <i data-lucide="help-circle"></i> أسئلة الدرس (${(this.currentLesson?.questions || []).length})
                </button>
                <button class="tab-btn ${this.activeTab === "resources" ? "active" : ""}" data-tab="resources">
                  <i data-lucide="folder-open"></i> الموارد التعليمية (${this.courseResources.length})
                </button>
                <button class="tab-btn ${this.activeTab === "sessions" ? "active" : ""}" data-tab="sessions">
                  <i data-lucide="video"></i> ${t("course.tabLiveSessions")} (${this.liveSessions.length})
                </button>
                <button class="tab-btn ${this.activeTab === "qa" ? "active" : ""}" data-tab="qa">
                  <i data-lucide="message-square"></i> ${t("course.tabQA")} (${(this.qaList || []).length})
                </button>
                <button class="tab-btn ${this.activeTab === "reviews" ? "active" : ""}" data-tab="reviews">
                  <i data-lucide="star"></i> التقييمات والمراجعات ⭐ (${this.courseReviewsCount || 0})
                </button>
              </div>

              <!-- Details Pane -->
              <div class="tab-content-pane ${this.activeTab === "details" ? "active" : ""}" id="pane-details">
                ${this.currentLesson?.photo ? `
                  <div style="margin-bottom:20px; background:var(--bg-card); padding:18px; border-radius:18px; border:1px solid var(--border-color); box-shadow:0 8px 30px rgba(0,0,0,0.06);">
                    <div style="font-size:0.95rem; font-weight:800; color:var(--text-color); margin-bottom:12px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                      <span style="display:flex; align-items:center; gap:8px;">
                        <i data-lucide="image" style="color:var(--primary); width:20px; height:20px;"></i>
                        صورة / ملخص الدرس المرفق (${this.currentLesson.title})
                      </span>
                      <a href="${this.currentLesson.photo}" target="_blank" rel="noopener" class="btn-secondary" style="font-size:0.8rem; padding:6px 14px; border-radius:20px; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                        <i data-lucide="external-link" style="width:14px;height:14px;"></i> تكبير وتنزيل الصورة
                      </a>
                    </div>
                    <div style="border-radius:14px; overflow:hidden; border:1px solid var(--border-color); background:rgba(0,0,0,0.03); text-align:center; padding:10px;">
                      <img src="${this.currentLesson.photo}" alt="ملخص الدرس" style="max-width:100%; max-height:500px; object-fit:contain; border-radius:10px; cursor:pointer;" onclick="window.open('${this.currentLesson.photo}', '_blank')">
                    </div>
                  </div>
                ` : ''}

                ${this.currentLesson?.resourceUrl ? `
                  <div style="margin-bottom:20px; background:rgba(99,102,241,0.06); padding:16px; border-radius:14px; border:1px solid var(--primary-glow); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                      <i data-lucide="paperclip" style="color:var(--primary); width:22px; height:22px; flex-shrink:0;"></i>
                      <div>
                        <strong style="font-size:0.95rem; color:var(--text-main); display:block;">${this.currentLesson.resourceTitle || 'الملف المرفق الخاص بالدرس'}</strong>
                        <span style="font-size:0.8rem; color:var(--text-muted);">مورد تعليمي خاص بهذا الدرس (PDF / Google Drive)</span>
                      </div>
                    </div>
                    <a href="${this.currentLesson.resourceUrl}" target="_blank" rel="noopener" class="btn-primary" style="font-size:0.82rem; padding:8px 16px; text-decoration:none;">
                      <i data-lucide="external-link"></i> فتح وتنزيل المورد
                    </a>
                  </div>
                ` : ''}

                <div style="font-size:1rem; line-height:1.7; color:var(--text-main); margin-bottom:20px; white-space:pre-wrap;">
                  ${this.currentLesson ? (this.currentLesson.description || t("course.noDescription")) : (this.course.description || t("course.noDescription"))}
                </div>

          
              </div>

              <!-- Notes Pane -->
              <div class="tab-content-pane ${this.activeTab === "notes" ? "active" : ""}" id="pane-notes">
                ${this.currentLesson?.notes ? `
                  <div style="margin-bottom:20px; background:rgba(245,158,11,0.08); border:1px solid var(--accent); border-radius:14px; padding:16px;">
                    <h4 style="font-size:0.95rem; font-weight:800; color:var(--accent); margin:0 0 8px 0; display:flex; align-items:center; gap:6px;">
                      <i data-lucide="bookmark" style="width:18px;height:18px;"></i> ملاحظات ونقاط استذكار من المعلم
                    </h4>
                    <div style="font-size:0.9rem; line-height:1.6; color:var(--text-main); white-space:pre-wrap;">${this.currentLesson.notes}</div>
                  </div>
                ` : ''}

                <p style="margin-bottom: 12px; font-weight:700; font-size:0.9rem;">${t("course.notesHint")}</p>
                <textarea id="notes-textarea" class="form-input" style="width: 100%; height: 120px; font-family: inherit; resize: vertical; margin-bottom: 12px; padding:12px;" placeholder="${t("course.notesPlaceholder")}"></textarea>
                <button class="btn-primary" id="save-notes-btn" style="font-size:0.85rem; padding:8px 16px;">${t("course.saveNotes")}</button>
              </div>

              <!-- Quiz Questions Pane -->
              <div class="tab-content-pane ${this.activeTab === "quiz" ? "active" : ""}" id="pane-quiz">
                ${this.renderLessonQuizSection()}
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

                ${this.liveSessions.length === 0
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

              <!-- Q&A Pane -->
              <div class="tab-content-pane ${this.activeTab === "qa" ? "active" : ""}" id="pane-qa">
                ${this.renderQAPane()}
              </div>

              <!-- Reviews & Ratings Pane -->
              <div class="tab-content-pane ${this.activeTab === "reviews" ? "active" : ""}" id="pane-reviews">
                ${this.renderReviewsPane()}
              </div>
            </div>
          </div>

          <!-- Sidebar Curriculum -->
          <div class="sidebar-curriculum" style="background:var(--bg-card); border-radius:18px; border:1px solid var(--border-color); padding:20px; box-shadow:0 8px 30px rgba(0,0,0,0.04);">
            <div style="margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:16px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <h3 class="curriculum-title" style="margin:0; font-size:1.05rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                  <i data-lucide="book-open" style="color:var(--primary); width:20px; height:20px;"></i>
                  ${t("course.curriculum")}
                </h3>
                <span style="font-size:0.8rem; font-weight:800; color:var(--primary); background:rgba(99,102,241,0.08); padding:3px 10px; border-radius:12px; border:1px solid var(--primary-glow);">${completionPercentage}% مكتمل</span>
              </div>
              <div style="width:100%; height:8px; background:rgba(0,0,0,0.05); border-radius:10px; overflow:hidden; border:1px solid var(--border-color);">
                <div style="width:${completionPercentage}%; height:100%; background:linear-gradient(90deg, var(--primary), var(--success)); transition:width 0.4s ease;"></div>
              </div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:6px; display:flex; justify-content:space-between;">
                <span>تم إكمال ${completedCount} من ${totalLessonsCount} درس</span>
              </div>
            </div>

            ${hasLessons ? Object.keys(chapters).map(chName => {
          const chLessons = chapters[chName] || [];
          const chCompleted = chLessons.filter(l => this.completedLessons.includes(l.id)).length;
          return `
                <div class="chapter-group" style="margin-bottom:16px;">
                  <div class="chapter-header-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <h4 class="chapter-header" style="font-size:0.9rem; font-weight:800; color:var(--text-main); margin:0;">${chName}</h4>
                    <span style="font-size:0.72rem; font-weight:700; color:var(--text-muted);">${chCompleted}/${chLessons.length}</span>
                  </div>

                  <div class="lesson-list-items" style="display:flex; flex-direction:column; gap:8px;">
                    ${chLessons.map(lesson => {
            const isActive = this.currentLesson && lesson.id === this.currentLesson.id;
            const isChecked = this.completedLessons.includes(lesson.id);
            return `
                        <div class="lesson-item-row ${isActive ? "active" : ""} ${isChecked ? "completed" : ""}" data-lesson-id="${lesson.id}" style="padding:12px; border-radius:12px; border:1px solid ${isActive ? 'var(--primary)' : 'var(--border-color)'}; background:${isActive ? 'rgba(99,102,241,0.08)' : 'var(--bg-app)'}; cursor:pointer; transition:all 0.2s ease; ${isActive ? 'box-shadow:0 4px 16px rgba(99,102,241,0.15);' : ''}">
                          <div class="lesson-item-left" style="display:flex; align-items:center; gap:10px; flex-grow:1;">
                            <div class="lesson-checkbox ${isChecked ? "checked" : ""}" data-lesson-id="${lesson.id}" style="flex-shrink:0;">
                              ${isChecked ? '<i data-lucide="check" style="width:14px;height:14px;"></i>' : ""}
                            </div>
                            <div class="lesson-item-title-meta" style="display:flex; flex-direction:column; gap:2px; overflow:hidden;">
                              <span class="lesson-item-title" style="font-size:0.86rem; font-weight:${isActive ? '800' : '600'}; color:${isActive ? 'var(--primary)' : 'var(--text-main)'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                ${isActive ? '▶ ' : ''}${lesson.title}
                              </span>
                              <div style="display:flex; align-items:center; gap:6px; font-size:0.73rem; color:var(--text-muted);">
                                <span>⏱️ ${lesson.duration} ${t("session.mins")}</span>
                                ${(lesson.questions || []).length > 0 ? '<span style="color:var(--success); font-weight:700;">• ❓ اختبار</span>' : ''}
                                ${lesson.resourceUrl ? '<span style="color:var(--primary); font-weight:700;">• 📎 ملف</span>' : ''}
                              </div>
                            </div>
                          </div>
                          <i data-lucide="${isActive ? 'play-circle' : 'play'}" style="width:16px;height:16px;color:${isActive ? 'var(--primary)' : 'var(--text-muted)'}; opacity:${isActive ? "1" : "0.4"}; flex-shrink:0;"></i>
                        </div>
                      `;
          }).join("")}
                  </div>
                </div>
              `;
        }).join("") : `
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
    const isJoinable = isLive || canJoinSession(session);
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
          ${isJoinable
            ? `<a href="${session.course?.meetingLink || session.teacher?.meetingLink || '#classroom/' + session.id}" target="_blank" class="btn-primary" style="background:var(--success); font-size:0.8rem; padding:6px 14px;"><i data-lucide="door-open"></i> دخول البث المباشر 🎥</a>`
            : `<button class="btn-secondary restricted-join-btn" style="font-size:0.8rem; padding:6px 14px; opacity:0.9; cursor:pointer;" title="متاح الانضمام قبل الموعد بـ 30 دقيقة فقط"><i data-lucide="lock" style="width:13px;height:13px;margin-inline-end:4px;"></i> قبل الموعد بـ 30د 🔒</button>`
          }
        </div>
      </div>
    `;
  }

  renderReviewsPane() {
    const reviews = this.courseReviews || [];
    const averageRating = this.courseAvgRating || 0;
    const totalCount = this.courseReviewsCount || reviews.length;

    return `
      <div class="glass-card" style="padding:24px; border-radius:18px; margin-bottom:24px; border:1px solid var(--border-color);">
        <!-- Rating Overview Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px; border-bottom:1px solid var(--border-color); padding-bottom:20px; margin-bottom:24px;">
          <div>
            <h3 style="font-size:1.3rem; font-weight:800; margin:0 0 6px 0; display:flex; align-items:center; gap:8px;">
              <i data-lucide="star" style="color:#f59e0b; fill:#f59e0b; width:24px; height:24px;"></i>
              تقييمات وآراء الطلاب في هذه الدورة
            </h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">شاركونا تجربتكم وتقييمكم لمستوى الشرح والمحتوى العلمي.</p>
          </div>
          <div style="text-align:center; background:rgba(245,158,11,0.08); padding:12px 24px; border-radius:16px; border:1px solid rgba(245,158,11,0.2);">
            <div style="font-size:2.2rem; font-weight:900; color:#f59e0b; line-height:1;">${averageRating > 0 ? averageRating : '5.0'}</div>
            <div style="font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-top:4px;">من 5 نجوم • (${totalCount} تقييم)</div>
          </div>
        </div>

        <!-- Add Review Form for Student -->
        ${state.user ? `
          <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:16px; padding:20px; margin-bottom:28px;">
            <h4 style="font-size:1rem; font-weight:800; margin:0 0 12px 0;">أضف تقييمك ومراجعتك للدورة ✍️</h4>
            <form id="submit-course-review-form">
              <div style="margin-bottom:16px;">
                <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:8px;">اختر عدد النجوم (1 إلى 5):</label>
                <div class="star-rating-selector" style="display:flex; gap:8px; align-items:center;">
                  ${[1, 2, 3, 4, 5].map(star => `
                    <button type="button" class="star-rating-btn" data-star="${star}" style="background:none; border:none; cursor:pointer; padding:4px;">
                      <i data-lucide="star" class="star-icon" data-star="${star}" style="width:28px; height:28px; color:${star <= 5 ? '#f59e0b' : 'var(--border-color)'}; ${star <= 5 ? 'fill:#f59e0b;' : ''}"></i>
                    </button>
                  `).join('')}
                </div>
                <input type="hidden" id="selected-rating-val" value="5">
              </div>

              <div style="margin-bottom:16px;">
                <label for="review-comment-text" style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">اكتب رأيك وتجربتك بالتفصيل:</label>
                <textarea id="review-comment-text" class="form-input" style="width:100%; height:90px; resize:vertical; padding:12px;" placeholder="اشرح لنا مدى استفادتك من الشرح والتمارين وسهولة التواصل مع المعلم..." required></textarea>
              </div>

              <button type="submit" class="btn-primary" style="font-size:0.9rem; padding:10px 20px;">
                <i data-lucide="send"></i> نشر التقييم الآن
              </button>
            </form>
          </div>
        ` : `
          <div style="text-align:center; padding:20px; background:var(--bg-app); border-radius:14px; border:1px solid var(--border-color); margin-bottom:24px;">
            <p style="margin:0; font-size:0.9rem; color:var(--text-muted);">يرجى <a href="#login" style="color:var(--primary); font-weight:800;">تسجيل الدخول كطالب</a> لإضافة تقييمك لهذه الدورة.</p>
          </div>
        `}

        <!-- Reviews List -->
        <div style="display:flex; flex-direction:column; gap:16px;">
          ${reviews.length === 0 ? `
            <div style="text-align:center; padding:40px; color:var(--text-muted);">
              <i data-lucide="star" style="width:40px; height:40px; opacity:0.3; margin-bottom:8px;"></i>
              <p style="margin:0;">لا توجد تقييمات مضافة لهذه الدورة حتى الآن. كُن أول من يشارك رأيه!</p>
            </div>
          ` : reviews.map(r => `
            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:14px; padding:16px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                <div style="display:flex; align-items:center; gap:12px;">
                  <img src="${r.student?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.student?.id || 'std'}`}" style="width:42px; height:42px; border-radius:50%; border:2px solid var(--primary); object-fit:cover;">
                  <div>
                    <strong style="font-size:0.92rem; color:var(--text-main); display:block;">${r.student?.name || 'طالب مسجل'}</strong>
                    <span style="font-size:0.75rem; color:var(--text-muted);">${new Date(r.createdAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
                <div style="display:flex; gap:2px; background:rgba(245,158,11,0.12); padding:4px 10px; border-radius:12px;">
                  ${Array.from({ length: 5 }).map((_, i) => `
                    <i data-lucide="star" style="width:14px; height:14px; color:${i < r.rating ? '#f59e0b' : 'var(--border-color)'}; ${i < r.rating ? 'fill:#f59e0b;' : ''}"></i>
                  `).join('')}
                </div>
              </div>
              <p style="font-size:0.88rem; color:var(--text-main); margin:0; line-height:1.5; white-space:pre-wrap;">${r.comment}</p>
            </div>
          `).join('')}
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

    // Hero Completion Button Event Listener
    const heroCompleteBtn = this.container.querySelector(".lesson-completion-hero-btn");
    if (heroCompleteBtn) {
      heroCompleteBtn.addEventListener("click", async () => {
        const lessonId = heroCompleteBtn.getAttribute("data-lesson-id");
        const isCurrentlyChecked = heroCompleteBtn.classList.contains("completed");
        heroCompleteBtn.disabled = true;
        try {
          await apiFetch(`/student/enrollments/${this.courseId}/lessons/complete`, {
            method: "POST",
            body: JSON.stringify({ lessonId, complete: !isCurrentlyChecked })
          });
          showToast(isCurrentlyChecked ? t("toast.lessonIncomplete") : t("toast.lessonComplete"), "success");
          await this.render();
        } catch (err) { heroCompleteBtn.disabled = false; }
      });
    }

    // Next Lesson Navigation Button
    const nextLessonBtn = this.container.querySelector(".next-lesson-btn");
    if (nextLessonBtn) {
      nextLessonBtn.addEventListener("click", () => {
        const nextId = nextLessonBtn.getAttribute("data-lesson-id");
        const targetLesson = (this.course.lessons || []).find(l => l.id === nextId);
        if (targetLesson) {
          this.currentLesson = targetLesson;
          this.render();
        }
      });
    }

    // Focal Shortcut Buttons (jump directly to tabs)
    this.container.querySelectorAll(".switch-tab-shortcut").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetTab = btn.getAttribute("data-tab");
        if (targetTab) {
          this.activeTab = targetTab;
          const tabBtns = this.container.querySelectorAll(".tab-btn");
          tabBtns.forEach(b => b.classList.remove("active"));
          const activeTabBtn = this.container.querySelector(`.tab-btn[data-tab="${targetTab}"]`);
          if (activeTabBtn) activeTabBtn.classList.add("active");

          const panes = this.container.querySelectorAll(".tab-content-pane");
          panes.forEach(p => p.classList.remove("active"));
          const targetPane = this.container.querySelector(`#pane-${targetTab}`);
          if (targetPane) targetPane.classList.add("active");
        }
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

    // Quiz Answer Check Handlers
    this.container.querySelectorAll(".check-lesson-q-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const qIdx = parseInt(e.currentTarget.getAttribute("data-qindex"));
        const questions = this.currentLesson?.questions || [];
        const q = questions[qIdx];
        if (!q) return;

        const selectedRadio = this.container.querySelector(`input[name="lesson_q_${qIdx}"]:checked`);
        const feedbackBox = this.container.querySelector(`#quiz-feedback-${qIdx}`);
        if (!feedbackBox) return;

        if (!selectedRadio) {
          showToast("يرجى اختيار إجابة أولاً.", "warning");
          return;
        }

        const selectedVal = selectedRadio.value;
        const correctVal = q.correctAnswer;
        const isCorrect = String(selectedVal) === String(correctVal) || (q.options && q.options[selectedVal] === correctVal);

        feedbackBox.style.display = "block";
        if (isCorrect) {
          feedbackBox.style.background = "rgba(16,185,129,0.12)";
          feedbackBox.style.border = "1px solid var(--success)";
          feedbackBox.style.color = "var(--success)";
          feedbackBox.innerHTML = `<strong>إجابة صحيحة! 🎉 أحسنت.</strong> ${q.explanation ? `<br><span style="color:var(--text-main); font-size:0.85rem; display:block; margin-top:4px;">💡 الشرح: ${q.explanation}</span>` : ''}`;
        } else {
          feedbackBox.style.background = "rgba(239,68,68,0.12)";
          feedbackBox.style.border = "1px solid var(--error)";
          feedbackBox.style.color = "var(--error)";
          feedbackBox.innerHTML = `<strong>إجابة خاطئة ❌ حاول مرة أخرى.</strong> ${q.explanation ? `<br><span style="color:var(--text-main); font-size:0.85rem; display:block; margin-top:4px;">💡 الشرح: ${q.explanation}</span>` : ''}`;
        }
      });
    });

    // Modal binding for teacher scheduling live session directly inside Course Page
    const sessionModal = this.container.querySelector("#course-session-modal");
    if (sessionModal) {
      this.container.querySelector("#btn-add-course-session")?.addEventListener("click", () => {
        const dateInput = this.container.querySelector("#course-session-date");
        if (dateInput) dateInput.min = getMinSessionDateTimeISO();
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

        const validation = validateSessionScheduledDate(scheduledAt);
        if (!validation.valid) {
          showToast(validation.errorMsg, "error");
          return;
        }

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
        } catch (err) { }
      });
    } // end if (sessionModal)

    // --- Q&A SYSTEM EVENT BINDINGS ---
    this.container.querySelector("#ask-qa-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = this.container.querySelector("#qa-question-input");
      const questionText = input ? input.value.trim() : "";
      if (!questionText) return;

      try {
        await apiFetch(`/courses/${this.courseId}/qa`, {
          method: "POST",
          body: JSON.stringify({ questionText, lessonId: this.currentLesson?.id })
        });
        showToast("تم نشر سؤالك للمعلم بنجاح! ✅", "success");
        this.activeTab = "qa";
        await this.render();
      } catch (err) { console.error(err); }
    });

    // --- REVIEWS & RATINGS EVENT BINDINGS ---
    const starBtns = this.container.querySelectorAll(".star-rating-btn");
    const ratingInput = this.container.querySelector("#selected-rating-val");

    starBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const star = parseInt(btn.getAttribute("data-star"), 10);
        if (ratingInput) ratingInput.value = star;

        starBtns.forEach(b => {
          const s = parseInt(b.getAttribute("data-star"), 10);
          const icon = b.querySelector(".star-icon");
          if (icon) {
            if (s <= star) {
              icon.style.color = "#f59e0b";
              icon.style.fill = "#f59e0b";
            } else {
              icon.style.color = "var(--border-color)";
              icon.style.fill = "none";
            }
          }
        });
      });
    });

    this.container.querySelector("#submit-course-review-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const rating = parseInt(this.container.querySelector("#selected-rating-val")?.value || "5", 10);
      const comment = this.container.querySelector("#review-comment-text")?.value || "";

      try {
        await apiFetch("/reviews", {
          method: "POST",
          body: JSON.stringify({ rating, comment, courseId: this.courseId })
        });
        showToast("تم نشر تقييمك ومراجعتك بنجاح! ⭐", "success");
        this.activeTab = "reviews";
        await this.render();
      } catch (err) {
        showToast(err.message || "فشل إرسال التقييم", "error");
      }
    });

    this.container.querySelectorAll(".toggle-answer-form-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const qaId = btn.getAttribute("data-id");
        const form = this.container.querySelector(`#qa-answer-form-${qaId}`);
        if (form) {
          form.style.display = form.style.display === "none" ? "flex" : "none";
        }
      });
    });

    this.container.querySelectorAll(".cancel-answer-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const qaId = btn.getAttribute("data-id");
        const form = this.container.querySelector(`#qa-answer-form-${qaId}`);
        if (form) form.style.display = "none";
      });
    });

    this.container.querySelectorAll(".qa-answer-form").forEach(form => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const qaId = form.getAttribute("data-id");
        const answerInput = form.querySelector(".qa-answer-input");
        const answerText = answerInput ? answerInput.value.trim() : "";
        if (!answerText) return;

        try {
          await apiFetch(`/qa/${qaId}/answers`, {
            method: "POST",
            body: JSON.stringify({ answerText })
          });
          showToast("تم إرسال إجابة المعلم بنجاح! ✅", "success");
          this.activeTab = "qa";
          await this.render();
        } catch (err) { console.error(err); }
      });
    });

    this.container.querySelectorAll(".delete-qa-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const qaId = btn.getAttribute("data-id");
        const confirmed = await confirmDialog({ message: "هل أنت تأكد من حذف هذا السؤال؟", danger: true });
        if (!confirmed) return;

        try {
          await apiFetch(`/qa/${qaId}`, { method: "DELETE" });
          showToast("تم حذف السؤال بنجاح.", "success");
          this.activeTab = "qa";
          await this.render();
        } catch (err) { console.error(err); }
      });
    });
  }

  renderQAPane() {
    const isTeacherOrAdmin = state.user && (state.user.role === "teacher" || state.user.role === "admin");
    const qaList = this.qaList || [];

    return `
      <div style="display:flex; flex-direction:column; gap:20px;">
        <!-- Ask Question Form -->
        <div class="glass-card" style="padding:20px; border-radius:14px; border:1px solid var(--border-color);">
          <h4 style="font-weight:800; font-size:1rem; margin:0 0 10px 0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
            <i data-lucide="help-circle" style="color:var(--primary); width:20px; height:20px;"></i>
            طرح سؤال جديد للمعلم
          </h4>
          <form id="ask-qa-form">
            <textarea id="qa-question-input" class="form-input" rows="3" placeholder="اكتب سؤالك هنا للمعلم بشكل واضح..." required style="width:100%; padding:12px; font-family:inherit; resize:vertical; margin-bottom:10px;"></textarea>
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
              <span style="font-size:0.8rem; color:var(--text-muted);">
                ${this.currentLesson ? `📌 ربط بالدرس الحالي: <strong>${this.currentLesson.title}</strong>` : 'سؤال عام عن الدورة'}
              </span>
              <button type="submit" class="btn-primary" style="font-size:0.85rem; padding:8px 20px; font-weight:800;">
                <i data-lucide="send"></i> إرسال السؤال
              </button>
            </div>
          </form>
        </div>

        <!-- Questions & Answers List -->
        <div style="display:flex; flex-direction:column; gap:16px;">
          <h4 style="font-weight:800; font-size:1.05rem; color:var(--text-main); margin:0;">
            <i data-lucide="message-square" style="color:var(--primary); width:20px; height:20px; vertical-align:middle; margin-inline-end:6px;"></i>
            الأسئلة والأجوبة السابقة (${qaList.length})
          </h4>

          ${qaList.length === 0 ? `
            <div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted);">
              <i data-lucide="message-square" style="width:48px; height:48px; margin-bottom:12px; opacity:0.4;"></i>
              <p>لا توجد أسئلة مطروحة في هذه الدورة حتى الآن. كن أول من يطرح سؤالاً!</p>
            </div>
          ` : qaList.map(qa => {
      const isOwnerStudent = state.user && qa.student && String(qa.student.id) === String(state.user.id);
      const isCourseTeacherOrAdmin = isTeacherOrAdmin;
      const formattedDate = qa.createdAt ? new Date(qa.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

      return `
              <div class="glass-card qa-card-item" style="padding:18px; border-radius:14px; border:1px solid var(--border-color); display:flex; flex-direction:column; gap:12px;">
                <!-- Student Question Header -->
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${qa.student?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (qa.student?.name || 'Student')}" style="width:38px; height:38px; border-radius:50%; border:2px solid var(--primary);">
                    <div>
                      <strong style="font-size:0.95rem; color:var(--text-main); display:block;">${qa.student?.name || 'طالب'}</strong>
                      <span style="font-size:0.75rem; color:var(--text-muted);">${formattedDate}</span>
                    </div>
                  </div>
                  
                  <div style="display:flex; align-items:center; gap:8px;">
                    ${qa.lesson ? `<span style="background:rgba(99,102,241,0.08); color:var(--primary); padding:3px 10px; border-radius:12px; font-size:0.75rem; font-weight:700;">📖 ${qa.lesson.title}</span>` : ''}
                    ${(isCourseTeacherOrAdmin || isOwnerStudent) ? `
                      <button class="delete-qa-btn" data-id="${qa.id}" style="background:none; border:none; color:var(--error); cursor:pointer; font-size:0.8rem; font-weight:700; padding:4px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:4px;" title="حذف السؤال">
                        <i data-lucide="trash-2" style="width:14px;height:14px;"></i> حذف
                      </button>
                    ` : ''}
                  </div>
                </div>

                <!-- Question Text -->
                <div style="font-size:0.95rem; line-height:1.6; color:var(--text-main); font-weight:600; padding-inline-start:48px;">
                  ${qa.questionText}
                </div>

                <!-- Teacher Response (If Answered) -->
                ${qa.answerText ? `
                  <div style="background:rgba(16,185,129,0.06); border-inline-start:3px solid var(--success); border-radius:10px; padding:14px; margin-inline-start:36px; display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <img src="${qa.teacher?.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Teacher'}" style="width:28px; height:28px; border-radius:50%; border:1px solid var(--success);">
                        <strong style="font-size:0.88rem; color:var(--success);">${qa.teacher?.name || 'المعلم'} <span style="font-size:0.75rem; background:var(--success); color:#fff; padding:2px 8px; border-radius:10px; margin-inline-start:4px;">المعلم</span></strong>
                      </div>
                    </div>
                    <div style="font-size:0.9rem; line-height:1.6; color:var(--text-main); white-space:pre-wrap;">
                      ${qa.answerText}
                    </div>
                  </div>
                ` : ''}

                <!-- Teacher Reply Actions (For Teachers/Admins) -->
                ${isCourseTeacherOrAdmin ? `
                  <div style="padding-inline-start:48px;">
                    <button class="btn-secondary toggle-answer-form-btn" data-id="${qa.id}" style="font-size:0.8rem; padding:6px 14px; border-color:var(--primary); color:var(--primary); font-weight:700;">
                      <i data-lucide="message-circle"></i> ${qa.answerText ? 'تعديل الإجابة' : 'إضافة إجابة للمعلم'}
                    </button>

                    <form class="qa-answer-form" id="qa-answer-form-${qa.id}" data-id="${qa.id}" style="display:none; margin-top:10px; flex-direction:column; gap:8px;">
                      <textarea class="form-input qa-answer-input" rows="3" placeholder="اكتب إجابتك الواضحة للطالب..." required style="padding:10px; font-family:inherit; resize:vertical;">${qa.answerText || ''}</textarea>
                      <div style="display:flex; justify-content:flex-end; gap:8px;">
                        <button type="button" class="btn-secondary cancel-answer-btn" data-id="${qa.id}" style="font-size:0.78rem; padding:6px 12px;">إلغاء</button>
                        <button type="submit" class="btn-primary" style="font-size:0.78rem; padding:6px 16px; font-weight:700;">حفظ الإجابة</button>
                      </div>
                    </form>
                  </div>
                ` : ''}

              </div>
            `;
    }).join("")}
        </div>
      </div>
    `;
  }

  renderLessonQuizSection() {
    const questions = this.currentLesson?.questions || [];
    if (questions.length === 0) {
      return `
        <div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted);">
          <i data-lucide="help-circle" style="width:48px; height:48px; margin-bottom:12px; opacity:0.4;"></i>
          <h4 style="font-weight:700; margin-bottom:6px;">لا توجد أسئلة مرفقة بهذا الدرس حتى الآن</h4>
          <p style="font-size:0.88rem;">يسعدنا متابعتك للدرس! يمكنك تدوين ملاحظاتك أو الاطلاع على شرح وموارد الدرس.</p>
        </div>
      `;
    }

    return `
      <div style="display:flex; flex-direction:column; gap:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <h4 style="font-weight:800; font-size:1.05rem; color:var(--text-main); margin:0;">
            <i data-lucide="help-circle" style="color:var(--primary); width:20px; height:20px; vertical-align:middle; margin-inline-end:6px;"></i>
            اختبر فهمك لمحتوى الدرس (${questions.length} أسئلة)
          </h4>
        </div>

        <div style="display:flex; flex-direction:column; gap:16px;">
          ${questions.map((q, qIdx) => {
      const opts = q.options || [];
      return `
              <div class="glass-card lesson-quiz-item" data-qindex="${qIdx}" style="padding:20px; border-radius:14px; border:1px solid var(--border-color);">
                <div style="font-weight:800; font-size:1rem; margin-bottom:14px; color:var(--text-main); line-height:1.5;">
                  <span style="color:var(--primary); margin-inline-end:8px;">س${qIdx + 1}:</span> ${q.questionText}
                </div>

                <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:14px;">
                  ${opts.filter(o => o && o.trim()).map((opt, optIdx) => `
                    <label class="quiz-option-label" style="display:flex; align-items:center; gap:10px; padding:10px 14px; background:var(--bg-app); border:1px solid var(--border-color); border-radius:10px; cursor:pointer; font-size:0.9rem;">
                      <input type="radio" name="lesson_q_${qIdx}" value="${optIdx}" style="accent-color:var(--primary);">
                      <span>${opt}</span>
                    </label>
                  `).join("")}
                </div>

                <div class="quiz-feedback-box" id="quiz-feedback-${qIdx}" style="display:none; padding:12px; border-radius:10px; font-size:0.88rem; margin-bottom:12px;"></div>

                <button class="btn-primary check-lesson-q-btn" data-qindex="${qIdx}" style="font-size:0.82rem; padding:6px 16px;">
                  التحقق من الإجابة
                </button>
              </div>
            `;
    }).join("")}
        </div>
      </div>
    `;
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
