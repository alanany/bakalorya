import { apiFetch, state, showToast, t, confirmDialog, renderPhoneInputGroup, getCleanWhatsAppNumber, renderEducationSelectHTML, handleWhatsAppResponse, formatSessionDateTime, getTimezoneBadgeHTML } from '../../app.js';

// ── AdminSubscriptionsPage ─────────────────────────────────────────────────────────────
// Methods extracted from AdminView.js — assigned to AdminView.prototype

export const AdminSubscriptionsPage = {

  renderSingleSubRow(s, isChild = false, isHidden = false) {
    let statusBadgeBg = 'rgba(16,185,129,0.1)';
    let statusBadgeColor = '#10b981';
    let statusText = s.status;

    if (s.status === 'PENDING_PAYMENT') {
      statusBadgeBg = 'rgba(245,158,11,0.15)';
      statusBadgeColor = '#f59e0b';
      statusText = '1️⃣ في انتظار تأكيد الدفع ورفع الإيصال ⏳';
    } else if (s.status === 'TEACHER_ASSIGNMENT_PENDING') {
      statusBadgeBg = 'rgba(59,130,246,0.15)';
      statusBadgeColor = '#3b82f6';
      statusText = '2️⃣ تم الدفع - في انتظار تعيين المعلم ⏳';
    } else if (s.status === 'SCHEDULE_PENDING') {
      statusBadgeBg = 'rgba(139,92,246,0.15)';
      statusBadgeColor = '#8b5cf6';
      statusText = '3️⃣ تم تعيين المعلم - في انتظار جدولة الباقة 🗓️';
    } else if (s.status === 'ACTIVE') {
      statusBadgeBg = 'rgba(16,185,129,0.15)';
      statusBadgeColor = '#10b981';
      statusText = 'نشط ✅';
    } else if (s.status === 'CANCELLED') {
      statusBadgeBg = 'rgba(239,68,68,0.15)';
      statusBadgeColor = '#ef4444';
      statusText = 'ملغى ❌';
    }

    const rowBg = s.isLowBalance
      ? 'background:rgba(239,68,68,0.03);'
      : (isChild ? 'background:rgba(0,0,0,0.015);' : '');

    const displayStyle = isHidden ? 'display:none;' : '';
    const childBorder = isChild ? 'border-inline-start:4px solid var(--primary);' : '';
    const studentIdAttr = s.studentId || s.student?.id || '';

    return `
    <tr class="${isChild ? `admin-sub-child-row student-child-${studentIdAttr}` : ''}" style="border-bottom:1px solid var(--border-color);font-size:0.85rem;${rowBg}${childBorder}${displayStyle}">
      <td style="padding:12px;color:var(--text-muted);${isChild ? 'padding-inline-start:24px;' : ''}">
        ${isChild ? '<span style="font-size:0.75rem; color:var(--primary); font-weight:700; margin-inline-end:4px;">↳</span>' : ''}#${s.id.substring(0, 8)}
      </td>
      <td style="padding:12px;font-weight:600;">${s.student?.name || '-'}</td>
      <td style="padding:12px;">
        ${s.plan?.name || '-'} 
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
          ${s.totalSessions} حصص الإجمالي - ${s.plan?.price || 0} ج.م
        </div>
      </td>
      <td style="padding:12px;">${s.teacher?.name || '<span style="color:var(--warning,#f59e0b);">في الانتظار</span>'}</td>
      <td style="padding:12px;">
        <div style="display:flex; flex-direction:column; gap:4px; align-items:flex-start;">
          <span class="badge" style="background:${statusBadgeBg};color:${statusBadgeColor};font-weight:600;">
            ${statusText}
          </span>
          ${s.isLowBalance ? `
            <span class="badge" style="background:rgba(239,68,68,0.15);color:#ef4444;font-weight:700;font-size:0.72rem;display:inline-flex;align-items:center;gap:4px;">
              <i data-lucide="alert-triangle" style="width:12px;height:12px;"></i> رصيد منخفض (${s.remainingSessionsInPackage} حصص متبقية)
            </span>
          ` : ''}
        </div>
      </td>
      <td style="padding:12px;display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${s.status === 'PENDING_PAYMENT' ? `
            <button class="btn-primary admin-approve-sub-btn" data-id="${s.id}" style="padding:6px 10px;font-size:0.75rem;background:#10b981;border-color:#10b981;gap:4px;">
              <i data-lucide="check-circle" style="width:14px;height:14px;"></i> 1️⃣ قبول + رفع إيصال
            </button>
            <button class="btn-secondary admin-reject-sub-btn" data-id="${s.id}" style="padding:6px 10px;font-size:0.75rem;color:#ef4444;border-color:#ef4444;gap:4px;">
              <i data-lucide="x-circle" style="width:14px;height:14px;"></i> رفض
            </button>
            ` : ''}

            ${s.status === 'TEACHER_ASSIGNMENT_PENDING' ? `
            <button class="btn-primary admin-assign-teacher-sub-btn" data-id="${s.id}" style="padding:6px 10px;font-size:0.75rem;background:#3b82f6;border-color:#3b82f6;color:#fff;gap:4px;">
              <i data-lucide="user-plus" style="width:14px;height:14px;"></i> 2️⃣ تعيين المعلم
            </button>
            ` : ''}

            ${s.status === 'SCHEDULE_PENDING' ? `
            <button class="btn-primary admin-package-wizard-btn" data-id="${s.id}" data-teacher="${s.teacher?.id || ''}" style="padding:6px 10px;font-size:0.75rem;background:#8b5cf6;border-color:#8b5cf6;gap:4px;">
              <i data-lucide="calendar-range" style="width:14px;height:14px;"></i> 3️⃣ جدولة الباقة 🗓️
            </button>
            <button class="btn-secondary admin-assign-teacher-sub-btn" data-id="${s.id}" style="padding:6px;font-size:0.75rem;">
              <i data-lucide="user-plus" style="width:14px;height:14px;"></i> تغيير المعلم
            </button>
            ` : ''}

            ${(s.status === 'ACTIVE' || s.isLowBalance) ? `
            <button class="btn-primary admin-renew-sub-btn" data-id="${s.id}" style="padding:6px 10px;font-size:0.75rem;background:#8b5cf6;border-color:#8b5cf6;gap:4px;">
              <i data-lucide="refresh-cw" style="width:14px;height:14px;"></i> تجديد + رفع إيصال 💳
            </button>
            ` : ''}

            ${s.status === 'ACTIVE' ? `
            <button class="btn-secondary admin-edit-schedule-btn" data-id="${s.id}" data-teacher="${s.teacher?.id || ''}" style="padding:6px;font-size:0.75rem;gap:4px;border-color:var(--primary);color:var(--primary);font-weight:700;">
              <i data-lucide="edit-3" style="width:14px;height:14px;"></i> تعديل الجدولة ✏️
            </button>
            <button class="btn-secondary admin-view-sub-sessions-btn" data-id="${s.id}" style="padding:6px;font-size:0.75rem;gap:4px;">
              <i data-lucide="list" style="width:14px;height:14px;"></i> عرض الحصص 🔍
            </button>
            <button class="btn-secondary admin-assign-teacher-sub-btn" data-id="${s.id}" style="padding:6px;font-size:0.75rem;">
              <i data-lucide="user-plus" style="width:14px;height:14px;"></i> المعلم
            </button>
            ` : ''}
        </div>
        ${s.status === 'ACTIVE' ? `
        <div style="font-size:0.75rem; display:flex; gap:10px; flex-wrap:wrap; color:var(--text-muted); background:rgba(0,0,0,0.02); padding:6px; border-radius:6px;">
            <span style="color:#10b981;font-weight:600;">مكتملة: ${s.completedSessions}</span>
            <span style="color:var(--primary);font-weight:600;">مجدولة: ${s.scheduledSessions}</span>
            <span style="color:#8b5cf6;font-weight:600;">غير مجدولة: ${s.remainingToBook}</span>
            <span style="color:${s.remainingSessionsInPackage < 3 ? '#ef4444' : '#10b981'};font-weight:700;">المتبقي بالباقة: ${s.remainingSessionsInPackage}</span>
        </div>
        ` : ''}
      </td>
    </tr>
  `;
  },

  // ── 9. Subscriptions Tab ─────────────────────────────────────────────────────────────

  renderSubscriptionsTab() {
    const allSubs = this.subscriptions || [];
    const allSessions = this.allSessions || [];

    // Map metrics for all subscriptions
    const subsWithMetrics = allSubs.map(s => {
      const totalSessions = s.totalSessions || s.plan?.sessionsCount || 0;
      const subSessions = allSessions.filter(sess => sess.subscription?.id === s.id);
      const completedSessions = subSessions.filter(sess => sess.status === 'COMPLETED' || sess.status === 'completed').length;
      const scheduledSessions = subSessions.filter(sess => sess.status === 'SCHEDULED' || sess.status === 'scheduled' || sess.status === 'RESCHEDULED').length;
      const totalBooked = completedSessions + scheduledSessions;
      const remainingToBook = Math.max(0, totalSessions - totalBooked);
      const remainingSessionsInPackage = Math.max(0, totalSessions - completedSessions);
      const isLowBalance = (s.status === 'ACTIVE' || s.status === 'TEACHER_ASSIGNMENT_PENDING') && remainingSessionsInPackage < 3;

      return {
        ...s,
        totalSessions,
        completedSessions,
        scheduledSessions,
        totalBooked,
        remainingToBook,
        remainingSessionsInPackage,
        isLowBalance
      };
    });

    const lowBalanceCount = subsWithMetrics.filter(s => s.isLowBalance).length;
    const pendingCount = subsWithMetrics.filter(s => s.status === 'PENDING_PAYMENT').length;

    // Apply Filter
    const filter = this.subFilter || "all";
    const filteredSubs = subsWithMetrics.filter(s => {
      if (filter === "low_sessions") return s.isLowBalance;
      if (filter === "pending") return s.status === "PENDING_PAYMENT";
      if (filter === "active") return s.status === "ACTIVE";
      if (filter === "cancelled") return s.status === "CANCELLED";
      return true;
    });

    // Group filtered subscriptions by student
    const studentGroups = {};
    const groupedSubsList = [];
    filteredSubs.forEach(s => {
      const studentKey = String(s.studentId || s.student?.id || s.student?.email || s.student?.name || 'unknown');
      if (!studentGroups[studentKey]) {
        studentGroups[studentKey] = {
          studentId: studentKey,
          studentName: s.student?.name || 'طالب غير محدد',
          subs: []
        };
        groupedSubsList.push(studentGroups[studentKey]);
      }
      studentGroups[studentKey].subs.push(s);
    });

    const renderedRowsHtml = groupedSubsList.map(group => {
      if (group.subs.length === 1) {
        return this.renderSingleSubRow(group.subs[0]);
      }

      // Aggregate metrics for multiple subscriptions of the same student
      const totalSessionsSum = group.subs.reduce((sum, item) => sum + (item.totalSessions || 0), 0);
      const completedSessionsSum = group.subs.reduce((sum, item) => sum + (item.completedSessions || 0), 0);
      const scheduledSessionsSum = group.subs.reduce((sum, item) => sum + (item.scheduledSessions || 0), 0);
      const remainingToBookSum = group.subs.reduce((sum, item) => sum + (item.remainingToBook || 0), 0);
      const remainingSessionsInPackageSum = group.subs.reduce((sum, item) => sum + (item.remainingSessionsInPackage || 0), 0);
      const totalPriceSum = group.subs.reduce((sum, item) => sum + (item.plan?.price || 0), 0);
      const isLowBalanceAny = group.subs.some(item => item.isLowBalance);
      const pendingCountGroup = group.subs.filter(item => item.status === 'PENDING_PAYMENT').length;
      const activeCountGroup = group.subs.filter(item => item.status === 'ACTIVE').length;
      const teachersList = [...new Set(group.subs.map(item => item.teacher?.name).filter(Boolean))].join('، ') || 'في الانتظار';
      const isExpanded = this.expandedStudents ? this.expandedStudents.has(group.studentId) : false;

      const latestSub = group.subs[0];
      let primaryActionBtnHtml = '';

      if (latestSub.status === 'PENDING_PAYMENT') {
        primaryActionBtnHtml = `
          <button class="btn-primary admin-approve-sub-btn" data-id="${latestSub.id}" style="padding:6px 10px;font-size:0.75rem;background:#10b981;border-color:#10b981;gap:4px;">
            <i data-lucide="check-circle" style="width:14px;height:14px;"></i> 1️⃣ قبول + رفع إيصال
          </button>
        `;
      } else if (latestSub.status === 'TEACHER_ASSIGNMENT_PENDING') {
        primaryActionBtnHtml = `
          <button class="btn-primary admin-assign-teacher-sub-btn" data-id="${latestSub.id}" style="padding:6px 10px;font-size:0.75rem;background:#3b82f6;border-color:#3b82f6;color:#fff;gap:4px;">
            <i data-lucide="user-plus" style="width:14px;height:14px;"></i> 2️⃣ تعيين المعلم
          </button>
        `;
      } else if (latestSub.status === 'SCHEDULE_PENDING') {
        primaryActionBtnHtml = `
          <button class="btn-primary admin-package-wizard-btn" data-id="${latestSub.id}" data-teacher="${latestSub.teacher?.id || ''}" style="padding:6px 10px;font-size:0.75rem;background:#8b5cf6;border-color:#8b5cf6;gap:4px;">
            <i data-lucide="calendar-range" style="width:14px;height:14px;"></i> 3️⃣ جدولة الباقة 🗓️
          </button>
        `;
      } else if (latestSub.status === 'ACTIVE' || latestSub.isLowBalance) {
        primaryActionBtnHtml = `
          <button class="btn-primary admin-renew-sub-btn" data-id="${latestSub.id}" style="padding:6px 10px;font-size:0.75rem;background:#8b5cf6;border-color:#8b5cf6;gap:4px;">
            <i data-lucide="refresh-cw" style="width:14px;height:14px;"></i> 💳 تجديد + رفع إيصال
          </button>
        `;
      }

      const summaryRow = `
        <tr class="admin-student-summary-row" data-student-id="${group.studentId}" style="border-bottom:1px solid var(--border-color); font-size:0.85rem; background:rgba(99,102,241,0.06); cursor:pointer;">
          <td style="padding:12px; color:var(--primary); font-weight:800;">
            <div style="display:flex; align-items:center; gap:6px;">
              <i data-lucide="${isExpanded ? 'chevron-down' : 'chevron-left'}" style="width:16px;height:16px;"></i>
              <span>مجمّع (${group.subs.length})</span>
            </div>
          </td>
          <td style="padding:12px; font-weight:700;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:0.95rem;">${group.studentName}</span>
              <span class="badge" style="background:var(--primary-glow); color:var(--primary); font-weight:800; font-size:0.72rem;">${group.subs.length} اشتراكات</span>
            </div>
          </td>
          <td style="padding:12px;">
            <strong style="color:var(--text-main); font-size:0.9rem;">إجمالي ${totalSessionsSum} حصص</strong>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
              إجمالي التكلفة: ${totalPriceSum} ج.م
            </div>
          </td>
          <td style="padding:12px; font-weight:600; font-size:0.82rem;">${teachersList}</td>
          <td style="padding:12px;">
            <div style="display:flex; flex-direction:column; gap:4px; align-items:flex-start;">
              <span class="badge" style="background:rgba(59,130,246,0.15); color:#3b82f6; font-weight:700;">
                مجموع ${group.subs.length} اشتراكات (${activeCountGroup} نشط${pendingCountGroup > 0 ? `، ${pendingCountGroup} انتظار` : ''})
              </span>
              ${isLowBalanceAny ? `
                <span class="badge" style="background:rgba(239,68,68,0.15);color:#ef4444;font-weight:700;font-size:0.72rem;display:inline-flex;align-items:center;gap:4px;">
                  <i data-lucide="alert-triangle" style="width:12px;height:12px;"></i> يوجد اشتراك برصيد منخفض
                </span>
              ` : ''}
            </div>
          </td>
          <td style="padding:12px; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
              ${primaryActionBtnHtml}
              <button class="btn-primary toggle-student-subs-btn" data-student-id="${group.studentId}" style="padding:6px 12px; font-size:0.78rem; gap:6px; background:var(--primary); font-weight:700; border-radius:8px;">
                <i data-lucide="${isExpanded ? 'chevron-up' : 'chevron-down'}" style="width:14px;height:14px;"></i>
                ${isExpanded ? 'إخفاء الاشتراكات' : `عرض جميع الاشتراكات (${group.subs.length})`}
              </button>
            </div>
            <div style="font-size:0.75rem; display:flex; gap:8px; flex-wrap:wrap; color:var(--text-muted); background:rgba(0,0,0,0.03); padding:6px 8px; border-radius:6px;">
              <span style="color:#10b981;font-weight:700;">مكتملة: ${completedSessionsSum}</span>
              <span style="color:var(--primary);font-weight:700;">مجدولة: ${scheduledSessionsSum}</span>
              <span style="color:#8b5cf6;font-weight:700;">غير مجدولة: ${remainingToBookSum}</span>
              <span style="color:${remainingSessionsInPackageSum < 3 ? '#ef4444' : '#10b981'};font-weight:800;">المتبقي بالباقة: ${remainingSessionsInPackageSum}</span>
            </div>
          </td>
        </tr>
      `;

      const childRows = group.subs.map(s => this.renderSingleSubRow(s, true, !isExpanded)).join('');
      return summaryRow + childRows;
    }).join('');

    return `
      ${lowBalanceCount > 0 ? `
      <div class="glass-card" style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.3); color:#ef4444; padding:16px 20px; border-radius:14px; margin-bottom:20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <i data-lucide="alert-triangle" style="width:24px;height:24px;flex-shrink:0;"></i>
          <div>
            <strong style="font-size:0.95rem;">تنبيه رصيد الحصص ⚠️:</strong>
            <span style="font-size:0.88rem; color:var(--text-main); margin-inline-start:6px;">يوجد <strong>${lowBalanceCount}</strong> اشتراك متبقي به أقل من 3 حصص ويحتاج إلى التجديد!</span>
          </div>
        </div>
        <button class="btn-primary admin-sub-filter-btn" data-filter="low_sessions" style="background:#ef4444; border-color:#ef4444; font-size:0.75rem; padding:6px 14px;">
          عرض الاشتراكات المنخفضة (${lowBalanceCount})
        </button>
      </div>
      ` : ''}

      <div class="glass-card" style="padding:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
          <h3 style="font-weight:700;font-size:1.1rem;display:flex;align-items:center;gap:8px;">
            <i data-lucide="calendar-heart" style="color:var(--primary);width:20px;height:20px;"></i>
            قائمة الاشتراكات
          </h3>
          
          <!-- Filters -->
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn-secondary admin-sub-filter-btn ${filter === 'all' ? 'active' : ''}" data-filter="all" style="padding:6px 12px; font-size:0.8rem; ${filter === 'all' ? 'background:var(--primary);color:#fff;border-color:var(--primary);' : ''}">
              الكل (${subsWithMetrics.length})
            </button>
            <button class="btn-secondary admin-sub-filter-btn ${filter === 'low_sessions' ? 'active' : ''}" data-filter="low_sessions" style="padding:6px 12px; font-size:0.8rem; ${filter === 'low_sessions' ? 'background:#ef4444;color:#fff;border-color:#ef4444;' : ''}">
              ⚠️ رصيد منخفض (${lowBalanceCount})
            </button>
            <button class="btn-secondary admin-sub-filter-btn ${filter === 'pending' ? 'active' : ''}" data-filter="pending" style="padding:6px 12px; font-size:0.8rem; ${filter === 'pending' ? 'background:#f59e0b;color:#fff;border-color:#f59e0b;' : ''}">
              ⏳ في انتظار الدفع (${pendingCount})
            </button>
            <button class="btn-secondary admin-sub-filter-btn ${filter === 'active' ? 'active' : ''}" data-filter="active" style="padding:6px 12px; font-size:0.8rem; ${filter === 'active' ? 'background:#10b981;color:#fff;border-color:#10b981;' : ''}">
              ✅ نشط
            </button>
            <button class="btn-secondary admin-sub-filter-btn ${filter === 'cancelled' ? 'active' : ''}" data-filter="cancelled" style="padding:6px 12px; font-size:0.8rem; ${filter === 'cancelled' ? 'background:var(--border-color);' : ''}">
              ❌ ملغى
            </button>
          </div>
        </div>

        <div style="overflow-x:auto;">
          <table class="table" style="width:100%;text-align:start;border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:1px solid var(--border-color);color:var(--text-muted);font-size:0.8rem;">
                <th style="padding:12px;font-weight:700;">المعرف</th>
                <th style="padding:12px;font-weight:700;">الطالب</th>
                <th style="padding:12px;font-weight:700;">الخطة / الحصص</th>
                <th style="padding:12px;font-weight:700;">المعلم المعين</th>
                <th style="padding:12px;font-weight:700;">الحالة والتنبيهات</th>
                <th style="padding:12px;font-weight:700;">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${renderedRowsHtml || `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted);">لا توجد اشتراكات تنطبق عليها شروط البحث.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // ── 10. Earnings & Billings Tab ─────────────────────────────────────────────────────────────

  renderApproveSubscriptionModal(subId) {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const sub = (this.subscriptions || []).find(s => s.id === subId);
    if (!sub) return;

    const defaultAmount = sub.plan?.price || 0;

    container.innerHTML = `
      <div class="modal-overlay" id="approve-sub-modal" style="display:flex;">
        <div class="modal-content" style="max-width:520px;">
          <div class="modal-header">
            <h3 class="modal-title">قبول طلب الاشتراك وتأكيد الدفع 💳</h3>
            <span class="modal-close-btn" id="close-approve-sub-modal">&times;</span>
          </div>
          <form id="approve-sub-form">
            <div class="modal-body" style="display:flex;flex-direction:column;gap:16px;">
              <div style="background:var(--card-bg-light, rgba(255,255,255,0.05));padding:12px;border-radius:8px;font-size:0.85rem;">
                <div><strong>الطالب:</strong> ${sub.student?.name || '-'}</div>
                <div><strong>الخطة:</strong> ${sub.plan?.name || '-'} (${sub.plan?.sessionsCount || 0} حصص)</div>
                <div><strong>السعر المستحق:</strong> ${defaultAmount} ج.م</div>
              </div>

              <div class="form-group">
                <label style="font-size:0.88rem;font-weight:700;display:block;margin-bottom:6px;">صورة إيصال التحويل / الدفع 🖼️:</label>
                <input type="file" id="approve-sub-receipt-file" class="form-input" accept="image/*" style="width:100%;padding:8px;">
                <div id="receipt-preview-container" style="margin-top:8px;display:none;">
                  <img id="receipt-preview" src="" style="max-height:150px;border-radius:8px;border:1px solid var(--border-color);max-width:100%;">
                </div>
              </div>

              <div class="form-group">
                <label style="font-size:0.88rem;font-weight:700;display:block;margin-bottom:6px;">المبلغ المدفوع (ج.م):</label>
                <input type="number" id="approve-sub-amount" class="form-input" value="${defaultAmount}" required style="width:100%;padding:10px;">
              </div>

              <div class="form-group">
                <label style="font-size:0.88rem;font-weight:700;display:block;margin-bottom:6px;">وسيلة الدفع / المزود:</label>
                <input type="text" id="approve-sub-provider" class="form-input" value="تحويل بنكي / فودافون كاش" style="width:100%;padding:10px;">
              </div>

              <div class="form-group">
                <label style="font-size:0.88rem;font-weight:700;display:block;margin-bottom:6px;">ملاحظات العملية (اختياري):</label>
                <textarea id="approve-sub-notes" class="form-input" rows="2" style="width:100%;padding:10px;" placeholder="رقم المعاملة أو ملاحظات الأدمن..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" id="cancel-approve-sub-btn">إلغاء</button>
              <button type="submit" class="btn-primary" id="submit-approve-sub-btn" style="background:#10b981;border-color:#10b981;">تأكيد الدفع وتفعيل الاشتراك ✅</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = () => { container.innerHTML = ""; };
    document.getElementById("close-approve-sub-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-approve-sub-btn")?.addEventListener("click", closeModal);

    const fileInput = document.getElementById("approve-sub-receipt-file");
    const previewContainer = document.getElementById("receipt-preview-container");
    const previewImg = document.getElementById("receipt-preview");

    fileInput?.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          previewImg.src = e.target.result;
          previewContainer.style.display = "block";
        };
        reader.readAsDataURL(file);
      } else {
        previewContainer.style.display = "none";
      }
    });

    document.getElementById("approve-sub-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById("submit-approve-sub-btn");
      submitBtn.disabled = true;
      submitBtn.innerText = "جاري التفعيل...";

      try {
        let receiptUrl = null;
        if (fileInput?.files?.[0]) {
          const formData = new FormData();
          formData.append("file", fileInput.files[0]);
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            },
            body: formData
          });
          if (uploadRes.ok) {
            const data = await uploadRes.json();
            receiptUrl = data.url;
          } else {
            showToast("فشل رفع صورة الإيصال", "error");
            submitBtn.disabled = false;
            submitBtn.innerText = "تأكيد الدفع وتفعيل الاشتراك ✅";
            return;
          }
        }

        const amount = document.getElementById("approve-sub-amount").value;
        const provider = document.getElementById("approve-sub-provider").value;
        const notes = document.getElementById("approve-sub-notes").value;

        const res = await apiFetch(`/admin/subscriptions/${subId}/approve`, {
          method: "PATCH",
          body: JSON.stringify({ receiptUrl, amount, provider, notes })
        });

        showToast("تم تأكيد الدفع وتفعيل الاشتراك بنجاح 🎉", "success");
        closeModal();
        await this.loadAllData();
        this.renderTab("subscriptions");
      } catch (err) {
        showToast(err.message || "حدث خطأ أثناء تفعيل الاشتراك", "error");
        submitBtn.disabled = false;
        submitBtn.innerText = "تأكيد الدفع وتفعيل الاشتراك ✅";
      }
    });
  },

  renderRenewSubscriptionModal(subId) {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const sub = (this.subscriptions || []).find(s => s.id === subId);
    if (!sub) return;

    const plans = this.allPlans || [];
    const currentPlanId = sub.plan?.id || (plans[0]?.id || "");
    const defaultAmount = sub.plan?.price || 0;
    const defaultSessions = sub.plan?.sessionsCount || 8;

    container.innerHTML = `
      <div class="modal-overlay" id="renew-sub-modal" style="display:flex;">
        <div class="modal-content" style="max-width:520px;">
          <div class="modal-header">
            <h3 class="modal-title">تجديد الاشتراك وإضافة حصص 🔄💳</h3>
            <span class="modal-close-btn" id="close-renew-sub-modal">&times;</span>
          </div>
          <form id="renew-sub-form">
            <div class="modal-body" style="display:flex;flex-direction:column;gap:16px;">
              <div style="background:var(--card-bg-light, rgba(255,255,255,0.05));padding:12px;border-radius:8px;font-size:0.85rem;">
                <div><strong>الطالب:</strong> ${sub.student?.name || '-'}</div>
                <div><strong>الخطة الحالية:</strong> ${sub.plan?.name || '-'}</div>
                <div><strong>إجمالي الحصص المسجلة حالياً:</strong> ${sub.totalSessions || 0} حصة</div>
              </div>

              <div class="form-group">
                <label style="font-size:0.88rem;font-weight:700;display:block;margin-bottom:6px;">اختر باقة التجديد:</label>
                <select id="renew-sub-plan-select" class="form-input" style="width:100%;padding:10px;">
                  ${plans.map(p => `<option value="${p.id}" data-price="${p.price}" data-sessions="${p.sessionsCount}" ${p.id === currentPlanId ? 'selected' : ''}>${p.name} (${p.sessionsCount} حصة - ${p.price} ج.م)</option>`).join('')}
                </select>
              </div>

              <div class="form-group">
                <label style="font-size:0.88rem;font-weight:700;display:block;margin-bottom:6px;">عدد الحصص المضافة للرصيد:</label>
                <input type="number" id="renew-sub-sessions" class="form-input" value="${defaultSessions}" required min="1" style="width:100%;padding:10px;">
              </div>

              <div class="form-group">
                <label style="font-size:0.88rem;font-weight:700;display:block;margin-bottom:6px;">صورة إيصال التحويل / الدفع 🖼️:</label>
                <input type="file" id="renew-sub-receipt-file" class="form-input" accept="image/*" style="width:100%;padding:8px;">
                <div id="renew-receipt-preview-container" style="margin-top:8px;display:none;">
                  <img id="renew-receipt-preview" src="" style="max-height:150px;border-radius:8px;border:1px solid var(--border-color);max-width:100%;">
                </div>
              </div>

              <div class="form-group">
                <label style="font-size:0.88rem;font-weight:700;display:block;margin-bottom:6px;">المبلغ المدفوع للتجديد (ج.م):</label>
                <input type="number" id="renew-sub-amount" class="form-input" value="${defaultAmount}" required style="width:100%;padding:10px;">
              </div>

              <div class="form-group">
                <label style="font-size:0.88rem;font-weight:700;display:block;margin-bottom:6px;">وسيلة الدفع / المزود:</label>
                <input type="text" id="renew-sub-provider" class="form-input" value="تحويل بنكي / فودافون كاش" style="width:100%;padding:10px;">
              </div>

              <div class="form-group">
                <label style="font-size:0.88rem;font-weight:700;display:block;margin-bottom:6px;">ملاحظات عملية التجديد (اختياري):</label>
                <textarea id="renew-sub-notes" class="form-input" rows="2" style="width:100%;padding:10px;" placeholder="رقم عملية التحويل أو أي ملاحظات..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" id="cancel-renew-sub-btn">إلغاء</button>
              <button type="submit" class="btn-primary" id="submit-renew-sub-btn" style="background:#8b5cf6;border-color:#8b5cf6;">حفظ التجديد وإضافة الرصيد ✅</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = () => { container.innerHTML = ""; };
    document.getElementById("close-renew-sub-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-renew-sub-btn")?.addEventListener("click", closeModal);

    const planSelect = document.getElementById("renew-sub-plan-select");
    const sessionsInput = document.getElementById("renew-sub-sessions");
    const amountInput = document.getElementById("renew-sub-amount");
    const fileInput = document.getElementById("renew-sub-receipt-file");
    const previewContainer = document.getElementById("renew-receipt-preview-container");
    const previewImg = document.getElementById("renew-receipt-preview");

    planSelect?.addEventListener("change", () => {
      const selectedOpt = planSelect.options[planSelect.selectedIndex];
      if (selectedOpt) {
        if (selectedOpt.getAttribute("data-sessions")) {
          sessionsInput.value = selectedOpt.getAttribute("data-sessions");
        }
        if (selectedOpt.getAttribute("data-price")) {
          amountInput.value = selectedOpt.getAttribute("data-price");
        }
      }
    });

    fileInput?.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          previewImg.src = e.target.result;
          previewContainer.style.display = "block";
        };
        reader.readAsDataURL(file);
      } else {
        previewContainer.style.display = "none";
      }
    });

    document.getElementById("renew-sub-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById("submit-renew-sub-btn");
      submitBtn.disabled = true;
      submitBtn.innerText = "جاري الحفظ والتحميل...";

      try {
        let receiptUrl = null;
        if (fileInput?.files?.[0]) {
          const formData = new FormData();
          formData.append("file", fileInput.files[0]);
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            },
            body: formData
          });
          if (uploadRes.ok) {
            const data = await uploadRes.json();
            receiptUrl = data.url;
          } else {
            showToast("فشل رفع صورة الإيصال", "error");
            submitBtn.disabled = false;
            submitBtn.innerText = "حفظ التجديد وإضافة الرصيد ✅";
            return;
          }
        }

        const planId = planSelect.value;
        const sessionsCount = sessionsInput.value;
        const amount = amountInput.value;
        const provider = document.getElementById("renew-sub-provider").value;
        const notes = document.getElementById("renew-sub-notes").value;

        const res = await apiFetch(`/admin/subscriptions/${subId}/renew`, {
          method: "PATCH",
          body: JSON.stringify({ planId, sessionsCount, amount, provider, notes, receiptUrl })
        });

        showToast(res.message || "تم تجديد الاشتراك وإضافة الرصيد بنجاح 🎉", "success");
        closeModal();
        await this.loadAllData();
        this.renderTab("subscriptions");
      } catch (err) {
        showToast(err.message || "حدث خطأ أثناء تجديد الاشتراك", "error");
        submitBtn.disabled = false;
        submitBtn.innerText = "حفظ التجديد وإضافة الرصيد ✅";
      }
    });
  },

  renderAssignTeacherToSubscriptionModal(subId) {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const sub = (this.subscriptions || []).find(s => s.id === subId);
    if (!sub) return;

    const teachers = (this.allMembers || []).filter(u => u.role === "teacher");

    container.innerHTML = `
      <div class="modal-overlay" id="assign-teacher-sub-modal" style="display:flex;">
        <div class="modal-content" style="max-width:480px;">
          <div class="modal-header">
            <h3 class="modal-title">تعيين / تغيير المعلم للاشتراك</h3>
            <span class="modal-close-btn" id="close-assign-sub-modal">&times;</span>
          </div>
          <form id="assign-teacher-sub-form">
            <div class="modal-body">
              <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">اختر المعلم الذي سيتولى تقديم الجلسات لهذا الاشتراك الخاص.</p>
              <div class="form-group">
                <label for="assign-teacher-sub-select" style="font-size:0.88rem; font-weight:700; display:block; margin-bottom:6px;">اختر المعلم:</label>
                <select id="assign-teacher-sub-select" class="form-input" style="width:100%; padding:10px;">
                  ${teachers.map(t => `<option value="${t.id}" ${sub.teacher?.id === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" id="cancel-assign-sub-btn">إلغاء</button>
              <button type="submit" class="btn-primary">حفظ المعلم</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = () => { container.innerHTML = ""; };
    document.getElementById("close-assign-sub-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-assign-sub-btn")?.addEventListener("click", closeModal);

    document.getElementById("assign-teacher-sub-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const teacherId = document.getElementById("assign-teacher-sub-select").value;
      try {
        const res = await apiFetch(`/admin/subscriptions/${subId}/assign-teacher`, {
          method: "PATCH",
          body: JSON.stringify({ teacherId })
        });
        showToast(res.message || "تم تعيين المعلم بنجاح", "success");
        closeModal();
        await this.loadAllData();
        this.renderTab("subscriptions");
      } catch (err) {
        showToast(err.message || "فشل تعيين المعلم", "error");
      }
    });
  },

  async renderPackageScheduleWizardModal(subId, defaultTeacherId = null, isEditMode = false) {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    let scheduleDetails = null;
    try {
      scheduleDetails = await apiFetch(`/subscriptions/${subId}/schedule-details`);
    } catch (err) {
      showToast("تعذر جلب تفاصيل الاشتراك للجدولة", "error");
      return;
    }

    const { subscription, availability = [], completedCount = 0, scheduledCount = 0, totalSessions = 8 } = scheduleDetails;
    const teachers = (this.allMembers || []).filter(u => u.role === "teacher");
    const activeTeacherId = defaultTeacherId || subscription.teacher?.id || (teachers[0]?.id || "");

    let currentStep = 1;
    let previewData = null;

    const daysAr = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const availDaysList = availability.map(a => `${daysAr[a.dayOfWeek]} (${a.startTime} - ${a.endTime})`);

    const now = new Date();
    const nextSaturday = new Date();
    nextSaturday.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7));
    const defaultStartDateStr = nextSaturday.toISOString().slice(0, 10);

    container.innerHTML = `
      <div class="modal-overlay" id="package-wizard-modal" style="display:flex;">
        <div class="modal-content" style="max-width:680px; width:95%;">
          
          <div class="modal-header">
            <h3 class="modal-title" style="display:flex; align-items:center; gap:8px;">
              <i data-lucide="calendar-range" style="color:var(--primary);"></i>
              ${isEditMode ? 'تعديل جدول حصص الباقة ✏️' : 'جدولة الباقة (Package Scheduler) 🗓️'}
            </h3>
            <span class="modal-close-btn" id="close-wiz-modal">&times;</span>
          </div>

          <div style="display:flex; align-items:center; justify-content:space-between; margin:16px 0 24px 0; padding:12px; background:var(--bg-app); border-radius:14px; border:1px solid var(--border-color);">
            <div id="wiz-nav-1" style="display:flex; align-items:center; gap:8px; font-weight:800; font-size:0.88rem; color:var(--primary);">
              <span style="width:28px; height:28px; border-radius:50%; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center;">1</span>
              <span>الباقة والمعلم</span>
            </div>
            <div style="flex:1; height:2px; background:var(--border-color); margin:0 12px;" id="wiz-line-1"></div>
            <div id="wiz-nav-2" style="display:flex; align-items:center; gap:8px; font-weight:700; font-size:0.88rem; color:var(--text-muted);">
              <span style="width:28px; height:28px; border-radius:50%; background:var(--bg-card); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:center;">2</span>
              <span>نمط الجدولة</span>
            </div>
            <div style="flex:1; height:2px; background:var(--border-color); margin:0 12px;" id="wiz-line-2"></div>
            <div id="wiz-nav-3" style="display:flex; align-items:center; gap:8px; font-weight:700; font-size:0.88rem; color:var(--text-muted);">
              <span style="width:28px; height:28px; border-radius:50%; background:var(--bg-card); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:center;">3</span>
              <span>معاينة وتأكيد</span>
            </div>
          </div>

          <div class="modal-body" style="min-height:300px;">
            
            <div id="step-content-1">
              <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:14px; padding:16px; margin-bottom:20px;">
                <h4 style="font-weight:800; font-size:0.95rem; color:var(--primary); margin:0 0 12px 0;">📋 بيانات اشتراك الطالب</h4>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px; font-size:0.88rem;">
                  <div><span style="color:var(--text-muted);">الطالب:</span> <strong>${subscription.student?.name || '-'}</strong></div>
                  <div><span style="color:var(--text-muted);">الباقة والخطة:</span> <strong>${subscription.plan?.name || '-'}</strong></div>
                  <div><span style="color:var(--text-muted);">مدة الحصة:</span> <strong>${subscription.plan?.sessionDurationMins || 60} دقيقة</strong></div>
                  <div>
                    <span style="color:var(--text-muted);">الحصص:</span> 
                    <span class="badge" style="background:rgba(79,70,229,0.1); color:var(--primary); font-weight:700;">
                      مجدولة: ${scheduledCount} / مكتملة: ${completedCount} (إجمالي ${totalSessions})
                    </span>
                  </div>
                </div>
                ${isEditMode && completedCount > 0 ? `
                  <div style="margin-top:12px; padding:8px 12px; background:rgba(245,158,11,0.1); border-radius:8px; font-size:0.8rem; color:#b45309; font-weight:700;">
                    🔒 ملاحظة: توجد ${completedCount} حصة مكتملة سابقاً ولا يتم تعديلها أو حذفها. التعديل يشمل الحصص المتبقية فقط.
                  </div>
                ` : ''}
              </div>

              <div class="form-group" style="margin-bottom:16px;">
                <label for="wiz-teacher-select" style="font-size:0.88rem; font-weight:700; display:block; margin-bottom:6px;">تحديد معلم الباقة:</label>
                <select id="wiz-teacher-select" class="form-select" style="padding:10px; font-size:0.9rem; width:100%;">
                  <option value="">-- اختر معلم المنصة --</option>
                  ${teachers.map(t => `
                    <option value="${t.id}" ${String(t.id) === String(activeTeacherId) ? 'selected' : ''}>
                      ${t.name} (${t.email})
                    </option>
                  `).join("")}
                </select>
              </div>

              <div id="wiz-avail-box" style="background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.2); border-radius:12px; padding:12px;">
                <div style="font-size:0.82rem; font-weight:700; color:#10b981; margin-bottom:6px;">
                  <i data-lucide="check-circle" style="width:14px;height:14px;"></i> أوقات وأيام التفرغ المحددة للمعلم:
                </div>
                <div id="wiz-avail-badges" style="display:flex; flex-wrap:wrap; gap:6px;">
                  ${availDaysList.length > 0 ? availDaysList.map(a => `<span class="badge" style="background:rgba(16,185,129,0.15); color:#047857; font-size:0.78rem;">✓ ${a}</span>`).join('') : '<span style="font-size:0.8rem; color:var(--text-muted);">لم يتم تسجيل جدول تفرغ محدد (متاح جميع الأيام).</span>'}
                </div>
              </div>
            </div>

            <div id="step-content-2" style="display:none;">
              <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">
                حدد أيام وأوقات تكرار الحصص ليقوم النظام بإنشاء وتحديد مواعيد الـ ${totalSessions - completedCount} حصة المتبقية تلقائياً.
              </p>

              <div class="form-group" style="margin-bottom:16px;">
                <label for="wiz-freq-select" style="font-size:0.88rem; font-weight:700; display:block; margin-bottom:6px;">طريقة وتكرار الجدولة:</label>
                <select id="wiz-freq-select" class="form-select" style="padding:10px; font-size:0.9rem; width:100%;">
                  <option value="custom_days">مواعيد أيام محددة (أسبوعياً)</option>
                  <option value="weekly">أسبوعياً (حصة واحدة كل 7 أيام)</option>
                  <option value="biweekly">حصتان أسبوعياً (توزيع منتظم)</option>
                </select>
              </div>

              <div class="form-group" style="margin-bottom:16px;">
                <label style="font-size:0.88rem; font-weight:700; display:block; margin-bottom:8px;">أيام الحصص الأسبوعية:</label>
                <div style="display:flex; flex-wrap:wrap; gap:10px; background:var(--bg-app); padding:12px; border-radius:12px; border:1px solid var(--border-color);">
                  <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="wizDays" value="6" checked /> السبت</label>
                  <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="wizDays" value="0" /> الأحد</label>
                  <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="wizDays" value="1" checked /> الاثنين</label>
                  <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="wizDays" value="2" /> الثلاثاء</label>
                  <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="wizDays" value="3" /> الأربعاء</label>
                  <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="wizDays" value="4" /> الخميس</label>
                  <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="wizDays" value="5" /> الجمعة</label>
                </div>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
                <div class="form-group">
                  <label for="wiz-start-date" style="font-size:0.88rem; font-weight:700; display:block; margin-bottom:6px;">تاريخ بداية الباقة (الحصة الأولى):</label>
                  <input type="date" id="wiz-start-date" class="form-input" value="${defaultStartDateStr}" min="${defaultStartDateStr}" style="padding:10px; font-size:0.9rem; width:100%;" />
                </div>
                <div class="form-group">
                  <label for="wiz-time-of-day" style="font-size:0.88rem; font-weight:700; display:block; margin-bottom:6px;">وقت الموعد اليومي:</label>
                  <input type="time" id="wiz-time-of-day" class="form-input" value="18:00" style="padding:10px; font-size:0.9rem; width:100%;" />
                </div>
              </div>

              <button type="button" id="wiz-gen-btn" class="btn-primary" style="width:100%; padding:12px; font-size:0.95rem; display:flex; align-items:center; justify-content:center; gap:8px;">
                <i data-lucide="sparkles"></i> إنشاء ومعاينة مواعيد الحصص تلقائياً (Auto Schedule) ⚡
              </button>
            </div>

            <div id="step-content-3" style="display:none;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                <h4 style="font-weight:800; font-size:1rem; margin:0;">جدول معاينة حصص الباقة</h4>
                <span id="wiz-count-badge" class="badge" style="background:rgba(16,185,129,0.1); color:#10b981; font-weight:700; padding:6px 12px;">-</span>
              </div>

              <div id="wiz-conflict-banner" style="display:none; background:rgba(245,158,11,0.1); border:1px solid #f59e0b; border-radius:10px; padding:10px 14px; margin-bottom:12px; font-size:0.83rem; color:#b45309; font-weight:600;">
                ⚠️ تنبيه: تم اكتشاف تعارض أو عدم توفر في بعض المواعيد. يمكنك تعديل التاريخ/الوقت مباشرة في الجدول أدناه لكل حصة قبل الحفظ.
              </div>

              <div style="overflow-x:auto; max-height:280px; overflow-y:auto; border:1px solid var(--border-color); border-radius:12px; margin-bottom:16px;">
                <table style="width:100%; border-collapse:collapse; font-size:0.83rem;">
                  <thead style="position:sticky; top:0; background:var(--bg-app); border-bottom:1px solid var(--border-color); color:var(--text-muted);">
                    <tr>
                      <th style="padding:10px 12px; text-align:start;">#</th>
                      <th style="padding:10px 12px; text-align:start;">اليوم والتاريخ</th>
                      <th style="padding:10px 12px; text-align:start;">الوقت</th>
                      <th style="padding:10px 12px; text-align:start;">المعلم</th>
                      <th style="padding:10px 12px; text-align:start;">الحالة</th>
                      <th style="padding:10px 12px; text-align:end;">تعديل الموعد يدويًا</th>
                    </tr>
                  </thead>
                  <tbody id="wiz-preview-tbody"></tbody>
                </table>
              </div>
            </div>

          </div>

          <div class="modal-footer" style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; border-top:1px solid var(--border-color); padding-top:16px;">
            <button type="button" class="btn-secondary" id="wiz-prev-btn" style="display:none;">⬅️ السابق</button>
            <div style="display:flex; gap:8px; margin-inline-start:auto;">
              <button type="button" class="btn-secondary" id="wiz-cancel-btn">إلغاء</button>
              <button type="button" class="btn-primary" id="wiz-next-btn">التالي (نمط الجدولة) ➡️</button>
              <button type="button" class="btn-primary" id="wiz-confirm-btn" style="display:none;">تأكيد الجدولة وحفظ الباقة 🚀</button>
            </div>
          </div>

        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => { container.innerHTML = ""; };
    document.getElementById("close-wiz-modal")?.addEventListener("click", closeModal);
    document.getElementById("wiz-cancel-btn")?.addEventListener("click", closeModal);

    const step1El = document.getElementById("step-content-1");
    const step2El = document.getElementById("step-content-2");
    const step3El = document.getElementById("step-content-3");

    const nav1 = document.getElementById("wiz-nav-1");
    const nav2 = document.getElementById("wiz-nav-2");
    const nav3 = document.getElementById("wiz-nav-3");

    const prevBtn = document.getElementById("wiz-prev-btn");
    const nextBtn = document.getElementById("wiz-next-btn");
    const confirmBtn = document.getElementById("wiz-confirm-btn");

    const setStep = (step) => {
      currentStep = step;
      step1El.style.display = step === 1 ? "block" : "none";
      step2El.style.display = step === 2 ? "block" : "none";
      step3El.style.display = step === 3 ? "block" : "none";

      prevBtn.style.display = step > 1 ? "block" : "none";
      nextBtn.style.display = step < 3 ? "block" : "none";
      confirmBtn.style.display = step === 3 ? "block" : "none";

      [nav1, nav2, nav3].forEach((nav, idx) => {
        const s = idx + 1;
        const iconSpan = nav.querySelector("span:first-child");
        if (s === step) {
          nav.style.color = "var(--primary)";
          nav.style.fontWeight = "800";
          iconSpan.style.background = "var(--primary)";
          iconSpan.style.color = "#fff";
        } else if (s < step) {
          nav.style.color = "#10b981";
          nav.style.fontWeight = "700";
          iconSpan.style.background = "#10b981";
          iconSpan.style.color = "#fff";
        } else {
          nav.style.color = "var(--text-muted)";
          nav.style.fontWeight = "600";
          iconSpan.style.background = "var(--bg-card)";
          iconSpan.style.color = "var(--text-muted)";
        }
      });
    };

    nextBtn.addEventListener("click", () => {
      if (currentStep === 1) setStep(2);
      else if (currentStep === 2) {
        document.getElementById("wiz-gen-btn").click();
      }
    });

    prevBtn.addEventListener("click", () => {
      if (currentStep > 1) setStep(currentStep - 1);
    });

    document.getElementById("wiz-gen-btn")?.addEventListener("click", async () => {
      const teacherId = document.getElementById("wiz-teacher-select").value;
      const frequency = document.getElementById("wiz-freq-select").value;
      const daysOfWeek = Array.from(document.querySelectorAll('input[name="wizDays"]:checked')).map(cb => parseInt(cb.value, 10));
      const startDate = document.getElementById("wiz-start-date").value;
      const timeOfDay = document.getElementById("wiz-time-of-day").value;

      if (!startDate) {
        showToast("يرجى اختيار تاريخ بدء الباقة", "error");
        return;
      }
      if (frequency === "custom_days" && daysOfWeek.length === 0) {
        showToast("يرجى اختيار يوم واحد على الأقل من أيام الأسبوع", "error");
        return;
      }

      try {
        const payload = {
          subscriptionId: subId,
          teacherId,
          startDate,
          frequency,
          daysOfWeek,
          timeOfDay,
          isEditMode
        };

        previewData = await apiFetch("/sessions/preview-package-schedule", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        renderPreviewTable(previewData);
        setStep(3);
      } catch (err) {
        showToast(err.message || "فشلت معاينة جدول الباقة", "error");
      }
    });

    const renderPreviewTable = (data) => {
      const tbody = document.getElementById("wiz-preview-tbody");
      const badge = document.getElementById("wiz-count-badge");
      const conflictBanner = document.getElementById("wiz-conflict-banner");

      if (!tbody) return;

      badge.textContent = `${data.validCount} / ${data.countGenerated} حصة جاهزة للجدولة`;
      if (data.conflictCount > 0) {
        conflictBanner.style.display = "block";
      } else {
        conflictBanner.style.display = "none";
      }

      tbody.innerHTML = (data.items || []).map((item, idx) => {
        const d = new Date(item.scheduledAt);
        const dateStr = d.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
        const timeStr = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        const isoLocal = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

        return `
          <tr style="border-bottom:1px solid var(--border-color);" data-idx="${idx}">
            <td style="padding:10px 12px; font-weight:700;">#${item.index}</td>
            <td style="padding:10px 12px; font-weight:700;">${item.dayName} ${dateStr}</td>
            <td style="padding:10px 12px;">${timeStr}</td>
            <td style="padding:10px 12px;">${item.teacherName}</td>
            <td style="padding:10px 12px;">
              ${item.status === 'VALID'
            ? '<span class="badge" style="background:rgba(16,185,129,0.1); color:#10b981;">✓ جاهزة</span>'
            : `<span class="badge" style="background:rgba(239,68,68,0.1); color:#ef4444;" title="${item.conflictReason || ''}">⚠️ تعارض</span>`
          }
            </td>
            <td style="padding:10px 12px; text-align:end;">
              <input type="datetime-local" class="form-input wiz-row-date" data-idx="${idx}" value="${isoLocal}" style="padding:4px 8px; font-size:0.8rem;" />
            </td>
          </tr>
        `;
      }).join("");

      tbody.querySelectorAll(".wiz-row-date").forEach(input => {
        input.addEventListener("change", (e) => {
          const idx = parseInt(e.target.getAttribute("data-idx"), 10);
          if (previewData && previewData.items[idx]) {
            previewData.items[idx].scheduledAt = new Date(e.target.value).toISOString();
            previewData.items[idx].status = "VALID";
            previewData.items[idx].conflictReason = null;
            renderPreviewTable(previewData);
          }
        });
      });
    };

    confirmBtn.addEventListener("click", async () => {
      if (!previewData || !previewData.items || previewData.items.length === 0) {
        showToast("لا توجد حصص لمعاينتها وتأكيدها", "error");
        return;
      }

      const teacherId = document.getElementById("wiz-teacher-select").value;
      confirmBtn.disabled = true;

      try {
        const payload = {
          subscriptionId: subId,
          teacherId,
          sessions: previewData.items,
          isEditMode
        };

        const res = await apiFetch("/sessions/confirm-package-schedule", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        showToast(res.message || "تمت جدولة كافة حصص الباقة بنجاح! 🚀", "success");
        closeModal();
        await this.loadAllData();
        this.renderTab("sessions");
      } catch (err) {
        showToast(err.message || "فشل تأكيد جدولة الباقة", "error");
        confirmBtn.disabled = false;
      }
    });
  }

};
