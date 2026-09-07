/**
 * AssignmentGradingModal.js
 * Comprehensive Teacher Grading Flow:
 * - Central submissions table / cards
 * - Split or focused in-browser document viewer for PDF / Images / Code
 * - Per-question scoring & feedback inputs
 * - Dual save options: "Save Draft" (مسودة تصحيح خاصة) vs "Publish Results" (نشر النتيجة للطالب مع إشعار فوري)
 */

import { apiFetch, showToast } from "../../app.js";
import { StudentFeedbackModal } from "./StudentFeedbackModal.js";

export class AssignmentGradingModal {
  constructor(assignmentId, assignmentTitle, totalPoints = 100, onGradedCallback = null) {
    this.assignmentId = assignmentId;
    this.assignmentTitle = assignmentTitle;
    this.totalPoints = totalPoints || 100;
    this.onGradedCallback = onGradedCallback;
    this.assignment = null;
    this.submissions = [];
    this.activeSubmission = null;
    this.modalEl = null;
  }

  async open() {
    this.modalEl = document.createElement("div");
    this.modalEl.id = "teacher-assignment-grading-modal";
    this.modalEl.style.cssText = "position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(6px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;";

    this.modalEl.innerHTML = `
      <div class="glass-card" style="background:var(--bg-card); border-radius:24px; width:100%; max-width:1180px; height:92vh; display:flex; flex-direction:column; border:1px solid var(--border-color); box-shadow:0 24px 60px rgba(0,0,0,0.4); overflow:hidden; font-family:'Cairo',sans-serif;">
        
        <!-- Header -->
        <div style="padding:18px 24px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background:var(--bg-app); flex-shrink:0;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:42px; height:42px; border-radius:12px; background:rgba(99,102,241,0.12); color:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:900;">
              <i data-lucide="check-check" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <h3 style="margin:0; font-size:1.15rem; font-weight:900; color:var(--text-main);">
                لوحة تصحيح الواجب والتقييم المركزي 🎯
              </h3>
              <div style="font-size:0.82rem; color:var(--text-muted); font-weight:700;">
                المهمة: <span style="color:var(--primary);">${this.assignmentTitle}</span> (إجمالي الدرجات: ${this.totalPoints})
              </div>
            </div>
          </div>

          <button id="close-grading-flow-btn" style="background:transparent; border:none; color:var(--text-muted); font-size:1.6rem; cursor:pointer; padding:4px 8px; border-radius:8px;">
            &times;
          </button>
        </div>

        <!-- Body: Split View -->
        <div style="flex:1; display:flex; overflow:hidden; min-height:0;">
          
          <!-- Left/Sidebar: Submissions Roster List -->
          <div id="submissions-roster-sidebar" style="width:340px; border-inline-end:1px solid var(--border-color); background:var(--bg-app); display:flex; flex-direction:column; flex-shrink:0;">
            <div style="padding:14px 18px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:800; font-size:0.88rem; color:var(--text-main);">قائمة الطلاب المسلّمين</span>
              <span id="submissions-counter-badge" class="badge" style="background:var(--primary-glow); color:var(--primary); font-size:0.75rem;">...</span>
            </div>

            <div id="submissions-list-container" style="flex:1; overflow-y:auto; padding:10px; display:flex; flex-direction:column; gap:8px;">
              <div style="text-align:center; padding:40px 16px; color:var(--text-muted);">
                <i data-lucide="loader" class="spinner" style="width:28px; height:28px; margin-bottom:8px;"></i>
                <div>جاري جلب إجابات الطلاب...</div>
              </div>
            </div>
          </div>

          <!-- Main Center: Grading Workspace -->
          <div id="grading-workspace" style="flex:1; overflow-y:auto; padding:24px; display:flex; flex-direction:column; background:var(--bg-card);">
            <div style="text-align:center; margin:auto; color:var(--text-muted); max-width:420px;">
              <i data-lucide="mouse-pointer-click" style="width:48px; height:48px; opacity:0.3; margin-bottom:14px; color:var(--primary);"></i>
              <h4 style="font-size:1.1rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">اختر طالباً من القائمة لبدء التصحيح</h4>
              <p style="font-size:0.85rem; line-height:1.6; margin:0;">
                يمكنك الاطلاع على مستندات الطالب المرفوعة، معاينة ملفات PDF والصور، رصد الدرجات لكل سؤال ومشاركة الملاحظات التوجيهية.
              </p>
            </div>
          </div>

        </div>

      </div>
    `;

    document.body.appendChild(this.modalEl);
    if (window.lucide) window.lucide.createIcons();

    this.modalEl.querySelector("#close-grading-flow-btn").addEventListener("click", () => this.close());
    this.modalEl.addEventListener("click", (e) => {
      if (e.target === this.modalEl) this.close();
    });

    this.assignment = await apiFetch(`/assignments/${this.assignmentId}`).catch(() => null);
    if (this.assignment && this.assignment.totalPoints) {
      this.totalPoints = this.assignment.totalPoints;
    }

    await this.fetchSubmissions();
  }

  close() {
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
    if (this.onGradedCallback) {
      this.onGradedCallback();
    }
  }

  async fetchSubmissions() {
    const listContainer = this.modalEl?.querySelector("#submissions-list-container");
    const counterBadge = this.modalEl?.querySelector("#submissions-counter-badge");

    try {
      this.submissions = await apiFetch(`/assignments/${this.assignmentId}/submissions`);
      if (counterBadge) counterBadge.innerText = `${this.submissions.length} تسليم`;

      if (!listContainer) return;

      if (this.submissions.length === 0) {
        listContainer.innerHTML = `
          <div style="text-align:center; padding:36px 14px; color:var(--text-muted);">
            <i data-lucide="inbox" style="width:36px; height:36px; opacity:0.3; margin-bottom:8px;"></i>
            <div style="font-weight:800; font-size:0.88rem; color:var(--text-main); margin-bottom:4px;">لا توجد تسليمات حتى الآن</div>
            <div style="font-size:0.78rem;">سيظهر الطلاب هنا فور إرسالهم حلول الواجب.</div>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      listContainer.innerHTML = this.submissions.map(sub => {
        const isGraded = sub.status === 'graded';
        const isDraft = sub.status === 'draft_graded';
        const studentName = sub.student?.name || 'طالب مجهول';
        const dateStr = sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('ar-EG', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : '';

        return `
          <div class="roster-sub-item" data-sub-id="${sub.id}" style="padding:12px 14px; border-radius:14px; border:1px solid var(--border-color); background:var(--bg-card); cursor:pointer; transition:all 0.2s ease; display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong style="font-size:0.9rem; color:var(--text-main);">${studentName}</strong>
              ${isGraded ? `
                <span class="badge" style="background:rgba(16,185,129,0.12); color:#10b981; font-size:0.72rem; font-weight:800; padding:2px 8px; border-radius:8px;">
                  ✅ ${sub.grade !== null ? `${sub.grade} درجة` : 'تم النشر'}
                </span>
              ` : isDraft ? `
                <span class="badge" style="background:rgba(245,158,11,0.12); color:#f59e0b; font-size:0.72rem; font-weight:800; padding:2px 8px; border-radius:8px;">
                  📝 مسودة ${sub.grade !== null ? `(${sub.grade})` : ''}
                </span>
              ` : `
                <span class="badge" style="background:rgba(99,102,241,0.1); color:var(--primary); font-size:0.72rem; font-weight:800; padding:2px 8px; border-radius:8px;">
                  ⏳ ينتظر التصحيح
                </span>
              `}
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:var(--text-muted);">
              <span>${dateStr}</span>
              ${sub.isLate ? `<span style="color:#ef4444; font-weight:700;">تسليم متأخر ⚠️</span>` : ''}
            </div>
          </div>
        `;
      }).join('');

      if (window.lucide) window.lucide.createIcons();

      // Bind click on items
      listContainer.querySelectorAll(".roster-sub-item").forEach(item => {
        item.addEventListener("click", () => {
          const subId = item.getAttribute("data-sub-id");
          this.selectSubmission(subId);
        });
      });

      // Auto-select first submission if available
      if (this.submissions.length > 0 && !this.activeSubmission) {
        this.selectSubmission(this.submissions[0].id);
      }

    } catch (err) {
      if (listContainer) {
        listContainer.innerHTML = `<div style="color:#ef4444; padding:20px; font-size:0.85rem; text-align:center;">تعذر تحميل التسليمات</div>`;
      }
    }
  }

  selectSubmission(subId) {
    this.activeSubmission = this.submissions.find(s => String(s.id) === String(subId));
    if (!this.activeSubmission) return;

    // Highlight active in sidebar
    this.modalEl?.querySelectorAll(".roster-sub-item").forEach(item => {
      const isSelected = String(item.getAttribute("data-sub-id")) === String(subId);
      item.style.borderColor = isSelected ? "var(--primary)" : "var(--border-color)";
      item.style.background = isSelected ? "var(--bg-app)" : "var(--bg-card)";
      item.style.boxShadow = isSelected ? "0 4px 14px rgba(99,102,241,0.15)" : "none";
    });

    this.renderGradingWorkspace();
  }

  renderGradingWorkspace() {
    const workspace = this.modalEl?.querySelector("#grading-workspace");
    if (!workspace || !this.activeSubmission) return;

    const sub = this.activeSubmission;
    const student = sub.student || {};
    const answers = Array.isArray(sub.answers) ? sub.answers : [];
    const isGraded = sub.status === 'graded';
    const isDraft = sub.status === 'draft_graded';

    workspace.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:20px; max-width:900px; margin:0 auto; width:100%;">
        
        <!-- Re-correction Banner / Published Notice -->
        ${isGraded ? `
          <div style="background:linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.06) 100%); border:1px solid rgba(16,185,129,0.3); border-radius:16px; padding:16px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; box-shadow:0 4px 16px rgba(16,185,129,0.08);">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:40px; height:40px; border-radius:12px; background:rgba(16,185,129,0.2); color:#10b981; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="check-check" style="width:22px; height:22px;"></i>
              </div>
              <div>
                <div style="font-weight:900; font-size:0.95rem; color:#10b981; display:flex; align-items:center; gap:8px;">
                  <span>تم تصحيح هذا الواجب ونشر النتيجة للطالب مسبقاً ✅</span>
                  <span class="badge" style="background:#10b981; color:#fff; font-size:0.75rem; padding:2px 8px; border-radius:6px;">الدرجة الحالية: ${sub.grade !== null ? sub.grade : 0} / ${this.totalPoints}</span>
                </div>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-top:3px;">
                  يمكنك تعديل أي درجات أو ملاحظات أو إرفاق ملف تصحيح جديد وتحديث النتيجة للطالب في أي وقت.
                </div>
              </div>
            </div>

            <button type="button" id="preview-student-report-top-btn" class="btn-secondary" style="font-size:0.84rem; padding:8px 16px; border-radius:12px; font-weight:800; display:inline-flex; align-items:center; gap:6px; cursor:pointer; background:var(--bg-card); border-color:rgba(16,185,129,0.35); color:#10b981;">
              <i data-lucide="eye" style="width:16px; height:16px;"></i>
              <span>معاينة ما يراه الطالب 👁️</span>
            </button>
          </div>
        ` : ''}

        <!-- Student Info Header Card -->
        <div class="glass-card" style="padding:18px 22px; border-radius:16px; border:1px solid var(--border-color); background:var(--bg-app); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
          <div style="display:flex; align-items:center; gap:14px;">
            <div style="width:46px; height:46px; border-radius:50%; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:1.1rem; overflow:hidden;">
              ${student.avatar ? `<img src="${student.avatar}" style="width:100%; height:100%; object-fit:cover;" />` : (student.name ? student.name.charAt(0) : 'ط')}
            </div>
            <div>
              <h4 style="margin:0 0 4px; font-size:1.05rem; font-weight:900; color:var(--text-main);">${student.name || 'طالب'}</h4>
              <div style="font-size:0.78rem; color:var(--text-muted); display:flex; align-items:center; gap:8px;">
                <span>${student.email || ''}</span>
                <span>• تم التسليم: ${new Date(sub.submittedAt).toLocaleString('ar-EG')}</span>
                ${sub.isLate ? `<span class="badge" style="background:rgba(239,68,68,0.12); color:#ef4444; font-size:0.7rem; font-weight:800;">تسليم متأخر ⚠️</span>` : ''}
              </div>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:10px;">
            <div style="text-align:end;">
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">حالة التقييم</div>
              <div style="font-weight:900; font-size:0.95rem; color:${isGraded ? '#10b981' : isDraft ? '#f59e0b' : 'var(--primary)'};">
                ${isGraded ? 'منشورة للطالب ✅' : isDraft ? 'مسودة خاصة 📝' : 'بانتظار الرصد ⏳'}
              </div>
            </div>
          </div>
        </div>

        <!-- Questions & Answers List -->
        <div style="display:flex; flex-direction:column; gap:16px;">
          <h4 style="margin:0; font-size:1rem; font-weight:900; color:var(--text-main); display:flex; align-items:center; gap:8px;">
            <i data-lucide="help-circle" style="width:18px; height:18px; color:var(--primary);"></i>
            إجابات الطالب ومراجعة الأسئلة:
          </h4>

          ${answers.length === 0 ? `
            <!-- Fallback for legacy text submission -->
            <div class="glass-card" style="padding:18px; border-radius:16px; border:1px solid var(--border-color); background:var(--bg-app);">
              <label style="display:block; font-size:0.85rem; font-weight:800; color:var(--text-main); margin-bottom:8px;">محتوى إجابة الطالب:</label>
              <div style="font-size:0.9rem; color:var(--text-main); white-space:pre-wrap; line-height:1.6; background:var(--bg-card); padding:14px; border-radius:12px; border:1px solid var(--border-color);">
                ${sub.content || 'لم يتم تقديم نص.'}
              </div>
            </div>
          ` : answers.map((ans, idx) => {
            const isMcq = ans.type === 'mcq';
            const isFile = ans.type === 'file';
            const maxPts = ans.maxPoints || 10;
            const awardedPts = ans.pointsAwarded !== undefined && ans.pointsAwarded !== null ? ans.pointsAwarded : (isMcq && ans.isCorrect !== undefined ? (ans.isCorrect ? maxPts : 0) : '');

            return `
              <div class="question-grading-box" data-q-idx="${idx}" data-q-id="${ans.questionId}" style="border:1px solid var(--border-color); border-radius:16px; background:var(--bg-app); padding:18px; display:flex; flex-direction:column; gap:12px;">
                
                <!-- Question Top Header -->
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                  <div style="font-weight:900; font-size:0.95rem; color:var(--text-main); line-height:1.4;">
                    <span style="color:var(--primary);">س${idx + 1}</span> (${isMcq ? 'اختيار من متعدد' : isFile ? 'رفع ملف' : 'سؤال مقالي'}):
                    ${ans.questionText || ''}
                  </div>
                  <span class="badge" style="background:var(--primary-glow); color:var(--primary); font-size:0.75rem; font-weight:800; flex-shrink:0;">
                    ${maxPts} درجات
                  </span>
                </div>

                <!-- Student Answer Body -->
                <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:12px; padding:14px;">
                  ${isMcq ? `
                    <div style="display:flex; align-items:center; gap:10px;">
                      <span style="font-weight:800; font-size:0.85rem; color:var(--text-muted);">إجابة الطالب:</span>
                      <span style="font-weight:800; font-size:0.92rem; color:var(--text-main);">
                        ${ans.selectedOptionId || (ans.selectedOptionIds && ans.selectedOptionIds.join(', ')) || ans.answerText || 'لم يختر إجابة'}
                      </span>
                      ${ans.isCorrect !== undefined ? `
                        <span class="badge" style="background:${ans.isCorrect ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}; color:${ans.isCorrect ? '#10b981' : '#ef4444'}; font-weight:800; font-size:0.75rem; padding:3px 8px;">
                          ${ans.isCorrect ? '✅ إجابة صحيحة (آلي)' : '❌ إجابة خاطئة (آلي)'}
                        </span>
                      ` : ''}
                    </div>
                  ` : isFile ? `
                    <div style="display:flex; flex-direction:column; gap:10px;">
                      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                        <span style="font-weight:800; font-size:0.85rem; color:var(--text-muted);">الملف المرفوع:</span>
                        ${ans.fileUrl ? `
                          <div style="display:flex; gap:8px;">
                            <a href="${ans.fileUrl}" target="_blank" class="btn-secondary" style="font-size:0.78rem; padding:5px 12px; border-radius:8px; display:inline-flex; align-items:center; gap:4px; font-weight:700; text-decoration:none;">
                              <i data-lucide="external-link" style="width:13px; height:13px;"></i> فتح الملف ↗
                            </a>
                            <a href="${ans.fileUrl}" download class="btn-primary" style="font-size:0.78rem; padding:5px 12px; border-radius:8px; display:inline-flex; align-items:center; gap:4px; font-weight:700; text-decoration:none;">
                              <i data-lucide="download" style="width:13px; height:13px;"></i> تحميل
                            </a>
                          </div>
                        ` : '<span style="color:#ef4444; font-size:0.85rem;">لم يتم إرفاق ملف</span>'}
                      </div>

                      ${ans.fileUrl && (ans.fileUrl.endsWith('.pdf') || ans.fileUrl.includes('pdf')) ? `
                        <div style="border-radius:10px; overflow:hidden; border:1px solid var(--border-color); height:320px; background:#f8fafc;">
                          <iframe src="${ans.fileUrl}" style="width:100%; height:100%; border:none;"></iframe>
                        </div>
                      ` : ans.fileUrl && (ans.fileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) || ans.fileUrl.includes('image')) ? `
                        <div style="text-align:center; background:#000; border-radius:10px; padding:10px;">
                          <img src="${ans.fileUrl}" style="max-height:280px; max-width:100%; object-fit:contain; border-radius:6px; cursor:pointer;" onclick="window.open('${ans.fileUrl}', '_blank')" />
                        </div>
                      ` : ''}
                    </div>
                  ` : `
                    <div>
                      <div style="font-weight:800; font-size:0.82rem; color:var(--text-muted); margin-bottom:6px;">نص إجابة الطالب:</div>
                      <div style="font-size:0.9rem; color:var(--text-main); white-space:pre-wrap; line-height:1.6; font-family:inherit;">
                        ${ans.answerText || 'لم يكتب إجابة'}
                      </div>
                    </div>
                  `}
                </div>

                <!-- Teacher Scoring & Feedback Row -->
                <div style="display:flex; gap:14px; align-items:flex-start; flex-wrap:wrap; padding-top:4px;">
                  <div style="width:140px; flex-shrink:0;">
                    <label style="display:block; font-size:0.78rem; font-weight:800; color:var(--text-muted); margin-bottom:4px;">الدرجة الممنوحة:</label>
                    <div style="display:flex; align-items:center; gap:6px;">
                      <input type="number" min="0" max="${maxPts}" class="form-input q-score-input" value="${awardedPts}" placeholder="0"
                        style="width:80px; padding:7px 10px; font-weight:900; font-size:0.95rem; text-align:center; border-radius:10px; border:1px solid var(--border-color); background:var(--bg-card); color:var(--text-main);">
                      <span style="font-size:0.85rem; font-weight:800; color:var(--text-muted);">/ ${maxPts}</span>
                    </div>
                  </div>

                  <div style="flex:1; min-width:260px;">
                    <label style="display:block; font-size:0.78rem; font-weight:800; color:var(--text-muted); margin-bottom:4px;">ملاحظات وتعليق المعلم على هذا السؤال:</label>
                    <input type="text" class="form-input q-feedback-input" value="${ans.feedback || ''}" placeholder="أحسنت! أو يرجى التركيز على الخطوة الثانية..."
                      style="width:100%; padding:7px 12px; font-size:0.85rem; border-radius:10px; border:1px solid var(--border-color); background:var(--bg-card); color:var(--text-main); box-sizing:border-box;">
                  </div>
                </div>

              </div>
            `;
          }).join('')}
        </div>

        <!-- Overall Feedback & Optional Solution Attachment -->
        <div class="glass-card" style="border:1px solid var(--border-color); border-radius:18px; background:var(--bg-app); padding:20px; display:flex; flex-direction:column; gap:14px;">
          <h4 style="margin:0; font-size:1rem; font-weight:900; color:var(--text-main); display:flex; align-items:center; gap:8px;">
            <i data-lucide="message-square" style="width:18px; height:18px; color:var(--primary);"></i>
            التقييم الشامل وملاحظات المحاضر العامة (Overall Feedback):
          </h4>

          <div>
            <textarea id="overall-feedback-input" rows="3" class="form-input" placeholder="اكتب ملاحظاتك العامة على أداء الطالب في هذا الواجب والتوجيهات للتطوير..."
              style="width:100%; padding:10px 14px; font-size:0.9rem; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-card); color:var(--text-main); line-height:1.6; resize:vertical; box-sizing:border-box;">${sub.overallFeedback || ''}</textarea>
          </div>

          <!-- Attachment / Solution File Upload by Teacher -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding:10px 14px; background:var(--bg-card); border-radius:12px; border:1px solid var(--border-color);">
            <div>
              <div style="font-size:0.82rem; font-weight:800; color:var(--text-main);">ملف الملاحظات أو نموذج الإجابة المصحح (اختياري):</div>
              <div id="feedback-file-status-text" style="font-size:0.75rem; color:var(--text-muted);">
                ${sub.feedbackFileUrl ? `الملف الحالي: <a href="${sub.feedbackFileUrl}" target="_blank" style="color:var(--primary); font-weight:700;">${sub.feedbackFileName || 'تحميل المستند 📎'}</a>` : 'يمكنك رفع نسخة مصححة عليها ملاحظاتك أو ملف الحل'}
              </div>
            </div>

            <label class="btn-secondary" style="font-size:0.78rem; padding:6px 14px; border-radius:10px; cursor:pointer; font-weight:800; display:inline-flex; align-items:center; gap:6px;">
              <i data-lucide="upload-cloud" style="width:14px; height:14px;"></i>
              <span id="feedback-upload-label-text">إرفاق ملف تصحيح 📎</span>
              <input type="file" id="teacher-feedback-file-input" style="display:none;">
            </label>
            <input type="hidden" id="teacher-feedback-file-url" value="${sub.feedbackFileUrl || ''}">
            <input type="hidden" id="teacher-feedback-file-name" value="${sub.feedbackFileName || ''}">
          </div>
        </div>

        <!-- Grade Summary & Action Bar -->
        <div class="glass-card" style="position:sticky; bottom:0; z-index:10; background:var(--bg-card); border:1px solid var(--border-color); border-radius:18px; padding:18px 24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; box-shadow:0 -8px 24px rgba(0,0,0,0.15);">
          
          <div style="display:flex; align-items:center; gap:16px;">
            <div>
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">المجموع المحسوب:</div>
              <div style="display:flex; align-items:baseline; gap:6px;">
                <span id="calculated-total-score" style="font-size:1.6rem; font-weight:900; color:var(--primary);">
                  ${sub.grade !== null && sub.grade !== undefined ? sub.grade : 0}
                </span>
                <span style="font-size:0.95rem; font-weight:800; color:var(--text-muted);">/ ${this.totalPoints}</span>
                <span id="calculated-percentage-badge" class="badge" style="font-size:0.8rem; font-weight:800; background:rgba(16,185,129,0.12); color:#10b981; margin-inline-start:6px;">
                  ${sub.percentage || 0}%
                </span>
              </div>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <!-- Preview Student Report Button -->
            <button type="button" id="preview-student-report-bar-btn" class="btn-secondary" style="padding:10px 16px; border-radius:12px; font-weight:800; font-size:0.88rem; display:inline-flex; align-items:center; gap:6px; cursor:pointer;" title="معاينة نموذج التقرير الذي يظهر للطالب">
              <i data-lucide="eye" style="width:16px; height:16px; color:var(--primary);"></i>
              <span>معاينة تقرير الطالب 👁️</span>
            </button>

            <!-- Save Draft Button -->
            <button type="button" id="save-grading-draft-btn" class="btn-secondary" style="padding:10px 18px; border-radius:12px; font-weight:800; font-size:0.88rem; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
              <i data-lucide="bookmark" style="width:16px; height:16px;"></i>
              <span>حفظ كمسودة (Draft) 💾</span>
            </button>

            <!-- Publish / Re-publish Results Button -->
            <button type="button" id="publish-grading-results-btn" class="btn-primary" style="padding:10px 22px; border-radius:12px; font-weight:900; font-size:0.92rem; display:inline-flex; align-items:center; gap:8px; cursor:pointer; ${isGraded ? 'background:linear-gradient(135deg, #10b981 0%, #059669 100%);' : ''}">
              <i data-lucide="${isGraded ? 'refresh-cw' : 'send'}" style="width:16px; height:16px;"></i>
              <span>${isGraded ? 'تحديث النتيجة وإعادة الإرسال للطالب 🔄' : 'نشر النتيجة للطالب 🚀'}</span>
            </button>
          </div>

        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.bindWorkspaceEvents();
  }

  bindWorkspaceEvents() {
    const workspace = this.modalEl?.querySelector("#grading-workspace");
    if (!workspace) return;

    // Recalculate sum whenever per-question inputs change
    const updateSum = () => {
      let sum = 0;
      workspace.querySelectorAll(".q-score-input").forEach(inp => {
        const val = parseFloat(inp.value);
        if (!isNaN(val)) sum += val;
      });

      const totalEl = workspace.querySelector("#calculated-total-score");
      const percEl = workspace.querySelector("#calculated-percentage-badge");
      if (totalEl) totalEl.innerText = Math.round(sum * 10) / 10;
      
      if (percEl && this.totalPoints > 0) {
        const pct = Math.round((sum / this.totalPoints) * 100);
        percEl.innerText = `${pct}%`;
      }
    };

    workspace.querySelectorAll(".q-score-input").forEach(inp => {
      inp.addEventListener("input", updateSum);
    });

    // File upload for teacher feedback file
    const fileInput = workspace.querySelector("#teacher-feedback-file-input");
    fileInput?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const labelText = workspace.querySelector("#feedback-upload-label-text");
      const statusText = workspace.querySelector("#feedback-file-status-text");
      if (labelText) labelText.innerText = "جاري الرفع... ⏳";

      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("token");

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Authorization": "Bearer " + token },
          body: formData
        });
        if (!res.ok) throw new Error("فشل رفع الملف");
        const data = await res.json();

        const urlInput = workspace.querySelector("#teacher-feedback-file-url");
        const nameInput = workspace.querySelector("#teacher-feedback-file-name");
        if (urlInput) urlInput.value = data.url;
        if (nameInput) nameInput.value = file.name;

        if (statusText) {
          statusText.innerHTML = `تم إرفاق: <a href="${data.url}" target="_blank" style="color:var(--primary); font-weight:700;">${file.name} 📎</a>`;
        }
        if (labelText) labelText.innerText = "تغيير الملف 📎";
        showToast("تم إرفاق ملف التقييم بنجاح! 📎", "success");
      } catch (err) {
        showToast("تعذر رفع الملف، يرجى المحاولة مرة أخرى.", "error");
        if (labelText) labelText.innerText = "إرفاق ملف تصحيح 📎";
      }
    });

    // Preview Student Report
    workspace.querySelector("#preview-student-report-top-btn")?.addEventListener("click", () => {
      this.openStudentPreview();
    });
    workspace.querySelector("#preview-student-report-bar-btn")?.addEventListener("click", () => {
      this.openStudentPreview();
    });

    // Save as Draft
    workspace.querySelector("#save-grading-draft-btn")?.addEventListener("click", () => {
      this.submitGrading("draft_graded");
    });

    // Publish / Re-publish Results
    workspace.querySelector("#publish-grading-results-btn")?.addEventListener("click", () => {
      this.submitGrading("graded");
    });
  }

  buildCurrentSubmissionForPreview() {
    if (!this.activeSubmission) return null;
    const workspace = this.modalEl?.querySelector("#grading-workspace");
    const sub = { ...this.activeSubmission };
    const answers = Array.isArray(sub.answers) ? sub.answers.map(a => ({ ...a })) : [];

    if (workspace) {
      workspace.querySelectorAll(".question-grading-box").forEach(box => {
        const qIdx = parseInt(box.getAttribute("data-q-idx"), 10);
        const scoreInp = box.querySelector(".q-score-input");
        const feedbackInp = box.querySelector(".q-feedback-input");

        if (answers[qIdx]) {
          if (scoreInp && scoreInp.value.trim() !== '') {
            answers[qIdx].pointsAwarded = parseFloat(scoreInp.value.trim());
          }
          if (feedbackInp) {
            answers[qIdx].feedback = feedbackInp.value.trim();
          }
        }
      });

      const totalEl = workspace.querySelector("#calculated-total-score");
      let calculatedGrade = 0;
      if (answers.length > 0) {
        answers.forEach(a => {
          if (a.pointsAwarded !== undefined && a.pointsAwarded !== null) {
            calculatedGrade += Number(a.pointsAwarded);
          }
        });
      } else if (totalEl) {
        calculatedGrade = parseFloat(totalEl.innerText) || 0;
      }

      sub.grade = calculatedGrade;
      sub.percentage = this.totalPoints > 0 ? Math.round((calculatedGrade / this.totalPoints) * 100) : 100;
      sub.overallFeedback = workspace.querySelector("#overall-feedback-input")?.value.trim() || sub.overallFeedback || "";
      sub.feedbackFileUrl = workspace.querySelector("#teacher-feedback-file-url")?.value || sub.feedbackFileUrl || "";
      sub.feedbackFileName = workspace.querySelector("#teacher-feedback-file-name")?.value || sub.feedbackFileName || "";
      sub.answers = answers;
      sub.status = "graded";
      sub.gradedAt = sub.gradedAt || new Date().toISOString();
    }

    return sub;
  }

  openStudentPreview() {
    const previewSub = this.buildCurrentSubmissionForPreview();
    if (!previewSub) return;
    const asgn = this.assignment || {
      id: this.assignmentId,
      title: this.assignmentTitle,
      totalPoints: this.totalPoints,
      questions: this.assignment?.questions || []
    };
    const modal = new StudentFeedbackModal(asgn, previewSub);
    modal.open();
  }

  async submitGrading(targetStatus) {
    const workspace = this.modalEl?.querySelector("#grading-workspace");
    if (!workspace || !this.activeSubmission) return;

    const sub = this.activeSubmission;
    const answers = Array.isArray(sub.answers) ? [...sub.answers] : [];

    // Collect updated answers
    workspace.querySelectorAll(".question-grading-box").forEach(box => {
      const qIdx = parseInt(box.getAttribute("data-q-idx"), 10);
      const scoreInp = box.querySelector(".q-score-input");
      const feedbackInp = box.querySelector(".q-feedback-input");

      if (answers[qIdx]) {
        if (scoreInp && scoreInp.value.trim() !== '') {
          answers[qIdx].pointsAwarded = parseFloat(scoreInp.value.trim());
        }
        if (feedbackInp) {
          answers[qIdx].feedback = feedbackInp.value.trim();
        }
      }
    });

    // Calculate total score
    let calculatedGrade = 0;
    if (answers.length > 0) {
      answers.forEach(a => {
        if (a.pointsAwarded !== undefined && a.pointsAwarded !== null) {
          calculatedGrade += Number(a.pointsAwarded);
        }
      });
    } else {
      const totalEl = workspace.querySelector("#calculated-total-score");
      calculatedGrade = totalEl ? parseFloat(totalEl.innerText) || 0 : 0;
    }

    const percentage = this.totalPoints > 0 ? Math.round((calculatedGrade / this.totalPoints) * 100) : 100;
    const overallFeedback = workspace.querySelector("#overall-feedback-input")?.value.trim() || "";
    const feedbackFileUrl = workspace.querySelector("#teacher-feedback-file-url")?.value || "";
    const feedbackFileName = workspace.querySelector("#teacher-feedback-file-name")?.value || "";

    const publishBtn = workspace.querySelector("#publish-grading-results-btn");
    const draftBtn = workspace.querySelector("#save-grading-draft-btn");
    if (publishBtn) publishBtn.disabled = true;
    if (draftBtn) draftBtn.disabled = true;

    try {
      await apiFetch(`/submissions/${sub.id}/grade`, {
        method: "PUT",
        body: JSON.stringify({
          grade: calculatedGrade,
          percentage,
          overallFeedback,
          feedbackFileUrl,
          feedbackFileName,
          answers,
          status: targetStatus
        })
      });

      const wasGraded = sub.status === "graded";
      showToast(targetStatus === "graded" ? (wasGraded ? "تم تحديث النتيجة وإعادة إرسالها للطالب بنجاح! 🔄" : "تم نشر النتيجة وإشعار الطالب فوراً! 🏆") : "تم حفظ مسودة التصحيح بنجاح 💾", "success");
      await this.fetchSubmissions();
      this.selectSubmission(sub.id);
    } catch (err) {
      showToast(err.message || "فشل حفظ التقييم.", "error");
      if (publishBtn) publishBtn.disabled = false;
      if (draftBtn) draftBtn.disabled = false;
    }
  }
}
