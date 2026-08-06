import { apiFetch, state, showToast, t } from "../app.js";

export default class TestsView {
  constructor(container) {
    this.container = container;
    this.tests = [];
    this.newQuestions = [];
  }

  async render() {
    try {
      if (!state.user) return;

      this.container.innerHTML = `
        <div style="max-width:1280px; margin:0 auto; padding:40px 24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px;">
            <h2 class="dashboard-section-title" style="font-size:2rem; margin:0;">
              <i data-lucide="check-square"></i> ${t("nav.tests")}
            </h2>
            ${state.user.role === 'teacher' || state.user.role === 'admin' ? 
              `<button class="btn-primary" id="open-test-modal-btn"><i data-lucide="plus"></i> Create Test</button>` : ''
            }
          </div>

          <div id="tests-content-area" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:24px;">
            <div style="text-align:center; padding:50px; grid-column: 1 / -1;">
              <i data-lucide="loader" class="spinner" style="width:40px;height:40px;border-width:3px;margin:0 auto;"></i>
            </div>
          </div>
        </div>

        <!-- Teacher Create Test Modal -->
        <div class="modal-overlay" id="test-modal" style="display:none; overflow-y:auto; padding:20px 0;">
          <div class="modal-content" style="max-width:600px; margin:auto;">
            <div class="modal-header">
              <h3 class="modal-title">Create Test</h3>
              <span class="modal-close-btn" id="close-test-modal">&times;</span>
            </div>
            <form id="create-test-form">
              <div class="modal-body">
                <div class="form-group">
                  <label>Test Title</label>
                  <input type="text" id="test-title" class="form-input" required>
                </div>
                <div class="form-group">
                  <label>Course</label>
                  <select id="test-course" class="form-select" required></select>
                </div>
                
                <hr style="margin:20px 0; border:none; border-top:1px solid var(--border-color);">
                <h4>Questions</h4>
                <div id="questions-list" style="margin-bottom:16px;"></div>
                
                <div class="glass-card" style="padding:16px; margin-bottom:16px; border:1px solid var(--primary);">
                  <div class="form-group">
                    <label>Question Text</label>
                    <input type="text" id="q-text" class="form-input">
                  </div>
                  <div class="form-group">
                    <label>Option A</label>
                    <input type="text" id="q-opt-a" class="form-input">
                  </div>
                  <div class="form-group">
                    <label>Option B</label>
                    <input type="text" id="q-opt-b" class="form-input">
                  </div>
                  <div class="form-group">
                    <label>Option C</label>
                    <input type="text" id="q-opt-c" class="form-input">
                  </div>
                  <div class="form-group">
                    <label>Option D</label>
                    <input type="text" id="q-opt-d" class="form-input">
                  </div>
                  <div class="form-group">
                    <label>Correct Answer</label>
                    <select id="q-correct" class="form-select">
                      <option value="A">Option A</option>
                      <option value="B">Option B</option>
                      <option value="C">Option C</option>
                      <option value="D">Option D</option>
                    </select>
                  </div>
                  <button type="button" class="btn-secondary" id="add-question-btn" style="width:100%; justify-content:center;">Add Question to Test</button>
                </div>

              </div>
              <div class="modal-footer">
                <button type="button" class="btn-secondary" id="cancel-test-modal">Cancel</button>
                <button type="submit" class="btn-primary">Publish Test</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Student Take Test Modal -->
        <div class="modal-overlay" id="take-test-modal" style="display:none; overflow-y:auto; padding:20px 0;">
          <div class="modal-content" style="max-width:700px; margin:auto;">
            <div class="modal-header">
              <h3 class="modal-title" id="take-test-title">Take Test</h3>
              <span class="modal-close-btn" id="close-take-test-modal">&times;</span>
            </div>
            <form id="take-test-form">
              <div class="modal-body" id="take-test-questions-area">
                <div style="text-align:center;"><i data-lucide="loader" class="spinner"></i> Loading questions...</div>
              </div>
              <input type="hidden" id="take-test-id">
              <div class="modal-footer">
                <button type="button" class="btn-secondary" id="cancel-take-test-modal">Cancel</button>
                <button type="submit" class="btn-primary">Submit Test</button>
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
      this.tests = await apiFetch("/tests");
      const contentArea = this.container.querySelector("#tests-content-area");

      if (this.tests.length === 0) {
        contentArea.innerHTML = `<div class="glass-card" style="text-align:center; padding: 40px; color:var(--text-muted); grid-column: 1 / -1;">No tests found.</div>`;
      } else {
        contentArea.innerHTML = this.tests.map(t => this.renderTestCard(t)).join("");
      }

      if (state.user.role === 'teacher' || state.user.role === 'admin') {
        const courses = await apiFetch("/courses").then(res => res.filter(c => c.teacher?.id === state.user.id || state.user.role === 'admin'));
        const select = document.getElementById("test-course");
        if (select) {
          select.innerHTML = `<option value="">Select Course</option>` + courses.map(c => `<option value="${c.id}">${c.title}</option>`).join("");
        }
      }

      if (window.lucide) window.lucide.createIcons();
      this.bindEvents();
    } catch (error) {
      console.error(error);
    }
  }

  renderTestCard(test) {
    const isTeacher = state.user.role === 'teacher' || state.user.role === 'admin';
    let action = "";

    if (isTeacher) {
      action = `<div style="color:var(--text-muted); font-size:0.9rem; margin-top:12px;">${test.questions?.length || 0} Questions</div>`;
    } else {
      if (test.attempt) {
        const passed = test.attempt.score >= 50;
        action = `
          <div style="background:var(--bg-app); padding:12px; border-radius:8px; border:1px solid var(--border-color); text-align:center; font-size:1.2rem; margin-top:12px;">
            <span style="color:${passed ? 'var(--success)' : 'var(--error)'}; font-weight:700;">Score: ${test.attempt.score}%</span>
          </div>
        `;
      } else {
        action = `<button class="btn-primary take-test-btn" data-id="${test.id}" data-title="${test.title}" style="width:100%; justify-content:center; margin-top:12px;">
          <i data-lucide="play-circle"></i> Start Test
        </button>`;
      }
    }

    return `
      <div class="glass-card" style="padding:20px; display:flex; flex-direction:column;">
        <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:12px;">
          <span class="session-tag" style="background:var(--primary-glow); color:var(--primary);">${test.course?.title}</span>
        </div>
        <h4 style="font-size:1.2rem; margin-bottom:8px;">${test.title}</h4>
        <div style="margin-top:auto;">
          ${action}
        </div>
      </div>
    `;
  }

  renderNewQuestionsList() {
    const list = document.getElementById("questions-list");
    if (!list) return;
    if (this.newQuestions.length === 0) {
      list.innerHTML = `<div style="color:var(--text-muted); font-size:0.85rem;">No questions added yet.</div>`;
      return;
    }
    list.innerHTML = this.newQuestions.map((q, i) => `
      <div style="background:var(--bg-app); padding:12px; border-radius:8px; margin-bottom:8px; border:1px solid var(--border-color);">
        <strong>Q${i+1}: ${q.questionText}</strong>
        <div style="font-size:0.85rem; color:var(--success); margin-top:4px;">Ans: ${q.correctAnswer}</div>
      </div>
    `).join("");
  }

  bindEvents() {
    // Teacher Create Flow
    const createModal = document.getElementById("test-modal");
    document.getElementById("open-test-modal-btn")?.addEventListener("click", () => { 
      this.newQuestions = [];
      this.renderNewQuestionsList();
      createModal.style.display = "flex"; 
    });
    document.getElementById("close-test-modal")?.addEventListener("click", () => { createModal.style.display = "none"; });
    document.getElementById("cancel-test-modal")?.addEventListener("click", () => { createModal.style.display = "none"; });

    document.getElementById("add-question-btn")?.addEventListener("click", () => {
      const qText = document.getElementById("q-text").value;
      const optA = document.getElementById("q-opt-a").value;
      const optB = document.getElementById("q-opt-b").value;
      const optC = document.getElementById("q-opt-c").value;
      const optD = document.getElementById("q-opt-d").value;
      const correct = document.getElementById("q-correct").value;

      if(!qText || !optA || !optB || !optC || !optD) {
        showToast("Please fill all options", "error");
        return;
      }

      // Map correct letter to actual value
      let correctVal = optA;
      if (correct === 'B') correctVal = optB;
      if (correct === 'C') correctVal = optC;
      if (correct === 'D') correctVal = optD;

      this.newQuestions.push({
        questionText: qText,
        options: [optA, optB, optC, optD],
        correctAnswer: correctVal
      });

      this.renderNewQuestionsList();
      
      // Clear fields
      document.getElementById("q-text").value = "";
      document.getElementById("q-opt-a").value = "";
      document.getElementById("q-opt-b").value = "";
      document.getElementById("q-opt-c").value = "";
      document.getElementById("q-opt-d").value = "";
    });

    document.getElementById("create-test-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if(this.newQuestions.length === 0) {
        showToast("Add at least 1 question", "error");
        return;
      }
      try {
        await apiFetch("/tests", {
          method: "POST",
          body: JSON.stringify({
            title: document.getElementById("test-title").value,
            courseId: document.getElementById("test-course").value,
            questions: this.newQuestions
          })
        });
        showToast("Test published!", "success");
        createModal.style.display = "none";
        await this.loadContent();
      } catch (err) {}
    });

    // Student Take Flow
    const takeModal = document.getElementById("take-test-modal");
    document.getElementById("close-take-test-modal")?.addEventListener("click", () => { takeModal.style.display = "none"; });
    document.getElementById("cancel-take-test-modal")?.addEventListener("click", () => { takeModal.style.display = "none"; });

    this.container.querySelectorAll(".take-test-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        document.getElementById("take-test-id").value = id;
        document.getElementById("take-test-title").innerText = btn.getAttribute("data-title");
        takeModal.style.display = "flex";

        try {
          const questions = await apiFetch(`/tests/${id}/questions`);
          const area = document.getElementById("take-test-questions-area");
          if(questions.length === 0) {
            area.innerHTML = "<p>No questions found for this test.</p>";
            return;
          }

          area.innerHTML = questions.map((q, i) => `
            <div style="margin-bottom:24px;">
              <h4 style="margin-bottom:12px;">${i+1}. ${q.questionText}</h4>
              <div style="display:flex; flex-direction:column; gap:8px;">
                ${q.options.map(opt => `
                  <label style="display:flex; align-items:center; gap:8px; background:var(--bg-card); padding:10px; border-radius:8px; border:1px solid var(--border-color); cursor:pointer;">
                    <input type="radio" name="q-${q.id}" value="${opt}" required>
                    ${opt}
                  </label>
                `).join("")}
              </div>
            </div>
          `).join("");
        } catch (err) {
          document.getElementById("take-test-questions-area").innerHTML = `<p style="color:var(--error)">Failed to load questions.</p>`;
        }
      });
    });

    document.getElementById("take-test-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("take-test-id").value;
      const formData = new FormData(e.target);
      const answers = {};
      
      for (let [key, value] of formData.entries()) {
        if (key.startsWith('q-')) {
          const qId = key.replace('q-', '');
          answers[qId] = value;
        }
      }

      try {
        const result = await apiFetch(`/tests/${id}/submit`, {
          method: "POST",
          body: JSON.stringify({ answers })
        });
        showToast(`Test submitted! Score: ${result.score}%`, "success");
        takeModal.style.display = "none";
        await this.loadContent();
      } catch (err) {}
    });
  }

  onDestroy() {}
}
