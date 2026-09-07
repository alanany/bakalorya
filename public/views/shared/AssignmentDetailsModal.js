/**
 * AssignmentDetailsModal.js
 * Teacher Assignment Details & Management Modal:
 * - View full assignment metadata (title, due date, total points, question count, group/course)
 * - View each question in detail (type, points, prompt, options/correct answers, explanations, attachments)
 * - Teacher Actions:
 *   * "تعديل الواجب" (Edit Assignment) -> Opens edit builder
 *   * "حذف الواجب" (Delete Assignment) -> Destructive confirmation with API DELETE call
 *   * "تصحيح الإجابات" (Grade Submissions) -> Direct CTA to AssignmentGradingModal
 */

import { apiFetch, showToast, confirmDialog } from "../../app.js";
import { AssignmentGradingModal } from "./AssignmentGradingModal.js";

export class AssignmentDetailsModal {
  constructor(assignment, onUpdatedCallback = null) {
    this.assignment = assignment;
    this.onUpdatedCallback = onUpdatedCallback;
    this.modalEl = null;
  }

  open() {
    this.modalEl = document.createElement("div");
    this.modalEl.id = "assignment-details-view-modal";
    this.modalEl.style.cssText = "position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(6px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;";

    this.renderView();
    document.body.appendChild(this.modalEl);
    if (window.lucide) window.lucide.createIcons();

    this.modalEl.addEventListener("click", (e) => {
      if (e.target === this.modalEl) this.close();
    });
  }

  close() {
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
  }

  renderView() {
    const asgn = this.assignment;
    const questions = Array.isArray(asgn.questions) ? asgn.questions : [];
    const dueDate = asgn.dueDate ? new Date(asgn.dueDate) : null;
    const isExpired = dueDate && dueDate.getTime() < Date.now();
    const totalPts = asgn.totalPoints || 100;

    this.modalEl.innerHTML = `
      <div class="glass-card" style="background:var(--bg-card); border-radius:24px; width:100%; max-width:840px; max-height:92vh; display:flex; flex-direction:column; border:1px solid var(--border-color); font-family:'Cairo', sans-serif; box-shadow:0 24px 60px rgba(0,0,0,0.4); overflow:hidden;">
        
        <!-- Header -->
        <div style="padding:18px 24px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background:var(--bg-app); flex-shrink:0;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:42px; height:42px; border-radius:12px; background:var(--primary-glow); color:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:900;">
              <i data-lucide="file-text" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <h3 style="margin:0; font-size:1.15rem; font-weight:900; color:var(--text-main);">
                تفاصيل الواجب ونماذج الأسئلة 📋
              </h3>
              <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">
                إدارة أسئلة المهمة، التعديل، والحذف
              </div>
            </div>
          </div>

          <button id="close-asgn-details-btn" style="background:transparent; border:none; color:var(--text-muted); font-size:1.6rem; cursor:pointer; padding:4px 8px; border-radius:8px;">
            &times;
          </button>
        </div>

        <!-- Scrollable Content -->
        <div style="flex:1; overflow-y:auto; padding:24px; display:flex; flex-direction:column; gap:20px;">
          
          <!-- Assignment Meta Card -->
          <div class="glass-card" style="padding:20px; border-radius:18px; border:1px solid var(--border-color); background:var(--bg-app); display:flex; flex-direction:column; gap:14px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
              <div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                  <span class="badge" style="background:rgba(99,102,241,0.12); color:var(--primary); font-size:0.75rem; font-weight:800;">
                    ${asgn.course?.title ? asgn.course.title : 'واجب دراسي'}
                  </span>
                  ${asgn.group?.name ? `<span class="badge" style="background:rgba(16,185,129,0.12); color:#10b981; font-size:0.75rem; font-weight:800;">مجموعة: ${asgn.group.name}</span>` : ''}
                  ${asgn.lesson?.title ? `<span class="badge" style="background:rgba(245,158,11,0.12); color:#f59e0b; font-size:0.75rem; font-weight:800;">📌 ${asgn.lesson.title}</span>` : ''}
                </div>
                <h2 style="font-size:1.25rem; font-weight:900; color:var(--text-main); margin:0; line-height:1.4;">
                  ${asgn.title}
                </h2>
              </div>

              <!-- Points and Count Ribbon -->
              <div style="display:flex; gap:10px;">
                <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:12px; padding:8px 14px; text-align:center;">
                  <div style="font-size:0.72rem; color:var(--text-muted); font-weight:800;">إجمالي الدرجات</div>
                  <div style="font-size:1.15rem; font-weight:900; color:var(--primary);">${totalPts}</div>
                </div>
                <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:12px; padding:8px 14px; text-align:center;">
                  <div style="font-size:0.72rem; color:var(--text-muted); font-weight:800;">عدد الأسئلة</div>
                  <div style="font-size:1.15rem; font-weight:900; color:var(--text-main);">${questions.length}</div>
                </div>
              </div>
            </div>

            ${asgn.description ? `
              <div style="font-size:0.88rem; color:var(--text-muted); line-height:1.6; white-space:pre-wrap; background:var(--bg-card); padding:12px 14px; border-radius:12px; border:1px solid var(--border-color);">
                <strong style="color:var(--text-main);">التعليمات:</strong> ${asgn.description}
              </div>
            ` : ''}

            <!-- Deadline Pill -->
            <div style="display:flex; align-items:center; gap:8px; font-size:0.85rem; font-weight:800; color:${isExpired ? '#ef4444' : 'var(--text-main)'};">
              <i data-lucide="clock" style="width:16px; height:16px;"></i>
              <span>آخر موعد للتسليم:</span>
              <span>${dueDate ? dueDate.toLocaleString('ar-EG', { weekday:'long', year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : 'غير محدد'}</span>
              ${isExpired ? `<span class="badge" style="background:rgba(239,68,68,0.12); color:#ef4444; font-size:0.72rem;">انتهى الموعد</span>` : ''}
            </div>
          </div>

          <!-- Questions List Section -->
          <div style="display:flex; flex-direction:column; gap:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h4 style="margin:0; font-size:1.02rem; font-weight:900; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                <i data-lucide="list-checks" style="width:18px; height:18px; color:var(--primary);"></i>
                أسئلة الواجب التفصيلية (${questions.length} أسئلة):
              </h4>
            </div>

            ${questions.length === 0 ? `
              <div style="text-align:center; padding:30px; color:var(--text-muted); background:var(--bg-app); border-radius:14px; border:1px solid var(--border-color);">
                لا توجد أسئلة مقسمة لهذا الواجب (واجب نصي مفتوح)
              </div>
            ` : questions.map((q, idx) => {
              const isMcq = q.type === 'mcq';
              const isFile = q.type === 'file';

              return `
                <div class="glass-card" style="padding:16px 20px; border-radius:16px; border:1px solid var(--border-color); background:var(--bg-app); display:flex; flex-direction:column; gap:10px;">
                  
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                    <div style="font-weight:900; font-size:0.95rem; color:var(--text-main); line-height:1.4;">
                      <span style="color:var(--primary);">س${idx + 1}</span>: ${q.text}
                    </div>

                    <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                      <span class="badge" style="font-size:0.75rem; font-weight:800; background:rgba(99,102,241,0.1); color:var(--primary);">
                        ${isMcq ? 'اختيار من متعدد (آلي)' : isFile ? 'رفع ملف' : 'سؤال مقالي'}
                      </span>
                      <span class="badge" style="font-size:0.75rem; font-weight:800; background:var(--primary-glow); color:var(--primary);">
                        ${q.points || 10} درجات
                      </span>
                    </div>
                  </div>

                  ${q.imageUrl ? `
                    <div style="margin:4px 0;">
                      <img src="${q.imageUrl}" style="max-height:140px; max-width:100%; border-radius:8px; border:1px solid var(--border-color); cursor:pointer;" onclick="window.open('${q.imageUrl}', '_blank')" />
                    </div>
                  ` : ''}

                  <!-- MCQ Options if present -->
                  ${isMcq && Array.isArray(q.options) ? `
                    <div style="display:flex; flex-direction:column; gap:6px; background:var(--bg-card); padding:10px 14px; border-radius:12px; border:1px solid var(--border-color);">
                      <div style="font-size:0.75rem; font-weight:800; color:var(--text-muted); margin-bottom:2px;">الخيارات ونموذج الإجابة:</div>
                      ${q.options.map((opt, oIdx) => `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; border-radius:8px; font-size:0.86rem; ${opt.isCorrect ? 'background:rgba(16,185,129,0.12); border:1px solid #10b981; font-weight:800; color:#10b981;' : 'background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-main);'}">
                          <span>${opt.text}</span>
                          ${opt.isCorrect ? '<span style="font-size:0.75rem;">✅ الإجابة الصحيحة</span>' : ''}
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}

                  ${q.explanation ? `
                    <div style="font-size:0.82rem; color:var(--text-muted); background:var(--bg-card); padding:8px 12px; border-radius:10px; border:1px solid var(--border-color);">
                      <strong style="color:var(--primary);">💡 الشرح التفسيري للطلاب:</strong> ${q.explanation}
                    </div>
                  ` : ''}

                </div>
              `;
            }).join('')}
          </div>

        </div>

        <!-- Footer Actions -->
        <div style="padding:16px 24px; border-top:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; background:var(--bg-app); flex-shrink:0;">
          
          <button id="delete-assignment-btn" class="btn-secondary" style="color:#ef4444; border-color:rgba(239,68,68,0.3); padding:9px 18px; border-radius:12px; font-weight:800; font-size:0.86rem; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
            <i data-lucide="trash-2" style="width:16px; height:16px;"></i>
            <span>حذف الواجب 🗑️</span>
          </button>

          <div style="display:flex; gap:10px;">
            <button id="edit-assignment-btn" class="btn-secondary" style="padding:9px 18px; border-radius:12px; font-weight:800; font-size:0.86rem; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
              <i data-lucide="edit-3" style="width:16px; height:16px;"></i>
              <span>تعديل الأسئلة والواجب ✍️</span>
            </button>

            <button id="grade-from-details-btn" class="btn-primary" style="padding:9px 22px; border-radius:12px; font-weight:900; font-size:0.88rem; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
              <i data-lucide="check-square" style="width:16px; height:16px;"></i>
              <span>تصحيح إجابات الطلاب 🎯</span>
            </button>
          </div>

        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.bindEvents();
  }

  bindEvents() {
    this.modalEl.querySelector("#close-asgn-details-btn")?.addEventListener("click", () => this.close());

    // Grade CTA
    this.modalEl.querySelector("#grade-from-details-btn")?.addEventListener("click", () => {
      this.close();
      const modal = new AssignmentGradingModal(
        this.assignment.id,
        this.assignment.title,
        this.assignment.totalPoints || 100,
        this.onUpdatedCallback
      );
      modal.open();
    });

    // Delete CTA
    this.modalEl.querySelector("#delete-assignment-btn")?.addEventListener("click", async () => {
      const ok = await confirmDialog({
        title: "حذف الواجب الدراسي",
        message: `هل أنت متأكد من رغبتك في حذف واجب "${this.assignment.title}" نهائياً؟ سيتم حذف جميع تسليمات وإجابات الطلاب المرتبطة به.`,
        confirmText: "نعم، احذف الواجب",
        isDestructive: true
      });
      if (!ok) return;

      try {
        await apiFetch(`/assignments/${this.assignment.id}`, { method: "DELETE" });
        showToast("تم حذف الواجب بنجاح! 🗑️", "success");
        this.close();
        if (this.onUpdatedCallback) this.onUpdatedCallback();
      } catch (err) {
        showToast(err.message || "فشل حذف الواجب.", "error");
      }
    });

    // Edit CTA
    this.modalEl.querySelector("#edit-assignment-btn")?.addEventListener("click", () => {
      this.renderEditMode();
    });
  }

  renderEditMode() {
    const asgn = this.assignment;
    const questions = Array.isArray(asgn.questions) ? [...asgn.questions] : [];
    const minDate = new Date().toISOString().slice(0, 16);
    const dueDateVal = asgn.dueDate ? new Date(asgn.dueDate).toISOString().slice(0, 16) : '';

    this.modalEl.innerHTML = `
      <div class="glass-card" style="background:var(--bg-card); border-radius:24px; width:100%; max-width:840px; max-height:92vh; display:flex; flex-direction:column; border:1px solid var(--border-color); font-family:'Cairo', sans-serif; box-shadow:0 24px 60px rgba(0,0,0,0.4); overflow:hidden;">
        
        <!-- Header -->
        <div style="padding:18px 24px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background:var(--bg-app); flex-shrink:0;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:38px; height:38px; border-radius:10px; background:var(--primary-glow); color:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:900;">
              <i data-lucide="edit" style="width:20px; height:20px;"></i>
            </div>
            <div>
              <h3 style="font-size:1.15rem; font-weight:900; color:var(--text-main); margin:0;">تعديل بيانات وأسئلة الواجب ✍️</h3>
              <div style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">تحديث نص الأسئلة، الخيارات الصحيحة، وموعد التسليم</div>
            </div>
          </div>
          <button id="close-edit-asgn-btn" style="background:transparent; border:none; color:var(--text-muted); font-size:1.6rem; cursor:pointer;">&times;</button>
        </div>

        <form id="edit-assignment-form" style="display:flex; flex-direction:column; flex:1; overflow:hidden;">
          <div style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:16px;">
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
              <div>
                <label style="display:block; font-size:0.82rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">عنوان الواجب: <span style="color:#ef4444;">*</span></label>
                <input type="text" id="edit-asgn-title" required value="${(asgn.title || '').replace(/"/g, '&quot;')}"
                  style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-family:'Cairo', sans-serif; font-size:0.88rem; box-sizing:border-box;">
              </div>

              <div>
                <label style="display:block; font-size:0.82rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">آخر موعد لتسليم الواجب: <span style="color:#ef4444;">*</span></label>
                <input type="datetime-local" id="edit-asgn-due" value="${dueDateVal}" required
                  style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-family:'Cairo', sans-serif; font-size:0.88rem; box-sizing:border-box;">
              </div>
            </div>

            <div>
              <label style="display:block; font-size:0.82rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">تعليمات وإرشادات عامة:</label>
              <textarea id="edit-asgn-desc" rows="2"
                style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-family:'Cairo', sans-serif; font-size:0.86rem; box-sizing:border-box;">${asgn.description || ''}</textarea>
            </div>

            <!-- Questions Builder Section -->
            <div style="border-top:1px solid var(--border-color); padding-top:14px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                <div style="font-weight:900; font-size:0.95rem; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                  <i data-lucide="help-circle" style="width:17px; height:17px; color:var(--primary);"></i>
                  <span>تعديل الأسئلة:</span>
                </div>

                <div style="display:flex; gap:6px;">
                  <button type="button" class="edit-add-q-btn btn-secondary" data-type="mcq" style="font-size:0.75rem; padding:5px 10px; border-radius:8px; font-weight:800; cursor:pointer;">+ MCQ</button>
                  <button type="button" class="edit-add-q-btn btn-secondary" data-type="essay" style="font-size:0.75rem; padding:5px 10px; border-radius:8px; font-weight:800; cursor:pointer;">+ مقالي</button>
                  <button type="button" class="edit-add-q-btn btn-secondary" data-type="file" style="font-size:0.75rem; padding:5px 10px; border-radius:8px; font-weight:800; cursor:pointer;">+ ملف</button>
                </div>
              </div>

              <div id="edit-questions-container" style="display:flex; flex-direction:column; gap:12px;"></div>
            </div>

          </div>

          <!-- Footer -->
          <div style="padding:14px 24px; border-top:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background:var(--bg-app); flex-shrink:0;">
            <div style="font-size:0.85rem; font-weight:800; color:var(--text-muted);">
              إجمالي الدرجات: <span id="edit-total-points-badge" style="color:var(--primary); font-weight:900;">0 درجة</span>
            </div>
            <div style="display:flex; gap:10px;">
              <button type="button" id="cancel-edit-form-btn" class="btn-secondary" style="padding:9px 18px; border-radius:12px; font-weight:800; font-size:0.85rem;">رجوع</button>
              <button type="submit" id="save-edit-submit-btn" class="btn-primary" style="padding:9px 24px; border-radius:12px; font-weight:900; font-size:0.88rem; display:inline-flex; align-items:center; gap:6px;">
                <i data-lucide="check" style="width:15px; height:15px;"></i>
                <span>حفظ التعديلات ✅</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    this.modalEl.querySelector("#close-edit-asgn-btn")?.addEventListener("click", () => this.close());
    this.modalEl.querySelector("#cancel-edit-form-btn")?.addEventListener("click", () => this.renderView());

    const editContainer = this.modalEl.querySelector("#edit-questions-container");
    const totalPointsBadge = this.modalEl.querySelector("#edit-total-points-badge");

    const updateTotalPoints = () => {
      let sum = 0;
      editContainer.querySelectorAll(".edit-q-points").forEach(inp => {
        const val = parseFloat(inp.value);
        if (!isNaN(val)) sum += val;
      });
      if (totalPointsBadge) totalPointsBadge.innerText = `${sum} درجة`;
    };

    const renderEditQuestionRow = (qData, index) => {
      const type = qData.type || 'essay';
      const qId = qData.id || ('q_' + Date.now() + '_' + Math.floor(Math.random() * 1000));
      const isMcq = type === 'mcq';
      const isFile = type === 'file';

      const div = document.createElement("div");
      div.className = "edit-question-card";
      div.setAttribute("data-q-id", qId);
      div.setAttribute("data-q-type", type);
      if (qData.imageUrl) div.setAttribute("data-image-url", qData.imageUrl);
      div.style.cssText = "border:1px solid var(--border-color); border-radius:14px; background:var(--bg-app); padding:14px 16px; display:flex; flex-direction:column; gap:10px;";

      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="edit-q-num" style="font-weight:900; font-size:0.88rem; color:var(--primary);">س${index}</span>
            <span class="badge" style="font-size:0.72rem; font-weight:800; background:rgba(99,102,241,0.1); color:var(--primary);">
              ${isMcq ? 'اختيار من متعدد' : isFile ? 'رفع ملف' : 'سؤال مقالي'}
            </span>
          </div>

          <div style="display:flex; align-items:center; gap:10px;">
            <div style="display:flex; align-items:center; gap:4px;">
              <span style="font-size:0.75rem; color:var(--text-muted); font-weight:800;">الدرجة:</span>
              <input type="number" min="1" max="100" class="edit-q-points form-input" value="${qData.points || 10}" style="width:60px; padding:4px 6px; text-align:center; font-weight:800; font-size:0.82rem; border-radius:8px; height:28px;">
            </div>
            <button type="button" class="remove-edit-q-btn" style="background:transparent; border:none; color:#ef4444; cursor:pointer; padding:4px;">
              <i data-lucide="trash-2" style="width:15px; height:15px;"></i>
            </button>
          </div>
        </div>

        <div>
          <input type="text" class="edit-q-text form-input" required placeholder="اكتب نص السؤال هنا..." value="${(qData.text || '').replace(/"/g, '&quot;')}"
            style="width:100%; padding:8px 12px; font-size:0.85rem; border-radius:10px; border:1px solid var(--border-color); background:var(--bg-card); color:var(--text-main); box-sizing:border-box;">
        </div>

        <!-- Question Photo Upload & Preview -->
        <div class="edit-q-photo-row" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <label class="btn-secondary edit-q-photo-label" style="font-size:0.75rem; padding:4px 10px; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-weight:700;">
            <i data-lucide="image" style="width:13px; height:13px;"></i>
            <span class="edit-q-photo-text">${qData.imageUrl ? 'تغيير صورة السؤال 🖼️' : 'إرفاق صورة 🖼️'}</span>
            <input type="file" class="edit-q-photo-input" accept="image/*" style="display:none;">
          </label>
          <div class="edit-q-photo-preview" style="${qData.imageUrl ? 'display:inline-flex;' : 'display:none;'} align-items:center; gap:6px; background:var(--bg-card); padding:4px 8px; border-radius:8px; border:1px solid var(--border-color);">
            <img src="${qData.imageUrl || ''}" class="edit-q-photo-img" style="max-height:48px; max-width:80px; border-radius:4px; object-fit:contain; background:#000;" />
            <button type="button" class="remove-edit-q-photo-btn" style="background:none; border:none; color:#ef4444; font-size:0.75rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:2px;">
              <i data-lucide="x" style="width:12px; height:12px;"></i> حذف
            </button>
          </div>
        </div>

        ${isMcq ? `
          <div class="edit-mcq-options-container" style="display:flex; flex-direction:column; gap:6px; background:var(--bg-card); padding:10px 12px; border-radius:10px; border:1px solid var(--border-color);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
              <span style="font-size:0.76rem; font-weight:800; color:var(--text-muted);">الخيارات (حدد الخيار الصحيح):</span>
              <button type="button" class="add-edit-mcq-opt-btn btn-secondary" style="font-size:0.72rem; padding:3px 8px; border-radius:6px; cursor:pointer;">+ خيار إضافي</button>
            </div>

            <div class="edit-mcq-options-list" style="display:flex; flex-direction:column; gap:6px;">
              ${(qData.options && qData.options.length > 0 ? qData.options : [
                { id:'opt_1', text:'', isCorrect:true },
                { id:'opt_2', text:'', isCorrect:false }
              ]).map((opt, optIdx) => `
                <div class="edit-mcq-opt-row" style="display:flex; align-items:center; gap:8px;">
                  <input type="radio" name="edit_mcq_correct_${qId}" class="edit-mcq-is-correct-radio" ${opt.isCorrect ? 'checked' : ''} style="cursor:pointer;" title="تحديد كإجابة صحيحة">
                  <input type="text" class="edit-mcq-opt-text form-input" required placeholder="الخيار ${optIdx + 1}..." value="${(opt.text || '').replace(/"/g, '&quot;')}" style="flex:1; padding:6px 10px; font-size:0.82rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main);">
                  ${optIdx >= 2 ? `<button type="button" class="remove-opt-btn" style="background:transparent; border:none; color:#ef4444; cursor:pointer; font-size:0.9rem;">&times;</button>` : ''}
                </div>
              `).join('')}
            </div>

            <div style="margin-top:4px;">
              <input type="text" class="edit-mcq-explanation form-input" placeholder="شرح وتفسير الإجابة الصحيحة (اختياري)..." value="${(qData.explanation || '').replace(/"/g, '&quot;')}"
                style="width:100%; padding:6px 10px; font-size:0.8rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); box-sizing:border-box;">
            </div>
          </div>
        ` : ''}
      `;

      if (window.lucide) window.lucide.createIcons();

      div.querySelector(".remove-edit-q-btn")?.addEventListener("click", () => {
        div.remove();
        editContainer.querySelectorAll(".edit-question-card").forEach((card, i) => {
          const numSpan = card.querySelector(".edit-q-num");
          if (numSpan) numSpan.innerText = `س${i + 1}`;
        });
        updateTotalPoints();
      });

      div.querySelector(".edit-q-points")?.addEventListener("input", updateTotalPoints);

      div.querySelectorAll(".remove-opt-btn").forEach(btn => {
        btn.addEventListener("click", () => btn.closest(".edit-mcq-opt-row")?.remove());
      });

      div.querySelector(".add-edit-mcq-opt-btn")?.addEventListener("click", () => {
        const optList = div.querySelector(".edit-mcq-options-list");
        if (optList) {
          const row = document.createElement("div");
          row.className = "edit-mcq-opt-row";
          row.style.cssText = "display:flex; align-items:center; gap:8px;";
          row.innerHTML = `
            <input type="radio" name="edit_mcq_correct_${qId}" class="edit-mcq-is-correct-radio" style="cursor:pointer;" title="تحديد كإجابة صحيحة">
            <input type="text" class="edit-mcq-opt-text form-input" required placeholder="خيار جديد..." style="flex:1; padding:6px 10px; font-size:0.82rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main);">
            <button type="button" class="remove-opt-btn" style="background:transparent; border:none; color:#ef4444; cursor:pointer; font-size:0.9rem;">&times;</button>
          `;
          row.querySelector(".remove-opt-btn").addEventListener("click", () => row.remove());
          optList.appendChild(row);
        }
      });

      // Question photo upload and remove handlers
      const fileInput = div.querySelector(".edit-q-photo-input");
      const previewCont = div.querySelector(".edit-q-photo-preview");
      const previewImg = div.querySelector(".edit-q-photo-img");
      const photoText = div.querySelector(".edit-q-photo-text");
      const removePhotoBtn = div.querySelector(".remove-edit-q-photo-btn");

      removePhotoBtn?.addEventListener("click", () => {
        div.removeAttribute("data-image-url");
        if (previewCont) previewCont.style.display = "none";
        if (fileInput) fileInput.value = "";
        if (photoText) photoText.innerText = "إرفاق صورة 🖼️";
      });

      fileInput?.addEventListener("change", async () => {
        if (!fileInput.files || fileInput.files.length === 0) return;
        const file = fileInput.files[0];
        const origText = photoText ? photoText.innerText : "إرفاق صورة 🖼️";
        if (photoText) photoText.innerText = "جاري الرفع... ⏳";

        const formData = new FormData();
        formData.append("file", file);
        const token = localStorage.getItem("token") || (window.state && window.state.token);

        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Authorization": "Bearer " + token },
            body: formData
          });
          if (!res.ok) throw new Error("Upload failed");
          const data = await res.json();
          if (data.url) {
            div.setAttribute("data-image-url", data.url);
            if (previewImg) previewImg.src = data.url;
            if (previewCont) previewCont.style.display = "inline-flex";
            if (photoText) photoText.innerText = "تغيير صورة السؤال 🖼️";
            showToast("تم رفع صورة السؤال بنجاح! 🖼️", "success");
            if (window.lucide) window.lucide.createIcons();
          }
        } catch (err) {
          showToast("تعذر رفع الصورة، يرجى المحاولة مرة أخرى", "error");
          if (photoText) photoText.innerText = origText;
        }
      });

      return div;
    };

    // Populate existing questions
    if (questions.length > 0) {
      questions.forEach((q, i) => {
        editContainer.appendChild(renderEditQuestionRow(q, i + 1));
      });
    } else {
      editContainer.appendChild(renderEditQuestionRow({ type: 'essay', points: 10 }, 1));
    }
    updateTotalPoints();

    // Add more buttons
    this.modalEl.querySelectorAll(".edit-add-q-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const type = btn.getAttribute("data-type");
        const count = editContainer.querySelectorAll(".edit-question-card").length;
        const row = renderEditQuestionRow({ type, points: 10 }, count + 1);
        editContainer.appendChild(row);
        updateTotalPoints();
        if (window.lucide) window.lucide.createIcons();
      });
    });

    // Form submit
    this.modalEl.querySelector("#edit-assignment-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = this.modalEl.querySelector("#edit-asgn-title")?.value.trim();
      const description = this.modalEl.querySelector("#edit-asgn-desc")?.value.trim();
      const dueDate = this.modalEl.querySelector("#edit-asgn-due")?.value;

      const questionCards = editContainer.querySelectorAll(".edit-question-card");
      if (questionCards.length === 0) {
        showToast("يرجى إضافة سؤال واحد على الأقل للواجب.", "warning");
        return;
      }

      const updatedQuestions = [];
      questionCards.forEach((card, i) => {
        const qType = card.getAttribute("data-q-type");
        const qText = card.querySelector(".edit-q-text")?.value.trim() || "";
        const points = parseFloat(card.querySelector(".edit-q-points")?.value) || 10;
        const imageUrl = card.getAttribute("data-image-url") || undefined;

        let options = undefined;
        let explanation = undefined;

        if (qType === 'mcq') {
          options = [];
          card.querySelectorAll(".edit-mcq-opt-row").forEach((optRow, optIdx) => {
            const optText = optRow.querySelector(".edit-mcq-opt-text")?.value.trim() || "";
            const isCorrect = optRow.querySelector(".edit-mcq-is-correct-radio")?.checked || false;
            options.push({
              id: `opt_${optIdx + 1}`,
              text: optText,
              isCorrect
            });
          });
          explanation = card.querySelector(".edit-mcq-explanation")?.value.trim() || undefined;
        }

        updatedQuestions.push({
          id: card.getAttribute("data-q-id") || `q_${i + 1}`,
          type: qType,
          text: qText,
          points,
          imageUrl,
          options,
          explanation
        });
      });

      const submitBtn = this.modalEl.querySelector("#save-edit-submit-btn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "جاري الحفظ...";
      }

      try {
        const res = await apiFetch(`/assignments/${asgn.id}`, {
          method: "PUT",
          body: JSON.stringify({
            title,
            description,
            type: updatedQuestions.length === 1 ? updatedQuestions[0].type : 'hybrid',
            questions: updatedQuestions,
            dueDate
          })
        });

        this.assignment = res.assignment || {
          ...asgn,
          title,
          description,
          questions: updatedQuestions,
          dueDate
        };

        showToast("تم تحديث الواجب والأسئلة بنجاح! ✅", "success");
        if (this.onUpdatedCallback) this.onUpdatedCallback();
        this.renderView();
      } catch (err) {
        showToast(err.message || "فشل تحديث الواجب.", "error");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = "حفظ التعديلات ✅";
        }
      }
    });
  }
}
