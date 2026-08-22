import { apiFetch, state, showToast, t } from "../../app.js";

export default class TeacherPrivateSessionsView {
  constructor(container) {
    this.container = container;
    this.assignedSubscriptions = [];
    this.privateSessions = [];
    this.selectedSubscriptionId = null;
    this.sessionsFilterStatus = "all";
  }

  async render() {
    try {
      const [assignedSubscriptions, privateSessions] = await Promise.all([
        apiFetch("/subscriptions/teacher-assigned").catch(() => []),
        apiFetch("/teacher/private-sessions").catch(() => [])
      ]);

      this.assignedSubscriptions = assignedSubscriptions || [];
      this.privateSessions = privateSessions || [];

      this.renderContent();
    } catch (err) {
      console.error("TeacherPrivateSessionsView error:", err);
      this.container.innerHTML = `<div class="error-msg">تعذر تحميل البيانات.</div>`;
    }
  }

  renderContent() {
    if (this.selectedSubscriptionId) {
      this.container.innerHTML = this.renderStudentSessionsTable();
    } else {
      this.container.innerHTML = this.renderSubscriptionsOverview();
    }

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  renderSubscriptionsOverview() {
    return `
      <div class="teacher-layout">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
          <div>
            <h2 style="font-size: 1.8rem; font-weight:800; margin-bottom: 8px;">طلابي في الحصص الخاصة</h2>
            <p style="color:var(--text-muted)">إدارة ومتابعة الاشتراكات الخاصة بالطلاب والحصص المجدولة (1-على-1)</p>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:20px;">
          ${this.assignedSubscriptions.length === 0
            ? `<div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted); grid-column:1/-1;">
                <i data-lucide="user-x" style="width:40px;height:40px;margin-bottom:12px;opacity:0.4;"></i>
                <h4 style="color:var(--text-main); font-weight:700;">لا يوجد طلاب معينين لك حالياً</h4>
                <p style="font-size:0.9rem;">لم يتم تعيين أي طلاب لك في نظام الحصص الخاصة حتى الآن.</p>
              </div>`
            : this.assignedSubscriptions.map(sub => `
              <div class="glass-card" style="padding:20px; border-radius:18px; border:1px solid var(--border-color); display:flex; flex-direction:column; justify-space-between;">
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                    <span style="font-size:0.75rem; font-weight:700; padding:4px 12px; border-radius:12px; background:var(--primary-glow); color:var(--primary);">
                      ${sub.plan?.name || 'اشتراك شهري'}
                    </span>
                    <span style="font-size:0.8rem; color:var(--text-muted); font-weight:600;">
                      ${sub.totalSessions} حصص
                    </span>
                  </div>
                  
                  <h4 style="font-weight:800; font-size:1.1rem; margin:0 0 10px 0; color:var(--text-main);">
                    <i data-lucide="user" style="width:16px;height:16px;display:inline-block;margin-inline-end:6px; color:var(--primary);"></i>
                    الطالب: ${sub.student?.name || '-'}
                  </h4>
                  
                  <div style="font-size:0.88rem; color:var(--text-muted); margin-bottom:14px;">
                    الرصيد المتبقي: <strong style="color:var(--text-main); font-size:1.05rem;">${sub.remainingCredits}</strong> حصص من أصل ${sub.totalSessions}
                  </div>
                  
                  <!-- Progress Bar -->
                  <div style="background:var(--bg-app); border-radius:10px; height:8px; width:100%; overflow:hidden; margin-bottom:20px; border:1px solid var(--border-color);">
                    <div style="background:linear-gradient(90deg, var(--primary), var(--accent)); height:100%; width:${Math.min(100, (sub.usedCredits / sub.totalSessions) * 100)}%; border-radius:10px;"></div>
                  </div>
                </div>

                <button class="btn-primary view-sub-details-btn" data-id="${sub.id}" style="width:100%; padding:10px; font-size:0.85rem; justify-content:center; gap:8px; border-radius:10px;">
                  <i data-lucide="list" style="width:16px;height:16px;"></i> عرض وتتبع حصص الطالب
                </button>
              </div>
            `).join('')
          }
        </div>
      </div>
    `;
  }

  renderStudentSessionsTable() {
    const selectedSub = this.assignedSubscriptions.find(s => String(s.id) === String(this.selectedSubscriptionId));
    let subSessions = (this.privateSessions || []).filter(s => String(s.subscription?.id) === String(this.selectedSubscriptionId));
    
    // Apply filter
    if (this.sessionsFilterStatus !== 'all') {
      subSessions = subSessions.filter(s => (s.status || '').toLowerCase() === this.sessionsFilterStatus.toLowerCase());
    }

    // Sort sessions by date
    subSessions.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

    const statusBadge = (s) => {
        const st = (s.status || '').toLowerCase();
        if (st === 'live') return '<span class="badge" style="background:rgba(239,68,68,0.15); color:#ef4444; padding:4px 10px; border-radius:12px; font-weight:700;">بث مباشر 🔴</span>';
        if (st === 'completed') return '<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; padding:4px 10px; border-radius:12px; font-weight:700;">مكتملة ✅</span>';
        if (st.includes('cancel')) return '<span class="badge" style="background:rgba(239,68,68,0.15); color:#ef4444; padding:4px 10px; border-radius:12px; font-weight:700;">ملغاة ❌</span>';
        return '<span class="badge" style="background:rgba(99,102,241,0.15); color:var(--primary); padding:4px 10px; border-radius:12px; font-weight:700;">مجدولة 📅</span>';
    };

    const actionButtons = (s) => {
        const st = (s.status || '').toLowerCase();
        if (st === 'completed' || st.includes('cancel')) return '<span style="color:var(--text-muted); font-size:0.8rem;">تم الإنتهاء</span>';
        if (st === 'live') return `<button class="btn-secondary end-session-btn" data-id="${s.id}" style="font-size:0.8rem; padding:6px 14px; color:var(--error); border-color:var(--error);"><i data-lucide="stop-circle" style="width:14px;height:14px;"></i> إنهاء الحصة وتوثيق التقرير</button>`;
        
        return `
            <div style="display:flex; gap:6px;">
                <button class="btn-primary start-session-btn" data-id="${s.id}" style="font-size:0.8rem; padding:6px 14px;"><i data-lucide="play" style="width:14px;height:14px;"></i> بدء الحصة</button>
            </div>
        `;
    };

    return `
      <div class="teacher-layout">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; padding:20px; background:var(--bg-card); border-radius:18px; border:1px solid var(--border-color);">
            <div style="display:flex; align-items:center; gap:14px;">
                <button class="btn-secondary" id="back-to-students-overview-btn" style="padding:10px; border-radius:50%;"><i data-lucide="arrow-right"></i></button>
                <div>
                    <h2 style="font-size: 1.4rem; font-weight:800; margin:0;">حصص الطالب: ${selectedSub?.student?.name || 'محدد'}</h2>
                    <p style="color:var(--text-muted); margin:4px 0 0 0; font-size:0.85rem;">باقة: ${selectedSub?.plan?.name || 'اشتراك'} (${selectedSub?.remainingCredits} حصص متبقية من أصل ${selectedSub?.totalSessions})</p>
                </div>
            </div>
            <div style="display:flex; gap:12px;">
                <select id="private-sessions-status-filter" class="form-input" style="padding:8px 16px; border-radius:8px;">
                    <option value="all" ${this.sessionsFilterStatus === 'all' ? 'selected' : ''}>جميع الحالات</option>
                    <option value="scheduled" ${this.sessionsFilterStatus === 'scheduled' ? 'selected' : ''}>مجدولة</option>
                    <option value="live" ${this.sessionsFilterStatus === 'live' ? 'selected' : ''}>بث مباشر</option>
                    <option value="completed" ${this.sessionsFilterStatus === 'completed' ? 'selected' : ''}>مكتملة</option>
                    <option value="cancelled" ${this.sessionsFilterStatus === 'cancelled' ? 'selected' : ''}>ملغاة</option>
                </select>
            </div>
        </div>

        <div class="glass-card" style="padding:0; border-radius:18px; overflow:hidden; border:1px solid var(--border-color);">
            <div style="overflow-x:auto;">
                <table class="table" style="width:100%; text-align:start; border-collapse:collapse;">
                    <thead>
                        <tr style="border-bottom:1px solid var(--border-color); color:var(--text-muted); font-size:0.85rem; background:rgba(0,0,0,0.02);">
                            <th style="padding:16px; font-weight:700;">التاريخ والوقت</th>
                            <th style="padding:16px; font-weight:700;">الموضوع</th>
                            <th style="padding:16px; font-weight:700;">الحالة</th>
                            <th style="padding:16px; font-weight:700;">رابط الاجتماع</th>
                            <th style="padding:16px; font-weight:700;">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${subSessions.length === 0 ? `<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--text-muted);">لا توجد حصص تطابق حالة الفلتر الحالي.</td></tr>` : 
                        subSessions.map(s => {
                            const date = new Date(s.scheduledAt);
                            return `
                            <tr style="border-bottom:1px solid var(--border-color); font-size:0.9rem;">
                                <td style="padding:16px; font-weight:600;">
                                    <div style="color:var(--text-main);">${date.toLocaleDateString('ar')}</div>
                                    <div style="color:var(--text-muted); font-size:0.8rem; font-weight:500; margin-top:2px;">${date.toLocaleTimeString('ar', {hour:'2-digit', minute:'2-digit'})}</div>
                                </td>
                                <td style="padding:16px; color:var(--text-muted);">${s.topic || 'بدون موضوع'}</td>
                                <td style="padding:16px;">${statusBadge(s)}</td>
                                <td style="padding:16px;">
                                    <a href="${s.course?.meetingLink || s.teacher?.meetingLink || '#'}" target="_blank" style="color:var(--primary); text-decoration:none; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
                                        <i data-lucide="link" style="width:14px;height:14px;"></i> دخول الاجتماع
                                    </a>
                                </td>
                                <td style="padding:16px;">${actionButtons(s)}</td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.container.querySelectorAll(".view-sub-details-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const subId = e.currentTarget.getAttribute("data-id");
        this.selectedSubscriptionId = subId;
        this.renderContent();
      });
    });

    document.getElementById("back-to-students-overview-btn")?.addEventListener("click", () => {
      this.selectedSubscriptionId = null;
      this.renderContent();
    });

    document.getElementById("private-sessions-status-filter")?.addEventListener("change", (e) => {
      this.sessionsFilterStatus = e.target.value;
      this.renderContent();
    });

    // Start Session
    this.container.querySelectorAll(".start-session-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        try {
          const res = await apiFetch(`/sessions/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: "live" })
          });
          if (res.message) showToast(res.message, "success");
          await this.render();
        } catch (err) {
          showToast(err.message || "فشل بدء الجلسة", "error");
        }
      });
    });

    // End Session & Report
    this.container.querySelectorAll(".end-session-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        this.renderEndSessionReportModal(id);
      });
    });
  }

  renderEndSessionReportModal(sessionId) {
    const modalId = 'teacher-end-session-modal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.style.display = 'flex';
    overlay.style.backdropFilter = 'blur(8px)';
    overlay.style.background = 'rgba(0,0,0,0.6)';

    overlay.innerHTML = `
      <div class="modal-content" style="max-width:550px; width:92%; border-radius:24px; border:1px solid var(--border-color); padding:0; background:var(--bg-card);">
        <div class="modal-header" style="padding:22px 28px; background:linear-gradient(135deg, rgba(16,185,129,0.08), rgba(168,85,247,0.08)); border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:14px;">
            <div style="width:46px; height:46px; border-radius:14px; background:rgba(16,185,129,0.1); color:#10b981; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="check-circle" style="width:24px; height:24px;"></i>
            </div>
            <div>
              <h3 class="modal-title" style="font-size:1.2rem; font-weight:800; margin:0 0 2px 0; color:var(--text-main);">إنهاء الحصة وإرسال التقرير</h3>
              <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">سيتم خصم رصيد الطالب وإضافة المستحقات لرصيدك</p>
            </div>
          </div>
          <span class="modal-close-btn" id="close-${modalId}" style="font-size:1.4rem; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
        </div>
        <div class="modal-body" style="padding:28px; background:var(--bg-app);">
          <form id="end-session-report-form" style="display:flex; flex-direction:column; gap:16px;">
            <div>
              <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">ما تم إنجازه (Topic & Covered) <span style="color:var(--error);">*</span></label>
              <textarea id="report-covered" class="form-input" required rows="3" style="width:100%; padding:10px; resize:vertical;" placeholder="اكتب ملخصاً لما تم شرحه في هذه الحصة..."></textarea>
            </div>
            <div>
              <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">تقييم أداء الطالب <span style="color:var(--error);">*</span></label>
              <select id="report-performance" class="form-input" required style="width:100%; padding:10px;">
                <option value="Excellent">ممتاز</option>
                <option value="Good">جيد</option>
                <option value="Average">متوسط</option>
                <option value="Needs Improvement">يحتاج تحسين</option>
              </select>
            </div>
            <div>
              <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">الواجب المنزلي (Homework)</label>
              <input type="text" id="report-homework" class="form-input" style="width:100%; padding:10px;" placeholder="مثال: حل التمارين 1 إلى 5...">
            </div>
            <div>
              <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">ملاحظات إضافية (أو توصيات للأهل)</label>
              <textarea id="report-notes" class="form-input" rows="2" style="width:100%; padding:10px; resize:vertical;" placeholder="ملاحظات عامة..."></textarea>
            </div>
            
            <div style="display:flex; gap:12px; margin-top:12px; justify-content:flex-end;">
                <button type="button" class="btn-secondary" id="cancel-${modalId}">إلغاء</button>
                <button type="submit" class="btn-primary" style="background:#10b981; border-color:#10b981;">إنهاء الحصة وحفظ التقرير ✅</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => { overlay.remove(); };
    document.getElementById(`close-${modalId}`)?.addEventListener("click", closeModal);
    document.getElementById(`cancel-${modalId}`)?.addEventListener("click", closeModal);

    document.getElementById("end-session-report-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        whatWasCovered: document.getElementById("report-covered").value.trim(),
        topic: document.getElementById("report-covered").value.trim(),
        studentPerformance: document.getElementById("report-performance").value,
        homework: document.getElementById("report-homework").value.trim(),
        teacherNotes: document.getElementById("report-notes").value.trim()
      };

      try {
        const res = await apiFetch(`/sessions/${sessionId}/complete`, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        if (res.message) showToast(res.message, "success");
        closeModal();
        await this.render();
      } catch (err) {
        showToast(err.message || "فشل إنهاء الجلسة وحفظ التقرير", "error");
      }
    });
  }
}
