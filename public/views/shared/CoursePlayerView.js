import { apiFetch, state, showToast, t, canJoinSession, validateSessionScheduledDate, getMinSessionDateTimeISO } from "../../app.js";

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
      const [course, enrollments, sessions, resources, qaList, reviewsRes, assignments] = await Promise.all([
        apiFetch(`/courses/${this.courseId}`).catch(() => null),
        apiFetch("/student/enrollments").catch(() => []),
        apiFetch("/sessions").catch(() => []),
        apiFetch("/resources").catch(() => []),
        apiFetch(`/courses/${this.courseId}/qa`).catch(() => []),
        apiFetch(`/reviews/course/${this.courseId}`).catch(() => ({ reviews: [], totalReviews: 0, averageRating: 0 })),
        apiFetch("/assignments").catch(() => [])
      ]);

      this.courseAssignments = (assignments || []).filter(a => a.course?.id === this.courseId || (a.course && String(a.course.id) === String(this.courseId)));
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
      this.liveSessions = Array.isArray(sessions) ? sessions.filter(s => s.course && String(s.course.id) === String(this.courseId)) : [];
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
        <div class="course-player-studio-view" style="width:100%; max-width:1440px; margin:0 auto; padding:20px 20px 80px; box-sizing:border-box;">
          
          <!-- 1. Top Cinema Header / Breadcrumb Bar -->
          <div class="glass-card" style="margin-bottom:20px; padding:16px 24px; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
            <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
              <a href="#courses" class="btn-secondary" style="padding:7px 14px; border-radius:20px; font-size:0.82rem; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                <i data-lucide="arrow-right" style="width:14px;height:14px;"></i> كل الدورات
              </a>
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="badge" style="background:var(--primary-glow); color:var(--primary); font-weight:800; font-size:0.75rem; padding:4px 10px; border-radius:12px;">
                  🎓 ${this.course?.degree || 'لجميع المراحل'}
                </span>
                <span class="badge" style="background:rgba(99,102,241,0.08); color:var(--text-main); font-weight:700; font-size:0.75rem; padding:4px 10px; border-radius:12px;">
                  📚 ${this.course?.category || 'عام'}
                </span>
              </div>
              <h1 style="font-size:1.15rem; font-weight:800; margin:0; color:var(--text-main);">${this.course?.title || ''}</h1>
            </div>

            <!-- Progress Meter Pill -->
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="display:flex; flex-direction:column; align-items:flex-end;">
                <span style="font-size:0.78rem; font-weight:800; color:var(--text-main);">${completedCount} من ${totalLessonsCount} درس مكتمل</span>
                <span style="font-size:0.72rem; color:var(--text-muted);">${completionPercentage}% إنجاز</span>
              </div>
              <div style="width:70px; height:8px; background:rgba(0,0,0,0.06); border-radius:10px; overflow:hidden;">
                <div style="width:${completionPercentage}%; height:100%; background:linear-gradient(90deg, var(--primary), #10b981); border-radius:10px;"></div>
              </div>
            </div>
          </div>

          <!-- 2. Main Studio Grid Layout (Video Left + Curriculum Right) -->
          <div class="course-studio-grid" style="display:grid; grid-template-columns: 1fr 380px; gap:24px; align-items:start;">
            
            <!-- Left: Video Player, Action Bar & Tabbed Panes -->
            <div class="studio-main-column" style="display:flex; flex-direction:column; gap:20px; min-width:0;">
              
              ${activeLiveSession ? `
                <!-- Active Live Session Notification Banner -->
                <div class="glass-card" style="border:1.5px solid #10b981; background:linear-gradient(135deg, rgba(16,185,129,0.12), rgba(99,102,241,0.05)); padding:16px 22px; border-radius:20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px; box-shadow:0 8px 24px rgba(16,185,129,0.15);">
                  <div style="display:flex; align-items:center; gap:14px;">
                    <div style="width:40px; height:40px; border-radius:12px; background:#10b981; color:#ffffff; display:flex; align-items:center; justify-content:center; animation:pulse 2s infinite;">
                      <i data-lucide="video" style="width:20px; height:20px;"></i>
                    </div>
                    <div>
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span class="session-tag live" style="font-size:0.72rem; padding:2px 8px;">بث مباشر الآن 🔴</span>
                        <strong style="font-size:0.95rem; color:var(--text-main);">${activeLiveSession.title}</strong>
                      </div>
                      <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">المعلم: ${this.course?.teacher?.name || ''}</div>
                    </div>
                  </div>
                  <a href="#classroom/${activeLiveSession.id}" class="btn-primary" style="background:linear-gradient(135deg, #10b981, #059669); border:none; font-size:0.85rem; padding:8px 18px; border-radius:24px; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                    <i data-lucide="door-open"></i> انضم إلى قاعة البث المباشر
                  </a>
                </div>
              ` : ""}

              <!-- Video Stage Viewport Container -->
              <div class="video-container" id="video-wrapper" style="border-radius:22px; overflow:hidden; border:1px solid var(--border-color); box-shadow:0 14px 40px rgba(0,0,0,0.12); position:relative; aspect-ratio:16/9; background:#09090b;">
                ${this.currentLesson ? this.renderVideoPlayer() : `
                  <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding:40px; text-align:center; color:var(--text-muted);">
                    <div style="width:64px; height:64px; border-radius:20px; background:rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; margin-bottom:16px;">
                      <i data-lucide="video" style="width:32px; height:32px; color:var(--primary);"></i>
                    </div>
                    <h3 style="color:#ffffff; font-weight:800; font-size:1.2rem; margin-bottom:8px;">${t("course.onlineSessionsTitle")}</h3>
                    <p style="font-size:0.88rem; max-width:420px; line-height:1.6; color:#a1a1aa;">${t("course.noLessonsSub")}</p>
                  </div>
                `}
              </div>

              <!-- Lesson Focal Action Bar -->
              ${this.currentLesson ? `
                <div class="lesson-focal-action-bar glass-card" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:20px; padding:18px 22px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px; box-shadow:0 8px 30px rgba(0,0,0,0.04);">
                  
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
                    <button class="focal-shortcut-btn switch-tab-shortcut" data-tab="private-sessions" style="background:linear-gradient(135deg, rgba(168,85,247,0.12), rgba(16,185,129,0.08)); color:#a855f7; border:1px solid rgba(168,85,247,0.3); padding:6px 14px; border-radius:20px; font-size:0.78rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                      <i data-lucide="sparkles" style="width:14px;height:14px;"></i> حصة خاصة 🎯
                    </button>

                    ${(this.currentLesson.questions || []).length > 0 ? `
                      <button class="focal-shortcut-btn switch-tab-shortcut" data-tab="quiz" style="background:rgba(16,185,129,0.1); color:var(--success); border:1px solid rgba(16,185,129,0.3); padding:6px 14px; border-radius:20px; font-size:0.78rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                        <i data-lucide="help-circle" style="width:14px;height:14px;"></i> أسئلة الدرس (${(this.currentLesson.questions || []).length})
                      </button>
                    ` : ''}

                    ${this.currentLesson.resourceUrl ? `
                      <button class="focal-shortcut-btn switch-tab-shortcut" data-tab="details" style="background:rgba(99,102,241,0.1); color:var(--primary); border:1px solid var(--primary-glow); padding:6px 14px; border-radius:20px; font-size:0.78rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                        <i data-lucide="paperclip" style="width:14px;height:14px;"></i> المورد المرفق
                      </button>
                    ` : ''}

                    <button class="focal-shortcut-btn switch-tab-shortcut" data-tab="qa" style="background:var(--bg-app); color:var(--text-muted); border:1px solid var(--border-color); padding:6px 14px; border-radius:20px; font-size:0.78rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                      <i data-lucide="message-square" style="width:14px;height:14px;"></i> اسأل المعلم
                    </button>
                  </div>
                </div>
              ` : ''}

              <!-- Tabbed Hub Section -->
              <div class="player-details-card glass-card" style="padding:24px; border-radius:22px; border:1px solid var(--border-color); background:var(--bg-card);">
                
                <!-- Lesson Title & Instructor Meta -->
                <div class="player-details-header" style="margin-bottom:20px;">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
                    <div>
                      <h2 class="player-lesson-title" id="active-lesson-heading" style="font-size:1.35rem; font-weight:800; color:var(--text-main); margin:0 0 6px 0;">
                        ${this.currentLesson ? this.currentLesson.title : (this.course?.title || t("course.onlineSessionsTitle"))}
                      </h2>
                      <div style="display:flex; align-items:center; gap:12px; font-size:0.85rem; color:var(--text-muted); flex-wrap:wrap;">
                        <div style="display:flex; align-items:center; gap:8px;">
                          <img src="${this.course?.teacher?.avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=Teacher"}" alt="Avatar" style="width:26px; height:26px; border-radius:50%; border:1.5px solid var(--primary); object-fit:cover;">
                          <span>المعلم: <strong style="color:var(--text-main);">${this.course?.teacher?.name || t("course.instructor")}</strong></span>
                        </div>
                        ${this.currentLesson?.duration ? `<span style="font-weight:700; color:var(--primary);">⏱️ المدة: ${this.currentLesson.duration} دقيقة</span>` : ''}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Tabs Header -->
                <div class="tabs-header" style="display:flex; gap:6px; border-bottom:1px solid var(--border-color); margin-bottom:22px; overflow-x:auto; padding-bottom:6px;">
                  <button class="tab-btn ${this.activeTab === "details" ? "active" : ""}" data-tab="details">
                    <i data-lucide="info"></i> ${t("course.tabDetails")}
                  </button>
                  <button class="tab-btn ${this.activeTab === "private-sessions" ? "active" : ""}" data-tab="private-sessions" style="color:var(--primary); font-weight:800;">
                    <i data-lucide="sparkles"></i> طلب حصة خاصة (1-on-1) 🎯
                  </button>
                  <button class="tab-btn ${this.activeTab === "assignments" ? "active" : ""}" data-tab="assignments">
                    <i data-lucide="clipboard-list"></i> الواجبات والأنشطة (${(this.courseAssignments || []).filter(a => !a.lesson || String(a.lesson.id) === String(this.currentLesson?.id)).length})
                  </button>
                  <button class="tab-btn ${this.activeTab === "activity" ? "active" : ""}" data-tab="activity">
                    <i data-lucide="file-up"></i> الملفات والكراسات
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
                    <i data-lucide="star"></i> التقييمات ⭐ (${this.courseReviewsCount || 0})
                  </button>
                </div>

                <!-- Private Sessions Pane -->
                <div class="tab-content-pane ${this.activeTab === "private-sessions" ? "active" : ""}" id="pane-private-sessions">
                  ${this.renderPrivateSessionsPane()}
                </div>

                <!-- Assignments Pane -->
                <div class="tab-content-pane ${this.activeTab === "assignments" ? "active" : ""}" id="pane-assignments">
                  ${this.renderAssignmentsPane()}
                </div>

                <!-- Activity & Files Pane -->
                <div class="tab-content-pane ${this.activeTab === "activity" ? "active" : ""}" id="pane-activity">
                  ${this.renderActivityPane()}
                </div>

                <!-- Details Pane -->
                <div class="tab-content-pane ${this.activeTab === "details" ? "active" : ""}" id="pane-details">
                  ${this.currentLesson?.photo ? `
                    <div style="margin-bottom:20px; background:var(--bg-app); padding:18px; border-radius:18px; border:1px solid var(--border-color);">
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
                        </div>
                      </div>
                      <a href="${this.currentLesson.resourceUrl}" target="_blank" rel="noopener" class="btn-primary" style="font-size:0.82rem; padding:8px 16px; text-decoration:none;">
                        <i data-lucide="external-link"></i> فتح وتنزيل المورد
                      </a>
                    </div>
                  ` : ''}

                  <div style="font-size:0.95rem; line-height:1.7; color:var(--text-main); margin-bottom:20px; white-space:pre-wrap;">
                    ${this.currentLesson ? (this.currentLesson.description || t("course.noDescription")) : (this.course?.description || t("course.noDescription"))}
                  </div>

                  <!-- Private Sessions Highlight Card in Details Pane -->
                  <div class="glass-card" style="margin-top:24px; padding:24px; border-radius:20px; background:linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.08)); border:1.5px solid var(--border-focus); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:18px;">
                    <div style="display:flex; align-items:center; gap:16px; flex:1; min-width:280px;">
                      <img src="${this.course?.teacher?.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Teacher'}" style="width:58px; height:58px; border-radius:50%; border:2px solid var(--primary); object-fit:cover; flex-shrink:0;">
                      <div>
                        <div style="font-weight:800; font-size:1.1rem; color:var(--text-main); display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                          <span>طلب حصة خاصة مع الأستاذ ${this.course?.teacher?.name || 'المعلم'}</span>
                          <span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-weight:800; font-size:0.75rem;">1-on-1 مباشر</span>
                        </div>
                        <p style="font-size:0.86rem; color:var(--text-muted); margin:4px 0 0 0; line-height:1.5;">
                          هل ترغب في مراجعة مخصصة، حل تدريبات إضافية، أو الاستفسار عن نقاط صعبة؟ يمكنك طلب حجز حصة خاصة فردية مباشرة مع الأستاذ.
                        </p>
                      </div>
                    </div>
                    <div style="display:flex; gap:10px; flex-wrap:wrap;">
                      <a href="#student-private-sessions" class="btn-primary" style="background:linear-gradient(135deg, #10b981, #059669); border:none; text-decoration:none; padding:10px 22px; border-radius:30px; font-size:0.88rem; font-weight:800; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 14px rgba(16,185,129,0.3);">
                        <i data-lucide="calendar-plus" style="width:16px;height:16px;"></i> طلب حجز حصة خاصة 🚀
                      </a>
                      <a href="#subscription-plans" class="btn-secondary" style="border-color:var(--primary); color:var(--primary); text-decoration:none; padding:10px 18px; border-radius:30px; font-size:0.85rem; font-weight:700; display:inline-flex; align-items:center; gap:6px;">
                        <i data-lucide="sparkles" style="width:16px;height:16px;"></i> باقات الحصص الشهرية
                      </a>
                    </div>
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
                    ? `<div style="text-align:center; padding:30px; color:var(--text-muted); background:var(--bg-app); border-radius:var(--radius-sm);">
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

            <!-- Right Column: Sticky Curriculum & Chapters Index -->
            <div class="sidebar-curriculum-sticky glass-card" style="position:sticky; top:88px; border-radius:24px; border:1px solid var(--border-color); padding:22px; background:var(--bg-card); box-shadow:0 8px 30px rgba(0,0,0,0.04); max-height:calc(100vh - 110px); overflow-y:auto; display:flex; flex-direction:column; gap:16px;">
              
              <!-- Curriculum Header -->
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                  <h3 style="margin:0; font-size:1.1rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                    <i data-lucide="book-open" style="color:var(--primary); width:20px; height:20px;"></i>
                    فهرس ومحتوى الدورة
                  </h3>
                  <span style="font-size:0.78rem; font-weight:800; color:var(--primary); background:rgba(99,102,241,0.1); padding:3px 10px; border-radius:12px;">
                    ${totalLessonsCount} درس
                  </span>
                </div>

                <!-- Search inside lessons -->
                <div style="position:relative; margin-bottom:12px;">
                  <input type="text" id="curriculum-search-input" class="form-input" placeholder="🔍 ابحث في دروس الدورة..." style="width:100%; border-radius:12px; padding:8px 12px; font-size:0.82rem; background:var(--bg-app);">
                </div>

                <!-- Overall Progress Bar -->
                <div style="background:var(--bg-app); border-radius:12px; padding:12px; border:1px solid var(--border-color);">
                  <div style="display:flex; justify-content:space-between; font-size:0.78rem; font-weight:700; margin-bottom:6px; color:var(--text-main);">
                    <span>مستوى التقدم الكلي</span>
                    <span>${completionPercentage}%</span>
                  </div>
                  <div style="width:100%; height:7px; background:rgba(0,0,0,0.06); border-radius:10px; overflow:hidden;">
                    <div style="width:${completionPercentage}%; height:100%; background:linear-gradient(90deg, var(--primary), #10b981); transition:width 0.4s ease;"></div>
                  </div>
                </div>
              </div>

              <!-- Chapters & Lessons List -->
              <div style="display:flex; flex-direction:column; gap:16px;">
                ${hasLessons ? Object.keys(chapters).map((chName, chIdx) => {
                  const chLessons = chapters[chName] || [];
                  const chCompleted = chLessons.filter(l => this.completedLessons.includes(l.id)).length;
                  return `
                    <div class="chapter-group-modern" style="display:flex; flex-direction:column; gap:8px;">
                      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-radius:10px; background:rgba(99,102,241,0.05); border:1px solid rgba(99,102,241,0.1);">
                        <span style="font-size:0.85rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:6px;">
                          <i data-lucide="folder" style="width:15px; height:15px; color:var(--primary);"></i>
                          ${chName}
                        </span>
                        <span style="font-size:0.72rem; font-weight:700; color:var(--text-muted);">${chCompleted}/${chLessons.length}</span>
                      </div>

                      <div class="lesson-list-items" style="display:flex; flex-direction:column; gap:6px; padding-inline-start:4px;">
                        ${chLessons.map(lesson => {
                          const isActive = this.currentLesson && lesson.id === this.currentLesson.id;
                          const isChecked = this.completedLessons.includes(lesson.id);
                          return `
                            <div class="lesson-item-row ${isActive ? "active" : ""} ${isChecked ? "completed" : ""}" data-lesson-id="${lesson.id}" style="padding:10px 12px; border-radius:12px; border:1px solid ${isActive ? 'var(--primary)' : 'var(--border-color)'}; background:${isActive ? 'rgba(99,102,241,0.1)' : 'var(--bg-app)'}; cursor:pointer; transition:all 0.2s ease; display:flex; align-items:center; justify-content:space-between; gap:8px; ${isActive ? 'box-shadow:0 4px 14px rgba(99,102,241,0.15);' : ''}">
                              <div style="display:flex; align-items:center; gap:10px; flex-grow:1; overflow:hidden;">
                                <div class="lesson-checkbox ${isChecked ? "checked" : ""}" data-lesson-id="${lesson.id}" style="flex-shrink:0;">
                                  ${isChecked ? '<i data-lucide="check" style="width:14px;height:14px;"></i>' : ""}
                                </div>
                                <div style="display:flex; flex-direction:column; gap:2px; overflow:hidden;">
                                  <span class="lesson-item-title" style="font-size:0.85rem; font-weight:${isActive ? '800' : '600'}; color:${isActive ? 'var(--primary)' : 'var(--text-main)'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                    ${lesson.title}
                                  </span>
                                  <div style="display:flex; align-items:center; gap:6px; font-size:0.72rem; color:var(--text-muted);">
                                    <span>⏱️ ${lesson.duration} د</span>
                                    ${(lesson.questions || []).length > 0 ? '<span style="color:var(--success); font-weight:700;">• ❓ اختبار</span>' : ''}
                                    ${lesson.resourceUrl ? '<span style="color:var(--primary); font-weight:700;">• 📎 ملف</span>' : ''}
                                  </div>
                                </div>
                              </div>
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

  renderPrivateSessionsPane() {
    const teacher = this.course?.teacher;
    const teacherName = teacher?.name || "معلم الدورة";
    const teacherAvatar = teacher?.avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=Teacher";

    return `
      <div style="display:flex; flex-direction:column; gap:24px;">
        <!-- Hero Header -->
        <div class="glass-card" style="padding:28px; border-radius:20px; background:linear-gradient(135deg, rgba(99,102,241,0.1), rgba(16,185,129,0.1)); border:1.5px solid var(--border-focus); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px;">
          <div style="display:flex; align-items:center; gap:18px;">
            <img src="${teacherAvatar}" alt="${teacherName}" style="width:68px; height:68px; border-radius:50%; border:3px solid var(--primary); object-fit:cover; box-shadow:0 4px 16px rgba(99,102,241,0.25);">
            <div>
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <h3 style="font-size:1.25rem; font-weight:900; margin:0; color:var(--text-main);">الحصص الخاصة والاستشارات الفردية مع الأستاذ ${teacherName}</h3>
                <span class="badge" style="background:rgba(16,185,129,0.18); color:#10b981; font-weight:800; font-size:0.75rem; padding:4px 10px; border-radius:20px;">1-on-1 مباشر</span>
              </div>
              <p style="color:var(--text-muted); font-size:0.88rem; margin:6px 0 0 0; line-height:1.6;">
                احصل على جلسة خاصة مباشرة وتفاعلية فردية لشرح الدروس المعقدة، حل نماذج الامتحانات، والإجابة على كافة استفساراتك بشكل حصري.
              </p>
            </div>
          </div>

          <div style="display:flex; gap:12px; flex-wrap:wrap;">
            <a href="#student-private-sessions" class="btn-primary" style="background:linear-gradient(135deg, #10b981, #059669); border:none; text-decoration:none; padding:12px 24px; border-radius:30px; font-weight:800; font-size:0.92rem; display:inline-flex; align-items:center; gap:8px; box-shadow:0 4px 16px rgba(16,185,129,0.35);">
              <i data-lucide="calendar-plus" style="width:18px;height:18px;"></i> طلب حجز حصة خاصة الآن 🚀
            </a>
            <a href="#subscription-plans" class="btn-secondary" style="border-color:var(--primary); color:var(--primary); text-decoration:none; padding:12px 20px; border-radius:30px; font-weight:800; font-size:0.9rem; display:inline-flex; align-items:center; gap:8px;">
              <i data-lucide="sparkles" style="width:16px;height:16px;"></i> باقات الحصص الشهرية (4, 8, 12)
            </a>
          </div>
        </div>

        <!-- Features Grid -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:18px;">
          <div class="glass-card" style="padding:22px; border-radius:16px; border:1px solid var(--border-color); background:var(--bg-card);">
            <div style="width:42px; height:42px; border-radius:12px; background:rgba(99,102,241,0.12); color:var(--primary); display:flex; align-items:center; justify-content:center; margin-bottom:12px;">
              <i data-lucide="video" style="width:20px; height:20px;"></i>
            </div>
            <h4 style="font-weight:800; font-size:1rem; margin:0 0 6px 0; color:var(--text-main);">فصل دراسي رقمي مباشر</h4>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:0; line-height:1.6;">جلسة فيديو صوت وصورة عالية الدقة مع سبورة تفاعلية ومشاركة الشاشة لشرح المنهج خطوة بخطوة.</p>
          </div>

          <div class="glass-card" style="padding:22px; border-radius:16px; border:1px solid var(--border-color); background:var(--bg-card);">
            <div style="width:42px; height:42px; border-radius:12px; background:rgba(16,185,129,0.12); color:#10b981; display:flex; align-items:center; justify-content:center; margin-bottom:12px;">
              <i data-lucide="target" style="width:20px; height:20px;"></i>
            </div>
            <h4 style="font-weight:800; font-size:1rem; margin:0 0 6px 0; color:var(--text-main);">تركيز كامل على احتياجاتك</h4>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:0; line-height:1.6;">حدد الدروس أو المسائل التي تواجه فيها صعوبة ليقوم الأستاذ بإعادة صياغتها وشرحها لك خصيصاً.</p>
          </div>

          <div class="glass-card" style="padding:22px; border-radius:16px; border:1px solid var(--border-color); background:var(--bg-card);">
            <div style="width:42px; height:42px; border-radius:12px; background:rgba(245,158,11,0.12); color:#f59e0b; display:flex; align-items:center; justify-content:center; margin-bottom:12px;">
              <i data-lucide="calendar" style="width:20px; height:20px;"></i>
            </div>
            <h4 style="font-weight:800; font-size:1rem; margin:0 0 6px 0; color:var(--text-main);">مرونة وسهولة في المواعيد</h4>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:0; line-height:1.6;">اختر التوقيت المناسب لجدولك الدراسي الأسبوعي وقم بالتنسيق المباشر مع المعلم.</p>
          </div>
        </div>

        <!-- How it works card -->
        <div class="glass-card" style="padding:24px; border-radius:16px; border:1px solid var(--border-color); background:var(--bg-card);">
          <h4 style="font-weight:800; font-size:1.05rem; margin:0 0 16px 0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
            <i data-lucide="help-circle" style="color:var(--primary); width:20px; height:20px;"></i>
            كيف تطلب حصتك الخاصة في 3 خطوات بسيطة؟
          </h4>
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:16px;">
            <div style="padding:14px; background:var(--bg-app); border-radius:12px; border:1px solid var(--border-color);">
              <div style="font-weight:800; font-size:0.9rem; color:var(--primary); margin-bottom:4px;">1️⃣ اختيار الباقة أو الطلب</div>
              <div style="font-size:0.82rem; color:var(--text-muted); line-height:1.5;">اختر باقة الحصص الشهرية أو اضغط على طلب حصة خاصة مع المعلم.</div>
            </div>
            <div style="padding:14px; background:var(--bg-app); border-radius:12px; border:1px solid var(--border-color);">
              <div style="font-weight:800; font-size:0.9rem; color:var(--primary); margin-bottom:4px;">2️⃣ تحديد الموعد والموضوع</div>
              <div style="font-size:0.82rem; color:var(--text-muted); line-height:1.5;">حدد اليوم والساعة والدرس المراد مراجعته مع الأستاذ.</div>
            </div>
            <div style="padding:14px; background:var(--bg-app); border-radius:12px; border:1px solid var(--border-color);">
              <div style="font-weight:800; font-size:0.9rem; color:#10b981; margin-bottom:4px;">3️⃣ حضور الجلسة المباشرة</div>
              <div style="font-size:0.82rem; color:var(--text-muted); line-height:1.5;">ادخل قاعة الفصل الافتراضي في الموعد المحدد وابدأ التعلم التفاعلي.</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderAssignmentsPane() {
    const lessonId = this.currentLesson?.id;
    const lessonAssignments = (this.courseAssignments || []).filter(a =>
      !a.lesson || String(a.lesson.id) === String(lessonId)
    );

    return `
      <div class="glass-card" style="padding:28px; border-radius:18px; border:1px solid var(--border-color); background:var(--bg-card);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:14px;">
          <div>
            <h3 style="font-size:1.2rem; font-weight:800; color:var(--text-main); margin:0 0 4px 0; display:flex; align-items:center; gap:8px;">
              <i data-lucide="clipboard-list" style="color:var(--primary); width:22px; height:22px;"></i>
              📝 واجبات وأنشطة الدرس (Lesson Assignments)
            </h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">قائمة المهام والتمارين المنزلية المطلوب حلها وتسليمها للمعلم لهذا الدرس.</p>
          </div>
          <span class="badge" style="background:var(--primary-glow); color:var(--primary); font-weight:800; font-size:0.85rem; padding:6px 14px;">
            ${lessonAssignments.length} واجب
          </span>
        </div>

        ${lessonAssignments.length === 0 ? `
          <div style="text-align:center; padding:50px 20px; color:var(--text-muted); background:var(--bg-app); border-radius:14px; border:1px dashed var(--border-color);">
            <i data-lucide="clipboard-check" style="width:48px; height:48px; opacity:0.35; margin-bottom:12px;"></i>
            <h4 style="margin:0 0 6px 0; font-weight:800; color:var(--text-main);">لا توجد واجبات مطلوبة لهذا الدرس حالياً 🎉</h4>
            <p style="margin:0; font-size:0.85rem;">تابع الشرح والموارد المرفقة بالدرس، وسيتم إخطارك عند إضافة معلم الكورس لواجبات جديدة.</p>
          </div>
        ` : `
          <div style="display:flex; flex-direction:column; gap:20px;">
            ${lessonAssignments.map(asg => {
      const dueDateStr = new Date(asg.dueDate).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const isOverdue = new Date() > new Date(asg.dueDate);
      const isSubmitted = !!asg.submission;

      return `
                <div style="padding:20px; border-radius:16px; background:var(--bg-app); border:1px solid ${isSubmitted ? 'rgba(16,185,129,0.35)' : 'var(--border-color)'}; transition:all 0.2s ease;">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                      <strong style="font-size:1.05rem; color:var(--text-main); font-weight:800;">${asg.title}</strong>
                      ${asg.lesson ? `<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-size:0.75rem; font-weight:800;">📌 ${asg.lesson.title}</span>` : ''}
                    </div>
                    <span style="font-size:0.8rem; font-weight:700; color:${isOverdue ? 'var(--error)' : 'var(--text-muted)'}; background:rgba(0,0,0,0.03); padding:4px 10px; border-radius:8px;">
                      <i data-lucide="clock" style="width:13px;height:13px;vertical-align:middle;margin-inline-end:4px;"></i> آخر موعد: ${dueDateStr}
                    </span>
                  </div>

                  <p style="font-size:0.9rem; color:var(--text-muted); margin:0 0 16px 0; line-height:1.6; white-space:pre-wrap;">${asg.description || 'لا توجد تعليمات تفصيلية مضافة.'}</p>

                  ${isSubmitted ? `
                    <div style="padding:14px 18px; border-radius:12px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.25); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <i data-lucide="check-circle-2" style="color:#10b981; width:20px; height:20px;"></i>
                        <div>
                          <span style="font-size:0.9rem; font-weight:800; color:#10b981; display:block;">تم تسليم هذا الواجب بنجاح! 🎉</span>
                          <span style="font-size:0.78rem; color:var(--text-muted);">تاريخ التسليم: ${new Date(asg.submission.submittedAt || Date.now()).toLocaleString('ar-EG')}</span>
                        </div>
                      </div>
                      ${asg.submission.grade !== null && asg.submission.grade !== undefined ? `
                        <span class="badge" style="background:#10b981; color:#fff; font-weight:800; font-size:0.88rem; padding:6px 14px; border-radius:10px;">الدرجة: ${asg.submission.grade}/100 ⭐</span>
                      ` : '<span class="badge" style="background:rgba(245,158,11,0.15); color:#f59e0b; font-weight:800; font-size:0.8rem; padding:6px 12px;">قيد التقييم والتصحيح من المعلم</span>'}
                    </div>
                  ` : `
                    <form class="student-assignment-submit-form" data-assignment-id="${asg.id}" style="display:flex; flex-direction:column; gap:12px; padding:16px; background:var(--bg-card); border-radius:14px; border:1px dashed var(--primary-glow);">
                      <div style="font-size:0.85rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:6px;">
                        <i data-lucide="upload-cloud" style="width:16px; height:16px; color:var(--primary);"></i>
                        تقديم حل الواجب وترفق ملف الإجابة:
                      </div>
                      
                      <textarea class="assignment-text-answer form-input" rows="2" placeholder="اكتب إجابتك أو ملاحظاتك هنا..." style="padding:10px 14px; font-size:0.88rem; font-family:inherit; resize:vertical;"></textarea>
                      
                      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                        <input type="file" class="assignment-file-input form-input" style="flex:1; padding:8px 12px; font-size:0.82rem;" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip">
                        <button type="submit" class="btn-primary" style="padding:10px 20px; font-weight:800; font-size:0.85rem; flex-shrink:0; display:inline-flex; align-items:center; gap:6px;">
                          <i data-lucide="send" style="width:16px;height:16px;"></i> رفع وتسليم الإجابة 🚀
                        </button>
                      </div>
                    </form>
                  `}
                </div>
              `;
    }).join('')}
          </div>
        `}
      </div>
    `;
  }

  renderActivityPane() {
    const lessonId = this.currentLesson?.id || "general";
    const submissionsMap = this.enrollment?.activitySubmissions || {};
    const submissions = submissionsMap[lessonId] || [];

    const hasTeacherResource = !!this.currentLesson?.resourceUrl;
    const hasTeacherPhoto = !!this.currentLesson?.photo;

    // Filter assignments for this specific lesson or course-wide
    const lessonAssignments = (this.courseAssignments || []).filter(a =>
      !a.lesson || String(a.lesson.id) === String(lessonId)
    );

    return `
      <div style="display:flex; flex-direction:column; gap:24px;">
        
        <!-- Section 0: Course & Lesson Assignments -->
        ${lessonAssignments.length > 0 ? `
          <div class="glass-card" style="padding:24px; border-radius:18px; border:1px solid var(--border-color); background:var(--bg-card);">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
              <div>
                <h3 style="font-size:1.1rem; font-weight:800; color:var(--text-main); margin:0 0 4px 0; display:flex; align-items:center; gap:8px;">
                  <i data-lucide="clipboard-list" style="color:var(--primary); width:20px; height:20px;"></i>
                  📝 الواجبات والأنشطة المطلوبة لهذا الدرس (${lessonAssignments.length})
                </h3>
                <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">المهام والتمارين المنزلية المطلوبة إنجازها وتسليمها للمعلم.</p>
              </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:16px;">
              ${lessonAssignments.map(asg => {
      const dueDateStr = new Date(asg.dueDate).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const isOverdue = new Date() > new Date(asg.dueDate);
      const isSubmitted = !!asg.submission;

      return `
                  <div style="padding:18px; border-radius:14px; background:var(--bg-app); border:1px solid ${isSubmitted ? 'rgba(16,185,129,0.3)' : 'var(--border-color)'};">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
                      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <strong style="font-size:1rem; color:var(--text-main);">${asg.title}</strong>
                        ${asg.lesson ? `<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-size:0.75rem;">📌 ${asg.lesson.title}</span>` : ''}
                      </div>
                      <span style="font-size:0.78rem; font-weight:700; color:${isOverdue ? 'var(--error)' : 'var(--text-muted)'};">
                        <i data-lucide="clock" style="width:12px;height:12px;vertical-align:middle;margin-inline-end:4px;"></i> آخر موعد: ${dueDateStr}
                      </span>
                    </div>

                    <p style="font-size:0.88rem; color:var(--text-muted); margin:0 0 14px 0; line-height:1.6; white-space:pre-wrap;">${asg.description || 'لا توجد تعليمات تفصيلية مضافة.'}</p>

                    ${isSubmitted ? `
                      <div style="padding:12px; border-radius:10px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.25); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                        <span style="font-size:0.85rem; font-weight:800; color:#10b981; display:flex; align-items:center; gap:6px;">
                          <i data-lucide="check-circle" style="width:16px;height:16px;"></i> تم تسليم هذا الواجب بنجاح!
                        </span>
                        ${asg.submission.grade !== null && asg.submission.grade !== undefined ? `
                          <span class="badge" style="background:var(--success); color:#fff; font-weight:800;">الدرجة: ${asg.submission.grade}/100 ⭐</span>
                        ` : '<span style="font-size:0.8rem; color:var(--text-muted);">بانتظار التقييم والتصحيح من المعلم</span>'}
                      </div>
                    ` : `
                      <form class="student-assignment-submit-form" data-assignment-id="${asg.id}" style="display:flex; flex-direction:column; gap:10px; padding:12px; background:var(--bg-card); border-radius:12px; border:1px dashed var(--primary-glow);">
                        <div style="font-size:0.82rem; font-weight:700; color:var(--text-main);">تسليم حل الواجب:</div>
                        <input type="text" class="assignment-text-answer form-input" placeholder="اكتب إجابتك أو ملاحظاتك هنا..." style="padding:8px 12px; font-size:0.85rem;">
                        
                        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                          <input type="file" class="assignment-file-input form-input" style="flex:1; padding:6px 10px; font-size:0.8rem;" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip">
                          <button type="submit" class="btn-primary" style="padding:8px 16px; font-weight:800; font-size:0.82rem; flex-shrink:0;">
                            <i data-lucide="upload"></i> رفع وتسليم الإجابة 🚀
                          </button>
                        </div>
                      </form>
                    `}
                  </div>
                `;
    }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Section 1: Teacher Downloadable Activity / Resource Files -->
        <div class="glass-card" style="padding:24px; border-radius:18px; border:1px solid var(--border-color); background:var(--bg-card);">
          <h3 style="font-size:1.1rem; font-weight:800; color:var(--text-main); margin:0 0 8px 0; display:flex; align-items:center; gap:8px;">
            <i data-lucide="download-cloud" style="color:var(--primary); width:20px; height:20px;"></i>
            📥 ملفات وكراس الأنشطة المرفقة بالدرس (تنزيل الملفات)
          </h3>
          <p style="font-size:0.85rem; color:var(--text-muted); margin:0 0 16px 0;">قم بتنزيل كراس التمارين أو ملخص النشاط الخاص بهذا الدرس للاستعانة به.</p>

          ${(!hasTeacherResource && !hasTeacherPhoto && this.courseResources.length === 0) ? `
            <div style="padding:20px; text-align:center; background:rgba(0,0,0,0.02); border-radius:12px; border:1px dashed var(--border-color); color:var(--text-muted); font-size:0.88rem;">
              <i data-lucide="file-x" style="width:32px; height:32px; opacity:0.4; margin-bottom:6px;"></i>
              <p style="margin:0;">لا توجد ملفات أو كراسات مرفقة بهذا الدرس حالياً.</p>
            </div>
          ` : `
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px;">
              ${this.currentLesson?.resourceUrl ? `
                <div style="padding:16px; border-radius:14px; background:rgba(99,102,241,0.06); border:1px solid var(--primary-glow); display:flex; align-items:center; justify-content:space-between; gap:12px;">
                  <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
                    <div style="width:40px; height:40px; border-radius:10px; background:var(--primary-glow); color:var(--primary); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                      <i data-lucide="file-text" style="width:20px; height:20px;"></i>
                    </div>
                    <div style="overflow:hidden; text-overflow:ellipsis;">
                      <strong style="font-size:0.9rem; color:var(--text-main); display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${this.currentLesson.resourceTitle || 'كراس نشاط الدرس (PDF)'}</strong>
                      <span style="font-size:0.78rem; color:var(--text-muted);">مورد الدرس المرفق من المعلم</span>
                    </div>
                  </div>
                  <a href="${this.currentLesson.resourceUrl}" target="_blank" rel="noopener" class="btn-primary" style="font-size:0.8rem; padding:8px 14px; flex-shrink:0; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                    <i data-lucide="download" style="width:14px;height:14px;"></i> تنزيل
                  </a>
                </div>
              ` : ''}

              ${this.currentLesson?.photo ? `
                <div style="padding:16px; border-radius:14px; background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.25); display:flex; align-items:center; justify-content:space-between; gap:12px;">
                  <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
                    <div style="width:40px; height:40px; border-radius:10px; background:rgba(16,185,129,0.15); color:#10b981; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                      <i data-lucide="image" style="width:20px; height:20px;"></i>
                    </div>
                    <div style="overflow:hidden; text-overflow:ellipsis;">
                      <strong style="font-size:0.9rem; color:var(--text-main); display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">صورة ملخص النشاط 🖼️</strong>
                      <span style="font-size:0.78rem; color:var(--text-muted);">غلاف وبانر التمارين</span>
                    </div>
                  </div>
                  <a href="${this.currentLesson.photo}" target="_blank" rel="noopener" class="btn-secondary" style="font-size:0.8rem; padding:8px 14px; flex-shrink:0; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                    <i data-lucide="external-link" style="width:14px;height:14px;"></i> فتح الصورة
                  </a>
                </div>
              ` : ''}

              ${this.courseResources.slice(0, 3).map(r => `
                <div style="padding:16px; border-radius:14px; background:var(--bg-app); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between; gap:12px;">
                  <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
                    <div style="width:40px; height:40px; border-radius:10px; background:rgba(245,158,11,0.12); color:#f59e0b; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                      <i data-lucide="folder-archive" style="width:20px; height:20px;"></i>
                    </div>
                    <div style="overflow:hidden; text-overflow:ellipsis;">
                      <strong style="font-size:0.9rem; color:var(--text-main); display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.title}</strong>
                      <span style="font-size:0.78rem; color:var(--text-muted);">ملف عام بالدورة</span>
                    </div>
                  </div>
                  <a href="${r.url}" target="_blank" rel="noopener" class="btn-secondary" style="font-size:0.8rem; padding:8px 14px; flex-shrink:0; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                    <i data-lucide="download" style="width:14px;height:14px;"></i> تنزيل
                  </a>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Section 2: Student Upload Activity File / Submission -->
        <div class="glass-card" style="padding:24px; border-radius:18px; border:1px solid var(--border-color); background:var(--bg-card);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
            <div>
              <h3 style="font-size:1.1rem; font-weight:800; color:var(--text-main); margin:0 0 4px 0; display:flex; align-items:center; gap:8px;">
                <i data-lucide="upload-cloud" style="color:var(--primary); width:20px; height:20px;"></i>
                📤 رفع وتسليم ملف النشاط والواجب (Student Upload)
              </h3>
              <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">قم برفع إجاباتك أو ملف الإنجاز الخاص بهذا الدرس لإرساله إلى المعلم.</p>
            </div>
            ${this.enrollment ? '<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-weight:800; padding:6px 14px;">تسليم النشاط متاح ✅</span>' : ''}
          </div>

          <!-- File Upload Form -->
          <div style="margin-bottom:20px; padding:20px; border-radius:14px; background:var(--bg-app); border:2px dashed var(--primary-glow); text-align:center;">
            <div style="width:48px; height:48px; border-radius:50%; background:var(--primary-glow); color:var(--primary); display:inline-flex; align-items:center; justify-content:center; margin-bottom:10px;">
              <i data-lucide="file-up" style="width:24px; height:24px;"></i>
            </div>
            <h4 style="font-size:0.95rem; font-weight:800; margin:0 0 6px 0; color:var(--text-main);">اختر أو اسحب ملف النشاط هنا</h4>
            <p style="font-size:0.8rem; color:var(--text-muted); margin:0 0 14px 0;">يدعم ملفات PDF، الصور، والمستندات (Word / Drive)</p>

            <form id="student-activity-upload-form" style="display:flex; flex-direction:column; gap:12px; max-width:480px; margin:0 auto;">
              <div style="display:flex; gap:8px;">
                <input type="text" id="student-activity-filename" class="form-input" placeholder="اسم أو عنوان ملفك (مثال: حل واجب الدرس الأول)" style="flex:1; padding:8px 12px; font-size:0.85rem;" required>
              </div>
              
              <div style="display:flex; gap:8px; align-items:center;">
                <input type="file" id="student-activity-file-input" class="form-input" style="flex:1; padding:6px 10px; font-size:0.82rem;" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip" required>
                <button type="submit" id="student-activity-submit-btn" class="btn-primary" style="padding:10px 18px; font-weight:800; font-size:0.85rem; flex-shrink:0; display:inline-flex; align-items:center; gap:6px;">
                  <i data-lucide="upload" style="width:16px;height:16px;"></i> رفع وتسليم
                </button>
              </div>
            </form>
          </div>

          <!-- Submitted Activity Files List -->
          <div>
            <h4 style="font-weight:800; font-size:0.95rem; color:var(--text-main); margin-bottom:12px; display:flex; align-items:center; gap:6px;">
              <i data-lucide="check-circle" style="color:var(--success); width:16px; height:16px;"></i>
              الملفات التي قمت بتسليمها لهذا الدرس (${submissions.length}):
            </h4>

            ${submissions.length === 0 ? `
              <div style="padding:14px; text-align:center; color:var(--text-muted); font-size:0.82rem; font-style:italic;">
                لم تقم برفع أو تسليم أي ملف لهذا الدرس حتى الآن.
              </div>
            ` : `
              <div style="display:flex; flex-direction:column; gap:10px;">
                ${submissions.map(sub => `
                  <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:var(--bg-app); border-radius:12px; border:1px solid var(--border-color);">
                    <div style="display:flex; align-items:center; gap:12px;">
                      <div style="width:36px; height:36px; border-radius:8px; background:rgba(16,185,129,0.15); color:#10b981; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <i data-lucide="file-check" style="width:18px; height:18px;"></i>
                      </div>
                      <div>
                        <strong style="font-size:0.88rem; color:var(--text-main); display:block;">${sub.fileName}</strong>
                        <span style="font-size:0.75rem; color:var(--text-muted);">تم التسليم: ${new Date(sub.uploadedAt).toLocaleDateString('ar-EG')}</span>
                      </div>
                    </div>

                    <div style="display:flex; gap:8px; align-items:center;">
                      <a href="${sub.fileUrl}" target="_blank" rel="noopener" class="btn-secondary" style="padding:6px 12px; font-size:0.78rem; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                        <i data-lucide="download" style="width:14px;height:14px;"></i> تنزيل ملفي
                      </a>
                      <button type="button" class="btn-secondary delete-student-submission-btn" data-id="${sub.id}" style="color:var(--error); border-color:var(--error); padding:6px 10px; font-size:0.78rem;" title="حذف الملف">
                        <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

        </div>

      </div>
    `;
  }

  renderLessonObjectivesWidget() {
    if (!this.currentLesson) return '';
    const objectives = this.currentLesson.objectives || [];
    if (!objectives || objectives.length === 0) return '';

    const lessonId = this.currentLesson.id;
    const completedMap = this.enrollment?.completedLessonObjectives || {};
    const completed = completedMap[lessonId] || [];
    const completedCount = objectives.filter((_, idx) => completed.includes(String(idx))).length;
    const progressPct = Math.round((completedCount / objectives.length) * 100);

    return `
      <div class="glass-card" style="padding:20px; border-radius:18px; margin-top:20px; margin-bottom:20px; border:1px solid var(--border-color); background:var(--bg-card);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:14px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
          <div>
            <h3 style="font-weight:800; font-size:1.05rem; margin:0 0 2px 0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
              <i data-lucide="check-square" style="color:var(--primary); width:18px; height:18px;"></i>
              🎯 معايير النجاح لهذا الدرس (${this.currentLesson.title}) - Success Criteria
            </h3>
            <p style="margin:0; font-size:0.8rem; color:var(--text-muted);">حدد المعايير والمهارات التي أتقنتها في هذا الدرس لمتابعة تحصيلك</p>
          </div>
          <div style="text-align:end;">
            <div style="font-size:0.85rem; font-weight:800; color:var(--primary);">${completedCount} من ${objectives.length} معايير نجاح محققة (${progressPct}%)</div>
            <div style="width:130px; height:6px; background:rgba(0,0,0,0.06); border-radius:10px; overflow:hidden; margin-top:4px;">
              <div style="width:${progressPct}%; height:100%; background:linear-gradient(90deg, var(--primary), var(--success)); transition:width 0.3s ease;"></div>
            </div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px;">
          ${objectives.map((obj, idx) => {
      const isDone = completed.includes(String(idx));
      return `
              <label style="display:flex; align-items:flex-start; gap:12px; padding:10px 14px; background:${isDone ? 'rgba(16,185,129,0.06)' : 'var(--bg-app)'}; border-radius:10px; border:1px solid ${isDone ? 'rgba(16,185,129,0.25)' : 'var(--border-color)'}; cursor:${this.enrollment ? 'pointer' : 'default'}; transition:all 0.2s ease;">
                <input type="checkbox" class="student-lesson-objective-check" data-lesson-id="${lessonId}" data-index="${idx}" ${isDone ? 'checked' : ''} ${!this.enrollment ? 'disabled' : ''} style="width:18px; height:18px; margin-top:2px; accent-color:var(--success); cursor:pointer;">
                <span style="font-weight:700; font-size:0.88rem; color:${isDone ? 'var(--text-main)' : 'var(--text-muted)'}; line-height:1.5;">
                  ${obj}
                </span>
                ${isDone ? '<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-size:0.7rem; margin-inline-start:auto;">مكتمل ✅</span>' : ''}
              </label>
            `;
    }).join('')}
        </div>
      </div>
    `;
  }

  renderCourseObjectivesWidget() {
    const objectives = this.course?.objectives || [];
    if (!objectives || objectives.length === 0) return '';

    const completed = this.enrollment?.completedObjectives || [];
    const completedCount = objectives.filter((_, idx) => completed.includes(String(idx))).length;
    const progressPct = Math.round((completedCount / objectives.length) * 100);

    return `
      <div class="glass-card" style="padding:22px; border-radius:18px; margin-top:24px; margin-bottom:24px; border:1px solid var(--border-color); background:var(--bg-card);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
          <div>
            <h3 style="font-weight:800; font-size:1.1rem; margin:0 0 2px 0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
              <i data-lucide="target" style="color:var(--primary); width:20px; height:20px;"></i>
              🎯 معايير النجاح الشاملة للدورة (Course Success Criteria)
            </h3>
            <p style="margin:0; font-size:0.8rem; color:var(--text-muted);">حدد المعايير ومخرجات الإتقان المنجزة لمتابعة تطور مستواك التعليمي في الدورة</p>
          </div>
          <div style="text-align:end;">
            <div style="font-size:0.88rem; font-weight:800; color:var(--primary);">${completedCount} من ${objectives.length} معايير نجاح محققة (${progressPct}%)</div>
            <div style="width:140px; height:6px; background:rgba(0,0,0,0.06); border-radius:10px; overflow:hidden; margin-top:4px;">
              <div style="width:${progressPct}%; height:100%; background:linear-gradient(90deg, var(--primary), var(--success)); transition:width 0.3s ease;"></div>
            </div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px;" id="course-objectives-checklist">
          ${objectives.map((obj, idx) => {
      const isDone = completed.includes(String(idx));
      return `
              <label style="display:flex; align-items:flex-start; gap:12px; padding:12px 16px; background:${isDone ? 'rgba(16,185,129,0.06)' : 'var(--bg-app)'}; border-radius:12px; border:1px solid ${isDone ? 'rgba(16,185,129,0.25)' : 'var(--border-color)'}; cursor:${this.enrollment ? 'pointer' : 'default'}; transition:all 0.2s ease;">
                <input type="checkbox" class="student-objective-check" data-index="${idx}" ${isDone ? 'checked' : ''} ${!this.enrollment ? 'disabled' : ''} style="width:18px; height:18px; margin-top:2px; accent-color:var(--success); cursor:pointer;">
                <span style="font-weight:700; font-size:0.9rem; color:${isDone ? 'var(--text-main)' : 'var(--text-muted)'}; line-height:1.5;">
                  ${obj}
                </span>
                ${isDone ? '<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-size:0.7rem; margin-inline-start:auto;">مكتمل ✅</span>' : ''}
              </label>
            `;
    }).join('')}
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

    // Video Player Mode (if videoUrl is present)
    if (this.currentLesson.videoUrl && this.currentLesson.videoUrl.trim().length > 0) {
      const rawUrl = this.currentLesson.videoUrl.trim();
      const isMp4 = rawUrl.endsWith(".mp4") || rawUrl.includes(".mp4?");

      if (isMp4) {
        return `
          <video id="course-video-element" controls autoplay style="width:100%;height:100%;">
            <source src="${rawUrl}" type="video/mp4">
            ${t("course.videoNotSupported") || "الفيديو غير مدعوم في متصفحك"}
          </video>
        `;
      }

      // Convert YouTube / youtu.be watch links to embed links
      const getEmbedUrl = (url) => {
        // youtube.com/watch?v=ID
        const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&showinfo=0`;

        // youtube.com/embed/... — already embed
        if (url.includes("youtube.com/embed/")) return url;

        // Vimeo
        const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
        if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

        return url; // return as-is for other platforms
      };

      const embedUrl = getEmbedUrl(rawUrl);

      return `
        <iframe src="${embedUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="width:100%;height:100%;border:none;"></iframe>
      `;
    }

    // Photo Banner Mode (if videoUrl is absent)
    const bannerPhoto = this.currentLesson.photo || this.course?.image || "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200";

    return `
      <div class="lesson-banner-viewport" style="width:100%; height:100%; position:relative; overflow:hidden; background:#09090b; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; text-align:center;">
        <img src="${bannerPhoto}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:0.3; filter:blur(6px); transform:scale(1.05);" />
        <div style="position:relative; z-index:2; max-width:720px; width:92%; background:rgba(18,18,24,0.88); border:1px solid rgba(255,255,255,0.12); backdrop-filter:blur(14px); border-radius:20px; padding:28px; box-shadow:0 15px 35px rgba(0,0,0,0.5);">
          <div style="width:56px; height:56px; border-radius:50%; background:var(--primary-glow); color:var(--primary); display:inline-flex; align-items:center; justify-content:center; margin-bottom:14px;">
            <i data-lucide="image" style="width:28px; height:28px;"></i>
          </div>
          <span style="font-size:0.78rem; font-weight:800; background:var(--primary-glow); color:var(--primary); padding:4px 12px; border-radius:20px; display:inline-block; margin-bottom:10px;">
            🖼️ غلاف الدرس المصوّر (Banner Mode)
          </span>
          <h2 style="font-size:1.35rem; font-weight:900; color:#ffffff; margin:0 0 8px 0;">${this.currentLesson.title}</h2>
          <p style="color:#a1a1aa; font-size:0.88rem; margin-bottom:18px; line-height:1.5;">${this.currentLesson.description || 'تصفح صورة ملخص الدرس أدناه وباقي الملاحظات والموارد المرفقة.'}</p>
          <div style="border-radius:14px; overflow:hidden; border:1px solid rgba(255,255,255,0.12); max-height:360px; background:#000;">
            <img src="${bannerPhoto}" style="width:100%; max-height:360px; object-fit:contain;" />
          </div>
        </div>
      </div>
    `;
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

    // Student Lesson Objectives Toggle Event Listener
    this.container.querySelectorAll(".student-lesson-objective-check").forEach(cb => {
      cb.addEventListener("change", async () => {
        const lessonId = cb.getAttribute("data-lesson-id");
        const idx = cb.getAttribute("data-index");
        const completed = cb.checked;
        cb.disabled = true;
        try {
          const res = await apiFetch(`/student/enrollments/${this.courseId}/lessons/objectives/toggle`, {
            method: "PATCH",
            body: JSON.stringify({ lessonId, objectiveIndex: idx, completed })
          });
          if (res && res.completedLessonObjectives !== undefined) {
            if (!this.enrollment) this.enrollment = {};
            this.enrollment.completedLessonObjectives = res.completedLessonObjectives;
            showToast(completed ? "تم تحديد هدف الدرس كمكتمل! 🎉" : "تم إلغاء تحديد هدف الدرس", "success");
            await this.render();
          }
        } catch (err) {
          cb.disabled = false;
          cb.checked = !completed;
          showToast(err.message || "تعذر تحديث حالة هدف الدرس", "error");
        }
      });
    });

    // Student Specific Assignment Submission Event Handlers
    this.container.querySelectorAll(".student-assignment-submit-form").forEach(form => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const assignmentId = form.getAttribute("data-assignment-id");
        const textInput = form.querySelector(".assignment-text-answer");
        const fileInput = form.querySelector(".assignment-file-input");
        const submitBtn = form.querySelector("button[type='submit']");

        let textAnswer = textInput ? textInput.value.trim() : "";
        let uploadedUrl = "";

        if (fileInput && fileInput.files.length > 0) {
          if (submitBtn) submitBtn.disabled = true;
          try {
            const formData = new FormData();
            formData.append("file", fileInput.files[0]);
            const token = state.token || localStorage.getItem("token");

            const uploadRes = await fetch("/api/upload", {
              method: "POST",
              headers: { "Authorization": "Bearer " + token },
              body: formData
            });

            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              uploadedUrl = uploadData.url;
            }
          } catch (err) {
            console.error("Upload error:", err);
          }
        }

        const finalContent = uploadedUrl ? `${textAnswer ? textAnswer + ' | ' : ''}رابط الملف المرفوع: ${uploadedUrl}` : textAnswer;

        if (!finalContent) {
          showToast("يرجى كتابة نص الإجابة أو ارفاق ملف قبل التسليم", "error");
          if (submitBtn) submitBtn.disabled = false;
          return;
        }

        if (submitBtn) submitBtn.disabled = true;
        try {
          await apiFetch(`/assignments/${assignmentId}/submit`, {
            method: "POST",
            body: JSON.stringify({ content: finalContent })
          });
          showToast("تم تسليم الواجب بنجاح! 🎉", "success");
          await this.render();
        } catch (err) {
          showToast(err.message || "تعذر تسليم الواجب", "error");
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    });

    // Student Activity Upload Form Handler
    const activityForm = this.container.querySelector("#student-activity-upload-form");
    if (activityForm) {
      activityForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = this.container.querySelector("#student-activity-submit-btn");
        const fileInput = this.container.querySelector("#student-activity-file-input");
        const nameInput = this.container.querySelector("#student-activity-filename");

        if (!fileInput || !fileInput.files.length) {
          showToast("يرجى اختيار ملف النشاط قبل الضغط على رفع وتسليم", "error");
          return;
        }

        const fileName = nameInput ? nameInput.value.trim() : "ملف النشاط";
        if (submitBtn) submitBtn.disabled = true;

        try {
          // 1. Upload file via /api/upload
          const formData = new FormData();
          formData.append("file", fileInput.files[0]);
          const token = state.token || localStorage.getItem("token");

          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            headers: { "Authorization": "Bearer " + token },
            body: formData
          });

          if (!uploadRes.ok) {
            throw new Error("فشل رفع الملف لمركز الملفات.");
          }

          const uploadData = await uploadRes.json();
          const fileUrl = uploadData.url;

          // 2. Submit activity record
          const lessonId = this.currentLesson?.id || "general";
          const res = await apiFetch(`/student/enrollments/${this.courseId}/activity-submit`, {
            method: "POST",
            body: JSON.stringify({ lessonId, fileName, fileUrl })
          });

          if (res && res.activitySubmissions !== undefined) {
            if (!this.enrollment) this.enrollment = {};
            this.enrollment.activitySubmissions = res.activitySubmissions;
            showToast("تم رفع وتسليم ملف النشاط بنجاح! 🎉", "success");
            await this.render();
          }
        } catch (err) {
          showToast(err.message || "تعذر تسليم الملف", "error");
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }

    // Student Activity Delete Handler
    this.container.querySelectorAll(".delete-student-submission-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const submissionId = btn.getAttribute("data-id");
        const lessonId = this.currentLesson?.id || "general";
        try {
          const res = await apiFetch(`/student/enrollments/${this.courseId}/activity-submit`, {
            method: "DELETE",
            body: JSON.stringify({ lessonId, submissionId })
          });
          if (res && res.activitySubmissions !== undefined) {
            if (!this.enrollment) this.enrollment = {};
            this.enrollment.activitySubmissions = res.activitySubmissions;
            showToast("تم حذف ملف التسليم بنجاح", "info");
            await this.render();
          }
        } catch (err) {
          showToast(err.message || "تعذر حذف الملف", "error");
        }
      });
    });

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

    // Curriculum Search Filter
    const curriculumSearch = this.container.querySelector("#curriculum-search-input");
    if (curriculumSearch) {
      curriculumSearch.addEventListener("input", (e) => {
        const q = (e.target.value || "").toLowerCase().trim();
        this.container.querySelectorAll(".lesson-item-row").forEach(row => {
          const title = (row.querySelector(".lesson-item-title")?.innerText || "").toLowerCase();
          row.style.display = (!q || title.includes(q)) ? "flex" : "none";
        });
      });
    }


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
