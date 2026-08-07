import { apiFetch, state, showToast, t, confirmDialog } from "../app.js";

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

      const [course, allResources] = await Promise.all([
        apiFetch(`/courses/${this.courseId}`),
        apiFetch("/resources")
      ]);

      this.course = course;
      this.courseResources = (allResources || []).filter(r => r.course && String(r.course.id) === String(this.courseId));

      if (course.teacher?.id !== state.user.id && state.user.role !== "admin") {
        showToast("غير مسموح لك بتعديل هذه الدورة.", "error");
        window.location.hash = "#teacher-portal";
        return;
      }

      this.container.innerHTML = `
        <div class="course-manage-container" style="display:flex; min-height: calc(100vh - 64px); background:var(--bg-app);">
          
          <!-- Sidebar Nav (Right Side for RTL) -->
          <div class="manage-sidebar" style="width:280px; flex-shrink:0; border-inline-end:1px solid var(--border-color); background:var(--bg-card); padding:24px 16px; display:flex; flex-direction:column; gap:20px;">
            <div>
              <a href="#teacher-portal" class="btn-secondary" style="font-size:0.85rem; padding:8px 14px; margin-bottom:16px; display:inline-flex; align-items:center; gap:6px; text-decoration:none; width:100%; justify-content:center;">
                <i data-lucide="arrow-right"></i> ${t("nav.teacherPortal") || "بوابة المعلم"}
              </a>
              <h2 style="font-size:1.15rem; font-weight:800; color:var(--text-color); margin-bottom:4px; line-height:1.4;">${this.course.title}</h2>
              <div style="font-size:0.8rem; color:var(--primary); font-weight:700;">إدارة محتوى الدورة التعليمية</div>
            </div>

            <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
              <button class="manage-nav-btn ${this.activeTab === 'curriculum' ? 'active' : ''}" data-tab="curriculum">
                <i data-lucide="list-tree"></i> المنهج والدروس
              </button>
              <button class="manage-nav-btn ${this.activeTab === 'resources' ? 'active' : ''}" data-tab="resources">
                <i data-lucide="folder-open"></i> الموارد والملفات (${this.courseResources.length})
              </button>
              <button class="manage-nav-btn ${this.activeTab === 'settings' ? 'active' : ''}" data-tab="settings">
                <i data-lucide="settings"></i> إعدادات الدورة
              </button>
            </div>
          </div>

          <!-- Main Content Pane -->
          <div class="manage-content" style="flex:1; padding:36px; overflow-y:auto;">
            ${
              this.activeTab === 'curriculum' ? this.renderCurriculum() :
              this.activeTab === 'resources' ? this.renderResourcesTab() :
              this.renderSettings()
            }
          </div>
        </div>

        <style>
          .manage-nav-btn {
            display: flex; align-items: center; gap: 10px;
            padding: 12px 16px; border: 1px solid transparent; background: transparent;
            color: var(--text-muted); font-size: 0.95rem; font-weight: 700;
            border-radius: var(--radius-sm); cursor: pointer; text-align: start;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            width: 100%;
          }
          .manage-nav-btn:hover {
            background: rgba(99, 102, 241, 0.08); color: var(--primary);
          }
          .manage-nav-btn.active {
            background: rgba(99, 102, 241, 0.12); color: var(--primary);
            border-color: var(--primary-glow);
          }
          .chapter-box {
            background: var(--bg-card); border: 1px solid var(--border-color);
            border-radius: 14px; margin-bottom: 24px;
            overflow: hidden;
            box-shadow: 0 4px 14px rgba(0,0,0,0.03);
          }
          .chapter-header {
            background: var(--bg-app); border-bottom: 1px solid var(--border-color);
            padding: 16px 20px; display: flex; align-items: center; justify-content: space-between;
            font-weight: 800; font-size: 1.05rem; color: var(--text-color);
          }
          .lesson-item {
            padding: 14px 20px; border-bottom: 1px solid var(--border-color);
            display: flex; align-items: center; justify-content: space-between;
            transition: background 0.2s;
          }
          .lesson-item:hover { background: rgba(99, 102, 241, 0.03); }
          .lesson-item:last-child { border-bottom: none; }
          .lesson-actions button {
            background: transparent; border: 1px solid var(--border-color); cursor: pointer; color: var(--text-muted);
            padding: 6px 10px; border-radius: 8px; transition: 0.2s;
            display: inline-flex; align-items: center; justify-content: center;
          }
          .lesson-actions button:hover { background: var(--bg-app); color: var(--text-main); border-color: var(--primary); }
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

    // Initialize custom empty units
    (this.customUnits || []).forEach(unitName => {
      if (!chaptersMap[unitName]) chaptersMap[unitName] = [];
    });

    lessons.forEach(l => {
      const chName = l.chapter || "الوحدة العامة (General)";
      if (!chaptersMap[chName]) chaptersMap[chName] = [];
      chaptersMap[chName].push(l);
    });

    let chaptersHtml = "";
    const chapterNames = Object.keys(chaptersMap);

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
      chaptersHtml = chapterNames.map(chName => {
        const chLessons = chaptersMap[chName];
        return `
          <div class="chapter-box">
            <div class="chapter-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <i data-lucide="folder-open" style="width:20px;height:20px;color:var(--primary);"></i>
                <span style="font-size:1.05rem; font-weight:800;">${chName}</span>
                <span style="font-size:0.78rem; font-weight:700; background:var(--primary-glow); color:var(--primary); padding:3px 10px; border-radius:12px; margin-inline-start:6px;">
                  ${chLessons.length} دروس
                </span>
              </div>
              <button class="btn-secondary add-lesson-to-unit-btn" data-unit="${chName}" style="font-size:0.8rem; padding:6px 14px; border-radius:20px; font-weight:700;">
                <i data-lucide="plus" style="width:14px;height:14px;"></i> إضافة درس في هذه الوحدة
              </button>
            </div>
            <div>
              ${chLessons.length === 0 ? `
                <div style="padding:20px; text-align:center; color:var(--text-muted); font-size:0.85rem; font-style:italic;">
                  لا توجد دروس في هذه الوحدة بعد. <button class="add-lesson-to-unit-btn" data-unit="${chName}" style="background:none; border:none; color:var(--primary); font-weight:700; cursor:pointer; text-decoration:underline;">إضافة أول درس لهذه الوحدة</button>
                </div>
              ` : chLessons.map(l => `
                <div class="lesson-item">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:32px; height:32px; border-radius:50%; background:var(--primary-glow); color:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.85rem;">
                      ${l.order || 1}
                    </div>
                    <div>
                      <div style="font-weight:700; color:var(--text-color); font-size:0.95rem;">${l.title}</div>
                      <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">
                        <i data-lucide="clock" style="width:12px;height:12px;vertical-align:middle;"></i> ${l.duration || 15} دقيقة
                        ${l.videoUrl ? ` • <i data-lucide="video" style="width:12px;height:12px;vertical-align:middle;color:var(--primary);"></i> فيديو مرفق` : ''}
                      </div>
                    </div>
                  </div>

                  <div class="lesson-actions" style="display:flex; gap:8px;">
                    <button class="edit-lesson-btn" data-id="${l.id}" title="تعديل الدرس">
                      <i data-lucide="edit-3" style="width:14px;height:14px;"></i>
                    </button>
                    <button class="delete-lesson-btn" data-id="${l.id}" style="color:var(--error);" title="حذف الدرس">
                      <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
                    </button>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        `;
      }).join("");
    }

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:28px; flex-wrap:wrap; gap:14px;">
        <div>
          <h3 style="font-size:1.4rem; font-weight:800; margin-bottom:4px;">منهج الدورة والدروس المسجلة</h3>
          <p style="color:var(--text-muted); font-size:0.88rem; margin:0;">إدارة وتنسيق الوحدات الدراسية (Units) والدروس التابعة لكل وحدة</p>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn-secondary open-add-unit-modal-btn" style="padding:10px 18px; font-weight:800; border-color:var(--primary); color:var(--primary);">
            <i data-lucide="folder-plus"></i> إضافة وحدة دراسية جديدة
          </button>
          <button class="btn-primary open-add-lesson-modal-btn" style="padding:10px 20px; font-weight:800;">
            <i data-lucide="plus-circle"></i> إضافة درس جديد
          </button>
        </div>
      </div>

      ${chaptersHtml}
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
                  <i data-lucide="calendar" style="width:12px;height:12px;vertical-align:middle;"></i> ${new Date(r.createdAt).toLocaleDateString("ar-DZ")}
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
            <label style="font-weight:700; margin-bottom:6px; display:block;">صورة الغلاف (رابط أو رفع ملف)</label>
            <input type="text" id="manage-image-url" class="form-input" value="${this.course.image || ''}" placeholder="https://..." style="padding:10px 14px; margin-bottom:8px;">
            <input type="file" id="manage-image-file" class="form-input" accept="image/*">
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
                <i data-lucide="check"></i> إنشاء الوحدة
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Add/Edit Lesson Modal -->
      <div class="modal-overlay" id="lesson-modal" style="display:none;">
        <div class="modal-content" style="max-width:520px;">
          <div class="modal-header">
            <h3 class="modal-title" id="lesson-modal-title" style="font-size:1.15rem; font-weight:800;">إضافة درس جديد</h3>
            <span class="modal-close-btn" id="close-lesson-modal">&times;</span>
          </div>
          <form id="lesson-form">
            <input type="hidden" id="lesson-id">
            <div class="modal-body" style="display:flex; flex-direction:column; gap:14px; padding:20px;">
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
                <label style="font-weight:700; margin-bottom:6px; display:block;">رابط فيديو الدرس (YouTube / Vimeo / MP4)</label>
                <input type="url" id="lesson-video" class="form-input" placeholder="https://www.youtube.com/watch?v=..." style="padding:10px 14px;">
              </div>

              <div class="form-group">
                <label style="font-weight:700; margin-bottom:6px; display:block;">صورة أو ملخص الدرس المرفق (Lesson Photo / Document Summary)</label>
                <input type="text" id="lesson-photo-url" class="form-input" placeholder="رابط صورة أو ملخص الدرس (https://...)" style="padding:8px 12px; margin-bottom:6px; font-size:0.88rem;">
                <input type="file" id="lesson-photo-file" class="form-input" accept="image/*" style="padding:8px 12px; font-size:0.85rem;">
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="form-group">
                  <label style="font-weight:700; margin-bottom:6px; display:block;">مدة الدرس (بالدقائق)</label>
                  <input type="number" id="lesson-duration" class="form-input" value="20" style="padding:10px 14px;">
                </div>
                <div class="form-group">
                  <label style="font-weight:700; margin-bottom:6px; display:block;">ترتيب الدرس داخل الوحدة</label>
                  <input type="number" id="lesson-order" class="form-input" value="1" style="padding:10px 14px;">
                </div>
              </div>
            </div>
            <div class="modal-footer" style="padding:14px 20px;">
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

  bindEvents() {
    // Navigation Tabs
    this.container.querySelectorAll(".manage-nav-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.activeTab = btn.getAttribute("data-tab");
        this.render();
      });
    });

    // --- CURRICULUM EVENTS ---
    if (this.activeTab === "curriculum") {
      const lessonModal = document.getElementById("lesson-modal");
      const unitModal = document.getElementById("unit-modal");
      const chapterSelect = document.getElementById("lesson-chapter-select");
      const customChapterInput = document.getElementById("lesson-chapter-custom");

      // Unit Modal Open & Close
      this.container.querySelectorAll(".open-add-unit-modal-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          document.getElementById("unit-form")?.reset();
          if (unitModal) unitModal.style.display = "flex";
        });
      });

      document.getElementById("close-unit-modal")?.addEventListener("click", () => { if (unitModal) unitModal.style.display = "none"; });
      document.getElementById("cancel-unit-modal")?.addEventListener("click", () => { if (unitModal) unitModal.style.display = "none"; });

      // Unit Form Submit
      document.getElementById("unit-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const unitName = document.getElementById("unit-name-input").value.trim();
        if (!unitName) return;

        if (!this.customUnits.includes(unitName)) {
          this.customUnits.push(unitName);
        }

        if (unitModal) unitModal.style.display = "none";
        showToast(`تم إنشاء "${unitName}" بنجاح! يمكنك الآن إضافة أول درس بها. ✅`, "success");

        // Re-render and open add-lesson modal for this new unit!
        this.render().then(() => {
          const newLessonModal = document.getElementById("lesson-modal");
          const newSelect = document.getElementById("lesson-chapter-select");
          if (newSelect) {
            newSelect.value = unitName;
          }
          if (newLessonModal) newLessonModal.style.display = "flex";
        });
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

      // Add Lesson Modal Open (General)
      this.container.querySelectorAll(".open-add-lesson-modal-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          document.getElementById("lesson-modal-title").textContent = "إضافة درس جديد";
          document.getElementById("lesson-id").value = "";
          document.getElementById("lesson-form").reset();
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
            document.getElementById("lesson-photo-url").value = lesson.photo || "";
            document.getElementById("lesson-duration").value = lesson.duration || 15;
            document.getElementById("lesson-order").value = lesson.order || 1;
            if (lessonModal) lessonModal.style.display = "flex";
          }
        });
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
        const id = document.getElementById("lesson-id").value;
        
        let selectedChapter = chapterSelect?.value;
        if (selectedChapter === "__NEW__") {
          selectedChapter = customChapterInput?.value.trim() || "الوحدة العامة";
        }

        let photoUrl = document.getElementById("lesson-photo-url")?.value.trim() || "";
        const photoFileInput = document.getElementById("lesson-photo-file");

        if (photoFileInput && photoFileInput.files.length > 0) {
          const formData = new FormData();
          formData.append("file", photoFileInput.files[0]);
          try {
            const token = state.token || localStorage.getItem("token");
            const uploadRes = await fetch("/api/upload", {
              method: "POST",
              headers: { "Authorization": "Bearer " + token },
              body: formData
            });
            if (uploadRes.ok) {
              const data = await uploadRes.json();
              photoUrl = data.url;
            }
          } catch (err) {
            console.error("Photo upload failed", err);
          }
        }

        const payload = {
          chapter: selectedChapter,
          title: document.getElementById("lesson-title").value.trim(),
          videoUrl: document.getElementById("lesson-video").value.trim(),
          photo: photoUrl,
          duration: parseInt(document.getElementById("lesson-duration").value) || 15,
          order: parseInt(document.getElementById("lesson-order").value) || 1
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
        } catch (err) { console.error(err); }
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

    // --- SETTINGS EVENTS ---
    if (this.activeTab === "settings") {
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
        };

        let image = document.getElementById("manage-image-url").value;
        const fileInput = document.getElementById("manage-image-file");

        if (fileInput && fileInput.files.length > 0) {
          const formData = new FormData();
          formData.append("file", fileInput.files[0]);
          try {
            const token = state.token || localStorage.getItem("token");
            const uploadRes = await fetch("/api/upload", {
              method: "POST",
              headers: { "Authorization": "Bearer " + token },
              body: formData
            });
            if (uploadRes.ok) {
              const data = await uploadRes.json();
              image = data.url;
            }
          } catch (err) {
            console.error("Upload failed", err);
          }
        }

        payload.image = image;

        try {
          await apiFetch(`/courses/${this.courseId}`, { method: "PUT", body: JSON.stringify(payload) });
          showToast("تم حفظ إعدادات الدورة بنجاح! ✅", "success");
          await this.render();
        } catch (err) {
          console.error(err);
          btn.disabled = false;
          btn.innerHTML = `<i data-lucide="save"></i> حفظ التغييرات`;
          if (window.lucide) window.lucide.createIcons();
        }
      });
    }
  }

  onDestroy() {}
}
