import { apiFetch, showToast, confirmDialog, getCleanWhatsAppNumber } from "../../app.js";

export class AdminStudentDetailsPage {
  constructor(container, adminView, studentId) {
    this.container = container;
    this.adminView = adminView;
    this.studentId = studentId;
    this.data = null;
    this.activeTab = "timetable"; // 'timetable' | 'groups' | 'academics' | 'financials' | 'notes'
    this.timetableView = "week"; // 'day' | 'week' | 'month'
    this.currentDate = new Date();
  }

  async render() {
    this.container.innerHTML = `
      <div style="padding:60px 20px;text-align:center;color:var(--text-muted);" class="glass-card">
        <div class="spinner" style="width:40px;height:40px;margin:0 auto 16px;border-width:3px;"></div>
        <p style="font-weight:700;font-size:1rem;">جارٍ تحميل ملف الطالب والجدول الدراسي...</p>
      </div>
    `;

    try {
      const res = await apiFetch(`/admin/students/${this.studentId}/profile`);
      this.data = res;
      this.renderContent();
    } catch (err) {
      console.error("AdminStudentDetailsPage load error:", err);
      this.container.innerHTML = `
        <div style="max-width:600px;margin:60px auto;text-align:center;padding:40px 24px;border-radius:20px;" class="glass-card">
          <div style="font-size:3.5rem;margin-bottom:12px;">🎓</div>
          <h3 style="font-size:1.4rem;font-weight:900;color:var(--text-main);margin-bottom:8px;">تعذر تحميل ملف الطالب</h3>
          <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:24px;">قد يكون المعرف غير صحيح أو تم حذف حساب الطالب.</p>
          <button id="back-to-students-err-btn" class="btn-primary" style="padding:10px 22px;border-radius:12px;display:inline-flex;align-items:center;gap:8px;margin:0 auto;">
            <i data-lucide="arrow-right"></i> العودة لقائمة الطلاب
          </button>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      this.container.querySelector("#back-to-students-err-btn")?.addEventListener("click", () => {
        this.adminView.renderTab("students");
      });
    }
  }

  renderContent() {
    const { student, stats } = this.data;
    const isBlocked = !!student.isBlocked;
    const isPending = student.status === "PENDING";
    const cleanPhone = getCleanWhatsAppNumber(student.phone);
    const cleanParentPhone = getCleanWhatsAppNumber(student.parentPhone);
    const studentWaMsg = encodeURIComponent(`مرحباً ${student.name}، معك إدارة منصة بكالوريا 🎓`);
    const parentWaMsg = encodeURIComponent(`مرحباً بك، نود التواصل بخصوص الطالب ${student.name} من إدارة منصة بكالوريا 🎓`);

    this.container.innerHTML = `
      <style>
        .std-profile-wrap {
          padding: 24px 28px;
          max-width: 1400px;
          margin: 0 auto;
          font-family: 'Outfit', 'Cairo', sans-serif;
        }
        .std-header-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.04);
        }
        .std-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .std-kpi-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.02);
        }
        .std-kpi-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
        }
        .std-tabs-bar {
          display: flex;
          gap: 8px;
          border-bottom: 2px solid var(--border-color);
          margin-bottom: 24px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .std-tab-btn {
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
        .std-tab-btn:hover {
          color: var(--primary);
          background: rgba(99,102,241,0.05);
        }
        .std-tab-btn.active {
          color: var(--primary);
          border-bottom: 3px solid var(--primary);
          background: rgba(99,102,241,0.08);
        }
        .std-tab-content-area {
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

      <div class="std-profile-wrap">
        <!-- Top breadcrumb & back button -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
          <button id="std-back-btn" class="btn-outline" style="padding:8px 16px;border-radius:10px;font-size:0.85rem;font-weight:700;display:inline-flex;align-items:center;gap:6px;">
            <i data-lucide="arrow-right" style="width:16px;height:16px;"></i> العودة لقائمة الطلاب
          </button>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:0.8rem;color:var(--text-muted);font-weight:600;">معرف الطالب:</span>
            <code style="background:rgba(99,102,241,0.08);color:var(--primary);padding:3px 8px;border-radius:6px;font-size:0.78rem;font-weight:700;">${student.id.substring(0, 13)}...</code>
          </div>
        </div>

        <!-- Student Main Header Card -->
        <div class="std-header-card">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px;">
            <div style="display:flex;align-items:center;gap:18px;">
              <img src="${(student.avatar && !student.avatar.includes('dicebear.com')) ? student.avatar : 'assets/logo.png'}" 
                   onerror="this.src='assets/logo.png'" 
                   style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid var(--primary);box-shadow:0 4px 12px rgba(99,102,241,0.2);">
              <div>
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
                  <h2 style="font-size:1.4rem;font-weight:900;color:var(--text-main);margin:0;">${student.name}</h2>
                  ${isPending 
                    ? `<span class="badge" style="background:rgba(245,158,11,0.15);color:#d97706;padding:3px 8px;border-radius:6px;font-weight:800;font-size:0.75rem;">⏳ بانتظار الاعتماد</span>`
                    : isBlocked
                      ? `<span class="badge" style="background:rgba(239,68,68,0.15);color:#ef4444;padding:3px 8px;border-radius:6px;font-weight:800;font-size:0.75rem;">🚫 محظور من الدخول</span>`
                      : `<span class="badge" style="background:rgba(16,185,129,0.15);color:#10b981;padding:3px 8px;border-radius:6px;font-weight:800;font-size:0.75rem;">✅ حساب نشط</span>`
                  }
                  ${student.education ? `<span class="badge" style="background:rgba(99,102,241,0.1);color:var(--primary);padding:3px 8px;border-radius:6px;font-weight:800;font-size:0.75rem;">🎓 ${student.education}</span>` : ''}
                </div>
                
                <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;color:var(--text-muted);font-size:0.85rem;">
                  <span style="display:inline-flex;align-items:center;gap:5px;">
                    <i data-lucide="mail" style="width:14px;height:14px;color:var(--primary);"></i> ${student.email}
                  </span>
                  ${student.phone ? `
                    <a href="https://wa.me/${cleanPhone}?text=${studentWaMsg}" target="_blank" style="color:#10b981;text-decoration:none;font-weight:700;display:inline-flex;align-items:center;gap:4px;background:rgba(16,185,129,0.08);padding:3px 8px;border-radius:6px;">
                      <i data-lucide="message-circle" style="width:13px;height:13px;"></i> واتساب الطالب: ${student.phone}
                    </a>
                  ` : ''}
                  ${student.parentPhone ? `
                    <a href="https://wa.me/${cleanParentPhone}?text=${parentWaMsg}" target="_blank" style="color:var(--primary);text-decoration:none;font-weight:700;display:inline-flex;align-items:center;gap:4px;background:rgba(99,102,241,0.08);padding:3px 8px;border-radius:6px;">
                      👨‍👩‍👦 واتساب ولي الأمر: ${student.parentPhone}
                    </a>
                  ` : ''}
                  <span style="display:inline-flex;align-items:center;gap:5px;font-size:0.8rem;">
                    <i data-lucide="calendar" style="width:14px;height:14px;"></i> انضمام: ${new Date(student.createdAt).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              </div>
            </div>

            <!-- Quick Action Buttons -->
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <button id="std-edit-btn" class="btn-outline" style="padding:8px 14px;border-radius:10px;font-size:0.82rem;font-weight:700;display:inline-flex;align-items:center;gap:6px;">
                <i data-lucide="edit-3" style="width:14px;height:14px;"></i> تعديل البيانات
              </button>
              <button id="std-block-toggle-btn" class="btn-outline" style="padding:8px 14px;border-radius:10px;font-size:0.82rem;font-weight:700;display:inline-flex;align-items:center;gap:6px;color:${isBlocked ? '#10b981' : '#ef4444'};border-color:${isBlocked ? '#10b981' : '#ef4444'};">
                <i data-lucide="${isBlocked ? 'unlock' : 'lock'}" style="width:14px;height:14px;"></i> ${isBlocked ? 'إلغاء الحظر' : 'حظر الحساب'}
              </button>
            </div>
          </div>
        </div>

        <!-- 4 Quick KPI Stats Cards -->
        <div class="std-kpi-grid">
          <div class="std-kpi-card">
            <div class="std-kpi-icon" style="background:rgba(99,102,241,0.12);color:var(--primary);">👥</div>
            <div>
              <div style="font-size:1.6rem;font-weight:900;color:var(--text-main);line-height:1.2;">${stats.enrolledGroupsCount || 0}</div>
              <div style="font-size:0.8rem;color:var(--text-muted);font-weight:700;">المجموعات المشترك بها</div>
            </div>
          </div>
          <div class="std-kpi-card">
            <div class="std-kpi-icon" style="background:rgba(16,185,129,0.12);color:#10b981;">📅</div>
            <div>
              <div style="font-size:1.6rem;font-weight:900;color:#10b981;line-height:1.2;">${stats.upcomingSessionsCount || 0}</div>
              <div style="font-size:0.8rem;color:var(--text-muted);font-weight:700;">الحصص القادمة</div>
            </div>
          </div>
          <div class="std-kpi-card">
            <div class="std-kpi-icon" style="background:rgba(245,158,11,0.12);color:#d97706;">🎯</div>
            <div>
              <div style="font-size:1.6rem;font-weight:900;color:var(--text-main);line-height:1.2;">${stats.attendanceRate != null ? stats.attendanceRate + '%' : '100%'}</div>
              <div style="font-size:0.8rem;color:var(--text-muted);font-weight:700;">نسبة الحضور والالتزام</div>
            </div>
          </div>
          <div class="std-kpi-card">
            <div class="std-kpi-icon" style="background:rgba(168,85,247,0.12);color:#a855f7;">📝</div>
            <div>
              <div style="font-size:1.6rem;font-weight:900;color:var(--text-main);line-height:1.2;">${stats.avgGrade != null ? stats.avgGrade + '%' : (stats.submissionsCount > 0 ? stats.submissionsCount + ' واجب' : '—')}</div>
              <div style="font-size:0.8rem;color:var(--text-muted);font-weight:700;">متوسط درجات الواجبات</div>
            </div>
          </div>
        </div>

        <!-- Sub Tabs Navigation -->
        <div class="std-tabs-bar">
          <button class="std-tab-btn ${this.activeTab === 'timetable' ? 'active' : ''}" data-tab="timetable">
            <i data-lucide="calendar" style="width:16px;height:16px;"></i> جدول الحصص والمواعيد
          </button>
          <button class="std-tab-btn ${this.activeTab === 'groups' ? 'active' : ''}" data-tab="groups">
            <i data-lucide="users" style="width:16px;height:16px;"></i> المجموعات والكورسات (${this.data.groups.length})
          </button>
          <button class="std-tab-btn ${this.activeTab === 'academics' ? 'active' : ''}" data-tab="academics">
            <i data-lucide="clipboard-check" style="width:16px;height:16px;"></i> الواجبات وسجل الحضور (${this.data.submissions.length})
          </button>
          <button class="std-tab-btn ${this.activeTab === 'financials' ? 'active' : ''}" data-tab="financials">
            <i data-lucide="credit-card" style="width:16px;height:16px;"></i> المدفوعات والاشتراكات (${this.data.payments.length})
          </button>
          <button class="std-tab-btn ${this.activeTab === 'notes' ? 'active' : ''}" data-tab="notes">
            <i data-lucide="file-text" style="width:16px;height:16px;"></i> ملاحظات الإدارة 📝
          </button>
        </div>

        <!-- Tab Body Area -->
        <div class="std-tab-content-area" id="std-subtab-container">
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
      case "academics":
        return this.renderAcademicsTab();
      case "financials":
        return this.renderFinancialsTab();
      case "notes":
        return this.renderNotesTab();
      default:
        return this.renderTimetableTab();
    }
  }

  // ── 1. TIMETABLE TAB (Day / Week / Month) ──────────────────────────────────
  renderTimetableTab() {
    const allSessions = this.data.sessions.all || [];

    return `
      <div>
        <!-- Timetable Toolbar: View switcher (Day/Week/Month) & Date navigators -->
        <div class="calendar-nav-bar">
          <!-- View Modes -->
          <div style="display:flex;gap:6px;background:rgba(0,0,0,0.04);padding:4px;border-radius:12px;">
            <button class="btn-outline ${this.timetableView === 'day' ? 'btn-primary' : ''}" id="view-day-btn" style="padding:6px 14px;border-radius:8px;font-size:0.82rem;font-weight:700;">
              يومي
            </button>
            <button class="btn-outline ${this.timetableView === 'week' ? 'btn-primary' : ''}" id="view-week-btn" style="padding:6px 14px;border-radius:8px;font-size:0.82rem;font-weight:700;">
              أسبوعي
            </button>
            <button class="btn-outline ${this.timetableView === 'month' ? 'btn-primary' : ''}" id="view-month-btn" style="padding:6px 14px;border-radius:8px;font-size:0.82rem;font-weight:700;">
              شهري
            </button>
          </div>

          <!-- Date Navigation -->
          <div style="display:flex;align-items:center;gap:12px;">
            <button id="cal-prev-btn" class="btn-outline" style="width:34px;height:34px;padding:0;border-radius:10px;display:flex;align-items:center;justify-content:center;">
              <i data-lucide="chevron-right" style="width:18px;height:18px;"></i>
            </button>
            <span id="cal-current-label" style="font-weight:800;font-size:0.95rem;color:var(--text-main);min-width:180px;text-align:center;">
              ${this.getDateRangeLabel()}
            </span>
            <button id="cal-next-btn" class="btn-outline" style="width:34px;height:34px;padding:0;border-radius:10px;display:flex;align-items:center;justify-content:center;">
              <i data-lucide="chevron-left" style="width:18px;height:18px;"></i>
            </button>
            <button id="cal-today-btn" class="btn-outline" style="padding:6px 12px;border-radius:8px;font-size:0.8rem;font-weight:700;">
              اليوم
            </button>
          </div>

          <!-- Total sessions count badge & Export PDF button -->
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <button id="export-weekly-pdf-btn" class="btn-primary" style="padding:7px 16px;border-radius:10px;font-size:0.82rem;font-weight:800;display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg, #ef4444, #b91c1c);color:#fff;border:none;box-shadow:0 3px 12px rgba(239,68,68,0.28);cursor:pointer;transition:transform 0.15s;" title="تصدير وطباعة الجدول الأسبوعي للطالب بصيغة PDF مع شعار الأكاديمية">
              <i data-lucide="file-down" style="width:14px;height:14px;"></i> تصدير الجدول الأسبوعي (PDF) 📄
            </button>
            <div style="font-size:0.85rem;color:var(--text-muted);font-weight:700;">
              إجمالي الحصص المسجلة: <span style="color:var(--primary);">${allSessions.length}</span>
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
      const startOfWeek = new Date(d);
      const dayIndex = (d.getDay() + 1) % 7; // Saturday = 0
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
          <p style="font-size:0.85rem;">الطالب ليس لديه أي محاضرات أو حصص خاصة مجدولة في هذا التاريخ.</p>
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
    const dayIndex = (d.getDay() + 1) % 7; // Saturday as first day of week
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
                  return `
                    <div style="background:rgba(99,102,241,0.06);border-inline-start:3px solid var(--primary);border-radius:8px;padding:8px 10px;font-size:0.8rem;">
                      <div style="font-weight:800;color:var(--text-main);margin-bottom:2px;display:flex;align-items:center;justify-content:space-between;">
                        <span>${sTime}</span>
                        <span style="font-size:0.68rem;background:rgba(99,102,241,0.15);color:var(--primary);padding:1px 5px;border-radius:4px;">${s.type === 'GROUP' ? 'مجموعة' : 'خاصة'}</span>
                      </div>
                      <div style="font-weight:800;color:var(--text-main);margin-bottom:3px;font-size:0.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${s.subjectName || s.course?.subject || s.course?.title || s.title}">
                        📚 ${s.subjectName || s.course?.subject || s.course?.title || s.title}
                      </div>
                      ${s.teacher ? `<div style="font-size:0.72rem;color:var(--text-muted);">👨‍🏫 ${s.teacher.name}</div>` : ''}
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
    const firstDayIndex = (new Date(year, month, 1).getDay() + 1) % 7; // Saturday = 0
    const totalDays = new Date(year, month + 1, 0).getDate();

    const dayHeaders = ['سبت', 'أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'];

    return `
      <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:18px;padding:20px;overflow-x:auto;">
        <div style="display:grid;grid-template-columns:repeat(7, 1fr);gap:8px;margin-bottom:8px;text-align:center;">
          ${dayHeaders.map(h => `<div style="font-weight:800;font-size:0.85rem;color:var(--text-muted);padding:8px 0;">${h}</div>`).join('')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(7, 1fr);gap:8px;">
          ${Array(firstDayIndex).fill(null).map(() => `<div style="height:90px;background:rgba(0,0,0,0.01);border-radius:10px;"></div>`).join('')}
          ${Array.from({ length: totalDays }, (_, i) => i + 1).map(dayNum => {
            const thisDate = new Date(year, month, dayNum);
            const isToday = thisDate.toDateString() === new Date().toDateString();
            const daySessions = sessions.filter(s => new Date(s.scheduledAt).toDateString() === thisDate.toDateString());

            return `
              <div style="min-height:90px;background:${isToday ? 'rgba(99,102,241,0.06)' : 'var(--bg-card)'};border:1px solid ${isToday ? 'var(--primary)' : 'var(--border-color)'};border-radius:12px;padding:8px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;transition:border-color 0.2s;" class="month-day-cell" data-date="${thisDate.toISOString()}">
                <div style="font-weight:800;font-size:0.85rem;color:${isToday ? 'var(--primary)' : 'var(--text-main)'};display:flex;justify-content:space-between;">
                  <span>${dayNum}</span>
                  ${daySessions.length > 0 ? `<span style="background:var(--primary);color:#fff;border-radius:50%;width:18px;height:18px;font-size:0.68rem;display:inline-flex;align-items:center;justify-content:center;">${daySessions.length}</span>` : ''}
                </div>
                <div style="font-size:0.7rem;color:var(--text-muted);overflow:hidden;">
                  ${daySessions.slice(0, 2).map(s => `
                    <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;color:var(--primary);font-weight:600;">
                      • ${s.subjectName || s.course?.subject || s.course?.title || s.title}
                    </div>
                  `).join('')}
                  ${daySessions.length > 2 ? `<div style="font-size:0.65rem;color:var(--text-muted);">+${daySessions.length - 2} المزيد</div>` : ''}
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
    const dateFormatted = sDate.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeFormatted = sDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="session-badge-item">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="width:44px;height:44px;border-radius:12px;background:rgba(99,102,241,0.1);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:1.3rem;">
              ${s.type === 'GROUP' ? '👥' : '👨‍🏫'}
            </div>
            <div>
              <div style="font-weight:800;font-size:0.95rem;color:var(--text-main);display:flex;align-items:center;gap:8px;">
                <span>📚 ${s.subjectName || s.course?.subject || s.course?.title || s.title}</span>
                <span class="badge" style="background:${s.type === 'GROUP' ? 'rgba(99,102,241,0.1)' : 'rgba(245,158,11,0.1)'};color:${s.type === 'GROUP' ? 'var(--primary)' : '#d97706'};font-size:0.7rem;padding:2px 7px;border-radius:6px;font-weight:800;">
                  ${s.type === 'GROUP' ? 'حصة مجموعة' : 'حصة خاصة 1-on-1'}
                </span>
                ${s.isPast ? `<span class="badge" style="background:rgba(100,116,139,0.1);color:var(--text-muted);font-size:0.68rem;padding:2px 6px;border-radius:4px;">انتهت</span>` : `<span class="badge" style="background:rgba(16,185,129,0.12);color:#10b981;font-size:0.68rem;padding:2px 6px;border-radius:4px;">قادمة</span>`}
              </div>
              <div style="display:flex;align-items:center;gap:14px;color:var(--text-muted);font-size:0.8rem;margin-top:4px;flex-wrap:wrap;">
                <span>📅 ${dateFormatted}</span>
                <span>⏰ ${timeFormatted} (${s.duration || 60} دقيقة)</span>
                ${s.teacher ? `<span>👨‍🏫 المعلم: <strong>${s.teacher.name}</strong></span>` : ''}
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

  // ── 2. GROUPS & COURSES TAB ───────────────────────────────────────────────
  renderGroupsTab() {
    const groups = this.data.groups || [];

    if (groups.length === 0) {
      return `
        <div style="background:var(--bg-card);border:1px dashed var(--border-color);border-radius:18px;padding:60px 20px;text-align:center;color:var(--text-muted);">
          <div style="font-size:3rem;margin-bottom:10px;">👥</div>
          <h4 style="font-weight:800;font-size:1.1rem;color:var(--text-main);margin-bottom:6px;">الطالب غير مسجل في أي مجموعة بعد</h4>
          <p style="font-size:0.85rem;">يمكنك إضافة الطالب إلى مجموعة من خلال تبويب المجموعات في لوحة التحكم.</p>
        </div>
      `;
    }

    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:16px;">
        ${groups.map(g => {
          const grp = g.group;
          const crs = g.course || grp?.course;
          const tch = grp?.teacher || crs?.teacher;

          return `
            <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:18px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,0.03);">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                <span class="badge" style="background:rgba(99,102,241,0.1);color:var(--primary);font-size:0.75rem;padding:3px 8px;border-radius:6px;font-weight:800;">
                  ${grp ? 'مجموعة تعليمية' : 'دورة فردية'}
                </span>
                <span style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">انضمام: ${new Date(g.enrolledAt).toLocaleDateString('ar-EG')}</span>
              </div>

              <h4 style="font-weight:900;font-size:1.1rem;color:var(--text-main);margin-bottom:6px;">
                ${grp ? grp.name : (crs ? crs.title : 'مجموعة غير محددة')}
              </h4>

              ${crs ? `<div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:10px;">📚 الكورس: <strong>${crs.title}</strong> ${crs.grade ? `(${crs.grade})` : ''}</div>` : ''}

              ${tch ? `
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;background:rgba(0,0,0,0.02);padding:8px 12px;border-radius:10px;">
                  <img src="${tch.avatar || 'assets/logo.png'}" onerror="this.src='assets/logo.png'" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">
                  <div>
                    <div style="font-size:0.82rem;font-weight:800;color:var(--text-main);">أ. ${tch.name}</div>
                    <div style="font-size:0.72rem;color:var(--text-muted);">${tch.phone || 'معلم المادة'}</div>
                  </div>
                </div>
              ` : ''}

              ${grp && grp.scheduleText ? `
                <div style="font-size:0.8rem;color:var(--text-main);font-weight:700;display:flex;align-items:center;gap:6px;margin-bottom:12px;background:rgba(16,185,129,0.08);padding:6px 10px;border-radius:8px;">
                  <i data-lucide="clock" style="width:13px;height:13px;color:#10b981;"></i> ${grp.scheduleText}
                </div>
              ` : ''}

              ${grp && grp.nextSession ? `
                <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:14px;">
                  الحصة القادمة: <strong style="color:var(--primary);">${new Date(grp.nextSession.scheduledAt).toLocaleDateString('ar-EG')}</strong> (${grp.nextSession.title})
                </div>
              ` : ''}

              <!-- Remove from group button -->
              <div style="border-top:1px solid var(--border-color);padding-top:12px;display:flex;justify-content:flex-end;">
                <button class="btn-outline remove-from-group-btn" data-group-id="${grp?.id || ''}" data-student-id="${this.studentId}" style="color:#ef4444;border-color:rgba(239,68,68,0.3);font-size:0.78rem;padding:6px 12px;border-radius:8px;">
                  <i data-lucide="user-minus" style="width:12px;height:12px;"></i> إزالة من المجموعة
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // ── 3. ACADEMICS & ASSIGNMENTS TAB ─────────────────────────────────────────
  renderAcademicsTab() {
    const submissions = this.data.submissions || [];

    if (submissions.length === 0) {
      return `
        <div style="background:var(--bg-card);border:1px dashed var(--border-color);border-radius:18px;padding:60px 20px;text-align:center;color:var(--text-muted);">
          <div style="font-size:3rem;margin-bottom:10px;">📝</div>
          <h4 style="font-weight:800;font-size:1.1rem;color:var(--text-main);margin-bottom:6px;">لا توجد تسليمات واجبات حتى الآن</h4>
          <p style="font-size:0.85rem;">لم يقم الطالب برفع أي واجبات أو امتحانات بعد.</p>
        </div>
      `;
    }

    return `
      <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:18px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.03);">
        <table style="width:100%;border-collapse:collapse;text-align:start;">
          <thead>
            <tr style="border-bottom:1px solid var(--border-color);background:rgba(0,0,0,0.02);font-size:0.82rem;color:var(--text-muted);">
              <th style="padding:14px 18px;">عنوان الواجب / الاختبار</th>
              <th style="padding:14px 18px;">تاريخ التسليم</th>
              <th style="padding:14px 18px;">الدرجة</th>
              <th style="padding:14px 18px;">الحالة</th>
              <th style="padding:14px 18px;">ملاحظات المعلم</th>
            </tr>
          </thead>
          <tbody>
            ${submissions.map(sub => `
              <tr style="border-bottom:1px solid var(--border-color);font-size:0.85rem;">
                <td style="padding:14px 18px;font-weight:800;color:var(--text-main);">
                  ${sub.assignment ? sub.assignment.title : 'واجب تعليمي'}
                </td>
                <td style="padding:14px 18px;color:var(--text-muted);">
                  ${new Date(sub.submittedAt).toLocaleDateString('ar-EG')}
                </td>
                <td style="padding:14px 18px;">
                  ${sub.grade != null ? `
                    <span style="font-weight:900;color:${(sub.percentage || 100) >= 70 ? '#10b981' : '#ef4444'};">
                      ${sub.grade} / ${sub.assignment?.maxGrade || 100} (${sub.percentage || 0}%)
                    </span>
                  ` : '<span style="color:var(--text-muted);">قيد التصحيح</span>'}
                </td>
                <td style="padding:14px 18px;">
                  <span class="badge" style="background:${sub.status === 'graded' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)'};color:${sub.status === 'graded' ? '#10b981' : '#d97706'};font-size:0.75rem;padding:3px 8px;border-radius:6px;font-weight:800;">
                    ${sub.status === 'graded' ? 'تم التصحيح' : 'تم التسليم'}
                  </span>
                </td>
                <td style="padding:14px 18px;color:var(--text-muted);font-size:0.8rem;">
                  ${sub.feedback || '—'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ── 4. FINANCIALS TAB ─────────────────────────────────────────────────────
  renderFinancialsTab() {
    const payments = this.data.payments || [];
    const subscriptions = this.data.subscriptions || [];

    return `
      <div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px;margin-bottom:24px;">
          <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:16px;padding:20px;">
            <div style="font-size:0.8rem;color:var(--text-muted);font-weight:700;">إجمالي المدفوعات المؤكدة</div>
            <div style="font-size:1.8rem;font-weight:900;color:#10b981;margin-top:4px;">
              ${this.data.stats.totalPaidAmount || 0} ج.م
            </div>
          </div>
          <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:16px;padding:20px;">
            <div style="font-size:0.8rem;color:var(--text-muted);font-weight:700;">باقات الحصص الخاصة النشطة</div>
            <div style="font-size:1.8rem;font-weight:900;color:var(--primary);margin-top:4px;">
              ${subscriptions.filter(s => s.status === 'ACTIVE').length} باقة
            </div>
          </div>
        </div>

        <!-- Payments Table -->
        <h4 style="font-weight:800;font-size:1rem;color:var(--text-main);margin-bottom:12px;">سجل الفواتير وعمليات الدفع</h4>
        ${payments.length === 0 ? `
          <div style="background:var(--bg-card);border:1px dashed var(--border-color);border-radius:16px;padding:40px 20px;text-align:center;color:var(--text-muted);">
            لا توجد عمليات دفع مسجلة لهذا الطالب.
          </div>
        ` : `
          <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:18px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.03);">
            <table style="width:100%;border-collapse:collapse;text-align:start;">
              <thead>
                <tr style="border-bottom:1px solid var(--border-color);background:rgba(0,0,0,0.02);font-size:0.82rem;color:var(--text-muted);">
                  <th style="padding:14px 18px;">الوصف</th>
                  <th style="padding:14px 18px;">المبلغ</th>
                  <th style="padding:14px 18px;">طريقة الدفع</th>
                  <th style="padding:14px 18px;">الحالة</th>
                  <th style="padding:14px 18px;">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                ${payments.map(p => `
                  <tr style="border-bottom:1px solid var(--border-color);font-size:0.85rem;">
                    <td style="padding:14px 18px;font-weight:800;color:var(--text-main);">${p.description}</td>
                    <td style="padding:14px 18px;font-weight:900;color:#10b981;">${p.amount} ج.م</td>
                    <td style="padding:14px 18px;color:var(--text-muted);">${p.method || 'تحويل إلكتروني'}</td>
                    <td style="padding:14px 18px;">
                      <span class="badge" style="background:${p.status === 'SUCCESS' || p.status === 'COMPLETED' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)'};color:${p.status === 'SUCCESS' || p.status === 'COMPLETED' ? '#10b981' : '#d97706'};font-size:0.75rem;padding:3px 8px;border-radius:6px;font-weight:800;">
                        ${p.status === 'SUCCESS' || p.status === 'COMPLETED' ? 'ناجحة' : 'معلقة'}
                      </span>
                    </td>
                    <td style="padding:14px 18px;color:var(--text-muted);">${new Date(p.createdAt).toLocaleDateString('ar-EG')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  }

  // ── 5. ADMIN NOTES TAB ────────────────────────────────────────────────────
  renderNotesTab() {
    const student = this.data.student;
    return `
      <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:18px;padding:24px;max-width:800px;">
        <h4 style="font-weight:900;font-size:1.1rem;color:var(--text-main);margin-bottom:8px;">ملاحظات خاصة بالإدارة حول الطالب 📝</h4>
        <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:16px;">هذه الملاحظات سرية ولا تظهر إلا للمسؤولين والمشرفين لمتابعة حالة الطالب أو التواصل مع ولي أمره.</p>

        <textarea id="std-admin-notes-textarea" class="form-input" style="width:100%;height:160px;padding:14px;border-radius:12px;font-size:0.9rem;line-height:1.6;" placeholder="اكتب ملاحظاتك عن سلوك الطالب، مستوى التحصيل، اتفاقات الدفع، إلخ...">${student.notes || ''}</textarea>

        <div style="margin-top:16px;display:flex;justify-content:flex-end;">
          <button id="std-save-notes-btn" class="btn-primary" style="padding:10px 22px;border-radius:12px;font-weight:800;display:inline-flex;align-items:center;gap:8px;">
            <i data-lucide="save"></i> حفظ الملاحظات
          </button>
        </div>
      </div>
    `;
  }

  // ── EVENT LISTENERS ───────────────────────────────────────────────────────
  bindEvents() {
    // Back to students table
    this.container.querySelector("#std-back-btn")?.addEventListener("click", () => {
      this.adminView.selectedStudentId = null;
      if (window.location.hash.includes("/students/")) {
        history.pushState(null, "", "#admin-dashboard/students");
      }
      this.adminView.renderTab("students");
    });

    // Sub-tabs switching
    this.container.querySelectorAll(".std-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");
        if (tab && tab !== this.activeTab) {
          this.activeTab = tab;
          this.container.querySelectorAll(".std-tab-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          const container = this.container.querySelector("#std-subtab-container");
          if (container) {
            container.innerHTML = this.renderActiveTabContent();
            if (window.lucide) window.lucide.createIcons();
            this.bindTabSpecificEvents();
          }
        }
      });
    });

    // Edit student modal
    this.container.querySelector("#std-edit-btn")?.addEventListener("click", () => {
      if (this.adminView.openEditUserModal) {
        this.adminView.openEditUserModal(this.data.student);
      }
    });

    // Block / unblock toggle
    this.container.querySelector("#std-block-toggle-btn")?.addEventListener("click", async () => {
      const student = this.data.student;
      const willBlock = !student.isBlocked;
      const confirmed = await confirmDialog(willBlock ? `هل أنت متأكد من حظر الطالب ${student.name}؟` : `هل أنت متأكد من إلغاء حظر الطالب ${student.name}؟`);
      if (!confirmed) return;

      try {
        await apiFetch(`/admin/users/${student.id}/block`, {
          method: "PATCH",
          body: JSON.stringify({ isBlocked: willBlock })
        });
        showToast(willBlock ? "تم حظر الطالب بنجاح" : "تم إلغاء الحظر بنجاح", "success");
        await this.render();
      } catch (e) {
        showToast(e.message || "فشل تحديث حالة الحساب", "error");
      }
    });

    this.bindTabSpecificEvents();
  }

  bindTabSpecificEvents() {
    // Calendar view toggle
    this.container.querySelector("#view-day-btn")?.addEventListener("click", () => {
      this.timetableView = "day";
      this.refreshTimetable();
    });
    this.container.querySelector("#view-week-btn")?.addEventListener("click", () => {
      this.timetableView = "week";
      this.refreshTimetable();
    });
    this.container.querySelector("#view-month-btn")?.addEventListener("click", () => {
      this.timetableView = "month";
      this.refreshTimetable();
    });

    // Calendar date navs
    this.container.querySelector("#cal-prev-btn")?.addEventListener("click", () => {
      if (this.timetableView === "day") {
        this.currentDate.setDate(this.currentDate.getDate() - 1);
      } else if (this.timetableView === "week") {
        this.currentDate.setDate(this.currentDate.getDate() - 7);
      } else {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      }
      this.refreshTimetable();
    });

    this.container.querySelector("#cal-next-btn")?.addEventListener("click", () => {
      if (this.timetableView === "day") {
        this.currentDate.setDate(this.currentDate.getDate() + 1);
      } else if (this.timetableView === "week") {
        this.currentDate.setDate(this.currentDate.getDate() + 7);
      } else {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      }
      this.refreshTimetable();
    });

    this.container.querySelector("#cal-today-btn")?.addEventListener("click", () => {
      this.currentDate = new Date();
      this.refreshTimetable();
    });

    // Click on day in month view jumps to day view
    this.container.querySelectorAll(".month-day-cell").forEach(cell => {
      cell.addEventListener("click", () => {
        const dStr = cell.getAttribute("data-date");
        if (dStr) {
          this.currentDate = new Date(dStr);
          this.timetableView = "day";
          this.refreshTimetable();
        }
      });
    });

    // Remove student from group
    this.container.querySelectorAll(".remove-from-group-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const groupId = btn.getAttribute("data-group-id");
        if (!groupId) return;
        const confirmed = await confirmDialog("هل أنت متأكد من رغبتك في إزالة الطالب من هذه المجموعة؟");
        if (!confirmed) return;

        try {
          await apiFetch(`/admin/groups/${groupId}/remove-student`, {
            method: "POST",
            body: JSON.stringify({ studentId: this.studentId })
          });
          showToast("تمت إزالة الطالب من المجموعة بنجاح", "success");
          await this.render();
        } catch (e) {
          showToast(e.message || "فشل إزالة الطالب", "error");
        }
      });
    });

    // Export Weekly Timetable to PDF
    this.container.querySelector("#export-weekly-pdf-btn")?.addEventListener("click", () => {
      this.exportWeeklyTimetableToPDF();
    });

    // Save admin notes
    this.container.querySelector("#std-save-notes-btn")?.addEventListener("click", async () => {
      const textarea = this.container.querySelector("#std-admin-notes-textarea");
      const notes = textarea ? textarea.value : "";
      try {
        await apiFetch(`/admin/students/${this.studentId}/notes`, {
          method: "PATCH",
          body: JSON.stringify({ notes })
        });
        showToast("تم حفظ ملاحظات الإدارة بنجاح 💾", "success");
      } catch (e) {
        showToast(e.message || "فشل حفظ الملاحظات", "error");
      }
    });
  }

  refreshTimetable() {
    const container = this.container.querySelector("#std-subtab-container");
    if (container && this.activeTab === "timetable") {
      container.innerHTML = this.renderTimetableTab();
      if (window.lucide) window.lucide.createIcons();
      this.bindTabSpecificEvents();
    }
  }

  // ── EXPORT WEEKLY TIMETABLE TO PDF WITH ACADEMY LOGO ──────────────────────
  async exportWeeklyTimetableToPDF() {
    const student = this.data.student;
    const allSessions = this.data.sessions.all || [];

    // Calculate active week
    const d = new Date(this.currentDate);
    const dayIndex = (d.getDay() + 1) % 7; // Saturday as first day of week
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
    const weekLabel = `${startOfWeek.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })} - ${endOfWeek.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    const dayNames = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

    // Try converting logo to base64 so it embeds reliably
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

    // Build the printable weekly schedule HTML
    const printableHTML = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>الجدول الدراسي الأسبوعي - ${student.name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Cairo', 'Outfit', sans-serif;
            background: #ffffff;
            color: #1e293b;
            margin: 0;
            padding: 12px;
            font-size: 12px;
          }
          .pdf-container {
            width: 100%;
            max-width: 1100px;
            margin: 0 auto;
            border: 2px solid #e2e8f0;
            border-radius: 14px;
            padding: 20px;
            background: #ffffff;
          }
          .pdf-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #4f46e5;
            padding-bottom: 16px;
            margin-bottom: 16px;
          }
          .academy-brand {
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .academy-logo {
            width: 65px;
            height: 65px;
            object-fit: contain;
            border-radius: 12px;
          }
          .academy-title {
            font-size: 20px;
            font-weight: 900;
            color: #1e1b4b;
            margin: 0;
          }
          .academy-subtitle {
            font-size: 11px;
            color: #64748b;
            font-weight: 700;
            margin: 2px 0 0;
          }
          .report-badge {
            text-align: center;
          }
          .report-tag {
            background: #e0e7ff;
            color: #4338ca;
            padding: 4px 14px;
            border-radius: 20px;
            font-weight: 800;
            font-size: 12px;
            display: inline-block;
            margin-bottom: 4px;
          }
          .student-banner {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 12px 18px;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 18px;
          }
          .student-banner-item {
            font-size: 11.5px;
          }
          .student-banner-label {
            color: #64748b;
            font-size: 10px;
            font-weight: 700;
            margin-bottom: 2px;
          }
          .student-banner-val {
            font-weight: 800;
            color: #0f172a;
          }
          .timetable-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin-bottom: 16px;
          }
          .timetable-table th {
            background: #f1f5f9;
            color: #1e293b;
            font-weight: 800;
            padding: 8px 6px;
            border: 1px solid #cbd5e1;
            font-size: 11.5px;
            text-align: center;
          }
          .timetable-table td {
            vertical-align: top;
            padding: 8px 6px;
            border: 1px solid #cbd5e1;
            background: #ffffff;
            height: 190px;
          }
          .session-card {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-right: 4px solid #16a34a;
            border-radius: 6px;
            padding: 6px 8px;
            margin-bottom: 6px;
            text-align: right;
          }
          .session-card.private {
            background: #fefce8;
            border-color: #fef08a;
            border-right-color: #ca8a04;
          }
          .session-time {
            font-weight: 800;
            color: #15803d;
            font-size: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2px;
          }
          .session-card.private .session-time {
            color: #a16207;
          }
          .session-name {
            font-weight: 800;
            color: #0f172a;
            font-size: 11px;
            line-height: 1.3;
            margin-bottom: 2px;
          }
          .session-teacher {
            color: #64748b;
            font-size: 9.5px;
            font-weight: 700;
          }
          .no-sessions {
            text-align: center;
            color: #94a3b8;
            font-size: 10.5px;
            padding: 30px 4px 0;
            font-weight: 600;
          }
          .pdf-footer {
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 10px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="pdf-container">
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
              <span class="report-tag">📅 الجدول الدراسي الأسبوعي</span>
              <div style="font-weight:800;font-size:12px;color:#1e293b;">${weekLabel}</div>
            </div>

            <div style="text-align:left;font-size:10.5px;line-height:1.5;">
              <div>تاريخ الإصدار: <strong>${new Date().toLocaleDateString('ar-EG')}</strong></div>
              <div>الحالة: <span style="color:#16a34a;font-weight:800;">معتمد من الإدارة ✅</span></div>
            </div>
          </div>

          <!-- Student Information Bar -->
          <div class="student-banner">
            <div class="student-banner-item">
              <div class="student-banner-label">👤 اسم الطالب:</div>
              <div class="student-banner-val">${student.name}</div>
            </div>
            <div class="student-banner-item">
              <div class="student-banner-label">🎓 المرحلة / الصف:</div>
              <div class="student-banner-val">${student.education || 'غير محدد'}</div>
            </div>
            <div class="student-banner-item">
              <div class="student-banner-label">📧 البريد الإلكتروني:</div>
              <div class="student-banner-val">${student.email}</div>
            </div>
            <div class="student-banner-item">
              <div class="student-banner-label">📞 هاتف التواصل / ولي الأمر:</div>
              <div class="student-banner-val">${student.parentPhone || student.phone || 'غير مسجل'}</div>
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
                        return `
                          <div class="session-card ${isPriv ? 'private' : ''}">
                            <div class="session-time">
                              <span>⏰ ${sTime}</span>
                              <span style="font-size:8.5px;">${isPriv ? 'حصة خاصة' : 'مجموعة'}</span>
                            </div>
                            <div class="session-name">📚 ${s.subjectName || s.course?.subject || s.course?.title || s.title}</div>
                            ${s.teacher ? `<div class="session-teacher">👨‍🏫 أ. ${s.teacher.name}</div>` : ''}
                          </div>
                        `;
                      }).join('')}
                    </td>
                  `;
                }).join('')}
              </tr>
            </tbody>
          </table>

          <!-- Footer & Instructions -->
          <div class="pdf-footer">
            <div>
              📌 <strong>إرشادات هامة:</strong> يرجى التواجد في القاعة الافتراضية قبل موعد الحصة بـ 5 دقائق والالتزام بحل الواجبات المحددة.
            </div>
            <div>
              ختم واعتماد الأكاديمية: <strong style="color:#4f46e5;">إدارة الشؤون الأكاديمية 🎓</strong>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Show stylish Action Modal for printing or direct download
    this.showPdfExportModal(printableHTML, student.name);
  }

  showPdfExportModal(htmlContent, studentName) {
    const existing = document.getElementById("pdf-export-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "pdf-export-modal";
    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.background = "rgba(0,0,0,0.65)";
    modal.style.backdropFilter = "blur(8px)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = "99999";
    modal.style.padding = "20px";

    modal.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:20px;max-width:960px;width:100%;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.3);">
        <div style="padding:16px 22px;border-bottom:1px solid var(--border-color);display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.02);">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:1.4rem;">📄</span>
            <div>
              <h3 style="margin:0;font-size:1.1rem;font-weight:900;color:var(--text-main);">تصدير الجدول الدراسي الأسبوعي (PDF)</h3>
              <p style="margin:2px 0 0;font-size:0.8rem;color:var(--text-muted);">معاينة الجدول المعتمد بشعار منصة انطلق التعليمية</p>
            </div>
          </div>
          <button id="close-pdf-modal-btn" style="background:transparent;border:none;cursor:pointer;color:var(--text-muted);font-size:1.4rem;padding:4px 8px;">✕</button>
        </div>

        <div style="flex:1;overflow:auto;padding:16px;background:rgba(0,0,0,0.03);">
          <iframe id="pdf-preview-iframe" style="width:100%;height:460px;border:1px solid var(--border-color);border-radius:12px;background:#ffffff;"></iframe>
        </div>

        <div style="padding:16px 22px;border-top:1px solid var(--border-color);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:var(--bg-card);">
          <div style="font-size:0.8rem;color:var(--text-muted);">
            💡 يمكنك الحفظ كملف PDF مباشر بجودة عالية متجهة (Vector A4 Landscape).
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <button id="direct-print-pdf-btn" class="btn-primary" style="padding:9px 20px;border-radius:12px;font-weight:800;display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--primary),#6366f1);color:#fff;box-shadow:0 4px 14px rgba(99,102,241,0.35);">
              🖨️ طباعة / حفظ كـ PDF
            </button>
            <button id="direct-download-pdf-btn" class="btn-primary" style="padding:9px 20px;border-radius:12px;font-weight:800;display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;box-shadow:0 4px 14px rgba(16,185,129,0.3);">
              📥 تحميل PDF مباشر
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const iframe = modal.querySelector("#pdf-preview-iframe");
    if (iframe) {
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(htmlContent);
      doc.close();
    }

    // Close button
    modal.querySelector("#close-pdf-modal-btn")?.addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

    // Print Button
    modal.querySelector("#direct-print-pdf-btn")?.addEventListener("click", () => {
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
    });

    // Direct Download PDF via html2pdf.js
    modal.querySelector("#direct-download-pdf-btn")?.addEventListener("click", async () => {
      const btn = modal.querySelector("#direct-download-pdf-btn");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ جارٍ التوليد...';
      }

      try {
        if (!window.html2pdf) {
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        const element = iframe.contentWindow.document.querySelector(".pdf-container");
        const opt = {
          margin: 8,
          filename: `جدول_الطالب_${studentName}_الأسبوعي.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        await window.html2pdf().set(opt).from(element).save();
        showToast("تم تنزيل ملف PDF بنجاح 🎉", "success");
      } catch (err) {
        console.error("html2pdf error:", err);
        showToast("جاري فتح نافذة الطباعة كبديل...", "info");
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '📥 تحميل PDF مباشر';
        }
      }
    });
  }
}

