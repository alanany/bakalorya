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

    // Group earnings by teacher
    const teacherMap = new Map();
    earnings.forEach(ear => {
      const teacherId = ear.teacher?.id || 'unknown';
      if (!teacherMap.has(teacherId)) {
        teacherMap.set(teacherId, {
          teacher: ear.teacher || { id: 'unknown', name: 'معلم غير محدد' },
          items: [],
          pendingAmount: 0,
          paidAmount: 0,
          totalAmount: 0
        });
      }
      const grp = teacherMap.get(teacherId);
      grp.items.push(ear);
      const amt = Number(ear.amount || 0);
      grp.totalAmount += amt;
      if (ear.status === 'paid') {
        grp.paidAmount += amt;
      } else {
        grp.pendingAmount += amt;
      }
    });

    const teacherGroups = Array.from(teacherMap.values());
    teacherGroups.sort((a, b) => {
      if (b.pendingAmount !== a.pendingAmount) return b.pendingAmount - a.pendingAmount;
      return b.totalAmount - a.totalAmount;
    });

    const totalPendingAll = teacherGroups.reduce((sum, g) => sum + g.pendingAmount, 0);
    const totalPaidAll = teacherGroups.reduce((sum, g) => sum + g.paidAmount, 0);
    const teachersWithPendingCount = teacherGroups.filter(g => g.pendingAmount > 0).length;

    // Group payments by student
    const studentMap = new Map();
    payments.forEach(p => {
      const studentId = p.student?.id || p.studentId || (p.student?.email ? `email_${p.student.email}` : 'unknown');
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student: p.student || { id: studentId, name: 'طالب غير محدد', email: '', phone: '', avatar: '' },
          items: [],
          successAmount: 0,
          pendingAmount: 0,
          failedAmount: 0,
          refundedAmount: 0,
          totalAmount: 0
        });
      }
      const grp = studentMap.get(studentId);
      if (p.student) {
        if (!grp.student.name && p.student.name) grp.student.name = p.student.name;
        if (!grp.student.email && p.student.email) grp.student.email = p.student.email;
        if (!grp.student.phone && p.student.phone) grp.student.phone = p.student.phone;
        if (!grp.student.avatar && p.student.avatar) grp.student.avatar = p.student.avatar;
      }
      grp.items.push(p);
      const amt = Number(p.amount || 0);
      grp.totalAmount += amt;
      if (p.status === 'SUCCESS' || !p.status) {
        grp.successAmount += amt;
      } else if (p.status === 'PENDING') {
        grp.pendingAmount += amt;
      } else if (p.status === 'REFUNDED') {
        grp.refundedAmount += amt;
      } else {
        grp.failedAmount += amt;
      }
    });

    const studentGroups = Array.from(studentMap.values());
    studentGroups.sort((a, b) => {
      if (b.pendingAmount !== a.pendingAmount) return b.pendingAmount - a.pendingAmount;
      return b.successAmount - a.successAmount;
    });

    const totalStudentSuccessAll = studentGroups.reduce((sum, g) => sum + g.successAmount, 0);
    const totalStudentPendingAll = studentGroups.reduce((sum, g) => sum + g.pendingAmount, 0);
    const studentsWithPendingCount = studentGroups.filter(g => g.pendingAmount > 0).length;
    const studentsWithSuccessCount = studentGroups.filter(g => g.successAmount > 0).length;

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

      <!-- Section 1: Detailed Student Billings & Payments (Grouped Accordions) -->
      <div class="glass-card" id="admin-billings-section" style="padding:24px; margin-bottom:32px; border-radius:16px;">
        <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:16px; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid var(--border-color);">
          <div>
            <h3 style="font-weight:800; font-size:1.2rem; display:flex; align-items:center; gap:10px; margin:0 0 4px 0; color:var(--text-main);">
              <i data-lucide="receipt" style="color:var(--primary); width:24px; height:24px;"></i>
              سجل مدفوعات وفواتير الطلاب التفصيلية
            </h3>
            <p style="margin:0; font-size:0.85rem; color:var(--text-muted);">عرض مجمّع لكل طالب يشمل إجمالي المبالغ والعمليات، مع جدول فواتير تفصيلي قابل للطي (Accordion)</p>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
            <div style="position:relative;">
              <input type="text" id="admin-student-billing-search" class="form-input" placeholder="بحث باسم الطالب، الهاتف، الفاتورة..." style="padding:8px 12px 8px 36px; font-size:0.85rem; width:240px; border-radius:8px;">
              <i data-lucide="search" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); width:16px; height:16px; color:var(--text-muted);"></i>
            </div>
            <select id="admin-student-billing-filter" class="form-input" style="padding:8px 12px; font-size:0.85rem; border-radius:8px; width:180px;">
              <option value="ALL">جميع الطلاب (${studentGroups.length})</option>
              <option value="SUCCESS">مدفوعات مؤكدة ✅ (${studentsWithSuccessCount})</option>
              <option value="PENDING">معاملات معلقة ⏳ (${studentsWithPendingCount})</option>
            </select>
          </div>
        </div>

        <!-- Quick Summary Metrics Bar for Students -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:24px;">
          <div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.25); border-radius:12px; padding:12px 16px; display:flex; align-items:center; gap:12px;">
            <div style="color:#10b981; background:rgba(16,185,129,0.15); width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="check-circle" style="width:20px; height:20px;"></i>
            </div>
            <div>
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">إجمالي المدفوعات المؤكدة</div>
              <div style="font-size:1.15rem; font-weight:900; color:#10b981;">${formatCurrency(totalStudentSuccessAll)}</div>
            </div>
          </div>

          <div style="background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.25); border-radius:12px; padding:12px 16px; display:flex; align-items:center; gap:12px;">
            <div style="color:#f59e0b; background:rgba(245,158,11,0.15); width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="clock" style="width:20px; height:20px;"></i>
            </div>
            <div>
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">مدفوعات قيد المراجعة</div>
              <div style="font-size:1.15rem; font-weight:900; color:#f59e0b;">${formatCurrency(totalStudentPendingAll)}</div>
            </div>
          </div>

          <div style="background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.25); border-radius:12px; padding:12px 16px; display:flex; align-items:center; gap:12px;">
            <div style="color:var(--primary); background:rgba(99,102,241,0.15); width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="users" style="width:20px; height:20px;"></i>
            </div>
            <div>
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">إجمالي الطلاب المشترين</div>
              <div style="font-size:1.15rem; font-weight:900; color:var(--primary);">${studentGroups.length} طالب</div>
            </div>
          </div>

          <div style="background:rgba(139,92,246,0.08); border:1px solid rgba(139,92,246,0.25); border-radius:12px; padding:12px 16px; display:flex; align-items:center; gap:12px;">
            <div style="color:#8b5cf6; background:rgba(139,92,246,0.15); width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="file-text" style="width:20px; height:20px;"></i>
            </div>
            <div>
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">إجمالي الفواتير والعمليات</div>
              <div style="font-size:1.15rem; font-weight:900; color:#8b5cf6;">${payments.length} عملية</div>
            </div>
          </div>
        </div>

        <!-- Student Accordion Cards List -->
        <div id="admin-student-billings-container" style="display:flex; flex-direction:column; gap:14px;">
          ${studentGroups.length === 0 ? `
            <div style="text-align:center; padding:48px 16px; color:var(--text-muted); background:rgba(0,0,0,0.01); border-radius:12px; border:1px dashed var(--border-color);">
              <i data-lucide="receipt" style="width:48px; height:48px; opacity:0.3; margin-bottom:12px; display:block; margin-inline:auto;"></i>
              <div style="font-weight:700; font-size:1rem; color:var(--text-main);">لا توجد أي فواتير أو عمليات دفع مسجلة للطلاب حتى الآن.</div>
            </div>
          ` : studentGroups.map((sGroup, idx) => {
            const s = sGroup.student;
            const studentAvatar = (s.avatar && !s.avatar.includes('dicebear.com')) ? s.avatar : 'assets/logo.png';
            const cleanWa = s.phone ? getCleanWhatsAppNumber(s.phone) : '';
            const hasPending = sGroup.pendingAmount > 0;
            const statusAttr = hasPending ? 'PENDING' : 'SUCCESS';
            const searchAttr = `${s.name || ''} ${s.phone || ''} ${s.email || ''} ${sGroup.items.map(p => (p.id || '') + ' ' + (p.notes || '')).join(' ')}`.toLowerCase();
            const safeId = (s.id || `std_${idx}`).replace(/[^a-zA-Z0-9_-]/g, '_');

            return `
            <div class="glass-card admin-student-billing-card" data-status="${statusAttr}" data-search="${searchAttr}" style="border-radius:14px; border:1px solid ${hasPending ? 'rgba(245,158,11,0.25)' : 'var(--border-color)'}; overflow:hidden; transition:all 0.2s ease;">
              <!-- Accordion Header ("Above Total") -->
              <div class="admin-student-accordion-header" data-target="student-acc-${safeId}" style="padding:16px 20px; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:16px; background:${hasPending ? 'rgba(245,158,11,0.03)' : 'rgba(0,0,0,0.01)'}; cursor:pointer; user-select:none;">
                
                <!-- Student Info -->
                <div style="display:flex; align-items:center; gap:12px; min-width:230px;">
                  <img src="${studentAvatar}" onerror="this.src='assets/logo.png'" style="width:44px; height:44px; border-radius:50%; object-fit:cover; border:2px solid ${hasPending ? '#f59e0b' : 'var(--primary)'};">
                  <div>
                    <div style="font-weight:800; font-size:1rem; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                      ${s.name || 'طالب غير محدد'}
                      ${hasPending ? `
                        <span class="badge" style="background:rgba(245,158,11,0.15); color:#f59e0b; font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:10px;">
                          معاملات معلقة ⏳
                        </span>
                      ` : `
                        <span class="badge" style="background:rgba(16,185,129,0.12); color:#10b981; font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:10px;">
                          مدفوعات مؤكدة ✅
                        </span>
                      `}
                    </div>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                      ${s.email || ''} ${s.phone ? ` • <span dir="ltr">${s.phone}</span>` : ''}
                    </div>
                  </div>
                  ${cleanWa ? `
                    <a href="https://wa.me/${cleanWa}" target="_blank" onclick="event.stopPropagation();" class="btn-secondary" style="padding:4px 8px; font-size:0.72rem; font-weight:700; color:#10b981; border-color:#10b981; border-radius:8px; text-decoration:none; display:inline-flex; align-items:center; gap:4px;" title="مراسلة واتساب">
                      <i data-lucide="message-circle" style="width:13px; height:13px;"></i>
                      واتساب
                    </a>
                  ` : ''}
                </div>

                <!-- Center: Above Total Display -->
                <div style="display:flex; flex-wrap:wrap; align-items:center; gap:10px;">
                  <!-- Confirmed Success Amount -->
                  <div style="padding:8px 14px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.25); border-radius:10px; text-align:center; min-width:120px;">
                    <div style="font-size:0.7rem; color:#10b981; font-weight:700;">المدفوع المؤكد ✅</div>
                    <div style="font-size:1.15rem; font-weight:900; color:#10b981; margin-top:2px;">${formatCurrency(sGroup.successAmount)}</div>
                  </div>

                  <!-- Pending Amount if any -->
                  ${hasPending ? `
                    <div style="padding:8px 14px; background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.3); border-radius:10px; text-align:center; min-width:115px;">
                      <div style="font-size:0.7rem; color:#f59e0b; font-weight:700;">قيد المراجعة ⏳</div>
                      <div style="font-size:1.15rem; font-weight:900; color:#f59e0b; margin-top:2px;">${formatCurrency(sGroup.pendingAmount)}</div>
                    </div>
                  ` : ''}

                  <!-- Invoices Count -->
                  <div style="padding:8px 14px; background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.25); border-radius:10px; text-align:center; min-width:100px;">
                    <div style="font-size:0.7rem; color:var(--primary); font-weight:700;">عدد الفواتير 🧾</div>
                    <div style="font-size:1.15rem; font-weight:900; color:var(--primary); margin-top:2px;">${sGroup.items.length}</div>
                  </div>

                  <!-- Total All Transactions Amount -->
                  <div style="padding:8px 14px; background:rgba(0,0,0,0.03); border:1px solid var(--border-color); border-radius:10px; text-align:center; min-width:110px;">
                    <div style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">إجمالي العمليات 💰</div>
                    <div style="font-size:1.15rem; font-weight:900; color:var(--text-main); margin-top:2px;">${formatCurrency(sGroup.totalAmount)}</div>
                  </div>
                </div>

                <!-- Actions & Accordion Toggle -->
                <div style="display:flex; align-items:center; gap:8px;" onclick="event.stopPropagation();">
                  <button type="button" class="btn-secondary admin-toggle-student-accordion-btn" data-target="student-acc-${safeId}" data-count="${sGroup.items.length}" style="padding:8px 14px; font-size:0.82rem; font-weight:700; border-radius:10px; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                    <span class="accordion-label">الفواتير (${sGroup.items.length})</span>
                    <i data-lucide="chevron-down" class="accordion-chevron" style="width:16px; height:16px; transition:transform 0.25s ease;"></i>
                  </button>
                </div>
              </div>

              <!-- Accordion Body (Collapsible Details Table) -->
              <div id="student-acc-${safeId}" class="student-accordion-details" style="display:none; padding:16px 20px; border-top:1px solid var(--border-color); background:rgba(0,0,0,0.015);">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                  <div style="font-weight:700; font-size:0.85rem; color:var(--text-main); display:flex; align-items:center; gap:6px;">
                    <i data-lucide="receipt" style="width:15px; height:15px; color:var(--primary);"></i>
                    سجل فواتير ومدفوعات الطالب (${sGroup.items.length} معاملة)
                  </div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">
                    المؤكدة: <b style="color:#10b981;">${sGroup.items.filter(p => p.status === 'SUCCESS' || !p.status).length}</b> | قيد المراجعة: <b style="color:#f59e0b;">${sGroup.items.filter(p => p.status === 'PENDING').length}</b>
                  </div>
                </div>

                <div style="overflow-x:auto;">
                  <table class="table" style="width:100%; text-align:start; border-collapse:collapse;">
                    <thead>
                      <tr style="border-bottom:1px solid var(--border-color); color:var(--text-muted); font-size:0.82rem; background:rgba(0,0,0,0.02);">
                        <th style="padding:10px; font-weight:700;">رقم الفاتورة</th>
                        <th style="padding:10px; font-weight:700;">البند / تفاصيل الشراء</th>
                        <th style="padding:10px; font-weight:700;">المبلغ</th>
                        <th style="padding:10px; font-weight:700;">طريقة الدفع</th>
                        <th style="padding:10px; font-weight:700;">الحالة</th>
                        <th style="padding:10px; font-weight:700;">التاريخ</th>
                        <th style="padding:10px; font-weight:700; text-align:center;">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${this.renderBillingsTableRows(sGroup.items, false)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Section 2: Teacher Payouts Grouped Accordions -->
      <div class="glass-card" id="admin-payouts-section" style="padding:24px; border-radius:16px;">
        <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:16px; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid var(--border-color);">
              <div>
                <h3 style="font-weight:800; font-size:1.2rem; display:flex; align-items:center; gap:10px; margin:0 0 4px 0; color:var(--text-main);">
                  <i data-lucide="wallet" style="color:var(--warning,#f59e0b); width:24px; height:24px;"></i>
                  مستحقات المعلمين (Teacher Payouts)
                </h3>
                <p style="margin:0; font-size:0.85rem; color:var(--text-muted);">عرض مجمّع لكل معلم يشمل إجمالي المستحقات، إمكانية السداد الكامل أو الجزئي، وسجل تفصيلي قابل للطي (Accordion)</p>
              </div>
              <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                <div style="position:relative;">
                  <input type="text" id="admin-teacher-payout-search" class="form-input" placeholder="بحث باسم المعلم، الهاتف، البريد..." style="padding:8px 12px 8px 36px; font-size:0.85rem; width:220px; border-radius:8px;">
                  <i data-lucide="search" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); width:16px; height:16px; color:var(--text-muted);"></i>
                </div>
                <select id="admin-teacher-payout-filter" class="form-input" style="padding:8px 12px; font-size:0.85rem; border-radius:8px; width:170px;">
                  <option value="ALL">جميع المعلمين (${teacherGroups.length})</option>
                  <option value="PENDING">بانتظار السداد ⏳ (${teachersWithPendingCount})</option>
                  <option value="PAID">مسدد بالكامل ✅ (${teacherGroups.length - teachersWithPendingCount})</option>
                </select>
              </div>
            </div>

            <!-- Quick Summary Metrics Bar -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:24px;">
              <div style="background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.25); border-radius:12px; padding:12px 16px; display:flex; align-items:center; gap:12px;">
                <div style="color:#f59e0b; background:rgba(245,158,11,0.15); width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center;">
                  <i data-lucide="clock" style="width:20px; height:20px;"></i>
                </div>
                <div>
                  <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">إجمالي المطلوب سداده (معلق)</div>
                  <div style="font-size:1.15rem; font-weight:900; color:#f59e0b;">${formatCurrency(totalPendingAll)}</div>
                </div>
              </div>

              <div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.25); border-radius:12px; padding:12px 16px; display:flex; align-items:center; gap:12px;">
                <div style="color:#10b981; background:rgba(16,185,129,0.15); width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center;">
                  <i data-lucide="check-circle-2" style="width:20px; height:20px;"></i>
                </div>
                <div>
                  <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">إجمالي ما تم سداده وصرفه</div>
                  <div style="font-size:1.15rem; font-weight:900; color:#10b981;">${formatCurrency(totalPaidAll)}</div>
                </div>
              </div>

              <div style="background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.25); border-radius:12px; padding:12px 16px; display:flex; align-items:center; gap:12px;">
                <div style="color:var(--primary); background:rgba(99,102,241,0.15); width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center;">
                  <i data-lucide="users" style="width:20px; height:20px;"></i>
                </div>
                <div>
                  <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">معلمون لديهم مستحقات معلقة</div>
                  <div style="font-size:1.15rem; font-weight:900; color:var(--text-main);">${teachersWithPendingCount} من أصل ${teacherGroups.length}</div>
                </div>
              </div>
            </div>

            <!-- Teacher Accordion Cards List -->
            <div id="admin-teacher-payouts-container" style="display:flex; flex-direction:column; gap:14px;">
              ${teacherGroups.length === 0 ? `
                <div style="text-align:center; padding:48px 16px; color:var(--text-muted); background:rgba(0,0,0,0.01); border-radius:12px; border:1px dashed var(--border-color);">
                  <i data-lucide="wallet" style="width:48px; height:48px; opacity:0.3; margin-bottom:12px; display:block; margin-inline:auto;"></i>
                  <div style="font-weight:700; font-size:1rem; color:var(--text-main);">لا توجد أي مستحقات مسجلة للمعلمين حتى الآن.</div>
                  <div style="font-size:0.8rem; margin-top:4px;">ستظهر مستحقات المعلمين هنا تلقائياً عند بيع الدورات أو إتمام الحصص الدراسية.</div>
                </div>
              ` : teacherGroups.map(tGroup => {
                const t = tGroup.teacher;
                const teacherAvatar = (t.avatar && !t.avatar.includes('dicebear.com')) ? t.avatar : 'assets/logo.png';
                const cleanWa = t.phone ? getCleanWhatsAppNumber(t.phone) : '';
                const hasPending = tGroup.pendingAmount > 0;
                const statusAttr = hasPending ? 'PENDING' : 'PAID';
                const searchAttr = `${t.name || ''} ${t.phone || ''} ${t.email || ''}`.toLowerCase();

                return `
                <div class="glass-card admin-teacher-payout-card" data-status="${statusAttr}" data-search="${searchAttr}" style="border-radius:14px; border:1px solid ${hasPending ? 'rgba(245,158,11,0.25)' : 'var(--border-color)'}; overflow:hidden; transition:all 0.2s ease;">
                  <!-- Accordion Header ("Above Total") -->
                  <div class="admin-teacher-accordion-header" data-target="teacher-acc-${t.id}" style="padding:16px 20px; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:16px; background:${hasPending ? 'rgba(245,158,11,0.03)' : 'rgba(0,0,0,0.01)'}; cursor:pointer; user-select:none;">
                    
                    <!-- Teacher Info -->
                    <div style="display:flex; align-items:center; gap:12px; min-width:230px;">
                      <img src="${teacherAvatar}" onerror="this.src='assets/logo.png'" style="width:44px; height:44px; border-radius:50%; object-fit:cover; border:2px solid ${hasPending ? '#f59e0b' : 'var(--primary)'};">
                      <div>
                        <div style="font-weight:800; font-size:1rem; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                          ${t.name || 'معلم غير محدد'}
                          ${hasPending ? `
                            <span class="badge" style="background:rgba(245,158,11,0.15); color:#f59e0b; font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:10px;">
                              مستحق سداد ⏳
                            </span>
                          ` : `
                            <span class="badge" style="background:rgba(16,185,129,0.12); color:#10b981; font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:10px;">
                              مسدد بالكامل ✅
                            </span>
                          `}
                        </div>
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                          ${t.email || ''} ${t.phone ? ` • <span dir="ltr">${t.phone}</span>` : ''}
                        </div>
                      </div>
                      ${cleanWa ? `
                        <a href="https://wa.me/${cleanWa}" target="_blank" onclick="event.stopPropagation();" class="btn-secondary" style="padding:4px 8px; font-size:0.72rem; font-weight:700; color:#10b981; border-color:#10b981; border-radius:8px; text-decoration:none; display:inline-flex; align-items:center; gap:4px;" title="مراسلة واتساب">
                          <i data-lucide="message-circle" style="width:13px; height:13px;"></i>
                          واتساب
                        </a>
                      ` : ''}
                    </div>

                    <!-- Center: Above Total Display -->
                    <div style="display:flex; flex-wrap:wrap; align-items:center; gap:10px;">
                      <!-- Required Pending Payout -->
                      <div style="padding:8px 14px; background:${hasPending ? 'rgba(245,158,11,0.12)' : 'rgba(0,0,0,0.03)'}; border:1px solid ${hasPending ? 'rgba(245,158,11,0.3)' : 'var(--border-color)'}; border-radius:10px; text-align:center; min-width:125px;">
                        <div style="font-size:0.7rem; color:${hasPending ? '#f59e0b' : 'var(--text-muted)'}; font-weight:700;">المطلوب سداده (معلق) ⏳</div>
                        <div style="font-size:1.15rem; font-weight:900; color:${hasPending ? '#f59e0b' : 'var(--text-muted)'}; margin-top:2px;">${formatCurrency(tGroup.pendingAmount)}</div>
                      </div>

                      <!-- Paid Previously -->
                      <div style="padding:8px 14px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.25); border-radius:10px; text-align:center; min-width:110px;">
                        <div style="font-size:0.7rem; color:#10b981; font-weight:700;">تم سداده سابقاً ✅</div>
                        <div style="font-size:1.15rem; font-weight:900; color:#10b981; margin-top:2px;">${formatCurrency(tGroup.paidAmount)}</div>
                      </div>

                      <!-- Total Earnings -->
                      <div style="padding:8px 14px; background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.25); border-radius:10px; text-align:center; min-width:110px;">
                        <div style="font-size:0.7rem; color:var(--primary); font-weight:700;">إجمالي الأرباح 💎</div>
                        <div style="font-size:1.15rem; font-weight:900; color:var(--primary); margin-top:2px;">${formatCurrency(tGroup.totalAmount)}</div>
                      </div>
                    </div>

                    <!-- Actions & Accordion Toggle -->
                    <div style="display:flex; align-items:center; gap:8px;" onclick="event.stopPropagation();">
                      ${hasPending ? `
                        <button type="button" class="btn-primary admin-pay-teacher-btn" data-teacher-id="${t.id}" style="padding:8px 16px; font-size:0.85rem; font-weight:800; border-radius:10px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 12px rgba(99,102,241,0.25);">
                          <i data-lucide="send" style="width:14px; height:14px;"></i>
                          تسديد المستحقات 💸
                        </button>
                      ` : ''}
                      <button type="button" class="btn-secondary admin-toggle-teacher-accordion-btn" data-target="teacher-acc-${t.id}" data-count="${tGroup.items.length}" style="padding:8px 14px; font-size:0.82rem; font-weight:700; border-radius:10px; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                        <span class="accordion-label">التفاصيل (${tGroup.items.length})</span>
                        <i data-lucide="chevron-down" class="accordion-chevron" style="width:16px; height:16px; transition:transform 0.25s ease;"></i>
                      </button>
                    </div>
                  </div>

                  <!-- Accordion Body (Collapsible Details Table) -->
                  <div id="teacher-acc-${t.id}" class="teacher-accordion-details" style="display:none; padding:16px 20px; border-top:1px solid var(--border-color); background:rgba(0,0,0,0.015);">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                      <div style="font-weight:700; font-size:0.85rem; color:var(--text-main); display:flex; align-items:center; gap:6px;">
                        <i data-lucide="list" style="width:15px; height:15px; color:var(--primary);"></i>
                        سجل العمليات والمستحقات الفردية (${tGroup.items.length} معاملة)
                      </div>
                      <div style="font-size:0.75rem; color:var(--text-muted);">
                        المعلقة: <b style="color:#f59e0b;">${tGroup.items.filter(i => i.status === 'pending').length}</b> | المسددة: <b style="color:#10b981;">${tGroup.items.filter(i => i.status === 'paid').length}</b>
                      </div>
                    </div>

                    <div style="overflow-x:auto;">
                      <table class="table" style="width:100%; text-align:start; border-collapse:collapse; font-size:0.82rem;">
                        <thead>
                          <tr style="border-bottom:1px solid var(--border-color); color:var(--text-muted); font-size:0.76rem; background:rgba(0,0,0,0.02);">
                            <th style="padding:10px; font-weight:700;">نوع المعاملة / الوصف</th>
                            <th style="padding:10px; font-weight:700;">المبلغ</th>
                            <th style="padding:10px; font-weight:700;">الحالة</th>
                            <th style="padding:10px; font-weight:700;">طريقة السداد / المرجع</th>
                            <th style="padding:10px; font-weight:700;">التاريخ</th>
                            <th style="padding:10px; font-weight:700; text-align:center;">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${tGroup.items.map(ear => {
                            const methodLabel = ear.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' :
                                                ear.paymentMethod === 'instapay' ? 'إنستاباي' :
                                                ear.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' :
                                                ear.paymentMethod === 'orange_cash' ? 'أورنج كاش' :
                                                ear.paymentMethod === 'etisalat_cash' ? 'اتصالات كاش' :
                                                ear.paymentMethod === 'we_pay' ? 'وي باي' :
                                                ear.paymentMethod === 'manual' ? 'تسليم نقدي' :
                                                (ear.paymentMethod || '');
                            const sourceLabel = ear.sourceType === 'COURSE_SALE' ? 'بيع كورس' : ear.sourceType === 'SESSION_COMPLETED' ? 'جلسة منجزة' : ear.sourceType;

                            return `
                              <tr style="border-bottom:1px solid var(--border-color); font-size:0.82rem;">
                                <td style="padding:10px;">
                                  <div style="font-weight:700; color:var(--text-main);">${sourceLabel}</div>
                                  ${ear.description ? `<div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">${ear.description}</div>` : ''}
                                  ${ear.notes ? `<div style="font-size:0.7rem; color:var(--text-muted); background:rgba(0,0,0,0.03); padding:2px 6px; border-radius:4px; margin-top:3px; display:inline-block;">ملاحظة: ${ear.notes}</div>` : ''}
                                </td>
                                <td style="padding:10px; color:var(--primary); font-weight:800; font-size:0.92rem; white-space:nowrap;">
                                  ${ear.amount} ${ear.currency || 'ج.م'}
                                </td>
                                <td style="padding:10px; white-space:nowrap;">
                                  <span class="badge" style="background:${ear.status === 'paid' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)'}; color:${ear.status === 'paid' ? '#10b981' : '#f59e0b'}; font-weight:800; padding:3px 8px; border-radius:10px;">
                                    ${ear.status === 'paid' ? 'مدفوعة ✅' : 'معلقة ⏳'}
                                  </span>
                                </td>
                                <td style="padding:10px;">
                                  ${methodLabel ? `<div style="font-weight:600; font-size:0.76rem; color:var(--text-main);">${methodLabel}</div>` : '<span style="color:var(--text-muted); font-size:0.75rem;">-</span>'}
                                  ${ear.transactionRef ? `<div style="font-size:0.7rem; color:var(--text-muted); font-family:monospace; margin-top:2px;">Ref: ${ear.transactionRef}</div>` : ''}
                                </td>
                                <td style="padding:10px; color:var(--text-muted); font-size:0.76rem; white-space:nowrap;">
                                  <div>${new Date(ear.createdAt).toLocaleDateString('ar')}</div>
                                  ${ear.paidAt ? `<div style="font-size:0.7rem; color:#10b981; margin-top:2px;">سُدد: ${new Date(ear.paidAt).toLocaleDateString('ar')}</div>` : ''}
                                </td>
                                <td style="padding:10px; text-align:center; white-space:nowrap;">
                                  ${ear.status === 'pending' ? `
                                    <div style="display:inline-flex; align-items:center; gap:5px;">
                                      <button type="button" class="btn-primary admin-pay-earning-btn" data-id="${ear.id}" style="padding:5px 10px; font-size:0.75rem; font-weight:700; border-radius:6px; display:inline-flex; align-items:center; gap:4px;">
                                        <i data-lucide="send" style="width:12px; height:12px;"></i>
                                        تسديد
                                      </button>
                                      <button type="button" class="btn-secondary admin-delete-earning-btn" data-id="${ear.id}" style="padding:5px 7px; font-size:0.75rem; font-weight:700; color:#ef4444; border-color:rgba(239,68,68,0.3); border-radius:6px; display:inline-flex; align-items:center;" title="حذف سجل المستحق نهائياً">
                                        <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
                                      </button>
                                    </div>
                                  ` : `
                                    <div style="display:inline-flex; align-items:center; gap:4px;">
                                      ${ear.receiptUrl ? `
                                        <a href="${ear.receiptUrl}" target="_blank" class="btn-secondary" style="padding:4px 8px; font-size:0.72rem; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:4px; color:var(--primary); border-color:var(--primary); border-radius:6px;" title="عرض إيصال التحويل">
                                          <i data-lucide="receipt" style="width:12px; height:12px;"></i>
                                          الإيصال 📄
                                        </a>
                                        <button type="button" class="btn-secondary admin-delete-earning-receipt-btn" data-id="${ear.id}" style="padding:4px 8px; font-size:0.72rem; font-weight:700; color:#ef4444; border-color:rgba(239,68,68,0.3); border-radius:6px; display:inline-flex; align-items:center; gap:4px;" title="حذف الإيصال والتراجع عن السداد">
                                          <i data-lucide="rotate-ccw" style="width:12px; height:12px;"></i>
                                          تراجع 🔄
                                        </button>
                                      ` : ''}
                                      <button type="button" class="btn-secondary admin-delete-earning-btn" data-id="${ear.id}" style="padding:4px 6px; font-size:0.72rem; font-weight:700; color:#ef4444; border-color:rgba(239,68,68,0.3); border-radius:6px; display:inline-flex; align-items:center;" title="حذف سجل المستحق">
                                        <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
                                      </button>
                                    </div>
                                  `}
                                </td>
                              </tr>
                            `;
                          }).join('')}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                `;
              }).join('')}
            </div>
      </div>
    `;
  },

  renderBillingsTableRows(payments, showStudent = false) {
    if (!payments || payments.length === 0) {
      const colspan = showStudent ? 8 : 7;
      return `<tr><td colspan="${colspan}" style="text-align:center; padding:32px; color:var(--text-muted);">لا توجد فواتير أو عمليات دفع مسجلة بعد.</td></tr>`;
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
          <td style="padding:10px 12px; font-weight:700; font-family:monospace; color:var(--text-muted); font-size:0.78rem;">${shortId}</td>
          ${showStudent ? `
            <td style="padding:10px 12px;">
              <div style="display:flex; align-items:center; gap:10px;">
                <img src="${studentAvatar}" onerror="this.src='assets/logo.png'" style="width:32px; height:32px; border-radius:50%; object-fit:cover; border:1px solid var(--border-color);">
                <div>
                  <div style="font-weight:700; color:var(--text-main);">${studentName}</div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">${studentEmail}</div>
                </div>
              </div>
            </td>
          ` : ''}
          <td style="padding:10px 12px;">
            <div style="font-weight:600; margin-bottom:3px;">${itemTitle}</div>
            ${itemBadge}
          </td>
          <td style="padding:10px 12px; font-weight:800; color:var(--success); font-size:0.95rem;">${p.amount || 0} ج.م</td>
          <td style="padding:10px 12px;">
            <span style="display:inline-flex; align-items:center; gap:4px; font-size:0.78rem; font-weight:600; padding:3px 8px; border-radius:6px; background:rgba(0,0,0,0.04); color:var(--text-main);">
              💳 ${p.provider || 'تحويل مباشر'}
            </span>
          </td>
          <td style="padding:10px 12px;">
            <span class="badge" style="background:${st.bg}; color:${st.color}; font-weight:700; padding:3px 8px; font-size:0.75rem;">
              ${st.text}
            </span>
          </td>
          <td style="padding:10px 12px; font-size:0.78rem; color:var(--text-muted);">${formattedDate}</td>
          <td style="padding:10px 12px; text-align:center;">
            <div style="display:flex; gap:6px; justify-content:center; align-items:center;">
              <button class="btn-secondary admin-view-payment-details-btn" data-id="${p.id}" style="padding:4px 8px; font-size:0.75rem; font-weight:600; display:inline-flex; align-items:center; gap:4px;" title="عرض التفاصيل كاملة">
                <i data-lucide="eye" style="width:13px; height:13px;"></i> تفاصيل
              </button>
              ${p.receiptUrl ? `
                <a href="${p.receiptUrl}" target="_blank" class="btn-secondary" style="padding:4px 8px; font-size:0.75rem; font-weight:600; text-decoration:none; display:inline-flex; align-items:center; gap:4px; color:var(--primary); border-color:var(--primary);" title="عرض صورة الإيصال">
                  <i data-lucide="file-text" style="width:13px; height:13px;"></i> الإيصال
                </a>
              ` : ''}
              <button class="btn-secondary admin-delete-payment-btn" data-id="${p.id}" style="padding:4px 8px; font-size:0.75rem; font-weight:600; color:#ef4444; border-color:rgba(239,68,68,0.3); display:inline-flex; align-items:center; gap:4px;" title="حذف الفاتورة">
                <i data-lucide="trash-2" style="width:13px; height:13px;"></i> حذف
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

  async handleRevertTeacherPayout(earningId) {
    if (!earningId) return;
    const confirmed = await confirmDialog({
      title: "تأكيد حذف الإيصال والتراجع عن السداد ⚠️",
      message: "هل أنت متأكد من حذف إيصال التحويل والتراجع عن تسديد هذا المستحق؟ سيعود المستحق لحالة 'معلقة ⏳' لتتمكن من إعادة التسديد ورفع الإيصال الصحيح.",
      danger: true,
      confirmText: "نعم، احذف الإيصال وتراجع",
      cancelText: "إلغاء"
    });
    if (!confirmed) return;

    try {
      const res = await apiFetch(`/admin/teacher-earnings/${earningId}/receipt`, {
        method: "DELETE"
      });
      showToast(res.message || "تم حذف الإيصال والتراجع عن السداد بنجاح", "success");
      if (typeof this.loadAllData === "function") {
        await this.loadAllData();
      }
      if (typeof this.renderTab === "function") {
        this.renderTab("earnings");
      }
    } catch (err) {
      showToast(err.message || "تعذر حذف الإيصال والتراجع عن السداد", "error");
    }
  },

  async handleDeleteTeacherEarning(earningId) {
    if (!earningId) return;
    const confirmed = await confirmDialog({
      title: "تأكيد حذف سجل المستحقات ⚠️",
      message: "هل أنت متأكد من حذف هذا السجل المالي نهائياً؟ لا يمكن التراجع عن هذا الإجراء.",
      danger: true,
      confirmText: "نعم، حذف السجل",
      cancelText: "إلغاء"
    });
    if (!confirmed) return;

    try {
      const res = await apiFetch(`/admin/teacher-earnings/${earningId}`, {
        method: "DELETE"
      });
      showToast(res.message || "تم حذف سجل المستحقات بنجاح", "success");
      if (typeof this.loadAllData === "function") {
        await this.loadAllData();
      }
      if (typeof this.renderTab === "function") {
        this.renderTab("earnings");
      }
    } catch (err) {
      showToast(err.message || "تعذر حذف سجل المستحقات", "error");
    }
  },

  renderPayTeacherModal(teacherId) {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const e = this.adminEarnings || { earnings: [] };
    const teacherEarnings = (e.earnings || []).filter(item => item.teacher?.id === teacherId);
    if (!teacherEarnings || teacherEarnings.length === 0) {
      showToast("تعذر العثور على بيانات المعلم.", "error");
      return;
    }

    const teacher = teacherEarnings[0].teacher;
    const teacherName = teacher?.name || 'معلم غير محدد';
    const teacherEmail = teacher?.email || '';
    const teacherPhone = teacher?.phone || '';
    const teacherAvatar = (teacher?.avatar && !teacher.avatar.includes('dicebear.com')) ? teacher.avatar : 'assets/logo.png';
    const cleanWa = teacherPhone ? getCleanWhatsAppNumber(teacherPhone) : '';

    const pendingEarnings = teacherEarnings.filter(item => item.status === 'pending');
    const totalPending = Math.round(pendingEarnings.reduce((sum, item) => sum + Number(item.amount || 0), 0) * 100) / 100;
    const totalPaid = Math.round(teacherEarnings.filter(item => item.status === 'paid').reduce((sum, item) => sum + Number(item.amount || 0), 0) * 100) / 100;
    const totalEarned = Math.round((totalPending + totalPaid) * 100) / 100;

    if (totalPending <= 0) {
      showToast("تمت تسوية كافة مستحقات هذا المعلم بالكامل بالفعل ✅", "info");
      return;
    }

    const formatCurrency = (val) => `${Number(val || 0).toLocaleString('ar-EG')} ج.م`;

    container.innerHTML = `
      <div class="modal-overlay" id="pay-teacher-modal" style="display:flex; z-index:99999;">
        <div class="modal-content" style="max-width:560px; border-radius:18px; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,0.25);">
          <div class="modal-header" style="background:var(--bg-card); border-bottom:1px solid var(--border-color); padding:16px 20px;">
            <h3 class="modal-title" style="display:flex; align-items:center; gap:8px; font-weight:800; font-size:1.15rem; margin:0;">
              <i data-lucide="wallet" style="color:var(--primary); width:22px; height:22px;"></i>
              تسديد مستحقات المعلم (كلي أو جزئي)
            </h3>
            <span class="modal-close-btn" id="close-pay-teacher-modal" style="cursor:pointer; font-size:1.5rem; line-height:1;">&times;</span>
          </div>

          <div class="modal-body" style="padding:22px; max-height:80vh; overflow-y:auto;">
            <!-- Teacher Header Card -->
            <div style="display:flex; align-items:center; justify-content:space-between; gap:14px; padding:14px; background:rgba(0,0,0,0.02); border-radius:14px; border:1px solid var(--border-color); margin-bottom:16px;">
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

            <!-- Financial Summary Banner -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:14px; background:rgba(245,158,11,0.06); border:1px solid rgba(245,158,11,0.25); border-radius:12px; margin-bottom:18px;">
              <div>
                <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">المطلوب سداده الآن (معلق):</div>
                <div style="font-size:1.35rem; font-weight:900; color:#f59e0b; margin-top:2px;">${formatCurrency(totalPending)}</div>
              </div>
              <div>
                <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">معاملات معلقة:</div>
                <div style="font-size:0.95rem; font-weight:800; color:var(--text-main); margin-top:4px;">${pendingEarnings.length} معاملة بانتظار التحويل</div>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">سُدد سابقاً: ${formatCurrency(totalPaid)}</div>
              </div>
            </div>

            <form id="pay-teacher-form" style="display:flex; flex-direction:column; gap:16px;">
              
              <!-- Payment Amount Type Quick Toggles -->
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:8px; color:var(--text-main);">
                  تحديد قيمة المبلغ المراد سداده <span style="color:var(--danger,#ef4444);">*</span>
                </label>
                <div style="display:flex; gap:8px; margin-bottom:10px;">
                  <button type="button" id="pay-teacher-full-btn" class="btn-primary" style="flex:1; padding:8px 12px; font-size:0.82rem; font-weight:700; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; gap:6px;">
                    <i data-lucide="check-check" style="width:14px; height:14px;"></i>
                    سداد كامل المبلغ (${totalPending} ج.م)
                  </button>
                  <button type="button" id="pay-teacher-partial-btn" class="btn-secondary" style="flex:1; padding:8px 12px; font-size:0.82rem; font-weight:700; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; gap:6px;">
                    <i data-lucide="scissors" style="width:14px; height:14px;"></i>
                    سداد دفعة جزئية (مبلغ أقل)
                  </button>
                </div>
                <div style="position:relative;">
                  <input type="number" id="pay-teacher-amount-input" step="any" min="1" max="${totalPending}" value="${totalPending}" class="form-control" style="width:100%; padding:10px 14px 10px 60px; border-radius:10px; border:2px solid var(--primary); font-size:1.15rem; font-weight:900; background:var(--bg-input, var(--bg-card)); color:var(--text-main);">
                  <span style="position:absolute; left:14px; top:50%; transform:translateY(-50%); font-weight:800; color:var(--text-muted); font-size:0.9rem;">ج.م</span>
                </div>
              </div>

              <!-- Live Balance Remaining Preview Box ("Show what be") -->
              <div id="pay-teacher-live-preview" style="padding:14px; border-radius:12px; border:1px solid rgba(16,185,129,0.3); background:rgba(16,185,129,0.06); transition:all 0.2s ease;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <span style="font-size:0.8rem; font-weight:700; color:var(--text-muted);">المبلغ المسدد الآن:</span>
                  <span id="preview-paid-now" style="font-weight:900; font-size:1.05rem; color:var(--primary);">${totalPending} ج.م</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; padding-top:6px; border-top:1px dashed var(--border-color); margin-bottom:6px;">
                  <span style="font-size:0.8rem; font-weight:700; color:var(--text-muted);">المبلغ المتبقي المستحق للمعلم:</span>
                  <span id="preview-remaining-balance" style="font-weight:900; font-size:1.05rem; color:#10b981;">0 ج.م</span>
                </div>
                <div id="preview-status-notice" style="font-size:0.78rem; font-weight:700; color:#10b981; margin-top:4px;">
                  ✅ سداد كامل المبلغ: سيتم تسوية كامل مستحقات المعلم بنجاح وتصبح المستحقات المعلقة 0 ج.م.
                </div>
              </div>

              <!-- Payment Method Selection -->
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">
                  طريقة التحويل / وسيلة الدفع <span style="color:var(--danger,#ef4444);">*</span>
                </label>
                <select id="pay-teacher-method" class="form-control" style="width:100%; padding:10px 14px; border-radius:10px; border:1px solid var(--border-color); font-weight:600; font-size:0.9rem; background:var(--bg-input, var(--bg-card)); color:var(--text-main);">
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
                <input type="text" id="pay-teacher-txid" class="form-control" placeholder="مثال: IPN1234567890 أو رقم العملية" style="width:100%; padding:10px 14px; border-radius:10px; border:1px solid var(--border-color); font-size:0.9rem; font-family:monospace; background:var(--bg-input, var(--bg-card)); color:var(--text-main);">
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">اختياري: رقم المعاملة من تطبيق البنك أو المحفظة الإلكترونية لسهولة التتبع.</div>
              </div>

              <!-- Receipt Proof Upload (Mandatory) -->
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">
                  صورة إيصال التحويل (Proof of Payment) <span style="color:var(--danger,#ef4444);">* (إجباري)</span>
                </label>
                <div id="pay-teacher-dropzone" style="border:2px dashed var(--border-color); border-radius:14px; padding:20px; text-align:center; background:rgba(0,0,0,0.01); cursor:pointer; transition:all 0.2s ease;">
                  <input type="file" id="pay-teacher-file" accept="image/*,application/pdf" style="display:none;">
                  <div id="pay-teacher-upload-prompt">
                    <i data-lucide="upload-cloud" style="width:36px; height:36px; color:var(--primary); margin-bottom:8px; opacity:0.8;"></i>
                    <div style="font-weight:700; font-size:0.9rem; color:var(--text-main);">انقر لاختيار صورة الإيصال أو اسحب الملف هنا</div>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">يدعم الصور (PNG, JPG, WEBP) وملفات PDF (بحد أقصى 10 ميجابايت)</div>
                  </div>
                  <div id="pay-teacher-file-preview" style="display:none; flex-direction:column; align-items:center; gap:10px;">
                    <img id="pay-teacher-preview-img" src="" style="max-height:160px; max-width:100%; border-radius:8px; object-fit:contain; border:1px solid var(--border-color); display:none;">
                    <div id="pay-teacher-file-info" style="font-weight:700; font-size:0.85rem; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                      <i data-lucide="file-check" style="color:var(--success); width:18px; height:18px;"></i>
                      <span id="pay-teacher-file-name"></span>
                    </div>
                    <button type="button" id="pay-teacher-remove-file" class="btn-secondary" style="font-size:0.75rem; padding:4px 10px; border-radius:6px; color:var(--danger); border-color:var(--danger);">
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
                <textarea id="pay-teacher-notes" rows="2" class="form-control" placeholder="أي ملاحظات موجهة للمعلم أو للإدارة بشأن هذه الدفعة..." style="width:100%; padding:10px 14px; border-radius:10px; border:1px solid var(--border-color); font-size:0.88rem; background:var(--bg-input, var(--bg-card)); color:var(--text-main); resize:vertical;"></textarea>
              </div>

              <!-- Action Buttons -->
              <div style="display:flex; gap:10px; margin-top:8px;">
                <button type="submit" id="pay-teacher-submit-btn" class="btn-primary" style="flex:1; padding:12px; font-weight:800; font-size:0.95rem; border-radius:10px; display:inline-flex; align-items:center; justify-content:center; gap:8px;">
                  <i data-lucide="check-circle" style="width:18px; height:18px;"></i>
                  <span>تأكيد تسديد المبلغ (<span id="pay-submit-btn-amt">${totalPending}</span> ج.م) ورفع الإيصال 💸</span>
                </button>
                <button type="button" id="cancel-pay-teacher-btn" class="btn-secondary" style="padding:12px 20px; font-weight:700; border-radius:10px;">
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
    document.getElementById("close-pay-teacher-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-pay-teacher-btn")?.addEventListener("click", closeModal);

    const amountInput = document.getElementById("pay-teacher-amount-input");
    const previewBox = document.getElementById("pay-teacher-live-preview");
    const previewPaidNow = document.getElementById("preview-paid-now");
    const previewRemaining = document.getElementById("preview-remaining-balance");
    const previewStatus = document.getElementById("preview-status-notice");
    const submitBtnAmt = document.getElementById("pay-submit-btn-amt");
    const fullBtn = document.getElementById("pay-teacher-full-btn");
    const partialBtn = document.getElementById("pay-teacher-partial-btn");

    const updatePreview = () => {
      const val = parseFloat(amountInput.value);
      if (isNaN(val) || val <= 0) {
        previewPaidNow.textContent = "0 ج.م";
        previewRemaining.textContent = `${totalPending} ج.م`;
        previewBox.style.background = "rgba(239,68,68,0.06)";
        previewBox.style.borderColor = "rgba(239,68,68,0.3)";
        previewStatus.style.color = "#ef4444";
        previewStatus.textContent = "⚠️ يرجى إدخال مبلغ صحيح أكبر من الصفر.";
        submitBtnAmt.textContent = "0";
        return;
      }

      if (val > totalPending) {
        previewPaidNow.textContent = `${val} ج.م`;
        previewRemaining.textContent = "0 ج.م";
        previewBox.style.background = "rgba(239,68,68,0.06)";
        previewBox.style.borderColor = "rgba(239,68,68,0.3)";
        previewStatus.style.color = "#ef4444";
        previewStatus.textContent = `⚠️ تنبيه: المبلغ المدخل يتجاوز إجمالي المستحقات المعلقة (${totalPending} ج.م)!`;
        submitBtnAmt.textContent = String(val);
        return;
      }

      const remaining = Math.max(0, Math.round((totalPending - val) * 100) / 100);
      previewPaidNow.textContent = `${val} ج.م`;
      previewRemaining.textContent = `${remaining} ج.م`;
      submitBtnAmt.textContent = String(val);

      if (remaining === 0) {
        previewBox.style.background = "rgba(16,185,129,0.06)";
        previewBox.style.borderColor = "rgba(16,185,129,0.3)";
        previewRemaining.style.color = "#10b981";
        previewStatus.style.color = "#10b981";
        previewStatus.innerHTML = `✅ <b>سداد كامل المبلغ:</b> سيتم تسوية كامل المستحقات، والمبلغ المتبقي المستحق للمعلم: <b>0 ج.م</b>`;
      } else {
        previewBox.style.background = "rgba(245,158,11,0.08)";
        previewBox.style.borderColor = "rgba(245,158,11,0.35)";
        previewRemaining.style.color = "#f59e0b";
        previewStatus.style.color = "#d97706";
        previewStatus.innerHTML = `⏳ <b>سداد دفعة جزئية:</b> سيتم تسديد <b>${val} ج.م</b> الآن، وسيتبقى للمعلم مستحقات معلقة بقيمة <b>${remaining} ج.م</b> تظل مسجلة في حسابه بانتظار سدادها لاحقاً.`;
      }
    };

    amountInput?.addEventListener("input", updatePreview);

    fullBtn?.addEventListener("click", () => {
      amountInput.value = totalPending;
      fullBtn.className = "btn-primary";
      partialBtn.className = "btn-secondary";
      updatePreview();
    });

    partialBtn?.addEventListener("click", () => {
      if (parseFloat(amountInput.value) >= totalPending) {
        amountInput.value = Math.max(1, Math.round(totalPending / 2));
      }
      partialBtn.className = "btn-primary";
      fullBtn.className = "btn-secondary";
      amountInput.focus();
      amountInput.select();
      updatePreview();
    });

    // Dropzone & File upload
    const dropzone = document.getElementById("pay-teacher-dropzone");
    const fileInput = document.getElementById("pay-teacher-file");
    const uploadPrompt = document.getElementById("pay-teacher-upload-prompt");
    const filePreview = document.getElementById("pay-teacher-file-preview");
    const previewImg = document.getElementById("pay-teacher-preview-img");
    const fileNameSpan = document.getElementById("pay-teacher-file-name");
    const removeFileBtn = document.getElementById("pay-teacher-remove-file");

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
      if (e.target.id === "pay-teacher-remove-file" || e.target.closest("#pay-teacher-remove-file")) return;
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
    const form = document.getElementById("pay-teacher-form");
    const submitBtn = document.getElementById("pay-teacher-submit-btn");

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const paidVal = parseFloat(amountInput.value);
      if (isNaN(paidVal) || paidVal <= 0) {
        showToast("يرجى إدخال مبلغ سداد صحيح أكبر من الصفر.", "error");
        amountInput.focus();
        return;
      }

      if (paidVal > totalPending + 0.01) {
        showToast(`المبلغ المدخل (${paidVal} ج.م) يتجاوز إجمالي المستحقات المعلقة (${totalPending} ج.م).`, "error");
        amountInput.focus();
        return;
      }

      if (!fileInput.files || fileInput.files.length === 0) {
        showToast("يلزم رفع وإرفاق صورة أو ملف إيصال التحويل لإتمام تسديد المبلغ للمعلم.", "error");
        dropzone.style.borderColor = "var(--danger, #ef4444)";
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i data-lucide="loader-2" class="animate-spin" style="width:18px;height:18px;"></i> جاري رفع الإيصال وتسجيل التسديد... ⏳`;
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

        if (!uploadRes.ok) {
          throw new Error("فشل رفع ملف الإيصال. يرجى التأكد من الملف والمحاولة مجدداً.");
        }

        const uploadData = await uploadRes.json();
        const receiptUrl = uploadData.url;

        const paymentMethod = document.getElementById("pay-teacher-method")?.value || "manual";
        const transactionRef = document.getElementById("pay-teacher-txid")?.value?.trim() || "";
        const notes = document.getElementById("pay-teacher-notes")?.value?.trim() || "";

        const res = await apiFetch(`/admin/teacher-earnings/pay-teacher`, {
          method: "POST",
          body: JSON.stringify({
            teacherId,
            amount: paidVal,
            receiptUrl,
            paymentMethod,
            transactionRef,
            notes
          })
        });

        showToast(res.message || "تم تسديد مستحقات المعلم بنجاح! 💸✅", "success");
        closeModal();
        if (typeof this.loadAllData === "function") {
          await this.loadAllData();
        }
        if (typeof this.renderTab === "function") {
          this.renderTab("earnings");
        }
      } catch (err) {
        showToast(err.message || "تعذر إتمام تسديد المستحقات.", "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i data-lucide="check-circle" style="width:18px; height:18px;"></i> <span>تأكيد تسديد المبلغ (${paidVal} ج.م) ورفع الإيصال 💸</span>`;
        if (window.lucide) window.lucide.createIcons();
      }
    });
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
    const originalAmount = Math.round(Number(ear.amount || 0) * 100) / 100;

    container.innerHTML = `
      <div class="modal-overlay" id="pay-earning-modal" style="display:flex; z-index:99999;">
        <div class="modal-content" style="max-width:540px; border-radius:18px; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,0.25);">
          <div class="modal-header" style="background:var(--bg-card); border-bottom:1px solid var(--border-color); padding:16px 20px;">
            <h3 class="modal-title" style="display:flex; align-items:center; gap:8px; font-weight:800; font-size:1.15rem; margin:0;">
              <i data-lucide="wallet" style="color:var(--primary); width:22px; height:22px;"></i>
              تسديد هذه المعاملة (إرسال التحويل)
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
                <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">المبلغ الإجمالي للمعاملة:</div>
                <div style="font-size:1.35rem; font-weight:900; color:var(--primary); margin-top:2px;">${originalAmount} ${ear.currency || 'ج.م'}</div>
              </div>
              <div>
                <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">مصدر المعاملة:</div>
                <div style="font-size:0.9rem; font-weight:800; color:var(--text-main); margin-top:4px;">${sourceLabel}</div>
                ${ear.description ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${ear.description}</div>` : ''}
              </div>
            </div>

            <form id="pay-earning-form" style="display:flex; flex-direction:column; gap:16px;">
              
              <!-- Payment Amount Selection -->
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">
                  المبلغ المراد سداده الآن <span style="color:var(--danger,#ef4444);">*</span>
                </label>
                <div style="display:flex; gap:8px; margin-bottom:8px;">
                  <button type="button" id="pay-earning-full-btn" class="btn-primary" style="flex:1; padding:6px 10px; font-size:0.8rem; font-weight:700; border-radius:8px;">
                    كامل المبلغ (${originalAmount} ج.م)
                  </button>
                  <button type="button" id="pay-earning-partial-btn" class="btn-secondary" style="flex:1; padding:6px 10px; font-size:0.8rem; font-weight:700; border-radius:8px;">
                    دفعة جزئية (مبلغ أقل)
                  </button>
                </div>
                <div style="position:relative;">
                  <input type="number" id="pay-earning-amount-input" step="any" min="1" max="${originalAmount}" value="${originalAmount}" class="form-control" style="width:100%; padding:10px 14px 10px 60px; border-radius:10px; border:2px solid var(--primary); font-size:1.15rem; font-weight:900; background:var(--bg-input, var(--bg-card)); color:var(--text-main);">
                  <span style="position:absolute; left:14px; top:50%; transform:translateY(-50%); font-weight:800; color:var(--text-muted); font-size:0.9rem;">ج.م</span>
                </div>
              </div>

              <!-- Live Balance Remaining Preview Box -->
              <div id="pay-earning-live-preview" style="padding:12px; border-radius:10px; border:1px solid rgba(16,185,129,0.3); background:rgba(16,185,129,0.06); transition:all 0.2s ease;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                  <span style="font-size:0.78rem; font-weight:700; color:var(--text-muted);">المبلغ المسدد الآن:</span>
                  <span id="preview-earning-paid" style="font-weight:900; font-size:1rem; color:var(--primary);">${originalAmount} ج.م</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; padding-top:4px; border-top:1px dashed var(--border-color); margin-bottom:4px;">
                  <span style="font-size:0.78rem; font-weight:700; color:var(--text-muted);">المبلغ المتبقي المعلق:</span>
                  <span id="preview-earning-remaining" style="font-weight:900; font-size:1rem; color:#10b981;">0 ج.م</span>
                </div>
                <div id="preview-earning-notice" style="font-size:0.75rem; font-weight:700; color:#10b981; margin-top:2px;">
                  ✅ تسوية كامل قيمة المعاملة.
                </div>
              </div>

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
                  <span>تأكيد تسديد المبلغ (<span id="pay-earning-submit-btn-amt">${originalAmount}</span> ج.م) 💸</span>
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

    const amountInput = document.getElementById("pay-earning-amount-input");
    const previewBox = document.getElementById("pay-earning-live-preview");
    const previewPaid = document.getElementById("preview-earning-paid");
    const previewRemaining = document.getElementById("preview-earning-remaining");
    const previewNotice = document.getElementById("preview-earning-notice");
    const submitBtnAmt = document.getElementById("pay-earning-submit-btn-amt");
    const fullBtn = document.getElementById("pay-earning-full-btn");
    const partialBtn = document.getElementById("pay-earning-partial-btn");

    const updatePreview = () => {
      const val = parseFloat(amountInput.value);
      if (isNaN(val) || val <= 0) {
        previewPaid.textContent = "0 ج.م";
        previewRemaining.textContent = `${originalAmount} ج.م`;
        previewBox.style.background = "rgba(239,68,68,0.06)";
        previewBox.style.borderColor = "rgba(239,68,68,0.3)";
        previewNotice.style.color = "#ef4444";
        previewNotice.textContent = "⚠️ يرجى إدخال مبلغ صحيح أكبر من الصفر.";
        submitBtnAmt.textContent = "0";
        return;
      }

      if (val > originalAmount) {
        previewPaid.textContent = `${val} ج.م`;
        previewRemaining.textContent = "0 ج.م";
        previewBox.style.background = "rgba(239,68,68,0.06)";
        previewBox.style.borderColor = "rgba(239,68,68,0.3)";
        previewNotice.style.color = "#ef4444";
        previewNotice.textContent = `⚠️ تنبيه: المبلغ المدخل يتجاوز قيمة المعاملة (${originalAmount} ج.م)!`;
        submitBtnAmt.textContent = String(val);
        return;
      }

      const remaining = Math.max(0, Math.round((originalAmount - val) * 100) / 100);
      previewPaid.textContent = `${val} ج.م`;
      previewRemaining.textContent = `${remaining} ج.م`;
      submitBtnAmt.textContent = String(val);

      if (remaining === 0) {
        previewBox.style.background = "rgba(16,185,129,0.06)";
        previewBox.style.borderColor = "rgba(16,185,129,0.3)";
        previewRemaining.style.color = "#10b981";
        previewNotice.style.color = "#10b981";
        previewNotice.innerHTML = `✅ <b>سداد كامل:</b> سيتم تسوية كامل قيمة هذه المعاملة.`;
      } else {
        previewBox.style.background = "rgba(245,158,11,0.08)";
        previewBox.style.borderColor = "rgba(245,158,11,0.35)";
        previewRemaining.style.color = "#f59e0b";
        previewNotice.style.color = "#d97706";
        previewNotice.innerHTML = `⏳ <b>دفعة جزئية:</b> سيتم سداد <b>${val} ج.م</b> الآن، وسيتبقى <b>${remaining} ج.م</b> كمعاملة معلقة جديدة للمعلم.`;
      }
    };

    amountInput?.addEventListener("input", updatePreview);

    fullBtn?.addEventListener("click", () => {
      amountInput.value = originalAmount;
      fullBtn.className = "btn-primary";
      partialBtn.className = "btn-secondary";
      updatePreview();
    });

    partialBtn?.addEventListener("click", () => {
      if (parseFloat(amountInput.value) >= originalAmount) {
        amountInput.value = Math.max(1, Math.round(originalAmount / 2));
      }
      partialBtn.className = "btn-primary";
      fullBtn.className = "btn-secondary";
      amountInput.focus();
      amountInput.select();
      updatePreview();
    });

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

      const paidVal = parseFloat(amountInput.value);
      if (isNaN(paidVal) || paidVal <= 0) {
        showToast("يرجى إدخال مبلغ سداد صحيح أكبر من الصفر.", "error");
        amountInput.focus();
        return;
      }

      if (paidVal > originalAmount + 0.01) {
        showToast(`المبلغ المدخل (${paidVal} ج.م) يتجاوز قيمة المعاملة (${originalAmount} ج.م).`, "error");
        amountInput.focus();
        return;
      }

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
          body: JSON.stringify({ receiptUrl, paymentMethod, transactionRef, notes, amount: paidVal })
        });

        showToast(res.message || "تم تسديد مستحقات المعلم واعتماد إيصال التحويل بنجاح! 💸✅", "success");
        closeModal();
        if (typeof this.loadAllData === "function") {
          await this.loadAllData();
        }
        if (typeof this.renderTab === "function") {
          this.renderTab("earnings");
        }
      } catch (err) {
        showToast(err.message || "تعذر إتمام تسديد المستحقات.", "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i data-lucide="check-circle" style="width:18px; height:18px;"></i> <span>تأكيد تسديد المبلغ (${paidVal} ج.م) 💸</span>`;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

};
