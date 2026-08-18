import { apiFetch, state, showToast, t } from "../app.js";

export default class AssignmentsView {
  constructor(container) {
    this.container = container;
    this.assignments = [];
  }

  async render() {
    try {
      if (!state.user) return;

      this.container.innerHTML = `
        <div style="max-width:1280px; margin:0 auto; padding:40px 24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px;">
            <h2 class="dashboard-section-title" style="font-size:2rem; margin:0;">
              <i data-lucide="clipboard-list"></i> ${t("nav.assignments")}
            </h2>
            ${state.user.role === 'teacher' || state.user.role === 'admin' ? 
              `<button class="btn-primary" id="open-assignment-modal-btn"><i data-lucide="plus"></i> Create Assignment</button>` : ''
            }
          </div>

          <div id="assignments-content-area" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:24px;">
            <div style="text-align:center; padding:50px; grid-column: 1 / -1;">
              <i data-lucide="loader" class="spinner" style="width:40px;height:40px;border-width:3px;margin:0 auto;"></i>
            </div>
          </div>
        </div>

        <!-- Teacher Create Modal -->
        <div class="modal-overlay" id="assignment-modal" style="display:none;">
          <div class="modal-content">
            <div class="modal-header">
              <h3 class="modal-title">Create Assignment</h3>
              <span class="modal-close-btn" id="close-assignment-modal">&times;</span>
            </div>
            <form id="create-assignment-form">
              <div class="modal-body">
                <div class="form-group">
                  <label>Title</label>
                  <input type="text" id="assignment-title" class="form-input" required>
                </div>
                <div class="form-group">
                  <label>Course <span style="color:var(--error);">*</span></label>
                  <select id="assignment-course" class="form-select" required></select>
                </div>
                <div class="form-group">
                  <label>Lesson (اختر الدرس الخاص بهذا الواجب / Optional)</label>
                  <select id="assignment-lesson" class="form-select">
                    <option value="">اختر الدورة أولاً لعرض الدروس...</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Description (Tasks & Instructions)</label>
                  <textarea id="assignment-desc" class="form-input" style="height:100px;"></textarea>
                </div>
                <div class="form-group">
                  <label>Due Date <span style="color:var(--error);">*</span></label>
                  <input type="datetime-local" id="assignment-due" class="form-input" required>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn-secondary" id="cancel-assignment-modal">Cancel</button>
                <button type="submit" class="btn-primary">Publish Assignment 🚀</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Student Submit Modal -->
        <div class="modal-overlay" id="submit-modal" style="display:none;">
          <div class="modal-content">
            <div class="modal-header">
              <h3 class="modal-title">Submit Assignment</h3>
              <span class="modal-close-btn" id="close-submit-modal">&times;</span>
            </div>
            <form id="submit-assignment-form">
              <div class="modal-body">
                <p id="submit-assignment-title" style="font-weight:600; margin-bottom:12px;"></p>
                <div class="form-group">
                  <label>Answer / Link to file</label>
                  <textarea id="submit-content" class="form-input" style="height:120px;" placeholder="Write your answer here or paste a link to your document..." required></textarea>
                </div>
                <input type="hidden" id="submit-assignment-id">
              </div>
              <div class="modal-footer">
                <button type="button" class="btn-secondary" id="cancel-submit-modal">Cancel</button>
                <button type="submit" class="btn-primary">Submit</button>
              </div>
            </form>
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
      await this.loadContent();
    } catch (err) {
      console.error(err);
    }
  }

  async loadContent() {
    try {
      this.assignments = await apiFetch("/assignments");
      const contentArea = this.container.querySelector("#assignments-content-area");

      if (this.assignments.length === 0) {
        contentArea.innerHTML = `<div class="glass-card" style="text-align:center; padding: 40px; color:var(--text-muted); grid-column: 1 / -1;">No assignments found.</div>`;
      } else {
        contentArea.innerHTML = this.assignments.map(a => this.renderAssignmentCard(a)).join("");
      }

      if (state.user.role === 'teacher' || state.user.role === 'admin') {
        const courses = await apiFetch("/courses").then(res => res.filter(c => c.teacher?.id === state.user.id || state.user.role === 'admin'));
        const courseSelect = document.getElementById("assignment-course");
        const lessonSelect = document.getElementById("assignment-lesson");

        if (courseSelect) {
          courseSelect.innerHTML = `<option value="">Select Course...</option>` + courses.map(c => `<option value="${c.id}">${c.title}</option>`).join("");
          
          courseSelect.addEventListener("change", async () => {
            const courseId = courseSelect.value;
            if (!courseId) {
              if (lessonSelect) lessonSelect.innerHTML = `<option value="">اختر الدورة أولاً لعرض الدروس...</option>`;
              return;
            }
            if (lessonSelect) lessonSelect.innerHTML = `<option value="">جاري تحميل الدروس...</option>`;
            try {
              const courseDetails = await apiFetch(`/courses/${courseId}`);
              const lessons = courseDetails.lessons || [];
              if (lessons.length === 0) {
                if (lessonSelect) lessonSelect.innerHTML = `<option value="">لا توجد دروس مضافة لهذه الدورة</option>`;
              } else {
                if (lessonSelect) lessonSelect.innerHTML = `<option value="">جميع دروس الدورة (عام)</option>` + lessons.map(l => `<option value="${l.id}">📌 ${l.title}</option>`).join("");
              }
            } catch (err) {
              if (lessonSelect) lessonSelect.innerHTML = `<option value="">اختر الدرس (اختياري)</option>`;
            }
          });
        }
      }

      if (window.lucide) window.lucide.createIcons();
      this.bindEvents();
    } catch (error) {
      console.error(error);
    }
  }

  renderAssignmentCard(assignment) {
    const isTeacher = state.user.role === 'teacher' || state.user.role === 'admin';
    const dueDate = new Date(assignment.dueDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const isOverdue = new Date() > new Date(assignment.dueDate);

    let action = "";
    if (isTeacher) {
      action = `<button class="btn-secondary view-submissions-btn" data-id="${assignment.id}" style="width:100%; justify-content:center;">View Submissions</button>`;
    } else {
      if (assignment.submission) {
        const graded = assignment.submission.grade !== null;
        action = `
          <div style="background:var(--bg-app); padding:12px; border-radius:8px; border:1px solid var(--border-color); text-align:center; font-size:0.9rem;">
            ${graded ? `<span style="color:var(--success); font-weight:700;">Graded: ${assignment.submission.grade}/100</span>` : `<span style="color:var(--info);">Submitted (Pending Grade)</span>`}
          </div>
        `;
      } else {
        action = `<button class="btn-primary submit-btn" data-id="${assignment.id}" data-title="${assignment.title}" style="width:100%; justify-content:center; ${isOverdue ? 'background:var(--error); box-shadow:none;' : ''}">
          ${isOverdue ? 'Late Submit' : 'Submit Assignment'}
        </button>`;
      }
    }

    return `
      <div class="glass-card" style="padding:20px; display:flex; flex-direction:column;">
        <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:12px; flex-wrap:wrap; gap:6px;">
          <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
            <span class="session-tag" style="background:var(--primary-glow); color:var(--primary);">${assignment.course?.title}</span>
            ${assignment.lesson ? `<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-size:0.75rem;">📌 ${assignment.lesson.title}</span>` : ''}
          </div>
          <span style="font-size:0.8rem; color:${isOverdue ? 'var(--error)' : 'var(--text-muted)'}; font-weight:600;"><i data-lucide="clock" style="width:12px;height:12px;vertical-align:middle;margin-right:4px;"></i> Due: ${dueDate}</span>
        </div>
        <h4 style="font-size:1.1rem; margin-bottom:8px;">${assignment.title}</h4>
        <p style="font-size:0.9rem; color:var(--text-muted); flex-grow:1; margin-bottom:16px;">${assignment.description || ''}</p>
        <div>
          ${action}
        </div>
      </div>
    `;
  }

  bindEvents() {
    const createModal = document.getElementById("assignment-modal");
    document.getElementById("open-assignment-modal-btn")?.addEventListener("click", () => { createModal.style.display = "flex"; });
    document.getElementById("close-assignment-modal")?.addEventListener("click", () => { createModal.style.display = "none"; });
    document.getElementById("cancel-assignment-modal")?.addEventListener("click", () => { createModal.style.display = "none"; });

    document.getElementById("create-assignment-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await apiFetch("/assignments", {
          method: "POST",
          body: JSON.stringify({
            title: document.getElementById("assignment-title").value,
            courseId: document.getElementById("assignment-course").value,
            lessonId: document.getElementById("assignment-lesson")?.value || null,
            description: document.getElementById("assignment-desc").value,
            dueDate: document.getElementById("assignment-due").value,
          })
        });
        showToast("Assignment published!", "success");
        createModal.style.display = "none";
        await this.loadContent();
      } catch (err) {}
    });

    const submitModal = document.getElementById("submit-modal");
    document.getElementById("close-submit-modal")?.addEventListener("click", () => { submitModal.style.display = "none"; });
    document.getElementById("cancel-submit-modal")?.addEventListener("click", () => { submitModal.style.display = "none"; });

    this.container.querySelectorAll(".submit-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.getElementById("submit-assignment-id").value = btn.getAttribute("data-id");
        document.getElementById("submit-assignment-title").innerText = btn.getAttribute("data-title");
        submitModal.style.display = "flex";
      });
    });

    document.getElementById("submit-assignment-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const id = document.getElementById("submit-assignment-id").value;
        const content = document.getElementById("submit-content").value;
        await apiFetch(`/assignments/${id}/submit`, {
          method: "POST",
          body: JSON.stringify({ content })
        });
        showToast("Assignment submitted!", "success");
        submitModal.style.display = "none";
        await this.loadContent();
      } catch (err) {}
    });
    
    this.container.querySelectorAll(".view-submissions-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        try {
          const subs = await apiFetch(`/assignments/${id}/submissions`);
          // Simple alert for now, in a real app this would open a modal with a list and grading inputs
          if(subs.length === 0) showToast("No submissions yet.");
          else {
             const subStrings = subs.map(s => `${s.student?.name} (${s.grade ? 'Grade: ' + s.grade : 'Not Graded'})`).join(", ");
             alert(`Submissions:\n${subStrings}`);
          }
        } catch (err) {}
      });
    });
  }

  onDestroy() {}
}
