import { apiFetch, state, showToast, t, confirmDialog, renderPhoneInputGroup, getCleanWhatsAppNumber, renderEducationSelectHTML, handleWhatsAppResponse, formatSessionDateTime, getTimezoneBadgeHTML } from '../../app.js';

// ── AdminCoursesPage ─────────────────────────────────────────────────────────────
// Methods extracted from AdminView.js — assigned to AdminView.prototype

export const AdminCoursesPage = {

  renderCoursesTab() {
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <h3 style="font-weight:700;">${t("admin.tab.courses")} (${this.courses.length})</h3>
        <button class="btn-primary" id="open-admin-add-course-modal-btn" style="padding:10px 18px; font-weight:800; gap:8px;">
          <i data-lucide="plus-circle" style="width:16px;height:16px;"></i> إضافة دورة تعليمية جديدة ➕
        </button>
      </div>

      ${this.courses.length === 0
        ? `<div class="glass-card" style="text-align:center;padding:40px;color:var(--text-muted);">${t("admin.noCourses")}</div>`
        : `<div style="display:flex;flex-direction:column;gap:16px;">
            ${this.courses.map(course => {
          const coursePlansCount = (this.allPlans || []).filter(p => p.courseId === course.id || p.course?.id === course.id).length;
          const isPending = course.status === "PENDING_REVIEW";
          const isPublished = course.status === "PUBLISHED" || !course.status;

          return `
              <div class="glass-card" style="display:flex;align-items:center;gap:20px;padding:16px 20px; ${isPending ? 'border:1px solid rgba(245,158,11,0.4); background:rgba(245,158,11,0.03);' : ''}">
                <img src="${course.image || 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=80&auto=format'}"
                  style="width:72px;height:72px;border-radius:var(--radius-sm);object-fit:cover;flex-shrink:0;">
                <div style="flex:1;min-width:0;">
                  <div style="display:flex; gap:8px; align-items:center; margin-bottom:4px; flex-wrap:wrap;">
                    <span style="font-size:0.7rem;font-weight:700;color:var(--primary);text-transform:uppercase;">${course.category}</span>
                    ${course.isFree !== false && (!course.price || Number(course.price) === 0) ? `
                      <span class="badge" style="background:rgba(16,185,129,0.12); color:#10b981; font-size:0.72rem; font-weight:800;">🎁 دورة مجانية</span>
                    ` : `
                      <span class="badge" style="background:rgba(99,102,241,0.12); color:var(--primary); font-size:0.72rem; font-weight:800;">💳 ${course.price} ${course.currency || 'EGP'}</span>
                    `}
                    <span class="badge" style="background:rgba(139,92,246,0.12); color:#8b5cf6; font-size:0.7rem; font-weight:800;">${coursePlansCount} خطط اشتراك مخصصة</span>
                    ${isPending ? `
                      <span class="badge" style="background:rgba(245,158,11,0.15); color:#f59e0b; font-size:0.72rem; font-weight:800;">🟡 قيد المراجعة والاعتماد (PENDING_REVIEW) ⏳</span>
                    ` : isPublished ? `
                      <span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-size:0.72rem; font-weight:800;">منشورة ومتاحة ✅</span>
                    ` : `
                      <span class="badge" style="background:rgba(239,68,68,0.15); color:#ef4444; font-size:0.72rem; font-weight:800;">مرفوضة / مسودة ❌</span>
                    `}
                  </div>
                  <h4 style="font-weight:700;font-size:1rem;margin-bottom:6px;">${course.title}</h4>
                  <div style="display:flex;gap:20px;font-size:0.8rem;color:var(--text-muted);flex-wrap:wrap;">
                    <span><i data-lucide="user" style="width:12px;height:12px;"></i> ${course.teacher?.name || "منصة انطلق التعليمية 🏛️"}</span>
                    <span><i data-lucide="book" style="width:12px;height:12px;"></i> ${course.lessonsCount || 0} ${t("admin.lessons")}</span>
                    <span><i data-lucide="users" style="width:12px;height:12px;"></i> ${course.enrollmentsCount || 0} ${t("admin.enrolled")}</span>
                  </div>
                </div>
                <div style="display:flex; gap:8px; flex-shrink:0; flex-wrap:wrap;">
                  ${isPending ? `
                    <button class="btn-primary admin-approve-course-btn" data-id="${course.id}"
                      style="font-size:0.8rem; padding:8px 14px; gap:6px; background:#10b981; border-color:#10b981; font-weight:800;">
                      <i data-lucide="check-circle" style="width:14px;height:14px;"></i> قبول واعتماد النشر 🎉
                    </button>
                    <button class="btn-secondary admin-reject-course-btn" data-id="${course.id}"
                      style="font-size:0.8rem; padding:8px 14px; gap:6px; color:#ef4444; border-color:#ef4444; font-weight:700;">
                      <i data-lucide="x-circle" style="width:14px;height:14px;"></i> رفض ❌
                    </button>
                  ` : ''}
                  <a href="#manage-course/${course.id}" class="btn-primary"
                    style="font-size:0.8rem; padding:8px 14px; gap:6px; background:#8b5cf6; border-color:#8b5cf6; text-decoration:none; display:inline-flex; align-items:center; font-weight:800;">
                    <i data-lucide="book-open" style="width:14px;height:14px;"></i> إضافة وإدارة الدروس والوحدات 📚
                  </a>
                  <button class="btn-primary admin-view-course-details-btn" data-id="${course.id}"
                    style="font-size:0.8rem; padding:8px 14px; gap:6px;">
                    <i data-lucide="eye" style="width:14px;height:14px;"></i> تفاصيل الكورس والاشتراكات 🔍
                  </button>
                  <button class="btn-secondary delete-course-btn" data-id="${course.id}" data-title="${course.title}"
                    style="font-size:0.8rem; padding:8px 14px; border-color:var(--error, #ef4444); color:var(--error, #ef4444);">
                    <i data-lucide="trash-2" style="width:14px;height:14px;"></i> ${t("common.delete")}
                  </button>
                </div>
              </div>
            `;
        }).join("")}
          </div>`
      }
    `;
  },

  renderEnrollmentsTab() {
    const enrollments = this.enrollments || [];
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px;">
        <div>
          <h3 style="font-weight:800; font-size:1.3rem;">🎓 طلبات وتسجيلات المجموعات والكورسات (${enrollments.length})</h3>
          <p style="color:var(--text-muted); font-size:0.85rem; margin:0;">مراجعة واعتماد إيصالات الدفع والتحويل المالي لتسجيل الطلاب في المجموعات والكورسات</p>
        </div>
      </div>

      ${enrollments.length === 0 ? `
        <div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted);">لا توجد طلبات تسجيل أو تحويلات مالية حالياً.</div>
      ` : `
        <div class="glass-card" style="padding:0; overflow:hidden;">
          <table style="width:100%; border-collapse:collapse; text-align:start;">
            <thead>
              <tr style="background:var(--bg-app); border-bottom:1px solid var(--border-color); font-size:0.82rem; color:var(--text-muted);">
                <th style="padding:14px 16px;">الطالب</th>
                <th style="padding:14px 16px;">المقرر والمجموعة</th>
                <th style="padding:14px 16px;">المعلم</th>
                <th style="padding:14px 16px;">المبلغ وطريقة الدفع</th>
                <th style="padding:14px 16px;">إيصال التحويل</th>
                <th style="padding:14px 16px;">الحالة</th>
                <th style="padding:14px 16px;">تاريخ الطلب</th>
                <th style="padding:14px 16px;">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${enrollments.map(e => {
      const stMap = {
        'active': { label: 'معتمد ونشط ✅', bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
        'rejected': { label: 'مرفوض ❌', bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
        'pending': { label: 'في انتظار الاعتماد ⏳', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
        'PENDING': { label: 'في انتظار الاعتماد ⏳', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' }
      };
      const st = stMap[e.status] || { label: e.status, bg: 'rgba(99,102,241,0.15)', color: 'var(--primary)' };
      const receiptUrl = e.payment?.receiptUrl;
      const isFree = Boolean(e.course?.isFree || (!e.course?.price && !e.group?.sessionPrice && !e.group?.monthlyPrice));
      const paymentAmount = e.payment?.amount !== undefined ? e.payment.amount : (e.group?.monthlyPrice || e.course?.price || 0);
      const providerLabel = e.payment?.provider === 'vodafone_cash' ? '📱 فودافون كاش' :
                            e.payment?.provider === 'instapay' ? '⚡ إنستاباي' :
                            e.payment?.provider === 'bank_transfer' ? '🏦 تحويل بنكي' :
                            (e.payment?.provider || 'تحويل مالي');

      const rawStudentPhone = e.student?.phone || e.payment?.providerTransactionId || '';
      const cleanPhone = rawStudentPhone ? rawStudentPhone.replace(/[^\d+]/g, '') : '';
      const cleanPhoneWa = rawStudentPhone ? getCleanWhatsAppNumber(rawStudentPhone) : '';
      const courseOrGroupTitle = e.group ? `مجموعة ${e.group.name}` : `دورة ${e.course?.title || 'الدورة'}`;
      const defaultWaMsg = encodeURIComponent(`مرحباً ${e.student?.name || 'طالبنا العزيز'}، نتواصل معك من منصة انطلق بخصوص طلب اشتراكك في ${courseOrGroupTitle}.`);

      return `
                  <tr style="border-bottom:1px solid var(--border-color); font-size:0.88rem;">
                    <td style="padding:14px 16px;">
                      <div style="font-weight:800; color:var(--text-main); font-size:0.95rem;">${e.student?.name || 'طالب'}</div>
                      <div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:4px;">${e.student?.email || ''}</div>
                      ${rawStudentPhone ? `
                        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:4px;">
                          <a href="https://wa.me/${cleanPhoneWa}?text=${defaultWaMsg}" target="_blank" 
                             class="btn-secondary" 
                             style="padding:3px 10px; font-size:0.74rem; font-weight:800; border-radius:12px; color:#10b981; border-color:#10b981; background:rgba(16,185,129,0.08); text-decoration:none; display:inline-flex; align-items:center; gap:4px;" 
                             title="مراسلة الطالب عبر الواتساب">
                            💬 واتساب (${rawStudentPhone})
                          </a>
                          <a href="tel:${cleanPhone}" 
                             class="btn-secondary" 
                             style="padding:3px 9px; font-size:0.74rem; font-weight:800; border-radius:12px; color:var(--primary); border-color:var(--primary); background:rgba(99,102,241,0.08); text-decoration:none; display:inline-flex; align-items:center; gap:4px;" 
                             title="اتصال هاتفي مباشر">
                            <i data-lucide="phone-call" style="width:12px;height:12px;"></i> اتصال
                          </a>
                        </div>
                      ` : ''}
                    </td>

                    <td style="padding:14px 16px;">
                      <div style="font-weight:800; color:var(--text-main);">${e.course?.title || 'دورة'}</div>
                      ${e.group ? `
                        <div style="margin-top:3px;">
                          <span style="font-size:0.75rem; font-weight:800; background:rgba(79,70,229,0.1); color:var(--primary); padding:2px 8px; border-radius:8px;">
                            👥 ${e.group.name}
                          </span>
                        </div>
                      ` : ''}
                    </td>

                    <td style="padding:14px 16px; font-size:0.85rem; font-weight:700; color:var(--text-main);">
                      ${e.course?.teacher?.name || e.group?.teacher?.name || '—'}
                    </td>

                    <td style="padding:14px 16px;">
                      ${isFree ? `
                        <span style="font-size:0.78rem; font-weight:800; color:#10b981; background:rgba(16,185,129,0.12); padding:3px 10px; border-radius:10px;">🎁 مجاني</span>
                      ` : `
                        <div>
                          <strong style="font-size:0.95rem; font-weight:900; color:#10b981;">${paymentAmount} ج.م.</strong>
                          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${providerLabel}</div>
                        </div>
                      `}
                    </td>

                    <td style="padding:14px 16px;">
                      ${isFree ? `
                        <span style="font-size:0.75rem; color:#10b981; font-weight:700;">🎁 لا يتطلب إيصال</span>
                      ` : receiptUrl ? `
                        <a href="${receiptUrl}" target="_blank" class="btn-secondary" style="padding:5px 12px; font-size:0.78rem; text-decoration:none; display:inline-flex; align-items:center; gap:6px; color:var(--primary); border-color:var(--primary); border-radius:12px; font-weight:800;">
                          <i data-lucide="file-text" style="width:13px;height:13px;"></i> عرض الإيصال 📄
                        </a>
                      ` : (e.notes?.includes("واتساب") || e.notes?.includes("WhatsApp") || e.payment?.notes?.includes("واتساب")) ? `
                        <div style="display:flex; flex-direction:column; gap:4px; align-items:flex-start;">
                          <span style="font-size:0.75rem; font-weight:800; color:#10b981; background:rgba(16,185,129,0.12); padding:3px 8px; border-radius:8px; display:inline-flex; align-items:center; gap:4px;">
                            💬 عبر الواتساب
                          </span>
                          ${(e.student?.phone || e.payment?.providerTransactionId) ? `
                            <a href="https://wa.me/${getCleanWhatsAppNumber(e.payment?.providerTransactionId || e.student?.phone)}" target="_blank" class="btn-secondary" style="padding:3px 8px; font-size:0.72rem; color:#10b981; border-color:#10b981; text-decoration:none; border-radius:8px; font-weight:700;">
                              محادثة الطالب 💬
                            </a>
                          ` : ''}
                        </div>
                      ` : `
                        <span style="font-size:0.75rem; color:var(--text-muted);">لا يوجد إيصال مرفق</span>
                      `}
                    </td>

                    <td style="padding:14px 16px;">
                      <span style="font-size:0.78rem; font-weight:800; padding:4px 10px; border-radius:14px; background:${st.bg}; color:${st.color};">
                        ${st.label}
                      </span>
                    </td>

                    <td style="padding:14px 16px; font-size:0.8rem; color:var(--text-muted);">
                      ${new Date(e.createdAt).toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>

                    <td style="padding:14px 16px;">
                      <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        ${e.status !== 'active' ? `
                          <button class="btn-primary admin-approve-enrollment-btn" data-id="${e.id}" data-free="${isFree}" style="padding:6px 14px; font-size:0.8rem; background:#10b981; border-color:#10b981; font-weight:800; border-radius:14px;" title="قبول واعتماد إيصال الدفع">
                            <i data-lucide="check-circle" style="width:14px;height:14px;"></i> اعتماد وقبول ✅
                          </button>
                        ` : ''}
                        ${e.status !== 'rejected' ? `
                          <button class="btn-secondary admin-reject-enrollment-btn" data-id="${e.id}" style="padding:6px 12px; font-size:0.8rem; color:#ef4444; border-color:#ef4444; font-weight:700; border-radius:14px;">
                            <i data-lucide="x" style="width:14px;height:14px;"></i> رفض ❌
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `;
    }).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  },

  renderApproveEnrollmentModal(enrollmentId) {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const enrollment = (this.enrollments || []).find(e => e.id === enrollmentId);
    if (!enrollment) return;

    const defaultAmount = enrollment.payment?.amount || enrollment.course?.price || 0;
    const existingReceipt = enrollment.payment?.receiptUrl;

    container.innerHTML = `
      <div class="modal-overlay" id="approve-enrollment-modal" style="display:flex; backdrop-filter:blur(8px); background:rgba(0,0,0,0.6); z-index:9999;">
        <div class="modal-content" style="max-width:540px; width:92%; border-radius:24px; padding:0; overflow:hidden; border:1px solid var(--border-color); background:var(--bg-card);">
          
          <div class="modal-header" style="padding:20px 24px; background:linear-gradient(135deg, rgba(16,185,129,0.1), rgba(99,102,241,0.08)); border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:40px; height:40px; border-radius:12px; background:rgba(16,185,129,0.15); color:#10b981; display:flex; align-items:center; justify-content:center;">
                <i data-lucide="check-circle" style="width:22px; height:22px;"></i>
              </div>
              <div>
                <h3 style="font-size:1.15rem; font-weight:800; margin:0; color:var(--text-main);">قبول واعتماد تسجيل الدورة 🎓</h3>
                <p style="font-size:0.78rem; color:var(--text-muted); margin:0;">تأكيد استلام الرسوم وإرفاق إيصال التحويل المالي</p>
              </div>
            </div>
            <span class="modal-close-btn" id="close-approve-enrollment-modal" style="font-size:1.4rem; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
          </div>

          <form id="approve-enrollment-form">
            <div class="modal-body" style="padding:22px 24px; display:flex; flex-direction:column; gap:16px; max-height:75vh; overflow-y:auto;">
              
              <!-- Info Box -->
              ${(() => {
                const modalPhone = enrollment.student?.phone || enrollment.payment?.providerTransactionId || '';
                const modalCleanPhone = modalPhone ? modalPhone.replace(/[^\d+]/g, '') : '';
                const modalCleanWa = modalPhone ? getCleanWhatsAppNumber(modalPhone) : '';
                const targetTitle = enrollment.group ? `مجموعة ${enrollment.group.name}` : `دورة ${enrollment.course?.title || ''}`;
                const waText = encodeURIComponent(`مرحباً ${enrollment.student?.name || 'طالبنا العزيز'}، نتواصل معك بخصوص مراجعة وتأكيد اشتراكك في ${targetTitle}.`);

                return `
                  <div style="background:var(--bg-app); padding:16px 18px; border-radius:16px; border:1px solid var(--border-color); display:flex; flex-direction:column; gap:9px; font-size:0.86rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                      <span style="color:var(--text-muted);">👨‍🎓 الطالب:</span>
                      <div style="text-align:left;">
                        <span style="font-weight:800; color:var(--text-main);">${enrollment.student?.name || 'طالب'}</span>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${enrollment.student?.email || ''}</div>
                      </div>
                    </div>

                    ${modalPhone ? `
                      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; padding:6px 10px; background:rgba(16,185,129,0.06); border-radius:10px; border:1px dashed rgba(16,185,129,0.25);">
                        <span style="color:#059669; font-weight:700;">📞 هاتف الطالب / المحول:</span>
                        <div style="display:inline-flex; align-items:center; gap:6px;">
                          <strong style="color:var(--text-main); font-size:0.88rem;">${modalPhone}</strong>
                          <a href="https://wa.me/${modalCleanWa}?text=${waText}" target="_blank" class="btn-secondary" style="padding:2px 8px; font-size:0.72rem; font-weight:800; border-radius:8px; color:#10b981; border-color:#10b981; text-decoration:none; display:inline-flex; align-items:center; gap:3px;">
                            💬 واتساب
                          </a>
                          <a href="tel:${modalCleanPhone}" class="btn-secondary" style="padding:2px 8px; font-size:0.72rem; font-weight:800; border-radius:8px; color:var(--primary); border-color:var(--primary); text-decoration:none; display:inline-flex; align-items:center; gap:3px;">
                            <i data-lucide="phone-call" style="width:11px;height:11px;"></i> اتصال
                          </a>
                        </div>
                      </div>
                    ` : ''}

                    <div style="display:flex; justify-content:space-between;">
                      <span style="color:var(--text-muted);">📚 المقرر والمادة:</span>
                      <span style="font-weight:800; color:var(--primary);">${enrollment.course?.title || 'دورة'}</span>
                    </div>
                    ${enrollment.group ? `
                      <div style="display:flex; justify-content:space-between;">
                        <span style="color:var(--text-muted);">👥 المجموعة الدراسية:</span>
                        <span style="font-weight:900; color:var(--primary);">${enrollment.group.name} (${enrollment.group.scheduleDays || ''} ${enrollment.group.scheduleTime || ''})</span>
                      </div>
                    ` : ''}
                    <div style="display:flex; justify-content:space-between;">
                      <span style="color:var(--text-muted);">👨‍🏫 المعلم المسؤول:</span>
                      <span style="font-weight:800; color:var(--text-main);">${enrollment.course?.teacher?.name || enrollment.group?.teacher?.name || '—'}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                      <span style="color:var(--text-muted);">🏷️ المبلغ المطلوب:</span>
                      <span style="font-weight:900; color:#10b981;">${defaultAmount} EGP</span>
                    </div>
                  </div>
                `;
              })()}

              <!-- Paid Amount & Provider -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="form-group" style="margin:0;">
                  <label for="approve-enrollment-amount" style="font-weight:700; font-size:0.82rem; margin-bottom:4px; display:block;">المبلغ المدفوع (EGP) <span style="color:var(--error);">*</span></label>
                  <input type="number" id="approve-enrollment-amount" class="form-input" value="${defaultAmount}" min="0" step="0.5" required style="border-radius:12px; padding:10px 14px; font-size:0.88rem;">
                </div>
                <div class="form-group" style="margin:0;">
                  <label for="approve-enrollment-provider" style="font-weight:700; font-size:0.82rem; margin-bottom:4px; display:block;">طريقة التحويل والدفع</label>
                  <select id="approve-enrollment-provider" class="form-select" style="border-radius:12px; padding:10px 12px; font-size:0.88rem;">
                    <option value="vodafone_cash" ${enrollment.payment?.provider === 'vodafone_cash' ? 'selected' : ''}>Vodafone Cash (فودافون كاش)</option>
                    <option value="instapay" ${enrollment.payment?.provider === 'instapay' ? 'selected' : ''}>InstaPay (إنستاباي)</option>
                    <option value="bank_transfer" ${enrollment.payment?.provider === 'bank_transfer' ? 'selected' : ''}>تحويل بنكي (Bank Transfer)</option>
                    <option value="orange_cash" ${enrollment.payment?.provider === 'orange_cash' ? 'selected' : ''}>أورنج كاش (Orange Cash)</option>
                    <option value="etisalat_cash" ${enrollment.payment?.provider === 'etisalat_cash' ? 'selected' : ''}>اتصالات كاش (Etisalat Cash)</option>
                    <option value="cash" ${enrollment.payment?.provider === 'cash' ? 'selected' : ''}>نقداً باليد (Cash)</option>
                    <option value="other" ${enrollment.payment?.provider === 'other' ? 'selected' : ''}>أخرى (Other)</option>
                  </select>
                </div>
              </div>

              <!-- Receipt Upload & Preview -->
              <div class="form-group" style="margin:0; background:rgba(79,70,229,0.03); border:1px dashed var(--border-color); border-radius:14px; padding:12px 14px;">
                <label style="font-weight:800; font-size:0.85rem; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                  <span>🖼️ صورة إيصال التحويل (رفع من محادثة الواتساب أو الجهاز):</span>
                  ${existingReceipt ? `<a href="${existingReceipt}" target="_blank" style="font-size:0.75rem; color:var(--primary); text-decoration:none; font-weight:700;">عرض الإيصال المرفق ↗</a>` : ''}
                </label>
                
                <p style="font-size:0.75rem; color:var(--text-muted); margin:0 0 8px 0;">
                  إذا استلمت إيصال التحويل من الطالب عبر الواتساب، يمكنك حفظه ورفعه هنا ليتم توثيقه وأرشفته رسمياً في سجل الطالب بالمنصة.
                </p>

                <input type="file" id="approve-enrollment-receipt-file" accept="image/*" class="form-input" style="border-radius:12px; padding:8px 12px; font-size:0.82rem; width:100%;">
                
                <div id="enrollment-receipt-preview-container" style="${existingReceipt ? 'display:block;' : 'display:none;'} margin-top:10px; text-align:center;">
                  <img id="enrollment-receipt-preview" src="${existingReceipt || ''}" style="max-height:140px; border-radius:10px; border:2px solid var(--border-color); object-fit:contain; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                  <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">معاينة صورة الإيصال المرفقة</div>
                </div>
              </div>

              <!-- Notes -->
              <div class="form-group" style="margin:0;">
                <label for="approve-enrollment-notes" style="font-weight:700; font-size:0.82rem; margin-bottom:4px; display:block;">ملاحظات العملية / رقم المرجع (اختياري)</label>
                <input type="text" id="approve-enrollment-notes" class="form-input" placeholder="مثال: تم التحويل من رقم 010xxxxxxxx أو كود العملية #9812" style="border-radius:12px; padding:10px 14px; font-size:0.85rem;">
              </div>

            </div>

            <div class="modal-footer" style="padding:16px 24px; background:var(--bg-app); border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; gap:12px;">
              <button type="button" class="btn-secondary" id="cancel-approve-enrollment-modal" style="padding:8px 18px; border-radius:24px; font-size:0.85rem;">إلغاء</button>
              <button type="submit" id="submit-approve-enrollment-btn" class="btn-primary" style="padding:8px 22px; border-radius:24px; font-size:0.85rem; font-weight:800; background:#10b981; border-color:#10b981; gap:6px; display:inline-flex; align-items:center;">
                <i data-lucide="check" style="width:16px; height:16px;"></i> تأكيد وقبول التسجيل ✅
              </button>
            </div>
          </form>

        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const modal = document.getElementById("approve-enrollment-modal");
    const closeModal = () => modal?.remove();

    document.getElementById("close-approve-enrollment-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-approve-enrollment-modal")?.addEventListener("click", closeModal);

    const fileInput = document.getElementById("approve-enrollment-receipt-file");
    const previewContainer = document.getElementById("enrollment-receipt-preview-container");
    const previewImg = document.getElementById("enrollment-receipt-preview");

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

    document.getElementById("approve-enrollment-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById("submit-approve-enrollment-btn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "جاري الاعتماد...";
      }

      try {
        let receiptUrl = existingReceipt || null;
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
          } else {
            showToast("فشل رفع صورة الإيصال", "error");
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = `<i data-lucide="check" style="width:16px;height:16px;"></i> تأكيد وقبول التسجيل ✅`;
              if (window.lucide) window.lucide.createIcons();
            }
            return;
          }
        }

        const amount = document.getElementById("approve-enrollment-amount").value;
        const provider = document.getElementById("approve-enrollment-provider").value;
        const notes = document.getElementById("approve-enrollment-notes").value.trim();

        const res = await apiFetch(`/admin/enrollments/${enrollmentId}/approve`, {
          method: "POST",
          body: JSON.stringify({ amount, provider, receiptUrl, notes })
        });

        showToast(res.message || "تم اعتماد تسجيل الطالب وتأكيد الدفع بنجاح! 🎉", "success");
        closeModal();
        await this.loadAllData();
        this.renderTab("enrollments");
      } catch (err) {
        showToast(err.message || "حدث خطأ أثناء اعتماد التسجيل", "error");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<i data-lucide="check" style="width:16px;height:16px;"></i> تأكيد وقبول التسجيل ✅`;
          if (window.lucide) window.lucide.createIcons();
        }
      }
    });
  },

  updateAddCourseModalTeachers() {
    const selectEl = document.getElementById("admin-course-teacher-id");
    if (!selectEl) return;
    const teachers = (this.allMembers || []).filter(m => m.role === "teacher");
    selectEl.innerHTML = `
      <option value="">🏛️ دورة عامة على المنصة (بدون معلم خاص)</option>
      ${teachers.map(t => `<option value="${t.id}">${t.name} (${t.email})</option>`).join('')}
    `;
  },

  renderAddCourseModal() {
    const categories = this.categories || [];
    return `
      <div class="modal-overlay" id="admin-course-modal" style="display:none; backdrop-filter:blur(8px); background:rgba(0,0,0,0.6);">
        <div class="modal-content" style="max-width:680px; width:92%; border-radius:24px; border:1px solid var(--border-color); padding:0; background:var(--bg-card); overflow:hidden;">
          <div class="modal-header" style="padding:22px 28px; background:linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.08)); border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:14px;">
              <div style="width:46px; height:46px; border-radius:14px; background:var(--primary-glow); color:var(--primary); display:flex; align-items:center; justify-content:center;">
                <i data-lucide="book-plus" style="width:24px; height:24px;"></i>
              </div>
              <div>
                <h3 class="modal-title" style="font-size:1.2rem; font-weight:800; margin:0 0 2px 0; color:var(--text-main);">إضافة دورة تعليمية جديدة للمنصة ➕</h3>
                <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">أدخل تفاصيل الدورة، القسم، السعر (مجاني أو مدفوع) والمعلم المسؤول</p>
              </div>
            </div>
            <span class="modal-close-btn" id="close-admin-course-modal" style="font-size:1.4rem; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
          </div>

          <form id="admin-course-form">
            <div class="modal-body" style="padding:24px 28px; display:flex; flex-direction:column; gap:18px; max-height:75vh; overflow-y:auto;">
              
              <!-- Course Title -->
              <div class="form-group" style="margin:0;">
                <label for="admin-course-title" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="heading" style="width:14px; height:14px; color:var(--primary);"></i>
                  عنوان الدورة التعليمية <span style="color:var(--error);">*</span>
                </label>
                <input type="text" id="admin-course-title" class="form-input" placeholder="مثال: الدورة الشاملة في الرياضيات - ثانوية عامة" style="border-radius:14px; padding:12px 16px; font-size:0.9rem;" required>
              </div>

              <!-- Category & Degree Grid -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <!-- Category Select -->
                <div class="form-group" style="margin:0;">
                  <label for="admin-course-category-select" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="layers" style="width:14px; height:14px; color:#a855f7;"></i>
                    التخصص / المادة <span style="color:var(--error);">*</span>
                  </label>
                  <select id="admin-course-category-select" class="form-select" style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;" required>
                    <option value="">-- اختر التخصص / المادة الدراسية --</option>
                    <optgroup label="📚 المواد والدراسات الأساسية">
                      <option value="الرياضيات">الرياضيات (Mathematics)</option>
                      <option value="الفيزياء">الفيزياء (Physics)</option>
                      <option value="الكيمياء">الكيمياء (Chemistry)</option>
                      <option value="الأحياء">الأحياء (Biology)</option>
                      <option value="العلوم العامة">العلوم العامة (Science)</option>
                      <option value="اللغة العربية">اللغة العربية (Arabic)</option>
                      <option value="اللغة الإنجليزية">اللغة الإنجليزية (English)</option>
                      <option value="اللغة الفرنسية">اللغة الفرنسية (French)</option>
                      <option value="التاريخ">التاريخ (History)</option>
                      <option value="الجغرافيا">الجغرافيا (Geography)</option>
                      <option value="الفلسفة والمنطق">الفلسفة والمنطق (Philosophy)</option>
                      <option value="الحاسب الآلي والبرمجة">الحاسب الآلي وتكنولوجيا المعلومات (IT)</option>
                      <option value="الاقتصاد والإحصاء">الاقتصاد والإحصاء (Economics)</option>
                    </optgroup>
                    ${categories.length > 0 ? `
                      <optgroup label="🗂️ التصنيفات المعتمدة بالمنصة">
                        ${categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
                      </optgroup>
                    ` : ''}
                    <optgroup label="✏️ إضافة تخصيص">
                      <option value="__custom__">+ كتابة تخصص / مادة جديدة مخصصة</option>
                    </optgroup>
                  </select>
                  <div id="admin-course-category-custom-wrapper" style="display:none; margin-top:10px;">
                    <input type="text" id="admin-course-category-custom" class="form-input" placeholder="أدخل اسم التخصص أو المادة الجديدة..." style="border-radius:12px; padding:10px 14px; font-size:0.88rem; width:100%; border:1px solid var(--primary);">
                  </div>
                </div>

                <!-- Degree Select -->
                <div class="form-group" style="margin:0;">
                  <label for="admin-course-degree" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="graduation-cap" style="width:14px; height:14px; color:#10b981;"></i>
                    السنة الدراسية / المستوى <span style="color:var(--error);">*</span>
                  </label>
                  <select id="admin-course-degree" class="form-select" style="border-radius:14px; padding:11px 14px; font-size:0.88rem;" required>
                    <option value="">-- اختر المستوى --</option>
                    <optgroup label="🌱 المرحلة الابتدائية (Primary)">
                      <option value="الابتدائية - الصف الأول">الصف الأول الابتدائي (Primary 1)</option>
                      <option value="الابتدائية - الصف الثاني">الصف الثاني الابتدائي (Primary 2)</option>
                      <option value="الابتدائية - الصف الثالث">الصف الثالث الابتدائي (Primary 3)</option>
                      <option value="الابتدائية - الصف الرابع">الصف الرابع الابتدائي (Primary 4)</option>
                      <option value="الابتدائية - الصف الخامس">الصف الخامس الابتدائي (Primary 5)</option>
                      <option value="الابتدائية - الصف السادس">الصف السادس الابتدائي (Primary 6)</option>
                    </optgroup>
                    <optgroup label="📘 المرحلة الإعدادية (Prep)">
                      <option value="الإعدادية - الصف الأول">الصف الأول الإعدادي (Prep 1)</option>
                      <option value="الإعدادية - الصف الثاني">الصف الثاني الإعدادي (Prep 2)</option>
                      <option value="الإعدادية - الصف الثالث">الصف الثالث الإعدادي - الشهادة الإعدادية (Prep 3)</option>
                    </optgroup>
                    <optgroup label="🎓 المرحلة الثانوية (Secondary)">
                      <option value="الثانوية - الصف الأول">الصف الأول الثانوي (1st Secondary)</option>
                      <option value="الثانوية - الصف الثاني (علمي)">الصف الثاني الثانوي - علمي</option>
                      <option value="الثانوية - الصف الثاني (أدبي)">الصف الثاني الثانوي - أدبي</option>
                      <option value="الثانوية - الصف الثالث (علمي علوم)">الصف الثالث الثانوي - علمي علوم</option>
                      <option value="الثانوية - الصف الثالث (علمي رياضة)">الصف الثالث الثانوي - علمي رياضة</option>
                      <option value="الثانوية - الصف الثالث (أدبي)">الصف الثالث الثانوي - أدبي</option>
                      <option value="الثانوية الأزهرية">الثانوية الأزهرية</option>
                    </optgroup>
                    <optgroup label="🌟 عام وتأسيس (General)">
                      <option value="جميع المراحل والصفوف">جميع المراحل والصفوف (All Grades)</option>
                      <option value="تأسيس ودورات عامة">تأسيس ودورات تدريبية عامة (Foundation)</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              <!-- Teacher Selection -->
              <div class="form-group" style="margin:0;">
                <label for="admin-course-teacher-id" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="user-check" style="width:14px; height:14px; color:var(--primary);"></i>
                  المعلم المسؤول عن الدورة (اختياري للدورات العامة)
                </label>
                <select id="admin-course-teacher-id" class="form-select" style="border-radius:14px; padding:11px 14px; font-size:0.88rem;">
                  <option value="">🏛️ دورة عامة على المنصة (بدون معلم خاص)</option>
                  ${(this.allMembers || []).filter(m => m.role === 'teacher').map(t => `<option value="${t.id}">${t.name} (${t.email})</option>`).join('')}
                </select>
              </div>

              <!-- Course Pricing Type (Free vs Paid) -->
              <div class="form-group" style="margin:0; background:rgba(99,102,241,0.04); border:1px solid var(--border-color); border-radius:16px; padding:16px;">
                <label style="font-weight:800; font-size:0.9rem; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="tag" style="width:16px; height:16px; color:var(--primary);"></i>
                  تسعير الدورة التعليمية (مجانية أو مدفوعة) <span style="color:var(--error);">*</span>
                </label>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                  <label id="admin-pricing-free-label" style="display:flex; align-items:center; gap:10px; padding:12px 14px; border-radius:12px; border:2px solid var(--primary); cursor:pointer; transition:all 0.2s ease; background:var(--bg-card);">
                    <input type="radio" name="admin-course-pricing-type" value="free" checked style="accent-color:var(--primary); width:16px; height:16px;">
                    <div>
                      <div style="font-weight:800; font-size:0.88rem; color:var(--text-main);">🎁 دورة مجانية</div>
                      <div style="font-size:0.75rem; color:var(--text-muted);">متاحة لجميع الطلاب مجاناً</div>
                    </div>
                  </label>

                  <label id="admin-pricing-paid-label" style="display:flex; align-items:center; gap:10px; padding:12px 14px; border-radius:12px; border:2px solid var(--border-color); cursor:pointer; transition:all 0.2s ease; background:var(--bg-card);">
                    <input type="radio" name="admin-course-pricing-type" value="paid" style="accent-color:var(--primary); width:16px; height:16px;">
                    <div>
                      <div style="font-weight:800; font-size:0.88rem; color:var(--text-main);">💳 دورة مدفوعة</div>
                      <div style="font-size:0.75rem; color:var(--text-muted);">تتطلب دفع مبلغ مالي للانضمام</div>
                    </div>
                  </label>
                </div>

                <!-- Paid Fields Container -->
                <div id="admin-course-paid-fields" style="display:none; flex-direction:column; gap:12px; margin-top:12px; padding-top:12px; border-top:1px dashed var(--border-color);">
                  <div style="display:grid; grid-template-columns:2fr 1fr; gap:12px;">
                    <div class="form-group" style="margin:0;">
                      <label for="admin-course-price" style="font-weight:700; font-size:0.82rem; margin-bottom:4px; display:block;">سعر الدورة</label>
                      <input type="number" id="admin-course-price" class="form-input" placeholder="مثال: 350" min="0" step="0.5" style="border-radius:12px; padding:10px 14px; font-size:0.88rem;">
                    </div>
                    <div class="form-group" style="margin:0;">
                      <label for="admin-course-currency" style="font-weight:700; font-size:0.82rem; margin-bottom:4px; display:block;">العملة</label>
                      <select id="admin-course-currency" class="form-select" style="border-radius:12px; padding:10px 12px; font-size:0.88rem;">
                        <option value="EGP">EGP (جنيه)</option>
                        <option value="SAR">SAR (ريال)</option>
                        <option value="USD">USD ($)</option>
                        <option value="AED">AED (درهم)</option>
                        <option value="KWD">KWD (دينار)</option>
                      </select>
                    </div>
                  </div>

                  <div class="form-group" style="margin:0;">
                    <label for="admin-course-payment-details" style="font-weight:700; font-size:0.82rem; margin-bottom:4px; display:block;">بيانات وطريقة التحويل (Vodafone Cash / Instapay / Bank)</label>
                    <input type="text" id="admin-course-payment-details" class="form-input" placeholder="مثال: تحويل فودافون كاش / انستاباي على 010xxxxxxxx" style="border-radius:12px; padding:10px 14px; font-size:0.85rem;">
                  </div>
                </div>
              </div>

              <!-- Course Description -->
              <div class="form-group" style="margin:0;">
                <label for="admin-course-desc" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="file-text" style="width:14px; height:14px; color:var(--text-muted);"></i>
                  وصف ومحتويات الدورة
                </label>
                <textarea id="admin-course-desc" class="form-input" style="height:90px; resize:none; border-radius:14px; padding:12px 16px; font-size:0.88rem; line-height:1.5;" placeholder="أدخل تفاصيل ومحاور المنهج التعليمي والدورة..." required></textarea>
              </div>

              <!-- Course Image Upload -->
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; justify-content:space-between;">
                  <span style="display:flex; align-items:center; gap:6px;">
                    <i data-lucide="image" style="width:14px; height:14px; color:#f59e0b;"></i>
                    غلاف / صورة الدورة
                  </span>
                  <button type="button" id="admin-toggle-url-input-btn" style="background:none; border:none; color:var(--primary); font-weight:700; font-size:0.75rem; cursor:pointer;">
                    أو أدخل رابط صورة مباشرة 🔗
                  </button>
                </label>

                <div id="admin-course-dropzone" style="border:2px dashed var(--border-color); border-radius:16px; padding:18px; text-align:center; background:var(--bg-app); cursor:pointer; transition:all 0.2s ease;">
                  <input type="file" id="admin-course-image-file" accept="image/*" style="display:none;">

                  <div id="admin-image-upload-idle">
                    <button type="button" class="btn-secondary" id="admin-btn-trigger-upload" style="padding:8px 20px; border-radius:30px; font-size:0.85rem; margin:0 auto; display:inline-flex; align-items:center; gap:6px;">
                      <i data-lucide="upload-cloud" style="width:16px; height:16px;"></i> اختيار صورة غلاف الدورة
                    </button>
                    <p style="font-size:0.75rem; color:var(--text-muted); margin:8px 0 0 0;">الصغار المقبولة: JPG, PNG, WEBP (الحد الأقصى 5 ميجابايت)</p>
                  </div>

                  <div id="admin-image-upload-loading" style="display:none; padding:10px; color:var(--primary); font-weight:700; font-size:0.88rem;">
                    <i data-lucide="loader" class="spinner" style="width:20px; height:20px; display:inline-block; vertical-align:middle; margin-inline-end:6px;"></i> جاري رفع الصورة...
                  </div>

                  <div id="admin-image-preview-wrapper" style="display:none; text-align:center;">
                    <div style="position:relative; display:inline-block;">
                      <img id="admin-course-preview-img" src="" style="max-height:130px; border-radius:12px; object-fit:cover; border:2px solid var(--primary); box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                      <button type="button" id="admin-remove-course-image-btn" title="حذف الصورة" style="position:absolute; top:-8px; right:-8px; background:var(--error,#ef4444); color:#fff; border:none; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-weight:bold; box-shadow:0 2px 6px rgba(0,0,0,0.3);">✕</button>
                    </div>
                    <p style="font-size:0.78rem; color:var(--success,#10b981); font-weight:800; margin:6px 0 0 0;">✓ تم اختيار ورفع غلاف الدورة بنجاح</p>
                  </div>
                </div>

                <div id="admin-url-input-wrapper" style="display:none; margin-top:10px;">
                  <input type="url" id="admin-course-image-url-direct" class="form-input" placeholder="https://example.com/course-cover.jpg" style="border-radius:12px; padding:10px 14px; font-size:0.85rem;">
                </div>

                <input type="hidden" id="admin-course-image">
              </div>

              <!-- Static Meeting Link -->
              <div class="form-group" style="margin:0;">
                <label for="admin-course-meeting-link" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="video" style="width:14px; height:14px; color:#06b6d4;"></i>
                  🔗 رابط البث المباشر الثابت (Zoom / Meet / Webex)
                </label>
                <input type="url" id="admin-course-meeting-link" class="form-input" placeholder="https://meet.google.com/abc-defg-hij" style="border-radius:14px; padding:11px 16px; font-size:0.88rem;">
              </div>

            </div>

            <div class="modal-footer" style="padding:16px 28px; background:var(--bg-app); border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; gap:12px;">
              <button type="button" class="btn-secondary" id="cancel-admin-course-modal" style="padding:10px 20px; border-radius:30px; font-size:0.88rem;">إلغاء</button>
              <button type="submit" class="btn-primary" style="padding:10px 24px; border-radius:30px; font-size:0.88rem; font-weight:800; background:linear-gradient(135deg,#0056D2,#a855f7); border:none;">
                <i data-lucide="check-circle-2" style="width:16px; height:16px; vertical-align:middle;"></i> إنشاء ونشر الدورة للمنصة 🎉
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  // ── 4.5 Groups Management Tab ────────────────────────────────────────────────

  renderCourseDetailsModal(course) {
    const modalId = 'course-details-modal-overlay';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const coursePlans = (this.allPlans || []).filter(p => p.courseId === course.id || p.course?.id === course.id);
    const lessons = course.lessons || [];

    const orderedUnits = Array.isArray(course.unitsOrder) ? [...course.unitsOrder] : [];
    const allKnownUnits = Array.from(new Set([
      ...orderedUnits,
      ...lessons.map(l => l.chapter || "الوحدة العامة")
    ])).filter(Boolean);

    const unitsMap = {};
    allKnownUnits.forEach(u => { unitsMap[u] = []; });
    lessons.forEach(l => {
      const chName = l.chapter || "الوحدة العامة";
      if (!unitsMap[chName]) unitsMap[chName] = [];
      unitsMap[chName].push(l);
    });
    // Sort lessons by order
    Object.keys(unitsMap).forEach(k => {
      unitsMap[k].sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    const unitsCount = Object.keys(unitsMap).length;

    const isCourseFree = course.isFree !== false && (!course.price || Number(course.price) === 0);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.style.display = 'flex';
    overlay.style.backdropFilter = 'blur(8px)';
    overlay.style.background = 'rgba(0,0,0,0.6)';

    overlay.innerHTML = `
      <div class="modal-content" style="max-width:850px; width:92%; border-radius:24px; border:1px solid var(--border-color); padding:0; background:var(--bg-card); overflow:hidden;">
        <!-- Header -->
        <div style="padding:22px 28px; background:linear-gradient(135deg, rgba(0,86,210,0.1), rgba(168,85,247,0.1)); border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:16px;">
            <img src="${course.image || 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=80&auto=format'}" style="width:56px; height:56px; border-radius:14px; object-fit:cover; border:2px solid var(--primary);">
            <div>
              <div style="display:flex; gap:8px; align-items:center; margin-bottom:4px;">
                <span class="badge" style="background:var(--primary-glow); color:var(--primary); font-size:0.75rem; font-weight:800;">${course.category || 'عام'}</span>
                ${isCourseFree ? `
                  <span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-size:0.75rem; font-weight:800;">🎁 دورة مجانية</span>
                ` : `
                  <span class="badge" style="background:rgba(99,102,241,0.15); color:var(--primary); font-size:0.75rem; font-weight:800;">💳 ${course.price} ${course.currency || 'EGP'}</span>
                `}
                ${course.degree ? `<span class="badge" style="background:rgba(139,92,246,0.15); color:#8b5cf6; font-size:0.75rem; font-weight:800;">${course.degree}</span>` : ''}
              </div>
              <h3 style="font-size:1.25rem; font-weight:900; margin:0; color:var(--text-main);">${course.title}</h3>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <a href="#manage-course/${course.id}" class="btn-primary" style="font-size:0.82rem; padding:8px 16px; background:#8b5cf6; border-color:#8b5cf6; text-decoration:none; display:inline-flex; align-items:center; gap:6px; font-weight:800; border-radius:12px;">
              <i data-lucide="plus-circle" style="width:16px;height:16px;"></i> إضافة وإدارة دروس المنهج 📚
            </a>
            <span id="close-course-modal" style="font-size:1.4rem; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
          </div>
        </div>

        <!-- Body -->
        <div style="padding:24px; background:var(--bg-app); max-height:75vh; overflow-y:auto; font-size:0.9rem;">
          
          <!-- Quick Stats Grid -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:12px; margin-bottom:24px;">
            <div style="background:var(--bg-card); padding:12px 16px; border-radius:14px; border:1px solid var(--border-color);">
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">👨‍🏫 المعلم المسؤول</div>
              <div style="font-size:0.95rem; font-weight:800; color:var(--text-main); margin-top:2px;">${course.teacher?.name || 'غير محدد'}</div>
            </div>
            <div style="background:var(--bg-card); padding:12px 16px; border-radius:14px; border:1px solid var(--border-color);">
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">🏷️ نوع التسعير</div>
              <div style="font-size:0.95rem; font-weight:800; color:${isCourseFree ? '#10b981' : 'var(--primary)'}; margin-top:2px;">
                ${isCourseFree ? 'مجانية بالكامل 🎁' : `${course.price} ${course.currency || 'EGP'}`}
              </div>
            </div>
            <div style="background:var(--bg-card); padding:12px 16px; border-radius:14px; border:1px solid var(--border-color);">
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">📂 الوحدات الدراسية</div>
              <div style="font-size:0.95rem; font-weight:800; color:#a855f7; margin-top:2px;">${unitsCount} وحدة</div>
            </div>
            <div style="background:var(--bg-card); padding:12px 16px; border-radius:14px; border:1px solid var(--border-color);">
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">📖 عدد الدروس</div>
              <div style="font-size:0.95rem; font-weight:800; color:var(--primary); margin-top:2px;">${lessons.length || course.lessonsCount || 0} درس</div>
            </div>
            <div style="background:var(--bg-card); padding:12px 16px; border-radius:14px; border:1px solid var(--border-color);">
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">👥 الطلاب المسجلين</div>
              <div style="font-size:0.95rem; font-weight:800; color:#10b981; margin-top:2px;">${course.enrollmentsCount || 0} طالب</div>
            </div>
            <div style="background:var(--bg-card); padding:12px 16px; border-radius:14px; border:1px solid var(--border-color);">
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">💎 خطط الاشتراكات</div>
              <div style="font-size:0.95rem; font-weight:800; color:#8b5cf6; margin-top:2px;">${coursePlans.length} خطة شهرية</div>
            </div>
          </div>

          <!-- Description -->
          <div style="background:var(--bg-card); padding:18px; border-radius:16px; border:1px solid var(--border-color); margin-bottom:24px;">
            <h4 style="font-weight:800; margin:0 0 8px 0; color:var(--text-main); font-size:0.95rem;">📝 وصف الدورة التدريبية:</h4>
            <p style="color:var(--text-muted); margin:0; line-height:1.6; font-size:0.88rem;">${course.description || 'لا يوجد وصف مضاف حتى الآن.'}</p>
            ${course.meetingLink ? `
              <div style="margin-top:12px; font-size:0.82rem; font-weight:700;">
                <span>🔗 رابط القاعة المباشرة:</span>
                <a href="${course.meetingLink}" target="_blank" style="color:var(--primary); font-weight:700; text-decoration:none; margin-inline-start:6px;">${course.meetingLink}</a>
              </div>
            ` : ''}
            ${course.paymentDetails ? `
              <div style="margin-top:12px; padding:12px 14px; background:rgba(99,102,241,0.06); border-radius:12px; border:1px solid rgba(99,102,241,0.2); font-size:0.85rem;">
                <span style="font-weight:800; color:var(--primary);">💳 بيانات وطرق الدفع والتحويل:</span>
                <span style="margin-inline-start:6px; color:var(--text-main); font-weight:600;">${course.paymentDetails}</span>
              </div>
            ` : ''}
          </div>

          <!-- Section: Subscription Plans -->
          <div style="margin-bottom:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
              <h4 style="font-weight:800; margin:0; color:var(--text-main); font-size:1rem; display:flex; align-items:center; gap:6px;">
                ✨ خطط الاشتراكات الشهرية المخصصة لهذا الكورس (${coursePlans.length})
              </h4>
              <button id="modal-add-course-plan-btn" class="btn-primary" style="padding:6px 14px; font-size:0.8rem; border-radius:10px; gap:6px;">
                <i data-lucide="plus-circle" style="width:14px;height:14px;"></i> إضافة خطة جديدة للكورس 🚀
              </button>
            </div>

            ${coursePlans.length === 0 ? `
              <div style="background:var(--bg-card); text-align:center; padding:30px; border-radius:16px; border:1px dashed var(--border-color); color:var(--text-muted);">
                <i data-lucide="sparkles" style="width:32px; height:32px; opacity:0.3; margin-bottom:8px;"></i>
                <p style="margin:0 0 10px 0; font-size:0.85rem;">لا توجد خطط اشتراكات شهرية مخصصة لهذا الكورس حتى الآن.</p>
                <button id="modal-add-course-plan-btn-2" class="btn-secondary" style="font-size:0.8rem; padding:6px 12px; border-color:var(--primary); color:var(--primary); font-weight:700;">
                  أنشئ أول خطة مخصصة للكورس الآن
                </button>
              </div>
            ` : `
              <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:14px;">
                ${coursePlans.map(p => `
                  <div style="background:var(--bg-card); padding:16px; border-radius:14px; border:2px solid ${p.isActive ? 'var(--primary)' : 'var(--border-color)'};">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                      <h5 style="font-weight:800; margin:0; font-size:0.95rem;">${p.name}</h5>
                      <span style="font-size:1.1rem; font-weight:900; color:var(--primary);">${p.price} ${p.currency}</span>
                    </div>
                    <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:12px; min-height:28px;">${p.description || ''}</p>
                    <div style="font-size:0.75rem; color:var(--text-main); font-weight:700; margin-bottom:12px; display:flex; gap:10px;">
                      <span>📅 ${p.sessionsCount} حصة</span>
                      <span>⏱️ ${p.durationDays} يوم</span>
                    </div>
                    <div style="display:flex; gap:6px;">
                      <button class="btn-secondary modal-edit-plan-btn" data-id="${p.id}" style="flex:1; padding:4px; font-size:0.75rem; border-color:var(--primary); color:var(--primary);">تعديل</button>
                      <button class="btn-secondary modal-toggle-plan-btn" data-id="${p.id}" data-active="${p.isActive}" style="flex:1; padding:4px; font-size:0.75rem;">${p.isActive ? 'إلغاء' : 'تفعيل'}</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Section: Units and Lessons -->
          <div style="margin-top:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
              <h4 style="font-weight:800; margin:0; color:var(--text-main); font-size:1rem; display:flex; align-items:center; gap:8px;">
                📂 الوحدات والدروس المرتبطة بالمنهج (${unitsCount} وحدة دراسية • ${lessons.length} درس)
              </h4>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <a href="#manage-course/${course.id}" class="btn-secondary" style="padding:6px 14px; font-size:0.8rem; border-radius:10px; text-decoration:none; display:inline-flex; align-items:center; gap:6px; font-weight:800; border-color:var(--primary); color:var(--primary);">
                  <i data-lucide="layers" style="width:14px;height:14px;"></i> استوديو تنظيم وترتيب المنهج 📚
                </a>
                <button id="modal-admin-add-lesson-btn" class="btn-primary" style="padding:6px 14px; font-size:0.8rem; border-radius:10px; gap:6px; background:#8b5cf6; border-color:#8b5cf6; font-weight:800;">
                  <i data-lucide="plus-circle" style="width:14px;height:14px;"></i> إضافة درس جديد لهذا الكورس ➕
                </button>
              </div>
            </div>

            ${unitsCount > 0 ? `
              <div style="display:flex; flex-direction:column; gap:14px;">
                ${Object.keys(unitsMap).map((unitName, unitIdx) => `
                  <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:16px; overflow:hidden;">
                    <div style="background:rgba(99,102,241,0.06); padding:12px 18px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); flex-wrap:wrap; gap:8px;">
                      <span style="font-weight:800; font-size:0.92rem; color:var(--primary); display:flex; align-items:center; gap:8px;">
                        <span style="background:var(--primary-glow); width:24px; height:24px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:0.75rem;">${unitIdx + 1}</span>
                        <i data-lucide="folder-open" style="width:16px; height:16px;"></i> ${unitName}
                      </span>
                      <div style="display:flex; align-items:center; gap:6px;">
                        <span class="badge" style="background:rgba(99,102,241,0.12); color:var(--primary); font-size:0.75rem; font-weight:800;">
                          ${unitsMap[unitName].length} دروس
                        </span>
                        <a href="#manage-course/${course.id}" title="ترتيب وتعديل هذه الوحدة في استوديو المنهج" style="font-size:0.75rem; color:var(--primary); font-weight:700; text-decoration:none; padding:3px 8px; border-radius:6px; background:var(--bg-app); border:1px solid var(--border-color); display:inline-flex; align-items:center; gap:4px;">
                          <i data-lucide="edit" style="width:12px;height:12px;"></i> إدارة وتعديل
                        </a>
                      </div>
                    </div>
                    <div style="padding:10px 14px; display:flex; flex-direction:column; gap:8px;">
                      ${unitsMap[unitName].map((lesson, lessonIdx) => `
                        <div style="padding:10px 14px; border-radius:10px; background:var(--bg-app); border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
                          <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-weight:800; font-size:0.78rem; color:var(--primary); background:rgba(99,102,241,0.1); width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center;">#${lessonIdx + 1}</span>
                            <div>
                              <div style="font-weight:700; color:var(--text-main); font-size:0.88rem;">${lesson.title}</div>
                              ${lesson.description ? `<div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">${lesson.description}</div>` : ''}
                            </div>
                          </div>
                          <div style="display:flex; align-items:center; gap:10px; font-size:0.78rem; color:var(--text-muted);">
                            ${lesson.videoUrl ? `<span style="color:#2563eb; font-weight:700; display:inline-flex; align-items:center; gap:4px;"><i data-lucide="video" style="width:12px;height:12px;"></i> فيديو</span>` : `<span style="color:var(--text-muted);">📄 ملخص/شرح</span>`}
                            ${lesson.duration ? `<span>⏱️ ${lesson.duration}</span>` : ''}
                            ${lesson.isFree ? `<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-size:0.7rem; font-weight:800;">مجاني</span>` : ''}
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div style="background:var(--bg-card); text-align:center; padding:24px; border-radius:16px; border:1px dashed var(--border-color); color:var(--text-muted); font-size:0.88rem;">
                لا توجد دروس أو وحدات مضافة في هذه الدورة حتى الآن.
              </div>
            `}
          </div>

        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    document.getElementById('close-course-modal')?.addEventListener('click', () => overlay.remove());

    document.getElementById('modal-admin-add-lesson-btn')?.addEventListener('click', () => {
      this.renderAdminAddLessonModal(course);
    });

    const openAddPlanForCourse = () => {
      overlay.remove();
      this.renderPlanModal({ courseId: course.id, course: course });
    };

    document.getElementById('modal-add-course-plan-btn')?.addEventListener('click', openAddPlanForCourse);
    document.getElementById('modal-add-course-plan-btn-2')?.addEventListener('click', openAddPlanForCourse);

    overlay.querySelectorAll('.modal-edit-plan-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const plan = (this.allPlans || []).find(p => p.id === id);
        overlay.remove();
        if (plan) this.renderPlanModal(plan);
      });
    });

    overlay.querySelectorAll('.modal-toggle-plan-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const active = e.currentTarget.getAttribute('data-active') === 'true';
        try {
          await apiFetch(`/subscription-plans/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ isActive: !active })
          });
          showToast('تم تحديث حالة الخطة! ✅', 'success');
          overlay.remove();
          await this.loadAllData();
          this.renderTab('courses');
        } catch (err) {
          showToast(err.message || 'فشل تحديث الخطة.', 'error');
        }
      });
    });
  },

  renderAdminAddLessonModal(course) {
    const modalId = 'admin-add-lesson-modal-overlay';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.style.display = 'flex';
    overlay.style.backdropFilter = 'blur(8px)';
    overlay.style.background = 'rgba(0,0,0,0.6)';

    const existingUnits = Array.from(new Set((course.lessons || []).map(l => l.chapter || "الوحدة العامة"))).filter(Boolean);
    if (existingUnits.length === 0) existingUnits.push("الوحدة الأولى");

    overlay.innerHTML = `
      <div class="modal-content" style="max-width:620px; width:92%; border-radius:24px; border:1px solid var(--border-color); padding:0; background:var(--bg-card); overflow:hidden;">
        <div style="padding:20px 24px; background:linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.08)); border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:42px; height:42px; border-radius:12px; background:var(--primary-glow); color:var(--primary); display:flex; align-items:center; justify-content:center;">
              <i data-lucide="video" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <h3 style="font-size:1.15rem; font-weight:800; margin:0; color:var(--text-main);">إضافة درس جديد للدورة 🎥</h3>
              <p style="font-size:0.78rem; color:var(--text-muted); margin:2px 0 0 0;">${course.title}</p>
            </div>
          </div>
          <span id="close-admin-lesson-modal" style="font-size:1.4rem; cursor:pointer; width:30px; height:30px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
        </div>

        <form id="admin-add-lesson-form" style="padding:22px 24px; display:flex; flex-direction:column; gap:16px; max-height:80vh; overflow-y:auto;">
          <!-- Unit / Chapter selection -->
          <div class="form-group" style="margin:0;">
            <label style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:block;">الوحدة الدراسية (Unit / Chapter) <span style="color:var(--error);">*</span></label>
            <select id="admin-lesson-chapter-select" class="form-select" style="border-radius:12px; padding:10px 14px; font-size:0.88rem; width:100%;">
              ${existingUnits.map(u => `<option value="${u}">${u}</option>`).join('')}
              <option value="__NEW__">➕ إضافة وحدة دراسية جديدة...</option>
            </select>
            <input type="text" id="admin-lesson-chapter-custom" class="form-input" placeholder="اكتب اسم الوحدة الجديدة هنا..." style="display:none; border-radius:12px; padding:10px 14px; font-size:0.88rem; margin-top:8px;">
          </div>

          <!-- Lesson Title -->
          <div class="form-group" style="margin:0;">
            <label style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:block;">عنوان الدرس <span style="color:var(--error);">*</span></label>
            <input type="text" id="admin-lesson-title" class="form-input" placeholder="مثال: الدرس 1 - الشرح الأساسي للنظرية" style="border-radius:12px; padding:10px 14px; font-size:0.88rem;" required>
          </div>

          <!-- Video URL (Optional) -->
          <div class="form-group" style="margin:0;">
            <label style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:block;">رابط فيديو الدرس (اختياري / Optional)</label>
            <input type="url" id="admin-lesson-video" class="form-input" placeholder="https://www.youtube.com/watch?v=... (يمكن تركه فارغاً)" style="border-radius:12px; padding:10px 14px; font-size:0.88rem;">
          </div>

          <!-- Description -->
          <div class="form-group" style="margin:0;">
            <label style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:block;">شرح وتفاصيل الدرس</label>
            <textarea id="admin-lesson-desc" class="form-input" rows="3" placeholder="ملخص وأفكار هذا الدرس..." style="border-radius:12px; padding:10px 14px; font-size:0.88rem; resize:vertical; font-family:inherit;"></textarea>
          </div>

          <!-- Duration & Order -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
            <div class="form-group" style="margin:0;">
              <label style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:block;">مدة الدرس</label>
              <input type="text" id="admin-lesson-duration" class="form-input" value="20:00" style="border-radius:12px; padding:10px 14px; font-size:0.88rem;">
            </div>
            <div class="form-group" style="margin:0;">
              <label style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:block;">ترتيب الدرس</label>
              <input type="number" id="admin-lesson-order" class="form-input" value="${(course.lessons || []).length + 1}" style="border-radius:12px; padding:10px 14px; font-size:0.88rem;">
            </div>
          </div>

          <!-- Teacher Notes -->
          <div class="form-group" style="margin:0;">
            <label style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:block;">ملاحظات ونقاط تذكير للطلاب (اختياري)</label>
            <textarea id="admin-lesson-notes" class="form-input" rows="2" placeholder="أهم القوانين أو الإرشادات لهذا الدرس..." style="border-radius:12px; padding:10px 14px; font-size:0.88rem; resize:vertical; font-family:inherit;"></textarea>
          </div>

          <!-- Footer Buttons -->
          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:8px; padding-top:16px; border-top:1px solid var(--border-color);">
            <button type="button" class="btn-secondary" id="cancel-admin-lesson-modal" style="padding:10px 20px; border-radius:30px; font-size:0.88rem;">إلغاء</button>
            <button type="submit" class="btn-primary" style="padding:10px 24px; border-radius:30px; font-size:0.88rem; font-weight:800; background:linear-gradient(135deg,#0056D2,#a855f7); border:none;">
              <i data-lucide="check-circle" style="width:16px; height:16px; vertical-align:middle;"></i> حفظ ونشر الدرس 🚀
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => overlay.remove();
    document.getElementById("close-admin-lesson-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-admin-lesson-modal")?.addEventListener("click", closeModal);

    const selectEl = document.getElementById("admin-lesson-chapter-select");
    const customInputEl = document.getElementById("admin-lesson-chapter-custom");
    selectEl?.addEventListener("change", () => {
      if (customInputEl) customInputEl.style.display = selectEl.value === "__NEW__" ? "block" : "none";
    });

    const form = document.getElementById("admin-add-lesson-form");
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector("button[type='submit']");
      if (submitBtn) submitBtn.disabled = true;

      const title = document.getElementById("admin-lesson-title").value.trim();
      if (!title) {
        showToast("الرجاء إدخال عنوان الدرس.", "error");
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      let chapter = selectEl.value;
      if (chapter === "__NEW__") {
        chapter = customInputEl?.value.trim() || "الوحدة العامة";
      }

      const videoUrl = document.getElementById("admin-lesson-video").value.trim();
      const description = document.getElementById("admin-lesson-desc").value.trim() || null;
      const duration = document.getElementById("admin-lesson-duration").value.trim() || "20:00";
      const order = parseInt(document.getElementById("admin-lesson-order").value) || 1;
      const notes = document.getElementById("admin-lesson-notes").value.trim() || null;

      const payload = {
        title,
        chapter,
        videoUrl,
        photo: null,
        duration,
        order,
        description,
        notes
      };

      try {
        await apiFetch(`/courses/${course.id}/lessons`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        showToast("تم إضافة الدرس إلى الكورس بنجاح! 🎉", "success");
        closeModal();
        await this.loadAllData();
        const updatedCourse = (this.courses || []).find(c => c.id === course.id) || course;
        this.renderCourseDetailsModal(updatedCourse);
      } catch (err) {
        console.error("Admin add lesson error:", err);
        showToast(err.message || "فشل إضافة الدرس.", "error");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // ── 12. Subscription Plans Tab ────────────────────────────────────────────────

};
