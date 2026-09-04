import { apiFetch, state, showToast, t, confirmDialog, checkPendingRequestsNotification, renderCourseCard, handleWhatsAppResponse, showEnrollmentAcceptanceModal, getCleanWhatsAppNumber, validateSessionScheduledDate, getMinSessionDateTimeISO, formatSessionDateTime, getTimezoneBadgeHTML, canJoinSession } from "../../app.js";

export default class TeacherView {
  constructor(container) {
    this.container = container;
    this.courses = [];
    this.sessions = [];
    this.privateSessions = [];
    this.todaySessions = [];
    this.availability = [];
    this.sessionFilter = "all";
    this.privateSessionFilter = "all";
    this.selectedCourseForLesson = null;
    this.assignedSubscriptions = [];

    // New View State
    this.currentViewMode = 'dashboard';
    this.selectedSubscriptionId = null;
    this.sessionsFilterStatus = 'all';
  }

  async render() {
    try {
      const [allCourses, sessions, students, requests, allBlogs, privateSessions, todaySessions, availability, earnings, assignedSubscriptions] = await Promise.all([
        apiFetch("/courses"),
        apiFetch("/sessions"),
        apiFetch("/users/students"),
        apiFetch("/teacher/enrollment-requests"),
        apiFetch("/blogs"),
        apiFetch("/teacher/private-sessions").catch(() => []),
        apiFetch("/teacher/private-sessions/today").catch(() => []),
        apiFetch("/teacher/availability/mine").catch(() => []),
        apiFetch("/teacher/earnings").catch(() => ({ stats: { pendingAmount: 0, totalEarned: 0 } })),
        apiFetch("/subscriptions/teacher-assigned").catch(() => [])
      ]);

      this.courses = (allCourses || []).filter(c => c.teacher?.id === state.user.id);
      this.sessions = (sessions || []).filter(s => s.teacher?.id === state.user.id);
      this.privateSessions = privateSessions || [];
      this.todaySessions = todaySessions || [];
      this.availability = availability || [];
      this.blogs = (allBlogs || []).filter(b => b.author?.id === state.user.id);
      this.assignedSubscriptions = assignedSubscriptions || [];

      this.earningsData = earnings || { earnings: [], stats: {} };

      if (this.currentViewMode === 'financial' || window.location.hash.includes("teacher-financial")) {
        this.renderFinancialPage();
        return;
      }

      const totalCourses = this.courses.length;
      const upcomingSessions = this.sessions.filter(s => s.status === "scheduled").length;
      const activeStudentsCount = students ? students.length : 0;
      const filteredSessions = this.filterSessions(this.sessions);
      this.enrollmentRequests = requests || [];
      const pendingEarnings = earnings?.stats?.pendingAmount || 0;
      const completedPrivate = this.privateSessions.filter(s => s.status === "COMPLETED").length;

      const caps = state.user?.teacherCapabilities;
      const canAddCourse = state.user?.role === 'admin' || (Array.isArray(caps) ? caps.includes('COURSE_INSTRUCTOR') : (typeof caps === 'string' ? caps.includes('COURSE_INSTRUCTOR') : false));

      const hour = new Date().getHours();
      let timeGreeting = "أهلاً بك يا أستاذ";
      if (hour >= 5 && hour < 12) timeGreeting = "صباح الهمة والعطاء يا أستاذ ☀️";
      else if (hour >= 12 && hour < 17) timeGreeting = "طاب يومك بكل خير يا أستاذ 🌤️";
      else timeGreeting = "مساء التميز والإنجاز يا أستاذ 🌙";

      const teacherName = state.user?.name || "المعلم";
      const teacherAvatar = state.user?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(teacherName)}`;

      this.container.innerHTML = `
        <div class="teacher-portal-modern" style="width:100%; max-width:1440px; margin:0 auto; padding:24px 20px 80px; box-sizing:border-box;">
          
          <!-- 1. Educator Studio Hero Header -->
          <div class="glass-card hero-teacher-banner" style="position:relative; overflow:hidden; border-radius:28px; padding:32px 36px; margin-bottom:28px; background:linear-gradient(135deg, rgba(79,70,229,0.12) 0%, rgba(168,85,247,0.08) 50%, rgba(245,158,11,0.08) 100%); border:1.5px solid var(--border-focus); box-shadow:0 12px 36px rgba(79,70,229,0.08);">
            
            <!-- Ambient Glow Orbs -->
            <div style="position:absolute; top:-30px; left:-30px; width:160px; height:160px; background:radial-gradient(circle, rgba(79,70,229,0.25) 0%, rgba(79,70,229,0) 70%); border-radius:50%; pointer-events:none;"></div>
            <div style="position:absolute; bottom:-40px; right:-20px; width:180px; height:180px; background:radial-gradient(circle, rgba(245,158,11,0.2) 0%, rgba(245,158,11,0) 70%); border-radius:50%; pointer-events:none;"></div>

            <div style="position:relative; z-index:2; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:24px;">
              
              <!-- Left: Teacher Info & Meta -->
              <div style="display:flex; align-items:center; gap:20px; flex:1; min-width:280px;">
                <div style="position:relative; flex-shrink:0;">
                  <img src="${teacherAvatar}" alt="${teacherName}" style="width:76px; height:76px; border-radius:50%; border:3px solid var(--primary); object-fit:cover; background:var(--bg-app); box-shadow:0 8px 24px rgba(79,70,229,0.25);">
                  <span style="position:absolute; bottom:2px; right:2px; width:16px; height:16px; background:#10b981; border:2px solid var(--bg-card); border-radius:50%;" title="متصل ومتاح للتدريس"></span>
                </div>

                <div>
                  <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:4px;">
                    <span style="font-size:0.82rem; font-weight:800; color:var(--primary); background:var(--primary-glow); padding:3px 12px; border-radius:20px; border:1px solid rgba(79,70,229,0.2); display:inline-flex; align-items:center; gap:4px;">
                      <i data-lucide="sparkles" style="width:13px;height:13px;"></i> ${timeGreeting}
                    </span>
                    <span style="font-size:0.8rem; font-weight:700; color:var(--text-muted); background:rgba(0,0,0,0.03); padding:3px 10px; border-radius:20px;">
                      👨‍🏫 لوحة المعلم المعتمد
                    </span>
                  </div>

                  <h1 style="font-size:clamp(1.4rem, 4vw, 1.9rem); font-weight:900; margin:0 0 6px 0; color:var(--text-main); letter-spacing:-0.5px;">
                    مرحباً بك، <span style="background:linear-gradient(135deg, var(--primary), #9333ea); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">${teacherName}</span> 👋
                  </h1>
                  
                  <p style="color:var(--text-muted); font-size:0.92rem; margin:0; line-height:1.5;">
                    تابع دوراتك التعليمية، جدول حصص البث المباشر، وحصص الطلاب الخاصة واستحقاقاتك المالية.
                  </p>
                </div>
              </div>

              <!-- Right: Quick Action Buttons & Timezone -->
              <div style="display:flex; flex-direction:column; align-items:flex-end; gap:12px;">
                ${getTimezoneBadgeHTML()}
                
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                  ${canAddCourse ? `
                    <button class="btn-primary" id="open-course-modal-btn" style="padding:10px 20px; font-weight:800; font-size:0.88rem; border-radius:30px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 16px rgba(79,70,229,0.3);">
                      <i data-lucide="plus-circle" style="width:16px;height:16px;"></i> إضافة دورة جديدة ➕
                    </button>
                  ` : ''}
                  
                  <button class="btn-secondary" id="open-session-modal-btn" style="padding:10px 18px; font-weight:700; font-size:0.85rem; border-radius:30px; border-color:var(--primary); color:var(--primary); background:rgba(255,255,255,0.7); display:inline-flex; align-items:center; gap:6px;">
                    <i data-lucide="calendar-plus" style="width:15px;height:15px;"></i> جدولة حصة مباشرة 📅
                  </button>

                  <button class="btn-secondary" id="open-financial-hub-btn" style="padding:10px 18px; font-weight:700; font-size:0.85rem; border-radius:30px; border-color:#f59e0b; color:#d97706; background:rgba(245,158,11,0.06); display:inline-flex; align-items:center; gap:6px;">
                    <i data-lucide="wallet" style="width:15px;height:15px;"></i> 💰 السجل المالي
                  </button>
                </div>
              </div>

            </div>
          </div>

          <!-- 2. Performance & Metric Stats Grid (5 Gamified Stat Cards) -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:16px; margin-bottom:32px;">
            
            <!-- Stat 1: Published Courses -->
            <div class="glass-card stat-card-hover" style="padding:20px; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card); display:flex; align-items:center; gap:16px;">
              <div style="width:50px; height:50px; border-radius:16px; background:linear-gradient(135deg, rgba(79,70,229,0.15), rgba(79,70,229,0.05)); color:var(--primary); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="book-open" style="width:24px; height:24px;"></i>
              </div>
              <div>
                <div style="font-size:1.5rem; font-weight:900; color:var(--text-main); line-height:1.1;">
                  ${totalCourses}
                </div>
                <div style="font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-top:2px;">
                  الدورات المنشورة
                </div>
              </div>
            </div>

            <!-- Stat 2: Scheduled Classes -->
            <div class="glass-card stat-card-hover" style="padding:20px; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card); display:flex; align-items:center; gap:16px;">
              <div style="width:50px; height:50px; border-radius:16px; background:linear-gradient(135deg, rgba(236,72,153,0.15), rgba(236,72,153,0.05)); color:#ec4899; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="video" style="width:24px; height:24px;"></i>
              </div>
              <div>
                <div style="font-size:1.5rem; font-weight:900; color:var(--text-main); line-height:1.1;">
                  ${upcomingSessions}
                </div>
                <div style="font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-top:2px;">
                  حصص مباشرة قادمة
                </div>
              </div>
            </div>

            <!-- Stat 3: Active Students -->
            <div class="glass-card stat-card-hover" style="padding:20px; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card); display:flex; align-items:center; gap:16px;">
              <div style="width:50px; height:50px; border-radius:16px; background:linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.05)); color:#06b6d4; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="users" style="width:24px; height:24px;"></i>
              </div>
              <div>
                <div style="font-size:1.5rem; font-weight:900; color:var(--text-main); line-height:1.1;">
                  ${activeStudentsCount}
                </div>
                <div style="font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-top:2px;">
                  الطلاب الفعالون
                </div>
              </div>
            </div>

            <!-- Stat 4: Completed Private Sessions -->
            <div class="glass-card stat-card-hover" style="padding:20px; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card); display:flex; align-items:center; gap:16px;">
              <div style="width:50px; height:50px; border-radius:16px; background:linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05)); color:#10b981; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="calendar-check" style="width:24px; height:24px;"></i>
              </div>
              <div>
                <div style="font-size:1.5rem; font-weight:900; color:var(--text-main); line-height:1.1;">
                  ${completedPrivate}
                </div>
                <div style="font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-top:2px;">
                  حصص خاصة مكتملة
                </div>
              </div>
            </div>

            <!-- Stat 5: Pending Earnings -->
            <div class="glass-card stat-card-hover" id="stat-box-earnings" style="cursor:pointer; padding:20px; border-radius:20px; border:1px solid rgba(245,158,11,0.3); background:rgba(245,158,11,0.04); display:flex; align-items:center; gap:16px;" title="انقر لعرض تفاصيل السجل المالي والمستحقات">
              <div style="width:50px; height:50px; border-radius:16px; background:linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.08)); color:#f59e0b; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="wallet" style="width:24px; height:24px;"></i>
              </div>
              <div style="flex:1;">
                <div style="font-size:1.4rem; font-weight:900; color:#b45309; line-height:1.1;">
                  ${pendingEarnings.toLocaleString()} <span style="font-size:0.85rem; font-weight:700;">ج.م</span>
                </div>
                <div style="font-size:0.78rem; font-weight:800; color:var(--text-main); margin-top:2px;">
                  مستحقات معلقة ↗
                </div>
              </div>
            </div>

          </div>

          <!-- 4. Main Two-Column Command Grid Layout -->
          <div class="dashboard-main-grid-layout" style="display:grid; grid-template-columns: 1fr 370px; gap:28px; align-items:start;">
            
            <!-- Left Column: Group Live Classes -->
            <div style="display:flex; flex-direction:column; gap:32px;">
              
              <!-- Section: Group Live Sessions -->
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; flex-wrap:wrap; gap:12px;">
                  <div>
                    <h2 style="font-size:1.25rem; font-weight:800; margin:0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                      <i data-lucide="video" style="width:22px; height:22px; color:#10b981;"></i>
                      جلسات وحصص المجموعة المباشرة
                    </h2>
                    <p style="color:var(--text-muted); font-size:0.82rem; margin:2px 0 0 0;">الحصص العامة المجدولة مع مجموعات الطلاب</p>
                  </div>

                  <div style="display:flex; align-items:center; gap:8px;">
                    <button class="btn-secondary" id="open-session-modal-btn-2" style="font-size:0.8rem; padding:8px 16px; border-radius:20px; border-color:var(--primary); color:var(--primary); display:inline-flex; align-items:center; gap:6px;">
                      <i data-lucide="calendar-plus"></i> جدولة حصة 📅
                    </button>
                    <a href="#schedule" style="font-size:0.85rem; color:var(--primary); font-weight:700; text-decoration:none; margin-inline-start:4px;">
                      الجدول الكلي ↗
                    </a>
                  </div>
                </div>

                <div class="schedule-list" id="teacher-schedule-container" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">
                  ${filteredSessions.length === 0 ? `
                    <div class="glass-card" style="text-align:center; padding:36px 20px; color:var(--text-muted); grid-column:1/-1; border-radius:18px;">
                      <i data-lucide="calendar" style="width:36px; height:36px; opacity:0.35; margin-bottom:8px;"></i>
                      <div style="font-weight:700; font-size:0.9rem; color:var(--text-main); margin-bottom:2px;">لا توجد حصص جماعية مجدولة اليوم</div>
                      <p style="font-size:0.8rem; margin:0;">يمكنك جدولة لقاء مباشر جديد في أي وقت مع طلابك.</p>
                    </div>
                  ` : filteredSessions.map(session => this.renderTeacherSessionCard(session)).join("")}
                </div>
              </div>

            </div>

            <!-- Right Column: Today's Private Sessions & Toolbox -->
            <div style="display:flex; flex-direction:column; gap:24px;">
              
              <!-- Today's 1-on-1 Private Sessions -->
              <div class="glass-card" style="padding:22px; border-radius:22px; border:1px solid var(--border-color); background:var(--bg-card);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                  <h3 style="font-size:1.1rem; font-weight:800; margin:0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                    <i data-lucide="user-check" style="width:18px; height:18px; color:#a855f7;"></i>
                    حصصي الخاصة اليوم (${this.todaySessions.length})
                  </h3>
                  <button class="btn-secondary" id="view-all-private-btn" style="font-size:0.78rem; padding:5px 12px; border-radius:14px; border-color:var(--primary); color:var(--primary);">
                    عرض الكل ↗
                  </button>
                </div>

                <div style="display:flex; flex-direction:column; gap:12px;" id="today-private-sessions">
                  ${this.todaySessions.length === 0 ? `
                    <div style="text-align:center; padding:28px 14px; background:var(--bg-app); border-radius:16px; border:1px dashed var(--border-color); color:var(--text-muted);">
                      <i data-lucide="calendar-check" style="width:36px; height:36px; opacity:0.35; margin-bottom:8px;"></i>
                      <div style="font-weight:700; font-size:0.88rem; color:var(--text-main); margin-bottom:2px;">لا توجد حصص خاصة مجدولة اليوم</div>
                      <p style="font-size:0.78rem; margin:0;">سيتم إشعارك فور قيام أي طالب بحجز حصة جديدة.</p>
                    </div>
                  ` : this.todaySessions.map(s => this.renderPrivateSessionCard(s)).join('')}
                </div>
              </div>


              <!-- Quick Educator Toolbox -->
              <div class="glass-card" style="padding:22px; border-radius:22px; border:1px solid var(--border-color); background:var(--bg-card);">
                <h4 style="font-size:1rem; font-weight:800; margin:0 0 14px 0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                  <i data-lucide="wrench" style="width:18px; height:18px; color:var(--primary);"></i>
                  أدوات المعلم السريعة
                </h4>
                
                <div style="display:flex; flex-direction:column; gap:8px;">
                  <a href="#assignments" class="btn-secondary" style="justify-content:flex-start; text-decoration:none; padding:10px 14px; font-size:0.82rem; font-weight:700; border-radius:12px; gap:8px;">
                    <i data-lucide="clipboard-list" style="color:#8b5cf6; width:16px;height:16px;"></i> 📝 بنك الواجبات وتصحيح المهام
                  </a>
                  <a href="#students" class="btn-secondary" style="justify-content:flex-start; text-decoration:none; padding:10px 14px; font-size:0.82rem; font-weight:700; border-radius:12px; gap:8px;">
                    <i data-lucide="user-plus" style="color:#10b981; width:16px;height:16px;"></i> 👥 سجل الطلاب والمجموعات
                  </a>
                  <a href="#teacher-blogs" class="btn-secondary" style="justify-content:flex-start; text-decoration:none; padding:10px 14px; font-size:0.82rem; font-weight:700; border-radius:12px; gap:8px;">
                    <i data-lucide="newspaper" style="color:#ec4899; width:16px;height:16px;"></i> ✍️ نشر مقال تعليمي بالمدونة
                  </a>
                </div>
              </div>

            </div>

          </div>
        </div>


        <!-- Course Creation Modal -->
        <div class="modal-overlay" id="course-modal" style="display:none; backdrop-filter:blur(8px); background:rgba(0,0,0,0.6);">
          <div class="modal-content" style="max-width:650px; width:92%; border-radius:24px; overflow:hidden; border:1px solid var(--border-color); padding:0; box-shadow:0 25px 50px -12px rgba(0,0,0,0.35); background:var(--bg-card);">
            
            <!-- Modal Header -->
            <div class="modal-header" style="padding:22px 28px; background:linear-gradient(135deg, rgba(0,86,210,0.08), rgba(168,85,247,0.08)); border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
              <div style="display:flex; align-items:center; gap:14px;">
                <div style="width:46px; height:46px; border-radius:14px; background:var(--primary-glow); color:var(--primary); display:flex; align-items:center; justify-content:center;">
                  <i data-lucide="book-plus" style="width:24px; height:24px;"></i>
                </div>
                <div>
                  <h3 class="modal-title" style="font-size:1.2rem; font-weight:800; margin:0 0 2px 0; color:var(--text-main);">${t("teacher.createCourse")}</h3>
                  <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">أدخل تفاصيل الدورة، القسم المعني، والسنة الدراسية للتلميذ</p>
                </div>
              </div>
              <span class="modal-close-btn" id="close-course-modal" style="font-size:1.4rem; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
            </div>

            <!-- Form -->
            <form id="create-course-form">
              <div class="modal-body" style="padding:24px 28px; display:flex; flex-direction:column; gap:18px;">
                
                <!-- Course Title -->
                <div class="form-group" style="margin:0;">
                  <label for="course-title" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="heading" style="width:14px; height:14px; color:var(--primary);"></i>
                    ${t("teacher.courseTitle")}
                  </label>
                  <input type="text" id="course-title" class="form-input" placeholder="مثال: مادة الفيزياء - وحدة الكهرباء للثانوية" style="border-radius:14px; padding:12px 16px; font-size:0.9rem;" required>
                </div>

                <!-- 🇪🇬 EGYPTIAN CURRICULUM SELECTOR (STAGE -> GRADE -> SUBJECT) -->
                <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:20px; padding:20px; display:flex; flex-direction:column; gap:16px;">
                  
                  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <label style="font-weight:900; font-size:0.92rem; color:var(--text-main); margin:0; display:flex; align-items:center; gap:8px;">
                      <i data-lucide="graduation-cap" style="width:18px; height:18px; color:#e51d74;"></i>
                      <span>تحديد المرحلة والصف والمادة الدراسية 🇪🇬 <span style="color:#ef4444;">*</span></span>
                    </label>
                    <span style="font-size:0.75rem; font-weight:800; color:#e51d74; background:rgba(229,29,116,0.1); padding:3px 12px; border-radius:12px; border:1px solid rgba(229,29,116,0.2);">
                      مناهج جمهورية مصر العربية
                    </span>
                  </div>

                  <!-- 1. Stage Selector Segmented Buttons -->
                  <div>
                    <label style="display:block; font-size:0.82rem; font-weight:800; color:var(--text-muted); margin-bottom:6px;">
                      1. اختر المرحلة التعليمية:
                    </label>
                    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;">
                      <button type="button" class="teacher-modal-stage-btn active" data-stage="PRIMARY" style="padding:10px 8px; border-radius:14px; font-weight:900; font-size:0.85rem; cursor:pointer; border:2px solid #10b981; background:#10b981; color:#ffffff; transition:all 0.2s ease; box-shadow:0 4px 12px rgba(16,185,129,0.25);">
                        🎒 الابتدائية
                      </button>
                      <button type="button" class="teacher-modal-stage-btn" data-stage="PREPARATORY" style="padding:10px 8px; border-radius:14px; font-weight:800; font-size:0.85rem; cursor:pointer; border:2px solid var(--border-color); background:var(--bg-card); color:var(--text-main); transition:all 0.2s ease;">
                        📚 الإعدادية
                      </button>
                      <button type="button" class="teacher-modal-stage-btn" data-stage="SECONDARY" style="padding:10px 8px; border-radius:14px; font-weight:800; font-size:0.85rem; cursor:pointer; border:2px solid var(--border-color); background:var(--bg-card); color:var(--text-main); transition:all 0.2s ease;">
                        🎓 الثانوية العامة
                      </button>
                    </div>
                  </div>

                  <!-- 2. Grade & Subject Dropdowns -->
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <!-- Grade Select -->
                    <div class="form-group" style="margin:0;">
                      <label for="modal-curriculum-grade-select" style="font-weight:800; font-size:0.82rem; margin-bottom:6px; display:block; color:var(--text-main);">
                        2. الصف الدراسي <span style="color:#ef4444;">*</span>
                      </label>
                      <select id="modal-curriculum-grade-select" class="form-select" style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;" required>
                        <option value="">-- جاري التحميل... --</option>
                      </select>
                    </div>

                    <!-- Subject Select -->
                    <div class="form-group" style="margin:0;">
                      <label for="modal-curriculum-subject-select" style="font-weight:800; font-size:0.82rem; margin-bottom:6px; display:block; color:var(--text-main);">
                        3. المادة الدراسية <span style="color:#ef4444;">*</span>
                      </label>
                      <select id="modal-curriculum-subject-select" class="form-select" style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;" required>
                        <option value="">-- اختر الصف أولاً --</option>
                      </select>
                    </div>
                  </div>

                  <!-- Custom Subject Wrapper (if needed) -->
                  <div id="modal-custom-subject-wrapper" style="display:none; margin-top:-4px;">
                    <label style="font-size:0.8rem; font-weight:800; color:var(--text-muted); margin-bottom:4px; display:block;">
                      اسم المادة أو التخصص المخصص:
                    </label>
                    <input type="text" id="modal-custom-subject-input" class="form-input" placeholder="اكتب اسم المادة يدوياً..." style="border-radius:12px; padding:9px 14px; font-size:0.88rem; width:100%;">
                  </div>

                  <!-- Hidden values for submission -->
                  <input type="hidden" id="course-category-select" value="">
                  <input type="hidden" id="course-degree" value="">
                  <input type="hidden" id="modal-selected-grade-id" value="">
                  <input type="hidden" id="modal-selected-subject-id" value="">
                </div>

                <!-- Course Description -->
                <div class="form-group" style="margin:0;">
                  <label for="course-desc" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="file-text" style="width:14px; height:14px; color:var(--text-muted);"></i>
                    ${t("teacher.courseDesc")}
                  </label>
                  <textarea id="course-desc" class="form-input" style="height:90px; resize:none; border-radius:14px; padding:12px 16px; font-size:0.88rem; line-height:1.5;" placeholder="${t("teacher.courseDescPlaceholder")}" required></textarea>
                </div>

                <!-- Course Image Upload -->
                <div class="form-group" style="margin:0;">
                  <label style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; justify-content:space-between;">
                    <span style="display:flex; align-items:center; gap:6px;">
                      <i data-lucide="image" style="width:14px; height:14px; color:#f59e0b;"></i>
                      ${t("teacher.courseImage")}
                    </span>
                    <button type="button" id="toggle-url-input-btn" style="background:none; border:none; color:var(--primary); font-weight:700; font-size:0.75rem; cursor:pointer;">
                      أو أدخل رابط صورة مباشرة 🔗
                    </button>
                  </label>
                  
                  <div id="course-dropzone" style="border:2px dashed var(--border-color); border-radius:16px; padding:18px; text-align:center; background:var(--bg-app); cursor:pointer; transition:all 0.2s ease;">
                    <input type="file" id="course-image-file" accept="image/*" style="display:none;">
                    
                    <div id="image-upload-idle">
                      <button type="button" class="btn-secondary" id="btn-trigger-upload" style="padding:8px 20px; border-radius:30px; font-size:0.85rem; margin:0 auto; display:inline-flex; align-items:center; gap:6px;">
                        <i data-lucide="upload-cloud" style="width:16px; height:16px;"></i> اختيار صورة غلاف الدورة
                      </button>
                      <p style="font-size:0.75rem; color:var(--text-muted); margin:8px 0 0 0;">الصغار المقبولة: JPG, PNG, WEBP (الحد الأقصى 5 ميجابايت)</p>
                    </div>

                    <div id="image-upload-loading" style="display:none; padding:10px; color:var(--primary); font-weight:700; font-size:0.88rem;">
                      <i data-lucide="loader" class="spinner" style="width:20px; height:20px; display:inline-block; vertical-align:middle; margin-inline-end:6px;"></i> جاري رفع الصورة...
                    </div>

                    <div id="image-preview-wrapper" style="display:none; text-align:center;">
                      <div style="position:relative; display:inline-block;">
                        <img id="course-preview-img" src="" style="max-height:130px; border-radius:12px; object-fit:cover; border:2px solid var(--primary); box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                        <button type="button" id="remove-course-image-btn" title="حذف الصورة" style="position:absolute; top:-8px; right:-8px; background:var(--error,#ef4444); color:#fff; border:none; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-weight:bold; box-shadow:0 2px 6px rgba(0,0,0,0.3);">✕</button>
                      </div>
                      <p style="font-size:0.78rem; color:var(--success,#10b981); font-weight:800; margin:6px 0 0 0;">✓ تم اختيار ورفع غلاف الدورة بنجاح</p>
                    </div>
                  </div>

                  <div id="url-input-wrapper" style="display:none; margin-top:10px;">
                    <input type="url" id="course-image-url-direct" class="form-input" placeholder="https://example.com/course-cover.jpg" style="border-radius:12px; padding:10px 14px; font-size:0.85rem;">
                  </div>

                  <input type="hidden" id="course-image-url">
                </div>

                <!-- Live Meeting Link -->
                <div class="form-group" style="margin:0;">
                  <label for="course-meeting-link" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="video" style="width:14px; height:14px; color:#06b6d4;"></i>
                    رابط البث المباشر (Zoom, Meet, Webex)
                  </label>
                  <input type="url" id="course-meeting-link" class="form-input" placeholder="https://zoom.us/j/123456789" style="border-radius:14px; padding:11px 16px; font-size:0.88rem;">
                </div>

              </div>

              <!-- Modal Footer -->
              <div class="modal-footer" style="padding:16px 28px; background:var(--bg-app); border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; gap:12px;">
                <button type="button" class="btn-secondary" id="cancel-course-modal" style="padding:10px 20px; border-radius:30px; font-size:0.88rem;">${t("common.cancel")}</button>
                <button type="submit" class="btn-primary" style="padding:10px 24px; border-radius:30px; font-size:0.88rem; font-weight:800; background:linear-gradient(135deg,#0056D2,#a855f7); border:none;">
                  <i data-lucide="check-circle-2" style="width:16px; height:16px; vertical-align:middle;"></i> ${t("teacher.publishCourse")}
                </button>
              </div>

            </form>
          </div>
        </div>

        <!-- Live Session Modal -->
        <div class="modal-overlay" id="session-modal" style="display:none;">
          <div class="modal-content">
            <div class="modal-header">
              <h3 class="modal-title">${t("teacher.scheduleSession")}</h3>
              <span class="modal-close-btn" id="close-session-modal">&times;</span>
            </div>
            <form id="create-session-form">
              <div class="modal-body">
                <div class="form-group">
                  <label for="session-title">${t("teacher.sessionTitle")}</label>
                  <input type="text" id="session-title" class="form-input" placeholder="${t("teacher.sessionTitlePlaceholder")}" required>
                </div>
                <div class="form-group">
                  <label for="session-course-id">${t("teacher.selectCourse")}</label>
                  <select id="session-course-id" class="form-select" required>
                    <option value="">${t("teacher.selectCoursePlaceholder")}</option>
                    ${this.courses.map(c => `<option value="${c.id}">${c.title}</option>`).join("")}
                  </select>
                </div>
                <div class="form-group">
                  <label for="session-desc">${t("teacher.sessionDesc")}</label>
                  <textarea id="session-desc" class="form-input" style="height:80px; resize:none;" placeholder="${t("teacher.sessionDescPlaceholder")}"></textarea>
                </div>
                <div class="form-group">
                  <label for="session-date">${t("teacher.sessionDate")}</label>
                  <input type="datetime-local" id="session-date" class="form-input" required>
                </div>
                <div class="form-group">
                  <label for="session-duration">${t("teacher.sessionDuration")}</label>
                  <input type="number" id="session-duration" class="form-input" value="60" min="15" max="180" required>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn-secondary" id="cancel-session-modal">${t("common.cancel")}</button>
                <button type="submit" class="btn-primary">${t("teacher.planSession")}</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Lesson Upload Modal -->
        <div class="modal-overlay" id="lesson-modal" style="display:none;">
          <div class="modal-content" style="max-width:680px; width:92%; max-height:90vh; display:flex; flex-direction:column; padding:0; overflow:hidden;">
            <div class="modal-header" style="padding:18px 24px; border-bottom:1px solid var(--border-color);">
              <h3 class="modal-title" id="lesson-modal-title" style="font-size:1.15rem; font-weight:800;">${t("teacher.addLesson")}</h3>
              <span class="modal-close-btn" id="close-lesson-modal">&times;</span>
            </div>

            <!-- Sub-tabs bar -->
            <div style="display:flex; border-bottom:1px solid var(--border-color); background:var(--bg-app); padding:4px 16px 0 16px; gap:8px; overflow-x:auto;">
              <button type="button" class="teacher-lesson-tab-btn active" data-tab="details" style="padding:10px 16px; border:none; background:none; font-weight:700; font-size:0.88rem; cursor:pointer; color:var(--primary); border-bottom:2px solid var(--primary);">
                📝 التفاصيل والوصف
              </button>
              <button type="button" class="teacher-lesson-tab-btn" data-tab="notes" style="padding:10px 16px; border:none; background:none; font-weight:700; font-size:0.88rem; cursor:pointer; color:var(--text-muted);">
                📌 الملاحظات (Notes)
              </button>
              <button type="button" class="teacher-lesson-tab-btn" data-tab="resource" style="padding:10px 16px; border:none; background:none; font-weight:700; font-size:0.88rem; cursor:pointer; color:var(--text-muted);">
                📎 المورد المرفق
              </button>
              <button type="button" class="teacher-lesson-tab-btn" data-tab="questions" style="padding:10px 16px; border:none; background:none; font-weight:700; font-size:0.88rem; cursor:pointer; color:var(--text-muted);">
                ❓ أسئلة الدرس
              </button>
            </div>

            <form id="add-lesson-form" style="display:flex; flex-direction:column; flex:1; overflow:hidden; margin:0;">
              <div class="modal-body" style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:16px;">
                
                <!-- Tab 1: Details -->
                <div class="teacher-lesson-tab-content" id="teacher-lesson-tab-details" style="display:flex; flex-direction:column; gap:14px;">
                  <div class="form-group">
                    <label for="lesson-title" style="font-weight:700; margin-bottom:6px; display:block;">${t("teacher.lessonTitle")} <span style="color:var(--error);">*</span></label>
                    <input type="text" id="lesson-title" class="form-input" placeholder="${t("teacher.lessonTitlePlaceholder")}" required style="padding:10px 14px;">
                  </div>
                  <div class="form-group">
                    <label for="lesson-chapter" style="font-weight:700; margin-bottom:6px; display:block;">${t("teacher.chapterName")} <span style="color:var(--error);">*</span></label>
                    <input type="text" id="lesson-chapter" class="form-input" placeholder="${t("teacher.chapterPlaceholder")}" value="General" required style="padding:10px 14px;">
                  </div>
                  <div class="form-group">
                    <label for="lesson-videourl" style="font-weight:700; margin-bottom:6px; display:block;">${t("teacher.videoUrl")} (اختياري / Optional)</label>
                    <input type="text" id="lesson-videourl" class="form-input" placeholder="https://..." style="padding:10px 14px;">
                  </div>
                  <div class="form-group">
                    <label for="lesson-desc" style="font-weight:700; margin-bottom:6px; display:block;">${t("teacher.lessonDesc")}</label>
                    <textarea id="lesson-desc" class="form-input" style="height:70px; resize:vertical; font-family:inherit; padding:10px 14px;" placeholder="${t("teacher.lessonDescPlaceholder")}"></textarea>
                  </div>
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <div>
                      <label for="lesson-duration" style="font-weight:700; margin-bottom:6px; display:block;">${t("teacher.lessonDuration")}</label>
                      <input type="text" id="lesson-duration" class="form-input" placeholder="12:45" value="10:00" required style="padding:10px 14px;">
                    </div>
                    <div>
                      <label for="lesson-order" style="font-weight:700; margin-bottom:6px; display:block;">${t("teacher.lessonOrder")}</label>
                      <input type="number" id="lesson-order" class="form-input" value="1" min="0" required style="padding:10px 14px;">
                    </div>
                  </div>
                </div>

                <!-- Tab 2: Notes -->
                <div class="teacher-lesson-tab-content" id="teacher-lesson-tab-notes" style="display:none; flex-direction:column; gap:14px;">
                  <div class="form-group">
                    <label style="font-weight:700; margin-bottom:6px; display:block;">ملاحظات المعلم للدرس (Teacher Notes)</label>
                    <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:8px;">سيتم عرض هذه الملاحظات للطلاب كإرشادات ونقاط استذكار سريعة لهذا الدرس.</p>
                    <textarea id="teacher-lesson-notes" class="form-input" rows="6" placeholder="اكتب أهم القوانين، الإرشادات أو التنبيهات الموجهة للطلاب في هذا الدرس..." style="padding:12px 14px; font-family:inherit; resize:vertical;"></textarea>
                  </div>
                </div>

                <!-- Tab 3: Resource -->
                <div class="teacher-lesson-tab-content" id="teacher-lesson-tab-resource" style="display:none; flex-direction:column; gap:14px;">
                  <div class="form-group">
                    <label style="font-weight:700; margin-bottom:6px; display:block;">عنوان المورد المرفق (Resource Title)</label>
                    <input type="text" id="teacher-lesson-resource-title" class="form-input" placeholder="مثال: ملخص PDF للدرس الأول أو كراس التمارين" style="padding:10px 14px;">
                  </div>
                  <div class="form-group">
                    <label style="font-weight:700; margin-bottom:6px; display:block;">رابط الملف المرفق (Resource URL - PDF / Drive)</label>
                    <input type="text" id="teacher-lesson-resource-url" class="form-input" placeholder="https://drive.google.com/file/d/..." style="padding:10px 14px;">
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">يستطيع الطالب فتح وتحميل الملف مباشرة من صفحة مشغل الدرس.</p>
                  </div>
                </div>

                <!-- Tab 4: Questions -->
                <div class="teacher-lesson-tab-content" id="teacher-lesson-tab-questions" style="display:none; flex-direction:column; gap:16px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <div>
                      <h4 style="font-weight:800; font-size:0.95rem; margin:0;">أسئلة واختبار الدرس الفوري</h4>
                      <p style="font-size:0.8rem; color:var(--text-muted); margin:2px 0 0 0;">أنشئ أسئلة اختيار من متعدد ليختبر الطالب فهمه للدرس.</p>
                    </div>
                    <button type="button" id="teacher-add-lesson-question-btn" class="btn-secondary" style="font-size:0.82rem; padding:6px 14px; font-weight:700; border-color:var(--primary); color:var(--primary);">
                      ➕ إضافة سؤال
                    </button>
                  </div>

                  <div id="teacher-lesson-questions-list" style="display:flex; flex-direction:column; gap:16px;">
                    <!-- Dynamic questions list -->
                  </div>
                </div>

              </div>

              <div class="modal-footer" style="padding:14px 24px; border-top:1px solid var(--border-color); background:var(--bg-card);">
                <button type="button" class="btn-secondary" id="cancel-lesson-modal">${t("common.cancel")}</button>
                <button type="submit" class="btn-primary" style="font-weight:800;">${t("teacher.uploadLesson")}</button>
              </div>
            </form>
          </div>
        </div>



        <!-- Complete Private Session Modal (Lesson Report) -->
        <div class="modal-overlay" id="complete-private-modal" style="display:none; backdrop-filter:blur(8px); background:rgba(0,0,0,0.6);">
          <div class="modal-content" style="max-width:520px; width:92%; border-radius:20px; padding:0; border:1px solid var(--border-color); max-height:90vh; overflow:hidden; display:flex; flex-direction:column;">
            <div class="modal-header" style="padding:20px 24px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(59,130,246,0.08));">
              <h3 style="margin:0; font-size:1.1rem; font-weight:800;">✅ إكمال الحصة + تقرير الدرس</h3>
              <span id="close-complete-modal" style="cursor:pointer; font-size:1.4rem; color:var(--text-muted);">&times;</span>
            </div>
            <div style="padding:24px; display:flex; flex-direction:column; gap:14px; overflow-y:auto; flex:1;">
              <input type="hidden" id="complete-session-id">
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.85rem; margin-bottom:5px; display:block;">📚 موضوع الحصة (Topic)</label>
                <input type="text" id="complete-topic" class="form-input" placeholder="مثال: الكسور وعملياتها" style="border-radius:12px; padding:10px 14px;">
              </div>
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.85rem; margin-bottom:5px; display:block;">📝 ما تم شرحه</label>
                <textarea id="complete-covered" class="form-input" rows="2" placeholder="ماذا تم تغطيته في هذه الحصة..." style="border-radius:12px; padding:10px 14px; resize:none;"></textarea>
              </div>
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.85rem; margin-bottom:5px; display:block;">⭐ أداء الطالب</label>
                <select id="complete-performance" class="form-select" style="border-radius:12px; padding:10px 14px;">
                  <option value="">-- اختر التقييم --</option>
                  <option value="ممتاز">ممتاز ❤️</option>
                  <option value="جيد">جيد 👍</option>
                  <option value="متوسط">متوسط ⚠️</option>
                  <option value="يحتاج متابعة">يحتاج متابعة ⚠️</option>
                </select>
              </div>
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.85rem; margin-bottom:5px; display:block;">📖 الواجب المنزلي</label>
                <input type="text" id="complete-homework" class="form-input" placeholder="مثال: تمارين 1 ← 10 صفحة 45" style="border-radius:12px; padding:10px 14px;">
              </div>
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.85rem; margin-bottom:5px; display:block;">💬 ملاحظات المعلم</label>
                <textarea id="complete-notes" class="form-input" rows="2" placeholder="أي ملاحظات إضافية..." style="border-radius:12px; padding:10px 14px; resize:none;"></textarea>
              </div>
            </div>
            <div style="padding:16px 24px; border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; gap:10px;">
              <button class="btn-secondary" id="cancel-complete-modal" style="padding:9px 18px; border-radius:30px;">إلغاء</button>
              <button class="btn-primary" id="submit-complete-btn" style="padding:9px 22px; border-radius:30px; font-weight:800; background:linear-gradient(135deg,#10b981,#3b82f6); border:none;">
                ✅ تأكيد إكمال الحصة
              </button>
            </div>
          </div>
        </div>

        <!-- All Private Sessions Modal -->
        <div class="modal-overlay" id="all-private-modal" style="display:none; backdrop-filter:blur(8px); background:rgba(0,0,0,0.6);">
          <div class="modal-content" style="max-width:700px; width:95%; border-radius:20px; padding:0; border:1px solid var(--border-color); max-height:90vh; overflow:hidden; display:flex; flex-direction:column;">
            <div class="modal-header" style="padding:20px 24px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
              <div>
                <h3 style="margin:0; font-size:1.1rem; font-weight:800;">📋 جميع حصصي الخاصة</h3>
                <div style="display:flex; gap:8px; margin-top:10px;">
                  <button class="private-filter-btn active" data-status="all" style="font-size:0.75rem; padding:4px 12px; border-radius:20px; border:1px solid var(--border-color); background:var(--primary); color:#fff; cursor:pointer;">الكل</button>
                  <button class="private-filter-btn" data-status="SCHEDULED" style="font-size:0.75rem; padding:4px 12px; border-radius:20px; border:1px solid var(--border-color); background:none; cursor:pointer;">مجدولة</button>
                  <button class="private-filter-btn" data-status="COMPLETED" style="font-size:0.75rem; padding:4px 12px; border-radius:20px; border:1px solid var(--border-color); background:none; cursor:pointer;">مكتملة</button>
                  <button class="private-filter-btn" data-status="CANCELLED_BY_STUDENT" style="font-size:0.75rem; padding:4px 12px; border-radius:20px; border:1px solid var(--border-color); background:none; cursor:pointer;">ملغاة</button>
                </div>
              </div>
              <span id="close-all-private-modal" style="cursor:pointer; font-size:1.4rem; color:var(--text-muted);">&times;</span>
            </div>
            <div id="all-private-sessions-list" style="padding:20px; display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; overflow-y:auto; flex:1;"></div>
          </div>
        </div>
      `;

      this.bindEvents();
      if (window.lucide) window.lucide.createIcons();

      if (window.location.hash.includes("enrollment-requests")) {
        setTimeout(() => {
          const reqSec = this.container.querySelector("#enrollment-requests-section");
          if (reqSec) reqSec.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch (err) {
      console.error("Teacher portal rendering failed:", err);
      this.container.innerHTML = `
        <div style="text-align:center; padding:100px 24px; color:var(--error);">
          <i data-lucide="alert-circle" style="width:48px; height:48px; margin-bottom:16px;"></i>
          <h3 style="font-size:1.5rem; margin-bottom:8px;">Failed to load Teacher Portal</h3>
          <p style="color:var(--text-muted); margin-bottom:20px;">${err.message || "An unexpected error occurred."}</p>
          <button onclick="window.location.hash='#landing'" class="btn-primary">Return to Home</button>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  filterSessions(sessions) {
    if (!sessions || sessions.length === 0) return [];
    const now = new Date();
    return sessions.filter(s => {
      const d = new Date(s.scheduledAt);
      return d.toDateString() === now.toDateString();
    });
  }

  renderPrivateSessionCard(session) {
    const studentTz = session.student?.timezone || "Asia/Riyadh";
    const formatted = formatSessionDateTime(session.scheduledAt, null, { secondaryTz: studentTz });

    const statusMap = {
      'SCHEDULED': { label: 'مجدولة', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
      'CONFIRMED': { label: 'مؤكدة', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
      'COMPLETED': { label: 'مكتملة', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
      'RESCHEDULED': { label: 'معاد جدولتها', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
      'CANCELLED_BY_STUDENT': { label: 'ملغاة (طالب)', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
      'CANCELLED_BY_TEACHER': { label: 'ملغاة (معلم)', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
      'NO_SHOW_STUDENT': { label: 'غياب طالب', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    };
    let st = statusMap[session.status] || { label: session.status, color: '#6b7280', bg: 'rgba(107,114,128,0.1)' };
    const isActive = ['SCHEDULED', 'CONFIRMED', 'scheduled', 'live', 'active'].includes(session.status);

    const scheduledTime = session.scheduledAt ? new Date(session.scheduledAt).getTime() : 0;
    const durationMins = session.duration || 60;
    const isPastTime = scheduledTime > 0 && (scheduledTime + durationMins * 60 * 1000 < Date.now());

    if (isPastTime && ['SCHEDULED', 'CONFIRMED', 'scheduled'].includes(session.status)) {
      st = { label: '⏳ انقضى الوقت (في انتظار التوثيق والإنهاء)', color: '#b45309', bg: 'rgba(245,158,11,0.18)' };
    }

    return `
      <div class="glass-card" style="padding:20px; border-radius:18px; border:${isPastTime && isActive ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--border-color)'}; display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:6px;">
          <span style="font-size:0.75rem; font-weight:800; padding:4px 10px; border-radius:20px; background:${st.bg}; color:${st.color};">${st.label}</span>
          ${formatted.badgeHTML}
        </div>

        <h4 style="font-weight:800; font-size:0.95rem; margin:0; color:var(--text-main);">${session.topic || session.title || 'حصة خاصة'}</h4>
        <div style="font-size:0.82rem; color:var(--text-muted);">
          <i data-lucide="user" style="width:13px;height:13px;"></i> ${session.student?.name || 'طالب'}
        </div>
        <div style="font-size:0.82rem; color:var(--primary); font-weight:600; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <i data-lucide="calendar" style="width:13px;height:13px;"></i> ${formatted.dateStr} • ${formatted.timeStr} ${formatted.secondaryTZHTML}
        </div>

        ${isActive ? `
        <div style="margin-top:10px; display:flex; flex-direction:column; gap:8px;">
          <button class="btn-primary" data-join-meet-id="${session.id}" style="padding:8px 12px; font-size:0.82rem; font-weight:800; justify-content:center; border-radius:12px; background:linear-gradient(135deg,#10b981,#059669); gap:6px; display:flex; align-items:center; border:none; color:#fff; cursor:pointer;">
            <i data-lucide="video" style="width:15px; height:15px;"></i> بدء البث عبر Google Meet 🎥
          </button>
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px;">
            <button class="btn-primary complete-private-btn" data-id="${session.id}" style="font-size:0.72rem; padding:6px 8px; justify-content:center; background:rgba(16,185,129,0.1); border-color:#10b981; color:#047857; font-weight:700;">
              ✓ إكمال
            </button>
            <button class="btn-secondary noshow-private-btn" data-id="${session.id}" style="font-size:0.72rem; padding:6px 8px; justify-content:center; color:#8b5cf6; border-color:#8b5cf6; font-weight:700;">
              ✕ غياب
            </button>
            <button class="btn-secondary cancel-private-btn" data-id="${session.id}" style="font-size:0.72rem; padding:6px 8px; justify-content:center; color:var(--error,#ef4444); border-color:var(--error,#ef4444); font-weight:700;">
              🚫 إلغاء
            </button>
          </div>
        </div>` : session.status === 'COMPLETED' ? `
        <div style="margin-top:10px; padding:10px; background:rgba(16,185,129,0.05); border-radius:10px; border:1px solid rgba(16,185,129,0.2);">
          ${session.topic ? `<div style="font-size:0.8rem;"><strong>الموضوع:</strong> ${session.topic}</div>` : ''}
          ${session.homework ? `<div style="font-size:0.8rem;"><strong>الواجب:</strong> ${session.homework}</div>` : ''}
        </div>` : ''}
      </div>
    `;
  }

  renderCourseListCard(course) {
    return renderCourseCard(course, { isTeacherView: true });
  }

  renderTeacherSessionCard(session) {
    const date = new Date(session.scheduledAt);
    const sessionTime = date.getTime();
    const durationMins = session.duration || 60;
    const durationMs = durationMins * 60 * 1000;
    const nowTime = Date.now();

    const isCompleted = session.status === "completed" || session.status === "COMPLETED" || session.status?.includes("CANCELLED");
    // Strictly expired if scheduled time + duration has passed
    const isPastSession = !isCompleted && (nowTime >= sessionTime + durationMs);
    // Live only if status is live AND the session duration has not ended
    const isLive = !isCompleted && !isPastSession && (session.status === "live" || session.status === "active" || session.status === "LIVE");

    const formattedTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const formattedDate = date.toLocaleDateString([], { month: "short", day: "numeric" });

    let statusTag = `<span class="session-tag">${t("session.scheduled")}</span>`;
    let sessionAction = "";

    if (isCompleted) {
      statusTag = `<span class="session-tag" style="background:rgba(16,185,129,0.12); color:#10b981; border-color:rgba(16,185,129,0.3); font-weight:800;">${t("session.finished") || '✅ مكتملة'}</span>`;
      sessionAction = `<button class="btn-secondary session-action" style="cursor:default; margin-top:12px; font-size:0.8rem; padding:8px; opacity:0.85;" disabled>تم توثيق التقرير واعتماد الرصيد ✅</button>`;
    } else if (isPastSession) {
      statusTag = `<span class="session-tag" style="background:rgba(239,68,68,0.1); color:#ef4444; border-color:rgba(239,68,68,0.25); font-weight:800;">⌛ انتهى وقت الحصة</span>`;
      const isCheckedIn = window.checkedInSessions?.has(session.id);
      sessionAction = `
        <div style="display:flex; flex-direction:column; gap:8px; margin-top:14px;">
          <button class="btn-primary end-session-btn" data-id="${session.id}" style="background:linear-gradient(135deg, #10b981, #059669); border-color:#10b981; font-size:0.82rem; padding:9px 12px; justify-content:center; font-weight:800; border-radius:12px; box-shadow:0 4px 12px rgba(16,185,129,0.25); cursor:pointer;">
            <i data-lucide="file-check" style="width:15px;height:15px;"></i> 📝 توثيق التقرير وإنهاء الحصة (واحتساب الرصيد)
          </button>
          ${isCheckedIn ? `
            <span style="font-size:0.78rem; font-weight:800; color:#10b981; padding:6px 10px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:10px; display:inline-flex; align-items:center; justify-content:center; gap:6px; width:100%; box-sizing:border-box;">
              <i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> تم تأكيد حضور المعلم (حاضر) ✅
            </span>
          ` : `
            <button class="btn-secondary session-checkin-btn" data-id="${session.id}" data-role="teacher" style="width:100%; justify-content:center; font-size:0.8rem; padding:7px; border-color:#10b981; color:#10b981; background:rgba(16,185,129,0.08); font-weight:800; cursor:pointer; border-radius:10px;">
              <i data-lucide="user-check" style="width:14px; height:14px;"></i> تأكيد حضور المعلم (لست غائباً) ✍️
            </button>
          `}
        </div>
      `;
    } else if (isLive) {
      statusTag = `<span class="session-tag live">${t("session.liveNow")}</span>`;
      const isCheckedIn = window.checkedInSessions?.has(session.id);
      if (isCheckedIn) {
        sessionAction = `
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:14px;">
            <span style="font-size:0.78rem; font-weight:800; color:#10b981; padding:6px 10px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:10px; display:inline-flex; align-items:center; justify-content:center; gap:6px; width:100%; box-sizing:border-box;">
              <i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> تم تأكيد حضور المعلم (حاضر) ✅
            </span>
            <div style="display:grid; grid-template-columns:1fr auto; gap:8px;">
              <button class="btn-primary" data-join-meet-id="${session.id}" style="background:linear-gradient(135deg, #10b981, #059669); font-size:0.82rem; font-weight:800; padding:9px 14px; justify-content:center; border-radius:12px; display:flex; align-items:center; gap:6px; border:none; color:#fff; cursor:pointer;"><i data-lucide="video" style="width:16px;height:16px;"></i> فتح Google Meet الآن 🔴</button>
              <button class="btn-secondary end-session-btn" data-id="${session.id}" style="font-size:0.78rem; padding:6px 12px; justify-content:center; color:var(--error); border-color:var(--error); font-weight:800;"><i data-lucide="stop-circle" style="width:14px;height:14px;"></i> إنهاء وتوثيق</button>
            </div>
          </div>
        `;
      } else {
        sessionAction = `
          <div class="session-actions-wrapper" data-id="${session.id}" style="display:flex; flex-direction:column; gap:8px; margin-top:14px;">
            <button class="btn-primary session-checkin-btn" data-id="${session.id}" data-role="teacher" style="background:linear-gradient(135deg, #10b981, #059669); border:none; color:#fff; font-size:0.85rem; padding:10px; justify-content:center; font-weight:800; width:100%; border-radius:12px; box-shadow:0 4px 15px rgba(16,185,129,0.3); cursor:pointer;">
              <i data-lucide="user-check" style="width:15px; height:15px;"></i> تأكيد حضور المعلم (لست غائباً) ✍️
            </button>
            <div style="font-size:0.75rem; color:var(--text-muted); text-align:center;">* اضغط لتأكيد حضورك وتفعيل أزرار البث والقاعة</div>
          </div>
        `;
      }
    } else {
      const isJoinable = canJoinSession(session);
      const isOnTime = nowTime >= sessionTime;
      const isCheckedIn = window.checkedInSessions?.has(session.id);
      if (isJoinable) {
        statusTag = `<span class="session-tag" style="background:var(--info-glow); color:var(--info); border-color:var(--info); font-weight:800;">${isOnTime ? '🕐 موعد الحصة الآن' : '⚡ تبدأ قريباً'}</span>`;
        if (isCheckedIn) {
          sessionAction = `
            <div style="display:flex; flex-direction:column; gap:8px; margin-top:14px;">
              <span style="font-size:0.78rem; font-weight:800; color:#10b981; padding:6px 10px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:10px; display:inline-flex; align-items:center; justify-content:center; gap:6px; width:100%; box-sizing:border-box;">
                <i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> تم تأكيد حضور المعلم (حاضر) ✅
              </span>
              <div style="display:grid; grid-template-columns:1fr 1fr auto; gap:6px;">
                <button class="btn-primary start-session-btn" data-id="${session.id}" style="font-size:0.78rem; padding:7px 10px; justify-content:center; font-weight:800;"><i data-lucide="play" style="width:13px;height:13px;"></i> ${t("session.goLive")}</button>
                <button class="btn-secondary" data-join-meet-id="${session.id}" style="font-size:0.78rem; padding:7px 10px; justify-content:center; display:flex; align-items:center; gap:4px; font-weight:800; cursor:pointer; border-radius:10px;"><i data-lucide="video" style="width:13px;height:13px;"></i> Google Meet 🎥</button>
                <button class="btn-secondary edit-session-btn" data-id="${session.id}" style="font-size:0.78rem; padding:7px 10px; justify-content:center; border-color:var(--primary); color:var(--primary);" title="تعديل تاريخ ووقت الجلسة">
                  <i data-lucide="calendar-clock" style="width:13px;height:13px;"></i>
                </button>
              </div>
            </div>
          `;
        } else {
          sessionAction = `
            <div class="session-actions-wrapper" data-id="${session.id}" style="display:flex; flex-direction:column; gap:8px; margin-top:14px;">
              <button class="btn-primary session-checkin-btn" data-id="${session.id}" data-role="teacher" style="background:linear-gradient(135deg, #10b981, #059669); border:none; color:#fff; font-size:0.85rem; padding:10px; justify-content:center; font-weight:800; width:100%; border-radius:12px; box-shadow:0 4px 15px rgba(16,185,129,0.3); cursor:pointer;">
                <i data-lucide="user-check" style="width:15px; height:15px;"></i> تأكيد حضور المعلم (لست غائباً) ✍️
              </button>
              <div style="font-size:0.75rem; color:var(--text-muted); text-align:center;">* اضغط لتأكيد حضورك وتفعيل أزرار البث والقاعة</div>
            </div>
          `;
        }
      } else {
        sessionAction = `
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:14px;">
            <div style="display:grid; grid-template-columns:1fr auto; gap:8px;">
              <button disabled class="btn-secondary" style="font-size:0.78rem; padding:7px 10px; opacity:0.85; cursor:not-allowed; justify-content:center; background:rgba(99,102,241,0.06); color:var(--primary); border-color:rgba(99,102,241,0.2); font-weight:700;">
                <i data-lucide="lock" style="width:13px;height:13px;margin-inline-end:4px;"></i> ينشط قبل الموعد بساعة 🔒
              </button>
              <button class="btn-secondary edit-session-btn" data-id="${session.id}" style="font-size:0.8rem; padding:7px 10px; justify-content:center; border-color:var(--primary); color:var(--primary);" title="تعديل تاريخ ووقت الجلسة">
                <i data-lucide="calendar-clock" style="width:13px;height:13px;"></i>
              </button>
            </div>
          </div>
        `;
      }
    }

    return `
      <div class="glass-card session-card" style="${isLive ? "border-color: var(--success);" : ""}">
        <div class="session-header-row">
          ${statusTag}
          <span style="font-size: 0.75rem; color:var(--text-muted); font-weight:600;">${session.duration} ${t("session.mins")}</span>
        </div>
        <h4 class="session-title">${session.title}</h4>
        ${session.course ? `<div style="font-size:0.75rem; color:var(--primary); font-weight:600; margin-top:2px;"><i data-lucide="book" style="width:12px;height:12px;"></i> ${session.course.title}</div>` : ""}
        <div class="session-time" style="margin-top:6px;">
          <i data-lucide="calendar" style="width:14px;height:14px;"></i>
          <span>${formattedDate} ${t("session.at")} ${formattedTime}</span>
        </div>
        ${sessionAction}
      </div>
    `;
  }


  bindEvents() {
    document.querySelectorAll(".teacher-view-sub-sessions-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const subId = e.currentTarget.getAttribute("data-id");
        this.selectedSubscriptionId = subId;
        this.currentViewMode = 'student_sessions';
        this.render();
      });
    });

    document.getElementById("back-to-dashboard-btn")?.addEventListener("click", () => {
      this.currentViewMode = 'dashboard';
      this.selectedSubscriptionId = null;
      this.render();
    });

    document.getElementById("student-sessions-status-filter")?.addEventListener("change", (e) => {
      this.sessionsFilterStatus = e.target.value;
      this.render();
    });

    // Financial Hub Event Listeners
    this.container.querySelector("#open-financial-hub-btn")?.addEventListener("click", () => {
      this.currentViewMode = 'financial';
      window.location.hash = "#teacher-financial";
      this.render();
    });

    this.container.querySelector("#stat-box-earnings")?.addEventListener("click", () => {
      this.currentViewMode = 'financial';
      window.location.hash = "#teacher-financial";
      this.render();
    });

    // Session Table Actions
    document.querySelectorAll(".start-session-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        try {
          const res = await apiFetch(`/sessions/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "live" }) });
          if (res.message) showToast(res.message, "success");
          this.render();
        } catch (err) {
          showToast(err.message || "فشل بدء الجلسة", "error");
        }
      });
    });

    document.querySelectorAll(".end-session-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        if (typeof window.showEndSessionReportModal === 'function') {
          window.showEndSessionReportModal(id, () => this.render());
        }
      });
    });

    document.querySelectorAll(".session-checkin-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader" class="spinner" style="width:13px;height:13px;"></i> جاري تأكيد الحضور...`;
        if (window.lucide) window.lucide.createIcons();

        try {
          const res = await apiFetch(`/sessions/${id}/checkin`, { method: "POST" });
          showToast(res.message || "تم تأكيد حضورك في الحصة بنجاح ولن يتم احتسابك غائباً ✅", "success");
          window.checkedInSessions = window.checkedInSessions || new Set();
          window.checkedInSessions.add(id);

          const wrapper = btn.closest(".session-actions-wrapper") || btn.parentElement;
          if (wrapper) {
            wrapper.innerHTML = `
              <div style="display:flex; flex-direction:column; gap:8px;">
                <span style="font-size:0.78rem; font-weight:800; color:#10b981; padding:6px 10px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:10px; display:inline-flex; align-items:center; justify-content:center; gap:6px; width:100%; box-sizing:border-box;">
                  <i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> تم تأكيد حضور المعلم (حاضر) ✅
                </span>
                <div style="display:grid; grid-template-columns:1fr 1fr auto; gap:6px;">
                  <button class="btn-primary start-session-btn" data-id="${id}" style="font-size:0.78rem; padding:7px 10px; justify-content:center; font-weight:800;"><i data-lucide="play" style="width:13px;height:13px;"></i> بدء البث 🔴</button>
                  <button class="btn-secondary" data-join-meet-id="${id}" style="font-size:0.78rem; padding:7px 10px; justify-content:center; display:flex; align-items:center; gap:4px; font-weight:800; cursor:pointer; border-radius:10px;"><i data-lucide="video" style="width:13px;height:13px;"></i> Google Meet 🎥</button>
                  <button class="btn-secondary edit-session-btn" data-id="${id}" style="font-size:0.78rem; padding:7px 10px; justify-content:center; border-color:var(--primary); color:var(--primary);" title="تعديل تاريخ ووقت الجلسة">
                    <i data-lucide="calendar-clock" style="width:13px;height:13px;"></i>
                  </button>
                </div>
              </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            wrapper.querySelectorAll(".start-session-btn").forEach(sBtn => {
              sBtn.addEventListener("click", async () => {
                const sId = sBtn.getAttribute("data-id");
                try {
                  const r = await apiFetch(`/sessions/${sId}/status`, { method: "PATCH", body: JSON.stringify({ status: "live" }) });
                  if (r.message) showToast(r.message, "success");
                  this.render();
                } catch (err) {
                  showToast(err.message || "فشل بدء الجلسة", "error");
                }
              });
            });
          }
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = `<i data-lucide="user-check" style="width:14px; height:14px;"></i> تأكيد حضور المعلم (لست غائباً) ✍️`;
          if (window.lucide) window.lucide.createIcons();
          showToast(err.message || "تعذر تأكيد الحضور.", "error");
        }
      });
    });

    document.querySelectorAll(".handle-request-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        const action = e.currentTarget.getAttribute("data-action"); // active or rejected

        if (action === "active") {
          try {
            const requests = await apiFetch("/teacher/enrollment-requests");
            const req = Array.isArray(requests) ? requests.find(r => r.id === id) : null;

            showEnrollmentAcceptanceModal({
              enrollmentId: id,
              studentName: req?.student?.name || "الطالب",
              studentPhone: "",
              studentEmail: "",
              courseTitle: req?.course?.title || "الدورة التعليمية",
              teacherName: req?.course?.teacher?.name || state.user?.name,
              onAccept: async () => {
                try {
                  const res = await apiFetch(`/teacher/enrollment-requests/${id}`, {
                    method: "PUT",
                    body: JSON.stringify({ status: "active" })
                  });
                  showToast("تم قبول طلب الطالب بنجاح! 🎉", "success");
                  checkPendingRequestsNotification();
                  await this.render();
                } catch (err) {
                  console.error(err);
                  showToast(err.message || "حدث خطأ أثناء قبول الطلب", "error");
                }
              }
            });
          } catch (err) {
            console.error(err);
          }
        } else {
          try {
            await apiFetch(`/teacher/enrollment-requests/${id}`, {
              method: "PUT",
              body: JSON.stringify({ status: action })
            });
            showToast("تم رفض الطلب.", "info");
            checkPendingRequestsNotification();
            await this.render();
          } catch (err) {
            console.error(err);
          }
        }
      });
    });

    // Schedule filter buttons click handler for Teacher
    const filterBtns = this.container.querySelectorAll("[data-teacher-schedule-filter]");
    filterBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const filter = btn.getAttribute("data-teacher-schedule-filter");
        this.sessionFilter = filter;
        filterBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const container = this.container.querySelector("#teacher-schedule-container");
        if (container) {
          const filtered = this.filterSessions(this.sessions);
          container.innerHTML = filtered.length === 0
            ? `<div class="glass-card" style="text-align:center; padding: 30px; color:var(--text-muted);">${t("teacher.noSessions")}</div>`
            : filtered.map(session => this.renderTeacherSessionCard(session)).join("");
          if (window.lucide) window.lucide.createIcons();
          this.bindSessionActionButtons();
        }
      });
    });

    const courseModal = document.getElementById("course-modal");
    this.setupImageUploadEvents();

    const openCourseModalHandler = async () => {
      document.getElementById("create-course-form").reset();
      document.getElementById("create-course-form").removeAttribute("data-id");
      document.getElementById("course-image-url").value = "";
      const previewWrapper = document.getElementById("image-preview-wrapper");
      const idleBox = document.getElementById("image-upload-idle");
      if (previewWrapper) previewWrapper.style.display = "none";
      if (idleBox) idleBox.style.display = "block";
      await this.initTeacherCurriculumSelector();
      courseModal.querySelector(".modal-title").innerText = t("teacher.createCourse");
      courseModal.style.display = "flex";
    };

    // Open for Create
    document.getElementById("open-course-modal-btn")?.addEventListener("click", openCourseModalHandler);
    document.getElementById("open-course-modal-btn-2")?.addEventListener("click", openCourseModalHandler);
    document.getElementById("open-course-modal-btn-empty")?.addEventListener("click", openCourseModalHandler);

    document.getElementById("close-course-modal")?.addEventListener("click", () => { courseModal.style.display = "none"; });
    document.getElementById("cancel-course-modal")?.addEventListener("click", () => { courseModal.style.display = "none"; });

    // Open for Edit 
    const editButtons = this.container.querySelectorAll(".edit-course-btn");
    editButtons.forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const courseId = e.currentTarget.getAttribute("data-id");
        const course = await apiFetch(`/courses/${courseId}`);
        if (course) {
          document.getElementById("course-title").value = course.title || "";
          await this.initTeacherCurriculumSelector(course.grade?.id || course.gradeId, course.subject?.id || course.subjectId);
          document.getElementById("course-desc").value = course.description || "";
          document.getElementById("course-image-url").value = course.image || "";
          const directUrlInput = document.getElementById("course-image-url-direct");
          if (directUrlInput) directUrlInput.value = course.image || "";
          document.getElementById("course-meeting-link").value = course.meetingLink || "";

          const previewWrapper = document.getElementById("image-preview-wrapper");
          const previewImg = document.getElementById("course-preview-img");
          const idleBox = document.getElementById("image-upload-idle");
          if (course.image && previewWrapper && previewImg) {
            previewImg.src = course.image;
            previewWrapper.style.display = "block";
            if (idleBox) idleBox.style.display = "none";
          } else if (previewWrapper) {
            previewWrapper.style.display = "none";
            if (idleBox) idleBox.style.display = "block";
          }

          document.getElementById("create-course-form").setAttribute("data-id", courseId);
          courseModal.querySelector(".modal-title").innerText = "تعديل الدورة التعليمية";
          courseModal.style.display = "flex";
        }
      });
    });

    document.getElementById("create-course-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("course-title").value.trim();
      const hiddenCategory = document.getElementById("course-category-select");
      const hiddenDegree = document.getElementById("course-degree");
      const hiddenGradeId = document.getElementById("modal-selected-grade-id");
      const hiddenSubjectId = document.getElementById("modal-selected-subject-id");

      let category = hiddenCategory?.value?.trim();
      const customSubInput = document.getElementById("modal-custom-subject-input");
      if (!category && customSubInput && customSubInput.value) {
        category = customSubInput.value.trim();
      }

      if (!category) { 
        showToast("الرجاء اختيار المادة الدراسية أو كتابتها.", "error"); 
        return; 
      }

      const degree = hiddenDegree?.value || "";
      const gradeId = hiddenGradeId?.value || null;
      const subjectId = hiddenSubjectId?.value || null;
      const description = document.getElementById("course-desc").value;
      let image = document.getElementById("course-image-url")?.value || document.getElementById("course-image-url-direct")?.value.trim() || "";
      const meetingLink = document.getElementById("course-meeting-link").value;
      const fileInput = document.getElementById("course-image-file");

      // Handle file upload if not uploaded yet
      if (!image && fileInput && fileInput.files.length > 0) {
        const formData = new FormData();
        formData.append("file", fileInput.files[0]);
        try {
          const token = state.token || localStorage.getItem("token");
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            headers: { "Authorization": "Bearer " + token },
            body: formData
          });
          if (uploadRes.ok) {
            const data = await uploadRes.json();
            image = data.url;
          }
        } catch (err) {
          console.error("Upload failed", err);
        }
      }

      const courseId = document.getElementById("create-course-form").getAttribute("data-id");
      try {
        if (courseId) {
          await apiFetch(`/courses/${courseId}`, { 
            method: "PUT", 
            body: JSON.stringify({ title, category, degree, gradeId, subjectId, description, image, meetingLink }) 
          });
          showToast("تم تحديث بيانات الدورة بنجاح! ✅", "success");
        } else {
          await apiFetch("/courses", { 
            method: "POST", 
            body: JSON.stringify({ title, category, degree, gradeId, subjectId, description, image, meetingLink }) 
          });
          showToast("تم إنشاء الدورة التعليمية بنجاح وإرسالها للاعتماد! 🎉", "success");
        }
        courseModal.style.display = "none";
        await this.render();
      } catch (err) {
        showToast(err.message || "فشل حفظ الدورة التعليمية.", "error");
      }
    });

    const sessionModal = document.getElementById("session-modal");
    const openSessionModalHandler = () => {
      const form = document.getElementById("create-session-form");
      form.reset();
      form.removeAttribute("data-id");
      const dateInput = document.getElementById("session-date");
      if (dateInput) dateInput.min = getMinSessionDateTimeISO();
      sessionModal.querySelector(".modal-title").innerText = t("teacher.scheduleSession");
      sessionModal.style.display = "flex";
    };

    // Open for Session Create
    document.getElementById("open-session-modal-btn")?.addEventListener("click", openSessionModalHandler);
    document.getElementById("open-session-modal-btn-2")?.addEventListener("click", openSessionModalHandler);
    document.getElementById("close-session-modal")?.addEventListener("click", () => { sessionModal.style.display = "none"; });
    document.getElementById("cancel-session-modal")?.addEventListener("click", () => { sessionModal.style.display = "none"; });


    document.querySelectorAll(".add-session-trigger").forEach(btn => {
      btn.addEventListener("click", () => {
        const courseId = btn.getAttribute("data-id");
        const form = document.getElementById("create-session-form");
        form.reset();
        form.removeAttribute("data-id");
        const dateInput = document.getElementById("session-date");
        if (dateInput) dateInput.min = getMinSessionDateTimeISO();
        sessionModal.querySelector(".modal-title").innerText = t("teacher.scheduleSession");
        sessionModal.style.display = "flex";
        const select = document.getElementById("session-course-id");
        if (select) select.value = courseId;
      });
    });

    // Edit Session Date & Time Handler
    this.container.querySelectorAll(".edit-session-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const sId = e.currentTarget.getAttribute("data-id");
        const session = (this.sessions || []).find(s => s.id === sId);
        if (!session) return;

        const form = document.getElementById("create-session-form");
        form.reset();
        form.setAttribute("data-id", session.id);
        sessionModal.querySelector(".modal-title").innerText = "تعديل موعد وتاريخ الجلسة (Edit Session)";

        document.getElementById("session-title").value = session.title || "";
        if (session.course) {
          document.getElementById("session-course-id").value = session.course.id;
        }
        document.getElementById("session-desc").value = session.description || "";
        document.getElementById("session-duration").value = session.duration || 60;

        const dateInput = document.getElementById("session-date");
        if (dateInput) dateInput.min = getMinSessionDateTimeISO();

        if (session.scheduledAt) {
          const d = new Date(session.scheduledAt);
          const pad = (n) => String(n).padStart(2, '0');
          const localISO = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          document.getElementById("session-date").value = localISO;
        }

        sessionModal.style.display = "flex";
      });
    });

    document.getElementById("create-session-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const sessionId = form.getAttribute("data-id");
      const title = document.getElementById("session-title").value;
      const courseId = document.getElementById("session-course-id").value;
      const description = document.getElementById("session-desc").value;
      const scheduledAt = document.getElementById("session-date").value;
      const duration = parseInt(document.getElementById("session-duration").value, 10);

      const validation = validateSessionScheduledDate(scheduledAt);
      if (!validation.valid) {
        showToast(validation.errorMsg, "error");
        return;
      }

      try {
        if (sessionId) {
          await apiFetch(`/sessions/${sessionId}`, {
            method: "PUT",
            body: JSON.stringify({ title, courseId, description, scheduledAt, duration })
          });
          showToast("تم تعديل موعد الجلسة بنجاح! ✅", "success");
        } else {
          await apiFetch("/sessions", {
            method: "POST",
            body: JSON.stringify({ title, courseId, description, scheduledAt, duration })
          });
          showToast(t("toast.sessionScheduled"), "success");
        }
        sessionModal.style.display = "none";
        form.reset();
        form.removeAttribute("data-id");
        await this.render();
      } catch (err) {
        showToast(err.message || "عفواً، لا يمكنك اختيار تاريخ سابق أو قريب جداً! يجب أن يكون موعد البث المباشر بعد الوقت الحالي بساعة واحدة على الأقل. ❌", "error");
      }
    });

    const lessonModal = document.getElementById("lesson-modal");
    const lessonTitleHeading = document.getElementById("lesson-modal-title");

    // Sub-tab toggling in Lesson Modal
    this.container.querySelectorAll(".teacher-lesson-tab-btn").forEach(tabBtn => {
      tabBtn.addEventListener("click", () => {
        this.container.querySelectorAll(".teacher-lesson-tab-btn").forEach(b => {
          b.classList.remove("active");
          b.style.color = "var(--text-muted)";
          b.style.borderBottom = "none";
        });
        tabBtn.classList.add("active");
        tabBtn.style.color = "var(--primary)";
        tabBtn.style.borderBottom = "2px solid var(--primary)";

        const targetTab = tabBtn.getAttribute("data-tab");
        this.container.querySelectorAll(".teacher-lesson-tab-content").forEach(c => c.style.display = "none");
        const activeContent = document.getElementById(`teacher-lesson-tab-${targetTab}`);
        if (activeContent) activeContent.style.display = "flex";
      });
    });

    const teacherQuestionsContainer = document.getElementById("teacher-lesson-questions-list");
    this.teacherLessonQuestions = [];

    document.getElementById("teacher-add-lesson-question-btn")?.addEventListener("click", () => {
      if (!this.teacherLessonQuestions) this.teacherLessonQuestions = [];
      this.teacherLessonQuestions.push({
        id: Date.now().toString(),
        questionText: "",
        options: ["", "", "", ""],
        correctAnswer: "0",
        explanation: ""
      });
      this.renderTeacherQuestionItemsInModal(teacherQuestionsContainer);
    });

    const resetTeacherLessonModalTabs = () => {
      const firstTab = this.container.querySelector('.teacher-lesson-tab-btn[data-tab="details"]');
      if (firstTab) firstTab.click();
    };

    document.querySelectorAll(".add-lesson-trigger").forEach(btn => {
      btn.addEventListener("click", () => {
        this.selectedCourseForLesson = btn.getAttribute("data-id");
        const courseTitle = btn.getAttribute("data-title");
        lessonTitleHeading.textContent = `${t("teacher.addLessonTo")}: ${courseTitle}`;
        this.teacherLessonQuestions = [];
        this.renderTeacherQuestionItemsInModal(teacherQuestionsContainer);
        resetTeacherLessonModalTabs();
        document.getElementById("add-lesson-form")?.reset();
        lessonModal.style.display = "flex";
      });
    });

    document.getElementById("close-lesson-modal")?.addEventListener("click", () => { lessonModal.style.display = "none"; });
    document.getElementById("cancel-lesson-modal")?.addEventListener("click", () => { lessonModal.style.display = "none"; });

    document.getElementById("add-lesson-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = e.target.querySelector("button[type='submit']");
      if (submitBtn) submitBtn.disabled = true;

      const title = document.getElementById("lesson-title").value.trim();
      const chapter = document.getElementById("lesson-chapter").value.trim() || "General";
      const videoUrl = document.getElementById("lesson-videourl").value.trim();
      const duration = document.getElementById("lesson-duration").value.trim() || "10:00";
      const order = parseInt(document.getElementById("lesson-order").value) || 1;
      const description = document.getElementById("lesson-desc").value.trim() || null;
      const notes = document.getElementById("teacher-lesson-notes")?.value.trim() || null;
      const resourceTitle = document.getElementById("teacher-lesson-resource-title")?.value.trim() || null;
      const resourceUrl = document.getElementById("teacher-lesson-resource-url")?.value.trim() || null;

      const validQuestions = (this.teacherLessonQuestions || []).filter(q => q.questionText && q.questionText.trim().length > 0);

      try {
        await apiFetch(`/courses/${this.selectedCourseForLesson}/lessons`, {
          method: "POST",
          body: JSON.stringify({
            title, chapter, videoUrl, duration, order, description, notes, resourceTitle, resourceUrl, questions: validQuestions
          })
        });
        showToast(t("toast.lessonUploaded"), "success");
        lessonModal.style.display = "none";
        document.getElementById("add-lesson-form").reset();
        await this.render();
      } catch (err) {
        console.error("Error saving lesson in TeacherView:", err);
        showToast(err.message || "فشل حفظ الدرس. الرجاء التحقق والمحاولة مجدداً.", "error");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });

    this.bindSessionActionButtons();
    this.bindPrivateSessionEvents();
  }

  bindPrivateSessionEvents() {
    // ─── Complete Private Session Modal ───
    const completeModal = document.getElementById('complete-private-modal');

    this.container.querySelectorAll('.complete-private-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        document.getElementById('complete-session-id').value = id;
        document.getElementById('complete-topic').value = '';
        document.getElementById('complete-covered').value = '';
        document.getElementById('complete-performance').value = '';
        document.getElementById('complete-homework').value = '';
        document.getElementById('complete-notes').value = '';
        completeModal.style.display = 'flex';
      });
    });

    document.getElementById('close-complete-modal')?.addEventListener('click', () => {
      completeModal.style.display = 'none';
    });
    document.getElementById('cancel-complete-modal')?.addEventListener('click', () => {
      completeModal.style.display = 'none';
    });

    document.getElementById('submit-complete-btn')?.addEventListener('click', async () => {
      const id = document.getElementById('complete-session-id').value;
      const topic = document.getElementById('complete-topic').value;
      const whatWasCovered = document.getElementById('complete-covered').value;
      const studentPerformance = document.getElementById('complete-performance').value;
      const homework = document.getElementById('complete-homework').value;
      const teacherNotes = document.getElementById('complete-notes').value;

      const btn = document.getElementById('submit-complete-btn');
      btn.disabled = true;
      btn.textContent = 'جاري الحفظ...';
      try {
        await apiFetch(`/sessions/${id}/complete`, {
          method: 'POST',
          body: JSON.stringify({ topic, whatWasCovered, studentPerformance, homework, teacherNotes })
        });
        showToast('🎉 تم إكمال الحصة وتسجيل التقرير بنجاح!', 'success');
        completeModal.style.display = 'none';
        await this.render();
      } catch (err) {
        showToast(err.message || 'تعذر إكمال الحصة.', 'error');
        btn.disabled = false;
        btn.textContent = '✅ تأكيد إكمال الحصة';
      }
    });

    // ─── No-Show ───
    this.container.querySelectorAll('.noshow-private-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const confirmed = await confirmDialog({
          title: "تسجيل غياب طالب ⚠️",
          message: "هل أنت تأكد من تسجيل غياب الطالب لهذه الحصة؟ سيتم خصم حصة من رصيد الاشتراك وفق سياسة الأكاديمية.",
          confirmText: "تأكيد الغياب ⚠️",
          cancelText: "تراجع",
          danger: true
        });
        if (!confirmed) return;

        btn.disabled = true;
        try {
          await apiFetch(`/sessions/${id}/no-show`, { method: 'POST' });
          showToast('تم تسجيل غياب الطالب وخصم حصة. ⚠️', 'info');
          await this.render();
        } catch (err) {
          btn.disabled = false;
          showToast(err.message || 'تعذر تسجيل الغياب.', 'error');
        }
      });
    });

    // ─── Cancel Private Session ───
    this.container.querySelectorAll('.cancel-private-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const confirmed = await confirmDialog({
          title: "تأكيد إلغاء الحصة 🚫",
          message: "هل أنت تأكد من إلغاء هذه الحصة؟ سيتم استرداد رصيد الحصة للطالب وتسجيل الإلغاء.",
          confirmText: "تأكيد الإلغاء 🚫",
          cancelText: "تراجع",
          danger: true
        });
        if (!confirmed) return;

        btn.disabled = true;
        try {
          await apiFetch(`/sessions/${id}/cancel`, {
            method: 'POST',
            body: JSON.stringify({ reason: 'إلغاء من المعلم' })
          });
          showToast('تم إلغاء الحصة واسترداد رصيد للطالب. ✅', 'info');
          await this.render();
        } catch (err) {
          btn.disabled = false;
          showToast(err.message || 'تعذر إلغاء الحصة.', 'error');
        }
      });
    });

    // ─── View All Private Sessions Modal ───
    const allModal = document.getElementById('all-private-modal');
    const allList = document.getElementById('all-private-sessions-list');

    const renderAllSessions = (filter = 'all') => {
      const filtered = filter === 'all'
        ? this.privateSessions
        : this.privateSessions.filter(s => s.status === filter || (filter === 'CANCELLED_BY_STUDENT' && s.status.startsWith('CANCELLED')));
      allList.innerHTML = filtered.length === 0
        ? `<div style="text-align:center; padding:40px; color:var(--text-muted); grid-column:1/-1;">لا توجد حصص في هذا التصنيف.</div>`
        : filtered.map(s => this.renderPrivateSessionCard(s)).join('');
      if (window.lucide) window.lucide.createIcons();
    };

    document.getElementById('view-all-private-btn')?.addEventListener('click', () => {
      renderAllSessions('all');
      allModal.style.display = 'flex';
    });
    document.getElementById('close-all-private-modal')?.addEventListener('click', () => {
      allModal.style.display = 'none';
    });

    document.querySelectorAll('.private-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.private-filter-btn').forEach(b => {
          b.style.background = 'none';
          b.style.color = '';
          b.classList.remove('active');
        });
        btn.style.background = 'var(--primary)';
        btn.style.color = '#fff';
        btn.classList.add('active');
        renderAllSessions(btn.getAttribute('data-status'));
      });
    });
  }

  bindSessionActionButtons() {
    this.container.querySelectorAll(".start-session-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        try {
          await apiFetch(`/sessions/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "live" }) });
          showToast(t("toast.sessionLive"), "success");
          await this.render();
        } catch (err) { }
      });
    });

    document.querySelectorAll(".end-session-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        this.renderEndSessionReportModal(id);
      });
    });
  }

  async populateCategoryOptions(selectedCategory = "") {
    const catSelect = document.getElementById("course-category-select");
    if (!catSelect) return;

    let apiCategories = [];
    try {
      apiCategories = await apiFetch("/categories");
    } catch (e) {
      console.error("Failed to fetch categories", e);
    }

    let optionsHTML = `<option value="">-- اختر التصنيف المعتمد بالمنصة --</option>`;

    if (apiCategories && apiCategories.length > 0) {
      apiCategories.forEach(cat => {
        const isSel = selectedCategory && (selectedCategory === cat.name || selectedCategory.toLowerCase() === cat.name.toLowerCase());
        optionsHTML += `<option value="${cat.name}" ${isSel ? 'selected' : ''}>${cat.name}</option>`;
      });
    }

    catSelect.innerHTML = optionsHTML;
    if (selectedCategory && catSelect.querySelector(`option[value="${selectedCategory}"]`)) {
      catSelect.value = selectedCategory;
    }
  }

  async initTeacherCurriculumSelector(preselectedGradeId = null, preselectedSubjectId = null) {
    let allGrades = [];
    try {
      allGrades = await apiFetch("/curriculum/grades");
    } catch (e) {
      console.error("Failed to fetch curriculum grades for teacher modal:", e);
    }

    if (!Array.isArray(allGrades) || allGrades.length === 0) return;

    this.curriculumGradesData = allGrades;
    let currentStage = "PRIMARY";

    // If preselectedGradeId exists, infer the stage
    if (preselectedGradeId) {
      const g = allGrades.find(gr => gr.id === preselectedGradeId);
      if (g && g.stage) currentStage = g.stage;
    }

    const stageBtns = document.querySelectorAll(".teacher-modal-stage-btn");
    const gradeSelect = document.getElementById("modal-curriculum-grade-select");
    const subjectSelect = document.getElementById("modal-curriculum-subject-select");
    const customSubjectWrapper = document.getElementById("modal-custom-subject-wrapper");
    const customSubjectInput = document.getElementById("modal-custom-subject-input");
    const hiddenCategory = document.getElementById("course-category-select");
    const hiddenDegree = document.getElementById("course-degree");
    const hiddenGradeId = document.getElementById("modal-selected-grade-id");
    const hiddenSubjectId = document.getElementById("modal-selected-subject-id");

    const updateStageUI = (stage) => {
      currentStage = stage;
      stageBtns.forEach(btn => {
        const isCurrent = btn.getAttribute("data-stage") === stage;
        btn.classList.toggle("active", isCurrent);
        if (isCurrent) {
          const color = stage === "PRIMARY" ? "#10b981" : stage === "PREPARATORY" ? "#3b82f6" : "#e51d74";
          btn.style.background = color;
          btn.style.borderColor = color;
          btn.style.color = "#ffffff";
          btn.style.boxShadow = `0 4px 12px ${color}40`;
        } else {
          btn.style.background = "var(--bg-card)";
          btn.style.borderColor = "var(--border-color)";
          btn.style.color = "var(--text-main)";
          btn.style.boxShadow = "none";
        }
      });

      // Filter grades
      const stageGrades = allGrades.filter(g => g.stage === stage);
      if (stageGrades.length === 0) {
        if (gradeSelect) gradeSelect.innerHTML = `<option value="">لا توجد صفوف مسجلة لهذه المرحلة</option>`;
        if (subjectSelect) subjectSelect.innerHTML = `<option value="">-- اختر الصف أولاً --</option>`;
        return;
      }

      if (gradeSelect) {
        gradeSelect.innerHTML = stageGrades.map(g => `
          <option value="${g.id}" ${preselectedGradeId === g.id ? 'selected' : ''}>
            ${g.name}
          </option>
        `).join('');

        // Trigger grade change
        updateSubjectsUI(gradeSelect.value);
      }
    };

    const updateSubjectsUI = (gradeId) => {
      if (hiddenGradeId) hiddenGradeId.value = gradeId;
      const selectedGrade = allGrades.find(g => g.id === gradeId);
      if (selectedGrade && hiddenDegree) {
        hiddenDegree.value = selectedGrade.name;
      }

      const subjects = selectedGrade?.subjects || [];
      if (!subjectSelect) return;

      if (subjects.length === 0) {
        subjectSelect.innerHTML = `
          <option value="">لا توجد مواد مسجلة</option>
          <option value="__custom__">✏️ إدخال مادة مخصصة يدوياً</option>
        `;
        if (customSubjectWrapper) customSubjectWrapper.style.display = "block";
        return;
      }

      subjectSelect.innerHTML = `
        <option value="">-- اختر المادة الدراسية --</option>
        ${subjects.map(s => `
          <option value="${s.id}" data-name="${s.name}" ${preselectedSubjectId === s.id ? 'selected' : ''}>
            ${s.name} ${s.isLanguageTrack ? '(مسار لغات 🌐)' : '(منهج عام 🇪🇬)'}
          </option>
        `).join('')}
        <option value="__custom__">✏️ مادة أخرى / تخصص مخصص</option>
      `;

      if (preselectedSubjectId && subjects.some(s => s.id === preselectedSubjectId)) {
        const s = subjects.find(sub => sub.id === preselectedSubjectId);
        if (hiddenSubjectId) hiddenSubjectId.value = s.id;
        if (hiddenCategory) hiddenCategory.value = s.name;
        if (customSubjectWrapper) customSubjectWrapper.style.display = "none";
      } else {
        if (hiddenSubjectId) hiddenSubjectId.value = "";
        if (hiddenCategory) hiddenCategory.value = "";
        if (customSubjectWrapper) customSubjectWrapper.style.display = "none";
      }
    };

    stageBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        updateStageUI(btn.getAttribute("data-stage"));
      });
    });

    gradeSelect?.addEventListener("change", (e) => {
      updateSubjectsUI(e.target.value);
    });

    subjectSelect?.addEventListener("change", (e) => {
      const val = e.target.value;
      if (val === "__custom__") {
        if (customSubjectWrapper) customSubjectWrapper.style.display = "block";
        if (hiddenSubjectId) hiddenSubjectId.value = "";
        if (hiddenCategory) hiddenCategory.value = customSubjectInput?.value || "";
      } else {
        if (customSubjectWrapper) customSubjectWrapper.style.display = "none";
        if (hiddenSubjectId) hiddenSubjectId.value = val;
        const selectedOpt = subjectSelect.options[subjectSelect.selectedIndex];
        if (hiddenCategory) hiddenCategory.value = selectedOpt?.getAttribute("data-name") || selectedOpt?.text || "";
      }
    });

    customSubjectInput?.addEventListener("input", (e) => {
      if (subjectSelect?.value === "__custom__" && hiddenCategory) {
        hiddenCategory.value = e.target.value.trim();
      }
    });

    // Initialize with current stage
    updateStageUI(currentStage);
  }

  renderTeacherQuestionItemsInModal(questionsContainer) {
    if (!questionsContainer) return;
    if (!this.teacherLessonQuestions) this.teacherLessonQuestions = [];

    if (this.teacherLessonQuestions.length === 0) {
      questionsContainer.innerHTML = `
        <div style="text-align:center; padding:20px; color:var(--text-muted); border:1px dashed var(--border-color); border-radius:10px; font-size:0.85rem;">
          لا توجد أسئلة مضافة حتى الآن. اضغط على "إضافة سؤال" لبدء إضافة الأسئلة لهذا الدرس.
        </div>
      `;
      return;
    }

    questionsContainer.innerHTML = this.teacherLessonQuestions.map((q, idx) => `
      <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:10px; position:relative;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:800; font-size:0.85rem; color:var(--primary);">سؤال ${idx + 1}</span>
          <button type="button" class="remove-teacher-question-btn" data-index="${idx}" style="background:none; border:none; color:var(--error); cursor:pointer; font-size:0.8rem; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
            <i data-lucide="trash-2" style="width:14px;height:14px;"></i> حذف السؤال
          </button>
        </div>

        <div class="form-group" style="margin:0;">
          <label style="font-size:0.8rem; font-weight:700; display:block; margin-bottom:4px;">نص السؤال</label>
          <input type="text" class="form-input t-q-text-input" data-index="${idx}" placeholder="اكتب نص السؤال هنا..." value="${q.questionText || ''}" style="padding:8px 12px; font-size:0.88rem;">
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <input type="text" class="form-input t-q-opt-input" data-index="${idx}" data-opt="0" placeholder="الخيار (أ)" value="${q.options?.[0] || ''}" style="padding:6px 10px; font-size:0.82rem;">
          <input type="text" class="form-input t-q-opt-input" data-index="${idx}" data-opt="1" placeholder="الخيار (ب)" value="${q.options?.[1] || ''}" style="padding:6px 10px; font-size:0.82rem;">
          <input type="text" class="form-input t-q-opt-input" data-index="${idx}" data-opt="2" placeholder="الخيار (ج)" value="${q.options?.[2] || ''}" style="padding:6px 10px; font-size:0.82rem;">
          <input type="text" class="form-input t-q-opt-input" data-index="${idx}" data-opt="3" placeholder="الخيار (د)" value="${q.options?.[3] || ''}" style="padding:6px 10px; font-size:0.82rem;">
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div>
            <label style="font-size:0.78rem; font-weight:700; display:block; margin-bottom:4px;">الإجابة الصحيحة</label>
            <select class="form-select t-q-correct-select" data-index="${idx}" style="padding:6px 10px; font-size:0.82rem;">
              <option value="0" ${q.correctAnswer === '0' || q.correctAnswer === q.options?.[0] ? 'selected' : ''}>الخيار (أ)</option>
              <option value="1" ${q.correctAnswer === '1' || q.correctAnswer === q.options?.[1] ? 'selected' : ''}>الخيار (ب)</option>
              <option value="2" ${q.correctAnswer === '2' || q.correctAnswer === q.options?.[2] ? 'selected' : ''}>الخيار (ج)</option>
              <option value="3" ${q.correctAnswer === '3' || q.correctAnswer === q.options?.[3] ? 'selected' : ''}>الخيار (د)</option>
            </select>
          </div>
          <div>
            <label style="font-size:0.78rem; font-weight:700; display:block; margin-bottom:4px;">شرح الإجابة (توضيح اختيار الطالب)</label>
            <input type="text" class="form-input t-q-explanation-input" data-index="${idx}" placeholder="سبب وتفسير الإجابة الصحيحة..." value="${q.explanation || ''}" style="padding:6px 10px; font-size:0.82rem;">
          </div>
        </div>
      </div>
    `).join("");

    if (window.lucide) window.lucide.createIcons();

    // Bind inputs changes
    questionsContainer.querySelectorAll(".t-q-text-input").forEach(input => {
      input.addEventListener("input", (e) => {
        const i = parseInt(e.target.getAttribute("data-index"));
        if (this.teacherLessonQuestions[i]) this.teacherLessonQuestions[i].questionText = e.target.value;
      });
    });

    questionsContainer.querySelectorAll(".t-q-opt-input").forEach(input => {
      input.addEventListener("input", (e) => {
        const i = parseInt(e.target.getAttribute("data-index"));
        const optIdx = parseInt(e.target.getAttribute("data-opt"));
        if (this.teacherLessonQuestions[i]) {
          if (!this.teacherLessonQuestions[i].options) this.teacherLessonQuestions[i].options = ["", "", "", ""];
          this.teacherLessonQuestions[i].options[optIdx] = e.target.value;
        }
      });
    });

    questionsContainer.querySelectorAll(".t-q-correct-select").forEach(select => {
      select.addEventListener("change", (e) => {
        const i = parseInt(e.target.getAttribute("data-index"));
        if (this.teacherLessonQuestions[i]) this.teacherLessonQuestions[i].correctAnswer = e.target.value;
      });
    });

    questionsContainer.querySelectorAll(".t-q-explanation-input").forEach(input => {
      input.addEventListener("input", (e) => {
        const i = parseInt(e.target.getAttribute("data-index"));
        if (this.teacherLessonQuestions[i]) this.teacherLessonQuestions[i].explanation = e.target.value;
      });
    });

    questionsContainer.querySelectorAll(".remove-teacher-question-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const i = parseInt(e.currentTarget.getAttribute("data-index"));
        this.teacherLessonQuestions.splice(i, 1);
        this.renderTeacherQuestionItemsInModal(questionsContainer);
      });
    });
  }

  setupImageUploadEvents() {
    const fileInput = document.getElementById("course-image-file");
    const triggerBtn = document.getElementById("btn-trigger-upload");
    const dropzone = document.getElementById("course-dropzone");
    const idleBox = document.getElementById("image-upload-idle");
    const loadingBox = document.getElementById("image-upload-loading");
    const previewWrapper = document.getElementById("image-preview-wrapper");
    const previewImg = document.getElementById("course-preview-img");
    const removeBtn = document.getElementById("remove-course-image-btn");
    const hiddenUrlInput = document.getElementById("course-image-url");
    const toggleUrlBtn = document.getElementById("toggle-url-input-btn");
    const urlInputWrapper = document.getElementById("url-input-wrapper");
    const directUrlInput = document.getElementById("course-image-url-direct");

    triggerBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      fileInput?.click();
    });

    dropzone?.addEventListener("click", (e) => {
      if (e.target === dropzone || idleBox?.contains(e.target)) {
        fileInput?.click();
      }
    });

    toggleUrlBtn?.addEventListener("click", () => {
      if (urlInputWrapper.style.display === "none") {
        urlInputWrapper.style.display = "block";
        toggleUrlBtn.innerText = "إلغاء أدخل الرابط ✕";
      } else {
        urlInputWrapper.style.display = "none";
        toggleUrlBtn.innerText = "أو أدخل رابط صورة مباشرة 🔗";
      }
    });

    directUrlInput?.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      if (val) {
        hiddenUrlInput.value = val;
        previewImg.src = val;
        previewWrapper.style.display = "block";
        if (idleBox) idleBox.style.display = "none";
      }
    });

    removeBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      hiddenUrlInput.value = "";
      if (fileInput) fileInput.value = "";
      if (directUrlInput) directUrlInput.value = "";
      previewWrapper.style.display = "none";
      if (idleBox) idleBox.style.display = "block";
    });

    fileInput?.addEventListener("change", async () => {
      if (!fileInput.files || fileInput.files.length === 0) return;
      const file = fileInput.files[0];

      if (idleBox) idleBox.style.display = "none";
      if (loadingBox) loadingBox.style.display = "block";
      if (previewWrapper) previewWrapper.style.display = "none";

      const formData = new FormData();
      formData.append("file", file);

      try {
        const token = state.token || localStorage.getItem("token");
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Authorization": "Bearer " + token },
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          hiddenUrlInput.value = data.url;
          previewImg.src = data.url;
          if (loadingBox) loadingBox.style.display = "none";
          if (previewWrapper) previewWrapper.style.display = "block";
          showToast("تم رفع صورة الدورة بنجاح 🎉", "success");
        } else {
          throw new Error("Upload failed with status " + res.status);
        }
      } catch (err) {
        console.error("Image upload failed", err);
        if (loadingBox) loadingBox.style.display = "none";
        if (idleBox) idleBox.style.display = "block";
        showToast("تعذر رفع الصورة، الرجاء إعادة المحاولة.", "error");
      }
    });
  }

  // ── Render Teacher Financial & Earnings Single Page with Sidebar Tabs ─────────────
  renderFinancialPage() {
    const data = this.earningsData || { earnings: [], stats: {} };
    const earningsList = data.earnings || [];
    const stats = data.stats || {
      totalEarned: 0,
      pendingAmount: 0,
      paidAmount: 0,
      courseSalesEarnings: 0,
      sessionEarnings: 0
    };

    const sourceTypeMap = {
      'COURSE_SALE': { label: '📖 مبيعات دورة مسجلة', bg: 'rgba(99,102,241,0.1)', color: 'var(--primary)' },
      'SESSION_COMPLETED': { label: '🎥 إكمال حصة مباشرة/خاصة', bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
      'ADJUSTMENT': { label: '⚖️ تسوية تعديل إداري', bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
      'BONUS': { label: '🎁 مكافأة تميز بالأكاديمية', bg: 'rgba(236,72,153,0.1)', color: '#ec4899' },
      'REFUND': { label: '↩️ استرداد/خصم', bg: 'rgba(239,68,68,0.1)', color: '#ef4444' }
    };

    const renderTableRows = (list) => {
      if (list.length === 0) {
        return `
          <tr>
            <td colspan="5" style="text-align:center; padding:50px 16px; color:var(--text-muted); font-size:0.9rem;">
              <i data-lucide="wallet" style="width:40px; height:40px; opacity:0.3; margin-bottom:10px; display:block; margin-inline:auto;"></i>
              لا توجد سجلات مالية في هذا التصنيف حالياً.
            </td>
          </tr>
        `;
      }
      return list.map((item, idx) => {
        const src = sourceTypeMap[item.sourceType] || { label: item.sourceType, bg: 'rgba(0,0,0,0.05)', color: 'var(--text-muted)' };
        const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString('ar', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
        const isPaid = item.status === 'paid';

        return `
          <tr style="border-bottom:1px solid var(--border-color);" class="table-row-hover">
            <td style="padding:14px 18px; font-weight:800; color:var(--primary);">#${idx + 1}</td>
            <td style="padding:14px 18px;">
              <span class="badge" style="background:${src.bg}; color:${src.color}; font-weight:800; font-size:0.8rem; padding:6px 12px; border-radius:12px;">
                ${src.label}
              </span>
            </td>
            <td style="padding:14px 18px; font-weight:900; font-size:1rem; color:#10b981;">
              + ${(item.amount || 0).toLocaleString()} ${item.currency || 'EGP'}
            </td>
            <td style="padding:14px 18px;">
              ${isPaid ? `
                <span class="badge" style="background:rgba(16,185,129,0.15); color:#047857; font-weight:800; font-size:0.8rem; padding:5px 12px; border-radius:12px; display:inline-flex; align-items:center; gap:4px;">
                  <i data-lucide="check-circle" style="width:14px; height:14px;"></i> تم الصرف والمقاصة
                </span>
              ` : `
                <span class="badge" style="background:rgba(245,158,11,0.15); color:#b45309; font-weight:800; font-size:0.8rem; padding:5px 12px; border-radius:12px; display:inline-flex; align-items:center; gap:4px;">
                  <i data-lucide="clock" style="width:14px; height:14px;"></i> معلق في انتظار الصرف
                </span>
              `}
            </td>
            <td style="padding:14px 18px; font-size:0.83rem; color:var(--text-muted);">${dateStr}</td>
          </tr>
        `;
      }).join('');
    };

    this.container.innerHTML = `
      <div style="max-width:1440px; margin:0 auto; padding:32px 24px; display:flex; flex-direction:column; gap:24px;">
        
        <!-- Top Navigation & Header Row -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; background:linear-gradient(135deg, rgba(245,158,11,0.08), rgba(99,102,241,0.08)); padding:22px 28px; border-radius:24px; border:1px solid var(--border-color);">
          <div>
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
              <button id="back-to-teacher-dash-btn" class="btn-secondary" style="font-weight:800; font-size:0.85rem; padding:7px 16px; border-radius:30px; display:inline-flex; align-items:center; gap:6px; border-color:var(--primary); color:var(--primary);">
                <i data-lucide="arrow-right" style="width:16px; height:16px;"></i> العودة للوحة الرئيسية
              </button>
            </div>
            <h2 style="font-size:1.8rem; font-weight:900; margin:0; display:flex; align-items:center; gap:10px; color:var(--text-main);">
              <i data-lucide="wallet" style="color:#f59e0b; width:28px; height:28px;"></i> السجل المالي والمستحقات (Financial Hub) 💰
            </h2>
            <p style="color:var(--text-muted); font-size:0.88rem; margin:6px 0 0 0;">متابعة تفصيلية وشاملة لكافة الأرباح، التسويات المالية، والمستحقات المعلقة والمدفوعة</p>
          </div>

          <!-- Quick Stats Cards Badge Row -->
          <div style="display:flex; gap:12px; flex-wrap:wrap;">
            <div style="background:var(--bg-card); border:1px solid rgba(16,185,129,0.3); border-radius:16px; padding:12px 20px; text-align:center; min-width:140px;">
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:800;">إجمالي الأرباح</div>
              <div style="font-size:1.3rem; font-weight:900; color:#10b981;">${(stats.totalEarned || 0).toLocaleString()} <span style="font-size:0.75rem;">ج.م</span></div>
            </div>
            <div style="background:rgba(245,158,11,0.06); border:1px solid rgba(245,158,11,0.3); border-radius:16px; padding:12px 20px; text-align:center; min-width:140px;">
              <div style="font-size:0.75rem; color:#b45309; font-weight:800;">مستحقات معلقة</div>
              <div style="font-size:1.3rem; font-weight:900; color:#f59e0b;">${(stats.pendingAmount || 0).toLocaleString()} <span style="font-size:0.75rem;">ج.م</span></div>
            </div>
          </div>
        </div>

        <!-- Sidebar Layout Container -->
        <div style="display:grid; grid-template-columns: minmax(260px, 280px) 1fr; gap:24px; align-items:start;" class="fin-layout-grid">
          
          <!-- Sidebar Navigation Tabs -->
          <div class="glass-card" style="padding:18px; border-radius:22px; border:1px solid var(--border-color); display:flex; flex-direction:column; gap:8px; position:sticky; top:90px; background:var(--bg-card);">
            <div style="font-size:0.75rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; padding:6px 12px; margin-bottom:4px;">
              📋 التبويبات المالية
            </div>

            <button class="fin-sidebar-tab-btn active" data-tab="overview" style="width:100%; text-align:start; padding:12px 16px; border-radius:14px; border:none; font-weight:800; font-size:0.88rem; display:flex; align-items:center; gap:10px; cursor:pointer; transition:all 0.2s ease; background:var(--primary); color:#fff;">
              <i data-lucide="layout-dashboard" style="width:18px; height:18px;"></i>
              <span>📊 نظرة عامة شاملة</span>
            </button>

            <button class="fin-sidebar-tab-btn" data-tab="pending" style="width:100%; text-align:start; padding:12px 16px; border-radius:14px; border:1px solid transparent; font-weight:800; font-size:0.88rem; display:flex; align-items:center; justify-content:space-between; gap:10px; cursor:pointer; transition:all 0.2s ease; background:transparent; color:var(--text-main);">
              <div style="display:flex; align-items:center; gap:10px;">
                <i data-lucide="clock" style="width:18px; height:18px; color:#f59e0b;"></i>
                <span>⏳ المستحقات المعلقة</span>
              </div>
              ${stats.pendingAmount > 0 ? `<span style="background:rgba(245,158,11,0.15); color:#b45309; font-size:0.72rem; padding:3px 8px; border-radius:10px; font-weight:900;">${stats.pendingAmount.toLocaleString()} ج.م</span>` : ''}
            </button>

            <button class="fin-sidebar-tab-btn" data-tab="paid" style="width:100%; text-align:start; padding:12px 16px; border-radius:14px; border:1px solid transparent; font-weight:800; font-size:0.88rem; display:flex; align-items:center; gap:10px; cursor:pointer; transition:all 0.2s ease; background:transparent; color:var(--text-main);">
              <i data-lucide="check-circle-2" style="width:18px; height:18px; color:#10b981;"></i>
              <span>✅ المستحقات المدفوعة</span>
            </button>

            <button class="fin-sidebar-tab-btn" data-tab="courses" style="width:100%; text-align:start; padding:12px 16px; border-radius:14px; border:1px solid transparent; font-weight:800; font-size:0.88rem; display:flex; align-items:center; gap:10px; cursor:pointer; transition:all 0.2s ease; background:transparent; color:var(--text-main);">
              <i data-lucide="book-open" style="width:18px; height:18px; color:var(--primary);"></i>
              <span>📖 مبيعات الكورسات</span>
            </button>

            <button class="fin-sidebar-tab-btn" data-tab="sessions" style="width:100%; text-align:start; padding:12px 16px; border-radius:14px; border:1px solid transparent; font-weight:800; font-size:0.88rem; display:flex; align-items:center; gap:10px; cursor:pointer; transition:all 0.2s ease; background:transparent; color:var(--text-main);">
              <i data-lucide="video" style="width:18px; height:18px; color:#ec4899;"></i>
              <span>🎥 أرباح الحصص المباشرة</span>
            </button>

            <div style="margin-top:16px; padding:14px; border-radius:14px; background:rgba(99,102,241,0.05); border:1px solid rgba(99,102,241,0.15); font-size:0.78rem; color:var(--text-muted); line-height:1.5;">
              <i data-lucide="info" style="width:16px; height:16px; color:var(--primary); margin-bottom:6px; display:block;"></i>
              يتم صرف وتحديث المستحقات المالية المعلقة من قِبل إدارة الأكاديمية بانتظام.
            </div>
          </div>

          <!-- Main Dynamic Content Panel -->
          <div id="fin-tab-content-panel" style="display:flex; flex-direction:column; gap:20px;">
            
            <!-- Overview Cards -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:14px;" id="fin-overview-cards-grid">
              
              <div class="glass-card" style="padding:18px; border-radius:18px; border:1px solid var(--border-color);">
                <div style="font-size:0.78rem; font-weight:800; color:var(--text-muted); margin-bottom:6px;">💵 إجمالي الأرباح المكتسبة</div>
                <div style="font-size:1.4rem; font-weight:900; color:#10b981;">${(stats.totalEarned || 0).toLocaleString()} <span style="font-size:0.8rem;">ج.م</span></div>
              </div>

              <div class="glass-card" style="padding:18px; border-radius:18px; border:1px solid rgba(245,158,11,0.3); background:rgba(245,158,11,0.04);">
                <div style="font-size:0.78rem; font-weight:800; color:#b45309; margin-bottom:6px;">⏳ مستحقات معلقة للصرف</div>
                <div style="font-size:1.4rem; font-weight:900; color:#f59e0b;">${(stats.pendingAmount || 0).toLocaleString()} <span style="font-size:0.8rem;">ج.م</span></div>
              </div>

              <div class="glass-card" style="padding:18px; border-radius:18px; border:1px solid rgba(16,185,129,0.3); background:rgba(16,185,129,0.04);">
                <div style="font-size:0.78rem; font-weight:800; color:#047857; margin-bottom:6px;">✅ مدفوع ومحول للبطاقة</div>
                <div style="font-size:1.4rem; font-weight:900; color:#10b981;">${(stats.paidAmount || 0).toLocaleString()} <span style="font-size:0.8rem;">ج.م</span></div>
              </div>

              <div class="glass-card" style="padding:18px; border-radius:18px; border:1px solid rgba(99,102,241,0.3); background:rgba(99,102,241,0.04);">
                <div style="font-size:0.78rem; font-weight:800; color:var(--primary); margin-bottom:6px;">📖 أرباح مبيعات الدورات</div>
                <div style="font-size:1.4rem; font-weight:900; color:var(--primary);">${(stats.courseSalesEarnings || 0).toLocaleString()} <span style="font-size:0.8rem;">ج.م</span></div>
              </div>

              <div class="glass-card" style="padding:18px; border-radius:18px; border:1px solid rgba(236,72,153,0.3); background:rgba(236,72,153,0.04);">
                <div style="font-size:0.78rem; font-weight:800; color:#ec4899; margin-bottom:6px;">🎥 أرباح الحصص والاشتراكات</div>
                <div style="font-size:1.4rem; font-weight:900; color:#ec4899;">${(stats.sessionEarnings || 0).toLocaleString()} <span style="font-size:0.8rem;">ج.م</span></div>
              </div>

            </div>

            <!-- Table Card Container -->
            <div class="glass-card" style="padding:22px; border-radius:22px; border:1px solid var(--border-color); background:var(--bg-card);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; flex-wrap:wrap; gap:12px;">
                <div>
                  <h3 id="fin-tab-title" style="font-weight:900; font-size:1.1rem; margin:0; color:var(--text-main);">📋 جدول المعاملات والمستحقات المالـية</h3>
                  <p id="fin-tab-subtitle" style="color:var(--text-muted); font-size:0.82rem; margin:4px 0 0 0;">عرض كافة سجلات الأرباح والتسويات المسجلة باسمك</p>
                </div>
              </div>

              <div style="overflow-x:auto; border:1px solid var(--border-color); border-radius:16px; background:var(--bg-app);">
                <table style="width:100%; border-collapse:collapse; font-size:0.88rem; text-align:start;">
                  <thead style="background:var(--bg-card); border-bottom:1px solid var(--border-color); color:var(--text-muted); font-weight:800;">
                    <tr>
                      <th style="padding:14px 18px;">#</th>
                      <th style="padding:14px 18px;">مصدر المعاملة / الدورة</th>
                      <th style="padding:14px 18px;">المبلغ المستحق</th>
                      <th style="padding:14px 18px;">حالة الصرف الإداري</th>
                      <th style="padding:14px 18px;">تاريخ التسوية والإنشاء</th>
                    </tr>
                  </thead>
                  <tbody id="fin-page-tbody">
                    ${renderTableRows(earningsList)}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Event handler for Back Button
    this.container.querySelector("#back-to-teacher-dash-btn")?.addEventListener("click", () => {
      this.currentViewMode = 'dashboard';
      window.location.hash = "#teacher-portal";
      this.render();
    });

    // Event handlers for Sidebar Tab buttons
    this.container.querySelectorAll(".fin-sidebar-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.container.querySelectorAll(".fin-sidebar-tab-btn").forEach(b => {
          b.classList.remove("active");
          b.style.background = "transparent";
          b.style.color = "var(--text-main)";
          b.style.borderColor = "transparent";
        });

        btn.classList.add("active");
        btn.style.background = "var(--primary)";
        btn.style.color = "#fff";

        const tab = btn.getAttribute("data-tab");
        const tbody = this.container.querySelector("#fin-page-tbody");
        const titleEl = this.container.querySelector("#fin-tab-title");
        const subTitleEl = this.container.querySelector("#fin-tab-subtitle");

        let filteredList = earningsList;
        if (tab === "pending") {
          filteredList = earningsList.filter(e => e.status === "pending");
          if (titleEl) titleEl.textContent = "⏳ المعاملات والمستحقات المعلقة للصرف";
          if (subTitleEl) subTitleEl.textContent = "قائمة المبالغ المعلقة التي سيتم تحويلها وصرفها من إدارة الأكاديمية";
        } else if (tab === "paid") {
          filteredList = earningsList.filter(e => e.status === "paid");
          if (titleEl) titleEl.textContent = "✅ المعاملات والمستحقات المدفوعة والمحولة";
          if (subTitleEl) subTitleEl.textContent = "سجل المبالغ والمستحقات التي تم تسويتها وصرفها لك بنجاح";
        } else if (tab === "courses") {
          filteredList = earningsList.filter(e => e.sourceType === "COURSE_SALE");
          if (titleEl) titleEl.textContent = "📖 أرباح ومبيعات الدورات المسجلة";
          if (subTitleEl) subTitleEl.textContent = "تفاصيل الأرباح الناتجة عن مبيعات كورساتك المسجلة عبر المنصة";
        } else if (tab === "sessions") {
          filteredList = earningsList.filter(e => e.sourceType === "SESSION_COMPLETED");
          if (titleEl) titleEl.textContent = "🎥 أرباح الحصص المباشرة والاشتراكات";
          if (subTitleEl) subTitleEl.textContent = "تفاصيل المستحقات المستحقة لإكمال الحصص الخاصة والبث المباشر";
        } else {
          if (titleEl) titleEl.textContent = "📊 نظرة عامة وكافة المعاملات المالية";
          if (subTitleEl) subTitleEl.textContent = "عرض كافة سجلات الأرباح والتسويات المسجلة باسمك";
        }

        if (tbody) {
          tbody.innerHTML = renderTableRows(filteredList);
          if (window.lucide) window.lucide.createIcons();
        }
      });
    });
  }

  onDestroy() { }
}
