import { apiFetch, showToast, t } from "../app.js";

export default class SubscriptionSessionsView {
  constructor(container, subscriptionId) {
    this.container = container;
    
    let subId = subscriptionId;
    if (typeof subId === 'string') {
      if (subId.includes('id=')) {
        const parts = subId.split('id=');
        subId = parts[1]?.split('&')[0] || subId;
      }
    }
    this.subscriptionId = subId;
    this.sessions = [];
  }

  async render() {
    try {
      const allSessions = await apiFetch("/sessions/my-private").catch(() => []);
      this.sessions = (allSessions || []).filter(s => {
        const sSubId = s.subscription?.id || s.subscriptionId;
        return String(sSubId) === String(this.subscriptionId);
      });

      this.container.innerHTML = `
        <div class="student-dashboard-layout" style="display:block;">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom: 24px;">
            <a href="#student-private-sessions" class="btn-secondary" style="padding:8px 12px; text-decoration:none;">
              <i data-lucide="arrow-right"></i> عودة
            </a>
            <h2 class="dashboard-section-title" style="font-size: 1.8rem; margin:0;">سجل حصص الاشتراك</h2>
          </div>

          <div style="margin-bottom:40px;">
            ${this.sessions.length === 0
              ? `<div class="glass-card" style="text-align:center; padding:24px; color:var(--text-muted);">
                  <i data-lucide="calendar" style="width:28px;height:28px;margin-bottom:8px;opacity:0.4;"></i>
                  <p>لا توجد حصص خاصة سابقة أو مجدولة لهذا الاشتراك.</p>
                </div>`
              : `<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:14px;">
                  ${this.sessions.map(s => this.renderSessionCard(s)).join('')}
                </div>`
            }
          </div>
        </div>
      `;

      this.bindEvents();
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error(err);
      this.container.innerHTML = `<div class="error-msg">تعذر تحميل الحصص.</div>`;
    }
  }

  renderSessionCard(session) {
    const now = new Date();
    const date = new Date(session.scheduledAt);
    const timeStr = date.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString('ar', { weekday: 'short', month: 'short', day: 'numeric' });

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + (24 * 60 * 60 * 1000) - 1;
    const sessionTime = date.getTime();

    const isPastDay = sessionTime < todayStart;
    const isFutureDay = sessionTime > todayEnd;
    const isToday = sessionTime >= todayStart && sessionTime <= todayEnd;

    const diffMins = (sessionTime - now.getTime()) / (1000 * 60);
    const durationMins = session.duration || 60;
    const isWithinJoinWindow = session.status === 'live' || (diffMins <= 30 && (diffMins + durationMins) >= -15);

    const statusMap = {
      'SCHEDULED': { label: 'مجدولة', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
      'CONFIRMED': { label: 'مؤكدة', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
      'COMPLETED': { label: 'مكتملة ✅', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
      'RESCHEDULED': { label: 'معاد جدولتها', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
      'CANCELLED_BY_STUDENT': { label: 'ملغاة', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
      'CANCELLED_BY_TEACHER': { label: 'ملغاة (المعلم)', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
      'NO_SHOW_STUDENT': { label: 'لم تحضر', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    };
    const st = statusMap[session.status] || { label: session.status, color: '#6b7280', bg: 'rgba(107,114,128,0.1)' };

    return `
      <div class="glass-card" style="padding:18px; border-radius:16px; border:1px solid var(--border-color);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
          <span style="font-size:0.72rem; font-weight:700; padding:3px 9px; border-radius:16px; background:${st.bg}; color:${st.color};">${st.label}</span>
          <span style="font-size:0.75rem; color:var(--text-muted);">${session.duration || 60} دقيقة</span>
        </div>
        <h4 style="font-weight:800; font-size:0.92rem; margin:0 0 4px 0; color:var(--text-main);">${session.topic || session.title || 'حصة خاصة'}</h4>
        <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:4px;">
          <i data-lucide="user" style="width:12px;height:12px;"></i> الأستاذ: ${session.teacher?.name || '-'}
        </div>
        <div style="font-size:0.8rem; color:var(--primary); font-weight:600; margin-bottom:8px;">
          <i data-lucide="calendar" style="width:12px;height:12px;"></i> ${dateStr} • ${timeStr}
        </div>

        ${session.status === 'COMPLETED' ? `
        <div style="background:rgba(16,185,129,0.05); border:1px solid rgba(16,185,129,0.15); border-radius:10px; padding:10px; font-size:0.78rem;">
          ${session.whatWasCovered ? `<div style="margin-bottom:4px;"><strong>📝 ما تم شرحه:</strong> ${session.whatWasCovered}</div>` : ''}
          ${session.studentPerformance ? `<div style="margin-bottom:4px;"><strong>⭐ الأداء:</strong> ${session.studentPerformance}</div>` : ''}
          ${session.homework ? `<div style="margin-bottom:4px;"><strong>📖 الواجب:</strong> ${session.homework}</div>` : ''}
          ${session.teacherNotes ? `<div><strong>💬 ملاحظات:</strong> ${session.teacherNotes}</div>` : ''}
          ${!session.whatWasCovered && !session.homework ? `<div style="color:var(--text-muted);">تم إكمال الحصة بنجاح</div>` : ''}
        </div>` : ''}

        <div style="display:flex; gap:8px; margin-top:10px; flex-direction:column;">
          ${(session.status === 'SCHEDULED' || session.status === 'CONFIRMED' || session.status === 'scheduled') ? `
            ${isPastDay ? `
              <button disabled class="btn-secondary" style="width:100%; justify-content:center; font-size:0.78rem; padding:8px; opacity:0.6; cursor:not-allowed; background:rgba(0,0,0,0.04); color:var(--text-muted); border-color:var(--border-color);">
                ⌛ انتهى موعد الحصة (غير متاحة للدخول)
              </button>
            ` : !isWithinJoinWindow ? `
              <button disabled class="btn-secondary" style="width:100%; justify-content:center; font-size:0.78rem; padding:8px; opacity:0.8; cursor:not-allowed; background:rgba(99,102,241,0.05); color:var(--primary); border-color:var(--border-color);" title="ينشط زر الدخول قبل موعد الحصة بـ 30 دقيقة">
                ⏰ الموعد ${timeStr} (ينشط قبل الموعد بـ 30د)
              </button>
            ` : `
              <a href="#classroom/${session.id}" class="btn-primary" style="width:100%; justify-content:center; font-size:0.85rem; padding:9px; text-decoration:none; gap:6px; background:#10b981; border-color:#10b981;">
                <i data-lucide="video" style="width:16px;height:16px;"></i> دخول الحصة الآن 🎥
              </a>
            `}
          ` : ''}

          ${(!isPastDay && (session.status === 'SCHEDULED' || session.status === 'CONFIRMED' || session.status === 'scheduled')) ? `
            <button class="btn-secondary cancel-my-session-btn" data-id="${session.id}" style="width:100%; justify-content:center; font-size:0.78rem; padding:7px; color:var(--error,#ef4444); border-color:var(--error,#ef4444);">
              إلغاء الحصة
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  
  renderCancelSessionModal(session) {
    const modalId = 'cancel-session-modal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const scheduledTime = session.scheduledAt ? new Date(session.scheduledAt).getTime() : Date.now();
    const nowTime = Date.now();
    const diffMs = scheduledTime - nowTime;
    const hoursDiff = diffMs / (1000 * 60 * 60);

    const isLateCancellation = hoursDiff < 2;

    const sessionDateStr = session.scheduledAt 
      ? new Date(session.scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : "موعد غير محدد";

    const hoursText = hoursDiff > 0 
      ? `${Math.floor(hoursDiff)} ساعة و ${Math.floor((diffMs % 3600000) / 60000)} دقيقة`
      : "الموعد حان أو مضى";

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.style.display = 'flex';
    overlay.style.backdropFilter = 'blur(8px)';
    overlay.style.background = 'rgba(0,0,0,0.6)';

    overlay.innerHTML = `
      <div class="modal-content" style="max-width:500px; width:92%; border-radius:24px; border:1px solid var(--border-color); padding:0; background:var(--bg-card); overflow:hidden;">
        <div class="modal-header" style="padding:22px 28px; background:linear-gradient(135deg, ${isLateCancellation ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'}, rgba(245,158,11,0.08)); border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:14px;">
            <div style="width:44px; height:44px; border-radius:14px; background:${isLateCancellation ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}; color:${isLateCancellation ? '#ef4444' : '#10b981'}; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="${isLateCancellation ? 'alert-triangle' : 'check-circle'}" style="width:24px; height:24px;"></i>
            </div>
            <div>
              <h3 class="modal-title" style="font-size:1.15rem; font-weight:800; margin:0 0 2px 0; color:var(--text-main);">إلغاء الحصة الخاصة</h3>
              <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">موعد الحصة: ${sessionDateStr}</p>
            </div>
          </div>
          <span class="modal-close-btn" id="close-cancel-modal" style="font-size:1.4rem; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
        </div>

        <div class="modal-body" style="padding:24px; background:var(--bg-app);">
          ${!isLateCancellation ? `
            <div style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:14px; padding:16px; margin-bottom:18px; color:var(--text-main); font-size:0.85rem; line-height:1.6;">
              <div style="color:#10b981; font-weight:800; font-size:0.92rem; margin-bottom:4px;">✅ إلغاء مجاني (متبقي ${hoursText}):</div>
              نظراً للإلغاء قبل موعد الحصة بـ <strong>أكثر من ساعتين</strong>، سيتم إلغاء الحصة وحفظ رصيدك في اشتراكك بالكامل لإعادة جدولتها في أي وقت مجاناً.
            </div>
          ` : `
            <div style="background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); border-radius:14px; padding:16px; margin-bottom:18px; color:var(--text-main); font-size:0.85rem; line-height:1.6;">
              <div style="color:#ef4444; font-weight:800; font-size:0.92rem; margin-bottom:4px;">⚠️ تحذير إلغاء متأخر (متبقي ${hoursText}):</div>
              الإلغاء قبل أقل من <strong>ساعتين</strong> من موعد الحصة سيؤدي إلى <strong>خصم رصيد الحصة واحتسابها</strong> تعويضاً عن وقت المعلم المخصص وفق سياسة المنصة.
            </div>
          `}

          <form id="cancel-session-form" style="display:flex; flex-direction:column; gap:14px;">
            <div>
              <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">سبب الإلغاء (اختياري)</label>
              <input type="text" id="cancel-reason" class="form-input" style="width:100%; padding:10px; border-radius:10px;" placeholder="اكتب سبب الإلغاء...">
            </div>
            <div style="display:flex; gap:12px; margin-top:8px; justify-content:flex-end;">
              <button type="button" class="btn-secondary" id="dismiss-cancel-modal">تراجع</button>
              <button type="submit" class="btn-primary" style="background:${isLateCancellation ? '#ef4444' : 'var(--primary)'}; border-color:${isLateCancellation ? '#ef4444' : 'var(--primary)'};">تأكيد الإلغاء ❌</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => { overlay.remove(); };
    document.getElementById("close-cancel-modal")?.addEventListener("click", closeModal);
    document.getElementById("dismiss-cancel-modal")?.addEventListener("click", closeModal);

    document.getElementById("cancel-session-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const reason = document.getElementById("cancel-reason").value.trim() || "إلغاء من الطالب";

      try {
        const res = await apiFetch(`/sessions/${session.id}/cancel`, {
          method: "POST",
          body: JSON.stringify({ reason })
        });
        showToast(res.message || "تم إلغاء الحصة.", res.isLate ? "warning" : "success");
        closeModal();
        await this.render();
      } catch (err) {
        showToast(err.message || "تعذر إلغاء الحصة.", "error");
      }
    });
  }

  bindEvents() {
    this.container.querySelectorAll('.cancel-my-session-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const session = (this.sessions || []).find(s => String(s.id) === String(id)) || { id };
        this.renderCancelSessionModal(session);
      });
    });
  }
}
