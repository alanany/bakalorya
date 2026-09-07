import { apiFetch, state, showToast, t } from "../../app.js";

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
        <div class="modal-overlay" id="assignment-modal" style="display:none; z-index:99999;">
          <div class="modal-content" style="max-width:640px; max-height:90vh; display:flex; flex-direction:column;">
            <div class="modal-header">
              <h3 class="modal-title" style="display:flex; align-items:center; gap:8px;">
                <i data-lucide="clipboard-edit" style="color:var(--primary); width:20px; height:20px;"></i> إضافة واجب دراسي جديد
              </h3>
              <span class="modal-close-btn" id="close-assignment-modal">&times;</span>
            </div>
            <form id="create-assignment-form" style="display:flex; flex-direction:column; flex:1; overflow:hidden;">
              <div class="modal-body" style="flex:1; overflow-y:auto; padding:16px 20px; display:flex; flex-direction:column; gap:14px;">
                <div class="form-group">
                  <label style="font-weight:700;">عنوان الواجب <span style="color:var(--error);">*</span></label>
                  <input type="text" id="assignment-title" class="form-input" placeholder="مثال: واجب الدرس الأول - حل مسائل النهايات" required>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                  <div class="form-group">
                    <label style="font-weight:700;">الدورة الدراسية <span style="color:var(--error);">*</span></label>
                    <select id="assignment-course" class="form-select" required></select>
                  </div>
                  <div class="form-group">
                    <label style="font-weight:700;">الدرس المرتبط (اختياري)</label>
                    <select id="assignment-lesson" class="form-select">
                      <option value="">اختر الدورة أولاً لعرض الدروس...</option>
                    </select>
                  </div>
                </div>

                <!-- Multiple Questions Section -->
                <div class="form-group" style="border-top:1px solid var(--border-color); padding-top:12px; margin-top:4px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <label style="font-weight:800; font-size:0.92rem; margin:0; display:flex; align-items:center; gap:6px; color:var(--text-main);">
                      <i data-lucide="help-circle" style="width:16px;height:16px;color:var(--primary);"></i>
                      أسئلة الواجب (Questions) <span style="color:var(--error);">*</span>
                    </label>
                    <button type="button" id="add-question-btn" class="btn-secondary" style="font-size:0.8rem; padding:5px 12px; border-radius:8px; display:inline-flex; align-items:center; gap:4px; font-weight:700; cursor:pointer;">
                      <i data-lucide="plus" style="width:14px;height:14px;"></i> + إضافة سؤال آخر
                    </button>
                  </div>
                  <div id="assignment-questions-list" style="display:flex; flex-direction:column; gap:10px;">
                    <!-- Dynamically populated -->
                  </div>
                </div>

                <div class="form-group">
                  <label style="font-weight:700;">تعليمات وإرشادات إضافية (اختياري)</label>
                  <textarea id="assignment-desc" class="form-input" rows="2" placeholder="ملاحظات عامة أو تنبيهات حول الواجب..."></textarea>
                </div>
                <div class="form-group">
                  <label style="font-weight:700;">آخر موعد للتسليم (Due Date) <span style="color:var(--error);">*</span></label>
                  <input type="datetime-local" id="assignment-due" class="form-input" required>
                </div>
              </div>
              <div class="modal-footer" style="padding:14px 20px; border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; gap:10px;">
                <button type="button" class="btn-secondary" id="cancel-assignment-modal">إلغاء</button>
                <button type="submit" class="btn-primary" style="font-weight:800;">نشر الواجب للطلاب 🚀</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Student Submit Modal -->
        <div class="modal-overlay" id="submit-modal" style="display:none; z-index:99999;">
          <div class="modal-content" style="max-width:600px; max-height:90vh; display:flex; flex-direction:column;">
            <div class="modal-header">
              <h3 class="modal-title" style="font-weight:800;">تسليم حل الواجب</h3>
              <span class="modal-close-btn" id="close-submit-modal">&times;</span>
            </div>
            <form id="submit-assignment-form" style="display:flex; flex-direction:column; flex:1; overflow:hidden;">
              <div class="modal-body" style="flex:1; overflow-y:auto; padding:16px 20px;">
                <p id="submit-assignment-title" style="font-weight:800; font-size:1.05rem; margin-bottom:12px; color:var(--text-main);"></p>
                <div id="submit-assignment-questions-preview" style="margin-bottom:14px;"></div>
                <div class="form-group" id="submit-legacy-group">
                  <label style="font-weight:700; margin-bottom:6px; display:block;">إجابتك على الأسئلة أو رابط الملف:</label>
                  <textarea id="submit-content" class="form-input" style="height:140px; resize:vertical; font-family:inherit;" placeholder="اكتب إجاباتك بالتفصيل (س1: ... س2: ...) أو الصق رابط المستند أو الملف الخارجي..."></textarea>
                </div>
                <input type="hidden" id="submit-assignment-id">
              </div>
              <div class="modal-footer" style="padding:14px 20px; border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; gap:10px;">
                <button type="button" class="btn-secondary" id="cancel-submit-modal">إلغاء</button>
                <button type="submit" class="btn-primary" style="font-weight:800;">تسليم الحل الآن 🚀</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Teacher Submissions & Grading Modal -->
        <div class="modal-overlay" id="grading-modal" style="display:none; z-index:99999;">
          <div class="modal-content" style="max-width:650px;">
            <div class="modal-header">
              <h3 class="modal-title" id="grading-modal-title" style="font-weight:800; font-size:1.15rem; display:flex; align-items:center; gap:8px;">
                <i data-lucide="check-square" style="color:var(--primary); width:20px; height:20px;"></i> إجابات وتسليمات الطلاب (تصحيح الواجب)
              </h3>
              <span class="modal-close-btn" id="close-grading-modal">&times;</span>
            </div>
            <div class="modal-body" id="grading-modal-list" style="max-height:450px; overflow-y:auto; padding:16px;">
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" id="close-grading-modal-btn">إغلاق</button>
            </div>
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

  renderQuestionRow(index = 1, text = '', points = '', imageUrl = '') {
    return `
      <div class="question-row" data-image-url="${imageUrl || ''}" style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
          <span class="question-row-badge" style="font-weight:800; font-size:0.84rem; color:var(--primary); display:flex; align-items:center; gap:4px;">
            <i data-lucide="help-circle" style="width:14px;height:14px;"></i> السؤال <span class="q-num">${index}</span>:
          </span>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <div style="display:flex; align-items:center; gap:4px;">
              <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">الدرجة:</span>
              <input type="number" min="1" max="100" class="form-input q-points" placeholder="مثال: 10" value="${points || ''}" style="width:70px; padding:4px 8px; font-size:0.8rem; height:28px;">
            </div>
            <label class="btn-secondary upload-photo-label" style="font-size:0.75rem; padding:4px 10px; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-weight:700;">
              <i data-lucide="image" style="width:13px;height:13px;"></i>
              <span class="upload-photo-text">${imageUrl ? 'تغيير الصورة' : 'إرفاق صورة 🖼️'}</span>
              <input type="file" class="q-photo-file-input" accept="image/*" style="display:none;">
            </label>
            <button type="button" class="btn-icon remove-q-btn" title="حذف السؤال" style="color:var(--error); padding:4px; background:none; border:none; cursor:pointer; display:inline-flex; align-items:center;">
              <i data-lucide="trash-2" style="width:15px;height:15px;"></i>
            </button>
          </div>
        </div>
        <textarea class="form-input q-text" rows="2" placeholder="اكتب نص السؤال هنا بالتفصيل..." style="padding:8px 10px; font-size:0.86rem; resize:vertical; font-family:inherit;" required>${text || ''}</textarea>

        <div class="q-photo-preview-container" style="${imageUrl ? 'display:flex;' : 'display:none;'} align-items:center; gap:10px; margin-top:4px; background:var(--bg-card); padding:8px 12px; border-radius:8px; border:1px solid var(--border-color);">
          <img src="${imageUrl || ''}" class="q-photo-img" style="max-height:80px; max-width:130px; border-radius:6px; object-fit:contain; background:#000;" />
          <div style="display:flex; flex-direction:column; gap:4px;">
            <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">تم إرفاق صورة مع هذا السؤال</span>
            <button type="button" class="remove-q-photo-btn" style="color:var(--error); background:none; border:none; padding:0; font-size:0.75rem; font-weight:700; cursor:pointer; text-align:start; display:inline-flex; align-items:center; gap:4px;">
              <i data-lucide="x" style="width:12px;height:12px;"></i> حذف الصورة
            </button>
          </div>
        </div>
      </div>
    `;
  }

  reindexQuestions(container) {
    if (!container) return;
    const rows = container.querySelectorAll(".question-row");
    rows.forEach((row, i) => {
      const numEl = row.querySelector(".q-num");
      if (numEl) numEl.innerText = i + 1;
      const removeBtn = row.querySelector(".remove-q-btn");
      if (removeBtn) {
        removeBtn.style.visibility = rows.length > 1 ? "visible" : "hidden";
      }
    });
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

    const hasQuestions = assignment.questions && Array.isArray(assignment.questions) && assignment.questions.length > 0;

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
        
        ${hasQuestions ? `
          <div style="margin-bottom:14px; background:var(--bg-app); border:1px solid var(--border-color); border-radius:10px; padding:12px;">
            <div style="font-size:0.82rem; font-weight:800; color:var(--primary); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
              <i data-lucide="list-checks" style="width:14px;height:14px;"></i> أسئلة الواجب (${assignment.questions.length} أسئلة):
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${assignment.questions.map((q, idx) => `
                <div style="display:flex; flex-direction:column; gap:4px; font-size:0.85rem; padding:6px 0; ${idx < assignment.questions.length - 1 ? 'border-bottom:1px dashed var(--border-color);' : ''}">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                    <span style="color:var(--text-main); line-height:1.4;"><strong style="color:var(--primary);">س${idx + 1}:</strong> ${q.text}</span>
                    ${q.points ? `<span class="badge" style="font-size:0.72rem; padding:2px 6px; background:var(--primary-glow); color:var(--primary); font-weight:700; flex-shrink:0; margin-inline-start:6px;">${q.points} درجات</span>` : ''}
                  </div>
                  ${q.imageUrl ? `
                    <div style="margin-top:4px;">
                      <img src="${q.imageUrl}" style="max-height:100px; max-width:180px; border-radius:6px; border:1px solid var(--border-color); cursor:pointer; object-fit:contain; background:#000;" onclick="window.open('${q.imageUrl}', '_blank')" title="انقر لفتح الصورة بحجم كامل 🔍" />
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : (assignment.description ? `<p style="font-size:0.9rem; color:var(--text-muted); flex-grow:1; margin-bottom:16px; white-space:pre-wrap;">${assignment.description}</p>` : '')}

        <div>
          ${action}
        </div>
      </div>
    `;
  }

  bindEvents() {
    const createModal = document.getElementById("assignment-modal");
    const qList = document.getElementById("assignment-questions-list");
    const addQBtn = document.getElementById("add-question-btn");

    const resetQuestionList = () => {
      if (qList) {
        qList.innerHTML = this.renderQuestionRow(1, '', '', '');
        this.reindexQuestions(qList);
        if (window.lucide) window.lucide.createIcons();
      }
    };

    document.getElementById("open-assignment-modal-btn")?.addEventListener("click", () => {
      document.getElementById("create-assignment-form")?.reset();
      resetQuestionList();
      const dueInput = document.getElementById("assignment-due");
      if (dueInput) {
        const now = new Date();
        now.setDate(now.getDate() + 7);
        dueInput.value = now.toISOString().slice(0, 16);
      }
      createModal.style.display = "flex";
    });

    document.getElementById("close-assignment-modal")?.addEventListener("click", () => { createModal.style.display = "none"; });
    document.getElementById("cancel-assignment-modal")?.addEventListener("click", () => { createModal.style.display = "none"; });

    // Add another question button
    addQBtn?.addEventListener("click", () => {
      if (qList) {
        const currentCount = qList.querySelectorAll(".question-row").length;
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = this.renderQuestionRow(currentCount + 1, '', '', '');
        const newRow = tempDiv.firstElementChild;
        qList.appendChild(newRow);
        this.reindexQuestions(qList);
        if (window.lucide) window.lucide.createIcons();
      }
    });

    // Remove question button delegate
    qList?.addEventListener("click", (e) => {
      const removeBtn = e.target.closest(".remove-q-btn");
      if (removeBtn) {
        const row = removeBtn.closest(".question-row");
        if (row && qList.querySelectorAll(".question-row").length > 1) {
          row.remove();
          this.reindexQuestions(qList);
        }
      }

      const removePhotoBtn = e.target.closest(".remove-q-photo-btn");
      if (removePhotoBtn) {
        const row = removePhotoBtn.closest(".question-row");
        if (row) {
          row.removeAttribute("data-image-url");
          const prevCont = row.querySelector(".q-photo-preview-container");
          if (prevCont) prevCont.style.display = "none";
          const fileInput = row.querySelector(".q-photo-file-input");
          if (fileInput) fileInput.value = "";
          const textSpan = row.querySelector(".upload-photo-text");
          if (textSpan) textSpan.innerText = "إرفاق صورة 🖼️";
        }
      }
    });

    // Question photo upload handler delegate
    qList?.addEventListener("change", async (e) => {
      const fileInput = e.target.closest(".q-photo-file-input");
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;
      const row = fileInput.closest(".question-row");
      const file = fileInput.files[0];
      const textSpan = row?.querySelector(".upload-photo-text");
      const origText = textSpan ? textSpan.innerText : "إرفاق صورة 🖼️";
      if (textSpan) textSpan.innerText = "جاري الرفع... ⏳";

      const formData = new FormData();
      formData.append("file", file);
      const token = state.token || localStorage.getItem("token");

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Authorization": "Bearer " + token },
          body: formData
        });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        if (data.url && row) {
          row.setAttribute("data-image-url", data.url);
          const prevCont = row.querySelector(".q-photo-preview-container");
          const prevImg = row.querySelector(".q-photo-img");
          if (prevImg) prevImg.src = data.url;
          if (prevCont) prevCont.style.display = "flex";
          if (textSpan) textSpan.innerText = "تغيير الصورة 🖼️";
          showToast("تم رفع صورة السؤال بنجاح! 🖼️", "success");
          if (window.lucide) window.lucide.createIcons();
        }
      } catch (err) {
        showToast("تعذر رفع الصورة، يرجى المحاولة مرة أخرى", "error");
        if (textSpan) textSpan.innerText = origText;
      }
    });

    document.getElementById("create-assignment-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        // Collect questions
        const questions = [];
        qList?.querySelectorAll(".question-row").forEach((row, i) => {
          const text = row.querySelector(".q-text")?.value.trim();
          const pointsVal = row.querySelector(".q-points")?.value.trim();
          const imageUrl = row.getAttribute("data-image-url") || undefined;
          if (text) {
            questions.push({
              id: 'q_' + (i + 1),
              text,
              points: pointsVal ? parseInt(pointsVal, 10) : undefined,
              imageUrl: imageUrl || undefined
            });
          }
        });

        if (questions.length === 0) {
          showToast("يرجى كتابة سؤال واحد على الأقل للواجب", "warning");
          return;
        }

        await apiFetch("/assignments", {
          method: "POST",
          body: JSON.stringify({
            title: document.getElementById("assignment-title").value,
            courseId: document.getElementById("assignment-course").value,
            lessonId: document.getElementById("assignment-lesson")?.value || null,
            description: document.getElementById("assignment-desc").value,
            questions,
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
        const id = btn.getAttribute("data-id");
        const asg = (this.assignments || []).find(a => String(a.id) === String(id));
        document.getElementById("submit-assignment-id").value = id;
        document.getElementById("submit-assignment-title").innerText = btn.getAttribute("data-title");

        const qPreview = document.getElementById("submit-assignment-questions-preview");
        const legacyGroup = document.getElementById("submit-legacy-group");

        if (qPreview) {
          if (asg && asg.questions && Array.isArray(asg.questions) && asg.questions.length > 0) {
            if (legacyGroup) legacyGroup.style.display = "none";
            qPreview.innerHTML = `
              <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:12px;">
                <div style="font-size:0.85rem; font-weight:800; color:var(--primary); display:flex; align-items:center; gap:6px;">
                  <i data-lucide="edit-3" style="width:16px;height:16px;"></i> يرجى كتابة إجابتك على كل سؤال من الأسئلة التالية:
                </div>
                ${asg.questions.map((q, idx) => `
                  <div class="student-q-ans-box" data-q-id="${q.id}" data-q-index="${idx + 1}" data-q-text="${(q.text || '').replace(/"/g, '&quot;')}" style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:12px; padding:12px 14px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:6px;">
                      <span style="font-weight:800; font-size:0.92rem; color:var(--text-main); line-height:1.4;">
                        <strong style="color:var(--primary);">س${idx + 1}:</strong> ${q.text}
                      </span>
                      ${q.points ? `<span class="badge" style="font-size:0.75rem; padding:2px 7px; background:var(--primary-glow); color:var(--primary); font-weight:800; flex-shrink:0;">${q.points} درجات</span>` : ''}
                    </div>
                    ${q.imageUrl ? `
                      <div style="margin:8px 0 10px 0;">
                        <img src="${q.imageUrl}" style="max-height:160px; max-width:100%; border-radius:8px; border:1px solid var(--border-color); cursor:pointer; background:#000; object-fit:contain;" onclick="window.open('${q.imageUrl}', '_blank')" title="انقر لفتح الصورة بحجم كامل 🔍" />
                        <span style="font-size:0.72rem; color:var(--text-muted); display:block; margin-top:2px;">(انقر على الصورة لفتحها بحجم كامل 🔍)</span>
                      </div>
                    ` : ''}
                    <label style="font-weight:700; font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">✍️ إجابتك التحريرية على هذا السؤال (Write your answer): <span style="color:var(--error);">*</span></label>
                    <textarea class="form-input student-q-ans-input" rows="2" placeholder="اكتب إجابتك التحريرية على السؤال هنا بالتفصيل..." style="padding:8px 10px; font-size:0.86rem; font-family:inherit; resize:vertical;" required></textarea>
                  </div>
                `).join('')}
                <div style="margin-top:2px;">
                  <label style="font-weight:700; font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">رابط ملف أو ملاحظات إضافية (اختياري):</label>
                  <input type="text" id="submit-extra-notes" class="form-input" placeholder="رابط مستند خارجي أو توضيحات إن وُجدت..." style="padding:8px 12px; font-size:0.84rem;">
                </div>
              </div>
            `;
            if (window.lucide) window.lucide.createIcons();
          } else {
            if (legacyGroup) legacyGroup.style.display = "block";
            const legInput = document.getElementById("submit-content");
            if (legInput) legInput.required = true;
            qPreview.innerHTML = asg && asg.description ? `
              <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:10px; padding:12px; margin-bottom:12px; font-size:0.85rem; color:var(--text-main); white-space:pre-wrap;">
                <strong>التعليمات والأسئلة:</strong>\n${asg.description}
              </div>
            ` : "";
          }
        }

        submitModal.style.display = "flex";
      });
    });

    document.getElementById("submit-assignment-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const id = document.getElementById("submit-assignment-id").value;
        const boxes = document.querySelectorAll("#submit-modal .student-q-ans-box");
        let payload = {};

        if (boxes.length > 0) {
          const answers = [];
          boxes.forEach(box => {
            answers.push({
              questionId: box.getAttribute("data-q-id"),
              questionIndex: parseInt(box.getAttribute("data-q-index"), 10),
              questionText: box.getAttribute("data-q-text"),
              answerText: box.querySelector(".student-q-ans-input")?.value.trim() || ""
            });
          });
          const extraNotes = document.getElementById("submit-extra-notes")?.value.trim();
          let content = answers.map(a => `س${a.questionIndex} (${a.questionText}):\n✍️ ${a.answerText}`).join('\n\n');
          if (extraNotes) content += `\n\n📌 رابط / ملاحظات: ${extraNotes}`;
          payload = { content, answers };
        } else {
          const content = document.getElementById("submit-content")?.value.trim();
          payload = { content };
        }

        await apiFetch(`/assignments/${id}/submit`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        showToast("Assignment submitted!", "success");
        submitModal.style.display = "none";
        await this.loadContent();
      } catch (err) {}
    });
    
    const gradingModal = document.getElementById("grading-modal");
    const closeGradingBtn = document.getElementById("close-grading-modal");
    const closeGradingBtn2 = document.getElementById("close-grading-modal-btn");
    closeGradingBtn?.addEventListener("click", () => { if (gradingModal) gradingModal.style.display = "none"; });
    closeGradingBtn2?.addEventListener("click", () => { if (gradingModal) gradingModal.style.display = "none"; });
    gradingModal?.addEventListener("click", (e) => {
      if (e.target === gradingModal) gradingModal.style.display = "none";
    });

    this.container.querySelectorAll(".view-submissions-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const listEl = document.getElementById("grading-modal-list");
        const titleEl = document.getElementById("grading-modal-title");
        if (titleEl) titleEl.innerText = "إجابات وتسليمات الطلاب (تصحيح الواجب)";
        if (listEl) listEl.innerHTML = `<div style="text-align:center; padding:30px;"><i data-lucide="loader" class="spinner" style="width:32px;height:32px;"></i></div>`;
        if (window.lucide) window.lucide.createIcons();
        if (gradingModal) gradingModal.style.display = "flex";

        try {
          const subs = await apiFetch(`/assignments/${id}/submissions`);
          if (!listEl) return;
          if (subs.length === 0) {
            listEl.innerHTML = `
              <div style="text-align:center; padding:36px 20px; color:var(--text-muted);">
                <i data-lucide="file-x" style="width:48px; height:48px; opacity:0.35; margin-bottom:12px;"></i>
                <h4 style="font-size:1.05rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">لم يقم أي طالب بتقديم إجابة لهذا الواجب حتى الآن</h4>
                <p style="font-size:0.85rem; line-height:1.6; max-width:460px; margin:0 auto 18px auto; color:var(--text-muted);">
                  لكي تتمكن من تصحيح الواجب ورصد الدرجة، يجب أن يقوم الطالب بالدخول وتسليم الحل أولاً. يمكنك أيضاً إنشاء تسليم تجريبي لتجربة واجهة التصحيح ورصد الدرجات الآن.
                </p>
                <button class="btn-secondary add-demo-sub-btn" style="font-size:0.84rem; padding:8px 18px; border-radius:10px; font-weight:700; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                  <i data-lucide="flask-conical" style="width:15px; height:15px; color:var(--primary);"></i> إنشاء إجابة تجريبية لتجربة التصحيح 🧪
                </button>
              </div>
            `;
            listEl.querySelector(".add-demo-sub-btn")?.addEventListener("click", async () => {
              try {
                await apiFetch(`/assignments/${id}/submit`, {
                  method: "POST",
                  body: JSON.stringify({
                    content: "إجابة نموذجية تجريبية لاختبار وتجربة ميزة تصحيح الواجبات ورصد الدرجات من قبل المعلم. تم حل جميع الأسئلة المطلوبة بالتفصيل."
                  })
                });
                showToast("تم إنشاء إجابة تجريبية بنجاح! يمكنك الآن تجربة تصحيحها ورصد الدرجة 🎯", "success");
                btn.click();
              } catch (demoErr) {
                showToast(demoErr.message || "تعذر إنشاء تسليم تجريبي", "error");
              }
            });
          } else {
            listEl.innerHTML = `
              <div style="display:flex; flex-direction:column; gap:14px;">
                ${subs.map(s => `
                  <div style="padding:16px; border-radius:14px; background:var(--bg-app); border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:14px;">
                    <div style="flex:1; min-width:240px;">
                      <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                        <strong style="font-size:0.98rem; color:var(--text-main);">${s.student?.name || 'طالب'}</strong>
                        <span style="font-size:0.75rem; color:var(--text-muted);">• ${new Date(s.submittedAt).toLocaleString('ar-EG')}</span>
                      </div>
                      
                      ${s.answers && Array.isArray(s.answers) && s.answers.length > 0 ? `
                        <div style="display:flex; flex-direction:column; gap:8px;">
                          ${s.answers.map(ans => `
                            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:10px; padding:10px 12px;">
                              <div style="font-weight:800; font-size:0.85rem; color:var(--primary); margin-bottom:4px;">
                                س${ans.questionIndex}: ${ans.questionText || ''}
                              </div>
                              <div style="font-size:0.88rem; color:var(--text-main); white-space:pre-wrap; line-height:1.5; background:var(--bg-app); padding:8px 10px; border-radius:8px; border:1px solid var(--border-color);">
                                ✍️ ${ans.answerText || 'لم يتم كتابة إجابة'}
                              </div>
                            </div>
                          `).join('')}
                          ${s.content && s.content.includes("📌 رابط / ملاحظات:") ? `
                            <div style="font-size:0.82rem; color:var(--text-muted); padding:6px 10px; background:var(--bg-card); border-radius:8px; border:1px solid var(--border-color);">
                              ${s.content.split("📌 رابط / ملاحظات:")[1]}
                            </div>
                          ` : ''}
                        </div>
                      ` : `
                        <div style="padding:10px 14px; background:var(--bg-card); border:1px solid var(--border-color); border-radius:10px; font-size:0.88rem; color:var(--text-main); white-space:pre-wrap; line-height:1.5;">${s.content}</div>
                      `}
                    </div>
                    <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-end; min-width:180px;">
                      ${s.grade !== null && s.grade !== undefined ? `
                        <span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-weight:800; font-size:0.84rem; padding:4px 10px; border-radius:8px;">✅ تم التصحيح: ${s.grade}/100</span>
                      ` : `
                        <span class="badge" style="background:rgba(245,158,11,0.15); color:#f59e0b; font-size:0.8rem; padding:4px 10px; border-radius:8px;">⏳ بانتظار التصحيح</span>
                      `}
                      <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
                        <input type="number" min="0" max="100" class="form-input asg-grade-input" data-sub-id="${s.id}" value="${s.grade !== null && s.grade !== undefined ? s.grade : ''}" placeholder="الدرجة" style="width:75px; padding:6px 8px; font-size:0.84rem; border-radius:8px; text-align:center; font-weight:800;">
                        <button class="btn-primary asg-save-grade-btn" data-sub-id="${s.id}" style="padding:6px 14px; font-size:0.8rem; border-radius:8px; font-weight:800; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
                          <i data-lucide="check" style="width:13px; height:13px;"></i> رصد الدرجة
                        </button>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `;

            listEl.querySelectorAll(".asg-save-grade-btn").forEach(saveBtn => {
              saveBtn.addEventListener("click", async () => {
                const subId = saveBtn.getAttribute("data-sub-id");
                const input = listEl.querySelector(`.asg-grade-input[data-sub-id="${subId}"]`);
                const val = input?.value?.trim();
                if (val === "" || isNaN(val)) {
                  showToast("يرجى إدخال درجة صحيحة بين 0 و 100", "warning");
                  return;
                }
                const numGrade = Math.min(100, Math.max(0, parseInt(val, 10)));
                saveBtn.disabled = true;
                try {
                  await apiFetch(`/submissions/${subId}/grade`, {
                    method: "PUT",
                    body: JSON.stringify({ grade: numGrade })
                  });
                  showToast(`تم تصحيح الواجب بنجاح وإشعار الطالب بالدرجة (${numGrade}/100)! 🏆`, "success");
                  btn.click();
                } catch (gradeErr) {
                  showToast(gradeErr.message || "فشل حفظ الدرجة", "error");
                  saveBtn.disabled = false;
                }
              });
            });
          }
          if (window.lucide) window.lucide.createIcons();
        } catch (err) {
          if (listEl) listEl.innerHTML = `<div style="color:var(--error); text-align:center; padding:20px;">تعذر تحميل تسليمات الطلاب</div>`;
        }
      });
    });
  }

  onDestroy() {}
}
