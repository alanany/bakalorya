/**
 * StudentFeedbackModal.js
 * Comprehensive Student Feedback & Correction Review View:
 * - Summary Card: Total Score, Percentage Badge, Status (Graded), Teacher Overall Feedback, Graded Date.
 * - Per-Question Breakdown:
 *   * MCQ: Student choice highlighted in Green (correct) or Red (incorrect), correct answer reveal, teacher explanation text.
 *   * Essay / File: Student answer / file preview, score awarded (e.g., 8/10), teacher feedback commentary, annotated file download.
 */

export class StudentFeedbackModal {
  constructor(assignment, submission) {
    this.assignment = assignment;
    this.submission = submission;
    this.modalEl = null;
  }

  open() {
    this.modalEl = document.createElement("div");
    this.modalEl.id = "student-feedback-review-modal";
    this.modalEl.style.cssText = "position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(6px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;";

    const sub = this.submission;
    const asgn = this.assignment;
    const totalPts = asgn?.totalPoints || 100;
    const grade = sub.grade !== null && sub.grade !== undefined ? sub.grade : 0;
    const pct = sub.percentage !== null && sub.percentage !== undefined ? sub.percentage : (totalPts > 0 ? Math.round((grade / totalPts) * 100) : 0);
    const answers = Array.isArray(sub.answers) ? sub.answers : [];

    // Questions definition map from assignment if available
    const qDefMap = new Map();
    if (Array.isArray(asgn?.questions)) {
      asgn.questions.forEach(q => qDefMap.set(q.id, q));
    }

    // Rating tone
    const isHigh = pct >= 80;
    const isMedium = pct >= 50 && pct < 80;
    const badgeColor = isHigh ? '#10b981' : isMedium ? '#f59e0b' : '#ef4444';
    const badgeBg = isHigh ? 'rgba(16,185,129,0.12)' : isMedium ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)';
    const verdictText = isHigh ? 'ممتاز! أداء متفوق 🌟' : isMedium ? 'جيد! واصل التقدم والمذاكرة 👍' : 'تحتاج لمزيد من المراجعة والتركيز 💡';

    this.modalEl.innerHTML = `
      <div class="glass-card" style="background:var(--bg-card); border-radius:24px; width:100%; max-width:860px; max-height:92vh; display:flex; flex-direction:column; border:1px solid var(--border-color); box-shadow:0 24px 60px rgba(0,0,0,0.4); overflow:hidden; font-family:'Cairo',sans-serif;">
        
        <!-- Header -->
        <div style="padding:18px 24px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background:var(--bg-app); flex-shrink:0;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:42px; height:42px; border-radius:12px; background:${badgeBg}; color:${badgeColor}; display:flex; align-items:center; justify-content:center; font-weight:900;">
              <i data-lucide="award" style="width:24px; height:24px;"></i>
            </div>
            <div>
              <h3 style="margin:0; font-size:1.15rem; font-weight:900; color:var(--text-main);">
                تقرير نتيجة وتصحيح الواجب 📝
              </h3>
              <div style="font-size:0.82rem; color:var(--text-muted); font-weight:700;">
                ${asgn?.title || 'الواجب الدراسي'}
              </div>
            </div>
          </div>

          <button id="close-feedback-modal-btn" style="background:transparent; border:none; color:var(--text-muted); font-size:1.6rem; cursor:pointer; padding:4px 8px; border-radius:8px;">
            &times;
          </button>
        </div>

        <!-- Body -->
        <div style="flex:1; overflow-y:auto; padding:24px; display:flex; flex-direction:column; gap:20px;">
          
          <!-- Performance Summary Card -->
          <div class="glass-card" style="padding:22px; border-radius:18px; border:1px solid var(--border-color); background:var(--bg-app); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
            
            <div style="display:flex; align-items:center; gap:18px;">
              <div style="width:72px; height:72px; border-radius:18px; background:${badgeBg}; color:${badgeColor}; display:flex; flex-direction:column; align-items:center; justify-content:center; font-weight:900; border:2px solid ${badgeColor}; flex-shrink:0;">
                <span style="font-size:1.4rem; line-height:1;">${pct}%</span>
                <span style="font-size:0.65rem; margin-top:2px;">النسبة</span>
              </div>

              <div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                  <span style="font-size:1.4rem; font-weight:900; color:var(--text-main);">${grade}</span>
                  <span style="font-size:0.95rem; font-weight:700; color:var(--text-muted);">/ ${totalPts} درجة</span>
                  <span class="badge" style="background:${badgeBg}; color:${badgeColor}; font-weight:800; font-size:0.75rem; padding:3px 10px; border-radius:8px;">
                    ${verdictText}
                  </span>
                </div>

                <div style="font-size:0.8rem; color:var(--text-muted); display:flex; align-items:center; gap:10px;">
                  <span>تاريخ التسليم: ${new Date(sub.submittedAt).toLocaleDateString('ar-EG')}</span>
                  ${sub.gradedAt ? `<span>• تم التصحيح: ${new Date(sub.gradedAt).toLocaleDateString('ar-EG')}</span>` : ''}
                  ${sub.isLate ? `<span style="color:#ef4444; font-weight:800;">تسليم متأخر ⚠️</span>` : ''}
                </div>
              </div>
            </div>

            ${sub.feedbackFileUrl ? `
              <a href="${sub.feedbackFileUrl}" target="_blank" download class="btn-primary" style="padding:10px 18px; border-radius:12px; font-weight:800; font-size:0.85rem; display:inline-flex; align-items:center; gap:8px; text-decoration:none;">
                <i data-lucide="file-check" style="width:16px; height:16px;"></i>
                <span>تحميل نسخة التصحيح 📎</span>
              </a>
            ` : ''}
          </div>

          <!-- Overall Feedback if present -->
          ${sub.overallFeedback ? `
            <div class="glass-card" style="padding:18px 20px; border-radius:16px; border:1px solid var(--border-color); background:rgba(99,102,241,0.05); border-inline-start:4px solid var(--primary);">
              <div style="font-weight:900; font-size:0.92rem; color:var(--primary); margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                <i data-lucide="message-square" style="width:16px; height:16px;"></i>
                ملاحظات وتوجيهات المعلم العامة:
              </div>
              <p style="font-size:0.9rem; color:var(--text-main); line-height:1.6; margin:0; white-space:pre-wrap;">
                ${sub.overallFeedback}
              </p>
            </div>
          ` : ''}

          <!-- Question-by-Question Review -->
          <div style="display:flex; flex-direction:column; gap:16px;">
            <h4 style="margin:0; font-size:1.05rem; font-weight:900; color:var(--text-main); display:flex; align-items:center; gap:8px;">
              <i data-lucide="list-checks" style="width:18px; height:18px; color:var(--primary);"></i>
              مراجعة وتفاصيل الإجابات لكل سؤال:
            </h4>

            ${answers.length === 0 ? `
              <div class="glass-card" style="padding:20px; border-radius:16px; border:1px solid var(--border-color); background:var(--bg-app); font-size:0.9rem; color:var(--text-main); white-space:pre-wrap; line-height:1.6;">
                ${sub.content || 'لا توجد إجابات تفصيلية مسجلة.'}
              </div>
            ` : answers.map((ans, idx) => {
              const qDef = qDefMap.get(ans.questionId) || {};
              const isMcq = ans.type === 'mcq' || qDef.type === 'mcq';
              const isFile = ans.type === 'file' || qDef.type === 'file';
              const maxPts = ans.maxPoints || qDef.points || 10;
              const ptsAwarded = ans.pointsAwarded !== undefined && ans.pointsAwarded !== null ? ans.pointsAwarded : (isMcq && ans.isCorrect ? maxPts : 0);
              const isFullScore = ptsAwarded >= maxPts;
              const isZero = ptsAwarded === 0;

              return `
                <div class="glass-card" style="padding:18px 20px; border-radius:16px; border:1px solid var(--border-color); background:var(--bg-app); display:flex; flex-direction:column; gap:12px;">
                  
                  <!-- Question Title & Points Ribbon -->
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                    <div style="font-weight:900; font-size:0.95rem; color:var(--text-main); line-height:1.4;">
                      <span style="color:var(--primary);">س${idx + 1}</span>:
                      ${ans.questionText || qDef.text || ''}
                    </div>

                    <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                      <span class="badge" style="background:${isFullScore ? 'rgba(16,185,129,0.12)' : isZero ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)'}; color:${isFullScore ? '#10b981' : isZero ? '#ef4444' : '#f59e0b'}; font-weight:900; font-size:0.82rem; padding:4px 10px; border-radius:10px;">
                        ${ptsAwarded} / ${maxPts} درجة
                      </span>
                    </div>
                  </div>

                  <!-- Question Photo if attached -->
                  ${qDef.imageUrl ? `
                    <div style="margin:4px 0;">
                      <img src="${qDef.imageUrl}" style="max-height:160px; max-width:100%; border-radius:10px; border:1px solid var(--border-color); cursor:pointer;" onclick="window.open('${qDef.imageUrl}', '_blank')" />
                    </div>
                  ` : ''}

                  <!-- Student Answer Display -->
                  <div style="background:var(--bg-card); border-radius:12px; padding:12px 14px; border:1px solid var(--border-color);">
                    <div style="font-size:0.78rem; font-weight:800; color:var(--text-muted); margin-bottom:6px;">إجابتك:</div>

                    ${isMcq ? `
                      <div style="display:flex; flex-direction:column; gap:8px;">
                        ${(qDef.options || []).map(opt => {
                          const isSelected = String(ans.selectedOptionId) === String(opt.id) || (Array.isArray(ans.selectedOptionIds) && ans.selectedOptionIds.includes(String(opt.id)));
                          const isCorrect = Boolean(opt.isCorrect);

                          let borderSt = "1px solid var(--border-color)";
                          let bgSt = "transparent";
                          let icon = "";

                          if (isSelected && isCorrect) {
                            borderSt = "2px solid #10b981";
                            bgSt = "rgba(16,185,129,0.1)";
                            icon = "✅ إجابتك (صحيحة)";
                          } else if (isSelected && !isCorrect) {
                            borderSt = "2px solid #ef4444";
                            bgSt = "rgba(239,68,68,0.1)";
                            icon = "❌ إجابتك (خاطئة)";
                          } else if (!isSelected && isCorrect) {
                            borderSt = "2px dashed #10b981";
                            bgSt = "rgba(16,185,129,0.05)";
                            icon = "👈 الإجابة الصحيحة النموذجية";
                          }

                          return `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:9px 12px; border-radius:10px; border:${borderSt}; background:${bgSt}; font-size:0.88rem; font-weight:700;">
                              <span>${opt.text}</span>
                              ${icon ? `<span style="font-size:0.75rem; font-weight:800;">${icon}</span>` : ''}
                            </div>
                          `;
                        }).join('')}

                        ${qDef.explanation ? `
                          <div style="margin-top:6px; padding:8px 12px; border-radius:10px; background:rgba(99,102,241,0.08); font-size:0.82rem; color:var(--text-main); line-height:1.5;">
                            <strong>💡 توضيح وشرح الحل:</strong> ${qDef.explanation}
                          </div>
                        ` : ''}
                      </div>
                    ` : isFile ? `
                      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <span style="font-weight:700; font-size:0.88rem; color:var(--text-main);">${ans.fileName || 'المستند المرفق'}</span>
                        ${ans.fileUrl ? `
                          <div style="display:flex; gap:8px;">
                            <a href="${ans.fileUrl}" target="_blank" class="btn-secondary" style="font-size:0.78rem; padding:4px 10px; border-radius:8px; text-decoration:none;">عرض ↗</a>
                            <a href="${ans.fileUrl}" download class="btn-primary" style="font-size:0.78rem; padding:4px 10px; border-radius:8px; text-decoration:none;">تحميل ⬇</a>
                          </div>
                        ` : ''}
                      </div>
                    ` : `
                      <div style="font-size:0.88rem; color:var(--text-main); line-height:1.6; white-space:pre-wrap;">
                        ${ans.answerText || 'لم تقدم إجابة.'}
                      </div>
                    `}
                  </div>

                  <!-- Per-Question Teacher Feedback if provided -->
                  ${ans.feedback ? `
                    <div style="display:flex; align-items:flex-start; gap:8px; background:rgba(245,158,11,0.08); border-radius:10px; padding:10px 12px; border:1px solid rgba(245,158,11,0.25);">
                      <i data-lucide="message-circle" style="width:16px; height:16px; color:#f59e0b; flex-shrink:0; margin-top:2px;"></i>
                      <div style="font-size:0.84rem; color:var(--text-main); line-height:1.5;">
                        <strong style="color:#d97706;">تعليق وتوجيه المعلم:</strong> ${ans.feedback}
                      </div>
                    </div>
                  ` : ''}

                </div>
              `;
            }).join('')}
          </div>

        </div>

        <!-- Footer -->
        <div style="padding:16px 24px; border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; background:var(--bg-app); flex-shrink:0;">
          <button id="close-feedback-btn-2" class="btn-primary" style="padding:9px 24px; border-radius:12px; font-weight:800; font-size:0.88rem;">
            إغلاق المراجعة
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(this.modalEl);
    if (window.lucide) window.lucide.createIcons();

    this.modalEl.querySelector("#close-feedback-modal-btn").addEventListener("click", () => this.close());
    this.modalEl.querySelector("#close-feedback-btn-2").addEventListener("click", () => this.close());
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
}
