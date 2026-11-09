import { apiFetch, state, showToast, t, confirmDialog, renderPhoneInputGroup, getCleanWhatsAppNumber, renderEducationSelectHTML, handleWhatsAppResponse, formatSessionDateTime, getTimezoneBadgeHTML } from '../../app.js';

// ── AdminSubscriptionsPage ─────────────────────────────────────────────────────────────
// Methods extracted from AdminView.js — assigned to AdminView.prototype

export const AdminSubscriptionsPage = {

  renderSingleSubRow(s, isChild = false, isHidden = false) {
    let statusBadgeBg = 'rgba(16,185,129,0.1)';
    let statusBadgeColor = '#10b981';
    let statusText = s.status;

    if (s.isAllCompleted) {
      statusBadgeBg = 'rgba(239,68,68,0.2)';
      statusBadgeColor = '#ef4444';
      statusText = '🚨 اكتملت جميع الحصص (بحاجة للتجديد)';
    } else if (s.isClass) {
      if (s.status === 'PENDING_PAYMENT') {
        statusBadgeBg = 'rgba(245,158,11,0.15)';
        statusBadgeColor = '#f59e0b';
        statusText = 'طلب اشتراك قيد المراجعة ⏳';
      } else if (s.status === 'ACTIVE') {
        statusBadgeBg = 'rgba(16,185,129,0.15)';
        statusBadgeColor = '#10b981';
        statusText = 'مشترك ونشط بالفصل ✅';
      } else if (s.status === 'CANCELLED') {
        statusBadgeBg = 'rgba(239,68,68,0.15)';
        statusBadgeColor = '#ef4444';
        statusText = 'تم رفض الطلب ❌';
      }
    } else if (s.isGroup) {
      if (s.status === 'PENDING_PAYMENT') {
        statusBadgeBg = 'rgba(245,158,11,0.15)';
        statusBadgeColor = '#f59e0b';
        statusText = 'في انتظار اعتماد الدفع ⏳';
      } else if (s.status === 'ACTIVE') {
        statusBadgeBg = 'rgba(16,185,129,0.15)';
        statusBadgeColor = '#10b981';
        statusText = 'نشط بالمجموعة ✅';
      } else if (s.status === 'CANCELLED') {
        statusBadgeBg = 'rgba(239,68,68,0.15)';
        statusBadgeColor = '#ef4444';
        statusText = 'ملغى من المجموعة ❌';
      }
    } else {
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
    }

    let rowBg = '';
    let cardBorder = '';
    if (s.isAllCompleted) {
      rowBg = 'background:rgba(239,68,68,0.12);';
      cardBorder = 'border-inline-start:5px solid #ef4444; border-top:1px solid rgba(239,68,68,0.25); border-bottom:1px solid rgba(239,68,68,0.25);';
    } else if (s.isLowBalance) {
      rowBg = 'background:rgba(239,68,68,0.04);';
      cardBorder = 'border-inline-start:4px solid #ef4444;';
    } else if (isChild) {
      rowBg = 'background:rgba(0,0,0,0.015);';
      cardBorder = 'border-inline-start:4px solid var(--primary);';
    }

    const displayStyle = isHidden ? 'display:none;' : '';
    const childBorder = isChild ? 'border-inline-start:4px solid var(--primary);' : '';
    const studentIdAttr = s.studentId || s.student?.id || '';

    const createdDate = s.createdAt ? new Date(s.createdAt) : null;
    const updatedDate = s.updatedAt ? new Date(s.updatedAt) : null;

    const createdStr = createdDate && !isNaN(createdDate.getTime())
      ? createdDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '-';

    const hasUpdatedDiff = updatedDate && createdDate && Math.abs(updatedDate.getTime() - createdDate.getTime()) > 60000;
    const updatedStr = hasUpdatedDiff && !isNaN(updatedDate.getTime())
      ? updatedDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : null;

    // Nearest upcoming session badge
    let nextSessionBadgeHtml = '';
    if (s.nextSession && s.nextSession.scheduledAt) {
      const now = new Date();
      const nextDate = new Date(s.nextSession.scheduledAt);
      const isToday = nextDate.toDateString() === now.toDateString();
      const tomorrowDate = new Date(now);
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const isTomorrow = nextDate.toDateString() === tomorrowDate.toDateString();

      const timeFormatted = nextDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      const dateFormatted = nextDate.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });

      if (isToday) {
        nextSessionBadgeHtml = `
          <div style="background:rgba(239,68,68,0.12); color:#ef4444; border:1px solid rgba(239,68,68,0.35); padding:3px 8px; border-radius:10px; font-weight:800; font-size:0.73rem; display:inline-flex; align-items:center; gap:4px; margin-top:4px;">
            <span style="width:7px; height:7px; border-radius:50%; background:#ef4444; box-shadow:0 0 6px #ef4444;"></span>
            🔴 الحصة اليوم (${timeFormatted})
          </div>
        `;
      } else if (isTomorrow) {
        nextSessionBadgeHtml = `
          <div style="background:rgba(245,158,11,0.12); color:#d97706; border:1px solid rgba(245,158,11,0.35); padding:3px 8px; border-radius:10px; font-weight:800; font-size:0.73rem; display:inline-flex; align-items:center; gap:4px; margin-top:4px;">
            🟡 الحصة غداً (${timeFormatted})
          </div>
        `;
      } else {
        nextSessionBadgeHtml = `
          <div style="background:rgba(99,102,241,0.1); color:var(--primary); border:1px solid rgba(99,102,241,0.25); padding:3px 8px; border-radius:10px; font-weight:700; font-size:0.73rem; display:inline-flex; align-items:center; gap:4px; margin-top:4px;">
            <i data-lucide="clock" style="width:12px;height:12px;"></i> الحصة القادمة: ${dateFormatted} (${timeFormatted})
          </div>
        `;
      }
    }

    const studentPhone = s.student?.phone || '';
    const cleanWa = studentPhone ? getCleanWhatsAppNumber(studentPhone) : '';

    return `
    <tr class="${isChild ? `admin-sub-child-row student-child-${studentIdAttr}` : ''}" style="border-bottom:1px solid var(--border-color);font-size:0.85rem;${rowBg}${cardBorder || childBorder}${displayStyle}">
      <td style="padding:12px;color:var(--text-muted);${isChild ? 'padding-inline-start:24px;' : ''}">
        ${isChild ? '<span style="font-size:0.75rem; color:var(--primary); font-weight:700; margin-inline-end:4px;">↳</span>' : ''}#${s.id.substring(0, 8)}
        <div style="margin-top:4px;">
          ${s.isClass ? `
            <span class="badge" style="background:rgba(16,185,129,0.14); color:#059669; font-weight:800; font-size:0.7rem; padding:2px 7px; border-radius:6px; display:inline-flex; align-items:center; gap:3px;">
              <i data-lucide="graduation-cap" style="width:11px;height:11px;"></i> باقة فصل دراسي 🎒
            </span>
          ` : (s.isGroup ? `
            <span class="badge" style="background:rgba(99,102,241,0.12); color:var(--primary); font-weight:800; font-size:0.7rem; padding:2px 7px; border-radius:6px; display:inline-flex; align-items:center; gap:3px;">
              <i data-lucide="users" style="width:11px;height:11px;"></i> مجموعة جماعية
            </span>
          ` : `
            <span class="badge" style="background:rgba(236,72,153,0.12); color:#ec4899; font-weight:800; font-size:0.7rem; padding:2px 7px; border-radius:6px; display:inline-flex; align-items:center; gap:3px;">
              <i data-lucide="sparkles" style="width:11px;height:11px;"></i> باقة خاصة
            </span>
          `)}
        </div>
      </td>
      <td style="padding:12px;font-weight:600;">
        <div style="font-size:0.92rem; color:var(--text-main); font-weight:700;">${s.student?.name || '-'}</div>
        ${studentPhone ? `<div style="font-size:0.75rem; color:var(--text-muted); direction:ltr; text-align:right;">${studentPhone}</div>` : ''}
      </td>
      <td style="padding:12px;">
        <div style="font-weight:700; font-size:0.9rem; color:var(--text-main);">${s.plan?.name || '-'}</div> 
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:3px;">
          ${s.isClass && s.classPackage?.grade?.name ? `<span style="color:#059669; font-weight:800;">الصف: ${s.classPackage.grade.name}</span> • ` : ''}
          ${s.isGroup && s.course?.title ? `<span style="color:var(--primary); font-weight:700;">كورس: ${s.course.title}</span> • ` : ''}
          ${s.isClass ? `${s.classPackage?.lessonsCount || 'باقة فصل'} - ${s.plan?.price || 0} ج.م` : `${s.totalSessions} حصص الإجمالي - ${s.plan?.price || 0} ج.م`}
        </div>
        ${nextSessionBadgeHtml}
      </td>
      <td style="padding:12px;">
        <div style="font-weight:700; font-size:0.88rem; color:var(--text-main);">
          ${s.isClass ? `فريق المعلمين (${s.classPackage?.subjects?.length || 0} مواد)` : ((typeof s.teacher === 'string' ? s.teacher : s.teacher?.name) || '<span style="color:var(--warning,#f59e0b);">في الانتظار</span>')}
        </div>
        ${s.isClass && s.classPackage?.subjects ? `
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">
            ${s.classPackage.subjects.map(sub => sub.name).slice(0, 3).join('، ')}${s.classPackage.subjects.length > 3 ? '...' : ''}
          </div>
        ` : (s.isGroup && s.group?.name ? `<div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">المجموعة: ${s.group.name}</div>` : '')}
      </td>
      <td style="padding:12px;">
        <div style="display:flex; flex-direction:column; gap:4px; align-items:flex-start;">
          <span class="badge" style="background:${statusBadgeBg};color:${statusBadgeColor};font-weight:700; font-size:0.8rem; padding:4px 8px; border-radius:8px;">
            ${statusText}
          </span>
          ${s.isClass ? `
            ${s.paymentStatus === 'PAID' ? `
              <span class="badge" style="background:rgba(16,185,129,0.15); color:#059669; font-weight:800; font-size:0.72rem; padding:3px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:3px;">
                <i data-lucide="check-check" style="width:12px;height:12px;"></i> مدفوع بالكامل (${s.paidAmount || s.plan?.price || 0} ج.م)
              </span>
            ` : (s.paymentStatus === 'PARTIAL' ? `
              <span class="badge" style="background:rgba(245,158,11,0.15); color:#d97706; font-weight:800; font-size:0.72rem; padding:3px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:3px;">
                <i data-lucide="pie-chart" style="width:12px;height:12px;"></i> نظام تقسيط (مدفوع: ${s.paidAmount || 0} ج.م • متبقي: ${s.remainingAmount || 0} ج.م)
              </span>
            ` : `
              <span class="badge" style="background:rgba(239,68,68,0.12); color:#dc2626; font-weight:800; font-size:0.72rem; padding:3px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:3px;">
                <i data-lucide="alert-circle" style="width:12px;height:12px;"></i> لم يدفع بعد (0 ج.م)
              </span>
            `)}
          ` : ''}
          ${s.isAllCompleted ? `
            <span class="badge" style="background:#ef4444;color:#fff;font-weight:800;font-size:0.72rem;display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;box-shadow:0 2px 6px rgba(239,68,68,0.35);">
              <i data-lucide="bell-ring" style="width:12px;height:12px;"></i> تنبيه: انتهت كافة الحصص - تجديد مطلوب!
            </span>
          ` : (s.isLowBalance ? `
            <span class="badge" style="background:rgba(239,68,68,0.15);color:#ef4444;font-weight:700;font-size:0.72rem;display:inline-flex;align-items:center;gap:4px;">
              <i data-lucide="alert-triangle" style="width:12px;height:12px;"></i> رصيد منخفض (${s.remainingSessionsInPackage} حصص متبقية)
            </span>
          ` : '')}
          ${s.receiptUrl ? `
            <a href="${s.receiptUrl}" target="_blank" class="btn-secondary" style="font-size:0.72rem; padding:3px 8px; border-radius:6px; color:#059669; border-color:#059669; text-decoration:none; display:inline-flex; align-items:center; gap:4px; font-weight:700;" title="عرض إيصال السداد المرفوع">
              <i data-lucide="receipt" style="width:12px; height:12px;"></i> الإيصال 🧾
            </a>
          ` : ''}
        </div>
      </td>
      <td style="padding:12px;">
        <div style="display:flex; flex-direction:column; gap:3px; font-size:0.78rem;">
          <span style="color:var(--text-main); font-weight:700; display:inline-flex; align-items:center; gap:5px;" title="تاريخ إنشاء طلب الاشتراك">
            <i data-lucide="calendar-plus" style="width:13px;height:13px;color:var(--primary);"></i>
            ${createdStr}
          </span>
          ${updatedStr ? `
            <span style="color:var(--text-muted); font-size:0.72rem; display:inline-flex; align-items:center; gap:4px;" title="تاريخ آخر تحديث للاشتراك">
              <i data-lucide="clock" style="width:11px;height:11px;color:#f59e0b;"></i>
              تحديث: ${updatedStr}
            </span>
          ` : ''}
        </div>
      </td>
      <td style="padding:12px;display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
          ${s.isClass ? `
            ${s.status === 'PENDING_PAYMENT' ? `
              <button class="btn-primary admin-approve-class-sub-btn" data-id="${s.id}" style="padding:6px 11px;font-size:0.75rem;background:#10b981;border-color:#10b981;gap:4px;font-weight:700;">
                <i data-lucide="check-circle" style="width:14px;height:14px;"></i> قبول واعتماد الطلب ✅
              </button>
              <button class="btn-secondary admin-reject-class-sub-btn" data-id="${s.id}" style="padding:6px 10px;font-size:0.75rem;color:#ef4444;border-color:#ef4444;gap:4px;font-weight:700;">
                <i data-lucide="x-circle" style="width:14px;height:14px;"></i> رفض ❌
              </button>
            ` : ''}

            <button class="btn-secondary admin-edit-class-payment-btn" data-id="${s.id}" style="padding:5px 9px;font-size:0.75rem;gap:4px;font-weight:700;color:#059669;border-color:#059669;" title="تعديل حالة الدفع، إضافة إيصال، أو تسجيل سداد قسط">
              <i data-lucide="credit-card" style="width:13px;height:13px;"></i> تعديل الدفع والتقسيط 💳
            </button>

            ${cleanWa ? `
              <a href="https://wa.me/${cleanWa}?text=${encodeURIComponent(`السلام عليكم ${s.student?.name || ''}، نتواصل معك بخصوص اشتراكك في باقة ${s.classPackage?.name || 'الفصل الدراسي'} في منصة انطلق 🌟.`)}" target="_blank" class="btn-secondary" style="padding:5px 8px;font-size:0.75rem;gap:4px;color:#10b981;border-color:#10b981;text-decoration:none;display:inline-flex;align-items:center;font-weight:700;">
                <i data-lucide="message-circle" style="width:13px;height:13px;"></i> واتساب
              </a>
            ` : ''}

            <button class="btn-secondary admin-delete-class-sub-btn" data-id="${s.id}" style="padding:5px 8px;font-size:0.75rem;color:#ef4444;border-color:#ef4444;gap:4px;font-weight:700;" title="إلغاء وحذف اشتراك الفصل">
              <i data-lucide="trash-2" style="width:13px;height:13px;"></i> حذف
            </button>
          ` : (s.isGroup ? `
            ${s.status === 'PENDING_PAYMENT' ? `
              <button class="btn-primary admin-approve-group-enrollment-btn" data-id="${s.id}" style="padding:6px 10px;font-size:0.75rem;background:#10b981;border-color:#10b981;gap:4px;font-weight:700;">
                <i data-lucide="check-circle" style="width:14px;height:14px;"></i> قبول واعتماد الإيصال ✅
              </button>
            ` : ''}

            ${s.isAllCompleted ? `
              <button class="btn-primary admin-renew-sub-btn" data-id="${s.id}" style="padding:6px 12px;font-size:0.75rem;background:linear-gradient(135deg, #ef4444 0%, #dc2626 100%);border-color:#ef4444;color:#fff;gap:4px;font-weight:800;box-shadow:0 3px 8px rgba(239,68,68,0.35);">
                <i data-lucide="refresh-cw" style="width:13px;height:13px;"></i> تجديد الاشتراك 💳
              </button>
            ` : ''}

            <button class="btn-secondary admin-view-group-students-btn" data-group-id="${s.group?.id || ''}" style="padding:5px 9px;font-size:0.75rem;gap:4px;font-weight:700;color:var(--text-main);" title="عرض تفاصيل المجموعة ومقاعد الطلاب">
              <i data-lucide="users" style="width:13px;height:13px;"></i> المجموعة 👥
            </button>

            ${cleanWa ? `
              <a href="https://wa.me/${cleanWa}${s.isAllCompleted ? `?text=${encodeURIComponent(`السلام عليكم ${s.student?.name || ''}، نود تذكيركم بأن حصص اشتراككم (${s.plan?.name || s.group?.name || 'المجموعة'}) في منصة انطلق قد اكتملت بالكامل (${s.totalSessions} حصة) 🌟. يمكنكم الآن تجديد الاشتراك لمتابعة الدراسة.`)}` : ''}" target="_blank" class="btn-secondary" style="padding:5px 8px;font-size:0.75rem;gap:4px;color:#10b981;border-color:#10b981;text-decoration:none;display:inline-flex;align-items:center;font-weight:700;" title="${s.isAllCompleted ? 'تذكير الطالب بالتجديد عبر واتساب' : 'مراسلة الطالب عبر واتساب'}">
                <i data-lucide="message-circle" style="width:13px;height:13px;"></i> ${s.isAllCompleted ? 'تنبيه للتجديد 📲' : 'واتساب'}
              </a>
            ` : ''}

            <button class="btn-secondary admin-remove-group-student-sub-btn" data-group-id="${s.group?.id || ''}" data-student-id="${s.student?.id || ''}" style="padding:5px 8px;font-size:0.75rem;color:#ef4444;border-color:#ef4444;gap:4px;font-weight:700;" title="إلغاء الاشتراك وإزالة الطالب من المجموعة">
              <i data-lucide="user-x" style="width:13px;height:13px;"></i> إزالة
            </button>
          ` : `
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

            ${s.isAllCompleted ? `
            <button class="btn-primary admin-renew-sub-btn" data-id="${s.id}" style="padding:7px 12px;font-size:0.78rem;background:linear-gradient(135deg, #ef4444 0%, #dc2626 100%);border-color:#ef4444;color:#fff;gap:5px;font-weight:800;box-shadow:0 3px 10px rgba(239,68,68,0.35);">
              <i data-lucide="refresh-cw" style="width:14px;height:14px;"></i> 💳 تجديد الاشتراك الآن ⚠️
            </button>
            ` : ((s.status === 'ACTIVE' || s.isLowBalance) ? `
            <button class="btn-primary admin-renew-sub-btn" data-id="${s.id}" style="padding:6px 10px;font-size:0.75rem;background:#8b5cf6;border-color:#8b5cf6;gap:4px;">
              <i data-lucide="refresh-cw" style="width:14px;height:14px;"></i> تجديد + رفع إيصال 💳
            </button>
            ` : '')}

            ${cleanWa && s.isAllCompleted ? `
            <a href="https://wa.me/${cleanWa}?text=${encodeURIComponent(`السلام عليكم ${s.student?.name || ''}، نود تذكيركم بأن حصص باقتكم (${s.plan?.name || 'الحصص الخاصة'}) في منصة انطلق قد اكتملت بالكامل (${s.totalSessions} حصة) 🌟. يمكنكم الآن تجديد الاشتراك لمتابعة الحصص مع المعلم دون انقطاع.`)}" target="_blank" class="btn-secondary" style="padding:5px 8px;font-size:0.75rem;gap:4px;color:#10b981;border-color:#10b981;text-decoration:none;display:inline-flex;align-items:center;font-weight:700;" title="إرسال تذكير بتجديد الاشتراك عبر واتساب">
              <i data-lucide="message-circle" style="width:13px;height:13px;"></i> تذكير للتجديد 📲
            </a>
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
          `)}
        </div>

        ${s.isAllCompleted ? `
        <div style="font-size:0.75rem; display:flex; gap:10px; flex-wrap:wrap; color:#ef4444; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); padding:6px 10px; border-radius:6px; font-weight:700;">
            <span style="color:#ef4444;font-weight:800;">🔴 مكتملة: ${s.completedSessions}/${s.totalSessions} (100%)</span>
            <span style="color:#ef4444;font-weight:800;">المتبقي بالباقة: 0 حصص (انتهت بالكامل)</span>
            <span style="color:#dc2626;font-weight:800;display:inline-flex;align-items:center;gap:3px;"><i data-lucide="alert-octagon" style="width:13px;height:13px;"></i> يرجى التجديد الآن</span>
            ${s.isGroup && s.group ? `<span style="color:var(--text-muted);font-weight:600;">سعة المجموعة: ${s.group.maxStudents || 25} طالب</span>` : ''}
        </div>
        ` : (s.status === 'ACTIVE' ? `
        <div style="font-size:0.75rem; display:flex; gap:10px; flex-wrap:wrap; color:var(--text-muted); background:rgba(0,0,0,0.02); padding:6px; border-radius:6px;">
            <span style="color:#10b981;font-weight:600;">مكتملة: ${s.completedSessions}</span>
            <span style="color:var(--primary);font-weight:600;">مجدولة: ${s.scheduledSessions}</span>
            <span style="color:#8b5cf6;font-weight:600;">غير مجدولة: ${s.remainingToBook}</span>
            <span style="color:${s.remainingSessionsInPackage < 3 ? '#ef4444' : '#10b981'};font-weight:700;">المتبقي: ${s.remainingSessionsInPackage}</span>
            ${s.isGroup && s.group ? `<span style="color:var(--primary);font-weight:700;">سعة المجموعة: ${s.group.maxStudents || 25} طالب</span>` : ''}
        </div>
        ` : '')}
      </td>
    </tr>
  `;
  },

  // ── 9. Subscriptions Tab ─────────────────────────────────────────────────────────────

  // ── 9. Subscriptions Tab ─────────────────────────────────────────────────────────────

  renderSubscriptionsTab() {
    const allSubs = this.subscriptions || [];
    const allSessions = this.allSessions || [];
    const now = new Date();

    // 1. Process 1-on-1 Private Package Subscriptions
    const privateSubsWithMetrics = allSubs.map(s => {
      const totalSessions = s.totalSessions || s.plan?.sessionsCount || 0;
      const subSessions = allSessions.filter(sess => {
        if (sess.subscription && String(sess.subscription.id) === String(s.id)) return true;
        if (sess.subscriptionId && String(sess.subscriptionId) === String(s.id)) return true;
        if (s.student?.id && sess.student?.id && String(sess.student.id) === String(s.student.id)) {
          if (!sess.course && s.teacher?.id && sess.teacher?.id && String(sess.teacher.id) === String(s.teacher.id)) {
            return true;
          }
        }
        return false;
      });

      const completedSessions = subSessions.filter(sess => (sess.status || '').toLowerCase() === 'completed').length;
      const scheduledSessions = subSessions.filter(sess => {
        const st = (sess.status || '').toLowerCase();
        return st === 'scheduled' || st === 'rescheduled' || st === 'live';
      }).length;
      const totalBooked = completedSessions + scheduledSessions;
      const remainingToBook = Math.max(0, totalSessions - totalBooked);
      const remainingSessionsInPackage = Math.max(0, totalSessions - completedSessions);
      const isAllCompleted = totalSessions > 0 && (completedSessions >= totalSessions || remainingSessionsInPackage === 0);
      const isLowBalance = !isAllCompleted && (s.status === 'ACTIVE' || s.status === 'TEACHER_ASSIGNMENT_PENDING') && remainingSessionsInPackage < 3;

      const upcomingSessions = subSessions.filter(sess => {
        if (!sess.scheduledAt) return false;
        const time = new Date(sess.scheduledAt).getTime();
        const st = (sess.status || '').toLowerCase();
        return time >= (now.getTime() - 2 * 60 * 60 * 1000) && !st.includes('cancel') && st !== 'completed';
      }).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

      const nextSession = upcomingSessions[0] || null;
      const nextSessionTime = nextSession ? new Date(nextSession.scheduledAt).getTime() : null;

      let subTeacher = s.teacher;
      if (!subTeacher || !subTeacher.name) {
        const tId = s.teacherId || subTeacher?.id;
        if (tId) {
          subTeacher = (this.allMembers || []).find(m => String(m.id) === String(tId)) || subTeacher;
        }
        if (!subTeacher || !subTeacher.name) {
          const sessTeacher = subSessions.find(sess => sess.teacher && sess.teacher.name)?.teacher;
          if (sessTeacher) subTeacher = sessTeacher;
        }
      }

      return {
        ...s,
        teacher: subTeacher,
        isGroup: false,
        totalSessions,
        completedSessions,
        scheduledSessions,
        totalBooked,
        remainingToBook,
        remainingSessionsInPackage,
        isAllCompleted,
        isLowBalance,
        nextSession,
        nextSessionTime
      };
    });

    // 2. Process Group Subscriptions (Enrollments with a group assigned)
    const groupEnrollments = (this.enrollments || []).filter(e => e.group);
    const groupSubsWithMetrics = groupEnrollments.map(e => {
      const groupId = e.group?.id || e.groupId;
      const fullGroup = (this.allCourseGroups || this.allGroups || []).find(g => 
        String(g.id) === String(groupId)
      ) || e.group || {};

      const courseId = e.course?.id || fullGroup?.course?.id || e.courseId;
      const fullCourse = (this.courses || []).find(c => 
        String(c.id) === String(courseId)
      ) || e.course || fullGroup?.course || {};

      const groupSessions = allSessions.filter(sess => {
        if (sess.group && String(sess.group.id) === String(groupId)) return true;
        if (sess.groupId && String(sess.groupId) === String(groupId)) return true;
        if (courseId && sess.course && String(sess.course.id) === String(courseId)) return true;
        return false;
      });

      // Match the group's exact total sessions (like in #admin-dashboard/groups: cg.totalSessions || 24)
      const groupDefinedTotal = (fullGroup.totalSessions !== undefined && fullGroup.totalSessions !== null && Number(fullGroup.totalSessions) > 0)
        ? Number(fullGroup.totalSessions)
        : ((e.group?.totalSessions !== undefined && e.group?.totalSessions !== null && Number(e.group.totalSessions) > 0)
          ? Number(e.group.totalSessions)
          : null);

      const totalSessions = groupDefinedTotal || (groupSessions.length > 0 ? groupSessions.length : 24);
      const completedSessions = groupSessions.filter(sess => (sess.status || '').toLowerCase() === 'completed').length;
      const scheduledSessions = groupSessions.filter(sess => {
        const st = (sess.status || '').toLowerCase();
        return st === 'scheduled' || st === 'rescheduled' || st === 'live';
      }).length;
      const totalBooked = completedSessions + scheduledSessions;
      const remainingToBook = Math.max(0, totalSessions - totalBooked);
      const remainingSessionsInPackage = Math.max(0, totalSessions - completedSessions);
      const isAllCompleted = totalSessions > 0 && (completedSessions >= totalSessions || remainingSessionsInPackage === 0);
      const isLowBalance = !isAllCompleted && remainingSessionsInPackage < 3 && remainingSessionsInPackage > 0;

      const upcomingSessions = groupSessions.filter(sess => {
        if (!sess.scheduledAt) return false;
        const time = new Date(sess.scheduledAt).getTime();
        const st = (sess.status || '').toLowerCase();
        return time >= (now.getTime() - 2 * 60 * 60 * 1000) && !st.includes('cancel') && st !== 'completed';
      }).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

      const nextSession = upcomingSessions[0] || null;
      const nextSessionTime = nextSession ? new Date(nextSession.scheduledAt).getTime() : null;

      const price = (e.payment && e.payment.amount !== undefined && e.payment.amount !== null && e.payment.amount > 0) 
        ? e.payment.amount 
        : (fullGroup.monthlyPrice || e.group?.monthlyPrice || (fullGroup.sessionPrice ? fullGroup.sessionPrice * totalSessions : (fullGroup.studentHourlyRate ? fullGroup.studentHourlyRate * totalSessions : 320)));

      const normStatus = e.status === 'active' ? 'ACTIVE' : (e.status === 'rejected' ? 'CANCELLED' : 'PENDING_PAYMENT');

      // 1. Direct teacher from group or course
      let rawTeacher = e.group?.teacher 
        || fullGroup?.teacher 
        || e.course?.teacher 
        || fullCourse?.teacher 
        || fullGroup?.course?.teacher 
        || null;

      // 2. If group has sessions with teacher assigned
      if (!rawTeacher || !rawTeacher.name) {
        const sessWithTeacher = groupSessions.find(s => s.teacher && s.teacher.name);
        if (sessWithTeacher) rawTeacher = sessWithTeacher.teacher;
      }

      // 3. Fallback: if teacher was an ID or found in allMembers
      let assignedTeacher = null;
      if (rawTeacher && typeof rawTeacher === 'object' && rawTeacher.name) {
        assignedTeacher = rawTeacher;
      } else {
        const tId = (typeof rawTeacher === 'string' ? rawTeacher : null) 
          || rawTeacher?.id 
          || fullGroup?.teacherId 
          || fullCourse?.teacherId;
        if (tId) {
          assignedTeacher = (this.allMembers || []).find(m => String(m.id) === String(tId)) || null;
        }
      }

      return {
        id: e.id,
        isGroup: true,
        group: fullGroup || e.group,
        course: e.course || fullGroup?.course || e.group?.course,
        student: e.student,
        studentId: e.student?.id,
        teacher: assignedTeacher,
        plan: {
          name: `مجموعة: ${fullGroup.name || e.group.name}`,
          price: price,
          sessionsCount: totalSessions
        },
        payment: e.payment,
        receiptUrl: e.payment?.receiptUrl || null,
        status: normStatus,
        rawStatus: e.status,
        totalSessions,
        completedSessions,
        scheduledSessions,
        totalBooked,
        remainingToBook,
        remainingSessionsInPackage,
        isAllCompleted,
        isLowBalance,
        nextSession,
        nextSessionTime,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt
      };
    });

    // 3. Process Class Package Subscriptions (Enrollments with a classPackage assigned)
    const classEnrollments = (this.enrollments || []).filter(e => e.classPackage);
    const classSubsWithMetrics = classEnrollments.map(e => {
      const pkg = e.classPackage;
      const price = (e.payment && e.payment.amount !== undefined && e.payment.amount !== null && Number(e.payment.amount) > 0)
        ? Number(e.payment.amount)
        : (pkg.priceEg ? parseFloat(pkg.priceEg) || 0 : (pkg.price ? parseFloat(pkg.price) || 0 : 0));

      const normStatus = e.status === 'active' ? 'ACTIVE' : (e.status === 'rejected' ? 'CANCELLED' : 'PENDING_PAYMENT');
      const groupsCount = (pkg.linkedGroups || []).length;
      const subjectsCount = (pkg.subjects || []).length;

      return {
        id: e.id,
        isClass: true,
        isGroup: false,
        classPackage: pkg,
        student: e.student,
        studentId: e.student?.id,
        teacher: { name: subjectsCount > 0 ? `${subjectsCount} مواد دراسية` : 'فريق معلمي الفصل' },
        plan: {
          name: `فصل: ${pkg.name}`,
          price: price,
          sessionsCount: pkg.lessonsCount || `${groupsCount} مجموعات`
        },
        payment: e.payment,
        paymentStatus: e.paymentStatus || (e.status === 'active' ? 'PAID' : 'UNPAID'),
        paidAmount: e.paidAmount !== undefined ? e.paidAmount : (e.status === 'active' ? price : 0),
        remainingAmount: e.remainingAmount !== undefined ? e.remainingAmount : 0,
        dueDate: e.dueDate || null,
        installmentHistory: e.installmentHistory || [],
        receiptUrl: e.payment?.receiptUrl || null,
        status: normStatus,
        rawStatus: e.status,
        totalSessions: groupsCount || subjectsCount || 1,
        completedSessions: 0,
        scheduledSessions: 0,
        totalBooked: 0,
        remainingToBook: 0,
        remainingSessionsInPackage: 0,
        isAllCompleted: false,
        isLowBalance: false,
        nextSession: null,
        nextSessionTime: null,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt
      };
    });

    // 4. Combine into unified subscriptions list
    const allUnifiedSubs = [...privateSubsWithMetrics, ...groupSubsWithMetrics, ...classSubsWithMetrics];

    const completedSubsCount = allUnifiedSubs.filter(s => s.isAllCompleted).length;
    const lowBalanceCount = allUnifiedSubs.filter(s => s.isLowBalance).length;
    const pendingCount = allUnifiedSubs.filter(s => s.status === 'PENDING_PAYMENT').length;
    const activeCount = allUnifiedSubs.filter(s => s.status === 'ACTIVE' && !s.isAllCompleted).length;
    const cancelledCount = allUnifiedSubs.filter(s => s.status === 'CANCELLED').length;
    const groupsCount = groupSubsWithMetrics.length;
    const privateCount = privateSubsWithMetrics.length;
    const classesCount = classSubsWithMetrics.length;

    // Helper to calculate sorting priority (Nearest session date/time comes FIRST)
    const getSubSortScore = (s) => {
      if (s.nextSessionTime) {
        return s.nextSessionTime; // earliest upcoming session timestamp (e.g. today < tomorrow < next week)
      }
      const createdTime = s.createdAt ? new Date(s.createdAt).getTime() : 0;
      return 10000000000000 - createdTime; // fallback after all upcoming sessions
    };

    // Apply Filter
    const filter = this.subFilter || "all";
    let filteredSubs = allUnifiedSubs.filter(s => {
      if (filter === "completed_renewal") return s.isAllCompleted;
      if (filter === "classes") return s.isClass;
      if (filter === "groups") return s.isGroup;
      if (filter === "private") return !s.isGroup && !s.isClass;
      if (filter === "low_sessions") return s.isLowBalance;
      if (filter === "pending") return s.status === "PENDING_PAYMENT";
      if (filter === "active") return s.status === "ACTIVE";
      if (filter === "cancelled") return s.status === "CANCELLED";
      return true;
    });

    // Apply Search Query if present
    if (this.subSearchQuery) {
      const q = this.subSearchQuery.toLowerCase().trim();
      filteredSubs = filteredSubs.filter(s => {
        const studentName = (s.student?.name || '').toLowerCase();
        const teacherName = (s.teacher?.name || '').toLowerCase();
        const planName = (s.plan?.name || '').toLowerCase();
        const courseTitle = (s.course?.title || '').toLowerCase();
        const groupName = (s.group?.name || '').toLowerCase();
        const className = (s.classPackage?.name || '').toLowerCase();
        const gradeName = (s.classPackage?.grade?.name || '').toLowerCase();
        const id = (s.id || '').toLowerCase();
        return studentName.includes(q) || teacherName.includes(q) || planName.includes(q) || courseTitle.includes(q) || groupName.includes(q) || className.includes(q) || gradeName.includes(q) || id.includes(q);
      });
    }

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

    // Sort subscriptions inside each student group by nearest session first (Near to day)
    groupedSubsList.forEach(grp => {
      grp.subs.sort((a, b) => getSubSortScore(a) - getSubSortScore(b));
    });

    // Sort student groups list by the nearest upcoming session of any subscription in that group
    groupedSubsList.sort((a, b) => {
      const scoreA = Math.min(...a.subs.map(s => getSubSortScore(s)));
      const scoreB = Math.min(...b.subs.map(s => getSubSortScore(s)));
      return scoreA - scoreB;
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
      const isAllCompletedGroup = totalSessionsSum > 0 && (completedSessionsSum >= totalSessionsSum || remainingSessionsInPackageSum === 0);
      const isAllCompletedAny = group.subs.some(item => item.isAllCompleted);
      const isLowBalanceAny = group.subs.some(item => item.isLowBalance);
      const pendingCountGroup = group.subs.filter(item => item.status === 'PENDING_PAYMENT').length;
      const activeCountGroup = group.subs.filter(item => item.status === 'ACTIVE').length;
      const teachersList = [...new Set(group.subs.map(item => (typeof item.teacher === 'string' ? item.teacher : item.teacher?.name)).filter(Boolean))].join('، ') || 'في الانتظار';
      const isExpanded = this.expandedStudents ? this.expandedStudents.has(group.studentId) : false;

      // Group nearest upcoming session badge
      const groupNextSession = group.subs.map(s => s.nextSession).filter(Boolean).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0] || null;
      let groupNextSessionBadge = '';
      if (groupNextSession && groupNextSession.scheduledAt) {
        const nextDate = new Date(groupNextSession.scheduledAt);
        const isToday = nextDate.toDateString() === now.toDateString();
        const tomorrowDate = new Date(now);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const isTomorrow = nextDate.toDateString() === tomorrowDate.toDateString();
        const timeFormatted = nextDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        const dateFormatted = nextDate.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });

        if (isToday) {
          groupNextSessionBadge = `
            <div style="margin-top:4px;">
              <span style="background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.35); padding:3px 8px; border-radius:10px; font-weight:800; font-size:0.72rem; display:inline-flex; align-items:center; gap:4px;">
                🔴 حصة اليوم (${timeFormatted})
              </span>
            </div>
          `;
        } else if (isTomorrow) {
          groupNextSessionBadge = `
            <div style="margin-top:4px;">
              <span style="background:rgba(245,158,11,0.15); color:#d97706; border:1px solid rgba(245,158,11,0.35); padding:3px 8px; border-radius:10px; font-weight:800; font-size:0.72rem; display:inline-flex; align-items:center; gap:4px;">
                🟡 حصة غداً (${timeFormatted})
              </span>
            </div>
          `;
        } else {
          groupNextSessionBadge = `
            <div style="margin-top:4px;">
              <span style="background:rgba(99,102,241,0.1); color:var(--primary); border:1px solid rgba(99,102,241,0.25); padding:3px 8px; border-radius:10px; font-weight:700; font-size:0.72rem; display:inline-flex; align-items:center; gap:4px;">
                📅 القادمة: ${dateFormatted} (${timeFormatted})
              </span>
            </div>
          `;
        }
      }

      const latestSub = group.subs[0];
      let primaryActionBtnHtml = '';

      if (isAllCompletedGroup || isAllCompletedAny) {
        primaryActionBtnHtml = `
          <button class="btn-primary admin-renew-sub-btn" data-id="${latestSub.id}" style="padding:7px 12px;font-size:0.78rem;background:linear-gradient(135deg, #ef4444 0%, #dc2626 100%);border-color:#ef4444;color:#fff;gap:5px;font-weight:800;box-shadow:0 3px 10px rgba(239,68,68,0.35);">
            <i data-lucide="refresh-cw" style="width:14px;height:14px;"></i> 💳 تجديد الاشتراك الآن ⚠️
          </button>
        `;
      } else if (latestSub.status === 'PENDING_PAYMENT') {
        if (latestSub.isClass) {
          primaryActionBtnHtml = `
            <button class="btn-primary admin-approve-class-sub-btn" data-id="${latestSub.id}" style="padding:6px 11px;font-size:0.75rem;background:#10b981;border-color:#10b981;gap:4px;font-weight:700;">
              <i data-lucide="check-circle" style="width:14px;height:14px;"></i> قبول واعتماد الفصل ✅
            </button>
          `;
        } else if (latestSub.isGroup) {
          primaryActionBtnHtml = `
            <button class="btn-primary admin-approve-group-enrollment-btn" data-id="${latestSub.id}" style="padding:6px 10px;font-size:0.75rem;background:#10b981;border-color:#10b981;gap:4px;font-weight:700;">
              <i data-lucide="check-circle" style="width:14px;height:14px;"></i> قبول واعتماد الإيصال ✅
            </button>
          `;
        } else {
          primaryActionBtnHtml = `
            <button class="btn-primary admin-approve-sub-btn" data-id="${latestSub.id}" style="padding:6px 10px;font-size:0.75rem;background:#10b981;border-color:#10b981;gap:4px;">
              <i data-lucide="check-circle" style="width:14px;height:14px;"></i> 1️⃣ قبول + رفع إيصال
            </button>
          `;
        }
      } else if (latestSub.isClass) {
        primaryActionBtnHtml = `
          <button class="btn-secondary admin-edit-class-payment-btn" data-id="${latestSub.id}" style="padding:6px 10px;font-size:0.75rem;gap:4px;color:#059669;border-color:#059669;font-weight:700;">
            <i data-lucide="credit-card" style="width:13px;height:13px;"></i> تعديل الدفع والتقسيط 💳
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

      const latestCreatedDate = latestSub.createdAt ? new Date(latestSub.createdAt) : null;
      const latestCreatedStr = latestCreatedDate && !isNaN(latestCreatedDate.getTime())
        ? latestCreatedDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
        : '-';

      const summaryRowBg = isAllCompletedGroup
        ? 'background:rgba(239,68,68,0.12); border-inline-start:5px solid #ef4444; border-top:1px solid rgba(239,68,68,0.25); border-bottom:1px solid rgba(239,68,68,0.25);'
        : 'background:rgba(99,102,241,0.06);';

      const summaryRow = `
        <tr class="admin-student-summary-row" data-student-id="${group.studentId}" style="border-bottom:1px solid var(--border-color); font-size:0.85rem; ${summaryRowBg} cursor:pointer;">
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
            ${groupNextSessionBadge}
          </td>
          <td style="padding:12px; font-weight:600; font-size:0.82rem;">${teachersList}</td>
          <td style="padding:12px;">
            <div style="display:flex; flex-direction:column; gap:4px; align-items:flex-start;">
              ${isAllCompletedGroup ? `
                <span class="badge" style="background:#ef4444; color:#fff; font-weight:800; font-size:0.76rem; display:inline-flex; align-items:center; gap:4px; padding:4px 9px; border-radius:8px; box-shadow:0 2px 6px rgba(239,68,68,0.35);">
                  <i data-lucide="alert-octagon" style="width:13px;height:13px;"></i> كافة الحصص منتهية - تجديد مطلوب!
                </span>
              ` : (isAllCompletedAny ? `
                <span class="badge" style="background:rgba(239,68,68,0.18); color:#ef4444; font-weight:800; font-size:0.72rem; display:inline-flex; align-items:center; gap:4px;">
                  <i data-lucide="alert-octagon" style="width:12px;height:12px;"></i> يوجد اشتراك مكتمل وبحاجة للتجديد
                </span>
              ` : `
                <span class="badge" style="background:rgba(59,130,246,0.15); color:#3b82f6; font-weight:700;">
                  مجموع ${group.subs.length} اشتراكات (${activeCountGroup} نشط${pendingCountGroup > 0 ? `، ${pendingCountGroup} انتظار` : ''})
                </span>
              `)}
              ${isLowBalanceAny && !isAllCompletedGroup ? `
                <span class="badge" style="background:rgba(239,68,68,0.15);color:#ef4444;font-weight:700;font-size:0.72rem;display:inline-flex;align-items:center;gap:4px;">
                  <i data-lucide="alert-triangle" style="width:12px;height:12px;"></i> يوجد اشتراك برصيد منخفض
                </span>
              ` : ''}
            </div>
          </td>
          <td style="padding:12px; font-size:0.78rem; font-weight:600; color:var(--text-muted);">
            <div style="display:flex; align-items:center; gap:4px;" title="تاريخ أحدث اشتراك للطالب">
              <i data-lucide="calendar" style="width:13px;height:13px;color:var(--primary);"></i>
              <span>${latestCreatedStr}</span>
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
              <span style="color:${isAllCompletedGroup ? '#ef4444' : (remainingSessionsInPackageSum < 3 ? '#ef4444' : '#10b981')};font-weight:800;">المتبقي بالباقة: ${isAllCompletedGroup ? '0 (منتهية بالكامل)' : remainingSessionsInPackageSum}</span>
            </div>
          </td>
        </tr>
      `;

      const childRows = group.subs.map(s => this.renderSingleSubRow(s, true, !isExpanded)).join('');
      return summaryRow + childRows;
    }).join('');

    return `
      ${completedSubsCount > 0 ? `
      <div class="glass-card" style="background:linear-gradient(135deg, rgba(239,68,68,0.14) 0%, rgba(220,38,38,0.06) 100%); border:2px solid #ef4444; color:#ef4444; padding:18px 22px; border-radius:16px; margin-bottom:20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px; box-shadow:0 4px 20px rgba(239,68,68,0.18);">
        <div style="display:flex; align-items:center; gap:14px;">
          <div style="width:46px; height:46px; border-radius:12px; background:#ef4444; color:#fff; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 4px 12px rgba(239,68,68,0.4);">
            <i data-lucide="bell-ring" style="width:24px;height:24px;"></i>
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <strong style="font-size:1.05rem; color:#dc2626;">تنبيه تجديد الاشتراكات: حصص مكتملة بالكامل 🚨</strong>
              <span class="badge" style="background:#ef4444; color:#fff; font-weight:900; font-size:0.75rem; padding:3px 9px; border-radius:10px;">${completedSubsCount} اشتراك انتهى</span>
            </div>
            <div style="font-size:0.88rem; color:var(--text-main); margin-top:4px;">
              يوجد <strong>${completedSubsCount}</strong> اشتراك تم إتمام كافة حصصه (0 حصة متبقية). تظهر بطاقاتها باللون الأحمر للتنبيه بوجوب تجديد الاشتراك ومراسلة الطالب.
            </div>
          </div>
        </div>
        <button class="btn-primary admin-sub-filter-btn" data-filter="completed_renewal" style="background:#ef4444; border-color:#ef4444; font-size:0.8rem; padding:8px 16px; font-weight:800; border-radius:10px; box-shadow:0 3px 10px rgba(239,68,68,0.35); display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="refresh-cw" style="width:14px;height:14px;"></i> عرض الاشتراكات المنتهية للتجديد (${completedSubsCount})
        </button>
      </div>
      ` : ''}

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
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:14px;">
          <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <h3 style="font-weight:800;font-size:1.15rem;display:flex;align-items:center;gap:8px; margin:0; color:var(--text-main);">
              <i data-lucide="calendar-heart" style="color:var(--primary);width:22px;height:22px;"></i>
              إدارة كافة الاشتراكات (${allUnifiedSubs.length})
            </h3>
            
            <button class="btn-primary" id="admin-open-group-enroll-modal-btn" style="padding:8px 16px; font-size:0.82rem; font-weight:800; background:linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-color:#6366f1; color:#fff; border-radius:20px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 14px rgba(99,102,241,0.3); cursor:pointer;" title="تسكين واشتراك طالب في مجموعة دراسية مع رفع إيصال الدفع">
              <i data-lucide="users" style="width:15px;height:15px;"></i> ➕ تسكين طالب بمجموعة 👥
            </button>

            <button class="btn-primary" id="admin-open-class-sub-modal-btn" style="padding:8px 16px; font-size:0.82rem; font-weight:800; background:linear-gradient(135deg, #059669 0%, #047857 100%); border-color:#059669; color:#fff; border-radius:20px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 14px rgba(5,150,105,0.3); cursor:pointer;" title="تسجيل واشتراك طالب في باقة فصل دراسي شامل">
              <i data-lucide="graduation-cap" style="width:15px;height:15px;"></i> ➕ اشتراك فصل دراسي 🎒
            </button>

            <button class="btn-primary" id="admin-open-manual-sub-modal-btn" style="padding:8px 16px; font-size:0.82rem; font-weight:800; background:linear-gradient(135deg, #10b981 0%, #059669 100%); border-color:#10b981; color:#fff; border-radius:20px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 14px rgba(16,185,129,0.3); cursor:pointer;">
              <i data-lucide="sparkles" style="width:15px;height:15px;"></i> ➕ باقة خاصة لطالب 💎
            </button>
          </div>
          
          <!-- Filters & Search -->
          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            <div style="position:relative; min-width:220px;">
              <input type="text" id="admin-sub-search-input" placeholder="بحث بالطالب أو المعلم أو الفصل أو المجموعة..." value="${this.subSearchQuery || ''}" style="width:100%; padding:7px 12px 7px 32px; border-radius:20px; border:1px solid var(--border-color); font-size:0.82rem; background:var(--bg-app); color:var(--text-main);">
              <i data-lucide="search" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); width:14px; height:14px; color:var(--text-muted);"></i>
            </div>

            <button class="btn-secondary admin-sub-filter-btn ${filter === 'all' ? 'active' : ''}" data-filter="all" style="padding:6px 12px; font-size:0.8rem; font-weight:700; border-radius:20px; ${filter === 'all' ? 'background:var(--primary);color:#fff;border-color:var(--primary);' : ''}">
              الكل (${allUnifiedSubs.length})
            </button>
            ${completedSubsCount > 0 ? `
              <button class="btn-secondary admin-sub-filter-btn ${filter === 'completed_renewal' ? 'active' : ''}" data-filter="completed_renewal" style="padding:6px 12px; font-size:0.8rem; font-weight:800; border-radius:20px; ${filter === 'completed_renewal' ? 'background:#ef4444;color:#fff;border-color:#ef4444;' : 'color:#ef4444;border-color:rgba(239,68,68,0.4);background:rgba(239,68,68,0.06);'}">
                🚨 بحاجة للتجديد (${completedSubsCount})
              </button>
            ` : ''}
            <button class="btn-secondary admin-sub-filter-btn ${filter === 'classes' ? 'active' : ''}" data-filter="classes" style="padding:6px 12px; font-size:0.8rem; font-weight:700; border-radius:20px; ${filter === 'classes' ? 'background:#059669;color:#fff;border-color:#059669;' : ''}">
              🎒 فصول وباقات (${classesCount})
            </button>
            <button class="btn-secondary admin-sub-filter-btn ${filter === 'groups' ? 'active' : ''}" data-filter="groups" style="padding:6px 12px; font-size:0.8rem; font-weight:700; border-radius:20px; ${filter === 'groups' ? 'background:#6366f1;color:#fff;border-color:#6366f1;' : ''}">
              👥 مجموعات (${groupsCount})
            </button>
            <button class="btn-secondary admin-sub-filter-btn ${filter === 'private' ? 'active' : ''}" data-filter="private" style="padding:6px 12px; font-size:0.8rem; font-weight:700; border-radius:20px; ${filter === 'private' ? 'background:#ec4899;color:#fff;border-color:#ec4899;' : ''}">
              💎 باقات خاصة (${privateCount})
            </button>
            <button class="btn-secondary admin-sub-filter-btn ${filter === 'low_sessions' ? 'active' : ''}" data-filter="low_sessions" style="padding:6px 12px; font-size:0.8rem; font-weight:700; border-radius:20px; ${filter === 'low_sessions' ? 'background:#ef4444;color:#fff;border-color:#ef4444;' : ''}">
              ⚠️ منخفض (${lowBalanceCount})
            </button>
            <button class="btn-secondary admin-sub-filter-btn ${filter === 'pending' ? 'active' : ''}" data-filter="pending" style="padding:6px 12px; font-size:0.8rem; font-weight:700; border-radius:20px; ${filter === 'pending' ? 'background:#f59e0b;color:#fff;border-color:#f59e0b;' : ''}">
              ⏳ معلق (${pendingCount})
            </button>
            <button class="btn-secondary admin-sub-filter-btn ${filter === 'active' ? 'active' : ''}" data-filter="active" style="padding:6px 12px; font-size:0.8rem; font-weight:700; border-radius:20px; ${filter === 'active' ? 'background:#10b981;color:#fff;border-color:#10b981;' : ''}">
              ✅ نشط (${activeCount})
            </button>
            <button class="btn-secondary admin-sub-filter-btn ${filter === 'cancelled' ? 'active' : ''}" data-filter="cancelled" style="padding:6px 12px; font-size:0.8rem; font-weight:700; border-radius:20px; ${filter === 'cancelled' ? 'background:var(--border-color);' : ''}">
              ❌ ملغى (${cancelledCount})
            </button>
          </div>
        </div>

        <div style="overflow-x:auto;">
          <table class="table" style="width:100%;text-align:start;border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:1px solid var(--border-color);color:var(--text-muted);font-size:0.82rem; background:rgba(0,0,0,0.02);">
                <th style="padding:12px;font-weight:700;">المعرف / النوع</th>
                <th style="padding:12px;font-weight:700;">الطالب</th>
                <th style="padding:12px;font-weight:700;">الخطة / المجموعة والمقرر</th>
                <th style="padding:12px;font-weight:700;">المعلم المعين</th>
                <th style="padding:12px;font-weight:700;">الحالة والتنبيهات</th>
                <th style="padding:12px;font-weight:700;">تاريخ الطلب / التحديث</th>
                <th style="padding:12px;font-weight:700;text-align:center;">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${renderedRowsHtml || `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted);">لا توجد اشتراكات أو مجموعات دراسية مسجلة تنطبق عليها شروط البحث.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderQuickGroupEnrollModal() {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const groups = this.allCourseGroups || [];
    const students = (this.allMembers || []).filter(m => m.role === "student");

    if (groups.length === 0) {
      showToast("لا توجد مجموعات دراسية مسجلة حالياً.", "warning");
      return;
    }

    container.innerHTML = `
      <div class="modal-overlay" id="quick-group-enroll-modal" style="display:flex; z-index:99999;">
        <div class="modal-content" style="max-width:540px; border-radius:18px; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,0.25);">
          <div class="modal-header" style="background:var(--bg-card); border-bottom:1px solid var(--border-color); padding:16px 20px;">
            <h3 class="modal-title" style="display:flex; align-items:center; gap:8px; font-weight:800; font-size:1.15rem; margin:0;">
              <i data-lucide="user-plus" style="color:var(--primary); width:22px; height:22px;"></i>
              تسكين طالب في مجموعة دراسية (اشتراك مجموعة)
            </h3>
            <span class="modal-close-btn" id="close-quick-group-enroll-modal" style="cursor:pointer; font-size:1.5rem; line-height:1;">&times;</span>
          </div>

          <form id="quick-group-enroll-form">
            <div class="modal-body" style="padding:22px; max-height:80vh; overflow-y:auto; display:flex; flex-direction:column; gap:16px;">
              
              <!-- Select Group -->
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">
                  اختر المجموعة الدراسية <span style="color:var(--danger,#ef4444);">*</span>
                </label>
                <select id="quick-enroll-group-id" class="form-control" style="width:100%; padding:10px 14px; border-radius:10px; border:1px solid var(--border-color); font-weight:600; font-size:0.9rem; background:var(--bg-input, var(--bg-card)); color:var(--text-main);" required>
                  <option value="">-- اختر المجموعة الدراسية --</option>
                  ${groups.map(g => {
                    const price = g.monthlyPrice || (g.sessionPrice ? g.sessionPrice * 8 : (g.studentHourlyRate ? g.studentHourlyRate * 8 : 320));
                    const teacherName = g.teacher?.name || g.course?.teacher?.name || 'بدون معلم';
                    const groupGrade = g.course?.grade?.name || g.course?.degree || g.degree || '';
                    const gradeKey = this.detectGradeKey(g.course?.grade) || this.detectGradeKey(g.course?.degree) || this.detectGradeKey(g.name) || '';
                    return `<option value="${g.id}" data-price="${price}" data-grade-key="${gradeKey}" data-grade-name="${groupGrade}">مجموعة: ${g.name} ${groupGrade ? '· ' + groupGrade : ''} (${teacherName} • ${price} ج.م)</option>`;
                  }).join('')}
                </select>
              </div>

              <!-- Select Student -->
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <label style="font-size:0.85rem; font-weight:800; color:var(--text-main); margin:0;">
                    اختر الطالب المراد تسكينه <span style="color:var(--danger,#ef4444);">*</span>
                  </label>
                  <span id="quick-enroll-grade-badge" style="font-size:0.75rem; color:var(--primary); font-weight:700;"></span>
                </div>
                <select id="quick-enroll-student-id" class="form-control" style="width:100%; padding:10px 14px; border-radius:10px; border:1px solid var(--border-color); font-weight:600; font-size:0.9rem; background:var(--bg-input, var(--bg-card)); color:var(--text-main);" required>
                  <option value="">-- اختر الطالب (${students.length} متاح) --</option>
                  ${students.map(st => `
                    <option value="${st.id}">${st.name || 'طالب'} ${st.education ? '— 🎓 ' + st.education : ''} (${st.phone || st.email || st.id.substring(0,8)})</option>
                  `).join('')}
                </select>
              </div>

              <!-- Amount & Payment Provider -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div>
                  <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">
                    المبلغ المدفوع (ج.م) <span style="color:var(--danger,#ef4444);">*</span>
                  </label>
                  <input type="number" id="quick-enroll-amount" class="form-control" value="320" min="1" step="0.5" style="width:100%; padding:10px 14px; border-radius:10px; border:1px solid var(--border-color); font-size:0.9rem; background:var(--bg-input, var(--bg-card)); color:var(--text-main);" required>
                </div>
                <div>
                  <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">
                    طريقة الدفع <span style="color:var(--danger,#ef4444);">*</span>
                  </label>
                  <select id="quick-enroll-provider" class="form-control" style="width:100%; padding:10px 14px; border-radius:10px; border:1px solid var(--border-color); font-size:0.9rem; background:var(--bg-input, var(--bg-card)); color:var(--text-main);">
                    <option value="vodafone_cash">📱 فودافون كاش</option>
                    <option value="instapay">⚡ إنستاباي</option>
                    <option value="bank_transfer">🏦 تحويل بنكي</option>
                    <option value="orange_cash">🍊 أورنج كاش</option>
                    <option value="etisalat_cash">🟢 اتصالات كاش</option>
                    <option value="we_pay">🟣 وي باي</option>
                    <option value="manual">💵 يدوي / كاش</option>
                  </select>
                </div>
              </div>

              <!-- Transaction Reference ID -->
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">
                  رقم عملية التحويل / كود الإشعار (اختياري)
                </label>
                <input type="text" id="quick-enroll-txid" class="form-control" placeholder="مثال: IPN123456 أو 010xxxxxxxx" style="width:100%; padding:10px 14px; border-radius:10px; border:1px solid var(--border-color); font-size:0.9rem; font-family:monospace; background:var(--bg-input, var(--bg-card)); color:var(--text-main);">
              </div>

              <!-- Receipt Proof Upload (Mandatory) -->
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">
                  صورة إيصال التحويل / السداد <span style="color:var(--danger,#ef4444);">* (إجباري)</span>
                </label>
                <div id="quick-enroll-dropzone" style="border:2px dashed var(--border-color); border-radius:14px; padding:18px; text-align:center; background:rgba(0,0,0,0.01); cursor:pointer;">
                  <input type="file" id="quick-enroll-receipt-file" accept="image/*" style="display:none;" required>
                  <div id="quick-enroll-upload-prompt">
                    <i data-lucide="upload-cloud" style="width:32px; height:32px; color:var(--primary); margin-bottom:6px; opacity:0.8;"></i>
                    <div style="font-weight:700; font-size:0.88rem; color:var(--text-main);">انقر لاختيار صورة الإيصال أو اسحبها هنا</div>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">PNG, JPG, WEBP</div>
                  </div>
                  <div id="quick-enroll-file-preview" style="display:none; flex-direction:column; align-items:center; gap:8px;">
                    <img id="quick-enroll-preview-img" src="" style="max-height:130px; max-width:100%; border-radius:8px; object-fit:contain; border:1px solid var(--border-color);">
                    <div id="quick-enroll-file-name" style="font-size:0.8rem; font-weight:700;"></div>
                    <button type="button" id="quick-enroll-remove-file" class="btn-secondary" style="font-size:0.72rem; padding:3px 8px; color:var(--danger); border-color:var(--danger);">إزالة ✕</button>
                  </div>
                </div>
              </div>

              <!-- Notes -->
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">
                  ملاحظات الإدارة
                </label>
                <input type="text" id="quick-enroll-notes" class="form-control" placeholder="مثال: تسكين رسمي مع إيصال معتمد من لوحة الاشتراكات" style="width:100%; padding:10px 14px; border-radius:10px; border:1px solid var(--border-color); font-size:0.88rem; background:var(--bg-input, var(--bg-card)); color:var(--text-main);">
              </div>

              <div style="display:flex; gap:10px; margin-top:6px;">
                <button type="submit" id="quick-enroll-submit-btn" class="btn-primary" style="flex:1; padding:12px; font-weight:800; font-size:0.95rem; border-radius:10px; display:inline-flex; align-items:center; justify-content:center; gap:8px;">
                  <i data-lucide="check-circle" style="width:18px; height:18px;"></i>
                  تأكيد تسكين الطالب وتفعيل اشتراكه بالمجموعة ✅
                </button>
                <button type="button" id="cancel-quick-group-enroll-btn" class="btn-secondary" style="padding:12px 20px; font-weight:700; border-radius:10px;">إلغاء</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => { container.innerHTML = ""; };
    document.getElementById("close-quick-group-enroll-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-quick-group-enroll-btn")?.addEventListener("click", closeModal);

    const groupSelect = document.getElementById("quick-enroll-group-id");
    const amountInput = document.getElementById("quick-enroll-amount");
    const gradeBadge = document.getElementById("quick-enroll-grade-badge");
    const studentSelect = document.getElementById("quick-enroll-student-id");

    groupSelect?.addEventListener("change", () => {
      const opt = groupSelect.options[groupSelect.selectedIndex];
      const p = opt?.getAttribute("data-price");
      if (p && amountInput) amountInput.value = p;

      const targetGradeKey = opt?.getAttribute("data-grade-key");
      const targetGradeName = opt?.getAttribute("data-grade-name");

      if (studentSelect) {
        if (targetGradeKey) {
          const matchingStudents = students.filter(st => this.detectGradeKey(st.education) === targetGradeKey);
          if (matchingStudents.length > 0) {
            if (gradeBadge) gradeBadge.textContent = `🎯 طلاب ${targetGradeName} فقط (${matchingStudents.length} متاح)`;
            studentSelect.innerHTML = `
              <option value="">-- اختر طالباً من طلاب ${targetGradeName} (${matchingStudents.length} متاح) --</option>
              ${matchingStudents.map(st => `
                <option value="${st.id}">
                  ${st.name || 'طالب'} ${st.education ? '— 🎓 ' + st.education : ''} (${st.phone || st.email || st.id.substring(0,8)})
                </option>
              `).join('')}
            `;
            return;
          }
        }
        if (gradeBadge) gradeBadge.textContent = "";
        studentSelect.innerHTML = `
          <option value="">-- اختر الطالب (${students.length} متاح) --</option>
          ${students.map(st => `
            <option value="${st.id}">
              ${st.name || 'طالب'} ${st.education ? '— 🎓 ' + st.education : ''} (${st.phone || st.email || st.id.substring(0,8)})
            </option>
          `).join('')}
        `;
      }
    });

    const dropzone = document.getElementById("quick-enroll-dropzone");
    const fileInput = document.getElementById("quick-enroll-receipt-file");
    const uploadPrompt = document.getElementById("quick-enroll-upload-prompt");
    const filePreview = document.getElementById("quick-enroll-file-preview");
    const previewImg = document.getElementById("quick-enroll-preview-img");
    const fileNameSpan = document.getElementById("quick-enroll-file-name");
    const removeBtn = document.getElementById("quick-enroll-remove-file");

    dropzone?.addEventListener("click", (e) => {
      if (e.target.id === "quick-enroll-remove-file") return;
      fileInput?.click();
    });

    fileInput?.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      fileNameSpan.textContent = file.name;
      const reader = new FileReader();
      reader.onload = (ev) => {
        previewImg.src = ev.target.result;
        uploadPrompt.style.display = "none";
        filePreview.style.display = "flex";
        if (window.lucide) window.lucide.createIcons();
      };
      reader.readAsDataURL(file);
    });

    removeBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      fileInput.value = "";
      previewImg.src = "";
      fileNameSpan.textContent = "";
      filePreview.style.display = "none";
      uploadPrompt.style.display = "block";
    });

    const form = document.getElementById("quick-group-enroll-form");
    const submitBtn = document.getElementById("quick-enroll-submit-btn");

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const groupId = groupSelect.value;
      const studentId = document.getElementById("quick-enroll-student-id")?.value;
      const amount = amountInput.value;
      const provider = document.getElementById("quick-enroll-provider")?.value;
      const providerTransactionId = document.getElementById("quick-enroll-txid")?.value.trim() || undefined;
      const notes = document.getElementById("quick-enroll-notes")?.value.trim() || undefined;

      if (!groupId) {
        showToast("يرجى اختيار المجموعة الدراسية.", "error");
        return;
      }
      if (!studentId) {
        showToast("يرجى اختيار الطالب المراد تسكينه.", "error");
        return;
      }
      if (!fileInput.files || !fileInput.files[0]) {
        showToast("يرجى إرفاق صورة إيصال السداد.", "error");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i data-lucide="loader-2" class="animate-spin" style="width:18px;height:18px;"></i> جاري رفع الإيصال وتسكين الطالب...`;
      if (window.lucide) window.lucide.createIcons();

      try {
        const formData = new FormData();
        formData.append("file", fileInput.files[0]);
        const token = state.token || localStorage.getItem("token");
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });

        if (!uploadRes.ok) throw new Error("فشل رفع صورة الإيصال.");
        const uploadData = await uploadRes.json();
        const receiptUrl = uploadData.url;

        const res = await apiFetch(`/admin/groups/${groupId}/add-student`, {
          method: "POST",
          body: JSON.stringify({ studentId, amount, provider, providerTransactionId, receiptUrl, notes })
        });

        showToast(res.message || "تم تسكين الطالب في المجموعة واشتراكه بنجاح! 👥🎉", "success");
        closeModal();
        await this.loadAllData();
        this.renderTab("subscriptions");
      } catch (err) {
        showToast(err.message || "فشل تسكين الطالب بالمجموعة.", "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i data-lucide="check-circle" style="width:18px; height:18px;"></i> تأكيد تسكين الطالب وتفعيل اشتراكه بالمجموعة ✅`;
        if (window.lucide) window.lucide.createIcons();
      }
    });
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

  // ── Render Manual Subscription Creation Modal ──────────────────────────────
  renderManualSubscriptionModal() {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const students = (this.allMembers || []).filter(u => u.role === "student");
    const teachers = (this.allMembers || []).filter(u => u.role === "teacher");
    const plans = this.allPlans || [];

    if (students.length === 0) {
      showToast("لا يوجد طلاب مسجلون في المنصة حالياً لإضافتهم.", "warning");
      return;
    }

    if (plans.length === 0) {
      showToast("الرجاء إنشاء خطة اشتراك واحدة على الأقل أولاً.", "warning");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const defaultPlan = plans[0];
    const defaultDurationDays = defaultPlan.durationDays || 30;
    const defaultEndDate = new Date(Date.now() + defaultDurationDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    container.innerHTML = `
      <div class="modal-overlay" id="manual-sub-modal" style="display:flex;">
        <div class="modal-content" style="max-width:580px; max-height:90vh; overflow-y:auto;">
          <div class="modal-header">
            <h3 class="modal-title" style="display:flex;align-items:center;gap:8px;">
              <i data-lucide="user-plus" style="color:var(--primary);width:22px;height:22px;"></i>
              إضافة وتفعيل اشتراك يدوي لطالب 💳
            </h3>
            <span class="modal-close-btn" id="close-manual-sub-modal">&times;</span>
          </div>
          <form id="manual-sub-form">
            <div class="modal-body" style="display:flex;flex-direction:column;gap:16px;">
              
              <div style="background:linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(99,102,241,0.08) 100%); border:1px solid rgba(16,185,129,0.2); padding:12px 16px; border-radius:12px; font-size:0.85rem; color:var(--text-main);">
                <div style="display:flex; align-items:center; gap:6px; font-weight:800; margin-bottom:4px; color:#10b981;">
                  <i data-lucide="zap" style="width:16px;height:16px;"></i> تفعيل فوري وشحن رصيد تلقائي
                </div>
                سيتم تفعيل الاشتراك مباشرة وإيداع رصيد الحصص في حساب الطالب وتسجيل سند القبض المالي وإرسال إشعار فوري.
              </div>

              <!-- 1. Student Selection -->
              <div class="form-group">
                <label style="font-size:0.88rem;font-weight:700;display:block;margin-bottom:6px;">
                  1️⃣ اختر الطالب <span style="color:#ef4444;">*</span>:
                </label>
                <select id="manual-sub-student-select" class="form-input" required style="width:100%;padding:10px;font-size:0.88rem;">
                  <option value="" disabled selected>-- اختر طالباً من القائمة --</option>
                  ${students.map(st => `
                    <option value="${st.id}" data-education="${st.education || ''}" data-phone="${st.phone || ''}">
                      ${st.name} (${st.email}${st.phone ? ' - ' + st.phone : ''})
                    </option>
                  `).join('')}
                </select>
              </div>

              <!-- 2. Plan Selection -->
              <div class="form-group">
                <label style="font-size:0.88rem;font-weight:700;display:block;margin-bottom:6px;">
                  2️⃣ باقة الاشتراك <span style="color:#ef4444;">*</span>:
                </label>
                <select id="manual-sub-plan-select" class="form-input" required style="width:100%;padding:10px;font-size:0.88rem;">
                  ${plans.map((p, idx) => `
                    <option value="${p.id}" data-price="${p.price}" data-sessions="${p.sessionsCount}" data-duration="${p.durationDays || 30}" ${idx === 0 ? 'selected' : ''}>
                      ${p.name} (${p.sessionsCount} حصص - ${p.price} ${p.currency || 'ج.م'})
                    </option>
                  `).join('')}
                </select>
              </div>

              <!-- 3. Teacher Selection (Optional) -->
              <div class="form-group">
                <label style="font-size:0.88rem;font-weight:700;display:block;margin-bottom:6px;">
                  3️⃣ الأستاذ المعين (اختياري - يمكن تركه لتعيينه لاحقاً):
                </label>
                <select id="manual-sub-teacher-select" class="form-input" style="width:100%;padding:10px;font-size:0.88rem;">
                  <option value="">-- بدون تعيين الآن (في انتظار التعيين) --</option>
                  ${teachers.map(tc => `
                    <option value="${tc.id}">
                      أ. ${tc.name} ${tc.customCategories ? `(${tc.customCategories})` : ''}
                    </option>
                  `).join('')}
                </select>
              </div>

              <!-- 4. Subject and Level -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="form-group">
                  <label style="font-size:0.85rem;font-weight:700;display:block;margin-bottom:6px;">المادة / التخصص:</label>
                  <input type="text" id="manual-sub-subject" class="form-input" placeholder="مثال: رياضيات، فيزياء..." style="width:100%;padding:10px;">
                </div>
                <div class="form-group">
                  <label style="font-size:0.85rem;font-weight:700;display:block;margin-bottom:6px;">المرحلة الدراسية:</label>
                  <input type="text" id="manual-sub-level" class="form-input" placeholder="مثال: الثالث الثانوي..." style="width:100%;padding:10px;">
                </div>
              </div>

              <!-- 5. Dates -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="form-group">
                  <label style="font-size:0.85rem;font-weight:700;display:block;margin-bottom:6px;">تاريخ البداية:</label>
                  <input type="date" id="manual-sub-start-date" class="form-input" value="${todayStr}" required style="width:100%;padding:10px;">
                </div>
                <div class="form-group">
                  <label style="font-size:0.85rem;font-weight:700;display:block;margin-bottom:6px;">تاريخ الانتهاء:</label>
                  <input type="date" id="manual-sub-end-date" class="form-input" value="${defaultEndDate}" required style="width:100%;padding:10px;">
                </div>
              </div>

              <!-- 6. Payment Amount & Provider -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="form-group">
                  <label style="font-size:0.85rem;font-weight:700;display:block;margin-bottom:6px;">المبلغ المحصل (ج.م):</label>
                  <input type="number" id="manual-sub-amount" class="form-input" value="${defaultPlan.price}" required min="0" style="width:100%;padding:10px;">
                </div>
                <div class="form-group">
                  <label style="font-size:0.85rem;font-weight:700;display:block;margin-bottom:6px;">طريقة التحصيل / الدفع:</label>
                  <select id="manual-sub-provider" class="form-input" style="width:100%;padding:10px;">
                    <option value="كاش / يدوي">كاش / استلام يدوي 💵</option>
                    <option value="فودافون كاش">فودافون كاش 📱</option>
                    <option value="إنستاباي / تحويل بنكي">إنستاباي / تحويل بنكي 🏦</option>
                    <option value="محفظة إلكترونية">محفظة إلكترونية 💳</option>
                    <option value="مجاني / منحة دراسية">مجاني / منحة وتكريم 🎁</option>
                  </select>
                </div>
              </div>

              <!-- 7. Receipt Image (Optional) -->
              <div class="form-group">
                <label style="font-size:0.85rem;font-weight:700;display:block;margin-bottom:6px;">صورة إيصال التحويل (اختياري) 🖼️:</label>
                <input type="file" id="manual-sub-receipt-file" class="form-input" accept="image/*" style="width:100%;padding:8px;">
                <div id="manual-sub-preview-container" style="margin-top:8px;display:none;">
                  <img id="manual-sub-preview" src="" style="max-height:120px;border-radius:8px;border:1px solid var(--border-color);max-width:100%;">
                </div>
              </div>

              <!-- 8. Notes -->
              <div class="form-group">
                <label style="font-size:0.85rem;font-weight:700;display:block;margin-bottom:6px;">ملاحظات إضافية (اختياري):</label>
                <textarea id="manual-sub-notes" class="form-input" rows="2" style="width:100%;padding:10px;" placeholder="أي تفاصيل خاصة بالدفع أو رغبة الطالب..."></textarea>
              </div>

            </div>
            <div class="modal-footer" style="padding-top:12px;border-top:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;">
              <button type="button" class="btn-secondary" id="cancel-manual-sub-btn">إلغاء</button>
              <button type="submit" class="btn-primary" id="submit-manual-sub-btn" style="background:linear-gradient(135deg,#10b981,#059669);border-color:#10b981;font-weight:800;padding:10px 24px;">
                <i data-lucide="check-circle" style="width:16px;height:16px;"></i> إنشاء وتفعيل الاشتراك فوراً ✅
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => { container.innerHTML = ""; };
    document.getElementById("close-manual-sub-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-manual-sub-btn")?.addEventListener("click", closeModal);

    // Dynamic Plan Change Update (Price & End Date)
    const planSelect = document.getElementById("manual-sub-plan-select");
    const amountInput = document.getElementById("manual-sub-amount");
    const startDateInput = document.getElementById("manual-sub-start-date");
    const endDateInput = document.getElementById("manual-sub-end-date");

    const updatePlanCalculations = () => {
      const selectedOption = planSelect.options[planSelect.selectedIndex];
      if (!selectedOption) return;
      const price = selectedOption.getAttribute("data-price") || "0";
      const duration = parseInt(selectedOption.getAttribute("data-duration") || "30", 10);
      amountInput.value = price;

      const startDateVal = startDateInput.value ? new Date(startDateInput.value) : new Date();
      const endCalculated = new Date(startDateVal.getTime() + duration * 24 * 60 * 60 * 1000);
      endDateInput.value = endCalculated.toISOString().split("T")[0];
    };

    planSelect?.addEventListener("change", updatePlanCalculations);
    startDateInput?.addEventListener("change", updatePlanCalculations);

    // Student selection autofill level
    const studentSelect = document.getElementById("manual-sub-student-select");
    const levelInput = document.getElementById("manual-sub-level");
    studentSelect?.addEventListener("change", () => {
      const selectedStudent = studentSelect.options[studentSelect.selectedIndex];
      const edu = selectedStudent?.getAttribute("data-education");
      if (edu && !levelInput.value) {
        levelInput.value = edu;
      }
    });

    // Receipt File Preview
    const fileInput = document.getElementById("manual-sub-receipt-file");
    const previewContainer = document.getElementById("manual-sub-preview-container");
    const previewImg = document.getElementById("manual-sub-preview");

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

    // Form Submit
    document.getElementById("manual-sub-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById("submit-manual-sub-btn");
      submitBtn.disabled = true;
      submitBtn.innerText = "جاري الإنشاء والتفعيل...";

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
            submitBtn.innerText = "إنشاء وتفعيل الاشتراك فوراً ✅";
            return;
          }
        }

        const studentId = document.getElementById("manual-sub-student-select").value;
        const planId = document.getElementById("manual-sub-plan-select").value;
        const teacherId = document.getElementById("manual-sub-teacher-select").value || null;
        const subjectId = document.getElementById("manual-sub-subject").value || null;
        const levelId = document.getElementById("manual-sub-level").value || null;
        const startDate = document.getElementById("manual-sub-start-date").value;
        const endDate = document.getElementById("manual-sub-end-date").value;
        const amount = document.getElementById("manual-sub-amount").value;
        const provider = document.getElementById("manual-sub-provider").value;
        const notes = document.getElementById("manual-sub-notes").value;

        const res = await apiFetch("/admin/subscriptions/manual-create", {
          method: "POST",
          body: JSON.stringify({
            studentId,
            planId,
            teacherId,
            subjectId,
            levelId,
            startDate,
            endDate,
            amount,
            provider,
            receiptUrl,
            notes,
            autoActivate: true
          })
        });

        showToast(res.message || "تم إنشاء وتفعيل الاشتراك للطالب بنجاح 🎉", "success");
        closeModal();
        await this.loadAllData();
        this.renderTab("subscriptions");
      } catch (err) {
        showToast(err.message || "فشل إنشاء الاشتراك", "error");
        submitBtn.disabled = false;
        submitBtn.innerText = "إنشاء وتفعيل الاشتراك فوراً ✅";
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
              <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">اختر المعلم الذي سيتولى تقديم الحصص لهذا الاشتراك الخاص.</p>
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

    const { subscription, availability = [], completedCount = 0, scheduledCount = 0 } = scheduleDetails;
    const totalSessions = scheduleDetails.totalSessions || subscription?.totalSessions || subscription?.plan?.sessionsCount || 8;
    const teachers = (this.allMembers || []).filter(u => u.role === "teacher");
    const activeTeacherId = defaultTeacherId || subscription.teacher?.id || (teachers[0]?.id || "");

    let currentStep = 1;
    let previewData = null;

    const daysAr = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const availDaysList = availability.map(a => `${daysAr[a.dayOfWeek]} (${a.startTime} - ${a.endTime})`);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    const defaultStartDateStr = `${y}-${m}-${d}`;

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
                <div style="display:flex; align-items:center; gap:8px;">
                  <span id="wiz-count-badge" class="badge" style="background:rgba(16,185,129,0.1); color:#10b981; font-weight:700; padding:6px 12px;">-</span>
                  <button type="button" id="wiz-recheck-btn" class="btn-secondary" style="padding:5px 12px; font-size:0.78rem; font-weight:700; border-radius:8px; display:none;">
                    🔄 إعادة فحص التعارضات
                  </button>
                </div>
              </div>

              <div id="wiz-conflict-banner" style="display:none; background:rgba(245,158,11,0.1); border:1px solid #f59e0b; border-radius:10px; padding:10px 14px; margin-bottom:12px; font-size:0.83rem; color:#b45309; font-weight:600;">
                ⚠️ تنبيه: تم اكتشاف تعارض في بعض المواعيد. عدّل التاريخ أو الساعة ثم اضغط "إعادة فحص التعارضات" للتأكد.
              </div>

              <div style="overflow-x:auto; max-height:320px; overflow-y:auto; border:1px solid var(--border-color); border-radius:12px; margin-bottom:16px;">
                <table style="width:100%; border-collapse:collapse; font-size:0.83rem;">
                  <thead style="position:sticky; top:0; background:var(--bg-app); border-bottom:1px solid var(--border-color); color:var(--text-muted);">
                    <tr>
                      <th style="padding:10px 12px; text-align:start;">#</th>
                      <th style="padding:10px 12px; text-align:start;">اليوم والتاريخ</th>
                      <th style="padding:10px 12px; text-align:start;">الوقت</th>
                      <th style="padding:10px 12px; text-align:start;">المعلم</th>
                      <th style="padding:10px 12px; text-align:start;">الحالة</th>
                      <th style="padding:10px 12px; text-align:end;">تعديل الموعد</th>
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

    const updateTeacherAvailabilityView = async (tId) => {
      const availBox = document.getElementById("wiz-avail-badges");
      if (!availBox) return;
      try {
        const avail = await apiFetch(`/teachers/${tId}/availability`).catch(() => []);
        if (avail && avail.length > 0) {
          const daysAr = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
          availBox.innerHTML = avail.map(a => `<span class="badge" style="background:rgba(16,185,129,0.15); color:#047857; font-size:0.78rem;">✓ ${daysAr[a.dayOfWeek]} (${a.startTime} - ${a.endTime})</span>`).join('');

          const availDayNums = avail.map(a => a.dayOfWeek);
          document.querySelectorAll('input[name="wizDays"]').forEach(cb => {
            cb.checked = availDayNums.includes(parseInt(cb.value, 10));
          });
          if (avail[0]?.startTime) {
            const timeEl = document.getElementById("wiz-time-of-day");
            if (timeEl) timeEl.value = avail[0].startTime;
          }
        } else {
          availBox.innerHTML = '<span style="font-size:0.8rem; color:var(--text-muted);">لم يتم تسجيل جدول تفرغ محدد (متاح جميع الأيام).</span>';
        }
      } catch (e) { }
    };

    document.getElementById("wiz-teacher-select")?.addEventListener("change", (e) => {
      const tId = e.target.value;
      if (tId) updateTeacherAvailabilityView(tId);
    });

    if (activeTeacherId) {
      updateTeacherAvailabilityView(activeTeacherId);
    }

    const renderPreviewTable = (data) => {
      const tbody = document.getElementById("wiz-preview-tbody");
      const badge = document.getElementById("wiz-count-badge");
      const conflictBanner = document.getElementById("wiz-conflict-banner");
      const recheckBtn = document.getElementById("wiz-recheck-btn");

      if (!tbody) return;

      const validCount = data.items ? data.items.filter(i => i.status === 'VALID').length : data.validCount;
      const conflictCount = data.items ? data.items.filter(i => i.status === 'CONFLICT').length : data.conflictCount;
      const modifiedCount = data.items ? data.items.filter(i => i.status === 'MODIFIED').length : 0;
      data.validCount = validCount;
      data.conflictCount = conflictCount;

      badge.textContent = `${validCount} / ${data.countGenerated} حصة جاهزة للجدولة`;
      conflictBanner.style.display = conflictCount > 0 ? "block" : "none";
      if (recheckBtn) recheckBtn.style.display = modifiedCount > 0 ? "inline-flex" : "none";

      // Build hour options (from 6 AM to 11 PM)
      const hourOptions = [];
      for (let h = 6; h <= 23; h++) {
        const label = h < 12 ? `${h === 0 ? 12 : h}:00 ص` : `${h === 12 ? 12 : h - 12}:00 م`;
        hourOptions.push({ value: h, label });
      }

      tbody.innerHTML = (data.items || []).map((item, idx) => {
        const d = new Date(item.scheduledAt);
        const dateStr = d.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
        const currentHour = d.getHours();
        const timeStr = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

        const pad = (n) => String(n).padStart(2, '0');
        const dateVal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

        const hourSelectOptions = hourOptions.map(opt =>
          `<option value="${opt.value}" ${opt.value === currentHour ? 'selected' : ''}>${opt.label}</option>`
        ).join('');

        let statusBadge = '';
        if (item.status === 'VALID') {
          statusBadge = '<span class="badge" style="background:rgba(16,185,129,0.1); color:#10b981;">✓ جاهزة</span>';
        } else if (item.status === 'MODIFIED') {
          statusBadge = '<span class="badge" style="background:rgba(59,130,246,0.1); color:#3b82f6;">✎ معدّل</span>';
        } else {
          statusBadge = `<div>
            <span class="badge" style="background:rgba(239,68,68,0.1); color:#ef4444;">⚠️ تعارض</span>
            ${item.conflictReason ? `<div style="font-size:0.72rem; color:#b45309; margin-top:4px; max-width:180px; line-height:1.4;">${item.conflictReason}</div>` : ''}
          </div>`;
        }

        return `
          <tr style="border-bottom:1px solid var(--border-color);" data-idx="${idx}">
            <td style="padding:10px 12px; font-weight:700;">#${item.index}</td>
            <td class="wiz-day-date" style="padding:10px 12px; font-weight:700;">${item.dayName} ${dateStr}</td>
            <td class="wiz-time-cell" style="padding:10px 12px; font-weight:600; color:var(--primary);">${timeStr}</td>
            <td style="padding:10px 12px;">${item.teacherName}</td>
            <td class="wiz-status-cell" style="padding:10px 12px;">
              ${statusBadge}
            </td>
            <td style="padding:10px 12px; text-align:end;">
              <div style="display:flex; gap:6px; justify-content:flex-end; align-items:center;">
                <input type="date" class="form-input wiz-row-date-part" data-idx="${idx}" value="${dateVal}" style="padding:4px 6px; font-size:0.8rem; border-radius:6px; width:130px;" />
                <select class="form-select wiz-row-hour-part" data-idx="${idx}" style="padding:4px 6px; font-size:0.8rem; border-radius:6px; width:100px;">
                  ${hourSelectOptions}
                </select>
              </div>
            </td>
          </tr>
        `;
      }).join("");

      // Helper: update a single row display after manual date/hour change
      const handleRowChange = (idx) => {
        if (!previewData || !previewData.items[idx]) return;

        const row = tbody.querySelector(`tr[data-idx="${idx}"]`);
        if (!row) return;

        const dateInput = row.querySelector(".wiz-row-date-part");
        const hourSelect = row.querySelector(".wiz-row-hour-part");
        if (!dateInput || !hourSelect) return;

        const selectedHour = parseInt(hourSelect.value, 10);
        const newD = new Date(`${dateInput.value}T${String(selectedHour).padStart(2, '0')}:00:00`);
        if (isNaN(newD.getTime())) return;

        previewData.items[idx].scheduledAt = newD.toISOString();
        previewData.items[idx].status = "MODIFIED";
        previewData.items[idx].conflictReason = null;

        // Update display cells in-place
        const daysAr = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
        const dayName = daysAr[newD.getDay()];
        previewData.items[idx].dayName = dayName;
        const dStr = newD.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
        const tStr = newD.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

        const dayDateEl = row.querySelector(".wiz-day-date");
        if (dayDateEl) dayDateEl.textContent = `${dayName} ${dStr}`;

        const timeCellEl = row.querySelector(".wiz-time-cell");
        if (timeCellEl) timeCellEl.textContent = tStr;

        const statusCellEl = row.querySelector(".wiz-status-cell");
        if (statusCellEl) {
          statusCellEl.innerHTML = '<span class="badge" style="background:rgba(59,130,246,0.1); color:#3b82f6;">✎ معدّل</span>';
        }

        // Show recheck button
        if (recheckBtn) recheckBtn.style.display = "inline-flex";
      };

      // Attach change listeners
      tbody.querySelectorAll(".wiz-row-date-part").forEach(input => {
        input.addEventListener("change", () => {
          handleRowChange(parseInt(input.getAttribute("data-idx"), 10));
        });
      });
      tbody.querySelectorAll(".wiz-row-hour-part").forEach(sel => {
        sel.addEventListener("change", () => {
          handleRowChange(parseInt(sel.getAttribute("data-idx"), 10));
        });
      });
    };

    // Re-check button: sends updated times to server for real conflict validation
    document.getElementById("wiz-recheck-btn")?.addEventListener("click", async () => {
      if (!previewData || !previewData.items) return;

      const recheckBtn = document.getElementById("wiz-recheck-btn");
      if (recheckBtn) { recheckBtn.disabled = true; recheckBtn.textContent = "⏳ جاري الفحص..."; }

      try {
        const teacherId = document.getElementById("wiz-teacher-select").value;
        const payload = {
          subscriptionId: subId,
          teacherId,
          sessions: previewData.items.map(item => ({
            scheduledAt: item.scheduledAt,
            index: item.index
          })),
          isEditMode
        };

        const result = await apiFetch("/sessions/recheck-schedule-conflicts", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        if (result && result.items) {
          previewData.items = result.items;
          previewData.validCount = result.validCount;
          previewData.conflictCount = result.conflictCount;
          previewData.countGenerated = result.items.length;
        }

        renderPreviewTable(previewData);
        if (window.lucide) window.lucide.createIcons();

        if (result.conflictCount === 0) {
          showToast("✅ جميع المواعيد جاهزة بدون تعارض!", "success");
        } else {
          showToast(`⚠️ لا يزال هناك ${result.conflictCount} تعارض`, "warning");
        }
      } catch (err) {
        showToast(err.message || "فشل فحص التعارضات", "error");
      } finally {
        if (recheckBtn) { recheckBtn.disabled = false; recheckBtn.textContent = "🔄 إعادة فحص التعارضات"; }
      }
    });

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
  },

  detectGradeKey(textOrGrade) {
    if (!textOrGrade) return null;
    if (typeof textOrGrade === "object") {
      if (textOrGrade.code) {
        const c = String(textOrGrade.code).toUpperCase().trim();
        if (c === "PRI_1") return "GRADE_1";
        if (c === "PRI_2") return "GRADE_2";
        if (c === "PRI_3") return "GRADE_3";
        if (c === "PRI_4") return "GRADE_4";
        if (c === "PRI_5") return "GRADE_5";
        if (c === "PRI_6") return "GRADE_6";
        if (c === "PREP_1") return "GRADE_7";
        if (c === "PREP_2") return "GRADE_8";
        if (c === "PREP_3") return "GRADE_9";
        if (c === "SEC_1") return "GRADE_10";
        if (c === "SEC_2") return "GRADE_11";
        if (c === "SEC_3") return "GRADE_12";
      }
      if (textOrGrade.order !== undefined && textOrGrade.order !== null) {
        const ord = Number(textOrGrade.order);
        if (ord >= 1 && ord <= 12) return `GRADE_${ord}`;
      }
      textOrGrade = `${textOrGrade.name || ""} ${textOrGrade.nameEn || ""} ${textOrGrade.degree || ""}`;
    }

    const s = String(textOrGrade || "").toLowerCase()
      .replace(/[إأآا]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .trim();
    if (!s) return null;

    // Primary 1 - 6
    if (/grade\s*1\b|pri[_-]?1\b|1\s*ابتدائي|اول\s*ابتدائي|الاول\s*الابتدائي/.test(s)) return "GRADE_1";
    if (/grade\s*2\b|pri[_-]?2\b|2\s*ابتدائي|ثاني\s*ابتدائي|الثاني\s*الابتدائي/.test(s)) return "GRADE_2";
    if (/grade\s*3\b|pri[_-]?3\b|3\s*ابتدائي|ثالث\s*ابتدائي|الثالث\s*الابتدائي/.test(s)) return "GRADE_3";
    if (/grade\s*4\b|pri[_-]?4\b|4\s*ابتدائي|رابع\s*ابتدائي|الرابع\s*الابتدائي/.test(s)) return "GRADE_4";
    if (/grade\s*5\b|pri[_-]?5\b|5\s*ابتدائي|خامس\s*ابتدائي|الخامس\s*الابتدائي/.test(s)) return "GRADE_5";
    if (/grade\s*6\b|pri[_-]?6\b|6\s*ابتدائي|سادس\s*ابتدائي|السادس\s*الابتدائي/.test(s)) return "GRADE_6";

    // Prep 1 - 3 (Grades 7 - 9)
    if (/grade\s*7\b|prep[_-]?1\b|1\s*اعدادي|اول\s*اعدادي|الاول\s*الاعدادي|7\s*متوسط/.test(s)) return "GRADE_7";
    if (/grade\s*8\b|prep[_-]?2\b|2\s*اعدادي|ثاني\s*اعدادي|الثاني\s*الاعدادي|8\s*متوسط/.test(s)) return "GRADE_8";
    if (/grade\s*9\b|prep[_-]?3\b|3\s*اعدادي|ثالث\s*اعدادي|الثالث\s*الاعدادي|9\s*متوسط|\bbem\b/.test(s)) return "GRADE_9";

    // Secondary 1 - 3 (Grades 10 - 12)
    if (/grade\s*10\b|sec[_-]?1\b|entlq\s*1\b|1ث|اول\s*ثانوي|اولي\s*ثانوي|الاول\s*الثانوي/.test(s)) return "GRADE_10";
    if (/grade\s*11\b|sec[_-]?2\b|entlq\s*2\b|2ث|ثاني\s*ثانوي|ثانيه\s*ثانوي|الثاني\s*الثانوي/.test(s)) return "GRADE_11";
    if (/grade\s*12\b|sec[_-]?3\b|entlq\s*3\b|3ث|ثالث\s*ثانوي|ثالثه\s*ثانوي|الثالث\s*الثانوي|\bbac\b|بكالوريا/.test(s)) return "GRADE_12";

    return null;
  },

  getGradeDisplayName(gradeKey) {
    const map = {
      GRADE_1: "الصف الأول الابتدائي (Grade 1)",
      GRADE_2: "الصف الثاني الابتدائي (Grade 2)",
      GRADE_3: "الصف الثالث الابتدائي (Grade 3)",
      GRADE_4: "الصف الرابع الابتدائي (Grade 4)",
      GRADE_5: "الصف الخامس الابتدائي (Grade 5)",
      GRADE_6: "الصف السادس الابتدائي (Grade 6)",
      GRADE_7: "الصف الأول الإعدادي (Grade 7 / Prep 1)",
      GRADE_8: "الصف الثاني الإعدادي (Grade 8 / Prep 2)",
      GRADE_9: "الصف الثالث الإعدادي (Grade 9 / Prep 3)",
      GRADE_10: "الصف الأول الثانوي (Sec 1 / Entlq 1)",
      GRADE_11: "الصف الثاني الثانوي (Sec 2 / Entlq 2)",
      GRADE_12: "الصف الثالث الثانوي (Sec 3 / Entlq 3 / BAC)",
    };
    return map[gradeKey] || "المرحلة والصف الدراسي";
  },

  // ── Render Approve Class Subscription Modal ──────────────────────────────
  renderApproveClassSubModal(enrollmentId) {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const enrollment = (this.enrollments || []).find(e => e.id === enrollmentId);
    if (!enrollment || !enrollment.classPackage) {
      showToast("اشتراك الفصل غير موجود.", "error");
      return;
    }

    const pkg = enrollment.classPackage;
    const defaultAmount = enrollment.paidAmount || enrollment.payment?.amount || (pkg.priceEg ? parseFloat(pkg.priceEg) || 0 : (pkg.price ? parseFloat(pkg.price) || 0 : 0));
    const totalPrice = (pkg.priceEg ? parseFloat(pkg.priceEg) || 0 : (pkg.price ? parseFloat(pkg.price) || 0 : defaultAmount)) || defaultAmount;
    const defaultRemaining = enrollment.remainingAmount !== undefined ? enrollment.remainingAmount : Math.max(0, totalPrice - defaultAmount);
    const existingReceipt = enrollment.payment?.receiptUrl;

    const modalPhone = enrollment.student?.phone || '';
    const modalCleanWa = modalPhone ? getCleanWhatsAppNumber(modalPhone) : '';

    container.innerHTML = `
      <div class="modal-overlay" id="approve-class-sub-modal" style="display:flex; backdrop-filter:blur(8px); background:rgba(0,0,0,0.65); z-index:9999;">
        <div class="modal-content" style="max-width:560px; width:92%; border-radius:24px; padding:0; overflow:hidden; border:1px solid var(--border-color); background:var(--bg-card); max-height:92vh; display:flex; flex-direction:column;">
          
          <div class="modal-header" style="padding:20px 24px; background:linear-gradient(135deg, rgba(16,185,129,0.12), rgba(37,99,235,0.08)); border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:40px; height:40px; border-radius:12px; background:rgba(16,185,129,0.15); color:#10b981; display:flex; align-items:center; justify-content:center;">
                <i data-lucide="check-circle-2" style="width:22px; height:22px;"></i>
              </div>
              <div>
                <h3 style="font-size:1.15rem; font-weight:800; margin:0; color:var(--text-main);">قبول واعتماد اشتراك الفصل 🎒</h3>
                <p style="font-size:0.78rem; color:var(--text-muted); margin:0;">تأكيد حالة الدفع، إرفاق الإيصال، وتسكين الطالب في كافة مجموعات الفصل</p>
              </div>
            </div>
            <span class="modal-close-btn" id="close-approve-class-sub-modal" style="font-size:1.4rem; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
          </div>

          <form id="approve-class-sub-form" style="display:flex; flex-direction:column; overflow-y:auto;">
            <div class="modal-body" style="padding:22px 24px; display:flex; flex-direction:column; gap:16px;">
              
              <!-- Info Box -->
              <div style="background:var(--bg-app); padding:16px 18px; border-radius:16px; border:1px solid var(--border-color); display:flex; flex-direction:column; gap:8px; font-size:0.86rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                  <span style="color:var(--text-muted);">👨‍🎓 الطالب:</span>
                  <div style="text-align:left;">
                    <span style="font-weight:800; color:var(--text-main);">${enrollment.student?.name || 'طالب'}</span>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${enrollment.student?.email || ''}</div>
                  </div>
                </div>

                ${modalPhone ? `
                  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; padding:6px 10px; background:rgba(16,185,129,0.06); border-radius:10px; border:1px dashed rgba(16,185,129,0.25);">
                    <span style="color:#059669; font-weight:700;">📞 هاتف الطالب:</span>
                    <div style="display:inline-flex; align-items:center; gap:6px;">
                      <strong style="color:var(--text-main); font-size:0.88rem;">${modalPhone}</strong>
                      <a href="https://wa.me/${modalCleanWa}?text=${encodeURIComponent(`مرحباً ${enrollment.student?.name || ''}، نتواصل معك بخصوص تأكيد اشتراكك في باقة ${pkg.name}.`)}" target="_blank" class="btn-secondary" style="padding:2px 8px; font-size:0.72rem; font-weight:800; border-radius:8px; color:#10b981; border-color:#10b981; text-decoration:none;">
                        💬 واتساب
                      </a>
                    </div>
                  </div>
                ` : ''}

                <div style="display:flex; justify-content:space-between;">
                  <span style="color:var(--text-muted);">🎒 باقة الفصل:</span>
                  <span style="font-weight:800; color:#059669;">${pkg.name} (${pkg.grade?.name || ''})</span>
                </div>
                <div style="display:flex; justify-content:space-between;">
                  <span style="color:var(--text-muted);">👥 المجموعات المربوطة:</span>
                  <span style="font-weight:700; color:var(--text-main);">${(pkg.linkedGroups || []).length} مجموعات سيتم تسكين الطالب بها فوراً</span>
                </div>
                <div style="display:flex; justify-content:space-between;">
                  <span style="color:var(--text-muted);">🏷️ السعر الإجمالي للباقة:</span>
                  <span style="font-weight:900; color:#10b981;">${totalPrice} EGP</span>
                </div>
              </div>

              <!-- Payment Status Option (PAID, PARTIAL, UNPAID) -->
              <div>
                <label style="font-weight:800; font-size:0.86rem; margin-bottom:8px; display:block; color:var(--text-main);">
                  💳 تحديد حالة الدفع والتحصيل <span style="color:var(--error);">*</span>:
                </label>
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
                  <label style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10px; border-radius:12px; border:1.5px solid var(--border-color); cursor:pointer; background:var(--bg-app); text-align:center;" class="class-pay-status-label">
                    <input type="radio" name="approvePaymentStatus" value="PAID" ${enrollment.paymentStatus === 'PAID' || !enrollment.paymentStatus ? 'checked' : ''} style="margin-bottom:4px; accent-color:#10b981;">
                    <span style="font-weight:800; font-size:0.82rem; color:#10b981;">مدفوع بالكامل ✅</span>
                  </label>
                  <label style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10px; border-radius:12px; border:1.5px solid var(--border-color); cursor:pointer; background:var(--bg-app); text-align:center;" class="class-pay-status-label">
                    <input type="radio" name="approvePaymentStatus" value="PARTIAL" ${enrollment.paymentStatus === 'PARTIAL' ? 'checked' : ''} style="margin-bottom:4px; accent-color:#f59e0b;">
                    <span style="font-weight:800; font-size:0.82rem; color:#d97706;">نظام تقسيط ⏳</span>
                  </label>
                  <label style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10px; border-radius:12px; border:1.5px solid var(--border-color); cursor:pointer; background:var(--bg-app); text-align:center;" class="class-pay-status-label">
                    <input type="radio" name="approvePaymentStatus" value="UNPAID" ${enrollment.paymentStatus === 'UNPAID' ? 'checked' : ''} style="margin-bottom:4px; accent-color:#ef4444;">
                    <span style="font-weight:800; font-size:0.82rem; color:#ef4444;">لم يدفع بعد 🏦</span>
                  </label>
                </div>
              </div>

              <!-- Amounts Row (Paid & Remaining) -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="form-group" style="margin:0;">
                  <label for="approve-class-paid-amount" style="font-weight:700; font-size:0.82rem; margin-bottom:4px; display:block;">المبلغ المدفوع (ج.م) <span style="color:var(--error);">*</span></label>
                  <input type="number" id="approve-class-paid-amount" class="form-input" value="${defaultAmount}" min="0" step="1" required style="border-radius:12px; padding:10px 14px; font-size:0.88rem;">
                </div>
                <div class="form-group" style="margin:0;">
                  <label for="approve-class-remaining-amount" style="font-weight:700; font-size:0.82rem; margin-bottom:4px; display:block;">المبلغ المتبقي (ج.م)</label>
                  <input type="number" id="approve-class-remaining-amount" class="form-input" value="${defaultRemaining}" min="0" step="1" style="border-radius:12px; padding:10px 14px; font-size:0.88rem;">
                </div>
              </div>

              <!-- Due Date for Next Installment (Visible when PARTIAL) -->
              <div id="approve-class-due-date-container" style="display:${enrollment.paymentStatus === 'PARTIAL' ? 'block' : 'none'};">
                <label for="approve-class-due-date" style="font-weight:700; font-size:0.82rem; margin-bottom:4px; display:block;">📅 موعد استحقاق القسط القادم:</label>
                <input type="date" id="approve-class-due-date" class="form-input" value="${enrollment.dueDate || ''}" style="border-radius:12px; padding:10px 14px; font-size:0.88rem;">
              </div>

              <!-- Receipt Upload & Preview -->
              <div class="form-group" style="margin:0; background:rgba(16,185,129,0.03); border:1.5px dashed var(--border-color); border-radius:14px; padding:14px;">
                <label style="font-weight:800; font-size:0.85rem; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                  <span>🧾 صورة إيصال التحويل المالي (اختياري / مرفق):</span>
                  ${existingReceipt ? `<a href="${existingReceipt}" target="_blank" style="font-size:0.75rem; color:#059669; text-decoration:none; font-weight:800;">عرض الإيصال المرفق ↗</a>` : ''}
                </label>
                <input type="file" id="approve-class-receipt-file" accept="image/*" class="form-input" style="border-radius:12px; padding:8px 12px; font-size:0.82rem; width:100%;">
                
                <div id="approve-class-receipt-preview-container" style="${existingReceipt ? 'display:block;' : 'display:none;'} margin-top:10px; text-align:center;">
                  <img id="approve-class-receipt-preview" src="${existingReceipt || ''}" style="max-height:130px; border-radius:10px; border:2px solid var(--border-color); object-fit:contain;">
                  <div style="font-size:0.74rem; color:var(--text-muted); margin-top:4px;">معاينة الإيصال المالي</div>
                </div>
              </div>

              <!-- Provider & Transaction ID -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="form-group" style="margin:0;">
                  <label for="approve-class-provider" style="font-weight:700; font-size:0.82rem; margin-bottom:4px; display:block;">طريقة التحويل</label>
                  <select id="approve-class-provider" class="form-select" style="border-radius:12px; padding:10px 12px; font-size:0.86rem;">
                    <option value="vodafone_cash" ${enrollment.payment?.provider === 'vodafone_cash' ? 'selected' : ''}>Vodafone Cash (فودافون كاش)</option>
                    <option value="instapay" ${enrollment.payment?.provider === 'instapay' ? 'selected' : ''}>InstaPay (إنستاباي)</option>
                    <option value="bank_transfer" ${enrollment.payment?.provider === 'bank_transfer' ? 'selected' : ''}>تحويل بنكي</option>
                    <option value="orange_cash" ${enrollment.payment?.provider === 'orange_cash' ? 'selected' : ''}>أورنج كاش</option>
                    <option value="etisalat_cash" ${enrollment.payment?.provider === 'etisalat_cash' ? 'selected' : ''}>اتصالات كاش</option>
                    <option value="cash" ${enrollment.payment?.provider === 'cash' ? 'selected' : ''}>نقداً بالإدارة</option>
                    <option value="other" ${enrollment.payment?.provider === 'other' ? 'selected' : ''}>أخرى</option>
                  </select>
                </div>
                <div class="form-group" style="margin:0;">
                  <label for="approve-class-txid" style="font-weight:700; font-size:0.82rem; margin-bottom:4px; display:block;">رقم هاتف المحول / العملية</label>
                  <input type="text" id="approve-class-txid" class="form-input" value="${enrollment.payment?.providerTransactionId || enrollment.student?.phone || ''}" placeholder="010xxxxxxxx" style="border-radius:12px; padding:10px 14px; font-size:0.86rem;">
                </div>
              </div>

              <div class="form-group" style="margin:0;">
                <label for="approve-class-notes" style="font-weight:700; font-size:0.82rem; margin-bottom:4px; display:block;">ملاحظات وسند القيد</label>
                <input type="text" id="approve-class-notes" class="form-input" value="${enrollment.payment?.notes || ''}" placeholder="ملاحظات توثيق الاعتماد..." style="border-radius:12px; padding:10px 14px; font-size:0.86rem;">
              </div>

            </div>

            <div class="modal-footer" style="padding:16px 24px; background:var(--bg-app); border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; gap:10px;">
              <button type="button" class="btn-secondary" id="cancel-approve-class-sub-modal" style="padding:8px 18px; border-radius:24px; font-size:0.85rem;">إلغاء</button>
              <button type="submit" id="submit-approve-class-sub-btn" class="btn-primary" style="padding:8px 22px; border-radius:24px; font-size:0.85rem; font-weight:800; background:#10b981; border-color:#10b981; gap:6px; display:inline-flex; align-items:center;">
                <i data-lucide="check" style="width:16px; height:16px;"></i> تأكيد وقبول الاشتراك وتسكين الطالب ✅
              </button>
            </div>
          </form>

        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const modal = document.getElementById("approve-class-sub-modal");
    const closeModal = () => modal?.remove();

    document.getElementById("close-approve-class-sub-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-approve-class-sub-modal")?.addEventListener("click", closeModal);

    const paidInput = document.getElementById("approve-class-paid-amount");
    const remainingInput = document.getElementById("approve-class-remaining-amount");
    const dueDateContainer = document.getElementById("approve-class-due-date-container");
    const fileInput = document.getElementById("approve-class-receipt-file");
    const previewContainer = document.getElementById("approve-class-receipt-preview-container");
    const previewImg = document.getElementById("approve-class-receipt-preview");

    document.querySelectorAll('input[name="approvePaymentStatus"]').forEach(radio => {
      radio.addEventListener("change", () => {
        const val = radio.value;
        if (val === "PAID") {
          paidInput.value = totalPrice;
          remainingInput.value = 0;
          dueDateContainer.style.display = "none";
        } else if (val === "PARTIAL") {
          const half = Math.round(totalPrice / 2);
          paidInput.value = half;
          remainingInput.value = Math.max(0, totalPrice - half);
          dueDateContainer.style.display = "block";
        } else { // UNPAID
          paidInput.value = 0;
          remainingInput.value = totalPrice;
          dueDateContainer.style.display = "none";
        }
      });
    });

    paidInput?.addEventListener("input", () => {
      const p = Number(paidInput.value) || 0;
      remainingInput.value = Math.max(0, totalPrice - p);
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
      }
    });

    document.getElementById("approve-class-sub-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById("submit-approve-class-sub-btn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "جاري الاعتماد والتسكين...";
      }

      try {
        let receiptUrl = existingReceipt || "";
        if (fileInput?.files?.[0]) {
          const formData = new FormData();
          formData.append("file", fileInput.files[0]);
          const token = state.token || localStorage.getItem("token");
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });
          if (uploadRes.ok) {
            const data = await uploadRes.json();
            receiptUrl = data.url;
          }
        }

        const selectedStatus = document.querySelector('input[name="approvePaymentStatus"]:checked')?.value || "PAID";
        const paidAmount = Number(paidInput.value) || 0;
        const remainingAmount = Number(remainingInput.value) || 0;
        const dueDate = document.getElementById("approve-class-due-date")?.value || null;
        const provider = document.getElementById("approve-class-provider")?.value;
        const providerTransactionId = document.getElementById("approve-class-txid")?.value.trim() || "";
        const notes = document.getElementById("approve-class-notes")?.value.trim() || "";

        const res = await apiFetch(`/admin/curriculum/class-subscriptions/${enrollmentId}/approve`, {
          method: "POST",
          body: JSON.stringify({
            paymentStatus: selectedStatus,
            paidAmount,
            remainingAmount,
            dueDate,
            receiptUrl,
            provider,
            providerTransactionId,
            notes
          })
        });

        closeModal();
        showToast(res.message || "تم اعتماد اشتراك الفصل بنجاح وتسكين الطالب!", "success");
        await this.loadAllData();
        this.renderTab("subscriptions");
      } catch (err) {
        showToast(err.message || "فشل اعتماد اشتراك الفصل.", "error");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<i data-lucide="check" style="width:16px; height:16px;"></i> تأكيد وقبول الاشتراك وتسكين الطالب ✅`;
          if (window.lucide) window.lucide.createIcons();
        }
      }
    });
  },

  // ── Render Edit Class Payment & Installment Modal ──────────────────────────────
  renderEditClassPaymentModal(enrollmentId) {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const enrollment = (this.enrollments || []).find(e => e.id === enrollmentId);
    if (!enrollment || !enrollment.classPackage) {
      showToast("اشتراك الفصل غير موجود.", "error");
      return;
    }

    const pkg = enrollment.classPackage;
    const paidAmount = enrollment.paidAmount !== undefined ? enrollment.paidAmount : (enrollment.payment?.amount || 0);
    const remainingAmount = enrollment.remainingAmount !== undefined ? enrollment.remainingAmount : 0;
    const currentStatus = enrollment.paymentStatus || (enrollment.status === 'active' ? 'PAID' : 'UNPAID');
    const existingReceipt = enrollment.payment?.receiptUrl || "";
    const history = enrollment.installmentHistory || [];

    container.innerHTML = `
      <div class="modal-overlay" id="edit-class-payment-modal" style="display:flex; backdrop-filter:blur(8px); background:rgba(0,0,0,0.65); z-index:9999;">
        <div class="modal-content" style="max-width:580px; width:92%; border-radius:24px; padding:0; overflow:hidden; border:1px solid var(--border-color); background:var(--bg-card); max-height:92vh; display:flex; flex-direction:column;">
          
          <div class="modal-header" style="padding:20px 24px; background:linear-gradient(135deg, rgba(5,150,105,0.12), rgba(99,102,241,0.08)); border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:40px; height:40px; border-radius:12px; background:rgba(5,150,105,0.15); color:#059669; display:flex; align-items:center; justify-content:center;">
                <i data-lucide="credit-card" style="width:22px; height:22px;"></i>
              </div>
              <div>
                <h3 style="font-size:1.15rem; font-weight:800; margin:0; color:var(--text-main);">تعديل الدفع والأقساط 💳</h3>
                <p style="font-size:0.78rem; color:var(--text-muted); margin:0;">${enrollment.student?.name || 'الطالب'} • باقة ${pkg.name}</p>
              </div>
            </div>
            <span class="modal-close-btn" id="close-edit-class-payment-modal" style="font-size:1.4rem; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
          </div>

          <form id="edit-class-payment-form" style="display:flex; flex-direction:column; overflow-y:auto;">
            <div class="modal-body" style="padding:22px 24px; display:flex; flex-direction:column; gap:16px;">
              
              <!-- Payment Status Radio -->
              <div>
                <label style="font-weight:800; font-size:0.86rem; margin-bottom:8px; display:block; color:var(--text-main);">
                  حالة الدفع:
                </label>
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
                  <label style="display:flex; flex-direction:column; align-items:center; padding:10px; border-radius:12px; border:1.5px solid var(--border-color); cursor:pointer; background:var(--bg-app); text-align:center;">
                    <input type="radio" name="editPaymentStatus" value="PAID" ${currentStatus === 'PAID' ? 'checked' : ''} style="margin-bottom:4px; accent-color:#10b981;">
                    <span style="font-weight:800; font-size:0.82rem; color:#10b981;">مدفوع بالكامل ✅</span>
                  </label>
                  <label style="display:flex; flex-direction:column; align-items:center; padding:10px; border-radius:12px; border:1.5px solid var(--border-color); cursor:pointer; background:var(--bg-app); text-align:center;">
                    <input type="radio" name="editPaymentStatus" value="PARTIAL" ${currentStatus === 'PARTIAL' ? 'checked' : ''} style="margin-bottom:4px; accent-color:#f59e0b;">
                    <span style="font-weight:800; font-size:0.82rem; color:#d97706;">نظام تقسيط ⏳</span>
                  </label>
                  <label style="display:flex; flex-direction:column; align-items:center; padding:10px; border-radius:12px; border:1.5px solid var(--border-color); cursor:pointer; background:var(--bg-app); text-align:center;">
                    <input type="radio" name="editPaymentStatus" value="UNPAID" ${currentStatus === 'UNPAID' ? 'checked' : ''} style="margin-bottom:4px; accent-color:#ef4444;">
                    <span style="font-weight:800; font-size:0.82rem; color:#ef4444;">لم يدفع بعد 🏦</span>
                  </label>
                </div>
              </div>

              <!-- Amounts -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="form-group" style="margin:0;">
                  <label for="edit-class-paid-amount" style="font-weight:700; font-size:0.82rem; margin-bottom:4px; display:block;">المبلغ المدفوع الكلي (ج.م)</label>
                  <input type="number" id="edit-class-paid-amount" class="form-input" value="${paidAmount}" min="0" step="1" required style="border-radius:12px; padding:10px 14px; font-size:0.88rem;">
                </div>
                <div class="form-group" style="margin:0;">
                  <label for="edit-class-remaining-amount" style="font-weight:700; font-size:0.82rem; margin-bottom:4px; display:block;">المبلغ المتبقي (ج.م)</label>
                  <input type="number" id="edit-class-remaining-amount" class="form-input" value="${remainingAmount}" min="0" step="1" style="border-radius:12px; padding:10px 14px; font-size:0.88rem;">
                </div>
              </div>

              <!-- Next Installment Due Date -->
              <div class="form-group" style="margin:0;">
                <label for="edit-class-due-date" style="font-weight:700; font-size:0.82rem; margin-bottom:4px; display:block;">📅 موعد استحقاق القسط القادم:</label>
                <input type="date" id="edit-class-due-date" class="form-input" value="${enrollment.dueDate || ''}" style="border-radius:12px; padding:10px 14px; font-size:0.88rem;">
              </div>

              <!-- Receipt Upload / Update -->
              <div class="form-group" style="margin:0; background:rgba(5,150,105,0.03); border:1.5px dashed var(--border-color); border-radius:14px; padding:14px;">
                <label style="font-weight:800; font-size:0.85rem; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                  <span>🧾 تحديث صورة إيصال الدفع:</span>
                  ${existingReceipt ? `<a href="${existingReceipt}" target="_blank" style="font-size:0.75rem; color:#059669; text-decoration:none; font-weight:800;">عرض الإيصال الحالي ↗</a>` : ''}
                </label>
                <input type="file" id="edit-class-receipt-file" accept="image/*" class="form-input" style="border-radius:12px; padding:8px 12px; font-size:0.82rem; width:100%;">
                <div id="edit-class-receipt-preview-container" style="${existingReceipt ? 'display:block;' : 'display:none;'} margin-top:10px; text-align:center;">
                  <img id="edit-class-receipt-preview" src="${existingReceipt || ''}" style="max-height:120px; border-radius:10px; border:2px solid var(--border-color); object-fit:contain;">
                </div>
              </div>

              <!-- Add New Installment Box -->
              <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:16px; padding:16px;">
                <div style="font-weight:800; font-size:0.9rem; color:var(--text-main); margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="plus-circle" style="width:16px; height:16px; color:#059669;"></i>
                  <span>تسجيل سداد قسط جديد ➕ (اختياري)</span>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                  <div class="form-group" style="margin:0;">
                    <label for="new-installment-amount" style="font-size:0.78rem; font-weight:700; margin-bottom:3px; display:block;">مبلغ القسط المسدد (ج.م):</label>
                    <input type="number" id="new-installment-amount" class="form-input" placeholder="0" min="0" step="1" style="border-radius:10px; padding:8px 12px; font-size:0.84rem;">
                  </div>
                  <div class="form-group" style="margin:0;">
                    <label for="new-installment-date" style="font-size:0.78rem; font-weight:700; margin-bottom:3px; display:block;">تاريخ السداد:</label>
                    <input type="date" id="new-installment-date" class="form-input" value="${new Date().toISOString().split('T')[0]}" style="border-radius:10px; padding:8px 12px; font-size:0.84rem;">
                  </div>
                </div>
                <div class="form-group" style="margin-top:8px; margin-bottom:0;">
                  <label for="new-installment-notes" style="font-size:0.78rem; font-weight:700; margin-bottom:3px; display:block;">ملاحظات القسط:</label>
                  <input type="text" id="new-installment-notes" class="form-input" placeholder="مثال: القسط الثاني - تحويل إنستاباي" style="border-radius:10px; padding:8px 12px; font-size:0.84rem;">
                </div>
              </div>

              <!-- Installment History List -->
              ${history.length > 0 ? `
                <div>
                  <div style="font-weight:800; font-size:0.85rem; color:var(--text-main); margin-bottom:6px;">سجل الدفعات والأقساط السابقة:</div>
                  <div style="display:flex; flex-direction:column; gap:6px;">
                    ${history.map((inst, idx) => `
                      <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:10px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; font-size:0.8rem;">
                        <div>
                          <strong style="color:#059669;">قسط #${idx + 1}: ${inst.amount} ج.م</strong>
                          <span style="color:var(--text-muted); margin-inline-start:6px;">(${inst.notes || 'سداد'})</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                          <span style="color:var(--text-muted); font-size:0.74rem;">${inst.paidAt ? new Date(inst.paidAt).toLocaleDateString('ar-EG') : ''}</span>
                          ${inst.receiptUrl ? `<a href="${inst.receiptUrl}" target="_blank" style="color:#059669; font-weight:700; text-decoration:none;">إيصال ↗</a>` : ''}
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

            </div>

            <div class="modal-footer" style="padding:16px 24px; background:var(--bg-app); border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; gap:10px;">
              <button type="button" class="btn-secondary" id="cancel-edit-class-payment-modal" style="padding:8px 18px; border-radius:24px; font-size:0.85rem;">إلغاء</button>
              <button type="submit" id="submit-edit-class-payment-btn" class="btn-primary" style="padding:8px 22px; border-radius:24px; font-size:0.85rem; font-weight:800; background:#059669; border-color:#059669; gap:6px; display:inline-flex; align-items:center;">
                <i data-lucide="save" style="width:16px; height:16px;"></i> حفظ التعديلات 💾
              </button>
            </div>
          </form>

        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const modal = document.getElementById("edit-class-payment-modal");
    const closeModal = () => modal?.remove();

    document.getElementById("close-edit-class-payment-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-edit-class-payment-modal")?.addEventListener("click", closeModal);

    const fileInput = document.getElementById("edit-class-receipt-file");
    const previewContainer = document.getElementById("edit-class-receipt-preview-container");
    const previewImg = document.getElementById("edit-class-receipt-preview");

    fileInput?.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          previewImg.src = e.target.result;
          previewContainer.style.display = "block";
        };
        reader.readAsDataURL(file);
      }
    });

    document.getElementById("edit-class-payment-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById("submit-edit-class-payment-btn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "جاري الحفظ...";
      }

      try {
        let receiptUrl = existingReceipt;
        if (fileInput?.files?.[0]) {
          const formData = new FormData();
          formData.append("file", fileInput.files[0]);
          const token = state.token || localStorage.getItem("token");
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });
          if (uploadRes.ok) {
            const data = await uploadRes.json();
            receiptUrl = data.url;
          }
        }

        const selectedStatus = document.querySelector('input[name="editPaymentStatus"]:checked')?.value || "PAID";
        const paidAmountVal = Number(document.getElementById("edit-class-paid-amount")?.value) || 0;
        const remainingAmountVal = Number(document.getElementById("edit-class-remaining-amount")?.value) || 0;
        const dueDate = document.getElementById("edit-class-due-date")?.value || null;

        const newInstAmount = Number(document.getElementById("new-installment-amount")?.value) || 0;
        let newInstallment = null;
        if (newInstAmount > 0) {
          newInstallment = {
            amount: newInstAmount,
            paidAt: document.getElementById("new-installment-date")?.value || new Date().toISOString(),
            notes: document.getElementById("new-installment-notes")?.value.trim() || "سداد قسط",
            receiptUrl: receiptUrl || ""
          };
        }

        const res = await apiFetch(`/admin/curriculum/class-subscriptions/${enrollmentId}/payment`, {
          method: "PATCH",
          body: JSON.stringify({
            paymentStatus: selectedStatus,
            paidAmount: paidAmountVal,
            remainingAmount: remainingAmountVal,
            dueDate,
            receiptUrl,
            newInstallment
          })
        });

        closeModal();
        showToast(res.message || "تم تحديث بيانات الدفع والتقسيط بنجاح!", "success");
        await this.loadAllData();
        this.renderTab("subscriptions");
      } catch (err) {
        showToast(err.message || "فشل تحديث بيانات الدفع.", "error");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<i data-lucide="save" style="width:16px; height:16px;"></i> حفظ التعديلات 💾`;
          if (window.lucide) window.lucide.createIcons();
        }
      }
    });
  },

  // ── Render Manual Class Subscription Creation Modal ──────────────────────────────
  async renderManualClassSubscriptionModal() {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const students = (this.allMembers || []).filter(u => u.role === "student");
    if (students.length === 0) {
      showToast("لا يوجد طلاب مسجلون في المنصة حالياً لإضافتهم.", "warning");
      return;
    }

    let classes = this.allClasses || [];
    if (!classes || classes.length === 0) {
      try {
        classes = await apiFetch("/admin/curriculum/classes").catch(() => []);
        this.allClasses = classes;
      } catch (_) {}
    }

    if (!classes || classes.length === 0) {
      showToast("الرجاء إنشاء باقة فصل دراسي واحدة على الأقل أولاً من تبويب إدارة الفصول.", "warning");
      return;
    }

    const defaultClass = classes[0];
    const defaultPrice = defaultClass.priceEg ? parseFloat(defaultClass.priceEg) || 800 : (defaultClass.price ? parseFloat(defaultClass.price) || 800 : 800);

    container.innerHTML = `
      <div class="modal-overlay" id="manual-class-sub-modal" style="display:flex; backdrop-filter:blur(8px); background:rgba(0,0,0,0.65); z-index:9999;">
        <div class="modal-content" style="max-width:580px; width:92%; border-radius:24px; padding:0; overflow:hidden; border:1px solid var(--border-color); background:var(--bg-card); max-height:92vh; display:flex; flex-direction:column;">
          
          <div class="modal-header" style="padding:20px 24px; background:linear-gradient(135deg, rgba(5,150,105,0.12), rgba(37,99,235,0.08)); border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:40px; height:40px; border-radius:12px; background:rgba(5,150,105,0.15); color:#059669; display:flex; align-items:center; justify-content:center;">
                <i data-lucide="graduation-cap" style="width:22px; height:22px;"></i>
              </div>
              <div>
                <h3 style="font-size:1.15rem; font-weight:800; margin:0; color:var(--text-main);">➕ إضافة اشتراك فصل دراسي لطالب 🎒</h3>
                <p style="font-size:0.78rem; color:var(--text-muted); margin:0;">تسجيل الطالب في باقة شاملة وتسكينه في مجموعات المواد تلقائياً</p>
              </div>
            </div>
            <span class="modal-close-btn" id="close-manual-class-sub-modal" style="font-size:1.4rem; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
          </div>

          <form id="manual-class-sub-form" style="display:flex; flex-direction:column; overflow-y:auto;">
            <div class="modal-body" style="padding:22px 24px; display:flex; flex-direction:column; gap:16px;">
              
              <!-- 1. Select Student -->
              <div class="form-group" style="margin:0;">
                <label for="manual-class-student-select" style="font-size:0.86rem; font-weight:700; display:block; margin-bottom:6px;">
                  1️⃣ اختر الطالب <span style="color:#ef4444;">*</span>:
                </label>
                <select id="manual-class-student-select" class="form-select" required style="width:100%; padding:10px; font-size:0.88rem; border-radius:12px;">
                  <option value="" disabled selected>-- اختر طالباً من القائمة --</option>
                  ${students.map(st => `
                    <option value="${st.id}">
                      ${st.name} (${st.email}${st.phone ? ' - ' + st.phone : ''})
                    </option>
                  `).join('')}
                </select>
              </div>

              <!-- 2. Select Class Package -->
              <div class="form-group" style="margin:0;">
                <label for="manual-class-package-select" style="font-size:0.86rem; font-weight:700; display:block; margin-bottom:6px;">
                  2️⃣ باقة الفصل الدراسي <span style="color:#ef4444;">*</span>:
                </label>
                <select id="manual-class-package-select" class="form-select" required style="width:100%; padding:10px; font-size:0.88rem; border-radius:12px;">
                  ${classes.map((c, idx) => {
                    const cPrice = c.priceEg ? parseFloat(c.priceEg) || 800 : (c.price ? parseFloat(c.price) || 800 : 800);
                    return `
                      <option value="${c.id}" data-price="${cPrice}" ${idx === 0 ? 'selected' : ''}>
                        ${c.name} (${c.grade?.name || ''}) - ${cPrice} ج.م
                      </option>
                    `;
                  }).join('')}
                </select>
              </div>

              <!-- 3. Payment Status -->
              <div>
                <label style="font-weight:800; font-size:0.86rem; margin-bottom:8px; display:block; color:var(--text-main);">
                  3️⃣ حالة السداد والتحصيل:
                </label>
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
                  <label style="display:flex; flex-direction:column; align-items:center; padding:10px; border-radius:12px; border:1.5px solid var(--border-color); cursor:pointer; background:var(--bg-app); text-align:center;">
                    <input type="radio" name="manualClassPaymentPlan" value="PAID" checked style="margin-bottom:4px; accent-color:#10b981;">
                    <span style="font-weight:800; font-size:0.82rem; color:#10b981;">مدفوع بالكامل ✅</span>
                  </label>
                  <label style="display:flex; flex-direction:column; align-items:center; padding:10px; border-radius:12px; border:1.5px solid var(--border-color); cursor:pointer; background:var(--bg-app); text-align:center;">
                    <input type="radio" name="manualClassPaymentPlan" value="PARTIAL" style="margin-bottom:4px; accent-color:#f59e0b;">
                    <span style="font-weight:800; font-size:0.82rem; color:#d97706;">نظام تقسيط ⏳</span>
                  </label>
                  <label style="display:flex; flex-direction:column; align-items:center; padding:10px; border-radius:12px; border:1.5px solid var(--border-color); cursor:pointer; background:var(--bg-app); text-align:center;">
                    <input type="radio" name="manualClassPaymentPlan" value="UNPAID" style="margin-bottom:4px; accent-color:#ef4444;">
                    <span style="font-weight:800; font-size:0.82rem; color:#ef4444;">لم يدفع بعد 🏦</span>
                  </label>
                </div>
              </div>

              <!-- Amounts -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="form-group" style="margin:0;">
                  <label for="manual-class-paid-amount" style="font-weight:700; font-size:0.82rem; margin-bottom:4px; display:block;">المبلغ المدفوع (ج.م) <span style="color:var(--error);">*</span></label>
                  <input type="number" id="manual-class-paid-amount" class="form-input" value="${defaultPrice}" min="0" step="1" required style="border-radius:12px; padding:10px 14px; font-size:0.88rem;">
                </div>
                <div class="form-group" style="margin:0;">
                  <label for="manual-class-remaining-amount" style="font-weight:700; font-size:0.82rem; margin-bottom:4px; display:block;">المبلغ المتبقي (ج.م)</label>
                  <input type="number" id="manual-class-remaining-amount" class="form-input" value="0" min="0" step="1" style="border-radius:12px; padding:10px 14px; font-size:0.88rem;">
                </div>
              </div>

              <!-- Due Date -->
              <div id="manual-class-due-date-container" style="display:none;">
                <label for="manual-class-due-date" style="font-weight:700; font-size:0.82rem; margin-bottom:4px; display:block;">📅 موعد استحقاق القسط:</label>
                <input type="date" id="manual-class-due-date" class="form-input" style="border-radius:12px; padding:10px 14px; font-size:0.88rem;">
              </div>

              <!-- Receipt Upload -->
              <div class="form-group" style="margin:0; background:rgba(5,150,105,0.03); border:1.5px dashed var(--border-color); border-radius:14px; padding:14px;">
                <label style="font-weight:800; font-size:0.85rem; margin-bottom:6px; display:block;">
                  🧾 رفع إيصال الدفع (اختياري):
                </label>
                <input type="file" id="manual-class-receipt-file" accept="image/*" class="form-input" style="border-radius:12px; padding:8px 12px; font-size:0.82rem; width:100%;">
                <div id="manual-class-receipt-preview-container" style="display:none; margin-top:10px; text-align:center;">
                  <img id="manual-class-receipt-preview" src="" style="max-height:120px; border-radius:10px; border:2px solid var(--border-color); object-fit:contain;">
                </div>
              </div>

              <!-- Notes -->
              <div class="form-group" style="margin:0;">
                <label for="manual-class-notes" style="font-weight:700; font-size:0.82rem; margin-bottom:4px; display:block;">ملاحظات:</label>
                <input type="text" id="manual-class-notes" class="form-input" placeholder="ملاحظات توثيق القيد..." style="border-radius:12px; padding:10px 14px; font-size:0.86rem;">
              </div>

            </div>

            <div class="modal-footer" style="padding:16px 24px; background:var(--bg-app); border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; gap:10px;">
              <button type="button" class="btn-secondary" id="cancel-manual-class-sub-modal" style="padding:8px 18px; border-radius:24px; font-size:0.85rem;">إلغاء</button>
              <button type="submit" id="submit-manual-class-sub-btn" class="btn-primary" style="padding:8px 22px; border-radius:24px; font-size:0.85rem; font-weight:800; background:#059669; border-color:#059669; gap:6px; display:inline-flex; align-items:center;">
                <i data-lucide="check" style="width:16px; height:16px;"></i> تفعيل واشتراك الطالب فوراً 🚀
              </button>
            </div>
          </form>

        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const modal = document.getElementById("manual-class-sub-modal");
    const closeModal = () => modal?.remove();

    document.getElementById("close-manual-class-sub-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-manual-class-sub-modal")?.addEventListener("click", closeModal);

    const classSelect = document.getElementById("manual-class-package-select");
    const paidInput = document.getElementById("manual-class-paid-amount");
    const remainingInput = document.getElementById("manual-class-remaining-amount");
    const dueDateContainer = document.getElementById("manual-class-due-date-container");
    const fileInput = document.getElementById("manual-class-receipt-file");
    const previewContainer = document.getElementById("manual-class-receipt-preview-container");
    const previewImg = document.getElementById("manual-class-receipt-preview");

    const updatePrice = () => {
      const selectedOption = classSelect?.options[classSelect.selectedIndex];
      const p = selectedOption ? parseFloat(selectedOption.getAttribute("data-price") || "800") : 800;
      const plan = document.querySelector('input[name="manualClassPaymentPlan"]:checked')?.value || "PAID";
      if (plan === "PAID") {
        paidInput.value = p;
        remainingInput.value = 0;
        dueDateContainer.style.display = "none";
      } else if (plan === "PARTIAL") {
        const half = Math.round(p / 2);
        paidInput.value = half;
        remainingInput.value = Math.max(0, p - half);
        dueDateContainer.style.display = "block";
      } else {
        paidInput.value = 0;
        remainingInput.value = p;
        dueDateContainer.style.display = "none";
      }
    };

    classSelect?.addEventListener("change", updatePrice);
    document.querySelectorAll('input[name="manualClassPaymentPlan"]').forEach(radio => {
      radio.addEventListener("change", updatePrice);
    });

    paidInput?.addEventListener("input", () => {
      const selectedOption = classSelect?.options[classSelect.selectedIndex];
      const p = selectedOption ? parseFloat(selectedOption.getAttribute("data-price") || "800") : 800;
      const paid = Number(paidInput.value) || 0;
      remainingInput.value = Math.max(0, p - paid);
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
      }
    });

    document.getElementById("manual-class-sub-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById("submit-manual-class-sub-btn");
      const studentId = document.getElementById("manual-class-student-select")?.value;
      const classId = classSelect?.value;

      if (!studentId || !classId) {
        showToast("يرجى اختيار الطالب وباقة الفصل.", "error");
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "جاري تفعيل الاشتراك والتسكين...";
      }

      try {
        let receiptUrl = "";
        if (fileInput?.files?.[0]) {
          const formData = new FormData();
          formData.append("file", fileInput.files[0]);
          const token = state.token || localStorage.getItem("token");
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });
          if (uploadRes.ok) {
            const data = await uploadRes.json();
            receiptUrl = data.url;
          }
        }

        const plan = document.querySelector('input[name="manualClassPaymentPlan"]:checked')?.value || "PAID";
        const paidAmountVal = Number(paidInput.value) || 0;
        const remainingAmountVal = Number(remainingInput.value) || 0;
        const dueDate = document.getElementById("manual-class-due-date")?.value || null;
        const notes = document.getElementById("manual-class-notes")?.value.trim() || "";

        const res = await apiFetch(`/admin/curriculum/classes/${classId}/enroll-student`, {
          method: "POST",
          body: JSON.stringify({
            studentId,
            amount: paidAmountVal,
            paymentPlan: plan,
            remainingAmount: remainingAmountVal,
            dueDate,
            receiptUrl,
            notes
          })
        });

        closeModal();
        showToast(res.message || "تم تسجيل الطالب وتسكينه في مجموعات الفصل بنجاح!", "success");
        await this.loadAllData();
        this.renderTab("subscriptions");
      } catch (err) {
        showToast(err.message || "فشل تسجيل الطالب بالفصل.", "error");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<i data-lucide="check" style="width:16px; height:16px;"></i> تفعيل واشتراك الطالب فوراً 🚀`;
          if (window.lucide) window.lucide.createIcons();
        }
      }
    });
  }

};
