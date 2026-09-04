import { apiFetch, state, t, showToast } from "../app.js";
import { openGroupPaymentModal } from "./shared/GroupPaymentModal.js";

export default class SubjectGroupsView {
  constructor(container, subjectId) {
    this.container = container;
    this.subjectId = subjectId;
    this.subjectData = null;
    this.allGroups = [];
    this.selectedDays = []; // e.g. ["الأحد", "الثلاثاء"]
    this.daysList = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
    this.loading = true;
  }

  async render() {
    this.container.innerHTML = `
      <style id="subject-groups-responsive-css">
        .subject-groups-wrapper {
          background: var(--bg-app);
          min-height: 100vh;
          padding-bottom: 80px;
        }
        .subject-groups-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: clamp(16px, 3.5vw, 32px) clamp(12px, 3vw, 24px);
        }
        .subject-header-icon {
          width: clamp(56px, 12vw, 72px);
          height: clamp(56px, 12vw, 72px);
          font-size: clamp(1.6rem, 4vw, 2.2rem);
          border-radius: 50%;
          background: #008080;
          color: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          margin-bottom: 12px;
          box-shadow: 0 8px 24px rgba(0,128,128,0.25);
          border: 3px solid #ffffff;
        }
        .subject-header-title {
          font-size: clamp(1.4rem, 4vw, 2.2rem);
          font-weight: 900;
          color: var(--text-color);
          margin-bottom: 6px;
        }
        .subject-header-sub {
          font-size: clamp(0.82rem, 2.5vw, 0.95rem);
          color: var(--text-muted);
          font-weight: 700;
        }
        .nagwa-days-filter-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: clamp(14px, 3vw, 20px) clamp(14px, 3vw, 24px);
          margin-bottom: clamp(20px, 4vw, 36px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.03);
        }
        .days-filter-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-start;
          direction: rtl;
        }
        .day-filter-pill {
          flex: 1 1 calc(14.28% - 8px);
          min-width: 80px;
          padding: 10px 14px;
          border-radius: 12px;
          font-weight: 800;
          font-size: clamp(0.82rem, 2vw, 0.95rem);
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }
        @media (max-width: 640px) {
          .day-filter-pill {
            flex: 1 1 calc(25% - 8px);
            min-width: 65px;
            padding: 8px 8px;
          }
        }
        @media (max-width: 380px) {
          .day-filter-pill {
            flex: 1 1 calc(33.33% - 6px);
            min-width: 58px;
            padding: 7px 6px;
            font-size: 0.78rem;
          }
        }
        #groups-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 350px), 1fr));
          gap: clamp(16px, 2.5vw, 24px);
          direction: rtl;
        }
        @media (max-width: 640px) {
          #groups-cards-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
        .nagwa-teacher-group-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 22px;
          overflow: hidden;
          box-shadow: 0 6px 20px rgba(0,0,0,0.04);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .card-header-container {
          background: rgba(0,0,0,0.03);
          padding: clamp(14px, 3vw, 20px) clamp(14px, 3vw, 24px);
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          flex-wrap: wrap;
          gap: 12px;
        }
        @media (max-width: 440px) {
          .card-header-container {
            flex-direction: column;
            align-items: flex-start !important;
          }
          .card-price-container {
            align-self: flex-end;
            text-align: left;
          }
        }
        .card-body-container {
          padding: clamp(16px, 3vw, 22px) clamp(14px, 3vw, 24px);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .card-dates-box {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 8px;
          background: var(--bg-app);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          padding: 10px 14px;
        }
        .card-specs-box {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          text-align: center;
        }
        .card-specs-item {
          background: var(--bg-app);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 8px 4px;
        }
        .card-actions-row {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-top: 6px;
          flex-wrap: wrap;
        }
        .card-action-btn-main {
          flex: 1.4;
          min-width: 130px;
          text-align: center;
        }
        .card-action-btn-details {
          flex: 1;
          min-width: 90px;
          text-align: center;
        }
        @media (max-width: 420px) {
          .card-actions-row {
            flex-direction: column;
            gap: 8px;
          }
          .card-action-btn-main, .card-action-btn-details {
            width: 100% !important;
            flex: none !important;
          }
        }
      </style>

      <div class="subject-groups-wrapper">
        <div class="subject-groups-container">
          
          <!-- TOP BACK BUTTON & BREADCRUMB -->
          <div style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <a href="#landing" style="display:inline-flex; align-items:center; gap:8px; color:var(--text-muted); font-weight:700; text-decoration:none; font-size:clamp(0.88rem, 2vw, 0.95rem);">
              <i data-lucide="arrow-right" style="width:18px;height:18px;"></i> العودة للمستكشف الرئيسي
            </a>
          </div>

          <div id="subject-groups-content">
            <div style="text-align:center; padding:60px 20px;">
              <div class="spinner" style="width:40px; height:40px; margin:0 auto 16px;"></div>
              <p style="color:var(--text-muted); font-weight:700;">جاري تحميل المجموعات والمعلمين...</p>
            </div>
          </div>

        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    await this.loadData();
  }

  async loadData() {
    try {
      this.loading = true;

      // Fallback: If no subjectId provided in URL, load first subject
      if (!this.subjectId) {
        const subs = await apiFetch("/curriculum/subjects");
        if (Array.isArray(subs) && subs.length > 0) {
          this.subjectId = subs[0].id;
        }
      }

      let url = `/curriculum/subjects/${this.subjectId}/groups`;
      if (this.selectedDays.length > 0) {
        url += `?days=${encodeURIComponent(this.selectedDays.join(","))}`;
      }

      let enrollmentsPromise = Promise.resolve([]);
      if (state.user && state.user.role === "student") {
        enrollmentsPromise = apiFetch("/student/enrollments").catch(() => []);
      }

      const [res, myEnrollments] = await Promise.all([
        apiFetch(url),
        enrollmentsPromise
      ]);

      this.subjectData = res.subject;
      this.allGroups = res.groups || [];
      this.myEnrollments = myEnrollments || [];
      this.loading = false;
      this.renderContent();
    } catch (err) {
      console.error(err);
      this.loading = false;
      const contentEl = document.getElementById("subject-groups-content");
      if (contentEl) {
        contentEl.innerHTML = `
          <div class="glass-card" style="text-align:center; padding:50px 20px; border-radius:20px;">
            <p style="color:#ef4444; font-weight:800; font-size:1.1rem; margin-bottom:12px;">فشل في تحميل المجموعات</p>
            <button class="btn-primary" onclick="window.location.hash='#landing'" style="padding:10px 24px; border-radius:20px;">العودة للرئيسية</button>
          </div>
        `;
      }
    }
  }

  renderContent() {
    const contentEl = document.getElementById("subject-groups-content");
    if (!contentEl || !this.subjectData) return;

    const sub = this.subjectData;
    const initialLetter = (sub.name || "م").trim().charAt(0);

    contentEl.innerHTML = `
      <!-- 1. SUBJECT HEADER WITH CIRCULAR BADGE -->
      <div style="text-align:center; margin-bottom:clamp(24px, 4vw, 36px); position:relative;">
        <div class="subject-header-icon">
          ${sub.icon && sub.icon.length <= 2 ? sub.icon : initialLetter}
        </div>
        <h1 class="subject-header-title">
          ${sub.name}
        </h1>
        <p class="subject-header-sub">
          ${sub.subtitle || `${sub.gradeName || ""} • الفصل الدراسي الأول • المنهج الدراسي`}
        </p>
      </div>

      <!-- 2. DAYS OF WEEK FILTER BAR -->
      <div class="nagwa-days-filter-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <button id="clear-all-days-btn" style="background:none; border:none; color:#e51d74; font-weight:800; font-size:0.92rem; cursor:pointer; text-decoration:none; padding:4px 8px; display:${this.selectedDays.length > 0 ? "inline-block" : "none"};">
            إلغاء الكل
          </button>
          <span style="font-weight:900; font-size:clamp(0.95rem, 2vw, 1.05rem); color:var(--text-color); margin-inline-start:auto;">
            أيام الأسبوع
          </span>
        </div>

        <div class="days-filter-list">
          ${this.daysList.map(day => {
            const isSelected = this.selectedDays.includes(day);
            return `
              <button class="day-filter-pill ${isSelected ? "active" : ""}" data-day="${day}" style="
                border:1px solid ${isSelected ? "#e51d74" : "var(--border-color)"};
                background:${isSelected ? "#e51d74" : "var(--bg-app)"};
                color:${isSelected ? "#ffffff" : "var(--text-color)"};
                box-shadow:${isSelected ? "0 4px 12px rgba(229,29,116,0.3)" : "none"};
              ">
                ${day}
              </button>
            `;
          }).join("")}
        </div>
      </div>

      <!-- 3. GROUPS & TEACHERS CARDS GRID -->
      <div id="groups-cards-grid">
        ${this.renderGroupsList()}
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.attachEvents();
  }

  renderGroupsList() {
    if (this.allGroups.length === 0) {
      return `
        <div style="grid-column:1/-1; text-align:center; padding:60px 20px; background:var(--bg-card); border-radius:20px; border:1px solid var(--border-color);">
          <div style="font-size:3rem; margin-bottom:12px;">📅</div>
          <h3 style="font-size:1.2rem; font-weight:800; color:var(--text-color); margin-bottom:8px;">لا توجد مجموعات متاحة حالياً</h3>
          <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:16px;">لم يتم إضافة مجموعات دراسية لهذه المادة حتى الآن أو لا توجد مجموعات في الأيام المحددة.</p>
          ${this.selectedDays.length > 0 ? `
            <button id="reset-filter-empty-btn" class="btn-primary" style="padding:10px 24px; border-radius:20px; background:#e51d74; border-color:#e51d74;">عرض جميع الأيام</button>
          ` : ''}
        </div>
      `;
    }

    const formatArabicDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    };

    return this.allGroups.map(group => {
      const isFull = group.isFull || group.availableSeats <= 0;
      const monthlyPrice = group.monthlyPrice || group.price || 0;
      const sessionPrice = group.sessionPrice || (monthlyPrice > 0 ? Math.round(monthlyPrice / 8) : 0);
      const totalSessions = group.totalSessions || 8;
      const duration = group.sessionDuration || 60;
      const startDateText = group.startDate ? formatArabicDate(group.startDate) : "حسب جدول الحصص";
      const endDateText = group.endDate ? formatArabicDate(group.endDate) : "حسب جدول الحصص";
      const teacherInitial = (group.teacher?.name || "م").trim().charAt(0);
      
      return `
        <div class="nagwa-teacher-group-card">
          
          <!-- CARD HEADER -->
          <div class="card-header-container">
            
            <!-- TEACHER INFO -->
            <div style="display:flex; align-items:center; gap:12px;">
              ${group.teacher?.avatar ? `
                <img src="${group.teacher.avatar}" 
                     alt="${group.teacher.name || ""}" 
                     style="width:48px; height:48px; border-radius:50%; object-fit:cover; border:2px solid #ffffff; box-shadow:0 4px 10px rgba(0,0,0,0.1); flex-shrink:0;">
              ` : `
                <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg, #008080, #004d4d); color:#ffffff; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:1.1rem; flex-shrink:0; border:2px solid #ffffff; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
                  ${teacherInitial}
                </div>
              `}
              <div>
                <h3 style="font-size:clamp(1rem, 2.5vw, 1.15rem); font-weight:900; color:var(--text-color); margin:0 0 4px 0;">
                  ${group.teacher?.name || "معلم معتمد"}
                </h3>
                ${group.teacher?.rating ? `
                  <div style="display:inline-flex; align-items:center; gap:6px; background:var(--bg-card); border:1px solid var(--border-color); padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:800; color:var(--text-muted);">
                    ${group.teacher.ratingCount ? `<span>👍 ${group.teacher.ratingCount}</span><span style="opacity:0.4;">|</span>` : ''}
                    <span style="color:#10b981;">${group.teacher.rating}%</span>
                  </div>
                ` : `
                  <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">معلم المادة</span>
                `}
              </div>
            </div>

            <!-- PRICE HEADER -->
            <div class="card-price-container" style="text-align:left;">
              <div style="font-size:0.75rem; font-weight:800; color:var(--text-muted); margin-bottom:2px;">الاشتراك الشهري</div>
              <div style="font-size:clamp(1.2rem, 3vw, 1.35rem); font-weight:900; color:#e51d74; line-height:1.1;">
                ${monthlyPrice} ${group.currency || "ج.م."}
              </div>
              ${sessionPrice > 0 ? `
                <div style="font-size:0.72rem; color:var(--text-muted); font-weight:700;">(سعر الحصة ${sessionPrice} ج.م.)</div>
              ` : ''}
            </div>

          </div>

          <!-- CARD BODY -->
          <div class="card-body-container">
            
            <!-- SCHEDULE ROW -->
            <div style="display:flex; align-items:center; gap:8px; font-size:clamp(0.82rem, 2vw, 0.92rem); background:rgba(229,29,116,0.06); padding:8px 12px; border-radius:12px; color:#e51d74; font-weight:800; line-height:1.4;">
              <i data-lucide="calendar" style="width:16px; height:16px; flex-shrink:0;"></i>
              <span>الجدول: ${group.scheduleText || (group.scheduleDays ? `${group.scheduleDays} ${group.scheduleTime || ""}`.trim() : "حسب جدول المجموعة")}</span>
            </div>

            <!-- DATES GRID (START & END) -->
            <div class="card-dates-box">
              <div>
                <div style="font-size:0.75rem; color:var(--text-muted); font-weight:800; margin-bottom:2px;">تاريخ البدء</div>
                <div style="font-size:clamp(0.78rem, 2vw, 0.85rem); font-weight:900; color:var(--text-color); line-height:1.3;">${startDateText}</div>
              </div>
              <div>
                <div style="font-size:0.75rem; color:var(--text-muted); font-weight:800; margin-bottom:2px;">تاريخ الانتهاء</div>
                <div style="font-size:clamp(0.78rem, 2vw, 0.85rem); font-weight:900; color:var(--text-color); line-height:1.3;">${endDateText}</div>
              </div>
            </div>

            <!-- COHORT SPECIFICATIONS (SESSIONS COUNT, DURATION, SEATS) -->
            <div class="card-specs-box">
              <div class="card-specs-item">
                <div style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">عدد الحصص</div>
                <div style="font-size:clamp(0.85rem, 2vw, 0.92rem); font-weight:900; color:var(--text-color); margin-top:2px;">${totalSessions}</div>
              </div>
              <div class="card-specs-item">
                <div style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">مدة الحصة</div>
                <div style="font-size:clamp(0.85rem, 2vw, 0.92rem); font-weight:900; color:var(--text-color); margin-top:2px;">${duration} دقيقةً</div>
              </div>
              <div class="card-specs-item">
                <div style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">إجمالي المقاعد</div>
                <div style="font-size:clamp(0.85rem, 2vw, 0.92rem); font-weight:900; color:var(--text-color); margin-top:2px;">${group.maxStudents || 25}</div>
              </div>
            </div>

            <!-- REMAINING SEATS -->
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:clamp(0.82rem, 2vw, 0.88rem); flex-wrap:wrap; gap:4px;">
              <span style="font-weight:800; color:var(--text-color);">المقاعد المتبقية:</span>
              <span style="font-weight:900; color:${isFull ? "#ef4444" : "#10b981"};">
                ${isFull ? "مكتملة بالكامل (0 متبقي)" : `${group.availableSeats} من إجمالي ${group.maxStudents || 25}`}
              </span>
            </div>

            <!-- ACTION BUTTONS -->
            <div class="card-actions-row">
              ${(() => {
                const myEnrollment = (this.myEnrollments || []).find(e => 
                  e.group?.id && String(e.group.id) === String(group.groupId)
                );
                const isPending = myEnrollment && (myEnrollment.status === 'pending' || myEnrollment.status === 'PENDING');
                const isActive = myEnrollment && (myEnrollment.status === 'active' || myEnrollment.status === 'ACTIVE');

                if (isPending) {
                  return `
                    <div class="card-action-btn-main" style="
                      background:rgba(245, 158, 11, 0.12);
                      border:1.5px solid #f59e0b;
                      color:#d97706;
                      padding:11px 14px;
                      border-radius:30px;
                      font-weight:900;
                      font-size:clamp(0.85rem, 2vw, 0.92rem);
                      display:flex;
                      align-items:center;
                      justify-content:center;
                      gap:6px;
                    ">
                      <span>⏳ قيد المراجعة والاعتماد</span>
                    </div>
                  `;
                }

                if (isActive) {
                  return `
                    <button disabled class="card-action-btn-main" style="
                      background:#10b981;
                      color:#ffffff;
                      border:none;
                      padding:12px 14px;
                      border-radius:30px;
                      font-weight:900;
                      font-size:clamp(0.85rem, 2vw, 0.9rem);
                      cursor:default;
                    ">
                      ✓ أنت مسجل بالمجموعة
                    </button>
                  `;
                }

                if (group.status === 'IN_PROGRESS' || group.status === 'CLOSED') {
                  return `
                    <button disabled class="card-action-btn-main" style="
                      background:#6366f1;
                      color:#ffffff;
                      border:none;
                      padding:12px 16px;
                      border-radius:30px;
                      font-weight:900;
                      font-size:clamp(0.85rem, 2vw, 0.9rem);
                      cursor:not-allowed;
                      display:flex;
                      align-items:center;
                      justify-content:center;
                      gap:6px;
                    ">
                      <span>🔒 مغلقة وبدأت الدراسة</span>
                    </button>
                  `;
                }

                if (isFull) {
                  return `
                    <button disabled class="card-action-btn-main" style="
                      background:#9ca3af;
                      color:#ffffff;
                      border:none;
                      padding:12px 20px;
                      border-radius:30px;
                      font-weight:900;
                      font-size:clamp(0.9rem, 2vw, 1rem);
                      cursor:not-allowed;
                    ">
                      المجموعة مكتملة
                    </button>
                  `;
                }

                return `
                  <button class="enroll-group-btn card-action-btn-main" 
                          data-course-id="${group.courseId}" 
                          data-group-id="${group.groupId}" 
                          data-group-name="${group.groupName}"
                          data-is-full="${isFull}"
                          style="
                            background:#e51d74;
                            color:#ffffff;
                            border:none;
                            padding:12px 20px;
                            border-radius:30px;
                            font-weight:900;
                            font-size:clamp(0.9rem, 2vw, 1rem);
                            cursor:pointer;
                            transition:all 0.2s ease;
                            box-shadow:0 4px 14px rgba(229,29,116,0.35);
                          ">
                    سجل الآن 🚀
                  </button>
                `;
              })()}

              <a href="#course-preview/${group.courseId}/${group.groupId}" class="card-action-btn-details" style="
                background:transparent;
                color:var(--text-color);
                border:1px solid var(--border-color);
                padding:12px 18px;
                border-radius:30px;
                font-weight:800;
                font-size:clamp(0.85rem, 2vw, 0.95rem);
                text-decoration:none;
                transition:all 0.2s ease;
                display:inline-block;
              " onmouseenter="this.style.background='var(--bg-app)'" onmouseleave="this.style.background='transparent'">
                التفاصيل
              </a>
            </div>

          </div>

        </div>
      `;
    }).join("");
  }

  attachEvents() {
    // Day filter pills click
    document.querySelectorAll(".day-filter-pill").forEach(btn => {
      btn.addEventListener("click", async () => {
        const day = btn.getAttribute("data-day");
        if (this.selectedDays.includes(day)) {
          this.selectedDays = this.selectedDays.filter(d => d !== day);
        } else {
          this.selectedDays.push(day);
        }
        await this.loadData();
      });
    });

    // Clear all days
    document.getElementById("clear-all-days-btn")?.addEventListener("click", async () => {
      this.selectedDays = [];
      await this.loadData();
    });

    // Reset when empty
    document.getElementById("reset-filter-empty-btn")?.addEventListener("click", async () => {
      this.selectedDays = [];
      await this.loadData();
    });

    // Enroll in group button
    document.querySelectorAll(".enroll-group-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const isFull = btn.getAttribute("data-is-full") === "true";
        if (isFull) {
          showToast("عذراً، هذه المجموعة مكتملة العدد. يرجى اختيار مجموعة أخرى.", "warning");
          return;
        }

        const courseId = btn.getAttribute("data-course-id");
        const groupId = btn.getAttribute("data-group-id");
        const groupName = btn.getAttribute("data-group-name");

        const groupObj = this.allGroups.find(g => g.groupId === groupId) || {};

        openGroupPaymentModal({
          courseId,
          courseTitle: groupObj.courseTitle || this.subjectData?.name || "المقرر الدراسي",
          groupId,
          groupName: groupName || groupObj.groupName || "المجموعة الدراسية",
          teacherName: groupObj.teacherName || "الأستاذ",
          subjectName: this.subjectData?.name || "",
          scheduleDays: groupObj.scheduleDays || "الأحد والأربعاء",
          scheduleTime: groupObj.scheduleTime || "06:00 م",
          sessionPrice: groupObj.sessionPrice || 40,
          monthlyPrice: groupObj.monthlyPrice || 320,
          totalSessions: groupObj.totalSessions || 24,
          onSuccess: async () => {
            await this.loadData();
          }
        });
      });
    });
  }
}
