import { apiFetch, state, showToast, t, confirmDialog } from "../../app.js";

export default class CourseManageView {
  constructor(container, courseId) {
    this.container = container;
    this.courseId = courseId;
    this.course = null;
    this.courseResources = [];
    this.activeTab = "curriculum"; // 'curriculum', 'resources', or 'settings'
    this.customUnits = [];
  }

  async render() {
    try {
      if (!state.user || (state.user.role !== "teacher" && state.user.role !== "admin")) {
        window.location.hash = "#landing";
        return;
      }

      const [course, allResources, enrollments, allAssignments, groups] = await Promise.all([
        apiFetch(`/courses/${this.courseId}`).catch(err => ({ error: err.message || "فشل تحميل الدورة" })),
        apiFetch("/resources").catch(() => []),
        apiFetch(`/courses/${this.courseId}/enrollments`).catch(() => []),
        apiFetch("/assignments").catch(() => []),
        apiFetch(`/courses/${this.courseId}/groups`).catch(() => [])
      ]);

      if (!course || course.error) {
        showToast(course?.error || "تعذر تحميل بيانات الدورة التعليمية. قد تكون حُذفت أو غير موجودة.", "error");
        window.location.hash = state.user.role === "admin" ? "#admin" : "#teacher-portal";
        return;
      }

      this.course = course;
      this.courseResources = (allResources || []).filter(r => r.course && String(r.course.id) === String(this.courseId));
      this.courseEnrollments = enrollments || [];
      this.courseAssignments = (allAssignments || []).filter(a => a.course && String(a.course.id) === String(this.courseId));
      this.courseGroups = groups || [];

      const teacherId = course.teacher?.id || course.teacherId;
      if (teacherId && teacherId !== state.user.id && state.user.role !== "admin") {
        showToast("غير مسموح لك بتعديل هذه الدورة.", "error");
        window.location.hash = state.user.role === "admin" ? "#admin" : "#teacher-portal";
        return;
      }

      const statusMap = {
        'PUBLISHED': { label: '🟢 منشورة (متاحة للطلاب)', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
        'PENDING_REVIEW': { label: '🟡 قيد المراجعة والاعتماد', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
        'REJECTED': { label: '🔴 تحتاج لتعديل', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
        'DRAFT': { label: '⚪ مسودة', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' }
      };
      const st = statusMap[this.course.status] || { label: this.course.status || 'نشطة', color: '#10b981', bg: 'rgba(16,185,129,0.15)' };

      this.container.innerHTML = `
        <div style="max-width:1400px; margin:0 auto; padding:32px 20px; font-family:'Cairo', sans-serif;">
          
          <!-- Hero Course Header Banner -->
          <div class="course-manage-hero" style="background:linear-gradient(135deg, rgba(99,102,241,0.12), rgba(16,185,129,0.08)); border-radius:24px; padding:28px; border:1px solid var(--border-color); backdrop-filter:blur(10px); margin-bottom:28px; box-shadow:0 10px 30px rgba(0,0,0,0.04);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:20px;">
              <div style="display:flex; gap:20px; align-items:center; flex-wrap:wrap;">
                <div style="width:100px; height:100px; border-radius:20px; overflow:hidden; border:2px solid var(--primary-glow); background:var(--bg-app); flex-shrink:0; box-shadow:0 8px 20px rgba(0,0,0,0.08);">
                  <img src="${this.course.image || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600'}" style="width:100%; height:100%; object-fit:cover;" />
                </div>
                <div>
                  <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap;">
                    <span class="badge" style="background:var(--primary-glow); color:var(--primary); font-weight:800; font-size:0.78rem;">${this.course.category || 'عام'}</span>
                    <span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-weight:800; font-size:0.78rem;">${this.course.degree || 'جميع الصفوف'}</span>
                    <span style="font-size:0.78rem; font-weight:800; padding:4px 12px; border-radius:20px; background:${st.bg}; color:${st.color};">${st.label}</span>
                  </div>
                  <h1 style="font-size:1.6rem; font-weight:900; margin:0 0 6px 0; color:var(--text-main); line-height:1.3;">${this.course.title}</h1>
                  <div style="font-size:0.85rem; color:var(--text-muted); display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
                    <span><i data-lucide="user" style="width:14px;height:14px;vertical-align:middle;margin-inline-end:4px;"></i> الأستاذ: ${this.course.teacher?.name || 'المعلم'}</span>
                    <span><i data-lucide="book-open" style="width:14px;height:14px;vertical-align:middle;margin-inline-end:4px;"></i> ${(this.course.lessons || []).length} دروس</span>
                    <span><i data-lucide="folder-open" style="width:14px;height:14px;vertical-align:middle;margin-inline-end:4px;"></i> ${this.courseResources.length} ملفات</span>
                  </div>
                </div>
              </div>

              <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                <a href="${state.user.role === 'admin' ? '#admin' : '#teacher-portal'}" class="btn-secondary" style="padding:10px 18px; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                  <i data-lucide="arrow-right"></i> ${state.user.role === 'admin' ? 'لوحة التحكم' : 'بوابة المعلم'}
                </a>
                <a href="#course/${this.course.id}" target="_blank" class="btn-primary" style="padding:10px 20px; font-weight:800; text-decoration:none; background:var(--primary); display:inline-flex; align-items:center; gap:6px;">
                  <i data-lucide="eye"></i> معاينة الدورة كطالب 👁️
                </a>
              </div>
            </div>
          </div>

          <!-- Segmented Navigation Tabs Bar -->
          <div style="display:flex; gap:12px; margin-bottom:28px; border-bottom:1px solid var(--border-color); padding-bottom:14px; flex-wrap:wrap;">
            <button class="manage-tab-btn ${this.activeTab === 'curriculum' ? 'active' : ''}" data-tab="curriculum" style="padding:12px 24px; border-radius:30px; font-weight:800; font-size:0.92rem; border:1px solid var(--border-color); background:var(--bg-card); color:var(--text-muted); cursor:pointer; transition:all 0.2s ease;">
              <i data-lucide="list-tree" style="width:16px;height:16px;vertical-align:middle;margin-inline-end:6px;"></i> 📚 المنهج والدروس
            </button>
            <button class="manage-tab-btn ${this.activeTab === 'groups' ? 'active' : ''}" data-tab="groups" style="padding:12px 24px; border-radius:30px; font-weight:800; font-size:0.92rem; border:1px solid var(--border-color); background:var(--bg-card); color:var(--text-muted); cursor:pointer; transition:all 0.2s ease;">
              <i data-lucide="users" style="width:16px;height:16px;vertical-align:middle;margin-inline-end:6px;"></i> 👥 المجموعات وحصص البث (${(this.courseGroups || []).length})
            </button>
            <button class="manage-tab-btn ${this.activeTab === 'assignments' ? 'active' : ''}" data-tab="assignments" style="padding:12px 24px; border-radius:30px; font-weight:800; font-size:0.92rem; border:1px solid var(--border-color); background:var(--bg-card); color:var(--text-muted); cursor:pointer; transition:all 0.2s ease;">
              <i data-lucide="clipboard-list" style="width:16px;height:16px;vertical-align:middle;margin-inline-end:6px;"></i> 📝 الواجبات والأنشطة (${(this.courseAssignments || []).length})
            </button>
            <button class="manage-tab-btn ${this.activeTab === 'students' ? 'active' : ''}" data-tab="students" style="padding:12px 24px; border-radius:30px; font-weight:800; font-size:0.92rem; border:1px solid var(--border-color); background:var(--bg-card); color:var(--text-muted); cursor:pointer; transition:all 0.2s ease;">
              <i data-lucide="users" style="width:16px;height:16px;vertical-align:middle;margin-inline-end:6px;"></i> 👨‍🎓 الطلاب (${(this.courseEnrollments || []).length})
            </button>
            <button class="manage-tab-btn ${this.activeTab === 'resources' ? 'active' : ''}" data-tab="resources" style="padding:12px 24px; border-radius:30px; font-weight:800; font-size:0.92rem; border:1px solid var(--border-color); background:var(--bg-card); color:var(--text-muted); cursor:pointer; transition:all 0.2s ease;">
              <i data-lucide="folder-open" style="width:16px;height:16px;vertical-align:middle;margin-inline-end:6px;"></i> 📂 الموارد والملفات (${this.courseResources.length})
            </button>
            <button class="manage-tab-btn ${this.activeTab === 'settings' ? 'active' : ''}" data-tab="settings" style="padding:12px 24px; border-radius:30px; font-weight:800; font-size:0.92rem; border:1px solid var(--border-color); background:var(--bg-card); color:var(--text-muted); cursor:pointer; transition:all 0.2s ease;">
              <i data-lucide="settings" style="width:16px;height:16px;vertical-align:middle;margin-inline-end:6px;"></i> ⚙️ إعدادات الدورة والاجتماع
            </button>
          </div>

          <!-- Main Content Pane -->
          <div class="manage-content">
            ${this.activeTab === 'curriculum' ? this.renderCurriculum() :
              this.activeTab === 'groups' ? this.renderGroupsTab() :
              this.activeTab === 'assignments' ? this.renderAssignmentsTab() :
              this.activeTab === 'students' ? this.renderStudentsTab() :
              this.activeTab === 'resources' ? this.renderResourcesTab() :
              this.renderSettings()
            }
          </div>
        </div>

        <style>
          .manage-tab-btn:hover {
            background: rgba(99, 102, 241, 0.08) !important; color: var(--primary) !important; border-color: var(--primary-glow) !important;
          }
          .manage-tab-btn.active {
            background: linear-gradient(135deg, var(--primary), var(--accent)) !important; color: #ffffff !important; border-color: var(--primary) !important; box-shadow: 0 4px 15px var(--primary-glow) !important;
          }
          .chapter-box {
            background: var(--bg-card); border: 1px solid var(--border-color);
            border-radius: 18px; margin-bottom: 24px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          }
          .chapter-header {
            background: var(--bg-app); border-bottom: 1px solid var(--border-color);
            padding: 18px 24px; display: flex; align-items: center; justify-content: space-between;
            font-weight: 800; font-size: 1.05rem; color: var(--text-color);
          }
          .lesson-item {
            padding: 16px 24px; border-bottom: 1px solid var(--border-color);
            display: flex; align-items: center; justify-content: space-between;
            transition: background 0.2s ease;
          }
          .lesson-item:hover { background: rgba(99, 102, 241, 0.04); }
          .lesson-item:last-child { border-bottom: none; }
          .lesson-actions button {
            background: var(--bg-app); border: 1px solid var(--border-color); cursor: pointer; color: var(--text-muted);
            padding: 7px 12px; border-radius: 10px; transition: all 0.2s ease;
            display: inline-flex; align-items: center; justify-content: center; gap: 4px; font-weight: 700; font-size: 0.8rem;
          }
          .lesson-actions button:hover { background: var(--primary-glow); color: var(--primary); border-color: var(--primary); }
          /* Quill RTL editor styling */
          .ql-toolbar { background: var(--bg-app) !important; border: 1px solid var(--border-color) !important; border-bottom: none !important; border-radius: 12px 12px 0 0 !important; }
          .ql-container { border: none !important; font-size: 0.92rem !important; }
          .ql-editor { min-height: 120px !important; font-family: 'Cairo', sans-serif !important; direction: rtl !important; text-align: right !important; color: var(--text-main) !important; padding: 12px 14px !important; }
          .ql-editor.ql-blank::before { right: 14px !important; left: auto !important; color: var(--text-muted) !important; font-style: normal !important; }
          .ql-snow .ql-stroke { stroke: var(--text-muted) !important; }
          .ql-snow .ql-fill { fill: var(--text-muted) !important; }
          .ql-snow .ql-picker { color: var(--text-muted) !important; }
          .ql-snow.ql-toolbar button:hover .ql-stroke, .ql-snow .ql-toolbar button:hover .ql-stroke { stroke: var(--primary) !important; }
        </style>

        <!-- Modals -->
        ${this.renderLessonModal()}
      `;

      if (window.lucide) window.lucide.createIcons();
      this.bindEvents();
    } catch (err) {
      console.error(err);
      this.container.innerHTML = `<div style="padding:60px; text-align:center; color:var(--error);">فشل تحميل بيانات الدورة التعليمية.</div>`;
    }
  }

  renderCurriculum() {
    const lessons = this.course.lessons || [];
    const chaptersMap = {};

    // 1. Get ordered list of units based on course.unitsOrder
    const orderedUnits = Array.isArray(this.course.unitsOrder) ? [...this.course.unitsOrder] : [];
    
    // Collect all units that exist in lessons or customUnits
    const allKnownUnits = Array.from(new Set([
      ...orderedUnits,
      ...(this.customUnits || []),
      ...lessons.map(l => l.chapter || "الوحدة العامة")
    ])).filter(Boolean);

    // Initialize all units in map
    allKnownUnits.forEach(unitName => {
      chaptersMap[unitName] = [];
    });

    lessons.forEach(l => {
      const chName = l.chapter || "الوحدة العامة";
      if (!chaptersMap[chName]) chaptersMap[chName] = [];
      chaptersMap[chName].push(l);
    });

    // Ensure lessons within each unit are sorted by order
    Object.keys(chaptersMap).forEach(k => {
      chaptersMap[k].sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    const chapterNames = allKnownUnits;

    let chaptersHtml = "";

    if (chapterNames.length === 0) {
      chaptersHtml = `
        <div class="glass-card" style="text-align:center; padding:50px; color:var(--text-muted);">
          <i data-lucide="book-open" style="width:48px; height:48px; margin-bottom:12px; opacity:0.4;"></i>
          <h4 style="font-weight:700; margin-bottom:6px;">لا توجد وحدات دراسية أو دروس مضافة بعد</h4>
          <p style="font-size:0.9rem; margin-bottom:20px;">اضغط على "إضافة وحدة دراسية جديدة" أو "إضافة درس جديد" لبدء تنظيم منهج الدورة.</p>
          <div style="display:flex; justify-content:center; gap:12px;">
            <button class="btn-secondary open-add-unit-modal-btn" style="padding:10px 20px; font-weight:800;">
              <i data-lucide="folder-plus"></i> إضافة وحدة دراسية
            </button>
            <button class="btn-primary open-add-lesson-modal-btn" style="padding:10px 20px; font-weight:800;">
              <i data-lucide="plus-circle"></i> إضافة درس جديد
            </button>
          </div>
        </div>
      `;
    } else {
      chaptersHtml = chapterNames.map((chName, unitIdx) => {
        const chLessons = chaptersMap[chName] || [];
        const isFirstUnit = unitIdx === 0;
        const isLastUnit = unitIdx === chapterNames.length - 1;

        return `
          <div class="chapter-box" data-unit-name="${chName}" style="border:1px solid var(--border-color); border-radius:18px; background:var(--bg-card); margin-bottom:20px; overflow:hidden; box-shadow:0 4px 16px rgba(0,0,0,0.03);">
            <div class="chapter-header" style="background:linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.05)); padding:16px 22px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; border-bottom:1px solid var(--border-color);">
              <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                <span style="width:30px; height:30px; border-radius:8px; background:var(--primary-glow); color:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.85rem;">
                  ${unitIdx + 1}
                </span>
                <i data-lucide="folder-open" style="width:20px; height:20px; color:var(--primary);"></i>
                <span style="font-size:1.1rem; font-weight:800; color:var(--text-main);">${chName}</span>
                <span class="badge" style="background:rgba(99,102,241,0.12); color:var(--primary); font-size:0.75rem; font-weight:800; padding:4px 10px; border-radius:12px;">
                  ${chLessons.length} دروس
                </span>
              </div>

              <!-- Unit Action Controls (Reorder, Rename, Delete, Add Lesson) -->
              <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <!-- Arrange Unit Buttons -->
                <div style="display:inline-flex; background:var(--bg-app); border:1px solid var(--border-color); border-radius:10px; padding:2px; margin-inline-end:4px;">
                  <button type="button" class="btn-move-unit-up" data-unit="${chName}" ${isFirstUnit ? "disabled" : ""} title="تحريك الوحدة للأعلى (تقديم الترتيب)" style="background:none; border:none; padding:5px 8px; border-radius:6px; cursor:${isFirstUnit ? "not-allowed" : "pointer"}; opacity:${isFirstUnit ? "0.3" : "1"}; color:var(--text-main); display:flex; align-items:center;">
                    <i data-lucide="arrow-up" style="width:15px; height:15px;"></i>
                  </button>
                  <button type="button" class="btn-move-unit-down" data-unit="${chName}" ${isLastUnit ? "disabled" : ""} title="تحريك الوحدة للأسفل (تأخير الترتيب)" style="background:none; border:none; padding:5px 8px; border-radius:6px; cursor:${isLastUnit ? "not-allowed" : "pointer"}; opacity:${isLastUnit ? "0.3" : "1"}; color:var(--text-main); display:flex; align-items:center;">
                    <i data-lucide="arrow-down" style="width:15px; height:15px;"></i>
                  </button>
                </div>

                <!-- Rename Unit -->
                <button type="button" class="btn-secondary btn-rename-unit" data-unit="${chName}" title="تعديل اسم الوحدة" style="padding:6px 12px; font-size:0.8rem; border-radius:10px; font-weight:700; display:inline-flex; align-items:center; gap:5px;">
                  <i data-lucide="edit-2" style="width:14px; height:14px; color:var(--primary);"></i> تعديل الوحدة
                </button>

                <!-- Delete Unit -->
                <button type="button" class="btn-secondary btn-delete-unit" data-unit="${chName}" data-count="${chLessons.length}" title="حذف الوحدة" style="padding:6px 10px; font-size:0.8rem; border-radius:10px; color:var(--error); border-color:rgba(239,68,68,0.25); display:inline-flex; align-items:center; gap:4px;">
                  <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                </button>

                <!-- Add Lesson To Unit -->
                <button type="button" class="btn-primary add-lesson-to-unit-btn" data-unit="${chName}" style="font-size:0.8rem; padding:6px 14px; border-radius:10px; font-weight:800; display:inline-flex; align-items:center; gap:5px;">
                  <i data-lucide="plus" style="width:14px; height:14px;"></i> إضافة درس
                </button>
              </div>
            </div>

            <!-- Lessons in this unit -->
            <div style="padding:8px;">
              ${chLessons.length === 0 ? `
                <div style="padding:24px; text-align:center; color:var(--text-muted); font-size:0.88rem;">
                  لا توجد دروس في هذه الوحدة حتى الآن. 
                  <button class="add-lesson-to-unit-btn" data-unit="${chName}" style="background:none; border:none; color:var(--primary); font-weight:800; cursor:pointer; text-decoration:underline; margin-inline-start:4px;">
                    إضافة أول درس لهذه الوحدة ➕
                  </button>
                </div>
              ` : chLessons.map((l, lessonIdx) => {
                const isFirstLesson = lessonIdx === 0;
                const isLastLesson = lessonIdx === chLessons.length - 1;

                return `
                  <div class="lesson-item" style="padding:12px 18px; border-radius:12px; margin-bottom:6px; background:var(--bg-app); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; transition:all 0.2s ease;">
                    <div style="display:flex; align-items:center; gap:12px; min-width:240px; flex:1;">
                      <div style="width:28px; height:28px; border-radius:50%; background:rgba(99,102,241,0.1); color:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.8rem; flex-shrink:0;">
                        ${lessonIdx + 1}
                      </div>
                      <div>
                        <div style="font-weight:700; color:var(--text-main); font-size:0.92rem; display:flex; align-items:center; gap:6px;">
                          ${l.title}
                          ${l.isFree ? `<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-size:0.68rem; font-weight:800; padding:2px 6px;">مجاني</span>` : ''}
                        </div>
                        <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px; display:flex; align-items:center; gap:10px;">
                          <span><i data-lucide="clock" style="width:12px;height:12px;vertical-align:middle;"></i> ${l.duration || '15:00'}</span>
                          ${l.videoUrl ? `<span style="color:#2563eb; font-weight:700;"><i data-lucide="video" style="width:12px;height:12px;vertical-align:middle;"></i> فيديو</span>` : `<span style="color:var(--text-muted);">📄 ملخص/شرح</span>`}
                          ${l.resourceUrl ? `<span style="color:var(--accent); font-weight:700;"><i data-lucide="paperclip" style="width:12px;height:12px;vertical-align:middle;"></i> مرفق</span>` : ''}
                          ${l.questions && l.questions.length ? `<span style="color:#f59e0b; font-weight:700;">❓ ${l.questions.length} أسئلة</span>` : ''}
                        </div>
                      </div>
                    </div>

                    <!-- Lesson Actions (Reorder within unit, Move to other unit, Edit, Delete) -->
                    <div class="lesson-actions" style="display:flex; align-items:center; gap:6px;">
                      <!-- Lesson Order Controls -->
                      <div style="display:inline-flex; background:var(--bg-card); border:1px solid var(--border-color); border-radius:8px; padding:2px;">
                        <button type="button" class="btn-move-lesson-up" data-id="${l.id}" data-unit="${chName}" ${isFirstLesson ? "disabled" : ""} title="تحريك الدرس للأعلى" style="background:none; border:none; padding:4px 6px; border-radius:4px; cursor:${isFirstLesson ? "not-allowed" : "pointer"}; opacity:${isFirstLesson ? "0.3" : "1"}; color:var(--text-main); display:flex; align-items:center;">
                          <i data-lucide="chevron-up" style="width:14px; height:14px;"></i>
                        </button>
                        <button type="button" class="btn-move-lesson-down" data-id="${l.id}" data-unit="${chName}" ${isLastLesson ? "disabled" : ""} title="تحريك الدرس للأسفل" style="background:none; border:none; padding:4px 6px; border-radius:4px; cursor:${isLastLesson ? "not-allowed" : "pointer"}; opacity:${isLastLesson ? "0.3" : "1"}; color:var(--text-main); display:flex; align-items:center;">
                          <i data-lucide="chevron-down" style="width:14px; height:14px;"></i>
                        </button>
                      </div>

                      <!-- Move Lesson To Another Unit -->
                      <button type="button" class="btn-secondary btn-transfer-lesson-unit" data-id="${l.id}" data-unit="${chName}" data-title="${l.title}" title="نقل هذا الدرس إلى وحدة أخرى" style="padding:5px 8px; font-size:0.75rem; border-radius:8px; display:inline-flex; align-items:center; gap:4px;">
                        <i data-lucide="folder-symlink" style="width:13px; height:13px; color:var(--primary);"></i> نقل
                      </button>

                      <!-- Edit Lesson -->
                      <button type="button" class="btn-secondary edit-lesson-btn" data-id="${l.id}" title="تعديل تفاصيل الدرس" style="padding:5px 8px; font-size:0.75rem; border-radius:8px;">
                        <i data-lucide="edit-3" style="width:13px; height:13px;"></i>
                      </button>

                      <!-- Delete Lesson -->
                      <button type="button" class="btn-secondary delete-lesson-btn" data-id="${l.id}" style="color:var(--error); border-color:rgba(239,68,68,0.25); padding:5px 8px; font-size:0.75rem; border-radius:8px;" title="حذف الدرس">
                        <i data-lucide="trash-2" style="width:13px; height:13px;"></i>
                      </button>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        `;
      }).join("");
    }

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:14px;">
        <div>
          <h3 style="font-size:1.4rem; font-weight:800; margin-bottom:4px; color:var(--text-main); display:flex; align-items:center; gap:8px;">
            <i data-lucide="layers" style="color:var(--primary);"></i>
            منهج الدورة وتنظيم الوحدات والدروس
          </h3>
          <p style="color:var(--text-muted); font-size:0.88rem; margin:0;">
            إدارة، ترتيب، وإعادة تسمية الوحدات الدراسية (Units) ونقل وترتيب الدروس بكل سهولة 🚀
          </p>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn-secondary open-add-unit-modal-btn" style="padding:10px 18px; font-weight:800; border-color:var(--primary); color:var(--primary); display:inline-flex; align-items:center; gap:6px;">
            <i data-lucide="folder-plus"></i> إضافة وحدة دراسية جديدة ➕
          </button>
          <button class="btn-primary open-add-lesson-modal-btn" style="padding:10px 20px; font-weight:800; display:inline-flex; align-items:center; gap:6px;">
            <i data-lucide="plus-circle"></i> إضافة درس جديد
          </button>
        </div>
      </div>

      ${chaptersHtml}
    `;
  }

  renderObjectivesTab() {
    const objectives = this.course.objectives || [];

    return `
      <div class="glass-card" style="padding:28px; border-radius:20px; margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px; border-bottom:1px solid var(--border-color); padding-bottom:16px;">
          <div>
            <h3 style="font-size:1.3rem; font-weight:800; margin:0 0 4px 0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
              <i data-lucide="target" style="color:var(--primary);"></i>
              🎯 معايير النجاح ومخرجات تعلم الدورة (Course Success Criteria)
            </h3>
            <p style="margin:0; font-size:0.85rem; color:var(--text-muted);">أضف المعايير ومخرجات الإتقان المطلوبة التي يحققها الطالب عند الانتهاء من هذا الكورس.</p>
          </div>
          <button type="button" id="save-course-objectives-btn" class="btn-primary" style="padding:10px 22px; font-weight:800; font-size:0.9rem;">
            <i data-lucide="save"></i> حفظ معايير النجاح 💾
          </button>
        </div>

        <!-- Quick Suggestions Section -->
        <div style="margin-bottom:24px; padding:16px 20px; background:rgba(99,102,241,0.06); border-radius:14px; border:1px solid var(--primary-glow);">
          <div style="font-weight:800; font-size:0.88rem; color:var(--primary); margin-bottom:10px; display:flex; align-items:center; gap:6px;">
            <i data-lucide="sparkles" style="width:16px; height:16px;"></i> اقتراحات سريعة لإضافة معايير النجاح (انقر للإضافة المباشرة):
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:8px;">
            <button type="button" class="btn-secondary quick-add-objective-btn" data-text="استيعاب المفاهيم الأساسية واجتياز التطبيقات العملية بنجاح" style="font-size:0.8rem; padding:6px 12px; border-radius:20px;">
              ➕ استيعاب المفاهيم الأساسية وتطبيقاتها
            </button>
            <button type="button" class="btn-secondary quick-add-objective-btn" data-text="إتقان طرق الحل النموذجية لأسئلة الامتحانات الرسمية" style="font-size:0.8rem; padding:6px 12px; border-radius:20px;">
              ➕ إتقان طرق الحل النموذجية للامتحانات
            </button>
            <button type="button" class="btn-secondary quick-add-objective-btn" data-text="القدرة على حل الواجبات والتطبيقات بشكل استقلالي دقيق" style="font-size:0.8rem; padding:6px 12px; border-radius:20px;">
              ➕ حل التمارين بشكل استقلالي
            </button>
            <button type="button" class="btn-secondary quick-add-objective-btn" data-text="الحصول على التقييم النهائي والتأهيل للاختبار المباشر" style="font-size:0.8rem; padding:6px 12px; border-radius:20px;">
              ➕ التأهيل للاختبار النهائي
            </button>
          </div>
        </div>

        <!-- Input & Add Bar -->
        <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
          <input type="text" id="course-objective-input" class="form-input" placeholder="اكتب معيار نجاح جديد هنا..." style="flex:1; min-width:280px; padding:12px 16px; font-size:0.92rem;">
          <button type="button" id="add-course-objective-btn" class="btn-primary" style="padding:12px 20px; font-weight:800; font-size:0.9rem; flex-shrink:0;">
            <i data-lucide="plus"></i> إضافة معيار
          </button>
        </div>

        <!-- List of Objectives -->
        <div id="course-objectives-manage-list" style="display:flex; flex-direction:column; gap:10px;">
          ${objectives.length === 0 ? `
            <div style="padding:30px; text-align:center; color:var(--text-muted); background:var(--bg-app); border-radius:14px; border:1px dashed var(--border-color); font-size:0.9rem;">
              <i data-lucide="target" style="width:36px; height:36px; opacity:0.4; margin-bottom:8px;"></i>
              <p style="margin:0;">لم تقم بإضافة معايير نجاح لهذه الدورة حتى الآن.</p>
            </div>
          ` : objectives.map((obj, idx) => `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 18px; background:var(--bg-app); border-radius:12px; border:1px solid var(--border-color);">
              <div style="display:flex; align-items:center; gap:10px; flex:1;">
                <span style="width:28px; height:28px; border-radius:50%; background:var(--primary-glow); color:var(--primary); font-weight:800; font-size:0.8rem; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                  ${idx + 1}
                </span>
                <span style="font-weight:700; font-size:0.95rem; color:var(--text-main);">${obj}</span>
              </div>
              <button type="button" class="btn-secondary remove-course-objective-btn" data-index="${idx}" style="color:var(--error); border-color:var(--error); padding:6px 12px; font-size:0.8rem;" title="حذف المعيار">
                <i data-lucide="trash-2" style="width:14px;height:14px;"></i> حذف
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderAssignmentsTab() {
    const assignments = this.courseAssignments || [];

    return `
      <div class="glass-card" style="padding:28px; border-radius:20px; margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px; border-bottom:1px solid var(--border-color); padding-bottom:16px;">
          <div>
            <h3 style="font-size:1.3rem; font-weight:800; margin:0 0 4px 0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
              <i data-lucide="clipboard-list" style="color:var(--primary);"></i>
              إدارة الواجبات والأنشطة المدرسية (Course Assignments)
            </h3>
            <p style="margin:0; font-size:0.85rem; color:var(--text-muted);">إنشاء واجبات وتحديد مواعيد التسليم ومتابعة إجابات وتصحيح درجات الطلاب.</p>
          </div>
          <button type="button" id="open-create-assignment-modal-btn" class="btn-primary" style="padding:10px 20px; font-weight:800; font-size:0.9rem;">
            <i data-lucide="plus"></i> إضافة واجب / نشاط جديد ➕
          </button>
        </div>

        ${assignments.length === 0 ? `
          <div style="text-align:center; padding:50px; color:var(--text-muted); background:var(--bg-app); border-radius:14px; border:1px dashed var(--border-color);">
            <i data-lucide="clipboard-list" style="width:48px; height:48px; opacity:0.4; margin-bottom:10px;"></i>
            <h4 style="margin:0 0 6px 0; font-weight:800;">لا توجد واجبات أو أنشطة مضافة لهذا الكورس بعد</h4>
            <p style="margin:0; font-size:0.85rem;">اضغط على "إضافة واجب جديد" للبدء بتعيين المهام المنزلية والأنشطة للطلاب.</p>
          </div>
        ` : `
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:20px;">
            ${assignments.map(a => {
      const dueDateStr = new Date(a.dueDate).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const isOverdue = new Date() > new Date(a.dueDate);

      return `
                <div class="glass-card" style="padding:20px; border-radius:16px; border:1px solid var(--border-color); display:flex; flex-direction:column; justify-content:space-between; background:var(--bg-app);">
                  <div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; gap:8px; flex-wrap:wrap;">
                      <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                        <span class="badge" style="background:var(--primary-glow); color:var(--primary); font-weight:800; font-size:0.75rem;">
                          📝 واجب دراسي
                        </span>
                        ${a.lesson ? `<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-weight:800; font-size:0.75rem;">📌 ${a.lesson.title}</span>` : ''}
                      </div>
                      <span style="font-size:0.78rem; font-weight:700; color:${isOverdue ? 'var(--error)' : 'var(--text-muted)'};">
                        <i data-lucide="clock" style="width:12px;height:12px;vertical-align:middle;margin-inline-end:4px;"></i> آخر موعد: ${dueDateStr}
                      </span>
                    </div>

                    <h4 style="font-size:1.05rem; font-weight:800; margin:0 0 8px 0; color:var(--text-main);">${a.title}</h4>
                    <p style="font-size:0.88rem; color:var(--text-muted); line-height:1.6; margin:0 0 16px 0; white-space:pre-wrap;">${a.description || 'لا توجد تعليمات إضافية.'}</p>
                  </div>

                  <div style="border-top:1px solid var(--border-color); padding-top:12px; margin-top:12px; display:flex; justify-content:space-between; align-items:center;">
                    <button type="button" class="btn-secondary fetch-assignment-submissions-btn" data-id="${a.id}" data-title="${a.title}" style="font-size:0.82rem; padding:8px 14px; font-weight:800; display:inline-flex; align-items:center; gap:6px;">
                      <i data-lucide="users" style="width:14px;height:14px;"></i> عرض إجابات الطلاب 👨‍🎓
                    </button>
                  </div>
                </div>
              `;
    }).join('')}
          </div>
        `}
      </div>

      <!-- Modal: Create Assignment Modal -->
      <div class="modal-overlay" id="course-create-assignment-modal" style="display:none;">
        <div class="modal-content" style="max-width:520px;">
          <div class="modal-header">
            <h3 class="modal-title" style="font-weight:800;">إضافة واجب / نشاط جديد للدورة</h3>
            <span class="modal-close-btn" id="close-course-assignment-modal">&times;</span>
          </div>
          <form id="course-create-assignment-form">
            <div class="modal-body" style="display:flex; flex-direction:column; gap:14px;">
              <div class="form-group">
                <label style="font-weight:700; margin-bottom:6px; display:block;">عنوان الواجب أو النشاط <span style="color:var(--error);">*</span></label>
                <input type="text" id="course-assignment-title-input" class="form-input" placeholder="مثال: واجب الدرس الأول - حل مسائل النهايات" required style="padding:10px 14px;">
              </div>

              <div class="form-group">
                <label style="font-weight:700; margin-bottom:6px; display:block;">الدرس المرتبط بالواجب (Lesson / Optional)</label>
                <select id="course-assignment-lesson-select" class="form-select" style="padding:10px 14px;">
                  <option value="">جميع دروس الدورة (عام)</option>
                  ${(this.course.lessons || []).map(l => `<option value="${l.id}">📌 ${l.title}</option>`).join('')}
                </select>
              </div>

              <div class="form-group">
                <label style="font-weight:700; margin-bottom:6px; display:block;">تفاصيل وتعليمات الواجب (Description & Tasks)</label>
                <textarea id="course-assignment-desc-input" class="form-input" rows="4" placeholder="اكتب التعليمات والأسئلة المطلوب من الطالب حلها وإرسالها..." style="padding:10px 14px; resize:vertical; font-family:inherit;"></textarea>
              </div>

              <div class="form-group">
                <label style="font-weight:700; margin-bottom:6px; display:block;">آخر موعد للتسليم (Due Date) <span style="color:var(--error);">*</span></label>
                <input type="datetime-local" id="course-assignment-due-input" class="form-input" required style="padding:10px 14px;">
              </div>
            </div>
            <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:10px;">
              <button type="button" class="btn-secondary" id="cancel-course-assignment-modal">إلغاء</button>
              <button type="submit" id="submit-create-course-assignment-btn" class="btn-primary" style="font-weight:800;">نشر الواجب للطلاب 🚀</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: View Assignment Submissions Modal -->
      <div class="modal-overlay" id="course-assignment-subs-modal" style="display:none;">
        <div class="modal-content" style="max-width:680px;">
          <div class="modal-header">
            <h3 class="modal-title" id="course-assignment-subs-title" style="font-weight:800;">إجابات وتسليمات الطلاب</h3>
            <span class="modal-close-btn" id="close-course-assignment-subs-modal">&times;</span>
          </div>
          <div class="modal-body" id="course-assignment-subs-list" style="max-height:450px; overflow-y:auto; padding:16px;">
            <!-- Submissions loaded dynamically -->
          </div>
        </div>
      </div>
    `;
  }

  renderStudentsTab() {
    const enrollments = this.courseEnrollments || [];
    const lessons = this.course.lessons || [];

    return `
      <div class="glass-card" style="padding:28px; border-radius:20px; margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
          <div>
            <h3 style="font-size:1.3rem; font-weight:800; margin:0 0 4px 0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
              <i data-lucide="users" style="color:var(--primary);"></i>
              تسجيلات الطلاب وتدليمات الأنشطة (Enrolled Students & Submissions)
            </h3>
            <p style="margin:0; font-size:0.85rem; color:var(--text-muted);">متابعة مستوى ونسبة تقدم الطلاب والاطلاع على أوراق عملهم المرفوعة وتنزيلها.</p>
          </div>
          <span class="badge" style="background:var(--primary-glow); color:var(--primary); font-weight:800; font-size:0.88rem; padding:8px 16px;">
            إجمالي المشتركين: ${enrollments.length} طالب
          </span>
        </div>

        ${enrollments.length === 0 ? `
          <div style="text-align:center; padding:50px; color:var(--text-muted); background:var(--bg-app); border-radius:14px; border:1px dashed var(--border-color);">
            <i data-lucide="users" style="width:48px; height:48px; opacity:0.4; margin-bottom:10px;"></i>
            <h4 style="margin:0 0 6px 0; font-weight:800;">لا يوجد طلاب مسجلون في هذه الدورة حتى الآن</h4>
            <p style="margin:0; font-size:0.85rem;">عند انضمام الطلاب وتسليمهم الأنشطة، ستظهر ملفاتهم وإنجازاتهم هنا مباشرة.</p>
          </div>
        ` : `
          <div style="display:flex; flex-direction:column; gap:20px;">
            ${enrollments.map(enroll => {
      const student = enroll.student || {};
      const completedCount = (enroll.completedLessons || []).length;
      const totalLessons = lessons.length || 1;
      const progressPct = enroll.progress || Math.round((completedCount / totalLessons) * 100);

      const submissionsMap = enroll.activitySubmissions || {};
      let totalSubmissions = 0;
      Object.values(submissionsMap).forEach(list => {
        if (Array.isArray(list)) totalSubmissions += list.length;
      });

      return `
                <div style="padding:20px; border-radius:16px; background:var(--bg-app); border:1px solid var(--border-color); display:flex; flex-direction:column; gap:16px;">
                  
                  <!-- Student Info & Progress Header -->
                  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; border-bottom:1px solid var(--border-color); padding-bottom:14px;">
                    <div style="display:flex; align-items:center; gap:14px;">
                      <img src="${student.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + encodeURIComponent(student.name || 'Student')}" style="width:52px; height:52px; border-radius:50%; border:2px solid var(--primary-glow); object-fit:cover;">
                      <div>
                        <h4 style="font-size:1.05rem; font-weight:800; margin:0 0 2px 0; color:var(--text-main);">${student.name || 'طالب'}</h4>
                        <div style="font-size:0.8rem; color:var(--text-muted); display:flex; gap:12px; flex-wrap:wrap;">
                          <span>📧 ${student.email || 'غير متاح'}</span>
                          ${student.phone ? `<span>📱 ${student.phone}</span>` : ''}
                        </div>
                      </div>
                    </div>

                    <div style="text-align:end;">
                      <div style="font-size:0.85rem; font-weight:800; color:var(--primary);">التقدم: ${completedCount} من ${lessons.length} دروس (${progressPct}%)</div>
                      <div style="width:140px; height:6px; background:rgba(0,0,0,0.06); border-radius:10px; overflow:hidden; margin-top:4px;">
                        <div style="width:${progressPct}%; height:100%; background:linear-gradient(90deg, var(--primary), var(--success));"></div>
                      </div>
                    </div>
                  </div>

                  <!-- Submissions Section -->
                  <div>
                    <div style="font-size:0.88rem; font-weight:800; color:var(--text-main); margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                      <i data-lucide="file-check" style="color:var(--primary); width:16px; height:16px;"></i>
                      ملفات الأنشطة والواجبات المرفوعة من الطالب (${totalSubmissions} ملف):
                    </div>

                    ${totalSubmissions === 0 ? `
                      <div style="font-size:0.8rem; color:var(--text-muted); font-style:italic; padding:10px; background:rgba(0,0,0,0.02); border-radius:8px;">
                        لم يقم هذا الطالب برفع أي ملفات أنشطة أو واجبات بعد.
                      </div>
                    ` : `
                      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:10px;">
                        ${Object.entries(submissionsMap).map(([lessonKey, list]) => {
        if (!Array.isArray(list) || list.length === 0) return '';
        const targetLesson = lessons.find(l => String(l.id) === String(lessonKey));
        const lessonTitle = targetLesson ? targetLesson.title : "نشاط عام";

        return list.map(sub => `
                            <div style="padding:12px 14px; border-radius:10px; background:var(--bg-card); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between; gap:10px;">
                              <div style="overflow:hidden; text-overflow:ellipsis; flex:1; min-width:0;">
                                <strong style="font-size:0.85rem; color:var(--text-main); display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${sub.fileName}</strong>
                                <span style="font-size:0.75rem; color:var(--text-muted); display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">📌 ${lessonTitle} • ${new Date(sub.uploadedAt).toLocaleDateString('ar-EG')}</span>
                              </div>
                              <a href="${sub.fileUrl}" target="_blank" rel="noopener" class="btn-primary" style="padding:6px 12px; font-size:0.78rem; text-decoration:none; flex-shrink:0; display:inline-flex; align-items:center; gap:4px;">
                                <i data-lucide="download" style="width:13px;height:13px;"></i> تنزيل 📥
                              </a>
                            </div>
                          `).join('');
      }).join('')}
                      </div>
                    `}
                  </div>

                </div>
              `;
    }).join('')}
          </div>
        `}
      </div>
    `;
  }

  renderResourcesTab() {
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
        <div>
          <h3 style="font-size:1.4rem; font-weight:800; margin-bottom:4px;">الموارد والملفات التعليمية</h3>
          <p style="color:var(--text-muted); font-size:0.88rem; margin:0;">الملفات والملخصات المرفقة الخاصة بهذه الدورة</p>
        </div>
        <button class="btn-primary" id="open-manage-add-resource-btn" style="padding:10px 20px; font-weight:800;">
          <i data-lucide="plus"></i> إضافة مورد لهذه الدورة
        </button>
      </div>

      ${this.courseResources.length === 0 ? `
        <div class="glass-card" style="text-align:center; padding:60px; color:var(--text-muted);">
          <i data-lucide="folder-open" style="width:48px; height:48px; margin-bottom:12px; opacity:0.4;"></i>
          <h4 style="font-weight:700; margin-bottom:6px;">لا توجد موارد مضافة لهذه الدورة بعد</h4>
          <p style="font-size:0.9rem;">يمكنك رفع ملخصات PDF أو روابط Google Drive لتظهر مباشرة لطلابك.</p>
        </div>
      ` : `
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:20px;">
          ${this.courseResources.map(r => `
            <div class="glass-card" style="padding:18px; border-radius:14px; border:1px solid var(--border-color); display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                  <h4 style="font-size:1.05rem; font-weight:800; margin:0; color:var(--text-color);">${r.title}</h4>
                  <button class="btn-secondary delete-manage-resource-btn" data-id="${r.id}" style="padding:4px; border:none; color:var(--error);" title="حذف">
                    <i data-lucide="trash-2" style="width:15px;height:15px;"></i>
                  </button>
                </div>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:14px;">
                  <i data-lucide="calendar" style="width:12px;height:12px;vertical-align:middle;"></i> ${new Date(r.createdAt).toLocaleDateString("ar")}
                </div>
              </div>
              <a href="${r.url}" target="_blank" class="btn-primary" style="font-size:0.85rem; padding:8px 14px; text-decoration:none; justify-content:center; display:flex; align-items:center; gap:6px;">
                <i data-lucide="external-link" style="width:14px;height:14px;"></i> فتح المورد
              </a>
            </div>
          `).join("")}
        </div>
      `}

      <!-- Add Resource Inline Modal -->
      <div id="inline-resource-modal-wrapper"></div>
    `;
  }

  renderGroupsTab() {
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
        <div>
          <h3 style="font-size:1.4rem; font-weight:800; margin-bottom:4px;">مجموعات الدورة وحصص البث المباشر 👥</h3>
          <p style="color:var(--text-muted); font-size:0.88rem; margin:0;">إدارة مواعيد الحصص الأسبوعية وسعة المقاعد لكل مجموعة</p>
        </div>
        <button class="btn-primary" id="open-manage-add-group-btn" style="padding:10px 20px; font-weight:800; background:#e51d74; border-color:#e51d74; gap:8px; display:inline-flex; align-items:center;">
          <i data-lucide="plus-circle" style="width:16px;height:16px;"></i> إضافة مجموعة جديدة ➕
        </button>
      </div>

      ${this.courseGroups.length === 0 ? `
        <div class="glass-card" style="text-align:center; padding:60px 24px; border-radius:24px; color:var(--text-muted);">
          <i data-lucide="users" style="width:48px; height:48px; margin-bottom:12px; color:#e51d74; opacity:0.5;"></i>
          <h4 style="font-weight:800; font-size:1.1rem; margin-bottom:6px; color:var(--text-main);">لا توجد مجموعات دراسية مضافة لهذه الدورة حتى الآن</h4>
          <p style="font-size:0.88rem; max-width:440px; margin:0 auto 20px auto;">
            يمكنك إنشاء مجموعات متعددة للدورة بأيام ومواعيد وسعة مقاعد مختلفة (مثل: مجموعة السبت والثلاثاء، مجموعة الأحد والأربعاء).
          </p>
          <button id="inline-create-group-btn" class="btn-primary" style="padding:10px 24px; border-radius:24px; font-weight:800; background:#e51d74; border-color:#e51d74;">
            ➕ إنشاء أول مجموعة الآن
          </button>
        </div>
      ` : `
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap:20px;">
          ${this.courseGroups.map(g => {
            const enrolled = g.enrolledCount || 0;
            const maxCap = g.maxStudents || 25;
            const capPct = Math.min(100, Math.round((enrolled / maxCap) * 100));

            const formatArabicDate = (dateStr) => {
              if (!dateStr) return '';
              const d = new Date(dateStr);
              if (isNaN(d.getTime())) return dateStr;
              const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
              const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
              return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
            };

            const sessionPrice = g.sessionPrice || 40;
            const monthlyPrice = g.monthlyPrice || (sessionPrice * 8);
            const totalSessions = g.totalSessions || 24;
            const duration = g.sessionDuration || 60;
            const startDateText = g.startDate ? formatArabicDate(g.startDate) : "الأحد 13 سبتمبر 2026";
            const endDateText = g.endDate ? formatArabicDate(g.endDate) : "الأربعاء 2 ديسمبر 2026";
            const teacherSessionProfit = Math.round(sessionPrice * 0.5);

              const isPending = g.status === 'PENDING_APPROVAL';

              return `
              <div class="glass-card" style="padding:22px; border-radius:22px; border:1px solid ${isPending ? 'rgba(245,158,11,0.3)' : 'var(--border-color)'}; display:flex; flex-direction:column; justify-content:space-between; gap:14px;">
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                    <div>
                      ${isPending
                        ? `<span style="font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:12px; background:rgba(245,158,11,0.15); color:#d97706; display:inline-block; margin-bottom:6px;">⏳ قيد مراجعة واعتماد الإدارة</span>`
                        : g.status === 'REJECTED'
                          ? `<span style="font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:12px; background:rgba(239,68,68,0.15); color:#ef4444; display:inline-block; margin-bottom:6px;">❌ مرفوضة</span>`
                          : g.status === 'IN_PROGRESS'
                            ? `<span style="font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:12px; background:rgba(99,102,241,0.15); color:#6366f1; display:inline-block; margin-bottom:6px;">🔒 مغلقة وبدأت الدراسة</span>`
                            : g.status === 'FULL' || capPct >= 100
                              ? `<span style="font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:12px; background:rgba(239,68,68,0.15); color:#ef4444; display:inline-block; margin-bottom:6px;">مكتملة 🔒</span>`
                              : `<span style="font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:12px; background:rgba(16,185,129,0.12); color:#10b981; display:inline-block; margin-bottom:6px;">متاحة للتسجيل 🟢</span>`
                      }
                      <h4 style="font-size:1.15rem; font-weight:900; margin:0; color:var(--text-main);">👥 ${g.name}</h4>
                    </div>
                    <button class="delete-course-group-btn" data-id="${g.id}" data-name="${g.name}" style="background:transparent; border:none; color:#ef4444; cursor:pointer; padding:4px;" title="حذف المجموعة">
                      <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                    </button>
                  ${isPending ? `
                    <!-- Pending State: Notice only -->
                    <div style="background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.25); border-radius:12px; padding:14px; font-size:0.82rem; font-weight:800; color:#d97706; display:flex; align-items:center; gap:8px; margin-top:10px;">
                      <i data-lucide="clock" style="width:16px; height:16px; flex-shrink:0;"></i>
                      <span>المجموعة قيد مراجعة واعتماد الإدارة ⏳. سيتم تفعيل الجدول وتواريخ البدء والانتهاء فور اعتمادها.</span>
                    </div>
                  ` : `
                    <!-- Schedule Pill -->
                    <div style="padding:8px 12px; border-radius:12px; background:rgba(229,29,116,0.06); color:#e51d74; font-size:0.85rem; font-weight:800; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
                      <i data-lucide="calendar" style="width:16px;height:16px;"></i>
                      <span>الجدول: ${g.scheduleText || `${g.scheduleDays || ''} ${g.scheduleTime || ''}`}</span>
                    </div>

                    <!-- Approved State: Dates & Capacity -->
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; background:var(--bg-app); border:1px solid var(--border-color); border-radius:10px; padding:6px 10px; font-size:0.75rem; margin-bottom:10px;">
                      <div>
                        <span style="color:var(--text-muted); font-weight:700; display:block;">تاريخ البدء:</span>
                        <strong style="color:var(--text-main);">${startDateText}</strong>
                      </div>
                      <div>
                        <span style="color:var(--text-muted); font-weight:700; display:block;">تاريخ الانتهاء:</span>
                        <strong style="color:var(--text-main);">${endDateText}</strong>
                      </div>
                    </div>

                    <!-- Capacity Progress -->
                    <div>
                      <div style="display:flex; justify-content:space-between; font-size:0.78rem; font-weight:800; color:var(--text-muted); margin-bottom:4px;">
                        <span>إجمالي المقاعد</span>
                        <span>${enrolled} من ${maxCap} طالب (${g.availableSeats !== undefined ? g.availableSeats : Math.max(0, maxCap - enrolled)} متبقي)</span>
                      </div>
                      <div style="width:100%; height:6px; background:var(--bg-app); border-radius:10px; overflow:hidden;">
                        <div style="width:${capPct}%; height:100%; background:${capPct >= 90 ? '#ef4444' : '#10b981'}; border-radius:10px;"></div>
                      </div>
                    </div>
                  `}
                </div>

                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
                  <button type="button" class="btn-secondary view-course-group-students-btn" data-id="${g.id}" data-name="${g.name}"
                    style="font-size:0.8rem; padding:8px 14px; border-radius:12px; display:inline-flex; align-items:center; gap:6px; cursor:pointer; background:rgba(229,29,116,0.08); color:#e51d74; border-color:rgba(229,29,116,0.3); font-weight:800;">
                    <i data-lucide="users" style="width:14px; height:14px;"></i> قائمة الطلاب (${enrolled}) 👥
                  </button>
                  ${g.meetingLink ? `
                    <a href="${g.meetingLink}" target="_blank" rel="noopener" class="btn-secondary" style="font-size:0.8rem; padding:8px 12px; text-decoration:none; justify-content:center; display:inline-flex; align-items:center; gap:6px; border-radius:12px;">
                      <i data-lucide="external-link" style="width:14px;height:14px;"></i> رابط البث (Zoom / Meet)
                    </a>
                  ` : ''}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `}

      <!-- Inline Group Creation Modal Container -->
      <div id="manage-group-modal-wrapper"></div>
    `;
  }

  renderSettings() {
    return `
      <div style="max-width:700px;">
        <h3 style="font-size:1.4rem; font-weight:800; margin-bottom:4px;">إعدادات الدورة وتفاصيلها</h3>
        <p style="color:var(--text-muted); font-size:0.88rem; margin-bottom:28px;">تعديل العنوان والتصنيف ورابط البث المباشر المخصص لهذه الدورة</p>

        <form id="manage-course-form" class="glass-card" style="padding:28px; border-radius:18px;">
          <div class="form-group" style="margin-bottom:18px;">
            <label style="font-weight:700; margin-bottom:6px; display:block;">عنوان الدورة <span style="color:var(--error);">*</span></label>
            <input type="text" id="manage-title" class="form-input" value="${this.course.title}" required style="padding:10px 14px;">
          </div>

          <div class="form-group" style="margin-bottom:18px;">
            <label style="font-weight:700; margin-bottom:6px; display:block;">التصنيف والمادة <span style="color:var(--error);">*</span></label>
            <input type="text" id="manage-category" class="form-input" value="${this.course.category || ''}" placeholder="مثال: الرياضيات / علوم تجريبية" required style="padding:10px 14px;">
          </div>

          <div class="form-group" style="margin-bottom:18px;">
            <label style="font-weight:700; margin-bottom:6px; display:block;">رابط البث المباشر الخاص بهذه الدورة (Zoom / Google Meet)</label>
            <input type="url" id="manage-meeting-link" class="form-input" value="${this.course.meetingLink || ''}" placeholder="https://meet.google.com/..." style="padding:10px 14px;">
          </div>

          <div class="form-group" style="margin-bottom:18px;">
            <label style="font-weight:700; margin-bottom:6px; display:block;">وصف الدورة والأهداف</label>
            <textarea id="manage-desc" class="form-input" rows="4" style="padding:10px 14px;">${this.course.description || ''}</textarea>
          </div>

          <div class="form-group" style="margin-bottom:24px;">
            <label style="font-weight:700; font-size:0.9rem; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
              <span style="display:flex; align-items:center; gap:6px;">
                <i data-lucide="image" style="width:16px; height:16px; color:#f59e0b;"></i>
                صورة غلاف الدورة
              </span>
              <button type="button" id="manage-toggle-url-btn" style="background:none; border:none; color:var(--primary); font-weight:700; font-size:0.78rem; cursor:pointer;">
                أو أدخل رابط صورة مباشرة 🔗
              </button>
            </label>

            <div id="manage-image-dropzone" style="border:2px dashed var(--border-color); border-radius:16px; padding:20px; text-align:center; background:var(--bg-app); cursor:pointer; transition:all 0.2s ease;">
              <input type="file" id="manage-image-file" accept="image/*" style="display:none;">

              <div id="manage-image-idle" style="${this.course.image ? 'display:none;' : 'display:block;'}">
                <button type="button" class="btn-secondary" id="manage-trigger-upload-btn" style="padding:8px 20px; border-radius:30px; font-size:0.85rem; margin:0 auto; display:inline-flex; align-items:center; gap:6px;">
                  <i data-lucide="upload-cloud" style="width:16px; height:16px;"></i> اختيار صورة جديدة من جهازك
                </button>
                <p style="font-size:0.75rem; color:var(--text-muted); margin:8px 0 0 0;">الصيغ المدعومة: JPG, PNG, WEBP</p>
              </div>

              <div id="manage-image-loading" style="display:none; padding:12px; color:var(--primary); font-weight:700; font-size:0.88rem;">
                <i data-lucide="loader" class="spinner" style="width:20px; height:20px; display:inline-block; vertical-align:middle; margin-inline-end:6px;"></i> جاري رفع وتحديث الصورة...
              </div>

              <div id="manage-image-preview-wrapper" style="${this.course.image ? 'display:block;' : 'display:none;'} text-align:center;">
                <div style="position:relative; display:inline-block;">
                  <img id="manage-course-preview-img" src="${this.course.image || ''}" style="max-height:160px; max-width:100%; border-radius:14px; object-fit:cover; border:2px solid var(--primary); box-shadow:0 6px 16px rgba(0,0,0,0.12);">
                  <button type="button" id="manage-remove-image-btn" title="حذف الصورة" style="position:absolute; top:-8px; right:-8px; background:var(--error,#ef4444); color:#fff; border:none; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-weight:bold; box-shadow:0 2px 6px rgba(0,0,0,0.3);">✕</button>
                </div>
                <p style="font-size:0.78rem; color:var(--success,#10b981); font-weight:800; margin:8px 0 0 0;">✓ صورة الغلاف الحالية محددة ومحفوظة</p>
              </div>
            </div>

            <div id="manage-url-wrapper" style="display:none; margin-top:10px;">
              <input type="url" id="manage-image-url-direct" class="form-input" value="${this.course.image || ''}" placeholder="https://example.com/course-cover.jpg" style="border-radius:12px; padding:10px 14px; font-size:0.85rem;">
            </div>

            <input type="hidden" id="manage-image-url" value="${this.course.image || ''}">
          </div>

          <button type="submit" id="save-course-settings-btn" class="btn-primary" style="padding:12px 28px; font-weight:800;">
            <i data-lucide="save"></i> حفظ التغييرات
          </button>
        </form>
      </div>
    `;
  }

  renderLessonModal() {
    const existingUnits = Array.from(new Set([
      ...(this.course.lessons || []).map(l => l.chapter || "الوحدة العامة (General)"),
      ...(this.customUnits || [])
    ]));

    if (existingUnits.length === 0) {
      existingUnits.push("الوحدة الأولى");
    }

    return `
      <!-- Add Unit Dedicated Modal -->
      <div class="modal-overlay" id="unit-modal" style="display:none;">
        <div class="modal-content" style="max-width:460px;">
          <div class="modal-header">
            <h3 class="modal-title" style="font-size:1.15rem; font-weight:800; display:flex; align-items:center; gap:8px;">
              <i data-lucide="folder-plus" style="color:var(--primary);"></i> إضافة وحدة دراسية جديدة
            </h3>
            <span class="modal-close-btn" id="close-unit-modal">&times;</span>
          </div>
          <form id="unit-form">
            <div class="modal-body" style="display:flex; flex-direction:column; gap:14px; padding:20px;">
              <div class="form-group">
                <label style="font-weight:700; margin-bottom:6px; display:block;">اسم الوحدة الدراسية <span style="color:var(--error);">*</span></label>
                <input type="text" id="unit-name-input" class="form-input" placeholder="مثال: الوحدة الأولى: الدوال والمتابعات" required style="padding:10px 14px;">
              </div>
            </div>
            <div class="modal-footer" style="padding:14px 20px;">
              <button type="button" class="btn-secondary" id="cancel-unit-modal">إلغاء</button>
              <button type="submit" class="btn-primary" style="font-weight:800;">
                <i data-lucide="check"></i> إنشاء وحفظ الوحدة
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Rename Unit Modal -->
      <div class="modal-overlay" id="rename-unit-modal" style="display:none;">
        <div class="modal-content" style="max-width:480px;">
          <div class="modal-header">
            <h3 class="modal-title" style="font-size:1.15rem; font-weight:800; display:flex; align-items:center; gap:8px;">
              <i data-lucide="edit-3" style="color:var(--primary);"></i> تعديل اسم الوحدة الدراسية
            </h3>
            <span class="modal-close-btn" id="close-rename-unit-modal">&times;</span>
          </div>
          <form id="rename-unit-form">
            <input type="hidden" id="rename-unit-old-name">
            <div class="modal-body" style="display:flex; flex-direction:column; gap:14px; padding:20px;">
              <div class="form-group">
                <label style="font-weight:700; margin-bottom:6px; display:block;">الاسم الجديد للوحدة <span style="color:var(--error);">*</span></label>
                <input type="text" id="rename-unit-new-input" class="form-input" required style="padding:10px 14px;">
              </div>
              <p style="font-size:0.8rem; color:var(--text-muted); margin:0; line-height:1.5;">
                ℹ️ سيتم تحديث هذا الاسم وتطبيقه على كافة الدروس التابعة لهذه الوحدة في المنهج تلقائياً.
              </p>
            </div>
            <div class="modal-footer" style="padding:14px 20px; display:flex; justify-content:flex-end; gap:10px;">
              <button type="button" class="btn-secondary" id="cancel-rename-unit-modal">إلغاء</button>
              <button type="submit" class="btn-primary" style="font-weight:800;">
                <i data-lucide="check"></i> حفظ الاسم الجديد
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Delete Unit Modal -->
      <div class="modal-overlay" id="delete-unit-modal" style="display:none;">
        <div class="modal-content" style="max-width:500px;">
          <div class="modal-header">
            <h3 class="modal-title" style="font-size:1.15rem; font-weight:800; color:var(--error); display:flex; align-items:center; gap:8px;">
              <i data-lucide="alert-triangle"></i> تأكيد حذف الوحدة الدراسية
            </h3>
            <span class="modal-close-btn" id="close-delete-unit-modal">&times;</span>
          </div>
          <form id="delete-unit-form">
            <input type="hidden" id="delete-unit-target-name">
            <div class="modal-body" style="display:flex; flex-direction:column; gap:16px; padding:20px;">
              <div id="delete-unit-message" style="font-size:0.92rem; color:var(--text-main); font-weight:700;"></div>
              
              <div id="delete-unit-options-container" style="display:none; flex-direction:column; gap:12px; background:var(--bg-app); padding:14px; border-radius:12px; border:1px solid var(--border-color);">
                <div style="font-size:0.85rem; font-weight:800; color:var(--text-main);">اختر الإجراء المناسب للدروس داخل هذه الوحدة:</div>
                <label style="display:flex; align-items:flex-start; gap:8px; font-size:0.88rem; cursor:pointer;">
                  <input type="radio" name="delete_unit_action" value="move_lessons" checked style="margin-top:3px;">
                  <div style="flex:1;">
                    <strong>نقل جميع الدروس إلى وحدة أخرى</strong>
                    <div style="margin-top:6px;">
                      <select id="delete-unit-destination-select" class="form-select" style="padding:6px 10px; font-size:0.82rem; width:100%;">
                        ${existingUnits.map(u => `<option value="${u}">${u}</option>`).join("")}
                      </select>
                    </div>
                  </div>
                </label>
                <label style="display:flex; align-items:flex-start; gap:8px; font-size:0.88rem; cursor:pointer; color:var(--error);">
                  <input type="radio" name="delete_unit_action" value="delete_lessons" style="margin-top:3px;">
                  <div>
                    <strong>حذف الوحدة وجميع الدروس التابعة لها نهائياً</strong>
                    <div style="font-size:0.78rem; opacity:0.8;">تحذير: لا يمكن استرجاع الدروس المحذوفة.</div>
                  </div>
                </label>
              </div>
            </div>
            <div class="modal-footer" style="padding:14px 20px; display:flex; justify-content:flex-end; gap:10px;">
              <button type="button" class="btn-secondary" id="cancel-delete-unit-modal">إلغاء</button>
              <button type="submit" class="btn-primary" style="background:var(--error); border-color:var(--error); font-weight:800;">
                <i data-lucide="trash-2"></i> تأكيد الحذف
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Transfer Lesson to Unit Modal -->
      <div class="modal-overlay" id="transfer-lesson-modal" style="display:none;">
        <div class="modal-content" style="max-width:460px;">
          <div class="modal-header">
            <h3 class="modal-title" style="font-size:1.15rem; font-weight:800; display:flex; align-items:center; gap:8px;">
              <i data-lucide="folder-symlink" style="color:var(--primary);"></i> نقل الدرس إلى وحدة أخرى
            </h3>
            <span class="modal-close-btn" id="close-transfer-lesson-modal">&times;</span>
          </div>
          <form id="transfer-lesson-form">
            <input type="hidden" id="transfer-lesson-id">
            <div class="modal-body" style="display:flex; flex-direction:column; gap:14px; padding:20px;">
              <div style="font-size:0.9rem; font-weight:700; color:var(--text-main);" id="transfer-lesson-title-display"></div>
              <div class="form-group">
                <label style="font-weight:700; margin-bottom:6px; display:block;">اختر الوحدة الدراسية الجديدة <span style="color:var(--error);">*</span></label>
                <select id="transfer-lesson-unit-select" class="form-select" style="padding:10px 14px;">
                  ${existingUnits.map(u => `<option value="${u}">${u}</option>`).join("")}
                </select>
              </div>
            </div>
            <div class="modal-footer" style="padding:14px 20px; display:flex; justify-content:flex-end; gap:10px;">
              <button type="button" class="btn-secondary" id="cancel-transfer-lesson-modal">إلغاء</button>
              <button type="submit" class="btn-primary" style="font-weight:800;">
                <i data-lucide="check"></i> نقل الدرس
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Add/Edit Lesson Modal -->
      <div class="modal-overlay" id="lesson-modal" style="display:none;">
        <div class="modal-content" style="max-width:680px; width:92%; max-height:90vh; display:flex; flex-direction:column; padding:0; overflow:hidden;">
          <div class="modal-header" style="padding:18px 24px; border-bottom:1px solid var(--border-color);">
            <h3 class="modal-title" id="lesson-modal-title" style="font-size:1.15rem; font-weight:800;">إضافة درس جديد</h3>
            <span class="modal-close-btn" id="close-lesson-modal">&times;</span>
          </div>
          
          <!-- Sub-tabs bar -->
          <div style="display:flex; border-bottom:1px solid var(--border-color); background:var(--bg-app); padding:4px 16px 0 16px; gap:8px; overflow-x:auto;">
            <button type="button" class="lesson-tab-btn active" data-tab="details" style="padding:10px 16px; border:none; background:none; font-weight:700; font-size:0.88rem; cursor:pointer; color:var(--primary); border-bottom:2px solid var(--primary);">
              📝 التفاصيل والوصف
            </button>
            <button type="button" class="lesson-tab-btn" data-tab="notes" style="padding:10px 16px; border:none; background:none; font-weight:700; font-size:0.88rem; cursor:pointer; color:var(--text-muted);">
              📌 الملاحظات (Notes)
            </button>
            <button type="button" class="lesson-tab-btn" data-tab="resource" style="padding:10px 16px; border:none; background:none; font-weight:700; font-size:0.88rem; cursor:pointer; color:var(--text-muted);">
              📎 المورد المرفق
            </button>
            <button type="button" class="lesson-tab-btn" data-tab="questions" style="padding:10px 16px; border:none; background:none; font-weight:700; font-size:0.88rem; cursor:pointer; color:var(--text-muted);">
              ❓ أسئلة الدرس
            </button>
          </div>

          <form id="lesson-form" style="display:flex; flex-direction:column; flex:1; overflow:hidden; margin:0;">
            <input type="hidden" id="lesson-id">
            
            <div class="modal-body" style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:16px;">
              
              <!-- Tab 1: Details -->
              <div class="lesson-tab-content" id="lesson-tab-details" style="display:flex; flex-direction:column; gap:14px;">
                <div class="form-group">
                  <label style="font-weight:700; margin-bottom:6px; display:block;">الوحدة الدراسية (Unit / Chapter) <span style="color:var(--error);">*</span></label>
                  <select id="lesson-chapter-select" class="form-select" style="padding:10px 14px; margin-bottom:6px;">
                    ${existingUnits.map(u => `<option value="${u}">${u}</option>`).join("")}
                    <option value="__NEW__">➕ إضافة وحدة دراسية جديدة...</option>
                  </select>
                  <input type="text" id="lesson-chapter-custom" class="form-input" placeholder="اكتب اسم الوحدة الجديدة هنا..." style="display:none; padding:10px 14px;">
                </div>

                <div class="form-group">
                  <label style="font-weight:700; margin-bottom:6px; display:block;">عنوان الدرس <span style="color:var(--error);">*</span></label>
                  <input type="text" id="lesson-title" class="form-input" placeholder="مثال: الدرس 1 - الاستمرارية والنهايات" required style="padding:10px 14px;">
                </div>

                <div class="form-group">
                  <label style="font-weight:700; margin-bottom:6px; display:block;">رابط فيديو الدرس (اختياري / Optional)</label>
                  <input type="text" id="lesson-video" class="form-input" placeholder="https://www.youtube.com/watch?v=... (يمكن تركه فارغاً والاعتماد على صورة الدرس)" style="padding:10px 14px;">
                </div>

                <div class="form-group">
                  <label style="font-weight:700; margin-bottom:6px; display:block;">شرح وتفاصيل الدرس (Lesson Details & Description)</label>
                  <textarea id="lesson-desc" class="form-input" rows="3" placeholder="أدخل ملخص وفكرة هذا الدرس..." style="padding:10px 14px; resize:vertical; font-family:inherit;"></textarea>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                  <div class="form-group">
                    <label style="font-weight:700; margin-bottom:6px; display:block;">مدة الدرس (بالدقائق)</label>
                    <input type="text" id="lesson-duration" class="form-input" value="20:00" style="padding:10px 14px;">
                  </div>
                  <div class="form-group">
                    <label style="font-weight:700; margin-bottom:6px; display:block;">ترتيب الدرس داخل الوحدة</label>
                    <input type="number" id="lesson-order" class="form-input" value="1" style="padding:10px 14px;">
                  </div>
                </div>
              </div>

              <!-- Tab 2: Notes -->
              <div class="lesson-tab-content" id="lesson-tab-notes" style="display:none; flex-direction:column; gap:14px;">
                <div class="form-group">
                  <label style="font-weight:700; margin-bottom:6px; display:block;">ملاحظات المعلم للدرس (Teacher Notes)</label>
                  <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:8px;">سيتم عرض هذه الملاحظات للطلاب كإرشادات ونقاط استذكار سريعة لهذا الدرس.</p>
                  <textarea id="lesson-notes" class="form-input" rows="6" placeholder="اكتب أهم القوانين، الإرشادات أو التنبيهات الموجهة للطلاب في هذا الدرس..." style="padding:12px 14px; font-family:inherit; resize:vertical;"></textarea>
                </div>
              </div>

              <!-- Tab 3: Resource -->
              <div class="lesson-tab-content" id="lesson-tab-resource" style="display:none; flex-direction:column; gap:14px;">
                <div class="form-group">
                  <label style="font-weight:700; margin-bottom:6px; display:block;">عنوان المورد المرفق (Resource Title)</label>
                  <input type="text" id="lesson-resource-title" class="form-input" placeholder="مثال: ملخص PDF للدرس الأول أو كراس التمارين" style="padding:10px 14px;">
                </div>
                <div class="form-group">
                  <label style="font-weight:700; margin-bottom:6px; display:block;">رابط الملف المرفق (Resource URL - PDF / Drive)</label>
                  <input type="text" id="lesson-resource-url" class="form-input" placeholder="https://drive.google.com/file/d/..." style="padding:10px 14px;">
                  <p style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">يستطيع الطالب فتح وتحميل الملف مباشرة من صفحة مشغل الدرس.</p>
                </div>
              </div>

              <!-- Tab: Lesson Objectives -->
              <div class="lesson-tab-content" id="lesson-tab-objectives" style="display:none; flex-direction:column; gap:14px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <h4 style="font-weight:800; font-size:0.95rem; margin:0; color:var(--text-main);">🎯 معايير النجاح لهذا الدرس (Success Criteria)</h4>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin:2px 0 0 0;">أضف معايير النجاح المحددة التي يجب أن يتقنها الطالب بعد هذا الدرس.</p>
                  </div>
                </div>

                <div style="display:flex; gap:8px;">
                  <input type="text" id="modal-lesson-objective-input" class="form-input" placeholder="أدخل معيارات خاصاً بالدرس (مثال: فهم كيفية تطبيق القانون بشكل صحيح)..." style="flex:1; padding:8px 12px; font-size:0.85rem;">
                  <button type="button" id="modal-add-lesson-objective-btn" class="btn-primary" style="padding:8px 14px; font-size:0.82rem; font-weight:700; flex-shrink:0;">
                    ➕ إضافة
                  </button>
                </div>

                <div id="modal-lesson-objectives-list" style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
                  <!-- Dynamic lesson objectives list -->
                </div>
              </div>

              <!-- Tab 4: Questions -->
              <div class="lesson-tab-content" id="lesson-tab-questions" style="display:none; flex-direction:column; gap:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                  <div>
                    <h4 style="font-weight:800; font-size:0.95rem; margin:0;">أسئلة واختبار الدرس الفوري</h4>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin:2px 0 0 0;">أنشئ أسئلة اختيار من متعدد ليختبر الطالب فهمه للدرس.</p>
                  </div>
                  <button type="button" id="add-lesson-question-btn" class="btn-secondary" style="font-size:0.82rem; padding:6px 14px; font-weight:700; border-color:var(--primary); color:var(--primary);">
                    ➕ إضافة سؤال
                  </button>
                </div>

                <div id="lesson-questions-list" style="display:flex; flex-direction:column; gap:16px;">
                  <!-- Dynamic questions list -->
                </div>
              </div>

            </div>

            <div class="modal-footer" style="padding:14px 24px; border-top:1px solid var(--border-color); background:var(--bg-card);">
              <button type="button" class="btn-secondary" id="cancel-lesson-modal">إلغاء</button>
              <button type="submit" class="btn-primary" style="font-weight:800;">
                <i data-lucide="check"></i> حفظ الدرس
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  renderLessonObjectivesInModal() {
    const container = document.getElementById("modal-lesson-objectives-list");
    if (!container) return;
    const objs = this.editingLessonObjectives || [];
    if (objs.length === 0) {
      container.innerHTML = `
        <div style="font-size:0.8rem; color:var(--text-muted); font-style:italic; padding:10px; text-align:center; background:rgba(0,0,0,0.02); border-radius:8px; border:1px dashed var(--border-color);">
          لم تقم بإضافة أهداف خاصة بهذا الدرس بعد.
        </div>
      `;
      return;
    }
    container.innerHTML = objs.map((obj, idx) => `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 12px; background:var(--bg-app); border-radius:8px; border:1px solid var(--border-color); font-size:0.85rem;">
        <span style="font-weight:700; color:var(--text-main);">${idx + 1}. ${obj}</span>
        <button type="button" class="remove-modal-lesson-obj-btn" data-index="${idx}" style="background:none; border:none; color:var(--error); cursor:pointer; font-weight:700; font-size:0.8rem;">
          🗑️ حذف
        </button>
      </div>
    `).join('');

    container.querySelectorAll(".remove-modal-lesson-obj-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-index"));
        if (!isNaN(idx) && this.editingLessonObjectives) {
          this.editingLessonObjectives.splice(idx, 1);
          this.renderLessonObjectivesInModal();
        }
      });
    });
  }

  bindEvents() {
    // Navigation Tabs
    this.container.querySelectorAll(".manage-tab-btn, .manage-nav-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.activeTab = btn.getAttribute("data-tab");
        this.render();
      });
    });

    // --- OBJECTIVES TAB EVENTS ---
    if (this.activeTab === "objectives") {
      const input = document.getElementById("course-objective-input");
      const addBtn = document.getElementById("add-course-objective-btn");
      const saveBtn = document.getElementById("save-course-objectives-btn");

      const addObj = (text) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        if (!this.course.objectives) this.course.objectives = [];
        this.course.objectives.push(trimmed);
        if (input) input.value = "";
        this.render();
      };

      addBtn?.addEventListener("click", () => {
        if (input) addObj(input.value);
      });

      input?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          addObj(input.value);
        }
      });

      this.container.querySelectorAll(".quick-add-objective-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const text = btn.getAttribute("data-text");
          if (text) addObj(text);
        });
      });

      this.container.querySelectorAll(".remove-course-objective-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.getAttribute("data-index"));
          if (!isNaN(idx) && Array.isArray(this.course.objectives)) {
            this.course.objectives.splice(idx, 1);
            this.render();
          }
        });
      });

      saveBtn?.addEventListener("click", async () => {
        saveBtn.disabled = true;
        try {
          await apiFetch(`/courses/${this.courseId}`, {
            method: "PUT",
            body: JSON.stringify({ objectives: this.course.objectives || [] })
          });
          showToast("تم حفظ معايير النجاح للدورة بنجاح! 🎉", "success");
          await this.render();
        } catch (err) {
          saveBtn.disabled = false;
          showToast(err.message || "تعذر حفظ معايير النجاح", "error");
        }
      });
    }

    // --- ASSIGNMENTS TAB EVENTS ---
    if (this.activeTab === "assignments") {
      const modal = document.getElementById("course-create-assignment-modal");
      const form = document.getElementById("course-create-assignment-form");
      const openBtn = document.getElementById("open-create-assignment-modal-btn");
      const closeBtn = document.getElementById("close-course-assignment-modal");
      const cancelBtn = document.getElementById("cancel-course-assignment-modal");

      openBtn?.addEventListener("click", () => {
        form?.reset();
        const dueInput = document.getElementById("course-assignment-due-input");
        if (dueInput) {
          const now = new Date();
          now.setDate(now.getDate() + 7);
          dueInput.value = now.toISOString().slice(0, 16);
        }
        if (modal) modal.style.display = "flex";
      });

      closeBtn?.addEventListener("click", () => { if (modal) modal.style.display = "none"; });
      cancelBtn?.addEventListener("click", () => { if (modal) modal.style.display = "none"; });

      form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById("submit-create-course-assignment-btn");
        const title = document.getElementById("course-assignment-title-input")?.value.trim();
        const lessonId = document.getElementById("course-assignment-lesson-select")?.value || null;
        const description = document.getElementById("course-assignment-desc-input")?.value.trim();
        const dueDate = document.getElementById("course-assignment-due-input")?.value;

        if (!title || !dueDate) return;

        if (submitBtn) submitBtn.disabled = true;
        try {
          await apiFetch("/assignments", {
            method: "POST",
            body: JSON.stringify({
              title,
              description,
              dueDate,
              courseId: this.courseId,
              lessonId
            })
          });

          showToast("تم نشر الواجب بنجاح! 🚀", "success");
          if (modal) modal.style.display = "none";
          await this.render();
        } catch (err) {
          showToast(err.message || "تعذر نشر الواجب", "error");
          if (submitBtn) submitBtn.disabled = false;
        }
      });

      // View Assignment Submissions
      const subsModal = document.getElementById("course-assignment-subs-modal");
      const subsClose = document.getElementById("close-course-assignment-subs-modal");
      subsClose?.addEventListener("click", () => { if (subsModal) subsModal.style.display = "none"; });

      this.container.querySelectorAll(".fetch-assignment-submissions-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const assignmentId = btn.getAttribute("data-id");
          const assignmentTitle = btn.getAttribute("data-title");
          const titleEl = document.getElementById("course-assignment-subs-title");
          const listEl = document.getElementById("course-assignment-subs-list");

          if (titleEl) titleEl.innerText = `إجابات الطلاب - (${assignmentTitle})`;
          if (listEl) listEl.innerHTML = `<div style="text-align:center; padding:30px;"><i data-lucide="loader" class="spinner" style="width:32px;height:32px;"></i></div>`;
          if (window.lucide) window.lucide.createIcons();
          if (subsModal) subsModal.style.display = "flex";

          try {
            const subs = await apiFetch(`/assignments/${assignmentId}/submissions`).catch(() => []);
            if (!listEl) return;

            if (subs.length === 0) {
              listEl.innerHTML = `
                <div style="text-align:center; padding:30px; color:var(--text-muted);">
                  <i data-lucide="file-x" style="width:36px; height:36px; opacity:0.4; margin-bottom:8px;"></i>
                  <p style="margin:0;">لم يقم أي طالب بتقديم إجابة لهذا الواجب حتى الآن.</p>
                </div>
              `;
            } else {
              listEl.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:12px;">
                  ${subs.map(s => `
                    <div style="padding:14px; border-radius:12px; background:var(--bg-app); border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                      <div>
                        <strong style="font-size:0.95rem; color:var(--text-main); display:block;">${s.student?.name || 'طالب'}</strong>
                        <span style="font-size:0.78rem; color:var(--text-muted);">تاريخ التسليم: ${new Date(s.submittedAt).toLocaleString('ar-EG')}</span>
                        <div style="margin-top:6px; font-size:0.88rem; color:var(--text-main); white-space:pre-wrap;">${s.content}</div>
                      </div>
                      <div>
                        ${s.grade !== null && s.grade !== undefined ? `
                          <span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-weight:800; font-size:0.82rem;">الدرجة: ${s.grade}/100</span>
                        ` : `
                          <span class="badge" style="background:rgba(245,158,11,0.15); color:#f59e0b; font-size:0.78rem;">قيد التقييم</span>
                        `}
                      </div>
                    </div>
                  `).join('')}
                </div>
              `;
            }
            if (window.lucide) window.lucide.createIcons();
          } catch (err) {
            if (listEl) listEl.innerHTML = `<div style="color:var(--error); text-align:center; padding:20px;">تعذر تحميل تسليمات الطلاب</div>`;
          }
        });
      });
    }

    // --- CURRICULUM EVENTS ---
    if (this.activeTab === "curriculum") {
      const lessonModal = document.getElementById("lesson-modal");
      const unitModal = document.getElementById("unit-modal");
      const renameUnitModal = document.getElementById("rename-unit-modal");
      const deleteUnitModal = document.getElementById("delete-unit-modal");
      const transferLessonModal = document.getElementById("transfer-lesson-modal");
      const chapterSelect = document.getElementById("lesson-chapter-select");
      const customChapterInput = document.getElementById("lesson-chapter-custom");

      // 1. Add Unit Modal Open & Close & Submit
      this.container.querySelectorAll(".open-add-unit-modal-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          document.getElementById("unit-form")?.reset();
          if (unitModal) unitModal.style.display = "flex";
        });
      });

      document.getElementById("close-unit-modal")?.addEventListener("click", () => { if (unitModal) unitModal.style.display = "none"; });
      document.getElementById("cancel-unit-modal")?.addEventListener("click", () => { if (unitModal) unitModal.style.display = "none"; });

      document.getElementById("unit-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector("button[type='submit']");
        const unitName = document.getElementById("unit-name-input")?.value.trim();
        if (!unitName) return;

        if (submitBtn) submitBtn.disabled = true;
        try {
          const res = await apiFetch(`/courses/${this.courseId}/units`, {
            method: "POST",
            body: JSON.stringify({ unitName })
          });

          if (!this.customUnits.includes(unitName)) {
            this.customUnits.push(unitName);
          }
          if (res && res.unitsOrder) {
            this.course.unitsOrder = res.unitsOrder;
          }

          if (unitModal) unitModal.style.display = "none";
          showToast(`تم إنشاء وحفظ "${unitName}" بنجاح! 🎉`, "success");
          await this.render();
        } catch (err) {
          showToast(err.message || "فشل إنشاء الوحدة الدراسية", "error");
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });

      // 2. Rename Unit Modal & Handlers
      this.container.querySelectorAll(".btn-rename-unit").forEach(btn => {
        btn.addEventListener("click", () => {
          const unitName = btn.getAttribute("data-unit");
          const oldInput = document.getElementById("rename-unit-old-name");
          const newInput = document.getElementById("rename-unit-new-input");
          if (oldInput) oldInput.value = unitName;
          if (newInput) newInput.value = unitName;
          if (renameUnitModal) renameUnitModal.style.display = "flex";
          setTimeout(() => newInput?.focus(), 50);
        });
      });

      document.getElementById("close-rename-unit-modal")?.addEventListener("click", () => { if (renameUnitModal) renameUnitModal.style.display = "none"; });
      document.getElementById("cancel-rename-unit-modal")?.addEventListener("click", () => { if (renameUnitModal) renameUnitModal.style.display = "none"; });

      document.getElementById("rename-unit-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector("button[type='submit']");
        const oldName = document.getElementById("rename-unit-old-name")?.value;
        const newName = document.getElementById("rename-unit-new-input")?.value.trim();
        if (!oldName || !newName) return;

        if (submitBtn) submitBtn.disabled = true;
        try {
          const res = await apiFetch(`/courses/${this.courseId}/units/rename`, {
            method: "PUT",
            body: JSON.stringify({ oldName, newName })
          });

          if (res && res.unitsOrder) {
            this.course.unitsOrder = res.unitsOrder;
          }
          if (renameUnitModal) renameUnitModal.style.display = "none";
          showToast(res?.message || `تم تعديل اسم الوحدة بنجاح إلى "${newName}"! ✏️`, "success");
          await this.render();
        } catch (err) {
          showToast(err.message || "فشل تعديل اسم الوحدة", "error");
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });

      // 3. Delete Unit Modal & Handlers
      this.container.querySelectorAll(".btn-delete-unit").forEach(btn => {
        btn.addEventListener("click", () => {
          const unitName = btn.getAttribute("data-unit");
          const count = parseInt(btn.getAttribute("data-count") || "0", 10);
          const targetNameInput = document.getElementById("delete-unit-target-name");
          const msgEl = document.getElementById("delete-unit-message");
          const optsContainer = document.getElementById("delete-unit-options-container");
          const destSelect = document.getElementById("delete-unit-destination-select");

          if (targetNameInput) targetNameInput.value = unitName;

          if (count === 0) {
            if (msgEl) msgEl.textContent = `هل أنت متأكد من حذف الوحدة الدراسية "${unitName}"؟ (الوحدة لا تحتوي على دروس حالياً).`;
            if (optsContainer) optsContainer.style.display = "none";
          } else {
            if (msgEl) msgEl.textContent = `تنبيه: الوحدة "${unitName}" تحتوي على ${count} درس.`;
            if (optsContainer) optsContainer.style.display = "flex";
            if (destSelect) {
              // Exclude current unit from destinations
              Array.from(destSelect.options).forEach(opt => {
                opt.style.display = opt.value === unitName ? "none" : "";
                if (opt.value !== unitName && !destSelect.value) destSelect.value = opt.value;
              });
            }
          }

          if (deleteUnitModal) deleteUnitModal.style.display = "flex";
        });
      });

      document.getElementById("close-delete-unit-modal")?.addEventListener("click", () => { if (deleteUnitModal) deleteUnitModal.style.display = "none"; });
      document.getElementById("cancel-delete-unit-modal")?.addEventListener("click", () => { if (deleteUnitModal) deleteUnitModal.style.display = "none"; });

      document.getElementById("delete-unit-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector("button[type='submit']");
        const unitName = document.getElementById("delete-unit-target-name")?.value;
        if (!unitName) return;

        const actionRadio = document.querySelector("input[name='delete_unit_action']:checked");
        const action = actionRadio ? actionRadio.value : "delete_lessons";
        const targetUnit = document.getElementById("delete-unit-destination-select")?.value;

        if (submitBtn) submitBtn.disabled = true;
        try {
          const res = await apiFetch(`/courses/${this.courseId}/units`, {
            method: "DELETE",
            body: JSON.stringify({ unitName, action, targetUnit })
          });

          if (res && res.unitsOrder) {
            this.course.unitsOrder = res.unitsOrder;
          }
          if (this.customUnits) {
            this.customUnits = this.customUnits.filter(u => u !== unitName);
          }

          if (deleteUnitModal) deleteUnitModal.style.display = "none";
          showToast(res?.message || "تم حذف الوحدة بنجاح.", "success");
          await this.render();
        } catch (err) {
          showToast(err.message || "فشل حذف الوحدة", "error");
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });

      // 4. Move Unit Up / Down (Arrange Units)
      const handleMoveUnit = async (unitName, direction) => {
        const orderedUnits = Array.isArray(this.course.unitsOrder) && this.course.unitsOrder.length > 0
          ? [...this.course.unitsOrder]
          : Array.from(new Set([
              ...(this.customUnits || []),
              ...(this.course.lessons || []).map(l => l.chapter || "الوحدة العامة")
            ])).filter(Boolean);

        // Ensure unit is in list
        if (!orderedUnits.includes(unitName)) orderedUnits.push(unitName);

        const idx = orderedUnits.indexOf(unitName);
        if (idx === -1) return;

        const targetIdx = direction === "up" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= orderedUnits.length) return;

        // Swap
        const temp = orderedUnits[idx];
        orderedUnits[idx] = orderedUnits[targetIdx];
        orderedUnits[targetIdx] = temp;

        try {
          const res = await apiFetch(`/courses/${this.courseId}/units/reorder`, {
            method: "PUT",
            body: JSON.stringify({ unitsOrder: orderedUnits })
          });

          this.course.unitsOrder = orderedUnits;
          showToast(`تم تحديث ترتيب الوحدات بنجاح! ↕️`, "success");
          await this.render();
        } catch (err) {
          showToast(err.message || "فشل تحديث ترتيب الوحدات", "error");
        }
      };

      this.container.querySelectorAll(".btn-move-unit-up").forEach(btn => {
        btn.addEventListener("click", () => {
          const unit = btn.getAttribute("data-unit");
          if (unit) handleMoveUnit(unit, "up");
        });
      });

      this.container.querySelectorAll(".btn-move-unit-down").forEach(btn => {
        btn.addEventListener("click", () => {
          const unit = btn.getAttribute("data-unit");
          if (unit) handleMoveUnit(unit, "down");
        });
      });

      // 5. Move Lesson Up / Down within unit (Arrange Lessons)
      const handleMoveLesson = async (lessonId, unitName, direction) => {
        const unitLessons = (this.course.lessons || [])
          .filter(l => (l.chapter || "الوحدة العامة") === unitName)
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        const idx = unitLessons.findIndex(l => l.id === lessonId);
        if (idx === -1) return;

        const targetIdx = direction === "up" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= unitLessons.length) return;

        const currentLesson = unitLessons[idx];
        const targetLesson = unitLessons[targetIdx];

        // Swap their order numbers
        const currentOrder = currentLesson.order || (idx + 1);
        const targetOrder = targetLesson.order || (targetIdx + 1);

        const newCurrentOrder = currentOrder === targetOrder ? (direction === "up" ? targetOrder - 1 : targetOrder + 1) : targetOrder;
        const newTargetOrder = currentOrder;

        try {
          await apiFetch(`/courses/${this.courseId}/lessons/reorder`, {
            method: "PUT",
            body: JSON.stringify({
              lessons: [
                { id: currentLesson.id, order: newCurrentOrder },
                { id: targetLesson.id, order: newTargetOrder }
              ]
            })
          });

          showToast("تم تحديث ترتيب الدرس بنجاح! ↕️", "success");
          await this.render();
        } catch (err) {
          showToast(err.message || "فشل تحديث ترتيب الدرس", "error");
        }
      };

      this.container.querySelectorAll(".btn-move-lesson-up").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id");
          const unit = btn.getAttribute("data-unit");
          if (id && unit) handleMoveLesson(id, unit, "up");
        });
      });

      this.container.querySelectorAll(".btn-move-lesson-down").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id");
          const unit = btn.getAttribute("data-unit");
          if (id && unit) handleMoveLesson(id, unit, "down");
        });
      });

      // 6. Transfer Lesson to Another Unit
      this.container.querySelectorAll(".btn-transfer-lesson-unit").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id");
          const currentUnit = btn.getAttribute("data-unit");
          const title = btn.getAttribute("data-title");

          const idInput = document.getElementById("transfer-lesson-id");
          const titleDisplay = document.getElementById("transfer-lesson-title-display");
          const unitSelect = document.getElementById("transfer-lesson-unit-select");

          if (idInput) idInput.value = id;
          if (titleDisplay) titleDisplay.textContent = `الدرس: ${title || ''} (الوحدة الحالية: ${currentUnit || ''})`;
          if (unitSelect && currentUnit) {
            unitSelect.value = currentUnit;
          }

          if (transferLessonModal) transferLessonModal.style.display = "flex";
        });
      });

      document.getElementById("close-transfer-lesson-modal")?.addEventListener("click", () => { if (transferLessonModal) transferLessonModal.style.display = "none"; });
      document.getElementById("cancel-transfer-lesson-modal")?.addEventListener("click", () => { if (transferLessonModal) transferLessonModal.style.display = "none"; });

      document.getElementById("transfer-lesson-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector("button[type='submit']");
        const lessonId = document.getElementById("transfer-lesson-id")?.value;
        const newChapter = document.getElementById("transfer-lesson-unit-select")?.value;
        if (!lessonId || !newChapter) return;

        if (submitBtn) submitBtn.disabled = true;
        try {
          await apiFetch(`/lessons/${lessonId}`, {
            method: "PUT",
            body: JSON.stringify({ chapter: newChapter })
          });

          if (transferLessonModal) transferLessonModal.style.display = "none";
          showToast(`تم نقل الدرس إلى "${newChapter}" بنجاح! 📂`, "success");
          await this.render();
        } catch (err) {
          showToast(err.message || "فشل نقل الدرس", "error");
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });

      // Chapter Select Toggle Custom Input
      chapterSelect?.addEventListener("change", () => {
        if (chapterSelect.value === "__NEW__") {
          if (customChapterInput) {
            customChapterInput.style.display = "block";
            customChapterInput.required = true;
            customChapterInput.focus();
          }
        } else {
          if (customChapterInput) {
            customChapterInput.style.display = "none";
            customChapterInput.required = false;
          }
        }
      });

      // Sub-tab toggling in Lesson Modal
      this.container.querySelectorAll(".lesson-tab-btn").forEach(tabBtn => {
        tabBtn.addEventListener("click", () => {
          this.container.querySelectorAll(".lesson-tab-btn").forEach(b => {
            b.classList.remove("active");
            b.style.color = "var(--text-muted)";
            b.style.borderBottom = "none";
          });
          tabBtn.classList.add("active");
          tabBtn.style.color = "var(--primary)";
          tabBtn.style.borderBottom = "2px solid var(--primary)";

          const targetTab = tabBtn.getAttribute("data-tab");
          this.container.querySelectorAll(".lesson-tab-content").forEach(c => c.style.display = "none");
          const activeContent = document.getElementById(`lesson-tab-${targetTab}`);
          if (activeContent) activeContent.style.display = "flex";
        });
      });

      const questionsContainer = document.getElementById("lesson-questions-list");
      this.editingLessonQuestions = [];

      document.getElementById("add-lesson-question-btn")?.addEventListener("click", () => {
        if (!this.editingLessonQuestions) this.editingLessonQuestions = [];
        this.editingLessonQuestions.push({
          id: Date.now().toString(),
          questionText: "",
          options: ["", "", "", ""],
          correctAnswer: "0",
          explanation: ""
        });
        this.renderQuestionItemsInModal(questionsContainer);
      });

      const resetLessonModalTabs = () => {
        const firstTab = this.container.querySelector('.lesson-tab-btn[data-tab="details"]');
        if (firstTab) firstTab.click();
      };

      // Add Lesson Modal Open (General)
      this.container.querySelectorAll(".open-add-lesson-modal-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          document.getElementById("lesson-modal-title").textContent = "إضافة درس جديد";
          document.getElementById("lesson-id").value = "";
          document.getElementById("lesson-form").reset();
          this.editingLessonQuestions = [];
          this.editingLessonObjectives = [];
          this.renderQuestionItemsInModal(questionsContainer);
          this.renderLessonObjectivesInModal();
          resetLessonModalTabs();
          if (customChapterInput) customChapterInput.style.display = "none";
          if (lessonModal) lessonModal.style.display = "flex";
        });
      });

      // Add Lesson Modal Open (Bound to specific Unit)
      this.container.querySelectorAll(".add-lesson-to-unit-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const targetUnit = btn.getAttribute("data-unit");
          document.getElementById("lesson-modal-title").textContent = `إضافة درس إلى: ${targetUnit}`;
          document.getElementById("lesson-id").value = "";
          document.getElementById("lesson-form").reset();
          this.editingLessonQuestions = [];
          this.editingLessonObjectives = [];
          this.renderQuestionItemsInModal(questionsContainer);
          this.renderLessonObjectivesInModal();
          resetLessonModalTabs();
          if (chapterSelect && targetUnit) {
            chapterSelect.value = targetUnit;
          }
          if (customChapterInput) customChapterInput.style.display = "none";
          if (lessonModal) lessonModal.style.display = "flex";
        });
      });

      document.getElementById("close-lesson-modal")?.addEventListener("click", () => { if (lessonModal) lessonModal.style.display = "none"; });
      document.getElementById("cancel-lesson-modal")?.addEventListener("click", () => { if (lessonModal) lessonModal.style.display = "none"; });

      // Edit Lesson
      this.container.querySelectorAll(".edit-lesson-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id");
          const lesson = (this.course.lessons || []).find(l => l.id === id);
          if (lesson) {
            document.getElementById("lesson-modal-title").textContent = "تعديل الدرس";
            document.getElementById("lesson-id").value = lesson.id;

            if (chapterSelect) {
              const hasOpt = Array.from(chapterSelect.options).some(opt => opt.value === lesson.chapter);
              if (hasOpt) {
                chapterSelect.value = lesson.chapter;
                if (customChapterInput) customChapterInput.style.display = "none";
              } else {
                chapterSelect.value = "__NEW__";
                if (customChapterInput) {
                  customChapterInput.style.display = "block";
                  customChapterInput.value = lesson.chapter || "";
                }
              }
            }

            document.getElementById("lesson-title").value = lesson.title || "";
            document.getElementById("lesson-video").value = lesson.videoUrl || "";
            document.getElementById("lesson-duration").value = lesson.duration || "20:00";
            document.getElementById("lesson-order").value = lesson.order || 1;
            // Set Quill editor content (HTML)
            if (this._lessonDescEditor) {
              this._lessonDescEditor.root.innerHTML = lesson.description || "";
            } else {
              document.getElementById("lesson-desc").value = lesson.description || "";
            }
            document.getElementById("lesson-notes").value = lesson.notes || "";
            document.getElementById("lesson-resource-title").value = lesson.resourceTitle || "";
            document.getElementById("lesson-resource-url").value = lesson.resourceUrl || "";

            this.editingLessonQuestions = Array.isArray(lesson.questions) ? [...lesson.questions] : [];
            this.editingLessonObjectives = Array.isArray(lesson.objectives) ? [...lesson.objectives] : [];
            this.renderQuestionItemsInModal(questionsContainer);
            this.renderLessonObjectivesInModal();

            resetLessonModalTabs();
            if (lessonModal) lessonModal.style.display = "flex";
          }
        });
      });

      // Add Lesson Objective in Modal
      document.getElementById("modal-add-lesson-objective-btn")?.addEventListener("click", () => {
        const input = document.getElementById("modal-lesson-objective-input");
        if (input && input.value.trim()) {
          if (!this.editingLessonObjectives) this.editingLessonObjectives = [];
          this.editingLessonObjectives.push(input.value.trim());
          input.value = "";
          this.renderLessonObjectivesInModal();
        }
      });

      document.getElementById("modal-lesson-objective-input")?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const input = document.getElementById("modal-lesson-objective-input");
          if (input && input.value.trim()) {
            if (!this.editingLessonObjectives) this.editingLessonObjectives = [];
            this.editingLessonObjectives.push(input.value.trim());
            input.value = "";
            this.renderLessonObjectivesInModal();
          }
        }
      });

      // Delete Lesson
      this.container.querySelectorAll(".delete-lesson-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          const confirmed = await confirmDialog({ message: "هل أنت تأكد من حذف هذا الدرس؟", danger: true });
          if (!confirmed) return;
          try {
            await apiFetch(`/lessons/${id}`, { method: "DELETE" });
            showToast("تم حذف الدرس بنجاح.", "success");
            await this.render();
          } catch (err) { console.error(err); }
        });
      });

      // Submit Lesson Form
      document.getElementById("lesson-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector("button[type='submit']");
        if (submitBtn) submitBtn.disabled = true;

        const id = document.getElementById("lesson-id")?.value;
        const titleVal = document.getElementById("lesson-title")?.value.trim();

        if (!titleVal) {
          showToast("الرجاء كتابة عنوان الدرس.", "error");
          if (submitBtn) submitBtn.disabled = false;
          return;
        }

        const chapterSelectEl = document.getElementById("lesson-chapter-select");
        const customChapterInputEl = document.getElementById("lesson-chapter-custom");
        let selectedChapter = chapterSelectEl?.value || "الوحدة العامة";
        if (selectedChapter === "__NEW__") {
          selectedChapter = customChapterInputEl?.value.trim() || "الوحدة العامة";
        }

        const videoUrlVal = document.getElementById("lesson-video")?.value.trim() || "";

        // Clean questions array
        const validQuestions = (this.editingLessonQuestions || []).filter(q => q.questionText && q.questionText.trim().length > 0);

        // Get description from Quill editor or fallback hidden input
        const descHtml = this._lessonDescEditor
          ? this._lessonDescEditor.root.innerHTML.trim()
          : (document.getElementById("lesson-desc")?.value.trim() || "");
        // Treat empty Quill output as null
        const descVal = (descHtml === "<p><br></p>" || descHtml === "") ? null : descHtml;

        const payload = {
          chapter: selectedChapter,
          title: titleVal,
          videoUrl: videoUrlVal,
          photo: null,
          duration: document.getElementById("lesson-duration")?.value.trim() || "20:00",
          order: parseInt(document.getElementById("lesson-order")?.value) || 1,
          description: descVal,
          notes: document.getElementById("lesson-notes")?.value.trim() || null,
          resourceTitle: document.getElementById("lesson-resource-title")?.value.trim() || null,
          resourceUrl: document.getElementById("lesson-resource-url")?.value.trim() || null,
          questions: validQuestions,
          objectives: this.editingLessonObjectives || []
        };

        try {
          if (id) {
            await apiFetch(`/lessons/${id}`, { method: "PUT", body: JSON.stringify(payload) });
            showToast("تم تعديل بيانات الدرس بنجاح! ✅", "success");
          } else {
            await apiFetch(`/courses/${this.courseId}/lessons`, { method: "POST", body: JSON.stringify(payload) });
            showToast("تم إنشاء الدرس الجديد بنجاح! ✅", "success");
          }
          if (lessonModal) lessonModal.style.display = "none";
          await this.render();
        } catch (err) {
          console.error("Error saving lesson:", err);
          showToast(err.message || "فشل حفظ الدرس. الرجاء التحقق من البيانات والمحاولة مجدداً.", "error");
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }

    // --- RESOURCES TAB EVENTS ---
    if (this.activeTab === "resources") {
      document.getElementById("open-manage-add-resource-btn")?.addEventListener("click", () => {
        const wrapper = document.getElementById("inline-resource-modal-wrapper");
        if (!wrapper) return;
        wrapper.innerHTML = `
          <div style="position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px;">
            <div class="glass-card" style="width:100%; max-width:480px; border-radius:20px; padding:28px; border:1px solid var(--border-color);">
              <h3 style="margin-bottom:16px; font-size:1.2rem; font-weight:800;">إضافة مورد جديد لهذه الدورة</h3>
              <form id="inline-resource-form">
                <div class="form-group" style="margin-bottom:14px;">
                  <label style="font-weight:700; margin-bottom:6px; display:block;">اسم المورد / الملف <span style="color:var(--error);">*</span></label>
                  <input type="text" id="inline-resource-title" class="form-input" placeholder="مثال: ملخص الدرس الأول PDF" required style="padding:10px 14px;">
                </div>
                <div class="form-group" style="margin-bottom:14px;">
                  <label style="font-weight:700; margin-bottom:6px; display:block;">رابط الملف (Google Drive / PDF) <span style="color:var(--error);">*</span></label>
                  <input type="url" id="inline-resource-url" class="form-input" placeholder="https://drive.google.com/..." required style="padding:10px 14px;">
                </div>
                <div class="form-group" style="margin-bottom:20px;">
                  <label style="font-weight:700; margin-bottom:6px; display:block;">صورة المورد (اختياري)</label>
                  <input type="url" id="inline-resource-photo" class="form-input" placeholder="https://..." style="padding:10px 14px;">
                </div>
                <div style="display:flex; justify-content:flex-end; gap:10px;">
                  <button type="button" id="close-inline-resource-btn" class="btn-secondary" style="padding:8px 16px;">إلغاء</button>
                  <button type="submit" class="btn-primary" style="padding:8px 20px;">حفظ المورد</button>
                </div>
              </form>
            </div>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();

        const closeInline = () => { wrapper.innerHTML = ""; };
        wrapper.querySelector("#close-inline-resource-btn")?.addEventListener("click", closeInline);

        wrapper.querySelector("#inline-resource-form")?.addEventListener("submit", async (e) => {
          e.preventDefault();
          const title = wrapper.querySelector("#inline-resource-title").value.trim();
          const url = wrapper.querySelector("#inline-resource-url").value.trim();
          const photo = wrapper.querySelector("#inline-resource-photo").value.trim();

          try {
            await apiFetch("/resources", {
              method: "POST",
              body: JSON.stringify({ title, url, photo, courseId: this.courseId })
            });
            showToast("تم إضافة المورد للدورة بنجاح! ✅", "success");
            closeInline();
            await this.render();
          } catch (err) { console.error(err); }
        });
      });

      this.container.querySelectorAll(".delete-manage-resource-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          const confirmed = await confirmDialog({ message: "هل تريد حذف هذا المورد؟", danger: true });
          if (!confirmed) return;
          try {
            await apiFetch(`/resources/${id}`, { method: "DELETE" });
            showToast("تم حذف المورد بنجاح.", "success");
            await this.render();
          } catch (err) { console.error(err); }
        });
      });
    }

    // --- GROUPS TAB EVENTS ---
    if (this.activeTab === "groups") {
      const openAddGroup = () => {
        const wrapper = document.getElementById("manage-group-modal-wrapper");
        if (!wrapper) return;

        const isAdmin = (window.state?.user?.role === 'admin');

        wrapper.innerHTML = `
          <div style="position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;">
            <div class="glass-card" style="width:100%; max-width:620px; border-radius:28px; padding:28px; max-height:90vh; display:flex; flex-direction:column; gap:18px; position:relative; overflow:hidden;">
              
              <!-- Header -->
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:14px;">
                <div>
                  <h3 style="font-size:1.25rem; font-weight:900; margin:0 0 4px 0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                    <i data-lucide="plus-circle" style="width:20px; height:20px; color:#e51d74;"></i>
                    إضافة مجموعة جديدة للدورة ➕
                  </h3>
                  <p style="font-size:0.82rem; color:var(--text-muted); margin:0;">
                    حدد مواعيد الحصص، تواريخ البدء والانتهاء، المقاعد، وأرباح الحصة (نسبة المنصة 50%)
                  </p>
                </div>
                <button id="close-manage-group-modal" style="background:var(--bg-app); border:1px solid var(--border-color); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--text-main); font-size:1.2rem;">&times;</button>
              </div>

              <!-- Admin Policy Note -->
              <div style="background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.25); border-radius:14px; padding:10px 14px; font-size:0.8rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:10px;">
                <i data-lucide="shield-check" style="width:18px; height:18px; color:#6366f1; flex-shrink:0;"></i>
                <span>📌 ملاحظة: أسعار الحصص (40 ج.م./حصة) والحد الأقصى للمقاعد (25 مقعداً) يتم ضبطها واعتمادها مركزياً من إدارة المنصة فقط. ستدخل المجموعة قيد مراجعة واعتماد الإدارة فور إرسالها.</span>
              </div>

              <form id="manage-create-group-form" style="display:flex; flex-direction:column; gap:14px; overflow-y:auto; padding-inline-end:4px;">
                
                <!-- Days Checkboxes -->
                <div>
                  <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px;">أيام الحصص الأسبوعية: <span style="color:#ef4444;">*</span></label>
                  <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(90px, 1fr)); gap:6px;">
                    ${["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"].map((day, idx) => `
                      <label style="display:flex; align-items:center; gap:4px; padding:6px 8px; border-radius:10px; border:1px solid var(--border-color); background:var(--bg-app); font-size:0.8rem; font-weight:700; cursor:pointer;">
                        <input type="checkbox" name="manage-group-days" value="${day}" ${idx === 1 || idx === 3 ? 'checked' : ''} style="accent-color:#e51d74;">
                        <span>${day}</span>
                      </label>
                    `).join('')}
                  </div>
                </div>

                <!-- Schedule Time & Duration -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                  <div>
                    <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px;">توقيت الحصة:</label>
                    <input type="text" id="manage-group-time" value="6:00م" class="form-input" style="padding:10px 14px; border-radius:12px;">
                  </div>
                  <div>
                    <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px;">مدة الحصة (بالدقائق):</label>
                    <input type="number" id="manage-group-duration" min="15" max="180" value="60" required class="form-input" style="padding:10px 14px; border-radius:12px;">
                  </div>
                </div>

                <!-- Schedule Time -->
                <div>
                  <label style="display:block; font-size:0.88rem; font-weight:800; margin-bottom:8px; color:var(--text-main);">
                    توقيت الحصة: <span style="color:#ef4444;">*</span>
                  </label>
                  <input type="text" id="manage-group-time" placeholder="مثال: 6:00م أو 7:30م" value="6:00م" required class="form-input" style="padding:12px 14px; border-radius:14px; font-size:0.92rem;">
                </div>

                <div>
                  <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px;">رابط البث المباشر المخصص (Zoom / Meet) - اختياري:</label>
                  <input type="url" id="manage-group-link" placeholder="https://zoom.us/j/... أو Meet" class="form-input" style="padding:11px 14px; border-radius:12px;">
                </div>

                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
                  <button type="button" id="cancel-manage-group-btn" class="btn-secondary" style="padding:10px 20px; border-radius:20px;">إلغاء</button>
                  <button type="submit" id="submit-manage-group-btn" class="btn-primary" style="padding:10px 28px; border-radius:20px; font-weight:900; background:#e51d74; border-color:#e51d74;">
                    إرسال المجموعة للمراجعة والاعتماد 🚀
                  </button>
                </div>
              </form>

            </div>
          </div>
        `;

        if (window.lucide) window.lucide.createIcons();

        const closeWrapper = () => { wrapper.innerHTML = ""; };
        document.getElementById("close-manage-group-modal")?.addEventListener("click", closeWrapper);
        document.getElementById("cancel-manage-group-btn")?.addEventListener("click", closeWrapper);

        document.getElementById("manage-create-group-form")?.addEventListener("submit", async (e) => {
          e.preventDefault();
          const scheduleTime = document.getElementById("manage-group-time")?.value.trim() || "6:00م";
          const meetingLink = document.getElementById("manage-group-link")?.value.trim() || null;

          const checkedDays = Array.from(document.querySelectorAll("input[name='manage-group-days']:checked")).map(cb => cb.value);
          const scheduleDays = checkedDays.join("، ") || "الأحد، الثلاثاء";
          const scheduleText = `${scheduleDays} الساعة ${scheduleTime}`;
          const name = `مجموعة ${scheduleDays} (${scheduleTime})`;

          const submitBtn = document.getElementById("submit-manage-group-btn");
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = "جاري الإرسال...";
          }

          try {
            await apiFetch(`/courses/${this.courseId}/groups`, {
              method: "POST",
              body: JSON.stringify({
                name,
                scheduleDays,
                scheduleTime,
                scheduleText,
                meetingLink
              })
            });
            showToast("تم إرسال المجموعة لمراجعة واعتماد الإدارة بنجاح! ⏳🚀", "success");
            closeWrapper();
            await this.render();
          } catch (err) {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerText = "إرسال المجموعة للمراجعة والاعتماد 🚀";
            }
          }
        });
      };

      document.getElementById("open-manage-add-group-btn")?.addEventListener("click", openAddGroup);
      document.getElementById("inline-create-group-btn")?.addEventListener("click", openAddGroup);

      this.container.querySelectorAll(".delete-course-group-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          const name = btn.getAttribute("data-name");
          const confirmed = await confirmDialog({ message: `هل تريد حذف المجموعة "${name}"؟`, danger: true });
          if (!confirmed) return;
          try {
            await apiFetch(`/groups/${id}`, { method: "DELETE" });
            showToast("تم حذف المجموعة بنجاح.", "success");
            await this.render();
          } catch (err) {
            showToast(err.message || "فشل حذف المجموعة.", "error");
          }
        });
      });

      this.container.querySelectorAll(".view-course-group-students-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const groupId = btn.getAttribute("data-id");
          const groupName = btn.getAttribute("data-name");
          const wrapper = document.getElementById("manage-group-modal-wrapper");
          if (!wrapper) return;

          wrapper.innerHTML = `
            <div style="position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;">
              <div class="glass-card" style="width:100%; max-width:540px; border-radius:24px; padding:24px; max-height:85vh; display:flex; flex-direction:column; gap:16px; position:relative; overflow:hidden;">
                <div style="text-align:center; padding:40px;">
                  <div class="spinner" style="width:36px; height:36px; margin:0 auto 12px; border-width:3px;"></div>
                  <p style="font-weight:700; font-size:0.92rem; color:var(--text-muted);">جارٍ تحميل قائمة طلاب المجموعة...</p>
                </div>
              </div>
            </div>
          `;

          let students = [];
          try {
            const res = await apiFetch(`/groups/${groupId}/roster`);
            if (res && Array.isArray(res.students)) {
              students = res.students;
            }
          } catch (err) {
            showToast(err.message || "فشل تحميل قائمة الطلاب.", "error");
          }

          wrapper.innerHTML = `
            <div style="position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;">
              <div class="glass-card" style="width:100%; max-width:540px; border-radius:24px; padding:24px; max-height:85vh; display:flex; flex-direction:column; gap:16px; position:relative; overflow:hidden;">
                
                <!-- Modal Header -->
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:14px;">
                  <div>
                    <h3 style="font-size:1.15rem; font-weight:900; margin:0 0 4px 0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                      <i data-lucide="users" style="width:20px; height:20px; color:#e51d74;"></i>
                      قائمة طلاب المجموعة (${students.length}) 👥
                    </h3>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">
                      👥 ${groupName || 'المجموعة الدراسية'}
                    </p>
                  </div>
                  <button id="close-course-group-students-modal" style="background:var(--bg-app); border:1px solid var(--border-color); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--text-main); font-size:1.2rem;">
                    &times;
                  </button>
                </div>

                <!-- Students List -->
                <div style="overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:10px; padding-inline-end:4px;">
                  ${students.length === 0 ? `
                    <div style="text-align:center; padding:40px; color:var(--text-muted); font-size:0.88rem;">
                      <i data-lucide="users" style="width:40px; height:40px; opacity:0.3; margin:0 auto 10px; display:block;"></i>
                      لا يوجد طلاب مسجلون في هذه المجموعة حتى الآن.
                    </div>
                  ` : students.map((st, idx) => {
                    const avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(st.name || `student_${idx}`)}`;
                    const isPending = st.status && st.status.toLowerCase() === "pending";
                    return `
                      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; border-radius:16px; background:var(--bg-app); border:1px solid var(--border-color);">
                        <div style="display:flex; align-items:center; gap:12px;">
                          <div style="width:28px; height:28px; border-radius:8px; background:rgba(99,102,241,0.1); color:var(--primary); font-weight:800; font-size:0.75rem; display:flex; align-items:center; justify-content:center;">
                            ${idx + 1}
                          </div>
                          <img src="${avatar}" alt="${st.name}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1px solid var(--border-color); background:var(--bg-card);">
                          <div>
                            <div style="font-size:0.92rem; font-weight:800; color:var(--text-main);">${st.name}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">طالب مقيد بالمجموعة 🎓</div>
                          </div>
                        </div>

                        <span style="padding:4px 10px; border-radius:12px; background:${isPending ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)'}; color:${isPending ? '#d97706' : '#10b981'}; font-weight:800; font-size:0.75rem; border:1px solid ${isPending ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'}; display:inline-flex; align-items:center; gap:4px;">
                          ${isPending ? '⏳ قيد المراجعة' : '✅ مقعد نشط'}
                        </span>
                      </div>
                    `;
                  }).join('')}
                </div>

              </div>
            </div>
          `;

          if (window.lucide) window.lucide.createIcons();

          document.getElementById("close-course-group-students-modal")?.addEventListener("click", () => {
            wrapper.innerHTML = "";
          });
        });
      });
    }

    // --- SETTINGS EVENTS ---
    if (this.activeTab === "settings") {
      const fileInput = document.getElementById("manage-image-file");
      const triggerBtn = document.getElementById("manage-trigger-upload-btn");
      const dropzone = document.getElementById("manage-image-dropzone");
      const idleBox = document.getElementById("manage-image-idle");
      const loadingBox = document.getElementById("manage-image-loading");
      const previewWrapper = document.getElementById("manage-image-preview-wrapper");
      const previewImg = document.getElementById("manage-course-preview-img");
      const removeBtn = document.getElementById("manage-remove-image-btn");
      const hiddenUrlInput = document.getElementById("manage-image-url");
      const toggleUrlBtn = document.getElementById("manage-toggle-url-btn");
      const urlWrapper = document.getElementById("manage-url-wrapper");
      const directUrlInput = document.getElementById("manage-image-url-direct");

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
        if (urlWrapper.style.display === "none") {
          urlWrapper.style.display = "block";
          toggleUrlBtn.innerText = "إلغاء أدخل الرابط ✕";
        } else {
          urlWrapper.style.display = "none";
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
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            headers: { "Authorization": "Bearer " + token },
            body: formData
          });

          if (uploadRes.ok) {
            const data = await uploadRes.json();
            hiddenUrlInput.value = data.url;
            previewImg.src = data.url;
            if (loadingBox) loadingBox.style.display = "none";
            if (previewWrapper) previewWrapper.style.display = "block";
            showToast("تم رفع صورة الغلاف بنجاح! 📸", "success");
          } else {
            throw new Error("Upload failed with status " + uploadRes.status);
          }
        } catch (err) {
          console.error("Image upload failed", err);
          if (loadingBox) loadingBox.style.display = "none";
          if (idleBox) idleBox.style.display = "block";
          showToast("تعذر رفع الصورة، الرجاء المحاولة مرة أخرى.", "error");
        }
      });

      document.getElementById("manage-course-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = document.getElementById("save-course-settings-btn");
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader" class="spinner" style="width:16px;height:16px;border-width:2px;"></i> جار الحفظ...`;
        if (window.lucide) window.lucide.createIcons();

        const payload = {
          title: document.getElementById("manage-title").value.trim(),
          category: document.getElementById("manage-category").value,
          description: document.getElementById("manage-desc").value.trim(),
          meetingLink: document.getElementById("manage-meeting-link").value.trim(),
          image: hiddenUrlInput?.value || document.getElementById("manage-image-url-direct")?.value.trim() || ""
        };

        try {
          const updatedCourse = await apiFetch(`/courses/${this.courseId}`, { method: "PUT", body: JSON.stringify(payload) });
          this.course = updatedCourse;
          showToast("تم حفظ إعدادات الدورة وتحديث الصورة بنجاح! ✅", "success");
          await this.render();
        } catch (err) {
          console.error(err);
          showToast(err.message || "فشل حفظ التغييرات", "error");
          btn.disabled = false;
          btn.innerHTML = `<i data-lucide="save"></i> حفظ التغييرات`;
          if (window.lucide) window.lucide.createIcons();
        }
      });
    }
  }

  renderQuestionItemsInModal(questionsContainer) {
    if (!questionsContainer) return;
    if (!this.editingLessonQuestions) this.editingLessonQuestions = [];

    if (this.editingLessonQuestions.length === 0) {
      questionsContainer.innerHTML = `
        <div style="text-align:center; padding:20px; color:var(--text-muted); border:1px dashed var(--border-color); border-radius:10px; font-size:0.85rem;">
          لا توجد أسئلة مضافة حتى الآن. اضغط على "إضافة سؤال" لبدء إضافة الأسئلة لهذا الدرس.
        </div>
      `;
      return;
    }

    questionsContainer.innerHTML = this.editingLessonQuestions.map((q, idx) => `
      <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:10px; position:relative;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:800; font-size:0.85rem; color:var(--primary);">سؤال ${idx + 1}</span>
          <button type="button" class="remove-question-btn" data-index="${idx}" style="background:none; border:none; color:var(--error); cursor:pointer; font-size:0.8rem; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
            <i data-lucide="trash-2" style="width:14px;height:14px;"></i> حذف السؤال
          </button>
        </div>

        <div class="form-group" style="margin:0;">
          <label style="font-size:0.8rem; font-weight:700; display:block; margin-bottom:4px;">نص السؤال</label>
          <input type="text" class="form-input q-text-input" data-index="${idx}" placeholder="اكتب نص السؤال هنا..." value="${q.questionText || ''}" style="padding:8px 12px; font-size:0.88rem;">
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <input type="text" class="form-input q-opt-input" data-index="${idx}" data-opt="0" placeholder="الخيار (أ)" value="${q.options?.[0] || ''}" style="padding:6px 10px; font-size:0.82rem;">
          <input type="text" class="form-input q-opt-input" data-index="${idx}" data-opt="1" placeholder="الخيار (ب)" value="${q.options?.[1] || ''}" style="padding:6px 10px; font-size:0.82rem;">
          <input type="text" class="form-input q-opt-input" data-index="${idx}" data-opt="2" placeholder="الخيار (ج)" value="${q.options?.[2] || ''}" style="padding:6px 10px; font-size:0.82rem;">
          <input type="text" class="form-input q-opt-input" data-index="${idx}" data-opt="3" placeholder="الخيار (د)" value="${q.options?.[3] || ''}" style="padding:6px 10px; font-size:0.82rem;">
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div>
            <label style="font-size:0.78rem; font-weight:700; display:block; margin-bottom:4px;">الإجابة الصحيحة</label>
            <select class="form-select q-correct-select" data-index="${idx}" style="padding:6px 10px; font-size:0.82rem;">
              <option value="0" ${q.correctAnswer === '0' || q.correctAnswer === q.options?.[0] ? 'selected' : ''}>الخيار (أ)</option>
              <option value="1" ${q.correctAnswer === '1' || q.correctAnswer === q.options?.[1] ? 'selected' : ''}>الخيار (ب)</option>
              <option value="2" ${q.correctAnswer === '2' || q.correctAnswer === q.options?.[2] ? 'selected' : ''}>الخيار (ج)</option>
              <option value="3" ${q.correctAnswer === '3' || q.correctAnswer === q.options?.[3] ? 'selected' : ''}>الخيار (د)</option>
            </select>
          </div>
          <div>
            <label style="font-size:0.78rem; font-weight:700; display:block; margin-bottom:4px;">شرح الإجابة (توضيح اختيار الطالب)</label>
            <input type="text" class="form-input q-explanation-input" data-index="${idx}" placeholder="سبب وتفسير الإجابة الصحيحة..." value="${q.explanation || ''}" style="padding:6px 10px; font-size:0.82rem;">
          </div>
        </div>
      </div>
    `).join("");

    if (window.lucide) window.lucide.createIcons();

    // Bind inputs changes
    questionsContainer.querySelectorAll(".q-text-input").forEach(input => {
      input.addEventListener("input", (e) => {
        const i = parseInt(e.target.getAttribute("data-index"));
        if (this.editingLessonQuestions[i]) this.editingLessonQuestions[i].questionText = e.target.value;
      });
    });

    questionsContainer.querySelectorAll(".q-opt-input").forEach(input => {
      input.addEventListener("input", (e) => {
        const i = parseInt(e.target.getAttribute("data-index"));
        const optIdx = parseInt(e.target.getAttribute("data-opt"));
        if (this.editingLessonQuestions[i]) {
          if (!this.editingLessonQuestions[i].options) this.editingLessonQuestions[i].options = ["", "", "", ""];
          this.editingLessonQuestions[i].options[optIdx] = e.target.value;
        }
      });
    });

    questionsContainer.querySelectorAll(".q-correct-select").forEach(select => {
      select.addEventListener("change", (e) => {
        const i = parseInt(e.target.getAttribute("data-index"));
        if (this.editingLessonQuestions[i]) this.editingLessonQuestions[i].correctAnswer = e.target.value;
      });
    });

    questionsContainer.querySelectorAll(".q-explanation-input").forEach(input => {
      input.addEventListener("input", (e) => {
        const i = parseInt(e.target.getAttribute("data-index"));
        if (this.editingLessonQuestions[i]) this.editingLessonQuestions[i].explanation = e.target.value;
      });
    });

    questionsContainer.querySelectorAll(".remove-question-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const i = parseInt(e.currentTarget.getAttribute("data-index"));
        this.editingLessonQuestions.splice(i, 1);
        this.renderQuestionItemsInModal(questionsContainer);
      });
    });
  }

  onDestroy() { }
}
