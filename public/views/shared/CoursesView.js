import { apiFetch, state, showToast, t, renderCourseCard } from "../../app.js";

export default class CoursesView {
  constructor(container) {
    this.container = container;
    this.courses = [];
    this.enrollments = [];
    this.allGradesData = [];
    this.explorerStage = "SECONDARY";
    this.explorerGradeId = null;
    this.explorerSubjectId = null;
    this.searchQuery = "";
    this.studentAutoGradeSet = false; // flag: has grade been auto-set from education?
    this.teacherStatusFilter = "all";
  }

  // Map user.education string → { stage, gradeNameKeyword }
  _mapEducationToStage(education) {
    if (!education) return null;
    const e = education.trim().toLowerCase();
    if (e.includes("entlq 1") || e.includes("1ث") || e.includes("grade 10")) return { stage: "SECONDARY", keyword: "1" };
    if (e.includes("entlq 2") || e.includes("2ث") || e.includes("grade 11")) return { stage: "SECONDARY", keyword: "2" };
    if (e.includes("entlq 3") || e.includes("3ث") || e.includes("grade 12") || e.includes("bac")) return { stage: "SECONDARY", keyword: "3" };
    if (e.includes("grade 7") || e.includes("1ع") || e.includes("prep 1")) return { stage: "PREPARATORY", keyword: "1" };
    if (e.includes("grade 8") || e.includes("2ع") || e.includes("prep 2")) return { stage: "PREPARATORY", keyword: "2" };
    if (e.includes("grade 9") || e.includes("3ع") || e.includes("prep 3") || e.includes("bem")) return { stage: "PREPARATORY", keyword: "3" };
    if (e.includes("grade 1")) return { stage: "PRIMARY", keyword: "1" };
    if (e.includes("grade 2")) return { stage: "PRIMARY", keyword: "2" };
    if (e.includes("grade 3")) return { stage: "PRIMARY", keyword: "3" };
    if (e.includes("grade 4")) return { stage: "PRIMARY", keyword: "4" };
    if (e.includes("grade 5")) return { stage: "PRIMARY", keyword: "5" };
    if (e.includes("grade 6")) return { stage: "PRIMARY", keyword: "6" };
    return null;
  }

  async render() {
    try {
      this.container.innerHTML = `
        <div style="max-width:1320px; margin:0 auto; padding:40px 24px 80px;">
          
          <!-- Header Bar -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:28px; flex-wrap:wrap; gap:16px;">
            <div>
              <h1 class="dashboard-section-title" style="font-size:2rem; font-weight:900; margin:0 0 6px 0; display:flex; align-items:center; gap:12px; color:var(--text-main);">
                <i data-lucide="book-open" style="color:var(--primary); width:32px; height:32px;"></i>
                ${state.user && state.user.role === "teacher" ? "المقررات الدراسية الخاصة بك 👨‍🏫" : (t("nav.courses") || "المقررات والمناهج الدراسية")}
              </h1>
              <p style="font-size:0.92rem; color:var(--text-muted); margin:0;">
                ${state.user && state.user.role === "teacher" ? "إدارة واستعراض المقررات والمجموعات التعليمية التي قمت بإضافتها على المنصة" : "حدد المرحلة والصف الدراسي لاستعراض المواد، المجموعات، وكورسات الشرح المباشرة 🇪🇬"}
              </p>
            </div>

            ${state.user && (state.user.role === "teacher" || state.user.role === "admin") ? `
              <button class="btn-primary" id="open-course-modal-btn" style="padding:12px 24px; border-radius:30px; font-weight:800; font-size:0.92rem; display:inline-flex; align-items:center; gap:8px;">
                <i data-lucide="plus-circle" style="width:18px;height:18px;"></i> ${t("teacher.createCourse") || "إضافة مقرر جديد"}
              </button>
            ` : ''}
          </div>

          <div id="courses-content-area">
            <div style="text-align:center; padding:50px;">
              <div class="spinner" style="width:40px;height:40px;border-width:3px;margin:0 auto 16px;"></div>
              <p style="font-weight:700; color:var(--text-muted);">جارٍ تحميل المقررات والمناهج الدراسية...</p>
            </div>
          </div>

        </div>

        <!-- Course Creation Modal (Teacher / Admin Only) -->
        <div class="modal-overlay" id="course-modal" style="display:none; backdrop-filter:blur(8px); background:rgba(0,0,0,0.6); z-index:10000;">
          <div class="modal-content" style="max-width:650px; width:92%; border-radius:24px; overflow:hidden; border:1px solid var(--border-color); padding:0; box-shadow:0 25px 50px -12px rgba(0,0,0,0.35); background:var(--bg-card);">
            
            <!-- Modal Header -->
            <div class="modal-header" style="padding:22px 28px; background:linear-gradient(135deg, rgba(0,86,210,0.08), rgba(168,85,247,0.08)); border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
              <div style="display:flex; align-items:center; gap:14px;">
                <div style="width:46px; height:46px; border-radius:14px; background:var(--primary-glow); color:var(--primary); display:flex; align-items:center; justify-content:center;">
                  <i data-lucide="book-plus" style="width:24px; height:24px;"></i>
                </div>
                <div>
                  <h3 class="modal-title" style="font-size:1.2rem; font-weight:800; margin:0 0 2px 0; color:var(--text-main);">${t("teacher.createCourse")}</h3>
                  <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">أدخل تفاصيل الدورة، القسم المعني، والسنة الدراسية للتلميذ</p>
                </div>
              </div>
              <span class="modal-close-btn" id="close-course-modal" style="font-size:1.4rem; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
            </div>

            <!-- Form -->
            <form id="create-course-form">
              <div class="modal-body" style="padding:24px 28px; display:flex; flex-direction:column; gap:18px; max-height:75vh; overflow-y:auto;">
                
                <!-- Course Title -->
                <div class="form-group" style="margin:0;">
                  <label for="course-title" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="heading" style="width:14px; height:14px; color:var(--primary);"></i>
                    ${t("teacher.courseTitle")}
                  </label>
                  <input type="text" id="course-title" class="form-input" placeholder="مثال: مادة الفيزياء - وحدة الكهرباء للثانوية" style="border-radius:14px; padding:12px 16px; font-size:0.9rem;" required>
                </div>

                <!-- EGYPTIAN CURRICULUM SELECTOR (STAGE -> GRADE -> SUBJECT) -->
                <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:20px; padding:20px; display:flex; flex-direction:column; gap:16px;">
                  
                  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <label style="font-weight:900; font-size:0.92rem; color:var(--text-main); margin:0; display:flex; align-items:center; gap:8px;">
                      <i data-lucide="graduation-cap" style="width:18px; height:18px; color:#e51d74;"></i>
                      <span>تحديد المرحلة والصف والمادة الدراسية 🇪🇬 <span style="color:#ef4444;">*</span></span>
                    </label>
                    <span style="font-size:0.75rem; font-weight:800; color:#e51d74; background:rgba(229,29,116,0.1); padding:3px 12px; border-radius:12px; border:1px solid rgba(229,29,116,0.2);">
                      مناهج جمهورية مصر العربية
                    </span>
                  </div>

                  <!-- 1. Stage Selector Segmented Buttons -->
                  <div>
                    <label style="display:block; font-size:0.82rem; font-weight:800; color:var(--text-muted); margin-bottom:6px;">
                      1. اختر المرحلة التعليمية:
                    </label>
                    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;">
                      <button type="button" class="teacher-modal-stage-btn active" data-stage="PRIMARY" style="padding:10px 8px; border-radius:14px; font-weight:900; font-size:0.85rem; cursor:pointer; border:2px solid #10b981; background:#10b981; color:#ffffff; transition:all 0.2s ease; box-shadow:0 4px 12px rgba(16,185,129,0.25);">
                        🎒 الابتدائية
                      </button>
                      <button type="button" class="teacher-modal-stage-btn" data-stage="PREPARATORY" style="padding:10px 8px; border-radius:14px; font-weight:800; font-size:0.85rem; cursor:pointer; border:2px solid var(--border-color); background:var(--bg-card); color:var(--text-main); transition:all 0.2s ease;">
                        📚 الإعدادية
                      </button>
                      <button type="button" class="teacher-modal-stage-btn" data-stage="SECONDARY" style="padding:10px 8px; border-radius:14px; font-weight:800; font-size:0.85rem; cursor:pointer; border:2px solid var(--border-color); background:var(--bg-card); color:var(--text-main); transition:all 0.2s ease;">
                        🎓 الثانوية العامة
                      </button>
                    </div>
                  </div>

                  <!-- 2. Grade & Subject Dropdowns -->
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <!-- Grade Select -->
                    <div class="form-group" style="margin:0;">
                      <label for="modal-curriculum-grade-select" style="font-weight:800; font-size:0.82rem; margin-bottom:6px; display:block; color:var(--text-main);">
                        2. الصف الدراسي <span style="color:#ef4444;">*</span>
                      </label>
                      <select id="modal-curriculum-grade-select" class="form-select" style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;" required>
                        <option value="">-- جاري التحميل... --</option>
                      </select>
                    </div>

                    <!-- Subject Select -->
                    <div class="form-group" style="margin:0;">
                      <label for="modal-curriculum-subject-select" style="font-weight:800; font-size:0.82rem; margin-bottom:6px; display:block; color:var(--text-main);">
                        3. المادة الدراسية <span style="color:#ef4444;">*</span>
                      </label>
                      <select id="modal-curriculum-subject-select" class="form-select" style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;" required>
                        <option value="">-- اختر الصف أولاً --</option>
                      </select>
                    </div>
                  </div>

                  <!-- Custom Subject Wrapper (if needed) -->
                  <div id="modal-custom-subject-wrapper" style="display:none; margin-top:-4px;">
                    <label style="font-size:0.8rem; font-weight:800; color:var(--text-muted); margin-bottom:4px; display:block;">
                      اسم المادة أو التخصص المخصص:
                    </label>
                    <input type="text" id="modal-custom-subject-input" class="form-input" placeholder="اكتب اسم المادة يدوياً..." style="border-radius:12px; padding:9px 14px; font-size:0.88rem; width:100%;">
                  </div>

                  <!-- Hidden values for submission -->
                  <input type="hidden" id="course-category-select" value="">
                  <input type="hidden" id="course-degree" value="">
                  <input type="hidden" id="modal-selected-grade-id" value="">
                  <input type="hidden" id="modal-selected-subject-id" value="">
                </div>

                <!-- Course Description -->
                <div class="form-group" style="margin:0;">
                  <label for="course-desc" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="file-text" style="width:14px; height:14px; color:var(--text-muted);"></i>
                    ${t("teacher.courseDesc")}
                  </label>
                  <textarea id="course-desc" class="form-input" style="height:90px; resize:none; border-radius:14px; padding:12px 16px; font-size:0.88rem; line-height:1.5;" placeholder="${t("teacher.courseDescPlaceholder")}" required></textarea>
                </div>

                <!-- Course Image Upload -->
                <div class="form-group" style="margin:0;">
                  <label style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; justify-content:space-between;">
                    <span style="display:flex; align-items:center; gap:6px;">
                      <i data-lucide="image" style="width:14px; height:14px; color:#f59e0b;"></i>
                      ${t("teacher.courseImage")}
                    </span>
                    <button type="button" id="toggle-url-input-btn" style="background:none; border:none; color:var(--primary); font-weight:700; font-size:0.75rem; cursor:pointer;">
                      أو أدخل رابط صورة مباشرة 🔗
                    </button>
                  </label>
                  
                  <div id="course-dropzone" style="border:2px dashed var(--border-color); border-radius:16px; padding:18px; text-align:center; background:var(--bg-app); cursor:pointer; transition:all 0.2s ease;">
                    <input type="file" id="course-image-file" accept="image/*" style="display:none;">
                    
                    <div id="image-upload-idle">
                      <button type="button" class="btn-secondary" id="btn-trigger-upload" style="padding:8px 20px; border-radius:30px; font-size:0.85rem; margin:0 auto; display:inline-flex; align-items:center; gap:6px;">
                        <i data-lucide="upload-cloud" style="width:16px; height:16px;"></i> اختيار صورة غلاف الدورة
                      </button>
                      <p style="font-size:0.75rem; color:var(--text-muted); margin:8px 0 0 0;">الصيغ المقبولة: JPG, PNG, WEBP (الحد الأقصى 5 ميجابايت)</p>
                    </div>

                    <div id="image-upload-loading" style="display:none; padding:10px; color:var(--primary); font-weight:700; font-size:0.88rem;">
                      <i data-lucide="loader" class="spinner" style="width:20px; height:20px; display:inline-block; vertical-align:middle; margin-inline-end:6px;"></i> جاري رفع الصورة...
                    </div>

                    <div id="image-preview-wrapper" style="display:none; text-align:center;">
                      <div style="position:relative; display:inline-block;">
                        <img id="course-preview-img" src="" style="max-height:130px; border-radius:12px; object-fit:cover; border:2px solid var(--primary); box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                        <button type="button" id="remove-course-image-btn" title="حذف الصورة" style="position:absolute; top:-8px; right:-8px; background:var(--error,#ef4444); color:#fff; border:none; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-weight:bold; box-shadow:0 2px 6px rgba(0,0,0,0.3);">✕</button>
                      </div>
                      <p style="font-size:0.78rem; color:var(--success,#10b981); font-weight:800; margin:6px 0 0 0;">✓ تم اختيار ورفع غلاف الدورة بنجاح</p>
                    </div>
                  </div>

                  <div id="url-input-wrapper" style="display:none; margin-top:10px;">
                    <input type="url" id="course-image-url-direct" class="form-input" placeholder="https://example.com/course-cover.jpg" style="border-radius:12px; padding:10px 14px; font-size:0.85rem;">
                  </div>

                  <input type="hidden" id="course-image-url">
                </div>

                <!-- Live Meeting Link -->
                <div class="form-group" style="margin:0;">
                  <label for="course-meeting-link" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="video" style="width:14px; height:14px; color:#06b6d4;"></i>
                    رابط البث المباشر (Zoom, Meet, Webex)
                  </label>
                  <input type="url" id="course-meeting-link" class="form-input" placeholder="https://zoom.us/j/123456789" style="border-radius:14px; padding:11px 16px; font-size:0.88rem;">
                </div>

              </div>

              <!-- Modal Footer -->
              <div class="modal-footer" style="padding:16px 28px; background:var(--bg-app); border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; gap:12px;">
                <button type="button" class="btn-secondary" id="cancel-course-modal" style="padding:10px 20px; border-radius:30px; font-size:0.88rem;">${t("common.cancel")}</button>
                <button type="submit" class="btn-primary" style="padding:10px 24px; border-radius:30px; font-size:0.88rem; font-weight:800; background:linear-gradient(135deg,#0056D2,#a855f7); border:none;">
                  <i data-lucide="check-circle-2" style="width:16px; height:16px; vertical-align:middle;"></i> ${t("teacher.publishCourse")}
                </button>
              </div>

            </form>
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
      await this.loadContent();
    } catch (err) {
      console.error("Courses loading error:", err);
    }
  }

  async loadContent() {
    try {
      const [allCourses, gradesData] = await Promise.all([
        apiFetch("/courses").catch(() => []),
        apiFetch("/curriculum/grades").catch(() => [])
      ]);

      this.courses = (allCourses || []).filter(c => {
        if (state.user && state.user.role === "teacher") {
          return c.teacher?.id === state.user.id || c.teacherId === state.user.id;
        }
        return true;
      });
      this.allGradesData = Array.isArray(gradesData) ? gradesData : [];

      if (state.user && state.user.role === "student") {
        this.enrollments = await apiFetch("/student/enrollments").catch(() => []);

        // 1. Check saved grade preference from localStorage
        if (!this.studentAutoGradeSet) {
          const savedPref = localStorage.getItem(`bak_student_grade_${state.user.id}`);
          if (savedPref) {
            try {
              const { gradeId, stage } = JSON.parse(savedPref);
              if (stage && gradeId && this.allGradesData.some(g => g.id === gradeId)) {
                this.explorerStage = stage;
                this.explorerGradeId = gradeId;
                this.studentAutoGradeSet = true;
              }
            } catch (e) { /* ignore bad JSON */ }
          }
        }

        // 2. Fall back: Auto-detect from signup education field
        if (!this.studentAutoGradeSet && state.user.education) {
          const mapped = this._mapEducationToStage(state.user.education);
          if (mapped) {
            this.explorerStage = mapped.stage;
            const stageGrades = this.allGradesData.filter(g => g.stage === mapped.stage);
            const matchedGrade = stageGrades.find(g => {
              const nameLower = (g.nameEn || g.name || "").toLowerCase();
              return nameLower.includes(mapped.keyword);
            }) || stageGrades[0];
            if (matchedGrade) this.explorerGradeId = matchedGrade.id;
            this.studentAutoGradeSet = true;
          }
        }
      }

      this.renderCurriculumExplorer();
    } catch (err) {
      console.error("Courses content loading error:", err);
    }
  }

  renderCurriculumExplorer() {
    const contentArea = this.container.querySelector("#courses-content-area");
    if (!contentArea) return;

    // ── TEACHER PATH: Clean compact dashboard with small filter bar ──
    if (state.user && state.user.role === "teacher") {
      this.renderTeacherCoursesDashboard(contentArea);
      return;
    }

    const isStudent = state.user && state.user.role === "student";
    const currentGrade = this.allGradesData.find(g => g.id === this.explorerGradeId);
    const stageLabels = { PRIMARY: "الابتدائية 🎒", PREPARATORY: "الإعدادية 📚", SECONDARY: "الثانوية العامة 🎓" };

    if (isStudent) {
      // ── STUDENT PATH: Show subjects directly, no stage/grade selector UI ──
      contentArea.innerHTML = `

        <!-- Grade Header with change button -->
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:28px;">
          <div>
            <h2 style="font-size:1.6rem; font-weight:900; margin:0 0 4px 0; color:var(--text-main); display:flex; align-items:center; gap:10px;">
              <i data-lucide="graduation-cap" style="width:28px; height:28px; color:#e51d74;"></i>
              مواد صفك الدراسي
            </h2>
            ${currentGrade ? `
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:6px;">
                <span style="font-size:0.95rem; font-weight:800; color:var(--text-main);">${currentGrade.name}</span>
                <span style="font-size:0.78rem; font-weight:700; color:var(--text-muted); background:var(--bg-app); padding:2px 10px; border-radius:10px; border:1px solid var(--border-color);">
                  ${stageLabels[currentGrade.stage] || currentGrade.stage}
                </span>
                <span style="font-size:0.78rem; font-weight:800; background:rgba(229,29,116,0.1); color:#e51d74; padding:2px 10px; border-radius:10px; border:1px solid rgba(229,29,116,0.2);">
                  مناهج مصر 🇪🇬
                </span>
              </div>
            ` : `<p style="color:var(--text-muted); font-size:0.9rem; margin:4px 0 0 0;">اختر صفك الدراسي لعرض المواد</p>`}
          </div>
          <button id="change-grade-btn" style="
            display:inline-flex; align-items:center; gap:8px;
            padding:11px 22px; border-radius:14px; font-weight:800; font-size:0.9rem; cursor:pointer;
            border:1.5px solid var(--primary); color:var(--primary); background:var(--primary-glow);
            transition:all 0.2s ease; white-space:nowrap;
          ">
            <i data-lucide="pencil" style="width:15px; height:15px;"></i>
            تغيير الصف
          </button>
        </div>

        <!-- Subjects Grid -->
        <div id="courses-explorer-subjects-container" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:18px; direction:rtl; margin-bottom:40px;">
          <p style="color:var(--text-muted); font-size:0.9rem; grid-column:1/-1; text-align:center; padding:30px 0;">
            جارٍ تحميل المواد الدراسية...
          </p>
        </div>

        <!-- Courses catalog for current grade -->
        <div id="courses-catalog-section" style="margin-top:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:14px;">
            <div>
              <h3 class="dashboard-section-title" style="margin:0 0 4px 0; font-size:1.2rem;">
                <i data-lucide="compass"></i> الدورات والشروحات لهذا الصف
              </h3>
              <p style="font-size:0.82rem; color:var(--text-muted); margin:0;">استعرض كورسات الشرح وحصص المراجعة المسجلة والمباشرة</p>
            </div>
            <div style="position:relative; width:100%; max-width:300px;">
              <i data-lucide="search" style="position:absolute; right:14px; top:50%; transform:translateY(-50%); width:16px; height:16px; color:var(--text-muted); pointer-events:none;"></i>
              <input type="text" id="courses-page-search-input" placeholder="ابحث عن درس أو أستاذ..." value="${this.searchQuery || ''}"
                style="width:100%; padding:10px 40px 10px 14px; border-radius:30px; border:1.5px solid var(--border-color); background:var(--bg-card); color:var(--text-main); font-size:0.88rem; font-weight:600; outline:none; box-sizing:border-box;">
            </div>
          </div>
          <div class="courses-grid" id="courses-page-grid"></div>
          <div id="courses-page-empty-state" style="display:none;">
            <div class="glass-card" style="text-align:center; padding:40px 24px; color:var(--text-muted); border-radius:20px;">
              <i data-lucide="search-x" style="width:44px;height:44px;opacity:0.3;margin-bottom:12px;"></i>
              <h4 style="font-weight:800; font-size:1rem; color:var(--text-main); margin:0 0 6px 0;">لا توجد دورات لهذا الصف حالياً</h4>
              <p style="font-size:0.85rem; margin:0;">تصفح المواد أعلاه أو غيّر الصف لاستعراض المزيد.</p>
            </div>
          </div>
        </div>

        <!-- Change Grade Modal -->
        <div id="change-grade-modal" style="display:none; position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.55); backdrop-filter:blur(6px); align-items:center; justify-content:center; padding:20px;">
          <div style="background:var(--bg-card); border-radius:28px; padding:32px; max-width:520px; width:100%; border:1px solid var(--border-color); box-shadow:0 30px 60px rgba(0,0,0,0.3); position:relative; max-height:90vh; overflow-y:auto;">
            <button id="close-change-grade-modal" style="position:absolute; top:16px; left:16px; width:32px; height:32px; border-radius:50%; border:1px solid var(--border-color); background:var(--bg-app); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1.1rem; color:var(--text-muted);">&times;</button>
            <h3 style="font-size:1.2rem; font-weight:900; color:var(--text-main); margin:0 0 6px 0; text-align:center;">تغيير الصف الدراسي</h3>
            <p style="font-size:0.85rem; color:var(--text-muted); text-align:center; margin:0 0 24px 0;">اختر مرحلتك وصفك لعرض المواد الخاصة بك</p>

            <!-- Stage buttons -->
            <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:20px;">
              ${["PRIMARY", "PREPARATORY", "SECONDARY"].map(stage => {
        const colors = { PRIMARY: "#10b981", PREPARATORY: "#3b82f6", SECONDARY: "#e51d74" };
        const labels = { PRIMARY: "🎒 ابتدائي", PREPARATORY: "📚 إعدادي", SECONDARY: "🎓 ثانوي" };
        const isSel = this.explorerStage === stage;
        return `<button class="modal-stage-btn" data-stage="${stage}" style="padding:10px 6px; border-radius:14px; font-weight:800; font-size:0.85rem; cursor:pointer; border:2px solid ${isSel ? colors[stage] : 'var(--border-color)'}; background:${isSel ? colors[stage] : 'var(--bg-app)'}; color:${isSel ? '#fff' : 'var(--text-main)'}; transition:all 0.2s;">${labels[stage]}</button>`;
      }).join('')}
            </div>

            <!-- Grade pills -->
            <div style="margin-bottom:8px; font-size:0.82rem; font-weight:800; color:var(--text-muted);">اختر الصف الدراسي:</div>
            <div id="modal-grades-list" style="display:flex; gap:8px; flex-wrap:wrap;">
              ${this.allGradesData.filter(g => g.stage === this.explorerStage).map(g => {
        const isSel = g.id === this.explorerGradeId;
        return `<button class="modal-grade-btn" data-grade-id="${g.id}" style="padding:8px 16px; border-radius:12px; font-weight:800; font-size:0.85rem; cursor:pointer; border:1.5px solid ${isSel ? '#e51d74' : 'var(--border-color)'}; background:${isSel ? '#e51d74' : 'var(--bg-app)'}; color:${isSel ? '#fff' : 'var(--text-main)'}; transition:all 0.2s;">${g.name}</button>`;
      }).join('')}
            </div>

            <!-- Save button -->
            <div style="margin-top:24px; padding-top:16px; border-top:1px solid var(--border-color); display:flex; gap:10px; justify-content:flex-end;">
              <button id="close-change-grade-modal-cancel" style="padding:10px 20px; border-radius:12px; font-weight:700; font-size:0.88rem; cursor:pointer; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-muted);">إلغاء</button>
              <button id="save-grade-btn" style="padding:10px 24px; border-radius:12px; font-weight:900; font-size:0.88rem; cursor:pointer; border:none; background:linear-gradient(135deg,#e51d74,#9333ea); color:#fff; display:flex; align-items:center; gap:8px; box-shadow:0 6px 16px rgba(229,29,116,0.3); transition:all 0.2s;">
                <i data-lucide="save" style="width:16px; height:16px;"></i>
                حفظ الاختيار
              </button>
            </div>
          </div>
        </div>

      `;

      this.bindStudentExplorerEvents();
      this.renderExplorerSubjects();
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // ── NON-STUDENT PATH: Full stage/grade/subject selector ──
    contentArea.innerHTML = `
      <!-- 1. STAGE SELECTOR CARDS -->
      <div id="stage-grade-selector-panel" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:28px; padding:28px 32px; margin-bottom:36px; box-shadow:0 10px 35px rgba(0,0,0,0.05); position:relative; overflow:hidden;">
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:10px;">
          <div>
            <h3 style="font-weight:900; font-size:1.25rem; color:var(--text-main); margin:0 0 4px 0; display:flex; align-items:center; gap:8px;">
              <span>1. اختر المرحلة التعليمية</span>
              <span style="font-size:0.75rem; font-weight:800; background:rgba(229,29,116,0.1); color:#e51d74; padding:2px 10px; border-radius:10px;">
                مناهج مصر 🇪🇬
              </span>
            </h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">اختر المرحلة للانتقال للصفوف والمواد المعتمدة</p>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:16px; margin-bottom:28px;">
          
          <!-- Primary Stage Card -->
          <div class="courses-explorer-stage-card ${this.explorerStage === "PRIMARY" ? "active" : ""}" data-stage="PRIMARY" style="
            background:var(--bg-app);
            border:2px solid ${this.explorerStage === "PRIMARY" ? "#10b981" : "var(--border-color)"};
            box-shadow:${this.explorerStage === "PRIMARY" ? "0 8px 24px rgba(16,185,129,0.18)" : "none"};
            border-radius:22px; padding:18px 20px; cursor:pointer; display:flex; align-items:center; gap:16px; transition:all 0.25s ease;">
            <div style="width:52px; height:52px; border-radius:16px; background:linear-gradient(135deg, #10b981 0%, #047857 100%); color:#ffffff; display:flex; align-items:center; justify-content:center; font-size:1.8rem; flex-shrink:0; box-shadow:0 6px 16px rgba(16,185,129,0.3);">🎒</div>
            <div>
              <h4 style="font-size:1.1rem; font-weight:900; color:var(--text-main); margin:0 0 3px 0;">المرحلة الابتدائية</h4>
              <span style="font-size:0.78rem; font-weight:700; color:var(--text-muted);">الصفوف (1 - 6 ابتدائي)</span>
            </div>
          </div>

          <!-- Preparatory Stage Card -->
          <div class="courses-explorer-stage-card ${this.explorerStage === "PREPARATORY" ? "active" : ""}" data-stage="PREPARATORY" style="
            background:var(--bg-app);
            border:2px solid ${this.explorerStage === "PREPARATORY" ? "#3b82f6" : "var(--border-color)"};
            box-shadow:${this.explorerStage === "PREPARATORY" ? "0 8px 24px rgba(59,130,246,0.18)" : "none"};
            border-radius:22px; padding:18px 20px; cursor:pointer; display:flex; align-items:center; gap:16px; transition:all 0.25s ease;">
            <div style="width:52px; height:52px; border-radius:16px; background:linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color:#ffffff; display:flex; align-items:center; justify-content:center; font-size:1.8rem; flex-shrink:0; box-shadow:0 6px 16px rgba(59,130,246,0.3);">📚</div>
            <div>
              <h4 style="font-size:1.1rem; font-weight:900; color:var(--text-main); margin:0 0 3px 0;">المرحلة الإعدادية</h4>
              <span style="font-size:0.78rem; font-weight:700; color:var(--text-muted);">الصفوف (1ع - 3ع والشهادة)</span>
            </div>
          </div>

          <!-- Secondary Stage Card -->
          <div class="courses-explorer-stage-card ${this.explorerStage === "SECONDARY" ? "active" : ""}" data-stage="SECONDARY" style="
            background:var(--bg-app);
            border:2px solid ${this.explorerStage === "SECONDARY" ? "#e51d74" : "var(--border-color)"};
            box-shadow:${this.explorerStage === "SECONDARY" ? "0 8px 24px rgba(229,29,116,0.18)" : "none"};
            border-radius:22px; padding:18px 20px; cursor:pointer; display:flex; align-items:center; gap:16px; transition:all 0.25s ease;">
            <div style="width:52px; height:52px; border-radius:16px; background:linear-gradient(135deg, #e51d74 0%, #be123c 100%); color:#ffffff; display:flex; align-items:center; justify-content:center; font-size:1.8rem; flex-shrink:0; box-shadow:0 6px 16px rgba(229,29,116,0.3);">🎓</div>
            <div>
              <h4 style="font-size:1.1rem; font-weight:900; color:var(--text-main); margin:0 0 3px 0;">الثانوية العامة والأزهر</h4>
              <span style="font-size:0.78rem; font-weight:700; color:var(--text-muted);">علمي علوم، رياضة، أدبي</span>
            </div>
          </div>

        </div>

        <!-- 2. GRADES SELECTOR PILLS BAR -->
        <div style="background:rgba(0,0,0,0.02); border:1px solid var(--border-color); border-radius:20px; padding:14px 18px; margin-bottom:30px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
            <span style="font-size:0.88rem; font-weight:900; color:var(--text-main);">2. حدد الصف الدراسي:</span>
          </div>
          <div id="courses-explorer-grades-container" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
          </div>
        </div>

        <!-- 3. CREATIVE SUBJECTS GRID -->
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; flex-wrap:wrap; gap:10px;">
            <h3 style="font-weight:900; font-size:1.2rem; color:var(--text-main); margin:0; display:flex; align-items:center; gap:8px;">
              <span>3. المواد الدراسية المقررة</span>
              <span id="courses-selected-grade-label-badge" style="font-size:0.8rem; font-weight:800; background:rgba(0,86,210,0.1); color:var(--primary); padding:3px 12px; border-radius:12px; border:1px solid rgba(0,86,210,0.2);"></span>
            </h3>
            <span style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">اضغط على أي مادة لاستعراض المجموعات ➔</span>
          </div>

          <div id="courses-explorer-subjects-container" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:18px; direction:rtl;">
          </div>
        </div>

      </div>

      <!-- 4. SEARCH & FILTERED COURSES CATALOG -->
      <div id="courses-catalog-section" style="margin-top:40px;">
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:14px;">
          <div>
            <h3 class="dashboard-section-title" style="margin:0 0 4px 0; font-size:1.35rem;">
              <i data-lucide="compass"></i> الدورات والشروحات المتاحة لهذا الصف
            </h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">استعرض دورات الشرح وحصص المراجعة المسجلة والمباشرة</p>
          </div>

          <!-- Search Input -->
          <div style="position:relative; width:100%; max-width:320px;">
            <i data-lucide="search" style="position:absolute; right:14px; top:50%; transform:translateY(-50%); width:16px; height:16px; color:var(--text-muted); pointer-events:none;"></i>
            <input
              type="text"
              id="courses-page-search-input"
              placeholder="ابحث عن درس، مادة، أو أستاذ..."
              value="${this.searchQuery || ''}"
              style="width:100%; padding:10px 40px 10px 14px; border-radius:30px; border:1.5px solid var(--border-color); background:var(--bg-card); color:var(--text-main); font-size:0.88rem; font-weight:600; outline:none; box-sizing:border-box;"
            >
          </div>
        </div>

        <div class="courses-grid" id="courses-page-grid"></div>
        
        <div id="courses-page-empty-state" style="display:none;">
          <div class="glass-card" style="text-align:center; padding:48px 24px; color:var(--text-muted); border-radius:20px;">
            <i data-lucide="search-x" style="width:48px;height:48px;opacity:0.3;margin-bottom:12px;"></i>
            <h4 style="font-weight:800; font-size:1.1rem; color:var(--text-main); margin:0 0 6px 0;">لا توجد دورات مضافة لهذا الصف حالياً</h4>
            <p style="font-size:0.88rem; margin:0;">يمكنك تصفح المجموعات المباشرة من قائمة المواد أعلاه أو اختيار صف آخر.</p>
          </div>
        </div>

      </div>
    `;

    this.bindExplorerEvents();
    this.renderExplorerGrades();
    if (window.lucide) window.lucide.createIcons();
  }

  renderTeacherCoursesDashboard(contentArea) {
    const totalCount = this.courses.length;
      const publishedCount = this.courses.filter(c => (c.status || "PUBLISHED") === "PUBLISHED").length;

      contentArea.innerHTML = `
      <!-- Compact KPI Summary Bar -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:14px; margin-bottom:24px;">
        <div class="glass-card" style="padding:16px 18px; border-radius:18px; border:1px solid var(--border-color); display:flex; align-items:center; gap:12px;">
          <div style="width:42px; height:42px; border-radius:12px; background:rgba(0,86,210,0.1); color:var(--primary); display:flex; align-items:center; justify-content:center;">
            <i data-lucide="book-open" style="width:20px; height:20px;"></i>
          </div>
          <div>
            <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted);">إجمالي مقرراتك</div>
            <div style="font-size:1.3rem; font-weight:900; color:var(--text-main);">${totalCount}</div>
          </div>
        </div>

        <div class="glass-card" style="padding:16px 18px; border-radius:18px; border:1px solid var(--border-color); display:flex; align-items:center; gap:12px;">
          <div style="width:42px; height:42px; border-radius:12px; background:rgba(16,185,129,0.1); color:#10b981; display:flex; align-items:center; justify-content:center;">
            <i data-lucide="check-circle" style="width:20px; height:20px;"></i>
          </div>
          <div>
            <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted);">مقررات منشورة</div>
            <div style="font-size:1.3rem; font-weight:900; color:#10b981;">${publishedCount}</div>
          </div>
        </div>

        <div class="glass-card" style="padding:16px 18px; border-radius:18px; border:1px solid var(--border-color); display:flex; align-items:center; gap:12px;">
          <div style="width:42px; height:42px; border-radius:12px; background:rgba(245,158,11,0.1); color:#f59e0b; display:flex; align-items:center; justify-content:center;">
            <i data-lucide="users" style="width:20px; height:20px;"></i>
          </div>
          <div>
            <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted);">إدارة المجموعات</div>
            <a href="#teacher-groups" style="font-size:0.85rem; font-weight:800; color:#f59e0b; text-decoration:none; display:inline-flex; align-items:center; gap:4px; margin-top:2px;">
              فتح المجموعات ➔
            </a>
          </div>
        </div>
      </div>

      <!-- Small Compact Filter Toolbar -->
      <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:20px; padding:14px 18px; margin-bottom:26px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; box-shadow:0 4px 16px rgba(0,0,0,0.03);">
        
        <!-- Search Input -->
        <div style="position:relative; flex:1; min-width:220px; max-width:380px;">
          <i data-lucide="search" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); width:15px; height:15px; color:var(--text-muted); pointer-events:none;"></i>
          <input type="text" id="teacher-courses-search" placeholder="ابحث في مقرراتك بالاسم أو المادة..." value="${this.searchQuery || ''}"
            style="width:100%; padding:9px 34px 9px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.85rem; font-weight:600; outline:none; box-sizing:border-box;">
        </div>

        <!-- Filters Dropdown Group -->
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <select id="teacher-grade-filter-select" style="padding:9px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.82rem; font-weight:700; outline:none; cursor:pointer;">
            <option value="">🏫 جميع الصفوف الدراسية</option>
            ${this.allGradesData.map(g => `
              <option value="${g.id}" ${this.explorerGradeId === g.id ? 'selected' : ''}>${g.name}</option>
            `).join('')}
          </select>

          <select id="teacher-status-filter-select" style="padding:9px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.82rem; font-weight:700; outline:none; cursor:pointer;">
            <option value="all" ${this.teacherStatusFilter === "all" ? "selected" : ""}>🔘 جميع الحالات</option>
            <option value="PUBLISHED" ${this.teacherStatusFilter === "PUBLISHED" ? "selected" : ""}>✅ منشور فقط</option>
            <option value="DRAFT" ${this.teacherStatusFilter === "DRAFT" ? "selected" : ""}>📝 مسودة</option>
          </select>
        </div>

      </div>

      <!-- Courses Grid Area -->
      <div class="courses-grid" id="courses-page-grid"></div>
      <div id="courses-page-empty-state" style="display:none;"></div>
    `;

      this.bindTeacherFilterEvents();
      this.renderFilteredCoursesList();
      if (window.lucide) window.lucide.createIcons();
      this.bindEvents();
    }

    bindTeacherFilterEvents() {
      this.container.querySelector("#teacher-courses-search")?.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderFilteredCoursesList();
      });

      this.container.querySelector("#teacher-grade-filter-select")?.addEventListener("change", (e) => {
        this.explorerGradeId = e.target.value ? e.target.value : null;
        this.renderFilteredCoursesList();
      });

      this.container.querySelector("#teacher-status-filter-select")?.addEventListener("change", (e) => {
        this.teacherStatusFilter = e.target.value;
        this.renderFilteredCoursesList();
      });
    }

    bindStudentExplorerEvents() {
      const changeGradeBtn = this.container.querySelector("#change-grade-btn");
      const modal = this.container.querySelector("#change-grade-modal");

      // Track pending selection (before save)
      let pendingGradeId = this.explorerGradeId;
      let pendingStage = this.explorerStage;

      // Open modal
      if (changeGradeBtn && modal) {
        changeGradeBtn.addEventListener("click", () => {
          pendingGradeId = this.explorerGradeId;
          pendingStage = this.explorerStage;
          modal.style.display = "flex";
          if (window.lucide) window.lucide.createIcons();
        });
      }

      const closeModal = () => { if (modal) modal.style.display = "none"; };

      // Close modal (X button, backdrop, cancel)
      this.container.querySelector("#close-change-grade-modal")?.addEventListener("click", closeModal);
      this.container.querySelector("#close-change-grade-modal-cancel")?.addEventListener("click", closeModal);
      modal?.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

      // Stage buttons: update pending stage and refresh grade pills
      const colors = { PRIMARY: "#10b981", PREPARATORY: "#3b82f6", SECONDARY: "#e51d74" };
      this.container.querySelectorAll(".modal-stage-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          pendingStage = btn.getAttribute("data-stage");
          pendingGradeId = null;
          // Update stage button styles
          this.container.querySelectorAll(".modal-stage-btn").forEach(b => {
            const s = b.getAttribute("data-stage");
            const c = colors[s] || "#e51d74";
            const sel = s === pendingStage;
            b.style.border = `2px solid ${sel ? c : "var(--border-color)"}`;
            b.style.background = sel ? c : "var(--bg-app)";
            b.style.color = sel ? "#fff" : "var(--text-main)";
          });
          // Refresh grade pills
          const gradesList = this.container.querySelector("#modal-grades-list");
          if (gradesList) {
            const stageGrades = this.allGradesData.filter(g => g.stage === pendingStage);
            gradesList.innerHTML = stageGrades.map(g => `
            <button class="modal-grade-btn" data-grade-id="${g.id}" style="padding:8px 16px; border-radius:12px; font-weight:800; font-size:0.85rem; cursor:pointer; border:1.5px solid var(--border-color); background:var(--bg-app); color:var(--text-main); transition:all 0.2s;">${g.name}</button>
          `).join("");
            this._bindModalGradeHighlight((id) => { pendingGradeId = id; }, pendingStage);
          }
        });
      });

      // Initial grade highlight binding
      this._bindModalGradeHighlight((id) => { pendingGradeId = id; }, pendingStage);

      // Save button: persist and apply
      this.container.querySelector("#save-grade-btn")?.addEventListener("click", () => {
        if (!pendingGradeId) {
          // If no grade clicked, use first of the stage
          const first = this.allGradesData.find(g => g.stage === pendingStage);
          if (first) pendingGradeId = first.id;
        }
        if (pendingGradeId && pendingStage) {
          this.explorerStage = pendingStage;
          this.explorerGradeId = pendingGradeId;
          this.explorerSubjectId = null;
          // Save to localStorage
          if (state.user) {
            localStorage.setItem(`bak_student_grade_${state.user.id}`,
              JSON.stringify({ gradeId: pendingGradeId, stage: pendingStage }));
          }
          closeModal();
          this.renderCurriculumExplorer();
          if (window.lucide) window.lucide.createIcons();
        }
      });

      // Search input
      this.container.querySelector("#courses-page-search-input")?.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderFilteredCoursesList();
      });
    }

    // Highlight selected grade inside modal (without auto-closing)
    _bindModalGradeHighlight(onSelect, currentStage) {
      const stageColor = { PRIMARY: "#10b981", PREPARATORY: "#3b82f6", SECONDARY: "#e51d74" }[currentStage] || "#e51d74";
      this.container.querySelectorAll(".modal-grade-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          // Highlight this button
          this.container.querySelectorAll(".modal-grade-btn").forEach(b => {
            b.style.border = "1.5px solid var(--border-color)";
            b.style.background = "var(--bg-app)";
            b.style.color = "var(--text-main)";
          });
          btn.style.border = `1.5px solid ${stageColor}`;
          btn.style.background = stageColor;
          btn.style.color = "#fff";
          onSelect(btn.getAttribute("data-grade-id"));
        });
      });
    }

    // Legacy helper kept for non-student path (not used for students anymore)
    _bindModalGradeBtns(stageColor, modal) {
      this.container.querySelectorAll(".modal-grade-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          this.explorerGradeId = btn.getAttribute("data-grade-id");
          this.explorerSubjectId = null;
          if (modal) modal.style.display = "none";
          this.renderCurriculumExplorer();
          if (window.lucide) window.lucide.createIcons();
        });
      });
    }


    bindExplorerEvents() {
      // "تغيير الصف" button — show the stage/grade selector
      const changeGradeBtn = this.container.querySelector("#change-grade-btn");
      if (changeGradeBtn) {
        changeGradeBtn.addEventListener("click", () => {
          const panel = this.container.querySelector("#stage-grade-selector-panel");
          const banner = this.container.querySelector("#student-grade-banner");
          if (panel) { panel.style.display = ""; panel.scrollIntoView({ behavior: "smooth", block: "start" }); }
          if (banner) banner.style.display = "none";
        });
      }

      // Stage card clicks
      this.container.querySelectorAll(".courses-explorer-stage-card").forEach(card => {
        card.addEventListener("click", () => {
          this.container.querySelectorAll(".courses-explorer-stage-card").forEach(c => {
            c.classList.remove("active");
            c.style.borderColor = "var(--border-color)";
            c.style.boxShadow = "none";
          });

          card.classList.add("active");
          const stage = card.getAttribute("data-stage");
          this.explorerStage = stage;

          if (stage === "PRIMARY") {
            card.style.borderColor = "#10b981";
            card.style.boxShadow = "0 8px 24px rgba(16,185,129,0.18)";
          } else if (stage === "PREPARATORY") {
            card.style.borderColor = "#3b82f6";
            card.style.boxShadow = "0 8px 24px rgba(59,130,246,0.18)";
          } else {
            card.style.borderColor = "#e51d74";
            card.style.boxShadow = "0 8px 24px rgba(229,29,116,0.18)";
          }

          this.explorerGradeId = null;
          this.explorerSubjectId = null;
          this.renderExplorerGrades();
        });
      });

      // Search event
      const searchInput = this.container.querySelector("#courses-page-search-input");
      if (searchInput) {
        searchInput.addEventListener("input", (e) => {
          this.searchQuery = e.target.value.trim().toLowerCase();
          this.renderFilteredCoursesList();
        });
      }
    }

    renderExplorerGrades() {
      const gradesContainer = this.container.querySelector("#courses-explorer-grades-container");
      if (!gradesContainer) return;

      const stageGrades = this.allGradesData.filter(g => g.stage === this.explorerStage);
      if (stageGrades.length === 0) {
        gradesContainer.innerHTML = `<p style="color:var(--text-muted); font-size:0.9rem;">لا توجد صفوف دراسية مسجلة لهذه المرحلة حالياً.</p>`;
        return;
      }

      if (!this.explorerGradeId || !stageGrades.some(g => g.id === this.explorerGradeId)) {
        this.explorerGradeId = stageGrades[0].id;
      }

      const stageColors = {
        PRIMARY: { active: "#10b981", shadow: "rgba(16,185,129,0.3)" },
        PREPARATORY: { active: "#3b82f6", shadow: "rgba(59,130,246,0.3)" },
        SECONDARY: { active: "#e51d74", shadow: "rgba(229,29,116,0.3)" }
      };
      const currentColor = stageColors[this.explorerStage] || { active: "#4f46e5", shadow: "rgba(79,70,229,0.3)" };

      gradesContainer.innerHTML = stageGrades.map((grade, idx) => {
        const isSel = grade.id === this.explorerGradeId;
        return `
        <button type="button" class="courses-grade-chip-btn ${isSel ? "active" : ""}" data-grade-id="${grade.id}" style="
          padding:9px 20px;
          border-radius:14px;
          font-weight:800;
          font-size:0.92rem;
          cursor:pointer;
          transition:all 0.2s ease;
          display:inline-flex;
          align-items:center;
          gap:8px;
          border:1px solid ${isSel ? currentColor.active : "var(--border-color)"};
          background:${isSel ? currentColor.active : "var(--bg-card)"};
          color:${isSel ? "#ffffff" : "var(--text-main)"};
          box-shadow:${isSel ? `0 6px 16px ${currentColor.shadow}` : "0 2px 6px rgba(0,0,0,0.02)"};
        ">
          <span style="background:${isSel ? "rgba(255,255,255,0.25)" : "var(--bg-app)"}; padding:2px 8px; border-radius:8px; font-size:0.75rem; font-weight:900;">
            ${idx + 1}
          </span>
          <span>${grade.name}</span>
        </button>
      `;
      }).join("");

      gradesContainer.querySelectorAll(".courses-grade-chip-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          this.explorerGradeId = btn.getAttribute("data-grade-id");
          this.explorerSubjectId = null;
          this.renderExplorerGrades();
        });
      });

      this.renderExplorerSubjects();
    }

    renderExplorerSubjects() {
      const subjectsContainer = this.container.querySelector("#courses-explorer-subjects-container");
      const gradeBadge = this.container.querySelector("#courses-selected-grade-label-badge");
      if (!subjectsContainer) return;

      const currentGrade = this.allGradesData.find(g => g.id === this.explorerGradeId);
      if (!currentGrade || !currentGrade.subjects || currentGrade.subjects.length === 0) {
        subjectsContainer.innerHTML = `<p style="color:var(--text-muted); font-size:0.9rem; padding:30px 0; grid-column:1/-1; text-align:center;">لا توجد مواد دراسية مسجلة لهذا الصف حالياً.</p>`;
        if (gradeBadge) gradeBadge.textContent = "";
        this.renderFilteredCoursesList();
        return;
      }

      if (gradeBadge) {
        gradeBadge.textContent = currentGrade.name;
      }

      // Creative Subject Theme Dictionary
      const getSubjectTheme = (name) => {
        const n = name.toLowerCase();
        if (n.includes("عرب") || n.includes("arabic")) {
          return { gradient: "linear-gradient(135deg, #0d9488 0%, #042f2e 100%)", color: "#0d9488", icon: "📖" };
        }
        if (n.includes("engl") || n.includes("connect") || n.includes("إنجل") || n.includes("لغة")) {
          return { gradient: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)", color: "#2563eb", icon: "🔤" };
        }
        if (n.includes("رياض") || n.includes("math")) {
          return { gradient: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)", color: "#7c3aed", icon: "📐" };
        }
        if (n.includes("فيزي") || n.includes("physic")) {
          return { gradient: "linear-gradient(135deg, #d97706 0%, #78350f 100%)", color: "#d97706", icon: "⚡" };
        }
        if (n.includes("كيمي") || n.includes("chem")) {
          return { gradient: "linear-gradient(135deg, #e11d48 0%, #881337 100%)", color: "#e11d48", icon: "🧪" };
        }
        if (n.includes("أحيا") || n.includes("bio") || n.includes("علوم") || n.includes("scien")) {
          return { gradient: "linear-gradient(135deg, #059669 0%, #064e3b 100%)", color: "#059669", icon: "🧬" };
        }
        if (n.includes("تاريخ") || n.includes("جغراف") || n.includes("دراسات") || n.includes("فلسف")) {
          return { gradient: "linear-gradient(135deg, #4f46e5 0%, #312e81 100%)", color: "#4f46e5", icon: "🏛️" };
        }
        if (n.includes("ict") || n.includes("حاسب") || n.includes("برمج") || n.includes("معلومات")) {
          return { gradient: "linear-gradient(135deg, #0891b2 0%, #164e63 100%)", color: "#0891b2", icon: "💻" };
        }
        return { gradient: "linear-gradient(135deg, #e51d74 0%, #831843 100%)", color: "#e51d74", icon: "📚" };
      };

      subjectsContainer.innerHTML = currentGrade.subjects.map(subject => {
        const theme = getSubjectTheme(subject.name);
        const iconToDisplay = subject.icon && subject.icon.length <= 2 ? subject.icon : theme.icon;

        return `
        <a href="#subject-groups/${subject.id}" class="creative-subject-card" style="
          background:var(--bg-card);
          border:1px solid var(--border-color);
          border-radius:22px;
          padding:22px;
          text-decoration:none;
          display:flex;
          flex-direction:column;
          justify-content:space-between;
          gap:16px;
          box-shadow:0 4px 20px rgba(0,0,0,0.03);
          transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position:relative;
          overflow:hidden;
        ">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
            <div style="
              width:52px;
              height:52px;
              border-radius:16px;
              background:${theme.gradient};
              display:flex;
              align-items:center;
              justify-content:center;
              font-size:1.7rem;
              box-shadow:0 8px 20px rgba(0,0,0,0.15);
              flex-shrink:0;
            ">
              ${iconToDisplay}
            </div>
            <span class="badge" style="
              background:${subject.isLanguageTrack ? "rgba(37,99,235,0.1)" : "rgba(16,185,129,0.1)"};
              color:${subject.isLanguageTrack ? "#2563eb" : "#10b981"};
              font-size:0.75rem;
              font-weight:800;
              padding:3px 10px;
              border-radius:10px;
            ">
              ${subject.isLanguageTrack ? "لغات (Language)" : "عام (عربي)"}
            </span>
          </div>

          <div>
            <h4 style="
              font-size:1.15rem;
              font-weight:900;
              color:var(--text-main);
              margin:0 0 6px 0;
              line-height:1.3;
            ">
              ${subject.name}
            </h4>
            <p style="
              font-size:0.82rem;
              color:var(--text-muted);
              margin:0;
              line-height:1.5;
            ">
              ${currentGrade.name} • مجموعات شرح ومراجعات مباشرة
            </p>
          </div>

          <div style="
            display:flex;
            align-items:center;
            justify-content:space-between;
            padding-top:12px;
            border-top:1px solid var(--border-color);
            font-size:0.82rem;
            font-weight:800;
            color:${theme.color};
          ">
            <span>استعراض المجموعات 👥</span>
            <i data-lucide="arrow-left" style="width:16px; height:16px;"></i>
          </div>
        </a>
      `;
      }).join("");

      if (window.lucide) window.lucide.createIcons();
      this.renderFilteredCoursesList();
    }

    renderFilteredCoursesList() {
      const grid = this.container.querySelector("#courses-page-grid");
      const emptyState = this.container.querySelector("#courses-page-empty-state");
      if (!grid) return;

      const currentGrade = this.allGradesData.find(g => g.id === this.explorerGradeId);
      const gradeName = currentGrade?.name || "";

      const isTeacher = state.user && state.user.role === "teacher";
      const isAdmin = state.user && state.user.role === "admin";
      const isStaff = isTeacher || isAdmin;

      const filtered = this.courses.filter(c => {
        // If user is a teacher, strictly show courses created/owned by this teacher
        if (isTeacher) {
          const myId = state.user?.id;
          const ownerId = c.teacher?.id || c.teacherId;
          if (ownerId !== myId) return false;

          // Status match for teacher
          if (this.teacherStatusFilter && this.teacherStatusFilter !== "all") {
            const status = (c.status || "PUBLISHED").toUpperCase();
            if (status !== this.teacherStatusFilter.toUpperCase()) return false;
          }
        }

        const title = (c.title || "").toLowerCase();
        const desc = (c.description || "").toLowerCase();
        const teacherName = (c.teacher?.name || "").toLowerCase();
        const category = (c.category || "").toLowerCase();
        const degree = (c.degree || "").toLowerCase();

        // Grade match
        const matchesGrade = !this.explorerGradeId || (c.grade?.id === this.explorerGradeId) || (gradeName && degree.includes(gradeName));

        // Search match
        const matchesSearch = !this.searchQuery ||
          title.includes(this.searchQuery) ||
          desc.includes(this.searchQuery) ||
          teacherName.includes(this.searchQuery) ||
          category.includes(this.searchQuery);

        return matchesGrade && matchesSearch;
      });

      if (filtered.length === 0) {
        grid.innerHTML = "";
        if (emptyState) {
          emptyState.style.display = "block";
          if (isTeacher) {
            const hasAnyCourses = this.courses.length > 0;
            emptyState.innerHTML = `
            <div class="glass-card" style="text-align:center; padding:44px 24px; color:var(--text-muted); border-radius:20px;">
              <i data-lucide="${hasAnyCourses ? 'search-x' : 'book-open'}" style="width:48px;height:48px;opacity:0.3;margin-bottom:12px;color:var(--primary);"></i>
              <h4 style="font-weight:800; font-size:1.05rem; color:var(--text-main); margin:0 0 6px 0;">
                ${hasAnyCourses ? 'لا توجد نتائج مطابقة للبحث أو التصفية الحالية' : 'لم تقم بإضافة أي مقررات دراسية حتى الآن'}
              </h4>
              <p style="font-size:0.86rem; margin:0 0 16px 0;">
                ${hasAnyCourses ? 'جرّب تغيير كلمات البحث أو مسح فلتر الصف والحالة.' : 'ابدأ الآن بإنشاء مقررك التعليمي الأول وإضافة الفصول والدروس والمجموعات.'}
              </p>
              <button class="btn-primary" onclick="document.getElementById('open-course-modal-btn')?.click()" style="padding:9px 22px; border-radius:20px; font-weight:800; font-size:0.85rem; display:inline-flex; align-items:center; gap:6px;">
                <i data-lucide="plus-circle" style="width:16px;height:16px;"></i> إضافة مقرر جديد
              </button>
            </div>
          `;
          }
        }
      } else {
        if (emptyState) emptyState.style.display = "none";
        grid.innerHTML = filtered.map(c => {
          return this.renderCourseCard(c, 0, false, isStaff);
        }).join("");
      }

      if (window.lucide) window.lucide.createIcons();
      if (isStaff) this.bindEvents();
    }

  async initTeacherCurriculumSelector(preselectedGradeId = null, preselectedSubjectId = null) {
      let allGrades = [];
      try {
        allGrades = await apiFetch("/curriculum/grades");
      } catch (e) {
        console.error("Failed to fetch curriculum grades:", e);
      }

      if (!Array.isArray(allGrades) || allGrades.length === 0) return;

      let currentStage = "PRIMARY";
      if (preselectedGradeId) {
        const g = allGrades.find(gr => gr.id === preselectedGradeId);
        if (g && g.stage) currentStage = g.stage;
      }

      const stageBtns = document.querySelectorAll(".teacher-modal-stage-btn");
      const gradeSelect = document.getElementById("modal-curriculum-grade-select");
      const subjectSelect = document.getElementById("modal-curriculum-subject-select");
      const customSubjectWrapper = document.getElementById("modal-custom-subject-wrapper");
      const customSubjectInput = document.getElementById("modal-custom-subject-input");
      const hiddenCategory = document.getElementById("course-category-select");
      const hiddenDegree = document.getElementById("course-degree");
      const hiddenGradeId = document.getElementById("modal-selected-grade-id");
      const hiddenSubjectId = document.getElementById("modal-selected-subject-id");

      const updateStageUI = (stage) => {
        currentStage = stage;
        stageBtns.forEach(btn => {
          const isCurrent = btn.getAttribute("data-stage") === stage;
          btn.classList.toggle("active", isCurrent);
          if (isCurrent) {
            const color = stage === "PRIMARY" ? "#10b981" : stage === "PREPARATORY" ? "#3b82f6" : "#e51d74";
            btn.style.background = color;
            btn.style.borderColor = color;
            btn.style.color = "#ffffff";
            btn.style.boxShadow = `0 4px 12px ${color}40`;
          } else {
            btn.style.background = "var(--bg-card)";
            btn.style.borderColor = "var(--border-color)";
            btn.style.color = "var(--text-main)";
            btn.style.boxShadow = "none";
          }
        });

        const stageGrades = allGrades.filter(g => g.stage === stage);
        if (stageGrades.length === 0) {
          if (gradeSelect) gradeSelect.innerHTML = `<option value="">لا توجد صفوف مسجلة لهذه المرحلة</option>`;
          if (subjectSelect) subjectSelect.innerHTML = `<option value="">-- اختر الصف أولاً --</option>`;
          return;
        }

        if (gradeSelect) {
          gradeSelect.innerHTML = stageGrades.map(g => `
          <option value="${g.id}" ${preselectedGradeId === g.id ? 'selected' : ''}>
            ${g.name}
          </option>
        `).join('');
          updateSubjectsUI(gradeSelect.value);
        }
      };

      const updateSubjectsUI = (gradeId) => {
        if (hiddenGradeId) hiddenGradeId.value = gradeId;
        const selectedGrade = allGrades.find(g => g.id === gradeId);
        if (selectedGrade && hiddenDegree) {
          hiddenDegree.value = selectedGrade.name;
        }

        const subjects = selectedGrade?.subjects || [];
        if (!subjectSelect) return;

        if (subjects.length === 0) {
          subjectSelect.innerHTML = `
          <option value="">لا توجد مواد مسجلة</option>
          <option value="__custom__">✏️ إدخال مادة مخصصة يدوياً</option>
        `;
          if (customSubjectWrapper) customSubjectWrapper.style.display = "block";
          return;
        }

        subjectSelect.innerHTML = `
        <option value="">-- اختر المادة الدراسية --</option>
        ${subjects.map(s => `
          <option value="${s.id}" data-name="${s.name}" ${preselectedSubjectId === s.id ? 'selected' : ''}>
            ${s.name} ${s.isLanguageTrack ? '(مسار لغات 🌐)' : '(منهج عام 🇪🇬)'}
          </option>
        `).join('')}
        <option value="__custom__">✏️ مادة أخرى / تخصص مخصص</option>
      `;

        if (preselectedSubjectId && subjects.some(s => s.id === preselectedSubjectId)) {
          const s = subjects.find(sub => sub.id === preselectedSubjectId);
          if (hiddenSubjectId) hiddenSubjectId.value = s.id;
          if (hiddenCategory) hiddenCategory.value = s.name;
          if (customSubjectWrapper) customSubjectWrapper.style.display = "none";
        } else {
          if (hiddenSubjectId) hiddenSubjectId.value = "";
          if (hiddenCategory) hiddenCategory.value = "";
          if (customSubjectWrapper) customSubjectWrapper.style.display = "none";
        }
      };

      stageBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          updateStageUI(btn.getAttribute("data-stage"));
        });
      });

      gradeSelect?.addEventListener("change", (e) => {
        updateSubjectsUI(e.target.value);
      });

      subjectSelect?.addEventListener("change", (e) => {
        const val = e.target.value;
        if (val === "__custom__") {
          if (customSubjectWrapper) customSubjectWrapper.style.display = "block";
          if (hiddenSubjectId) hiddenSubjectId.value = "";
          if (hiddenCategory) hiddenCategory.value = customSubjectInput?.value || "";
        } else {
          if (customSubjectWrapper) customSubjectWrapper.style.display = "none";
          if (hiddenSubjectId) hiddenSubjectId.value = val;
          const selectedOpt = subjectSelect.options[subjectSelect.selectedIndex];
          if (hiddenCategory) hiddenCategory.value = selectedOpt?.getAttribute("data-name") || selectedOpt?.text || "";
        }
      });

      customSubjectInput?.addEventListener("input", (e) => {
        if (subjectSelect?.value === "__custom__" && hiddenCategory) {
          hiddenCategory.value = e.target.value.trim();
        }
      });

      updateStageUI(currentStage);
    }

    renderCourseCard(course, progress, isEnrolled, isTeacherView = false) {
      return renderCourseCard(course, {
        enrollmentStatus: isEnrolled ? "active" : null,
        isTeacherView,
        progress
      });
    }

    bindEvents() {
      const courseModal = document.getElementById("course-modal");
      this.setupImageUploadEvents();

      // Open for Create
      document.getElementById("open-course-modal-btn")?.addEventListener("click", async () => {
        document.getElementById("create-course-form").reset();
        document.getElementById("create-course-form").removeAttribute("data-id");
        document.getElementById("course-image-url").value = "";
        const previewWrapper = document.getElementById("image-preview-wrapper");
        const idleBox = document.getElementById("image-upload-idle");
        if (previewWrapper) previewWrapper.style.display = "none";
        if (idleBox) idleBox.style.display = "block";
        courseModal.querySelector(".modal-title").innerText = t("teacher.createCourse");
        await this.initTeacherCurriculumSelector();
        courseModal.style.display = "flex";
      });

      document.getElementById("close-course-modal")?.addEventListener("click", () => { courseModal.style.display = "none"; });
      document.getElementById("cancel-course-modal")?.addEventListener("click", () => { courseModal.style.display = "none"; });

      document.getElementById("create-course-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = document.getElementById("course-title").value.trim();
        const hiddenCategory = document.getElementById("course-category-select");
        const hiddenDegree = document.getElementById("course-degree");
        const hiddenGradeId = document.getElementById("modal-selected-grade-id");
        const hiddenSubjectId = document.getElementById("modal-selected-subject-id");

        let category = hiddenCategory?.value?.trim();
        const customSubInput = document.getElementById("modal-custom-subject-input");
        if (!category && customSubInput && customSubInput.value) {
          category = customSubInput.value.trim();
        }

        if (!category) {
          showToast("الرجاء اختيار المادة الدراسية أو كتابتها.", "error");
          return;
        }

        const degree = hiddenDegree?.value || "";
        const gradeId = hiddenGradeId?.value || null;
        const subjectId = hiddenSubjectId?.value || null;
        const description = document.getElementById("course-desc").value;
        let image = document.getElementById("course-image-url").value;
        const meetingLink = document.getElementById("course-meeting-link").value;
        const fileInput = document.getElementById("course-image-file");

        // Handle file upload
        if (fileInput && fileInput.files.length > 0 && !image) {
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

        const courseId = document.getElementById("create-course-form").getAttribute("data-id");
        try {
          if (courseId) {
            await apiFetch(`/courses/${courseId}`, {
              method: "PUT",
              body: JSON.stringify({ title, category, degree, gradeId, subjectId, description, image, meetingLink })
            });
            showToast("تم تحديث بيانات الدورة بنجاح! ✅", "success");
          } else {
            await apiFetch("/courses", {
              method: "POST",
              body: JSON.stringify({ title, category, degree, gradeId, subjectId, description, image, meetingLink })
            });
            showToast(t("toast.coursePublished"), "success");
          }
          courseModal.style.display = "none";
          await this.loadContent();
        } catch (err) {
          showToast(err.message || "فشل حفظ الدورة التعليمية.", "error");
        }
      });
    }

    setupImageUploadEvents() {
      const fileInput = document.getElementById("course-image-file");
      const triggerBtn = document.getElementById("btn-trigger-upload");
      const dropzone = document.getElementById("course-dropzone");
      const idleBox = document.getElementById("image-upload-idle");
      const loadingBox = document.getElementById("image-upload-loading");
      const previewWrapper = document.getElementById("image-preview-wrapper");
      const previewImg = document.getElementById("course-preview-img");
      const removeBtn = document.getElementById("remove-course-image-btn");
      const hiddenUrlInput = document.getElementById("course-image-url");
      const toggleUrlBtn = document.getElementById("toggle-url-input-btn");
      const urlInputWrapper = document.getElementById("url-input-wrapper");
      const directUrlInput = document.getElementById("course-image-url-direct");

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
        if (urlInputWrapper.style.display === "none") {
          urlInputWrapper.style.display = "block";
          toggleUrlBtn.innerText = "إلغاء أدخل الرابط ✕";
        } else {
          urlInputWrapper.style.display = "none";
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
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Authorization": "Bearer " + token },
            body: formData
          });

          if (res.ok) {
            const data = await res.json();
            hiddenUrlInput.value = data.url;
            previewImg.src = data.url;
            if (loadingBox) loadingBox.style.display = "none";
            if (previewWrapper) previewWrapper.style.display = "block";
            showToast("تم رفع صورة الدورة بنجاح 🎉", "success");
          } else {
            throw new Error("Upload failed");
          }
        } catch (err) {
          console.error("Image upload failed", err);
          if (loadingBox) loadingBox.style.display = "none";
          if (idleBox) idleBox.style.display = "block";
          showToast("تعذر رفع الصورة، الرجاء إعادة المحاولة.", "error");
        }
      });
    }

    onDestroy() { }
  }