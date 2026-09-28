import { apiFetch, state, showToast, t, confirmDialog, renderPhoneInputGroup, getCleanWhatsAppNumber, renderEducationSelectHTML, handleWhatsAppResponse, formatSessionDateTime, getTimezoneBadgeHTML } from '../../app.js';

// ── AdminEarningsPage ─────────────────────────────────────────────────────────────
// Methods extracted from AdminView.js — assigned to AdminView.prototype

export const AdminEarningsPage = {

  renderEarningsTab() {
    const e = this.adminEarnings || { payments: [], earnings: [] };
    const payments = e.payments || [];
    const earnings = e.earnings || [];

    const successfulPayments = payments.filter(p => p.status === "SUCCESS" || !p.status);
    const totalRevenue = successfulPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPayouts = earnings.reduce((sum, ear) => sum + (ear.amount || 0), 0);
    const platformNet = Math.max(0, totalRevenue - totalPayouts);

    const formatCurrency = (val) => `${Number(val || 0).toLocaleString('ar-EG')} ج.م`;

    return `
      <!-- Stat Cards Grid (Clickable) -->
      <div class="dashboard-stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin-bottom:32px;">
        <div class="glass-card stat-box admin-stat-card-clickable" id="stat-card-total-revenue" style="cursor:pointer; transition: all 0.2s ease; border: 1px solid var(--border-color);" title="انقر لعرض جدول الفواتير والمدفوعات الكامل">
          <div class="stat-box-icon" style="color:var(--success); background:var(--success-glow);">
            <i data-lucide="dollar-sign"></i>
          </div>
          <div>
            <div class="stat-box-val">${formatCurrency(totalRevenue)}</div>
            <div class="stat-box-lbl" style="font-weight:700;">إجمالي إيرادات المنصة 💳</div>
            <div style="font-size:0.75rem; color:var(--success); margin-top:4px; font-weight:600; display:flex; align-items:center; gap:4px;">
              <i data-lucide="arrow-down" style="width:12px;height:12px;"></i> انقر للتنقل لجدول الفواتير (${payments.length})
            </div>
          </div>
        </div>

        <div class="glass-card stat-box admin-stat-card-clickable" id="stat-card-total-payouts" style="cursor:pointer; transition: all 0.2s ease; border: 1px solid var(--border-color);" title="انقر لعرض مستحقات المعلمين">
          <div class="stat-box-icon" style="color:var(--warning, #f59e0b); background:rgba(245,158,11,0.15);">
            <i data-lucide="credit-card"></i>
          </div>
          <div>
            <div class="stat-box-val">${formatCurrency(totalPayouts)}</div>
            <div class="stat-box-lbl" style="font-weight:700;">إجمالي مستحقات المعلمين 💰</div>
            <div style="font-size:0.75rem; color:var(--warning, #f59e0b); margin-top:4px; font-weight:600; display:flex; align-items:center; gap:4px;">
              <i data-lucide="arrow-down" style="width:12px;height:12px;"></i> انقر للتنقل للمستحقات (${earnings.length})
            </div>
          </div>
        </div>

        <div class="glass-card stat-box" style="border: 1px solid var(--border-color);">
          <div class="stat-box-icon" style="color:var(--primary); background:var(--primary-glow);">
            <i data-lucide="pie-chart"></i>
          </div>
          <div>
            <div class="stat-box-val">${formatCurrency(platformNet)}</div>
            <div class="stat-box-lbl" style="font-weight:700;">صافي أرباح المنصة 📈</div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
              (الإيرادات - مستحقات المعلمين)
            </div>
          </div>
        </div>
      </div>

      <!-- Section 1: Detailed Platform Billings & Payments Table -->
      <div class="glass-card" id="admin-billings-section" style="padding:24px; margin-bottom:32px; border-radius:16px;">
        <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:16px; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid var(--border-color);">
          <div>
            <h3 style="font-weight:800; font-size:1.2rem; display:flex; align-items:center; gap:10px; margin:0 0 4px 0; color:var(--text-main);">
              <i data-lucide="receipt" style="color:var(--primary); width:24px; height:24px;"></i>
              سجل مدفوعات وفواتير الطلاب التفصيلية
            </h3>
            <p style="margin:0; font-size:0.85rem; color:var(--text-muted);">عرض وتحليل كامل لكافة عمليات السداد والفواتير والإيرادات الواردة</p>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
            <div style="position:relative;">
              <input type="text" id="admin-billing-search" class="form-input" placeholder="بحث باسم الطالب أو الفاتورة..." style="padding:8px 12px 8px 36px; font-size:0.85rem; width:220px; border-radius:8px;">
              <i data-lucide="search" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); width:16px; height:16px; color:var(--text-muted);"></i>
            </div>
            <select id="admin-billing-type-filter" class="form-input" style="padding:8px 12px; font-size:0.85rem; border-radius:8px; width:150px;">
              <option value="ALL">جميع الأنواع</option>
              <option value="SUBSCRIPTION">اشتراكات الباقات</option>
              <option value="COURSE_ENROLLMENT">شراء كورسات</option>
            </select>
            <select id="admin-billing-status-filter" class="form-input" style="padding:8px 12px; font-size:0.85rem; border-radius:8px; width:140px;">
              <option value="ALL">جميع الحالات</option>
              <option value="SUCCESS">ناجحة ✅</option>
              <option value="PENDING">قيد المراجعة ⏳</option>
              <option value="FAILED">فاشلة ❌</option>
            </select>
          </div>
        </div>

        <div style="overflow-x:auto;">
          <table class="table" style="width:100%; text-align:start; border-collapse:collapse;" id="admin-billings-table">
            <thead>
              <tr style="border-bottom:1px solid var(--border-color); color:var(--text-muted); font-size:0.82rem; background:rgba(0,0,0,0.02);">
                <th style="padding:12px; font-weight:700;">رقم الفاتورة</th>
                <th style="padding:12px; font-weight:700;">الطالب</th>
                <th style="padding:12px; font-weight:700;">البند / تفاصيل الشراء</th>
                <th style="padding:12px; font-weight:700;">المبلغ</th>
                <th style="padding:12px; font-weight:700;">طريقة الدفع</th>
                <th style="padding:12px; font-weight:700;">الحالة</th>
                <th style="padding:12px; font-weight:700;">التاريخ</th>
                <th style="padding:12px; font-weight:700; text-align:center;">الإجراءات</th>
              </tr>
            </thead>
            <tbody id="admin-billings-tbody">
              ${this.renderBillingsTableRows(payments)}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section 2: Teacher Payouts Table -->
      <div class="glass-card" id="admin-payouts-section" style="padding:24px; border-radius:16px;">
        <h3 style="font-weight:800; font-size:1.2rem; display:flex; align-items:center; gap:10px; margin-bottom:20px; color:var(--text-main);">
          <i data-lucide="wallet" style="color:var(--warning,#f59e0b); width:24px; height:24px;"></i>
          مستحقات المعلمين (Teacher Payouts)
        </h3>
        <div style="overflow-x:auto;">
          <table class="table" style="width:100%; text-align:start; border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:1px solid var(--border-color); color:var(--text-muted); font-size:0.82rem; background:rgba(0,0,0,0.02);">
                <th style="padding:12px; font-weight:700;">المعلم</th>
                <th style="padding:12px; font-weight:700;">المبلغ</th>
                <th style="padding:12px; font-weight:700;">النوع / الوصف</th>
                <th style="padding:12px; font-weight:700;">الحالة</th>
                <th style="padding:12px; font-weight:700;">التاريخ</th>
                <th style="padding:12px; font-weight:700; text-align:center;">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${earnings.map(ear => {
                const teacherAvatar = (ear.teacher?.avatar && !ear.teacher.avatar.includes('dicebear.com')) ? ear.teacher.avatar : 'assets/logo.png';
                const methodLabel = ear.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' :
                                    ear.paymentMethod === 'instapay' ? 'إنستاباي' :
                                    ear.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' :
                                    ear.paymentMethod === 'orange_cash' ? 'أورنج كاش' :
                                    ear.paymentMethod === 'etisalat_cash' ? 'اتصالات كاش' :
                                    ear.paymentMethod === 'we_pay' ? 'وي باي' :
                                    ear.paymentMethod === 'manual' ? 'تسليم نقدي' :
                                    (ear.paymentMethod || '');
                return `
                <tr style="border-bottom:1px solid var(--border-color); font-size:0.85rem;">
                  <td style="padding:12px; font-weight:600;">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <img src="${teacherAvatar}" onerror="this.src='assets/logo.png'" style="width:32px; height:32px; border-radius:50%; object-fit:cover; border:1px solid var(--border-color);">
                      <div>
                        <div style="font-weight:700; color:var(--text-main);">${ear.teacher?.name || '-'}</div>
                        <div style="font-size:0.72rem; color:var(--text-muted);">${ear.teacher?.phone || ear.teacher?.email || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td style="padding:12px; color:var(--primary); font-weight:800; font-size:0.95rem;">${ear.amount} ${ear.currency || 'ج.م'}</td>
                  <td style="padding:12px;">
                    <div style="font-weight:700;">${ear.sourceType === 'COURSE_SALE' ? 'بيع كورس' : ear.sourceType === 'SESSION_COMPLETED' ? 'جلسة منجزة' : ear.sourceType}</div>
                    ${ear.description ? `<div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">${ear.description}</div>` : ''}
                  </td>
                  <td style="padding:12px;">
                    <span class="badge" style="background:${ear.status === 'paid' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)'}; color:${ear.status === 'paid' ? '#10b981' : '#f59e0b'}; font-weight:800; padding:4px 10px; border-radius:12px;">
                      ${ear.status === 'paid' ? 'مدفوعة ✅' : 'معلقة ⏳'}
                    </span>
                    ${ear.status === 'paid' && methodLabel ? `
                      <div style="font-size:0.72rem; color:var(--text-muted); margin-top:4px; font-weight:600;">
                        ${methodLabel}
                      </div>
                    ` : ''}
                    ${ear.transactionRef ? `
                      <div style="font-size:0.7rem; color:var(--text-muted); font-family:monospace;">
                        Ref: ${ear.transactionRef}
                      </div>
                    ` : ''}
                  </td>
                  <td style="padding:12px; color:var(--text-muted);">
                    <div>${new Date(ear.createdAt).toLocaleDateString('ar')}</div>
                    ${ear.paidAt ? `<div style="font-size:0.72rem; color:#10b981; margin-top:2px;">سُدد: ${new Date(ear.paidAt).toLocaleDateString('ar')}</div>` : ''}
                  </td>
                  <td style="padding:12px; text-align:center;">
                    ${ear.status === 'pending' ? `
                      <button class="btn-primary admin-pay-earning-btn" data-id="${ear.id}" style="padding:6px 14px; font-size:0.78rem; font-weight:700; border-radius:8px; display:inline-flex; align-items:center; gap:6px;">
                        <i data-lucide="send" style="width:14px; height:14px;"></i>
                        تسديد المبلغ
                      </button>
                    ` : `
                      <div style="display:inline-flex; flex-direction:column; align-items:center; gap:4px;">
                        <span style="color:#10b981; font-weight:700; font-size:0.8rem;">تم السداد ✅</span>
                        ${ear.receiptUrl ? `
                          <a href="${ear.receiptUrl}" target="_blank" class="btn-secondary" style="padding:3px 8px; font-size:0.72rem; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:4px; color:var(--primary); border-color:var(--primary); border-radius:6px;" title="عرض إيصال التحويل المرفوع">
                            <i data-lucide="receipt" style="width:12px; height:12px;"></i>
                            عرض الإيصال 📄
                          </a>
                        ` : ''}
                      </div>
                    `}
                  </td>
                </tr>
                `;
              }).join('') || `<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-muted);">لا توجد مستحقات مسجلة.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderBillingsTableRows(payments) {
    if (!payments || payments.length === 0) {
      return `<tr><td colspan="8" style="text-align:center; padding:32px; color:var(--text-muted);">لا توجد فواتير أو عمليات دفع مسجلة بعد.</td></tr>`;
    }

    return payments.map(p => {
      const shortId = p.id ? `#${p.id.substring(0, 8)}` : '-';
      const studentName = p.student?.name || 'طالب غير محدد';
      const studentEmail = p.student?.email || '';
      const studentAvatar = (p.student?.avatar && !p.student.avatar.includes('dicebear.com')) ? p.student.avatar : 'assets/logo.png';

      let itemTitle = 'مدفوعات منصة';
      let itemBadge = '';
      if (p.type === 'COURSE_ENROLLMENT') {
        const title = p.courseEnrollment?.course?.title || p.notes || 'شراء كورس';
        itemTitle = `كورس: ${title}`;
        itemBadge = `<span class="badge" style="background:rgba(99,102,241,0.1); color:var(--primary); font-size:0.7rem;">كورس 📚</span>`;
      } else if (p.type === 'SUBSCRIPTION') {
        const title = p.subscription?.plan?.title || p.notes || 'باقة اشتراك';
        itemTitle = `باقة: ${title}`;
        itemBadge = `<span class="badge" style="background:rgba(236,72,153,0.1); color:#ec4899; font-size:0.7rem;">باقة 💎</span>`;
      } else if (p.type === 'GROUP_ENROLLMENT') {
        const groupName = p.courseEnrollment?.group?.name;
        const courseTitle = p.courseEnrollment?.course?.title;
        const title = groupName ? `مجموعة: ${groupName}` : (courseTitle ? `مجموعة: ${courseTitle}` : (p.notes || 'اشتراك مجموعة'));
        itemTitle = title;
        itemBadge = `<span class="badge" style="background:rgba(16,185,129,0.1); color:#10b981; font-size:0.7rem;">مجموعة 👥</span>`;
      } else {
        itemTitle = p.notes || 'عملية إيداع/شراء';
        itemBadge = `<span class="badge" style="background:rgba(107,114,128,0.1); color:var(--text-muted); font-size:0.7rem;">عام 💳</span>`;
      }

      const statusMap = {
        SUCCESS: { text: 'ناجحة ✅', bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
        PENDING: { text: 'قيد المراجعة ⏳', bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
        FAILED: { text: 'فاشلة ❌', bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
        REFUNDED: { text: 'مستردة 🔄', bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }
      };
      const st = statusMap[p.status] || { text: p.status || 'ناجحة ✅', bg: 'rgba(16,185,129,0.1)', color: '#10b981' };

      const formattedDate = p.createdAt ? new Date(p.createdAt).toLocaleString('ar-EG', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : '-';

      return `
        <tr style="border-bottom:1px solid var(--border-color); font-size:0.85rem; transition: background 0.15s;" class="admin-billing-row" data-type="${p.type || ''}" data-status="${p.status || 'SUCCESS'}" data-search="${(studentName + ' ' + studentEmail + ' ' + itemTitle + ' ' + (p.id || '')).toLowerCase()}">
          <td style="padding:12px; font-weight:700; font-family:monospace; color:var(--text-muted); font-size:0.78rem;">${shortId}</td>
          <td style="padding:12px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <img src="${studentAvatar}" onerror="this.src='assets/logo.png'" style="width:32px; height:32px; border-radius:50%; object-fit:cover; border:1px solid var(--border-color);">
              <div>
                <div style="font-weight:700; color:var(--text-main);">${studentName}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${studentEmail}</div>
              </div>
            </div>
          </td>
          <td style="padding:12px;">
            <div style="font-weight:600; margin-bottom:3px;">${itemTitle}</div>
            ${itemBadge}
          </td>
          <td style="padding:12px; font-weight:800; color:var(--success); font-size:0.95rem;">${p.amount || 0} ج.م</td>
          <td style="padding:12px;">
            <span style="display:inline-flex; align-items:center; gap:4px; font-size:0.78rem; font-weight:600; padding:4px 8px; border-radius:6px; background:rgba(0,0,0,0.04); color:var(--text-main);">
              💳 ${p.provider || 'تحويل مباشر'}
            </span>
          </td>
          <td style="padding:12px;">
            <span class="badge" style="background:${st.bg}; color:${st.color}; font-weight:700; padding:4px 10px;">
              ${st.text}
            </span>
          </td>
          <td style="padding:12px; font-size:0.78rem; color:var(--text-muted);">${formattedDate}</td>
          <td style="padding:12px; text-align:center;">
            <div style="display:flex; gap:6px; justify-content:center; align-items:center;">
              <button class="btn-secondary admin-view-payment-details-btn" data-id="${p.id}" style="padding:5px 10px; font-size:0.75rem; font-weight:600; display:inline-flex; align-items:center; gap:4px;" title="عرض التفاصيل كاملة">
                <i data-lucide="eye" style="width:14px; height:14px;"></i> تفاصيل
              </button>
              ${p.receiptUrl ? `
                <a href="${p.receiptUrl}" target="_blank" class="btn-secondary" style="padding:5px 10px; font-size:0.75rem; font-weight:600; text-decoration:none; display:inline-flex; align-items:center; gap:4px; color:var(--primary); border-color:var(--primary);" title="عرض صورة الإيصال">
                  <i data-lucide="file-text" style="width:14px; height:14px;"></i> الإيصال
                </a>
              ` : ''}
              <button class="btn-secondary admin-delete-payment-btn" data-id="${p.id}" style="padding:5px 10px; font-size:0.75rem; font-weight:600; color:#ef4444; border-color:rgba(239,68,68,0.3); display:inline-flex; align-items:center; gap:4px;" title="حذف الفاتورة">
                <i data-lucide="trash-2" style="width:14px; height:14px;"></i> حذف
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderPaymentDetailsModal(paymentId) {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const e = this.adminEarnings || { payments: [] };
    const p = (e.payments || []).find(pay => pay.id === paymentId);
    if (!p) {
      showToast("تعذر العثور على بيانات الفاتورة.", "error");
      return;
    }

    const studentName = p.student?.name || 'غير معروف';
    const studentEmail = p.student?.email || 'غير معروف';
    const studentAvatar = (p.student?.avatar && !p.student.avatar.includes('dicebear.com')) ? p.student.avatar : 'assets/logo.png';

    let itemDetails = '';
    if (p.type === 'COURSE_ENROLLMENT' && p.courseEnrollment?.course) {
      itemDetails = `
        <div style="background:rgba(99,102,241,0.06); padding:14px; border-radius:10px; margin-bottom:14px; border:1px solid rgba(99,102,241,0.2);">
          <div style="font-size:0.8rem; font-weight:700; color:var(--primary); margin-bottom:4px;">📚 تفاصيل الكورس المشترى:</div>
          <div style="font-weight:700; font-size:0.95rem; color:var(--text-main);">${p.courseEnrollment.course.title}</div>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">معرف الكورس: ${p.courseEnrollment.course.id}</div>
        </div>
      `;
    } else if (p.type === 'SUBSCRIPTION' && p.subscription?.plan) {
      itemDetails = `
        <div style="background:rgba(236,72,153,0.06); padding:14px; border-radius:10px; margin-bottom:14px; border:1px solid rgba(236,72,153,0.2);">
          <div style="font-size:0.8rem; font-weight:700; color:#ec4899; margin-bottom:4px;">💎 تفاصيل الباقة المشترك بها:</div>
          <div style="font-weight:700; font-size:0.95rem; color:var(--text-main);">${p.subscription.plan.title}</div>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">عدد الحصص: ${p.subscription.plan.sessionsCount || p.subscription.remainingSessions || '-'} حصة</div>
        </div>
      `;
    } else if (p.type === 'GROUP_ENROLLMENT') {
      const gName = p.courseEnrollment?.group?.name || 'مجموعة دراسية';
      const cTitle = p.courseEnrollment?.course?.title || '';
      itemDetails = `
        <div style="background:rgba(16,185,129,0.06); padding:14px; border-radius:10px; margin-bottom:14px; border:1px solid rgba(16,185,129,0.2);">
          <div style="font-size:0.8rem; font-weight:700; color:#10b981; margin-bottom:4px;">👥 تفاصيل المجموعة الدراسية:</div>
          <div style="font-weight:700; font-size:0.95rem; color:var(--text-main);">${gName}</div>
          ${cTitle ? `<div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">المادة/الدورة: ${cTitle}</div>` : ''}
        </div>
      `;
    }

    const statusMap = {
      SUCCESS: { text: 'ناجحة ✅', bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
      PENDING: { text: 'قيد المراجعة ⏳', bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
      FAILED: { text: 'فاشلة ❌', bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
      REFUNDED: { text: 'مستردة 🔄', bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }
    };
    const st = statusMap[p.status] || { text: p.status || 'ناجحة ✅', bg: 'rgba(16,185,129,0.1)', color: '#10b981' };

    container.innerHTML = `
      <div class="modal-overlay" id="payment-details-modal" style="display:flex;">
        <div class="modal-content" style="max-width:540px; border-radius:16px;">
          <div class="modal-header">
            <h3 class="modal-title" style="display:flex; align-items:center; gap:8px;">
              <i data-lucide="receipt" style="color:var(--primary);"></i>
              تفاصيل الفاتورة #${p.id ? p.id.substring(0, 8) : ''}
            </h3>
            <span class="modal-close-btn" id="close-payment-details-modal">&times;</span>
          </div>
          <div class="modal-body" style="padding:20px;">
            <!-- Student Header -->
            <div style="display:flex; align-items:center; gap:14px; padding-bottom:16px; margin-bottom:16px; border-bottom:1px solid var(--border-color);">
              <img src="${studentAvatar}" onerror="this.src='assets/logo.png'" style="width:48px; height:48px; border-radius:50%; border:2px solid var(--primary); object-fit:cover;">
              <div>
                <div style="font-weight:800; font-size:1rem; color:var(--text-main);">${studentName}</div>
                <div style="font-size:0.85rem; color:var(--text-muted);">${studentEmail}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">ID: ${p.student?.id || '-'}</div>
              </div>
            </div>

            ${itemDetails}

            <!-- Key Info Grid -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; background:rgba(0,0,0,0.02); padding:14px; border-radius:10px; border:1px solid var(--border-color);">
              <div>
                <div style="font-size:0.78rem; color:var(--text-muted);">المبلغ المدفوع:</div>
                <div style="font-weight:800; font-size:1.1rem; color:var(--success);">${p.amount || 0} ${p.currency || 'EGP'}</div>
              </div>
              <div>
                <div style="font-size:0.78rem; color:var(--text-muted);">حالة العملية:</div>
                <span class="badge" style="background:${st.bg}; color:${st.color}; font-weight:700; margin-top:4px;">${st.text}</span>
              </div>
              <div>
                <div style="font-size:0.78rem; color:var(--text-muted);">وسيلة / مزود الدفع:</div>
                <div style="font-weight:700; font-size:0.88rem; color:var(--text-main); margin-top:2px;">${p.provider || 'تحويل مباشر'}</div>
              </div>
              <div>
                <div style="font-size:0.78rem; color:var(--text-muted);">رقم المعاملة (Ref ID):</div>
                <div style="font-weight:600; font-size:0.82rem; color:var(--text-main); margin-top:2px; font-family:monospace;">${p.providerTransactionId || p.id || '-'}</div>
              </div>
              <div style="grid-column:1 / -1;">
                <div style="font-size:0.78rem; color:var(--text-muted);">تاريخ الدفع:</div>
                <div style="font-weight:600; font-size:0.85rem; color:var(--text-main); margin-top:2px;">${p.createdAt ? new Date(p.createdAt).toLocaleString('ar-EG') : '-'}</div>
              </div>
            </div>

            ${p.notes ? `
              <div style="margin-bottom:16px;">
                <div style="font-size:0.8rem; font-weight:700; margin-bottom:4px;">ملاحظات العملية:</div>
                <div style="font-size:0.85rem; color:var(--text-main); background:rgba(0,0,0,0.03); padding:10px; border-radius:8px; border:1px solid var(--border-color);">${p.notes}</div>
              </div>
            ` : ''}

            ${p.receiptUrl ? `
              <div style="margin-bottom:16px;">
                <div style="font-size:0.8rem; font-weight:700; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                  <span>صورة إيصال السداد المرفقة:</span>
                  <a href="${p.receiptUrl}" target="_blank" style="font-size:0.75rem; color:var(--primary); text-decoration:none;">فتح الصورة بالحجم الكامل ↗</a>
                </div>
                <div style="text-align:center; background:#000; padding:10px; border-radius:10px;">
                  <img src="${p.receiptUrl}" style="max-height:240px; max-width:100%; border-radius:6px; object-fit:contain;">
                </div>
              </div>
            ` : ''}
          </div>
          <div class="modal-footer" style="display:flex; gap:10px; justify-content:space-between; align-items:center;">
            <button type="button" class="btn-secondary admin-delete-payment-modal-btn" data-id="${p.id}" style="color:#ef4444; border-color:rgba(239,68,68,0.3); display:inline-flex; align-items:center; gap:6px; font-weight:600;">
              <i data-lucide="trash-2" style="width:15px; height:15px;"></i> حذف هذه الفاتورة
            </button>
            <button type="button" class="btn-secondary" id="close-payment-details-btn" style="flex:1;">إغلاق النافذة</button>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => { container.innerHTML = ""; };
    document.getElementById("close-payment-details-modal")?.addEventListener("click", closeModal);
    document.getElementById("close-payment-details-btn")?.addEventListener("click", closeModal);
    container.querySelector(".admin-delete-payment-modal-btn")?.addEventListener("click", () => {
      this.handleDeletePayment(paymentId);
    });
  },

  async handleDeletePayment(paymentId) {
    if (!paymentId) return;
    const confirmed = await confirmDialog({
      title: "تأكيد حذف الفاتورة ⚠️",
      message: "هل أنت متأكد من حذف هذه الفاتورة وسجل الدفع نهائياً؟ سيتم إلغاء ربط الفاتورة وحذف إيصال السداد إن وجد. لا يمكن التراجع عن هذا الإجراء.",
      danger: true,
      confirmText: "نعم، حذف الفاتورة",
      cancelText: "إلغاء"
    });
    if (!confirmed) return;

    try {
      const res = await apiFetch(`/admin/payments/${paymentId}`, {
        method: "DELETE"
      });
      showToast(res.message || "تم حذف الفاتورة بنجاح", "success");
      const container = document.getElementById("admin-modal-container");
      if (container) container.innerHTML = "";
      if (typeof this.loadAllData === "function") {
        await this.loadAllData();
      }
      if (typeof this.renderTab === "function") {
        this.renderTab("earnings");
      }
    } catch (err) {
      showToast(err.message || "فشل حذف الفاتورة", "error");
    }
  },

  renderPayTeacherEarningModal(earningId) {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const e = this.adminEarnings || { earnings: [] };
    const ear = (e.earnings || []).find(item => item.id === earningId);
    if (!ear) {
      showToast("تعذر العثور على بيانات المستحقات المالية.", "error");
      return;
    }

    const teacherName = ear.teacher?.name || 'معلم غير محدد';
    const teacherEmail = ear.teacher?.email || '';
    const teacherPhone = ear.teacher?.phone || '';
    const teacherAvatar = (ear.teacher?.avatar && !ear.teacher.avatar.includes('dicebear.com')) ? ear.teacher.avatar : 'assets/logo.png';
    const cleanWa = teacherPhone ? getCleanWhatsAppNumber(teacherPhone) : '';
    const sourceLabel = ear.sourceType === 'COURSE_SALE' ? 'بيع كورس مسجل' : ear.sourceType === 'SESSION_COMPLETED' ? 'جلسة منجزة' : ear.sourceType;

    container.innerHTML = `
      <div class="modal-overlay" id="pay-earning-modal" style="display:flex; z-index:99999;">
        <div class="modal-content" style="max-width:540px; border-radius:18px; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,0.25);">
          <div class="modal-header" style="background:var(--bg-card); border-bottom:1px solid var(--border-color); padding:16px 20px;">
            <h3 class="modal-title" style="display:flex; align-items:center; gap:8px; font-weight:800; font-size:1.15rem; margin:0;">
              <i data-lucide="wallet" style="color:var(--primary); width:22px; height:22px;"></i>
              تسديد مستحقات المعلم (إرسال التحويل)
            </h3>
            <span class="modal-close-btn" id="close-pay-earning-modal" style="cursor:pointer; font-size:1.5rem; line-height:1;">&times;</span>
          </div>

          <div class="modal-body" style="padding:22px; max-height:80vh; overflow-y:auto;">
            <!-- Teacher Header Card -->
            <div style="display:flex; align-items:center; justify-content:space-between; gap:14px; padding:14px; background:rgba(0,0,0,0.02); border-radius:14px; border:1px solid var(--border-color); margin-bottom:18px;">
              <div style="display:flex; align-items:center; gap:12px;">
                <img src="${teacherAvatar}" onerror="this.src='assets/logo.png'" style="width:48px; height:48px; border-radius:50%; object-fit:cover; border:2px solid var(--primary);">
                <div>
                  <div style="font-weight:800; font-size:1rem; color:var(--text-main);">${teacherName}</div>
                  <div style="font-size:0.8rem; color:var(--text-muted);">${teacherEmail}</div>
                  ${teacherPhone ? `<div style="font-size:0.8rem; color:var(--text-muted); direction:ltr; text-align:right;">${teacherPhone}</div>` : ''}
                </div>
              </div>
              ${cleanWa ? `
                <a href="https://wa.me/${cleanWa}" target="_blank" class="btn-secondary" style="padding:6px 12px; font-size:0.78rem; font-weight:700; color:#10b981; border-color:#10b981; border-radius:10px; text-decoration:none; display:inline-flex; align-items:center; gap:4px;" title="مراسلة المعلم عبر واتساب">
                  <i data-lucide="message-circle" style="width:14px; height:14px;"></i>
                  واتساب
                </a>
              ` : ''}
            </div>

            <!-- Earning Details Summary Banner -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:14px; background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.2); border-radius:12px; margin-bottom:20px;">
              <div>
                <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">المبلغ المستحق للدفع:</div>
                <div style="font-size:1.35rem; font-weight:900; color:var(--primary); margin-top:2px;">${ear.amount} ${ear.currency || 'ج.م'}</div>
              </div>
              <div>
                <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">مصدر المعاملة:</div>
                <div style="font-size:0.9rem; font-weight:800; color:var(--text-main); margin-top:4px;">${sourceLabel}</div>
                ${ear.description ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${ear.description}</div>` : ''}
              </div>
            </div>

            <form id="pay-earning-form" style="display:flex; flex-direction:column; gap:16px;">
              <!-- Payment Method Selection -->
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">
                  طريقة التحويل / وسيلة الدفع <span style="color:var(--danger,#ef4444);">*</span>
                </label>
                <select id="pay-earning-method" class="form-control" style="width:100%; padding:10px 14px; border-radius:10px; border:1px solid var(--border-color); font-weight:600; font-size:0.9rem; background:var(--bg-input, var(--bg-card)); color:var(--text-main);">
                  <option value="vodafone_cash">📱 فودافون كاش (Vodafone Cash)</option>
                  <option value="instapay">⚡ إنستاباي (InstaPay)</option>
                  <option value="bank_transfer">🏦 تحويل بنكي (Bank Account Transfer)</option>
                  <option value="orange_cash">🍊 أورنج كاش (Orange Cash)</option>
                  <option value="etisalat_cash">🟢 اتصالات كاش (Etisalat Cash)</option>
                  <option value="we_pay">🟣 وي باي (WE Pay)</option>
                  <option value="manual">💵 تسليم نقدي مباشر (Cash)</option>
                </select>
              </div>

              <!-- Transaction Reference ID -->
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">
                  رقم عملية التحويل / كود الإشعار (Ref ID)
                </label>
                <input type="text" id="pay-earning-txid" class="form-control" placeholder="مثال: IPN1234567890 أو رقم العملية" style="width:100%; padding:10px 14px; border-radius:10px; border:1px solid var(--border-color); font-size:0.9rem; font-family:monospace; background:var(--bg-input, var(--bg-card)); color:var(--text-main);">
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">اختياري: رقم المعاملة من تطبيق البنك أو المحفظة الإلكترونية لسهولة التتبع.</div>
              </div>

              <!-- Receipt Proof Upload (Mandatory) -->
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">
                  صورة إيصال التحويل (Proof of Payment) <span style="color:var(--danger,#ef4444);">* (إجباري)</span>
                </label>
                <div id="pay-earning-dropzone" style="border:2px dashed var(--border-color); border-radius:14px; padding:20px; text-align:center; background:rgba(0,0,0,0.01); cursor:pointer; transition:all 0.2s ease;">
                  <input type="file" id="pay-earning-file" accept="image/*,application/pdf" style="display:none;">
                  <div id="pay-earning-upload-prompt">
                    <i data-lucide="upload-cloud" style="width:36px; height:36px; color:var(--primary); margin-bottom:8px; opacity:0.8;"></i>
                    <div style="font-weight:700; font-size:0.9rem; color:var(--text-main);">انقر لاختيار صورة الإيصال أو اسحب الملف هنا</div>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">يدعم الصور (PNG, JPG, WEBP) وملفات PDF (بحد أقصى 10 ميجابايت)</div>
                  </div>
                  <div id="pay-earning-file-preview" style="display:none; flex-direction:column; align-items:center; gap:10px;">
                    <img id="pay-earning-preview-img" src="" style="max-height:160px; max-width:100%; border-radius:8px; object-fit:contain; border:1px solid var(--border-color); display:none;">
                    <div id="pay-earning-file-info" style="font-weight:700; font-size:0.85rem; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                      <i data-lucide="file-check" style="color:var(--success); width:18px; height:18px;"></i>
                      <span id="pay-earning-file-name"></span>
                    </div>
                    <button type="button" id="pay-earning-remove-file" class="btn-secondary" style="font-size:0.75rem; padding:4px 10px; border-radius:6px; color:var(--danger); border-color:var(--danger);">
                      إزالة وتغيير الملف ✕
                    </button>
                  </div>
                </div>
              </div>

              <!-- Notes / Remarks -->
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">
                  ملاحظات الصرف والتحويل (اختياري)
                </label>
                <textarea id="pay-earning-notes" rows="2" class="form-control" placeholder="أي ملاحظات موجهة للمعلم أو للإدارة بشأن هذه الدفعة..." style="width:100%; padding:10px 14px; border-radius:10px; border:1px solid var(--border-color); font-size:0.88rem; background:var(--bg-input, var(--bg-card)); color:var(--text-main); resize:vertical;"></textarea>
              </div>

              <!-- Action Buttons -->
              <div style="display:flex; gap:10px; margin-top:8px;">
                <button type="submit" id="pay-earning-submit-btn" class="btn-primary" style="flex:1; padding:12px; font-weight:800; font-size:0.95rem; border-radius:10px; display:inline-flex; align-items:center; justify-content:center; gap:8px;">
                  <i data-lucide="check-circle" style="width:18px; height:18px;"></i>
                  تأكيد تسديد المبلغ ورفع الإيصال 💸
                </button>
                <button type="button" id="cancel-pay-earning-btn" class="btn-secondary" style="padding:12px 20px; font-weight:700; border-radius:10px;">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => { container.innerHTML = ""; };
    document.getElementById("close-pay-earning-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-pay-earning-btn")?.addEventListener("click", closeModal);

    const dropzone = document.getElementById("pay-earning-dropzone");
    const fileInput = document.getElementById("pay-earning-file");
    const uploadPrompt = document.getElementById("pay-earning-upload-prompt");
    const filePreview = document.getElementById("pay-earning-file-preview");
    const previewImg = document.getElementById("pay-earning-preview-img");
    const fileNameSpan = document.getElementById("pay-earning-file-name");
    const removeFileBtn = document.getElementById("pay-earning-remove-file");

    const handleFile = (file) => {
      if (!file) return;
      fileNameSpan.textContent = file.name;
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          previewImg.src = ev.target.result;
          previewImg.style.display = "block";
        };
        reader.readAsDataURL(file);
      } else {
        previewImg.style.display = "none";
      }
      uploadPrompt.style.display = "none";
      filePreview.style.display = "flex";
      if (window.lucide) window.lucide.createIcons();
    };

    dropzone?.addEventListener("click", (e) => {
      if (e.target.id === "pay-earning-remove-file" || e.target.closest("#pay-earning-remove-file")) return;
      fileInput?.click();
    });

    fileInput?.addEventListener("change", () => {
      if (fileInput.files && fileInput.files[0]) {
        handleFile(fileInput.files[0]);
      }
    });

    removeFileBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      fileInput.value = "";
      previewImg.src = "";
      previewImg.style.display = "none";
      fileNameSpan.textContent = "";
      filePreview.style.display = "none";
      uploadPrompt.style.display = "block";
    });

    dropzone?.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "var(--primary)";
      dropzone.style.background = "rgba(99,102,241,0.05)";
    });

    dropzone?.addEventListener("dragleave", () => {
      dropzone.style.borderColor = "var(--border-color)";
      dropzone.style.background = "rgba(0,0,0,0.01)";
    });

    dropzone?.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "var(--border-color)";
      dropzone.style.background = "rgba(0,0,0,0.01)";
      if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
        fileInput.files = e.dataTransfer.files;
        handleFile(e.dataTransfer.files[0]);
      }
    });

    // Form submission
    const form = document.getElementById("pay-earning-form");
    const submitBtn = document.getElementById("pay-earning-submit-btn");

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!fileInput.files || fileInput.files.length === 0) {
        showToast("يلزم رفع وإرفاق صورة أو ملف إيصال التحويل لإتمام تسديد المبلغ للمعلم.", "error");
        dropzone.style.borderColor = "var(--danger, #ef4444)";
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i data-lucide="loader-2" class="animate-spin" style="width:18px;height:18px;"></i> جاري رفع الإيصال وتسجيل التسديد... ⏳`;
      if (window.lucide) window.lucide.createIcons();

      try {
        // Upload receipt file
        const formData = new FormData();
        formData.append("file", fileInput.files[0]);
        const token = state.token || localStorage.getItem("token");
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });

        if (!uploadRes.ok) {
          throw new Error("فشل رفع ملف الإيصال. يرجى التأكد من الملف والمحاولة مجدداً.");
        }

        const uploadData = await uploadRes.json();
        const receiptUrl = uploadData.url;

        const paymentMethod = document.getElementById("pay-earning-method")?.value || "manual";
        const transactionRef = document.getElementById("pay-earning-txid")?.value?.trim() || "";
        const notes = document.getElementById("pay-earning-notes")?.value?.trim() || "";

        const res = await apiFetch(`/admin/teacher-earnings/${earningId}/pay`, {
          method: "PATCH",
          body: JSON.stringify({ receiptUrl, paymentMethod, transactionRef, notes })
        });

        showToast(res.message || "تم تسديد مستحقات المعلم واعتماد إيصال التحويل بنجاح! 💸✅", "success");
        closeModal();
        await this.loadAllData();
        this.renderTab("earnings");
      } catch (err) {
        showToast(err.message || "تعذر إتمام تسديد المستحقات.", "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i data-lucide="check-circle" style="width:18px; height:18px;"></i> تأكيد تسديد المبلغ ورفع الإيصال 💸`;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

};
