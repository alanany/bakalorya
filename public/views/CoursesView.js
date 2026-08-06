import { apiFetch, state, showToast, t, renderCourseCard } from "../app.js";

export default class CoursesView {
  constructor(container) {
    this.container = container;
    this.courses = [];
    this.enrollments = [];
  }

  async render() {
    try {
      if (!state.user) return;

      this.container.innerHTML = `
        <div style="max-width:1280px; margin:0 auto; padding:40px 24px;">
          <h2 class="dashboard-section-title" style="font-size:2rem; margin-bottom:32px;">
            <i data-lucide="book-open"></i> ${t("nav.courses")}
          </h2>
          <div id="courses-content-area">
            <div style="text-align:center; padding:50px;">
              <i data-lucide="loader" class="spinner" style="width:40px;height:40px;border-width:3px;margin:0 auto;"></i>
            </div>
          </div>
        </div>
        
        <!-- Course Creation Modal (Teacher Only) -->
        <div class="modal-overlay" id="course-modal" style="display:none;">
          <div class="modal-content">
            <div class="modal-header">
              <h3 class="modal-title">${t("teacher.createCourse")}</h3>
              <span class="modal-close-btn" id="close-course-modal">&times;</span>
            </div>
            <form id="create-course-form">
              <div class="modal-body">
                <div class="form-group">
                  <label for="course-title">${t("teacher.courseTitle")}</label>
                  <input type="text" id="course-title" class="form-input" placeholder="${t("teacher.courseTitlePlaceholder")}" required>
                </div>
                <div class="form-group">
                  <label for="course-category">${t("teacher.courseCategory")}</label>
                  <select id="course-category" class="form-select">
                    <option value="Mathematics">${t("subject.math")}</option>
                    <option value="Physics">${t("subject.physics")}</option>
                    <option value="Chemistry">${t("subject.chemistry")}</option>
                    <option value="Arabic">${t("subject.arabic")}</option>
                    <option value="French">${t("subject.french")}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="course-desc">${t("teacher.courseDesc")}</label>
                  <textarea id="course-desc" class="form-input" style="height:100px; resize:none;" placeholder="${t("teacher.courseDescPlaceholder")}" required></textarea>
                </div>
                <div class="form-group">
                  <label for="course-image-file">${t("teacher.courseImage")}</label>
                  <input type="file" id="course-image-file" class="form-input" accept="image/*" style="margin-bottom:8px;">
                  <input type="hidden" id="course-image-url">
                </div>
                <div class="form-group">
                  <label for="course-meeting-link">Meeting Link (Zoom, Meet, etc.)</label>
                  <input type="url" id="course-meeting-link" class="form-input" placeholder="https://zoom.us/j/123456789">
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn-secondary" id="cancel-course-modal">${t("common.cancel")}</button>
                <button type="submit" class="btn-primary">${t("teacher.publishCourse")}</button>
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
        // Teacher / Admin View
        const myCourses = (allCourses || []).filter(c => c.teacher?.id === state.user.id || state.user.role === 'admin');

        let html = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3 class="dashboard-section-title" style="margin:0;"><i data-lucide="folder-git-2"></i> ${t("teacher.coursesDir")}</h3>
            <button class="btn-primary" id="open-course-modal-btn"><i data-lucide="plus-circle"></i> ${t("teacher.createCourse")}</button>
          </div>
          
          ${myCourses.length === 0
            ? `<div class="glass-card" style="text-align:center; padding: 40px; color:var(--text-muted);">
                  ${t("teacher.noCourses")}
                </div>`
            : `<div class="courses-grid" style="grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));">
                  ${myCourses.map(course => this.renderCourseCard(course, 0, true, true)).join("")}
                </div>`
          }
        `;
        contentArea.innerHTML = html;
      }

      this.bindEvents();
      if (window.lucide) window.lucide.createIcons();
    } catch (error) {
      console.error(error);
      this.container.querySelector("#courses-content-area").innerHTML = `<div class="glass-card" style="text-align:center;color:var(--error);">${t("error.loadFailed") || "Failed to load"}</div>`;
    }
  }

  renderCourseCard(course, progress = 0, isEnrolled = false, isTeacher = false, status = null) {
    if (!course) return "";
    const isUserTeacher = isTeacher || (state.user && (state.user.role === "teacher" || state.user.role === "admin"));
    const myEnrollment = status ? { status } : (this.enrollments || []).find(e => e.course?.id === course.id);
    const actualStatus = isEnrolled ? (myEnrollment ? myEnrollment.status : "active") : null;

    return renderCourseCard(course, {
      enrollmentStatus: actualStatus,
      isTeacherView: isUserTeacher,
      progress: progress || 0
    });
  }

  bindEvents() {
    const courseModal = document.getElementById("course-modal");

    // Open for Create
    document.getElementById("open-course-modal-btn")?.addEventListener("click", () => {
      document.getElementById("create-course-form").reset();
      document.getElementById("create-course-form").removeAttribute("data-id");
      courseModal.querySelector(".modal-title").innerText = t("teacher.createCourse");
      courseModal.style.display = "flex";
    });

    document.getElementById("close-course-modal")?.addEventListener("click", () => { courseModal.style.display = "none"; });
    document.getElementById("cancel-course-modal")?.addEventListener("click", () => { courseModal.style.display = "none"; });

    document.getElementById("create-course-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("course-title").value;
      const category = document.getElementById("course-category").value;
      const description = document.getElementById("course-desc").value;
      let image = document.getElementById("course-image-url").value;
      const meetingLink = document.getElementById("course-meeting-link").value;
      const fileInput = document.getElementById("course-image-file");

      // Handle file upload
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
          } else {
            console.error("Upload failed with status", uploadRes.status);
          }
        } catch (err) {
          console.error("Upload failed", err);
        }
      }

      const courseId = document.getElementById("create-course-form").getAttribute("data-id");
      try {
        if (courseId) {
          await apiFetch(`/courses/${courseId}`, { method: "PUT", body: JSON.stringify({ title, category, description, image, meetingLink }) });
          showToast("Course updated successfully", "success");
        } else {
          await apiFetch("/courses", { method: "POST", body: JSON.stringify({ title, category, description, image, meetingLink }) });
          showToast(t("toast.coursePublished"), "success");
        }
        courseModal.style.display = "none";
        await this.loadContent();
      } catch (err) { }
    });
  }

  onDestroy() { }
}