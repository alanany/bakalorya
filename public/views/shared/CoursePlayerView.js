import { apiFetch, state, showToast, t } from "../../app.js";

export default class CoursePlayerView {
  constructor(container, courseId) {
    this.container = container;
    this.courseId = courseId;
    this.course = null;
    this.enrollment = null;
    this.currentLesson = null;
    this.completedLessons = [];
    this.searchQuery = "";
  }

  async render() {
    try {
      this.container.innerHTML = `<div class="app-loader"><div class="spinner"></div></div>`;

      const [course, enrollments] = await Promise.all([
        apiFetch(`/courses/${this.courseId}`).catch(() => null),
        state.user && state.user.role === "student" ? apiFetch("/student/enrollments").catch(() => []) : Promise.resolve([])
      ]);

      this.course = course;
      if (!this.course) {
        this.container.innerHTML = `
          <div style="padding:100px 20px; text-align:center;">
            <i data-lucide="alert-circle" style="width:64px; height:64px; color:var(--error); margin-bottom:24px;"></i>
            <h2 style="font-size:1.8rem; margin-bottom:16px;">الدورة غير موجودة</h2>
            <p style="color:var(--text-muted); font-size:1rem; margin-bottom:24px;">تعذر العثور على الدورة المطلوبة أو تم حذفها.</p>
            <a href="#courses" class="btn-primary">العودة إلى قائمة الدورات</a>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      this.enrollment = Array.isArray(enrollments)
        ? enrollments.find(e => e.course?.id === this.courseId || (e.course && String(e.course.id) === String(this.courseId)))
        : null;
      this.completedLessons = (this.enrollment && Array.isArray(this.enrollment.completedLessons)) ? this.enrollment.completedLessons : [];

      const allLessons = (this.course && Array.isArray(this.course.lessons)) ? this.course.lessons : [];
      const hasLessons = allLessons.length > 0;

      if (hasLessons && !this.currentLesson) {
        this.currentLesson = allLessons[0];
      } else if (hasLessons && this.currentLesson) {
        this.currentLesson = allLessons.find(l => String(l.id) === String(this.currentLesson.id)) || allLessons[0];
      }

      // Group lessons by units / chapters
      const chapters = {};
      if (hasLessons) {
        const orderedUnits = Array.isArray(this.course?.unitsOrder) ? [...this.course.unitsOrder] : [];
        const allKnownUnits = Array.from(new Set([
          ...orderedUnits,
          ...allLessons.map(l => l.chapter || "الوحدة الأولى")
        ])).filter(Boolean);

        allKnownUnits.forEach(u => { chapters[u] = []; });

        allLessons.forEach(lesson => {
          const chName = lesson.chapter || "الوحدة الأولى";
          if (!chapters[chName]) chapters[chName] = [];
          chapters[chName].push(lesson);
        });

        Object.keys(chapters).forEach(k => {
          if (chapters[k].length === 0) delete chapters[k];
          else chapters[k].sort((a, b) => (a.order || 0) - (b.order || 0));
        });
      }

      const totalLessonsCount = allLessons.length;
      const completedCount = allLessons.filter(l => Array.isArray(this.completedLessons) && this.completedLessons.includes(l.id)).length;
      const completionPercentage = totalLessonsCount > 0 ? Math.round((completedCount / totalLessonsCount) * 100) : 0;

      const currentIdx = allLessons.findIndex(l => l.id === this.currentLesson?.id);
      const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
      const nextLesson = (currentIdx >= 0 && currentIdx < allLessons.length - 1) ? allLessons[currentIdx + 1] : null;
      const isCurrentCompleted = (this.currentLesson && Array.isArray(this.completedLessons)) ? this.completedLessons.includes(this.currentLesson.id) : false;

      const enrolledGroupId = this.enrollment?.group?.id || (this.course.groups && this.course.groups[0]?.id) || null;

      this.container.innerHTML = `
        <div class="course-player-studio-view" style="width:100%; max-width:1440px; margin:0 auto; padding:20px 20px 80px; box-sizing:border-box;">
          
          <!-- 1. Top Breadcrumb & Actions Bar -->
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
                  📚 ${this.course?.subject?.name || this.course?.category || 'عام'}
                </span>
              </div>
              <h1 style="font-size:1.15rem; font-weight:900; margin:0; color:var(--text-main);">${this.course?.title || ''}</h1>
            </div>

            <!-- Right Actions: Group Page Button & Progress -->
            <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
              ${enrolledGroupId ? `
                <a href="#group/${enrolledGroupId}" class="btn-primary" style="background:linear-gradient(135deg, #6366f1, #8b5cf6); text-decoration:none; font-size:0.82rem; padding:8px 18px; border-radius:20px; font-weight:800; color:#fff; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 14px rgba(99,102,241,0.25); transition:transform 0.15s;"
                  onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='none'">
                  <i data-lucide="users" style="width:15px; height:15px;"></i>
                  <span>دخول قاعة المجموعة 👥🚀</span>
                </a>
              ` : ''}

              <!-- Progress Meter Pill -->
              <div style="display:flex; align-items:center; gap:10px; background:var(--bg-app); padding:6px 14px; border-radius:20px; border:1px solid var(--border-color);">
                <div style="display:flex; flex-direction:column; align-items:flex-end;">
                  <span style="font-size:0.76rem; font-weight:800; color:var(--text-main);">${completedCount} من ${totalLessonsCount} درس</span>
                  <span style="font-size:0.7rem; color:var(--text-muted);">${completionPercentage}% منجز</span>
                </div>
                <div style="width:60px; height:7px; background:rgba(0,0,0,0.08); border-radius:10px; overflow:hidden;">
                  <div style="width:${completionPercentage}%; height:100%; background:linear-gradient(90deg, var(--primary), #10b981); border-radius:10px;"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. Main Studio Grid Layout (Video & Lesson Details Left + Units & Lessons Right) -->
          <div class="course-studio-grid" style="display:grid; grid-template-columns: 1fr 380px; gap:24px; align-items:start;">
            
            <!-- Left Column: Lesson Stage, Navigation & Description -->
            <div class="studio-main-column" style="display:flex; flex-direction:column; gap:20px; min-width:0;">
              
              <!-- Video Stage Viewport Container -->
              <div class="video-container" id="video-wrapper" style="border-radius:22px; overflow:hidden; border:1px solid var(--border-color); box-shadow:0 14px 40px rgba(0,0,0,0.12); position:relative; aspect-ratio:16/9; background:#09090b;">
                ${this.currentLesson ? this.renderVideoPlayer() : `
                  <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding:40px; text-align:center; color:var(--text-muted);">
                    <div style="width:64px; height:64px; border-radius:20px; background:rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; margin-bottom:16px;">
                      <i data-lucide="book-open" style="width:32px; height:32px; color:var(--primary);"></i>
                    </div>
                    <h3 style="color:#ffffff; font-weight:800; font-size:1.2rem; margin-bottom:8px;">لا توجد دروس مسجلة بعد</h3>
                    <p style="font-size:0.88rem; max-width:420px; line-height:1.6; color:#a1a1aa;">تصفح فهرس الوحدات على اليسار أو انتقل لقاعة المجموعة لمتابعة الحصص المباشرة والواجبات.</p>
                  </div>
                `}
              </div>

              <!-- Lesson Focal Action Bar (Prev, Complete, Next) -->
              ${this.currentLesson ? `
                <div class="lesson-focal-action-bar glass-card" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:20px; padding:16px 22px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; box-shadow:0 8px 30px rgba(0,0,0,0.04);">
                  
                  <!-- Left: Completion Button -->
                  <div style="display:flex; align-items:center; gap:10px;">
                    <button class="lesson-completion-hero-btn ${isCurrentCompleted ? 'completed' : ''}" data-lesson-id="${this.currentLesson.id}" style="padding:10px 20px; border-radius:30px; font-weight:800; font-size:0.86rem; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:all 0.25s ease; ${isCurrentCompleted ? 'background:linear-gradient(135deg, #10b981, #059669); color:#fff; box-shadow:0 6px 20px rgba(16,185,129,0.35);' : 'background:linear-gradient(135deg, #6366f1, #4f46e5); color:#fff; box-shadow:0 6px 20px rgba(99,102,241,0.35);'}">
                      <i data-lucide="${isCurrentCompleted ? 'check-circle-2' : 'circle'}" style="width:17px;height:17px;"></i>
                      <span>${isCurrentCompleted ? 'تم إكمال هذا الدرس بنجاح ✓' : 'تحديد الدرس كمكتمل ✓'}</span>
                    </button>
                  </div>

                  <!-- Right: Prev / Next Navigation -->
                  <div style="display:flex; align-items:center; gap:8px;">
                    ${prevLesson ? `
                      <button class="btn-secondary prev-lesson-btn" data-lesson-id="${prevLesson.id}" style="padding:9px 16px; border-radius:30px; font-size:0.82rem; font-weight:700; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                        <i data-lucide="arrow-right" style="width:15px;height:15px;"></i>
                        <span>الدرس السابق</span>
                      </button>
                    ` : ''}

                    ${nextLesson ? `
                      <button class="btn-secondary next-lesson-btn" data-lesson-id="${nextLesson.id}" style="padding:9px 16px; border-radius:30px; font-size:0.82rem; font-weight:700; border-color:var(--primary); color:var(--primary); display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                        <span>الدرس التالي</span>
                        <i data-lucide="arrow-left" style="width:15px;height:15px;"></i>
                      </button>
                    ` : ''}
                  </div>
                </div>
              ` : ''}

              <!-- Dedicated Lesson Description & Details Card -->
              <div class="glass-card" style="padding:26px; border-radius:22px; border:1px solid var(--border-color); background:var(--bg-card); display:flex; flex-direction:column; gap:20px;">
                
                <!-- Lesson Header & Teacher Row -->
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:14px; border-bottom:1px solid var(--border-color); padding-bottom:18px;">
                  <div>
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                      <span style="font-size:0.76rem; font-weight:800; padding:3px 10px; border-radius:12px; background:rgba(99,102,241,0.1); color:var(--primary);">
                        ${this.currentLesson?.chapter || 'الوحدة الدراسية'}
                      </span>
                      ${this.currentLesson?.duration ? `
                        <span style="font-size:0.76rem; font-weight:700; color:var(--text-muted); background:var(--bg-app); padding:3px 10px; border-radius:12px; border:1px solid var(--border-color);">
                          ⏱️ المدة: ${this.currentLesson.duration} دقيقة
                        </span>
                      ` : ''}
                    </div>
                    <h2 style="font-size:1.4rem; font-weight:900; color:var(--text-main); margin:0 0 8px 0; line-height:1.3;">
                      ${this.currentLesson ? this.currentLesson.title : (this.course?.title || 'تفاصيل الدورة')}
                    </h2>
                    <div style="display:flex; align-items:center; gap:10px; font-size:0.85rem; color:var(--text-muted);">
                      <img src="${this.course?.teacher?.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Teacher'}" alt="Teacher" style="width:28px; height:28px; border-radius:50%; border:1.5px solid var(--primary); object-fit:cover;">
                      <span>المعلم: <strong style="color:var(--text-main);">${this.course?.teacher?.name || 'الأستاذ'}</strong></span>
                    </div>
                  </div>
                </div>

                <!-- Attached Lesson Photo / Summary (If present) -->
                ${this.currentLesson?.photo ? `
                  <div style="background:var(--bg-app); padding:16px; border-radius:16px; border:1px solid var(--border-color);">
                    <div style="font-size:0.88rem; font-weight:800; color:var(--text-main); margin-bottom:10px; display:flex; align-items:center; justify-content:space-between;">
                      <span style="display:flex; align-items:center; gap:6px;">
                        <i data-lucide="image" style="color:var(--primary); width:18px; height:18px;"></i>
                        صورة ملخص / سبورة الدرس (${this.currentLesson.title})
                      </span>
                      <a href="${this.currentLesson.photo}" target="_blank" rel="noopener" class="btn-secondary" style="font-size:0.78rem; padding:5px 12px; border-radius:16px; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                        <i data-lucide="external-link" style="width:13px;height:13px;"></i> عرض بحجم كامل
                      </a>
                    </div>
                    <div style="border-radius:12px; overflow:hidden; border:1px solid var(--border-color); text-align:center; background:#000;">
                      <img src="${this.currentLesson.photo}" alt="ملخص الدرس" style="max-width:100%; max-height:480px; object-fit:contain; cursor:pointer;" onclick="window.open('${this.currentLesson.photo}', '_blank')">
                    </div>
                  </div>
                ` : ''}

                <!-- Attached Lesson Resource / File (If present) -->
                ${this.currentLesson?.resourceUrl ? `
                  <div style="background:rgba(99,102,241,0.06); padding:14px 18px; border-radius:16px; border:1px solid rgba(99,102,241,0.2); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                      <div style="width:38px; height:38px; border-radius:10px; background:rgba(99,102,241,0.15); color:var(--primary); display:flex; align-items:center; justify-content:center;">
                        <i data-lucide="file-text" style="width:20px; height:20px;"></i>
                      </div>
                      <div>
                        <strong style="font-size:0.92rem; color:var(--text-main); display:block;">${this.currentLesson.resourceTitle || 'الملف والمورد المرفق مع الدرس'}</strong>
                        <span style="font-size:0.75rem; color:var(--text-muted);">انقر لتحميل أو فتح المستند والمذكرة</span>
                      </div>
                    </div>
                    <a href="${this.currentLesson.resourceUrl}" target="_blank" rel="noopener" class="btn-primary" style="font-size:0.82rem; padding:8px 16px; text-decoration:none; border-radius:12px; display:inline-flex; align-items:center; gap:6px;">
                      <i data-lucide="download" style="width:15px; height:15px;"></i> تنزيل المورد
                    </a>
                  </div>
                ` : ''}

                <!-- Lesson Description Section -->
                <div>
                  <h3 style="font-size:1.05rem; font-weight:800; color:var(--text-main); margin:0 0 10px 0; display:flex; align-items:center; gap:8px;">
                    <i data-lucide="align-right" style="width:18px; height:18px; color:var(--primary);"></i>
                    وصف الدرس وما يتضمنه:
                  </h3>
                  <div style="font-size:0.94rem; line-height:1.8; color:var(--text-main); background:var(--bg-app); border:1px solid var(--border-color); border-radius:16px; padding:18px 20px; white-space:pre-wrap;">
                    ${this.currentLesson ? (this.currentLesson.description || 'لا يوجد وصف تفصيلي مضاف لهذا الدرس.') : (this.course?.description || 'لا يوجد وصف للدورة.')}
                  </div>
                </div>

                <!-- Teacher Notes for this lesson (if any) -->
                ${this.currentLesson?.notes ? `
                  <div style="background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.25); border-radius:16px; padding:16px 18px;">
                    <h4 style="font-size:0.92rem; font-weight:800; color:#d97706; margin:0 0 8px 0; display:flex; align-items:center; gap:6px;">
                      <i data-lucide="lightbulb" style="width:16px; height:16px;"></i>
                      ملاحظات وتوجيهات الأستاذ للدرس:
                    </h4>
                    <p style="font-size:0.88rem; color:var(--text-main); margin:0; line-height:1.6; white-space:pre-wrap;">
                      ${this.currentLesson.notes}
                    </p>
                  </div>
                ` : ''}

                <!-- Group Hub Redirection Banner -->
                <div style="background:linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.06)); border:1.5px solid rgba(99,102,241,0.25); border-radius:18px; padding:18px 22px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; margin-top:8px;">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:42px; height:42px; border-radius:12px; background:rgba(99,102,241,0.15); color:var(--primary); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                      <i data-lucide="users" style="width:22px; height:22px;"></i>
                    </div>
                    <div>
                      <div style="font-weight:800; font-size:0.95rem; color:var(--text-main);">الواجبات، الحصص المباشرة والأنشطة في قاعة المجموعة 👥</div>
                      <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">جميع تكليفات الدروس، تقارير الحصص، والنقاشات التفاعلية متاحة في قاعة المجموعة الرسمية.</div>
                    </div>
                  </div>
                  ${enrolledGroupId ? `
                    <a href="#group/${enrolledGroupId}" class="btn-primary" style="text-decoration:none; padding:9px 20px; border-radius:24px; font-weight:800; font-size:0.85rem; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 14px rgba(99,102,241,0.25);">
                      <span>الانتقال لقاعة المجموعة 🚀</span>
                    </a>
                  ` : `
                    <a href="#student-groups" class="btn-secondary" style="text-decoration:none; padding:9px 18px; border-radius:24px; font-weight:800; font-size:0.82rem; display:inline-flex; align-items:center; gap:6px;">
                      <span>قائمة مجموعاتي 👥</span>
                    </a>
                  `}
                </div>

              </div>

            </div>

            <!-- Right Column: Units & Lessons Curriculum Sidebar -->
            <div class="sidebar-curriculum-sticky glass-card" style="position:sticky; top:88px; border-radius:24px; border:1px solid var(--border-color); padding:22px; background:var(--bg-card); box-shadow:0 8px 30px rgba(0,0,0,0.04); max-height:calc(100vh - 110px); overflow-y:auto; display:flex; flex-direction:column; gap:16px;">
              
              <!-- Curriculum Header -->
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                  <h3 style="margin:0; font-size:1.1rem; font-weight:900; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                    <i data-lucide="layers" style="color:var(--primary); width:20px; height:20px;"></i>
                    الوحدات والدروس 📚
                  </h3>
                  <span style="font-size:0.78rem; font-weight:800; color:var(--primary); background:rgba(99,102,241,0.1); padding:3px 10px; border-radius:12px;">
                    ${totalLessonsCount} درس
                  </span>
                </div>

                <!-- Search inside lessons -->
                <div style="position:relative; margin-bottom:12px;">
                  <input type="text" id="curriculum-search-input" class="form-input" value="${this.searchQuery}" placeholder="🔍 ابحث في عناوين الدروس..." style="width:100%; border-radius:12px; padding:8px 12px; font-size:0.82rem; background:var(--bg-app); box-sizing:border-box;">
                </div>

                <!-- Overall Progress Bar -->
                <div style="background:var(--bg-app); border-radius:12px; padding:12px; border:1px solid var(--border-color);">
                  <div style="display:flex; justify-content:space-between; font-size:0.78rem; font-weight:700; margin-bottom:6px; color:var(--text-main);">
                    <span>مستوى الإنجاز في الدورة</span>
                    <span>${completionPercentage}%</span>
                  </div>
                  <div style="width:100%; height:7px; background:rgba(0,0,0,0.06); border-radius:10px; overflow:hidden;">
                    <div style="width:${completionPercentage}%; height:100%; background:linear-gradient(90deg, var(--primary), #10b981); transition:width 0.4s ease;"></div>
                  </div>
                </div>
              </div>

              <!-- Units & Lessons Accordion List -->
              <div style="display:flex; flex-direction:column; gap:16px;" id="curriculum-units-container">
                ${hasLessons ? Object.keys(chapters).map((chName) => {
                  const chLessons = chapters[chName] || [];
                  const chCompleted = chLessons.filter(l => this.completedLessons.includes(l.id)).length;
                  return `
                    <div class="chapter-group-modern" style="display:flex; flex-direction:column; gap:8px;">
                      <!-- Unit Header -->
                      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; border-radius:12px; background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.15);">
                        <span style="font-size:0.88rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                          <i data-lucide="folder" style="width:16px; height:16px; color:var(--primary);"></i>
                          ${chName}
                        </span>
                        <span style="font-size:0.72rem; font-weight:800; color:var(--text-muted); background:var(--bg-card); padding:2px 8px; border-radius:10px;">
                          ${chCompleted}/${chLessons.length}
                        </span>
                      </div>

                      <!-- Lessons in Unit -->
                      <div class="lesson-list-items" style="display:flex; flex-direction:column; gap:6px; padding-inline-start:4px;">
                        ${chLessons.map(lesson => {
                          const isActive = this.currentLesson && lesson.id === this.currentLesson.id;
                          const isChecked = this.completedLessons.includes(lesson.id);
                          return `
                            <div class="lesson-item-row ${isActive ? "active" : ""} ${isChecked ? "completed" : ""}" data-lesson-id="${lesson.id}" style="padding:10px 12px; border-radius:12px; border:1px solid ${isActive ? 'var(--primary)' : 'var(--border-color)'}; background:${isActive ? 'rgba(99,102,241,0.1)' : 'var(--bg-app)'}; cursor:pointer; transition:all 0.2s ease; display:flex; align-items:center; justify-content:space-between; gap:8px; ${isActive ? 'box-shadow:0 4px 14px rgba(99,102,241,0.15);' : ''}">
                              <div style="display:flex; align-items:center; gap:10px; flex-grow:1; overflow:hidden;">
                                <div class="lesson-checkbox ${isChecked ? "checked" : ""}" data-lesson-id="${lesson.id}" style="flex-shrink:0; width:20px; height:20px; border-radius:6px; border:1.5px solid ${isChecked ? '#10b981' : 'var(--border-color)'}; background:${isChecked ? '#10b981' : 'transparent'}; display:flex; align-items:center; justify-content:center; color:#fff;">
                                  ${isChecked ? '<i data-lucide="check" style="width:13px;height:13px;"></i>' : ""}
                                </div>
                                <div style="display:flex; flex-direction:column; gap:2px; overflow:hidden;">
                                  <span class="lesson-item-title" style="font-size:0.85rem; font-weight:${isActive ? '800' : '600'}; color:${isActive ? 'var(--primary)' : 'var(--text-main)'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${lesson.title}">
                                    ${lesson.title}
                                  </span>
                                  <div style="display:flex; align-items:center; gap:6px; font-size:0.72rem; color:var(--text-muted);">
                                    ${lesson.duration ? `<span>⏱️ ${lesson.duration} د</span>` : ''}
                                    ${lesson.resourceUrl ? '<span style="color:var(--primary); font-weight:700;">• 📎 ملف</span>' : ''}
                                    ${lesson.photo ? '<span style="color:#d97706; font-weight:700;">• 🖼️ ملخص</span>' : ''}
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
                  <div style="padding:30px 16px; text-align:center; color:var(--text-muted); font-size:0.85rem;">
                    لا توجد دروس مضافة في هذه الدورة بعد.
                  </div>
                `}
              </div>

            </div>

          </div>

        </div>
      `;

      this.bindEvents();
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error("CoursePlayerView render error:", err);
      this.container.innerHTML = `<div style="padding:40px; text-align:center; color:var(--error);">حدث خطأ أثناء تحميل الدورة.</div>`;
    }
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
            الفيديو غير مدعوم في متصفحك
          </video>
        `;
      }

      // Convert YouTube / youtu.be watch links to embed links
      const getEmbedUrl = (url) => {
        const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&showinfo=0`;
        if (url.includes("youtube.com/embed/")) return url;
        const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
        if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
        return url;
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
            <i data-lucide="book-open" style="width:28px; height:28px;"></i>
          </div>
          <span style="font-size:0.78rem; font-weight:800; background:var(--primary-glow); color:var(--primary); padding:4px 12px; border-radius:20px; display:inline-block; margin-bottom:10px;">
            📖 محتوى الدرس
          </span>
          <h2 style="font-size:1.35rem; font-weight:900; color:#ffffff; margin:0 0 8px 0;">${this.currentLesson.title}</h2>
          <p style="color:#a1a1aa; font-size:0.88rem; margin-bottom:0; line-height:1.6;">تصفح تفاصيل ووصف وملاحظات هذا الدرس في الأسفل.</p>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Lesson row selection
    this.container.querySelectorAll(".lesson-item-row").forEach(row => {
      row.addEventListener("click", (e) => {
        if (e.target.closest(".lesson-checkbox")) return;
        const lessonId = row.getAttribute("data-lesson-id");
        const selected = (this.course.lessons || []).find(l => String(l.id) === String(lessonId));
        if (selected) {
          this.currentLesson = selected;
          this.render();
        }
      });
    });

    // Checkbox toggle
    this.container.querySelectorAll(".lesson-checkbox").forEach(cb => {
      cb.addEventListener("click", async (e) => {
        e.stopPropagation();
        const lessonId = cb.getAttribute("data-lesson-id");
        const isCurrentlyChecked = cb.classList.contains("checked");
        try {
          await apiFetch(`/student/enrollments/${this.courseId}/lessons/complete`, {
            method: "POST",
            body: JSON.stringify({ lessonId, complete: !isCurrentlyChecked })
          });
          if (isCurrentlyChecked) {
            this.completedLessons = this.completedLessons.filter(id => String(id) !== String(lessonId));
          } else {
            this.completedLessons.push(lessonId);
          }
          showToast(isCurrentlyChecked ? "تم إلغاء إكمال الدرس" : "تم إكمال الدرس بنجاح ✓", "success");
          this.render();
        } catch (err) {
          showToast(err.message || "تعذر تحديث حالة الدرس", "error");
        }
      });
    });

    // Hero Complete button
    const heroBtn = this.container.querySelector(".lesson-completion-hero-btn");
    if (heroBtn) {
      heroBtn.addEventListener("click", async () => {
        const lessonId = heroBtn.getAttribute("data-lesson-id");
        const isCurrentlyChecked = heroBtn.classList.contains("completed");
        try {
          await apiFetch(`/student/enrollments/${this.courseId}/lessons/complete`, {
            method: "POST",
            body: JSON.stringify({ lessonId, complete: !isCurrentlyChecked })
          });
          if (isCurrentlyChecked) {
            this.completedLessons = this.completedLessons.filter(id => String(id) !== String(lessonId));
          } else {
            this.completedLessons.push(lessonId);
          }
          showToast(isCurrentlyChecked ? "تم إلغاء إكمال الدرس" : "تم إكمال الدرس بنجاح ✓", "success");
          this.render();
        } catch (err) {
          showToast(err.message || "تعذر تحديث حالة الدرس", "error");
        }
      });
    }

    // Prev / Next buttons
    this.container.querySelector(".prev-lesson-btn")?.addEventListener("click", (e) => {
      const lessonId = e.currentTarget.getAttribute("data-lesson-id");
      const selected = (this.course.lessons || []).find(l => String(l.id) === String(lessonId));
      if (selected) {
        this.currentLesson = selected;
        this.render();
      }
    });

    this.container.querySelector(".next-lesson-btn")?.addEventListener("click", (e) => {
      const lessonId = e.currentTarget.getAttribute("data-lesson-id");
      const selected = (this.course.lessons || []).find(l => String(l.id) === String(lessonId));
      if (selected) {
        this.currentLesson = selected;
        this.render();
      }
    });

    // Curriculum search
    const searchInput = this.container.querySelector("#curriculum-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value;
        const query = this.searchQuery.toLowerCase().trim();
        this.container.querySelectorAll(".chapter-group-modern").forEach(group => {
          let hasVisible = false;
          group.querySelectorAll(".lesson-item-row").forEach(row => {
            const titleEl = row.querySelector(".lesson-item-title");
            const title = titleEl ? titleEl.textContent.toLowerCase() : "";
            if (!query || title.includes(query)) {
              row.style.display = "flex";
              hasVisible = true;
            } else {
              row.style.display = "none";
            }
          });
          group.style.display = (!query || hasVisible) ? "flex" : "none";
        });
      });
    }
  }

  onDestroy() {
    const video = this.container.querySelector("#course-video-element");
    if (video) video.pause();
  }
}
