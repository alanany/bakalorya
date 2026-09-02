import { apiFetch, state, showToast, t, canJoinSession } from "../../app.js";

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
      const [assignedSubscriptions, privateSessions, allSessions] = await Promise.all([
        apiFetch("/subscriptions/teacher-assigned").catch(() => []),
        apiFetch("/teacher/private-sessions").catch(() => []),
        apiFetch("/sessions").catch(() => [])
      ]);

      this.assignedSubscriptions = assignedSubscriptions || [];
      const sessionMap = new Map();
      (privateSessions || []).forEach(s => sessionMap.set(s.id, s));
      (allSessions || []).filter(s => s.subscriptionId || s.subscription || s.student).forEach(s => {
        if (!sessionMap.has(s.id)) sessionMap.set(s.id, s);
      });
      this.privateSessions = Array.from(sessionMap.values());

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

                <button class="btn-primary view-sub-details-btn" data-id="${sub.id}" style="width:100%; padding:10px; font-size:0.85rem; justify-content:center; gap:8px; border-radius:10px; cursor:pointer;">
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
    let subSessions = (this.privateSessions || []).filter(s => {
      if (s.subscription && String(s.subscription.id) === String(this.selectedSubscriptionId)) return true;
      if (s.subscriptionId && String(s.subscriptionId) === String(this.selectedSubscriptionId)) return true;
      if (selectedSub?.student?.id && s.student && String(s.student.id) === String(selectedSub.student.id)) return true;
      return false;
    });
    
    // Apply filter
    if (this.sessionsFilterStatus !== 'all') {
      subSessions = subSessions.filter(s => (s.status || '').toLowerCase() === this.sessionsFilterStatus.toLowerCase());
    }

    // Sort sessions by date
    subSessions.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

    const statusBadge = (s) => {
        const st = (s.status || '').toLowerCase();
        const date = new Date(s.scheduledAt);
        const sessionTime = date.getTime();
        const durationMins = s.duration || 60;
        const durationMs = durationMins * 60 * 1000;
        const nowTime = Date.now();
        const isCompleted = st === 'completed' || st.includes('cancel');
        const isPastSession = !isCompleted && (nowTime >= sessionTime + durationMs);

        if (isCompleted) return '<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; padding:4px 10px; border-radius:12px; font-weight:700;">مكتملة ✅</span>';
        if (st.includes('cancel')) return '<span class="badge" style="background:rgba(239,68,68,0.15); color:#ef4444; padding:4px 10px; border-radius:12px; font-weight:700;">ملغاة ❌</span>';
        if (isPastSession) return '<span class="badge" style="background:rgba(239,68,68,0.1); color:#ef4444; padding:4px 10px; border-radius:12px; font-weight:700;">⌛ انتهى وقت الحصة</span>';
        if (st === 'live') return '<span class="badge" style="background:rgba(239,68,68,0.15); color:#ef4444; padding:4px 10px; border-radius:12px; font-weight:700;">بث مباشر 🔴</span>';
        return '<span class="badge" style="background:rgba(99,102,241,0.15); color:var(--primary); padding:4px 10px; border-radius:12px; font-weight:700;">مجدولة 📅</span>';
    };

    const actionButtons = (s) => {
        const st = (s.status || '').toLowerCase();
        const isCompleted = st === 'completed' || st.includes('cancel');
        if (isCompleted) return '<span style="color:var(--text-muted); font-size:0.8rem;">تم الإنتهاء</span>';

        const date = new Date(s.scheduledAt);
        const sessionTime = date.getTime();
        const durationMins = s.duration || 60;
        const durationMs = durationMins * 60 * 1000;
        const nowTime = Date.now();
        const isPastSession = !isCompleted && (nowTime >= sessionTime + durationMs);
        const isCheckedIn = window.checkedInSessions?.has(s.id);

        if (isPastSession) {
          return `
            <div style="display:flex; flex-direction:column; gap:6px;">
              <button class="btn-primary end-session-btn" data-id="${s.id}" style="font-size:0.75rem; padding:6px 10px; background:linear-gradient(135deg,#10b981,#059669); font-weight:800; border-color:#10b981; cursor:pointer;">
                <i data-lucide="file-check" style="width:13px;height:13px;"></i> توثيق التقرير وإنهاء 📝
              </button>
              ${isCheckedIn ? `
                <span style="font-size:0.75rem; font-weight:800; color:#10b981; padding:3px 6px; background:rgba(16,185,129,0.12); border-radius:6px; text-align:center;">حاضر ومسجل ✅</span>
              ` : `
                <button class="btn-secondary session-checkin-btn" data-id="${s.id}" data-role="teacher" style="width:100%; justify-content:center; font-size:0.75rem; padding:4px 8px; border-color:#10b981; color:#10b981; background:rgba(16,185,129,0.08); font-weight:800; cursor:pointer; border-radius:8px;">
                  <i data-lucide="user-check" style="width:12px; height:12px;"></i> تأكيد حضور المعلم ✍️
                </button>
              `}
            </div>
          `;
        }

        if (st === 'live') {
          return `
            <div style="display:flex; flex-direction:column; gap:6px;">
              <div style="display:flex; gap:6px;">
                <a href="#classroom/${s.id}" class="btn-primary" style="font-size:0.78rem; padding:6px 12px; text-decoration:none; background:linear-gradient(135deg,#10b981,#059669);"><i data-lucide="video" style="width:13px;height:13px;"></i> دخول القاعة 🎥</a>
                <button class="btn-secondary end-session-btn" data-id="${s.id}" style="font-size:0.78rem; padding:6px 12px; color:var(--error); border-color:var(--error);"><i data-lucide="stop-circle" style="width:13px;height:13px;"></i> إنهاء</button>
              </div>
              ${isCheckedIn ? `
                <span style="font-size:0.75rem; font-weight:800; color:#10b981; padding:3px 6px; background:rgba(16,185,129,0.12); border-radius:6px; text-align:center;">حاضر ومسجل ✅</span>
              ` : `
                <button class="btn-secondary session-checkin-btn" data-id="${s.id}" data-role="teacher" style="width:100%; justify-content:center; font-size:0.76rem; padding:5px 8px; border-color:#10b981; color:#10b981; background:rgba(16,185,129,0.08); font-weight:800; cursor:pointer; border-radius:8px;">
                  <i data-lucide="user-check" style="width:13px; height:13px;"></i> تأكيد حضور المعلم ✍️
                </button>
              `}
            </div>
          `;
        }

        const isJoinable = canJoinSession(s);

        if (isJoinable) {
          if (isCheckedIn) {
            return `
              <div style="display:flex; flex-direction:column; gap:6px;">
                <span style="font-size:0.75rem; font-weight:800; color:#10b981; padding:4px 8px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:8px; display:inline-flex; align-items:center; justify-content:center; gap:4px; width:100%; box-sizing:border-box;">
                  <i data-lucide="check-circle-2" style="width:13px; height:13px;"></i> حاضر ومسجل ✅
                </span>
                <div style="display:flex; gap:6px;">
                  <button class="btn-primary start-session-btn" data-id="${s.id}" style="font-size:0.78rem; padding:6px 12px;"><i data-lucide="play" style="width:13px;height:13px;"></i> بدء الحصة</button>
                  <a href="#classroom/${s.id}" class="btn-secondary" style="font-size:0.78rem; padding:6px 12px; text-decoration:none;"><i data-lucide="video" style="width:13px;height:13px;"></i> القاعة</a>
                </div>
              </div>
            `;
          } else {
            return `
              <div class="session-actions-wrapper" data-id="${s.id}" style="display:flex; flex-direction:column; gap:6px;">
                <button class="btn-primary session-checkin-btn" data-id="${s.id}" data-role="teacher" style="width:100%; justify-content:center; font-size:0.76rem; padding:7px 10px; background:linear-gradient(135deg,#10b981,#059669); color:#fff; font-weight:800; cursor:pointer; border-radius:8px; border:none; box-shadow:0 2px 8px rgba(16,185,129,0.25);">
                  <i data-lucide="user-check" style="width:13px; height:13px;"></i> تأكيد حضور المعلم (لست غائباً) ✍️
                </button>
                <div style="font-size:0.7rem; color:var(--text-muted); text-align:center;">* اضغط للتأكيد وتفعيل الدخول</div>
              </div>
            `;
          }
        }

        return `
            <div style="display:flex; align-items:center;">
              <button disabled class="btn-secondary" style="font-size:0.75rem; padding:6px 10px; opacity:0.85; cursor:not-allowed; background:rgba(99,102,241,0.06); color:var(--primary); border-color:rgba(99,102,241,0.2); font-weight:700;">
                <i data-lucide="lock" style="width:12px;height:12px;margin-inline-end:3px;"></i> ينشط قبل الموعد بساعة 🔒
              </button>
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
                            <th style="padding:16px; font-weight:700;">قاعة الحصة</th>
                            <th style="padding:16px; font-weight:700;">الإجراءات وتأكيد الحضور</th>
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
                                    <a href="#classroom/${s.id}" style="color:var(--primary); text-decoration:none; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
                                        <i data-lucide="video" style="width:15px;height:15px;"></i> دخول القاعة 🎥
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
        if (typeof window.showEndSessionReportModal === 'function') {
          window.showEndSessionReportModal(id, () => this.render());
        }
      });
    });

    // Check-in / confirm attendance button
    this.container.querySelectorAll(".session-checkin-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader" class="spinner" style="width:13px;height:13px;"></i> جاري تأكيد الحضور...`;
        if (window.lucide) window.lucide.createIcons();

        try {
          const res = await apiFetch(`/sessions/${id}/checkin`, { method: "POST" });
          showToast(res.message || "تم تأكيد حضورك في الحصة بنجاح ولن يتم احتسابك غائباً ✅", "success");
          window.checkedInSessions = window.checkedInSessions || new Set();
          window.checkedInSessions.add(id);

          const wrapper = btn.closest(".session-actions-wrapper") || btn.parentElement;
          if (wrapper) {
            wrapper.innerHTML = `
              <div style="display:flex; flex-direction:column; gap:6px;">
                <span style="font-size:0.75rem; font-weight:800; color:#10b981; padding:4px 8px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:8px; display:inline-flex; align-items:center; justify-content:center; gap:4px; width:100%; box-sizing:border-box;">
                  <i data-lucide="check-circle-2" style="width:13px; height:13px;"></i> حاضر ومسجل ✅
                </span>
                <div style="display:flex; gap:6px;">
                  <button class="btn-primary start-session-btn" data-id="${id}" style="font-size:0.78rem; padding:6px 12px;"><i data-lucide="play" style="width:13px;height:13px;"></i> بدء الحصة</button>
                  <a href="#classroom/${id}" class="btn-secondary" style="font-size:0.78rem; padding:6px 12px; text-decoration:none;"><i data-lucide="video" style="width:13px;height:13px;"></i> القاعة</a>
                </div>
              </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            wrapper.querySelectorAll(".start-session-btn").forEach(sBtn => {
              sBtn.addEventListener("click", async () => {
                const sId = sBtn.getAttribute("data-id");
                try {
                  const r = await apiFetch(`/sessions/${sId}/status`, { method: "PATCH", body: JSON.stringify({ status: "live" }) });
                  if (r.message) showToast(r.message, "success");
                  await this.render();
                } catch (err) {
                  showToast(err.message || "فشل بدء الجلسة", "error");
                }
              });
            });
          }
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = `<i data-lucide="user-check" style="width:13px; height:13px;"></i> تأكيد الحضور ✍️`;
          if (window.lucide) window.lucide.createIcons();
          showToast(err.message || "تعذر تأكيد الحضور.", "error");
        }
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
