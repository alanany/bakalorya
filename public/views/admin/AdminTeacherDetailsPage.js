import { apiFetch, showToast, confirmDialog, getCleanWhatsAppNumber, state, startImpersonation } from "../../app.js";

export class AdminTeacherDetailsPage {
  constructor(container, adminView, teacherId) {
    this.container = container;
    this.adminView = adminView;
    this.teacherId = teacherId;
    this.data = null;
    this.activeTab = "timetable"; // 'timetable' | 'groups' | 'students' | 'financials' | 'notes'
    this.timetableView = "week"; // 'day' | 'week' | 'month'
    this.currentDate = new Date();
  }

  async render() {
    this.container.innerHTML = `
      <div style="padding:60px 20px;text-align:center;color:var(--text-muted);" class="glass-card">
        <div class="spinner" style="width:40px;height:40px;margin:0 auto 16px;border-width:3px;"></div>
        <p style="font-weight:700;font-size:1rem;">جارٍ تحميل ملف المعلم والجدول الدراسي...</p>
      </div>
    `;

    try {
      const res = await apiFetch(`/admin/teachers/${this.teacherId}/profile`);
      this.data = res;
      this.renderContent();
    } catch (err) {
      console.error("AdminTeacherDetailsPage load error:", err);
      this.container.innerHTML = `
        <div style="max-width:600px;margin:60px auto;text-align:center;padding:40px 24px;border-radius:20px;" class="glass-card">
          <div style="font-size:3.5rem;margin-bottom:12px;">👨‍🏫</div>
          <h3 style="font-size:1.4rem;font-weight:900;color:var(--text-main);margin-bottom:8px;">تعذر تحميل ملف المعلم</h3>
          <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:24px;">قد يكون المعرف غير صحيح أو تم حذف حساب المعلم.</p>
          <button id="back-to-teachers-err-btn" class="btn-primary" style="padding:10px 22px;border-radius:12px;display:inline-flex;align-items:center;gap:8px;margin:0 auto;">
            <i data-lucide="arrow-right"></i> العودة لقائمة المعلمين
          </button>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      this.container.querySelector("#back-to-teachers-err-btn")?.addEventListener("click", () => {
        this.adminView.selectedTeacherId = null;
        this.adminView.renderTab("teachers");
      });
    }
  }

  renderContent() {
    const { teacher, stats } = this.data;
    const isBlocked = !!teacher.isBlocked;
    const isPending = teacher.status === "PENDING";
    const cleanPhone = getCleanWhatsAppNumber(teacher.phone);
    const teacherWaMsg = encodeURIComponent(`مرحباً أ. ${teacher.name}، معك إدارة منصة انطلق 🎓`);

    this.container.innerHTML = `
      <style>
        .tch-profile-wrap {
          padding: 24px 28px;
          max-width: 1400px;
          margin: 0 auto;
          font-family: 'Outfit', 'Cairo', sans-serif;
        }
        .tch-header-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.04);
        }
        .tch-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .tch-kpi-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.02);
        }
        .tch-kpi-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
        }
        .tch-tabs-bar {
          display: flex;
          gap: 8px;
          border-bottom: 2px solid var(--border-color);
          margin-bottom: 24px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .tch-tab-btn {
          padding: 10px 20px;
          background: transparent;
          border: none;
          border-radius: 12px 12px 0 0;
          font-size: 0.92rem;
          font-weight: 700;
          color: var(--text-muted);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          position: relative;
        }
        .tch-tab-btn:hover {
          color: var(--primary);
          background: rgba(99,102,241,0.05);
        }
        .tch-tab-btn.active {
          color: var(--primary);
          border-bottom: 3px solid var(--primary);
          background: rgba(99,102,241,0.08);
        }
        .tch-tab-content-area {
          min-height: 400px;
        }
        .calendar-nav-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 20px;
          padding: 14px 18px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 16px;
        }
        .session-badge-item {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          padding: 14px 16px;
          margin-bottom: 12px;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .session-badge-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
          border-color: var(--primary);
        }
      </style>

      <div class="tch-profile-wrap">
        <!-- Top breadcrumb & back button -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
          <button id="tch-back-btn" class="btn-outline" style="padding:8px 16px;border-radius:10px;font-size:0.85rem;font-weight:700;display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
            <i data-lucide="arrow-right" style="width:16px;height:16px;"></i> العودة لقائمة المعلمين
          </button>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:0.8rem;color:var(--text-muted);font-weight:600;">معرف المعلم:</span>
            <code style="background:rgba(99,102,241,0.08);color:var(--primary);padding:3px 8px;border-radius:6px;font-size:0.78rem;font-weight:700;">${teacher.id.substring(0, 13)}...</code>
          </div>
        </div>

        <!-- Teacher Main Header Card -->
        <div class="tch-header-card">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px;">
            <div style="display:flex;align-items:center;gap:18px;">
              <img src="${(teacher.avatar && !teacher.avatar.includes('dicebear.com')) ? teacher.avatar : 'assets/logo.png'}" 
                   onerror="this.src='assets/logo.png'" 
                   style="width:76px;height:76px;border-radius:50%;object-fit:cover;border:3px solid var(--primary);box-shadow:0 4px 12px rgba(99,102,241,0.2);">
              <div>
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
                  <h2 style="font-size:1.4rem;font-weight:900;color:var(--text-main);margin:0;">أ. ${teacher.name}</h2>
                  ${isPending 
                    ? `<span class="badge" style="background:rgba(245,158,11,0.15);color:#d97706;padding:3px 8px;border-radius:6px;font-weight:800;font-size:0.75rem;">⏳ بانتظار الاعتماد</span>`
                    : isBlocked
                      ? `<span class="badge" style="background:rgba(239,68,68,0.15);color:#ef4444;padding:3px 8px;border-radius:6px;font-weight:800;font-size:0.75rem;">🚫 محظور من الدخول</span>`
                      : `<span class="badge" style="background:rgba(16,185,129,0.15);color:#10b981;padding:3px 8px;border-radius:6px;font-weight:800;font-size:0.75rem;">✅ حساب نشط</span>`
                  }
                  <span class="badge" style="background:rgba(99,102,241,0.12);color:var(--primary);padding:3px 10px;border-radius:8px;font-weight:800;font-size:0.8rem;">
                    💵 ${stats.hourlyRate} ج.م / ساعة
                  </span>
                  ${teacher.education ? `<span class="badge" style="background:rgba(147,51,234,0.1);color:#9333ea;padding:3px 8px;border-radius:6px;font-weight:800;font-size:0.75rem;">🎓 ${teacher.education}</span>` : ''}
                </div>
                
                <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;color:var(--text-muted);font-size:0.85rem;">
                  <span style="display:inline-flex;align-items:center;gap:5px;">
                    <i data-lucide="mail" style="width:14px;height:14px;color:var(--primary);"></i> ${teacher.email}
                  </span>
                  ${teacher.phone ? `
                    <a href="https://wa.me/${cleanPhone}?text=${teacherWaMsg}" target="_blank" style="color:#10b981;text-decoration:none;font-weight:700;display:inline-flex;align-items:center;gap:4px;background:rgba(16,185,129,0.08);padding:3px 8px;border-radius:6px;">
                      <i data-lucide="message-circle" style="width:13px;height:13px;"></i> واتساب: ${teacher.phone}
                    </a>
                  ` : ''}
                  ${teacher.meetingLink ? `
                    <a href="${teacher.meetingLink}" target="_blank" style="color:var(--primary);text-decoration:underline;font-weight:700;display:inline-flex;align-items:center;gap:4px;">
                      <i data-lucide="video" style="width:13px;height:13px;"></i> رابط البث الثابت
                    </a>
                  ` : ''}
                  <span style="display:inline-flex;align-items:center;gap:5px;font-size:0.8rem;">
                    <i data-lucide="calendar" style="width:14px;height:14px;"></i> انضمام: ${new Date(teacher.createdAt).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              </div>
            </div>

            <!-- Quick Action Buttons -->
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <button id="tch-impersonate-btn" class="btn-primary" style="padding:8px 16px;border-radius:10px;font-size:0.83rem;font-weight:800;display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg, #6366f1, #8b5cf6);box-shadow:0 2px 8px rgba(99,102,241,0.3);border:none;color:#fff;cursor:pointer;">
                <i data-lucide="log-in" style="width:14px;height:14px;"></i> الدخول للحساب 🚀
              </button>
              <button id="tch-rate-btn" class="btn-outline" style="padding:8px 14px;border-radius:10px;font-size:0.82rem;font-weight:700;display:inline-flex;align-items:center;gap:6px;cursor:pointer;color:var(--primary);border-color:var(--primary);">
                <i data-lucide="dollar-sign" style="width:14px;height:14px;"></i> تعديل أجر الساعة
              </button>
              <button id="tch-edit-btn" class="btn-outline" style="padding:8px 14px;border-radius:10px;font-size:0.82rem;font-weight:700;display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
                <i data-lucide="edit-3" style="width:14px;height:14px;"></i> تعديل البيانات
              </button>
              <button id="tch-block-toggle-btn" class="btn-outline" style="padding:8px 14px;border-radius:10px;font-size:0.82rem;font-weight:700;display:inline-flex;align-items:center;gap:6px;cursor:pointer;color:${isBlocked ? '#10b981' : '#ef4444'};border-color:${isBlocked ? '#10b981' : '#ef4444'};">
                <i data-lucide="${isBlocked ? 'unlock' : 'lock'}" style="width:14px;height:14px;"></i> ${isBlocked ? 'إلغاء الحظر' : 'حظر المعلم'}
              </button>
            </div>
          </div>

          <!-- Account Access & Credentials Section -->
          <div style="margin-top:14px;padding:12px 16px;border-radius:12px;background:rgba(99,102,241,0.04);border:1px dashed rgba(99,102,241,0.2);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;font-size:0.85rem;">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-weight:700;color:var(--text-muted);display:flex;align-items:center;gap:4px;">
                  <i data-lucide="key" style="width:14px;height:14px;color:#f59e0b;"></i> كلمة مرور الحساب:
                </span>
                <div style="display:inline-flex;align-items:center;gap:6px;background:var(--bg-card);border:1px solid var(--border-color);padding:3px 10px;border-radius:8px;">
                  <span id="tch-pwd-display" style="font-family:monospace;font-weight:800;letter-spacing:1px;color:var(--text-main);">
                    ${teacher.plainPassword ? '••••••••' : '<span style="color:var(--text-muted);font-size:0.78rem;">مشفرة (اضغط تعيين لإظهارها)</span>'}
                  </span>
                  ${teacher.plainPassword ? `
                    <button type="button" id="tch-toggle-pwd-btn" style="background:none;border:none;cursor:pointer;padding:2px;color:var(--text-muted);" title="إظهار / إخفاء">
                      <i data-lucide="eye" style="width:13px;height:13px;"></i>
                    </button>
                    <button type="button" id="tch-copy-pwd-btn" style="background:none;border:none;cursor:pointer;padding:2px;color:var(--primary);" title="نسخ كلمة المرور">
                      <i data-lucide="copy" style="width:13px;height:13px;"></i>
                    </button>
                  ` : ''}
                </div>
              </div>
              <button id="tch-set-pwd-btn" class="btn-outline" style="padding:4px 10px;border-radius:8px;font-size:0.78rem;font-weight:700;color:#d97706;border-color:#f59e0b;display:inline-flex;align-items:center;gap:4px;cursor:pointer;">
                <i data-lucide="edit-2" style="width:12px;height:12px;"></i> ${teacher.plainPassword ? 'تغيير كلمة المرور' : 'تعيين كلمة مرور واضحة'}
              </button>
            </div>
            <div style="font-size:0.78rem;color:var(--text-muted);">
              💡 يمكنك الدخول لحساب المعلم مباشرة لمعاينة وحل أي مشكلة، والعودة لحسابك كمسؤول بنقرة واحدة من الشريط العلوي.
            </div>
          </div>
        </div>

        <!-- 4 Quick KPI Stats Cards -->
        <div class="tch-kpi-grid">
          <div class="tch-kpi-card">
            <div class="tch-kpi-icon" style="background:rgba(99,102,241,0.12);color:var(--primary);">👥</div>
            <div>
              <div style="font-size:1.6rem;font-weight:900;color:var(--text-main);line-height:1.2;">${stats.groupsCount || 0}</div>
              <div style="font-size:0.8rem;color:var(--text-muted);font-weight:700;">المجموعات النشطة</div>
            </div>
          </div>
          <div class="tch-kpi-card">
            <div class="tch-kpi-icon" style="background:rgba(16,185,129,0.12);color:#10b981;">🎓</div>
            <div>
              <div style="font-size:1.6rem;font-weight:900;color:#10b981;line-height:1.2;">${stats.totalStudentsCount || 0}</div>
              <div style="font-size:0.8rem;color:var(--text-muted);font-weight:700;">إجمالي الطلاب المسجلين</div>
            </div>
          </div>
          <div class="tch-kpi-card">
            <div class="tch-kpi-icon" style="background:rgba(245,158,11,0.12);color:#d97706;">⏱️</div>
            <div>
              <div style="font-size:1.6rem;font-weight:900;color:var(--text-main);line-height:1.2;">${stats.completedHours || 0} س</div>
              <div style="font-size:0.8rem;color:var(--text-muted);font-weight:700;">ساعات العمل المكتملة</div>
            </div>
          </div>
          <div class="tch-kpi-card">
            <div class="tch-kpi-icon" style="background:rgba(16,185,129,0.12);color:#10b981;">💰</div>
            <div>
              <div style="font-size:1.6rem;font-weight:900;color:#10b981;line-height:1.2;">${stats.totalSalary?.toLocaleString() || 0} ج.م</div>
              <div style="font-size:0.8rem;color:var(--text-muted);font-weight:700;">الراتب المستحق عن الحصص</div>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs Bar -->
        <div class="tch-tabs-bar">
          <button class="tch-tab-btn ${this.activeTab === 'timetable' ? 'active' : ''}" data-tab="timetable">
            <i data-lucide="calendar"></i> جدول الحصص والمحاضرات
          </button>
          <button class="tch-tab-btn ${this.activeTab === 'groups' ? 'active' : ''}" data-tab="groups">
            <i data-lucide="users"></i> المجموعات والكورسات (${stats.groupsCount || 0})
          </button>
          <button class="tch-tab-btn ${this.activeTab === 'students' ? 'active' : ''}" data-tab="students">
            <i data-lucide="graduation-cap"></i> الطلاب المسجلون (${stats.totalStudentsCount || 0})
          </button>
          <button class="tch-tab-btn ${this.activeTab === 'financials' ? 'active' : ''}" data-tab="financials">
            <i data-lucide="dollar-sign"></i> الحساب المالي وسعر الساعة
          </button>
          <button class="tch-tab-btn ${this.activeTab === 'notes' ? 'active' : ''}" data-tab="notes">
            <i data-lucide="file-text"></i> ملاحظات الإدارة والتقييم
          </button>
        </div>

        <!-- Tab Content Area -->
        <div id="tch-tab-content" class="tch-tab-content-area">
          ${this.renderActiveTabContent()}
        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.bindEvents();
  }

  renderActiveTabContent() {
    switch (this.activeTab) {
      case "timetable":
        return this.renderTimetableTab();
      case "groups":
        return this.renderGroupsTab();
      case "students":
        return this.renderStudentsTab();
      case "financials":
        return this.renderFinancialsTab();
      case "notes":
        return this.renderNotesTab();
      default:
        return this.renderTimetableTab();
    }
  }

  // ── 1. TIMETABLE TAB ─────────────────────────────────────────────────────────
  renderTimetableTab() {
    const allSessions = this.data.sessions.all || [];

    return `
      <div>
        <!-- Timetable Toolbar -->
        <div class="calendar-nav-bar">
          <!-- View Modes -->
          <div style="display:flex;gap:6px;background:rgba(0,0,0,0.04);padding:4px;border-radius:12px;">
            <button class="btn-outline ${this.timetableView === 'day' ? 'btn-primary' : ''}" id="view-day-btn" style="padding:6px 14px;border-radius:8px;font-size:0.82rem;font-weight:700;cursor:pointer;">
              يومي
            </button>
            <button class="btn-outline ${this.timetableView === 'week' ? 'btn-primary' : ''}" id="view-week-btn" style="padding:6px 14px;border-radius:8px;font-size:0.82rem;font-weight:700;cursor:pointer;">
              أسبوعي
            </button>
            <button class="btn-outline ${this.timetableView === 'month' ? 'btn-primary' : ''}" id="view-month-btn" style="padding:6px 14px;border-radius:8px;font-size:0.82rem;font-weight:700;cursor:pointer;">
              شهري
            </button>
          </div>

          <!-- Date Navigation -->
          <div style="display:flex;align-items:center;gap:12px;">
            <button id="cal-prev-btn" class="btn-outline" style="width:34px;height:34px;padding:0;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
              <i data-lucide="chevron-right" style="width:18px;height:18px;"></i>
            </button>
            <span id="cal-current-label" style="font-weight:800;font-size:0.95rem;color:var(--text-main);min-width:180px;text-align:center;">
              ${this.getDateRangeLabel()}
            </span>
            <button id="cal-next-btn" class="btn-outline" style="width:34px;height:34px;padding:0;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
              <i data-lucide="chevron-left" style="width:18px;height:18px;"></i>
            </button>
            <button id="cal-today-btn" class="btn-outline" style="padding:6px 12px;border-radius:8px;font-size:0.8rem;font-weight:700;cursor:pointer;">
              اليوم
            </button>
          </div>

          <!-- Total sessions count badge & Export PDF / Image buttons -->
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <button id="export-teacher-weekly-pdf-btn" class="btn-primary" style="padding:7px 15px;border-radius:10px;font-size:0.82rem;font-weight:800;display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg, #ef4444, #b91c1c);color:#fff;border:none;box-shadow:0 3px 12px rgba(239,68,68,0.28);cursor:pointer;" title="معاينة وتصدير الجدول كملف PDF">
              <i data-lucide="file-down" style="width:14px;height:14px;"></i> تصدير (PDF) 📄
            </button>
            <button id="export-teacher-weekly-img-btn" class="btn-primary" style="padding:7px 15px;border-radius:10px;font-size:0.82rem;font-weight:800;display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg, #8b5cf6, #6d28d9);color:#fff;border:none;box-shadow:0 3px 12px rgba(139,92,246,0.28);cursor:pointer;" title="تحميل وتصدير الجدول كصورة عالية الجودة PNG">
              <i data-lucide="image" style="width:14px;height:14px;"></i> تحميل كصورة (Image) 🖼️
            </button>
            <div style="font-size:0.85rem;color:var(--text-muted);font-weight:700;">
              إجمالي الحصص: <span style="color:var(--primary);">${allSessions.length}</span>
            </div>
          </div>
        </div>

        <!-- Render based on selected timetable view -->
        ${this.timetableView === 'day' ? this.renderDayView(allSessions) : ''}
        ${this.timetableView === 'week' ? this.renderWeekView(allSessions) : ''}
        ${this.timetableView === 'month' ? this.renderMonthView(allSessions) : ''}
      </div>
    `;
  }

  getDateRangeLabel() {
    const d = new Date(this.currentDate);
    if (this.timetableView === "day") {
      return d.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } else if (this.timetableView === "week") {
      const dayIndex = (d.getDay() + 1) % 7; // Saturday first
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - dayIndex);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return d.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
    }
  }

  // DAY VIEW
  renderDayView(sessions) {
    const curDateStr = this.currentDate.toDateString();
    const daySessions = sessions.filter(s => new Date(s.scheduledAt).toDateString() === curDateStr);

    if (daySessions.length === 0) {
      return `
        <div style="background:var(--bg-card);border:1px dashed var(--border-color);border-radius:18px;padding:60px 20px;text-align:center;color:var(--text-muted);">
          <div style="font-size:3rem;margin-bottom:10px;">☕</div>
          <h4 style="font-weight:800;font-size:1.1rem;color:var(--text-main);margin-bottom:6px;">لا توجد حصص مجدولة لهذا اليوم</h4>
          <p style="font-size:0.85rem;">المعلم ليس لديه أي محاضرات أو حصص مسجلة في هذا التاريخ.</p>
        </div>
      `;
    }

    return `
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${daySessions.map(s => this.renderSessionItemCard(s)).join('')}
      </div>
    `;
  }

  // WEEK VIEW
  renderWeekView(sessions) {
    const d = new Date(this.currentDate);
    const dayIndex = (d.getDay() + 1) % 7; // Saturday as first day
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - dayIndex);
    startOfWeek.setHours(0, 0, 0, 0);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + i);
      weekDays.push(currentDay);
    }

    const dayNames = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:14px;align-items:start;">
        ${weekDays.map((day, idx) => {
          const isToday = day.toDateString() === new Date().toDateString();
          const daySessions = sessions.filter(s => new Date(s.scheduledAt).toDateString() === day.toDateString());

          return `
            <div style="background:var(--bg-card);border:1px solid ${isToday ? 'var(--primary)' : 'var(--border-color)'};border-radius:16px;overflow:hidden;box-shadow:${isToday ? '0 0 16px rgba(99,102,241,0.15)' : 'none'};">
              <div style="background:${isToday ? 'var(--primary)' : 'rgba(0,0,0,0.03)'};color:${isToday ? '#fff' : 'var(--text-main)'};padding:10px 14px;display:flex;align-items:center;justify-content:space-between;">
                <span style="font-weight:800;font-size:0.88rem;">${dayNames[idx]}</span>
                <span style="font-size:0.75rem;opacity:0.85;">${day.getDate()} / ${day.getMonth() + 1}</span>
              </div>
              <div style="padding:10px;min-height:160px;display:flex;flex-direction:column;gap:8px;">
                ${daySessions.length === 0 ? `
                  <div style="color:var(--text-muted);font-size:0.75rem;text-align:center;padding:24px 0;">لا توجد حصص</div>
                ` : daySessions.map(s => {
                  const sTime = new Date(s.scheduledAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
                  const subjectName = s.subjectName || s.course?.subject || s.course?.title || s.title;
                  return `
                    <div style="background:rgba(99,102,241,0.06);border-inline-start:3px solid var(--primary);border-radius:8px;padding:8px 10px;font-size:0.8rem;">
                      <div style="font-weight:800;color:var(--text-main);margin-bottom:2px;display:flex;align-items:center;justify-content:space-between;">
                        <span>${sTime}</span>
                        <span style="font-size:0.68rem;background:rgba(99,102,241,0.15);color:var(--primary);padding:1px 5px;border-radius:4px;">${s.type === 'GROUP' ? 'مجموعة' : 'خاصة'}</span>
                      </div>
                      <div style="font-weight:800;color:var(--text-main);margin-bottom:3px;font-size:0.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${subjectName}">
                        📚 ${subjectName}
                      </div>
                      ${s.group ? `<div style="font-size:0.72rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${s.group.name}">👥 ${s.group.name}</div>` : ''}
                      ${s.student ? `<div style="font-size:0.72rem;color:var(--text-muted);">👤 الطالب: ${s.student.name}</div>` : ''}
                      ${s.meetingLink ? `
                        <a href="${s.meetingLink}" target="_blank" style="display:inline-flex;align-items:center;gap:3px;color:var(--primary);text-decoration:none;font-weight:700;font-size:0.7rem;margin-top:4px;">
                          <i data-lucide="video" style="width:11px;height:11px;"></i> رابط البث
                        </a>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // MONTH VIEW
  renderMonthView(sessions) {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const dayIndex = (firstDay.getDay() + 1) % 7;
    const daysInMonth = lastDay.getDate();

    const dayNames = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

    return `
      <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:18px;overflow:hidden;padding:16px;">
        <div style="display:grid;grid-template-columns:repeat(7, 1fr);gap:8px;margin-bottom:8px;text-align:center;">
          ${dayNames.map(name => `<div style="font-weight:800;font-size:0.82rem;color:var(--text-muted);padding:6px;">${name}</div>`).join('')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(7, 1fr);gap:8px;">
          ${Array(dayIndex).fill(null).map(() => `<div style="min-height:90px;background:rgba(0,0,0,0.015);border-radius:10px;"></div>`).join('')}
          ${Array(daysInMonth).fill(null).map((_, i) => {
            const dayNum = i + 1;
            const thisDate = new Date(year, month, dayNum);
            const isToday = thisDate.toDateString() === new Date().toDateString();
            const daySessions = sessions.filter(s => new Date(s.scheduledAt).toDateString() === thisDate.toDateString());

            return `
              <div style="min-height:90px;background:${isToday ? 'rgba(99,102,241,0.06)' : 'var(--bg-app)'};border:1px solid ${isToday ? 'var(--primary)' : 'var(--border-color)'};border-radius:10px;padding:8px;display:flex;flex-direction:column;justify-content:space-between;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-weight:800;font-size:0.85rem;color:${isToday ? 'var(--primary)' : 'var(--text-main)'};">${dayNum}</span>
                  ${daySessions.length > 0 ? `<span class="badge" style="background:var(--primary);color:#fff;font-size:0.65rem;padding:1px 5px;border-radius:4px;font-weight:800;">${daySessions.length}</span>` : ''}
                </div>
                <div style="display:flex;flex-direction:column;gap:3px;margin-top:4px;">
                  ${daySessions.slice(0, 2).map(s => {
                    const subName = s.subjectName || s.course?.subject || s.course?.title || s.title;
                    return `
                    <div style="font-size:0.68rem;background:rgba(99,102,241,0.12);color:var(--primary);padding:2px 4px;border-radius:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${subName}">
                      📚 ${subName}
                    </div>
                  `;}).join('')}
                  ${daySessions.length > 2 ? `<span style="font-size:0.65rem;color:var(--text-muted);font-weight:700;">+${daySessions.length - 2} المزيد</span>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  renderSessionItemCard(s) {
    const sDate = new Date(s.scheduledAt);
    const dateFormatted = sDate.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
    const timeFormatted = sDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const subjectName = s.subjectName || s.course?.subject || s.course?.title || s.title;

    return `
      <div class="session-badge-item">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="width:44px;height:44px;border-radius:12px;background:rgba(99,102,241,0.1);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:1.3rem;">
              ${s.type === 'GROUP' ? '👥' : '👤'}
            </div>
            <div>
              <div style="font-weight:800;font-size:0.95rem;color:var(--text-main);display:flex;align-items:center;gap:8px;">
                <span>📚 ${subjectName}</span>
                <span class="badge" style="background:${s.type === 'GROUP' ? 'rgba(99,102,241,0.1)' : 'rgba(245,158,11,0.1)'};color:${s.type === 'GROUP' ? 'var(--primary)' : '#d97706'};font-size:0.7rem;padding:2px 7px;border-radius:6px;font-weight:800;">
                  ${s.type === 'GROUP' ? 'حصة مجموعة' : 'حصة خاصة'}
                </span>
                ${s.isPast ? `<span class="badge" style="background:rgba(100,116,139,0.1);color:var(--text-muted);font-size:0.68rem;padding:2px 6px;border-radius:4px;">منتهية</span>` : `<span class="badge" style="background:rgba(16,185,129,0.12);color:#10b981;font-size:0.68rem;padding:2px 6px;border-radius:4px;">قادمة</span>`}
              </div>
              <div style="display:flex;align-items:center;gap:14px;color:var(--text-muted);font-size:0.8rem;margin-top:4px;flex-wrap:wrap;">
                <span>📅 ${dateFormatted}</span>
                <span>⏰ ${timeFormatted} (${s.duration || 60} دقيقة)</span>
                ${s.group ? `<span>👥 المجموعة: <strong>${s.group.name}</strong></span>` : ''}
                ${s.student ? `<span>👤 الطالب: <strong>${s.student.name}</strong></span>` : ''}
              </div>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:10px;">
            ${s.meetingLink ? `
              <a href="${s.meetingLink}" target="_blank" class="btn-primary" style="padding:6px 14px;border-radius:8px;font-size:0.8rem;font-weight:700;display:inline-flex;align-items:center;gap:6px;text-decoration:none;">
                <i data-lucide="video" style="width:14px;height:14px;"></i> فتح رابط البث
              </a>
            ` : `<span style="font-size:0.75rem;color:var(--text-muted);">بدون رابط بث</span>`}
          </div>
        </div>
      </div>
    `;
  }

  // ── 2. GROUPS & COURSES TAB ─────────────────────────────────────────────────
  renderGroupsTab() {
    const groups = this.data.groups || [];
    const courses = this.data.courses || [];

    if (groups.length === 0 && courses.length === 0) {
      return `
        <div style="background:var(--bg-card);border:1px dashed var(--border-color);border-radius:18px;padding:60px 20px;text-align:center;color:var(--text-muted);">
          <div style="font-size:3rem;margin-bottom:10px;">👥</div>
          <h4 style="font-weight:800;font-size:1.1rem;color:var(--text-main);margin-bottom:6px;">لا توجد مجموعات دراسية مرتبطة بهذا المعلم بعد</h4>
          <p style="font-size:0.85rem;">يمكنك تعيين المعلم لمجموعة من خلال تبويب المجموعات الدراسية.</p>
        </div>
      `;
    }

    return `
      <div style="display:flex;flex-direction:column;gap:24px;">
        <!-- Groups Section -->
        <div>
          <h3 style="font-size:1.1rem;font-weight:800;color:var(--text-main);margin-bottom:14px;display:flex;align-items:center;gap:8px;">
            <span>المجموعات الدراسية المخصصة للمعلم</span>
            <span class="badge" style="background:rgba(99,102,241,0.12);color:var(--primary);">${groups.length}</span>
          </h3>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:16px;">
            ${groups.map(grp => `
              <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:18px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,0.03);">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                  <span class="badge" style="background:rgba(99,102,241,0.1);color:var(--primary);font-size:0.75rem;padding:3px 8px;border-radius:6px;font-weight:800;">
                    مجموعة تعليمية
                  </span>
                  <span class="badge" style="background:rgba(16,185,129,0.12);color:#10b981;font-size:0.75rem;padding:3px 8px;border-radius:6px;font-weight:800;">
                    👥 ${grp.studentsCount || 0} طلاب
                  </span>
                </div>

                <h4 style="font-weight:900;font-size:1.1rem;color:var(--text-main);margin-bottom:6px;">
                  ${grp.name}
                </h4>

                ${grp.course ? `
                  <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:10px;">
                    📚 الكورس: <strong>${grp.course.title}</strong> ${grp.course.grade ? `(${grp.course.grade})` : ''}
                  </div>
                ` : ''}

                ${grp.scheduleText ? `
                  <div style="font-size:0.8rem;color:var(--text-main);font-weight:700;display:flex;align-items:center;gap:6px;margin-bottom:12px;background:rgba(16,185,129,0.08);padding:6px 10px;border-radius:8px;">
                    <i data-lucide="clock" style="width:13px;height:13px;color:#10b981;"></i> ${grp.scheduleText}
                  </div>
                ` : ''}

                ${grp.nextSession ? `
                  <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:14px;">
                    الحصة القادمة: <strong style="color:var(--primary);">${new Date(grp.nextSession.scheduledAt).toLocaleDateString('ar-EG')}</strong> (${grp.nextSession.title})
                  </div>
                ` : ''}

                <div style="border-top:1px solid var(--border-color);padding-top:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:0.75rem;color:var(--text-muted);font-weight:700;">
                      إجمالي الحصص: ${grp.sessionsCount || 0}
                    </span>
                    <span class="badge" style="background:rgba(16,185,129,0.1);color:#10b981;font-size:0.75rem;padding:3px 8px;border-radius:6px;font-weight:800;">
                      💰 ${grp.teacherHourlyRate ?? 100} ج.م / س
                    </span>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <button class="btn-outline tch-edit-group-rate-btn" data-group-id="${grp.id}" data-group-name="${grp.name}" data-rate="${grp.teacherHourlyRate ?? 100}" style="padding:3px 8px;border-radius:8px;font-size:0.75rem;cursor:pointer;" title="تعديل أجر ساعة هذه المجموعة">
                      ✏️ سعر الساعة
                    </button>
                    ${grp.meetingLink ? `
                      <a href="${grp.meetingLink}" target="_blank" style="color:var(--primary);font-size:0.78rem;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">
                        <i data-lucide="video" style="width:13px;height:13px;"></i> رابط البث
                      </a>
                    ` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Courses Section -->
        ${courses.length > 0 ? `
          <div>
            <h3 style="font-size:1.1rem;font-weight:800;color:var(--text-main);margin-bottom:14px;display:flex;align-items:center;gap:8px;">
              <span>الدورات التعليمية المنسوبة للمعلم</span>
              <span class="badge" style="background:rgba(245,158,11,0.12);color:#d97706;">${courses.length}</span>
            </h3>

            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:14px;">
              ${courses.map(crs => `
                <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:14px;padding:16px;">
                  <div style="font-weight:800;font-size:0.95rem;color:var(--text-main);margin-bottom:4px;">
                    ${crs.title}
                  </div>
                  <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px;">
                    ${crs.grade ? `🎓 ${crs.grade}` : ''} ${crs.subject ? `• 📖 ${crs.subject}` : ''}
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;color:var(--text-muted);">
                    <span>المجموعات: <strong>${crs.groupsCount || 0}</strong></span>
                    <span class="badge" style="background:rgba(16,185,129,0.1);color:#10b981;font-weight:700;">${crs.status}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // ── 3. ENROLLED STUDENTS TAB ────────────────────────────────────────────────
  renderStudentsTab() {
    const students = this.data.students || [];

    if (students.length === 0) {
      return `
        <div style="background:var(--bg-card);border:1px dashed var(--border-color);border-radius:18px;padding:60px 20px;text-align:center;color:var(--text-muted);">
          <div style="font-size:3rem;margin-bottom:10px;">🎓</div>
          <h4 style="font-weight:800;font-size:1.1rem;color:var(--text-main);margin-bottom:6px;">لا يوجد طلاب مسجلون حالياً</h4>
          <p style="font-size:0.85rem;">لم يتم تسجيل طلاب في مجموعات هذا المعلم بعد.</p>
        </div>
      `;
    }

    return `
      <div class="glass-card" style="overflow:hidden;padding:0;">
        <div style="padding:18px 24px;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;">
          <h4 style="font-size:1.0rem;font-weight:800;color:var(--text-main);margin:0;">
            قائمة الطلاب المسجلين (${students.length} طالب)
          </h4>
          <span style="font-size:0.8rem;color:var(--text-muted);">طلاب مسجلون في مجموعات المعلم</span>
        </div>

        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;text-align:start;font-size:0.88rem;">
            <thead>
              <tr style="background:rgba(0,0,0,0.02);border-bottom:1px solid var(--border-color);">
                <th style="padding:12px 18px;text-align:start;font-size:0.8rem;color:var(--text-muted);font-weight:700;">الطالب</th>
                <th style="padding:12px 18px;text-align:start;font-size:0.8rem;color:var(--text-muted);font-weight:700;">المجموعات المسجل بها</th>
                <th style="padding:12px 18px;text-align:start;font-size:0.8rem;color:var(--text-muted);font-weight:700;">بيانات التواصل</th>
                <th style="padding:12px 18px;text-align:start;font-size:0.8rem;color:var(--text-muted);font-weight:700;">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${students.map(s => {
                const sCleanPhone = getCleanWhatsAppNumber(s.phone);
                return `
                  <tr style="border-bottom:1px solid var(--border-color);">
                    <td style="padding:12px 18px;">
                      <div style="display:flex;align-items:center;gap:12px;">
                        <img src="${(s.avatar && !s.avatar.includes('dicebear.com')) ? s.avatar : 'assets/logo.png'}" 
                             onerror="this.src='assets/logo.png'" 
                             style="width:36px;height:36px;border-radius:50%;object-fit:cover;">
                        <div>
                          <div style="font-weight:700;font-size:0.9rem;color:var(--text-main);">${s.name}</div>
                          ${s.education ? `<div style="font-size:0.75rem;color:var(--text-muted);">🎓 ${s.education}</div>` : ''}
                        </div>
                      </div>
                    </td>
                    <td style="padding:12px 18px;">
                      <div style="display:flex;flex-direction:column;gap:4px;">
                        ${(s.enrolledGroups || []).map(g => `
                          <span class="badge" style="background:rgba(99,102,241,0.1);color:var(--primary);font-size:0.72rem;padding:2px 7px;border-radius:6px;font-weight:700;width:fit-content;">
                            👥 ${g.groupName}
                          </span>
                        `).join('')}
                      </div>
                    </td>
                    <td style="padding:12px 18px;color:var(--text-muted);font-size:0.82rem;">
                      <div>${s.email}</div>
                      ${s.phone ? `
                        <div style="margin-top:3px;">
                          <a href="https://wa.me/${sCleanPhone}" target="_blank" style="color:#10b981;text-decoration:none;font-weight:700;display:inline-flex;align-items:center;gap:3px;font-size:0.78rem;">
                            <i data-lucide="message-circle" style="width:12px;height:12px;"></i> ${s.phone}
                          </a>
                        </div>
                      ` : ''}
                    </td>
                    <td style="padding:12px 18px;">
                      <button class="btn-secondary view-student-profile-link-btn" data-id="${s.id}" style="padding:5px 12px;border-radius:8px;font-size:0.75rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
                        <i data-lucide="user" style="width:12px;height:12px;"></i> فتح ملف الطالب
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ── 4. FINANCIALS TAB ────────────────────────────────────────────────────────
  renderFinancialsTab() {
    const { teacher, stats } = this.data;
    const groups = this.data.groups || [];
    const allSessions = this.data.sessions?.all || [];
    const completedSessions = allSessions.filter(s => s.status === 'COMPLETED' || s.status === 'completed' || s.isPast);

    // Calculate actual total salary sum directly from session earnings
    const totalEarningsSum = completedSessions.reduce((sum, s) => {
      const hours = (s.duration || 60) / 60;
      const appliedRate = s.hourlyRate || s.group?.teacherHourlyRate || (s.type === 'GROUP' ? 100 : (stats.hourlyRate || 150));
      const earning = s.earnings != null ? Number(s.earnings) : Math.round(hours * appliedRate);
      return sum + earning;
    }, 0);

    const displayTotalSalary = stats.totalSalary != null ? stats.totalSalary : totalEarningsSum;

    return `
      <div style="display:flex;flex-direction:column;gap:24px;">
        <!-- Financial Policy Notice -->
        <div style="background:linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.06));border:1.5px solid rgba(99,102,241,0.2);border-radius:18px;padding:18px 22px;display:flex;align-items:flex-start;gap:14px;">
          <div style="width:38px;height:38px;border-radius:12px;background:rgba(99,102,241,0.15);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;">
            ℹ️
          </div>
          <div>
            <h4 style="font-size:0.95rem;font-weight:900;color:var(--text-main);margin:0 0 4px 0;">نظام احتساب المستحقات وسعر الساعة</h4>
            <p style="font-size:0.83rem;color:var(--text-muted);margin:0;line-height:1.6;">
              تعتمد المنصة احتساب الراتب لكل حصة بناءً على <strong>سعر ساعة المجموعة الثابت (Fixed Group Hourly Rate)</strong> المحدد في إعدادات كل مجموعة. ويُستخدم <strong>سعر الساعة العام للمعلم</strong> للحصص الخاصة الفردية فقط أو كخيار احتياطي عند عدم تحديد سعر للمجموعة.
            </p>
          </div>
        </div>

        <!-- Groups & Base Hourly Rates Overview Cards Grid -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:16px;">
          <!-- Teacher Base Rate Card -->
          <div class="glass-card" style="padding:22px;border-radius:18px;display:flex;flex-direction:column;justify-content:space-between;gap:16px;border-inline-start:4px solid var(--primary);">
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span class="badge" style="background:rgba(99,102,241,0.12);color:var(--primary);font-size:0.75rem;padding:3px 8px;border-radius:6px;font-weight:800;">
                  السعر الأساسي العام
                </span>
                <span style="font-size:0.75rem;color:var(--text-muted);">للحصص الخاصة والافتراضي</span>
              </div>
              <div style="font-size:2rem;font-weight:900;color:var(--primary);line-height:1.1;">
                ${stats.hourlyRate || 150} ج.م <span style="font-size:0.9rem;color:var(--text-muted);font-weight:600;">/ ساعة</span>
              </div>
              <p style="font-size:0.78rem;color:var(--text-muted);margin:6px 0 0;">يُطبق على الحصص الخاصة غير المرتبطة بمجموعة دراسية.</p>
            </div>
            <button id="tch-financial-update-rate-btn" class="btn-primary" style="padding:8px 16px;border-radius:10px;font-size:0.82rem;font-weight:800;display:inline-flex;align-items:center;gap:6px;align-self:flex-start;cursor:pointer;">
              <i data-lucide="edit-3" style="width:14px;height:14px;"></i> تعديل السعر العام
            </button>
          </div>

          <!-- Groups Rates Summary Card -->
          <div class="glass-card" style="padding:22px;border-radius:18px;border-inline-start:4px solid #10b981;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <h4 style="font-size:0.95rem;font-weight:900;color:var(--text-main);margin:0;">أسعار ساعات المجموعات الدراسية</h4>
              <span class="badge" style="background:rgba(16,185,129,0.12);color:#10b981;font-size:0.75rem;padding:3px 8px;border-radius:6px;font-weight:800;">
                ${groups.length} مجموعات
              </span>
            </div>

            ${groups.length === 0 ? `
              <p style="font-size:0.82rem;color:var(--text-muted);margin:0;">لا توجد مجموعات مسندة لهذا المعلم بعد.</p>
            ` : `
              <div style="display:flex;flex-direction:column;gap:10px;max-height:220px;overflow-y:auto;padding-inline-end:4px;">
                ${groups.map(grp => {
                  const grpRate = grp.teacherHourlyRate != null ? grp.teacherHourlyRate : 100;
                  return `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(0,0,0,0.02);border:1px solid var(--border-color);border-radius:10px;gap:10px;">
                      <div style="overflow:hidden;text-overflow:ellipsis;">
                        <strong style="font-size:0.85rem;color:var(--text-main);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${grp.name}</strong>
                        <span style="font-size:0.73rem;color:var(--text-muted);">${grp.course ? grp.course.title : 'مجموعة تعليمية'}</span>
                      </div>
                      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                        <span class="badge" style="background:rgba(16,185,129,0.12);color:#10b981;font-weight:800;font-size:0.8rem;padding:3px 8px;border-radius:6px;">
                          ${grpRate} ج.م / س
                        </span>
                        <button class="btn-outline tch-edit-group-rate-btn" data-group-id="${grp.id}" data-group-name="${grp.name}" data-rate="${grpRate}" style="padding:4px 8px;border-radius:8px;font-size:0.75rem;cursor:pointer;" title="تعديل سعر ساعة هذه المجموعة">
                          ✏️ تعديل
                        </button>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        </div>

        <!-- 3 KPI Cards for Salary -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;">
          <div class="glass-card" style="padding:18px 20px;border-inline-start:4px solid var(--primary);">
            <div style="font-size:0.8rem;color:var(--text-muted);font-weight:700;">الحصص المكتملة</div>
            <div style="font-size:1.6rem;font-weight:900;color:var(--text-main);margin-top:4px;">${completedSessions.length} حصة</div>
          </div>
          <div class="glass-card" style="padding:18px 20px;border-inline-start:4px solid #10b981;">
            <div style="font-size:0.8rem;color:var(--text-muted);font-weight:700;">إجمالي ساعات العمل المنفذة</div>
            <div style="font-size:1.6rem;font-weight:900;color:#10b981;margin-top:4px;">${stats.completedHours} ساعة</div>
          </div>
          <div class="glass-card" style="padding:18px 20px;border-inline-start:4px solid #f59e0b;">
            <div style="font-size:0.8rem;color:var(--text-muted);font-weight:700;">إجمالي الراتب المستحق الفعلي</div>
            <div style="font-size:1.6rem;font-weight:900;color:#d97706;margin-top:4px;">${displayTotalSalary.toLocaleString()} ج.م</div>
          </div>
        </div>

        <!-- Completed Sessions Table -->
        <div class="glass-card" style="overflow:hidden;padding:0;">
          <div style="padding:16px 20px;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;">
            <h4 style="font-size:0.95rem;font-weight:800;color:var(--text-main);margin:0;">
              سجل الحصص المنفذة لحساب الراتب (${completedSessions.length})
            </h4>
            <span style="font-size:0.78rem;color:var(--text-muted);font-weight:600;">
              محسوب بأجر ساعة كل مجموعة
            </span>
          </div>

          ${completedSessions.length === 0 ? `
            <div style="padding:40px;text-align:center;color:var(--text-muted);font-size:0.85rem;">لا توجد حصص مكتملة مسجلة بعد.</div>
          ` : `
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                <thead>
                  <tr style="background:rgba(0,0,0,0.02);border-bottom:1px solid var(--border-color);">
                    <th style="padding:10px 16px;text-align:start;font-size:0.78rem;color:var(--text-muted);">الحصة / المادة</th>
                    <th style="padding:10px 16px;text-align:start;font-size:0.78rem;color:var(--text-muted);">المجموعة / الطالب</th>
                    <th style="padding:10px 16px;text-align:start;font-size:0.78rem;color:var(--text-muted);">التاريخ</th>
                    <th style="padding:10px 16px;text-align:start;font-size:0.78rem;color:var(--text-muted);">المدة</th>
                    <th style="padding:10px 16px;text-align:start;font-size:0.78rem;color:var(--text-muted);">سعر الساعة المعتمد</th>
                    <th style="padding:10px 16px;text-align:start;font-size:0.78rem;color:var(--text-muted);">المستحق عن الحصة</th>
                  </tr>
                </thead>
                <tbody>
                  ${completedSessions.map(s => {
                    const hours = (s.duration || 60) / 60;
                    const isGroup = s.type === 'GROUP' || !!s.group;
                    const appliedRate = s.hourlyRate || s.group?.teacherHourlyRate || (isGroup ? 100 : (stats.hourlyRate || 150));
                    const sessionEarnings = s.earnings != null ? Number(s.earnings) : Math.round(hours * appliedRate);

                    return `
                      <tr style="border-bottom:1px solid var(--border-color);">
                        <td style="padding:10px 16px;font-weight:700;">
                          <div>📚 ${s.subjectName || s.title}</div>
                        </td>
                        <td style="padding:10px 16px;">
                          ${s.group ? `
                            <div style="font-weight:700;color:var(--text-main);">👥 ${s.group.name}</div>
                          ` : (s.student ? `
                            <div style="color:var(--text-muted);">👤 ${s.student.name}</div>
                          ` : '<span style="color:var(--text-muted);">-</span>')}
                        </td>
                        <td style="padding:10px 16px;color:var(--text-muted);">${new Date(s.scheduledAt).toLocaleDateString('ar-EG')}</td>
                        <td style="padding:10px 16px;">${s.duration || 60} دقيقة (${hours} س)</td>
                        <td style="padding:10px 16px;">
                          <span class="badge" style="background:${isGroup ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)'};color:${isGroup ? '#10b981' : 'var(--primary)'};font-size:0.75rem;padding:3px 8px;border-radius:6px;font-weight:800;">
                            ${appliedRate} ج.م/س (${isGroup ? 'سعر المجموعة' : 'سعر المعلم العام'})
                          </span>
                        </td>
                        <td style="padding:10px 16px;font-weight:900;color:#10b981;font-size:0.95rem;">
                          ${sessionEarnings.toLocaleString()} ج.م
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  }

  // ── 5. NOTES TAB ─────────────────────────────────────────────────────────────
  renderNotesTab() {
    const teacher = this.data.teacher;

    return `
      <div class="glass-card" style="padding:28px;border-radius:20px;max-width:800px;">
        <h3 style="font-size:1.15rem;font-weight:800;color:var(--text-main);margin-bottom:8px;display:flex;align-items:center;gap:8px;">
          <i data-lucide="file-text" style="width:20px;height:20px;color:var(--primary);"></i>
          ملاحظات وتقييم الإدارة على المعلم
        </h3>
        <p style="font-size:0.83rem;color:var(--text-muted);margin-bottom:20px;">
          هذه الملاحظات خاصة بالمشرفين والإدارة فقط، ولا تظهر للمعلم أو الطلاب.
        </p>

        <form id="tch-notes-form">
          <textarea id="tch-notes-input" rows="6" placeholder="أدخل أي ملاحظات، تقييم أداء، التزام بالمواعيد، ملاحظات مالية أو شكاوى..." 
                    style="width:100%;padding:14px;border-radius:14px;border:1.5px solid var(--border-color);background:var(--bg-app);color:var(--text-main);font-size:0.9rem;font-family:'Cairo',sans-serif;line-height:1.6;resize:vertical;box-sizing:border-box;">${teacher.notes || ''}</textarea>

          <div style="margin-top:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
            <span id="tch-notes-saved-indicator" style="font-size:0.82rem;color:#10b981;font-weight:700;display:none;">
              ✅ تم حفظ الملاحظات بنجاح
            </span>
            <button type="submit" id="tch-save-notes-btn" class="btn-primary" style="padding:10px 24px;border-radius:12px;font-size:0.88rem;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px;margin-inline-start:auto;">
              <i data-lucide="save"></i> حفظ الملاحظات
            </button>
          </div>
        </form>
      </div>
    `;
  }

  // ── EVENT LISTENERS ─────────────────────────────────────────────────────────
  bindEvents() {
    // Back to teachers list
    this.container.querySelector("#tch-back-btn")?.addEventListener("click", () => {
      this.adminView.selectedTeacherId = null;
      if (window.location.hash.includes("/teachers/")) {
        history.pushState(null, "", "#admin-dashboard/teachers");
      }
      this.adminView.renderTab("teachers");
    });

    // Sub-tabs switching
    this.container.querySelectorAll(".tch-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");
        if (tab && tab !== this.activeTab) {
          this.activeTab = tab;
          this.container.querySelectorAll(".tch-tab-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          const contentArea = this.container.querySelector("#tch-tab-content");
          if (contentArea) {
            contentArea.innerHTML = this.renderActiveTabContent();
            if (window.lucide) window.lucide.createIcons();
            this.bindTabSpecificEvents();
          }
        }
      });
    });

    // Quick action: Block / Unblock Teacher
    this.container.querySelector("#tch-block-toggle-btn")?.addEventListener("click", async () => {
      const teacher = this.data.teacher;
      const isBlocked = !!teacher.isBlocked;
      const actionTitle = isBlocked ? "إلغاء حظر المعلم" : "حظر المعلم ومنعه من الدخول";
      const actionMsg = isBlocked 
        ? `هل تريد بالتأكيد إلغاء حظر المعلم "${teacher.name}" وتمكينه من دخول حسابه؟`
        : `هل تريد بالتأكيد حظر المعلم "${teacher.name}"؟ لن يتمكن من تسجيل الدخول حتى يتم إلغاء الحظر.`;

      const confirmed = await confirmDialog(actionMsg, actionTitle);
      if (!confirmed) return;

      try {
        await apiFetch(`/admin/members/${teacher.id}/block`, {
          method: "PATCH",
          body: JSON.stringify({ isBlocked: !isBlocked })
        });
        showToast(isBlocked ? "تم إلغاء حظر المعلم بنجاح" : "تم حظر المعلم بنجاح", "success");
        await this.render();
      } catch (e) {
        showToast("فشل تحديث حالة الحظر", "error");
      }
    });

    // Impersonate (Login as Teacher)
    this.container.querySelector("#tch-impersonate-btn")?.addEventListener("click", async () => {
      const teacher = this.data.teacher;
      const confirmed = await confirmDialog(`هل تريد الدخول المباشر إلى حساب المعلم "${teacher.name}"؟ يمكنك العودة لحساب الأدمن في أي وقت عبر الشريط العلوي.`, "تسجيل الدخول كمعلم 🚀");
      if (!confirmed) return;

      try {
        const res = await apiFetch(`/admin/users/${teacher.id}/impersonate`, { method: "POST" });
        if (res.token && res.user) {
          showToast(`جاري الدخول لحساب المعلم ${teacher.name}...`, "success");
          startImpersonation(res.token, res.user);
        }
      } catch (e) {
        showToast(e.message || "فشل الدخول لحساب المعلم", "error");
      }
    });

    // Toggle teacher password visibility
    let pwdVisible = false;
    this.container.querySelector("#tch-toggle-pwd-btn")?.addEventListener("click", () => {
      pwdVisible = !pwdVisible;
      const display = this.container.querySelector("#tch-pwd-display");
      const btn = this.container.querySelector("#tch-toggle-pwd-btn");
      if (display) {
        display.textContent = pwdVisible ? (this.data.teacher.plainPassword || "") : "••••••••";
      }
      if (btn) {
        btn.innerHTML = `<i data-lucide="${pwdVisible ? 'eye-off' : 'eye'}" style="width:13px;height:13px;"></i>`;
        if (window.lucide) window.lucide.createIcons();
      }
    });

    // Copy teacher password
    this.container.querySelector("#tch-copy-pwd-btn")?.addEventListener("click", () => {
      if (this.data.teacher.plainPassword) {
        navigator.clipboard.writeText(this.data.teacher.plainPassword);
        showToast("تم نسخ كلمة المرور إلى الحافظة 📋", "success");
      }
    });

    // Set / Reset teacher password
    this.container.querySelector("#tch-set-pwd-btn")?.addEventListener("click", async () => {
      const teacher = this.data.teacher;
      const newPwd = prompt(`أدخل كلمة المرور الجديدة للمعلم "${teacher.name}":`, teacher.plainPassword || "123456");
      if (!newPwd || !newPwd.trim()) return;

      try {
        const res = await apiFetch(`/admin/users/${teacher.id}/reset-password`, { 
          method: "POST",
          body: JSON.stringify({ newPassword: newPwd.trim() })
        });
        teacher.plainPassword = res.plainPassword || newPwd.trim();
        showToast(res.message || "تم تعيين كلمة المرور بنجاح", "success");
        await this.render();
      } catch (e) {
        showToast(e.message || "فشل تعيين كلمة المرور", "error");
      }
    });

    // Quick action: Edit teacher modal
    this.container.querySelector("#tch-edit-btn")?.addEventListener("click", () => {
      if (typeof this.adminView.openEditMemberModal === "function") {
        this.adminView.openEditMemberModal(this.data.teacher);
      }
    });

    // Quick action: Update hourly rate
    this.container.querySelector("#tch-rate-btn")?.addEventListener("click", () => {
      this.promptUpdateHourlyRate();
    });

    this.bindTabSpecificEvents();
  }

  bindTabSpecificEvents() {
    // Timetable View Mode Buttons (Day / Week / Month)
    this.container.querySelector("#view-day-btn")?.addEventListener("click", () => {
      this.timetableView = "day";
      this.refreshTimetableContent();
    });
    this.container.querySelector("#view-week-btn")?.addEventListener("click", () => {
      this.timetableView = "week";
      this.refreshTimetableContent();
    });
    this.container.querySelector("#view-month-btn")?.addEventListener("click", () => {
      this.timetableView = "month";
      this.refreshTimetableContent();
    });

    // Date Navigation Buttons
    this.container.querySelector("#cal-prev-btn")?.addEventListener("click", () => {
      if (this.timetableView === "day") {
        this.currentDate.setDate(this.currentDate.getDate() - 1);
      } else if (this.timetableView === "week") {
        this.currentDate.setDate(this.currentDate.getDate() - 7);
      } else {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      }
      this.refreshTimetableContent();
    });

    this.container.querySelector("#cal-next-btn")?.addEventListener("click", () => {
      if (this.timetableView === "day") {
        this.currentDate.setDate(this.currentDate.getDate() + 1);
      } else if (this.timetableView === "week") {
        this.currentDate.setDate(this.currentDate.getDate() + 7);
      } else {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      }
      this.refreshTimetableContent();
    });

    this.container.querySelector("#cal-today-btn")?.addEventListener("click", () => {
      this.currentDate = new Date();
      this.refreshTimetableContent();
    });

    // Export PDF / Image Buttons
    this.container.querySelector("#export-teacher-weekly-pdf-btn")?.addEventListener("click", () => {
      this.exportWeeklyTimetableToPDF(false);
    });
    this.container.querySelector("#export-teacher-weekly-img-btn")?.addEventListener("click", () => {
      this.exportWeeklyTimetableToPDF(true);
    });

    // Update hourly rate from Financials tab
    this.container.querySelector("#tch-financial-update-rate-btn")?.addEventListener("click", () => {
      this.promptUpdateHourlyRate();
    });

    // Update group hourly rate from Financials tab or Groups tab
    this.container.querySelectorAll(".tch-edit-group-rate-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const groupId = btn.getAttribute("data-group-id");
        const groupName = btn.getAttribute("data-group-name") || "المجموعة";
        const currentRate = parseFloat(btn.getAttribute("data-rate")) || 100;
        this.promptUpdateGroupHourlyRate(groupId, groupName, currentRate);
      });
    });

    // Notes form submit
    const notesForm = this.container.querySelector("#tch-notes-form");
    notesForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const notes = this.container.querySelector("#tch-notes-input")?.value;
      const saveBtn = this.container.querySelector("#tch-save-notes-btn");
      const savedInd = this.container.querySelector("#tch-notes-saved-indicator");

      if (saveBtn) saveBtn.disabled = true;
      try {
        await apiFetch(`/admin/teachers/${this.teacherId}/notes`, {
          method: "PATCH",
          body: JSON.stringify({ notes })
        });
        showToast("تم حفظ ملاحظات المعلم بنجاح", "success");
        if (savedInd) {
          savedInd.style.display = "inline";
          setTimeout(() => { savedInd.style.display = "none"; }, 4000);
        }
      } catch (err) {
        showToast("فشل حفظ الملاحظات", "error");
      } finally {
        if (saveBtn) saveBtn.disabled = false;
      }
    });

    // Cross-link to open student profile
    this.container.querySelectorAll(".view-student-profile-link-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const studentId = btn.getAttribute("data-id");
        if (studentId && typeof this.adminView.showStudentDetails === "function") {
          this.adminView.showStudentDetails(studentId);
        }
      });
    });
  }

  refreshTimetableContent() {
    const container = this.container.querySelector("#tch-tab-content");
    if (container && this.activeTab === "timetable") {
      container.innerHTML = this.renderTimetableTab();
      if (window.lucide) window.lucide.createIcons();
      this.bindTabSpecificEvents();
    }
  }

  promptUpdateHourlyRate() {
    const currentRate = this.data?.stats?.hourlyRate || 150;
    const newRateStr = prompt(`أدخل أجر الساعة العام الجديد للمعلم (ج.م):`, currentRate);
    if (!newRateStr) return;

    const rateNum = Number(newRateStr);
    if (isNaN(rateNum) || rateNum < 0) {
      showToast("يرجى إدخال رقم صحيح وموجب لأجر الساعة.", "warning");
      return;
    }

    const applyToAll = confirm("هل ترغب أيضاً في تطبيق هذا السعر على جميع المجموعات الدراسية المسندة للمعلم؟\n(اضغط موافق للتطبيق على المجموعات، أو إلغاء لتحديث السعر العام فقط)");

    apiFetch(`/admin/teachers/${this.teacherId}/hourly-rate`, {
      method: "PATCH",
      body: JSON.stringify({ hourlyRate: rateNum, applyToAllGroups: applyToAll })
    }).then(() => {
      showToast("تم تحديث أجر الساعة بنجاح ✅", "success");
      this.render();
    }).catch(() => {
      showToast("فشل تحديث أجر الساعة", "error");
    });
  }

  promptUpdateGroupHourlyRate(groupId, groupName, currentRate) {
    if (!groupId) return;
    const newRateStr = prompt(`أدخل أجر الساعة الجديد للمعلم لمجموعة "${groupName}" (ج.م):`, currentRate);
    if (!newRateStr) return;

    const rateNum = Number(newRateStr);
    if (isNaN(rateNum) || rateNum < 0) {
      showToast("يرجى إدخال رقم صحيح وموجب لأجر الساعة.", "warning");
      return;
    }

    apiFetch(`/groups/${groupId}`, {
      method: "PUT",
      body: JSON.stringify({ teacherHourlyRate: rateNum })
    }).then(() => {
      showToast(`تم تحديث أجر الساعة لمجموعة "${groupName}" بنجاح ✅`, "success");
      this.render();
    }).catch(err => {
      console.error("Failed to update group teacher hourly rate:", err);
      showToast("فشل تحديث أجر ساعة المجموعة", "error");
    });
  }

  // ── EXPORT WEEKLY TIMETABLE TO PDF / IMAGE WITH ACADEMY LOGO ─────────────
  async exportWeeklyTimetableToPDF(autoDownloadImage = false) {
    const teacher = this.data.teacher;
    const allSessions = this.data.sessions.all || [];
    const academyManagerName = state.platformSettings?.academyManagerName || this.adminView?.platformSettings?.academyManagerName || "أ. محمد عبد الله";

    const d = new Date(this.currentDate);
    const dayIndex = (d.getDay() + 1) % 7;
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - dayIndex);
    startOfWeek.setHours(0, 0, 0, 0);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const cur = new Date(startOfWeek);
      cur.setDate(startOfWeek.getDate() + i);
      weekDays.push(cur);
    }

    const endOfWeek = new Date(weekDays[6]);
    const dayNames = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    const weekRangeStr = `${startOfWeek.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    let logoSrc = 'assets/logo.png';
    try {
      const res = await fetch('assets/logo.png');
      const blob = await res.blob();
      logoSrc = await new Promise((res) => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (_) {
      logoSrc = window.location.origin + '/assets/logo.png';
    }

    const printableInnerContent = `
      <style>
        #tch-export-timetable-container {
          width: 1040px;
          min-width: 1040px;
          max-width: 1040px;
          margin: 0 auto;
          background: #ffffff !important;
          color: #1e293b !important;
          padding: 22px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          box-sizing: border-box;
          direction: rtl;
          font-family: 'Cairo', 'Outfit', sans-serif;
        }
        #tch-export-timetable-container * {
          box-sizing: border-box;
        }
        #tch-export-timetable-container .pdf-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid #4f46e5;
          padding-bottom: 14px;
          margin-bottom: 14px;
        }
        #tch-export-timetable-container .academy-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        #tch-export-timetable-container .academy-logo {
          width: 60px;
          height: 60px;
          object-fit: contain;
          border-radius: 10px;
        }
        #tch-export-timetable-container .academy-title {
          font-size: 19px;
          font-weight: 900;
          color: #1e1b4b;
          margin: 0;
        }
        #tch-export-timetable-container .academy-subtitle {
          font-size: 11px;
          color: #64748b;
          font-weight: 700;
          margin: 2px 0 0;
        }
        #tch-export-timetable-container .report-badge {
          text-align: center;
        }
        #tch-export-timetable-container .report-tag {
          background: #e0e7ff;
          color: #4338ca;
          padding: 4px 14px;
          border-radius: 20px;
          font-weight: 800;
          font-size: 12px;
          display: inline-block;
          margin-bottom: 4px;
        }
        #tch-export-timetable-container .teacher-banner {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 16px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        #tch-export-timetable-container .teacher-banner-item {
          font-size: 11.5px;
        }
        #tch-export-timetable-container .teacher-banner-label {
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
          margin-bottom: 2px;
        }
        #tch-export-timetable-container .teacher-banner-val {
          font-weight: 800;
          color: #0f172a;
        }
        #tch-export-timetable-container .timetable-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          margin-bottom: 14px;
        }
        #tch-export-timetable-container .timetable-table th {
          background: #f1f5f9;
          color: #1e293b;
          font-weight: 800;
          padding: 8px 6px;
          border: 1px solid #cbd5e1;
          font-size: 11.5px;
          text-align: center;
        }
        #tch-export-timetable-container .timetable-table td {
          vertical-align: top;
          padding: 6px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          min-height: 185px;
          height: 185px;
        }
        #tch-export-timetable-container .session-card {
          background: #eef2ff;
          border: 1px solid #c7d2fe;
          border-right: 4px solid #6366f1;
          border-radius: 6px;
          padding: 6px 8px;
          margin-bottom: 6px;
          text-align: right;
        }
        #tch-export-timetable-container .session-card.private {
          background: #fefce8;
          border-color: #fef08a;
          border-right-color: #ca8a04;
        }
        #tch-export-timetable-container .session-time {
          font-weight: 800;
          color: #4338ca;
          font-size: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2px;
        }
        #tch-export-timetable-container .session-card.private .session-time {
          color: #a16207;
        }
        #tch-export-timetable-container .session-name {
          font-weight: 800;
          color: #0f172a;
          font-size: 11px;
          line-height: 1.3;
          margin-bottom: 2px;
        }
        #tch-export-timetable-container .session-group {
          color: #64748b;
          font-size: 9.5px;
          font-weight: 700;
        }
        #tch-export-timetable-container .session-student {
          color: #0284c7;
          font-size: 9.5px;
          font-weight: 700;
        }
        #tch-export-timetable-container .no-sessions {
          text-align: center;
          color: #94a3b8;
          font-size: 10.5px;
          padding: 28px 4px 0;
          font-weight: 600;
        }
        #tch-export-timetable-container .pdf-footer {
          border-top: 1px solid #e2e8f0;
          padding-top: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10px;
          color: #64748b;
        }
      </style>

      <div id="tch-export-timetable-container">
        <!-- Header with Academy Logo -->
        <div class="pdf-header">
          <div class="academy-brand">
            <img src="${logoSrc}" class="academy-logo" alt="Academy Logo">
            <div>
              <h1 class="academy-title">منصة انطلق التعليمية</h1>
              <p class="academy-subtitle">Entlq Educational Academy • التفوق الدراسي الذكي</p>
            </div>
          </div>

          <div class="report-badge">
            <span class="report-tag">📅 الجدول الدراسي الأسبوعي للمعلم</span>
            <div style="font-weight:800;font-size:12px;color:#1e293b;">${weekRangeStr}</div>
          </div>

          <div style="text-align:left;font-size:10.5px;line-height:1.5;">
            <div>تاريخ الإصدار: <strong>${new Date().toLocaleDateString('ar-EG')}</strong></div>
            <div>مدير الأكاديمية: <strong style="color:#4f46e5;">${academyManagerName}</strong></div>
            <div>الحالة: <span style="color:#16a34a;font-weight:800;">معتمد من الإدارة ✅</span></div>
          </div>
        </div>

        <!-- Teacher Information Bar -->
        <div class="teacher-banner">
          <div class="teacher-banner-item">
            <div class="teacher-banner-label">👨‍🏫 اسم المعلم:</div>
            <div class="teacher-banner-val">أ. ${teacher.name}</div>
          </div>
          <div class="teacher-banner-item">
            <div class="teacher-banner-label">💵 سعر الساعة المعتمد:</div>
            <div class="teacher-banner-val" style="color:#10b981;">${this.data.stats?.hourlyRate || 150} ج.م / ساعة</div>
          </div>
          <div class="teacher-banner-item">
            <div class="teacher-banner-label">📧 البريد الإلكتروني:</div>
            <div class="teacher-banner-val">${teacher.email}</div>
          </div>
          <div class="teacher-banner-item">
            <div class="teacher-banner-label">📞 هاتف التواصل:</div>
            <div class="teacher-banner-val">${teacher.phone || 'غير مسجل'}</div>
          </div>
        </div>

        <!-- 7-Day Timetable Grid -->
        <table class="timetable-table">
          <thead>
            <tr>
              ${weekDays.map((day, idx) => `
                <th>
                  ${dayNames[idx]}<br>
                  <span style="font-size:10px;font-weight:600;color:#64748b;">${day.getDate()} / ${day.getMonth() + 1}</span>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              ${weekDays.map(day => {
                const daySessions = allSessions.filter(s => new Date(s.scheduledAt).toDateString() === day.toDateString());
                return `
                  <td>
                    ${daySessions.length === 0 ? `
                      <div class="no-sessions">— لا توجد حصص —</div>
                    ` : daySessions.map(s => {
                      const sTime = new Date(s.scheduledAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
                      const isPriv = s.type !== 'GROUP';
                      const subName = s.subjectName || s.course?.subject || s.course?.title || s.title;
                      return `
                        <div class="session-card ${isPriv ? 'private' : ''}">
                          <div class="session-time">
                            <span>⏰ ${sTime}</span>
                            <span style="font-size:8.5px;">${isPriv ? 'حصة خاصة' : 'مجموعة'}</span>
                          </div>
                          <div class="session-name">📚 ${subName}</div>
                          ${s.group ? `<div class="session-group">👥 ${s.group.name}</div>` : ''}
                          ${s.student ? `<div class="session-student">👤 ${s.student.name}</div>` : ''}
                        </div>
                      `;
                    }).join('')}
                  </td>
                `;
              }).join('')}
            </tr>
          </tbody>
        </table>

        <!-- Footer & Approval Stamp -->
        <div class="pdf-footer">
          <div>
            📌 <strong>إرشادات هامة:</strong> يرجى التواجد في القاعة الافتراضية قبل موعد الحصة بـ 5 دقائق والالتزام بالخطة التدريسية المعتمدة.
          </div>
          <div style="text-align:left;">
            <div>ختم واعتماد الأكاديمية:</div>
            <div style="font-weight:900;color:#1e1b4b;font-size:11.5px;margin-top:2px;">مدير الأكاديمية: <strong style="color:#4f46e5;">${academyManagerName}</strong> 🎓</div>
          </div>
        </div>
      </div>
    `;

    this.showPdfExportModal(printableInnerContent, teacher.name, autoDownloadImage);
  }

  async ensureExportLibraries() {
    const loadScript = (src) => new Promise((resolve) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = resolve;
      document.head.appendChild(s);
    });

    if (typeof window.html2canvas === "undefined") {
      try {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
      } catch (_) {}
      if (typeof window.html2canvas === "undefined") {
        try {
          await loadScript("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js");
        } catch (_) {}
      }
    }

    const hasJsPdf = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!hasJsPdf) {
      try {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
      } catch (_) {}
      if (!((window.jspdf && window.jspdf.jsPDF) || window.jsPDF)) {
        try {
          await loadScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js");
        } catch (_) {}
      }
    }
  }

  showPdfExportModal(innerContent, teacherName, autoDownloadImage = false) {
    const existing = document.getElementById("teacher-pdf-export-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "teacher-pdf-export-modal";
    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.background = "rgba(0,0,0,0.75)";
    modal.style.backdropFilter = "blur(8px)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = "99999";
    modal.style.padding = "20px";

    modal.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:20px;max-width:1120px;width:100%;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.45);">
        <div style="padding:16px 22px;border-bottom:1px solid var(--border-color);display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.02);">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:1.4rem;">👨‍🏫</span>
            <div>
              <h3 style="margin:0;font-size:1.1rem;font-weight:900;color:var(--text-main);">تصدير الجدول الدراسي الأسبوعي للمعلم</h3>
              <p style="margin:2px 0 0;font-size:0.8rem;color:var(--text-muted);">معاينة وتنزيل الجدول كـ PDF مطابق للمعاينة أو صورة عالية الدقة PNG</p>
            </div>
          </div>
          <button id="close-tch-pdf-modal-btn" style="background:transparent;border:none;cursor:pointer;color:var(--text-muted);font-size:1.4rem;padding:4px 8px;">✕</button>
        </div>

        <div style="flex:1;overflow:auto;padding:24px 16px;background:#334155;display:flex;justify-content:center;align-items:flex-start;">
          <div id="tch-render-wrapper">
            ${innerContent}
          </div>
        </div>

        <div style="padding:16px 22px;border-top:1px solid var(--border-color);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:var(--bg-card);">
          <div style="font-size:0.82rem;color:var(--text-muted);">
            ✨ يتم تصدير ملف الـ PDF والصورة بشكل مطابق تماماً لما تراه في المعاينة وبأعلى دقة.
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <button id="tch-direct-print-pdf-btn" class="btn-primary" style="padding:9px 18px;border-radius:12px;font-weight:800;display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,var(--primary),#6366f1);color:#fff;box-shadow:0 4px 14px rgba(99,102,241,0.35);cursor:pointer;">
              🖨️ طباعة الجدول
            </button>
            <button id="tch-direct-download-pdf-btn" class="btn-primary" style="padding:9px 18px;border-radius:12px;font-weight:800;display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;box-shadow:0 4px 14px rgba(16,185,129,0.3);cursor:pointer;">
              📥 تحميل PDF مطابق للمعاينة
            </button>
            <button id="tch-direct-download-img-btn" class="btn-primary" style="padding:9px 18px;border-radius:12px;font-weight:800;display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;box-shadow:0 4px 14px rgba(139,92,246,0.3);cursor:pointer;">
              🖼️ تحميل كصورة (PNG)
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#close-tch-pdf-modal-btn")?.addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

    const getTargetElement = () => modal.querySelector("#tch-export-timetable-container");

    // Print
    modal.querySelector("#tch-direct-print-pdf-btn")?.addEventListener("click", () => {
      const el = getTargetElement();
      if (!el) return;
      const printWin = window.open('', '_blank');
      if (!printWin) {
        showToast("يرجى السماح بالنوافذ المنبثقة للطباعة", "warning");
        return;
      }
      printWin.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>الجدول الأسبوعي - أ. ${teacherName}</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { margin: 0; background: #fff; font-family: 'Cairo', sans-serif; direction: rtl; }
          </style>
        </head>
        <body>
          ${el.outerHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 300);
            };
          <\/script>
        </body>
        </html>
      `);
      printWin.document.close();
    });

    // Helper: generate canvas
    const self = this;
    const generateCanvas = async () => {
      if (typeof self?.ensureExportLibraries === "function") {
        await self.ensureExportLibraries();
      }
      if (!window.html2canvas) {
        throw new Error("تعذر تحميل أداة التقاط الصورة. يرجى التحقق من الاتصال بالإنترنت.");
      }
      const element = getTargetElement();
      if (!element) throw new Error("لم يتم العثور على محتوى الجدول");

      return await window.html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });
    };

    // Download PDF (Identical to preview via high-resolution canvas)
    modal.querySelector("#tch-direct-download-pdf-btn")?.addEventListener("click", async () => {
      const btn = modal.querySelector("#tch-direct-download-pdf-btn");
      const origText = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ جارٍ تجهيز PDF مطابق...';
      }

      try {
        const canvas = await generateCanvas();
        const jsPdfClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
        if (!jsPdfClass) throw new Error("تعذر تحميل مكتبة توليد PDF");

        const pdf = new jsPdfClass({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth(); // 297mm
        const pageHeight = pdf.internal.pageSize.getHeight(); // 210mm
        const margin = 8;
        const availWidth = pageWidth - (margin * 2);
        const availHeight = pageHeight - (margin * 2);

        const ratio = canvas.width / canvas.height;
        let printWidth = availWidth;
        let printHeight = availWidth / ratio;

        if (printHeight > availHeight) {
          printHeight = availHeight;
          printWidth = availHeight * ratio;
        }

        const posX = margin + (availWidth - printWidth) / 2;
        const posY = margin + (availHeight - printHeight) / 2;

        const imgData = canvas.toDataURL("image/jpeg", 0.98);
        pdf.addImage(imgData, "JPEG", posX, posY, printWidth, printHeight);
        pdf.save(`جدول_المعلم_${teacherName}_الأسبوعي.pdf`);
        showToast("تم تنزيل ملف PDF بنجاح وبنفس تصميم المعاينة بدقة عالية 🎉", "success");
      } catch (err) {
        console.error("PDF generation error:", err);
        showToast(err.message || "حدث خطأ أثناء تصدير PDF", "error");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = origText || '📥 تحميل PDF مباشر';
        }
      }
    });

    // Download Image (PNG)
    const handleDownloadImage = async () => {
      const btn = modal.querySelector("#tch-direct-download-img-btn");
      const origText = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ جارٍ توليد الصورة...';
      }

      try {
        const canvas = await generateCanvas();
        const link = document.createElement("a");
        link.download = `جدول_المعلم_${teacherName}_الأسبوعي.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        showToast("تم تنزيل جدول المعلم كصورة عالية الجودة بنجاح 🎉", "success");
      } catch (err) {
        console.error("Image download error:", err);
        showToast(err.message || "تعذر توليد الصورة، يرجى المحاولة مرة أخرى", "error");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = origText || '🖼️ تحميل كصورة (PNG)';
        }
      }
    };

    modal.querySelector("#tch-direct-download-img-btn")?.addEventListener("click", handleDownloadImage);

    if (autoDownloadImage) {
      setTimeout(() => {
        handleDownloadImage();
      }, 500);
    }
  }
}

