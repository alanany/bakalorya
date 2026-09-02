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
      <div style="background:var(--bg-app); min-height:100vh; padding-bottom:80px;">
        <div style="max-width:1100px; margin:0 auto; padding:32px 20px;">
          
          <!-- TOP BACK BUTTON & BREADCRUMB -->
          <div style="margin-bottom:24px; display:flex; justify-content:space-between; align-items:center;">
            <a href="#landing" style="display:inline-flex; align-items:center; gap:8px; color:var(--text-muted); font-weight:700; text-decoration:none; font-size:0.95rem;">
              <i data-lucide="arrow-right" style="width:18px;height:18px;"></i> العودة للمستكشف الرئيسي
            </a>
          </div>

          <div id="subject-groups-content">
            <div style="text-align:center; padding:80px 20px;">
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
      <div style="text-align:center; margin-bottom:36px; position:relative;">
        <div style="width:72px; height:72px; border-radius:50%; background:#008080; color:#ffffff; display:inline-flex; align-items:center; justify-content:center; font-size:2.2rem; font-weight:900; margin-bottom:14px; box-shadow:0 8px 24px rgba(0,128,128,0.25); border:3px solid #ffffff;">
          ${sub.icon && sub.icon.length <= 2 ? sub.icon : initialLetter}
        </div>
        <h1 style="font-size:2.2rem; font-weight:900; color:var(--text-color); margin-bottom:8px;">
          ${sub.name}
        </h1>
        <p style="font-size:0.95rem; color:var(--text-muted); font-weight:700;">
          ${sub.subtitle || `${sub.gradeName || ""} • الفصل الدراسي الأول • المنهج الدراسي`}
        </p>
      </div>

      <!-- 2. DAYS OF WEEK FILTER BAR -->
      <div class="nagwa-days-filter-card" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:20px; padding:20px 24px; margin-bottom:36px; box-shadow:0 4px 16px rgba(0,0,0,0.03);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <button id="clear-all-days-btn" style="background:none; border:none; color:#e51d74; font-weight:800; font-size:0.95rem; cursor:pointer; text-decoration:none; padding:4px 8px; display:${this.selectedDays.length > 0 ? "inline-block" : "none"};">
            إلغاء الكل
          </button>
          <span style="font-weight:900; font-size:1.05rem; color:var(--text-color); margin-inline-start:auto;">
            أيام الأسبوع
          </span>
        </div>

        <div style="display:flex; flex-wrap:wrap; gap:10px; justify-content:flex-start; direction:rtl;">
          ${this.daysList.map(day => {
            const isSelected = this.selectedDays.includes(day);
            return `
              <button class="day-filter-pill ${isSelected ? "active" : ""}" data-day="${day}" style="
                flex:1;
                min-width:100px;
                padding:12px 16px;
                border-radius:12px;
                font-weight:800;
                font-size:0.95rem;
                cursor:pointer;
                transition:all 0.2s ease;
                text-align:center;
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
      <div id="groups-cards-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(420px, 1fr)); gap:24px; direction:rtl;">
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
          <h3 style="font-size:1.2rem; font-weight:800; color:var(--text-color); margin-bottom:8px;">لا توجد مجموعات متاحة في الأيام المحددة</h3>
          <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:16px;">يرجى اختيار أيام أخرى أو إلغاء فلتر الأيام لعرض جميع المجموعات.</p>
          <button id="reset-filter-empty-btn" class="btn-primary" style="padding:10px 24px; border-radius:20px; background:#e51d74; border-color:#e51d74;">عرض جميع المجموعات</button>
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
      const sessionPrice = group.sessionPrice || 40;
      const monthlyPrice = group.monthlyPrice || group.price || 320;
      const totalSessions = group.totalSessions || 24;
      const duration = group.sessionDuration || 60;
      const startDateText = group.startDate ? formatArabicDate(group.startDate) : "الأحد 13 سبتمبر 2026";
      const endDateText = group.endDate ? formatArabicDate(group.endDate) : "الأربعاء 2 ديسمبر 2026";
      
      return `
        <div class="nagwa-teacher-group-card" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:24px; overflow:hidden; box-shadow:0 6px 20px rgba(0,0,0,0.04); display:flex; flex-direction:column; justify-content:space-between; transition:transform 0.2s ease, box-shadow 0.2s ease;">
          
          <!-- CARD HEADER -->
          <div style="background:rgba(0,0,0,0.03); padding:20px 24px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); flex-wrap:wrap; gap:12px;">
            
            <!-- TEACHER INFO -->
            <div style="display:flex; align-items:center; gap:14px;">
              <img src="${group.teacher?.avatar || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&auto=format&fit=crop&q=80"}" 
                   alt="${group.teacher?.name || ""}" 
                   style="width:54px; height:54px; border-radius:50%; object-fit:cover; border:2px solid #ffffff; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
              <div>
                <h3 style="font-size:1.15rem; font-weight:900; color:var(--text-color); margin:0 0 6px 0;">
                  ${group.teacher?.name || "مدرس المنصة"}
                </h3>
                <div style="display:inline-flex; align-items:center; gap:6px; background:var(--bg-card); border:1px solid var(--border-color); padding:3px 10px; border-radius:12px; font-size:0.75rem; font-weight:800; color:var(--text-muted);">
                  <span>👍 ${group.teacher?.ratingCount || "2763"}</span>
                  <span style="opacity:0.4;">|</span>
                  <span style="color:#10b981;">${group.teacher?.rating || "91"}%</span>
                </div>
              </div>
            </div>

            <!-- PRICE HEADER -->
            <div style="text-align:left;">
              <div style="font-size:0.75rem; font-weight:800; color:var(--text-muted); margin-bottom:2px;">السعر للـ 8 حصص</div>
              <div style="font-size:1.35rem; font-weight:900; color:#e51d74; line-height:1.1;">
                ${monthlyPrice} ${group.currency || "ج.م."}
              </div>
              <div style="font-size:0.72rem; color:var(--text-muted); font-weight:700;">(سعر الحصة ${sessionPrice} ج.م.)</div>
            </div>

          </div>

          <!-- CARD BODY -->
          <div style="padding:22px 24px; display:flex; flex-direction:column; gap:16px;">
            
            <!-- SCHEDULE ROW -->
            <div style="display:flex; align-items:center; gap:8px; font-size:0.92rem; background:rgba(229,29,116,0.06); padding:8px 14px; border-radius:12px; color:#e51d74; font-weight:800;">
              <i data-lucide="calendar" style="width:16px; height:16px; flex-shrink:0;"></i>
              <span>الجدول: ${group.scheduleText || "الأحد والثلاثاء الساعة 6:00م"}</span>
            </div>

            <!-- DATES GRID (START & END) -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; background:var(--bg-app); border:1px solid var(--border-color); border-radius:14px; padding:12px 14px;">
              <div>
                <div style="font-size:0.75rem; color:var(--text-muted); font-weight:800; margin-bottom:2px;">تاريخ البدء</div>
                <div style="font-size:0.85rem; font-weight:900; color:var(--text-color);">${startDateText}</div>
              </div>
              <div>
                <div style="font-size:0.75rem; color:var(--text-muted); font-weight:800; margin-bottom:2px;">تاريخ الانتهاء</div>
                <div style="font-size:0.85rem; font-weight:900; color:var(--text-color);">${endDateText}</div>
              </div>
            </div>

            <!-- COHORT SPECIFICATIONS (SESSIONS COUNT, DURATION, SEATS) -->
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; text-align:center;">
              <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:12px; padding:8px 6px;">
                <div style="font-size:0.72rem; color:var(--text-muted); font-weight:700;">عدد الحصص</div>
                <div style="font-size:0.92rem; font-weight:900; color:var(--text-color); margin-top:2px;">${totalSessions}</div>
              </div>
              <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:12px; padding:8px 6px;">
                <div style="font-size:0.72rem; color:var(--text-muted); font-weight:700;">مدة الحصة</div>
                <div style="font-size:0.92rem; font-weight:900; color:var(--text-color); margin-top:2px;">${duration} دقيقةً</div>
              </div>
              <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:12px; padding:8px 6px;">
                <div style="font-size:0.72rem; color:var(--text-muted); font-weight:700;">إجمالي المقاعد</div>
                <div style="font-size:0.92rem; font-weight:900; color:var(--text-color); margin-top:2px;">${group.maxStudents || 25}</div>
              </div>
            </div>

            <!-- REMAINING SEATS -->
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.88rem;">
              <span style="font-weight:800; color:var(--text-color);">المقاعد المتبقية:</span>
              <span style="font-weight:900; color:${isFull ? "#ef4444" : "#10b981"};">
                ${isFull ? "مكتملة بالكامل (0 متبقي)" : `${group.availableSeats} من إجمالي ${group.maxStudents || 25}`}
              </span>
            </div>

            <!-- ACTION BUTTONS -->
            <div style="display:flex; gap:12px; align-items:center; margin-top:6px;">
              ${(() => {
                const myEnrollment = (this.myEnrollments || []).find(e => 
                  e.group?.id && String(e.group.id) === String(group.groupId)
                );
                const isPending = myEnrollment && (myEnrollment.status === 'pending' || myEnrollment.status === 'PENDING');
                const isActive = myEnrollment && (myEnrollment.status === 'active' || myEnrollment.status === 'ACTIVE');

                if (isPending) {
                  return `
                    <div style="
                      flex:1.4;
                      background:rgba(245, 158, 11, 0.12);
                      border:1.5px solid #f59e0b;
                      color:#d97706;
                      padding:11px 14px;
                      border-radius:30px;
                      font-weight:900;
                      font-size:0.92rem;
                      text-align:center;
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
                    <button disabled style="
                      flex:1.4;
                      background:#10b981;
                      color:#ffffff;
                      border:none;
                      padding:12px 14px;
                      border-radius:30px;
                      font-weight:900;
                      font-size:0.9rem;
                      cursor:default;
                      text-align:center;
                    ">
                      ✓ أنت مسجل بالمجموعة
                    </button>
                  `;
                }

                if (group.status === 'IN_PROGRESS' || group.status === 'CLOSED') {
                  return `
                    <button disabled style="
                      flex:1.4;
                      background:#6366f1;
                      color:#ffffff;
                      border:none;
                      padding:12px 16px;
                      border-radius:30px;
                      font-weight:900;
                      font-size:0.9rem;
                      cursor:not-allowed;
                      text-align:center;
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
                    <button disabled style="
                      flex:1.4;
                      background:#9ca3af;
                      color:#ffffff;
                      border:none;
                      padding:12px 20px;
                      border-radius:30px;
                      font-weight:900;
                      font-size:1rem;
                      cursor:not-allowed;
                      text-align:center;
                    ">
                      المجموعة مكتملة
                    </button>
                  `;
                }

                return `
                  <button class="enroll-group-btn" 
                          data-course-id="${group.courseId}" 
                          data-group-id="${group.groupId}" 
                          data-group-name="${group.groupName}"
                          data-is-full="${isFull}"
                          style="
                            flex:1.4;
                            background:#e51d74;
                            color:#ffffff;
                            border:none;
                            padding:12px 20px;
                            border-radius:30px;
                            font-weight:900;
                            font-size:1rem;
                            cursor:pointer;
                            transition:all 0.2s ease;
                            box-shadow:0 4px 14px rgba(229,29,116,0.35);
                            text-align:center;
                          ">
                    سجل الآن 🚀
                  </button>
                `;
              })()}

              <a href="#course-preview/${group.courseId}/${group.groupId}" style="
                flex:1;
                background:transparent;
                color:var(--text-color);
                border:1px solid var(--border-color);
                padding:12px 20px;
                border-radius:30px;
                font-weight:800;
                font-size:0.95rem;
                text-decoration:none;
                text-align:center;
                transition:all 0.2s ease;
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
