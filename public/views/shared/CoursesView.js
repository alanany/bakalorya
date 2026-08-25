import { apiFetch, state, showToast, t, renderCourseCard } from "../../app.js";

export default class CoursesView {
  constructor(container) {
    this.container = container;
    this.courses = [];
    this.enrollments = [];
  }

  async render() {
    try {
      this.container.innerHTML = `
        <div style="max-width:1280px; margin:0 auto; padding:40px 24px;">
          <h2 class="dashboard-section-title" style="font-size:2rem; margin-bottom:32px;">
            <i data-lucide="book-open"></i> ${t("nav.courses") || "الدورات التعليمية"}
          </h2>
          <div id="courses-content-area">
            <div style="text-align:center; padding:50px;">
              <i data-lucide="loader" class="spinner" style="width:40px;height:40px;border-width:3px;margin:0 auto;"></i>
            </div>
          </div>
        </div>
        
        <!-- Course Creation Modal (Teacher / Admin Only) -->
        <div class="modal-overlay" id="course-modal" style="display:none; backdrop-filter:blur(8px); background:rgba(0,0,0,0.6);">
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
              <div class="modal-body" style="padding:24px 28px; display:flex; flex-direction:column; gap:18px;">
                
                <!-- Course Title -->
                <div class="form-group" style="margin:0;">
                  <label for="course-title" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="heading" style="width:14px; height:14px; color:var(--primary);"></i>
                    ${t("teacher.courseTitle")}
                  </label>
                  <input type="text" id="course-title" class="form-input" placeholder="مثال: مادة الفيزياء - وحدة الكهرباء للثانوية" style="border-radius:14px; padding:12px 16px; font-size:0.9rem;" required>
                </div>

                <!-- Category & Degree Grid -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                  <!-- Platform Category -->
                  <div class="form-group" style="margin:0;">
                    <label for="course-category-select" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                      <i data-lucide="layers" style="width:14px; height:14px; color:#a855f7;"></i>
                      ${t("teacher.courseCategory")}
                    </label>
                    <select id="course-category-select" class="form-select" style="border-radius:14px; padding:11px 14px; font-size:0.88rem;">
                      <option value="">-- اختر التصنيف المعتمد --</option>
                    </select>
                  </div>

                  <!-- Grade Level -->
                  <div class="form-group" style="margin:0;">
                    <label for="course-degree" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                      <i data-lucide="graduation-cap" style="width:14px; height:14px; color:#10b981;"></i>
                      السنة الدراسية / المستوى
                    </label>
                    <select id="course-degree" class="form-select" style="border-radius:14px; padding:11px 14px; font-size:0.88rem;">
                      <option value="">-- اختر المستوى --</option>
                      
                      <optgroup label="🌱 المرحلة الابتدائية (Primary)">
                        <option value="الابتدائية - الصف الأول">الصف الأول الابتدائي (Primary 1)</option>
                        <option value="الابتدائية - الصف الثاني">الصف الثاني الابتدائي (Primary 2)</option>
                        <option value="الابتدائية - الصف الثالث">الصف الثالث الابتدائي (Primary 3)</option>
                        <option value="الابتدائية - الصف الرابع">الصف الرابع الابتدائي (Primary 4)</option>
                        <option value="الابتدائية - الصف الخامس">الصف الخامس الابتدائي (Primary 5)</option>
                        <option value="الابتدائية - الصف السادس">الصف السادس الابتدائي (Primary 6)</option>
                      </optgroup>

                      <optgroup label="📘 المرحلة الإعدادية (Intermediate / Prep)">
                        <option value="الإعدادية - الصف الأول">الصف الأول الإعدادي (Prep 1)</option>
                        <option value="الإعدادية - الصف الثاني">الصف الثاني الإعدادي (Prep 2)</option>
                        <option value="الإعدادية - الصف الثالث">الصف الثالث الإعدادي - الشهادة الإعدادية (Prep 3)</option>
                      </optgroup>

                      <optgroup label="🎓 المرحلة الثانوية (Secondary)">
                        <option value="الثانوية - الصف الأول">الصف الأول الثانوي (1st Secondary)</option>
                        <option value="الثانوية - الصف الثاني (علمي)">الصف الثاني الثانوي - علمي (2nd Sec Science)</option>
                        <option value="الثانوية - الصف الثاني (أدبي)">الصف الثاني الثانوي - أدبي (2nd Sec Arts)</option>
                        <option value="الثانوية - الصف الثالث (علمي علوم)">الصف الثالث الثانوي - علمي علوم (3rd Sec Science)</option>
                        <option value="الثانوية - الصف الثالث (علمي رياضة)">الصف الثالث الثانوي - علمي رياضة (3rd Sec Math)</option>
                        <option value="الثانوية - الصف الثالث (أدبي)">الصف الثالث الثانوي - أدبي (3rd Sec Arts)</option>
                        <option value="الثانوية الأزهرية">الثانوية الأزهرية (Azhar Secondary)</option>
                      </optgroup>

                      <optgroup label="🌟 عام وتأسيس (All Grades / General)">
                        <option value="جميع المراحل والصفوف">جميع المراحل والصفوف (All Grades)</option>
                        <option value="تأسيس ودورات عامة">تأسيس ودورات تدريبية عامة (General & Foundation)</option>
                      </optgroup>
                    </select>
                  </div>
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
                      <p style="font-size:0.75rem; color:var(--text-muted); margin:8px 0 0 0;">الصغار المقبولة: JPG, PNG, WEBP (الحد الأقصى 5 ميجابايت)</p>
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
      const allCourses = await apiFetch("/courses");
      const contentArea = this.container.querySelector("#courses-content-area");

      // 1. Unauthenticated / Guest View
      if (!state.user) {
        const publishedCourses = (allCourses || []).filter(c => c.status === "PUBLISHED" || !c.status);

        let html = `
        

          <!-- Course Catalog -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
            <h3 class="dashboard-section-title" style="margin:0;"><i data-lucide="compass"></i> دليل الدورات التعليمية المتاحة (${publishedCourses.length})</h3>
          </div>

          ${publishedCourses.length === 0
            ? `<div class="glass-card" style="text-align:center; padding: 40px; color:var(--text-muted);">
                  <p>لا توجد دورات تعليمية متاحة حالياً.</p>
                </div>`
            : `<div class="courses-grid">
                  ${publishedCourses.map(course => this.renderCourseCard(course, 0, false)).join("")}
                </div>`
          }
        `;
        contentArea.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      // 2. Logged-in Student View
      if (state.user.role === "student") {
        const enrollments = await apiFetch("/student/enrollments");
        const enrolledCourseIds = (enrollments || []).map(e => e.course?.id);
        const catalogCourses = (allCourses || []).filter(c => !enrolledCourseIds.includes(c.id));

        let html = `
          <!-- Active Courses -->
          <h3 class="dashboard-section-title"><i data-lucide="graduation-cap"></i> ${t("student.myTrack")}</h3>
          ${(enrollments || []).length === 0
            ? `<div class="glass-card" style="text-align:center; padding: 40px; color:var(--text-muted); margin-bottom: 40px;">
                  <p style="margin-bottom:16px;">${t("student.noEnrollments")}</p>
                </div>`
            : `<div class="courses-grid" style="margin-bottom: 40px;">
                  ${enrollments.map(enroll => this.renderCourseCard(enroll.course, enroll.progress, true, false, enroll.status)).join("")}
                </div>`
          }

          <!-- Course Catalog -->
          <h3 class="dashboard-section-title"><i data-lucide="compass"></i> ${t("student.exploreCourses")}</h3>
          ${catalogCourses.length === 0
            ? `<div class="glass-card" style="text-align:center; padding: 30px; color:var(--text-muted);">
                  <p>${t("student.allEnrolled")}</p>
                </div>`
            : `<div class="courses-grid">
                  ${catalogCourses.map(course => this.renderCourseCard(course, 0, false)).join("")}
                </div>`
          }
        `;
        contentArea.innerHTML = html;

      } else {
        // 3. Teacher / Admin View
        const myCourses = (allCourses || []).filter(c => c.teacher?.id === state.user.id || state.user.role === 'admin');

        let html = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3 class="dashboard-section-title" style="margin:0;"><i data-lucide="folder-git-2"></i> ${t("teacher.coursesDir")}</h3>
          </div>
          
          ${myCourses.length === 0
            ? `<div class="glass-card" style="text-align:center; padding: 40px; color:var(--text-muted);">
                  ${t("teacher.noCourses")}
                </div>`
            : `<div class="courses-grid">
                  ${myCourses.map(course => this.renderCourseCard(course, 0, true, true)).join("")}
                </div>`
          }
        `;
        contentArea.innerHTML = html;
        this.bindEvents();
      }

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error("Courses content loading error:", err);
    }
  }

  async populateCategoryOptions(selectedCategory = "") {
    const catSelect = document.getElementById("course-category-select");
    if (!catSelect) return;

    let apiCategories = [];
    try {
      apiCategories = await apiFetch("/categories");
    } catch (e) {
      console.error("Failed to fetch categories", e);
    }

    let optionsHTML = `<option value="">-- اختر التصنيف المعتمد بالمنصة --</option>`;
    if (apiCategories && apiCategories.length > 0) {
      apiCategories.forEach(cat => {
        const isSel = selectedCategory && (selectedCategory === cat.name || selectedCategory.toLowerCase() === cat.name.toLowerCase());
        optionsHTML += `<option value="${cat.name}" ${isSel ? 'selected' : ''}>${cat.name}</option>`;
      });
    }

    catSelect.innerHTML = optionsHTML;
    if (selectedCategory && catSelect.querySelector(`option[value="${selectedCategory}"]`)) {
      catSelect.value = selectedCategory;
    }
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
      await this.populateCategoryOptions();
      courseModal.style.display = "flex";
    });

    document.getElementById("close-course-modal")?.addEventListener("click", () => { courseModal.style.display = "none"; });
    document.getElementById("cancel-course-modal")?.addEventListener("click", () => { courseModal.style.display = "none"; });

    document.getElementById("create-course-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("course-title").value;
      const categorySelect = document.getElementById("course-category-select");
      const category = categorySelect ? categorySelect.value : "";
      const degreeSelect = document.getElementById("course-degree");
      const degree = degreeSelect ? degreeSelect.value : "";
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
          await apiFetch(`/courses/${courseId}`, { method: "PUT", body: JSON.stringify({ title, category, degree, description, image, meetingLink }) });
          showToast("Course updated successfully", "success");
        } else {
          await apiFetch("/courses", { method: "POST", body: JSON.stringify({ title, category, degree, description, image, meetingLink }) });
          showToast(t("toast.coursePublished"), "success");
        }
        courseModal.style.display = "none";
        await this.loadContent();
      } catch (err) { }
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